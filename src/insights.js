// Knowledge map, live class checks, school learning gaps and the board view.
// Concepts form a graph from Kindergarten to University; every student has a mastery score (0-100) per concept.
'use strict';
const { gradeLabel } = require('./levels');

// lesson: a Foundations library id ("libN") or the title of a class recap.
const CONCEPTS = [
  { id: 'm-count', name: 'Counting', branch: 'math', grade: 0, lesson: 'Counting to 20', pre: [] },
  { id: 'm-shapes', name: 'Shapes', branch: 'math', grade: 0, lesson: 'Shapes all around us', pre: [] },
  { id: 'm-pattern', name: 'Patterns & rules', branch: 'math', grade: 5, lesson: 'lib4', pre: ['m-count'] },
  { id: 'm-onestep', name: 'One-step equations', branch: 'math', grade: 6, lesson: 'lib5', pre: ['m-pattern'] },
  { id: 'm-coord', name: 'Coordinate graphing', branch: 'math', grade: 8, lesson: 'lib6', pre: ['m-pattern', 'm-shapes'] },
  { id: 'm-expo', name: 'Exponents & squares', branch: 'math', grade: 8, lesson: 'lib7', pre: ['m-count'] },
  { id: 'm-linear', name: 'Linear equations', branch: 'math', grade: 10, lesson: 'Linear equations', pre: ['m-onestep', 'm-coord'] },
  { id: 'm-systems', name: 'Systems of equations', branch: 'math', grade: 10, lesson: 'Systems of equations', pre: ['m-linear'] },
  { id: 'm-quad', name: 'Quadratic functions', branch: 'math', grade: 10, lesson: 'Quadratic functions', pre: ['m-expo', 'm-coord', 'm-linear'] },
  { id: 's-plants', name: 'How plants grow', branch: 'science', grade: 0, lesson: 'How plants grow', pre: [] },
  { id: 's-energy', name: 'Living things & energy', branch: 'science', grade: 3, lesson: 'lib0', pre: ['s-plants'] },
  { id: 's-cells', name: 'Intro to cells', branch: 'science', grade: 7, lesson: 'lib1', pre: ['s-energy'] },
  { id: 's-react', name: 'Chemical reactions', branch: 'science', grade: 9, lesson: 'lib2', pre: ['s-energy'] },
  { id: 's-dna', name: 'DNA & genes', branch: 'science', grade: 10, lesson: 'lib3', pre: ['s-cells'] },
  { id: 's-struct', name: 'Cell structure', branch: 'science', grade: 10, lesson: 'Cell structure', pre: ['s-cells'] },
  { id: 's-mitosis', name: 'Mitosis', branch: 'science', grade: 10, lesson: 'Mitosis', pre: ['s-struct', 's-dna'] },
  { id: 's-photo', name: 'Photosynthesis', branch: 'science', grade: 10, lesson: 'Photosynthesis', pre: ['s-energy', 's-react'] },
  { id: 's-repl', name: 'DNA replication', branch: 'science', grade: 13, lesson: 'DNA replication', pre: ['s-dna', 's-mitosis'] },
  { id: 's-cycle', name: 'Cell cycle regulation', branch: 'science', grade: 13, lesson: 'Cell cycle regulation', pre: ['s-mitosis'] },
  { id: 's-resp', name: 'Cellular respiration', branch: 'science', grade: 13, lesson: 'Cellular respiration', pre: ['s-photo', 's-react'] },
  { id: 'e-main', name: 'Main idea & details', branch: 'english', grade: 4, lesson: 'lib8', pre: [] },
  { id: 'e-opinion', name: 'Opinion writing', branch: 'english', grade: 6, lesson: 'lib9', pre: ['e-main'] },
  { id: 'e-theme', name: 'Theme & symbolism', branch: 'english', grade: 10, lesson: 'Theme and symbolism', pre: ['e-main'] },
  { id: 'e-thesis', name: 'Writing a thesis', branch: 'english', grade: 10, lesson: 'Writing a thesis', pre: ['e-main', 'e-opinion'] },
  { id: 'e-persuade', name: 'Persuasive techniques', branch: 'english', grade: 10, lesson: 'Persuasive techniques', pre: ['e-opinion'] },
];
const C = Object.fromEntries(CONCEPTS.map((c) => [c.id, c]));
const BRANCH = { Biology: 'science', 'Cell Biology': 'science', Math: 'math', English: 'english' };

