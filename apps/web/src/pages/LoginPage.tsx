import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, ApiError } from '../api/client.ts';
import { useAuth } from '../contexts/AuthContext.tsx';
import { Button } from '../components/ui/Button.tsx';
import { Input } from '../components/ui/Input.tsx';

export function LoginPage() {
  const { refetch } = useAuth();
  const navigate = useNavigate();

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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-blue-600">PhysioPilot</h1>
          <p className="text-slate-500 text-sm mt-1">Therapeuten-Login</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" loading={loading} className="w-full justify-center mt-1">
              Anmelden
            </Button>
          </form>
        </div>
        <p className="text-center text-sm text-slate-500 mt-4">
          Noch kein Konto?{' '}
          <Link to="/register" className="text-blue-600 hover:underline font-medium">
            Praxis registrieren
          </Link>
        </p>
      </div>
    </div>
  );
}
