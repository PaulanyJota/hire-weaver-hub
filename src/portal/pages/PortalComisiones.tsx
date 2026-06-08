import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { usePortalAuth } from '@/portal/hooks/usePortalAuth';
import { Skeleton } from '@/components/ui/skeleton';
import PortalPageHeader from '../components/PortalPageHeader';
import { sucursalName } from '../lib/sucursales';
import { DollarSign, Users, TrendingUp, Building2, Trophy, X, ChevronDown, ChevronRight } from 'lucide-react';
import { useBranchRankingKpis } from '../hooks/useBranchRankingKpis';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts';

const LUCANO_COMPANY_ID = '11111111-1111-1111-1111-111111111111';

interface Summary {
  period: string;
  total: number;
  trabajadores: number;
  por_sucursal: { sucursal: string; trabajadores: number; total: number; pct: number }[];
  por_concepto: { concept: string; total: number; promedio: number; ocurrencias: number }[];
  top_workers: { worker_id: string; nombre: string; sucursal: string; total: number; conceptos: number }[];
}

const fmtCLP = (n: number) => '$' + Math.round(Number(n) || 0).toLocaleString('es-CL');
const fmtPeriod = (p: string) => {
  if (!p) return '';
  const [y, m] = p.slice(0, 10).split('-');
  const d = new Date(Date.UTC(Number(y), Number(m) - 1, 1));
  const s = d.toLocaleDateString('es-CL', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

export default function PortalComisiones() {
  const { company } = usePortalAuth();
  const companyId = company?.id ?? LUCANO_COMPANY_ID;

  const [periods, setPeriods] = useState<string[]>([]);
  const [period, setPeriod] = useState<string | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const { data: branchKpis } = useBranchRankingKpis(companyId);
  const perCapita = useMemo(
    () => (branchKpis?.comision_per_capita ?? []).slice().sort((a, b) => b.comision_per_capita - a.comision_per_capita),
    [branchKpis]
  );

  // Modals
  const [modal, setModal] = useState<null | 'total' | 'concept' | 'branch' | 'workers'>(null);
  const [expandedBranch, setExpandedBranch] = useState<string | null>(null);
  const [branchDetails, setBranchDetails] = useState<Record<string, Array<{ worker_id: string; nombre: string; concept: string; amount: number }>>>({});
  const [allPeriodSummaries, setAllPeriodSummaries] = useState<Summary[]>([]);
  const [trendLoading, setTrendLoading] = useState(false);
  const [selectedConcept, setSelectedConcept] = useState<string | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
  const [workerConcepts, setWorkerConcepts] = useState<Record<string, string[]>>({});

  useEffect(() => {
    let cancel = false;
    (async () => {
      const { data, error } = await supabase.rpc('get_commission_periods' as any, { p_company_id: companyId });
      if (cancel) return;
      if (error) console.error('[commission-periods]', error);
      const arr = (data ?? []) as string[];
      setPeriods(arr);
      if (arr.length && !period) setPeriod(arr[0]);
    })();
    return () => { cancel = true; };
  }, [companyId]);

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_commissions_summary' as any, {
        p_company_id: companyId,
        p_period: period,
      });
      if (cancel) return;
      if (error) console.error('[commissions-summary]', error);
      setSummary((data as Summary) ?? null);
      setLoading(false);
    })();
    return () => { cancel = true; };
  }, [companyId, period]);

  const topConcept = useMemo(
    () => summary?.por_concepto?.slice().sort((a, b) => b.total - a.total)[0],
    [summary]
  );
  const topBranch = summary?.por_sucursal?.[0];

  // Initialize selectedConcept/Branch when summary loads
  useEffect(() => {
    if (topConcept && !selectedConcept) setSelectedConcept(topConcept.concept);
    if (topBranch && !selectedBranch) setSelectedBranch(topBranch.sucursal);
  }, [topConcept, topBranch]);

  // Load branch detail (workers + concepts for current period)
  const loadBranchDetail = async (sucursal: string) => {
    if (branchDetails[sucursal] || !period) return;
    const start = period.slice(0, 10);
    const end = (() => {
      const [y, m] = start.split('-').map(Number);
      const next = new Date(Date.UTC(y, m, 1));
      return next.toISOString().slice(0, 10);
    })();
    const { data } = await supabase
      .from('portal_commissions')
      .select('worker_id, concept, amount, cost_center, portal_workers!inner(first_name, last_name)')
      .eq('portal_company_id', companyId)
      .eq('cost_center', sucursal)
      .gte('period', start)
      .lt('period', end);
    const rows = (data ?? []).map((r: any) => {
      const w = Array.isArray(r.portal_workers) ? r.portal_workers[0] : r.portal_workers;
      return {
        worker_id: r.worker_id,
        nombre: w ? `${w.first_name} ${w.last_name}` : '—',
        concept: r.concept,
        amount: Number(r.amount) || 0,
      };
    }).sort((a, b) => b.amount - a.amount);
    setBranchDetails(prev => ({ ...prev, [sucursal]: rows }));
  };

  // Load multi-period trends (last 3 periods)
  const loadTrend = async () => {
    if (allPeriodSummaries.length > 0 || periods.length === 0) return;
    setTrendLoading(true);
    const last3 = periods.slice(0, 3);
    const results = await Promise.all(last3.map(p =>
      supabase.rpc('get_commissions_summary' as any, { p_company_id: companyId, p_period: p })
    ));
    const sums = results.map(r => r.data as Summary).filter(Boolean);
    setAllPeriodSummaries(sums);
    setTrendLoading(false);
  };

  // Load worker → concepts list (for workers modal)
  const loadWorkerConcepts = async () => {
    if (Object.keys(workerConcepts).length > 0 || !period) return;
    const start = period.slice(0, 10);
    const end = (() => {
      const [y, m] = start.split('-').map(Number);
      return new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10);
    })();
    const { data } = await supabase
      .from('portal_commissions')
      .select('worker_id, concept')
      .eq('portal_company_id', companyId)
      .gte('period', start)
      .lt('period', end);
    const map: Record<string, string[]> = {};
    (data ?? []).forEach((r: any) => {
      if (!map[r.worker_id]) map[r.worker_id] = [];
      if (!map[r.worker_id].includes(r.concept)) map[r.worker_id].push(r.concept);
    });
    setWorkerConcepts(map);
  };

  const openModal = (m: 'total' | 'concept' | 'branch' | 'workers') => {
    setModal(m);
    if (m === 'concept' || m === 'branch') loadTrend();
    if (m === 'workers') loadWorkerConcepts();
  };

  // Concept trend data: amount per period for selectedConcept
  const conceptTrendData = useMemo(() => {
    if (!selectedConcept) return [];
    return allPeriodSummaries.slice().reverse().map(s => {
      const row = s.por_concepto?.find(c => c.concept === selectedConcept);
      return { period: fmtPeriod(s.period), total: row?.total ?? 0 };
    });
  }, [allPeriodSummaries, selectedConcept]);

  // Branch trend data: amount per period for selectedBranch
  const branchTrendData = useMemo(() => {
    if (!selectedBranch) return [];
    return allPeriodSummaries.slice().reverse().map(s => {
      const row = s.por_sucursal?.find(b => b.sucursal === selectedBranch);
      return { period: fmtPeriod(s.period), total: row?.total ?? 0 };
    });
  }, [allPeriodSummaries, selectedBranch]);

  // Branch comparative (current period, all branches)
  const branchComparative = useMemo(() => {
    if (!summary?.por_sucursal) return [];
    return summary.por_sucursal.slice().sort((a, b) => b.total - a.total)
      .map(b => ({ sucursal: sucursalName(b.sucursal), code: b.sucursal, total: b.total }));
  }, [summary]);

  const conceptList = summary?.por_concepto?.map(c => c.concept) ?? [];
  const branchList = summary?.por_sucursal?.map(b => b.sucursal) ?? [];
  const enrichedWorkers = useMemo(() => {
    return (summary?.top_workers ?? []).slice().sort((a, b) => b.total - a.total).map(w => ({
      ...w,
      conceptos_list: workerConcepts[w.worker_id] ?? [],
    }));
  }, [summary, workerConcepts]);


  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <PortalPageHeader
        eyebrow="Comisiones"
        title="Comisiones del equipo"
        subtitle={period ? fmtPeriod(period) : 'Cargando...'}
      />

      {/* Selector */}
      <div className="flex items-center gap-3">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Período</label>
        <select
          value={period ?? ''}
          onChange={e => setPeriod(e.target.value)}
          className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-orange-400"
          style={{ color: '#1B3A5C' }}
        >
          {periods.map(p => (
            <option key={p} value={p}>{fmtPeriod(p)}</option>
          ))}
        </select>
      </div>

      {/* KPIs */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {([
          { key: 'total', label: 'Total comisiones', value: loading ? null : fmtCLP(summary?.total ?? 0), icon: DollarSign, color: '#F97316' },
          { key: 'workers', label: 'Trabajadores con comisión', value: loading ? null : `${summary?.trabajadores ?? 0}`, icon: Users, color: '#1B3A5C' },
          { key: 'concept', label: 'Top concepto', value: loading ? null : (topConcept?.concept ?? '—'), icon: TrendingUp, color: '#1D9E75' },
          { key: 'branch', label: 'Top sucursal', value: loading ? null : (topBranch ? `${sucursalName(topBranch.sucursal)} · ${topBranch.pct}%` : '—'), icon: Building2, color: '#EA580C' },
        ] as const).map(c => (
          <button
            key={c.label}
            type="button"
            onClick={() => openModal(c.key)}
            className="p-card p-5 text-left hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-400"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{c.label}</p>
                {c.value === null ? (
                  <Skeleton className="h-8 w-24 mt-2" />
                ) : (
                  <p className="text-xl font-bold mt-2 tabular-nums truncate" style={{ color: c.color }}>{c.value}</p>
                )}
                <p className="text-[10px] text-muted-foreground mt-1">Click para ver detalle →</p>
              </div>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `${c.color}15`, color: c.color }}>
                <c.icon className="w-5 h-5" />
              </div>
            </div>
          </button>
        ))}
      </section>

      {/* Por sucursal */}
      <section className="p-card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-2">
          <Building2 className="w-4 h-4" style={{ color: '#F97316' }} />
          <h3 className="text-sm font-bold tracking-tight" style={{ color: '#1B3A5C' }}>Por sucursal</h3>
        </div>
        {loading ? (
          <div className="p-6 space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : !summary?.por_sucursal?.length ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Sin comisiones en este período.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-muted-foreground border-b border-slate-200">
                <th className="text-left px-5 py-2 font-semibold">Sucursal</th>
                <th className="text-right px-3 py-2 font-semibold">N° trabajadores</th>
                <th className="text-right px-3 py-2 font-semibold">Total</th>
                <th className="text-left px-5 py-2 font-semibold w-[35%]">% del total</th>
              </tr>
            </thead>
            <tbody>
              {summary.por_sucursal.map(s => (
                <tr key={s.sucursal} className="border-b border-slate-100 hover:bg-orange-50/30">
                  <td className="px-5 py-3 font-semibold" style={{ color: '#1B3A5C' }}>{sucursalName(s.sucursal)}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{s.trabajadores}</td>
                  <td className="px-3 py-3 text-right font-mono tabular-nums font-semibold" style={{ color: '#F97316' }}>{fmtCLP(s.total)}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full"
                          style={{ width: `${Math.min(100, Number(s.pct))}%`, background: 'linear-gradient(90deg, #F97316, #EA580C)' }} />
                      </div>
                      <span className="text-xs font-bold tabular-nums w-12 text-right" style={{ color: '#EA580C' }}>{s.pct}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Por concepto */}
      <section className="p-card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-2">
          <TrendingUp className="w-4 h-4" style={{ color: '#F97316' }} />
          <h3 className="text-sm font-bold tracking-tight" style={{ color: '#1B3A5C' }}>Por concepto</h3>
        </div>
        {loading ? (
          <div className="p-6 space-y-2">{[1,2].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : !summary?.por_concepto?.length ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Sin conceptos.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-muted-foreground border-b border-slate-200">
                <th className="text-left px-5 py-2 font-semibold">Concepto</th>
                <th className="text-right px-3 py-2 font-semibold">Ocurrencias</th>
                <th className="text-right px-3 py-2 font-semibold">Total</th>
                <th className="text-right px-5 py-2 font-semibold">Promedio</th>
              </tr>
            </thead>
            <tbody>
              {summary.por_concepto.map(c => (
                <tr key={c.concept} className="border-b border-slate-100 hover:bg-orange-50/30">
                  <td className="px-5 py-3 font-semibold" style={{ color: '#1B3A5C' }}>{c.concept}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{c.ocurrencias}</td>
                  <td className="px-3 py-3 text-right font-mono tabular-nums font-semibold" style={{ color: '#F97316' }}>{fmtCLP(c.total)}</td>
                  <td className="px-5 py-3 text-right font-mono tabular-nums">{fmtCLP(c.promedio)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Top trabajadores */}
      <section className="p-card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-2">
          <Trophy className="w-4 h-4" style={{ color: '#F97316' }} />
          <h3 className="text-sm font-bold tracking-tight" style={{ color: '#1B3A5C' }}>Top trabajadores</h3>
        </div>
        {loading ? (
          <div className="p-6 space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : !summary?.top_workers?.length ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Sin trabajadores con comisión.</div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {summary.top_workers.slice(0, 10).map((w, idx) => (
              <li key={w.worker_id} className="flex items-center gap-4 px-5 py-3 hover:bg-orange-50/30">
                <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                  style={{
                    background: idx < 3 ? 'linear-gradient(135deg, #F97316, #EA580C)' : '#f1f5f9',
                    color: idx < 3 ? 'white' : '#64748b',
                  }}>
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <Link to={`/portal/trabajadores/${w.worker_id}`}
                    className="font-semibold text-sm truncate block hover:text-[#F97316] transition-colors"
                    style={{ color: '#1B3A5C' }}>
                    {w.nombre}
                  </Link>
                  <p className="text-[11px] text-muted-foreground">{sucursalName(w.sucursal)} · {w.conceptos} concepto{w.conceptos === 1 ? '' : 's'}</p>
                </div>
                <p className="font-bold tabular-nums text-sm shrink-0" style={{ color: '#F97316' }}>{fmtCLP(w.total)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Comisión per cápita por sucursal */}
      <section className="p-card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-2">
          <Users className="w-4 h-4" style={{ color: '#F97316' }} />
          <h3 className="text-sm font-bold tracking-tight" style={{ color: '#1B3A5C' }}>Comisión per cápita por sucursal</h3>
        </div>
        {!branchKpis ? (
          <div className="p-6 space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : perCapita.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">Sin datos de comisiones.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-muted-foreground border-b border-slate-200">
                <th className="text-left px-5 py-2 font-semibold">Sucursal</th>
                <th className="text-right px-3 py-2 font-semibold">Trabajadores totales</th>
                <th className="text-right px-3 py-2 font-semibold">Con comisión</th>
                <th className="text-right px-3 py-2 font-semibold">Total comisiones</th>
                <th className="text-right px-5 py-2 font-semibold">Comisión por persona</th>
              </tr>
            </thead>
            <tbody>
              {perCapita.map(r => (
                <tr key={r.sucursal} className="border-b border-slate-100 hover:bg-orange-50/30">
                  <td className="px-5 py-3 font-semibold" style={{ color: '#1B3A5C' }}>{sucursalName(r.sucursal)}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{r.trabajadores_totales}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{r.con_comision}</td>
                  <td className="px-3 py-3 text-right font-mono tabular-nums">{fmtCLP(r.total_comisiones)}</td>
                  <td className="px-5 py-3 text-right font-mono tabular-nums font-bold" style={{ color: '#F97316' }}>{fmtCLP(r.comision_per_capita)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
