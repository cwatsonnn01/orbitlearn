// Demo school data. Dates are relative to the day the server starts so the demo always looks current.
'use strict';
const crypto = require('crypto');
const ai = require('./ai');

const DAY = 86400000;
const iso = (d) => new Date(d).toISOString().slice(0, 10);
const daysAgo = (n) => iso(Date.now() - n * DAY);
const daysAhead = (n) => iso(Date.now() + n * DAY);
const id = () => crypto.randomBytes(6).toString('hex');

// Weekdays in the last `n` calendar days (most recent last).
function schoolDays(n) {
  const out = [];
  for (let i = n; i >= 1; i--) {
    const d = new Date(Date.now() - i * DAY);
    if (d.getDay() !== 0 && d.getDay() !== 6) out.push(iso(d));
  }
  return out;
}

const LESSONS = {
  bio: [
    { title: 'Cell structure', ago: 16, notes: 'The cell is the basic unit of life. The nucleus is the control centre of the cell and holds its DNA. Mitochondria are the powerhouse of the cell because they release energy through cellular respiration. The cell membrane is the thin layer that controls what enters and leaves the cell. Chloroplasts are the parts of plant cells where photosynthesis happens, and animal cells do not have them. Remember that structure always matches function.' },
    { title: 'Mitosis', ago: 9, notes: 'Mitosis is the process where one cell divides into two identical daughter cells. Interphase is the stage where the cell grows and copies its DNA. Prophase is when chromosomes condense and become visible. Metaphase is when chromosomes line up in the middle of the cell. Anaphase is when sister chromatids are pulled apart to opposite poles. Telophase is when two new nuclei form. It is important for growth and repairing damaged tissue.' },
    { title: 'Photosynthesis', ago: 2, notes: 'Photosynthesis is the process plants use to turn light energy into chemical energy. Chlorophyll is the green pigment in chloroplasts that absorbs light. The inputs are carbon dioxide, water and sunlight. The outputs are glucose and oxygen. Glucose stores energy that the plant uses to grow. Without photosynthesis there would be almost no oxygen in the atmosphere, so it matters for every living thing.' },
  ],
  math: [
    { title: 'Linear equations', ago: 15, notes: 'A linear equation is an equation whose graph is a straight line. Slope is the rate of change, calculated as rise over run. The y-intercept is where the line crosses the y-axis. Slope-intercept form is written as y equals mx plus b. A positive slope rises from left to right, and a negative slope falls. Parallel lines always have the same slope.' },
    { title: 'Systems of equations', ago: 8, notes: 'A system of equations is two or more equations solved together. The solution is the point where the lines intersect. Substitution is a method where you solve one equation for a variable and plug it into the other. Elimination is a method where you add or subtract equations to cancel a variable. If the lines are parallel, the system has no solution. Always check your answer in both equations.' },
    { title: 'Quadratic functions', ago: 1, notes: 'A quadratic function has the form y equals ax squared plus bx plus c. A parabola is the U-shaped curve you get when you graph a quadratic. The vertex is the highest or lowest point of the parabola. The axis of symmetry is the vertical line through the vertex. If a is positive the parabola opens up, and if a is negative it opens down. Roots are the points where the parabola crosses the x-axis.' },
  ],
  eng: [
    { title: 'Theme and symbolism', ago: 14, notes: 'Theme is the central message or lesson of a story. Symbolism is when an object, person or colour stands for a bigger idea. In To Kill a Mockingbird, the mockingbird symbolizes innocence. Foreshadowing is a hint about what will happen later in the story. Strong essays connect symbols back to the theme with evidence from the text.' },
    { title: 'Writing a thesis', ago: 7, notes: 'A thesis is one clear sentence that states your argument. A strong thesis is specific, arguable and answers the essay question. Evidence is a quote or example from the text that supports your point. Analysis explains how your evidence proves your thesis. PEA is the paragraph structure to remember: point, evidence, analysis, for every body paragraph.' },
    { title: 'Persuasive techniques', ago: 3, notes: 'Ethos is an appeal to credibility and trust. Pathos is an appeal to emotion. Logos is an appeal to logic, facts and reasoning. A counterargument is an opposing view that you address to make your argument stronger. Rhetorical questions make the audience think without expecting an answer. Good persuasive writing balances all three appeals.' },
  ],
};

