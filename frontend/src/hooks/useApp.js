import { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';

/**
 * useApp — fetch and manage a single app's config
 */
export function useApp(appId) {
  const [app,     setApp]     = useState(null);
  const [loading, setLoading] = useState(!!appId);
  const [error,   setError]   = useState(null);

  const fetch = useCallback(async () => {
    if (!appId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/apps/${appId}`);
      setApp(res.data.data.app);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load app.');
    } finally {
      setLoading(false);
    }
  }, [appId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { app, loading, error, refetch: fetch };
}

/**
 * useApps — fetch user's app list
 */
export function useApps() {
  const [apps,    setApps]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/apps');
      setApps(res.data.data.apps || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load apps.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const createApp = useCallback(async (config) => {
    const res = await api.post('/apps', { config });
    const newApp = res.data.data.app;
    setApps((prev) => [newApp, ...prev]);
    return newApp;
  }, []);

  const deleteApp = useCallback(async (id) => {
    await api.delete(`/apps/${id}`);
    setApps((prev) => prev.filter((a) => a.id !== id));
  }, []);

  return { apps, loading, error, refetch: fetch, createApp, deleteApp };
}
