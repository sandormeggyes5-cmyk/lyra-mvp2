import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api/client.ts';
import { useAuth } from '../contexts/AuthContext.tsx';
import { Button } from '../components/ui/Button.tsx';
import { Input } from '../components/ui/Input.tsx';
import { Wordmark } from '../components/ui/Wordmark.tsx';

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
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Wordmark className="justify-center" />
          <p className="text-body-sm text-neutral-500 mt-2">Neue Praxis registrieren</p>
        </div>
        <div className="bg-white rounded-xl shadow-md p-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Praxisname"
              type="text"
              name="organization"
              autoComplete="organization"
              required
              placeholder="z. B. Physiotherapie Müller"
              value={practiceName}
              onChange={(e) => setPracticeName(e.target.value)}
            />
            <Input
              label="Ihr Name"
              type="text"
              name="name"
              autoComplete="name"
              required
              placeholder="Vor- und Nachname"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Input
              label="E-Mail"
              type="email"
              name="email"
              autoComplete="email"
              spellCheck={false}
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              label="Passwort"
              type="password"
              name="new-password"
              autoComplete="new-password"
              spellCheck={false}
              required
              minLength={8}
              placeholder="Mindestens 8 Zeichen"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {error && <p role="alert" aria-live="polite" className="text-body-sm text-danger">{error}</p>}
            <Button type="submit" loading={loading} className="w-full justify-center mt-1">
              Praxis registrieren
            </Button>
          </form>
        </div>
        <p className="text-center text-body-sm text-neutral-500 mt-4">
          Bereits registriert?{' '}
          <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
            Anmelden
          </Link>
        </p>
      </div>
    </div>
  );
}
