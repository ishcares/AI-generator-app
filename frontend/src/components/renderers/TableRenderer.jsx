import { useState, useRef } from 'react';
import {
  Plus, Pencil, Trash2, Upload, Search, ChevronLeft,
  ChevronRight, AlertCircle, Download, Database
} from 'lucide-react';
import { SkeletonTable } from '../ui/LoadingSpinner';
import { InlineSpinner } from '../ui/LoadingSpinner';
import FormRenderer from './FormRenderer';

/**
 * Maps a string value to a badge class for status/enum fields.
 */
function getStatusBadge(val) {
  const v = String(val).toLowerCase();
  if (['active', 'yes', 'true', 'success', 'enabled', 'open', 'approved'].includes(v)) {
    return 'badge badge-success';
  }
  if (['lead', 'pending', 'review', 'draft', 'in progress', 'processing'].includes(v)) {
    return 'badge badge-warning';
  }
  if (['inactive', 'no', 'false', 'failed', 'closed', 'rejected', 'disabled', 'cancelled'].includes(v)) {
    return 'badge badge-error';
  }
  return null;
}

function formatCell(value, field) {
  if (value === null || value === undefined) {
    return <span style={{ color: 'var(--color-text-3)' }}>—</span>;
  }

  if (field?.type === 'boolean') {
    const isTrue = value === true || value === 'true';
    return (
      <span className={`badge ${isTrue ? 'badge-success' : 'badge-error'}`}>
        {isTrue ? 'Yes' : 'No'}
      </span>
    );
  }

  if (field?.type === 'date') {
    return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  const str = String(value);

  // Try to render as a status badge
  const badgeClass = getStatusBadge(str);
  if (badgeClass && str.length <= 20) {
    return <span className={badgeClass}>{str}</span>;
  }

  return str.length > 80 ? str.slice(0, 77) + '…' : str;
}

export default function TableRenderer({
  entity,
  records = [],
  total = 0,
  loading = false,
  error = null,
  page = 0,
  pageSize = 20,
  onPageChange,
  onCreate,
  onUpdate,
  onDelete,
  onImport,
  importResult,
}) {
  const [showForm,    setShowForm]    = useState(false);
  const [editRecord,  setEditRecord]  = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [deleteId,    setDeleteId]    = useState(null);
  const [search,      setSearch]      = useState('');
  const [importing,   setImporting]   = useState(false);
  const fileInputRef = useRef(null);

  if (!entity) {
    return (
      <div className="error-state card">
        <div className="error-state-icon"><AlertCircle size={22} /></div>
        <p>No entity schema provided.</p>
      </div>
    );
  }

  const fields = Array.isArray(entity.fields) ? entity.fields : [];
  const totalPages = Math.ceil(total / pageSize);

  const filtered = search.trim()
    ? records.filter((r) =>
        JSON.stringify(r.data).toLowerCase().includes(search.toLowerCase())
      )
    : records;

  async function handleCreate(data) {
    setFormLoading(true);
    try { await onCreate?.(data); setShowForm(false); }
    finally { setFormLoading(false); }
  }

  async function handleUpdate(data) {
    setFormLoading(true);
    try { await onUpdate?.(editRecord.id, data); setEditRecord(null); }
    finally { setFormLoading(false); }
  }

  async function handleDelete(id) {
    setDeleteId(id);
    try { await onDelete?.(id); }
    finally { setDeleteId(null); }
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file || !onImport) return;
    setImporting(true);
    try { await onImport(file); }
    finally { setImporting(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  }

  function downloadTemplate() {
    const header = fields.map((f) => f.name).join(',');
    const blob = new Blob([header + '\n'], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `${entity.name}_template.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  // ── Create / Edit form modal
  if (showForm || editRecord) {
    return (
      <div>
        <div className="section-header">
          <div className="section-title">
            {editRecord ? `Edit ${entity.name}` : `New ${entity.name}`}
          </div>
          <button className="btn btn-outline btn-sm" onClick={() => { setShowForm(false); setEditRecord(null); }}>
            Cancel
          </button>
        </div>
        <div className="card">
          <FormRenderer
            entity={entity}
            initial={editRecord?.data || {}}
            onSubmit={editRecord ? handleUpdate : handleCreate}
            onCancel={() => { setShowForm(false); setEditRecord(null); }}
            loading={formLoading}
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="section-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flex: 1, minWidth: 0 }}>
          <Database size={18} style={{ color: 'var(--color-text-3)', flexShrink: 0 }} />
          <h3 style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--color-text)' }}>{entity.name}</h3>
          <span className="badge badge-gray">{total} records</span>
        </div>

        <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', flexShrink: 0 }}>
          {/* Search */}
          <div style={{ position: 'relative' }}>
            <Search size={13} style={{
              position: 'absolute', left: '0.625rem', top: '50%',
              transform: 'translateY(-50%)', color: 'var(--color-text-3)',
            }} />
            <input
              id={`search-${entity.name}`}
              className="form-input"
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '2rem', height: '32px', width: '160px', fontSize: '0.8125rem' }}
            />
          </div>

          {/* CSV Template */}
          <button className="btn btn-outline btn-sm" onClick={downloadTemplate} title="Download CSV template">
            <Download size={13} />
          </button>

          {/* CSV Import */}
          {onImport && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                style={{ display: 'none' }}
                id={`csv-import-${entity.name}`}
                onChange={handleFileChange}
              />
              <button
                className="btn btn-outline btn-sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
              >
                {importing ? <InlineSpinner size={13} /> : <Upload size={13} />}
                {importing ? 'Importing…' : 'Import CSV'}
              </button>
            </>
          )}

          {/* Add */}
          {onCreate && (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setShowForm(true)}
              id={`add-${entity.name}-btn`}
            >
              <Plus size={13} />
              Add {entity.name}
            </button>
          )}
        </div>
      </div>

      {/* Import result */}
      {importResult && (
        <div className="card" style={{ marginBottom: '0.875rem', padding: '0.875rem 1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <span className="badge badge-success">✓ {importResult.inserted} inserted</span>
            {importResult.failedCount > 0 && (
              <span className="badge badge-error">✗ {importResult.failedCount} failed</span>
            )}
          </div>
          {importResult.failed?.length > 0 && (
            <div style={{ marginTop: '0.625rem', maxHeight: 100, overflowY: 'auto' }}>
              {importResult.failed.map((f, i) => (
                <p key={i} className="form-error" style={{ fontSize: '0.75rem', marginBottom: '0.2rem' }}>
                  Row {f.rowIndex}: {(f.errors || [f.error]).join(', ')}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="card" style={{ marginBottom: '0.875rem', borderColor: 'var(--color-error)', background: 'var(--color-error-bg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--color-error-text)' }}>
            <AlertCircle size={16} />
            {error}
          </div>
        </div>
      )}

      {/* Table Card */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <SkeletonTable cols={Math.min(fields.length + 2, 6)} rows={5} />
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <Database size={24} />
            </div>
            <h4>{search ? 'No matching records' : `No ${entity.name} records yet`}</h4>
            <p className="text-muted text-sm">
              {search
                ? 'Try a different search term.'
                : `Click "Add ${entity.name}" to create your first record.`}
            </p>
            {!search && onCreate && (
              <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)} style={{ marginTop: '0.25rem' }}>
                <Plus size={13} /> Add {entity.name}
              </button>
            )}
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  {fields.map((f) => (
                    <th key={f.name}>{f.label || f.name}</th>
                  ))}
                  <th>Created</th>
                  <th style={{ textAlign: 'right', width: 90 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((record) => (
                  <tr key={record.id}>
                    {fields.map((f) => (
                      <td key={f.name} className="truncate" style={{ maxWidth: 200 }}>
                        {formatCell(record.data?.[f.name], f)}
                      </td>
                    ))}
                    <td style={{ color: 'var(--color-text-3)', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                      {new Date(record.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.25rem' }}>
                        {onUpdate && (
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => setEditRecord(record)}
                            title="Edit"
                            id={`edit-record-${record.id}`}
                            style={{ padding: '0.35rem' }}
                          >
                            <Pencil size={13} />
                          </button>
                        )}
                        {onDelete && (
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDelete(record.id)}
                            disabled={deleteId === record.id}
                            title="Delete"
                            id={`delete-record-${record.id}`}
                            style={{ padding: '0.35rem' }}
                          >
                            {deleteId === record.id ? <InlineSpinner size={13} /> : <Trash2 size={13} />}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="pagination">
            <button
              className="page-btn"
              onClick={() => onPageChange?.(page - 1)}
              disabled={page === 0}
            >
              <ChevronLeft size={14} />
            </button>

            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const p = totalPages <= 7 ? i : (page < 4 ? i : page - 3 + i);
              if (p >= totalPages) return null;
              return (
                <button
                  key={p}
                  className={`page-btn ${p === page ? 'active' : ''}`}
                  onClick={() => onPageChange?.(p)}
                >
                  {p + 1}
                </button>
              );
            })}

            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-3)', padding: '0 0.5rem' }}>
              of {totalPages}
            </span>

            <button
              className="page-btn"
              onClick={() => onPageChange?.(page + 1)}
              disabled={page >= totalPages - 1}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
