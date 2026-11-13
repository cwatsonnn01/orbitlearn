// OrbitLearn demo server. Node built-ins only: no npm install needed.
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { seed, id } = require('./seed');
const risk = require('./risk');
const ai = require('./ai');
const levels = require('./levels');
const insights = require('./insights');

const PORT = process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, '..', 'public');
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, '..', 'data', 'db.json');
const BASE_URL = process.env.BASE_URL || '';

// ---------- store ----------
let db;
function load() {
  try {
    db = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    // Re-seed demos older than 3 days so dates stay fresh.
    if (!db.seededAt || Date.now() - db.seededAt > 3 * 86400000 || !db.mastery || !db.board) throw new Error('stale');
  } catch {
    db = seed();
    save();
  }
}
let saveTimer;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
      fs.writeFileSync(DATA_FILE, JSON.stringify(db));
    } catch (e) { console.error('save failed', e.message); }
  }, 200);
}
load();

const sessions = new Map(); // token -> userId

// ---------- helpers ----------
const user = (uid) => db.users.find((u) => u.id === uid);
const cls = (cid) => db.classes.find((c) => c.id === cid);
const pub = (u) => u && ({ id: u.id, name: u.name, role: u.role, email: u.email, childId: u.childId, grade: u.grade, gradeLabel: u.grade != null ? levels.gradeLabel(u.grade) : undefined });
const teaches = (u, c) => c.teacherId === u.id || c.coTeacherId === u.id;
const studentClasses = (sid) => db.classes.filter((c) => (db.enrollments[c.id] || []).includes(sid));
const teacherClasses = (u) => db.classes.filter((c) => teaches(u, c));
const parentsOf = (sid) => db.users.filter((u) => u.role === 'parent' && u.childId === sid);
const labels = (lvl = db.school.level) => {
  if (lvl === 'kinder') lvl = 'kinder';
  return {
    level: lvl,
    band: lvl,
    theme: lvl === 'kinder' || lvl === 'elementary' ? 'kinder' : lvl === 'university' ? 'pro' : 'orbit',
    guardian: lvl === 'university' ? 'Advisor' : 'Parent',
    teacher: lvl === 'university' ? 'Professor' : 'Teacher',
    recaps: true,
    recapDetail: lvl === 'kinder' || lvl === 'elementary' ? 'simple' : lvl === 'university' ? 'full' : 'standard',
    badges: lvl === 'kinder' || lvl === 'elementary' || lvl === 'middle',
    foundations: lvl !== 'kinder',
    community: lvl === 'university' ? 'Study groups' : 'Parent hub',
  };
};

function notify(userId, type, title, body, link = '') {
  db.notifications.unshift({ id: id(), userId, type, title, body, link, read: false, createdAt: Date.now() });
}
function email(to, subject, body) {
  const u = user(to);
  if (!u) return;
  db.outbox.unshift({ id: id(), to: u.email, toName: u.name, subject, body, createdAt: Date.now() });
  db.outbox = db.outbox.slice(0, 200);
}
const scheduleLink = (teacherId, studentId) => `${BASE_URL}/#/meetings?teacher=${teacherId}&student=${studentId}`;

function notifyRisk(sid, byUser, auto = false) {
  const s = user(sid);
  const r = risk.assess(db, sid);
  const plan = risk.actionPlan(r);
  const teacher = byUser.role === 'teacher' ? byUser : user(studentClasses(sid)[0].teacherId);
  const g = labels().guardian;
  for (const p of parentsOf(sid)) {
    const body = `${s.name} needs some support right now:\n- ${r.reasons.join('\n- ')}\n\nAction plan:\n- ${plan.join('\n- ')}\n\nBook a time with ${teacher.name}: ${scheduleLink(teacher.id, sid)}`;
    notify(p.id, 'risk', `${s.name.split(' ')[0]} needs support`, r.reasons.join(' · '), `#/meetings?teacher=${teacher.id}&student=${sid}`);
    email(p.id, `OrbitLearn: ${s.name.split(' ')[0]} needs some support`, `Hi ${p.name.split(' ')[0]},\n\n${body}\n\n– ${auto ? 'OrbitLearn on behalf of ' : ''}${teacher.name}, ${db.school.name}`);
  }
  notify(sid, 'nudge', 'Let’s get back on track', plan[0] || 'Check your assignments and recaps.', '#/home');
  db.riskNotices[sid] = { at: Date.now(), by: byUser.id, level: r.level };
  return { notified: parentsOf(sid).length, guardian: g, plan };
}

