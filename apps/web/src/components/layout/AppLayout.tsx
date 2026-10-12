import { type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.tsx';
import { Button } from '../ui/Button.tsx';
import { Wordmark } from '../ui/Wordmark.tsx';

export function AppLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-primary-600 focus:text-white focus:px-4 focus:py-2 focus:text-body-sm"
      >
        Zum Inhalt springen
      </a>
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <Wordmark size="sm" />
            {user?.name && (
              <span className="hidden sm:inline text-neutral-400 text-body-sm">— {user.name}</span>
            )}
          </Link>
          <div className="flex items-center gap-4">
            {user?.role === 'admin' && (
              <Link to="/exercises" className="text-body-sm text-neutral-600 hover:text-primary-700 transition-colors duration-base">
                Übungs-Bibliothek
              </Link>
            )}
            <span className="text-body-sm text-neutral-500 hidden sm:block">{user?.email}</span>
            <Button variant="ghost" onClick={handleLogout} className="text-body-sm">
              Abmelden
            </Button>
          </div>
        </div>
      </header>
      <main id="main-content" className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">{children}</main>
    </div>
  );
}
