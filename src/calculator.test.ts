import { describe, expect, it } from 'vitest';
import {
  type Action,
  type Op,
  type State,
  type UnaryFn,
  createState,
  formatExpression,
  formatNumber,
  reducer,
} from './calculator';

// Short-hand: '7' digit, '.' decimal, '+-*/^' operators, '=' equals, 'AC', 'CE', '<' backspace, '±', '%',
// '√ x² 1/x sin cos tan ln log !' functions, 'π' and 'e' constants, 'RAD' toggles the angle unit,
// 'MS' 'MR' 'MC' store, recall and clear memory.
function toAction(token: string): Action {
  if (/^\d$/.test(token)) return { type: 'digit', value: token };
  switch (token) {
    case '.':
      return { type: 'decimal' };
    case '+':
    case '-':
    case '*':
    case '/':
    case '^':
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
    case 'π':
      return { type: 'constant', value: 'pi' };
    case 'e':
      return { type: 'constant', value: 'e' };
    case 'RAD':
      return { type: 'toggleAngleUnit' };
    case 'MS':
      return { type: 'memoryStore' };
    case 'MR':
      return { type: 'memoryRecall' };
    case 'MC':
      return { type: 'memoryClear' };
  }
  if (token in UNARY) return { type: 'unary', value: UNARY[token] };
  throw new Error(`unknown token ${token}`);
}

const UNARY: Record<string, UnaryFn> = {
  '√': 'sqrt',
  'x²': 'square',
  '1/x': 'reciprocal',
  sin: 'sin',
  cos: 'cos',
  tan: 'tan',
  ln: 'ln',
  log: 'log',
  '!': 'factorial',
};

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

describe('8. scientific functions', () => {
  it('√16 shows 4 and √2 shows 1.41421356237', () => {
    expect(run('1 6 √')).toBe('4');
    expect(run('2 √')).toBe('1.41421356237');
  });

  it('a function keeps the pending operator: 9 + √16 = shows 13', () => {
    expect(run('9 + 1 6 √ =')).toBe('13');
  });

  it.each([
    ['9 0 sin', '1'],
    ['0 cos', '1'],
    ['3 0 sin', '0.5'],
    ['1 8 0 sin', '0'],
    ['9 0 cos', '0'],
    ['6 0 cos', '0.5'],
    ['4 5 tan', '1'],
    ['1 8 0 tan', '0'],
  ])('DEG: %s shows %s', (seq, expected) => {
    expect(run(seq)).toBe(expected);
  });

  it.each([
    ['5 !', '120'],
    ['0 !', '1'],
    ['1 0 !', '3628800'],
  ])('factorial: %s shows %s', (seq, expected) => {
    expect(run(seq)).toBe(expected);
  });

  it('170! shows a finite exponential value', () => {
    expect(run('1 7 0 !')).toBe('7.25741561531e+306');
  });

  it.each([
    ['e ln', '1'],
    ['1 0 0 log', '2'],
    ['7 x²', '49'],
    ['4 1/x', '0.25'],
  ])('%s shows %s', (seq, expected) => {
    expect(run(seq)).toBe(expected);
  });

  it('π and e enter their values', () => {
    expect(run('π')).toBe('3.14159265359');
    expect(run('e')).toBe('2.71828182846');
    expect(run('2 * π =')).toBe('6.28318530718');
  });

  it('a digit after π starts a new number, and backspace leaves π alone', () => {
    expect(run('π 3')).toBe('3');
    expect(run('π <')).toBe('3.14159265359');
  });

  it.each(['4 ± √', '3 ± !', '2 . 5 !', '1 7 1 !', '0 ln', '5 ± log', '0 1/x', '9 0 tan'])(
    '%s shows Error',
    (seq) => {
      expect(run(seq)).toBe('Error');
    },
  );

  it('recovers from a function error like divide by zero', () => {
    expect(run('4 ± √ 7')).toBe('7');
    expect(run('4 ± √ +')).toBe('Error');
    expect(run('4 ± √ sin')).toBe('Error');
    expect(run('4 ± √ π')).toBe('3.14159265359');
  });

  it('functions are ignored after divide by zero', () => {
    for (const key of ['√', '!', 'sin', 'x²']) {
      expect(run(`5 / 0 = ${key}`)).toBe('Error');
    }
  });
});

describe('9. angle unit', () => {
  it('starts in DEG and RAD toggles it', () => {
    expect(createState().angleUnit).toBe('deg');
    expect(fold(['RAD']).angleUnit).toBe('rad');
    expect(fold(['RAD', 'RAD']).angleUnit).toBe('deg');
  });

  it.each([
    ['RAD π sin', '0'],
    ['RAD π cos', '-1'],
    ['RAD 0 cos', '1'],
  ])('%s shows %s', (seq, expected) => {
    expect(run(seq)).toBe(expected);
  });

  it('survives AC and Error', () => {
    expect(fold('RAD AC'.split(' ')).angleUnit).toBe('rad');
    expect(fold('RAD 1 / 0 ='.split(' ')).angleUnit).toBe('rad');
    expect(run('RAD 1 / 0 = 9 0 sin')).toBe('0.893996663601');
  });

  it('toggles in the error state without clearing it', () => {
    const state = fold('1 / 0 = RAD'.split(' '));
    expect(state.display).toBe('Error');
    expect(state.angleUnit).toBe('rad');
  });
});

