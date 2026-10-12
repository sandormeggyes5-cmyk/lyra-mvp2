import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, ApiError } from '../api/client.ts';
import type { PatientDetail } from '../types.ts';
import { AppLayout } from '../components/layout/AppLayout.tsx';
import { Button } from '../components/ui/Button.tsx';
import { Spinner } from '../components/ui/Spinner.tsx';

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
                    <h3 className="font-medium text-body text-neutral-900">{prog.name}</h3>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      Erstellt: {new Date(prog.createdAt).toLocaleDateString('de-DE')} · {prog.items.length} Übung{prog.items.length !== 1 ? 'en' : ''}
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