// ---------- role views ----------
function studentView(sid) {
  const myClasses = studentClasses(sid);
  const ids = myClasses.map((c) => c.id);
  const subs = db.submissions.filter((s) => s.studentId === sid);
  const assignments = db.assignments.filter((a) => ids.includes(a.classId)).map((a) => {
    const s = subs.find((x) => x.assignmentId === a.id);
    const state = s ? (s.score != null ? 'graded' : 'submitted') : a.due < risk.today() ? 'missing' : 'todo';
    return { ...a, state, score: s ? s.score : null };
  }).sort((a, b) => a.due.localeCompare(b.due));
  const recaps = db.recaps.filter((r) => ids.includes(r.classId) && r.status === 'published').map((r) => ({ ...r, notes: undefined, subject: cls(r.classId).subject, className: cls(r.classId).name })).sort((a, b) => b.date.localeCompare(a.date));
  const foundations = {};
  for (const rc of recaps) {
    rc.foundations = levels.foundationsFor(db, rc).map((f) => f.id);
    for (const fid of rc.foundations) if (!foundations[fid]) foundations[fid] = foundationLesson(fid);
  }
  const me = user(sid);
  for (const fid of insights.conceptLessonIds(db, me.grade)) if (!foundations[fid]) { const l = foundationLesson(fid); if (l && l.grade < me.grade) foundations[fid] = l; }
  const r = risk.assess(db, sid);
  const openCheck = [...(db.checks || [])].reverse().find((k) => ids.includes(k.classId) && Date.now() - k.at < 86400000 && !k.responses[sid]);
  return {
    map: insights.studentMap(db, sid),
    check: openCheck ? { id: openCheck.id, classId: openCheck.classId, kind: openCheck.kind, questions: openCheck.questions.map((q) => ({ question: q.question, options: q.options, answer: q.answer })) } : null,
    student: pub(user(sid)), classes: myClasses, assignments, recaps, foundations, risk: r, plan: risk.actionPlan(r),
    shoutouts: db.shoutouts.filter((x) => ids.includes(x.classId)).map((x) => ({ ...x, studentName: user(x.studentId).name })).sort((a, b) => b.createdAt - a.createdAt),
    quizAttempts: db.quizAttempts.filter((q) => q.studentId === sid),
    badges: badges(sid, r),
  };
}
function foundationLesson(fid) {
  const lib = (db.library || []).find((l) => l.id === fid);
  if (lib) return { id: lib.id, gradeLabel: lib.gradeLabel, grade: lib.grade, subject: lib.subject, title: lib.title, summary: lib.summary, keyTerms: lib.keyTerms, flashcards: lib.flashcards, quiz: lib.quiz };
  const rc = db.recaps.find((x) => x.id === fid);
  const c = rc && cls(rc.classId);
  return rc && { id: rc.id, gradeLabel: levels.gradeLabel(c.grade), grade: c.grade, subject: c.subject, title: rc.title, summary: rc.summary, keyTerms: rc.keyTerms, flashcards: rc.flashcards, quiz: rc.quiz };
}
function viewerLevel(u) {
  if (u.role === 'student') return levels.band(u.grade);
  if (u.role === 'parent') return levels.band(user(u.childId).grade);
  if (u.role === 'teacher') { const c = teacherClasses(u)[0]; return c ? levels.band(c.grade) : db.school.level; }
  return db.school.level;
}
function badges(sid, r) {
  const out = [];
  if (r.perClass.every((c) => c.absences === 0)) out.push({ icon: 'star', label: 'Perfect attendance (2 weeks)' });
  if (r.perClass.every((c) => c.missing.length === 0)) out.push({ icon: 'check', label: 'Homework streak' });
  if (db.shoutouts.some((s) => s.studentId === sid)) out.push({ icon: 'award', label: 'Class shoutout' });
  if (db.quizAttempts.filter((q) => q.studentId === sid).length >= 3) out.push({ icon: 'bolt', label: 'Study pro: 3 quizzes' });
  return out;
}

