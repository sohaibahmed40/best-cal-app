// Browser check for the keyboard press feedback (CODE-CATALYST-4, criterion 6).
//
// Starts the Vite dev server and drives real Chromium and WebKit (Safari's engine) with real
// key and mouse input:
//   1. Typing 12+3 then Enter marks 1, 2, +, 3 and = one at a time, and each keyboard press
//      computes the same transform, ::after filter, shadow and animation as a mouse press.
//   2. The macOS Cmd sequence: hold 5, press Cmd, release 5, release Cmd. macOS drops the keyup
//      for 5 while Cmd is held, so the script replays it both ways (keyup dropped and delivered).
//      No button may stay pressed and the display must still read 5.
//
// It cannot make Windows or Linux WebKit drop keyups the way macOS does; it replays the event
// sequence macOS delivers. The real-Safari steps are in docs/manual-checks.md.
//
// Usage: npx playwright install chromium webkit   (once)
//        npm run check:keys
import { chromium, webkit } from 'playwright';
import { createServer } from 'vite';

const failures = [];
const check = (ok, message) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${message}`);
  if (!ok) failures.push(message);
};

const pressedLabels = (page) =>
  page.$$eval('.key[data-pressed="true"]', (els) =>
    els.map((el) => `${el.getAttribute('aria-label')}${el.classList.contains('key-pressed') ? '' : ' (no key-pressed class)'}`),
  );
// Wait for React to mount and run its effects, so the window key listeners are attached.
async function open(page, url) {
  await page.goto(url);
  await page.waitForSelector('button[aria-label="equals"]');
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 50)))));
}

const display = (page) => page.textContent('[data-testid="display"]');

// The properties the press rules in Calculator.css set, read once the 80ms transition and the
// 160ms plate-flash have finished (the infinite pending-operator aura is skipped).
async function pressStyle(page, label) {
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((a) => a.effect?.getTiming().iterations !== Infinity)
        .map((a) => a.finished.catch(() => {})),
    ),
  );
  return page.$eval(`button[aria-label="${label}"]`, (el) => {
    const s = getComputedStyle(el);
    const a = getComputedStyle(el, '::after');
    return JSON.stringify({ transform: s.transform, filter: a.filter, boxShadow: a.boxShadow, animation: a.animationName });
  });
}

async function mousePressStyle(page, label) {
  const box = await page.locator(`button[aria-label="${label}"]`).boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  const style = await pressStyle(page, label);
  await page.mouse.up();
  await page.mouse.move(0, 0);
  return style;
}

async function typing(page, url, name) {
  // [Playwright key, button aria-label]
  const steps = [['Digit1', '1'], ['Digit2', '2'], ['Shift+Equal', 'add'], ['Digit3', '3'], ['Enter', 'equals']];
  const mouse = {};
  for (const [, label] of steps) {
    await open(page, url);
    mouse[label] = await mousePressStyle(page, label);
  }
  await open(page, url);
  for (const [key, label] of steps) {
    const parts = key.split('+');
    for (const p of parts) await page.keyboard.down(p);
    const held = await pressedLabels(page);
    check(held.length === 1 && held[0] === label, `${name}: holding ${key} marks only "${label}" (got ${JSON.stringify(held)})`);
    const style = await pressStyle(page, label);
    check(style === mouse[label], `${name}: "${label}" keyboard press looks like a mouse press ${style}${style === mouse[label] ? '' : ` vs mouse ${mouse[label]}`}`);
    for (const p of parts.reverse()) await page.keyboard.up(p);
    const after = await pressedLabels(page);
    check(after.length === 0, `${name}: releasing ${key} clears every press (got ${JSON.stringify(after)})`);
  }
  check((await display(page)) === '15', `${name}: display reads 15 after 12+3 Enter (got "${await display(page)}")`);
}

// Hold 5, press Cmd, release 5, release Cmd, with every keyup delivered (Windows/Linux behaviour).
async function cmdSequence(page, url, name) {
  await open(page, url);
  await page.keyboard.down('Digit5');
  const held = await pressedLabels(page);
  check(held.length === 1 && held[0] === '5', `${name}: holding 5 marks "5" (got ${JSON.stringify(held)})`);
  await page.keyboard.down('Meta');
  const onCmd = await pressedLabels(page);
  check(onCmd.length === 0, `${name}: pressing Cmd clears every press (got ${JSON.stringify(onCmd)})`);
  await page.keyboard.up('Digit5');
  await page.keyboard.up('Meta');
  const end = await pressedLabels(page);
  check(end.length === 0, `${name}: hold 5, Cmd, release 5, release Cmd leaves nothing pressed (got ${JSON.stringify(end)})`);
  check((await display(page)) === '5', `${name}: display still reads 5 (got "${await display(page)}")`);
}

// The macOS case: the page never sees a keyup for 5, only the Cmd keyup.
async function cmdSequenceNoKeyup(page, url, name) {
  await open(page, url);
  await page.keyboard.down('Digit5');
  await page.keyboard.down('Meta');
  // Release Cmd with a dispatched keyup so no keyup for Digit5 ever reaches the page.
  await page.evaluate(() =>
    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Meta', code: 'MetaLeft', bubbles: true })),
  );
  const end = await pressedLabels(page);
  check(end.length === 0, `${name}: hold 5, Cmd, Cmd up with no keyup for 5 (macOS) leaves nothing pressed (got ${JSON.stringify(end)})`);
  check((await display(page)) === '5', `${name}: display still reads 5 (got "${await display(page)}")`);
}

const server = await createServer({ server: { port: 0, strictPort: false }, logLevel: 'error' });
await server.listen();
const url = server.resolvedUrls.local[0];
console.log(`dev server: ${url}`);

try {
  for (const [name, type] of [['chromium', chromium], ['webkit', webkit]]) {
    const browser = await type.launch();
    const page = await browser.newPage({ reducedMotion: 'no-preference' });
    console.log(`\n${name} ${browser.version()}`);
    await typing(page, url, name);
    await cmdSequence(page, url, name);
    await cmdSequenceNoKeyup(page, url, name);
    await browser.close();
  }
} finally {
  await server.close();
}

console.log(failures.length ? `\n${failures.length} check(s) failed` : '\nall checks passed');
process.exit(failures.length ? 1 : 0);
