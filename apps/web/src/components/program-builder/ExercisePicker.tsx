import { useEffect, useState } from 'react';
import { api } from '../../api/client.ts';
import type { Exercise } from '../../types.ts';
import { Button } from '../ui/Button.tsx';
import { Spinner } from '../ui/Spinner.tsx';

interface Props {
  addedExerciseIds: string[];
  onAdd: (exercise: Exercise) => void;
}

const DIFFICULTIES = [1, 2, 3, 4, 5];

export function ExercisePicker({ addedExerciseIds, onAdd }: Props) {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [bodyRegions, setBodyRegions] = useState<string[]>([]);
  const [bodyRegion, setBodyRegion] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    const params = new URLSearchParams();
    if (bodyRegion) params.set('bodyRegion', bodyRegion);
    if (difficulty) params.set('difficulty', difficulty);
    const qs = params.toString();

    api
      .get<{ exercises: Exercise[]; meta: { bodyRegions: string[] } }>(`/api/v1/exercises${qs ? `?${qs}` : ''}`)
      .then((data) => {
        setExercises(data.exercises);
        setBodyRegions(data.meta.bodyRegions);
      })
      .catch(() => setError('Übungen konnten nicht geladen werden.'))
      .finally(() => setLoading(false));
  }, [bodyRegion, difficulty]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <select
          value={bodyRegion}
          onChange={(e) => setBodyRegion(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Alle Körperregionen</option>
          {bodyRegions.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <select
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Alle Schwierigkeiten</option>
          {DIFFICULTIES.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>

      {loading && <Spinner className="py-6" />}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && !error && (
        <ul className="flex flex-col gap-1.5 max-h-96 overflow-y-auto">
          {exercises.map((ex) => {
            const added = addedExerciseIds.includes(ex.id);
            return (
              <li
                key={ex.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium text-slate-800">{ex.nameDe}</p>
                  <p className="text-xs text-slate-400">{ex.bodyRegion} · Schwierigkeit {ex.difficulty}</p>
                </div>
                <Button
                  variant={added ? 'secondary' : 'primary'}
                  disabled={added}
                  onClick={() => onAdd(ex)}
                  className="text-xs flex-shrink-0"
                >
                  {added ? 'Hinzugefügt' : 'Hinzufügen'}
                </Button>
              </li>
            );
          })}
          {exercises.length === 0 && (
            <li className="text-sm text-slate-400 text-center py-6">Keine Übungen gefunden.</li>
          )}
        </ul>
      )}
    </div>
  );
}