const hash = (s) => { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967295; };
const clamp = (v) => Math.max(8, Math.min(99, Math.round(v)));
const level = (m) => (m == null ? 'none' : m >= 80 ? 'mastered' : m >= 60 ? 'learning' : 'gap');

function lessonId(db, c) {
  if (/^lib\d+$/.test(c.lesson)) return c.lesson;
  const r = db.recaps.find((x) => x.title === c.lesson && x.status === 'published');
  return r ? r.id : null;
}
function ancestors(ids) {
  const out = new Set();
  const walk = (id) => (C[id] ? C[id].pre : []).forEach((p) => { if (!out.has(p)) { out.add(p); walk(p); } });
  ids.forEach(walk);
  return [...out];
}

// Average graded score for a student, 0-100.
function studentAvg(db, sid) {
  const pts = Object.fromEntries(db.assignments.map((a) => [a.id, a.points]));
  const g = db.submissions.filter((s) => s.studentId === sid && s.score != null);
  return g.length ? (g.reduce((n, s) => n + s.score / (pts[s.assignmentId] || 100), 0) / g.length) * 100 : 75;
}

function seed(db) {
  db.mastery = {};
  db.checks = [];
  for (const s of db.users.filter((u) => u.role === 'student')) {
    const base = s.grade === 0 ? 86 : studentAvg(db, s.id);
    const m = {};
    for (const c of CONCEPTS) {
      if (c.grade > s.grade) continue;
      let v = base + (hash(s.email + c.id) - 0.5) * 30;
      // Planted story: Grade 8 graphing is weak for the whole grade, and it drags down the units built on it.
      const planted = { 'm-coord': 24, 'm-quad': 14, 'm-linear': 8, 's-react': 12, 's-photo': 9, 'e-opinion': 10, 'e-persuade': 7 };
      if (s.grade === 10) v -= planted[c.id] || 0;
      if (c.grade <= 3 && s.grade > 3) v += 8; // early basics are mostly solid
      m[c.id] = clamp(v);
    }
    db.mastery[s.id] = m;
  }
  db.board = { packs: [] };
  return db;
}

// The concepts a student can see on their map, with prerequisites and their lesson.
function studentMap(db, sid) {
  const st = db.users.find((u) => u.id === sid);
  const m = (db.mastery || {})[sid] || {};
  return CONCEPTS.filter((c) => c.grade <= st.grade).map((c) => ({ id: c.id, name: c.name, branch: c.branch, grade: c.grade, gradeLabel: gradeLabel(c.grade), pre: c.pre.filter((p) => C[p].grade <= st.grade), mastery: m[c.id] == null ? null : m[c.id], level: level(m[c.id]), lessonId: lessonId(db, c) }));
}
const conceptLessonIds = (db, maxGrade) => CONCEPTS.filter((c) => c.grade < maxGrade).map((c) => lessonId(db, c)).filter(Boolean);

// Columns for a class: the concepts taught at this grade, plus every earlier concept they rest on.
function classConcepts(cls) {
  const branch = BRANCH[cls.subject];
  const own = CONCEPTS.filter((c) => c.grade === cls.grade && (cls.grade === 0 || c.branch === branch)).map((c) => c.id);
  const pre = ancestors(own).filter((id) => C[id].grade < cls.grade && C[id].grade > 0);
  return { own, pre: pre.sort((a, b) => C[a].grade - C[b].grade) };
}

