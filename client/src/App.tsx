import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AuthProvider, useAuth, canAccess } from "@/lib/auth";
import { AppShell } from "@/components/layout/AppShell";
import { GlobalLoaderProvider } from "@/components/ui-bits/GlobalLoader";
import { Toaster } from "sonner";

// Pages
import LoginPage from "@/routes/login";
import DashboardPage from "@/routes/_app.dashboard";
import BookingsPage from "@/routes/_app.bookings";
import IncomePage from "@/routes/_app.income";
import ExpensesPage from "@/routes/_app.expenses";
import ReportsPage from "@/routes/_app.reports";
import UsersPage from "@/routes/_app.users";
import ActivityPage from "@/routes/_app.activity";
import ProfilePage from "@/routes/_app.profile";
import SettingsPage from "@/routes/_app.settings";
import IndexPage from "@/routes/index";

function ProtectedRoute({ children, route }: { children: React.ReactNode; route: string }) {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!canAccess(user.role, route)) return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
}

export default function App() {
  useEffect(() => {
    // Service Worker Registration for PWA support
    if ('serviceWorker' in navigator && import.meta.env.PROD) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(err => {
          console.error('SW registration failed:', err);
        });
      });
    }
  }, []);

  return (
    <BrowserRouter>
      <GlobalLoaderProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            
            <Route element={
              <ProtectedRoute route="/">
                <AppShell><Outlet /></AppShell>
              </ProtectedRoute>
            }>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/bookings" element={<BookingsPage />} />
              <Route path="/income" element={<IncomePage />} />
              <Route path="/expenses" element={<ExpensesPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/activity" element={<ActivityPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>

            <Route path="/" element={<IndexPage />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
          <Toaster position="top-right" richColors closeButton />
        </AuthProvider>
      </GlobalLoaderProvider>
    </BrowserRouter>
  );
}
