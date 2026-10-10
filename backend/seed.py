"""Seed data. Mirrors frontend/lib/mockData.ts so both sides agree on ids."""
import hashlib
from datetime import timedelta
from models import User, Post, PostImage, now

WARDS = ["Ward 12 - North", "Ward 14 - Central"]
PARTIES = {"a": "Jan Vikas Party", "b": "Nagrik Morcha", "ind": "Independent"}
WARD_GEO = {"Ward 14 - Central": (28.6139, 77.2090, 3.0), "Ward 12 - North": (28.7041, 77.1025, 3.0)}  # lat, lng, radius km
MONTHS = ["May", "Jun", "Jul", "Aug", "Sep", "Oct"]

U = lambda i: f"https://images.unsplash.com/{i}?w=800&q=70&auto=format&fit=crop"
ROAD, REPAIR, SOLAR, CLINIC = (U("photo-1541888946425-d0fbb172f342"), U("photo-1584467735811-628d7d91d140"),
                               U("photo-1509391366360-2e959784a276"), U("photo-1519494026892-80bbd2d6fd0d"))

USERS = [
    dict(id="p1", name="Hon. Priya Verma", role="politician", ward=WARDS[1], party_id="a", eci_id="ECI-2026-9812", verified=True,
         monthly=[1, 2, 2, 3, 2, 2], focus={"Sanitation": 60, "Roads": 30, "Parks": 10}),
    dict(id="p2", name="Rohan Mehta", role="politician", ward=WARDS[1], party_id="b", eci_id="ECI-2026-4471", verified=True,
         monthly=[0, 1, 2, 1, 2, 1], focus={"Roads": 50, "Energy": 30, "Health": 20}),
    dict(id="p3", name="Sana Qureshi", role="politician", ward=WARDS[0], party_id="ind", eci_id="ECI-2026-7730", verified=True,
         monthly=[0, 0, 1, 1, 0, 1], focus={"Health": 70, "Energy": 30}),
    dict(id="c1", name="Aarav Sharma", role="citizen", ward=WARDS[1], phone="9876543210", address="14, Lotus Colony"),
    dict(id="c2", name="Meera Nair", role="citizen", ward=WARDS[0], phone="9123456780", address="7, Nehru Nagar"),
]

# id, author, hours_ago, ward, lat, lng, support, scrutinize, category, caption, cost, date, images
POSTS = [
    ("x1", "p1", 2, WARDS[1], 28.6139, 77.2090, 128, 9, "Roads",
     "Completed full resurfacing of the Central Market road after repeated citizen complaints. Potholes filled, drainage edges cleared and lane markings repainted before the festive rush.",
     "₹18.4 lakh · 1.2 km road resurfaced", "15 Nov 2026 (completed)", [ROAD, REPAIR]),
    ("x2", "p2", 7, WARDS[1], 28.6152, 77.2107, 96, 21, "Energy",
     "Installed 40 kW rooftop solar panels on the Ward 14 community hall. The hall now runs on clean power and savings will fund evening classes for children.",
     "₹32 lakh · 40 kW solar plant", "30 Oct 2026 (grid sync pending)", [SOLAR, U("photo-1513694203232-719a280e022f")]),
    ("x3", "p1", 20, WARDS[1], 28.6121, 77.2068, 214, 14, "Health",
     "Opened a free community clinic with two doctors and a pharmacy counter. Open six days a week, with a mobile number for emergency teleconsults.",
     "₹24 lakh · 1 clinic, 2 doctors", "12 Oct 2026 (open)", [CLINIC, U("photo-1576091160399-112ba8d25d1d")]),
    ("x4", "p3", 30, WARDS[0], 28.7041, 77.1025, 61, 5, "Sanitation",
     "Cleared the clogged storm drains along the North Ward main lane ahead of the rains. Silt removed from 3 km of drain and covers repaired.",
     "₹6.5 lakh · 3 km drains cleaned", "20 Oct 2026 (completed)", [U("photo-1532996122724-e3c3fa9a0d35"), U("photo-1581578731548-c64695cc6952")]),
    ("x5", "p1", 52, WARDS[1], 28.6165, 77.2122, 87, 18, "Sanitation",
     "Started waste segregation bins at 12 street corners with a daily pickup route. Residents will get a short orientation at the ward office on Sunday.",
     "₹9 lakh · 12 smart bins", "05 Nov 2026 (in progress)", [REPAIR, ROAD]),
    ("x6", "p2", 80, WARDS[1], 28.6108, 77.2131, 44, 27, "Roads",
     "Repaired the Lane 3 link road and added speed breakers near the school gate. Work took nine days and traffic was diverted during the repair.",
     "₹11 lakh · 0.8 km lane repaired", "28 Oct 2026 (completed)", [REPAIR, ROAD]),
]


def fingerprint(url: str) -> str:
    return hashlib.sha256(url.encode()).hexdigest()


def seed_db(db):
    for u in USERS:
        db.add(User(**u))
    for pid, author, hrs, ward, lat, lng, sup, scr, cat, cap, cost, date, imgs in POSTS:
        p = Post(id=pid, author_id=author, caption=cap, ward=ward, lat=lat, lng=lng, category=cat, ai_cost=cost, ai_date=date,
                 base_support=sup, base_scrutinize=scr, created_at=now() - timedelta(hours=hrs))
        # seeded photos are unique per post (id mixed in) so the demo shows "0 duplicates"
        p.images = [PostImage(url=u, lat=lat, lng=lng, sha=fingerprint(u + pid)) for u in imgs]
        db.add(p)
    db.commit()