function rosterFor(c) {
  return (db.enrollments[c.id] || []).map((sid) => {
    const r = risk.assess(db, sid);
    const st = r.perClass.find((p) => p.classId === c.id);
    return { id: sid, name: user(sid).name, average: st.average, absences: st.absences, lates: st.lates, missing: st.missing, attendanceRate: st.attendanceRate, risk: r.level, reasons: r.reasons, notifiedAt: (db.riskNotices[sid] || {}).at || null };
  }).sort((a, b) => ({ high: 0, watch: 1, ok: 2 }[a.risk] - { high: 0, watch: 1, ok: 2 }[b.risk]) || a.name.localeCompare(b.name));
}

function bootstrap(u) {
  const base = {
    me: pub(u), school: db.school, labels: labels(viewerLevel(u)),
    notifications: db.notifications.filter((n) => n.userId === u.id).slice(0, 50),
    teachers: db.users.filter((x) => x.role === 'teacher').map(pub),
  };
  let classIds = [];
  if (u.role === 'student') { Object.assign(base, studentView(u.id)); classIds = base.classes.map((c) => c.id); }
  if (u.role === 'parent') {
    Object.assign(base, studentView(u.childId));
    classIds = base.classes.map((c) => c.id);
    base.community = db.community.filter((p) => classIds.includes(p.classId)).map((p) => ({ ...p, author: user(p.authorId).name, replies: p.replies.map((r) => ({ ...r, author: user(r.authorId).name })) })).sort((a, b) => b.createdAt - a.createdAt);
  }
  if (u.role === 'teacher') {
    const mine = teacherClasses(u);
    classIds = mine.map((c) => c.id);
    base.classes = mine.map((c) => ({ ...c, roster: rosterFor(c), map: insights.classMap(db, c) }));
    base.recaps = db.recaps.filter((r) => classIds.includes(r.classId)).sort((a, b) => b.date.localeCompare(a.date));
    base.assignments = db.assignments.filter((a) => classIds.includes(a.classId)).map((a) => ({ ...a, submissions: db.submissions.filter((s) => s.assignmentId === a.id) })).sort((a, b) => b.due.localeCompare(a.due));
    base.shoutouts = db.shoutouts.filter((x) => classIds.includes(x.classId)).map((x) => ({ ...x, studentName: user(x.studentId).name })).sort((a, b) => b.createdAt - a.createdAt);
    base.foundations = Object.fromEntries(insights.conceptLessonIds(db, 99).map((fid) => [fid, foundationLesson(fid)]).filter(([, l]) => l));
    base.students = Object.fromEntries([...new Set(classIds.flatMap((c) => db.enrollments[c]))].map((sid) => [sid, user(sid).name]));
  }
  if (u.role === 'admin') {
    classIds = db.classes.map((c) => c.id);
    const students = db.users.filter((x) => x.role === 'student');
    const assessed = students.map((s) => ({ id: s.id, name: s.name, ...risk.assess(db, s.id), notifiedAt: (db.riskNotices[s.id] || {}).at || null }));
    base.classes = db.classes.map((c) => ({ ...c, teacher: user(c.teacherId).name, students: db.enrollments[c.id].length }));
    base.assessed = assessed;
    base.counts = {
      students: students.length, teachers: db.users.filter((x) => x.role === 'teacher').length,
      high: assessed.filter((a) => a.level === 'high').length, watch: assessed.filter((a) => a.level === 'watch').length,
      recaps: db.recaps.filter((r) => r.status === 'published').length, meetings: db.meetings.length,
    };
    const avgs = assessed.map((a) => a.overall).filter((x) => x != null);
    base.trend = db.trend.slice(0, -1).concat([{ month: db.trend[db.trend.length - 1].month, avg: Math.round(avgs.reduce((a, b) => a + b, 0) / avgs.length) }]);
    base.outbox = db.outbox.slice(0, 50);
    base.gaps = insights.schoolGaps(db);
  }
  if (u.role === 'board') { base.board = insights.boardView(db); base.me.title = u.title; }
  base.announcements = db.announcements.filter((a) => a.scope === 'school' || classIds.includes(a.scope)).map((a) => ({ ...a, author: (user(a.authorId) || {}).name })).sort((a, b) => (b.urgent - a.urgent) || b.createdAt - a.createdAt);
  base.meetings = db.meetings.filter((m) => m.requesterId === u.id || m.teacherId === u.id || (u.role === 'parent' && m.studentId === u.childId) || u.role === 'admin')
    .map((m) => ({ ...m, requester: user(m.requesterId).name, teacher: user(m.teacherId).name, student: user(m.studentId).name })).sort((a, b) => b.createdAt - a.createdAt);
  return base;
}

