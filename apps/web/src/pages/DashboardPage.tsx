import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../api/client.ts';
import type { Patient } from '../types.ts';
import { AppLayout } from '../components/layout/AppLayout.tsx';
import { Button } from '../components/ui/Button.tsx';
import { Input } from '../components/ui/Input.tsx';
import { Modal } from '../components/ui/Modal.tsx';
import { Spinner } from '../components/ui/Spinner.tsx';

type CreateStep = 'form' | 'link';

interface CreateForm {
  name: string;
  emailOrPhone: string;
  dateOfBirth: string;
}

export function DashboardPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [createStep, setCreateStep] = useState<CreateStep>('form');
  const [createForm, setCreateForm] = useState<CreateForm>({ name: '', emailOrPhone: '', dateOfBirth: '' });
  const [createError, setCreateError] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [newPatient, setNewPatient] = useState<Patient | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchPatients = useCallback(async () => {
    setLoading(true);
    try {
      const params = debouncedSearch ? `?search=${encodeURIComponent(debouncedSearch)}` : '';
      const data = await api.get<{ patients: Patient[] }>(`/api/v1/patients${params}`);
      setPatients(data.patients);
    } catch {
      // stay with empty list on error
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => { fetchPatients(); }, [fetchPatients]);

  function openCreateModal() {
    setCreateStep('form');
    setCreateForm({ name: '', emailOrPhone: '', dateOfBirth: '' });
    setCreateError('');
    setNewPatient(null);
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    if (createStep === 'link') fetchPatients();
  }

  async function handleCreate() {
    if (!createForm.name.trim()) {
      setCreateError('Name ist erforderlich.');
      return;
    }
    setCreateError('');
    setCreateLoading(true);
    try {
      const body: Record<string, string> = { name: createForm.name.trim() };
      if (createForm.emailOrPhone.trim()) body.emailOrPhone = createForm.emailOrPhone.trim();
      if (createForm.dateOfBirth) body.dateOfBirth = createForm.dateOfBirth;
      const data = await api.post<{ patient: Patient }>('/api/v1/patients', body);
      setNewPatient(data.patient);
      setCreateStep('link');
    } catch (err) {
      if (err instanceof ApiError) {
        setCreateError(err.data?.error ?? 'Patient konnte nicht angelegt werden.');
      } else {
        setCreateError('Patient konnte nicht angelegt werden.');
      }
    } finally {
      setCreateLoading(false);
    }
  }

  async function copyLink() {
    if (!newPatient?.magicLink) return;
    await navigator.clipboard.writeText(newPatient.magicLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-display-md text-neutral-900">Patienten</h1>
        <Button onClick={openCreateModal}>+ Patient anlegen</Button>
      </div>

      <div className="mb-4">
        <Input
          aria-label="Patienten suchen"
          placeholder="Suche nach Name, E-Mail, Telefon …"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <Spinner />
      ) : patients.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl shadow-sm">
          <svg aria-hidden="true" className="h-10 w-10 mx-auto mb-3 text-primary-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-4.13a4 4 0 100-8 4 4 0 000 8zm6 4.13a4 4 0 00-3-3.87M9 11.13a4 4 0 00-3 3.87" />
          </svg>
          <p className="text-body text-neutral-500">
            {debouncedSearch ? 'Keine Treffer.' : 'Noch keine Patienten. Lege den ersten an!'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm divide-y divide-neutral-100 overflow-hidden">
          {patients.map((p) => (
            <Link
              key={p.id}
              to={`/patients/${p.id}`}
              className="flex items-center justify-between px-5 py-4 hover:bg-neutral-50 transition-colors duration-base"
            >
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-primary-50 text-primary-700 flex items-center justify-center text-body-sm font-medium flex-shrink-0">
                  {p.name.slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-body text-neutral-900">{p.name}</p>
                  {p.emailOrPhone && <p className="text-body-sm text-neutral-500">{p.emailOrPhone}</p>}
                </div>
              </div>
              <div className="flex items-center gap-4 text-body-sm text-neutral-400">
                {p._count !== undefined && (
                  <span>{p._count.programs} Programm{p._count.programs !== 1 ? 'e' : ''}</span>
                )}
                <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      )}

      {showModal && (
        <Modal
          title={createStep === 'form' ? 'Patient anlegen' : 'Portal-Link'}
          onClose={closeModal}
          footer={
            createStep === 'form' ? (
              <>
                <Button variant="secondary" onClick={closeModal}>Abbrechen</Button>
                <Button onClick={handleCreate} loading={createLoading}>Anlegen</Button>
              </>
            ) : (
              <Button onClick={closeModal}>Fertig</Button>
            )
          }
        >
          {createStep === 'form' ? (
            <div className="flex flex-col gap-4">
              <Input
                label="Name *"
                value={createForm.name}
                onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                autoFocus
              />
              <Input
                label="E-Mail oder Telefon"
                value={createForm.emailOrPhone}
                onChange={(e) => setCreateForm((f) => ({ ...f, emailOrPhone: e.target.value }))}
              />
              <Input
                label="Geburtsdatum"
                type="date"
                value={createForm.dateOfBirth}
                onChange={(e) => setCreateForm((f) => ({ ...f, dateOfBirth: e.target.value }))}
              />
              {createError && <p role="alert" aria-live="polite" className="text-body-sm text-danger">{createError}</p>}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <p className="text-body-sm text-neutral-600">
                Patient <strong>{newPatient?.name}</strong> wurde angelegt. Sende diesen Link an den Patienten:
              </p>
              <div className="bg-neutral-50 rounded-md border border-neutral-200 px-4 py-3 break-all text-xs text-neutral-700 font-mono">
                {newPatient?.magicLink}
              </div>
              <Button variant="secondary" onClick={copyLink} className="w-full justify-center">
                {copied ? 'Kopiert!' : 'Link kopieren'}
              </Button>
              <p className="text-xs text-neutral-400">
                Der Link ist 90 Tage gültig und kann jederzeit erneuert werden.
              </p>
            </div>
          )}
        </Modal>
      )}
    </AppLayout>
  );
}
