import { useEffect, useState, type FormEvent } from 'react';
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

  useEffect(() => {
    let cancelled = false;
    setAdaptations(null);
    setLoadError('');
    // TODO: Phase 2 — adaptations in Programm-Response bündeln, statt pro Übung einzeln nachzuladen.
    api
      .get<{ adaptations: ExerciseAdaptation[] }>(`/api/v1/exercises/${exerciseId}`)
      .then((data) => {
        if (!cancelled) setAdaptations(data.adaptations);
      })
      .catch(() => {
        if (!cancelled) setLoadError('Anpassungen konnten nicht geladen werden.');
      });
    return () => {
      cancelled = true;
    };
  }, [exerciseId]);

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
              className="inline-flex items-center gap-1 rounded-full bg-green-100 text-green-800 text-xs font-medium px-2.5 py-1 hover:bg-green-200"
            >
              {a.labelDe}
              <span aria-hidden>×</span>
            </button>
          ))}
        </div>
      )}

      {adaptations === null && !loadError && (
        <p className="text-sm text-slate-400">Anpassungen werden geladen…</p>
      )}
      {loadError && <p className="text-sm text-red-600">{loadError}</p>}
      {adaptations !== null && adaptations.length === 0 && (
        <p className="text-sm text-slate-400">Keine Anpassungen für diese Übung hinterlegt.</p>
      )}

      {grouped.map(({ category, items }) => (
        <div key={category}>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
            {CATEGORY_LABELS[category]}
          </p>
          <div className="flex flex-col gap-1.5">
            {items.map((a) => (
              <label key={a.id} className="flex items-start gap-2.5 text-sm text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  checked={selectedIds.includes(a.id)}
                  onChange={() => toggle(a.id)}
                />
                <span>
                  <span className="font-medium">{a.labelDe}</span>
                  <span className="block text-xs text-slate-400">{a.instructionDe}</span>
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 bg-slate-50 rounded-lg border border-slate-200 p-3">
      <Input
        label="Kurzlabel"
        value={labelDe}
        onChange={(e) => setLabelDe(e.target.value)}
        placeholder="z. B. Hohlkreuz"
        required
      />
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-slate-700">Hinweistext für den Patienten</label>
        <textarea
          rows={2}
          value={instructionDe}
          onChange={(e) => setInstructionDe(e.target.value)}
          required
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-slate-700">Kategorie</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as AdaptationCategory)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
        >
          {CATEGORY_ORDER.map((c) => (
            <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
          ))}
        </select>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
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
