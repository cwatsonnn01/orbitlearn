// Multi-level demo data: a kindergarten class, a university course, concept tags,
// and the Foundations library that bridges older students back to earlier-grade lessons.
'use strict';
const ai = require('./ai');

const DAY = 86400000;
const iso = (d) => new Date(d).toISOString().slice(0, 10);
const daysAgo = (n) => iso(Date.now() - n * DAY);
const daysAhead = (n) => iso(Date.now() + n * DAY);

// grade: 0 = kindergarten, 1-12 = grades, 13 = university
function band(grade) {
  const g = Number(grade);
  if (g === 0) return 'kinder';
  if (g <= 5) return 'elementary';
  if (g <= 8) return 'middle';
  if (g <= 12) return 'high';
  return 'university';
}
function gradeLabel(grade) {
  const g = Number(grade);
  return g === 0 ? 'Kindergarten' : g === 13 ? 'University' : `Grade ${g}`;
}

// Concept tags for the existing Grade 10 lessons (by title).
const TAGS = {
  'Cell structure': ['cells', 'energy'],
  'Mitosis': ['cells', 'cell-division'],
  'Photosynthesis': ['plants', 'energy', 'chemical-reactions'],
  'Linear equations': ['equations', 'graphing', 'rate'],
  'Systems of equations': ['equations', 'graphing'],
  'Quadratic functions': ['graphing', 'exponents', 'equations'],
  'Theme and symbolism': ['story-elements', 'main-idea'],
  'Writing a thesis': ['main-idea', 'evidence'],
  'Persuasive techniques': ['opinion-writing', 'evidence'],
};

// Earlier-grade lessons used as Foundations.
const LIBRARY = [
  { grade: 3, subject: 'Science', title: 'Living things need energy', concepts: ['energy', 'plants'], notes: 'Energy is what living things need to move, grow and stay warm. Food is how animals get energy. Sunlight is how plants get energy. Plants are living things that make their own food. A food chain is the path energy takes from plants to animals.' },
  { grade: 7, subject: 'Science', title: 'Introduction to cells', concepts: ['cells', 'cell-division'], notes: 'A cell is the smallest living part of every living thing. A microscope is a tool that makes cells big enough to see. The nucleus is the part of the cell that holds the instructions. The membrane is the skin around a cell. Cells divide to make new cells so living things can grow.' },
  { grade: 9, subject: 'Science', title: 'Chemical reactions basics', concepts: ['chemical-reactions', 'energy'], notes: 'A chemical reaction is a process that turns substances into new substances. Reactants are the substances you start with. Products are the substances you end with. Energy is often released or absorbed during a reaction. Mass is never lost in a reaction, it is only rearranged.' },
  { grade: 10, subject: 'Biology', title: 'DNA and genes', concepts: ['dna', 'cell-division'], notes: 'DNA is the molecule that carries the instructions for every living thing. A gene is a section of DNA that codes for one trait. Chromosomes are tightly packed bundles of DNA. Before a cell divides, it copies its DNA so each new cell gets a full set.' },
  { grade: 5, subject: 'Math', title: 'Patterns and input-output tables', concepts: ['graphing', 'rate', 'equations'], notes: 'A pattern is something that repeats or grows by a rule. A rule is the instruction that turns an input into an output. An input-output table is a chart that shows what happens when you apply a rule. Plotting the pairs on a grid shows the pattern as a picture.' },
  { grade: 6, subject: 'Math', title: 'Solving one-step equations', concepts: ['equations'], notes: 'An equation is a math sentence that says two things are equal. A variable is a letter that stands for an unknown number. Inverse operations are operations that undo each other, like adding and subtracting. To solve an equation, do the same thing to both sides until the variable is alone.' },
  { grade: 8, subject: 'Math', title: 'Graphing on the coordinate plane', concepts: ['graphing', 'rate'], notes: 'The coordinate plane is a grid made by a horizontal x-axis and a vertical y-axis. An ordered pair is two numbers that give a point’s location, like (3, 2). The origin is the point (0, 0) where the axes meet. A straight line on the grid shows a constant rate of change.' },
  { grade: 8, subject: 'Math', title: 'Exponents and squares', concepts: ['exponents'], notes: 'An exponent is a small number that tells you how many times to multiply a number by itself. A square is a number multiplied by itself, like 5 squared equals 25. A square root is the number that was squared to get a value. Squares grow faster and faster, which is why their graphs curve.' },
  { grade: 4, subject: 'English', title: 'Main idea and details', concepts: ['main-idea', 'story-elements'], notes: 'The main idea is what a text is mostly about. Details are facts or examples that support the main idea. A character is a person or animal in a story. The setting is where and when a story happens. Finding the main idea first makes the details easier to remember.' },
  { grade: 6, subject: 'English', title: 'Opinion writing with reasons', concepts: ['opinion-writing', 'evidence'], notes: 'An opinion is what you believe about a topic. A reason is why you believe it. Evidence is a fact or example that backs up your reason. A strong opinion piece states the opinion, gives reasons with evidence, and ends with a conclusion.' },
];