function classMap(db, cls) {
  const { own, pre } = classConcepts(cls);
  const sids = db.enrollments[cls.id] || [];
  const cols = [...pre, ...own];
  const rows = sids.map((sid) => ({ id: sid, name: db.users.find((u) => u.id === sid).name, m: cols.map((cid) => (db.mastery[sid] || {})[cid] ?? null) }));
  const summary = cols.map((cid, i) => {
    const vals = rows.map((r) => r.m[i]).filter((v) => v != null);
    const gap = vals.filter((v) => v < 60).length;
    return { id: cid, name: C[cid].name, grade: C[cid].grade, gradeLabel: gradeLabel(C[cid].grade), prereq: pre.includes(cid), lessonId: lessonId(db, C[cid]), gap, gapPct: vals.length ? Math.round((gap / vals.length) * 100) : 0, avg: vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null, gapStudents: rows.filter((r) => r.m[i] != null && r.m[i] < 60).map((r) => r.name) };
  });
  // AI advice: whole-class mini-lesson for the biggest prerequisite gap, small groups for the rest.
  const preGaps = summary.filter((s) => s.prereq && s.gap).sort((a, b) => b.gapPct - a.gapPct);
  const advice = [];
  if (preGaps[0] && preGaps[0].gapPct >= 35) advice.push({ kind: 'mini', conceptId: preGaps[0].id, text: `${preGaps[0].gapPct}% of the class is shaky on ${preGaps[0].name} (${preGaps[0].gradeLabel}). Start with a 10-minute whole-class mini-lesson before today's topic.` });
  preGaps.slice(advice.length ? 1 : 0, 3).forEach((g) => advice.push({ kind: 'group', conceptId: g.id, text: `${g.gap} ${g.gap === 1 ? 'student needs' : 'students need'} ${g.name} (${g.gradeLabel}): ${g.gapStudents.slice(0, 4).join(', ')}${g.gapStudents.length > 4 ? '…' : ''}. Send them the foundation lesson.` }));
  const checks = (db.checks || []).filter((k) => k.classId === cls.id).slice(-4).map((k) => ({ id: k.id, kind: k.kind, at: k.at, concepts: k.concepts.map((cid) => C[cid].name), correctPct: k.correctPct, responded: Object.keys(k.responses).length, of: sids.length }));
  return { cols: cols.map((cid) => ({ id: cid, name: C[cid].name, gradeLabel: gradeLabel(C[cid].grade), prereq: pre.includes(cid) })), rows, summary, advice, checks };
}

