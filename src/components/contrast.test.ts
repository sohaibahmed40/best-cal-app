import { describe, expect, it } from 'vitest';
import css from './Calculator.css?raw';

// Criterion 4 evidence: the Battle HUD palette lives in :root tokens and every
// text colour meets WCAG AA (4.5:1) on each background it sits on.
const root = css.slice(css.indexOf(':root {'), css.indexOf('\n}', css.indexOf(':root {')));
const outside = css.replace(root, '');

function token(name: string): string {
  const m = root.match(new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`, 'i'));
  if (!m) throw new Error(`no hex token --${name}`);
  return m[1];
}

function luminance(hex: string, scale = 1): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = Math.min(1, (parseInt(hex.slice(i, i + 2), 16) / 255) * scale);
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(fg: string, bg: string, bgScale = 1): number {
  const [a, b] = [luminance(fg), luminance(bg, bgScale)].sort((x, y) => y - x);
  return (a + 0.05) / (b + 0.05);
}

describe('11. Battle HUD tokens and contrast', () => {
  it('has no literal colours outside :root', () => {
    expect(outside).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(/i);
  });

  // [text token, background token, background brightness filter]
  const pairs: [string, string, number][] = [
    ['text', 'display-bg', 1],
    ['text', 'steel-dark', 1], // digit and op plates
    ['text', 'steel', 1],
    ['text', 'steel-light', 1],
    ['text', 'steel-light', 1.35], // pressed plate
    ['text-muted', 'display-bg', 1], // history line
    ['text-silver', 'steel', 1], // fn keys, DEG/RAD badge
    ['text-silver', 'steel-light', 1],
    ['text-silver', 'steel-dark', 1],
    ['text-silver', 'steel-light', 1.35],
    ['text-on-accent', 'crimson', 1], // equals plate
    ['text-on-accent', 'crimson-deep', 1],
    ['text-on-accent', 'crimson', 0.8], // pressed equals
  ];

  it.each(pairs)('--%s on --%s (brightness %s) is at least 4.5:1', (fg, bg, scale) => {
    expect(ratio(token(fg), token(bg), scale)).toBeGreaterThanOrEqual(4.5);
  });
});
