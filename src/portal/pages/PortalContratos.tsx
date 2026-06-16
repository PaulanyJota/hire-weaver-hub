import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { usePortalAuth } from '../hooks/usePortalAuth';
import { Skeleton } from '@/components/ui/skeleton';
import {
  FileText, Users, AlertTriangle, DollarSign, Search, X, Briefcase, FileSignature,
  ArrowUp, ArrowDown, ArrowUpDown,
} from 'lucide-react';

import { BRANCH_NAMES, branchOrder } from '../constants/branches';
import { useSalaryKpis, useSalaryBreakdown, type SalaryBreakdownRow } from '../hooks/useBranchRankingKpis';
import { PieChart, Pie, Cell, Legend, Tooltip as RTooltip, ResponsiveContainer } from 'recharts';
import PortalSearchBar, { matchesSearch } from '../components/PortalSearchBar';

const LUCANO_COMPANY_ID = '11111111-1111-1111-1111-111111111111';

// Feature flag — ocultar análisis salarial (masa, dispersión, comisiones).
// Cambiar a true para reactivar la composición salarial y comisiones.
const SHOW_SALARY_ANALYTICS = false;

const fmtCLP = (n: number | null | undefined) =>
  n == null || Number(n) === 0 ? '—' : '$' + Math.round(Number(n)).toLocaleString('es-CL');

const fmtDate = (d: string | null) => {
  if (!d) return null;
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
};

const CC_NAME = BRANCH_NAMES;

interface Row {
  worker_id: string;
  first_name: string;
  last_name: string;
  nombre: string;
  cost_center: string;
  branch: string;
  contract_type: string | null;
  modality: string | null;
  start_date: string | null;
  end_date: string | null;
  liquid_salary: number;
  position: string | null;
}

