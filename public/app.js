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
    ear: '<path d="M6 8.5a6 6 0 1112 0c0 3.5-3 4.5-3 7.5a3.5 3.5 0 01-7 0"/><path d="M9.5 9a2.5 2.5 0 015 0c0 1.5-1.5 2-1.5 3"/>', ladder: '<path d="M7 3v18M17 3v18M7 8h10M7 13h10M7 18h10"/>', play: '<path d="M7 4l13 8-13 8z"/>',
    class: '<path d="M2 7l10-4 10 4-10 4z"/><path d="M6 9v5c0 2 3 3.5 6 3.5s6-1.5 6-3.5V9"/>', print: '<path d="M6 9V2h12v7"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M6 14h12v8H6z"/>',
  };
  const icon = (n) => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${I[n] || ''}</svg>`;
  const pill = (cls_, text) => `<span class="pill ${esc(cls_)}">${esc(text)}</span>`;
  let logoN = 0;
  function logo() {
    const n = ++logoN;
    return `<svg viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="lc${n}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2EE6D6"/><stop offset=".55" stop-color="#7C6CFF"/><stop offset="1" stop-color="#FF6FB5"/></linearGradient><radialGradient id="lg${n}" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset=".35" stop-color="#fff" stop-opacity="0"/></radialGradient></defs><rect width="64" height="64" rx="18" fill="#090B22"/><ellipse cx="32" cy="33" rx="25" ry="9" fill="none" stroke="url(#lc${n})" stroke-width="2.4" opacity=".5" transform="rotate(-24 32 33)"/><circle cx="32" cy="32" r="12" fill="url(#lc${n})"/><circle cx="32" cy="32" r="12" fill="url(#lg${n})"/><path d="M9.6 41.7a25 9 -24 0 0 45-18" fill="none" stroke="url(#lc${n})" stroke-width="2.4" stroke-linecap="round"/><g><circle cx="53.4" cy="22.6" r="3.6" fill="#FFC46B"/><animateTransform attributeName="transform" type="rotate" values="0 32 32;-14 32 32;0 32 32" dur="6s" repeatCount="indefinite"/></g></svg>`;
  }
  const brand = () => `<a class="brand" href="#/home">${logo()}<span>Orbit<span class="gtext">Learn</span></span></a>`;
  const initials = (n) => String(n || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const theme = () => (S && S.labels && S.labels.theme) || 'orbit';
  const isKid = () => theme() === 'kinder';
  function setTheme() {
    const t = 't-' + theme();
    if (!document.body.classList.contains(t)) { document.body.classList.remove('t-orbit', 't-kinder', 't-pro'); document.body.classList.add(t); }
    const m = document.querySelector('meta[name=theme-color]'); if (m) m.content = t === 't-kinder' ? '#FFF7EC' : t === 't-pro' ? '#0A0B10' : '#06071A';
  }
  function speak(text) {
    if (!('speechSynthesis' in window)) return toast('Read-aloud isn’t available in this browser.');
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text); u.rate = isKid() ? 0.88 : 1; u.pitch = isKid() ? 1.15 : 1;
    speechSynthesis.speak(u);
  }

  // starfield: slow twinkle + parallax drift; static when reduced motion is on
  (function stars() {
    const cv = document.getElementById('stars'); if (!cv) return;
    const ctx = cv.getContext('2d'); const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let W, H, pts = [], dpr = Math.min(window.devicePixelRatio || 1, 2), mx = 0, my = 0, shoot = null;
    function size() { W = cv.width = innerWidth * dpr; H = cv.height = innerHeight * dpr; const n = Math.round((innerWidth * innerHeight) / 5200); pts = Array.from({ length: n }, () => ({ x: Math.random() * W, y: Math.random() * H, r: (Math.random() * 1.1 + 0.25) * dpr, z: Math.random() * 0.8 + 0.2, t: Math.random() * 6.28, s: Math.random() * 0.02 + 0.004, c: Math.random() < 0.12 ? (Math.random() < 0.5 ? '46,230,214' : '255,111,181') : '220,225,255' })); }
    function frame() {
      ctx.clearRect(0, 0, W, H);
      for (const p of pts) { p.t += p.s; const a = 0.35 + Math.sin(p.t) * 0.3 * p.z + 0.25 * p.z; const x = (p.x + mx * p.z * 18 * dpr + W) % W, y = (p.y + my * p.z * 18 * dpr + H) % H; ctx.beginPath(); ctx.arc(x, y, p.r, 0, 6.283); ctx.fillStyle = `rgba(${p.c},${a.toFixed(3)})`; ctx.fill(); }
      if (!still) {
        if (!shoot && Math.random() < 0.004) shoot = { x: Math.random() * W * 0.7, y: Math.random() * H * 0.4, l: 0 };
        if (shoot) { shoot.l += 0.025; const x2 = shoot.x + shoot.l * 260 * dpr, y2 = shoot.y + shoot.l * 110 * dpr; const g = ctx.createLinearGradient(shoot.x, shoot.y, x2, y2); g.addColorStop(0, 'rgba(46,230,214,0)'); g.addColorStop(1, `rgba(255,255,255,${Math.max(0, 0.8 - shoot.l * 0.8)})`); ctx.strokeStyle = g; ctx.lineWidth = 1.4 * dpr; ctx.beginPath(); ctx.moveTo(x2 - 90 * dpr, y2 - 38 * dpr); ctx.lineTo(x2, y2); ctx.stroke(); if (shoot.l > 1) shoot = null; }
        requestAnimationFrame(frame);
      }
    }
    addEventListener('resize', () => { size(); if (still) frame(); });
    addEventListener('pointermove', (e) => { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; }, { passive: true });
    size(); frame();
  })();
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
    if (role === 'student' && L.level === 'kinder') return [['home', 'My day', 'home'], ['vault', 'My lessons', 'book'], ['assistant', 'Ask Orbit', 'spark'], ['assignments', 'My jobs', 'star']];
    if (role === 'student') return [['home', 'Home', 'home'], ['assignments', 'Assignments', 'clip'], ['vault', 'Study Vault', 'book'], ['assistant', 'Orbit AI', 'spark'], ['meetings', 'Meetings', 'cal'], ['announcements', 'Announcements', 'mega']];
    if (role === 'parent') return [['home', 'Home', 'home'], ['assignments', 'Homework', 'clip'], ['vault', 'Class recaps', 'book'], ['meetings', 'Meetings', 'cal'], ['community', L.community, 'users'], ['announcements', 'Announcements', 'mega']];
    if (role === 'teacher') return [['home', 'Home', 'home'], ...S.classes.map((c) => [`class/${c.id}`, c.name, 'class']), ['meetings', 'Meetings', 'cal'], ['announcements', 'Announcements', 'mega']];
    return [['home', 'School overview', 'home'], ['announcements', 'Announcements', 'mega'], ['email', 'Email log', 'mail'], ['meetings', 'Meetings', 'cal'], ['settings', 'Settings', 'gear']];
  }

  // ---------- render ----------
  function render() {
    if (!S) { setTheme(); return renderLogin(); }
    setTheme();
    const r = route();
    const key = r.parts[0] || 'home';
    const nav = navFor(S.me.role);
    const cur = r.parts.join('/');
    const unread = S.notifications.filter((n) => !n.read).length;
    let body;
    try { body = page(key, r); } catch (e) { console.error(e); body = `<div class="card">That page didn't load. <a href="#/home">Go home</a></div>`; }
    const levelName = { kinder: 'Kindergarten', elementary: 'Elementary', middle: 'Middle school', high: 'High school', university: 'University' }[S.labels.level] || 'School';
    const roleName = S.me.role === 'parent' ? S.labels.guardian : S.me.role === 'teacher' ? S.labels.teacher : S.me.role === 'student' ? (S.me.gradeLabel || 'Student') : 'Admin';
    app.innerHTML = `
      <div class="mobilebar"><button data-act="nav" aria-label="Open menu">${icon('menu')}</button>${brand()}<span></span></div>
      <div class="shell">
        <aside class="side ${navOpen ? 'open' : ''}" aria-label="Main">
          ${brand()}
          <nav>${nav.map(([h, l, i]) => `<a href="#/${h}" class="${cur === h || (h !== 'home' && cur.startsWith(h + '/')) || (h === 'home' && key === 'home') ? 'on' : ''}">${icon(i)}${esc(l)}</a>`).join('')}</nav>
          <div class="who"><span class="avatar">${esc(initials(S.me.name))}</span><div><b>${esc(S.me.name)}</b>${esc(roleName)} · ${esc(S.school.name)}</div></div>
        </aside>
        <main id="main">
          <div class="top">
            <span class="levelchip"><span class="pulse"></span>${esc(levelName)} · live demo</span>
            <div class="actions">
              <div class="bell"><button class="btn ghost sm" data-act="bell" aria-label="Notifications, ${unread} unread" aria-expanded="${panelOpen}">${icon('bell')}</button>${unread ? `<span class="count">${unread}</span>` : ''}
                ${panelOpen ? `<div class="panel" role="dialog" aria-label="Notifications">${S.notifications.length ? S.notifications.map((n) => `<a class="n ${n.read ? '' : 'unread'}" href="${esc(n.link || '#/home')}"><b>${esc(n.title)}</b><div class="small muted">${esc(n.body)}</div><div class="tiny muted">${ago(n.createdAt)}</div></a>`).join('') : '<div class="empty" style="padding:12px">No notifications yet.</div>'}</div>` : ''}
              </div>
              <button class="btn ghost sm" data-act="logout">${icon('out')}<span>Sign out</span></button>
            </div>
          </div>
          <div class="fadein">${body}</div>
        </main>
      </div>`;
    typewriter();
  }

  function page(key, r) {
    const role = S.me.role;
    const P = {
      home: () => (role === 'student' ? (S.labels.level === 'kinder' ? kinderHome() : studentHome()) : role === 'parent' ? parentHome() : role === 'teacher' ? teacherHome() : adminHome()),
      assignments: () => assignmentsPage(),
      foundation: () => foundationPage(r.parts[1], r.q.from),
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
    const P = [
      ['kinder', 'k', 'Mia, 5', 'Kindergarten · Little Orbit'],
      ['student', '', 'Tyler, 15', 'Grade 10 · high school'],
      ['uni', 'u', 'Jordan, 20', 'University · BIO 201'],
      ['parent', '', 'Dana Brooks', 'Parent · Tyler’s mom'],
      ['teacher', '', 'Ms. Rivera', 'Teacher · Biology & English'],
      ['admin', '', 'Principal Grant', 'School admin'],
    ];
    app.innerHTML = `
    <div class="login">
      <section class="pitch">
        ${brand()}
        <div>
          <span class="ai-chip">${icon('spark')} AI classroom · K to university</span>
          <h1>Every student, <span class="gtext">in orbit.</span></h1>
        </div>
        <p class="lede">One AI platform that grows with a learner from their first day of kindergarten to their last university lecture. It spots who’s slipping before report cards, turns every class into a study guide, and when a topic gets hard, it reaches back to the earlier lesson that makes it click.</p>
        <div class="system" aria-hidden="true"><div class="core"></div><div class="ring"><span>AI recaps</span></div><div class="ring"><span>Foundations Bridge</span></div><div class="ring"><span>Early alerts</span></div></div>
        <div class="feat">
          <div><b>Foundations Bridge</b>Stuck on cellular respiration? Orbit pulls the Grade 3 and Grade 9 lessons that build up to it.</div>
          <div><b>Grows with every age</b>Big, read-aloud lessons for 5-year-olds. Focused lecture digests for university.</div>
          <div><b>Early alerts</b>Absences, low grades and missing work reach families with a plan and a meeting link.</div>
          <div><b>A lifelong vault</b>Every recap, flashcard and quiz is saved, so exam prep is one click.</div>
        </div>
      </section>
      <section class="pane">
        <div><h2 style="font-size:24px">Step inside</h2><p class="muted">Pick a person. The whole interface changes with their age and role.</p></div>
        <div class="demos">
          ${P.map(([role, k, n, d]) => `<button class="demo" data-act="demo" data-role="${role}"><span class="avatar ${k}">${esc(initials(n))}</span><span><b>${esc(n)}</b><span>${esc(d)}</span></span></button>`).join('')}
        </div>
        <details class="signin card"${err ? ' open' : ''}><summary>Sign in with email</summary>
          <form data-form="login" style="margin-top:6px">
            <label for="em">Email</label><input id="em" name="email" type="email" autocomplete="username" required placeholder="student@orbitlearn.demo">
            <label for="pw">Password</label><input id="pw" name="password" type="password" autocomplete="current-password" required placeholder="demo1234">
            <p class="err" role="alert">${esc(err)}</p>
            <button class="btn" type="submit">Sign in</button>
            <p class="tiny muted" style="margin-top:10px">Every demo account uses the password demo1234. Demo data refreshes every few days.</p>
          </form>
        </details>
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

  // ---------- AI briefing ----------
  function brief(text, href, label) {
    return `<div class="brief"><div class="orb"></div><div><div class="who-ai">${isKid() ? 'Orbit says' : 'Orbit AI briefing'}</div><p>${text}</p></div>${href ? `<a class="btn ghost sm" href="${esc(href)}">${esc(label)}</a>` : ''}</div>`;
  }
  function studentBrief() {
    const miss = S.assignments.filter((a) => a.state === 'missing');
    const next = S.assignments.filter((a) => a.state === 'todo').sort((a, b) => a.due.localeCompare(b.due))[0];
    const weak = (S.risk.perClass || []).filter((p) => p.average != null).sort((a, b) => a.average - b.average)[0];
    const fr = S.recaps.find((r) => (r.foundations || []).length && (!weak || r.classId === weak.classId)) || S.recaps.find((r) => (r.foundations || []).length);
    const parts = [];
    if (miss.length) parts.push(`You have <b>${miss.length} missing</b> ${miss.length === 1 ? 'assignment' : 'assignments'}; start with “${esc(miss[0].title)}”.`);
    else if (next) parts.push(`Next up: <b>${esc(next.title)}</b>, ${esc(dueText(next.due).toLowerCase())}.`);
    if (weak && weak.average < 80) parts.push(`${esc(cls(weak.classId).subject)} is your lowest class at ${weak.average}%.`);
    if (fr && S.labels.foundations) { const f = S.foundations[fr.foundations[0]]; if (f) parts.push(`A 4-minute refresher on <b>${esc(f.title)}</b> (${esc(f.gradeLabel)}) will make “${esc(fr.title)}” click.`); return brief(parts.join(' '), `#/foundation/${f ? f.id : ''}?from=${fr.id}`, 'Start refresher'); }
    return brief(parts.join(' ') || 'You’re all caught up. Want a quick quiz to keep it fresh?', '#/assistant', 'Quiz me');
  }
  function foundationsPanel(ids, fromId, heading) {
    if (!S.labels.foundations || !ids || !ids.length) return '';
    const list = ids.map((id) => S.foundations && S.foundations[id]).filter(Boolean);
    if (!list.length) return '';
    return `<div class="card section"><h2><span>${icon('ladder')} ${esc(heading || 'Foundations Bridge')}</span><span class="ai-chip">AI matched</span></h2>
      <p class="small muted">Lessons from earlier grades that this topic is built on. Review one if something doesn’t make sense yet.</p>
      <div class="found">${list.map((f) => `<a class="fnd" href="#/foundation/${esc(f.id)}?from=${esc(fromId || '')}"><span class="rung">${esc(f.gradeLabel)}</span><span><b>${esc(f.title)}</b><div class="small muted">${esc(f.subject)} · ${esc((f.summary || [])[0] || '')}</div></span><span class="small" style="color:var(--teal)">Refresh →</span></a>`).join('')}</div></div>`;
  }
  function foundationPage(id, fromId) {
    const f = S.foundations && S.foundations[id];
    if (!f) return `<div class="card">That lesson isn't available. <a href="#/vault">Back to the vault</a></div>`;
    const from = S.recaps.find((r) => r.id === fromId);
    return `<a href="${from ? `#/vault/${esc(from.id)}` : '#/vault'}" class="small">← ${from ? esc(from.title) : 'Study Vault'}</a>
      <div class="hero-greet" style="margin-top:10px"><div><span class="ai-chip">${icon('ladder')} Foundations Bridge</span><h1 style="margin-top:10px">${esc(f.title)}</h1>
        <div class="ladder"><b>${esc(f.gradeLabel)} ${esc(f.subject)}</b> → ${from ? `<b>${esc(cls(from.classId).subject)}: ${esc(from.title)}</b>` : 'your class today'}</div></div>
        <button class="btn ghost" data-act="listen" data-text="${esc(f.title + '. ' + f.summary.join(' '))}">${icon('ear')} Listen</button></div>
      ${brief(`This is the ${esc(f.gradeLabel)} version of an idea you're using now. Read the four points, flip the cards, then try the check. It takes about 4 minutes.`)}
      <div class="grid g2"><div class="card"><h2>The idea, simply</h2><ul>${f.summary.map((x) => `<li style="margin-bottom:6px">${esc(x)}</li>`).join('')}</ul></div>
        <div class="card"><h2>Words to know</h2><dl class="terms">${f.keyTerms.map((k) => `<dt>${esc(k.term)}</dt><dd>${esc(k.definition)}</dd>`).join('')}</dl></div></div>
      <div class="card section"><h2>Flashcards</h2>${flashGrid(f.flashcards)}</div>
      <div class="card section"><h2>Quick check</h2>${quizBlock(f.quiz.slice(0, 3), `Foundation: ${f.title}`)}</div>
      ${from ? `<div class="section"><a class="btn" href="#/vault/${esc(from.id)}">Back to ${esc(from.title)} →</a></div>` : ''}`;
  }

  // ---------- kindergarten ----------
  function kinderHome() {
    const colors = ['linear-gradient(140deg,#FF8A3D,#FF5FA2)', 'linear-gradient(140deg,#7C5CFF,#4F8BFF)', 'linear-gradient(140deg,#14B8A6,#5BD66B)', 'linear-gradient(140deg,#FFB020,#FF7A45)'];
    const art = ['<circle cx="32" cy="20" r="12" fill="#FFE27A"/><path d="M32 34v24M32 46c-8 0-12-6-12-12 8 0 12 6 12 12zM32 42c8 0 12-6 12-12-8 0-12 6-12 12z" fill="#fff" stroke="#fff" stroke-width="3"/>',
      '<circle cx="18" cy="22" r="12" fill="#fff"/><rect x="36" y="10" width="22" height="22" rx="3" fill="#FFE27A"/><path d="M32 56l14-22 14 22z" fill="#fff" opacity=".85"/>',
      '<g fill="#fff" font-family="Baloo 2,sans-serif" font-weight="800" font-size="22"><text x="4" y="28">1</text><text x="24" y="44">2</text><text x="42" y="28">3</text></g><circle cx="52" cy="52" r="7" fill="#FFE27A"/>'];
    const jobs = S.assignments.filter((a) => a.state === 'todo' || a.state === 'missing');
    const stars = S.assignments.filter((a) => a.state === 'submitted' || a.state === 'graded').length + (S.badges || []).length;
    return `<div class="k-hello"><svg class="k-sun" viewBox="0 0 84 84" aria-hidden="true"><g stroke="#FFB020" stroke-width="5" stroke-linecap="round">${[0, 45, 90, 135, 180, 225, 270, 315].map((d) => `<line x1="42" y1="6" x2="42" y2="14" transform="rotate(${d} 42 42)"/>`).join('')}</g><circle cx="42" cy="42" r="22" fill="#FFC93C"/><circle cx="35" cy="39" r="2.6" fill="#2A2350"/><circle cx="49" cy="39" r="2.6" fill="#2A2350"/><path d="M34 48c4 5 12 5 16 0" stroke="#2A2350" stroke-width="3" fill="none" stroke-linecap="round"/></svg>
        <div><h1>Hi ${esc(first(S.me.name))}!</h1><p class="muted" style="font-size:19px;margin:0">You have <b>${stars} stars</b> this week. Let’s learn something new!</p></div></div>
      ${brief(`Today we learned about <b>${esc((S.recaps[0] || {}).title || 'something fun')}</b>! Tap Listen and I’ll tell you all about it.`)}
      <h2 style="font-size:26px;margin:22px 0 12px">My lessons</h2>
      <div class="k-cards">${S.recaps.slice(0, 6).map((r, i) => `<a class="k-card" href="#/vault/${esc(r.id)}" style="background:${colors[i % colors.length]}"><svg class="art" viewBox="0 0 64 64" aria-hidden="true">${art[/plant|seed|grow/i.test(r.title) ? 0 : /shape/i.test(r.title) ? 1 : /count|number/i.test(r.title) ? 2 : i % art.length]}</svg><h3>${esc(r.title)}</h3><p>${esc(r.summary[0] || '')}</p>
        <div class="go"><button type="button" data-act="listen" data-text="${esc(r.title + '. ' + r.summary.join(' '))}">${icon('ear')} Listen</button><span>${icon('play')} Play</span></div></a>`).join('')}</div>
      <div class="grid g2 section">
        <div class="card"><h2 style="font-size:24px">My jobs</h2>${jobs.length ? `<div class="list">${jobs.map((a) => `<div class="row"><b style="font-size:18px">${esc(a.title)}</b><button class="btn sm" data-act="submit" data-id="${esc(a.id)}">${icon('check')} I did it!</button></div>`).join('')}</div>` : '<div class="empty" style="font-size:18px">All done! Great job!</div>'}</div>
        <div class="card"><h2 style="font-size:24px">My stickers</h2><div class="stars-row">${['#FFB020', '#FF5FA2', '#7C5CFF', '#14B8A6'].slice(0, Math.max(1, Math.min(4, stars))).map((c, i) => `<div class="sticker"><svg viewBox="0 0 24 24"><path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z" fill="${c}" stroke="#fff" stroke-width="1.2"/></svg>${esc(['Super listener', 'Shape finder', 'Counting star', 'Kind friend'][i])}</div>`).join('')}</div></div>
      </div>`;
  }

  // ---------- student ----------
  function studentHome() {
    const upcoming = S.assignments.filter((a) => a.state === 'todo' || a.state === 'missing').slice(0, 5);
    return `${urgentStrip()}
      <div class="hero-greet"><div><h1>Hey ${esc(first(S.me.name))}, <span class="gtext">let’s go.</span></h1><p class="muted">${esc(S.me.gradeLabel || '')} · ${esc(S.school.name)}</p></div><a class="btn" href="#/assistant">${icon('spark')} Ask Orbit AI</a></div>
      ${studentBrief()}
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
      <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn ghost" data-act="listen" data-text="${esc(r.title + '. ' + r.summary.join(' '))}">${icon('ear')} Listen</button>${S.me.role === 'student' && !isKid() ? `<a class="btn ghost" href="#/exam/${esc(c.id)}">${icon('book')} ${esc(c.subject)} exam prep</a>` : ''}</div></div>
      <div class="grid g2">
        <div class="card"><h2>Recap</h2><ul>${r.summary.map((s) => `<li style="margin-bottom:6px">${esc(s)}</li>`).join('')}</ul>
          ${hw.length ? `<h3 style="margin-top:14px">Homework from this class</h3>${hw.map((a) => `<div class="small">${icon('clip')} <b>${esc(a.title)}</b>, ${esc(dueText(a.due))}</div>`).join('')}` : ''}</div>
        <div class="card"><h2>Key terms</h2><dl class="terms">${r.keyTerms.map((k) => `<dt>${esc(k.term)}</dt><dd>${esc(k.definition)}</dd>`).join('')}</dl></div>
      </div>
      ${foundationsPanel(r.foundations, r.id, 'Built on these earlier lessons')}
      <div class="card section"><h2>Flashcards</h2>${flashGrid(r.flashcards)}</div>
      <div class="card section"><h2>${isKid() ? 'Let’s play!' : 'Practice quiz'}</h2>${quizBlock(r.quiz, `${c.subject}: ${r.title}`)}</div>`;
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
      ${(() => { const ids = [...new Set(rs.flatMap((r) => r.foundations || []))].slice(0, 4); const anchor = rs.find((r) => (r.foundations || []).length); return ids.length ? `${brief(`Before the test, Orbit found <b>${ids.length} earlier-grade lessons</b> these topics are built on. If a recap feels confusing, the gap is usually in one of these.`)}${foundationsPanel(ids, anchor && anchor.id, 'Before the test: refresh the foundations')}` : ''; })()}
      <div class="card section"><h2>What we covered</h2>${rs.map((r) => `<h3 style="margin-top:12px">${esc(r.title)} <span class="tiny muted">${fmtDate(r.date)}</span></h3><ul class="small">${r.summary.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>`).join('') || '<div class="empty">No recaps yet.</div>'}</div>
      <div class="card section"><h2>All key terms</h2><dl class="terms">${terms.map((k) => `<dt>${esc(k.term)}</dt><dd>${esc(k.definition)}</dd>`).join('')}</dl></div>
      <div class="card section noprint"><h2>Flashcard review</h2>${flashGrid(rs.flatMap((r) => r.flashcards))}</div>
      <div class="card section"><h2>Practice test</h2>${quizBlock(qs, `${c.subject} exam prep`)}</div>`;
  }
  function shuffle(a) { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; }

  function assistantPage() {
    const lv = S.labels.level;
    const subjects = [...new Set(S.classes.map((c) => c.subject))];
    const t0 = (S.recaps[0] && S.recaps[0].title) || subjects[0];
    const ideas = lv === 'kinder' ? ['What is a seed?', 'Quiz me on shapes', 'Tell me about counting']
      : [`Explain ${t0} simply`, `What is ${((S.recaps[0] || {}).keyTerms || [{ term: 'a key term' }])[0].term.toLowerCase()}?`, `Make flashcards for ${subjects[0]}`, `Quiz me on ${subjects[1] || subjects[0]}`, `I don't get ${t0}`];
    if (!chat.length) chat.push({ who: 'bot', text: lv === 'kinder' ? `Hi ${first(S.me.name)}! I'm Orbit. Ask me anything about what we learned today!` : `Hi ${first(S.me.name)}. I'm Orbit, your AI study partner. I know everything from your class recaps. Ask a question, ask for flashcards or a quiz, or tell me what you don't get and I'll take you back to the lesson it's built on.` });
    return `<div class="chathead"><div class="orb lg"></div><div><h1 style="margin:0">${lv === 'kinder' ? 'Ask Orbit' : 'Orbit AI'}</h1><p class="muted" style="margin:0">${lv === 'kinder' ? 'Your friendly learning buddy.' : 'Studies from your own class recaps. It won’t do your homework, but it’ll get you ready for it.'}</p></div></div>
      <div class="card"><div class="chat" id="chat">${chat.map(chatMsg).join('')}</div>
        <div class="chips" style="margin-top:12px">${ideas.map((t) => `<button class="chip" data-act="ask" data-q="${esc(t)}">${esc(t)}</button>`).join('')}</div>
        <form class="chatform" data-form="chat"><label class="sr" for="cq">Your question</label><input id="cq" name="q" type="text" placeholder="${lv === 'kinder' ? 'Type or tap a bubble…' : 'Ask anything from class…'}" autocomplete="off" required><button class="btn" type="submit">${icon('spark')} Send</button></form>
      </div>`;
  }
  function chatMsg(m, i) {
    if (m.who === 'me') return `<div class="msg me">${esc(m.text)}</div>`;
    let extra = '';
    if (m.flashcards) extra = `<div style="margin-top:10px">${flashGrid(m.flashcards.slice(0, 6))}</div>`;
    if (m.quiz) extra = `<div style="margin-top:10px">${quizBlock(m.quiz, 'Assistant quiz')}</div>`;
    if (m.foundation) extra += `<a class="fnd" style="margin-top:10px" href="#/foundation/${esc(m.foundation.id)}${m.recapId ? `?from=${esc(m.recapId)}` : ''}"><span class="rung">${esc(m.foundation.gradeLabel)}</span><span><b>${esc(m.foundation.title)}</b><div class="small muted">${esc(m.foundation.subject)} · Foundations Bridge</div></span><span class="small" style="color:var(--teal)">Open →</span></a>`;
    const meta = m.source ? `<div class="tiny muted" style="margin-top:6px">From your ${esc(m.source)}${m.recapId ? ` · <a href="#/vault/${esc(m.recapId)}">open recap</a>` : ''}</div>` : '';
    if (m.fresh) return `<div class="msg bot typing" data-tw="${i}"><span class="tw"></span><div class="tw-rest" hidden>${meta}${extra}</div></div>`;
    return `<div class="msg bot">${esc(m.text)}${meta}${extra}</div>`;
  }
  function typewriter() {
    const el = document.querySelector('.msg.bot.typing'); if (!el) return;
    const m = chat[Number(el.dataset.tw)]; m.fresh = false;
    const span = el.querySelector('.tw'); const rest = el.querySelector('.tw-rest'); const box = document.getElementById('chat');
    const full = m.text; let n = 0; const step = Math.max(1, Math.round(full.length / 90));
    const done = () => { span.textContent = full; el.classList.remove('typing'); rest.hidden = false; if (box) box.scrollTop = box.scrollHeight; };
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return done();
    (function tick() { if (!el.isConnected) return; n += step; span.textContent = full.slice(0, n); if (box) box.scrollTop = box.scrollHeight; if (n < full.length) setTimeout(tick, 14); else done(); })();
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
      ${brief(parentBriefText(), '#/vault', 'See what they learned')}
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

  function parentBriefText() {
    const n = esc(first(S.student.name)); const miss = S.assignments.filter((a) => a.state === 'missing');
    const r = S.recaps[0]; const ask = r && r.keyTerms[0];
    const p = [S.risk.level === 'ok' ? `${n} is on track this week.` : `${n} could use some support this week: ${esc(S.risk.reasons[0] || '')}.`];
    if (miss.length) p.push(`${miss.length} ${miss.length === 1 ? 'assignment is' : 'assignments are'} missing.`);
    if (ask) p.push(`At dinner, try asking: <b>“What’s ${esc(ask.term.toLowerCase())}?”</b> They covered it in ${esc(cls(r.classId).subject)}.`);
    return p.join(' ');
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
      ${brief(`${atRisk.filter((s) => s.risk === 'high').length} ${atRisk.filter((s) => s.risk === 'high').length === 1 ? 'student needs' : 'students need'} you today${atRisk[0] ? `, starting with <b>${esc(atRisk[0].name)}</b> (${esc(atRisk[0].reasons[0] || '')})` : ''}. ${drafts.length ? `${drafts.length} AI recap ${drafts.length === 1 ? 'draft is' : 'drafts are'} waiting for your approval. ` : ''}${reqs.length ? `${reqs.length} meeting ${reqs.length === 1 ? 'request' : 'requests'} to answer.` : ''}`, atRisk[0] ? '#/class/' + S.classes[0].id : '', 'Open roster')}
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
    return `${drafts.map((r) => `<form class="card" data-form="publish" data-id="${esc(r.id)}" style="margin-bottom:16px;border-color:var(--watch)"><h2>${esc(r.title)} ${pill('draft', 'Draft: review before students see it')}</h2>
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
      <defs><linearGradient id="tg" x1="0" x2="1"><stop offset="0" stop-color="#2EE6D6"/><stop offset=".5" stop-color="#7C6CFF"/><stop offset="1" stop-color="#FF6FB5"/></linearGradient><linearGradient id="tf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7C6CFF" stop-opacity=".28"/><stop offset="1" stop-color="#7C6CFF" stop-opacity="0"/></linearGradient></defs>
      ${[lo, (lo + hi) / 2, hi].map((v) => `<line x1="${pad}" x2="${W - pad}" y1="${Y(v)}" y2="${Y(v)}" stroke="currentColor" stroke-opacity=".1"/><text x="4" y="${Y(v) + 4}" font-size="11" fill="currentColor" fill-opacity=".55">${Math.round(v)}%</text>`).join('')}
      <polygon points="${X(0)},${H - pad} ${pts} ${X(t.length - 1)},${H - pad}" fill="url(#tf)"/>
      <polyline points="${pts}" fill="none" stroke="url(#tg)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>
      ${t.map((x, i) => `<circle cx="${X(i)}" cy="${Y(x.avg)}" r="4" fill="#06071A" stroke="#A99FFF" stroke-width="2"/><text x="${X(i)}" y="${H - 8}" font-size="11" text-anchor="middle" fill="currentColor" fill-opacity=".55">${esc(x.month)}</text>`).join('')}
      <text x="${X(t.length - 1)}" y="${Y(t[t.length - 1].avg) - 12}" font-size="13" font-weight="700" text-anchor="end" fill="currentColor">${t[t.length - 1].avg}%</text></svg>`;
  }
  function emailPage() {
    return `<h1>Email log</h1><p class="muted">Every email OrbitLearn sent: at-risk alerts, meeting confirmations and urgent alerts. In this demo, emails are logged here instead of being delivered.</p>
      <div class="card">${S.outbox.length ? `<div class="list">${S.outbox.map((e) => `<details class="row" style="display:block"><summary style="cursor:pointer"><b>${esc(e.subject)}</b> <span class="small muted">to ${esc(e.toName)} &lt;${esc(e.to)}&gt; · ${ago(e.createdAt)}</span></summary><div class="email">${esc(e.body)}</div></details>`).join('')}</div>` : '<div class="empty">No emails yet. Try “Run daily risk check” or notify a family from a student row.</div>'}</div>`;
  }
  function settingsPage() {
    const lv = S.school.level;
    const opts = [['kinder', 'Kindergarten', 'Little Orbit: big read-aloud lesson cards, stickers, one-tap answers.'], ['elementary', 'Elementary', 'Parent-first dashboards, simple recaps, badges and streaks.'], ['middle', 'Middle school', 'Recaps and study tools, badges for engagement.'], ['high', 'High school', 'Detailed recaps, Study Vault, parent alerts for grades and absences.'], ['university', 'College & university', 'Full lecture digests; advisors replace parents; study groups.']];
    return `<h1>Settings</h1>
      <form class="card" data-form="level"><h2>School level</h2><p class="small muted">Sets the default for school-wide screens. Each student’s own view already adapts to their grade: Kindergarten gets Little Orbit, university gets a focused professional layout.</p>
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
      else if (act === 'listen') { e.preventDefault(); e.stopPropagation(); speak(t.dataset.text); }
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
    chat.push({ who: 'bot', ...r, fresh: true });
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
