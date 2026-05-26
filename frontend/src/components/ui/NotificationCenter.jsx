import { useState, useRef, useEffect } from 'react';
import { Bell, CheckCheck, Trash2, Info, AlertTriangle, CheckCircle, XCircle, X } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';

function typeIcon(type) {
  const style = { flexShrink: 0 };
  switch (type) {
    case 'success': return <CheckCircle  size={14} style={{ ...style, color: 'var(--color-success)' }} />;
    case 'error':   return <XCircle      size={14} style={{ ...style, color: 'var(--color-error)' }} />;
    case 'warning': return <AlertTriangle size={14} style={{ ...style, color: 'var(--color-warning)' }} />;
    default:        return <Info         size={14} style={{ ...style, color: 'var(--color-primary)' }} />;
  }
}

function timeAgo(date) {
  const diff = Math.floor((Date.now() - new Date(date)) / 1000);
  if (diff < 60)   return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(date).toLocaleDateString();
}

export default function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const { notifications, unreadCount, markAllRead, dismiss, clearAll, markRead } = useNotifications();

  // Close on outside click
  useEffect(() => {
    function handle(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Bell button */}
      <button
        id="notification-btn"
        className="btn btn-ghost btn-sm"
        onClick={() => setOpen((o) => !o)}
        style={{ padding: '0.4rem', position: 'relative' }}
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="notif-panel">
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0.75rem 1rem', borderBottom: '1px solid var(--color-border)',
          }}>
            <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-text)' }}>
              Notifications
              {unreadCount > 0 && (
                <span className="badge badge-error" style={{ marginLeft: '0.5rem', fontSize: '0.65rem' }}>
                  {unreadCount} new
                </span>
              )}
            </span>
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              {unreadCount > 0 && (
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={markAllRead}
                  title="Mark all read"
                  style={{ padding: '0.3rem', fontSize: '0.75rem', gap: '0.25rem' }}
                >
                  <CheckCheck size={13} />
                  Mark all read
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={clearAll}
                  title="Clear all"
                  style={{ padding: '0.3rem', color: 'var(--color-error)' }}
                >
                  <Trash2 size={13} />
                </button>
              )}
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setOpen(false)}
                style={{ padding: '0.3rem' }}
              >
                <X size={13} />
              </button>
            </div>
          </div>

          {/* List */}
          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-3)' }}>
                <Bell size={28} style={{ margin: '0 auto 0.5rem', opacity: 0.3 }} />
                <p style={{ fontSize: '0.875rem' }}>No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`notif-item ${!n.read ? 'unread' : ''}`}
                  onClick={() => markRead(n.id)}
                >
                  {!n.read
                    ? <span className="notif-dot" />
                    : <span style={{ width: 7, flexShrink: 0 }} />
                  }
                  {typeIcon(n.type)}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.15rem' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--color-text)' }}>{n.title}</span>
                    </div>
                    {n.message && (
                      <p style={{ fontSize: '0.75rem', color: 'var(--color-text-3)', marginBottom: '0.2rem' }}>
                        {n.message}
                      </p>
                    )}
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-text-3)' }}>
                      {timeAgo(n.timestamp)}
                    </span>
                  </div>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={(e) => { e.stopPropagation(); dismiss(n.id); }}
                    style={{ padding: '0.2rem', opacity: 0.45, flexShrink: 0 }}
                    title="Dismiss"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
