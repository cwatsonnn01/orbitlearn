// UI click-through: node test/ui.js  (needs the pre-installed Playwright)
process.env.DATA_FILE = require('path').join(require('os').tmpdir(), 'ol-ui-' + Date.now() + '.json');
const { chromium } = require('playwright');
const { server } = require('../src/server');
const OUT = process.argv[2] || '/tmp';
server.listen(0, async () => {
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  const errors = [];
  const shot = async (p, name) => { await p.waitForTimeout(250); await p.screenshot({ path: `${OUT}/${name}.png`, fullPage: true }); };
  async function as(role, fn, mobile) {
    const ctx = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1360, height: 900 } });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errors.push(role + ': ' + e.message));
    p.on('console', (m) => { if (m.type() === 'error' && !/fonts/.test(m.text())) errors.push(role + ' console: ' + m.text()); });
    await p.goto(base);
    if (role === 'student' && !fn.loginShot) { /* login shot taken separately */ }
    await p.click(`button[data-role=${role}]`);
    await p.waitForSelector('main');
    await fn(p);
    await ctx.close();
  }
  try {
    const lp = await browser.newPage({ viewport: { width: 1360, height: 900 } }); await lp.goto(base); await lp.waitForSelector('.demos'); await shot(lp, 'login'); await lp.close();
    await as('student', async (p) => {
      await shot(p, 'student-home');
      await p.goto(base + '/#/vault'); await shot(p, 'student-vault');
      await p.click('.vrow'); await p.waitForSelector('.flash');
      await p.click('.flash'); await p.locator('.qz').first().locator('.opt').first().click();
      await shot(p, 'student-recap');
      await p.goto(base + '/#/assistant'); await p.fill('#cq', 'what is a parabola'); await p.press('#cq', 'Enter'); await p.waitForTimeout(400);
      await p.click('button[data-q^="Quiz me"]'); await p.waitForTimeout(2200); await p.click('button[data-q^="I don"]'); await p.waitForTimeout(2600); await shot(p, 'student-assistant');
      await p.goto(base + '/#/vault'); await p.click('.vrow'); await p.waitForSelector('.flash'); await shot(p, 'student-recap');
      if (await p.$('.fnd')) { await p.click('.fnd'); await p.waitForSelector('.ladder'); await shot(p, 'student-foundation'); }
      await p.goto(base + '/#/exam/bio'); await shot(p, 'student-exam');
      await p.goto(base + '/#/assignments'); await p.click('button[data-act=submit]'); await p.waitForTimeout(300); await shot(p, 'student-assignments');
    });
    await as('teacher', async (p) => {
      await shot(p, 'teacher-home');
      await p.click('button[data-act=notify]'); await p.waitForTimeout(400);
      await p.goto(base + '/#/class/bio?tab=roster'); await shot(p, 'teacher-roster');
      await p.goto(base + '/#/class/bio?tab=recaps'); await p.click('button[data-act=sample]'); await p.click('form[data-form=generate] button:not([type=button])'); await p.waitForSelector('form[data-form=publish]');
      await shot(p, 'teacher-recap-draft');
      await p.click('form[data-form=publish] button:not([type=button])'); await p.waitForTimeout(400);
      await p.goto(base + '/#/class/bio?tab=attendance'); await p.click('form[data-form=attendance] button'); await p.waitForTimeout(300);
      await p.goto(base + '/#/class/bio?tab=assignments'); await p.click('button[data-act=grade]'); await p.waitForSelector('.modal'); await shot(p, 'teacher-grade'); await p.click('.modal button:not([type=button])'); await p.waitForTimeout(300);
    });
    await as('parent', async (p) => {
      await shot(p, 'parent-home');
      await p.click('button[data-act=bell]'); await p.waitForTimeout(200); await shot(p, 'parent-notifications');
      await p.goto(base + '/#/meetings'); await p.fill('#mr', 'Can we make a catch-up plan?'); await p.click('form[data-form=meeting] button'); await p.waitForTimeout(300); await shot(p, 'parent-meetings');
      await p.goto(base + '/#/community'); await shot(p, 'parent-community');
    });
    await as('admin', async (p) => {
      await shot(p, 'admin-home');
      await p.click('button[data-act=runrisk]'); await p.waitForTimeout(300);
      await p.goto(base + '/#/announcements'); await p.fill('#at', 'Lockdown drill'); await p.fill('#ab', 'Practice drill at 10:30 AM. Follow your teacher.'); await p.check('input[name=urgent]'); await p.click('form[data-form=announce] button'); await p.waitForTimeout(300);
      await p.goto(base + '/#/email'); await shot(p, 'admin-email');
      await p.goto(base + '/#/settings'); await shot(p, 'admin-settings');
    });
    await as('kinder', async (p) => { await shot(p, 'kinder-home'); await p.click('.k-card'); await p.waitForSelector('.flash'); await shot(p, 'kinder-recap'); await p.goto(base + '/#/assistant'); await shot(p, 'kinder-assistant'); });
    await as('uni', async (p) => { await shot(p, 'uni-home'); await p.goto(base + '/#/exam/bio201'); await shot(p, 'uni-exam'); });
    await as('parent', async (p) => { await shot(p, 'mobile-parent'); }, true);
    await as('kinder', async (p) => { await shot(p, 'mobile-kinder'); }, true);
    console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'UI OK, no errors');
  } catch (e) { console.error('UI FAIL', e); console.log(errors.join('\n')); process.exitCode = 1; }
  await browser.close(); server.close(); process.exit();
});
