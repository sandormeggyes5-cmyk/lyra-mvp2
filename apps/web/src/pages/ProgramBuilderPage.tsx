import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, ApiError } from '../api/client.ts';
import type { Exercise, PatientDetail, Program, ProgramStatus } from '../types.ts';
import { AppLayout } from '../components/layout/AppLayout.tsx';
import { Button } from '../components/ui/Button.tsx';
import { Input } from '../components/ui/Input.tsx';
import { Spinner } from '../components/ui/Spinner.tsx';
import { ExercisePicker } from '../components/program-builder/ExercisePicker.tsx';
import { ProgramItemEditor, type BuilderItem } from '../components/program-builder/ProgramItemEditor.tsx';

const DEFAULT_FREQUENCY_PER_WEEK = 3;

const STATUS_OPTIONS: { value: ProgramStatus; label: string }[] = [
  { value: 'active', label: 'Aktiv' },
  { value: 'paused', label: 'Pausiert' },
  { value: 'completed', label: 'Beendet' },
];

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function toIsoDate(value: string): string {
  return value.slice(0, 10);
}

// Spiegelt validateProgramDates() aus apps/api/src/routes/programs.ts.
function validateProgramDates(startDate: string, endDate: string): string | null {
  if (!startDate) return 'Startdatum ist erforderlich.';
  if (endDate && endDate < startDate) return 'Enddatum darf nicht vor dem Startdatum liegen.';
  return null;
}

function buildItemFromExercise(exercise: Exercise): BuilderItem {
  return {
    exerciseId: exercise.id,
    exercise,
    sets: exercise.defaultSets,
    reps: exercise.defaultReps,
    holdSeconds: exercise.defaultHoldSeconds ?? null,
    frequencyPerWeek: DEFAULT_FREQUENCY_PER_WEEK,
    adaptationIds: [],
    therapistNote: '',
  };
}

interface Props {
  mode: 'create' | 'edit';
}

