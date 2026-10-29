# Manual and browser checks

## Keyboard press feedback (CODE-CATALYST-4)

### Automated: `npm run check:keys`

```sh
npx playwright install chromium webkit   # once per machine
npm run check:keys
```

`scripts/check-key-press.mjs` starts the Vite dev server and drives Chromium and WebKit (Safari's engine) with real key and mouse input. It prints `ok`/`FAIL` per check and exits non-zero on any failure.

- **12+3 Enter.** Holding each of 1, 2, Shift+= (+), 3 and Enter marks only the matching button (`data-pressed="true"` and `key-pressed`). Releasing the key clears it, and the display ends at `15`.
- **Same look as a mouse press.** For each of those buttons, the keyboard press gives the same computed `transform`, `::after` `filter`, `::after` `box-shadow` and `::after` animation as holding the mouse on it. Styles are read after the finite animations finish.
- **Cmd sequence.** Hold 5, press Cmd, release 5, release Cmd. This runs twice: once with every keyup delivered, and once the way macOS delivers it, with no keyup for 5 at all, only the Cmd keyup. Nothing may stay pressed, and the display must still read `5`.

The script can only replay the events macOS sends. It cannot make WebKit on Windows or Linux drop the keyup the way macOS does, so real Safari still needs the check below.

### Manual: Safari on macOS

1. `npm run dev`, then open the printed URL in Safari.
2. Type `12+3` then Enter slowly. Each of 1, 2, +, 3 and = sinks and lights up while its key is down, the same as when you hold the mouse on it. The display reads `15`.
3. Hold `5`, press and hold Cmd, release `5`, then release Cmd. No button stays sunk or lit, and the display reads `5`.
4. Optional, for the cause: in the Web Inspector console run
   `addEventListener('keyup', e => console.log('keyup', e.code))` and repeat step 3. Only `MetaLeft` (or `MetaRight`) is logged, with no `Digit5`. That missing keyup is what the Cmd handler covers.

## Basic and Scientific layout (CODE-CATALYST-5)

### Automated: `npm run check:layout`

```sh
npx playwright install chromium   # once per machine
npm run check:layout
npm run check:layout -- --screenshots   # also rewrites docs/screenshots/
```

`scripts/check-layout.mjs` starts the Vite dev server and drives Chromium at 1280×800. It prints `ok`/`FAIL` per check and exits non-zero on any failure.

- **Opens in Basic.** The switch has `aria-checked="false"`, no scientific button is in the page, 24 keys are shown, and the Calculator section is wider than tall and under 480 px tall (about 560 × 420).
- **Switch and back.** Clicking the switch shows all 13 scientific buttons and the section stays wider than tall (about 920 × 420). Clicking again removes them and restores the Basic size.
- **Memory across modes.** 42, MS, AC, switch to Scientific, MR shows `42`; switch back, AC, MR shows `42` again.
- **Phone (360×740).** Basic mode is still wider than tall, and neither mode scrolls sideways.

### Manual

1. `npm run dev` and open the printed URL. The calculator shows BASIC highlighted, the 6×4 key grid with MC/MR/MS on the left, and no sin/cos/tan keys. It is clearly wider than tall.
2. Click **SCI**. The scientific panel appears on the left and DEG shows at the top right. Try `30 sin` → `0.5`, `90 cos` → `0`, `9 √` → `3`, `2 xʸ 3 =` → `8`, `100 log` → `2`, `e ln` → `1`.
3. Type `42`, press MS (an `M` badge appears), AC, click the switch back to BASIC, press MR: `42`.
