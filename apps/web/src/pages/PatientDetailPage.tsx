import { useEffect, useState, type FormEvent } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, ApiError } from '../api/client.ts';
import type { ConsentEvent, ConsentEventType, PatientDetail, ProgramStatus } from '../types.ts';
import { AppLayout } from '../components/layout/AppLayout.tsx';
import { Button } from '../components/ui/Button.tsx';
import { Modal } from '../components/ui/Modal.tsx';
import { Spinner } from '../components/ui/Spinner.tsx';

// Muss mit CONSENT_TEXT_VERSIONS in apps/api/src/lib/consent.ts
// übereinstimmen — neue Version dort UND hier ergänzen.
const CONSENT_TEXT_VERSIONS = ['2026-10'] as const;

const STATUS_LABELS: Record<ProgramStatus, string> = {
  active: 'Aktiv',
  paused: 'Pausiert',
  completed: 'Beendet',
};

const CONSENT_EVENT_LABELS: Record<ConsentEventType, string> = {
  granted: 'Erteilt',
  declined: 'Abgelehnt',
  revoked: 'Widerrufen',
};

export function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [patient, setPatient] = useState<PatientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [renewLoading, setRenewLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.get<{ patient: PatientDetail }>(`/api/v1/patients/${id}`)
      .then((d) => setPatient(d.patient))
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404) {
          setError('Patient nicht gefunden.');
        } else {
          setError('Fehler beim Laden.');
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function copyLink() {
    if (!patient?.magicLink) return;
    await navigator.clipboard.writeText(patient.magicLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function renewLink() {
    if (!id) return;
    setRenewLoading(true);
    try {
      const data = await api.post<{ patient: PatientDetail }>(`/api/v1/patients/${id}/magic-link`);
      setPatient((prev) => prev ? { ...prev, magicLink: data.patient.magicLink, magicLinkToken: data.patient.magicLinkToken, magicLinkExpiresAt: data.patient.magicLinkExpiresAt } : prev);
    } catch {
      // noop — link stays
    } finally {
      setRenewLoading(false);
    }
  }

  if (loading) return <AppLayout><Spinner /></AppLayout>;
  if (error || !patient) return (
    <AppLayout>
      <div className="text-center py-16 text-neutral-400">{error || 'Patient nicht gefunden.'}</div>
    </AppLayout>
  );

  const expiresAt = patient.magicLinkExpiresAt ? new Date(patient.magicLinkExpiresAt) : null;
  const isExpired = expiresAt ? expiresAt < new Date() : false;
  // Kurzform statt der vollen, ~90 Zeichen langen URL — die Kopier-Funktion
  // nutzt weiterhin patient.magicLink vollständig.
  const linkTail = patient.magicLink ? patient.magicLink.replace(/^https?:\/\//, '').split('/p/')[1] : '';
  const linkShort = linkTail ? `…/p/${linkTail.slice(0, 10)}…${linkTail.slice(-6)}` : '';

  return (
    <AppLayout>
      <div className="mb-6">
        <Link to="/" className="text-body-sm text-neutral-500 hover:text-neutral-700 inline-flex items-center gap-1">
          <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Alle Patienten
        </Link>
      </div>

      {/* Patient info */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h1 className="font-display text-headline text-neutral-900 mb-1">{patient.name}</h1>
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-body-sm text-neutral-500">
          {patient.emailOrPhone && <span>{patient.emailOrPhone}</span>}
          {patient.dateOfBirth && (
            <span>geb. {new Date(patient.dateOfBirth).toLocaleDateString('de-DE')}</span>
          )}
          <span>Angelegt: {new Date(patient.createdAt).toLocaleDateString('de-DE')}</span>
        </div>
      </div>

      {/* Magic link card */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <h2 className="text-body-sm font-semibold text-neutral-700">Portal-Link</h2>
            {expiresAt && (
              <p className={`text-xs mt-0.5 ${isExpired ? 'text-danger' : 'text-neutral-400'}`}>
                {isExpired ? 'Abgelaufen' : `Gültig bis ${expiresAt.toLocaleDateString('de-DE')}`}
              </p>
            )}
          </div>
          <Button variant="secondary" onClick={renewLink} loading={renewLoading} className="text-xs">
            Erneuern
          </Button>
        </div>
        <div className="flex items-center gap-2 bg-neutral-50 rounded-md border border-neutral-200 px-4 py-3 mb-3">
          <span className="text-body-sm text-neutral-700 font-mono truncate flex-1" title={patient.magicLink}>
            {linkShort}
          </span>
          <button
            onClick={copyLink}
            className="flex-shrink-0 text-body-sm font-medium text-primary-600 hover:text-primary-700 transition-colors duration-base"
          >
            {copied ? 'Kopiert!' : 'Kopieren'}
          </button>
        </div>
      </div>

      {/* Einwilligung zur Datennutzung */}
      {id && <ConsentSection patientId={id} />}

      {/* Programs */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-headline text-neutral-900">
            Übungsprogramme ({patient.programs.length})
          </h2>
          <Link
            to={`/patients/${id}/programs/new`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-button font-body bg-primary-600 text-white hover:bg-primary-700 transition-colors duration-base"
          >
            + Neues Programm
          </Link>
        </div>
        {patient.programs.length === 0 ? (
          <div className="text-center py-10 text-body-sm text-neutral-400 bg-white rounded-xl shadow-sm">
            Noch kein Programm vorhanden.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {patient.programs.map((prog) => (
              <div key={prog.id} className="bg-white rounded-xl shadow-sm p-5">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-body text-neutral-900">{prog.name}</h3>
                      <span className={`inline-flex items-center rounded-full text-xs px-2 py-0.5 ${
                        prog.status === 'active' ? 'bg-success-tint text-success'
                          : prog.status === 'paused' ? 'bg-warning-tint text-warning'
                          : 'bg-neutral-100 text-neutral-500'
                      }`}>
                        {STATUS_LABELS[prog.status]}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      {new Date(prog.startDate).toLocaleDateString('de-DE')}
                      {prog.endDate ? ` – ${new Date(prog.endDate).toLocaleDateString('de-DE')}` : ' – offen'}
                      {' · '}{prog.items.length} Übung{prog.items.length !== 1 ? 'en' : ''}
                      {prog._count?.logs !== undefined && ` · ${prog._count.logs} Einheiten protokolliert`}
                    </p>
                  </div>
                  <Link
                    to={`/programs/${prog.id}/edit`}
                    className="text-xs font-medium text-primary-700 hover:text-primary-800 flex-shrink-0"
                  >
                    Bearbeiten
                  </Link>
                </div>
                {prog.notes && (
                  <p className="text-body-sm text-neutral-600 mb-3 bg-neutral-50 rounded-md px-3 py-2">{prog.notes}</p>
                )}
                <ul className="divide-y divide-neutral-100">
                  {prog.items.map((item) => (
                    <li key={item.id} className="py-2.5 text-body-sm">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-neutral-700">{item.exercise.nameDe}</span>
                        <span className="text-neutral-400 tabular-nums flex-shrink-0">
                          {item.sets}×{item.reps}
                          {item.holdSeconds ? ` · ${item.holdSeconds}s` : ''}
                          {' · '}
                          {item.frequencyPerWeek}×/Woche
                        </span>
                      </div>
                      {(item.adaptations.length > 0 || item.therapistNote) && (
                        <div className="mt-1.5 flex flex-col gap-1">
                          {item.adaptations.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {item.adaptations.map((a) => (
                                <span
                                  key={a.id}
                                  className="inline-flex items-center rounded-full bg-success-tint text-success text-xs px-2 py-0.5"
                                >
                                  {a.labelDe}
                                </span>
                              ))}
                            </div>
                          )}
                          {item.therapistNote && (
                            <p className="text-xs text-neutral-500 italic">„{item.therapistNote}“</p>
                          )}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function ConsentSection({ patientId }: { patientId: string }) {
  const [events, setEvents] = useState<ConsentEvent[] | null>(null);
  const [hasValidConsent, setHasValidConsent] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [showForm, setShowForm] = useState(false);

  function load() {
    api
      .get<{ events: ConsentEvent[]; hasValidConsent: boolean }>(`/api/v1/patients/${patientId}/consent`)
      .then((d) => { setEvents(d.events); setHasValidConsent(d.hasValidConsent); })
      .catch(() => setLoadError('Einwilligungsstatus konnte nicht geladen werden.'));
  }

  useEffect(load, [patientId]);

  const statusLabel = events === null ? '…'
    : events.length === 0 ? 'Noch nicht erfasst'
    : hasValidConsent ? 'Erteilt'
    : events[0].type === 'revoked' ? 'Widerrufen'
    : 'Abgelehnt';
  const statusClass = hasValidConsent
    ? 'bg-success-tint text-success'
    : events && events.length > 0 ? 'bg-warning-tint text-warning' : 'bg-neutral-100 text-neutral-500';

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <h2 className="text-body-sm font-semibold text-neutral-700">Einwilligung zur Datennutzung</h2>
          <span className={`inline-flex items-center rounded-full text-xs px-2 py-0.5 mt-1 ${statusClass}`}>
            {statusLabel}
          </span>
        </div>
        <Button variant="secondary" onClick={() => setShowForm(true)} className="text-xs">
          Erfassen
        </Button>
      </div>

      {loadError && <p className="text-xs text-danger">{loadError}</p>}

      {events && events.length > 0 && (
        <ul className="flex flex-col gap-1.5 mt-2">
          {events.map((e) => (
            <li key={e.id} className="text-xs text-neutral-500 flex items-center justify-between gap-3">
              <span>
                <span className="font-medium text-neutral-700">{CONSENT_EVENT_LABELS[e.type]}</span>
                {' · '}Version {e.textVersion} · von {e.recordedBy.name}
              </span>
              <span className="tabular-nums flex-shrink-0">
                {new Date(e.occurredAt).toLocaleDateString('de-DE')}
              </span>
            </li>
          ))}
        </ul>
      )}

      {showForm && (
        <ConsentForm
          patientId={patientId}
          onDone={() => { setShowForm(false); load(); }}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  );
}

function ConsentForm({
  patientId,
  onDone,
  onCancel,
}: {
  patientId: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [type, setType] = useState<ConsentEventType>('granted');
  const [textVersion, setTextVersion] = useState<string>(CONSENT_TEXT_VERSIONS[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post(`/api/v1/patients/${patientId}/consent`, { type, textVersion });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Einwilligung konnte nicht erfasst werden.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title="Einwilligung erfassen"
      onClose={onCancel}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel}>Abbrechen</Button>
          <Button onClick={handleSubmit} loading={saving}>Speichern</Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-body-sm font-medium text-neutral-700">Entscheidung</label>
          <div className="flex gap-2">
            {(['granted', 'declined', 'revoked'] as ConsentEventType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`flex-1 rounded-md border px-3 py-2 text-body-sm ${
                  type === t
                    ? 'border-primary-500 bg-primary-50 text-primary-700 font-medium'
                    : 'border-neutral-300 text-neutral-600'
                }`}
              >
                {CONSENT_EVENT_LABELS[t]}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="textVersion" className="text-body-sm font-medium text-neutral-700">
            Version des Einwilligungstexts
          </label>
          <select
            id="textVersion"
            value={textVersion}
            onChange={(e) => setTextVersion(e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-body text-neutral-900 outline-none focus:ring-2 focus:ring-primary-500"
          >
            {CONSENT_TEXT_VERSIONS.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>
        {error && <p role="alert" aria-live="polite" className="text-xs text-danger">{error}</p>}
      </form>
    </Modal>
  );
}
