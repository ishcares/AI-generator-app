import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import {
  Database, TrendingUp, TrendingDown, AlertCircle,
  AlertTriangle, List, Hash,
} from 'lucide-react';
import api from '../../lib/api';
import LoadingSpinner from '../ui/LoadingSpinner';

const CHART_COLORS = ['#534AB7', '#0F6E56', '#BA7517', '#1D5FAD', '#A32D2D', '#7C3AED', '#0369A1'];

/**
 * DashboardRenderer
 * Renders configurable widget cards.
 * Supported widgets: 'count' | 'chart' | 'list'
 * Unknown widgets → gray placeholder card (never crash).
 */
export default function DashboardRenderer({ appId, config, view }) {
  const [stats,   setStats]   = useState(null);
  const [records, setRecords] = useState({});
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    if (!appId) return;
    setLoading(true);
    api.get(`/apps/${appId}/stats`)
      .then((res) => setStats(res.data.data?.counts || {}))
      .catch((err) => setError(err.response?.data?.error || 'Failed to load dashboard stats.'))
      .finally(() => setLoading(false));
  }, [appId]);

  const widgets  = Array.isArray(view?.widgets) ? view.widgets : ['count', 'chart'];
  const entities = Array.isArray(config?.entities) ? config.entities : [];

  if (loading) return <LoadingSpinner text="Loading dashboard…" />;

  if (error) {
    return (
      <div className="error-state card">
        <div className="error-state-icon"><AlertCircle size={22} /></div>
        <p>{error}</p>
      </div>
    );
  }

  const chartData = entities.map((e) => ({
    name:  e.name,
    count: stats?.[e.name] || 0,
  }));

  const totalRecords = Object.values(stats || {}).reduce((a, b) => a + b, 0);

  return (
    <div>
      {widgets.map((widget, i) => (
        <WidgetSection
          key={`${widget}-${i}`}
          widget={widget}
          stats={stats}
          entities={entities}
          chartData={chartData}
          totalRecords={totalRecords}
          appId={appId}
        />
      ))}

      {entities.length === 0 && (
        <div className="empty-state card">
          <div className="empty-state-icon"><Database size={24} /></div>
          <h4>No entities in this app</h4>
          <p className="text-muted text-sm">Add entities to your config to see dashboard stats.</p>
        </div>
      )}
    </div>
  );
}

function WidgetSection({ widget, stats, entities, chartData, totalRecords, appId }) {
  switch (widget) {
    case 'count':
      return <CountWidgets stats={stats} entities={entities} totalRecords={totalRecords} />;
    case 'chart':
      return <ChartWidget chartData={chartData} entities={entities} />;
    case 'list':
      return <ListWidget entities={entities} appId={appId} />;
    default:
      return (
        <div className="card" style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          padding: '1rem 1.25rem', marginBottom: '1rem',
          background: 'var(--color-bg-2)', border: '1px dashed var(--color-border-2)',
        }}>
          <AlertTriangle size={18} style={{ color: 'var(--color-warning)', flexShrink: 0 }} />
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-3)' }}>
            Unknown widget: <code>{widget}</code>
          </p>
        </div>
      );
  }
}

/* ── Count Widgets ─────────────────────────────────────────── */
function CountWidgets({ stats, entities, totalRecords }) {
  const items = [
    {
      label: 'Total Records',
      value: totalRecords,
      sub: `across ${entities.length} ${entities.length === 1 ? 'entity' : 'entities'}`,
      color: '#534AB7',
      trend: 'up',
    },
    ...entities.slice(0, 3).map((e, i) => ({
      label: e.name,
      value: stats?.[e.name] || 0,
      sub: `${e.fields?.length || 0} fields`,
      color: CHART_COLORS[(i + 1) % CHART_COLORS.length],
      trend: (stats?.[e.name] || 0) > 0 ? 'up' : null,
    })),
  ];

  return (
    <div className="grid-2" style={{ marginBottom: '1.25rem' }}>
      {items.map((item, i) => (
        <div key={i} className="stat-card">
          <p className="stat-label">{item.label}</p>
          <p className="stat-number" style={{ color: item.color }}>
            {item.value.toLocaleString()}
          </p>
          <div className={`stat-trend ${item.trend === 'up' ? 'up' : item.trend === 'down' ? 'down' : ''}`}>
            {item.trend === 'up'  && <TrendingUp  size={12} />}
            {item.trend === 'down' && <TrendingDown size={12} />}
            <span style={{ color: 'var(--color-text-3)' }}>{item.sub}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Chart Widget ──────────────────────────────────────────── */
function ChartWidget({ chartData, entities }) {
  if (entities.length === 0) return null;

  return (
    <div className="widget-card" style={{ marginBottom: '1.25rem' }}>
      <p className="widget-title">Records by Entity</p>
      <div style={{ flex: 1 }}>
        <ResponsiveContainer width="100%" height={210}>
          <BarChart data={chartData} margin={{ top: 5, right: 16, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fill: 'var(--color-text-3)', fontSize: 11, fontFamily: 'Inter,sans-serif' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: 'var(--color-text-3)', fontSize: 11, fontFamily: 'Inter,sans-serif' }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 8,
                fontSize: 12,
                color: 'var(--color-text)',
                boxShadow: 'var(--shadow-sm)',
              }}
              cursor={{ fill: 'var(--color-primary-light)' }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {chartData.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ── List Widget ───────────────────────────────────────────── */
function ListWidget({ entities, appId }) {
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!appId || !entities[0]) { setLoading(false); return; }
    const entity = entities[0].name;
    api.get(`/apps/${appId}/records/${entity}?limit=5`)
      .then((res) => setItems(res.data.data?.records || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [appId, entities]);

  const entity = entities[0];
  if (!entity) return null;

  const labelField = entity.fields?.[0]?.name;

  return (
    <div className="card" style={{ marginBottom: '1.25rem', padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '0.875rem 1rem', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <List size={14} style={{ color: 'var(--color-text-3)' }} />
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Latest {entity.name} records
        </span>
      </div>
      {loading ? (
        <div style={{ padding: '1rem' }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton-row" style={{ marginBottom: '0.5rem', height: 14 }} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--color-text-3)', fontSize: '0.875rem' }}>
          No records yet
        </div>
      ) : (
        items.map((rec, i) => (
          <div key={rec.id} style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            padding: '0.625rem 1rem',
            borderBottom: i < items.length - 1 ? '1px solid var(--color-border)' : 'none',
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: CHART_COLORS[i % CHART_COLORS.length],
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontSize: '0.7rem', fontWeight: 700, flexShrink: 0,
            }}>
              {i + 1}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {labelField && rec.data?.[labelField]
                  ? String(rec.data[labelField]).slice(0, 40)
                  : rec.id.slice(0, 8) + '…'}
              </p>
              <p style={{ fontSize: '0.7rem', color: 'var(--color-text-3)' }}>
                {new Date(rec.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
