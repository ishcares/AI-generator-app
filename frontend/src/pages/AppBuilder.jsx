import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Code2, Wand2, AlertCircle, CheckCircle2, ChevronRight, Eye } from 'lucide-react';
import { InlineSpinner } from '../components/ui/LoadingSpinner';
import { useApps } from '../hooks/useApp';
import { useNotifications } from '../context/NotificationContext';
import toast from 'react-hot-toast';

const EXAMPLE_CONFIG = {
  app: 'CRM',
  entities: [
    {
      name: 'Contact',
      fields: [
        { name: 'firstName', type: 'string',  required: true,  label: 'First Name' },
        { name: 'lastName',  type: 'string',  required: true,  label: 'Last Name' },
        { name: 'email',     type: 'email',   required: true,  label: 'Email Address' },
        { name: 'phone',     type: 'phone',                    label: 'Phone' },
        { name: 'company',   type: 'string',                   label: 'Company' },
        { name: 'status',    type: 'select',  options: ['Lead', 'Active', 'Inactive'], label: 'Status' },
        { name: 'age',       type: 'number',                   label: 'Age' },
      ],
    },
    {
      name: 'Deal',
      fields: [
        { name: 'title',  type: 'string',  required: true, label: 'Deal Title' },
        { name: 'value',  type: 'number',  required: true, label: 'Value ($)' },
        { name: 'stage',  type: 'select',  options: ['Prospecting', 'Proposal', 'Negotiation', 'Closed'], label: 'Stage' },
        { name: 'closed', type: 'boolean',                label: 'Closed' },
        { name: 'date',   type: 'date',                   label: 'Close Date' },
      ],
    },
  ],
  views: [
    { type: 'form',      entity: 'Contact' },
    { type: 'table',     entity: 'Contact' },
    { type: 'table',     entity: 'Deal' },
    { type: 'dashboard', widgets: ['count', 'chart', 'list'] },
  ],
};

function useMonacoEditor() {
  const [Monaco, setMonaco] = useState(null);
  useEffect(() => {
    import('@monaco-editor/react')
      .then((mod) => setMonaco(() => mod.default))
      .catch(() => setMonaco(null));
  }, []);
  return Monaco;
}

