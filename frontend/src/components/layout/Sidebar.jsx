import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Zap, LayoutDashboard, AppWindow, Code2, Table2, FileUp,
  Bell, Settings, User, LogOut, ChevronRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';

export default function Sidebar({ apps = [], onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { unreadCount } = useNotifications();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  // Determine if we're inside an app view to show active app context
  const activeAppId = location.pathname.startsWith('/apps/')
    ? location.pathname.split('/')[2]
    : null;

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <Zap size={16} />
        </div>
        <span className="sidebar-logo-text">AppGen</span>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        <NavLink
          to="/dashboard"
          className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
          onClick={onClose}
        >
          <LayoutDashboard size={16} />
          <span>Dashboard</span>
        </NavLink>

        <NavLink
          to="/dashboard"
          end={false}
          className={`sidebar-item`}
          onClick={onClose}
          style={{ pointerEvents: 'none', opacity: 0.99 }}
        >
          <AppWindow size={16} />
          <span>My Apps</span>
          {apps.length > 0 && (
            <span className="sidebar-item-badge badge-count">
              {apps.length}
            </span>
          )}
        </NavLink>

        <NavLink
          to="/builder"
          className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
          onClick={onClose}
        >
          <Code2 size={16} />
          <span>JSON Editor</span>
        </NavLink>

        {/* Show Records & CSV Import only when in an app */}
        {activeAppId && (
          <>
            <NavLink
              to={`/apps/${activeAppId}?view=table`}
              className={`sidebar-item`}
              onClick={onClose}
            >
              <Table2 size={16} />
              <span>Records</span>
            </NavLink>

            <NavLink
              to={`/apps/${activeAppId}?view=csv`}
              className={`sidebar-item`}
              onClick={onClose}
            >
              <FileUp size={16} />
              <span>CSV Import</span>
            </NavLink>
          </>
        )}

        <NavLink
          to="/notifications"
          className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
          onClick={onClose}
          style={{ position: 'relative' }}
        >
          <Bell size={16} />
          <span>Notifications</span>
          {unreadCount > 0 && (
            <span className="sidebar-item-badge badge-notif">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </NavLink>

        <NavLink
          to="/settings"
          className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
          onClick={onClose}
        >
          <Settings size={16} />
          <span>Settings</span>
        </NavLink>

        {/* App list */}
        {apps.length > 0 && (
          <>
            <p className="sidebar-section-title">My Apps</p>
            {apps.map((app) => (
              <NavLink
                key={app.id}
                to={`/apps/${app.id}`}
                className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
                onClick={onClose}
              >
                <span style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: 'var(--color-primary)', flexShrink: 0
                }} />
                <span className="truncate">{app.name}</span>
                <ChevronRight size={12} style={{ marginLeft: 'auto', opacity: 0.4, flexShrink: 0 }} />
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-avatar">
            {user?.email?.[0]?.toUpperCase() || 'U'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text)' }} className="truncate">
              {user?.email || 'User'}
            </p>
            <p style={{ fontSize: '0.7rem', color: 'var(--color-text-3)' }}>Free plan</p>
          </div>
          <User size={14} style={{ color: 'var(--color-text-3)', flexShrink: 0 }} />
        </div>
        <button
          className="sidebar-item"
          onClick={handleLogout}
          style={{ color: 'var(--color-error)', marginTop: 2 }}
        >
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