// A warm-up (on prerequisites) or exit ticket (on what was just taught). Everyone except the live demo student answers instantly.
function runCheck(db, cls, kind, foundationLesson, liveIds) {
  const { own, pre } = classConcepts(cls);
  const sids = db.enrollments[cls.id] || [];
  const avgOf = (cid) => { const v = sids.map((s) => (db.mastery[s] || {})[cid]).filter((x) => x != null); return v.reduce((a, b) => a + b, 0) / (v.length || 1); };
  let concepts;
  if (kind === 'exit') {
    const last = [...(db.checks || [])].reverse().find((k) => k.classId === cls.id && k.kind === 'warmup');
    concepts = last ? last.focus : pre.slice(0, 2);
  } else concepts = [...pre].sort((a, b) => avgOf(a) - avgOf(b)).slice(0, 4);
  if (!concepts.length) concepts = own.slice(0, 3);
  const questions = concepts.map((cid) => { const l = foundationLesson(lessonId(db, C[cid])); const q = l && l.quiz && l.quiz[0]; return q && { conceptId: cid, ...q }; }).filter(Boolean);
  const k = { id: require('crypto').randomBytes(5).toString('hex'), classId: cls.id, kind, at: Date.now(), concepts: questions.map((q) => q.conceptId), questions, responses: {}, focus: [] };
  for (const sid of sids) {
    if (liveIds.includes(sid)) continue;
    const res = questions.map((q) => {
      const m = (db.mastery[sid] || {})[q.conceptId] ?? 60;
      const boosted = kind === 'exit' ? Math.min(99, m + 14 + hash(sid + k.id) * 10) : m;
      return hash(sid + q.conceptId + k.id) * 100 < boosted;
    });
    applyAnswers(db, sid, k, res, kind === 'exit' ? 10 : 0);
  }
  const prog = (cid) => { const i = k.concepts.indexOf(cid); const r = Object.values(k.responses); return r.length ? r.filter((x) => x[i]).length / r.length : 1; };
  k.focus = [...k.concepts].sort((a, b) => prog(a) - prog(b)).slice(0, 2);
  scoreCheck(k);
  db.checks.push(k);
  db.checks = db.checks.slice(-40);
  return k;
}
function applyAnswers(db, sid, k, res, bonus) {
  k.responses[sid] = res;
  const m = db.mastery[sid] || (db.mastery[sid] = {});
  res.forEach((ok, i) => { const cid = k.concepts[i]; const cur = m[cid] ?? 60; m[cid] = clamp(cur * 0.7 + (ok ? 96 : 30) * 0.3 + bonus); });
}
function scoreCheck(k) {
  const all = Object.values(k.responses).flat();
  k.correctPct = all.length ? Math.round((all.filter(Boolean).length / all.length) * 100) : null;
  k.perConcept = k.concepts.map((cid, i) => { const r = Object.values(k.responses); return { id: cid, name: C[cid].name, pct: r.length ? Math.round((r.filter((x) => x[i]).length / r.length) * 100) : null }; });
}

function conceptForLessonTitle(db, title) {
  return CONCEPTS.find((c) => { const id = lessonId(db, c); const lib = (db.library || []).find((l) => l.id === id); return (lib ? lib.title : c.lesson) === title; });
}

// Principal view: gaps across the school's Grade 10 classes, with the earlier concept each gap starts in.
function schoolGaps(db) {
  const sids = db.users.filter((u) => u.role === 'student' && u.grade === 10).map((u) => u.id);
  const stat = (cid) => { const v = sids.map((s) => (db.mastery[s] || {})[cid]).filter((x) => x != null); return { gapPct: Math.round((v.filter((x) => x < 60).length / (v.length || 1)) * 100), avg: Math.round(v.reduce((a, b) => a + b, 0) / (v.length || 1)) }; };
  const list = CONCEPTS.filter((c) => c.grade >= 3 && c.grade <= 10).map((c) => ({ id: c.id, name: c.name, branch: c.branch, grade: c.grade, gradeLabel: gradeLabel(c.grade), ...stat(c.id) }));
  const roots = list.filter((c) => c.grade === 10 && c.gapPct >= 20).map((c) => {
    const pre = ancestors([c.id]).filter((p) => C[p].grade > 0).map((p) => list.find((x) => x.id === p)).filter(Boolean).sort((a, b) => b.gapPct - a.gapPct)[0];
    return pre && pre.gapPct > c.gapPct * 0.6 ? { concept: c.name, gapPct: c.gapPct, root: pre.name, rootGrade: pre.gradeLabel, rootGap: pre.gapPct } : null;
  }).filter(Boolean).sort((a, b) => b.rootGap - a.rootGap || b.gapPct - a.gapPct);
  const byClass = db.classes.filter((c) => c.grade === 10).map((cls) => { const { own, pre } = classConcepts(cls); const ids = db.enrollments[cls.id]; const cols = [...pre, ...own]; return { id: cls.id, name: cls.name, cells: cols.map((cid) => { const v = ids.map((s) => db.mastery[s][cid]).filter((x) => x != null); return { name: C[cid].name, gradeLabel: gradeLabel(C[cid].grade), gapPct: Math.round((v.filter((x) => x < 60).length / (v.length || 1)) * 100) }; }) }; });
  return { students: sids.length, concepts: list, roots, byClass };
}

