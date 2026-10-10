import { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import Head from 'next/head';
import {
  Home, Radar as RadarIcon, PlusSquare, User as UserIcon, BadgeCheck, ShieldCheck, ThumbsUp, Flag, Sparkles, MapPin,
  X, Check, RotateCcw, Users, Landmark, Zap, ImagePlus, LogOut, Heart, Camera, Search, MessageCircle, Share2, Bookmark,
  Server, Trophy, Flame, FileCheck2, Fingerprint, Send,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { seed, WARDS, MONTHS, PARTIES, SERIES, FOCUS, SAMPLES } from '../lib/mockData';

/* ---------- helpers ---------- */
const KEY = 'civicpulse:v3';
const MAX = 100;
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const CATS = ['Roads', 'Sanitation', 'Health', 'Energy', 'Parks', 'General'];
const CAT_STYLE: Record<string, string> = {
  Roads: 'bg-amber-100 text-amber-700', Sanitation: 'bg-teal-100 text-teal-700', Health: 'bg-rose-100 text-rose-700',
  Energy: 'bg-yellow-100 text-yellow-700', Parks: 'bg-green-100 text-green-700', General: 'bg-slate-100 text-slate-600',
};
const shortWard = (w: string) => w.split(' - ')[0];
const words = (t: string) => (t.trim() ? t.trim().split(/\s+/).length : 0);
const trunc = (t: string, n: number) => { const w = t.trim().split(/\s+/); return w.length > n ? w.slice(0, n).join(' ') + '…' : t.trim(); };
const ago = (t: number) => { const m = Math.max(1, Math.round((Date.now() - t) / 60000)); return m < 60 ? `${m}m` : m < 1440 ? `${Math.round(m / 60)}h` : `${Math.round(m / 1440)}d`; };
const inferCat = (t: string) => {
  const x = t.toLowerCase();
  return /road|lane|pothole|asphalt|bridge/.test(x) ? 'Roads' : /drain|waste|garbage|sewer|sanit|bins|clean/.test(x) ? 'Sanitation'
    : /clinic|health|doctor|hospital|medical/.test(x) ? 'Health' : /solar|power|energy|electric|light/.test(x) ? 'Energy'
    : /park|garden|tree|playground/.test(x) ? 'Parks' : 'General';
};
const statusOf = (p: any) => {
  const d = (p.ai?.date || '').toLowerCase();
  return !p.ai ? ['Just published', 'bg-fuchsia-100 text-fuchsia-700'] : /completed|open/.test(d) ? ['Completed', 'bg-emerald-100 text-emerald-700']
    : /progress/.test(d) ? ['In progress', 'bg-amber-100 text-amber-700'] : ['Pending', 'bg-sky-100 text-sky-700'];
};
const gps = (first: boolean) => first
  ? { lat: '28.6139', lng: '77.2090' }
  : { lat: (28.6139 + (Math.random() - 0.5) * 0.004).toFixed(4), lng: (77.209 + (Math.random() - 0.5) * 0.004).toFixed(4) };
const FALLBACK = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4 3"><defs><linearGradient id="g"><stop offset="0" stop-color="#f9ce34"/><stop offset=".5" stop-color="#ee2a7b"/><stop offset="1" stop-color="#6228d7"/></linearGradient></defs><rect width="4" height="3" fill="url(#g)"/></svg>');
const imgErr = (e: any) => { if (e.currentTarget.src !== FALLBACK) e.currentTarget.src = FALLBACK; };
const shrink = (f: File) => new Promise<string>((res) => {
  const r = new FileReader();
  r.onload = () => {
    const i = new Image();
    i.onload = () => {
      const k = Math.min(1, 720 / Math.max(i.width, i.height));
      const c = document.createElement('canvas'); c.width = i.width * k; c.height = i.height * k;
      c.getContext('2d')!.drawImage(i, 0, 0, c.width, c.height);
      res(c.toDataURL('image/jpeg', 0.7));
    };
    i.src = String(r.result);
  };
  r.readAsDataURL(f);
});
// Talks to the FastAPI backend; returns null if it is offline so the app keeps working on mock data.
const call = async (path: string, method = 'GET', body?: any) => {
  const c = new AbortController(); const t = setTimeout(() => c.abort(), 2500);
  try {
    const r = await fetch(API + path, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined, signal: c.signal });
    return r.ok ? await r.json() : null;
  } catch { return null; } finally { clearTimeout(t); }
};

const Ctx = createContext<any>(null);
const useApp = () => useContext(Ctx);
const inp = 'w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm outline-none focus:border-pink-500 focus:bg-white focus:ring-2 focus:ring-pink-200';
const card = 'rounded-3xl border border-neutral-200/70 bg-white shadow-sm';

/* ---------- small UI pieces ---------- */
function Avatar({ u, size = 40, ring = true, active = false }: any) {
  const c = PARTIES[u.partyId]?.color || '#a855f7';
  return (
    <div className={`shrink-0 rounded-full p-[2.5px] ${ring ? 'bg-ig' : 'bg-neutral-200'} ${active ? 'ring-2 ring-pink-500 ring-offset-2' : ''}`} style={{ width: size, height: size }}>
      <div className="grid h-full w-full place-items-center rounded-full border-2 border-white font-bold text-white" style={{ background: c, fontSize: size / 2.8 }}>{u.name.replace('Hon. ', '')[0]}</div>
    </div>
  );
}
const PartyTag = ({ id }: { id: string }) => <span className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white" style={{ background: PARTIES[id].color }}>{PARTIES[id].name}</span>;

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [onClose]);
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div className="sheet-up max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 sm:max-w-lg sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between"><h3 className="text-lg font-extrabold">{title}</h3><button onClick={onClose} aria-label="Close" className="rounded-full p-1 hover:bg-neutral-100"><X className="h-5 w-5" /></button></div>
        {children}
      </div>
    </div>
  );
}

/* ---------- Auth ---------- */
function Otp({ onDone, onClose }: { onDone: () => void; onClose: () => void }) {
  const [d, setD] = useState(['', '', '', '']);
  const fill = () => { [0, 1, 2, 3].forEach((i) => setTimeout(() => setD((p) => p.map((v, j) => (j <= i ? String(j + 1) : v))), i * 180)); setTimeout(onDone, 4 * 180 + 350); };
  return (
    <Modal title="Verify your phone" onClose={onClose}>
      <p className="mb-4 text-sm text-neutral-500">We sent a 4-digit code (mock). Click the boxes to auto-fill it.</p>
      <div className="mb-4 flex justify-center gap-3" onClick={fill}>
        {d.map((v, i) => <div key={i} className={`grid h-14 w-12 cursor-pointer place-items-center rounded-2xl border-2 text-2xl font-extrabold transition ${v ? 'border-emerald-500 bg-emerald-50 text-emerald-600' : 'border-neutral-200 bg-neutral-50'}`}>{v}</div>)}
      </div>
      <button onClick={fill} className="w-full rounded-xl bg-ig py-3 font-bold text-white active:scale-95">⚡ Auto-fill OTP</button>
    </Modal>
  );
}