const K_LESSONS = [
  { title: 'How plants grow', ago: 4, concepts: ['plants', 'energy'], notes: 'Plants need sun, water and soil to grow. A seed is a baby plant. Roots drink water from the soil. Leaves catch the sunlight.' },
  { title: 'Shapes all around us', ago: 2, concepts: ['shapes'], notes: 'A circle is round like a ball. A square has four sides that are the same. A triangle has three sides. We found shapes all over our classroom.' },
  { title: 'Counting to 20', ago: 1, concepts: ['counting'], notes: 'Counting tells us how many. Twenty is two groups of ten. We counted blocks, crayons and friends. Ten is the number of fingers we have.' },
];
const U_LESSONS = [
  { title: 'DNA replication', ago: 9, concepts: ['dna', 'cell-division'], notes: 'DNA replication is the process of copying a cell’s entire genome before division. Helicase is the enzyme that unzips the double helix. DNA polymerase is the enzyme that adds nucleotides to the new strand. The leading strand is built continuously toward the replication fork. Okazaki fragments are the short pieces made on the lagging strand. Replication is semi-conservative, so each new molecule keeps one original strand.' },
  { title: 'Cell cycle regulation', ago: 5, concepts: ['cell-division', 'cells'], notes: 'The cell cycle is the ordered series of events from one division to the next. Checkpoints are control points that stop the cycle if something is wrong. Cyclins are proteins whose levels rise and fall to drive the cycle forward. p53 is a tumour suppressor that halts division when DNA is damaged. Cancer is uncontrolled division caused by failures in this regulation.' },
  { title: 'Cellular respiration', ago: 2, concepts: ['energy', 'chemical-reactions', 'cells'], notes: 'Cellular respiration is the process that converts glucose into usable energy as ATP. Glycolysis is the first stage and happens in the cytoplasm. The Krebs cycle is the stage in the mitochondria that releases carbon dioxide. The electron transport chain is the final stage and produces most of the ATP. Oxygen is the final electron acceptor, which is why we breathe it.' },
];

