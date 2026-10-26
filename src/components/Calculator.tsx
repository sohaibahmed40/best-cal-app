import { useEffect, useReducer } from 'react';
import { createState, formatExpression, reducer } from '../calculator';
import { keyToAction } from './keyboard';
import { KEYS } from './keys';
import './Calculator.css';

export default function Calculator() {
  const [state, dispatch] = useReducer(reducer, undefined, createState);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const action = keyToAction(event.key);
      if (!action) return;
      // "/" opens quick-find in Firefox, and Enter would also click a focused button.
      if (event.key === '/' || event.key === 'Enter') event.preventDefault();
      dispatch(action);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const expr = formatExpression(state);

  return (
    <section className="calculator" aria-label="Calculator">
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
      <div className="keys">
        {KEYS.map((key) => (
          <button
            key={key.ariaLabel}
            type="button"
            className={key.className ? `key ${key.className}` : 'key'}
            aria-label={key.ariaLabel}
            onClick={() => dispatch(key.action)}
          >
            {key.label}
          </button>
        ))}
      </div>
    </section>
  );
}
