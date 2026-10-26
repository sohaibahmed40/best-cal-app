// Pure pocket-calculator logic. No React here: every function takes a state
// and returns a new one, so the component and the tests share one reducer.

export type Op = '+' | '-' | '*' | '/';

/** Display glyphs for each operator, shared by the keys and the expression line. */
export const OP_SYMBOLS: Record<Op, string> = { '+': '+', '-': '−', '*': '×', '/': '÷' };

export type State = {
  display: string;
  accumulator: number | null;
  operator: Op | null;
  /** The next digit starts a new number, and a second operator replaces the pending one. */
  waitingForOperand: boolean;
  /** The next digit starts a new number, but the display already counts as the operand (after % or ±). */
  overwrite: boolean;
  lastOperand: number | null;
  lastOperator: Op | null;
  error: boolean;
  /** Shown above the result after `=`; cleared by the next action. */
  lastExpression: string | null;
};

export type Action =
  | { type: 'digit'; value: string }
  | { type: 'decimal' }
  | { type: 'operator'; value: Op }
  | { type: 'equals' }
  | { type: 'clearAll' }
  | { type: 'clearEntry' }
  | { type: 'backspace' }
  | { type: 'toggleSign' }
  | { type: 'percent' };

const MAX_DIGITS = 15;

export function createState(): State {
  return {
    display: '0',
    accumulator: null,
    operator: null,
    waitingForOperand: false,
    overwrite: false,
    lastOperand: null,
    lastOperator: null,
    error: false,
    lastExpression: null,
  };
}

function errorState(): State {
  return { ...createState(), display: 'Error', error: true };
}

/** Returns null when the result is not a finite number (division by zero or overflow). */
export function compute(a: number, op: Op, b: number): number | null {
  let result: number;
  switch (op) {
    case '+':
      result = a + b;
      break;
    case '-':
      result = a - b;
      break;
    case '*':
      result = a * b;
      break;
    case '/':
      if (b === 0) return null;
      result = a / b;
      break;
  }
  return Number.isFinite(result) ? result : null;
}

// String(n) switches to exponents below 1e-6; write those out in full.
function toPlain(n: number): string {
  const s = String(n);
  if (!s.includes('e')) return s;
  const [mantissa, exp] = s.split('e');
  const sign = mantissa.startsWith('-') ? '-' : '';
  const digits = mantissa.replace('-', '').replace('.', '');
  return `${sign}0.${'0'.repeat(-Number(exp) - 1)}${digits}`;
}

export function formatNumber(n: number): string {
  const rounded = Number(n.toPrecision(12));
  if (rounded === 0) return '0';
  const abs = Math.abs(rounded);
  if (abs >= 1e12 || abs < 1e-9) return rounded.toExponential();
  return toPlain(rounded);
}

function withResult(state: State, result: number | null, patch: Partial<State>): State {
  if (result === null) return errorState();
  return { ...state, ...patch, display: formatNumber(result), overwrite: false };
}

function startsNewNumber(state: State): boolean {
  return state.waitingForOperand || state.overwrite;
}

export function inputDigit(state: State, digit: string): State {
  if (state.error) return { ...createState(), display: digit };
  if (startsNewNumber(state)) {
    return { ...state, display: digit, waitingForOperand: false, overwrite: false };
  }
  if (state.display.replace(/[-.]/g, '').length >= MAX_DIGITS) return { ...state };
  const display = state.display === '0' ? digit : state.display === '-0' ? `-${digit}` : state.display + digit;
  return { ...state, display };
}

export function inputDecimal(state: State): State {
  if (state.error) return { ...state };
  if (startsNewNumber(state)) {
    return { ...state, display: '0.', waitingForOperand: false, overwrite: false };
  }
  if (state.display.includes('.')) return { ...state };
  return { ...state, display: state.display + '.' };
}

