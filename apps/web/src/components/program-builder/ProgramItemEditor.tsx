import { useEffect, useId, useState } from 'react';
import type { Exercise } from '../../types.ts';
import { AdaptationPicker } from './AdaptationPicker.tsx';
import { Button } from '../ui/Button.tsx';

export interface BuilderItem {
  exerciseId: string;
  exercise: Exercise;
  sets: number;
  reps: number;
  holdSeconds: number | null;
  frequencyPerWeek: number;
  adaptationIds: string[];
  therapistNote: string;
}

// Grenzen identisch zu programs.ts (validateProgramItems) — bewusst dupliziert,
// damit clientseitige Validierung nicht unbemerkt von der Server-Validierung
// abweicht.
const SETS_REPS_FREQ_MIN = 1;
const SETS_REPS_FREQ_MAX = 100;
const HOLD_SECONDS_MIN = 1;
const HOLD_SECONDS_MAX = 600;
export const THERAPIST_NOTE_MAX_LENGTH = 1000;

interface Props {
  item: BuilderItem;
  onChange: (item: BuilderItem) => void;
  onRemove: () => void;
}

export function ProgramItemEditor({ item, onChange, onRemove }: Props) {
  const [adaptationsOpen, setAdaptationsOpen] = useState(false);
  const noteId = useId();

  function update<K extends keyof BuilderItem>(key: K, value: BuilderItem[K]) {
    onChange({ ...item, [key]: value });
  }

  const selectedCount = item.adaptationIds.length;

  return (
    <div className="rounded-lg border border-neutral-200 p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-neutral-900">{item.exercise.nameDe}</p>
          <p className="text-xs text-neutral-400">
            {item.exercise.bodyRegion} · Schwierigkeit {item.exercise.difficulty}
          </p>
        </div>
        <Button variant="ghost" onClick={onRemove} className="text-xs text-danger hover:bg-danger-tint">
          Entfernen
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <NumberField
          label="Sätze"
          value={item.sets}
          min={SETS_REPS_FREQ_MIN}
          max={SETS_REPS_FREQ_MAX}
          onCommit={(v) => update('sets', v ?? SETS_REPS_FREQ_MIN)}
        />
        <NumberField
          label="Wiederholungen"
          value={item.reps}
          min={SETS_REPS_FREQ_MIN}
          max={SETS_REPS_FREQ_MAX}
          onCommit={(v) => update('reps', v ?? SETS_REPS_FREQ_MIN)}
        />
        <NumberField
          label="Halten (Sek., optional)"
          value={item.holdSeconds}
          min={HOLD_SECONDS_MIN}
          max={HOLD_SECONDS_MAX}
          optional
          onCommit={(v) => update('holdSeconds', v)}
        />
        <NumberField
          label="Frequenz / Woche"
          value={item.frequencyPerWeek}
          min={SETS_REPS_FREQ_MIN}
          max={SETS_REPS_FREQ_MAX}
          onCommit={(v) => update('frequencyPerWeek', v ?? SETS_REPS_FREQ_MIN)}
        />
      </div>

      <div>
        <label htmlFor={noteId} className="text-sm font-medium text-neutral-700 block mb-1">Eigene Anmerkung (optional)</label>
        <textarea
          id={noteId}
          rows={2}
          value={item.therapistNote}
          maxLength={THERAPIST_NOTE_MAX_LENGTH}
          onChange={(e) => update('therapistNote', e.target.value)}
          placeholder="z. B. Hinweise zur Ausführung für diesen Patienten"
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-body text-neutral-900 placeholder:text-neutral-400 outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
        />
        <p className="text-xs text-neutral-400 mt-0.5 text-right">
          {item.therapistNote.length}/{THERAPIST_NOTE_MAX_LENGTH}
        </p>
      </div>

      <div>
        <button
          type="button"
          onClick={() => setAdaptationsOpen((v) => !v)}
          aria-expanded={adaptationsOpen}
          className="flex items-center gap-1.5 text-sm font-medium text-primary-700"
        >
          <svg
            aria-hidden="true"
            className={`h-4 w-4 transition-transform ${adaptationsOpen ? 'rotate-90' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          Anpassungen für diesen Patienten
          {selectedCount > 0 && (
            <span className="text-xs font-normal text-neutral-400">({selectedCount} ausgewählt)</span>
          )}
        </button>
        {adaptationsOpen && (
          <div className="mt-3">
            <AdaptationPicker
              exerciseId={item.exerciseId}
              selectedIds={item.adaptationIds}
              onChange={(ids) => update('adaptationIds', ids)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

// Freies Tippen erlauben (kein Clamping pro Tastendruck), Wert wird erst
// beim Verlassen des Feldes validiert und übernommen.
function NumberField({
  label,
  value,
  min,
  max,
  optional,
  onCommit,
}: {
  label: string;
  value: number | null;
  min: number;
  max: number;
  optional?: boolean;
  onCommit: (value: number | null) => void;
}) {
  const [text, setText] = useState(value == null ? '' : String(value));
  const id = useId();

  useEffect(() => {
    setText(value == null ? '' : String(value));
  }, [value]);

  function commit() {
    if (text.trim() === '') {
      if (optional) {
        onCommit(null);
        return;
      }
      setText(String(min));
      onCommit(min);
      return;
    }
    const num = clamp(Number(text), min, max);
    setText(String(num));
    onCommit(num);
  }

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium text-neutral-600">{label}</label>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={text}
        placeholder={optional ? '—' : undefined}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        className="w-full rounded-md border border-neutral-300 px-2.5 py-1.5 text-body-sm text-neutral-900 outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
      />
    </div>
  );
}
