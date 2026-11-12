/* OrbitLearn front end: one small vanilla-JS app, hash routing, server-rendered data from /api/bootstrap. */
(function () {
  'use strict';
  const app = document.getElementById('app');
  let S = null; // everything the signed-in user can see
  let chat = [];
  let navOpen = false;
  let panelOpen = false;

  // ---------- utils ----------
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const today = () => new Date().toISOString().slice(0, 10);
  const fmtDate = (d) => { if (!d) return ''; const x = new Date(d.length === 10 ? d + 'T12:00:00' : d); return x.toLocaleDateString('en', { month: 'short', day: 'numeric' }); };
  const ago = (t) => { const s = (Date.now() - t) / 1000; if (s < 60) return 'just now'; if (s < 3600) return Math.floor(s / 60) + 'm ago'; if (s < 86400) return Math.floor(s / 3600) + 'h ago'; return Math.floor(s / 86400) + 'd ago'; };
  const dueText = (d) => { const n = Math.round((new Date(d + 'T12:00:00') - new Date(today() + 'T12:00:00')) / 86400000); return n === 0 ? 'Due today' : n === 1 ? 'Due tomorrow' : n > 1 ? `Due in ${n} days` : `${-n} day${n === -1 ? '' : 's'} overdue`; };
  const first = (name) => String(name || '').split(' ')[0];
  const cls = (id) => (S.classes || []).find((c) => c.id === id) || {};
  const riskLabel = { high: 'At risk', watch: 'Watch', ok: 'On track' };
  const stateLabel = { todo: 'To do', missing: 'Missing', submitted: 'Submitted', graded: 'Graded' };
  function toast(msg) { const t = document.getElementById('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 2600); }

  async function api(path, body) {
    const r = await fetch(path, { method: body ? 'POST' : 'GET', headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined, credentials: 'same-origin' });
    const data = await r.json().catch(() => ({}));
    if (r.status === 401 && path !== '/api/login') { S = null; render(); throw new Error(data.error || 'Please sign in.'); }
    if (!r.ok) throw new Error(data.error || 'Something went wrong.');
    return data;
  }
  async function refresh() { S = await api('/api/bootstrap'); render(); }

  const I = {
    home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>', book: '<path d="M4 4h10a4 4 0 014 4v12H8a4 4 0 01-4-4z"/><path d="M8 20a4 4 0 014-4h6"/>',
    spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 17l.7 1.8L21.5 19.5l-1.8.7L19 22l-.7-1.8-1.8-.7 1.8-.7z"/>',
    cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>', mega: '<path d="M3 11v2a1 1 0 001 1h3l6 4V6L7 10H4a1 1 0 00-1 1z"/><path d="M17 8a5 5 0 010 8"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0113 0"/><path d="M16 4.5a3.5 3.5 0 010 7M21.5 20a6.5 6.5 0 00-4-6"/>', clip: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M9 10h6M9 14h6M9 18h3"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>', gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.6 1.6 0 00-1.8-.3 1.6 1.6 0 00-1 1.5V21a2 2 0 01-4 0v-.1a1.6 1.6 0 00-1-1.5 1.6 1.6 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.6 1.6 0 00.3-1.8 1.6 1.6 0 00-1.5-1H3a2 2 0 010-4h.1a1.6 1.6 0 001.5-1 1.6 1.6 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.6 1.6 0 001.8.3H9a1.6 1.6 0 001-1.5V3a2 2 0 014 0v.1a1.6 1.6 0 001 1.5 1.6 1.6 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.6 1.6 0 00-.3 1.8V9a1.6 1.6 0 001.5 1H21a2 2 0 010 4h-.1a1.6 1.6 0 00-1.5 1z"/>',
    bell: '<path d="M6 8a6 6 0 0112 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 003.4 0"/>', out: '<path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/>',
    alert: '<path d="M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z"/><path d="M12 9v4M12 17h.01"/>', menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
    star: '<path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>', check: '<path d="M20 6L9 17l-5-5"/>', award: '<circle cx="12" cy="8" r="6"/><path d="M8.2 13.4L7 22l5-3 5 3-1.2-8.6"/>', bolt: '<path d="M13 2L3 14h9l-1 8 10-12h-9z"/>',
    class: '<path d="M2 7l10-4 10 4-10 4z"/><path d="M6 9v5c0 2 3 3.5 6 3.5s6-1.5 6-3.5V9"/>', print: '<path d="M6 9V2h12v7"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M6 14h12v8H6z"/>',
  };
  const icon = (n) => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${I[n] || ''}</svg>`;
  const pill = (cls_, text) => `<span class="pill ${esc(cls_)}">${esc(text)}</span>`;
  const subj = (c) => `<span class="subj"><span class="dot" style="background:${esc(c.color || '#888')}"></span>${esc(c.subject || c.name)}</span>`;

  // ---------- routing ----------
  function route() {
    const h = location.hash.replace(/^#\/?/, '') || 'home';
    const [p, qs] = h.split('?');
    const parts = p.split('/').filter(Boolean);
    return { parts, q: Object.fromEntries(new URLSearchParams(qs || '')) };
  }
  window.addEventListener('hashchange', () => { navOpen = false; panelOpen = false; render(); window.scrollTo(0, 0); });

  function navFor(role) {
    const L = S.labels;
    if (role === 'student') return [['home', 'Home', 'home'], ['assignments', 'Assignments', 'clip'], ['vault', 'Study Vault', 'book'], ['assistant', 'AI Assistant', 'spark'], ['meetings', 'Meetings', 'cal'], ['announcements', 'Announcements', 'mega']];
    if (role === 'parent') return [['home', 'Home', 'home'], ['assignments', 'Homework', 'clip'], ['vault', 'Class recaps', 'book'], ['meetings', 'Meetings', 'cal'], ['community', L.community, 'users'], ['announcements', 'Announcements', 'mega']];
    if (role === 'teacher') return [['home', 'Home', 'home'], ...S.classes.map((c) => [`class/${c.id}`, c.name, 'class']), ['meetings', 'Meetings', 'cal'], ['announcements', 'Announcements', 'mega']];
    return [['home', 'School overview', 'home'], ['announcements', 'Announcements', 'mega'], ['email', 'Email log', 'mail'], ['meetings', 'Meetings', 'cal'], ['settings', 'Settings', 'gear']];
  }

  // ---------- render ----------
  function render() {
    if (!S) return renderLogin();
    const r = route();
    const key = r.parts[0] || 'home';
    const nav = navFor(S.me.role);
    const cur = r.parts.join('/');
    const unread = S.notifications.filter((n) => !n.read).length;
    let body;
    try { body = page(key, r); } catch (e) { console.error(e); body = `<div class="card">That page didn't load. <a href="#/home">Go home</a></div>`; }
    const levelName = { elementary: 'Elementary', middle: 'Middle school', high: 'High school', university: 'University' }[S.school.level];
    app.innerHTML = `
      <div class="mobilebar"><button data-act="nav" aria-label="Open menu">${icon('menu')}</button><a class="brand" href="#/home"><img src="/logo.svg" alt="">OrbitLearn</a><span></span></div>
      <div class="shell">
        <aside class="side ${navOpen ? 'open' : ''}" aria-label="Main">
          <a class="brand" href="#/home"><img src="/logo.svg" alt="">OrbitLearn</a>
          <nav>${nav.map(([h, l, i]) => `<a href="#/${h}" class="${cur === h || (h !== 'home' && cur.startsWith(h + '/')) || (h === 'home' && key === 'home') ? 'on' : ''}">${icon(i)}${esc(l)}</a>`).join('')}</nav>
          <div class="who"><b>${esc(S.me.name)}</b>${esc(S.me.role === 'parent' ? S.labels.guardian : S.me.role === 'teacher' ? S.labels.teacher : S.me.role[0].toUpperCase() + S.me.role.slice(1))} · ${esc(S.school.name)}</div>
        </aside>
        <main id="main">
          <div class="top">
            <span class="levelchip">${esc(levelName)} demo</span>
            <div class="actions">
              <div class="bell"><button class="btn ghost sm" data-act="bell" aria-label="Notifications, ${unread} unread" aria-expanded="${panelOpen}">${icon('bell')}</button>${unread ? `<span class="count">${unread}</span>` : ''}
                ${panelOpen ? `<div class="panel" role="dialog" aria-label="Notifications">${S.notifications.length ? S.notifications.map((n) => `<a class="n ${n.read ? '' : 'unread'}" href="${esc(n.link || '#/home')}"><b>${esc(n.title)}</b><div class="small muted">${esc(n.body)}</div><div class="tiny muted">${ago(n.createdAt)}</div></a>`).join('') : '<div class="empty" style="padding:12px">No notifications yet.</div>'}</div>` : ''}
              </div>
              <button class="btn ghost sm" data-act="logout">${icon('out')}<span>Sign out</span></button>
            </div>
          </div>
          ${body}
        </main>
      </div>`;
  }

  function page(key, r) {
    const role = S.me.role;
    const P = {
      home: () => (role === 'student' ? studentHome() : role === 'parent' ? parentHome() : role === 'teacher' ? teacherHome() : adminHome()),
      assignments: () => assignmentsPage(),
      vault: () => (r.parts[1] ? recapPage(r.parts[1]) : vaultPage(r.q)),
      exam: () => examPage(r.parts[1]),
      assistant: () => assistantPage(),
      meetings: () => meetingsPage(r.q),
      announcements: () => announcementsPage(),
      community: () => communityPage(),
      class: () => classPage(r.parts[1], r.q.tab || 'roster'),
      email: () => emailPage(),
      settings: () => settingsPage(),
    };
    return (P[key] || P.home)();
  }

  // ---------- login ----------
  function renderLogin(err = '') {
    app.innerHTML = `
    <div class="login">
      <section class="pitch">
        <a class="brand" href="#/"><img src="/logo.svg" alt="">OrbitLearn</a>
        <h1>Keep every student in orbit.</h1>
        <p style="max-width:520px">The classroom platform that doesn't wait for report cards. OrbitLearn spots students who are slipping, loops in parents and teachers right away, and turns every class into a study guide students keep.</p>
        <div class="feat">
          <div>${icon('alert')}<span><b>Proactive alerts.</b> Absences, low grades and missing work trigger a note to the family with a one-click meeting link.</span></div>
          <div>${icon('spark')}<span><b>AI class recaps.</b> Teachers approve a recap after class; students get flashcards and quizzes.</span></div>
          <div>${icon('book')}<span><b>Study Vault.</b> Every recap is saved, so exam prep is one click.</span></div>
          <div>${icon('users')}<span><b>Community.</b> Shoutouts, announcements and a parent hub keep everyone connected.</span></div>
        </div>
        <div class="orbit" aria-hidden="true"></div>
      </section>
      <section class="pane">
        <h2>Try the demo</h2>
        <p class="muted">Pick a view. Each one is a real, working account at the demo school.</p>
        <div class="demos">
          <button class="demo" data-act="demo" data-role="student"><b>Student</b><span>Tyler Brooks, Grade 10</span></button>
          <button class="demo" data-act="demo" data-role="parent"><b>Parent</b><span>Dana Brooks, Tyler's mom</span></button>
          <button class="demo" data-act="demo" data-role="teacher"><b>Teacher</b><span>Ms. Rivera, Biology & English</span></button>
          <button class="demo" data-act="demo" data-role="admin"><b>School admin</b><span>Principal Grant</span></button>
        </div>
        <form data-form="login" class="card" style="margin-top:8px">
          <h3>Or sign in</h3>
          <label for="em">Email</label><input id="em" name="email" type="email" autocomplete="username" required placeholder="student@orbitlearn.demo">
          <label for="pw">Password</label><input id="pw" name="password" type="password" autocomplete="current-password" required placeholder="demo1234">
          <p class="err" role="alert">${esc(err)}</p>
          <button class="btn" type="submit">Sign in</button>
          <p class="tiny muted" style="margin-top:10px">Demo password for every account: demo1234. Demo data refreshes every few days.</p>
        </form>
      </section>
    </div>`;
  }

  // ---------- shared blocks ----------
  function riskBanner(viewer) {
    const r = S.risk;
    if (!r || r.level === 'ok') return `<div class="banner ok"><div><b>${viewer === 'parent' ? `${esc(first(S.student.name))} is on track` : 'You’re on track!'}</b><div class="small">No missing work and attendance looks good. Keep it up.</div></div></div>`;
    const who = viewer === 'parent' ? `${esc(first(S.student.name))} needs some support` : 'Let’s get you back on track';
    const teacherId = S.classes[0] && S.classes[0].teacherId;
    return `<div class="banner ${r.level}">
      <div style="flex:1;min-width:240px"><b>${icon('alert')} ${who}</b>
        <ul>${r.reasons.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
        ${S.plan.length ? `<div class="small" style="margin-top:8px"><b>Action plan</b></div><ul class="small">${S.plan.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
      </div>
      <a class="btn" href="#/meetings?teacher=${esc(teacherId)}">Book a meeting</a>
    </div>`;
  }
  function classProgress() {
    return `<div class="list">${S.risk.perClass.map((p) => { const c = cls(p.classId); return `<div class="row"><div class="main" style="flex:1">${subj(c)}<div class="bar" style="margin-top:8px"><i style="width:${p.average || 0}%;background:${esc(c.color)}"></i></div></div><div style="text-align:right;min-width:90px"><b>${p.average == null ? '–' : p.average + '%'}</b><div class="tiny muted">${p.attendanceRate}% attendance</div></div></div>`; }).join('')}</div>`;
  }
  function assignmentRows(items, canSubmit) {
    if (!items.length) return '<div class="empty">Nothing here. Nice!</div>';
    return `<div class="list">${items.map((a) => `<div class="row"><div class="main">${subj(cls(a.classId))}<div><b>${esc(a.title)}</b></div><div class="small muted">${a.state === 'graded' ? `Score ${a.score}/${a.points}` : esc(dueText(a.due))} · ${fmtDate(a.due)}</div></div>
      <div style="display:flex;gap:8px;align-items:center">${pill(a.state, stateLabel[a.state])}${canSubmit && (a.state === 'todo' || a.state === 'missing') ? `<button class="btn sm" data-act="submit" data-id="${esc(a.id)}">Mark done</button>` : ''}</div></div>`).join('')}</div>`;
  }
  function shoutoutList(items, max = 4) {
    if (!items.length) return '<div class="empty">No shoutouts yet.</div>';
    return `<div class="list">${items.slice(0, max).map((s) => `<div class="row"><div class="main">${icon('star')} <b>${esc(s.studentName)}</b> · ${subj(cls(s.classId))}<div class="small">${esc(s.text)}</div></div><span class="tiny muted">${ago(s.createdAt)}</span></div>`).join('')}</div>`;
  }
  function announceList(items, max = 99) {
    if (!items.length) return '<div class="empty">No announcements.</div>';
    return `<div class="list">${items.slice(0, max).map((a) => `<div class="row" style="align-items:flex-start"><div class="main">${a.urgent ? pill('high', 'URGENT') + ' ' : ''}<b>${esc(a.title)}</b> <span class="tiny muted">· ${a.scope === 'school' ? 'School-wide' : esc(cls(a.scope).name || 'Class')} · ${esc(a.author || '')}</span><div class="small">${esc(a.body)}</div></div><span class="tiny muted">${ago(a.createdAt)}</span></div>`).join('')}</div>`;
  }
  function urgentStrip() {
    const u = S.announcements.find((a) => a.urgent && Date.now() - a.createdAt < 86400000);
    return u ? `<div class="banner urgent" style="margin-bottom:16px"><div><b>${icon('alert')} ${esc(u.title)}</b><div class="small">${esc(u.body)}</div></div></div>` : '';
  }
  function recapCards(recaps, max = 3) {
    if (!recaps.length) return '<div class="empty">No recaps yet.</div>';
    return `<div class="grid g3">${recaps.slice(0, max).map((r) => `<a class="recapcard" href="#/vault/${esc(r.id)}">${subj(cls(r.classId))}<div style="margin:6px 0 4px"><b>${esc(r.title)}</b></div><div class="small muted">${fmtDate(r.date)} · ${r.flashcards.length} flashcards · ${r.quiz.length} quiz Qs</div><div class="small" style="margin-top:6px">${esc(r.summary[0] || '')}</div></a>`).join('')}</div>`;
  }

  // ---------- student ----------
  function studentHome() {
    const upcoming = S.assignments.filter((a) => a.state === 'todo' || a.state === 'missing').slice(0, 5);
    return `${urgentStrip()}
      <div class="hero-greet"><div><h1>Hi ${esc(first(S.me.name))} 👋</h1><p class="muted">Here's your week at ${esc(S.school.name)}.</p></div><a class="btn sun" href="#/assistant">${icon('spark')} Ask the AI assistant</a></div>
      ${riskBanner('student')}
      <div class="grid g2 section">
        <div class="card"><h2>Coming up <a class="small" href="#/assignments">All</a></h2>${assignmentRows(upcoming, true)}</div>
        <div class="card"><h2>My progress</h2>${classProgress()}</div>
      </div>
      <div class="section card"><h2>Latest class recaps <a class="small" href="#/vault">Study Vault</a></h2>${recapCards(S.recaps)}</div>
      <div class="grid g2 section">
        <div class="card"><h2>Class shoutouts</h2>${shoutoutList(S.shoutouts)}</div>
        <div class="card"><h2>${S.labels.badges ? 'My badges' : 'Announcements'}</h2>${S.labels.badges ? badgeList() : announceList(S.announcements, 3)}</div>
      </div>`;
  }
  function badgeList() {
    if (!S.badges.length) return '<div class="empty">Badges show up as you hit streaks. Keep going!</div>';
    return `<div class="chips">${S.badges.map((b) => `<span class="chip">${icon(b.icon)} ${esc(b.label)}</span>`).join('')}</div>`;
  }

  function assignmentsPage() {
    const groups = { missing: [], todo: [], submitted: [], graded: [] };
    S.assignments.forEach((a) => groups[a.state].push(a));
    const canSubmit = S.me.role === 'student';
    return `<h1>${S.me.role === 'parent' ? `${esc(first(S.student.name))}'s homework` : 'Assignments'}</h1>
      ${groups.missing.length ? `<div class="card section"><h2>Missing</h2>${assignmentRows(groups.missing, canSubmit)}</div>` : ''}
      <div class="card section"><h2>To do</h2>${assignmentRows(groups.todo, canSubmit)}</div>
      <div class="card section"><h2>Handed in</h2>${assignmentRows([...groups.submitted, ...groups.graded.reverse()], false)}</div>`;
  }

  function vaultPage(q) {
    const f = q.c || 'all';
    const list = S.recaps.filter((r) => f === 'all' || r.classId === f);
    return `<div class="hero-greet"><div><h1>${S.me.role === 'parent' ? 'Class recaps' : 'Study Vault'}</h1><p class="muted">${S.me.role === 'parent' ? 'What was covered in each class, approved by the teacher.' : 'Every recap, flashcard and quiz from your classes, saved in one place.'}</p></div>
      ${S.me.role === 'student' ? `<div class="chips">${S.classes.map((c) => `<a class="btn ghost sm" href="#/exam/${esc(c.id)}">${icon('book')} ${esc(c.subject)} exam prep</a>`).join('')}</div>` : ''}</div>
      <div class="card">
        <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center;justify-content:space-between">
          <div class="chips"><a class="chip ${f === 'all' ? 'on' : ''}" href="#/vault">All classes</a>${S.classes.map((c) => `<a class="chip ${f === c.id ? 'on' : ''}" href="#/vault?c=${esc(c.id)}">${esc(c.subject)}</a>`).join('')}</div>
          <div style="min-width:240px;flex:1;max-width:340px"><label class="sr" for="vs">Search recaps</label><input id="vs" type="search" placeholder="Search: mitosis, slope, thesis…" data-filter=".vrow"></div>
        </div>
        <div class="list section">${list.length ? list.map((r) => `<a class="row vrow" href="#/vault/${esc(r.id)}" style="text-decoration:none;color:inherit" data-text="${esc((r.title + ' ' + r.summary.join(' ') + ' ' + r.keyTerms.map((k) => k.term).join(' ')).toLowerCase())}">
          <div class="main">${subj(cls(r.classId))} <span class="tiny muted">· ${fmtDate(r.date)}</span><div><b>${esc(r.title)}</b></div><div class="small muted">${esc(r.keyTerms.map((k) => k.term).join(' · '))}</div></div>
          <span class="small muted">${r.flashcards.length} cards · ${r.quiz.length} Qs</span></a>`).join('') : '<div class="empty">No recaps yet.</div>'}</div>
      </div>`;
  }

  function flashGrid(cards) {
    return `<div class="grid g3">${cards.map((c) => `<button class="flash" data-act="flip" aria-label="Flashcard: ${esc(c.front)}. Click to flip."><div class="in"><div class="f">${esc(c.front)}</div><div class="b">${esc(c.back)}</div></div></button>`).join('')}</div><p class="tiny muted" style="margin-top:8px">Tap a card to flip it.</p>`;
  }
  function quizBlock(qs, label) {
    if (!qs.length) return '<div class="empty">No quiz questions yet.</div>';
    return `<div class="quizset" data-label="${esc(label)}" data-total="${qs.length}">${qs.map((q, i) => `<div class="qz" data-ans="${q.answer}"><b>${i + 1}. ${esc(q.question)}</b><div class="opts">${q.options.map((o, j) => `<button class="opt" data-act="answer" data-i="${j}">${esc(o)}</button>`).join('')}</div></div>`).join('')}<div class="qresult" aria-live="polite"></div></div>`;
  }

  function recapPage(id) {
    const r = S.recaps.find((x) => x.id === id);
    if (!r) return `<div class="card">That recap isn't available. <a href="#/vault">Back to the vault</a></div>`;
    const c = cls(r.classId);
    const hw = (r.homework || []).map((h) => S.assignments.find((a) => a.id === h)).filter(Boolean);
    return `<a href="#/vault" class="small">← ${S.me.role === 'parent' ? 'Class recaps' : 'Study Vault'}</a>
      <div class="hero-greet" style="margin-top:8px"><div>${subj(c)}<h1 style="margin-top:6px">${esc(r.title)}</h1><p class="muted">${fmtDate(r.date)} · approved by your ${esc(S.labels.teacher.toLowerCase())}</p></div>
      ${S.me.role === 'student' ? `<a class="btn ghost" href="#/exam/${esc(c.id)}">${icon('book')} ${esc(c.subject)} exam prep</a>` : ''}</div>
      <div class="grid g2">
        <div class="card"><h2>Recap</h2><ul>${r.summary.map((s) => `<li style="margin-bottom:6px">${esc(s)}</li>`).join('')}</ul>
          ${hw.length ? `<h3 style="margin-top:14px">Homework from this class</h3>${hw.map((a) => `<div class="small">${icon('clip')} <b>${esc(a.title)}</b>, ${esc(dueText(a.due))}</div>`).join('')}` : ''}</div>
        <div class="card"><h2>Key terms</h2><dl class="terms">${r.keyTerms.map((k) => `<dt>${esc(k.term)}</dt><dd>${esc(k.definition)}</dd>`).join('')}</dl></div>
      </div>
      <div class="card section"><h2>Flashcards</h2>${flashGrid(r.flashcards)}</div>
      <div class="card section"><h2>Practice quiz</h2>${quizBlock(r.quiz, `${c.subject}: ${r.title}`)}</div>`;
  }

  function examPage(classId) {
    const c = cls(classId);
    const rs = S.recaps.filter((r) => r.classId === classId).sort((a, b) => a.date.localeCompare(b.date));
    const terms = rs.flatMap((r) => r.keyTerms);
    const seen = new Set();
    const qs = shuffle(rs.flatMap((r) => r.quiz).filter((q) => { const k = q.question; if (seen.has(k)) return false; seen.add(k); return true; })).slice(0, 10);
    return `<a href="#/vault" class="small noprint">← Study Vault</a>
      <div class="hero-greet" style="margin-top:8px"><div>${subj(c)}<h1 style="margin-top:6px">${esc(c.subject)} exam study guide</h1><p class="muted">Built from ${rs.length} class recaps · ${terms.length} key terms · ${qs.length} practice questions</p></div>
      <button class="btn ghost noprint" data-act="print">${icon('print')} Print / save as PDF</button></div>
      <div class="card"><h2>What we covered</h2>${rs.map((r) => `<h3 style="margin-top:12px">${esc(r.title)} <span class="tiny muted">${fmtDate(r.date)}</span></h3><ul class="small">${r.summary.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>`).join('') || '<div class="empty">No recaps yet.</div>'}</div>
      <div class="card section"><h2>All key terms</h2><dl class="terms">${terms.map((k) => `<dt>${esc(k.term)}</dt><dd>${esc(k.definition)}</dd>`).join('')}</dl></div>
      <div class="card section noprint"><h2>Flashcard review</h2>${flashGrid(rs.flatMap((r) => r.flashcards))}</div>
      <div class="card section"><h2>Practice test</h2>${quizBlock(qs, `${c.subject} exam prep`)}</div>`;
  }
  function shuffle(a) { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; }

  function assistantPage() {
    const ideas = ['What is mitochondria?', 'Make flashcards for Biology', 'Quiz me on Math', 'Recap English', 'What is a thesis?'];
    if (!chat.length) chat.push({ who: 'bot', text: `Hi ${first(S.me.name)}! I'm your AI teaching assistant. I know everything from your class recaps. Ask me a question, or ask for flashcards or a quiz.` });
    return `<h1>AI Teaching Assistant</h1><p class="muted">I help you study from your own class recaps. I won't do your homework for you, but I'll help you get ready for it.</p>
      <div class="card"><div class="chat" id="chat">${chat.map(chatMsg).join('')}</div>
        <div class="chips" style="margin-top:12px">${ideas.map((t) => `<button class="chip" data-act="ask" data-q="${esc(t)}">${esc(t)}</button>`).join('')}</div>
        <form class="chatform" data-form="chat"><label class="sr" for="cq">Your question</label><input id="cq" name="q" type="text" placeholder="Ask about anything from class…" autocomplete="off" required><button class="btn" type="submit">Send</button></form>
      </div>`;
  }
  function chatMsg(m) {
    if (m.who === 'me') return `<div class="msg me">${esc(m.text)}</div>`;
    let extra = '';
    if (m.flashcards) extra = `<div style="margin-top:10px">${flashGrid(m.flashcards.slice(0, 6))}</div>`;
    if (m.quiz) extra = `<div style="margin-top:10px">${quizBlock(m.quiz, 'Assistant quiz')}</div>`;
    return `<div class="msg bot">${esc(m.text)}${m.source ? `<div class="tiny muted" style="margin-top:6px">From your ${esc(m.source)}${m.recapId ? ` · <a href="#/vault/${esc(m.recapId)}">open recap</a>` : ''}</div>` : ''}${extra}</div>`;
  }

  // ---------- parent ----------
  function parentHome() {
    const s = S.student;
    const hw = S.assignments.filter((a) => a.state === 'todo' || a.state === 'missing');
    const avg = S.risk.overall;
    const att = Math.round(S.risk.perClass.reduce((n, p) => n + p.attendanceRate, 0) / S.risk.perClass.length);
    const missing = S.assignments.filter((a) => a.state === 'missing').length;
    return `${urgentStrip()}
      <div class="hero-greet"><div><h1>${esc(first(s.name))}'s week</h1><p class="muted">Grade ${esc(s.grade)} · ${esc(S.school.name)}</p></div>${S.risk.level === 'ok' ? `<a class="btn" href="#/meetings">${icon('cal')} Book a ${esc(S.labels.teacher.toLowerCase())} meeting</a>` : ''}</div>
      ${riskBanner('parent')}
      <div class="grid g3 section">
        <div class="card stat"><div class="l">Overall average</div><div class="v">${avg == null ? '–' : avg + '%'}</div></div>
        <div class="card stat"><div class="l">Attendance</div><div class="v">${att}%</div></div>
        <div class="card stat"><div class="l">Missing work</div><div class="v" style="color:${missing ? 'var(--high)' : 'inherit'}">${missing}</div></div>
      </div>
      <div class="grid g2 section">
        <div class="card"><h2>Homework <a class="small" href="#/assignments">All</a></h2>${assignmentRows(hw, false)}</div>
        <div class="card"><h2>By class</h2>${classProgress()}</div>
      </div>
      <div class="section card"><h2>What ${esc(first(s.name))} learned recently <a class="small" href="#/vault">All recaps</a></h2>${recapCards(S.recaps)}</div>
      <div class="grid g2 section">
        <div class="card"><h2>Shoutouts</h2>${shoutoutList(S.shoutouts)}</div>
        <div class="card"><h2>Announcements</h2>${announceList(S.announcements, 4)}</div>
      </div>`;
  }

  function communityPage() {
    const posts = S.community || [];
    return `<h1>${esc(S.labels.community)}</h1><p class="muted">Connect with other families in ${esc(first(S.student.name))}'s classes. Be kind, and keep it about the class.</p>
      <form class="card" data-form="post"><h3>Start a conversation</h3>
        <label for="pc">Class</label><select id="pc" name="classId">${S.classes.map((c) => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('')}</select>
        <label for="pb">Message</label><textarea id="pb" name="body" required placeholder="Carpool, study group, supplies…" style="min-height:80px"></textarea>
        <button class="btn" style="margin-top:12px">Post</button></form>
      <div class="section">${posts.map((p) => `<div class="card" style="margin-bottom:12px">${subj(cls(p.classId))}<div style="margin:6px 0"><b>${esc(p.author)}</b> <span class="tiny muted">${ago(p.createdAt)}</span></div><p>${esc(p.body)}</p>
        ${p.replies.map((r) => `<div class="small" style="border-left:3px solid var(--line);padding-left:10px;margin:8px 0"><b>${esc(r.author)}</b> <span class="tiny muted">${ago(r.createdAt)}</span><div>${esc(r.body)}</div></div>`).join('')}
        <form data-form="reply" data-id="${esc(p.id)}" style="display:flex;gap:8px;margin-top:8px"><label class="sr" for="r${esc(p.id)}">Reply</label><input id="r${esc(p.id)}" name="body" type="text" placeholder="Reply…" required><button class="btn ghost sm">Reply</button></form></div>`).join('') || '<div class="empty">No posts yet. Start one!</div>'}</div>`;
  }

  // ---------- meetings ----------
  function meetingsPage(q) {
    const role = S.me.role;
    const list = S.meetings.length ? `<div class="list">${S.meetings.map((m) => `<div class="row"><div class="main"><b>${esc(role === 'teacher' ? m.requester : m.teacher)}</b> · about ${esc(m.student)}<div class="small">${esc(m.reason)}</div><div class="tiny muted">${esc(m.slot)} · requested ${ago(m.createdAt)}</div></div>
      <div style="display:flex;gap:8px;align-items:center">${pill(m.status, m.status[0].toUpperCase() + m.status.slice(1))}${role === 'teacher' && m.status === 'requested' ? `<button class="btn sm" data-act="meet" data-id="${esc(m.id)}" data-s="confirmed">Confirm</button><button class="btn ghost sm" data-act="meet" data-id="${esc(m.id)}" data-s="declined">Decline</button>` : ''}</div></div>`).join('')}</div>` : '<div class="empty">No meetings yet.</div>';
    if (role !== 'parent' && role !== 'student') return `<h1>Meetings</h1><div class="card">${list}</div>`;
    const tids = [...new Set(S.classes.flatMap((c) => [c.teacherId, c.coTeacherId]).filter(Boolean))];
    const teachers = S.teachers.filter((t) => tids.includes(t.id));
    const times = ['8:00 AM', '12:15 PM', '3:30 PM', '4:00 PM', '6:00 PM (video)'];
    return `<h1>Meetings</h1><p class="muted">Book a 1:1 with ${role === 'parent' ? `one of ${esc(first(S.student.name))}'s` : 'your'} ${esc(S.labels.teacher.toLowerCase())}s. They'll confirm by email.</p>
      <div class="grid g2">
        <form class="card" data-form="meeting"><h2>Request a meeting</h2>
          <label for="mt">${esc(S.labels.teacher)}</label><select id="mt" name="teacherId">${teachers.map((t) => `<option value="${esc(t.id)}" ${q.teacher === t.id ? 'selected' : ''}>${esc(t.name)} · ${esc(S.classes.filter((c) => c.teacherId === t.id || c.coTeacherId === t.id).map((c) => c.subject).join(', '))}</option>`).join('')}</select>
          <div class="formrow"><div><label for="md">Day</label><input id="md" name="date" type="date" min="${today()}" value="${new Date(Date.now() + 86400000).toISOString().slice(0, 10)}" required></div>
          <div><label for="mtm">Time</label><select id="mtm" name="time">${times.map((t) => `<option>${t}</option>`).join('')}</select></div></div>
          <label for="mr">What would you like to talk about?</label><textarea id="mr" name="reason" required style="min-height:90px">${q.teacher && S.risk && S.risk.level !== 'ok' ? esc('Making a plan to catch up: ' + S.risk.reasons.join('; ')) : ''}</textarea>
          <button class="btn" style="margin-top:12px">Send request</button></form>
        <div class="card"><h2>Your meetings</h2>${list}</div>
      </div>`;
  }

  function announcementsPage() {
    const role = S.me.role;
    let form = '';
    if (role === 'teacher' || role === 'admin') {
      form = `<form class="card" data-form="announce" style="margin-bottom:16px"><h2>Post an announcement</h2>
        <div class="formrow"><div><label for="as">Send to</label><select id="as" name="scope">${role === 'admin' ? '<option value="school">Whole school (all families & staff)</option>' : ''}${(role === 'teacher' ? S.classes : []).map((c) => `<option value="${esc(c.id)}">${esc(c.name)} (students & ${esc(S.labels.guardian.toLowerCase())}s)</option>`).join('')}</select></div>
        <div><label for="at">Title</label><input id="at" name="title" type="text" required placeholder="PA Day on Friday"></div></div>
        <label for="ab">Message</label><textarea id="ab" name="body" required style="min-height:80px"></textarea>
        ${role === 'admin' ? '<label class="check"><input type="checkbox" name="urgent"> Urgent alert (lockdown, closure). Emails every family and staff member right away.</label>' : ''}
        <button class="btn">Post</button></form>`;
    }
    return `<h1>Announcements</h1>${form}<div class="card">${announceList(S.announcements)}</div>`;
  }

  // ---------- teacher ----------
  function teacherHome() {
    const seen = new Map();
    S.classes.forEach((c) => c.roster.forEach((s) => { if (!seen.has(s.id) || s.risk === 'high') seen.set(s.id, { ...s, classes: [...((seen.get(s.id) || {}).classes || []), c.subject] }); }));
    const all = [...seen.values()];
    const atRisk = all.filter((s) => s.risk !== 'ok').sort((a, b) => (a.risk === 'high' ? 0 : 1) - (b.risk === 'high' ? 0 : 1));
    const reqs = S.meetings.filter((m) => m.status === 'requested');
    const drafts = S.recaps.filter((r) => r.status === 'draft');
    return `<div class="hero-greet"><div><h1>Good day, ${esc(S.me.name)}</h1><p class="muted">${S.classes.map((c) => esc(c.name)).join(' · ')}</p></div><button class="btn sun" data-act="runrisk">${icon('alert')} Run at-risk check</button></div>
      <div class="grid g4">
        <div class="card stat"><div class="l">Students</div><div class="v">${all.length}</div></div>
        <div class="card stat"><div class="l">At risk</div><div class="v" style="color:var(--high)">${all.filter((s) => s.risk === 'high').length}</div></div>
        <div class="card stat"><div class="l">Watch list</div><div class="v" style="color:var(--watch)">${all.filter((s) => s.risk === 'watch').length}</div></div>
        <div class="card stat"><div class="l">Meeting requests</div><div class="v">${reqs.length}</div></div>
      </div>
      <div class="grid g2 section">
        <div class="card"><h2>Students who need you</h2>${atRisk.length ? `<div class="list">${atRisk.map((s) => studentRiskRow(s)).join('')}</div>` : '<div class="empty">Everyone is on track.</div>'}</div>
        <div>
          <div class="card"><h2>Meeting requests <a class="small" href="#/meetings">All</a></h2>${reqs.length ? `<div class="list">${reqs.map((m) => `<div class="row"><div class="main"><b>${esc(m.requester)}</b> · ${esc(m.student)}<div class="small">${esc(m.reason)}</div><div class="tiny muted">${esc(m.slot)}</div></div><div style="display:flex;gap:6px"><button class="btn sm" data-act="meet" data-id="${esc(m.id)}" data-s="confirmed">Confirm</button></div></div>`).join('')}</div>` : '<div class="empty">No pending requests.</div>'}</div>
          <div class="card section"><h2>After class</h2><p class="small muted">Paste your lesson notes and the AI TA drafts a recap, flashcards and a quiz. You approve before students see it.</p>
            <div class="chips">${S.classes.map((c) => `<a class="btn ghost sm" href="#/class/${esc(c.id)}?tab=recaps">${icon('spark')} New ${esc(c.subject)} recap</a>`).join('')}</div>
            ${drafts.length ? `<p class="small" style="margin-top:10px">${pill('draft', drafts.length + ' draft' + (drafts.length > 1 ? 's' : ''))} waiting for your approval.</p>` : ''}</div>
        </div>
      </div>
      <div class="card section"><h2>Recent shoutouts</h2>${shoutoutList(S.shoutouts)}</div>`;
  }
  function studentRiskRow(s) {
    const g = S.labels.guardian.toLowerCase();
    return `<div class="row" style="align-items:flex-start"><div class="main"><b>${esc(s.name)}</b> ${pill(s.risk, riskLabel[s.risk])}${s.classes ? ` <span class="tiny muted">${esc(s.classes.join(', '))}</span>` : ''}<div class="small muted">${esc(s.reasons.join(' · '))}</div>${s.notifiedAt ? `<div class="tiny" style="color:var(--ok)">${icon('check')} ${esc(S.labels.guardian)} notified ${ago(s.notifiedAt)}</div>` : ''}</div>
      <button class="btn ${s.notifiedAt ? 'ghost' : ''} sm" data-act="notify" data-id="${esc(s.id)}" data-name="${esc(s.name)}">${s.notifiedAt ? 'Notify again' : `Notify ${esc(g)}`}</button></div>`;
  }

  function classPage(id, tab) {
    const c = S.classes.find((x) => x.id === id);
    if (!c) return '<div class="card">Class not found.</div>';
    const tabs = [['roster', 'Roster'], ['attendance', 'Attendance'], ['assignments', 'Assignments'], ['recaps', 'AI recaps'], ['shout', 'Shoutouts & posts']];
    const content = { roster: rosterTab, attendance: attendanceTab, assignments: assignTab, recaps: recapsTab, shout: shoutTab }[tab] || rosterTab;
    return `${subj(c)}<h1 style="margin-top:6px">${esc(c.name)}</h1><p class="muted">${esc(c.room)} · ${c.roster.length} students</p>
      <nav class="tabs" aria-label="Class sections">${tabs.map(([k, l]) => `<a href="#/class/${esc(c.id)}?tab=${k}" class="${tab === k ? 'on' : ''}">${l}</a>`).join('')}</nav>${content(c)}`;
  }
  function rosterTab(c) {
    const g = S.labels.guardian.toLowerCase();
    return `<div class="card tablewrap"><table><thead><tr><th>Student</th><th>Average</th><th>Attendance</th><th>Absent (2 wks)</th><th>Missing</th><th>Status</th><th></th></tr></thead><tbody>
      ${c.roster.map((s) => `<tr><td><b>${esc(s.name)}</b>${s.reasons.length ? `<div class="tiny muted">${esc(s.reasons.slice(0, 2).join(' · '))}</div>` : ''}</td><td>${s.average == null ? '–' : s.average + '%'}</td><td>${s.attendanceRate}%</td><td>${s.absences}</td><td>${s.missing.length}</td><td>${pill(s.risk, riskLabel[s.risk])}</td>
        <td style="white-space:nowrap">${s.risk !== 'ok' ? `<button class="btn ${s.notifiedAt ? 'ghost' : ''} sm" data-act="notify" data-id="${esc(s.id)}" data-name="${esc(s.name)}">${s.notifiedAt ? 'Notified ✓' : `Notify ${esc(g)}`}</button>` : ''} <button class="btn ghost sm" data-act="shout" data-class="${esc(c.id)}" data-id="${esc(s.id)}" data-name="${esc(s.name)}">${icon('star')}<span class="sr">Shoutout for ${esc(s.name)}</span></button></td></tr>`).join('')}
      </tbody></table></div>`;
  }
  function attendanceTab(c) {
    return `<form class="card" data-form="attendance" data-class="${esc(c.id)}"><div class="formrow"><div><label for="ad">Date</label><input id="ad" type="date" name="date" value="${today()}" max="${today()}"></div></div>
      <div class="list section">${c.roster.map((s) => `<div class="row"><b>${esc(s.name)}</b><fieldset class="seg" style="border:0;padding:0;margin:0"><legend class="sr">${esc(s.name)} attendance</legend>
        <label><input type="radio" name="a_${esc(s.id)}" value="present" checked><span>Present</span></label><label class="l"><input type="radio" name="a_${esc(s.id)}" value="late"><span>Late</span></label><label class="a"><input type="radio" name="a_${esc(s.id)}" value="absent"><span>Absent</span></label></fieldset></div>`).join('')}</div>
      <button class="btn" style="margin-top:12px">Save attendance</button><p class="tiny muted" style="margin-top:8px">Absences feed the at-risk check automatically.</p></form>`;
  }
  function assignTab(c) {
    const list = S.assignments.filter((a) => a.classId === c.id);
    const n = c.roster.length;
    return `<form class="card" data-form="assignment" data-class="${esc(c.id)}"><h2>New assignment</h2><div class="formrow">
        <div><label for="nt">Title</label><input id="nt" name="title" type="text" required placeholder="Lab report"></div>
        <div><label for="nd">Due</label><input id="nd" name="due" type="date" min="${today()}" required></div>
        <div><label for="np">Points</label><input id="np" name="points" type="number" min="1" value="100"></div></div>
        <p class="tiny muted" style="margin-top:8px">Students and ${esc(S.labels.guardian.toLowerCase())}s are notified right away.</p><button class="btn">Assign</button></form>
      <div class="card section"><h2>Assignments</h2><div class="list">${list.map((a) => { const sub = a.submissions.length; const gr = a.submissions.filter((s) => s.score != null).length; return `<div class="row"><div class="main"><b>${esc(a.title)}</b><div class="small muted">Due ${fmtDate(a.due)} · ${a.points} pts · ${sub}/${n} handed in · ${gr} graded</div></div><button class="btn ghost sm" data-act="grade" data-id="${esc(a.id)}">Grade</button></div>`; }).join('') || '<div class="empty">No assignments yet.</div>'}</div></div>`;
  }
  function recapsTab(c) {
    const drafts = S.recaps.filter((r) => r.classId === c.id && r.status === 'draft');
    const pubd = S.recaps.filter((r) => r.classId === c.id && r.status === 'published');
    const upcoming = S.assignments.filter((a) => a.classId === c.id && a.due >= today());
    return `${drafts.map((r) => `<form class="card" data-form="publish" data-id="${esc(r.id)}" style="margin-bottom:16px;border-color:#f3dca8"><h2>${esc(r.title)} ${pill('draft', 'Draft: review before students see it')}</h2>
        <label for="sum${esc(r.id)}">Recap (one point per line, edit anything)</label><textarea id="sum${esc(r.id)}" name="summary" style="min-height:140px">${esc(r.summary.join('\n'))}</textarea>
        <div class="grid g2" style="margin-top:12px"><div><h3>Key terms</h3><dl class="terms small">${r.keyTerms.map((k) => `<dt>${esc(k.term)}</dt><dd>${esc(k.definition)}</dd>`).join('')}</dl></div>
        <div><h3>Also generated</h3><p class="small">${r.flashcards.length} flashcards and ${r.quiz.length} quiz questions for students.</p>
          ${upcoming.length ? `<h3>Attach homework</h3><p class="tiny muted">${esc(S.labels.guardian)}s are notified about attached homework.</p>${upcoming.map((a) => `<label class="check"><input type="checkbox" name="hw" value="${esc(a.id)}"> ${esc(a.title)} (due ${fmtDate(a.due)})</label>`).join('')}` : ''}</div></div>
        <div style="display:flex;gap:8px;margin-top:12px"><button class="btn">Approve & publish</button><button class="btn ghost" type="button" data-act="discard" data-id="${esc(r.id)}">Discard</button></div></form>`).join('')}
      <form class="card" data-form="generate" data-class="${esc(c.id)}"><h2><span>${icon('spark')} New recap from today's class</span></h2>
        <label for="rt">Lesson title</label><input id="rt" name="title" type="text" required placeholder="e.g. Genetics and heredity">
        <label for="rn">Your class notes</label><textarea id="rn" name="notes" required placeholder="Paste or type what you covered. Definitions like “DNA is …” become key terms and flashcards."></textarea>
        <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap"><button class="btn">Generate recap</button><button class="btn ghost" type="button" data-act="sample" data-class="${esc(c.id)}">Use sample notes</button></div></form>
      <div class="card section"><h2>Published recaps</h2><div class="list">${pubd.map((r) => `<div class="row"><div class="main"><b>${esc(r.title)}</b><div class="small muted">${fmtDate(r.date)} · ${r.keyTerms.length} terms · ${r.quiz.length} quiz Qs</div></div>${pill('published', 'Published')}</div>`).join('') || '<div class="empty">None yet.</div>'}</div></div>`;
  }
  function shoutTab(c) {
    return `<div class="grid g2"><form class="card" data-form="shoutout" data-class="${esc(c.id)}"><h2><span>${icon('star')} Give a shoutout</span></h2>
        <label for="ss">Student</label><select id="ss" name="studentId">${c.roster.map((s) => `<option value="${esc(s.id)}">${esc(s.name)}</option>`).join('')}</select>
        <label for="st">Shoutout</label><input id="st" name="text" type="text" required placeholder="Great teamwork on today's lab!">
        <button class="btn" style="margin-top:12px">Send shoutout</button><p class="tiny muted" style="margin-top:8px">The student and their ${esc(S.labels.guardian.toLowerCase())} both see it.</p></form>
      <div class="card"><h2>Recent</h2>${shoutoutList(S.shoutouts.filter((s) => s.classId === c.id), 8)}</div></div>
      <p class="section small muted">Class announcements live under <a href="#/announcements">Announcements</a>.</p>`;
  }

  // ---------- admin ----------
  function adminHome() {
    const k = S.counts;
    const list = S.assessed.filter((a) => a.level !== 'ok').sort((a, b) => b.points - a.points);
    return `${urgentStrip()}<div class="hero-greet"><div><h1>${esc(S.school.name)}</h1><p class="muted">${esc(S.school.district)}</p></div><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn sun" data-act="runrisk">${icon('alert')} Run daily risk check</button><a class="btn danger" href="#/announcements">${icon('mega')} Send urgent alert</a></div></div>
      <div class="grid g4">
        <div class="card stat"><div class="l">Students</div><div class="v">${k.students}</div></div>
        <div class="card stat"><div class="l">At risk</div><div class="v" style="color:var(--high)">${k.high}</div></div>
        <div class="card stat"><div class="l">Watch list</div><div class="v" style="color:var(--watch)">${k.watch}</div></div>
        <div class="card stat"><div class="l">Recaps published</div><div class="v">${k.recaps}</div></div>
      </div>
      <div class="grid g2 section">
        <div class="card chart"><h2>School average trend</h2>${trendChart(S.trend)}<p class="tiny muted">Average grade across all classes, by month.</p></div>
        <div class="card"><h2>Announcements <a class="small" href="#/announcements">Post</a></h2>${announceList(S.announcements, 4)}</div>
      </div>
      <div class="card section"><h2>Students needing support</h2><div class="list">${list.map((s) => studentRiskRow({ ...s, risk: s.level })).join('') || '<div class="empty">Everyone is on track.</div>'}</div></div>
      <div class="card section tablewrap"><h2>Classes</h2><table><thead><tr><th>Class</th><th>${esc(S.labels.teacher)}</th><th>Room</th><th>Students</th></tr></thead><tbody>${S.classes.map((c) => `<tr><td><span class="subj"><span class="dot" style="background:${esc(c.color)}"></span>${esc(c.name)}</span></td><td>${esc(c.teacher)}</td><td>${esc(c.room)}</td><td>${c.students}</td></tr>`).join('')}</tbody></table></div>`;
  }
  function trendChart(t) {
    const W = 520, H = 200, pad = 32;
    const vals = t.map((x) => x.avg); const lo = Math.min(...vals) - 3, hi = Math.max(...vals) + 3;
    const X = (i) => pad + (i * (W - pad * 2)) / (t.length - 1); const Y = (v) => H - pad - ((v - lo) / (hi - lo)) * (H - pad * 2);
    const pts = t.map((x, i) => `${X(i)},${Y(x.avg)}`).join(' ');
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="School average by month: ${t.map((x) => `${x.month} ${x.avg}%`).join(', ')}">
      ${[lo, (lo + hi) / 2, hi].map((v) => `<line x1="${pad}" x2="${W - pad}" y1="${Y(v)}" y2="${Y(v)}" stroke="#ECEBF5"/><text x="4" y="${Y(v) + 4}" font-size="11" fill="#6B6987">${Math.round(v)}%</text>`).join('')}
      <polyline points="${pts}" fill="none" stroke="#5B5BF7" stroke-width="3" stroke-linejoin="round"/>
      ${t.map((x, i) => `<circle cx="${X(i)}" cy="${Y(x.avg)}" r="4" fill="#fff" stroke="#5B5BF7" stroke-width="2"/><text x="${X(i)}" y="${H - 8}" font-size="11" text-anchor="middle" fill="#6B6987">${esc(x.month)}</text>`).join('')}
      <text x="${X(t.length - 1)}" y="${Y(t[t.length - 1].avg) - 10}" font-size="12" font-weight="700" text-anchor="end" fill="#14123A">${t[t.length - 1].avg}%</text></svg>`;
  }
  function emailPage() {
    return `<h1>Email log</h1><p class="muted">Every email OrbitLearn sent: at-risk alerts, meeting confirmations and urgent alerts. In this demo, emails are logged here instead of being delivered.</p>
      <div class="card">${S.outbox.length ? `<div class="list">${S.outbox.map((e) => `<details class="row" style="display:block"><summary style="cursor:pointer"><b>${esc(e.subject)}</b> <span class="small muted">to ${esc(e.toName)} &lt;${esc(e.to)}&gt; · ${ago(e.createdAt)}</span></summary><div class="email">${esc(e.body)}</div></details>`).join('')}</div>` : '<div class="empty">No emails yet. Try “Run daily risk check” or notify a family from a student row.</div>'}</div>`;
  }
  function settingsPage() {
    const lv = S.school.level;
    const opts = [['elementary', 'Elementary', 'Parent-first dashboards, simple recaps, badges and streaks.'], ['middle', 'Middle school', 'Recaps and study tools, badges for engagement.'], ['high', 'High school', 'Detailed recaps, Study Vault, parent alerts for grades and absences.'], ['university', 'College & university', 'Full lecture digests; advisors replace parents; study groups.']];
    return `<h1>Settings</h1>
      <form class="card" data-form="level"><h2>School level</h2><p class="small muted">OrbitLearn adapts to every stage. Switch to see the labels and features change across every dashboard.</p>
        ${opts.map(([v, l, d]) => `<label class="check" style="align-items:flex-start"><input type="radio" name="level" value="${v}" ${lv === v ? 'checked' : ''}> <span><b>${l}</b><br><span class="small muted">${d}</span></span></label>`).join('')}
        <button class="btn" style="margin-top:12px">Save</button></form>
      <div class="card section"><h2>Demo data</h2><p class="small muted">Reset the school back to the original sample data. Everyone will be signed out.</p><button class="btn danger" data-act="reset">Reset demo</button></div>`;
  }

  // ---------- modals ----------
  function modal(html) {
    const m = document.createElement('div');
    m.className = 'modal';
    m.innerHTML = `<div class="box" role="dialog" aria-modal="true">${html}</div>`;
    m.addEventListener('click', (e) => { if (e.target === m || e.target.closest('[data-close]')) m.remove(); });
    document.body.appendChild(m);
    const f = m.querySelector('input,textarea,select,button');
    if (f) f.focus();
    return m;
  }

  // ---------- events ----------
  document.addEventListener('click', async (e) => {
    const t = e.target.closest('[data-act]');
    if (!t) { if (panelOpen && !e.target.closest('.panel')) { panelOpen = false; render(); } return; }
    const act = t.dataset.act;
    try {
      if (act === 'demo') { await api('/api/login', { demo: t.dataset.role }); location.hash = '#/home'; await refresh(); }
      else if (act === 'logout') { await api('/api/logout', {}); S = null; chat = []; location.hash = ''; render(); }
      else if (act === 'nav') { navOpen = !navOpen; render(); }
      else if (act === 'bell') { panelOpen = !panelOpen; render(); if (panelOpen && S.notifications.some((n) => !n.read)) { await api('/api/notifications/read', {}); S.notifications.forEach((n) => (n.read = true)); } }
      else if (act === 'flip') t.classList.toggle('flip');
      else if (act === 'print') window.print();
      else if (act === 'answer') answer(t);
      else if (act === 'ask') { const q = t.dataset.q; await ask(q); }
      else if (act === 'submit') { await api('/api/submit', { assignmentId: t.dataset.id }); toast('Marked as handed in.'); await refresh(); }
      else if (act === 'notify') {
        t.disabled = true;
        const r = await api('/api/risk/notify', { studentId: t.dataset.id });
        toast(`${r.guardian} of ${t.dataset.name} notified with an action plan and meeting link.`);
        await refresh();
      }
      else if (act === 'runrisk') { const r = await api('/api/risk/run', {}); toast(r.sent.length ? `Alerts sent for ${r.sent.join(', ')}.` : 'Check complete. No new alerts needed this week.'); await refresh(); }
      else if (act === 'meet') { await api('/api/meetings/respond', { id: t.dataset.id, status: t.dataset.s }); toast(t.dataset.s === 'confirmed' ? 'Meeting confirmed. A confirmation email was sent.' : 'Meeting declined.'); await refresh(); }
      else if (act === 'discard') { await api('/api/recaps/delete', { id: t.dataset.id }); toast('Draft discarded.'); await refresh(); }
      else if (act === 'sample') {
        const f = t.closest('form');
        const samples = {
          bio: ['Genetics and heredity', 'DNA is the molecule that carries genetic instructions for living things. A gene is a section of DNA that codes for a specific trait. Alleles are different versions of the same gene. A dominant allele shows its trait even if only one copy is present. A recessive allele only shows its trait when two copies are present. A Punnett square is a chart used to predict the traits of offspring. Remember that you get one allele from each parent.'],
          eng: ['Poetry devices', 'Imagery is language that appeals to the five senses. A metaphor is a direct comparison between two unlike things. A simile is a comparison that uses like or as. Personification is giving human qualities to something that is not human. Alliteration is the repetition of the same starting sound in nearby words. Look for these devices and explain how they create meaning.'],
          math: ['Factoring', 'Factoring is rewriting an expression as a product of simpler expressions. A common factor is a number or variable that divides every term. A trinomial is an expression with three terms. The difference of squares is a pattern where a squared minus b squared equals a plus b times a minus b. Always check your factoring by multiplying back out.'],
        }[t.dataset.class] || ['Lesson', ''];
        f.title.value = samples[0]; f.notes.value = samples[1];
      }
      else if (act === 'shout') {
        modal(`<h2>Shoutout for ${esc(t.dataset.name)}</h2><form data-form="shoutout" data-class="${esc(t.dataset.class)}"><input type="hidden" name="studentId" value="${esc(t.dataset.id)}"><label for="mst">Message</label><input id="mst" name="text" type="text" required placeholder="Fantastic effort today!"><div style="display:flex;gap:8px;margin-top:14px"><button class="btn">Send</button><button class="btn ghost" type="button" data-close>Cancel</button></div></form>`);
      }
      else if (act === 'grade') {
        const a = S.assignments.find((x) => x.id === t.dataset.id);
        const c = S.classes.find((x) => x.id === a.classId);
        modal(`<h2>Grade: ${esc(a.title)}</h2><p class="small muted">Out of ${a.points}. Leave blank to skip.</p><form data-form="grades" data-id="${esc(a.id)}"><div class="list">${c.roster.map((s) => { const sub = a.submissions.find((x) => x.studentId === s.id); return `<div class="row"><label for="g${esc(s.id)}" style="margin:0">${esc(s.name)} ${sub ? '' : '<span class="tiny muted">(not handed in)</span>'}</label><input id="g${esc(s.id)}" name="${esc(s.id)}" type="number" min="0" max="${a.points}" style="width:100px" value="${sub && sub.score != null ? sub.score : ''}"></div>`; }).join('')}</div><div style="display:flex;gap:8px;margin-top:14px"><button class="btn">Save grades</button><button class="btn ghost" type="button" data-close>Cancel</button></div></form>`);
      }
      else if (act === 'reset') { if (!confirmBox()) return; await api('/api/reset', {}); S = null; chat = []; location.hash = ''; render(); toast('Demo reset.'); }
    } catch (err) { toast(err.message); t.disabled = false; }
  });
  function confirmBox() { return window.confirm('Reset all demo data? This signs everyone out.'); }

  document.addEventListener('input', (e) => {
    const sel = e.target.dataset && e.target.dataset.filter;
    if (!sel) return;
    const q = e.target.value.toLowerCase().trim();
    document.querySelectorAll(sel).forEach((el) => { el.style.display = !q || el.dataset.text.includes(q) ? '' : 'none'; });
  });

  document.addEventListener('submit', async (e) => {
    const f = e.target.closest('form[data-form]');
    if (!f) return;
    e.preventDefault();
    const kind = f.dataset.form;
    const fd = new FormData(f);
    const v = Object.fromEntries(fd.entries());
    const btn = f.querySelector('button:not([type=button])');
    if (btn) btn.disabled = true;
    try {
      if (kind === 'login') {
        try { await api('/api/login', { email: v.email, password: v.password }); } catch (err) { return renderLogin(err.message); }
        location.hash = '#/home'; await refresh(); return;
      }
      if (kind === 'chat') { f.q.value = ''; await ask(v.q); return; }
      if (kind === 'post') { await api('/api/community', v); toast('Posted.'); }
      if (kind === 'reply') { await api('/api/community/reply', { id: f.dataset.id, body: v.body }); }
      if (kind === 'meeting') { await api('/api/meetings', { teacherId: v.teacherId, reason: v.reason, slot: `${fmtDate(v.date)}, ${v.time}` }); toast('Request sent. You’ll get an email when it’s confirmed.'); }
      if (kind === 'announce') { const r = await api('/api/announcements', { scope: v.scope, title: v.title, body: v.body, urgent: !!v.urgent }); toast(`Sent to ${r.reached} people${v.urgent ? ' and emailed every family and staff member' : ''}.`); }
      if (kind === 'attendance') {
        const records = [...new Set([...fd.keys()].filter((k) => k.startsWith('a_')))].map((k) => ({ studentId: k.slice(2), status: fd.get(k) }));
        await api('/api/attendance', { classId: f.dataset.class, date: v.date, records }); toast('Attendance saved.');
      }
      if (kind === 'assignment') { await api('/api/assignments', { classId: f.dataset.class, title: v.title, due: v.due, points: v.points }); toast('Assigned. Students and families were notified.'); }
      if (kind === 'grades') {
        const calls = [...fd.entries()].filter(([, s]) => s !== '').map(([sid, s]) => api('/api/grade', { assignmentId: f.dataset.id, studentId: sid, score: Number(s) }));
        await Promise.all(calls); document.querySelector('.modal') && document.querySelector('.modal').remove(); toast('Grades saved.');
      }
      if (kind === 'shoutout') { await api('/api/shoutouts', { classId: f.dataset.class, studentId: v.studentId, text: v.text }); document.querySelector('.modal') && document.querySelector('.modal').remove(); toast('Shoutout sent! 🎉'); }
      if (kind === 'generate') { await api('/api/recaps/generate', { classId: f.dataset.class, title: v.title, notes: v.notes }); toast('Draft ready. Review it, then publish.'); }
      if (kind === 'publish') { await api('/api/recaps/publish', { id: f.dataset.id, summary: v.summary.split('\n').map((s) => s.trim()).filter(Boolean), homework: fd.getAll('hw') }); toast('Published to students. Flashcards and quiz are in their Study Vault.'); }
      if (kind === 'level') { await api('/api/settings', { level: v.level }); toast('School level updated.'); }
      await refresh();
    } catch (err) { toast(err.message); }
    finally { if (btn && btn.isConnected) btn.disabled = false; }
  });

  async function ask(q) {
    chat.push({ who: 'me', text: q });
    render();
    const r = await api('/api/assistant', { message: q });
    chat.push({ who: 'bot', ...r });
    render();
    const c = document.getElementById('chat');
    if (c) c.scrollTop = c.scrollHeight;
    const i = document.getElementById('cq');
    if (i) i.focus();
  }

  function answer(btn) {
    const box = btn.closest('.qz');
    if (box.dataset.done) return;
    box.dataset.done = '1';
    const right = Number(box.dataset.ans);
    const pick = Number(btn.dataset.i);
    box.querySelectorAll('.opt').forEach((b, i) => { if (i === right) b.classList.add('right'); });
    if (pick !== right) btn.classList.add('wrong');
    box.dataset.ok = pick === right ? '1' : '0';
    const set = box.closest('.quizset');
    const all = set.querySelectorAll('.qz');
    const done = set.querySelectorAll('.qz[data-done]');
    if (done.length === all.length) {
      const score = [...all].filter((x) => x.dataset.ok === '1').length;
      set.querySelector('.qresult').innerHTML = `<div class="banner ${score / all.length >= 0.7 ? 'ok' : 'watch'}"><b>You got ${score} of ${all.length}.</b> ${score === all.length ? 'Perfect score!' : 'Review the cards above and try again later.'}</div>`;
      if (S.me.role === 'student') api('/api/quiz', { label: set.dataset.label, score, total: all.length }).catch(() => {});
    }
  }

  // ---------- boot ----------
  api('/api/bootstrap').then((d) => { S = d; render(); }).catch(() => render());
})();