export default function AppBuilderPage() {
  const navigate = useNavigate();
  const { createApp } = useApps();
  const { notify }    = useNotifications();
  const MonacoEditor  = useMonacoEditor();

  const [configText, setConfigText] = useState(JSON.stringify(EXAMPLE_CONFIG, null, 2));
  const [parsed,     setParsed]     = useState(EXAMPLE_CONFIG);
  const [parseError, setParseError] = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [tab,        setTab]        = useState('editor'); // 'editor' | 'preview'

  function handleConfigChange(text) {
    const val = text || '';
    setConfigText(val);
    try {
      const obj = JSON.parse(val);
      setParsed(obj);
      setParseError(null);
    } catch (err) {
      setParseError(err.message);
      setParsed(null);
    }
  }

  function loadExample() {
    const text = JSON.stringify(EXAMPLE_CONFIG, null, 2);
    setConfigText(text);
    setParsed(EXAMPLE_CONFIG);
    setParseError(null);
    toast.success('Example config loaded!');
  }

  async function handleCreate() {
    if (!parsed) {
      toast.error('Fix the JSON errors first.');
      return;
    }
    setLoading(true);
    try {
      const app = await createApp(parsed);
      notify.success('App Created!', `"${app.name}" is ready to use.`);
      toast.success(`App "${app.name}" created! ✓`);
      navigate(`/apps/${app.id}`);
    } catch (err) {
      const details = err.response?.data?.details;
      const msg = err.response?.data?.error || 'Failed to create app.';
      toast.error(msg);
      if (details?.length) setParseError(details.join('\n'));
    } finally {
      setLoading(false);
    }
  }

  const isValid = !parseError && parsed !== null;

  return (
    <div className="page-content">
      {/* Header */}
      <div className="section-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.375rem', fontWeight: 700, marginBottom: '0.2rem' }}>App Builder</h1>
          <p className="text-muted text-sm">Paste a JSON config to instantly generate your app</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button className="btn btn-outline btn-sm" onClick={loadExample}>
            <Wand2 size={14} />
            Load Example
          </button>
          <button
            className="btn btn-primary"
            onClick={handleCreate}
            disabled={loading || !isValid}
            id="create-app-btn"
          >
            {loading ? <InlineSpinner /> : <ChevronRight size={15} />}
            {loading ? 'Creating…' : 'Create App'}
          </button>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="tabs" style={{ maxWidth: 280, marginBottom: '1rem' }}>
        <button
          className={`tab ${tab === 'editor' ? 'active' : ''}`}
          onClick={() => setTab('editor')}
        >
          <Code2 size={13} /> JSON Editor
        </button>
        <button
          className={`tab ${tab === 'preview' ? 'active' : ''}`}
          onClick={() => setTab('preview')}
        >
          <Eye size={13} /> Preview
        </button>
      </div>

      <div className={tab === 'editor' ? 'grid-2' : ''} style={{ alignItems: 'flex-start', gap: '1rem' }}>

        {/* Editor Panel */}
        {(tab === 'editor' || tab === 'editor') && (
          <div style={{ display: tab === 'preview' ? 'none' : 'block' }}>
            {/* Editor card header */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.625rem 1rem',
                borderBottom: '1px solid var(--color-border)',
                background: 'var(--color-bg)',
              }}>
                <Code2 size={13} style={{ color: 'var(--color-text-3)', flexShrink: 0 }} />
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-2)', flex: 1 }}>
                  config.json
                </span>
                {isValid ? (
                  <span className="badge badge-success" style={{ fontSize: '0.68rem' }}>
                    <CheckCircle2 size={10} /> Valid JSON
                  </span>
                ) : (
                  <span className="badge badge-error" style={{ fontSize: '0.68rem' }}>
                    Invalid JSON
                  </span>
                )}
              </div>

              {/* Monaco or fallback textarea */}
              {MonacoEditor ? (
                <MonacoEditor
                  height="520px"
                  language="json"
                  theme="vs-dark"
                  value={configText}
                  onChange={handleConfigChange}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 13,
                    lineNumbers: 'on',
                    scrollBeyondLastLine: false,
                    wordWrap: 'on',
                    tabSize: 2,
                    fontFamily: 'JetBrains Mono, Fira Code, Courier New, monospace',
                    padding: { top: 12, bottom: 12 },
                  }}
                />
              ) : (
                <textarea
                  id="json-editor"
                  className="json-editor"
                  value={configText}
                  onChange={(e) => handleConfigChange(e.target.value)}
                  spellCheck={false}
                  style={{ borderRadius: 0, border: 'none', minHeight: 520 }}
                />
              )}
            </div>

            {/* Error banner below editor */}
            {parseError && (
              <div style={{
                marginTop: '0.625rem',
                padding: '0.625rem 0.875rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-error-bg)',
                border: '1px solid #F5C3C3',
                display: 'flex', gap: '0.5rem', alignItems: 'flex-start',
              }}>
                <AlertCircle size={13} style={{ color: 'var(--color-error)', flexShrink: 0, marginTop: 2 }} />
                <pre style={{ color: 'var(--color-error-text)', fontSize: '0.75rem', whiteSpace: 'pre-wrap', margin: 0 }}>
                  {parseError}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Preview Panel — always rendered in grid but hidden when preview tab not selected */}
        <div style={{ display: (tab === 'preview' || window.innerWidth >= 1024) ? 'block' : 'none' }}>
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <Eye size={14} style={{ color: 'var(--color-text-3)' }} />
              <h4 style={{ fontSize: '0.875rem', fontWeight: 600 }}>Config Preview</h4>
            </div>
            {!parsed ? (
              <div className="empty-state" style={{ padding: '2rem' }}>
                <div className="error-state-icon"><AlertCircle size={20} /></div>
                <p className="text-muted text-sm">Fix JSON errors to see preview.</p>
              </div>
            ) : (
              <ConfigPreview config={parsed} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Config Preview ────────────────────────────────────────── */
function ConfigPreview({ config }) {
  if (!config) return null;

  return (
    <div>
      {/* App name */}
      <div style={{ marginBottom: '1rem' }}>
        <span className="badge badge-primary" style={{ fontSize: '0.8125rem', padding: '0.3rem 0.75rem' }}>
          {config.app || 'Untitled App'}
        </span>
      </div>

      {/* Entities */}
      {Array.isArray(config.entities) && config.entities.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <p style={{ fontWeight: 600, fontSize: '0.7rem', color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.625rem' }}>
            Entities ({config.entities.length})
          </p>
          {config.entities.map((entity, i) =>
            entity?.name && (
              <div key={i} className="card" style={{ padding: '0.75rem', marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{entity.name}</span>
                  <span className="badge badge-gray">{(entity.fields || []).length} fields</span>
                </div>
                <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                  {(entity.fields || []).map((f, j) =>
                    f?.name && (
                      <span key={j} className="badge badge-primary" style={{ fontSize: '0.68rem' }}>
                        {f.label || f.name}
                        {f.required && <span style={{ color: 'var(--color-error)', marginLeft: 1 }}>*</span>}
                        <span style={{ opacity: 0.6, marginLeft: 2 }}>({f.type})</span>
                      </span>
                    )
                  )}
                </div>
              </div>
            )
          )}
        </div>
      )}

      {/* Views */}
      {Array.isArray(config.views) && config.views.length > 0 && (
        <div>
          <p style={{ fontWeight: 600, fontSize: '0.7rem', color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.625rem' }}>
            Views ({config.views.length})
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            {config.views.map((view, i) =>
              view?.type && (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className={`badge ${view.type === 'dashboard' ? 'badge-success' : view.type === 'form' ? 'badge-info' : 'badge-warning'}`}>
                    {view.type}
                  </span>
                  {view.entity && <span className="text-sm text-muted">{view.entity}</span>}
                  {view.widgets && <span className="text-sm text-muted">{view.widgets.join(', ')}</span>}
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
