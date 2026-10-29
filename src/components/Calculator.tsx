import { useEffect, useReducer, useState } from 'react';
import { createState, reducer } from '../calculator';
import { keyToAction } from './keyboard';
import { findKeyForAction, KEYS } from './keys';
import './Calculator.css';

export default function Calculator() {
  const [state, dispatch] = useReducer(reducer, undefined, createState);
  // Buttons held down from the keyboard: event.code → button ariaLabel.
  const [pressed, setPressed] = useState<ReadonlyMap<string, string>>(() => new Map());

  useEffect(() => {
    const clearPressed = () => setPressed((m) => (m.size === 0 ? m : new Map()));

    function onKeyDown(event: KeyboardEvent) {
      // macOS sends no keyup for keys released while Cmd is held, so drop every highlight.
      if (event.key === 'Meta' || event.metaKey) clearPressed();
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const action = keyToAction(event.key);
      if (!action) return;
      // "/" opens quick-find in Firefox, and Enter would also click a focused button.
      if (event.key === '/' || event.key === 'Enter') event.preventDefault();
      dispatch(action);
      const key = findKeyForAction(action);
      if (!key) return;
      const { code } = event;
      setPressed((m) => {
        if (m.get(code) === key.ariaLabel) return m;
        const next = new Map(m);
        next.set(code, key.ariaLabel);
        return next;
      });
    }

    // Keyed by code, not key: releasing Shift before 8 makes the keyup report "8" rather than "*".
    function onKeyUp(event: KeyboardEvent) {
      if (event.key === 'Meta') return clearPressed();
      const { code } = event;
      setPressed((m) => {
        if (!m.has(code)) return m;
        const next = new Map(m);
        next.delete(code);
        return next;
      });
    }

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', clearPressed);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', clearPressed);
    };
  }, []);

  const pressedLabels = new Set(pressed.values());

  return (
    <section className="calculator" aria-label="Calculator">
      <span className="angle-unit" data-testid="angle-unit">
        {state.angleUnit.toUpperCase()}
      </span>
      <output className="display" aria-live="polite" data-testid="display">
        {state.display}
      </output>
      <div className="keys">
        {KEYS.map((key) => {
          const isPressed = pressedLabels.has(key.ariaLabel);
          const base = key.className ? `key ${key.className}` : 'key';
          return (
            <button
              key={key.ariaLabel}
              type="button"
              className={isPressed ? `${base} key-pressed` : base}
              aria-label={key.ariaLabel}
              data-pressed={isPressed ? 'true' : undefined}
              onClick={() => dispatch(key.action)}
            >
              {key.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}
