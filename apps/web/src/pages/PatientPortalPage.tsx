import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Spinner } from '../components/ui/Spinner.tsx';
import { Button } from '../components/ui/Button.tsx';
import { Modal } from '../components/ui/Modal.tsx';
import { ExerciseAvatar3D } from '../components/ExerciseAvatar3D.tsx';
import { MuscleMap } from '../components/MuscleMap.tsx';

// --- Typen ---
interface PortalExercise {
  id: string;
  nameDe: string;
  descriptionDe: string;
  videoUrl?: string | null;
  bodyRegion: string;
  muscleGroups: string[];
  difficulty: number;
}
interface PortalAdaptation {
  id: string;
  labelDe: string;
  instructionDe: string;
  category: string;
}
interface PortalItem {
  id: string;
  order: number;
  sets: number;
  reps: number;
  holdSeconds?: number | null;
  frequencyPerWeek: number;
  therapistNote?: string | null;
  adaptations: PortalAdaptation[];
  exercise: PortalExercise;
}
interface PortalProgram {
  id: string;
  name: string;
  notes?: string | null;
  items: PortalItem[];
}
interface PortalData {
  patient: { id: string; name: string; practice: { name: string } };
  programs: PortalProgram[];
}
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// --- Hauptseite ---
export function PatientPortalPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<PortalData | null>(null);
  const [status, setStatus] = useState<'loading' | 'ok' | 'expired' | 'invalid'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!token) return;
    fetch(`/api/v1/p/${token}`)
      .then(async (r) => {
        const json = await r.json();
        if (r.ok) { setData(json); setStatus('ok'); }
        else if (r.status === 410) { setErrorMsg(json.error); setStatus('expired'); }
        else { setStatus('invalid'); }
      })
      .catch(() => setStatus('invalid'));
  }, [token]);

  if (status === 'loading') return <FullPage><Spinner /></FullPage>;
  if (status === 'expired') return <ErrorPage title="Link abgelaufen" message={errorMsg} />;
  if (status === 'invalid' || !data) return <ErrorPage title="Ungültiger Link" message="Dieser Link ist nicht gültig. Bitte wende dich an deine Praxis." />;

  return <Portal data={data} token={token!} />;
}

// --- Portal-Inhalt ---
function Portal({ data, token }: { data: PortalData; token: string }) {
  return (
    <div className="min-h-screen bg-neutral-25">
      {/* Header */}
      <header className="bg-primary-600 text-white px-5 pt-10 pb-8 rounded-b-3xl">
        <p className="text-primary-100 text-body-sm mb-1">{data.patient.practice.name}</p>
        <h1 className="font-display text-display-sm">Hallo, {data.patient.name.split(' ')[0]}!</h1>
        <p className="text-primary-100 text-body-sm mt-1">Deine Übungsprogramme</p>
      </header>

      <main className="px-4 py-6 max-w-lg mx-auto flex flex-col gap-4 -mt-4">
        {data.programs.length === 0 ? (
          <div className="text-center py-10 text-body-sm text-neutral-400 bg-white rounded-xl shadow-sm">
            Dein Therapeut hat noch kein Programm für dich erstellt.
          </div>
        ) : (
          data.programs.map((program) => (
            <ProgramCard key={program.id} program={program} token={token} />
          ))
        )}

        {/* Kai Chat */}
        <KaiChat token={token} patientName={data.patient.name} programs={data.programs} />
      </main>
    </div>
  );
}

