// Checkpoint 1: single pre-seeded mock store.
export const WARDS = ['Ward 12 - North', 'Ward 14 - Central'];
export const MONTHS = ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'];

export const PARTIES: Record<string, { name: string; short: string; color: string }> = {
  a: { name: 'Jan Vikas Party', short: 'JV', color: '#7c3aed' },
  b: { name: 'Nagrik Morcha', short: 'NM', color: '#0891b2' },
  ind: { name: 'Independent', short: 'IN', color: '#ea580c' },
};

const U = (id: string) => `https://images.unsplash.com/${id}?w=800&q=70&auto=format&fit=crop`;
export const SAMPLES = [
  U('photo-1541888946425-d0fbb172f342'), // road works
  U('photo-1584467735811-628d7d91d140'), // road repair
  U('photo-1509391366360-2e959784a276'), // solar panels
  U('photo-1519494026892-80bbd2d6fd0d'), // clinic
];

// 3 politicians: 2 parties + 1 independent. 2 citizens with wards.
const USERS = [
  { id: 'p1', name: 'Hon. Priya Verma', role: 'politician', ward: WARDS[1], partyId: 'a', eciId: 'ECI-2026-9812', verified: true },
  { id: 'p2', name: 'Rohan Mehta', role: 'politician', ward: WARDS[1], partyId: 'b', eciId: 'ECI-2026-4471', verified: true },
  { id: 'p3', name: 'Sana Qureshi', role: 'politician', ward: WARDS[0], partyId: 'ind', eciId: 'ECI-2026-7730', verified: true },
  { id: 'c1', name: 'Aarav Sharma', role: 'citizen', ward: WARDS[1], phone: '9876543210', address: '14, Lotus Colony' },
  { id: 'c2', name: 'Meera Nair', role: 'citizen', ward: WARDS[0], phone: '9123456780', address: '7, Nehru Nagar' },
];

// Verified projects per month (May-Oct): totals 12 / 7 / 3.
export const SERIES: Record<string, number[]> = {
  p1: [1, 2, 2, 3, 2, 2],
  p2: [0, 1, 2, 1, 2, 1],
  p3: [0, 0, 1, 1, 0, 1],
};
export const FOCUS: Record<string, Record<string, number>> = {
  p1: { Sanitation: 60, Roads: 30, Parks: 10 },
  p2: { Roads: 50, Energy: 30, Health: 20 },
  p3: { Health: 70, Energy: 30 },
};

const h = (n: number) => Date.now() - n * 3600000;
const POSTS = [
  { id: 'x1', authorId: 'p1', images: [SAMPLES[0], SAMPLES[1]], ward: WARDS[1], lat: 28.6139, lng: 77.209, support: 128, scrutinize: 9, createdAt: h(2),
    caption: 'Completed full resurfacing of the Central Market road after repeated citizen complaints. Potholes filled, drainage edges cleared and lane markings repainted before the festive rush.',
    ai: { cost: '₹18.4 lakh · 1.2 km road resurfaced', date: '15 Nov 2026 (completed)' } },
  { id: 'x2', authorId: 'p2', images: [SAMPLES[2], U('photo-1513694203232-719a280e022f')], ward: WARDS[1], lat: 28.6152, lng: 77.2107, support: 96, scrutinize: 21, createdAt: h(7),
    caption: 'Installed 40 kW rooftop solar panels on the Ward 14 community hall. The hall now runs on clean power and savings will fund evening classes for children.',
    ai: { cost: '₹32 lakh · 40 kW solar plant', date: '30 Oct 2026 (grid sync pending)' } },
  { id: 'x3', authorId: 'p1', images: [SAMPLES[3], U('photo-1576091160399-112ba8d25d1d')], ward: WARDS[1], lat: 28.6121, lng: 77.2068, support: 214, scrutinize: 14, createdAt: h(20),
    caption: 'Opened a free community clinic with two doctors and a pharmacy counter. Open six days a week, with a mobile number for emergency teleconsults.',
    ai: { cost: '₹24 lakh · 1 clinic, 2 doctors', date: '12 Oct 2026 (open)' } },
  { id: 'x4', authorId: 'p3', images: [U('photo-1532996122724-e3c3fa9a0d35'), U('photo-1581578731548-c64695cc6952')], ward: WARDS[0], lat: 28.7041, lng: 77.1025, support: 61, scrutinize: 5, createdAt: h(30),
    caption: 'Cleared the clogged storm drains along the North Ward main lane ahead of the rains. Silt removed from 3 km of drain and covers repaired.',
    ai: { cost: '₹6.5 lakh · 3 km drains cleaned', date: '20 Oct 2026 (completed)' } },
  { id: 'x5', authorId: 'p1', images: [U('photo-1584467735811-628d7d91d140'), SAMPLES[0]], ward: WARDS[1], lat: 28.6165, lng: 77.2122, support: 87, scrutinize: 18, createdAt: h(52),
    caption: 'Started waste segregation bins at 12 street corners with a daily pickup route. Residents will get a short orientation at the ward office on Sunday.',
    ai: { cost: '₹9 lakh · 12 smart bins', date: '05 Nov 2026 (in progress)' } },
  { id: 'x6', authorId: 'p2', images: [SAMPLES[1], SAMPLES[0]], ward: WARDS[1], lat: 28.6108, lng: 77.2131, support: 44, scrutinize: 27, createdAt: h(80),
    caption: 'Repaired the Lane 3 link road and added speed breakers near the school gate. Work took nine days and traffic was diverted during the repair.',
    ai: { cost: '₹11 lakh · 0.8 km lane repaired', date: '28 Oct 2026 (completed)' } },
];

const COMMENTS: Record<string, any[]> = {
  x1: [{ id: 'k1', userId: 'c2', text: 'Finally! The potholes near the market were dangerous at night.', at: h(1) }, { id: 'k2', userId: 'c1', text: 'Good work. Please also check the drain cover near gate 2.', at: h(1.5) }],
  x2: [{ id: 'k3', userId: 'c1', text: 'Is the grid sync date confirmed by the discom?', at: h(5) }],
  x3: [{ id: 'k4', userId: 'c2', text: 'Great to see a pharmacy counter included.', at: h(12) }],
};

export const seed = () => JSON.parse(JSON.stringify({ users: USERS, posts: POSTS, votes: {}, comments: COMMENTS, saved: [], session: null }));
