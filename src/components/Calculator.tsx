import { useCallback, useEffect, useReducer, useState } from 'react';
import { type Action, createState, formatExpression, reducer } from '../calculator';
import { keyToAction } from './keyboard';
import { KEYS } from './keys';
import './Calculator.css';

type FxGroup = 'digit' | 'op' | 'fn' | 'equals';

// The kanji flashed on a key press. Equals has none: the FINISH frame plays instead.
const FX_KANJI: Record<FxGroup, string | null> = { digit: '撃', op: '斬', fn: '消', equals: null };

function fxGroup(action: Action): FxGroup {
  switch (action.type) {
    case 'operator':
    case 'percent':
      return 'op';
    case 'clearAll':
    case 'clearEntry':
    case 'backspace':
      return 'fn';
    case 'equals':
      return 'equals';
    default:
      return 'digit';
  }
}

export default function Calculator() {
  const [state, dispatch] = useReducer(reducer, undefined, createState);
  // Bumping `count` remounts the effects layer so its CSS animations replay on every press.
  const [fx, setFx] = useState<{ count: number; group: FxGroup | null }>({ count: 0, group: null });

  const press = useCallback((action: Action) => {
    dispatch(action);
    setFx((prev) => ({ count: prev.count + 1, group: fxGroup(action) }));
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const action = keyToAction(event.key);
      if (!action) return;
      // "/" opens quick-find in Firefox, and Enter would also click a focused button.
      if (event.key === '/' || event.key === 'Enter') event.preventDefault();
      press(action);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [press]);

  const expr = formatExpression(state);
  const kanji = fx.group ? FX_KANJI[fx.group] : null;
  const modifiers = [
    state.operator !== null && state.waitingForOperand && 'is-pending',
    state.lastExpression !== null && 'is-result',
    state.error && 'is-error',
  ].filter(Boolean);

  return (
    <section className={['calculator', ...modifiers].join(' ')} aria-label="Calculator">
      <span className="angle-unit" data-testid="angle-unit">
        {state.angleUnit.toUpperCase()}
      </span>
      <div className="display">
        {/* No aria-live here: the main line already announces the calculation. */}
        <div className="display-history" data-testid="expression-history">
          {state.lastExpression ?? ''}
        </div>
        <output
          className={expr.length > 12 ? 'display-main display-main-long' : 'display-main'}
          aria-live="polite"
          data-testid="display"
        >
          {expr}
        </output>
      </div>
      {/* Decoration only, kept outside the <output> so the display text stays exact. */}
      <div className="fx" aria-hidden="true" key={fx.count}>
        {kanji && (
          <>
            <span className={`fx-slash fx-slash-${fx.group}`} />
            <span className={`fx-kanji fx-kanji-${fx.group}`}>{kanji}</span>
          </>
        )}
        {state.lastExpression !== null && (
          <div className="fx-finish">
            <span className="fx-finish-text">決着 FINISH</span>
          </div>
        )}
        {state.error && (
          <div className="fx-break">
            <span className="fx-break-text">限界突破 SYSTEM BREAK</span>
          </div>
        )}
      </div>
      <div className="keys">
        {KEYS.map((key) => (
          <button
            key={key.ariaLabel}
            type="button"
            className={key.className ? `key ${key.className}` : 'key'}
            aria-label={key.ariaLabel}
            onClick={() => press(key.action)}
          >
            {key.label}
          </button>
        ))}
      </div>
    </section>
  );
}
