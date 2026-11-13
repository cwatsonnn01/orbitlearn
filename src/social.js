// School branding, classroom looks, and staff/family messaging.
'use strict';

const THEMES = ['galaxy', 'ocean', 'forest', 'sunset', 'candy', 'minimal'];
const MASCOTS = { owl: '🦉', bear: '🐻', wolf: '🐺', eagle: '🦅', lion: '🦁', fox: '🦊', tiger: '🐯', shark: '🦈', dragon: '🐉', bee: '🐝', panther: '🐆', hawk: '🪶' };
const hex = (v, d) => (/^#[0-9a-fA-F]{6}$/.test(String(v || '')) ? String(v) : d);
const clip = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);

function seed(db) {
  db.school.district = 'Lakeshore Valley DSB (demo)';
  db.school.brand = { mascot: 'owl', mascotName: 'Northview Owls', primary: '#1F4FD8', secondary: '#F5B700', useColors: false, seasonal: true };
  const looks = {
    bio: { theme: 'forest', emoji: '🧬', banner: 'Welcome, scientists! Lab coats on Thursday.' },
    math: { theme: 'ocean', emoji: '📐', banner: 'Show your work. Mistakes are how we learn.' },
    eng: { theme: 'sunset', emoji: '📚', banner: 'Every voice matters in this room.' },
    kroom: { theme: 'candy', emoji: '🌈', banner: 'Good morning, Room 3 superstars!' },
    bio201: { theme: 'minimal', emoji: '🔬', banner: 'Office hours: Tuesdays 2 to 4 pm, Hall B.' },
  };
  db.classes.forEach((c) => { c.look = { theme: 'galaxy', emoji: '✨', banner: '', seasonal: true, ...(looks[c.id] || {}) }; });

  db.messages = [];
  const by = (email) => db.users.find((u) => u.email === email);
  const rivera = by('teacher@orbitlearn.demo'), dana = by('parent@orbitlearn.demo'), admin = by('admin@orbitlearn.demo'), board = by('board@orbitlearn.demo');
  const chen = db.users.find((u) => u.role === 'teacher' && /Chen/.test(u.name));
  const now = Date.now(), H = 3600000;
  const add = (from, to, body, hoursAgo, read = true) => from && to && db.messages.push({ id: require('crypto').randomBytes(6).toString('hex'), from: from.id, to: to.id, body, at: now - hoursAgo * H, read });
  add(dana, rivera, 'Hi Ms. Rivera, Tyler said he’s finding the cell unit hard. Is there anything we can do at home?', 30);
  add(rivera, dana, 'Thanks for reaching out, Dana! The warm-up showed he’s missing some Grade 7 cell basics. I sent him a 4-minute refresher in OrbitLearn. Doing it together tonight would really help.', 28);
  add(dana, rivera, 'Will do. Thank you for catching it so early!', 27);
  add(chen, rivera, 'Saw Tyler’s map: Grade 8 graphing is dark for him in Math too. Want to tag-team a catch-up plan?', 20);
  add(rivera, chen, 'Yes! Let’s book his mom for a joint meeting. I’ll send a slot.', 19);
  add(admin, rivera, 'Love that you’re running warm-ups every Monday. Could you share how at Thursday’s staff meeting?', 6, false);
  add(board, admin, 'Northview’s Grade 8 graphing gap matches 5 other schools. We’re sending a Grade 9 Math review pack this term.', 4, false);
  return db;
}

// Who a user may message. Students are not in staff/family messaging; they use Orbit AI and their teachers in class.
function contacts(db, u) {
  const teachersOf = (classIds) => db.users.filter((x) => x.role === 'teacher' && db.classes.some((c) => classIds.includes(c.id) && (c.teacherId === x.id || c.coTeacherId === x.id)));
  const admins = db.users.filter((x) => x.role === 'admin');
  if (u.role === 'teacher') {
    const mine = db.classes.filter((c) => c.teacherId === u.id || c.coTeacherId === u.id).map((c) => c.id);
    const kids = new Set(mine.flatMap((cid) => db.enrollments[cid] || []));
    return [...db.users.filter((x) => x.role === 'teacher' && x.id !== u.id), ...admins, ...db.users.filter((x) => x.role === 'parent' && kids.has(x.childId))];
  }
  if (u.role === 'parent') { const cids = db.classes.filter((c) => (db.enrollments[c.id] || []).includes(u.childId)).map((c) => c.id); return [...teachersOf(cids), ...admins]; }
  if (u.role === 'admin') return db.users.filter((x) => ['teacher', 'parent', 'board'].includes(x.role) || (x.role === 'admin' && x.id !== u.id));
  if (u.role === 'board') return admins;
  return [];
}

function inbox(db, u) {
  const people = contacts(db, u);
  const mine = (db.messages || []).filter((m) => m.from === u.id || m.to === u.id).sort((a, b) => a.at - b.at);
  const child = (p) => p.role === 'parent' ? db.users.find((x) => x.id === p.childId) : null;
  const label = (p) => p.role === 'teacher' ? 'Teacher' : p.role === 'admin' ? 'Principal' : p.role === 'board' ? 'Superintendent' : p.role === 'parent' ? `Parent of ${(child(p) || {}).name || 'a student'}` : '';
  return {
    contacts: people.map((p) => ({ id: p.id, name: p.name, role: p.role, label: label(p) })),
    messages: mine.slice(-400).map((m) => ({ id: m.id, from: m.from, to: m.to, body: m.body, at: m.at, read: m.read })),
  };
}

function setLook(c, b) {
  c.look = {
    theme: THEMES.includes(b.theme) ? b.theme : c.look.theme,
    emoji: clip(b.emoji, 8) || c.look.emoji,
    banner: clip(b.banner, 120),
    seasonal: !!b.seasonal,
  };
}
function setBrand(school, b) {
  school.brand = {
    mascot: MASCOTS[b.mascot] ? b.mascot : school.brand.mascot,
    mascotName: clip(b.mascotName, 40) || school.brand.mascotName,
    primary: hex(b.primary, school.brand.primary),
    secondary: hex(b.secondary, school.brand.secondary),
    useColors: !!b.useColors,
    seasonal: !!b.seasonal,
  };
}

module.exports = { seed, contacts, inbox, setLook, setBrand, MASCOTS, THEMES, clip };
