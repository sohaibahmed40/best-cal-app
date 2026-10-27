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
  const history = () => screen.getByTestId('expression-history');
  const click = (name: string) => user.click(screen.getByRole('button', { name }));
  return { user, display, history, click, ...utils };
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
    expect(keyToAction('a')).toBeNull();
  });
});

describe('9. expression display', () => {
  it('typing 20+20 shows the full expression', async () => {
    const { user, display } = setup();
    await user.keyboard('20+20');
    expect(display()).toHaveTextContent(/^20 \+ 20$/);
  });

  it('clicking 2 0 + 2 0 shows the full expression', async () => {
    const { display, click } = setup();
    for (const name of ['2', '0', 'add', '2', '0']) await click(name);
    expect(display()).toHaveTextContent(/^20 \+ 20$/);
  });

  it('shows the operator as soon as it is pressed', async () => {
    const { display, click } = setup();
    for (const name of ['2', '0', 'subtract']) await click(name);
    expect(display()).toHaveTextContent(/^20 −$/);
  });

  it('after equals shows the expression above the result until the next key', async () => {
    const { display, history, click } = setup();
    for (const name of ['2', '0', 'add', '2', '0', 'equals']) await click(name);
    expect(display()).toHaveTextContent(/^40$/);
    expect(history()).toHaveTextContent(/^20 \+ 20 =$/);
    await click('3');
    expect(history()).toHaveTextContent(/^$/);
    expect(display()).toHaveTextContent(/^3$/);
  });

  it('repeat equals shows the repeated step', async () => {
    const { history, click } = setup();
    for (const name of ['5', 'add', '2', 'equals', 'equals']) await click(name);
    expect(history()).toHaveTextContent(/^7 \+ 2 =$/);
  });

  it('5 = and divide by zero leave the history empty', async () => {
    const { display, history, click } = setup();
    for (const name of ['5', 'equals']) await click(name);
    expect(history()).toHaveTextContent(/^$/);
    for (const name of ['divide', '0', 'equals']) await click(name);
    expect(display()).toHaveTextContent(/^Error$/);
    expect(history()).toHaveTextContent(/^$/);
  });

  it('long expressions get the smaller font', async () => {
    const { user, display } = setup();
    await user.keyboard('123456789*98765');
    expect(display()).toHaveClass('display-main-long');
  });
});

describe('10. battle HUD effects', () => {
  // The effects layer is aria-hidden decoration, so it is found by class, not by role.
  function setupFx() {
    const utils = setup();
    const calculator = () => screen.getByRole('region', { name: 'Calculator' });
    const fx = (selector: string) => utils.container.querySelector(`.fx ${selector}`);
    return { ...utils, calculator, fx };
  }

  it('is-pending is set while an operator waits for its operand and cleared by the next digit', async () => {
    const { calculator, click } = setupFx();
    await click('2');
    expect(calculator()).not.toHaveClass('is-pending');
    await click('add');
    expect(calculator()).toHaveClass('is-pending');
    await click('3');
    expect(calculator()).not.toHaveClass('is-pending');
  });

  it('is-result and the FINISH stamp show after equals and clear on the next key', async () => {
    const { calculator, fx, click } = setupFx();
    for (const name of ['2', 'add', '3']) await click(name);
    expect(fx('.fx-finish')).toBeNull();
    await click('equals');
    expect(calculator()).toHaveClass('is-result');
    expect(fx('.fx-finish')).toHaveTextContent('決着 FINISH');
    await click('4');
    expect(calculator()).not.toHaveClass('is-result');
    expect(fx('.fx-finish')).toBeNull();
  });

  it('is-error and the SYSTEM BREAK banner show on divide by zero and clear on AC', async () => {
    const { calculator, fx, click } = setupFx();
    for (const name of ['5', 'divide', '0', 'equals']) await click(name);
    expect(calculator()).toHaveClass('is-error');
    expect(calculator()).not.toHaveClass('is-result');
    expect(fx('.fx-break')).toHaveTextContent('限界突破 SYSTEM BREAK');
    await click('all clear');
    expect(calculator()).not.toHaveClass('is-error');
    expect(fx('.fx-break')).toBeNull();
  });

  it('flashes the kanji for each key group, and none for equals', async () => {
    const { fx, click } = setupFx();
    expect(fx('.fx-kanji')).toBeNull();
    await click('7');
    expect(fx('.fx-kanji-digit')).toHaveTextContent('撃');
    await click('multiply');
    expect(fx('.fx-kanji-op')).toHaveTextContent('斬');
    await click('backspace');
    expect(fx('.fx-kanji-fn')).toHaveTextContent('消');
    await click('equals');
    expect(fx('.fx-kanji')).toBeNull();
    expect(fx('.fx-slash')).toBeNull();
  });

  it('remounts the effects layer on every press, including keyboard input', async () => {
    const { user, container } = setupFx();
    const before = container.querySelector('.fx');
    await user.keyboard('1');
    const afterFirst = container.querySelector('.fx');
    expect(afterFirst).not.toBe(before);
    await user.keyboard('1');
    expect(container.querySelector('.fx')).not.toBe(afterFirst);
  });

  it('keeps the effects text out of the display and accessibility tree', async () => {
    const { display, container, click } = setupFx();
    for (const name of ['5', 'divide', '0', 'equals']) await click(name);
    expect(display()).toHaveTextContent(/^Error$/);
    expect(container.querySelector('.fx')).toHaveAttribute('aria-hidden', 'true');
  });
});
