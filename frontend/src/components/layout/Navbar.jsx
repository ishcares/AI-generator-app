import { Menu, X, Upload, Plus } from 'lucide-react';
import NotificationCenter from '../ui/NotificationCenter';

export default function Navbar({
  appName = '',
  subtitle = '',
  onToggleSidebar,
  sidebarOpen,
  onImportCSV,
  onAddRecord,
  showAppActions = false,
}) {
  return (
    <nav className="navbar">
      {/* Left — hamburger (mobile) + app name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
        <button
          className="btn btn-ghost btn-sm"
          onClick={onToggleSidebar}
          style={{ display: 'none', padding: '0.4rem', flexShrink: 0 }}
          id="sidebar-toggle"
          aria-label="Toggle sidebar"
        >
          {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
        </button>

        {appName ? (
          <div style={{ minWidth: 0 }}>
            <div className="navbar-title truncate">{appName}</div>
            {subtitle && <div className="navbar-subtitle truncate">{subtitle}</div>}
          </div>
        ) : (
          <div className="navbar-title">AppGen</div>
        )}
      </div>

      {/* Right — actions + notifications */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
        {showAppActions && (
          <>
            <button
              className="btn btn-outline btn-sm"
              onClick={onImportCSV}
              id="nav-import-csv-btn"
            >
              <Upload size={14} />
              Import CSV
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={onAddRecord}
              id="nav-add-record-btn"
            >
              <Plus size={14} />
              Add Record
            </button>
          </>
        )}
        <NotificationCenter />
      </div>

      <style>{`
        @media (max-width: 768px) {
          #sidebar-toggle { display: flex !important; }
        }
      `}</style>
    </nav>
  );
}
