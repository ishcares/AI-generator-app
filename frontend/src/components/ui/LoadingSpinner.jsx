export default function LoadingSpinner({ size = 'md', text = 'Loading…' }) {
  const sizeClass = size === 'sm' ? 'spinner-sm' : '';
  return (
    <div className="loading-center">
      <div className={`spinner ${sizeClass}`} />
      {text && <p style={{ color: 'var(--color-text-3)', fontSize: '0.875rem' }}>{text}</p>}
    </div>
  );
}

export function InlineSpinner({ size = 14 }) {
  return (
    <span style={{
      display: 'inline-block',
      width: size,
      height: size,
      border: '2px solid rgba(255,255,255,0.35)',
      borderTopColor: 'white',
      borderRadius: '50%',
      animation: 'spin 0.7s linear infinite',
      flexShrink: 0,
    }} />
  );
}

export function SkeletonRows({ rows = 3 }) {
  return (
    <div style={{ padding: '0.75rem 1rem' }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ marginBottom: i < rows - 1 ? '0.75rem' : 0 }}>
          <div className="skeleton-row" style={{ width: `${70 + (i % 3) * 10}%`, height: 14, marginBottom: '0.25rem' }} />
          <div className="skeleton-row" style={{ width: `${45 + (i % 2) * 20}%`, height: 12, opacity: 0.6 }} />
        </div>
      ))}
    </div>
  );
}

export function SkeletonTable({ cols = 4, rows = 5 }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          {Array.from({ length: cols }).map((_, i) => (
            <th key={i} style={{ padding: '0.625rem 1rem', borderBottom: '1px solid var(--color-border)' }}>
              <div className="skeleton-row" style={{ height: 12, width: 80 }} />
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }).map((_, r) => (
          <tr key={r}>
            {Array.from({ length: cols }).map((_, c) => (
              <td key={c} style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--color-border)', height: 44 }}>
                <div className="skeleton-row" style={{ height: 13, width: c === 0 ? 140 : c === cols - 1 ? 60 : 100 }} />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