function seed(level = 'high') {
  const pw = 'demo1234';
  const users = [];
  const add = (u) => { users.push({ id: id(), password: pw, ...u }); return users[users.length - 1]; };

  const admin = add({ role: 'admin', name: 'Principal Grant', email: 'admin@orbitlearn.demo' });
  const rivera = add({ role: 'teacher', name: 'Ms. Rivera', email: 'teacher@orbitlearn.demo' });
  const chen = add({ role: 'teacher', name: 'Mr. Chen', email: 'chen@orbitlearn.demo' });
  const okafor = add({ role: 'teacher', name: 'Mrs. Okafor', email: 'okafor@orbitlearn.demo' });

  const classes = [
    { id: 'bio', name: 'Biology 10', subject: 'Biology', teacherId: rivera.id, room: 'Room 204', color: '#16a34a' },
    { id: 'math', name: 'Math 10', subject: 'Math', teacherId: chen.id, room: 'Room 112', color: '#4f46e5' },
    { id: 'eng', name: 'English 10', subject: 'English', teacherId: okafor.id, room: 'Room 318', color: '#ea580c' },
  ];
  // Ms. Rivera also covers English in the demo so the teacher login sees two classes.
  classes[2].coTeacherId = rivera.id;

  const roster = [
    ['Tyler', 'Brooks', 'Dana Brooks', 'at-risk'],
    ['Maya', 'Johnson', 'Andre Johnson', 'star'],
    ['Liam', 'Nguyen', 'Kim Nguyen', 'ok'],
    ['Sofia', 'Martinez', 'Elena Martinez', 'watch'],
    ['Noah', 'Patel', 'Ravi Patel', 'ok'],
    ['Ava', 'Williams', 'Grace Williams', 'star'],
    ['Ethan', 'Clarke', 'Mark Clarke', 'at-risk'],
    ['Zara', 'Ahmed', 'Nadia Ahmed', 'ok'],
    ['Jayden', 'Thompson', 'Lisa Thompson', 'ok'],
    ['Chloe', 'Bennett', 'Paul Bennett', 'watch'],
  ];
  const students = [];
  const profiles = {};
  roster.forEach(([first, last, parentName, profile], i) => {
    const s = add({
      role: 'student', name: `${first} ${last}`, grade: 10,
      email: i === 0 ? 'student@orbitlearn.demo' : `${first.toLowerCase()}@orbitlearn.demo`,
    });
    add({
      role: 'parent', name: parentName, childId: s.id,
      email: i === 0 ? 'parent@orbitlearn.demo' : `${parentName.split(' ')[0].toLowerCase()}.parent@orbitlearn.demo`,
    });
    students.push(s);
    profiles[s.id] = profile;
  });
  const enrollments = Object.fromEntries(classes.map((c) => [c.id, students.map((s) => s.id)]));

  // Attendance for the last 3 weeks.
  const days = schoolDays(21);
  const attendance = [];
  students.forEach((s, si) => {
    const p = profiles[s.id];
    classes.forEach((c, ci) => {
      days.forEach((d, di) => {
        let status = 'present';
        const recent = di >= days.length - 6;
        if (p === 'at-risk' && recent && (di + ci + si) % 5 === 0) status = 'absent';
        else if (p === 'watch' && di % 7 === ci) status = 'late';
        else if (p === 'ok' && (si * 3 + di + ci) % 23 === 0) status = 'absent';
        attendance.push({ studentId: s.id, classId: c.id, date: d, status });
      });
    });
  });

  // Assignments: some graded, some due soon.
  const assignments = [];
  const submissions = [];
  const A = (classId, title, dueIn, points = 100) => {
    const a = { id: id(), classId, title, due: dueIn < 0 ? daysAgo(-dueIn) : daysAhead(dueIn), points, createdAt: daysAgo(Math.max(1, -dueIn + 5)) };
    assignments.push(a);
    return a;
  };
  const graded = [
    A('bio', 'Cell diagram lab', -12), A('bio', 'Mitosis worksheet', -5),
    A('math', 'Slope practice set', -11), A('math', 'Systems quiz', -4),
    A('eng', 'Symbolism paragraph', -10), A('eng', 'Thesis draft', -3),
  ];
  const upcoming = [A('bio', 'Photosynthesis lab report', 4), A('math', 'Quadratics worksheet', 2), A('eng', 'Persuasive essay outline', 6)];

  const base = { star: 93, ok: 81, watch: 71, 'at-risk': 61 };
  students.forEach((s, si) => {
    const p = profiles[s.id];
    graded.forEach((a, ai_) => {
      const missing = (p === 'at-risk' && (ai_ === 3 || (si === 0 && ai_ === 5))) || (p === 'watch' && si === 3 && ai_ === 3);
      if (missing) return;
      const jitter = ((si * 7 + ai_ * 13) % 15) - 7;
      const score = Math.max(30, Math.min(100, base[p] + jitter));
      submissions.push({ assignmentId: a.id, studentId: s.id, submittedAt: a.due, score: Math.round((score / 100) * a.points) });
    });
    if (p === 'star') upcoming.slice(0, 1).forEach((a) => submissions.push({ assignmentId: a.id, studentId: s.id, submittedAt: daysAgo(0), score: null }));
  });

  // Recaps generated from lesson notes (published, teacher-approved).
  const recaps = [];
  for (const c of classes) {
    const pool = LESSONS[c.id].flatMap((l) => ai.keyTerms(l.notes, 6));
    for (const l of LESSONS[c.id]) {
      const gen = ai.generateRecap({ subject: c.subject, title: l.title, notes: l.notes, level }, pool);
      const hw = assignments.filter((a) => a.classId === c.id && Math.abs(new Date(a.createdAt) - new Date(daysAgo(l.ago))) < 3 * DAY).map((a) => a.id);
      recaps.push({ id: id(), classId: c.id, date: daysAgo(l.ago), title: l.title, notes: l.notes, ...gen, homework: hw, status: 'published', approvedBy: c.teacherId });
    }
  }

  const tyler = students[0];
  const maya = students[1];
  const now = Date.now();
  const announcements = [
    { id: id(), scope: 'school', title: 'PA Day: Friday', body: 'No classes this Friday. Enjoy the long weekend!', urgent: false, authorId: admin.id, createdAt: now - 2 * DAY },
    { id: id(), scope: 'school', title: 'Winter concert tickets', body: 'Tickets for the winter concert are now available at the main office.', urgent: false, authorId: admin.id, createdAt: now - 5 * DAY },
    { id: id(), scope: 'bio', title: 'Lab coats on Thursday', body: 'Please bring a lab coat or old shirt for Thursday’s photosynthesis lab.', urgent: false, authorId: rivera.id, createdAt: now - 1 * DAY },
    { id: id(), scope: 'math', title: 'Unit test next week', body: 'Our quadratics unit test is next Wednesday. Use your Study Vault to review!', urgent: false, authorId: chen.id, createdAt: now - 3 * DAY },
  ];
  const shoutouts = [
    { id: id(), classId: 'bio', studentId: maya.id, text: 'Amazing cell model, Maya! Best in the class.', authorId: rivera.id, createdAt: now - 3 * DAY },
    { id: id(), classId: 'eng', studentId: students[5].id, text: 'Ava’s thesis was so sharp it became our class example.', authorId: okafor.id, createdAt: now - 2 * DAY },
    { id: id(), classId: 'math', studentId: students[2].id, text: 'Liam helped three classmates with systems of equations. Great teamwork!', authorId: chen.id, createdAt: now - 1 * DAY },
  ];
  const parents = users.filter((u) => u.role === 'parent');
  const community = [
    { id: id(), classId: 'bio', authorId: parents[1].id, body: 'Does anyone have a spare lab coat for Thursday? Ours ripped!', createdAt: now - 20 * 3600000, replies: [{ authorId: parents[2].id, body: 'We have an extra one, I’ll send it with Liam.', createdAt: now - 18 * 3600000 }] },
    { id: id(), classId: 'math', authorId: parents[4].id, body: 'Study group at the library Saturday at 11 for the quadratics test. All welcome!', createdAt: now - 30 * 3600000, replies: [] },
  ];
  const meetings = [
    { id: id(), requesterId: parents[3].id, teacherId: rivera.id, studentId: students[3].id, reason: 'Sofia has been late a few times. Can we talk about mornings?', slot: new Date(Date.now() + 2 * DAY).toLocaleDateString('en', { month: 'short', day: 'numeric' }) + ', 3:30 PM', status: 'requested', createdAt: now - 6 * 3600000 },
  ];

  return {
    school: { name: 'Northview Secondary School', level, district: 'Peel District (demo)' },
    users, classes, enrollments, attendance, assignments, submissions, recaps,
    announcements, shoutouts, community, meetings,
    notifications: [], outbox: [], riskNotices: {}, quizAttempts: [],
    trend: [72, 73, 71, 74, 75, 74, 76].map((v, i) => ({ month: new Date(now - (6 - i) * 30 * DAY).toLocaleString('en', { month: 'short' }), avg: v })),
    seededAt: now,
    _ids: { tyler: tyler.id },
  };
}

module.exports = { seed, id, daysAgo, daysAhead };
