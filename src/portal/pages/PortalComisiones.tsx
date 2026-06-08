import { Fragment, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { usePortalAuth } from '@/portal/hooks/usePortalAuth';
import { Skeleton } from '@/components/ui/skeleton';
import PortalPageHeader from '../components/PortalPageHeader';
import { sucursalName } from '../lib/sucursales';
import { sortByBranch, branchOrder } from '../constants/branches';
import { fmtPeriodEs } from '../lib/periodLabel';
import { DollarSign, Users, TrendingUp, Building2, Trophy, X, ChevronDown, ChevronRight, AlertTriangle, ArrowDownRight, ArrowUpRight, Sparkles, XCircle } from 'lucide-react';
import { useBranchRankingKpis, useSalaryKpis } from '../hooks/useBranchRankingKpis';
import { BRANCH_ORDER, branchName as branchNameFn } from '../constants/branches';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts';
import PortalSearchBar, { matchesSearch } from '../components/PortalSearchBar';

const LUCANO_COMPANY_ID = '11111111-1111-1111-1111-111111111111';

interface Summary {
  period: string;
  total: number;
  trabajadores: number;
  por_sucursal: { sucursal: string; trabajadores: number; total: number; pct: number }[];
  por_concepto: { concept: string; total: number; promedio: number; ocurrencias: number }[];
  top_workers: { worker_id: string; nombre: string; sucursal: string; total: number; conceptos: number }[];
}

interface HistoricalByPeriod {
  period: string;
  periodo_label: string;
  total: number;
  trabajadores: number;
  total_mes_anterior: number;
  delta_mes_abs: number | null;
  delta_mes_pct: number | null;
  total_anio_anterior: number;
  delta_anio_abs: number | null;
  delta_anio_pct: number | null;
}
interface HistoricalByBranch {
  period: string;
  periodo_label: string;
  sucursal: string;
  total: number;
  trabajadores: number;
  delta_mes_abs: number | null;
  delta_mes_pct: number | null;
  tendencia: 'up' | 'down' | 'new' | 'lost' | 'flat' | null;
}
interface HistoricalByConcept {
  period: string;
  concept: string;
  total: number;
  ocurrencias: number;
  delta_mes_pct: number | null;
}
interface HistoricalAlert {
  tipo: string;
  sucursal?: string;
  delta_pct?: number;
  total_actual?: number;
  total_anterior?: number;
}
interface Historical {
  by_period: HistoricalByPeriod[];
  by_branch: HistoricalByBranch[];
  by_concept: HistoricalByConcept[];
  alerts: HistoricalAlert[];
}

const fmtCLP = (n: number) => '$' + Math.round(Number(n) || 0).toLocaleString('es-CL');
// En Chile el período de pago = mes siguiente al trabajado. Mostramos siempre el mes TRABAJADO.
// Las comisiones en portal_commissions ya están en el período correcto (no aplican desfase).
const fmtPeriod = (p: string) => fmtPeriodEs(p);
const MESES_CORTOS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const fmtPeriodShort = (p: string) => {
  if (!p) return '';
  const ymd = p.slice(0, 10).split('-');
  if (ymd.length < 2) return p;
  const y = Number(ymd[0]); const m = Number(ymd[1]);
  if (!y || !m) return p;
  return `${MESES_CORTOS[m - 1]} ${y}`;
};

export default function PortalComisiones() {
  const { company } = usePortalAuth();
  const companyId = company?.id ?? LUCANO_COMPANY_ID;

  const [periods, setPeriods] = useState<string[]>([]);
  const [period, setPeriod] = useState<string | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const { data: branchKpis } = useBranchRankingKpis(companyId);
  const { data: salary } = useSalaryKpis(companyId);
  const perCapita = useMemo(
    () => sortByBranch(branchKpis?.comision_per_capita ?? []),
    [branchKpis]
  );

  // Lookup helpers for top trabajadores: % sobre sueldo (por nombre) y constantes (por nombre)
  const pctByName = useMemo(() => {
    const m: Record<string, number> = {};
    (salary?.comision_sobre_sueldo ?? []).forEach(r => { m[r.nombre.trim().toLowerCase()] = Number(r.pct_comision) || 0; });
    return m;
  }, [salary]);
  const constantSet = useMemo(() => {
    const s = new Set<string>();
    (salary?.constantes ?? []).forEach(r => s.add(r.nombre.trim().toLowerCase()));
    return s;
  }, [salary]);

  // Modals
  const [modal, setModal] = useState<null | 'total' | 'concept' | 'branch' | 'workers'>(null);
  const [expandedBranch, setExpandedBranch] = useState<string | null>(null);
  const [branchDetails, setBranchDetails] = useState<Record<string, Array<{ worker_id: string; nombre: string; concept: string; amount: number }>>>({});
  const [allPeriodSummaries, setAllPeriodSummaries] = useState<Summary[]>([]);
  const [trendLoading, setTrendLoading] = useState(false);
  const [selectedConcept, setSelectedConcept] = useState<string | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
  const [workerConcepts, setWorkerConcepts] = useState<Record<string, string[]>>({});

  // Histórico (modal Total → 3 tabs)
  const [historical, setHistorical] = useState<Historical | null>(null);
  const [historicalLoading, setHistoricalLoading] = useState(false);
  const [totalTab, setTotalTab] = useState<'evolucion' | 'sucursal' | 'concepto'>('evolucion');

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
  const topBranch = useMemo(
    () => summary?.por_sucursal?.slice().sort((a, b) => b.total - a.total)[0],
    [summary]
  );

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
    const { data, error } = await supabase
      .from('portal_commissions')
      .select('worker_id, concept, amount, cost_center')
      .eq('portal_company_id', companyId)
      .eq('cost_center', sucursal)
      .gte('period', start)
      .lt('period', end);
    if (error) console.error('[branch-detail]', error);
    const commissions = (data ?? []) as { worker_id: string; concept: string; amount: number }[];
    const workerIds = Array.from(new Set(commissions.map(c => c.worker_id)));
    const nameMap: Record<string, string> = {};
    if (workerIds.length) {
      const { data: workers } = await supabase
        .from('portal_workers')
        .select('id, first_name, last_name')
        .in('id', workerIds);
      (workers ?? []).forEach((w: any) => {
        nameMap[w.id] = `${w.first_name ?? ''} ${w.last_name ?? ''}`.trim() || '—';
      });
    }
    const rows = commissions.map(r => ({
      worker_id: r.worker_id,
      nombre: nameMap[r.worker_id] ?? '—',
      concept: r.concept,
      amount: Number(r.amount) || 0,
    })).sort((a, b) => b.amount - a.amount);
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

  const loadHistorical = async () => {
    if (historical || historicalLoading) return;
    setHistoricalLoading(true);
    const { data, error } = await supabase.rpc('get_commissions_historical' as any, { p_company_id: companyId });
    if (error) console.error('[commissions-historical]', error);
    setHistorical((data as Historical) ?? null);
    setHistoricalLoading(false);
  };

  const openModal = (m: 'total' | 'concept' | 'branch' | 'workers') => {
    setModal(m);
    if (m === 'concept' || m === 'branch') loadTrend();
    if (m === 'workers') loadWorkerConcepts();
    if (m === 'total') loadHistorical();
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
    return sortByBranch(summary.por_sucursal)
      .map(b => ({ sucursal: sucursalName(b.sucursal), code: b.sucursal, total: b.total }));
  }, [summary]);

  const porSucursalSorted = useMemo(
    () => sortByBranch(summary?.por_sucursal ?? []),
    [summary]
  );

  const filteredSucursal = useMemo(() => {
    if (!search.trim()) return porSucursalSorted;
    return porSucursalSorted.filter(s => matchesSearch([s.sucursal, sucursalName(s.sucursal)], search));
  }, [porSucursalSorted, search]);

  const conceptList = summary?.por_concepto?.map(c => c.concept) ?? [];
  const branchList = porSucursalSorted.map(b => b.sucursal);
  const enrichedWorkers = useMemo(() => {
    return (summary?.top_workers ?? []).slice().sort((a, b) => b.total - a.total).map(w => ({
      ...w,
      conceptos_list: workerConcepts[w.worker_id] ?? [],
    }));
  }, [summary, workerConcepts]);

  const filteredWorkers = useMemo(() => {
    if (!search.trim()) return enrichedWorkers;
    return enrichedWorkers.filter(w => matchesSearch([
      w.nombre, w.sucursal, sucursalName(w.sucursal), ...(w.conceptos_list ?? []),
    ], search));
  }, [enrichedWorkers, search]);

  const filteredConceptos = useMemo(() => {
    if (!search.trim() || !summary?.por_concepto) return summary?.por_concepto ?? [];
    return summary.por_concepto.filter(c => matchesSearch([c.concept], search));
  }, [summary, search]);


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

      <PortalSearchBar
        value={search}
        onChange={setSearch}
        placeholder="Buscar por trabajador, sucursal o concepto…"
        total={enrichedWorkers.length}
        results={filteredWorkers.length}
      />

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
              {filteredSucursal.map(s => (
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
        {(() => {
          const presentes = new Set(porSucursalSorted.map(s => s.sucursal));
          const allKnown = Object.keys(BRANCH_ORDER).filter(k => k !== 'LC_NU' && k !== 'LC_VI');
          const sinCom = allKnown
            .filter(c => !presentes.has(c) && !presentes.has(c.replace('Ñ', 'N')))
            .sort((a, b) => (BRANCH_ORDER[a] ?? 99) - (BRANCH_ORDER[b] ?? 99));
          if (!sinCom.length || loading) return null;
          return (
            <div className="px-5 py-3 border-t border-slate-100 text-[11px] text-slate-500">
              ⚪ Sin comisiones este mes: {sinCom.map(c => branchNameFn(c)).join(' · ')}
            </div>
          );
        })()}
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
              {filteredConceptos.map(c => (
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
            {summary.top_workers.slice(0, 10).map((w, idx) => {
              const key = w.nombre.trim().toLowerCase();
              const pct = pctByName[key];
              const constante = constantSet.has(key);
              return (
              <li key={w.worker_id} className="flex items-center gap-4 px-5 py-3 hover:bg-orange-50/30">
                <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                  style={{
                    background: idx < 3 ? 'linear-gradient(135deg, #F97316, #EA580C)' : '#f1f5f9',
                    color: idx < 3 ? 'white' : '#64748b',
                  }}>
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link to={`/portal/trabajadores/${w.worker_id}`}
                      className="font-semibold text-sm truncate hover:text-[#F97316] transition-colors"
                      style={{ color: '#1B3A5C' }}>
                      {w.nombre}
                    </Link>
                    {constante && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        🔥 Constante
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">{sucursalName(w.sucursal)} · {w.conceptos} concepto{w.conceptos === 1 ? '' : 's'}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold tabular-nums text-sm" style={{ color: '#F97316' }}>{fmtCLP(w.total)}</p>
                  {pct !== undefined && (
                    <p className="text-[10px] text-slate-500 tabular-nums">= {pct.toFixed(1)}% de su sueldo</p>
                  )}
                </div>
              </li>
              );
            })}
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

      {/* ============ MODALES ============ */}
      {modal && (
        <Modal onClose={() => setModal(null)} title={
          modal === 'total' ? 'Análisis histórico de comisiones' :
          modal === 'concept' ? 'Evolución por concepto' :
          modal === 'branch' ? 'Evolución por sucursal' :
          'Trabajadores con comisión'
        }>
          {/* MODAL TOTAL — Análisis histórico con 3 tabs */}
          {modal === 'total' && (
            <TotalHistoricalView
              historical={historical}
              loading={historicalLoading}
              activeTab={totalTab}
              setActiveTab={setTotalTab}
              porSucursalSorted={porSucursalSorted}
              expandedBranch={expandedBranch}
              setExpandedBranch={setExpandedBranch}
              branchDetails={branchDetails}
              loadBranchDetail={loadBranchDetail}
              summary={summary}
            />
          )}

          {/* MODAL CONCEPT TREND */}
          {modal === 'concept' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Concepto:</label>
                <select
                  value={selectedConcept ?? ''}
                  onChange={e => setSelectedConcept(e.target.value)}
                  className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-orange-400"
                  style={{ color: '#1B3A5C' }}
                >
                  {conceptList.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Evolución mes a mes</p>
                <div className="h-64">
                  {trendLoading ? <Skeleton className="h-full w-full" /> : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={conceptTrendData}>
                        <defs>
                          <linearGradient id="gConceptTrend" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#FB923C" />
                            <stop offset="100%" stopColor="#EA580C" />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                        <XAxis dataKey="period" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`} />
                        <Tooltip
                          formatter={(v: any) => [fmtCLP(Number(v)), selectedConcept ?? '']}
                          contentStyle={{ background: 'white', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 12 }}
                        />
                        <Bar dataKey="total" fill="url(#gConceptTrend)" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* MODAL BRANCH TREND + COMPARATIVE */}
          {modal === 'branch' && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 flex-wrap">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sucursal:</label>
                <select
                  value={selectedBranch ?? ''}
                  onChange={e => setSelectedBranch(e.target.value)}
                  className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-orange-400"
                  style={{ color: '#1B3A5C' }}
                >
                  {branchList.map(b => <option key={b} value={b}>{sucursalName(b)}</option>)}
                </select>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
                  Evolución {selectedBranch ? sucursalName(selectedBranch) : ''} · últimos {allPeriodSummaries.length} períodos
                </p>
                <div className="h-56">
                  {trendLoading ? <Skeleton className="h-full w-full" /> : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={branchTrendData}>
                        <defs>
                          <linearGradient id="gBranchTrend" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#FB923C" />
                            <stop offset="100%" stopColor="#EA580C" />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                        <XAxis dataKey="period" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`} />
                        <Tooltip formatter={(v: any) => [fmtCLP(Number(v)), 'Total']} contentStyle={{ background: 'white', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 12 }} />
                        <Bar dataKey="total" fill="url(#gBranchTrend)" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Comparativa entre sucursales · {period ? fmtPeriod(period) : ''}</p>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={branchComparative} layout="vertical" margin={{ left: 8, right: 16 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`} />
                      <YAxis dataKey="sucursal" type="category" tick={{ fontSize: 11 }} width={110} axisLine={false} tickLine={false} />
                      <Tooltip formatter={(v: any) => [fmtCLP(Number(v)), 'Total']} contentStyle={{ background: 'white', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 12 }} />
                      <Bar dataKey="total" radius={[0, 6, 6, 0]}>
                        {branchComparative.map((entry, idx) => {
                          const isTop = entry.code === topBranch?.sucursal;
                          const shade = isTop ? '#EA580C' : `rgba(249,115,22,${Math.max(0.35, 1 - idx * 0.1)})`;
                          return <Cell key={idx} fill={shade} />;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* MODAL WORKERS */}
          {modal === 'workers' && summary && (
            <div>
              <p className="text-xs text-muted-foreground mb-3">{enrichedWorkers.length} trabajador{enrichedWorkers.length === 1 ? '' : 'es'} recibieron comisión este mes</p>
              <ul className="divide-y divide-slate-100">
                {enrichedWorkers.map((w, idx) => (
                  <li key={w.worker_id} className="flex items-start gap-3 py-3">
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 bg-orange-50 text-orange-600">{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <Link to={`/portal/trabajadores/${w.worker_id}`} className="font-semibold text-sm hover:text-[#F97316]" style={{ color: '#1B3A5C' }}>{w.nombre}</Link>
                      <p className="text-[11px] text-muted-foreground">{sucursalName(w.sucursal)}</p>
                      {w.conceptos_list.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {w.conceptos_list.map(c => (
                            <span key={c} className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-orange-50 text-orange-700 border border-orange-100">{c}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <p className="font-bold tabular-nums text-sm shrink-0" style={{ color: '#F97316' }}>{fmtCLP(w.total)}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

function Modal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,36,64,0.55)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between px-5 py-4 border-b border-slate-200">
          <h3 className="text-base font-bold tracking-tight" style={{ color: '#1B3A5C' }}>{title}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// TotalHistoricalView — 3 tabs: Evolución total / Por sucursal / Por concepto
// Powered por RPC get_commissions_historical (períodos en mes-de-pago,
// pero TODOS los labels visibles se muestran como mes TRABAJADO = paid - 1).
// ═════════════════════════════════════════════════════════════
interface THProps {
  historical: Historical | null;
  loading: boolean;
  activeTab: 'evolucion' | 'sucursal' | 'concepto';
  setActiveTab: (t: 'evolucion' | 'sucursal' | 'concepto') => void;
  porSucursalSorted: Summary['por_sucursal'];
  expandedBranch: string | null;
  setExpandedBranch: (s: string | null) => void;
  branchDetails: Record<string, Array<{ worker_id: string; nombre: string; concept: string; amount: number }>>;
  loadBranchDetail: (sucursal: string) => void;
  summary: Summary | null;
}

function DeltaPill({ pct }: { pct: number | null | undefined }) {
  if (pct === null || pct === undefined || Number.isNaN(Number(pct))) {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-400">—</span>;
  }
  const n = Number(pct);
  const positive = n >= 0;
  const bg = positive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700';
  const arrow = positive ? '↑' : '↓';
  return (
    <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[11px] font-bold tabular-nums ${bg}`}>
      {arrow}{Math.abs(n).toFixed(1)}%
    </span>
  );
}

function TendenciaIcon({ t }: { t: HistoricalByBranch['tendencia'] }) {
  switch (t) {
    case 'up': return <ArrowUpRight className="w-4 h-4 text-emerald-600" />;
    case 'down': return <ArrowDownRight className="w-4 h-4 text-red-600" />;
    case 'new': return <Sparkles className="w-4 h-4" style={{ color: '#F97316' }} />;
    case 'lost': return <XCircle className="w-4 h-4 text-red-600" />;
    default: return <span className="text-slate-400 text-xs">—</span>;
  }
}

function TotalHistoricalView({
  historical, loading, activeTab, setActiveTab,
  porSucursalSorted, expandedBranch, setExpandedBranch, branchDetails, loadBranchDetail, summary,
}: THProps) {
  if (loading || !historical) {
    return <div className="space-y-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>;
  }

  const tabs: { id: 'evolucion' | 'sucursal' | 'concepto'; label: string }[] = [
    { id: 'evolucion', label: 'Evolución total' },
    { id: 'sucursal', label: 'Por sucursal' },
    { id: 'concepto', label: 'Por concepto' },
  ];

  // by_period ordenado cronológicamente ascendente
  const periodsAsc = [...(historical.by_period ?? [])].sort((a, b) => (a.period < b.period ? -1 : 1));
  const chartData = periodsAsc.map(p => ({
    period: fmtPeriodShort(p.period),
    total: Number(p.total) || 0,
    trabajadores: p.trabajadores,
    delta_mes_pct: p.delta_mes_pct,
  }));

  // Nota automática sobre el período más reciente
  const latest = periodsAsc[periodsAsc.length - 1];
  const prev = periodsAsc[periodsAsc.length - 2];
  const autoNote = latest && latest.delta_mes_pct !== null && latest.delta_mes_pct < 0
    ? `⚠️ ${fmtPeriodEs(latest.period)} bajó ${fmtCLP(Math.abs(Number(latest.delta_mes_abs ?? 0)))} respecto a ${prev ? fmtPeriodEs(prev.period) : 'mes anterior'} (${Number(latest.delta_mes_pct).toFixed(1)}%)`
    : null;

  // Pivot por sucursal con los últimos 2 períodos
  const lastTwo = periodsAsc.slice(-2).map(p => p.period);
  const branchPivot = new Map<string, { sucursal: string; prev?: HistoricalByBranch; curr?: HistoricalByBranch }>();
  (historical.by_branch ?? []).forEach(b => {
    const entry = branchPivot.get(b.sucursal) ?? { sucursal: b.sucursal };
    if (b.period === lastTwo[0]) entry.prev = b;
    if (b.period === lastTwo[1]) entry.curr = b;
    branchPivot.set(b.sucursal, entry);
  });
  const branchRows = Array.from(branchPivot.values())
    .sort((a, b) => (branchOrder(a.sucursal) - branchOrder(b.sucursal)));

  const branchAlerts = (historical.by_branch ?? []).filter(
    b => b.period === lastTwo[1] && b.tendencia === 'down' && b.delta_mes_pct !== null && Math.abs(Number(b.delta_mes_pct)) > 50
  );

  // Por concepto: pivot último período
  const conceptPivot = new Map<string, { concept: string; prev?: HistoricalByConcept; curr?: HistoricalByConcept }>();
  (historical.by_concept ?? []).forEach(c => {
    const e = conceptPivot.get(c.concept) ?? { concept: c.concept };
    if (c.period === lastTwo[0]) e.prev = c;
    if (c.period === lastTwo[1]) e.curr = c;
    conceptPivot.set(c.concept, e);
  });
  const conceptRows = Array.from(conceptPivot.values())
    .sort((a, b) => (Number(b.curr?.total ?? 0) - Number(a.curr?.total ?? 0)));
  const conceptChart = conceptRows.map(r => ({
    concept: r.concept,
    total: Number(r.curr?.total ?? 0),
    prev: Number(r.prev?.total ?? 0),
  }));

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {tabs.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${
              activeTab === t.id
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB 1 — Evolución total */}
      {activeTab === 'evolucion' && (
        <div className="space-y-4">
          {autoNote && (
            <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{autoNote}</span>
            </div>
          )}
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <defs>
                  <linearGradient id="gHistTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FB923C" />
                    <stop offset="100%" stopColor="#EA580C" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="period" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`} />
                <Tooltip
                  contentStyle={{ background: 'white', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 12 }}
                  formatter={(v: any, _name, p: any) => {
                    const pct = p?.payload?.delta_mes_pct;
                    const arrow = pct == null ? '' : (pct >= 0 ? ' ↑' : ' ↓');
                    const pctStr = pct == null ? '' : ` (${arrow}${Math.abs(Number(pct)).toFixed(1)}%)`;
                    return [`${fmtCLP(Number(v))}${pctStr} · ${p?.payload?.trabajadores ?? 0} trab.`, 'Total'];
                  }}
                />
                <Bar dataKey="total" fill="url(#gHistTotal)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-muted-foreground border-b border-slate-200">
                <th className="text-left py-2 font-semibold">Período</th>
                <th className="text-right py-2 font-semibold">Total</th>
                <th className="text-right py-2 font-semibold">Trab.</th>
                <th className="text-right py-2 font-semibold">vs mes ant.</th>
                <th className="text-right py-2 font-semibold">vs año ant.</th>
              </tr>
            </thead>
            <tbody>
              {[...periodsAsc].reverse().map(p => (
                <tr key={p.period} className="border-b border-slate-100">
                  <td className="py-2 font-semibold" style={{ color: '#1B3A5C' }}>{fmtPeriodEs(p.period)}</td>
                  <td className="py-2 text-right font-mono tabular-nums" style={{ color: '#F97316' }}>{fmtCLP(p.total)}</td>
                  <td className="py-2 text-right tabular-nums">{p.trabajadores}</td>
                  <td className="py-2 text-right"><DeltaPill pct={p.delta_mes_pct} /></td>
                  <td className="py-2 text-right"><DeltaPill pct={p.delta_anio_pct} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 2 — Por sucursal */}
      {activeTab === 'sucursal' && (
        <div className="space-y-3">
          {branchAlerts.map((a, idx) => (
            <div key={idx} className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>⚠️ {sucursalName(a.sucursal)} cayó {Math.abs(Number(a.delta_mes_pct)).toFixed(1)}% vs mes anterior</span>
            </div>
          ))}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-muted-foreground border-b border-slate-200">
                  <th className="text-left px-2 py-2 font-semibold">Sucursal</th>
                  <th className="text-right px-2 py-2 font-semibold">{lastTwo[0] ? fmtPeriodShort(lastTwo[0]) : '—'}</th>
                  <th className="text-right px-2 py-2 font-semibold">{lastTwo[1] ? fmtPeriodShort(lastTwo[1]) : '—'}</th>
                  <th className="text-right px-2 py-2 font-semibold">Variación</th>
                  <th className="text-center px-2 py-2 font-semibold">Tend.</th>
                </tr>
              </thead>
              <tbody>
                {branchRows.map(r => {
                  const code = r.sucursal;
                  const isOpen = expandedBranch === code;
                  const detailRows = branchDetails[code];
                  // Solo permitir expandir si la sucursal tiene comisiones en el período actual del summary
                  const hasCurrent = porSucursalSorted?.some(s => s.sucursal === code);
                  return (
                    <Fragment key={code}>
                      <tr
                        className={`border-b border-slate-100 ${hasCurrent ? 'cursor-pointer hover:bg-orange-50/40' : ''}`}
                        onClick={() => {
                          if (!hasCurrent) return;
                          const next = isOpen ? null : code;
                          setExpandedBranch(next);
                          if (next) loadBranchDetail(next);
                        }}
                      >
                        <td className="px-2 py-2 font-semibold flex items-center gap-2" style={{ color: '#1B3A5C' }}>
                          {hasCurrent && (isOpen ? <ChevronDown className="w-3.5 h-3.5 text-slate-500" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-500" />)}
                          {sucursalName(code)}
                        </td>
                        <td className="px-2 py-2 text-right font-mono tabular-nums text-slate-700">{fmtCLP(Number(r.prev?.total ?? 0))}</td>
                        <td className="px-2 py-2 text-right font-mono tabular-nums font-semibold" style={{ color: '#F97316' }}>{fmtCLP(Number(r.curr?.total ?? 0))}</td>
                        <td className="px-2 py-2 text-right"><DeltaPill pct={r.curr?.delta_mes_pct ?? null} /></td>
                        <td className="px-2 py-2 text-center"><TendenciaIcon t={r.curr?.tendencia ?? null} /></td>
                      </tr>
                      {isOpen && hasCurrent && (
                        <tr className="bg-slate-50/60">
                          <td colSpan={5} className="px-2 py-3">
                            {!detailRows ? (
                              <div className="space-y-2">{[1,2].map(i => <Skeleton key={i} className="h-8 w-full" />)}</div>
                            ) : detailRows.length === 0 ? (
                              <p className="text-xs text-muted-foreground text-center">Sin detalle.</p>
                            ) : (
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                    <th className="text-left px-2 py-1 font-semibold">Trabajador</th>
                                    <th className="text-left px-2 py-1 font-semibold">Concepto</th>
                                    <th className="text-right px-2 py-1 font-semibold">Monto</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {detailRows.map((dr, i) => (
                                    <tr key={i} className="border-t border-slate-200">
                                      <td className="px-2 py-1">
                                        <Link to={`/portal/trabajadores/${dr.worker_id}`} className="font-semibold hover:text-[#F97316]" style={{ color: '#1B3A5C' }}>{dr.nombre}</Link>
                                      </td>
                                      <td className="px-2 py-1 text-muted-foreground">{dr.concept}</td>
                                      <td className="px-2 py-1 text-right font-mono tabular-nums" style={{ color: '#F97316' }}>{fmtCLP(dr.amount)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3 — Por concepto */}
      {activeTab === 'concepto' && (
        <div className="space-y-4">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={conceptChart} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`} />
                <YAxis dataKey="concept" type="category" tick={{ fontSize: 11 }} width={160} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v: any) => [fmtCLP(Number(v)), 'Total']}
                  contentStyle={{ background: 'white', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 12 }} />
                <Bar dataKey="total" radius={[0, 6, 6, 0]}>
                  {conceptChart.map((_, idx) => <Cell key={idx} fill={`rgba(249,115,22,${Math.max(0.4, 1 - idx * 0.12)})`} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-muted-foreground border-b border-slate-200">
                <th className="text-left py-2 font-semibold">Concepto</th>
                <th className="text-right py-2 font-semibold">{lastTwo[0] ? fmtPeriodShort(lastTwo[0]) : '—'}</th>
                <th className="text-right py-2 font-semibold">{lastTwo[1] ? fmtPeriodShort(lastTwo[1]) : '—'}</th>
                <th className="text-right py-2 font-semibold">Variación</th>
              </tr>
            </thead>
            <tbody>
              {conceptRows.map(r => (
                <tr key={r.concept} className="border-b border-slate-100">
                  <td className="py-2 font-semibold" style={{ color: '#1B3A5C' }}>{r.concept}</td>
                  <td className="py-2 text-right font-mono tabular-nums text-slate-700">{fmtCLP(Number(r.prev?.total ?? 0))}</td>
                  <td className="py-2 text-right font-mono tabular-nums font-semibold" style={{ color: '#F97316' }}>{fmtCLP(Number(r.curr?.total ?? 0))}</td>
                  <td className="py-2 text-right"><DeltaPill pct={r.curr?.delta_mes_pct ?? null} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
