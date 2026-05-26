import { useState, useCallback, useEffect } from 'react';
import api from '../lib/api';

const PAGE_SIZE = 20;

/**
 * useRecords — manages CRUD for a single entity's records
 */
export function useRecords(appId, entityName) {
  const [records,      setRecords]      = useState([]);
  const [total,        setTotal]        = useState(0);
  const [page,         setPage]         = useState(0);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState(null);
  const [importResult, setImportResult] = useState(null);

  const fetch = useCallback(async (p = page) => {
    if (!appId || !entityName) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/apps/${appId}/${entityName}`, {
        params: { limit: PAGE_SIZE, offset: p * PAGE_SIZE },
      });
      setRecords(res.data.data.records || []);
      setTotal(res.data.data.pagination?.total || 0);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load records.');
    } finally {
      setLoading(false);
    }
  }, [appId, entityName, page]);

  useEffect(() => { fetch(0); setPage(0); }, [appId, entityName]);

  function changePage(p) {
    setPage(p);
    fetch(p);
  }

  const create = useCallback(async (data) => {
    const res = await api.post(`/apps/${appId}/${entityName}`, data);
    await fetch(page);
    return res.data.data.record;
  }, [appId, entityName, fetch, page]);

  const update = useCallback(async (id, data) => {
    const res = await api.put(`/apps/${appId}/${entityName}/${id}`, data);
    await fetch(page);
    return res.data.data.record;
  }, [appId, entityName, fetch, page]);

  const remove = useCallback(async (id) => {
    await api.delete(`/apps/${appId}/${entityName}/${id}`);
    await fetch(page);
  }, [appId, entityName, fetch, page]);

  const importCSV = useCallback(async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post(`/apps/${appId}/${entityName}/import`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    const result = res.data.data;
    setImportResult(result);
    await fetch(0);
    setPage(0);
    return result;
  }, [appId, entityName, fetch]);

  return {
    records, total, page, pageSize: PAGE_SIZE,
    loading, error, importResult,
    fetch, changePage,
    create, update, remove, importCSV,
  };
}