describe('11. power', () => {
  it.each([
    ['2 ^ 3 =', '8'],
    ['2 ^ 0 . 5 =', '1.41421356237'],
    ['2 ^ 3 ± =', '0.125'],
    ['9 ^ 0 =', '1'],
    ['2 ^ 3 ^ 2 =', '64'],
    ['2 ^ 3 = =', '512'],
    ['1 + 2 ^ 2 =', '9'],
  ])('%s shows %s', (seq, expected) => {
    expect(run(seq)).toBe(expected);
  });

  it.each(['8 ± ^ 0 . 5 =', '1 0 ^ 4 0 0 ='])('%s shows Error', (seq) => {
    expect(run(seq)).toBe('Error');
  });

  it('shows 2 ^ 3 on the expression line and 2 ^ 3 = in the history', () => {
    expect(expressions('2 ^ 3')).toEqual(['2', '2 ^', '2 ^ 3']);
    expect(fold('2 ^ 3 ='.split(' ')).lastExpression).toBe('2 ^ 3 =');
  });
});

describe('12. memory', () => {
  it('starts empty', () => {
    expect(createState().memory).toBeNull();
  });

  it('MS stores the shown value and leaves the display alone', () => {
    const state = fold('4 2 MS'.split(' '));
    expect(state.memory).toBe(42);
    expect(state.display).toBe('42');
  });

  it('MS AC MR brings the stored value back', () => {
    expect(run('4 2 MS AC MR')).toBe('42');
    expect(fold('4 2 MS AC'.split(' ')).memory).toBe(42);
  });

  it('MR enters the value as the operand: 4 2 MS AC 8 + MR = shows 50', () => {
    expect(run('4 2 MS AC 8 + MR =')).toBe('50');
    expect(displays('4 2 MS AC MR 7')).toEqual(['4', '42', '42', '0', '42', '7']);
  });

  it('MC MR changes nothing', () => {
    expect(run('4 2 MS MC AC MR')).toBe('0');
    expect(run('7 MC MR')).toBe('7');
    expect(fold('4 2 MS MC'.split(' ')).memory).toBeNull();
  });

  it('MR with empty memory does nothing', () => {
    expect(run('9 MR')).toBe('9');
  });

  it('5 / 0 = MS stores nothing', () => {
    const state = fold('5 / 0 = MS'.split(' '));
    expect(state.display).toBe('Error');
    expect(state.memory).toBeNull();
  });

  it('memory survives Error, and MR recovers from Error', () => {
    expect(fold('6 MS 5 / 0 ='.split(' ')).memory).toBe(6);
    expect(run('6 MS 5 / 0 = MR')).toBe('6');
    expect(formatExpression(fold('6 MS 5 / 0 = MR'.split(' ')))).toBe('6');
  });

  it('stores decimals and negatives', () => {
    expect(run('2 . 5 ± MS AC MR')).toBe('-2.5');
  });
});

/** Expression line after each token. */
function expressions(sequence: string): string[] {
  const tokens = sequence.split(' ');
  return tokens.map((_, i) => formatExpression(fold(tokens.slice(0, i + 1))));
}

describe('10. expression', () => {
  it('20 + 20 builds up as it is typed', () => {
    expect(expressions('2 0 + 2 0')).toEqual(['2', '20', '20 +', '20 + 2', '20 + 20']);
  });

  it.each([
    ['2 0 +', '20 +'],
    ['5 + *', '5 ×'],
    ['2 + 3 *', '5 ×'],
    ['9 - 3', '9 − 3'],
    ['8 / 2 .', '8 ÷ 2.'],
    ['5 + ±', '5 + -5'],
    ['2 0 0 + 1 0 %', '200 + 20'],
    ['5 / 0 =', 'Error'],
    ['2 0 + 2 0 =', '40'],
    ['9 + 1 6 √', '9 + 4'],
    ['2 * π', '2 × 3.14159265359'],
    ['4 ± √', 'Error'],
  ])('%s shows %s', (seq, expected) => {
    expect(formatExpression(fold(seq.split(' ')))).toBe(expected);
  });

  it.each([
    ['2 0 + 2 0 =', '20 + 20 ='],
    ['5 + 2 = =', '7 + 2 ='],
    ['2 0 + 2 0 = 3', null],
    ['2 0 + 2 0 = +', null],
    ['5 =', null],
    ['5 + 2 = AC 5 =', null],
    ['5 / 0 =', null],
    ['2 0 + 2 0 = √', null],
    ['2 0 + 2 0 = RAD', null],
  ])('after %s the history is %s', (seq, expected) => {
    expect(fold(seq.split(' ')).lastExpression).toBe(expected);
  });
});
