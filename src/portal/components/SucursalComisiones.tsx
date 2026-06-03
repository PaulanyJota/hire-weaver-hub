import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { usePortalAuth } from '@/portal/hooks/usePortalAuth';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronDown, TrendingUp, Users, DollarSign } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { formatRut } from '@/portal/lib/formatRut';

interface SummaryRow {
  period: string;
  cost_center: string;
  sucursal: string;
  orden: number;
  total_amount: number;
  worker_count: number;
}

interface WorkerRow {
  worker_id: string | null;
  nombre: string;
  rut: string;
  concept: string;
  amount: number;
  total_worker: number;
}

const fmtCLP = (n: number) =>
  '$' + Math.round(Number(n) || 0).toLocaleString('es-CL');

const fmtPeriod = (p: string) => {
  if (!p) return '';
  const ymd = p.slice(0, 10).split('-');
  if (ymd.length < 2) return p;
  const y = Number(ymd[0]); const mo = Number(ymd[1]);
  if (!y || !mo) return p;
  const d = new Date(Date.UTC(y, mo - 1, 1));
  const m = d.toLocaleDateString('es-CL', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  return m.charAt(0).toUpperCase() + m.slice(1);
};

interface MetricsRow {
  period: string;
  period_total: number;
  historical_total: number;
  prev_month_total: number;
  mom_pct: number | null;
  prev_year_total: number;
  yoy_pct: number | null;
}

export default function SucursalComisiones({ costCenter }: { costCenter: string }) {
  const { profile } = usePortalAuth();
  const companyId = profile?.portal_company_id ?? null;
  const [summary, setSummary] = useState<SummaryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<string | null>(null);
  const [workers, setWorkers] = useState<WorkerRow[]>([]);
  const [loadingW, setLoadingW] = useState(false);
  const [openWorker, setOpenWorker] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<MetricsRow | null>(null);

  useEffect(() => {
    if (!period || !companyId) { setMetrics(null); return; }
    let cancel = false;
    (async () => {
      const { data, error } = await supabase.rpc('get_commissions_metrics', {
        p_company_id: companyId, p_cost_center: costCenter, p_period: period,
      });
      if (cancel) return;
      if (error) { console.error('[commissions-metrics]', error); setMetrics(null); return; }
      setMetrics(((data ?? [])[0] as MetricsRow) ?? null);
    })();
    return () => { cancel = true; };
  }, [companyId, costCenter, period]);

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_commissions_summary', { p_company_id: companyId });
      if (cancel) return;
      if (error) console.error('[commissions-summary]', error);
      const rows = ((data ?? []) as SummaryRow[]).filter(r => r.cost_center === costCenter);
      setSummary(rows);
      setPeriod(rows[0]?.period ?? null);
      setLoading(false);
    })();
    return () => { cancel = true; };
  }, [companyId, costCenter]);

  useEffect(() => {
    if (!period) { setWorkers([]); return; }
    let cancel = false;
    (async () => {
      setLoadingW(true);
      const { data, error } = await supabase.rpc('get_commissions_worker_detail', {
        p_company_id: companyId, p_cost_center: costCenter, p_period: period,
      });
      if (cancel) return;
      if (error) console.error('[commissions-worker]', error);
      setWorkers((data ?? []) as WorkerRow[]);
      setLoadingW(false);
    })();
    return () => { cancel = true; };
  }, [companyId, costCenter, period]);

  const periods = useMemo(
    () => Array.from(new Set(summary.map(s => s.period))).sort((a, b) => (a < b ? 1 : -1)),
    [summary]
  );

  const current = useMemo(() => summary.find(s => s.period === period), [summary, period]);

  const chartData = useMemo(
    () => [...summary].sort((a, b) => (a.period < b.period ? -1 : 1)).map(s => ({
      period: fmtPeriod(s.period),
      total: Number(s.total_amount) || 0,
    })),
    [summary]
  );

  const grouped = useMemo(() => {
    const m = new Map<string, { workerId: string | null; nombre: string; rut: string; total: number; items: WorkerRow[] }>();
    for (const w of workers) {
      const key = w.worker_id ?? w.rut;
      const g = m.get(key) ?? { workerId: w.worker_id, nombre: w.nombre, rut: w.rut, total: Number(w.total_worker) || 0, items: [] };
      g.items.push(w);
      g.total = Number(w.total_worker) || g.total;
      m.set(key, g);
    }
    return Array.from(m.entries()).map(([k, v]) => ({ key: k, ...v })).sort((a, b) => b.total - a.total);
  }, [workers]);

  if (loading) {
    return <div className="p-card p-6"><Skeleton className="h-24 w-full" /></div>;
  }

  if (summary.length === 0) {
    return (
      <div className="p-card p-10 text-center">
        <DollarSign className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">Sin comisiones registradas para esta sucursal.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header con selector y KPIs */}
      <div
        className="rounded-2xl p-5 text-white shadow-lg"
        style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #ec4899 100%)' }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-wider font-semibold opacity-80">Comisiones de la sucursal</p>
            <h3 className="text-xl font-bold mt-1">Resumen por período</h3>
          </div>
          <select
            value={period ?? ''}
            onChange={e => setPeriod(e.target.value)}
            className="bg-white/15 backdrop-blur border border-white/20 rounded-lg px-3 py-2 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-white/40"
          >
            {periods.map(p => (
              <option key={p} value={p} className="text-slate-900">{fmtPeriod(p)}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-5">
          <div className="bg-white/15 backdrop-blur rounded-xl p-4 border border-white/20">
            <div className="flex items-center gap-2 text-xs opacity-90"><DollarSign className="w-3.5 h-3.5" /> Total comisiones</div>
            <p className="text-3xl font-bold mt-1 tabular-nums">{fmtCLP(current?.total_amount ?? 0)}</p>
          </div>
          <div className="bg-white/15 backdrop-blur rounded-xl p-4 border border-white/20">
            <div className="flex items-center gap-2 text-xs opacity-90"><Users className="w-3.5 h-3.5" /> Trabajadores</div>
            <p className="text-3xl font-bold mt-1 tabular-nums">{current?.worker_count ?? 0}</p>
          </div>
        </div>
      </div>

      {/* Métricas comparativas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {(() => {
          const fmtPct = (v: number | null | undefined) => {
            if (v === null || v === undefined) return null;
            const n = Number(v);
            const sign = n > 0 ? '+' : '';
            return `${sign}${n.toFixed(1)}%`;
          };
          const pctColor = (v: number | null | undefined) => {
            if (v === null || v === undefined) return '#94a3b8';
            return Number(v) >= 0 ? '#1D9E75' : '#dc2626';
          };
          const cards = [
            { label: 'Histórico acumulado', value: metrics ? fmtCLP(metrics.historical_total) : '—', color: '#1B3A5C' },
            {
              label: 'Variación vs mes anterior',
              value: metrics ? (fmtPct(metrics.mom_pct) ?? '—') : '—',
              color: pctColor(metrics?.mom_pct),
            },
            {
              label: 'Variación vs mismo mes año anterior',
              value: metrics ? (fmtPct(metrics.yoy_pct) ?? 's/d') : 's/d',
              color: metrics?.yoy_pct == null ? '#94a3b8' : pctColor(metrics?.yoy_pct),
            },
          ];
          return cards.map(c => (
            <div key={c.label} className="p-card p-5">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{c.label}</p>
              <p className="text-2xl font-bold mt-2 tabular-nums" style={{ color: c.color }}>{c.value}</p>
            </div>
          ));
        })()}
      </div>


      {/* Gráfico evolución */}
      <div className="p-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4" style={{ color: '#a855f7' }} />
          <h3 className="text-sm font-bold tracking-tight" style={{ color: '#1B3A5C' }}>
            Evolución por período
          </h3>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradComm" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a855f7" />
                  <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="period" tick={{ fontSize: 11 }} stroke="#64748b" />
              <YAxis tick={{ fontSize: 11 }} stroke="#64748b"
                tickFormatter={(v: number) => v >= 1_000_000 ? `${(v/1_000_000).toFixed(1)}M` : `${Math.round(v/1000)}k`} />
              <Tooltip
                formatter={(v: number) => [fmtCLP(v), 'Total']}
                contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
              />
              <Bar dataKey="total" fill="url(#gradComm)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detalle por trabajador */}
      <div className="p-card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-bold tracking-tight" style={{ color: '#1B3A5C' }}>
            Detalle por trabajador {period && <span className="text-muted-foreground font-normal">· {fmtPeriod(period)}</span>}
          </h3>
          <span className="text-xs text-muted-foreground tabular-nums">{grouped.length} trabajadores</span>
        </div>
        {loadingW ? (
          <div className="p-6 space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : grouped.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Sin trabajadores con comisiones en este período.</div>
        ) : (
          <ul className="divide-y divide-slate-200">
            {grouped.map(g => {
              const isOpen = openWorker === g.key;
              return (
                <li key={g.key}>
                  <button
                    type="button"
                    onClick={() => setOpenWorker(isOpen ? null : g.key)}
                    className="w-full flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform shrink-0 ${isOpen ? '' : '-rotate-90'}`} />
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate" style={{ color: '#1B3A5C' }}>{g.nombre}</p>
                        <p className="text-xs text-muted-foreground font-mono tabular-nums">{formatRut(g.rut)}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold tabular-nums text-sm" style={{ color: '#a855f7' }}>{fmtCLP(g.total)}</p>
                      <p className="text-[10px] text-muted-foreground">{g.items.length} concepto{g.items.length === 1 ? '' : 's'}</p>
                    </div>
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-4 pt-1 bg-slate-50/50">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            <th className="text-left py-1.5 font-semibold">Concepto</th>
                            <th className="text-right py-1.5 font-semibold">Monto</th>
                          </tr>
                        </thead>
                        <tbody>
                          {g.items.map((it, idx) => (
                            <tr key={idx} className="border-t border-slate-200">
                              <td className="py-1.5">{it.concept}</td>
                              <td className="py-1.5 text-right font-mono tabular-nums">{fmtCLP(it.amount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
