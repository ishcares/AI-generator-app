import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import Sidebar from './components/layout/Sidebar';
import Navbar  from './components/layout/Navbar';
import ErrorBoundary from './components/ui/ErrorBoundary';
import LoadingSpinner from './components/ui/LoadingSpinner';
import LoginPage    from './pages/Login';
import RegisterPage from './pages/Register';
import DashboardPage from './pages/Dashboard';
import AppBuilderPage from './pages/AppBuilder';
import AppViewPage  from './pages/AppView';
import PWAInstallBanner from './components/ui/PWAInstallBanner';
import { useApps, useApp } from './hooks/useApp';

/* ── AppNavbar: shows app name & actions when inside an app ── */
function AppNavbar({ onToggleSidebar, sidebarOpen }) {
  const params = useParams();
  const appId  = params.appId || null;
  const { app } = useApp(appId);

  const entities = Array.isArray(app?.config?.entities) ? app.config.entities : [];
  const subtitle = entities.map((e) => e.name).join(', ');

  return (
    <Navbar
      appName={app?.name || ''}
      subtitle={subtitle}
      onToggleSidebar={onToggleSidebar}
      sidebarOpen={sidebarOpen}
      showAppActions={!!app}
    />
  );
}

/* ── Protected layout ────────────────────────────────────────── */
function AppLayout({ children, isAppView = false }) {
  const { apps } = useApps();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-layout">
      <Sidebar apps={apps} onClose={() => setSidebarOpen(false)} isOpen={sidebarOpen} />

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)',
            zIndex: 99,
          }}
          id="sidebar-overlay"
        />
      )}

      <div className="main-content">
        {isAppView ? (
          <AppNavbar
            onToggleSidebar={() => setSidebarOpen((o) => !o)}
            sidebarOpen={sidebarOpen}
          />
        ) : (
          <Navbar
            onToggleSidebar={() => setSidebarOpen((o) => !o)}
            sidebarOpen={sidebarOpen}
          />
        )}
        <main>
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}

/* ── Auth guards ─────────────────────────────────────────────── */
function PrivateRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <LoadingSpinner text="Authenticating…" />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <LoadingSpinner />;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return children;
}

/* ── Routes ─────────────────────────────────────────────────── */
function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* Public */}
      <Route path="/login"    element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />

      {/* Protected */}
      <Route path="/dashboard" element={
        <PrivateRoute>
          <AppLayout><DashboardPage /></AppLayout>
        </PrivateRoute>
      } />

      <Route path="/builder" element={
        <PrivateRoute>
          <AppLayout><AppBuilderPage /></AppLayout>
        </PrivateRoute>
      } />

      <Route path="/apps/:appId" element={
        <PrivateRoute>
          <AppLayout isAppView><AppViewPage /></AppLayout>
        </PrivateRoute>
      } />

      {/* Catch-all stubs */}
      <Route path="/notifications" element={
        <PrivateRoute>
          <AppLayout>
            <div className="page-content" style={{ textAlign: 'center', paddingTop: '3rem' }}>
              <h2 style={{ color: 'var(--color-text)' }}>Notifications</h2>
              <p className="text-muted text-sm" style={{ marginTop: '0.5rem' }}>
                Notifications appear in the bell icon at the top right.
              </p>
            </div>
          </AppLayout>
        </PrivateRoute>
      } />

      <Route path="/settings" element={
        <PrivateRoute>
          <AppLayout>
            <div className="page-content" style={{ textAlign: 'center', paddingTop: '3rem' }}>
              <h2 style={{ color: 'var(--color-text)' }}>Settings</h2>
              <p className="text-muted text-sm" style={{ marginTop: '0.5rem' }}>Settings coming soon.</p>
            </div>
          </AppLayout>
        </PrivateRoute>
      } />

      {/* 404 */}
      <Route path="*" element={
        <div className="page-content" style={{ paddingTop: '4rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '4rem', color: 'var(--color-primary)', fontWeight: 800 }}>404</h1>
          <p className="text-muted" style={{ marginTop: '0.5rem' }}>
            Page not found. <a href="/dashboard">Go home</a>
          </p>
        </div>
      } />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <ErrorBoundary title="Application Error" message="The application encountered a fatal error. Please refresh.">
            <AppRoutes />
            <PWAInstallBanner />
            <Toaster
              position="bottom-right"
              toastOptions={{
                duration: 3000,
                style: {
                  background: '#FFFFFF',
                  color: '#1A1A1A',
                  border: '1px solid #E5E5E5',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  fontFamily: 'Inter, system-ui, sans-serif',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  padding: '0.625rem 1rem',
                },
                success: {
                  iconTheme: { primary: '#0F6E56', secondary: 'white' },
                  style: { borderLeft: '3px solid #0F6E56' },
                },
                error: {
                  iconTheme: { primary: '#A32D2D', secondary: 'white' },
                  style: { borderLeft: '3px solid #A32D2D' },
                },
              }}
            />
          </ErrorBoundary>
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
