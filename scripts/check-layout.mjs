// Browser check for the Basic/Scientific layout (CODE-CATALYST-5, criteria 1 and 2).
//
// Starts the Vite dev server and drives real Chromium at 1280×800. jsdom cannot measure layout,
// so this is where "wider than it is tall" is checked:
//   1. The calculator opens in Basic mode: the switch is off, no scientific button is in the page,
//      and the Calculator section is wider than it is tall and under 480px tall.
//   2. Clicking the switch shows the scientific keys and the section is still wider than tall;
//      clicking it again goes back to the Basic layout.
//   3. A number stored with MS is recalled after switching to Scientific and back.
//   4. At 360×740 (phone) Basic mode is still wider than tall and neither mode scrolls sideways.
//
// Usage: npx playwright install chromium   (once)
//        npm run check:layout
//        npm run check:layout -- --screenshots   (also rewrites docs/screenshots/)
import { chromium } from 'playwright';
import { createServer } from 'vite';

const failures = [];
const check = (ok, message) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${message}`);
  if (!ok) failures.push(message);
};

const SCIENTIFIC_LABELS = [
  'sine',
  'cosine',
  'tangent',
  'square root',
  'power',
  'natural log',
  'log base 10',
  'square',
  'reciprocal',
  'pi',
  "euler's number",
  'angle unit',
  'factorial',
];
const screenshots = process.argv.includes('--screenshots');

// Wait for React to mount and run its effects.
async function open(page, url) {
  await page.goto(url);
  await page.waitForSelector('button[aria-label="equals"]');
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 50)))));
}

const calculator = (page) => page.getByRole('region', { name: 'Calculator' });
const modeSwitch = (page) => page.getByRole('switch', { name: 'scientific mode' });
const display = (page) => page.textContent('[data-testid="display"]');
const click = (page, label) => page.click(`button[aria-label="${label}"]`);
const size = async (page) => {
  const box = await calculator(page).boundingBox();
  return { width: Math.round(box.width), height: Math.round(box.height) };
};
const sciButtonsInPage = (page) =>
  page.$$eval('button', (els, labels) => els.filter((el) => labels.includes(el.getAttribute('aria-label'))).length, SCIENTIFIC_LABELS);

async function layout(page, url, name) {
  await open(page, url);
  check((await modeSwitch(page).getAttribute('aria-checked')) === 'false', `${name}: opens with the switch off (Basic)`);
  const basicSci = await sciButtonsInPage(page);
  check(basicSci === 0, `${name}: Basic mode has no scientific buttons in the page (found ${basicSci})`);
  const basicKeys = await page.locator('.key').count();
  check(basicKeys === 24, `${name}: Basic mode shows 24 keys (got ${basicKeys})`);
  const basic = await size(page);
  check(basic.width > basic.height, `${name}: Basic mode is wider than tall (${basic.width} × ${basic.height})`);
  check(basic.height < 480, `${name}: Basic mode is under 480px tall (${basic.height})`);
  if (screenshots) await calculator(page).screenshot({ path: 'docs/screenshots/desktop-1-basic.png' });

  await modeSwitch(page).click();
  check((await modeSwitch(page).getAttribute('aria-checked')) === 'true', `${name}: the switch turns Scientific on`);
  const sciCount = await sciButtonsInPage(page);
  check(sciCount === SCIENTIFIC_LABELS.length, `${name}: Scientific mode shows all ${SCIENTIFIC_LABELS.length} scientific buttons (found ${sciCount})`);
  const sci = await size(page);
  check(sci.width > sci.height, `${name}: Scientific mode is wider than tall (${sci.width} × ${sci.height})`);
  if (screenshots) {
    for (const label of ['3', '0', 'sine']) await click(page, label);
    await calculator(page).screenshot({ path: 'docs/screenshots/desktop-2-scientific-sin30.png' });
    await click(page, 'all clear');
  }

  await modeSwitch(page).click();
  check((await modeSwitch(page).getAttribute('aria-checked')) === 'false', `${name}: the switch turns Scientific off again`);
  check((await sciButtonsInPage(page)) === 0, `${name}: back in Basic mode the scientific buttons are gone`);
  const back = await size(page);
  check(back.width === basic.width && back.height === basic.height, `${name}: back in Basic mode the size is the same (${back.width} × ${back.height})`);
}

async function memory(page, url, name) {
  await open(page, url);
  for (const label of ['4', '2', 'memory store', 'all clear']) await click(page, label);
  check(await page.isVisible('[data-testid="memory-indicator"]'), `${name}: the M indicator shows after MS`);
  await modeSwitch(page).click();
  await click(page, 'memory recall');
  check((await display(page)) === '42', `${name}: MR in Scientific mode shows 42 (got "${await display(page)}")`);
  if (screenshots) await calculator(page).screenshot({ path: 'docs/screenshots/desktop-3-scientific-memory.png' });
  await modeSwitch(page).click();
  await click(page, 'all clear');
  await click(page, 'memory recall');
  check((await display(page)) === '42', `${name}: MR back in Basic mode shows 42 (got "${await display(page)}")`);
}

// Phones stack the scientific panel above the basic keys, so only Basic must stay wider than tall.
async function phone(browser, url, name) {
  const page = await browser.newPage({ viewport: { width: 360, height: 740 }, reducedMotion: 'reduce' });
  await open(page, url);
  const basic = await size(page);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  check(!overflow, `${name} 360px: no horizontal scroll in Basic mode`);
  check(basic.width > basic.height, `${name} 360px: Basic mode is wider than tall (${basic.width} × ${basic.height})`);
  if (screenshots) await calculator(page).screenshot({ path: 'docs/screenshots/360-1-basic.png' });
  await modeSwitch(page).click();
  const sciOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  check(!sciOverflow, `${name} 360px: no horizontal scroll in Scientific mode`);
  if (screenshots) await calculator(page).screenshot({ path: 'docs/screenshots/360-2-scientific.png' });
  await page.close();
}

const server = await createServer({ server: { port: 0, strictPort: false }, logLevel: 'error' });
await server.listen();
const url = server.resolvedUrls.local[0];
console.log(`dev server: ${url}`);

try {
  const browser = await chromium.launch();
  const name = 'chromium';
  // Reduced motion keeps the effects layer and the error shake out of the measurements and screenshots.
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
  console.log(`\n${name} ${browser.version()} at 1280×800`);
  await layout(page, url, name);
  await memory(page, url, name);
  await phone(browser, url, name);
  await browser.close();
} finally {
  await server.close();
}

console.log(failures.length ? `\n${failures.length} check(s) failed` : '\nall checks passed');
process.exit(failures.length ? 1 : 0);
