import { type Action, type Op, OP_SYMBOLS, type UnaryFn } from '../calculator';

export type Key = {
  label: string;
  action: Action;
  ariaLabel: string;
  className?: string;
};

const digit = (value: string): Key => ({
  label: value,
  action: { type: 'digit', value },
  ariaLabel: value,
  className: 'key-digit',
});

const op = (value: Op, ariaLabel: string): Key => ({
  label: OP_SYMBOLS[value],
  action: { type: 'operator', value },
  ariaLabel,
  className: 'key-op',
});

const sci = (label: string, value: UnaryFn, ariaLabel: string): Key => ({
  label,
  action: { type: 'unary', value },
  ariaLabel,
  className: 'key-fn key-sci',
});

// Laid out row by row for a 4-column grid.
export const KEYS: Key[] = [
  { label: 'DEG/RAD', action: { type: 'toggleAngleUnit' }, ariaLabel: 'angle unit', className: 'key-fn key-sci' },
  { label: 'π', action: { type: 'constant', value: 'pi' }, ariaLabel: 'pi', className: 'key-fn key-sci' },
  { label: 'e', action: { type: 'constant', value: 'e' }, ariaLabel: "euler's number", className: 'key-fn key-sci' },
  sci('n!', 'factorial', 'factorial'),

  sci('sin', 'sin', 'sine'),
  sci('cos', 'cos', 'cosine'),
  sci('tan', 'tan', 'tangent'),
  sci('√', 'sqrt', 'square root'),

  sci('ln', 'ln', 'natural log'),
  sci('log', 'log', 'log base 10'),
  sci('x²', 'square', 'square'),
  sci('1/x', 'reciprocal', 'reciprocal'),

  { label: 'AC', action: { type: 'clearAll' }, ariaLabel: 'all clear', className: 'key-fn' },
  { label: 'CE', action: { type: 'clearEntry' }, ariaLabel: 'clear entry', className: 'key-fn' },
  { label: '⌫', action: { type: 'backspace' }, ariaLabel: 'backspace', className: 'key-fn' },
  op('/', 'divide'),

  digit('7'),
  digit('8'),
  digit('9'),
  op('*', 'multiply'),

  digit('4'),
  digit('5'),
  digit('6'),
  op('-', 'subtract'),

  digit('1'),
  digit('2'),
  digit('3'),
  op('+', 'add'),

  { label: '±', action: { type: 'toggleSign' }, ariaLabel: 'toggle sign', className: 'key-digit' },
  digit('0'),
  { label: '.', action: { type: 'decimal' }, ariaLabel: 'decimal point', className: 'key-digit' },
  { label: '=', action: { type: 'equals' }, ariaLabel: 'equals', className: 'key-equals' },

  { label: '%', action: { type: 'percent' }, ariaLabel: 'percent', className: 'key-fn key-wide' },
];

// The on-screen button that performs `action`, if any.
export function findKeyForAction(action: Action): Key | undefined {
  return KEYS.find(
    (key) =>
      key.action.type === action.type &&
      (!('value' in action) || ('value' in key.action && key.action.value === action.value)),
  );
}