export function setOperator(state: State, op: Op): State {
  if (state.error) return { ...state };
  if (state.operator !== null && state.waitingForOperand) {
    return { ...state, operator: op };
  }
  const input = parseFloat(state.display);
  const patch = { operator: op, waitingForOperand: true };
  if (state.accumulator === null || state.operator === null) {
    return withResult(state, input, { ...patch, accumulator: input });
  }
  const result = compute(state.accumulator, state.operator, input);
  return withResult(state, result, { ...patch, accumulator: result });
}

export function equals(state: State): State {
  if (state.error) return { ...state };
  const input = parseFloat(state.display);
  const done = { accumulator: null, operator: null, waitingForOperand: true };
  if (state.operator !== null && state.accumulator !== null) {
    return withResult(state, compute(state.accumulator, state.operator, input), {
      ...done,
      lastOperator: state.operator,
      lastOperand: input,
      lastExpression: `${formatNumber(state.accumulator)} ${OP_SYMBOLS[state.operator]} ${formatNumber(input)} =`,
    });
  }
  if (state.lastOperator !== null && state.lastOperand !== null) {
    return withResult(state, compute(input, state.lastOperator, state.lastOperand), {
      ...done,
      lastExpression: `${formatNumber(input)} ${OP_SYMBOLS[state.lastOperator]} ${formatNumber(state.lastOperand)} =`,
    });
  }
  // Set explicitly: withResult spreads the old state, which may hold a stale expression.
  return withResult(state, input, { ...done, lastExpression: null });
}

export function clearAll(): State {
  return createState();
}

export function clearEntry(state: State): State {
  if (state.error) return { ...state };
  return { ...state, display: '0', waitingForOperand: false, overwrite: false };
}

export function backspace(state: State): State {
  if (state.error || startsNewNumber(state)) return { ...state };
  const trimmed = state.display.slice(0, -1);
  const display = trimmed === '' || trimmed === '-' || trimmed === '-0' ? '0' : trimmed;
  return { ...state, display };
}

export function toggleSign(state: State): State {
  if (state.error || parseFloat(state.display) === 0) return { ...state };
  const display = state.display.startsWith('-') ? state.display.slice(1) : `-${state.display}`;
  // Negating the shown value after an operator makes it the operand.
  if (state.operator !== null && state.waitingForOperand) {
    return { ...state, display, waitingForOperand: false, overwrite: true };
  }
  return { ...state, display };
}

export function percent(state: State): State {
  if (state.error) return { ...state };
  const x = parseFloat(state.display);
  const additive = (state.operator === '+' || state.operator === '-') && state.accumulator !== null;
  const result = additive ? (state.accumulator! * x) / 100 : x / 100;
  return { ...withResult(state, result, { waitingForOperand: false }), overwrite: true };
}

function apply(state: State, action: Action): State {
  switch (action.type) {
    case 'digit':
      return inputDigit(state, action.value);
    case 'decimal':
      return inputDecimal(state);
    case 'operator':
      return setOperator(state, action.value);
    case 'equals':
      return equals(state);
    case 'clearAll':
      return clearAll();
    case 'clearEntry':
      return clearEntry(state);
    case 'backspace':
      return backspace(state);
    case 'toggleSign':
      return toggleSign(state);
    case 'percent':
      return percent(state);
  }
}

export function reducer(state: State, action: Action): State {
  const next = apply(state, action);
  return action.type === 'equals' ? next : { ...next, lastExpression: null };
}

/** The calculation being entered, e.g. `20 +` then `20 + 20`. */
export function formatExpression(state: State): string {
  if (state.error) return state.display;
  if (state.operator !== null && state.accumulator !== null) {
    const head = `${formatNumber(state.accumulator)} ${OP_SYMBOLS[state.operator]}`;
    // The raw display keeps a trailing '.' visible while typing.
    return state.waitingForOperand ? head : `${head} ${state.display}`;
  }
  return state.display;
}
