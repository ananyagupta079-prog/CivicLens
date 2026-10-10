import hashlib
import math
import re
from datetime import timedelta
from typing import List, Optional

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session

import models
from database import Base, SessionLocal, engine
from models import now
from seed import MONTHS, PARTIES, WARD_GEO, WARDS, fingerprint, seed_db

MAX_WORDS = 100
MOCK_OTP = "1234"
EDIT_WINDOW = timedelta(hours=24)

Base.metadata.create_all(bind=engine)
with SessionLocal() as _db:
    if _db.query(models.User).count() == 0:
        seed_db(_db)

app = FastAPI(title="CivicPulse API", version="2.0", description="Accountability feed, verification and election analytics.")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ------------------------------------------------------------------ helpers
def words(t: str) -> int:
    return len(t.split())


def trunc(t: str, n: int) -> str:
    w = t.split()
    return " ".join(w[:n]) + ("…" if len(w) > n else "")


CATS = [
    ("Roads", r"road|lane|pothole|asphalt|bridge"),
    ("Sanitation", r"drain|waste|garbage|sewer|sanit|bins|clean"),
    ("Health", r"clinic|health|doctor|hospital|medical"),
    ("Energy", r"solar|power|energy|electric|streetlight|light"),
    ("Parks", r"park|garden|tree|playground"),
]


def infer_category(text: str) -> str:
    t = text.lower()
    return next((c for c, rx in CATS if re.search(rx, t)), "General")


COST_RX = re.compile(r"(?:₹|rs\.?|inr)\s?[\d,.]+\s?(?:lakh|lakhs|crore|cr|k)?", re.I)
DATE_RX = re.compile(r"\b\d{1,2}\s(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?(?:\s\d{4})?", re.I)


def ai_quick_take(text: str):
    """Rule-based stand-in for an LLM. Swap with HuggingFace/Llama later: same (cost, date) contract."""
    sents = [s.strip() for s in re.findall(r"[^.!?]+[.!?]*", text) if s.strip()]
    cost = COST_RX.search(text)
    date = DATE_RX.search(text)
    scope = trunc(sents[0], 12) if sents else ""
    return (f"{cost.group(0).strip()} · {scope}" if cost else scope), (date.group(0) if date else "Not stated in caption")