function AuthCard() {
  const { login, signup } = useApp();
  const [mode, setMode] = useState<'citizen' | 'politician'>('citizen');
  const [otp, setOtp] = useState(false);
  const [f, setF] = useState({ name: '', phone: '', address: '', ward: WARDS[1], party: 'a', eci: '', ver: false });
  const set = (k: string, v: any) => setF((p) => ({ ...p, [k]: v }));
  const eciOk = /^ECI-\d{4}-\d{4}$/.test(f.eci);
  const ok = f.name.trim() && (mode === 'citizen' ? f.phone.replace(/\D/g, '').length >= 10 && f.address.trim() : eciOk && f.ver);
  const create = () => {
    const base = { id: 'u' + Date.now(), name: f.name.trim(), ward: f.ward };
    signup(mode === 'citizen' ? { ...base, role: 'citizen', phone: f.phone, address: f.address } : { ...base, role: 'politician', partyId: f.party, eciId: f.eci, verified: true });
  };
  return (
    <div id="auth" className={`${card} p-5`}>
      <h2 className="mb-1 text-xl font-extrabold">Join CivicPulse</h2>
      <p className="mb-3 text-xs text-neutral-500">Quick demo logins, or create a verified account.</p>
      <div className="mb-4 space-y-2">
        <button onClick={() => login('c1')} className="flex w-full items-center gap-3 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-500 px-4 py-3 text-left text-sm font-bold text-white shadow-lg shadow-indigo-500/25 transition hover:brightness-110 active:scale-95"><Zap className="h-5 w-5" />Load Aarav (Citizen - Ward 14)</button>
        <button onClick={() => login('p1')} className="flex w-full items-center gap-3 rounded-2xl bg-gradient-to-r from-fuchsia-500 to-orange-500 px-4 py-3 text-left text-sm font-bold text-white shadow-lg shadow-pink-500/25 transition hover:brightness-110 active:scale-95"><Zap className="h-5 w-5" />Load Hon. Priya Verma (Candidate - Ward 14)</button>
      </div>
      <div className="mb-3 grid grid-cols-2 gap-1 rounded-2xl bg-neutral-100 p-1">
        {([['citizen', 'Login as Citizen', Users], ['politician', 'Login as Politician', Landmark]] as any[]).map(([m, l, I]) => (
          <button key={m} onClick={() => setMode(m)} className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition ${mode === m ? 'bg-white text-pink-600 shadow' : 'text-neutral-500'}`}><I className="h-4 w-4" />{l}</button>
        ))}
      </div>
      <div className="space-y-3">
        <input className={inp} placeholder="Full name" value={f.name} onChange={(e) => set('name', e.target.value)} />
        {mode === 'citizen' ? (
          <>
            <input className={inp} placeholder="Phone number" inputMode="tel" value={f.phone} onChange={(e) => set('phone', e.target.value)} />
            <input className={inp} placeholder="Residence address" value={f.address} onChange={(e) => set('address', e.target.value)} />
          </>
        ) : (
          <>
            <select className={inp} value={f.party} onChange={(e) => set('party', e.target.value)}>{Object.entries(PARTIES).map(([id, p]) => <option key={id} value={id}>{p.name}</option>)}</select>
            <input className={inp} placeholder="Election Commission ID (ECI-2026-9812)" value={f.eci} onChange={(e) => set('eci', e.target.value.toUpperCase())} />
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-neutral-200 p-3 text-sm">
              <input type="checkbox" className="mt-1 h-4 w-4 accent-emerald-500" checked={f.ver} onChange={(e) => set('ver', e.target.checked)} />
              <span>Election Commission Verification<br /><span className="text-xs text-neutral-500">I confirm this ID is registered with the ECI.</span></span>
            </label>
            {f.ver && eciOk && <div className="fade-in flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-600"><BadgeCheck className="h-5 w-5" />ECI Verified Candidate</div>}
          </>
        )}
        <select className={inp} value={f.ward} onChange={(e) => set('ward', e.target.value)}>{WARDS.map((w) => <option key={w}>{w}</option>)}</select>
        <button disabled={!ok} onClick={() => (mode === 'citizen' ? setOtp(true) : create())} className="w-full rounded-xl bg-ig py-3 font-extrabold text-white transition hover:brightness-110 active:scale-95 disabled:opacity-40">{mode === 'citizen' ? 'Send OTP' : 'Create verified account'}</button>
      </div>
      {otp && <Otp onClose={() => setOtp(false)} onDone={() => { setOtp(false); create(); }} />}
    </div>
  );
}

function Landing() {
  const { s } = useApp();
  const stats = [[s.posts.length, 'Verified works'], [s.users.filter((u: any) => u.role === 'citizen').length, 'Citizens'], [s.users.filter((u: any) => u.role === 'politician').length, 'Candidates'], [WARDS.length, 'Wards']];
  const feats = [[MapPin, 'Geo-tagged proof', 'Every post needs 2+ photos with GPS lock inside the ward.'], [Sparkles, 'AI Quick Take', 'One click summarises cost, scope and target date.'], [Fingerprint, 'Integrity checks', 'EXIF, ward boundary and duplicate-photo detection.'], [RadarIcon, 'Election Radar', 'Compare candidates by delivered work, not slogans.']];
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <div className="grid items-center gap-10 lg:grid-cols-[1.2fr_1fr]">
        <div className="fade-in">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-bold text-pink-600 shadow-sm ring-1 ring-pink-100"><Flame className="h-4 w-4" />Hacktoberfest 2026 · Civic Tech</span>
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-6xl">Every promise,<br /><span className="bg-ig bg-clip-text text-transparent">with proof.</span></h1>
          <p className="mt-4 max-w-xl text-lg text-neutral-600">CivicPulse is a public ledger of work done by your representatives. Photos are geo-verified, captions are capped at 100 words, and you decide who to <b className="text-emerald-600">support</b> or <b className="text-orange-600">scrutinize</b>.</p>
          <div className="mt-6 grid max-w-xl grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.map(([n, l]) => <div key={l as string} className="rounded-2xl bg-white p-3 text-center shadow-sm ring-1 ring-neutral-100"><p className="bg-ig bg-clip-text text-2xl font-extrabold text-transparent">{n}</p><p className="text-[11px] font-semibold text-neutral-500">{l}</p></div>)}
          </div>
        </div>
        <AuthCard />
      </div>
      <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {feats.map(([I, t, d]: any) => <div key={t} className={`${card} p-5 transition hover:-translate-y-1 hover:shadow-lg`}><div className="mb-3 grid h-11 w-11 place-items-center rounded-2xl bg-ig text-white"><I className="h-5 w-5" /></div><h3 className="font-extrabold">{t}</h3><p className="mt-1 text-sm text-neutral-500">{d}</p></div>)}
      </div>
      <div className={`${card} mt-8 grid gap-6 p-6 sm:grid-cols-3`}>
        {[['1', 'Candidate posts work', 'Two geo-tagged photos plus a short factual caption.'], ['2', 'Platform verifies', 'AI summary and integrity checks run automatically.'], ['3', 'Citizens respond', 'Support, scrutinize and comment. Trust scores update live.']].map(([n, t, d]) => (
          <div key={n} className="flex gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ig font-extrabold text-white">{n}</span><div><h4 className="font-extrabold">{t}</h4><p className="text-sm text-neutral-500">{d}</p></div></div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Feed ---------- */
function PostCard({ p }: { p: any }) {
  const { s, vote, say, online, comment, toggleSave } = useApp();
  const a = s.users.find((u: any) => u.id === p.authorId);
  const mine = s.votes[`${s.session}:${p.id}`];
  const cs = s.comments[p.id] || [];
  const saved = s.saved.includes(p.id);
  const [idx, setIdx] = useState(0);
  const [ai, setAi] = useState<'idle' | 'load' | 'open'>('idle');
  const [chk, setChk] = useState(false);
  const [srv, setSrv] = useState<any>(null);
  const [burst, setBurst] = useState(false);
  const [open, setOpen] = useState(false);
  const [txt, setTxt] = useState('');
  const total = p.support + p.scrutinize;
  const pct = total ? Math.round((p.support / total) * 100) : 0;
  const cat = inferCat(p.caption);
  const [st, stCls] = statusOf(p);
  const toggleAi = () => { if (ai === 'open') return setAi('idle'); setAi('load'); setTimeout(() => setAi('open'), 500); };
  const sent = (p.caption.match(/[^.!?]+[.!?]*/g) || []).map((x: string) => x.trim());
  const bullets = p.ai ? [['Cost / Scope', p.ai.cost], ['Target Completion', p.ai.date]] : [['Cost / Scope', trunc(sent[0] || '', 16)], ['Target Completion', sent[1] ? trunc(sent[1], 16) : 'Not stated in caption']];
  const rows = srv ? [['EXIF Integrity', srv.exif.status, srv.exif.detail], ['Ward Alignment', srv.ward.status, srv.ward.detail], ['Duplicate Detection', srv.duplicate.status, srv.duplicate.detail]] : [
    ['EXIF Integrity', 'Passed', 'Original Camera Timestamp · ' + new Date(p.createdAt).toLocaleString()],
    ['Ward Alignment', 'Match', `Coordinates fall within ${shortWard(p.ward)} boundary`],
    ['Duplicate Detection', '0 matches', '0 matches found across public archives']];
  const openChk = async () => { setChk(true); setSrv(null); if (online) setSrv(await call(`/posts/${p.id}/integrity`)); };
  const share = async () => { try { await navigator.clipboard.writeText(`${location.origin}/#post-${p.id}`); say('Link copied'); } catch { say('Could not copy link'); } };
  const send = () => { if (txt.trim()) { comment(p.id, txt.trim()); setTxt(''); } };
  return (
    <article id={`post-${p.id}`} className={`fade-in overflow-hidden ${card}`}>
      <div className="flex items-center gap-3 px-4 py-3">
        <Avatar u={a} size={44} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 text-sm font-bold"><span className="truncate">{a.name}</span><BadgeCheck className="h-4 w-4 shrink-0 text-emerald-500" /></div>
          <div className="flex flex-wrap items-center gap-2"><PartyTag id={a.partyId} /><span className="text-[11px] text-neutral-400">{ago(p.createdAt)} ago · {shortWard(p.ward)}</span></div>
        </div>
        <button onClick={openChk} className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-600 ring-1 ring-emerald-200 transition hover:bg-emerald-100 active:scale-95"><ShieldCheck className="h-3.5 w-3.5" />Integrity Check</button>
      </div>

      <div className="relative bg-neutral-100" onDoubleClick={() => { setBurst(true); setTimeout(() => setBurst(false), 800); if (mine !== 'support') vote(p.id, 'support'); }}>
        <div className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto" onScroll={(e) => setIdx(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}>
          {p.images.map((src: string, i: number) => <img key={i} src={src} onError={imgErr} alt="Proof of work" loading="lazy" className="aspect-square w-full shrink-0 snap-center object-cover sm:aspect-[4/3]" />)}
        </div>
        <span className="absolute right-3 top-3 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-bold text-white">{idx + 1}/{p.images.length}</span>
        <span className="absolute bottom-3 left-3 right-3 flex items-center gap-1 rounded-lg bg-black/65 px-2.5 py-1.5 text-[11px] font-semibold text-white backdrop-blur"><MapPin className="h-3.5 w-3.5 shrink-0 text-pink-400" />📍 Geo-Tag: {shortWard(p.ward)} (Lat {Number(p.lat).toFixed(4)}, Long {Number(p.lng).toFixed(4)})</span>
        {burst && <Heart className="heart-pop pointer-events-none absolute left-1/2 top-1/2 -ml-12 -mt-12 h-24 w-24 fill-white text-white drop-shadow-lg" />}
      </div>
      <div className="mt-2 flex justify-center gap-1">{p.images.map((_: any, i: number) => <span key={i} className={`h-1.5 rounded-full transition-all ${i === idx ? 'w-4 bg-pink-500' : 'w-1.5 bg-neutral-300'}`} />)}</div>

      <div className="flex flex-wrap gap-1.5 px-4 pt-3">
        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${CAT_STYLE[cat]}`}>{cat}</span>
        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${stCls}`}>{st}</span>
        <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-[11px] font-bold text-neutral-600">{p.images.length} geo-tagged photos</span>
      </div>

      <div className="flex gap-2 px-4 pt-3">
        <button onClick={() => vote(p.id, 'support')} className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border-2 py-2 text-sm font-bold transition active:scale-95 ${mine === 'support' ? 'border-emerald-500 bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'border-emerald-500 text-emerald-600 hover:bg-emerald-50'}`}><ThumbsUp className="h-4 w-4" />Support <span>{p.support}</span></button>
        <button onClick={() => vote(p.id, 'scrutinize')} className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border-2 py-2 text-sm font-bold transition active:scale-95 ${mine === 'scrutinize' ? 'border-transparent bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-red-500/30' : 'border-orange-500 text-orange-600 hover:bg-orange-50'}`}><Flag className="h-4 w-4" /><span className="sm:hidden">Scrutinize</span><span className="hidden sm:inline">Scrutinize / Demote</span> <span>{p.scrutinize}</span></button>
      </div>
      <div className="mx-4 mt-3 flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-red-100"><div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-500" style={{ width: `${pct}%` }} /></div>
        <span className="text-[11px] font-bold text-neutral-500">{pct}% trust</span>
      </div>

      <div className="px-4 pt-3 text-sm leading-relaxed"><span className="mr-1 font-bold">{a.name.replace('Hon. ', '')}</span>{p.caption}</div>
      <div className="px-4 pt-1 text-[11px] font-semibold text-neutral-400">{words(p.caption)} / {MAX} words · strict limit enforced</div>

      <div className="flex items-center gap-2 px-4 pt-3">
        <button onClick={toggleAi} className="flex items-center gap-1.5 rounded-full bg-ig px-4 py-1.5 text-xs font-bold text-white shadow-md shadow-pink-500/30 transition hover:brightness-110 active:scale-95"><Sparkles className="h-4 w-4" />✨ AI Quick Take</button>
        <div className="ml-auto flex items-center gap-1 text-neutral-500">
          <button onClick={() => setOpen(!open)} className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold hover:bg-neutral-100"><MessageCircle className="h-4 w-4" />{cs.length}</button>
          <button onClick={share} aria-label="Share" className="rounded-lg p-1.5 hover:bg-neutral-100"><Share2 className="h-4 w-4" /></button>
          <button onClick={() => toggleSave(p.id)} aria-label="Save" className={`rounded-lg p-1.5 hover:bg-neutral-100 ${saved ? 'text-pink-600' : ''}`}><Bookmark className={`h-4 w-4 ${saved ? 'fill-pink-600' : ''}`} /></button>
        </div>
      </div>

      <div className="px-4 pb-4">
        {ai === 'load' && <div className="mt-3 space-y-2 rounded-2xl border border-pink-100 p-3"><div className="shimmer h-3 w-1/3 rounded" /><div className="shimmer h-3 w-full rounded" /><div className="shimmer h-3 w-4/5 rounded" /></div>}
        {ai === 'open' && (
          <div className="fade-in mt-3 rounded-2xl border border-pink-200 bg-gradient-to-br from-pink-50 via-orange-50 to-violet-50 p-3">
            <p className="mb-2 flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider text-fuchsia-600"><Sparkles className="h-3.5 w-3.5" />AI Quick Take</p>
            <ul className="space-y-1.5 text-sm">{bullets.map(([k, v]) => <li key={k} className="flex gap-2"><span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-ig" /><span><b>{k}:</b> {v}</span></li>)}</ul>
          </div>
        )}
        {open && (
          <div className="fade-in mt-3 space-y-2 border-t border-neutral-100 pt-3">
            {cs.length === 0 && <p className="text-xs text-neutral-400">Be the first to comment.</p>}
            {cs.map((c: any) => { const u = s.users.find((x: any) => x.id === c.userId); return <p key={c.id} className="text-sm"><b>{u?.name.replace('Hon. ', '') || 'Citizen'}</b> <span className="text-neutral-600">{c.text}</span> <span className="text-[10px] text-neutral-400">{ago(c.at)}</span></p>; })}
            <div className="flex gap-2"><input value={txt} onChange={(e) => setTxt(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} maxLength={300} placeholder="Add a comment…" className={inp} /><button onClick={send} aria-label="Send" className="rounded-xl bg-ig px-3 text-white active:scale-95"><Send className="h-4 w-4" /></button></div>
          </div>
        )}
      </div>

      {chk && (
        <Modal title="Integrity Check" onClose={() => setChk(false)}>
          <div className="space-y-3">
            {rows.map(([k, stt, d]) => <div key={k} className="flex items-start gap-3 rounded-2xl bg-emerald-50 p-3"><div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-500 text-white"><Check className="h-5 w-5" /></div><div><p className="text-sm font-extrabold">{k}: <span className="text-emerald-600">{stt}</span></p><p className="text-xs text-neutral-600">{d}</p></div></div>)}
          </div>
          <p className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-neutral-400"><Server className="h-3.5 w-3.5" />{srv ? 'Verified live by the CivicPulse server' : 'Demo verification (start the backend for live checks)'}</p>
          <button onClick={() => setChk(false)} className="mt-4 w-full rounded-xl bg-ig py-3 font-bold text-white">Done</button>
        </Modal>
      )}
    </article>
  );
}

function Feed() {
  const { s, me, q, setCat, cat } = useApp();
  const [who, setWho] = useState<string | null>(null);
  const [sort, setSort] = useState('newest');
  const [mine, setMine] = useState(false);
  const pols = s.users.filter((u: any) => u.role === 'politician');
  const list = s.posts
    .filter((p: any) => (!who || p.authorId === who) && (cat === 'All' || inferCat(p.caption) === cat) && (!mine || p.ward === me.ward)
      && (!q || (p.caption + s.users.find((u: any) => u.id === p.authorId)?.name).toLowerCase().includes(q.toLowerCase())))
    .sort((a: any, b: any) => (sort === 'supported' ? b.support - a.support : sort === 'scrutinized' ? b.scrutinize - a.scrutinize : b.createdAt - a.createdAt));
  const count = (c: string) => s.posts.filter((p: any) => inferCat(p.caption) === c).length;
  return (
    <div className="mx-auto w-full max-w-xl space-y-4">
      <div className={`${card} no-scrollbar flex gap-4 overflow-x-auto px-4 py-3`}>
        {pols.map((u: any) => (
          <button key={u.id} onClick={() => setWho(who === u.id ? null : u.id)} className="flex w-16 shrink-0 flex-col items-center gap-1 transition active:scale-95">
            <Avatar u={u} size={62} active={who === u.id} />
            <span className="w-full truncate text-center text-[11px] font-semibold">{u.name.replace('Hon. ', '').split(' ')[0]}</span>
          </button>
        ))}
      </div>
      <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-1">
        {['All', ...CATS].map((c) => <button key={c} onClick={() => setCat(c)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition ${cat === c ? 'bg-ig text-white shadow-md shadow-pink-500/30' : 'bg-white text-neutral-600 ring-1 ring-neutral-200 hover:ring-pink-300'}`}>{c}{c !== 'All' && <span className="ml-1 opacity-70">{count(c)}</span>}</button>)}
      </div>
      <div className="flex items-center justify-between gap-2 text-xs font-bold">
        <label className="flex cursor-pointer items-center gap-2 text-neutral-600"><input type="checkbox" checked={mine} onChange={(e) => setMine(e.target.checked)} className="accent-pink-500" />My ward only ({shortWard(me.ward)})</label>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="rounded-lg border border-neutral-200 bg-white px-2 py-1.5 outline-none"><option value="newest">Newest</option><option value="supported">Most supported</option><option value="scrutinized">Most scrutinized</option></select>
      </div>
      {list.length === 0 && <div className={`${card} p-10 text-center text-sm text-neutral-400`}>No posts match these filters.</div>}
      {list.map((p: any) => <PostCard key={p.id} p={p} />)}
    </div>
  );
}

/* ---------- Add Post (politician only) ---------- */
function AddPost({ onClose }: { onClose: () => void }) {
  const { me, addPost } = useApp();
  const [imgs, setImgs] = useState<{ src: string; lat: string; lng: string }[]>([]);
  const [cap, setCap] = useState('');
  const n = words(cap);
  const bad = n > MAX || n === 0 || imgs.length < 2;
  const add = (srcs: string[]) => setImgs((p) => [...p, ...srcs.map((src, i) => ({ src, ...gps(p.length + i === 0) }))]);
  const upload = async (files: FileList | null) => { if (files) add(await Promise.all(Array.from(files).slice(0, 4).map(shrink))); };
  const publish = () => { addPost({ id: 'n' + Date.now(), authorId: me.id, images: imgs.map((i) => i.src), caption: cap.trim(), ward: me.ward, lat: +imgs[0].lat, lng: +imgs[0].lng, support: 0, scrutinize: 0, createdAt: Date.now(), isNew: true }, imgs); onClose(); };
  return (
    <Modal title="Add proof of work" onClose={onClose}>
      <p className="mb-3 text-xs text-neutral-500">Minimum 2 photos with GPS lock. Caption is capped at {MAX} words.</p>
      <div className="mb-3 grid grid-cols-2 gap-3">
        {imgs.map((im, i) => (
          <div key={i} className="overflow-hidden rounded-2xl ring-1 ring-neutral-200">
            <img src={im.src} onError={imgErr} alt="" className="aspect-[4/3] w-full object-cover" />
            <div className="bg-emerald-50 px-2 py-1.5 text-[10px] font-bold leading-tight text-emerald-700">Status: GPS Lock Acquired<br /><span className="font-mono font-medium">{im.lat}, {im.lng}</span></div>
          </div>
        ))}
        <label className="grid aspect-[4/3] cursor-pointer place-items-center rounded-2xl border-2 border-dashed border-pink-300 bg-pink-50 text-center text-xs font-bold text-pink-600 hover:bg-pink-100"><span><ImagePlus className="mx-auto mb-1 h-6 w-6" />Add photos</span><input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => upload(e.target.files)} /></label>
      </div>
      <button onClick={() => add([SAMPLES[imgs.length % 4], SAMPLES[(imgs.length + 1) % 4]])} className="mb-3 flex items-center gap-1.5 text-xs font-bold text-violet-600"><Camera className="h-4 w-4" />Use 2 sample photos (demo)</button>
      <textarea rows={4} value={cap} onChange={(e) => setCap(e.target.value)} placeholder="What was completed? Mention cost (₹) and completion date for a better AI take." className={inp} />
      <div className="mb-3 mt-1 flex justify-between text-xs font-bold"><span className={imgs.length < 2 ? 'text-orange-500' : 'text-emerald-600'}>{imgs.length}/2 photos</span><span className={n > MAX ? 'text-red-500' : 'text-neutral-500'}>{n} / {MAX} words</span></div>
      <button disabled={bad} onClick={publish} className="w-full rounded-xl bg-ig py-3 font-extrabold text-white transition hover:brightness-110 active:scale-95 disabled:opacity-40">Publish Work</button>
    </Modal>
  );
}