// ---------- board (district) view: aggregated only, no student names ----------
const BOARD_CONCEPTS = ['s-energy', 'e-main', 'm-pattern', 'm-onestep', 'e-opinion', 's-cells', 'm-coord', 'm-expo', 's-react'];
const EXAMS = [
  { id: 'g6', name: 'Grade 6 Reading, Writing & Math', short: 'Grade 6', concepts: ['e-main', 'm-pattern', 'e-opinion', 'm-onestep'], type: 'elementary' },
  { id: 'g9', name: 'Grade 9 Math', short: 'Grade 9 Math', concepts: ['m-onestep', 'm-coord', 'm-expo'], type: 'secondary' },
  { id: 'osslt', name: 'Grade 10 Literacy Test (OSSLT)', short: 'OSSLT', concepts: ['e-main', 'e-opinion'], type: 'secondary' },
];
// [id, name, type, enrollment, attendance, atRisk%, alert response hrs, meeting follow-through %, recap adoption %, gap bias per concept]
const SCHOOLS = [
  ['riverside', 'Riverside Public School', 'elementary', 486, 95.2, 7, 14, 88, 92, { 'm-coord': 18 }],
  ['maple', 'Maple Grove Public School', 'elementary', 552, 94.6, 9, 20, 81, 78, { 'm-coord': 22, 'm-pattern': 8 }],
  ['cedar', 'Cedar Heights Public School', 'elementary', 618, 89.1, 17, 31, 64, 34, { 'm-coord': 26, 'e-main': 10, 'm-onestep': 12 }],
  ['hillcrest', 'Hillcrest Public School', 'elementary', 431, 93.4, 12, 19, 77, 71, { 'e-main': 24, 'e-opinion': 18 }],
  ['lakeview', 'Lakeview Secondary School', 'secondary', 1342, 93.8, 8, 16, 84, 88, { 'm-coord': 6 }],
  ['westbrook', 'Westbrook Secondary School', 'secondary', 1188, 90.2, 15, 71, 38, 62, { 'm-coord': 24, 'm-expo': 14, 's-react': 10 }],
  ['pinecrest', 'Pinecrest Collegiate', 'secondary', 964, 92.7, 11, 22, 73, 80, { 'm-coord': 20, 'e-opinion': 12 }],
];