function addLevels(db) {
  const add = (u) => { const x = { id: require('crypto').randomBytes(6).toString('hex'), password: 'demo1234', ...u }; db.users.push(x); return x; };
  db.classes.forEach((c) => { c.grade = 10; });
  db.recaps.forEach((r) => { r.concepts = TAGS[r.title] || []; });

  const lee = add({ role: 'teacher', name: 'Ms. Lee', email: 'lee@orbitlearn.demo' });
  const prof = add({ role: 'teacher', name: 'Prof. Adeyemi', email: 'prof@orbitlearn.demo' });
  db.classes.push(
    { id: 'kroom', name: 'Kindergarten Room 3', subject: 'Discovery', teacherId: lee.id, room: 'Room 3', color: '#f59e0b', grade: 0 },
    { id: 'bio201', name: 'BIO 201 Cell Biology', subject: 'Cell Biology', teacherId: prof.id, room: 'Hall B', color: '#14b8a6', grade: 13 },
  );

  const kids = [['Mia', 'Chen', 'Lily Chen'], ['Leo', 'Garcia', 'Rosa Garcia'], ['Ari', 'Singh', 'Priya Singh'], ['Zoe', 'Kim', 'Daniel Kim']];
  const kidIds = [];
  kids.forEach(([f, l, p], i) => {
    const s = add({ role: 'student', name: `${f} ${l}`, grade: 0, email: i === 0 ? 'kinder@orbitlearn.demo' : `${f.toLowerCase()}.k@orbitlearn.demo` });
    add({ role: 'parent', name: p, childId: s.id, email: i === 0 ? 'kparent@orbitlearn.demo' : `${p.split(' ')[0].toLowerCase()}.kparent@orbitlearn.demo` });
    kidIds.push(s.id);
  });
  const unis = [['Jordan', 'Reyes'], ['Amara', 'Okoye'], ['Ben', 'Thompson'], ['Sana', 'Malik']];
  const uniIds = unis.map(([f, l], i) => add({ role: 'student', name: `${f} ${l}`, grade: 13, email: i === 0 ? 'uni@orbitlearn.demo' : `${f.toLowerCase()}.u@orbitlearn.demo` }).id);
  db.enrollments.kroom = kidIds;
  db.enrollments.bio201 = uniIds;

  // Light attendance and coursework so the dashboards have something to show.
  for (let i = 14; i >= 1; i--) {
    const d = new Date(Date.now() - i * DAY);
    if (d.getDay() === 0 || d.getDay() === 6) continue;
    kidIds.forEach((sid, k) => db.attendance.push({ studentId: sid, classId: 'kroom', date: iso(d), status: k === 2 && i < 6 && i % 2 ? 'absent' : 'present' }));
    uniIds.forEach((sid, k) => db.attendance.push({ studentId: sid, classId: 'bio201', date: iso(d), status: k === 3 && i < 8 && i % 2 ? 'absent' : 'present' }));
  }
  const A = (classId, title, due, points = 100) => { const a = { id: require('crypto').randomBytes(6).toString('hex'), classId, title, due, points, createdAt: daysAgo(6) }; db.assignments.push(a); return a; };
  const k1 = A('kroom', 'Plant a bean seed at home', daysAhead(3), 10);
  const k0 = A('kroom', 'Find 5 shapes at home', daysAgo(2), 10);
  const u0 = A('bio201', 'Problem set 4: Replication', daysAgo(3), 50);
  const u1 = A('bio201', 'Lab report: Respiration rates', daysAhead(5), 100);
  const u2 = A('bio201', 'Midterm', daysAhead(9), 100);
  kidIds.forEach((sid, k) => { if (k !== 2) db.submissions.push({ assignmentId: k0.id, studentId: sid, submittedAt: daysAgo(2), score: 10 }); });
  uniIds.forEach((sid, k) => { if (k !== 3) db.submissions.push({ assignmentId: u0.id, studentId: sid, submittedAt: daysAgo(3), score: [44, 47, 41, 30][k] }); });
  void k1; void u1; void u2;

  const mkRecaps = (classId, lessons, lvl, subject) => {
    const pool = lessons.flatMap((l) => ai.keyTerms(l.notes, 6));
    for (const l of lessons) {
      const gen = ai.generateRecap({ subject, title: l.title, notes: l.notes, level: lvl }, pool);
      db.recaps.push({ id: require('crypto').randomBytes(6).toString('hex'), classId, date: daysAgo(l.ago), title: l.title, notes: l.notes, ...gen, homework: [], status: 'published', approvedBy: db.classes.find((c) => c.id === classId).teacherId, concepts: l.concepts });
    }
  };
  mkRecaps('kroom', K_LESSONS, 'elementary', 'Discovery');
  mkRecaps('bio201', U_LESSONS, 'university', 'Cell Biology');
  // Kindergarten recaps: shorter, friendlier summaries.
  db.recaps.filter((r) => r.classId === 'kroom').forEach((r) => { r.summary = r.notes.split(/(?<=\.)\s+/).slice(0, 3); r.quiz = r.quiz.slice(0, 3); });

  db.library = LIBRARY.map((l, i) => {
    const gen = ai.generateRecap({ subject: l.subject, title: l.title, notes: l.notes, level: band(l.grade) }, []);
    return { id: 'lib' + i, ...l, gradeLabel: gradeLabel(l.grade), summary: ai.summarize(l.notes, 4), keyTerms: gen.keyTerms, flashcards: gen.flashcards, quiz: gen.quiz };
  });
  return db;
}