export function ProgramBuilderPage({ mode }: Props) {
  const { patientId: routePatientId, programId } = useParams<{ patientId: string; programId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [patientId, setPatientId] = useState(routePatientId ?? '');
  const [patientName, setPatientName] = useState('');
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [startDate, setStartDate] = useState(todayIsoDate());
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState<ProgramStatus>('active');
  const [items, setItems] = useState<BuilderItem[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [dateError, setDateError] = useState('');

  // Verlassen mit ungespeicherten Änderungen: Tab schließen/neu laden.
  // In-App-Navigation außerhalb dieser Seite (z. B. Klick im Header) lässt
  // sich mit <BrowserRouter> ohne Data-Router nicht generisch abfangen —
  // dafür sind die Zurück-/Abbrechen-Aktionen unten explizit abgesichert.
  useEffect(() => {
    function handler(e: BeforeUnloadEvent) {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = '';
    }
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setLoadError('');
      try {
        if (mode === 'create') {
          if (!routePatientId) throw new Error('Kein Patient angegeben.');
          const data = await api.get<{ patient: PatientDetail }>(`/api/v1/patients/${routePatientId}`);
          if (cancelled) return;
          setPatientId(data.patient.id);
          setPatientName(data.patient.name);
        } else {
          if (!programId) throw new Error('Kein Programm angegeben.');
          const data = await api.get<{ program: Program & { patient: { id: string; name: string } } }>(
            `/api/v1/programs/${programId}`,
          );
          if (cancelled) return;
          const program = data.program;
          setPatientId(program.patient.id);
          setPatientName(program.patient.name);
          setName(program.name);
          setNotes(program.notes ?? '');
          setStartDate(toIsoDate(program.startDate));
          setEndDate(program.endDate ? toIsoDate(program.endDate) : '');
          setStatus(program.status);
          setItems(
            program.items.map((item) => ({
              exerciseId: item.exercise.id,
              exercise: item.exercise,
              sets: item.sets,
              reps: item.reps,
              holdSeconds: item.holdSeconds ?? null,
              frequencyPerWeek: item.frequencyPerWeek,
              adaptationIds: item.adaptations.map((a) => a.id),
              therapistNote: item.therapistNote ?? '',
            })),
          );
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof ApiError ? err.message : 'Daten konnten nicht geladen werden.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, routePatientId, programId]);

  function confirmDiscardIfDirty(): boolean {
    if (!dirty) return true;
    return window.confirm('Es gibt ungespeicherte Änderungen. Wirklich verlassen, ohne zu speichern?');
  }

  function handleBack() {
    if (!confirmDiscardIfDirty()) return;
    navigate(patientId ? `/patients/${patientId}` : '/');
  }

  function addExercise(exercise: Exercise) {
    setItems((prev) => [...prev, buildItemFromExercise(exercise)]);
    setDirty(true);
  }

  function removeExercise(exerciseId: string) {
    setItems((prev) => prev.filter((i) => i.exerciseId !== exerciseId));
    setDirty(true);
  }

  function updateItem(exerciseId: string, updated: BuilderItem) {
    setItems((prev) => prev.map((i) => (i.exerciseId === exerciseId ? updated : i)));
    setDirty(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setSubmitError('Name des Programms ist erforderlich.');
      return;
    }
    if (items.length === 0) {
      setSubmitError('Mindestens eine Übung auswählen.');
      return;
    }
    const dateValidationError = validateProgramDates(startDate, endDate);
    if (dateValidationError) {
      setDateError(dateValidationError);
      return;
    }

    setSaving(true);
    setSubmitError('');
    setDateError('');

    const payloadItems = items.map((item, idx) => ({
      exerciseId: item.exerciseId,
      sets: item.sets,
      reps: item.reps,
      holdSeconds: item.holdSeconds,
      frequencyPerWeek: item.frequencyPerWeek,
      order: idx + 1,
      adaptationIds: item.adaptationIds,
      therapistNote: item.therapistNote.trim() || undefined,
    }));

    try {
      if (mode === 'create') {
        await api.post('/api/v1/programs', {
          patientId,
          name: name.trim(),
          notes: notes.trim() || undefined,
          startDate,
          endDate: endDate || undefined,
          items: payloadItems,
        });
      } else {
        await api.put(`/api/v1/programs/${programId}`, {
          name: name.trim(),
          notes: notes.trim() || undefined,
          startDate,
          endDate: endDate || null,
          status,
        });
        await api.put(`/api/v1/programs/${programId}/items`, { items: payloadItems });
      }
      setDirty(false);
      navigate(`/patients/${patientId}`);
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : 'Speichern fehlgeschlagen.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <AppLayout><Spinner /></AppLayout>;
  if (loadError) {
    return (
      <AppLayout>
        <div className="text-center py-16 text-neutral-400">{loadError}</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mb-6">
        <button onClick={handleBack} className="text-body-sm text-neutral-500 hover:text-neutral-700 inline-flex items-center gap-1">
          <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Zurück zu {patientName || 'Patient'}
        </button>
      </div>

      <h1 className="font-display text-headline text-neutral-900 mb-6">
        {mode === 'create' ? `Neues Programm für ${patientName}` : `Programm bearbeiten: ${patientName}`}
      </h1>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Linke Spalte: Übungsbibliothek */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h2 className="text-body-sm font-semibold text-neutral-700 mb-3">Übungsbibliothek</h2>
          <ExercisePicker addedExerciseIds={items.map((i) => i.exerciseId)} onAdd={addExercise} />
        </div>

        {/* Rechte Spalte: Programm-Details */}
        <div className="flex flex-col gap-4">
          <div className="bg-white rounded-xl shadow-sm p-5 flex flex-col gap-3">
            <Input
              label="Programmname"
              value={name}
              onChange={(e) => { setName(e.target.value); setDirty(true); }}
              placeholder="z. B. Rücken-Aufbau"
              required
            />
            <div className="flex flex-col gap-1">
              <label htmlFor="program-notes" className="text-body-sm font-medium text-neutral-700">Notiz (optional)</label>
              <textarea
                id="program-notes"
                rows={2}
                value={notes}
                onChange={(e) => { setNotes(e.target.value); setDirty(true); }}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-body text-neutral-900 placeholder:text-neutral-400 outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Startdatum"
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setDateError(''); setDirty(true); }}
                required
              />
              <Input
                label="Enddatum (optional)"
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setDateError(''); setDirty(true); }}
              />
            </div>
            {dateError && <p role="alert" aria-live="polite" className="text-xs text-danger">{dateError}</p>}
            {mode === 'edit' && (
              <div className="flex flex-col gap-1">
                <label htmlFor="program-status" className="text-body-sm font-medium text-neutral-700">Status</label>
                <select
                  id="program-status"
                  value={status}
                  onChange={(e) => { setStatus(e.target.value as ProgramStatus); setDirty(true); }}
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-body text-neutral-900 outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {items.length === 0 ? (
            <div className="text-center py-10 text-body-sm text-neutral-400 bg-white rounded-xl shadow-sm">
              Noch keine Übungen ausgewählt.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {items.map((item) => (
                <ProgramItemEditor
                  key={item.exerciseId}
                  item={item}
                  onChange={(updated) => updateItem(item.exerciseId, updated)}
                  onRemove={() => removeExercise(item.exerciseId)}
                />
              ))}
            </div>
          )}

          {submitError && <p role="alert" aria-live="polite" className="text-body-sm text-danger">{submitError}</p>}

          <div className="flex gap-3 justify-end">
            <Button type="button" variant="secondary" onClick={handleBack}>Abbrechen</Button>
            <Button type="submit" loading={saving}>Programm speichern</Button>
          </div>
        </div>
      </form>
    </AppLayout>
  );
}
