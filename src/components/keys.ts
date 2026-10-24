import type { Action } from '../calculator';

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

// Laid out row by row for a 4-column grid.
export const KEYS: Key[] = [
  { label: 'AC', action: { type: 'clearAll' }, ariaLabel: 'all clear', className: 'key-fn' },
  { label: 'CE', action: { type: 'clearEntry' }, ariaLabel: 'clear entry', className: 'key-fn' },
  { label: '⌫', action: { type: 'backspace' }, ariaLabel: 'backspace', className: 'key-fn' },
  { label: '÷', action: { type: 'operator', value: '/' }, ariaLabel: 'divide', className: 'key-op' },

  digit('7'),
  digit('8'),
  digit('9'),
  { label: '×', action: { type: 'operator', value: '*' }, ariaLabel: 'multiply', className: 'key-op' },

  digit('4'),
  digit('5'),
  digit('6'),
  { label: '−', action: { type: 'operator', value: '-' }, ariaLabel: 'subtract', className: 'key-op' },

  digit('1'),
  digit('2'),
  digit('3'),
  { label: '+', action: { type: 'operator', value: '+' }, ariaLabel: 'add', className: 'key-op' },

  { label: '±', action: { type: 'toggleSign' }, ariaLabel: 'toggle sign', className: 'key-digit' },
  digit('0'),
  { label: '.', action: { type: 'decimal' }, ariaLabel: 'decimal point', className: 'key-digit' },
  { label: '=', action: { type: 'equals' }, ariaLabel: 'equals', className: 'key-equals' },

  { label: '%', action: { type: 'percent' }, ariaLabel: 'percent', className: 'key-fn key-wide' },
];
