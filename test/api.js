// API smoke test: node test/api.js
process.env.DATA_FILE = require('path').join(require('os').tmpdir(), 'ol-test-' + Date.now() + '.json');
const assert = require('assert');
const { server } = require('../src/server');
let port, pass = 0;
const jar = {};
async function call(who, method, p, body) {
  const r = await fetch(`http://127.0.0.1:${port}${p}`, { method, headers: { 'Content-Type': 'application/json', cookie: jar[who] || '' }, body: body ? JSON.stringify(body) : undefined });
  const sc = r.headers.get('set-cookie'); if (sc) jar[who] = sc.split(';')[0];
  return { status: r.status, body: await r.json() };
}
const ok = (c, m) => { assert.ok(c, m); pass++; };
server.listen(0, async () => {
  port = server.address().port;
  try {
    for (const role of ['student', 'parent', 'teacher', 'admin']) ok((await call(role, 'POST', '/api/login', { demo: role })).status === 200, 'login ' + role);
    ok((await call('x', 'GET', '/api/bootstrap')).status === 401, 'unauth blocked');
    ok((await call('x', 'POST', '/api/login', { email: 'student@orbitlearn.demo', password: 'nope' })).status === 401, 'bad pw');
    const s = (await call('student', 'GET', '/api/bootstrap')).body;
    ok(s.me.name === 'Tyler Brooks', 'student is Tyler');
    ok(s.recaps.length === 9 && s.recaps[0].flashcards.length > 0 && s.recaps[0].quiz.length > 0, 'recaps with cards+quiz');
    ok(s.risk.level === 'high', 'Tyler high risk: ' + s.risk.level + ' ' + s.risk.reasons);
    ok(s.assignments.some((a) => a.state === 'missing'), 'missing work');
    const t = (await call('teacher', 'GET', '/api/bootstrap')).body;
    ok(t.classes.length === 2, 'teacher has 2 classes');
    const lv = t.classes[0].roster.map((r) => r.risk);
    ok(lv.includes('high') && lv.includes('ok'), 'roster mixed risk ' + lv);
    const a = await call('admin', 'GET', '/api/bootstrap');
    ok(a.body.counts.high >= 2 && a.body.counts.students === 10, 'admin counts ' + JSON.stringify(a.body.counts));
    // assistant
    let r = await call('student', 'POST', '/api/assistant', { message: 'what is mitochondria' });
    ok(/powerhouse/i.test(r.body.text), 'assistant answers: ' + r.body.text);
    r = await call('student', 'POST', '/api/assistant', { message: 'make flashcards for biology' });
    ok(r.body.flashcards && r.body.flashcards.length, 'flashcards');
    r = await call('student', 'POST', '/api/assistant', { message: 'quiz me on math' });
    ok(r.body.quiz && r.body.quiz.length && r.body.quiz[0].options.length >= 2, 'quiz');
    r = await call('student', 'POST', '/api/assistant', { message: 'do my homework for me' });
    ok(/can't do your assignment/.test(r.body.text), 'boundary');
    // risk notify -> parent notified + email
    r = await call('teacher', 'POST', '/api/risk/notify', { studentId: s.me.id });
    ok(r.body.notified === 1, 'notify parent');
    const p = (await call('parent', 'GET', '/api/bootstrap')).body;
    ok(p.notifications.some((n) => n.type === 'risk'), 'parent got risk alert');
    ok((await call('admin', 'GET', '/api/bootstrap')).body.outbox.some((e) => /needs some support/.test(e.subject)), 'email in outbox');
    // meeting flow
    const teacherId = t.me.id;
    ok((await call('parent', 'POST', '/api/meetings', { teacherId, reason: 'Catch up plan', slot: 'Tue 3:30 PM' })).status === 200, 'meeting request');
    const tm = (await call('teacher', 'GET', '/api/bootstrap')).body.meetings.find((m) => m.reason === 'Catch up plan');
    ok((await call('teacher', 'POST', '/api/meetings/respond', { id: tm.id, status: 'confirmed' })).status === 200, 'confirm meeting');
    // recap generate + publish w homework
    const g = await call('teacher', 'POST', '/api/recaps/generate', { classId: 'bio', title: 'Genetics', notes: 'DNA is the molecule that carries genetic instructions. A gene is a section of DNA that codes for a trait. Alleles are different versions of the same gene. Dominant alleles show up even if only one copy is present. Recessive alleles only show when two copies are present.' });
    ok(g.body.recap.status === 'draft' && g.body.recap.keyTerms.length >= 3, 'draft recap ' + JSON.stringify(g.body.recap.keyTerms.map((k) => k.term)));
    const na = await call('teacher', 'POST', '/api/assignments', { classId: 'bio', title: 'Punnett square practice', due: '2099-01-01' });
    ok((await call('teacher', 'POST', '/api/recaps/publish', { id: g.body.recap.id, homework: [na.body.id] })).status === 200, 'publish');
    ok((await call('student', 'GET', '/api/bootstrap')).body.recaps.some((x) => x.title === 'Genetics'), 'student sees recap');
    ok((await call('parent', 'GET', '/api/bootstrap')).body.notifications.some((n) => /homework in Biology/.test(n.title)), 'parent homework alert');
    ok((await call('teacher', 'POST', '/api/recaps/generate', { classId: 'math', title: 'x', notes: 'y'.repeat(80) })).status === 403, 'not my class');
    // announcements
    ok((await call('teacher', 'POST', '/api/announcements', { scope: 'school', title: 'x', body: 'y' })).status === 403, 'teacher cant school-wide');
    r = await call('admin', 'POST', '/api/announcements', { scope: 'school', title: 'Lockdown drill', body: 'Drill at 10am', urgent: true });
    ok(r.body.reached > 20, 'urgent reach ' + r.body.reached);
    // submit
    const todo = s.assignments.find((x) => x.state === 'todo');
    ok((await call('student', 'POST', '/api/submit', { assignmentId: todo.id })).status === 200, 'submit');
    ok((await call('parent', 'POST', '/api/community', { classId: 'bio', body: 'hi all' })).status === 200, 'community');
    ok((await call('admin', 'POST', '/api/settings', { level: 'university' })).status === 200, 'level');
    ok((await call('admin', 'GET', '/api/bootstrap')).body.labels.guardian === 'Advisor', 'labels change');
    ok((await call('admin', 'POST', '/api/risk/run', {})).status === 200, 'run check');
    console.log('PASS', pass);
  } catch (e) { console.error('FAIL after', pass, e.message); process.exitCode = 1; }
  server.close(); process.exit();
});
