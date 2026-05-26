import { useState, useCallback, useRef, useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useApp } from '../hooks/useApp';
import { useRecords } from '../hooks/useRecords';
import { useNotifications } from '../context/NotificationContext';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import TableRenderer from '../components/renderers/TableRenderer';
import FormRenderer from '../components/renderers/FormRenderer';
import DashboardRenderer from '../components/renderers/DashboardRenderer';
import ErrorBoundary from '../components/ui/ErrorBoundary';
import api from '../lib/api';
import {
  LayoutDashboard, Table, FileInput, ChevronLeft, AlertTriangle,
  Code2, CheckCircle2, ChevronDown, ChevronUp, Upload, X,
  FileText, AlertCircle, Download, CheckCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import Papa from 'papaparse';

/* ─────────────────────────────────────────────────────────── */
/*  EntityView — Table view for one entity                     */
/* ─────────────────────────────────────────────────────────── */
function EntityView({ appId, entity }) {
  const { notify } = useNotifications();
  const {
    records, total, page, pageSize, loading, error,
    changePage, create, update, remove, importCSV, importResult,
  } = useRecords(appId, entity?.name);

  const handleCreate = useCallback(async (data) => {
    try {
      await create(data);
      toast.success(`${entity.name} saved successfully ✓`);
      notify.success('Record Created', `New ${entity.name} added.`);
    } catch (err) {
      const msg = err.response?.data?.error || 'Create failed.';
      toast.error(msg);
      throw err;
    }
  }, [create, entity.name, notify]);

  const handleUpdate = useCallback(async (id, data) => {
    try {
      await update(id, data);
      toast.success(`${entity.name} updated ✓`);
      notify.success('Record Updated', `${entity.name} #${id.slice(0,8)} updated.`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Update failed.');
      throw err;
    }
  }, [update, entity.name, notify]);

  const handleDelete = useCallback(async (id) => {
    try {
      await remove(id);
      toast.error(`${entity.name} deleted`);
      notify.info('Record Deleted', `${entity.name} removed.`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Delete failed.');
    }
  }, [remove, entity.name, notify]);

  const handleImport = useCallback(async (file) => {
    try {
      const result = await importCSV(file);
      if (result.failedCount > 0) {
        toast.success(`${result.inserted} records imported, ${result.failedCount} failed`);
        notify.warning('CSV Import', `${result.inserted} imported, ${result.failedCount} failed.`);
      } else {
        toast.success(`${result.inserted} records imported successfully ✓`);
        notify.success('CSV Import', `${result.inserted} records imported.`);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Import failed.');
    }
  }, [importCSV, notify]);

  return (
    <ErrorBoundary title={`Error in ${entity.name} table`}>
      <TableRenderer
        entity={entity}
        records={records}
        total={total}
        loading={loading}
        error={error}
        page={page}
        pageSize={pageSize}
        onPageChange={changePage}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        onImport={handleImport}
        importResult={importResult}
      />
    </ErrorBoundary>
  );
}

/* ─────────────────────────────────────────────────────────── */
/*  FormView — form-only view for one entity                   */
/* ─────────────────────────────────────────────────────────── */
function FormView({ appId, entity }) {
  const { create } = useRecords(appId, entity?.name);
  const { notify } = useNotifications();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(data) {
    setLoading(true);
    try {
      await create(data);
      toast.success(`${entity.name} saved successfully ✓`);
      notify.success('Form Submitted', `New ${entity.name} record created.`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Submit failed.');
      throw err;
    } finally {
      setLoading(false);
    }
  }

  return (
    <ErrorBoundary title={`Error in ${entity.name} form`}>
      <div className="section-header">
        <div className="section-title">
          <FileInput size={18} />
          {entity.name} Form
        </div>
      </div>
      <div className="card" style={{ maxWidth: 640 }}>
        <FormRenderer entity={entity} onSubmit={handleSubmit} loading={loading} />
      </div>
    </ErrorBoundary>
  );
}

/* ─────────────────────────────────────────────────────────── */
/*  JSON Config Panel — collapsible with Monaco editor        */
/* ─────────────────────────────────────────────────────────── */
function JSONConfigPanel({ appId, initialConfig, onConfigApplied }) {
  const [open,        setOpen]        = useState(false);
  const [configText,  setConfigText]  = useState(JSON.stringify(initialConfig, null, 2));
  const [parsed,      setParsed]      = useState(initialConfig);
  const [parseError,  setParseError]  = useState(null);
  const [saving,      setSaving]      = useState(false);
  const MonacoEditor = useMonacoEditor();

  function handleChange(val) {
    const text = val || '';
    setConfigText(text);
    try {
      const obj = JSON.parse(text);
      setParsed(obj);
      setParseError(null);
    } catch (e) {
      setParseError(e.message);
      setParsed(null);
    }
  }

  async function handleApply() {
    if (!parsed) { toast.error('Fix JSON errors before applying.'); return; }
    setSaving(true);
    try {
      await api.put(`/apps/${appId}`, { config: parsed });
      toast.success('Config applied successfully ✓');
      onConfigApplied?.(parsed);
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to apply config.';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  const isValid = !parseError && parsed !== null;

  return (
    <div className="json-config-panel" style={{ marginBottom: '1.25rem' }}>
      {/* Collapsible header */}
      <div className="json-config-header" onClick={() => setOpen((o) => !o)}>
        <Code2 size={14} style={{ color: 'var(--color-text-3)', flexShrink: 0 }} />
        <span style={{ fontWeight: 600, fontSize: '0.875rem', flex: 1 }}>JSON Config</span>
        {isValid
          ? <span className="badge badge-success" style={{ fontSize: '0.7rem' }}><CheckCircle2 size={10} /> Valid</span>
          : <span className="badge badge-error"   style={{ fontSize: '0.7rem' }}>Invalid</span>
        }
        {open ? <ChevronUp size={15} style={{ color: 'var(--color-text-3)' }} /> : <ChevronDown size={15} style={{ color: 'var(--color-text-3)' }} />}
      </div>

      {open && (
        <div>
          <div style={{ borderTop: '1px solid var(--color-border)' }}>
            {MonacoEditor ? (
              <MonacoEditor
                height="280px"
                language="json"
                theme="vs-dark"
                value={configText}
                onChange={handleChange}
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  wordWrap: 'on',
                  tabSize: 2,
                  fontFamily: 'JetBrains Mono, Fira Code, Courier New, monospace',
                }}
              />
            ) : (
              <textarea
                className="json-editor"
                value={configText}
                onChange={(e) => handleChange(e.target.value)}
                style={{ borderTop: 'none', borderRadius: 0 }}
                spellCheck={false}
              />
            )}
          </div>

          {parseError && (
            <div style={{
              padding: '0.625rem 1rem',
              background: 'var(--color-error-bg)',
              borderTop: '1px solid #F5C3C3',
              display: 'flex', gap: '0.5rem', alignItems: 'flex-start',
            }}>
              <AlertCircle size={13} style={{ color: 'var(--color-error)', flexShrink: 0, marginTop: 1 }} />
              <pre style={{ color: 'var(--color-error-text)', fontSize: '0.75rem', whiteSpace: 'pre-wrap', margin: 0 }}>
                {parseError}
              </pre>
            </div>
          )}

          <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              className="btn btn-primary btn-sm"
              onClick={handleApply}
              disabled={saving || !isValid}
            >
              {saving ? 'Applying…' : 'Apply Config'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── */
/*  CSV Import Screen                                          */
/* ─────────────────────────────────────────────────────────── */
function CSVImportScreen({ entity, appId, onImport, onCancel }) {
  const [file,      setFile]      = useState(null);
  const [preview,   setPreview]   = useState(null);
  const [dragOver,  setDragOver]  = useState(false);
  const [importing, setImporting] = useState(false);
  const [result,    setResult]    = useState(null);
  const fileRef = useRef(null);

  function handleFile(f) {
    if (!f) return;
    setFile(f);
    setResult(null);
    Papa.parse(f, {
      preview: 6,
      header: true,
      skipEmptyLines: true,
      complete: (res) => setPreview(res),
    });
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f?.name?.endsWith('.csv') || f?.type === 'text/csv') handleFile(f);
  }

  async function handleImport() {
    if (!file) return;
    setImporting(true);
    try {
      const res = await onImport(file);
      setResult(res);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Import failed.');
    } finally {
      setImporting(false);
    }
  }

  function downloadFailed() {
    if (!result?.failed?.length) return;
    const csv = Papa.unparse(result.failed.map((f) => f.row || {}));
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a'); a.href = url; a.download = 'failed_rows.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  const headers = preview?.meta?.fields || [];
  const rows    = preview?.data?.slice(0, 5) || [];

  return (
    <div className="card" style={{ maxWidth: 680 }}>
      <div className="section-header" style={{ marginBottom: '1rem' }}>
        <div className="section-title"><Upload size={18} /> Import CSV — {entity?.name}</div>
        <button className="btn btn-ghost btn-sm" onClick={onCancel}><X size={14} /> Cancel</button>
      </div>

      {/* Drop zone */}
      {!file && (
        <div
          className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            style={{ display: 'none' }}
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          <Upload size={36} style={{ color: 'var(--color-text-3)', margin: '0 auto 0.75rem' }} />
          <p style={{ fontWeight: 500, color: 'var(--color-text-2)' }}>Drag & drop a CSV file here</p>
          <p className="text-sm text-muted" style={{ marginTop: '0.25rem' }}>or click to browse</p>
        </div>
      )}

      {/* File selected */}
      {file && !result && (
        <div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.625rem',
            padding: '0.625rem 0.875rem',
            background: 'var(--color-primary-light)',
            border: '1px solid #C7C3F0',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1rem',
          }}>
            <FileText size={15} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
            <span style={{ fontWeight: 500, fontSize: '0.875rem', flex: 1 }}>{file.name}</span>
            <button className="btn btn-ghost btn-sm" onClick={() => { setFile(null); setPreview(null); }} style={{ padding: '0.2rem' }}>
              <X size={13} />
            </button>
          </div>

          {/* Preview table */}
          {rows.length > 0 && (
            <div style={{ marginBottom: '1rem' }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-3)', marginBottom: '0.5rem', fontWeight: 500 }}>
                Preview (first {rows.length} rows)
              </p>
              <div className="table-wrapper" style={{ maxHeight: 220, overflow: 'auto', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      {headers.map((h) => <th key={h}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr key={i}>
                        {headers.map((h) => <td key={h}>{row[h] ?? ''}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.625rem' }}>
            <button className="btn btn-outline" onClick={() => { setFile(null); setPreview(null); }}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleImport} disabled={importing}>
              {importing ? 'Importing…' : `Import ${file.name}`}
            </button>
          </div>
        </div>
      )}

      {/* Import result */}
      {result && (
        <div>
          <div style={{ marginBottom: '0.875rem' }}>
            {result.inserted > 0 && (
              <div style={{
                padding: '0.75rem 1rem', background: 'var(--color-success-bg)',
                border: '1px solid #A8DDD0', borderRadius: 'var(--radius-md)',
                color: 'var(--color-success-text)', fontSize: '0.875rem',
                display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem',
              }}>
                <CheckCircle2 size={15} />
                {result.inserted} rows imported successfully
              </div>
            )}
            {result.failedCount > 0 && (
              <div style={{
                padding: '0.75rem 1rem', background: 'var(--color-error-bg)',
                border: '1px solid #F5C3C3', borderRadius: 'var(--radius-md)',
                color: 'var(--color-error-text)', fontSize: '0.875rem',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem',
              }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertCircle size={15} />
                  {result.failedCount} rows failed
                </span>
                <button className="btn btn-outline btn-sm" onClick={downloadFailed} style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}>
                  <Download size={12} /> Download failed rows
                </button>
              </div>
            )}
          </div>
          <button className="btn btn-outline btn-sm" onClick={() => { setFile(null); setPreview(null); setResult(null); }}>
            Import another file
          </button>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────── */
/*  useMonacoEditor — lazy load Monaco                         */
/* ─────────────────────────────────────────────────────────── */
function useMonacoEditor() {
  const [Monaco, setMonaco] = useState(null);

  useEffect(() => {
    import('@monaco-editor/react')
      .then((mod) => setMonaco(() => mod.default))
      .catch(() => setMonaco(null));
  }, []);

  return Monaco;
}

/* ─────────────────────────────────────────────────────────── */
/*  Main AppViewPage                                            */
/* ─────────────────────────────────────────────────────────── */
export default function AppViewPage() {
  const { appId } = useParams();
  const [searchParams] = useSearchParams();
  const { app, loading, error, refetch } = useApp(appId);
  const [activeView, setActiveView] = useState(0);
  const [showCSVImport, setShowCSVImport] = useState(false);
  const { notify } = useNotifications();

  // Check if URL query requests a specific view
  useEffect(() => {
    const viewParam = searchParams.get('view');
    if (viewParam === 'csv') setShowCSVImport(true);
  }, [searchParams]);

  if (loading) return <div className="page-content"><LoadingSpinner text="Loading app…" /></div>;

  if (error || !app) {
    return (
      <div className="page-content">
        <div className="error-state card">
          <div className="error-state-icon"><AlertTriangle size={24} /></div>
          <h4>App not found</h4>
          <p className="text-muted text-sm">{error || 'This app does not exist or you do not have access.'}</p>
          <Link to="/dashboard" className="btn btn-outline btn-sm" style={{ marginTop: '0.5rem' }}>
            <ChevronLeft size={14} /> Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const config   = app.config  || {};
  const views    = Array.isArray(config.views)    ? config.views    : [];
  const entities = Array.isArray(config.entities) ? config.entities : [];

  const viewTabs = views.length > 0 ? views : [
    ...entities.map((e) => ({ type: 'table', entity: e.name })),
    { type: 'dashboard', widgets: ['count', 'chart'] },
  ];

  function tabLabel(view) {
    if (!view?.type) return 'Unknown';
    if (view.type === 'dashboard') return 'Dashboard';
    if (view.entity) return `${view.entity} ${view.type === 'form' ? 'Form' : 'Table'}`;
    return view.type;
  }

  function tabIcon(view) {
    if (!view?.type) return null;
    if (view.type === 'dashboard') return <LayoutDashboard size={13} />;
    if (view.type === 'form')      return <FileInput size={13} />;
    return <Table size={13} />;
  }

  const current = viewTabs[activeView] || null;

  function renderView(view) {
    if (!view?.type) {
      return (
        <div className="card" style={{
          display: 'flex', alignItems: 'center', gap: '0.625rem',
          background: 'var(--color-bg-2)', border: '1px dashed var(--color-border-2)', padding: '1rem',
        }}>
          <AlertTriangle size={16} style={{ color: 'var(--color-warning)' }} />
          <p className="text-sm text-muted">Unknown or missing view type.</p>
        </div>
      );
    }

    if (view.type === 'dashboard') {
      return (
        <ErrorBoundary title="Dashboard error">
          <DashboardRenderer appId={appId} config={config} view={view} />
        </ErrorBoundary>
      );
    }

    const entity = entities.find(
      (e) => e?.name?.toLowerCase() === view.entity?.toLowerCase()
    );

    if (!entity) {
      return (
        <div className="card" style={{
          border: '1px solid var(--color-warning-bg)',
          background: 'var(--color-warning-bg)',
          padding: '1rem 1.25rem',
          display: 'flex', alignItems: 'center', gap: '0.625rem',
        }}>
          <AlertTriangle size={15} style={{ color: 'var(--color-warning)', flexShrink: 0 }} />
          <div>
            <p style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-warning-text)' }}>Entity not found</p>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-warning-text)', opacity: 0.8 }}>
              "{view.entity}" is referenced in views but not defined in entities.
            </p>
          </div>
        </div>
      );
    }

    if (view.type === 'form')  return <FormView  appId={appId} entity={entity} key={entity.name} />;
    if (view.type === 'table') return <EntityView appId={appId} entity={entity} key={entity.name} />;

    return (
      <div className="card" style={{
        display: 'flex', alignItems: 'center', gap: '0.625rem',
        background: 'var(--color-bg-2)', border: '1px dashed var(--color-border-2)', padding: '1rem',
      }}>
        <AlertTriangle size={15} style={{ color: 'var(--color-warning)', flexShrink: 0 }} />
        <p className="text-sm text-muted">Unknown view type: <code>{view.type}</code></p>
      </div>
    );
  }

  // Find first entity for CSV import
  const firstEntity = entities[0] || null;

  async function handleCSVImport(file) {
    if (!firstEntity) return null;
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post(`/apps/${appId}/records/${firstEntity.name}/import`, formData);
    return res.data.data;
  }

  return (
    <div className="page-content">
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '1.25rem' }}>
        <Link to="/dashboard" style={{ color: 'var(--color-text-3)', fontSize: '0.8125rem' }}>Dashboard</Link>
        <span style={{ color: 'var(--color-text-3)', fontSize: '0.8125rem' }}>/</span>
        <span style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--color-text)' }}>{app.name}</span>
      </div>

      {/* JSON Config Panel */}
      <JSONConfigPanel
        appId={appId}
        initialConfig={config}
        onConfigApplied={(newConfig) => {
          refetch();
          notify.success('Config Updated', 'App configuration applied successfully.');
        }}
      />

      {/* CSV Import */}
      {showCSVImport && firstEntity && (
        <CSVImportScreen
          entity={firstEntity}
          appId={appId}
          onImport={handleCSVImport}
          onCancel={() => setShowCSVImport(false)}
        />
      )}

      {/* App title row */}
      {!showCSVImport && (
        <>
          <div style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <div>
              <h1 style={{ fontSize: '1.375rem', fontWeight: 700, marginBottom: '0.2rem', color: 'var(--color-text)' }}>
                {app.name}
              </h1>
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-3)' }}>
                {entities.length} {entities.length === 1 ? 'entity' : 'entities'} · {viewTabs.length} views
              </p>
            </div>
          </div>

          {/* View Tabs — pill switcher */}
          {viewTabs.length > 1 && (
            <div className="tabs" style={{ marginBottom: '1.25rem', maxWidth: 480 }}>
              {viewTabs.map((view, i) =>
                view?.type && (
                  <button
                    key={i}
                    className={`tab ${activeView === i ? 'active' : ''}`}
                    onClick={() => setActiveView(i)}
                    id={`view-tab-${i}`}
                  >
                    {tabIcon(view)}
                    {tabLabel(view)}
                  </button>
                )
              )}
            </div>
          )}

          {/* Active View */}
          {current ? renderView(current) : (
            <div className="empty-state card">
              <div className="empty-state-icon"><LayoutDashboard size={24} /></div>
              <h4>No views configured</h4>
              <p className="text-muted text-sm">Add views to your app config to see them here.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
