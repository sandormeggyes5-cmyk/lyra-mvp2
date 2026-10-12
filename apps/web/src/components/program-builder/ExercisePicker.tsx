import { useEffect, useState } from 'react';
import { api } from '../../api/client.ts';
import type { Exercise } from '../../types.ts';
import { Button } from '../ui/Button.tsx';
import { Spinner } from '../ui/Spinner.tsx';
import { ExerciseAvatar3D } from '../ExerciseAvatar3D.tsx';

interface Props {
  addedExerciseIds: string[];
  onAdd: (exercise: Exercise) => void;
}

const DIFFICULTIES = [1, 2, 3, 4, 5];

// appearance-none + eigenes Chevron statt des nativen Browser-Pfeils — sonst
// bricht der native Select-Look aus dem sonst konsistenten Formular-Stil aus.
function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        {...props}
        className="appearance-none rounded-md border border-neutral-300 pl-3 pr-8 py-2 text-body-sm text-neutral-900 outline-none focus:ring-2 focus:ring-primary-500 bg-white"
      />
      <svg aria-hidden="true" className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  );
}

export function ExercisePicker({ addedExerciseIds, onAdd }: Props) {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [bodyRegions, setBodyRegions] = useState<string[]>([]);
  const [bodyRegion, setBodyRegion] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [includeUnvalidated, setIncludeUnvalidated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    const params = new URLSearchParams();
    if (bodyRegion) params.set('bodyRegion', bodyRegion);
    if (difficulty) params.set('difficulty', difficulty);
    if (includeUnvalidated) params.set('includeUnvalidated', 'true');
    const qs = params.toString();

    api
      .get<{ exercises: Exercise[]; meta: { bodyRegions: string[] } }>(`/api/v1/exercises${qs ? `?${qs}` : ''}`)
      .then((data) => {
        setExercises(data.exercises);
        setBodyRegions(data.meta.bodyRegions);
      })
      .catch(() => setError('Übungen konnten nicht geladen werden.'))
      .finally(() => setLoading(false));
  }, [bodyRegion, difficulty, includeUnvalidated]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Select aria-label="Körperregion filtern" value={bodyRegion} onChange={(e) => setBodyRegion(e.target.value)}>
          <option value="">Alle Körperregionen</option>
          {bodyRegions.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </Select>
        <Select aria-label="Schwierigkeit filtern" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
          <option value="">Alle Schwierigkeiten</option>
          {DIFFICULTIES.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </Select>
        <label className="flex items-center gap-1.5 text-xs text-neutral-600 ml-auto cursor-pointer">
          <input
            type="checkbox"
            checked={includeUnvalidated}
            onChange={(e) => setIncludeUnvalidated(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-neutral-300 text-warning focus:ring-warning"
          />
          Ungeprüfte anzeigen
        </label>
      </div>

      {loading && <Spinner className="py-6" />}
      {error && <p role="alert" aria-live="polite" className="text-body-sm text-danger">{error}</p>}

      {!loading && !error && (
        <ul className="flex flex-col gap-1.5 max-h-96 overflow-y-auto">
          {exercises.map((ex) => {
            const added = addedExerciseIds.includes(ex.id);
            return (
              <li
                key={ex.id}
                className={`rounded-lg border border-neutral-200 px-3 py-2 ${!ex.isValidated ? 'opacity-60' : ''}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-body-sm font-medium text-neutral-800 flex items-center gap-1.5">
                      {ex.nameDe}
                      {!ex.isValidated && (
                        <span className="inline-flex items-center rounded-full bg-warning-tint text-warning text-[10px] font-semibold px-1.5 py-0.5 uppercase tracking-wide">
                          Ungeprüft
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-neutral-400">{ex.bodyRegion} · Schwierigkeit {ex.difficulty}</p>
                    {!ex.isValidated && (
                      <p className="text-xs text-warning mt-0.5">
                        Fachlich noch nicht freigegeben — nicht als Anleitung verwenden.
                      </p>
                    )}
                  </div>
                  <Button
                    variant={added ? 'secondary' : 'primary'}
                    disabled={added}
                    onClick={() => onAdd(ex)}
                    className="text-xs flex-shrink-0"
                  >
                    {added ? 'Hinzugefügt' : 'Hinzufügen'}
                  </Button>
                </div>
                <ExerciseAvatar3D exerciseName={ex.nameDe} />
              </li>
            );
          })}
          {exercises.length === 0 && !includeUnvalidated && (
            <li className="text-body-sm text-neutral-400 text-center py-6 flex flex-col items-center gap-2">
              <span>Noch keine Übungen fachlich freigegeben.</span>
              <button
                type="button"
                onClick={() => setIncludeUnvalidated(true)}
                className="text-xs font-medium text-primary-700 underline"
              >
                Ungeprüfte Übungen anzeigen
              </button>
            </li>
          )}
          {exercises.length === 0 && includeUnvalidated && (
            <li className="text-body-sm text-neutral-400 text-center py-6">Keine Übungen gefunden.</li>
          )}
        </ul>
      )}
    </div>
  );
}