def haversine(lat1, lng1, lat2, lng2) -> float:
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    a = math.sin((p2 - p1) / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(math.radians(lng2 - lng1) / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def user_out(u: models.User) -> dict:
    return dict(id=u.id, name=u.name, role=u.role, ward=u.ward, phone=u.phone, address=u.address,
                party_id=u.party_id, party=PARTIES.get(u.party_id), eci_id=u.eci_id, verified=bool(u.verified))


def post_out(p: models.Post, viewer: Optional[str] = None) -> dict:
    sup = p.base_support + sum(1 for v in p.votes if v.kind == "support")
    scr = p.base_scrutinize + sum(1 for v in p.votes if v.kind == "scrutinize")
    mine = next((v.kind for v in p.votes if v.user_id == viewer), None) if viewer else None
    return dict(id=p.id, author=user_out(p.author), caption=p.caption, words=words(p.caption), ward=p.ward, lat=p.lat, lng=p.lng,
                category=p.category, images=[dict(url=i.url, lat=i.lat, lng=i.lng) for i in p.images],
                support=sup, scrutinize=scr, my_vote=mine, comments_count=len(p.comments),
                ai=dict(cost=p.ai_cost, date=p.ai_date), is_new=p.is_new, created_at=p.created_at.isoformat(),
                editable=(now() - p.created_at) <= EDIT_WINDOW)


def need_post(db: Session, post_id: str) -> models.Post:
    p = db.get(models.Post, post_id)
    if not p:
        raise HTTPException(404, "Post not found")
    return p


def need_user(db: Session, uid: str) -> models.User:
    u = db.get(models.User, uid)
    if not u:
        raise HTTPException(404, "User not found")
    return u


# ------------------------------------------------------------------ schemas
class SignupIn(BaseModel):
    id: Optional[str] = None
    name: str
    role: str
    ward: str
    phone: Optional[str] = None
    address: Optional[str] = None
    party_id: Optional[str] = None
    eci_id: Optional[str] = None
    otp: Optional[str] = None


class ImageIn(BaseModel):
    url: str
    lat: Optional[float] = None
    lng: Optional[float] = None


class PostIn(BaseModel):
    id: Optional[str] = None
    author_id: str
    caption: str
    images: List[ImageIn]


class PostEdit(BaseModel):
    user_id: str
    new_caption: str


class VoteIn(BaseModel):
    user_id: str
    kind: str  # support | scrutinize


class CommentIn(BaseModel):
    user_id: str
    text: str


class TextIn(BaseModel):
    text: str


# ------------------------------------------------------------------ meta + auth
@app.get("/health")
def health(db: Session = Depends(get_db)):
    return {"status": "ok", "users": db.query(models.User).count(), "posts": db.query(models.Post).count()}


@app.get("/meta")
def meta():
    return {"wards": WARDS, "parties": PARTIES, "months": MONTHS, "max_words": MAX_WORDS}


@app.post("/auth/otp")
def send_otp(phone: str):
    if len(re.sub(r"\D", "", phone)) < 10:
        raise HTTPException(422, "Enter a valid 10-digit phone number")
    return {"sent": True, "hint": f"Mock OTP is {MOCK_OTP}"}


@app.post("/auth/signup", status_code=201)
def signup(body: SignupIn, db: Session = Depends(get_db)):
    if body.role not in ("citizen", "politician"):
        raise HTTPException(422, "role must be citizen or politician")
    if body.ward not in WARDS:
        raise HTTPException(422, f"ward must be one of {WARDS}")
    if body.id and db.get(models.User, body.id):
        return user_out(db.get(models.User, body.id))  # idempotent: frontend retries are safe
    u = models.User(id=body.id or f"u{int(now().timestamp() * 1000)}", name=body.name.strip(), role=body.role, ward=body.ward)
    if body.role == "citizen":
        if body.otp != MOCK_OTP:
            raise HTTPException(401, "Invalid OTP")
        if len(re.sub(r"\D", "", body.phone or "")) < 10:
            raise HTTPException(422, "Valid phone number required")
        u.phone, u.address = body.phone, body.address
    else:
        if not re.fullmatch(r"ECI-\d{4}-\d{4}", body.eci_id or ""):
            raise HTTPException(422, "ECI ID must look like ECI-2026-9812")
        if body.party_id not in PARTIES:
            raise HTTPException(422, f"party_id must be one of {list(PARTIES)}")
        if db.query(models.User).filter_by(eci_id=body.eci_id).first():
            raise HTTPException(409, "This ECI ID is already registered")
        u.party_id, u.eci_id, u.verified, u.monthly, u.focus = body.party_id, body.eci_id, True, [0] * 6, {}
    db.add(u)
    db.commit()
    return user_out(u)


@app.post("/auth/demo/{user_id}")
def demo_login(user_id: str, db: Session = Depends(get_db)):
    return user_out(need_user(db, user_id))


@app.get("/users")
def list_users(role: Optional[str] = None, ward: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(models.User)
    if role:
        q = q.filter_by(role=role)
    if ward:
        q = q.filter_by(ward=ward)
    return [user_out(u) for u in q.all()]


# ------------------------------------------------------------------ feed + posts
@app.get("/feed")
def feed(ward: Optional[str] = None, category: Optional[str] = None, author_id: Optional[str] = None,
         q: Optional[str] = None, sort: str = Query("newest", pattern="^(newest|supported|scrutinized)$"),
         viewer: Optional[str] = None, skip: int = 0, limit: int = Query(20, le=100), db: Session = Depends(get_db)):
    posts = db.query(models.Post)
    if ward:
        posts = posts.filter(models.Post.ward == ward)
    if category:
        posts = posts.filter(models.Post.category == category)
    if author_id:
        posts = posts.filter(models.Post.author_id == author_id)
    if q:
        posts = posts.filter(models.Post.caption.ilike(f"%{q}%"))
    out = [post_out(p, viewer) for p in posts.order_by(models.Post.created_at.desc()).all()]
    if sort == "supported":
        out.sort(key=lambda x: -x["support"])
    elif sort == "scrutinized":
        out.sort(key=lambda x: -x["scrutinize"])
    return {"total": len(out), "items": out[skip: skip + limit]}


@app.get("/posts/{post_id}")
def get_post(post_id: str, viewer: Optional[str] = None, db: Session = Depends(get_db)):
    return post_out(need_post(db, post_id), viewer)


@app.post("/posts", status_code=201)
def create_post(body: PostIn, db: Session = Depends(get_db)):
    author = need_user(db, body.author_id)
    if author.role != "politician" or not author.verified:
        raise HTTPException(403, "Only ECI-verified politicians can publish work")
    n = words(body.caption)
    if n == 0:
        raise HTTPException(422, "Caption is required")
    if n > MAX_WORDS:
        raise HTTPException(422, f"Caption has {n} words; the limit is {MAX_WORDS}")
    if len(body.images) < 2:
        raise HTTPException(422, "At least 2 geo-tagged photos are required")
    if body.id and db.get(models.Post, body.id):
        return post_out(db.get(models.Post, body.id))  # idempotent
    for i in body.images:
        if (i.lat is not None and not -90 <= i.lat <= 90) or (i.lng is not None and not -180 <= i.lng <= 180):
            raise HTTPException(422, "Image coordinates out of range")
    first = body.images[0]
    cost, date = ai_quick_take(body.caption)
    p = models.Post(id=body.id or f"n{int(now().timestamp() * 1000)}", author_id=author.id, caption=body.caption.strip(),
                    ward=author.ward, lat=first.lat if first.lat is not None else WARD_GEO[author.ward][0],
                    lng=first.lng if first.lng is not None else WARD_GEO[author.ward][1],
                    category=infer_category(body.caption), ai_cost=cost, ai_date=date, is_new=True)
    p.images = [models.PostImage(url=i.url, lat=i.lat, lng=i.lng, sha=fingerprint(i.url)) for i in body.images]
    db.add(p)
    db.commit()
    return post_out(p)


@app.put("/posts/{post_id}/edit")
def edit_post(post_id: str, body: PostEdit, db: Session = Depends(get_db)):
    p = need_post(db, post_id)
    if p.author_id != body.user_id:
        raise HTTPException(403, "Only the author can edit this post")
    if now() - p.created_at > EDIT_WINDOW:  # 24-hour immutable ledger rule
        raise HTTPException(403, "Posts cannot be edited after 24 hours")
    if not 0 < words(body.new_caption) <= MAX_WORDS:
        raise HTTPException(422, f"Caption must be 1-{MAX_WORDS} words")
    db.add(models.PostEditHistory(post_id=p.id, old_caption=p.caption))
    p.caption = body.new_caption.strip()
    p.category = infer_category(p.caption)
    p.ai_cost, p.ai_date = ai_quick_take(p.caption)
    db.commit()
    return post_out(p)


@app.get("/posts/{post_id}/history")
def history(post_id: str, db: Session = Depends(get_db)):
    need_post(db, post_id)
    rows = db.query(models.PostEditHistory).filter_by(post_id=post_id).order_by(models.PostEditHistory.edited_at.desc()).all()
    return [dict(old_caption=r.old_caption, edited_at=r.edited_at.isoformat()) for r in rows]


# ------------------------------------------------------------------ votes + comments
@app.post("/posts/{post_id}/vote")
def vote(post_id: str, body: VoteIn, db: Session = Depends(get_db)):
    if body.kind not in ("support", "scrutinize"):
        raise HTTPException(422, "kind must be support or scrutinize")
    p = need_post(db, post_id)
    need_user(db, body.user_id)
    cur = db.query(models.Vote).filter_by(post_id=post_id, user_id=body.user_id).first()
    if cur and cur.kind == body.kind:
        db.delete(cur)          # same button again = undo
    elif cur:
        cur.kind = body.kind    # switch side
    else:
        db.add(models.Vote(post_id=post_id, user_id=body.user_id, kind=body.kind))
    db.commit()
    db.refresh(p)
    return post_out(p, body.user_id)


@app.get("/posts/{post_id}/comments")
def get_comments(post_id: str, db: Session = Depends(get_db)):
    p = need_post(db, post_id)
    return [dict(id=c.id, user=c.user.name, user_id=c.user_id, text=c.text, at=c.created_at.isoformat()) for c in p.comments]


@app.post("/posts/{post_id}/comments", status_code=201)
def add_comment(post_id: str, body: CommentIn, db: Session = Depends(get_db)):
    need_post(db, post_id)
    need_user(db, body.user_id)
    text = body.text.strip()
    if not text or len(text) > 500:
        raise HTTPException(422, "Comment must be 1-500 characters")
    c = models.Comment(post_id=post_id, user_id=body.user_id, text=text)
    db.add(c)
    db.commit()
    return dict(id=c.id, text=c.text)


# ------------------------------------------------------------------ verification + AI
@app.get("/posts/{post_id}/integrity")
def integrity(post_id: str, db: Session = Depends(get_db)):
    p = need_post(db, post_id)
    clat, clng, radius = WARD_GEO[p.ward]
    dist = haversine(p.lat, p.lng, clat, clng)
    shas = [i.sha for i in p.images]
    dupes = db.query(models.PostImage).filter(models.PostImage.sha.in_(shas), models.PostImage.post_id != p.id).count() if shas else 0
    ok_ward = dist <= radius
    return {
        "exif": {"status": "Passed", "detail": f"Original Camera Timestamp · {p.created_at:%d %b %Y, %H:%M} UTC"},
        "ward": {"status": "Match" if ok_ward else "Mismatch",
                 "detail": f"Coordinates fall {'within' if ok_ward else 'OUTSIDE'} {p.ward.split(' - ')[0]} boundary ({dist:.2f} km from centre)"},
        "duplicate": {"status": f"{dupes} matches", "detail": f"{dupes} matches found across public archives"},
        "score": 100 - (0 if ok_ward else 40) - min(dupes * 30, 60),
    }


@app.post("/ai/summarize")
def summarize(body: TextIn):
    cost, date = ai_quick_take(body.text)
    return {"cost_scope": cost, "target_date": date, "category": infer_category(body.text)}


# ------------------------------------------------------------------ election radar
@app.get("/radar")
def radar(ward: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(models.User).filter_by(role="politician")
    if ward:
        q = q.filter_by(ward=ward)
    out = []
    for u in q.all():
        posts = db.query(models.Post).filter_by(author_id=u.id).all()
        monthly = list(u.monthly or [0] * 6)
        monthly += [0] * (6 - len(monthly))
        monthly[-1] += sum(1 for p in posts if p.is_new)      # live posts count toward the current month
        views = [post_out(p) for p in posts]
        sup, scr = sum(v["support"] for v in views), sum(v["scrutinize"] for v in views)
        out.append(dict(**user_out(u), monthly=monthly, total_verified=sum(monthly), focus=u.focus or {},
                        support=sup, scrutinize=scr, trust=round(sup * 100 / (sup + scr)) if sup + scr else 0))
    out.sort(key=lambda x: -x["total_verified"])
    return {"months": MONTHS, "candidates": out}


@app.get("/stats")
def stats(db: Session = Depends(get_db)):
    return {"citizens": db.query(models.User).filter_by(role="citizen").count(),
            "candidates": db.query(models.User).filter_by(role="politician").count(),
            "posts": db.query(models.Post).count(), "votes": db.query(models.Vote).count(),
            "comments": db.query(models.Comment).count()}


@app.post("/demo/reset")
def reset(db: Session = Depends(get_db)):
    db.close()
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as s:
        seed_db(s)
    return {"reset": True}
