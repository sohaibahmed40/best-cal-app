import type { Action } from '../calculator';

export function keyToAction(key: string): Action | null {
  if (/^[0-9]$/.test(key)) return { type: 'digit', value: key };
  switch (key) {
    case '.':
      return { type: 'decimal' };
    case '+':
    case '-':
    case '*':
    case '/':
    case '^':
      return { type: 'operator', value: key };
    case 'Enter':
    case '=':
      return { type: 'equals' };
    case 'Backspace':
      return { type: 'backspace' };
    case 'Escape':
      return { type: 'clearAll' };
    case 'Delete':
      return { type: 'clearEntry' };
    case '%':
      return { type: 'percent' };
    case '!':
      return { type: 'unary', value: 'factorial' };
    default:
      return null;
  }
}
