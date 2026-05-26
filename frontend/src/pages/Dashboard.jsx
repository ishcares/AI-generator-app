import { Link } from 'react-router-dom';
import { useApps } from '../hooks/useApp';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { PlusCircle, AppWindow, Trash2, Calendar, LayoutDashboard, Table2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNotifications } from '../context/NotificationContext';

function AppCard({ app, onDelete }) {
  const entityCount = Array.isArray(app.config?.entities) ? app.config.entities.length : 0;
  const viewCount   = Array.isArray(app.config?.views)    ? app.config.views.length   : 0;

  async function handleDelete(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm(`Delete "${app.name}"? This cannot be undone.`)) return;
    await onDelete(app.id);
  }

  return (
    <Link to={`/apps/${app.id}`} style={{ textDecoration: 'none' }}>
      <div
        className="card"
        style={{ cursor: 'pointer', position: 'relative', transition: 'transform 0.15s ease, box-shadow 0.15s ease' }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = 'var(--shadow-md)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '';
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{
            width: 40, height: 40, borderRadius: 'var(--radius-md)',
            background: 'var(--color-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', flexShrink: 0,
          }}>
            <AppWindow size={18} />
          </div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={handleDelete}
            id={`delete-app-${app.id}`}
            title="Delete app"
            style={{ color: 'var(--color-error)', padding: '0.3rem' }}
          >
            <Trash2 size={14} />
          </button>
        </div>

        <h3 style={{ fontSize: '0.9375rem', marginBottom: '0.25rem', fontWeight: 600 }}>{app.name}</h3>
        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-3)', marginBottom: '0.875rem' }}>
          {entityCount} {entityCount === 1 ? 'entity' : 'entities'} · {viewCount} views
        </p>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--color-text-3)', fontSize: '0.7rem' }}>
            <Calendar size={11} />
            {new Date(app.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
          <span className="badge badge-primary" style={{ fontSize: '0.65rem' }}>
            <Table2 size={9} /> {entityCount} {entityCount === 1 ? 'entity' : 'entities'}
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  const { apps, loading, error, deleteApp } = useApps();
  const { notify } = useNotifications();

  async function handleDelete(id) {
    try {
      await deleteApp(id);
      toast.success('App deleted.');
      notify.info('App Deleted', 'The app and all its records have been removed.');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Delete failed.');
    }
  }

  if (loading) {
    return <div className="page-content"><LoadingSpinner text="Loading your apps…" /></div>;
  }

  return (
    <div className="page-content">
      {/* Header */}
      <div className="section-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.375rem', fontWeight: 700, marginBottom: '0.2rem' }}>My Apps</h1>
          <p className="text-muted text-sm">
            {apps.length === 0 ? 'No apps yet — create your first one!' : `${apps.length} app${apps.length === 1 ? '' : 's'} created`}
          </p>
        </div>
        <Link to="/builder" className="btn btn-primary" id="new-app-btn">
          <PlusCircle size={15} />
          New App
        </Link>
      </div>

      {error && (
        <div className="card" style={{ borderColor: 'var(--color-error)', background: 'var(--color-error-bg)', padding: '0.875rem 1rem', marginBottom: '1rem' }}>
          <p style={{ color: 'var(--color-error-text)', fontSize: '0.875rem' }}>{error}</p>
        </div>
      )}

      {apps.length === 0 ? (
        <div className="empty-state card" style={{ minHeight: 280 }}>
          <div className="empty-state-icon">
            <LayoutDashboard size={28} />
          </div>
          <h3>No apps yet</h3>
          <p className="text-muted text-sm" style={{ maxWidth: 360 }}>
            Create your first app by providing a JSON configuration. AppGen will generate a fully working application instantly.
          </p>
          <Link to="/builder" className="btn btn-primary" style={{ marginTop: '0.5rem' }}>
            <PlusCircle size={15} /> Build Your First App
          </Link>
        </div>
      ) : (
        <div className="grid-3">
          {apps.map((app) => (
            <AppCard key={app.id} app={app} onDelete={handleDelete} />
          ))}

          {/* Create New App card */}
          <Link to="/builder" style={{ textDecoration: 'none' }}>
            <div
              className="card"
              style={{
                cursor: 'pointer',
                border: '1.5px dashed var(--color-border-2)',
                background: 'transparent',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.625rem',
                minHeight: 170,
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-primary)';
                e.currentTarget.style.background = 'var(--color-primary-light)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-border-2)';
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <PlusCircle size={24} style={{ color: 'var(--color-text-3)' }} />
              <p style={{ fontWeight: 600, color: 'var(--color-text-3)', fontSize: '0.875rem' }}>Create New App</p>
            </div>
          </Link>
        </div>
      )}
    </div>
  );
}