// ---------- actions ----------
const routes = {
  'POST /api/login': (body) => {
    let u;
    if (body.demo) u = db.users.find((x) => x.email === `${body.demo}@orbitlearn.demo`);
    else u = db.users.find((x) => x.email.toLowerCase() === String(body.email || '').toLowerCase().trim() && x.password === body.password);
    if (!u) throw httpErr(401, 'That email and password don’t match. Try one of the demo accounts.');
    const token = crypto.randomBytes(24).toString('hex');
    sessions.set(token, u.id);
    return { ok: true, cookie: token };
  },
  'POST /api/logout': (b, u, token) => { sessions.delete(token); return { ok: true, cookie: '' }; },
  'GET /api/bootstrap': (b, u) => bootstrap(u),

  'POST /api/attendance': (b, u) => {
    const c = mustTeach(u, b.classId);
    const date = b.date || risk.today();
    for (const r of b.records || []) {
      if (!db.enrollments[c.id].includes(r.studentId)) continue;
      db.attendance = db.attendance.filter((a) => !(a.studentId === r.studentId && a.classId === c.id && a.date === date));
      db.attendance.push({ studentId: r.studentId, classId: c.id, date, status: ['present', 'absent', 'late'].includes(r.status) ? r.status : 'present' });
    }
    return { ok: true };
  },
  'POST /api/assignments': (b, u) => {
    const c = mustTeach(u, b.classId);
    const title = req(b.title, 'title');
    const a = { id: id(), classId: c.id, title, due: req(b.due, 'due date'), points: Number(b.points) || 100, createdAt: risk.today() };
    db.assignments.push(a);
    for (const sid of db.enrollments[c.id]) {
      notify(sid, 'assignment', `New in ${c.subject}: ${title}`, `Due ${a.due}`, '#/assignments');
      for (const p of parentsOf(sid)) notify(p.id, 'assignment', `${user(sid).name.split(' ')[0]} has new homework`, `${c.subject}: ${title}, due ${a.due}`, '#/home');
    }
    return { ok: true, id: a.id };
  },
  'POST /api/grade': (b, u) => {
    const a = db.assignments.find((x) => x.id === b.assignmentId);
    if (!a) throw httpErr(404, 'Assignment not found');
    mustTeach(u, a.classId);
    let s = db.submissions.find((x) => x.assignmentId === a.id && x.studentId === b.studentId);
    if (!s) { s = { assignmentId: a.id, studentId: b.studentId, submittedAt: risk.today(), score: null }; db.submissions.push(s); }
    s.score = Math.max(0, Math.min(a.points, Number(b.score)));
    notify(b.studentId, 'grade', `Graded: ${a.title}`, `${s.score}/${a.points}`, '#/assignments');
    return { ok: true };
  },
  'POST /api/submit': (b, u) => {
    if (u.role !== 'student') throw httpErr(403, 'Students only');
    const a = db.assignments.find((x) => x.id === b.assignmentId);
    if (!a || !studentClasses(u.id).some((c) => c.id === a.classId)) throw httpErr(404, 'Assignment not found');
    if (!db.submissions.some((x) => x.assignmentId === a.id && x.studentId === u.id)) db.submissions.push({ assignmentId: a.id, studentId: u.id, submittedAt: risk.today(), score: null });
    return { ok: true };
  },
  'POST /api/recaps/generate': (b, u) => {
    const c = mustTeach(u, b.classId);
    const notes = req(b.notes, 'class notes');
    if (notes.length < 60) throw httpErr(400, 'Add a few more sentences of notes so the assistant has enough to work with.');
    const pool = db.recaps.filter((r) => r.classId === c.id).flatMap((r) => r.keyTerms);
    const gen = ai.generateRecap({ subject: c.subject, title: req(b.title, 'lesson title'), notes, level: levels.band(c.grade) }, pool);
    const r = { id: id(), classId: c.id, date: risk.today(), title: b.title, notes, ...gen, homework: [], status: 'draft', approvedBy: null, concepts: levels.guessConcepts(b.title + ' ' + notes) };
    db.recaps.push(r);
    return { ok: true, recap: r };
  },
  'POST /api/recaps/publish': (b, u) => {
    const r = db.recaps.find((x) => x.id === b.id);
    if (!r) throw httpErr(404, 'Recap not found');
    const c = mustTeach(u, r.classId);
    if (Array.isArray(b.summary)) r.summary = b.summary.map(String).filter(Boolean);
    r.homework = (b.homework || []).filter((h) => db.assignments.some((a) => a.id === h && a.classId === c.id));
    r.status = 'published';
    r.approvedBy = u.id;
    for (const sid of db.enrollments[c.id]) {
      notify(sid, 'recap', `New ${c.subject} recap: ${r.title}`, 'Flashcards and a quiz are ready in your Study Vault.', `#/vault/${r.id}`);
      if (r.homework.length) {
        const hw = r.homework.map((h) => db.assignments.find((a) => a.id === h)).map((a) => `${a.title} (due ${a.due})`).join(', ');
        for (const p of parentsOf(sid)) notify(p.id, 'assignment', `${user(sid).name.split(' ')[0]} has homework in ${c.subject}`, hw, '#/home');
      }
    }
    return { ok: true };
  },
  'POST /api/recaps/delete': (b, u) => {
    const r = db.recaps.find((x) => x.id === b.id);
    if (!r) throw httpErr(404, 'Recap not found');
    mustTeach(u, r.classId);
    if (r.status !== 'draft') throw httpErr(400, 'Only drafts can be discarded.');
    db.recaps = db.recaps.filter((x) => x.id !== r.id);
    return { ok: true };
  },
  'POST /api/announcements': (b, u) => {
    const scope = b.scope || 'school';
    if (scope === 'school' && u.role !== 'admin') throw httpErr(403, 'Only school admins can post school-wide.');
    if (scope !== 'school') mustTeach(u, scope);
    const a = { id: id(), scope, title: req(b.title, 'title'), body: req(b.body, 'message'), urgent: !!b.urgent && u.role === 'admin', authorId: u.id, createdAt: Date.now() };
    db.announcements.push(a);
    const audience = scope === 'school' ? db.users.filter((x) => x.id !== u.id) : db.users.filter((x) => (x.role === 'student' && db.enrollments[scope].includes(x.id)) || (x.role === 'parent' && db.enrollments[scope].includes(x.childId)));
    for (const x of audience) {
      notify(x.id, a.urgent ? 'urgent' : 'announcement', (a.urgent ? 'URGENT: ' : '') + a.title, a.body, '#/announcements');
      if (a.urgent && (x.role === 'parent' || x.role === 'teacher')) email(x.id, `URGENT from ${db.school.name}: ${a.title}`, `${a.body}\n\nThis alert was sent to all families and staff.`);
    }
    return { ok: true, reached: audience.length };
  },
  'POST /api/shoutouts': (b, u) => {
    const c = mustTeach(u, b.classId);
    if (!db.enrollments[c.id].includes(b.studentId)) throw httpErr(400, 'Pick a student in this class.');
    db.shoutouts.push({ id: id(), classId: c.id, studentId: b.studentId, text: req(b.text, 'shoutout'), authorId: u.id, createdAt: Date.now() });
    notify(b.studentId, 'shoutout', `Shoutout from ${u.name}!`, b.text, '#/home');
    for (const p of parentsOf(b.studentId)) notify(p.id, 'shoutout', `${user(b.studentId).name.split(' ')[0]} got a shoutout!`, b.text, '#/home');
    return { ok: true };
  },
  'POST /api/risk/notify': (b, u) => {
    if (!['teacher', 'admin'].includes(u.role)) throw httpErr(403, 'Staff only');
    if (u.role === 'teacher' && !teacherClasses(u).some((c) => db.enrollments[c.id].includes(b.studentId))) throw httpErr(403, 'Not your student');
    return { ok: true, ...notifyRisk(b.studentId, u) };
  },
  'POST /api/risk/run': (b, u) => {
    if (!['teacher', 'admin'].includes(u.role)) throw httpErr(403, 'Staff only');
    const pool = u.role === 'admin' ? db.users.filter((x) => x.role === 'student').map((x) => x.id) : [...new Set(teacherClasses(u).flatMap((c) => db.enrollments[c.id]))];
    const sent = [];
    for (const sid of pool) {
      const r = risk.assess(db, sid);
      const last = db.riskNotices[sid];
      if (r.level === 'high' && (!last || Date.now() - last.at > 7 * 86400000)) { notifyRisk(sid, u, true); sent.push(user(sid).name); }
    }
    return { ok: true, sent };
  },
  'POST /api/meetings': (b, u) => {
    if (!['parent', 'student'].includes(u.role)) throw httpErr(403, 'Families and students only');
    const sid = u.role === 'parent' ? u.childId : u.id;
    const t = user(b.teacherId);
    if (!t || t.role !== 'teacher') throw httpErr(400, 'Pick a teacher.');
    const m = { id: id(), requesterId: u.id, teacherId: t.id, studentId: sid, reason: req(b.reason, 'reason'), slot: req(b.slot, 'time'), status: 'requested', createdAt: Date.now() };
    db.meetings.push(m);
    notify(t.id, 'meeting', `Meeting request from ${u.name}`, `${m.slot} · ${m.reason}`, '#/meetings');
    return { ok: true };
  },
  'POST /api/meetings/respond': (b, u) => {
    const m = db.meetings.find((x) => x.id === b.id);
    if (!m || m.teacherId !== u.id) throw httpErr(404, 'Meeting not found');
    m.status = b.status === 'declined' ? 'declined' : 'confirmed';
    if (b.slot) m.slot = String(b.slot);
    notify(m.requesterId, 'meeting', `Meeting ${m.status} with ${u.name}`, m.slot, '#/meetings');
    if (m.status === 'confirmed') email(m.requesterId, `Confirmed: meeting with ${u.name}`, `Your meeting about ${user(m.studentId).name} is confirmed for ${m.slot}.\n\nTopic: ${m.reason}`);
    return { ok: true };
  },
  'POST /api/community': (b, u) => {
    if (!['parent', 'teacher'].includes(u.role)) throw httpErr(403, 'Not available');
    const ok = u.role === 'parent' ? studentClasses(u.childId).some((c) => c.id === b.classId) : teacherClasses(u).some((c) => c.id === b.classId);
    if (!ok) throw httpErr(403, 'Not your class');
    db.community.push({ id: id(), classId: b.classId, authorId: u.id, body: req(b.body, 'message'), createdAt: Date.now(), replies: [] });
    return { ok: true };
  },
  'POST /api/community/reply': (b, u) => {
    const p = db.community.find((x) => x.id === b.id);
    if (!p) throw httpErr(404, 'Post not found');
    if (u.role === 'parent' && !studentClasses(u.childId).some((c) => c.id === p.classId)) throw httpErr(403, 'Not your class');
    p.replies.push({ authorId: u.id, body: req(b.body, 'reply'), createdAt: Date.now() });
    if (p.authorId !== u.id) notify(p.authorId, 'community', `${u.name} replied to your post`, b.body, '#/community');
    return { ok: true };
  },
  'POST /api/assistant': (b, u) => {
    if (u.role !== 'student') throw httpErr(403, 'Students only');
    return studentReply(u, b.message);
  },
  'POST /api/quiz': (b, u) => {
    if (u.role !== 'student') throw httpErr(403, 'Students only');
    db.quizAttempts.push({ studentId: u.id, label: String(b.label || 'Quiz').slice(0, 80), score: Number(b.score) || 0, total: Number(b.total) || 0, at: Date.now() });
    const lbl = String(b.label || '');
    if (lbl.startsWith('Foundation: ') && Number(b.total)) {
      const c = insights.conceptForLessonTitle(db, lbl.slice(12));
      if (c) { const m = db.mastery[u.id] || (db.mastery[u.id] = {}); m[c.id] = Math.max(m[c.id] || 0, Math.round(55 + 42 * (Number(b.score) / Number(b.total)))); }
    }
    return { ok: true };
  },
  'POST /api/check': (b, u) => {
    const c = cls(b.classId);
    if (!c || u.role !== 'teacher' || !teaches(u, c)) throw httpErr(403, 'Not your class');
    const live = db.users.filter((x) => x.email === 'student@orbitlearn.demo').map((x) => x.id);
    const k = insights.runCheck(db, c, b.kind === 'exit' ? 'exit' : 'warmup', foundationLesson, live);
    for (const sid of db.enrollments[c.id]) if (!k.responses[sid]) notify(sid, 'check', `${k.kind === 'exit' ? 'Exit ticket' : 'Warm-up'} is live in ${c.subject}`, `${k.questions.length} quick questions. Takes 2 minutes.`, `#/check/${k.id}`);
    return { ok: true, id: k.id, correctPct: k.correctPct, perConcept: k.perConcept };
  },
  'POST /api/check/answer': (b, u) => {
    const k = (db.checks || []).find((x) => x.id === b.id);
    if (!k || u.role !== 'student' || !(db.enrollments[k.classId] || []).includes(u.id)) throw httpErr(404, 'Check not found');
    if (k.responses[u.id]) return { ok: true };
    insights.applyAnswers(db, u.id, k, (b.results || []).slice(0, k.questions.length).map(Boolean), 0);
    insights.scoreCheck(k);
    return { ok: true };
  },
  'POST /api/foundation/assign': (b, u) => {
    const c = cls(b.classId);
    if (!c || u.role !== 'teacher' || !teaches(u, c)) throw httpErr(403, 'Not your class');
    const con = insights.C[b.conceptId]; const lid = con && insights.lessonId(db, con);
    if (!lid) throw httpErr(400, 'Unknown concept');
    const who = db.enrollments[c.id].filter((sid) => ((db.mastery[sid] || {})[con.id] ?? 100) < 60);
    for (const sid of who) notify(sid, 'foundation', `Quick refresher: ${con.name}`, `${u.name} sent you a ${levels.gradeLabel(con.grade)} lesson that today's ${c.subject} builds on.`, `#/foundation/${lid}`);
    return { ok: true, sent: who.length };
  },
  'POST /api/board/pack': (b, u) => {
    if (u.role !== 'board') throw httpErr(403, 'Board only');
    const exam = insights.boardView(db).exams.find((e) => e.id === b.exam);
    const ids = b.schoolId === 'all' ? insights.boardView(db).schools.filter((s) => exam && s.type === exam.type).map((s) => s.id) : [b.schoolId];
    if (!exam) throw httpErr(400, 'Unknown exam');
    for (const sid of ids) db.board.packs.unshift({ id: id(), schoolId: sid, exam: exam.id, at: Date.now() });
    if (ids.includes('northview')) for (const a of db.users.filter((x) => x.role === 'admin')) { notify(a.id, 'board', `Review pack from the board: ${exam.short}`, `${u.name} sent a targeted ${exam.short} review pack based on your school's foundation gaps.`, '#/gaps'); email(a.id, `Board review pack: ${exam.name}`, `Hi ${a.name.split(' ')[1] || a.name},\n\nThe board has sent Northview a ${exam.name} review pack, built from your school's foundation gaps in OrbitLearn. Teachers can assign it from the Knowledge map tab of each class.\n\n– ${u.name}, ${u.title}`); }
    return { ok: true, sent: ids.length };
  },
  'POST /api/notifications/read': (b, u) => {
    db.notifications.forEach((n) => { if (n.userId === u.id) n.read = true; });
    return { ok: true };
  },
  'POST /api/settings': (b, u) => {
    if (u.role !== 'admin') throw httpErr(403, 'Admins only');
    if (['kinder', 'elementary', 'middle', 'high', 'university'].includes(b.level)) db.school.level = b.level;
    return { ok: true };
  },
  'POST /api/reset': (b, u) => {
    if (u.role !== 'admin') throw httpErr(403, 'Admins only');
    db = seed(db.school.level);
    sessions.clear();
    return { ok: true, cookie: '' };
  },
};

