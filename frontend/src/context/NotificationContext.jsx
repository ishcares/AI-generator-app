import { createContext, useContext, useState, useCallback, useRef } from 'react';

const NotificationContext = createContext(null);

const MAX_NOTIFICATIONS = 20;

let nextId = 1;

function createNotification(type, title, message) {
  return {
    id:        nextId++,
    type,      // 'success' | 'error' | 'info' | 'warning'
    title,
    message,
    timestamp: new Date(),
    read:      false,
  };
}

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);

  const addNotification = useCallback((type, title, message) => {
    const notif = createNotification(type, title, message);
    setNotifications((prev) => {
      const updated = [notif, ...prev];
      return updated.slice(0, MAX_NOTIFICATIONS);
    });
    return notif.id;
  }, []);

  const markRead = useCallback((id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const dismiss = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearAll = useCallback(() => setNotifications([]), []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Convenience helpers
  const notify = {
    success: (title, msg) => addNotification('success', title, msg),
    error:   (title, msg) => addNotification('error',   title, msg),
    info:    (title, msg) => addNotification('info',    title, msg),
    warning: (title, msg) => addNotification('warning', title, msg),
  };

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      addNotification,
      notify,
      markRead,
      markAllRead,
      dismiss,
      clearAll,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}