// --- Programm-Karte ---
function ProgramCard({ program, token }: { program: PortalProgram; token: string }) {
  const [open, setOpen] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [logLoading, setLogLoading] = useState(false);
  const [logDone, setLogDone] = useState(false);
  const [painLevel, setPainLevel] = useState<number | null>(null);
  const [note, setNote] = useState('');

  async function handleLog() {
    setLogLoading(true);
    try {
      await Promise.all(
        program.items.map((item) =>
          fetch(`/api/v1/p/${token}/log`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              programId: program.id,
              exerciseId: item.exercise.id,
              painLevel: painLevel ?? undefined,
              note: note.trim() || undefined,
            }),
          })
        )
      );
      setLogDone(true);
      setShowLog(false);
    } catch {
      // noop
    } finally {
      setLogLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      {/* Programm-Header */}
      <button
        className="w-full flex items-center justify-between px-5 py-4 text-left"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div>
          <p className="font-display font-semibold text-neutral-900">{program.name}</p>
          <p className="text-body-sm text-neutral-400">{program.items.length} Übung{program.items.length !== 1 ? 'en' : ''}</p>
        </div>
        <svg
          aria-hidden="true"
          className={`h-5 w-5 text-neutral-400 transition-transform duration-base ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Übungsliste */}
      {open && (
        <div className="border-t border-neutral-100">
          {program.notes && (
            <p className="px-5 py-3 text-body-sm text-neutral-600 bg-neutral-50 border-b border-neutral-100">
              {program.notes}
            </p>
          )}
          <ul className="divide-y divide-neutral-100">
            {program.items.map((item) => (
              <li key={item.id} className="px-5 py-3">
                <p className="font-medium text-body-sm text-neutral-800">{item.exercise.nameDe}</p>
                <p className="text-xs text-neutral-400 mt-0.5">
                  {item.sets} Sätze × {item.reps} Wdh.
                  {item.holdSeconds ? ` · ${item.holdSeconds}s halten` : ''}
                  {' · '}{item.frequencyPerWeek}× pro Woche
                </p>
                {item.exercise.descriptionDe && (
                  <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                    {item.exercise.descriptionDe}
                  </p>
                )}
                <ExerciseAvatar3D exerciseName={item.exercise.nameDe} />
                <MuscleMap mode="display" muscles={item.exercise.muscleGroups} className="mt-3" />

                {item.adaptations.length > 0 && (
                  <div className="mt-3 bg-primary-50 border border-primary-100 rounded-lg px-3 py-2.5">
                    <p className="text-xs font-semibold text-primary-700 mb-1.5">Für dich angepasst</p>
                    <ul className="flex flex-col gap-1.5">
                      {item.adaptations.map((a) => (
                        <li key={a.id} className="text-xs text-primary-900 leading-relaxed">
                          <span className="font-medium">{a.labelDe}:</span> {a.instructionDe}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {item.therapistNote && (
                  <div className="mt-2">
                    <p className="text-xs font-semibold text-neutral-500 mb-0.5">Anmerkung deiner Praxis</p>
                    <p className="text-xs text-neutral-600 italic leading-relaxed">{item.therapistNote}</p>
                  </div>
                )}
              </li>
            ))}
          </ul>
          <div className="px-5 py-4 border-t border-neutral-100">
            {logDone ? (
              <p className="text-body-sm text-success font-medium text-center">Einheit protokolliert!</p>
            ) : (
              <Button onClick={() => setShowLog(true)} className="w-full justify-center">
                Einheit erledigt
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Log-Modal */}
      {showLog && (
        <Modal
          title="Einheit protokollieren"
          onClose={() => setShowLog(false)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setShowLog(false)}>Abbrechen</Button>
              <Button onClick={handleLog} loading={logLoading}>Speichern</Button>
            </>
          }
        >
          <div className="flex flex-col gap-5">
            <div>
              <label htmlFor="pain-level" className="text-body-sm font-medium text-neutral-700 block mb-2">
                Schmerzniveau (optional)
              </label>
              <div className="flex items-center gap-3">
                <span className="text-xs text-neutral-400 w-4">0</span>
                <input
                  id="pain-level"
                  type="range" min={0} max={10} step={1}
                  value={painLevel ?? 0}
                  onChange={(e) => setPainLevel(Number(e.target.value))}
                  className="flex-1 accent-primary-600"
                />
                <span className="text-xs text-neutral-400 w-4 text-right">10</span>
                <span className="text-body-sm font-semibold text-neutral-700 w-6 text-right">
                  {painLevel ?? '–'}
                </span>
              </div>
              <div className="flex justify-between text-xs text-neutral-400 mt-1 px-4">
                <span>Kein Schmerz</span>
                <span>Sehr stark</span>
              </div>
            </div>
            <div>
              <label htmlFor="session-note" className="text-body-sm font-medium text-neutral-700 block mb-1">
                Notiz (optional)
              </label>
              <textarea
                id="session-note"
                rows={3}
                placeholder="Wie hat die Übung geklappt?"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-body-sm text-neutral-900 placeholder:text-neutral-400 outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// --- Kai Chat ---
function KaiChat({ token, patientName, programs }: { token: string; patientName: string; programs: PortalProgram[] }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: `Hallo ${patientName.split(' ')[0]}! Ich bin Kai, dein Übungsassistent. Ich kann dir bei Fragen zu deinen Übungen helfen. Wie kann ich dir helfen?` },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [limitReached, setLimitReached] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    setMessages((m) => [...m, { role: 'user', content: text }]);
    setLoading(true);

    try {
      const r = await fetch(`/api/v1/p/${token}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      const json = await r.json();
      if (r.status === 429) {
        setLimitReached(true);
        setMessages((m) => [...m, { role: 'assistant', content: json.error }]);
      } else if (r.ok) {
        setMessages((m) => [...m, { role: 'assistant', content: json.content }]);
        setRemaining(json.remainingToday);
      } else {
        setMessages((m) => [...m, { role: 'assistant', content: 'Entschuldigung, ich bin gerade nicht erreichbar. Versuche es später.' }]);
      }
    } catch {
      setMessages((m) => [...m, { role: 'assistant', content: 'Entschuldigung, ich bin gerade nicht erreichbar. Versuche es später.' }]);
    } finally {
      setLoading(false);
    }
  }

  // suppress unused warning
  void programs;

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-5 py-4 text-left"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div className="flex items-center gap-3">
          <div aria-hidden="true" className="w-9 h-9 rounded-full bg-accent-tint flex items-center justify-center text-accent-600 font-display font-semibold text-sm">K</div>
          <div>
            <p className="font-display font-semibold text-neutral-900">Kai — Übungsassistent</p>
            <p className="text-xs text-neutral-400">Fragen zu deinen Übungen</p>
          </div>
        </div>
        <svg
          aria-hidden="true"
          className={`h-5 w-5 text-neutral-400 transition-transform duration-base ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-neutral-100 flex flex-col" style={{ height: '420px' }}>
          {/* Nachrichten */}
          <div aria-live="polite" className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3 overscroll-contain">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2.5 text-body-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-primary-600 text-white rounded-br-sm'
                      : 'bg-accent-tint text-neutral-800 rounded-bl-sm'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-accent-tint rounded-lg rounded-bl-sm px-4 py-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-accent-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-accent-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-accent-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Eingabe */}
          <div className="border-t border-neutral-100 px-3 py-3 flex gap-2">
            {remaining !== null && (
              <span className="text-xs text-neutral-400 self-center whitespace-nowrap">{remaining} übrig</span>
            )}
            <input
              type="text"
              aria-label="Nachricht an Kai"
              placeholder={limitReached ? 'Tageslimit erreicht' : 'Nachricht an Kai…'}
              disabled={limitReached || loading}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-body-sm outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-neutral-50 disabled:text-neutral-400"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading || limitReached}
              aria-label="Nachricht senden"
              className="w-9 h-9 rounded-md bg-primary-600 text-white flex items-center justify-center disabled:opacity-40 flex-shrink-0"
            >
              <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Hilfskomponenten ---
function FullPage({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-neutral-25 flex items-center justify-center">{children}</div>;
}

function ErrorPage({ title, message }: { title: string; message: string }) {
  return (
    <FullPage>
      <div className="text-center px-6 max-w-sm">
        <div className="w-14 h-14 rounded-full bg-danger-tint flex items-center justify-center mx-auto mb-4">
          <svg aria-hidden="true" className="h-7 w-7 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <h1 className="font-display text-headline text-neutral-900 mb-2">{title}</h1>
        <p className="text-body-sm text-neutral-500 leading-relaxed">{message}</p>
      </div>
    </FullPage>
  );
}
