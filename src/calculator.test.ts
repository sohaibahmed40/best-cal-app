import { describe, expect, it } from 'vitest';
import { type Action, type Op, type State, createState, formatNumber, reducer } from './calculator';

// Short-hand: '7' digit, '.' decimal, '+-*/' operators, '=' equals, 'AC', 'CE', '<' backspace, '±', '%'.
function toAction(token: string): Action {
  if (/^\d$/.test(token)) return { type: 'digit', value: token };
  switch (token) {
    case '.':
      return { type: 'decimal' };
    case '+':
    case '-':
    case '*':
    case '/':
      return { type: 'operator', value: token as Op };
    case '=':
      return { type: 'equals' };
    case 'AC':
      return { type: 'clearAll' };
    case 'CE':
      return { type: 'clearEntry' };
    case '<':
      return { type: 'backspace' };
    case '±':
      return { type: 'toggleSign' };
    case '%':
      return { type: 'percent' };
  }
  throw new Error(`unknown token ${token}`);
}

function fold(tokens: string[]): State {
  return tokens.map(toAction).reduce(reducer, createState());
}

/** Runs space-separated tokens from a fresh state and returns the display. */
function run(sequence: string): string {
  return fold(sequence.split(' ')).display;
}

/** Display after each token, for checking intermediate values. */
function displays(sequence: string): string[] {
  const tokens = sequence.split(' ');
  return tokens.map((_, i) => fold(tokens.slice(0, i + 1)).display);
}

describe('1. arithmetic', () => {
  it.each([
    ['7 + 5 =', '12'],
    ['9 - 1 2 =', '-3'],
    ['6 * 7 =', '42'],
    ['8 / 2 =', '4'],
  ])('%s shows %s', (seq, expected) => {
    expect(run(seq)).toBe(expected);
  });
});

describe('2. decimals and float display', () => {
  it('0.1+0.2= shows 0.3', () => {
    expect(run('0 . 1 + 0 . 2 =')).toBe('0.3');
  });

  it('ignores a second decimal point in the same number', () => {
    expect(run('1 . 2 . 3')).toBe('1.23');
  });

  it('drops leading zeros', () => {
    expect(run('0 0 7')).toBe('7');
  });

  it('starts a new number with 0. when . is pressed first', () => {
    expect(run('5 + . 5 =')).toBe('5.5');
  });

  it('formats very large and very small numbers', () => {
    expect(formatNumber(1e12)).toBe('1e+12');
    expect(formatNumber(1e-10)).toBe('1e-10');
    expect(formatNumber(1.23e-7)).toBe('0.000000123');
    expect(formatNumber(1 / 3)).toBe('0.333333333333');
    expect(formatNumber(-0)).toBe('0');
  });
});

describe('3. chaining and repeat-equals', () => {
  it('evaluates left to right: 2+3×4= shows 20', () => {
    expect(run('2 + 3 * 4 =')).toBe('20');
  });

  it('shows the running total when the next operator is pressed', () => {
    expect(run('2 + 3 *')).toBe('5');
  });

  it('repeats the last operation on repeated =', () => {
    expect(displays('5 + 2 = = =').slice(-3)).toEqual(['7', '9', '11']);
  });

  it('a second operator replaces the first', () => {
    expect(run('5 + * 2 =')).toBe('10');
  });

  it('continues from a result with a new operator', () => {
    expect(run('2 + 3 = * 4 =')).toBe('20');
  });

  it('a digit after = starts a new number', () => {
    expect(run('2 + 3 = 4')).toBe('4');
  });
});

describe('4. divide by zero', () => {
  it('5÷0= shows Error', () => {
    expect(run('5 / 0 =')).toBe('Error');
  });

  it('the next digit starts a fresh calculation', () => {
    expect(run('5 / 0 = 3')).toBe('3');
    expect(run('5 / 0 = 3 + 4 =')).toBe('7');
  });

  it('ignores everything except digits and AC while in error', () => {
    for (const key of ['+', '=', '.', 'CE', '<', '±', '%']) {
      expect(run(`5 / 0 = ${key}`)).toBe('Error');
    }
    expect(fold('5 / 0 = AC'.split(' '))).toEqual(createState());
  });

  it('shows Error when a chained operator divides by zero', () => {
    expect(run('5 / 0 +')).toBe('Error');
  });
});

describe('5. AC, CE and backspace', () => {
  it('CE clears only the current entry: 12+34 CE 5 = shows 17', () => {
    expect(run('1 2 + 3 4 CE 5 =')).toBe('17');
  });

  it('AC returns the initial state after any sequence', () => {
    expect(fold('1 2 + 3 4 = = * 5 . 2 AC'.split(' '))).toEqual(createState());
    expect(fold('9 % ± AC'.split(' '))).toEqual(createState());
  });

  it('backspace removes one digit', () => {
    expect(run('1 2 <')).toBe('1');
  });

  it('backspace leaves 0 at most', () => {
    expect(run('1 <')).toBe('0');
    expect(run('1 < <')).toBe('0');
    expect(run('5 ± <')).toBe('0');
  });

  it('backspace does not edit a result', () => {
    expect(run('1 2 + 3 = <')).toBe('15');
  });
});

describe('6. sign and percent', () => {
  it('5 ± shows -5, and ± again shows 5', () => {
    expect(run('5 ±')).toBe('-5');
    expect(run('5 ± ±')).toBe('5');
  });

  it('± leaves 0 alone', () => {
    expect(run('±')).toBe('0');
  });

  it('negating after an operator makes the shown value the operand', () => {
    expect(run('5 + ± =')).toBe('0');
  });

  it('50% shows 0.5', () => {
    expect(run('5 0 %')).toBe('0.5');
  });

  it('200+10%= shows 220', () => {
    expect(run('2 0 0 + 1 0 %')).toBe('20');
    expect(run('2 0 0 + 1 0 % =')).toBe('220');
  });

  it('200-10%= shows 180', () => {
    expect(run('2 0 0 - 1 0 % =')).toBe('180');
  });

  it('50×10%= shows 5', () => {
    expect(run('5 0 * 1 0 % =')).toBe('5');
  });

  it('an operator after % uses the percent value', () => {
    expect(run('2 0 0 + 1 0 % *')).toBe('220');
  });

  it('a digit after % starts a new number', () => {
    expect(run('5 0 % 3')).toBe('3');
  });
});
