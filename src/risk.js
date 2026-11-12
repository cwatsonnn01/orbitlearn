// At-risk engine: attendance, missing work and grades -> a risk level with reasons.
'use strict';

const DAY = 86400000;
const today = () => new Date().toISOString().slice(0, 10);

function classStats(db, studentId, classId) {
  const cutoff = new Date(Date.now() - 14 * DAY).toISOString().slice(0, 10);
  const att = db.attendance.filter((a) => a.studentId === studentId && a.classId === classId);
  const recent = att.filter((a) => a.date >= cutoff);
  const absences = recent.filter((a) => a.status === 'absent').length;
  const lates = recent.filter((a) => a.status === 'late').length;
  const attendanceRate = att.length ? Math.round((att.filter((a) => a.status !== 'absent').length / att.length) * 100) : 100;

  const asg = db.assignments.filter((a) => a.classId === classId);
  const subs = db.submissions.filter((s) => s.studentId === studentId);
  const subFor = (a) => subs.find((s) => s.assignmentId === a.id);
  const missing = asg.filter((a) => a.due < today() && !subFor(a));
  const scored = asg.map((a) => ({ a, s: subFor(a) })).filter((x) => x.s && x.s.score != null);
  // Average of graded work; missing work is flagged separately so one late item doesn't read as a 0% class.
  const pts = scored.reduce((n, x) => n + x.s.score, 0);
  const max = scored.reduce((n, x) => n + x.a.points, 0);
  const average = max ? Math.round((pts / max) * 100) : null;
  return { classId, absences, lates, attendanceRate, missing: missing.map((a) => ({ id: a.id, title: a.title, due: a.due })), average };
}

function assess(db, studentId) {
  const classIds = Object.keys(db.enrollments).filter((c) => db.enrollments[c].includes(studentId));
  const perClass = classIds.map((c) => classStats(db, studentId, c));
  const reasons = [];
  let points = 0;
  const name = (c) => (db.classes.find((x) => x.id === c) || {}).subject || c;
  const totalAbs = perClass.reduce((n, c) => n + c.absences, 0);
  if (totalAbs >= 3) { reasons.push(`${totalAbs} absences in the last 2 weeks`); points += totalAbs >= 5 ? 2 : 1; }
  for (const c of perClass) {
    if (c.missing.length >= 2) { reasons.push(`${c.missing.length} missing assignments in ${name(c.classId)}`); points += 2; }
    else if (c.missing.length === 1) { reasons.push(`Missing "${c.missing[0].title}" in ${name(c.classId)}`); points += 1; }
    if (c.average != null && c.average < 60) { reasons.push(`Failing ${name(c.classId)} (${c.average}%)`); points += 2; }
    else if (c.average != null && c.average < 70) { reasons.push(`Low grade in ${name(c.classId)} (${c.average}%)`); points += 1; }
    if (c.lates >= 3) { reasons.push(`Late ${c.lates} times in ${name(c.classId)}`); points += 1; }
  }
  const level = points >= 3 ? 'high' : points >= 1 ? 'watch' : 'ok';
  const avgs = perClass.map((c) => c.average).filter((x) => x != null);
  const overall = avgs.length ? Math.round(avgs.reduce((a, b) => a + b, 0) / avgs.length) : null;
  return { studentId, level, points, reasons, perClass, overall };
}

// Suggested next steps for an action plan.
function actionPlan(r) {
  const steps = [];
  for (const c of r.perClass) {
    for (const m of c.missing) steps.push(`Hand in "${m.title}" (was due ${new Date(m.due + 'T12:00:00').toLocaleDateString('en', { month: 'short', day: 'numeric' })}).`);
  }
  if (r.reasons.some((x) => x.includes('absences'))) steps.push('Attend every class this week and check the class recap for anything missed.');
  if (r.reasons.some((x) => /Failing|Low grade/.test(x))) steps.push('Use the Study Vault quizzes 3 times this week and book a 1:1 with the teacher.');
  if (r.reasons.some((x) => x.includes('Late'))) steps.push('Aim to arrive 5 minutes early; set a morning reminder.');
  return steps.slice(0, 5);
}

module.exports = { assess, classStats, actionPlan, today };
