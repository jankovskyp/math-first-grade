'use client';

import { useState, useEffect, useRef } from 'react';
import { Delete } from 'lucide-react';

const ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
];

interface SpellingKeyboardProps {
  value: string;
  onChange: (val: string) => void;
  onSubmit: () => void;
  feedbackState: 'correct' | 'wrong' | null;
  /** When true, all interaction is blocked (e.g. during feedback animation) */
  disabled?: boolean;
}

export function SpellingKeyboard({
  value,
  onChange,
  onSubmit,
  feedbackState,
  disabled = false,
}: SpellingKeyboardProps) {
  const [hwKeyboardActive, setHwKeyboardActive] = useState(false);

  // Refs so the keydown closure always has the latest values
  const valueRef        = useRef(value);
  const onChangeRef     = useRef(onChange);
  const onSubmitRef     = useRef(onSubmit);
  const disabledRef     = useRef(disabled);
  const feedbackRef     = useRef(feedbackState);

  useEffect(() => { valueRef.current = value; },             [value]);
  useEffect(() => { onChangeRef.current = onChange; },       [onChange]);
  useEffect(() => { onSubmitRef.current = onSubmit; },       [onSubmit]);
  useEffect(() => { disabledRef.current = disabled; },       [disabled]);
  useEffect(() => { feedbackRef.current = feedbackState; },  [feedbackState]);

  // Hardware keyboard detection
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (disabledRef.current || feedbackRef.current !== null) return;

      if (/^[a-zA-Z]$/.test(e.key)) {
        setHwKeyboardActive(true);
        onChangeRef.current(valueRef.current + e.key.toUpperCase());
        e.preventDefault();
      } else if (e.key === 'Backspace') {
        setHwKeyboardActive(true);
        onChangeRef.current(valueRef.current.slice(0, -1));
        e.preventDefault();
      } else if (e.key === 'Enter') {
        if (valueRef.current.trim()) {
          onSubmitRef.current();
          e.preventDefault();
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const addLetter = (letter: string) => {
    if (disabled || feedbackState !== null) return;
    onChange(value + letter);
  };

  const removeLetter = () => {
    if (disabled) return;
    onChange(value.slice(0, -1));
  };

  const boxBase =
    feedbackState === 'correct'
      ? 'bg-green-50 border-success text-success'
      : feedbackState === 'wrong'
      ? 'bg-red-50 border-error text-error'
      : 'bg-white border-slate-200 text-board-black';

  return (
    <div className="flex flex-col items-center gap-3 w-full">

      {/* ── Typed-letter boxes ─────────────────────────────────────────── */}
      <div className="flex gap-1.5 flex-wrap justify-center min-h-[3rem] items-center px-2">
        {value.split('').map((ch, i) => (
          <div
            key={i}
            className={`w-9 h-11 sm:w-11 sm:h-13 flex items-center justify-center rounded-xl text-lg sm:text-xl font-black border-2 transition-colors ${boxBase}`}
          >
            {ch}
          </div>
        ))}
        {/* Blinking cursor */}
        {feedbackState === null && (
          <div className="w-9 h-11 sm:w-11 sm:h-13 flex items-center justify-center rounded-xl border-2 border-dashed border-class-green">
            <div
              className="w-0.5 h-5 bg-class-green"
              style={{ animation: 'blink 1s step-end infinite' }}
            />
          </div>
        )}
      </div>

      {/* ── HW keyboard banner OR on-screen QWERTY ─────────────────────── */}
      {hwKeyboardActive ? (
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-2 bg-class-green/10 border border-class-green/20 rounded-2xl px-4 py-2 text-class-green font-bold">
            <span className="text-base">⌨️</span>
            <span className="text-sm">Klávesnice detekována — piš přímo</span>
          </div>
          <button
            type="button"
            onClick={() => setHwKeyboardActive(false)}
            className="text-slate-400 text-xs font-bold underline underline-offset-2 hover:text-slate-600 transition-colors"
          >
            Zobrazit klávesnici
          </button>
        </div>
      ) : (
        /* Keys scale to fill available width up to max-w-2xl */
        <div className="flex flex-col gap-1.5 items-center w-full px-2">

          {ROWS.map((row, ri) => (
            <div key={ri} className="flex gap-1 sm:gap-1.5 w-full max-w-2xl">
              {row.map(letter => (
                <button
                  key={letter}
                  type="button"
                  onClick={() => addLetter(letter)}
                  disabled={feedbackState !== null || disabled}
                  className="flex-1 h-11 sm:h-13 bg-white rounded-lg text-sm sm:text-base font-bold text-board-black shadow-[0_2px_0_0_#c4bfe8] active:shadow-none active:translate-y-[2px] touch-manipulation transition-all disabled:opacity-40 select-none"
                >
                  {letter}
                </button>
              ))}
            </div>
          ))}

          {/* Delete + Submit row */}
          <div className="flex gap-2 mt-1 w-full max-w-2xl">
            <button
              type="button"
              onClick={removeLetter}
              disabled={!value || disabled}
              className="px-5 h-11 sm:h-13 bg-white rounded-lg font-bold text-error shadow-[0_2px_0_0_#c4bfe8] active:shadow-none active:translate-y-[2px] touch-manipulation transition-all disabled:opacity-40 select-none flex items-center gap-1.5 text-sm sm:text-base"
            >
              <Delete className="w-4 h-4" />
              <span>Del</span>
            </button>
            <button
              type="button"
              onClick={onSubmit}
              disabled={!value.trim() || feedbackState === 'correct' || disabled}
              className="flex-1 h-11 sm:h-13 bg-class-green text-white rounded-lg font-black shadow-[0_2px_0_0_rgba(91,33,182,0.4)] active:shadow-none active:translate-y-[2px] touch-manipulation transition-all disabled:opacity-40 select-none text-base sm:text-lg"
            >
              OK →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
