import { useEffect, useId, useState, type FormEvent } from 'react';
import { api, ApiError } from '../../api/client.ts';
import type { AdaptationCategory, ExerciseAdaptation } from '../../types.ts';
import { Button } from '../ui/Button.tsx';
import { Input } from '../ui/Input.tsx';

const CATEGORY_LABELS: Record<AdaptationCategory, string> = {
  haltung: 'Haltung',
  koerperbau: 'Körperbau',
  beweglichkeit: 'Beweglichkeit',
  hilfsmittel: 'Hilfsmittel',
  schonung: 'Schonung',
};

const CATEGORY_ORDER: AdaptationCategory[] = ['haltung', 'koerperbau', 'beweglichkeit', 'hilfsmittel', 'schonung'];

interface Props {
  exerciseId: string;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

// Regulatorisch verbindlich (siehe TASK_ADAPTATIONS.md): Diese Komponente
// wählt niemals selbstständig etwas aus. Jede Checkbox ist eine explizite
// Handlung der Therapeutin/des Therapeuten. Standardmäßig ist nichts
// vorausgewählt — die einzige Ausnahme ist die frisch selbst angelegte
// eigene Anpassung (handleCreated), die als bewusste Handlung im selben
// Moment gilt, nicht als automatische Ableitung aus Patientenmerkmalen.
export function AdaptationPicker({ exerciseId, selectedIds, onChange }: Props) {
  // null = lädt noch, [] = geladen und leer — bewusst unterscheidbar
  const [adaptations, setAdaptations] = useState<ExerciseAdaptation[] | null>(null);
  const [loadError, setLoadError] = useState('');
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [includeUnvalidated, setIncludeUnvalidated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setAdaptations(null);
    setLoadError('');
    const qs = includeUnvalidated ? '?includeUnvalidated=true' : '';
    // TODO: Phase 2 — adaptations in Programm-Response bündeln, statt pro Übung einzeln nachzuladen.
    api
      .get<{ adaptations: ExerciseAdaptation[] }>(`/api/v1/exercises/${exerciseId}${qs}`)
      .then((data) => {
        if (!cancelled) setAdaptations(data.adaptations);
      })
      .catch(() => {
        if (!cancelled) setLoadError('Anpassungen konnten nicht geladen werden.');
      });
    return () => {
      cancelled = true;
    };
  }, [exerciseId, includeUnvalidated]);

