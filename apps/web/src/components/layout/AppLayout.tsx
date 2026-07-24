import { type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.tsx';
import { Button } from '../ui/Button.tsx';

export function AppLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-blue-600 font-bold text-lg tracking-tight">PhysioPilot</span>
            {user?.name && (
              <span className="hidden sm:inline text-slate-400 text-sm">— {user.name}</span>
            )}
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500 hidden sm:block">{user?.email}</span>
            <Button variant="ghost" onClick={handleLogout} className="text-sm">
              Abmelden
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">{children}</main>
    </div>
  );
}
