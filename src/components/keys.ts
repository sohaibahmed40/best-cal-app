import { type Action, type Op, OP_SYMBOLS, type UnaryFn } from '../calculator';

export type KeyGroup = 'basic' | 'memory' | 'scientific';

export type Key = {
  label: string;
  action: Action;
  ariaLabel: string;
  className?: string;
  group: KeyGroup;
};

const digit = (value: string): Key => ({
  label: value,
  action: { type: 'digit', value },
  ariaLabel: value,
  className: 'key-digit',
  group: 'basic',
});

const op = (value: Op, ariaLabel: string): Key => ({
  label: OP_SYMBOLS[value],
  action: { type: 'operator', value },
  ariaLabel,
  className: 'key-op',
  group: 'basic',
});

const fn = (label: string, action: Action, ariaLabel: string): Key => ({
  label,
  action,
  ariaLabel,
  className: 'key-fn',
  group: 'basic',
});

const sci = (label: string, value: UnaryFn, ariaLabel: string): Key => ({
  label,
  action: { type: 'unary', value },
  ariaLabel,
  className: 'key-fn key-sci',
  group: 'scientific',
});

// Store, recall and clear only: no M+ or M−.
const mem = (label: string, action: Action, ariaLabel: string): Key => ({
  label,
  action,
  ariaLabel,
  className: 'key-fn key-mem',
  group: 'memory',
});

// Shown only in Scientific mode. Laid out row by row for a 4-column grid.
export const SCIENTIFIC_KEYS: Key[] = [
  { label: 'DEG/RAD', action: { type: 'toggleAngleUnit' }, ariaLabel: 'angle unit', className: 'key-fn key-sci', group: 'scientific' },
  { label: 'π', action: { type: 'constant', value: 'pi' }, ariaLabel: 'pi', className: 'key-fn key-sci', group: 'scientific' },
  { label: 'e', action: { type: 'constant', value: 'e' }, ariaLabel: "euler's number", className: 'key-fn key-sci', group: 'scientific' },
  sci('n!', 'factorial', 'factorial'),

  sci('sin', 'sin', 'sine'),
  sci('cos', 'cos', 'cosine'),
  sci('tan', 'tan', 'tangent'),
  sci('√', 'sqrt', 'square root'),

  sci('ln', 'ln', 'natural log'),
  sci('log', 'log', 'log base 10'),
  sci('x²', 'square', 'square'),
  { ...op('^', 'power'), label: 'xʸ', className: 'key-op key-sci', group: 'scientific' },

  sci('1/x', 'reciprocal', 'reciprocal'),
];

// Shown in both modes. Laid out row by row for a 6-column grid.
export const BASIC_KEYS: Key[] = [
  mem('MC', { type: 'memoryClear' }, 'memory clear'),
  digit('7'),
  digit('8'),
  digit('9'),
  op('/', 'divide'),
  fn('AC', { type: 'clearAll' }, 'all clear'),

  mem('MR', { type: 'memoryRecall' }, 'memory recall'),
  digit('4'),
  digit('5'),
  digit('6'),
  op('*', 'multiply'),
  fn('CE', { type: 'clearEntry' }, 'clear entry'),

  mem('MS', { type: 'memoryStore' }, 'memory store'),
  digit('1'),
  digit('2'),
  digit('3'),
  op('-', 'subtract'),
  fn('⌫', { type: 'backspace' }, 'backspace'),

  { label: '±', action: { type: 'toggleSign' }, ariaLabel: 'toggle sign', className: 'key-digit', group: 'basic' },
  digit('0'),
  { label: '.', action: { type: 'decimal' }, ariaLabel: 'decimal point', className: 'key-digit', group: 'basic' },
  fn('%', { type: 'percent' }, 'percent'),
  op('+', 'add'),
  { label: '=', action: { type: 'equals' }, ariaLabel: 'equals', className: 'key-equals', group: 'basic' },
];

export const KEYS: Key[] = [...SCIENTIFIC_KEYS, ...BASIC_KEYS];

// The on-screen button that performs `action`, if any. Pass the keys currently shown to limit the search.
export function findKeyForAction(action: Action, keys: readonly Key[] = KEYS): Key | undefined {
  return keys.find(
    (key) =>
      key.action.type === action.type &&
      (!('value' in action) || ('value' in key.action && key.action.value === action.value)),
  );
}