function studentReply(u, message) {
  const recaps = db.recaps.filter((r) => r.status === 'published' && studentClasses(u.id).some((c) => c.id === r.classId))
    .map((r) => ({ ...r, subject: cls(r.classId).subject, className: cls(r.classId).name }));
  const out = ai.answer(message, recaps);
  // "Explain it simpler": point back to an earlier-grade lesson on the same idea.
  if (/simpl|easier|basic|don.?t (get|understand)|confus|lost|start from/i.test(message || '')) {
    const words = (String(message).toLowerCase().match(/[a-z]{4,}/g) || []);
    const target = (out.recapId && recaps.find((r) => r.id === out.recapId)) ||
      recaps.find((r) => words.some((w) => r.title.toLowerCase().includes(w) || r.subject.toLowerCase().includes(w))) || recaps[0];
    const f = target && levels.foundationsFor(db, target)[0];
    if (f) {
      const lesson = foundationLesson(f.id);
      out.text = `Let's build it up from the ground. Before "${target.title}", it helps to know this from ${f.gradeLabel} ${f.subject}: ${lesson.summary.slice(0, 2).join(' ')}`;
      out.foundation = { id: f.id, title: f.title, gradeLabel: f.gradeLabel, subject: f.subject };
      out.source = undefined; out.recapId = target.id;
    }
  }
  return out;
}

