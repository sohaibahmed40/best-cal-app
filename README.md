# Basic Calculator

A pocket-style calculator built with React, Vite and TypeScript.

## Getting started

Requires Node 20.19 or newer.

```sh
npm install
npm run dev     # start the dev server
npm test        # run the Vitest suite once
npm run build   # type-check (strict) and build to dist/
```

## Keys

| Button | Keyboard           | Does                                        |
| ------ | ------------------ | ------------------------------------------- |
| 0–9    | `0`–`9`            | Enter a digit                               |
| .      | `.`                | Decimal point (a second one is ignored)     |
| + − × ÷ | `+` `-` `*` `/`   | Operators                                   |
| =      | `Enter` or `=`     | Evaluate; press again to repeat the last op |
| AC     | `Escape`           | Clear everything                            |
| CE     | `Delete`           | Clear the current entry only                |
| ⌫      | `Backspace`        | Remove the last digit                       |
| ±      | —                  | Toggle the sign                             |
| %      | `%`                | Percent (see below)                         |
| DEG/RAD | —                 | Switch the trig angle unit (shown above the display) |
| π e    | —                  | Enter pi or Euler's number                  |
| n!     | `!`                | Factorial                                   |
| sin cos tan | —             | Trigonometry in the active angle unit       |
| √      | —                  | Square root                                 |
| ln log | —                  | Natural log and log base 10                 |
| x²     | —                  | Square                                      |
| 1/x    | —                  | Reciprocal                                  |

## Behaviour

- **Left to right.** Like a pocket calculator, operations run in the order they are entered: `2 + 3 × 4 =` gives `20`, not `14`.
- **Repeat equals.** `5 + 2 = = =` shows `7`, `9`, `11`.
- **Operator replacement.** Pressing a second operator replaces the first: `5 + × 2 =` gives `10`.
- **Percent.**
  - With no pending operator, `x %` gives `x / 100` (`50 %` → `0.5`).
  - After `+` or `−`, `b %` gives `a × b / 100`, so `200 + 10 % =` → `220`.
  - After `×` or `÷`, `b %` gives `b / 100`, so `50 × 10 % =` → `5`.
- **Expression line.** The display shows the calculation as it is typed (`20 +`, then `20 + 20`). After `=`, a small `20 + 20 =` line sits above the result until the next key.
- **Effects.** Each press flashes a kanji (撃 digits, 斬 operators and %, 消 AC/CE/⌫ and the scientific, π/e and DEG/RAD keys); `=` stamps "決着 FINISH" and an error shows a "限界突破 SYSTEM BREAK" banner. The calculator gets `is-pending`, `is-result` or `is-error` to match. The effects layer is `aria-hidden`, sits outside the display, and only animates when `prefers-reduced-motion` allows it.
- **Divide by zero** shows `Error`. Only a digit (which starts a fresh calculation) or AC does anything until then.
- **Scientific functions** apply to the displayed number and keep any pending operator: `9 + 16 √ =` gives `13`. Right after an operator they use the shown value, so `9 + √ =` gives `9 + 3`.
- **π and e** replace the current entry: `2 × π =` gives `6.28318530718`.
- **Angle unit** starts in DEG and survives AC and Error; only a page reload resets it. Results within 1e-12 of zero show `0` (`sin 180` → `0`).
- **Invalid function input** shows `Error`, with the same recovery as divide by zero: `√` of a negative, `ln` or `log` of 0 or less, `1/0`, `tan 90°`, and `n!` of a negative, a non-integer or a number above 170.
- **Precision.** Functions work on the 12-digit display value, so in RAD `tan` of π/2 (`1.57079632679`) gives a very large number rather than `Error`.
- **Display.** Results are rounded to 12 significant digits (`0.1 + 0.2` → `0.3`). Values of 1e12 or more, or below 1e-9, switch to exponential notation.

## Layout

- `src/calculator.ts`: pure calculator logic and the reducer. No React.
- `src/components/Calculator.tsx`: the UI, driven by `useReducer` from button clicks and a `keydown` listener.
- `src/components/keys.ts` and `keyboard.ts`: the button list and the keyboard mapping.
- `src/components/Calculator.css`: dark shonen "Battle HUD" style, token-driven (colours, radii, shadows on `:root`), motion disabled under `prefers-reduced-motion`.
