import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Spinner } from '../components/ui/Spinner.tsx';
import { Button } from '../components/ui/Button.tsx';
import { Modal } from '../components/ui/Modal.tsx';
import { ExerciseAvatar3D } from '../components/ExerciseAvatar3D.tsx';

// --- Typen ---
interface PortalExercise {
  id: string;
  nameDe: string;
  descriptionDe: string;
  videoUrl?: string | null;
  bodyRegion: string;
  difficulty: number;
}
interface PortalItem {
  id: string;
  order: number;
  sets: number;
  reps: number;
  holdSeconds?: number | null;
  frequencyPerWeek: number;
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
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-blue-600 text-white px-4 pt-8 pb-6">
        <p className="text-blue-200 text-sm mb-1">{data.patient.practice.name}</p>
        <h1 className="text-2xl font-bold">Hallo, {data.patient.name.split(' ')[0]}!</h1>
        <p className="text-blue-100 text-sm mt-1">Deine Übungsprogramme</p>
      </header>

      <main className="px-4 py-6 max-w-lg mx-auto flex flex-col gap-6">
        {data.programs.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-sm">
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
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Programm-Header */}
      <button
        className="w-full flex items-center justify-between px-5 py-4 text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <div>
          <p className="font-semibold text-slate-900">{program.name}</p>
          <p className="text-sm text-slate-400">{program.items.length} Übung{program.items.length !== 1 ? 'en' : ''}</p>
        </div>
        <svg
          className={`h-5 w-5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Übungsliste */}
      {open && (
        <div className="border-t border-slate-100">
          {program.notes && (
            <p className="px-5 py-3 text-sm text-slate-600 bg-slate-50 border-b border-slate-100">
              {program.notes}
            </p>
          )}
          <ul className="divide-y divide-slate-100">
            {program.items.map((item) => (
              <li key={item.id} className="px-5 py-3">
                <p className="font-medium text-slate-800 text-sm">{item.exercise.nameDe}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {item.sets} Sätze × {item.reps} Wdh.
                  {item.holdSeconds ? ` · ${item.holdSeconds}s halten` : ''}
                  {' · '}{item.frequencyPerWeek}× pro Woche
                </p>
                {item.exercise.descriptionDe && (
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    {item.exercise.descriptionDe}
                  </p>
                )}
                <ExerciseAvatar3D exerciseName={item.exercise.nameDe} />
              </li>
            ))}
          </ul>
          <div className="px-5 py-4 border-t border-slate-100">
            {logDone ? (
              <p className="text-sm text-green-600 font-medium text-center">Einheit protokolliert!</p>
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
              <label className="text-sm font-medium text-slate-700 block mb-2">
                Schmerzniveau (optional)
              </label>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400 w-4">0</span>
                <input
                  type="range" min={0} max={10} step={1}
                  value={painLevel ?? 0}
                  onChange={(e) => setPainLevel(Number(e.target.value))}
                  className="flex-1 accent-blue-600"
                />
                <span className="text-xs text-slate-400 w-4 text-right">10</span>
                <span className="text-sm font-semibold text-slate-700 w-6 text-right">
                  {painLevel ?? '–'}
                </span>
              </div>
              <div className="flex justify-between text-xs text-slate-400 mt-1 px-4">
                <span>Kein Schmerz</span>
                <span>Sehr stark</span>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">
                Notiz (optional)
              </label>
              <textarea
                rows={3}
                placeholder="Wie hat die Übung geklappt?"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
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
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-5 py-4 text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">K</div>
          <div>
            <p className="font-semibold text-slate-900">Kai — Übungsassistent</p>
            <p className="text-xs text-slate-400">Fragen zu deinen Übungen</p>
          </div>
        </div>
        <svg
          className={`h-5 w-5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-slate-100 flex flex-col" style={{ height: '420px' }}>
          {/* Nachrichten */}
          <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white rounded-br-sm'
                      : 'bg-slate-100 text-slate-800 rounded-bl-sm'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-slate-100 rounded-2xl rounded-bl-sm px-4 py-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Eingabe */}
          <div className="border-t border-slate-100 px-3 py-3 flex gap-2">
            {remaining !== null && (
              <span className="text-xs text-slate-400 self-center whitespace-nowrap">{remaining} übrig</span>
            )}
            <input
              type="text"
              placeholder={limitReached ? 'Tageslimit erreicht' : 'Nachricht an Kai…'}
              disabled={limitReached || loading}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-50 disabled:text-slate-400"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading || limitReached}
              className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center disabled:opacity-40 flex-shrink-0"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
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
  return <div className="min-h-screen bg-slate-50 flex items-center justify-center">{children}</div>;
}

function ErrorPage({ title, message }: { title: string; message: string }) {
  return (
    <FullPage>
      <div className="text-center px-6 max-w-sm">
        <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
          <svg className="h-7 w-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <h1 className="text-lg font-semibold text-slate-900 mb-2">{title}</h1>
        <p className="text-sm text-slate-500 leading-relaxed">{message}</p>
      </div>
    </FullPage>
  );
}
