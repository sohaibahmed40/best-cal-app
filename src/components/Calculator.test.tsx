import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode } from 'react';
import Calculator from './Calculator';
import { keyToAction } from './keyboard';

// StrictMode double-mounts effects, so a leaked listener would double every key press.
function setup() {
  const user = userEvent.setup();
  const utils = render(
    <StrictMode>
      <Calculator />
    </StrictMode>,
  );
  const display = () => screen.getByTestId('display');
  const click = (name: string) => user.click(screen.getByRole('button', { name }));
  return { user, display, click, ...utils };
}

describe('7. clicks and keyboard', () => {
  it('clicking 7 + 5 = shows 12', async () => {
    const { display, click } = setup();
    for (const name of ['7', 'add', '5', 'equals']) await click(name);
    expect(display()).toHaveTextContent(/^12$/);
  });

  it('every button works by click', async () => {
    const { display, click } = setup();
    for (const name of ['9', 'divide', '3', 'multiply', '2', 'subtract', '1', 'decimal point', '5', 'equals']) {
      await click(name);
    }
    expect(display()).toHaveTextContent(/^4\.5$/);
    await click('toggle sign');
    expect(display()).toHaveTextContent(/^-4\.5$/);

    await click('all clear');
    for (const name of ['5', '0', 'percent']) await click(name);
    expect(display()).toHaveTextContent(/^0\.5$/);

    await click('all clear');
    for (const name of ['4', '6', '8', 'backspace']) await click(name);
    expect(display()).toHaveTextContent(/^46$/);
    await click('clear entry');
    expect(display()).toHaveTextContent(/^0$/);
  });

  it('typing 6*7 Enter shows 42', async () => {
    const { user, display } = setup();
    await user.keyboard('6*7{Enter}');
    expect(display()).toHaveTextContent(/^42$/);
  });

  it('Escape resets the display to 0', async () => {
    const { user, display } = setup();
    await user.keyboard('123{Escape}');
    expect(display()).toHaveTextContent(/^0$/);
  });

  it('Backspace removes the last digit', async () => {
    const { user, display } = setup();
    await user.keyboard('123{Backspace}');
    expect(display()).toHaveTextContent(/^12$/);
  });

  it('Delete, ., /, -, + and % work from the keyboard', async () => {
    const { user, display } = setup();
    await user.keyboard('12+34{Delete}5{Enter}');
    expect(display()).toHaveTextContent(/^17$/);
    await user.keyboard('{Escape}9/2-0.5{Enter}');
    expect(display()).toHaveTextContent(/^4$/);
    await user.keyboard('{Escape}200+10%{Enter}');
    expect(display()).toHaveTextContent(/^220$/);
  });

  it('removes the keydown listener on unmount', async () => {
    const add = vi.spyOn(window, 'addEventListener');
    const remove = vi.spyOn(window, 'removeEventListener');
    const { user, display, unmount } = setup();
    await user.keyboard('5');
    const output = display();
    unmount();

    const keydown = (spy: typeof add) => spy.mock.calls.filter(([type]) => type === 'keydown').map(([, fn]) => fn);
    expect(keydown(add).length).toBeGreaterThan(0);
    expect(keydown(remove)).toEqual(keydown(add));
    await expect(user.keyboard('9{Escape}')).resolves.toBeUndefined();
    expect(output).toHaveTextContent(/^5$/);
    vi.restoreAllMocks();
  });
});

describe('scientific keys', () => {
  it.each([
    [['1', '6', 'square root'], '4'],
    [['9', '0', 'sine'], '1'],
    [['0', 'cosine'], '1'],
    [['4', '5', 'tangent'], '1'],
    [['5', 'factorial'], '120'],
    [['1', '0', '0', 'log base 10'], '2'],
    [["euler's number", 'natural log'], '1'],
    [['7', 'square'], '49'],
    [['4', 'reciprocal'], '0.25'],
    [['pi'], '3.14159265359'],
    [['2', 'multiply', 'pi', 'equals'], '6.28318530718'],
  ])('clicking %j shows %s', async (names, expected) => {
    const { display, click } = setup();
    for (const name of names) await click(name);
    expect(display().textContent).toBe(expected);
  });

  it('invalid input shows Error, and a digit recovers', async () => {
    const { display, click } = setup();
    for (const name of ['4', 'toggle sign', 'square root']) await click(name);
    expect(display()).toHaveTextContent(/^Error$/);
    await click('7');
    expect(display()).toHaveTextContent(/^7$/);
    for (const name of ['3', 'toggle sign', 'factorial']) await click(name);
    expect(display()).toHaveTextContent(/^Error$/);
  });

  it('the indicator shows DEG, then RAD after clicking angle unit', async () => {
    const { display, click } = setup();
    const unit = () => screen.getByTestId('angle-unit');
    expect(unit()).toHaveTextContent(/^DEG$/);
    await click('angle unit');
    expect(unit()).toHaveTextContent(/^RAD$/);
    for (const name of ['pi', 'cosine']) await click(name);
    expect(display()).toHaveTextContent(/^-1$/);
    await click('all clear');
    expect(unit()).toHaveTextContent(/^RAD$/);
  });

  it('typing 5! shows 120', async () => {
    const { user, display } = setup();
    await user.keyboard('5!');
    expect(display()).toHaveTextContent(/^120$/);
  });
});

describe('keyToAction', () => {
  it('maps the documented keys', () => {
    expect(keyToAction('7')).toEqual({ type: 'digit', value: '7' });
    expect(keyToAction('.')).toEqual({ type: 'decimal' });
    expect(keyToAction('/')).toEqual({ type: 'operator', value: '/' });
    expect(keyToAction('Enter')).toEqual({ type: 'equals' });
    expect(keyToAction('=')).toEqual({ type: 'equals' });
    expect(keyToAction('Backspace')).toEqual({ type: 'backspace' });
    expect(keyToAction('Escape')).toEqual({ type: 'clearAll' });
    expect(keyToAction('Delete')).toEqual({ type: 'clearEntry' });
    expect(keyToAction('%')).toEqual({ type: 'percent' });
    expect(keyToAction('!')).toEqual({ type: 'unary', value: 'factorial' });
    expect(keyToAction('a')).toBeNull();
  });
});
