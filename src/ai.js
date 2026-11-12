// Simulated AI Teaching Assistant.
// Builds recaps, flashcards and quizzes from a teacher's class notes using simple text analysis,
// so the demo works with no API key. Swap these functions for real model calls later.
'use strict';

const STOP = new Set(('a an the and or but if then than so of to in on at by for with from into onto over under about as is are was were be been being ' +
  'this that these those it its they them their there here we you your our i he she his her not no yes can could should would will may might must ' +
  'do does did done have has had also each every some any all more most other such very just only when where which who whom what why how today class ' +
  'learned learn students lesson we\'ll called means mean use used using like make makes made one two three first second').split(' '));

function sentences(text) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 12);
}

// Key terms: "Term: definition" / "Term is ..." patterns first, then frequent capitalized or long words.
function keyTerms(text, max = 6) {
  const terms = new Map();
  for (const s of sentences(text)) {
    const clean = s.replace(/^(Remember|Note that|Remember that)\s+/i, '');
    let m = clean.match(/^([A-Z][\w' -]{2,40}?)(?::| is | are | means | refers to )\s*(.+)$/);
    if (m) {
      const term = m[1].trim().replace(/^(The|A|An) /i, '');
      if (/^(If|Its|It|When|This|That|There|They|These|Those|We|You|In|On|Without|Always)\b/i.test(term)) continue;
      const pretty = term.charAt(0).toUpperCase() + term.slice(1);
      if (!terms.has(term.toLowerCase())) terms.set(term.toLowerCase(), { term: pretty, definition: m[2].replace(/\.$/, '') });
    }
  }
  if (terms.size < 3) {
    const counts = new Map();
    for (const w of String(text).match(/[A-Za-z][A-Za-z'-]{4,}/g) || []) {
      const k = w.toLowerCase();
      if (STOP.has(k)) continue;
      counts.set(k, (counts.get(k) || 0) + 1);
    }
    const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0].length - a[0].length);
    for (const [k, n] of ranked) {
      if (terms.size >= Math.min(max, 4) || n < 2) break;
      if ([...terms.keys()].some((t) => t.includes(k) || k.includes(t))) continue;
      const def = sentences(text).find((s) => s.toLowerCase().includes(k));
      if (def) terms.set(k, { term: k.charAt(0).toUpperCase() + k.slice(1), definition: def.replace(/\.$/, '') });
    }
  }
  return [...terms.values()].slice(0, max);
}

function summarize(text, max = 4) {
  const ss = sentences(text);
  if (ss.length <= max) return ss;
  const terms = keyTerms(text, 8).map((t) => t.term.toLowerCase());
  const scored = ss.map((s, i) => {
    const l = s.toLowerCase();
    let score = terms.reduce((n, t) => n + (l.includes(t) ? 2 : 0), 0);
    if (i === 0) score += 2;
    if (/important|remember|key|because|therefore|so that/.test(l)) score += 1;
    return { s, i, score };
  });
  return scored.sort((a, b) => b.score - a.score).slice(0, max).sort((a, b) => a.i - b.i).map((x) => x.s);
}

function shuffle(arr, seed = 7) {
  const a = arr.slice();
  let x = seed;
  for (let i = a.length - 1; i > 0; i--) {
    x = (x * 9301 + 49297) % 233280;
    const j = Math.floor((x / 233280) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function flashcards(terms) {
  return terms.map((t) => ({ front: t.term, back: t.definition }));
}

// Multiple choice: "Which term matches: <definition>?" with distractors from the other terms.
function quiz(terms, pool = [], seed = 3) {
  const all = [...terms, ...pool];
  return terms.slice(0, 5).map((t, i) => {
    const others = shuffle(all.filter((o) => o.term !== t.term).map((o) => o.term), seed + i);
    const options = shuffle([t.term, ...[...new Set(others)].slice(0, 3)], seed + i * 3);
    return { question: `Which term matches this: "${t.definition}"?`, options, answer: options.indexOf(t.term) };
  });
}

function generateRecap({ subject, title, notes, level }, pool = []) {
  const detail = level === 'elementary' ? 2 : level === 'university' ? 6 : 4;
  const terms = keyTerms(notes, level === 'elementary' ? 3 : 6);
  return {
    summary: summarize(notes, detail),
    keyTerms: terms,
    flashcards: flashcards(terms),
    quiz: quiz(terms, pool),
    headline: `Today in ${subject}: ${title}`,
  };
}

const BLOCKED = /(do|write|finish|complete|solve) (my|the) (homework|assignment|essay|test|exam)|give me the answers|answers to (the|my) (test|quiz|exam)/i;

// Answer a student's question from their own published recaps.
function answer(question, recaps) {
  const q = String(question || '').trim();
  if (!q) return { text: 'Ask me about anything from your classes, or try "make flashcards for Biology" or "quiz me on Math".' };
  if (BLOCKED.test(q)) {
    return { text: "I can't do your assignment for you, but I can help you get ready for it. Want me to pull up the recap it's based on, or quiz you on the key terms first?" };
  }
  const words = (q.toLowerCase().match(/[a-z][a-z'-]{2,}/g) || []).filter((w) => !STOP.has(w));
  const wantsCards = /flash ?cards?/i.test(q);
  const wantsQuiz = /\bquiz|test me|practice/i.test(q);
  const wantsRecap = /\brecap|summar|what did we (learn|cover)/i.test(q);

  let subjectHit = recaps.filter((r) => words.some((w) => r.subject.toLowerCase().startsWith(w) || r.className.toLowerCase().includes(w)));
  if ((wantsCards || wantsQuiz || wantsRecap) && subjectHit.length) {
    const latest = subjectHit.sort((a, b) => b.date.localeCompare(a.date));
    if (wantsCards) return { text: `Here are flashcards from your ${latest[0].subject} recaps:`, flashcards: latest.flatMap((r) => r.flashcards).slice(0, 8) };
    if (wantsQuiz) return { text: `Quick ${latest[0].subject} quiz. Tap an answer to check it:`, quiz: latest.flatMap((r) => r.quiz).slice(0, 5) };
    return { text: `Your latest ${latest[0].subject} recap (${latest[0].date}): ${latest[0].summary.join(' ')}`, recapId: latest[0].id };
  }

  let best = [];
  for (const r of recaps) {
    for (const s of [...r.summary, ...r.keyTerms.map((t) => `${t.term}: ${t.definition}.`)]) {
      const l = s.toLowerCase();
      const score = words.reduce((n, w) => n + (l.includes(w) ? 1 : 0), 0);
      if (score) best.push({ s, score, r });
    }
  }
  best.sort((a, b) => b.score - a.score);
  if (!best.length) {
    return { text: "I couldn't find that in your class recaps yet. Try different words, or ask your teacher. You can also book a 1:1 from your dashboard." };
  }
  const top = best[0];
  const extra = best.find((b) => b.s !== top.s && b.r.id === top.r.id);
  return { text: `${top.s}${extra ? ' ' + extra.s : ''}`, source: `${top.r.subject} recap, ${top.r.date}`, recapId: top.r.id };
}

module.exports = { generateRecap, answer, keyTerms, summarize, quiz, shuffle };