/* ---------- Election Radar ---------- */
function useCands() {
  const { s } = useApp();
  const extra = (id: string) => s.posts.filter((p: any) => p.authorId === id && p.isNew).length;
  const stat = (c: any) => {
    const ps = s.posts.filter((p: any) => p.authorId === c.id);
    const sup = ps.reduce((a: number, p: any) => a + p.support, 0), scr = ps.reduce((a: number, p: any) => a + p.scrutinize, 0);
    return { sup, scr, total: (SERIES[c.id] || []).reduce((a, b) => a + b, 0) + extra(c.id), trust: sup + scr ? Math.round((sup * 100) / (sup + scr)) : 0 };
  };
  return { extra, stat, all: s.users.filter((u: any) => u.role === 'politician') };
}

function Radar() {
  const { s } = useApp();
  const { extra, stat, all } = useCands();
  const [w, setW] = useState('all');
  const cands = all.filter((u: any) => w === 'all' || u.ward === w);
  const data = MONTHS.map((m, i) => { const r: any = { month: m }; cands.forEach((c: any) => { r[c.id] = (SERIES[c.id]?.[i] ?? 0) + (i === MONTHS.length - 1 ? extra(c.id) : 0); }); return r; });
  return (
    <div className="fade-in space-y-5">
      <div className="rounded-3xl bg-gradient-to-br from-violet-600 via-fuchsia-500 to-orange-400 p-5 text-white sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div><h2 className="flex items-center gap-2 text-2xl font-extrabold"><RadarIcon className="h-7 w-7" />Election Radar</h2><p className="text-sm text-white/90">Who is running, and what have they actually delivered?</p></div>
          <select value={w} onChange={(e) => setW(e.target.value)} className="rounded-xl bg-white/95 px-3 py-2 text-sm font-bold text-neutral-800 outline-none"><option value="all">All wards / constituencies</option>{WARDS.map((x) => <option key={x}>{x}</option>)}</select>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">{cands.map((c: any) => <span key={c.id} className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold backdrop-blur">{PARTIES[c.partyId].name}: {stat(c).total} projects</span>)}</div>
      </div>
      <div className={`${card} p-4`}>
        <p className="mb-2 px-1 text-sm font-bold text-neutral-600">Verified projects completed · May – Oct</p>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} width={26} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: '#fdf2f8' }} /><Legend wrapperStyle={{ fontSize: 12 }} />
              {cands.map((c: any) => <Bar key={c.id} dataKey={c.id} name={c.name.replace('Hon. ', '')} fill={PARTIES[c.partyId].color} radius={[6, 6, 0, 0]} />)}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {cands.map((c: any) => {
          const st = stat(c); const pt = PARTIES[c.partyId];
          return (
            <div key={c.id} className={`${card} p-5 transition hover:-translate-y-1 hover:shadow-lg`}>
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-2xl text-sm font-extrabold text-white" style={{ background: pt.color }}>{pt.short}</div>
                <div className="min-w-0 flex-1"><p className="flex items-center gap-1 font-extrabold">{c.name}<BadgeCheck className="h-4 w-4 text-emerald-500" /></p><p className="text-xs text-neutral-500">{pt.name} · {shortWard(c.ward)}</p></div>
                <div className="text-right"><p className="text-2xl font-extrabold leading-none" style={{ color: pt.color }}>{st.total}</p><p className="text-[10px] font-bold text-neutral-400">VERIFIED WORKS</p></div>
              </div>
              <p className="mb-1 mt-4 text-[11px] font-bold uppercase tracking-wider text-neutral-400">Top focus areas</p>
              <div className="space-y-1.5">{Object.entries(FOCUS[c.id] || { General: 100 }).map(([k, v]) => <div key={k} className="flex items-center gap-2 text-xs"><span className="w-20 font-semibold">{k}</span><div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-100"><div className="h-full rounded-full" style={{ width: `${v}%`, background: pt.color }} /></div><span className="w-8 text-right font-bold">{v}%</span></div>)}</div>
              <p className="mb-1 mt-4 text-[11px] font-bold uppercase tracking-wider text-neutral-400">Net community trust</p>
              <div className="flex h-3 overflow-hidden rounded-full"><div className="bg-gradient-to-r from-emerald-400 to-emerald-600" style={{ width: `${st.trust}%` }} /><div className="flex-1 bg-gradient-to-r from-orange-400 to-red-500" /></div>
              <div className="mt-1 flex justify-between text-xs font-bold"><span className="text-emerald-600">Support {st.sup}</span><span className="text-neutral-500">{st.trust}% trust</span><span className="text-red-500">Scrutinize {st.scr}</span></div>
              <p className="mt-3 text-[11px] text-neutral-400">{s.posts.filter((p: any) => p.authorId === c.id).length} posts · ECI {c.eciId}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Profile() {
  const { s, me, logout } = useApp();
  const { stat } = useCands();
  const mine = s.posts.filter((p: any) => p.authorId === me.id);
  const voted = Object.keys(s.votes).filter((k) => k.startsWith(me.id + ':')).length;
  const saved = s.posts.filter((p: any) => s.saved.includes(p.id));
  const st = me.role === 'politician' ? stat(me) : null;
  const tiles = st ? [[st.total, 'Verified works'], [st.sup, 'Support received'], [st.trust + '%', 'Trust score']] : [[voted, 'Votes cast'], [saved.length, 'Saved posts'], [Object.values(s.comments).flat().filter((c: any) => c.userId === me.id).length, 'Comments']];
  return (
    <div className="fade-in mx-auto max-w-xl space-y-4">
      <div className={`${card} p-6 text-center`}>
        <div className="mx-auto mb-3 w-fit"><Avatar u={me} size={96} /></div>
        <h2 className="flex items-center justify-center gap-1 text-xl font-extrabold">{me.name}{me.verified && <BadgeCheck className="h-5 w-5 text-emerald-500" />}</h2>
        <p className="mb-2 text-sm text-neutral-500">{me.role === 'politician' ? 'Candidate' : 'Citizen'} · {me.ward}</p>
        {me.partyId && <PartyTag id={me.partyId} />}
        {me.verified && <p className="mx-auto mt-3 w-fit rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-600">✔ ECI Verified · {me.eciId}</p>}
        {me.address && <p className="mt-3 text-sm text-neutral-500">{me.address}</p>}
        <div className="mt-4 grid grid-cols-3 gap-2">{tiles.map(([n, l]) => <div key={l as string} className="rounded-2xl bg-neutral-50 p-3"><p className="bg-ig bg-clip-text text-xl font-extrabold text-transparent">{n}</p><p className="text-[11px] font-semibold text-neutral-500">{l}</p></div>)}</div>
        <button onClick={logout} className="mx-auto mt-5 flex items-center gap-2 rounded-xl border-2 border-neutral-200 px-5 py-2 text-sm font-bold hover:bg-neutral-50"><LogOut className="h-4 w-4" />Log out</button>
      </div>
      <div className={`${card} p-5`}>
        <h3 className="mb-3 flex items-center gap-2 font-extrabold"><Bookmark className="h-4 w-4" />{me.role === 'politician' ? 'Your published work' : 'Saved posts'}</h3>
        {(me.role === 'politician' ? mine : saved).length === 0 && <p className="text-sm text-neutral-400">Nothing here yet.</p>}
        {(me.role === 'politician' ? mine : saved).map((p: any) => <div key={p.id} className="flex items-center gap-3 border-t border-neutral-100 py-2"><img src={p.images[0]} onError={imgErr} alt="" className="h-12 w-12 rounded-xl object-cover" /><p className="line-clamp-2 flex-1 text-sm">{trunc(p.caption, 14)}</p><span className="text-xs font-bold text-emerald-600">{p.support}↑</span></div>)}
      </div>
    </div>
  );
}

/* ---------- Side rails ---------- */
function LeftRail({ tab, setTab, openAdd }: any) {
  const { me } = useApp();
  const items: any[] = [['home', 'Home feed', Home], ['radar', 'Election Radar', RadarIcon], ['me', 'Profile', UserIcon]];
  return (
    <aside className="sticky top-20 hidden space-y-4 self-start lg:block">
      <div className={`${card} flex items-center gap-3 p-4`}>
        <Avatar u={me} size={52} />
        <div className="min-w-0"><p className="flex items-center gap-1 truncate text-sm font-extrabold">{me.name}{me.verified && <BadgeCheck className="h-4 w-4 shrink-0 text-emerald-500" />}</p><p className="text-xs text-neutral-500">{me.role === 'politician' ? 'Candidate' : 'Citizen'} · {shortWard(me.ward)}</p></div>
      </div>
      <nav className={`${card} p-2`}>
        {items.map(([id, l, I]) => <button key={id} onClick={() => setTab(id)} className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition ${tab === id ? 'bg-ig text-white shadow-md shadow-pink-500/25' : 'text-neutral-600 hover:bg-neutral-100'}`}><I className="h-5 w-5" />{l}</button>)}
      </nav>
      <button onClick={openAdd} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-neutral-900 py-3 text-sm font-bold text-white transition hover:bg-neutral-800 active:scale-95"><PlusSquare className="h-5 w-5" />Post work</button>
    </aside>
  );
}

function RightRail({ setTab }: any) {
  const { s, setCat } = useApp();
  const { stat, all } = useCands();
  const ranked = [...all].sort((a: any, b: any) => stat(b).total - stat(a).total);
  const totalS = s.posts.reduce((a: number, p: any) => a + p.support, 0), totalC = s.posts.reduce((a: number, p: any) => a + p.scrutinize, 0);
  return (
    <aside className="sticky top-20 hidden space-y-4 self-start xl:block">
      <div className={`${card} p-4`}>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-extrabold"><Flame className="h-4 w-4 text-orange-500" />Ward pulse</h3>
        <div className="grid grid-cols-2 gap-2 text-center">
          {[[s.posts.length, 'Works posted'], [Math.round((totalS * 100) / (totalS + totalC)) + '%', 'Avg. trust'], [totalS, 'Support votes'], [totalC, 'Scrutiny flags']].map(([n, l]) => <div key={l as string} className="rounded-2xl bg-neutral-50 p-3"><p className="bg-ig bg-clip-text text-xl font-extrabold text-transparent">{n}</p><p className="text-[10px] font-semibold text-neutral-500">{l}</p></div>)}
        </div>
      </div>
      <div className={`${card} p-4`}>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-extrabold"><Trophy className="h-4 w-4 text-amber-500" />Delivery leaderboard</h3>
        {ranked.map((c: any, i: number) => <button key={c.id} onClick={() => setTab('radar')} className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-neutral-50"><span className="w-4 text-sm font-extrabold text-neutral-400">{i + 1}</span><Avatar u={c} size={34} /><span className="min-w-0 flex-1 truncate text-sm font-bold">{c.name.replace('Hon. ', '')}</span><span className="text-sm font-extrabold" style={{ color: PARTIES[c.partyId].color }}>{stat(c).total}</span></button>)}
      </div>
      <div className={`${card} p-4`}>
        <h3 className="mb-3 text-sm font-extrabold">Trending focus areas</h3>
        <div className="flex flex-wrap gap-2">{CATS.slice(0, 5).map((c) => <button key={c} onClick={() => { setCat(c); setTab('home'); }} className={`rounded-full px-3 py-1 text-xs font-bold transition hover:scale-105 ${CAT_STYLE[c]}`}>#{c}</button>)}</div>
      </div>
      <div className={`${card} p-4`}>
        <h3 className="mb-2 flex items-center gap-2 text-sm font-extrabold"><FileCheck2 className="h-4 w-4 text-emerald-500" />How we verify</h3>
        <ul className="space-y-1.5 text-xs text-neutral-600"><li>✔ EXIF timestamp from original camera</li><li>✔ GPS inside the ward boundary</li><li>✔ Duplicate-photo scan of archives</li><li>✔ Captions locked after 24 hours</li></ul>
      </div>
    </aside>
  );
}

/* ---------- App shell ---------- */
export default function Page() {
  const [s, setS] = useState<any>(null);
  const [tab, setTab] = useState('home');
  const [add, setAdd] = useState(false);
  const [toast, setToast] = useState('');
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('All');
  const [online, setOnline] = useState(false);
  const tt = useRef<number>();
  const onRef = useRef(false); onRef.current = online;

  useEffect(() => { try { const r = localStorage.getItem(KEY); setS(r ? JSON.parse(r) : seed()); } catch { setS(seed()); } }, []);
  useEffect(() => { if (s) try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* quota */ } }, [s]);
  useEffect(() => { const ping = async () => setOnline(!!(await call('/health'))); ping(); const i = setInterval(ping, 8000); return () => clearInterval(i); }, []);

  const sync = (path: string, method: string, body?: any) => { if (onRef.current) call(path, method, body); };
  const say = (m: string) => { setToast(m); window.clearTimeout(tt.current); tt.current = window.setTimeout(() => setToast(''), 2200); };
  const login = (id: string) => { setS((p: any) => ({ ...p, session: id })); setTab('home'); };
  const quick = (role: string) => { login(role === 'citizen' ? 'c1' : 'p1'); say(role === 'citizen' ? 'Citizen View · Aarav' : 'Politician View · Priya Verma'); };
  const quickRef = useRef(quick); quickRef.current = quick;
  const reset = () => { setS(seed()); setTab('home'); setAdd(false); setCat('All'); setQ(''); sync('/demo/reset', 'POST'); say('Demo data reset'); };
  const signup = (u: any) => {
    setS((p: any) => ({ ...p, users: [...p.users, u], session: u.id })); setTab('home'); say('Welcome to CivicPulse!');
    sync('/auth/signup', 'POST', { id: u.id, name: u.name, role: u.role, ward: u.ward, phone: u.phone, address: u.address, party_id: u.partyId, eci_id: u.eciId, otp: '1234' });
  };
  const logout = () => setS((p: any) => ({ ...p, session: null }));
  const vote = (id: string, kind: string) => {
    setS((p: any) => {
      const k = `${p.session}:${id}`; const cur = p.votes[k];
      const posts = p.posts.map((x: any) => {
        if (x.id !== id) return x;
        let { support, scrutinize } = x;
        if (cur === 'support') support--; if (cur === 'scrutinize') scrutinize--;
        if (cur !== kind) { kind === 'support' ? support++ : scrutinize++; }
        return { ...x, support, scrutinize };
      });
      const votes = { ...p.votes }; if (cur === kind) delete votes[k]; else votes[k] = kind;
      return { ...p, posts, votes };
    });
    sync(`/posts/${id}/vote`, 'POST', { user_id: s.session, kind });
  };
  const comment = (id: string, text: string) => {
    setS((p: any) => ({ ...p, comments: { ...p.comments, [id]: [...(p.comments[id] || []), { id: 'k' + Date.now(), userId: p.session, text, at: Date.now() }] } }));
    sync(`/posts/${id}/comments`, 'POST', { user_id: s.session, text });
  };
  const toggleSave = (id: string) => setS((p: any) => ({ ...p, saved: p.saved.includes(id) ? p.saved.filter((x: string) => x !== id) : [...p.saved, id] }));
  const addPost = (post: any, imgs: any[]) => {
    setS((p: any) => ({ ...p, posts: [post, ...p.posts] })); setTab('home'); setCat('All'); window.scrollTo({ top: 0, behavior: 'smooth' }); say('Published to the live feed ✔');
    sync('/posts', 'POST', { id: post.id, author_id: post.authorId, caption: post.caption, images: imgs.map((i) => ({ url: i.src, lat: +i.lat, lng: +i.lng })) });
  };

  // hidden hotkeys: Alt+1 citizen, Alt+2 politician
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (!e.altKey) return;
      if (e.code === 'Digit1') { e.preventDefault(); quickRef.current('citizen'); }
      if (e.code === 'Digit2') { e.preventDefault(); quickRef.current('politician'); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  if (!s) return <div className="mesh grid min-h-screen place-items-center text-xl font-extrabold text-white">CivicPulse…</div>;
  const me = s.users.find((u: any) => u.id === s.session);
  const openAdd = () => (me.role === 'politician' ? setAdd(true) : say('Only verified politicians can post work'));
  const nav: any[] = [['home', 'Home', Home], ['radar', 'Radar', RadarIcon], ['me', 'Profile', UserIcon]];

  return (
    <Ctx.Provider value={{ s, me, q, cat, setCat, online, login, signup, logout, vote, comment, toggleSave, addPost, say }}>
      <Head><title>CivicPulse · Proof of work, not promises</title><meta name="viewport" content="width=device-width, initial-scale=1" /></Head>
      <div className="relative min-h-screen overflow-x-hidden bg-[#fbf8fc] pb-20 text-neutral-900 lg:pb-0">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-[420px] bg-[radial-gradient(60%_60%_at_20%_0%,#fde68a55,transparent),radial-gradient(50%_60%_at_85%_0%,#f9a8d455,transparent),radial-gradient(40%_50%_at_50%_10%,#c4b5fd44,transparent)]" />
        <header className="sticky top-0 z-50 border-b border-neutral-200/70 bg-white/80 backdrop-blur-xl">
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
            <button onClick={() => setTab('home')} className="flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-xl bg-ig text-white"><Landmark className="h-5 w-5" /></span><span className="bg-ig bg-clip-text text-2xl font-extrabold tracking-tight text-transparent">CivicPulse</span></button>
            {me && <div className="relative mx-auto hidden w-full max-w-sm md:block"><Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" /><input value={q} onChange={(e) => { setQ(e.target.value); setTab('home'); }} placeholder="Search works, wards or candidates" className="w-full rounded-full border border-neutral-200 bg-neutral-100 py-2 pl-9 pr-3 text-sm outline-none focus:border-pink-400 focus:bg-white" /></div>}
            <div className="ml-auto flex items-center gap-2">
              <span title={online ? 'Connected to FastAPI backend' : 'Backend offline: running on mock data'} className={`hidden items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold sm:flex ${online ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-500'}`}><Server className="h-3.5 w-3.5" /><span className={`h-2 w-2 rounded-full ${online ? 'animate-pulse bg-emerald-500' : 'bg-neutral-400'}`} />{online ? 'Backend live' : 'Demo mode'}</span>
              {me ? <>
                {me.role === 'politician' && <button onClick={openAdd} className="hidden items-center gap-1.5 rounded-full bg-ig px-4 py-2 text-xs font-bold text-white shadow-md shadow-pink-500/30 transition hover:brightness-110 active:scale-95 md:flex lg:hidden"><PlusSquare className="h-4 w-4" />Post work</button>}
                <button onClick={() => setTab('me')} className="flex items-center gap-2 rounded-full bg-neutral-100 py-1 pl-1 pr-3 text-xs font-bold"><Avatar u={me} size={28} />{me.name.replace('Hon. ', '').split(' ')[0]}</button>
              </> : <a href="#auth" className="rounded-full bg-ig px-4 py-2 text-xs font-bold text-white">Sign in</a>}
            </div>
          </div>
        </header>

        <div className="relative z-10">
          {!me ? <Landing /> : (
            <div className={`mx-auto grid max-w-6xl gap-6 px-4 py-6 ${tab === 'radar' ? 'lg:grid-cols-[230px_minmax(0,1fr)]' : 'lg:grid-cols-[230px_minmax(0,1fr)] xl:grid-cols-[230px_minmax(0,1fr)_300px]'}`}>
              <LeftRail tab={tab} setTab={setTab} openAdd={openAdd} />
              <main className="min-w-0">{tab === 'home' ? <Feed /> : tab === 'radar' ? <Radar /> : <Profile />}</main>
              {tab !== 'radar' && <RightRail setTab={setTab} />}
            </div>
          )}
          <footer className="mx-auto max-w-6xl px-4 pb-24 pt-6 text-center text-xs text-neutral-400 lg:pb-8">CivicPulse · Hacktoberfest 2026 · Geo-verified accountability for local governance · Alt+1 Citizen · Alt+2 Politician</footer>
        </div>

        {me && (
          <nav className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-around border-t border-neutral-200 bg-white/95 py-2 backdrop-blur lg:hidden">
            {nav.slice(0, 2).map(([id, l, I]) => <button key={id} onClick={() => setTab(id)} aria-label={l} className={`rounded-xl p-2 ${tab === id ? 'text-pink-600' : 'text-neutral-400'}`}><I className="h-6 w-6" /></button>)}
            <button onClick={openAdd} aria-label="Post work" className="rounded-xl bg-ig p-2 text-white shadow-lg shadow-pink-500/30"><PlusSquare className="h-6 w-6" /></button>
            <button onClick={() => setTab('me')} aria-label="Profile" className={`rounded-xl p-2 ${tab === 'me' ? 'text-pink-600' : 'text-neutral-400'}`}><UserIcon className="h-6 w-6" /></button>
          </nav>
        )}
        {add && me && <AddPost onClose={() => setAdd(false)} />}
        {toast && <div className="fade-in fixed left-1/2 top-20 z-[70] -translate-x-1/2 whitespace-nowrap rounded-full bg-neutral-900 px-4 py-2 text-xs font-bold text-white shadow-xl">{toast}</div>}

        {/* sticky Demo Control Bar */}
        <div className="fixed bottom-20 right-3 z-[65] flex items-center gap-1 rounded-full bg-neutral-900/95 p-1.5 text-[11px] font-bold text-white shadow-2xl backdrop-blur lg:bottom-6 lg:right-6">
          {([['citizen', 'Citizen View'], ['politician', 'Politician View']] as const).map(([r, l]) => <button key={r} onClick={() => quick(r)} className={`rounded-full px-3 py-1.5 transition ${me?.role === r ? 'bg-ig' : 'hover:bg-white/10'}`}>{l}</button>)}
          <button onClick={reset} className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 transition hover:bg-white/20"><RotateCcw className="h-3 w-3" />Reset Demo Data</button>
        </div>
      </div>
    </Ctx.Provider>
  );
}