  function toggle(id: string) {
    onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);
  }

  function handleCreated(adaptation: ExerciseAdaptation) {
    setAdaptations((prev) => (prev ? [...prev, adaptation] : [adaptation]));
    onChange([...selectedIds, adaptation.id]);
    setShowCustomForm(false);
  }

  const selected = (adaptations ?? []).filter((a) => selectedIds.includes(a.id));
  const grouped = CATEGORY_ORDER.map((category) => ({
    category,
    items: (adaptations ?? []).filter((a) => a.category === category),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="flex flex-col gap-3">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => toggle(a.id)}
              title="Klicken zum Entfernen"
              aria-label={`${a.labelDe} entfernen`}
              className="inline-flex items-center gap-1 rounded-full bg-success-tint text-success text-xs font-medium px-2.5 py-1 hover:bg-[#d8efe1]"
            >
              {a.labelDe}
              <span aria-hidden>×</span>
            </button>
          ))}
        </div>
      )}

      <label className="flex items-center gap-1.5 text-xs text-neutral-600 self-end cursor-pointer">
        <input
          type="checkbox"
          checked={includeUnvalidated}
          onChange={(e) => setIncludeUnvalidated(e.target.checked)}
          className="h-3.5 w-3.5 rounded border-neutral-300 text-warning focus:ring-warning"
        />
        Ungeprüfte anzeigen
      </label>

      {adaptations === null && !loadError && (
        <p className="text-sm text-neutral-400">Anpassungen werden geladen…</p>
      )}
      {loadError && <p role="alert" aria-live="polite" className="text-sm text-danger">{loadError}</p>}
      {adaptations !== null && adaptations.length === 0 && !includeUnvalidated && (
        <p className="text-sm text-neutral-400 flex flex-col gap-1">
          <span>Noch keine Anpassungen für diese Übung fachlich freigegeben.</span>
          <button
            type="button"
            onClick={() => setIncludeUnvalidated(true)}
            className="text-xs font-medium text-primary-700 underline self-start"
          >
            Ungeprüfte Anpassungen anzeigen
          </button>
        </p>
      )}
      {adaptations !== null && adaptations.length === 0 && includeUnvalidated && (
        <p className="text-sm text-neutral-400">Keine Anpassungen für diese Übung hinterlegt.</p>
      )}

      {grouped.map(({ category, items }) => (
        <div key={category}>
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1.5">
            {CATEGORY_LABELS[category]}
          </p>
          <div className="flex flex-col gap-1.5">
            {items.map((a) => (
              <label
                key={a.id}
                className={`flex items-start gap-2.5 text-sm text-neutral-700 cursor-pointer ${!a.isValidated ? 'opacity-60' : ''}`}
              >
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                  checked={selectedIds.includes(a.id)}
                  onChange={() => toggle(a.id)}
                />
                <span>
                  <span className="font-medium flex items-center gap-1.5">
                    {a.labelDe}
                    {!a.isValidated && (
                      <span className="inline-flex items-center rounded-full bg-warning-tint text-warning text-[10px] font-semibold px-1.5 py-0.5 uppercase tracking-wide">
                        Ungeprüft
                      </span>
                    )}
                  </span>
                  <span className="block text-xs text-neutral-400">{a.instructionDe}</span>
                  {!a.isValidated && (
                    <span className="block text-xs text-warning mt-0.5">
                      Fachlich noch nicht freigegeben — nicht als Anleitung verwenden.
                    </span>
                  )}
                </span>
              </label>
            ))}
          </div>
        </div>
      ))}

      {adaptations !== null && (
        showCustomForm ? (
          <CustomAdaptationForm
            exerciseId={exerciseId}
            onCreated={handleCreated}
            onCancel={() => setShowCustomForm(false)}
          />
        ) : (
          <Button variant="secondary" onClick={() => setShowCustomForm(true)} className="self-start text-xs">
            Eigene Anpassung anlegen
          </Button>
        )
      )}
    </div>
  );
}

function CustomAdaptationForm({
  exerciseId,
  onCreated,
  onCancel,
}: {
  exerciseId: string;
  onCreated: (adaptation: ExerciseAdaptation) => void;
  onCancel: () => void;
}) {
  const [labelDe, setLabelDe] = useState('');
  const [instructionDe, setInstructionDe] = useState('');
  const [category, setCategory] = useState<AdaptationCategory>('haltung');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const instructionId = useId();
  const categoryId = useId();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!labelDe.trim() || !instructionDe.trim()) return;

    setSaving(true);
    setError('');
    try {
      const data = await api.post<{ adaptation: ExerciseAdaptation }>(
        `/api/v1/exercises/${exerciseId}/adaptations`,
        { labelDe: labelDe.trim(), instructionDe: instructionDe.trim(), category },
      );
      onCreated(data.adaptation);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Anpassung konnte nicht gespeichert werden.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 bg-neutral-50 rounded-lg border border-neutral-200 p-3">
      <Input
        label="Kurzlabel"
        value={labelDe}
        onChange={(e) => setLabelDe(e.target.value)}
        placeholder="z. B. Hohlkreuz"
        required
      />
      <div className="flex flex-col gap-1">
        <label htmlFor={instructionId} className="text-sm font-medium text-neutral-700">Hinweistext für den Patienten</label>
        <textarea
          id={instructionId}
          rows={2}
          value={instructionDe}
          onChange={(e) => setInstructionDe(e.target.value)}
          required
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor={categoryId} className="text-sm font-medium text-neutral-700">Kategorie</label>
        <select
          id={categoryId}
          value={category}
          onChange={(e) => setCategory(e.target.value as AdaptationCategory)}
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 bg-white outline-none focus:ring-2 focus:ring-primary-500"
        >
          {CATEGORY_ORDER.map((c) => (
            <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
          ))}
        </select>
      </div>
      {error && <p role="alert" aria-live="polite" className="text-xs text-danger">{error}</p>}
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="secondary" onClick={onCancel} className="text-xs">
          Abbrechen
        </Button>
        <Button type="submit" loading={saving} className="text-xs">
          Anpassung speichern
        </Button>
      </div>
    </form>
  );
}