function boardView(db) {
  const gaps = schoolGaps(db);
  const nvAtt = (() => { const recs = db.attendance || []; return recs.length ? Math.round((recs.filter((a) => a.status !== 'absent').length / recs.length) * 1000) / 10 : 93; })();
  const risk = require('./risk');
  const g10 = db.users.filter((u) => u.role === 'student' && u.grade === 10);
  const nvRisk = Math.round((g10.filter((s) => risk.assess(db, s.id).level === 'high').length / (g10.length || 1)) * 100);
  const nvGap = Object.fromEntries(BOARD_CONCEPTS.map((cid) => [cid, (gaps.concepts.find((c) => c.id === cid) || {}).gapPct ?? null]));
  const schools = SCHOOLS.map(([id, name, type, enrollment, attendance, atRisk, responseHrs, followThrough, adoption, bias]) => ({
    id, name, type, enrollment, attendance, atRisk, responseHrs, followThrough, adoption,
    gaps: Object.fromEntries(BOARD_CONCEPTS.map((cid) => [cid, type === 'elementary' && C[cid].grade > 8 ? null : Math.max(3, Math.round(8 + hash(id + cid) * 14 + (bias[cid] || 0)))])),
  }));
  schools.splice(5, 0, { id: 'northview', name: 'Northview Secondary School', type: 'secondary', enrollment: 1126, attendance: nvAtt, atRisk: nvRisk, responseHrs: 18, followThrough: Math.min(95, 70 + db.meetings.length * 3), adoption: 94, gaps: nvGap, live: true });
  for (const s of schools) {
    s.readiness = Object.fromEntries(EXAMS.filter((e) => e.type === s.type).map((e) => { const g = e.concepts.map((c) => s.gaps[c]).filter((x) => x != null); return [e.id, Math.max(35, Math.round(100 - (g.reduce((a, b) => a + b, 0) / (g.length || 1)) * 1.15))]; }));
    s.funnel = { alerts: Math.round(s.enrollment * s.atRisk / 100 * 1.6), contacted: null, meetings: null, held: null };
    s.funnel.contacted = Math.round(s.funnel.alerts * Math.max(0.35, 1 - s.responseHrs / 120));
    s.funnel.meetings = Math.round(s.funnel.contacted * (s.followThrough / 100));
    s.funnel.held = Math.round(s.funnel.meetings * 0.86);
  }
  const med = (a) => { const b = [...a].sort((x, y) => x - y); return b[Math.floor(b.length / 2)]; };
  const medResp = med(schools.map((s) => s.responseHrs));
  const insights = [];
  const wideGaps = BOARD_CONCEPTS.map((cid) => ({ cid, n: schools.filter((s) => s.gaps[cid] != null && s.gaps[cid] >= 30).length })).sort((a, b) => b.n - a.n);
  if (wideGaps[0].n >= 3) insights.push({ level: 'high', title: `${C[wideGaps[0].cid].name} (${gradeLabel(C[wideGaps[0].cid].grade)}) is a gap at ${wideGaps[0].n} of ${schools.length} schools`, body: `It feeds Grade 9 Math and every Grade 10 graphing unit. A board-wide review pack this term would reach about ${schools.filter((s) => s.gaps[wideGaps[0].cid] >= 30).reduce((n, s) => n + s.enrollment, 0).toLocaleString()} students.`, action: { exam: 'g9' } });
  schools.filter((s) => s.responseHrs > medResp * 2).forEach((s) => insights.push({ level: 'high', title: `${s.name}: families wait ${s.responseHrs} hours after an alert`, body: `That's ${Math.round(s.responseHrs / medResp)}× the board median of ${medResp}h, and only ${s.followThrough}% of alerts become a held meeting. Likely a staffing bottleneck in guidance or the main office.`, school: s.id }));
  schools.filter((s) => s.adoption < 50).forEach((s) => insights.push({ level: 'watch', title: `${s.name}: only ${s.adoption}% of teachers publish class recaps`, body: `Attendance is also the lowest on the board (${s.attendance}%). Students who miss class have nothing to catch up from. A 30-minute staff PD session usually fixes adoption.`, school: s.id }));
  schools.filter((s) => s.gaps['e-main'] >= 30).forEach((s) => insights.push({ level: 'watch', title: `${s.name}: reading for main idea is a ${s.gaps['e-main']}% gap`, body: `This drives Grade 6 reading and later the OSSLT. Readiness for Grade 6 is ${s.readiness.g6 ?? '–'}%.`, action: { exam: 'g6' }, school: s.id }));
  const tot = schools.reduce((n, s) => n + s.enrollment, 0);
  const wavg = (k) => Math.round((schools.reduce((n, s) => n + s[k] * s.enrollment, 0) / tot) * 10) / 10;
  return {
    name: 'Lakeshore Valley District School Board', schools, concepts: BOARD_CONCEPTS.map((cid) => ({ id: cid, name: C[cid].name, gradeLabel: gradeLabel(C[cid].grade) })), exams: EXAMS,
    totals: { schools: schools.length, students: tot, attendance: wavg('attendance'), atRisk: wavg('atRisk'), medianResponse: medResp, followThrough: Math.round(wavg('followThrough')) },
    insights, packs: (db.board && db.board.packs) || [],
  };
}

module.exports = { CONCEPTS, seed, studentMap, classMap, runCheck, applyAnswers, scoreCheck, schoolGaps, boardView, conceptForLessonTitle, conceptLessonIds, lessonId, C };
