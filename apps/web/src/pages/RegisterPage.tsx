import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api/client.ts';
import { useAuth } from '../contexts/AuthContext.tsx';
import { Button } from '../components/ui/Button.tsx';
import { Input } from '../components/ui/Input.tsx';

export function RegisterPage() {
  const { refetch } = useAuth();
  const navigate = useNavigate();

  const [practiceName, setPracticeName] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/api/v1/auth/register', { practiceName, adminName: name, email, password });
      await refetch();
      navigate('/');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.data?.error ?? 'Registrierung fehlgeschlagen.');
      } else {
        setError('Registrierung fehlgeschlagen. Bitte versuche es erneut.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-blue-600">PhysioPilot</h1>
          <p className="text-slate-500 text-sm mt-1">Neue Praxis registrieren</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Praxisname"
              type="text"
              autoComplete="organization"
              required
              placeholder="z. B. Physiotherapie Müller"
              value={practiceName}
              onChange={(e) => setPracticeName(e.target.value)}
            />
            <Input
              label="Ihr Name"
              type="text"
              autoComplete="name"
              required
              placeholder="Vor- und Nachname"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Input
              label="E-Mail"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              label="Passwort"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              placeholder="Mindestens 8 Zeichen"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" loading={loading} className="w-full justify-center mt-1">
              Praxis registrieren
            </Button>
          </form>
        </div>
        <p className="text-center text-sm text-slate-500 mt-4">
          Bereits registriert?{' '}
          <Link to="/login" className="text-blue-600 hover:underline font-medium">
            Anmelden
          </Link>
        </p>
      </div>
    </div>
  );
}
