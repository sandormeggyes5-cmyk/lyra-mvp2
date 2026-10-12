import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api/client.ts';
import { useAuth } from '../contexts/AuthContext.tsx';
import { Button } from '../components/ui/Button.tsx';
import { Input } from '../components/ui/Input.tsx';
import { Wordmark } from '../components/ui/Wordmark.tsx';

export function LoginPage() {
  const { refetch } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const sessionExpired = (location.state as { reason?: string } | null)?.reason === 'session-expired';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/api/auth/sign-in/email', { email, password, rememberMe: true });
      await refetch();
      navigate('/');
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError('E-Mail oder Passwort ist falsch.');
      } else {
        setError('Anmeldung fehlgeschlagen. Bitte versuche es erneut.');
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
          <p className="text-body-sm text-neutral-500 mt-2">Therapeuten-Login</p>
        </div>
        <div className="bg-white rounded-xl shadow-md p-6">
          {sessionExpired && (
            <p className="text-body-sm text-warning bg-warning-tint rounded-md px-3 py-2 mb-4">
              Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.
            </p>
          )}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
              name="password"
              autoComplete="current-password"
              spellCheck={false}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {error && <p role="alert" aria-live="polite" className="text-body-sm text-danger">{error}</p>}
            <Button type="submit" loading={loading} className="w-full justify-center mt-1">
              Anmelden
            </Button>
          </form>
        </div>
        <p className="text-center text-body-sm text-neutral-500 mt-4">
          Noch kein Konto?{' '}
          <Link to="/register" className="text-primary-600 hover:text-primary-700 font-medium">
            Praxis registrieren
          </Link>
        </p>
      </div>
    </div>
  );
}