function mustTeach(u, classId) {
  const c = cls(classId);
  if (!c) throw httpErr(404, 'Class not found');
  if (u.role !== 'teacher' || !teaches(u, c)) throw httpErr(403, 'You don’t teach this class');
  return c;
}
function req(v, name) {
  const s = String(v == null ? '' : v).trim();
  if (!s) throw httpErr(400, `Please add a ${name}.`);
  return s.slice(0, 4000);
}
function httpErr(status, message) { const e = new Error(message); e.status = status; return e; }

// ---------- http ----------
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json' };
const SEC = { 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'X-Frame-Options': 'SAMEORIGIN' };

function cookieToken(req_) {
  const m = /(?:^|;\s*)ol_session=([a-f0-9]+)/.exec(req_.headers.cookie || '');
  return m ? m[1] : null;
}

const server = http.createServer((rq, rs) => {
  const url = new URL(rq.url, 'http://x');
  if (url.pathname === '/health') { rs.writeHead(200, { 'Content-Type': 'text/plain' }); return rs.end('ok'); }
  if (url.pathname.startsWith('/api/')) return api(rq, rs, url);
  let file = path.normalize(path.join(PUBLIC, url.pathname === '/' ? 'index.html' : url.pathname));
  if (!file.startsWith(PUBLIC)) { rs.writeHead(403); return rs.end(); }
  fs.readFile(file, (err, data) => {
    if (err) {
      return fs.readFile(path.join(PUBLIC, 'index.html'), (e2, html) => {
        rs.writeHead(e2 ? 404 : 200, { 'Content-Type': TYPES['.html'], ...SEC });
        rs.end(e2 ? 'Not found' : html);
      });
    }
    rs.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': file.endsWith('.html') ? 'no-cache' : 'public, max-age=300', ...SEC });
    rs.end(data);
  });
});

