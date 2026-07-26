import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError, setUnauthorizedHandler } from '../api/client.ts';
import type { User } from '../types.ts';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  refetch: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const refetch = useCallback(async () => {
    try {
      const data = await api.get<{ user: User }>('/api/v1/auth/me');
      setUser(data.user);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await api.post('/api/auth/sign-out').catch(() => undefined);
    setUser(null);
  }, []);

  // Greift bei JEDER fehlgeschlagenen /api/v1/*-Anfrage wegen ungültiger
  // Sitzung — nicht nur beim ersten Laden der Seite. Verhindert genau das
  // Symptom, das zu diesem Fix geführt hat: ein länger offener Tab zeigt
  // optisch noch "eingeloggt", bis eine Aktion (z. B. Patient anlegen) mit
  // der rohen Backend-Fehlermeldung fehlschlägt.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser((prev) => {
        // Nur wenn zuvor wirklich eine Sitzung bestand als "abgelaufen"
        // melden — sonst würde auch der allererste (nie eingeloggte)
        // Aufruf von /api/v1/auth/me fälschlich diese Meldung auslösen.
        if (prev) navigate('/login', { replace: true, state: { reason: 'session-expired' } });
        return null;
      });
    });
    return () => setUnauthorizedHandler(null);
  }, [navigate]);

  useEffect(() => { refetch(); }, [refetch]);

  return (
    <AuthContext.Provider value={{ user, loading, refetch, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
