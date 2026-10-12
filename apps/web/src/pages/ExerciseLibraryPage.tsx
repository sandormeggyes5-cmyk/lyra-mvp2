import { useEffect, useState, type FormEvent } from 'react';
import { api, ApiError } from '../api/client.ts';
import type { Exercise, ExerciseAdaptation } from '../types.ts';
import { AppLayout } from '../components/layout/AppLayout.tsx';
import { Button } from '../components/ui/Button.tsx';
import { Input } from '../components/ui/Input.tsx';
import { Spinner } from '../components/ui/Spinner.tsx';

// Admin-Werkzeug zur fachlichen Freigabe: solange isValidated: false, kann
// eine Übung/Anpassung laut programs.ts nicht verordnet werden (siehe
// docs/TASK_VALIDATION_UI.md). Diese Seite ist der einzige UI-Weg, das zu
// ändern — vorher ging das nur per direktem DB-Zugriff.
export function ExerciseLibraryPage() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [onlyUnvalidated, setOnlyUnvalidated] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // Bei 80+ Übungen in einer Wand war die Seite laut Design-Audit das
  // größte Einzelproblem der ganzen App — Regionen jetzt einklappbar statt
  // alles auf einmal zu rendern.
  const [openRegions, setOpenRegions] = useState<Set<string>>(new Set());

  const fetchExercises = () => {
    setLoading(true);
    setError('');
    api
      .get<{ exercises: Exercise[] }>('/api/v1/exercises?includeUnvalidated=true')
      .then((data) => setExercises(data.exercises))
      .catch(() => setError('Übungen konnten nicht geladen werden.'))
      .finally(() => setLoading(false));
  };

  useEffect(fetchExercises, []);

  async function setExerciseValidation(id: string, isValidated: boolean, validatedBy?: string) {
    const updated = await api.put<{ exercise: Exercise }>(`/api/v1/exercises/${id}/validation`, {
      isValidated,
      ...(validatedBy ? { validatedBy } : {}),
    });
    setExercises((prev) => prev.map((ex) => (ex.id === id ? updated.exercise : ex)));
  }

  const searchLower = search.trim().toLowerCase();
  const filtered = exercises
    .filter((ex) => !onlyUnvalidated || !ex.isValidated)
    .filter((ex) => !searchLower || ex.nameDe.toLowerCase().includes(searchLower));

  const grouped = Object.entries(
    filtered.reduce<Record<string, Exercise[]>>((acc, ex) => {
      (acc[ex.bodyRegion] ??= []).push(ex);
      return acc;
    }, {}),
  ).sort(([a], [b]) => a.localeCompare(b));

  // Während einer Suche automatisch alle Treffer-Regionen aufklappen, damit
  // man nicht zusätzlich noch jede Region einzeln öffnen muss.
  const effectiveOpenRegions = searchLower ? new Set(grouped.map(([region]) => region)) : openRegions;

  function toggleRegion(region: string) {
    setOpenRegions((prev) => {
      const next = new Set(prev);
      if (next.has(region)) next.delete(region);
      else next.add(region);
      return next;
    });
  }

  return (
    <AppLayout>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="font-display text-display-md text-neutral-900">Übungs-Bibliothek</h1>
        <label className="flex items-center gap-1.5 text-body-sm text-neutral-600 cursor-pointer">
          <input
            type="checkbox"
            checked={onlyUnvalidated}
            onChange={(e) => setOnlyUnvalidated(e.target.checked)}
            className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
          />
          Nur ungeprüfte anzeigen
        </label>
      </div>

      <div className="mb-6 max-w-sm">
        <Input
          aria-label="Übung suchen"
          placeholder="Übung suchen …"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading && <Spinner />}
      {error && <p role="alert" aria-live="polite" className="text-body-sm text-danger">{error}</p>}

      {!loading && !error && filtered.length === 0 && (
        <div className="text-center py-16 text-body-sm text-neutral-400 bg-white rounded-xl shadow-sm">
          {search
            ? 'Keine Übungen gefunden.'
            : onlyUnvalidated
              ? 'Keine ungeprüften Übungen mehr — alles freigegeben.'
              : 'Keine Übungen gefunden.'}
        </div>
      )}

      <div className="flex flex-col gap-3">
        {grouped.map(([bodyRegion, items]) => {
          const isOpen = effectiveOpenRegions.has(bodyRegion);
          const unvalidatedCount = items.filter((ex) => !ex.isValidated).length;
          return (
            <div key={bodyRegion} className="bg-white rounded-xl shadow-sm overflow-hidden">
              <button
                type="button"
                onClick={() => toggleRegion(bodyRegion)}
                aria-expanded={isOpen}
                className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-neutral-50 transition-colors duration-base"
              >
                <div className="flex items-center gap-3">
                  <svg
                    aria-hidden="true"
                    className={`h-4 w-4 text-neutral-400 transition-transform duration-base flex-shrink-0 ${isOpen ? 'rotate-90' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                  <span className="font-medium text-body text-neutral-900">{bodyRegion}</span>
                  <span className="text-xs text-neutral-400">{items.length} Übung{items.length !== 1 ? 'en' : ''}</span>
                </div>
                {unvalidatedCount > 0 && (
                  <span className="inline-flex items-center rounded-full bg-warning-tint text-warning text-[10px] font-semibold px-2 py-0.5 uppercase tracking-wide flex-shrink-0">
                    {unvalidatedCount} ungeprüft
                  </span>
                )}
              </button>
              {isOpen && (
                <div className="divide-y divide-neutral-100 border-t border-neutral-100">
                  {items.map((ex) => (
                    <ExerciseRow
                      key={ex.id}
                      exercise={ex}
                      expanded={expandedId === ex.id}
                      onToggleExpand={() => setExpandedId((prev) => (prev === ex.id ? null : ex.id))}
                      onSetValidation={(isValidated, validatedBy) => setExerciseValidation(ex.id, isValidated, validatedBy)}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </AppLayout>
  );
}

function ValidationBadge({ isValidated }: { isValidated: boolean }) {
  return isValidated ? (
    <span className="inline-flex items-center rounded-full bg-success-tint text-success text-[10px] font-semibold px-1.5 py-0.5 uppercase tracking-wide">
      Freigegeben
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full bg-warning-tint text-warning text-[10px] font-semibold px-1.5 py-0.5 uppercase tracking-wide">
      Ungeprüft
    </span>
  );
}

function Tag({ children }: { children: string }) {
  return (
    <span className="inline-flex items-center rounded-md bg-neutral-100 text-neutral-600 text-[11px] px-1.5 py-0.5">
      {children}
    </span>
  );
}

function ValidationForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (validatedBy: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [validatedBy, setValidatedBy] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validatedBy.trim()) return;
    setSaving(true);
    setError('');
    try {
      await onSubmit(validatedBy.trim());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Freigabe fehlgeschlagen.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 bg-neutral-50 rounded-md border border-neutral-200 p-3 mt-2">
      <Input
        label="Name + Qualifikation der prüfenden Person"
        value={validatedBy}
        onChange={(e) => setValidatedBy(e.target.value)}
        placeholder="z. B. Anna Schmidt, Physiotherapeutin"
        required
        autoFocus
      />
      {error && <p role="alert" aria-live="polite" className="text-xs text-danger">{error}</p>}
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="secondary" onClick={onCancel} className="text-xs">Abbrechen</Button>
        <Button type="submit" loading={saving} className="text-xs">Freigeben</Button>
      </div>
    </form>
  );
}

function ExerciseRow({
  exercise,
  expanded,
  onToggleExpand,
  onSetValidation,
}: {
  exercise: Exercise;
  expanded: boolean;
  onToggleExpand: () => void;
  onSetValidation: (isValidated: boolean, validatedBy?: string) => Promise<void>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [revoking, setRevoking] = useState(false);

  async function handleRevoke() {
    setRevoking(true);
    try {
      await onSetValidation(false);
    } finally {
      setRevoking(false);
    }
  }

  return (
    <div className="px-5 py-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <button
            type="button"
            onClick={onToggleExpand}
            aria-expanded={expanded}
            className="text-body-sm font-medium text-neutral-800 flex items-center gap-1.5 hover:text-primary-700"
          >
            {exercise.nameDe}
            <ValidationBadge isValidated={exercise.isValidated} />
          </button>
          <div className="flex flex-wrap gap-1 mt-1">
            <Tag>{exercise.exerciseType}</Tag>
            <Tag>{exercise.position}</Tag>
            {exercise.equipment.map((eq) => <Tag key={eq}>{eq}</Tag>)}
          </div>
          {exercise.sourceNote && <p className="text-xs text-neutral-400 mt-1">Quelle: {exercise.sourceNote}</p>}
          {exercise.isValidated && exercise.validatedBy && (
            <p className="text-xs text-neutral-400 mt-1">
              Freigegeben von {exercise.validatedBy}
              {exercise.validatedAt ? ` am ${new Date(exercise.validatedAt).toLocaleDateString('de-DE')}` : ''}
            </p>
          )}
        </div>
        <div className="flex-shrink-0">
          {exercise.isValidated ? (
            <Button variant="secondary" onClick={handleRevoke} loading={revoking} className="text-xs">
              Freigabe zurückziehen
            </Button>
          ) : (
            !showForm && (
              <Button onClick={() => setShowForm(true)} className="text-xs">Freigeben</Button>
            )
          )}
        </div>
      </div>

      {!exercise.isValidated && showForm && (
        <ValidationForm
          onSubmit={async (validatedBy) => {
            await onSetValidation(true, validatedBy);
            setShowForm(false);
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {expanded && <AdaptationsPanel exerciseId={exercise.id} />}
    </div>
  );
}

function AdaptationsPanel({ exerciseId }: { exerciseId: string }) {
  const [adaptations, setAdaptations] = useState<ExerciseAdaptation[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setAdaptations(null);
    api
      .get<{ adaptations: ExerciseAdaptation[] }>(`/api/v1/exercises/${exerciseId}?includeUnvalidated=true`)
      .then((data) => { if (!cancelled) setAdaptations(data.adaptations); })
      .catch(() => { if (!cancelled) setError('Anpassungen konnten nicht geladen werden.'); });
    return () => { cancelled = true; };
  }, [exerciseId]);

  async function setAdaptationValidation(id: string, isValidated: boolean, validatedBy?: string) {
    const updated = await api.put<{ adaptation: ExerciseAdaptation }>(
      `/api/v1/exercises/${exerciseId}/adaptations/${id}/validation`,
      { isValidated, ...(validatedBy ? { validatedBy } : {}) },
    );
    setAdaptations((prev) => (prev ?? []).map((a) => (a.id === id ? updated.adaptation : a)));
  }

  return (
    <div className="mt-3 ml-2 pl-3 border-l-2 border-neutral-100 flex flex-col gap-2">
      {adaptations === null && !error && <p className="text-xs text-neutral-400">Anpassungen werden geladen…</p>}
      {error && <p role="alert" aria-live="polite" className="text-xs text-danger">{error}</p>}
      {adaptations !== null && adaptations.length === 0 && (
        <p className="text-xs text-neutral-400">Keine Anpassungen für diese Übung hinterlegt.</p>
      )}
      {adaptations?.map((a) => (
        <AdaptationRow key={a.id} adaptation={a} onSetValidation={(v, by) => setAdaptationValidation(a.id, v, by)} />
      ))}
    </div>
  );
}

function AdaptationRow({
  adaptation,
  onSetValidation,
}: {
  adaptation: ExerciseAdaptation;
  onSetValidation: (isValidated: boolean, validatedBy?: string) => Promise<void>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [revoking, setRevoking] = useState(false);

  async function handleRevoke() {
    setRevoking(true);
    try {
      await onSetValidation(false);
    } finally {
      setRevoking(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-neutral-700 flex items-center gap-1.5">
          <span className="font-medium">{adaptation.labelDe}</span>
          <ValidationBadge isValidated={adaptation.isValidated} />
        </p>
        {adaptation.isValidated ? (
          <Button variant="secondary" onClick={handleRevoke} loading={revoking} className="text-[11px] py-1 px-2">
            Zurückziehen
          </Button>
        ) : (
          !showForm && (
            <Button onClick={() => setShowForm(true)} className="text-[11px] py-1 px-2">Freigeben</Button>
          )
        )}
      </div>
      <p className="text-xs text-neutral-400">{adaptation.instructionDe}</p>
      {!adaptation.isValidated && showForm && (
        <ValidationForm
          onSubmit={async (validatedBy) => {
            await onSetValidation(true, validatedBy);
            setShowForm(false);
          }}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