function api(rq, rs, url) {
  let raw = '';
  rq.on('data', (c) => { raw += c; if (raw.length > 1e6) rq.destroy(); });
  rq.on('end', () => {
    const send = (status, obj, cookie) => {
      const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...SEC };
      if (cookie !== undefined) headers['Set-Cookie'] = `ol_session=${cookie}; Path=/; HttpOnly; SameSite=Lax${cookie ? '; Max-Age=604800' : '; Max-Age=0'}${rq.headers['x-forwarded-proto'] === 'https' ? '; Secure' : ''}`;
      rs.writeHead(status, headers);
      rs.end(JSON.stringify(obj));
    };
    try {
      const key = `${rq.method} ${url.pathname}`;
      const fn = routes[key];
      if (!fn) return send(404, { error: 'Not found' });
      let body = {};
      if (raw) { try { body = JSON.parse(raw); } catch { return send(400, { error: 'Bad JSON' }); } }
      if (rq.method === 'POST' && rq.headers['content-type'] && !rq.headers['content-type'].includes('application/json')) return send(415, { error: 'JSON only' });
      const token = cookieToken(rq);
      const u = token && sessions.has(token) ? user(sessions.get(token)) : null;
      if (key !== 'POST /api/login' && !u) return send(401, { error: 'Please sign in.' });
      const out = fn(body, u, token);
      if (rq.method === 'POST' && key !== 'POST /api/login' && key !== 'POST /api/logout') save();
      const { cookie, ...rest } = out || {};
      send(200, rest, cookie);
    } catch (e) {
      if (!e.status) console.error(e);
      send(e.status || 500, { error: e.status ? e.message : 'Something went wrong.' });
    }
  });
}

if (require.main === module) server.listen(PORT, () => console.log(`OrbitLearn running on :${PORT}`));
module.exports = { server, getDb: () => db, routes };