export default function PortalContratos() {
  const { company } = usePortalAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showVenc, setShowVenc] = useState(false);
  const [commissionByWorker, setCommissionByWorker] = useState<Record<string, number>>({});
  const { data: salary } = useSalaryKpis(company?.id ?? LUCANO_COMPANY_ID);
  const { data: breakdown = [] } = useSalaryBreakdown(company?.id ?? LUCANO_COMPANY_ID, null);
  const breakdownByWorker = useMemo(() => {
    const m: Record<string, SalaryBreakdownRow> = {};
    breakdown.forEach(r => { m[r.worker_id] = r; });
    return m;
  }, [breakdown]);
  const [sortKey, setSortKey] = useState<'worker_name' | 'cost_center' | 'base_liquid' | 'commissions' | 'other_bonuses' | 'total_liquid' | 'pct_commissions'>('total_liquid');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const handleSort = (k: typeof sortKey) => {
    if (k === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(k); setSortDir('asc'); }
  };
  const sortedBreakdown = useMemo(() => {
    const arr = [...breakdown];
    arr.sort((a, b) => {
      if (sortKey === 'worker_name') return a.worker_name.localeCompare(b.worker_name);
      if (sortKey === 'cost_center') return branchOrder(a.cost_center) - branchOrder(b.cost_center);
      const av = Number((a as any)[sortKey] ?? 0);
      const bv = Number((b as any)[sortKey] ?? 0);
      return av - bv;
    });
    if (sortDir === 'desc') arr.reverse();
    return arr;
  }, [breakdown, sortKey, sortDir]);


  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      const cid = company?.id ?? LUCANO_COMPANY_ID;
      try {
        const { data, error } = await supabase
          .from('portal_contracts')
          .select(`
            id, worker_id, contract_type, modality, start_date, end_date,
            liquid_salary, position, is_current,
            portal_workers!inner ( id, first_name, last_name, cost_center, portal_company_id )
          `)
          .eq('is_current', true)
          .eq('portal_workers.portal_company_id', cid);

        if (error) throw error;

        const mapped: Row[] = (data ?? []).map((c: any) => {
          const w = Array.isArray(c.portal_workers) ? c.portal_workers[0] : c.portal_workers;
          return {
            worker_id: w?.id ?? c.worker_id,
            first_name: w?.first_name ?? '',
            last_name: w?.last_name ?? '',
            nombre: `${w?.first_name ?? ''} ${w?.last_name ?? ''}`.trim() || '—',
            cost_center: w?.cost_center ?? '',
            branch: CC_NAME[w?.cost_center] ?? w?.cost_center ?? '—',
            contract_type: c.contract_type,
            modality: c.modality,
            start_date: c.start_date,
            end_date: c.end_date,
            liquid_salary: Number(c.liquid_salary ?? 0),
            position: c.position,
          };
        });

        mapped.sort((a, b) =>
          (branchOrder(a.cost_center) - branchOrder(b.cost_center)) ||
          (a.last_name || '').localeCompare(b.last_name || '')
        );

        if (!cancelled) setRows(mapped);
      } catch (e: any) {
        console.error('[PortalContratos] load error', e);
        if (!cancelled) setError(e?.message ?? 'Error al cargar contratos');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [company?.id]);

  // Carga comisiones del último período (mes trabajado) para columna "Costo"
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cid = company?.id ?? LUCANO_COMPANY_ID;
      const { data: periodsData } = await supabase.rpc('get_commission_periods' as any, { p_company_id: cid });
      const periods = (periodsData ?? []) as string[];
      if (!periods.length) return;
      const start = periods[0].slice(0, 10);
      const [y, m] = start.split('-').map(Number);
      const end = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10);
      const { data } = await supabase
        .from('portal_commissions')
        .select('worker_id, amount')
        .eq('portal_company_id', cid)
        .gte('period', start)
        .lt('period', end);
      if (cancelled) return;
      const map: Record<string, number> = {};
      (data ?? []).forEach((r: any) => {
        map[r.worker_id] = (map[r.worker_id] ?? 0) + (Number(r.amount) || 0);
      });
      setCommissionByWorker(map);
    })();
    return () => { cancelled = true; };
  }, [company?.id]);

  const kpis = useMemo(() => {
    const total = rows.length;
    const indef = rows.filter(r => r.contract_type === 'indefinido').length;
    const plazo = rows.filter(r => r.contract_type === 'plazo_fijo').length;
    const est = rows.filter(r => (r.modality ?? '').toUpperCase() === 'EST').length;
    const masa = rows.reduce((acc, r) => acc + (r.liquid_salary || 0), 0);
    return {
      total,
      est,
      indef_pct: total ? Math.round((indef / total) * 100) : 0,
      plazo_pct: total ? Math.round((plazo / total) * 100) : 0,
      est_pct: total ? Math.round((est / total) * 100) : 0,
      masa,
    };
  }, [rows]);

  const venc30 = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const in30 = new Date(today); in30.setDate(in30.getDate() + 30);
    return rows
      .filter(r => r.end_date && new Date(r.end_date + 'T00:00:00') >= today && new Date(r.end_date + 'T00:00:00') <= in30)
      .sort((a, b) => (a.end_date || '').localeCompare(b.end_date || ''));
  }, [rows]);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    return rows.filter(r => matchesSearch([
      r.nombre, r.first_name, r.last_name,
      r.branch, r.cost_center, BRANCH_NAMES[r.cost_center],
      r.position, r.contract_type, r.modality,
    ], search));
  }, [rows, search]);

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-4">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <header
        className="relative overflow-hidden rounded-2xl p-6 text-white shadow-lg"
        style={{ background: 'linear-gradient(135deg, hsl(215 32% 14%) 0%, hsl(213 78% 28%) 55%, hsl(199 89% 42%) 100%)' }}
      >
        <div className="absolute -top-20 -right-10 w-72 h-72 rounded-full opacity-20 blur-3xl"
          style={{ background: 'radial-gradient(closest-side, #F97316, transparent)' }} />
        <div className="relative">
          <p className="text-[11px] uppercase tracking-wider font-semibold opacity-80">Contratos</p>
          <h1 className="text-2xl md:text-3xl font-bold mt-1">Resumen de contratos</h1>
          <p className="text-sm text-white/85 mt-1">
            Dotación vigente, tipos de contrato, vencimientos próximos y masa salarial.
          </p>
        </div>
      </header>

      {error && (
        <div className="rounded-xl p-4 bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Kpi icon={<Users className="w-4 h-4" />} label="Total trabajadores" value={String(kpis.total)} />
        <Kpi icon={<FileText className="w-4 h-4" />} label="% Indefinidos" value={`${kpis.indef_pct}%`} />
        <Kpi icon={<FileText className="w-4 h-4" />} label="% Plazo fijo" value={`${kpis.plazo_pct}%`} />
        <Kpi icon={<Briefcase className="w-4 h-4" />} label="% EST" value={`${kpis.est_pct}%`} />
        <Kpi icon={<DollarSign className="w-4 h-4" />} label="Masa salarial" value={fmtCLP(kpis.masa)} />
      </div>

      {/* Dispersión salarial + Donut Base/Comisiones */}
      {salary && (
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 p-card p-5 space-y-4">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Dispersión salarial · {salary.period_label}</p>
              <p className="text-xs text-slate-500 mt-0.5">Sueldo líquido total del mes trabajado</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Mín', value: salary.min_total ?? 0 },
                { label: 'Mediana', value: salary.median_total ?? 0 },
                { label: 'Promedio', value: salary.avg_total ?? 0 },
                { label: 'Máx', value: salary.max_total ?? 0 },
              ].map(s => (
                <div key={s.label} className="rounded-xl border border-slate-200 px-3 py-2 bg-slate-50/60">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">{s.label}</p>
                  <p className="text-sm font-bold tabular-nums mt-0.5" style={{ color: '#1B3A5C' }}>{fmtCLP(s.value)}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">total líquido {salary.period_label}</p>
                </div>
              ))}
            </div>
            {/* Barra de dispersión */}
            <div className="pt-2">
              <div className="relative h-2 rounded-full bg-slate-200">
                {(() => {
                  const min = salary.min_total ?? 0;
                  const max = salary.max_total ?? 0;
                  const range = Math.max(1, max - min);
                  const pos = (v: number) => `${Math.max(0, Math.min(100, ((v - min) / range) * 100))}%`;
                  const items: Array<[string, number]> = [
                    ['Mín', min],
                    ['Mediana', salary.median_total ?? 0],
                    ['Promedio', salary.avg_total ?? 0],
                    ['Máx', max],
                  ];
                  return items.map(([k, v], i) => (
                    <div key={k} className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-white shadow"
                      style={{ left: pos(v), background: i === 1 || i === 2 ? '#F97316' : '#EA580C' }}
                      title={`${k}: ${fmtCLP(v)}`} />
                  ));
                })()}
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 mt-1.5 tabular-nums">
                <span>{fmtCLP(salary.min_total ?? 0)}</span>
                <span>{fmtCLP(salary.max_total ?? 0)}</span>
              </div>
            </div>
          </div>

          <div className="p-card p-5">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Composición masa salarial</p>
            <div className="h-44 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Base líquido', value: salary.masa_base ?? 0 },
                      { name: 'Comisiones', value: salary.masa_commissions ?? 0 },
                    ]}
                    dataKey="value"
                    innerRadius={38}
                    outerRadius={62}
                    paddingAngle={2}
                  >
                    <Cell fill="#F97316" />
                    <Cell fill="#FBBF24" />
                  </Pie>
                  <RTooltip formatter={(v: any) => fmtCLP(Number(v))} contentStyle={{ background: 'white', border: '1px solid hsl(var(--border))', borderRadius: 10, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1 mt-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: '#F97316' }} /> Base líquido</span>
                <span className="tabular-nums font-mono">{fmtCLP(salary.masa_base ?? 0)} <span className="text-slate-400">({salary.masa_total ? (((salary.masa_base ?? 0) / salary.masa_total) * 100).toFixed(1) : 0}%)</span></span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: '#FBBF24' }} /> Comisiones</span>
                <span className="tabular-nums font-mono">{fmtCLP(salary.masa_commissions ?? 0)} <span className="text-slate-400">({salary.masa_total ? (((salary.masa_commissions ?? 0) / salary.masa_total) * 100).toFixed(1) : 0}%)</span></span>
              </div>
            </div>
          </div>
        </section>
      )}




      {/* Alerta vencimientos */}
      {venc30.length > 0 && (
        <div
          className="rounded-2xl p-5 text-white shadow-md cursor-pointer transition-transform hover:scale-[1.005]"
          style={{ background: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)' }}
          onClick={() => setShowVenc(v => !v)}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="text-[11px] uppercase tracking-wider font-semibold opacity-90">Vencimientos próximos</p>
              <h3 className="text-lg font-bold">
                {venc30.length} contrato{venc30.length === 1 ? '' : 's'} vence{venc30.length === 1 ? '' : 'n'} en los próximos 30 días
              </h3>
            </div>
            <span className="text-xs font-semibold opacity-90">{showVenc ? 'Ocultar' : 'Ver detalle'}</span>
          </div>
          {showVenc && (
            <div className="mt-4 bg-white/10 backdrop-blur rounded-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <table className="w-full text-sm">
                <thead className="bg-white/10">
                  <tr className="text-left">
                    <th className="p-3 font-semibold text-xs uppercase tracking-wider">Trabajador</th>
                    <th className="p-3 font-semibold text-xs uppercase tracking-wider">Sucursal</th>
                    <th className="p-3 font-semibold text-xs uppercase tracking-wider">Vence</th>
                  </tr>
                </thead>
                <tbody>
                  {venc30.map(v => (
                    <tr key={v.worker_id} className="border-t border-white/10 hover:bg-white/10">
                      <td className="p-3">
                        <Link to={`/portal/trabajadores/${v.worker_id}`} className="font-medium hover:underline">{v.nombre}</Link>
                      </td>
                      <td className="p-3">{v.branch}</td>
                      <td className="p-3 font-mono">{fmtDate(v.end_date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Banner EST */}
      {kpis.est > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-center gap-3">
          <FileSignature className="w-4 h-4 text-amber-700 shrink-0" />
          <p className="text-sm text-amber-800">
            <span className="font-semibold">{kpis.est} trabajador{kpis.est === 1 ? '' : 'es'} EST</span> · Contratos a plazo fijo — recordar renovación oportuna
          </p>
        </div>
      )}

      {/* Tabla */}
      <section className="p-card overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" style={{ color: '#F97316' }} />
            <h2 className="text-sm font-bold tracking-tight" style={{ color: '#1B3A5C' }}>Trabajadores y contratos</h2>
            <span className="text-xs text-muted-foreground">· {filtered.length} de {rows.length}</span>
          </div>
          <div className="sm:ml-auto w-full sm:w-96">
            <PortalSearchBar
              value={search}
              onChange={setSearch}
              placeholder="Buscar por nombre, RUT, sucursal o cargo…"
              total={rows.length}
              results={filtered.length}
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="p-table w-full">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <th className="px-6 py-3 font-semibold">Nombre</th>
                <th className="px-4 py-3 font-semibold">Sucursal</th>
                <th className="px-4 py-3 font-semibold">Tipo</th>
                <th className="px-4 py-3 font-semibold">Modalidad</th>
                <th className="px-4 py-3 font-semibold">Vencimiento</th>
                <th className="px-4 py-3 font-semibold text-right">
                  Comisiones
                  <span className="block text-[9px] font-normal normal-case tracking-normal text-slate-400">{salary?.period_label ?? ''}</span>
                </th>
                <th className="px-6 py-3 font-semibold text-right" title="Total líquido = base + comisiones + otros bonos del mes trabajado.">
                  Sueldo líquido total
                  <span className="block text-[9px] font-normal normal-case tracking-normal text-slate-400">{salary?.period_label ?? 'mes trabajado'}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="p-10 text-center text-muted-foreground">Sin resultados.</td></tr>
              ) : filtered.map(r => {
                const bd = breakdownByWorker[r.worker_id];
                const com = bd?.commissions ?? commissionByWorker[r.worker_id] ?? 0;
                const total = bd?.total_liquid ?? ((r.liquid_salary || 0) + com);
                return (
                <tr key={r.worker_id} className="border-b border-slate-100 hover:bg-slate-50/60">
                  <td className="px-6 py-3">
                    <Link to={`/portal/trabajadores/${r.worker_id}`} className="font-semibold hover:underline" style={{ color: '#1B3A5C' }}>
                      {r.nombre}
                    </Link>
                    {r.position && <p className="text-[11px] text-slate-500">{r.position}</p>}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <span className="font-medium text-slate-700">{r.branch}</span>
                  </td>
                  <td className="px-4 py-3"><ContractBadge type={r.contract_type} /></td>
                  <td className="px-4 py-3"><ModalityBadge modality={r.modality} /></td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {r.end_date
                      ? <span className="text-slate-700">{fmtDate(r.end_date)}</span>
                      : <span className="text-slate-400 italic">Sin vencimiento</span>}
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">
                    {com > 0
                      ? <span style={{ color: '#B45309' }}>{fmtCLP(com)}</span>
                      : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-6 py-3 text-right font-mono tabular-nums">
                    {total > 0
                      ? <span className="font-bold" style={{ color: '#F97316' }}>{fmtCLP(total)}</span>
                      : <span className="text-slate-400 font-normal">—</span>}
                  </td>
                </tr>
              );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Composición del sueldo */}
      {breakdown.length > 0 && (
        <section className="space-y-4">
          <div>
            <h2 className="text-base font-bold tracking-tight" style={{ color: '#1B3A5C' }}>
              Composición del sueldo — {salary?.period_label ?? ''}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Desglose por trabajador: base líquido, comisiones y otros bonos.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Kpi icon={<DollarSign className="w-4 h-4" />} label="Masa total" value={fmtCLP(salary?.masa_total ?? 0)} />
            <Kpi icon={<DollarSign className="w-4 h-4" />} label="Comisiones"
              value={`${fmtCLP(salary?.masa_commissions ?? 0)}${salary?.masa_total ? ` · ${(((salary?.masa_commissions ?? 0) / salary.masa_total) * 100).toFixed(1)}%` : ''}`} />
            <Kpi icon={<DollarSign className="w-4 h-4" />} label="Sueldo promedio total" value={fmtCLP(salary?.avg_total ?? 0)} />
          </div>

          <div className="p-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="p-table w-full">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                    <SortHeader label="Trabajador" k="worker_name" sortKey={sortKey} sortDir={sortDir} onClick={handleSort} className="px-6" />
                    <SortHeader label="Sucursal" k="cost_center" sortKey={sortKey} sortDir={sortDir} onClick={handleSort} />
                    <SortHeader label="Base líquido" k="base_liquid" sortKey={sortKey} sortDir={sortDir} onClick={handleSort} align="right" />
                    <SortHeader label="Comisiones" k="commissions" sortKey={sortKey} sortDir={sortDir} onClick={handleSort} align="right" />
                    <SortHeader label="Otros bonos" k="other_bonuses" sortKey={sortKey} sortDir={sortDir} onClick={handleSort} align="right" />
                    <SortHeader label="Total líquido" k="total_liquid" sortKey={sortKey} sortDir={sortDir} onClick={handleSort} align="right" className="px-6" />
                    <SortHeader label="% Comisiones" k="pct_commissions" sortKey={sortKey} sortDir={sortDir} onClick={handleSort} align="right" />
                  </tr>
                </thead>
                <tbody>
                  {sortedBreakdown.map(b => (
                    <tr key={b.worker_id} className="border-b border-slate-100 hover:bg-slate-50/60">
                      <td className="px-6 py-3">
                        <Link to={`/portal/trabajadores/${b.worker_id}`} className="font-semibold hover:underline" style={{ color: '#1B3A5C' }}>
                          {b.worker_name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-700">{CC_NAME[b.cost_center] ?? b.cost_center}</td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums">{fmtCLP(b.base_liquid)}</td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums" style={{ color: b.commissions > 0 ? '#B45309' : undefined }}>
                        {b.commissions > 0 ? fmtCLP(b.commissions) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums">
                        {b.other_bonuses > 0 ? fmtCLP(b.other_bonuses) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-6 py-3 text-right font-mono tabular-nums font-bold" style={{ color: '#F97316' }}>
                        {fmtCLP(b.total_liquid)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-xs text-slate-600">
                        {Number(b.pct_commissions).toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}



    </div>
  );
}

function Kpi({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl p-4 border border-slate-200 bg-white" style={{ boxShadow: 'var(--p-shadow-sm)' }}>
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
        <span style={{ color: '#F97316' }}>{icon}</span>{label}
      </div>
      <p className="text-2xl font-bold mt-1.5 tracking-tight" style={{ color: '#1B3A5C' }}>{value}</p>
    </div>
  );
}

function ContractBadge({ type }: { type: string | null }) {
  if (type === 'indefinido') {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        Indefinido
      </span>
    );
  }
  if (type === 'plazo_fijo') {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-orange-50 text-orange-700 border border-orange-200">
        Plazo fijo
      </span>
    );
  }
  return <span className="text-xs text-slate-400">—</span>;
}

function ModalityBadge({ modality }: { modality: string | null }) {
  if (!modality) return <span className="text-xs text-slate-400">—</span>;
  const m = modality.toUpperCase();
  if (m === 'EST') {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
        EST
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
      Outsourcing
    </span>
  );
}

function SortHeader({
  label, k, sortKey, sortDir, onClick, align = 'left', className = '',
}: {
  label: string;
  k: any;
  sortKey: any;
  sortDir: 'asc' | 'desc';
  onClick: (k: any) => void;
  align?: 'left' | 'right';
  className?: string;
}) {
  const active = sortKey === k;
  const Icon = !active ? ArrowUpDown : sortDir === 'asc' ? ArrowUp : ArrowDown;
  return (
    <th className={`${className || 'px-4'} py-3 font-semibold cursor-pointer select-none ${align === 'right' ? 'text-right' : ''}`}
      onClick={() => onClick(k)}>
      <span className={`inline-flex items-center gap-1 ${align === 'right' ? 'justify-end' : ''}`}>
        {label}
        <Icon className={`w-3 h-3 ${active ? 'text-orange-500' : 'text-slate-300'}`} />
      </span>
    </th>
  );
}
