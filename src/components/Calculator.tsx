import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { type Action, createState, formatExpression, reducer } from '../calculator';
import { keyToAction } from './keyboard';
import { BASIC_KEYS, findKeyForAction, type Key, KEYS, SCIENTIFIC_KEYS } from './keys';
import './Calculator.css';

type FxGroup = 'digit' | 'op' | 'fn' | 'equals';
type Mode = 'basic' | 'scientific';

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
    // The scientific keys share the fn plate colour, so they share its kanji too.
    case 'unary':
    case 'constant':
    case 'toggleAngleUnit':
    case 'memoryStore':
    case 'memoryRecall':
    case 'memoryClear':
      return 'fn';
    case 'equals':
      return 'equals';
    default:
      return 'digit';
  }
}

export default function Calculator() {
  const [state, dispatch] = useReducer(reducer, undefined, createState);
  // Component state, not reducer state: switching mode never touches the calculation or memory.
  const [mode, setMode] = useState<Mode>('basic');
  const visibleKeys = mode === 'scientific' ? KEYS : BASIC_KEYS;
  // Read by the key listeners, so they are not re-attached on every switch.
  const visibleKeysRef = useRef(visibleKeys);
  visibleKeysRef.current = visibleKeys;
  // Buttons held down from the keyboard: event.code → button ariaLabel.
  const [pressed, setPressed] = useState<ReadonlyMap<string, string>>(() => new Map());
  // Bumping `count` remounts the effects layer so its CSS animations replay on every press.
  const [fx, setFx] = useState<{ count: number; group: FxGroup | null }>({ count: 0, group: null });

  const press = useCallback((action: Action) => {
    dispatch(action);
    setFx((prev) => ({ count: prev.count + 1, group: fxGroup(action) }));
  }, []);

  useEffect(() => {
    const clearPressed = () => setPressed((m) => (m.size === 0 ? m : new Map()));

    function onKeyDown(event: KeyboardEvent) {
      // macOS sends no keyup for keys released while Cmd is held, so drop every highlight.
      if (event.key === 'Meta' || event.metaKey) clearPressed();
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const action = keyToAction(event.key);
      if (!action) return;
      // The keyboard only does what an on-screen button can: ^ and ! do nothing in Basic mode.
      const key = findKeyForAction(action, visibleKeysRef.current);
      if (!key) return;
      // "/" opens quick-find in Firefox, and Enter would also click a focused button.
      if (event.key === '/' || event.key === 'Enter') event.preventDefault();
      press(action);
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
  }, [press]);

  const expr = formatExpression(state);
  const kanji = fx.group ? FX_KANJI[fx.group] : null;
  const modifiers = [
    state.operator !== null && state.waitingForOperand && 'is-pending',
    state.lastExpression !== null && 'is-result',
    state.error && 'is-error',
    mode === 'scientific' && 'is-scientific',
  ].filter(Boolean);

  const pressedLabels = new Set(pressed.values());

  function renderKey(key: Key) {
    const isPressed = pressedLabels.has(key.ariaLabel);
    const base = key.className ? `key ${key.className}` : 'key';
    return (
      <button
        key={key.ariaLabel}
        type="button"
        className={isPressed ? `${base} key-pressed` : base}
        aria-label={key.ariaLabel}
        data-pressed={isPressed ? 'true' : undefined}
        onClick={() => press(key.action)}
      >
        {key.label}
      </button>
    );
  }

  return (
    <section className={['calculator', ...modifiers].join(' ')} aria-label="Calculator">
      <div className="topbar">
        <button
          type="button"
          className="mode-switch"
          role="switch"
          aria-checked={mode === 'scientific'}
          aria-label="scientific mode"
          onClick={() => setMode((m) => (m === 'basic' ? 'scientific' : 'basic'))}
        >
          <span className={mode === 'basic' ? 'mode-seg is-on' : 'mode-seg'}>BASIC</span>
          <span className={mode === 'scientific' ? 'mode-seg is-on' : 'mode-seg'}>SCI</span>
        </button>
        <span className="topbar-spacer" />
        {state.memory !== null && (
          <span className="memory-indicator" data-testid="memory-indicator" title="A number is stored in memory">
            M
          </span>
        )}
        {mode === 'scientific' && (
          <span className="angle-unit" data-testid="angle-unit">
            {state.angleUnit.toUpperCase()}
          </span>
        )}
      </div>
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
      <div className="keypad">
        {mode === 'scientific' && <div className="keys-sci">{SCIENTIFIC_KEYS.map(renderKey)}</div>}
        <div className="keys">{BASIC_KEYS.map(renderKey)}</div>
      </div>
    </section>
  );
}