// Earlier-grade lessons that share concepts with a recap, newest grade first.
function foundationsFor(db, recap) {
  const cls = db.classes.find((c) => c.id === recap.classId);
  if (!cls || !recap.concepts || !recap.concepts.length || cls.grade === 0) return [];
  const pool = [
    ...db.library,
    ...db.recaps.filter((r) => r.status === 'published' && r.id !== recap.id).map((r) => {
      const c = db.classes.find((x) => x.id === r.classId);
      return { id: r.id, grade: c.grade, subject: c.subject, title: r.title, concepts: r.concepts || [], gradeLabel: gradeLabel(c.grade), fromClass: true };
    }),
  ];
  return pool
    .filter((l) => l.grade < cls.grade && l.concepts.some((x) => recap.concepts.includes(x)))
    .map((l) => ({ ...l, overlap: l.concepts.filter((x) => recap.concepts.includes(x)).length + (l.concepts.includes(recap.concepts[0]) ? 0.5 : 0) }))
    .sort((a, b) => b.overlap - a.overlap || b.grade - a.grade)
    .slice(0, 3)
    .map((l) => ({ id: l.id, grade: l.grade, gradeLabel: l.gradeLabel, subject: l.subject, title: l.title, fromClass: !!l.fromClass }));
}

// Best-guess concept tags for a new teacher-written recap.
const VOCAB = {
  cells: ['cell', 'nucleus', 'membrane', 'organelle'], 'cell-division': ['mitosis', 'meiosis', 'divide', 'division', 'cell cycle'],
  dna: ['dna', 'gene', 'chromosome', 'allele', 'heredity'], energy: ['energy', 'atp', 'respiration'],
  plants: ['plant', 'photosynthesis', 'chlorophyll', 'seed'], 'chemical-reactions': ['reaction', 'reactant', 'product', 'enzyme'],
  equations: ['equation', 'variable', 'solve', 'factor'], graphing: ['graph', 'slope', 'axis', 'parabola', 'intercept'],
  exponents: ['square', 'exponent', 'quadratic'], rate: ['rate', 'slope', 'per'],
  'main-idea': ['theme', 'main idea', 'thesis'], 'story-elements': ['character', 'setting', 'plot', 'symbol'],
  evidence: ['evidence', 'quote', 'support'], 'opinion-writing': ['persuasive', 'argument', 'opinion', 'counterargument'],
  shapes: ['circle', 'square', 'triangle', 'shape'], counting: ['count', 'number'],
};
function guessConcepts(text) {
  const t = String(text || '').toLowerCase();
  return Object.entries(VOCAB).map(([k, words]) => [k, words.filter((w) => t.includes(w)).length]).filter(([, n]) => n).sort((a, b) => b[1] - a[1]).map(([k]) => k).slice(0, 4);
}

module.exports = { addLevels, foundationsFor, band, gradeLabel, guessConcepts };
