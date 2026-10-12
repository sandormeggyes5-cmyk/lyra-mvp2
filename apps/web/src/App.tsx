import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { type ReactNode } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext.tsx';
import { LoginPage } from './pages/LoginPage.tsx';
import { RegisterPage } from './pages/RegisterPage.tsx';
import { DashboardPage } from './pages/DashboardPage.tsx';
import { PatientDetailPage } from './pages/PatientDetailPage.tsx';
import { PatientPortalPage } from './pages/PatientPortalPage.tsx';
import { ProgramBuilderPage } from './pages/ProgramBuilderPage.tsx';
import { ExerciseLibraryPage } from './pages/ExerciseLibraryPage.tsx';
import { Spinner } from './components/ui/Spinner.tsx';

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><Spinner className="py-0" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

// Nur für die Admin-Rolle — Freigabe fachlicher Inhalte ist Admin-Aufgabe
// (siehe docs/TASK_VALIDATION_UI.md).
function AdminRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><Spinner className="py-0" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/" replace />;
  return <>{children}</>;
}

function PublicOnlyRoute({ children: element }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><Spinner className="py-0" /></div>;
  if (user) return <Navigate to="/" replace />;
  return <>{element}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
      <Route path="/register" element={<PublicOnlyRoute><RegisterPage /></PublicOnlyRoute>} />
      <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/patients/:id" element={<ProtectedRoute><PatientDetailPage /></ProtectedRoute>} />
      <Route path="/patients/:patientId/programs/new" element={<ProtectedRoute><ProgramBuilderPage mode="create" /></ProtectedRoute>} />
      <Route path="/programs/:programId/edit" element={<ProtectedRoute><ProgramBuilderPage mode="edit" /></ProtectedRoute>} />
      <Route path="/exercises" element={<AdminRoute><ExerciseLibraryPage /></AdminRoute>} />
      <Route path="/p/:token" element={<PatientPortalPage />} />
      <Route path="*" element={<Placeholder title="404 — Seite nicht gefunden" />} />
    </Routes>
  );
}

function Placeholder({ title }: { title: string }) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center space-y-3">
        <h1 className="text-2xl font-semibold text-blue-700">PhysioPilot</h1>
        <p className="text-slate-500 text-sm">{title}</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
