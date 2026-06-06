import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { usePortalAuth } from '../hooks/usePortalAuth';
import { Skeleton } from '@/components/ui/skeleton';
import {
  FileText, Users, AlertTriangle, TrendingUp, TrendingDown, DollarSign, ArrowRight, Building2,
} from 'lucide-react';

const fmtCLP = (n: number | null | undefined) =>
  n == null ? '—' : '$' + Math.round(Number(n)).toLocaleString('es-CL');

const fmtDate = (d: string | null) =>
  d ? new Date(d + 'T00:00:00').toLocaleDateString('es-CL') : '—';

const fmtPct = (n: number | null | undefined) =>
  n == null ? '—' : `${n > 0 ? '+' : ''}${Number(n).toFixed(1)}%`;

interface VencRow { worker_id: string; nombre: string; branch: string; cost_center: string; contract_end: string; }
interface MasaRow { branch_name: string; cost_center: string; total_liquid: number; worker_count: number; }
interface Kpis {
  total_workers: number;
  indefinido_pct: number;
  plazo_fijo_pct: number;
  vencen_30_dias: VencRow[];
  vencen_90_dias: VencRow[];
  avg_liquid_salary: number;
  total_masa_salarial: number;
  masa_por_sucursal: MasaRow[];
  variacion_masa_mes_anterior: number | null;
  last_period: string | null;
}

interface WorkerRow {
  worker_id: string;
  nombre: string;
  cost_center: string;
  branch: string;
  contract_type: string | null;
  contract_end: string | null;
  liquid_salary: number;
  delta_pct: number | null;
}

const CC_NAME: Record<string, string> = {
  LC_AE: 'Aeropuerto SCL', LC_CO: 'Concepción', LC_LS: 'La Serena', LC_ÑU: 'Ñuñoa',
  LC_PA: 'Punta Arenas', LC_PM: 'Puerto Montt', LC_PN: 'Puerto Natales', LC_TE: 'Temuco',
  LC_VM: 'Viña del Mar', LC_VI: 'Vitacura', AL_MF: 'Maipú', AL_PU: 'Pudahuel',
};

export default function PortalContratos() {
  const { company } = usePortalAuth();
  const navigate = useNavigate();
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [workers, setWorkers] = useState<WorkerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showVenc, setShowVenc] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const cid = company?.id ?? null;

      // KPIs
      const { data: k } = await supabase.rpc('get_contracts_kpis' as any, { p_company_id: cid });

      // Trabajadores activos + contrato vigente
      const { data: wData } = await supabase
        .from('portal_workers')
        .select('id, first_name, last_name, cost_center, portal_company_id, active')
        .eq('active', true)
        .order('first_name');

      const filtered = (wData ?? []).filter((w: any) => !cid || w.portal_company_id === cid);
      const ids = filtered.map((w: any) => w.id);

      let contractsByWorker: Record<string, { contract_type: string | null; end_date: string | null }> = {};
      let lastPayByWorker: Record<string, number> = {};
      let prevPayByWorker: Record<string, number> = {};

      if (ids.length > 0) {
        const { data: ct } = await supabase
          .from('portal_contracts')
          .select('worker_id, contract_type, end_date, is_current')
          .in('worker_id', ids)
          .eq('is_current', true);
        (ct ?? []).forEach((c: any) => {
          contractsByWorker[c.worker_id] = { contract_type: c.contract_type, end_date: c.end_date };
        });

        const lastPeriod = (k as any)?.last_period as string | null;
        if (lastPeriod) {
          const { data: pp } = await supabase
            .from('portal_payroll')
            .select('worker_id, net_salary, period')
            .in('worker_id', ids)
            .eq('period', lastPeriod);
          (pp ?? []).forEach((r: any) => {
            lastPayByWorker[r.worker_id] = (lastPayByWorker[r.worker_id] ?? 0) + Number(r.net_salary ?? 0);
          });

          // Previous period
          const dt = new Date(lastPeriod + 'T00:00:00');
          dt.setMonth(dt.getMonth() - 1);
          const prevPeriod = dt.toISOString().slice(0, 10);
          const { data: ppPrev } = await supabase
            .from('portal_payroll')
            .select('worker_id, net_salary')
            .in('worker_id', ids)
            .eq('period', prevPeriod);
          (ppPrev ?? []).forEach((r: any) => {
            prevPayByWorker[r.worker_id] = (prevPayByWorker[r.worker_id] ?? 0) + Number(r.net_salary ?? 0);
          });
        }
      }

      const rows: WorkerRow[] = filtered.map((w: any) => {
        const liquid = lastPayByWorker[w.id] ?? 0;
        const prev = prevPayByWorker[w.id] ?? 0;
        const delta = prev > 0 ? ((liquid - prev) / prev) * 100 : null;
        const c = contractsByWorker[w.id];
        return {
          worker_id: w.id,
          nombre: `${w.first_name} ${w.last_name}`,
          cost_center: w.cost_center,
          branch: CC_NAME[w.cost_center] ?? w.cost_center,
          contract_type: c?.contract_type ?? null,
          contract_end: c?.end_date ?? null,
          liquid_salary: liquid,
          delta_pct: delta,
        };
      });

      if (cancelled) return;
      setKpis(k as any);
      setWorkers(rows);
      setLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, [company?.id]);

  const sortedWorkers = useMemo(
    () => [...workers].sort((a, b) => b.liquid_salary - a.liquid_salary),
    [workers]
  );

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const venc30 = kpis?.vencen_30_dias ?? [];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header gradient */}
      <header
        className="relative overflow-hidden rounded-2xl p-6 text-white shadow-lg"
        style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #ec4899 100%)' }}
      >
        <div className="absolute -top-20 -right-10 w-72 h-72 rounded-full opacity-25 blur-3xl"
          style={{ background: 'radial-gradient(closest-side, #f9a8d4, transparent)' }} />
        <div className="relative">
          <p className="text-[11px] uppercase tracking-wider font-semibold opacity-80">Contratos & Remuneraciones</p>
          <h1 className="text-2xl md:text-3xl font-bold mt-1">Resumen de contratos</h1>
          <p className="text-sm text-white/85 mt-1">
            Indicadores de la dotación, vencimientos y masa salarial.
            {kpis?.last_period && <> Período: <strong>{new Date(kpis.last_period + 'T00:00:00').toLocaleDateString('es-CL', { year: 'numeric', month: 'long' })}</strong>.</>}
          </p>
        </div>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Kpi icon={<Users className="w-4 h-4" />} label="Total trabajadores" value={String(kpis?.total_workers ?? 0)} />
        <Kpi icon={<FileText className="w-4 h-4" />} label="% Indefinidos" value={`${kpis?.indefinido_pct ?? 0}%`} />
        <Kpi icon={<FileText className="w-4 h-4" />} label="% Plazo fijo" value={`${kpis?.plazo_fijo_pct ?? 0}%`} />
        <Kpi
          icon={<DollarSign className="w-4 h-4" />}
          label="Masa salarial"
          value={fmtCLP(kpis?.total_masa_salarial ?? 0)}
          extra={kpis?.variacion_masa_mes_anterior != null ? (
            <span className={`inline-flex items-center gap-1 text-[11px] mt-1 font-semibold ${kpis.variacion_masa_mes_anterior >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {kpis.variacion_masa_mes_anterior >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {fmtPct(kpis.variacion_masa_mes_anterior)} vs mes anterior
            </span>
          ) : null}
        />
        <Kpi icon={<DollarSign className="w-4 h-4" />} label="Líquido promedio" value={fmtCLP(kpis?.avg_liquid_salary ?? 0)} />
      </div>

      {/* Alerta vencimientos 30 días */}
      {venc30.length > 0 && (
        <div
          className="rounded-2xl p-5 text-white shadow-md cursor-pointer transition-transform hover:scale-[1.005]"
          style={{ background: 'linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)' }}
          onClick={() => setShowVenc(v => !v)}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="text-[11px] uppercase tracking-wider font-semibold opacity-80">Vencimientos próximos</p>
              <h3 className="text-lg font-bold">
                {venc30.length} contrato{venc30.length === 1 ? '' : 's'} vence{venc30.length === 1 ? '' : 'n'} en los próximos 30 días
              </h3>
            </div>
            <ArrowRight className={`w-5 h-5 transition-transform ${showVenc ? 'rotate-90' : ''}`} />
          </div>
          {showVenc && (
            <div className="mt-4 bg-white/10 backdrop-blur rounded-xl overflow-hidden">
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
                    <tr key={v.worker_id} className="border-t border-white/10 hover:bg-white/10" onClick={(e) => e.stopPropagation()}>
                      <td className="p-3">
                        <Link to={`/portal/trabajadores/${v.worker_id}`} className="font-medium hover:underline">{v.nombre}</Link>
                      </td>
                      <td className="p-3">{v.branch}</td>
                      <td className="p-3 font-mono">{fmtDate(v.contract_end)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Masa salarial por sucursal */}
      <section className="p-card overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-2">
          <Building2 className="w-4 h-4" style={{ color: '#a855f7' }} />
          <h2 className="text-sm font-bold tracking-tight" style={{ color: '#1B3A5C' }}>Masa salarial por sucursal</h2>
          <span className="ml-auto text-xs text-muted-foreground">{(kpis?.masa_por_sucursal ?? []).length} sucursales</span>
        </div>
        <div className="overflow-x-auto">
          <table className="p-table">
            <thead>
              <tr>
                <th>Sucursal</th>
                <th className="text-right">Trabajadores</th>
                <th className="text-right">Total líquido</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(kpis?.masa_por_sucursal ?? []).length === 0 ? (
                <tr><td colSpan={4} className="p-10 text-center text-muted-foreground">Sin datos para el período.</td></tr>
              ) : (kpis!.masa_por_sucursal).map(r => (
                <tr
                  key={r.cost_center}
                  className="cursor-pointer hover:bg-purple-50/50"
                  onClick={() => navigate(`/portal/sucursal/${encodeURIComponent(r.cost_center)}`)}
                >
                  <td className="font-semibold" style={{ color: '#1B3A5C' }}>{r.branch_name}</td>
                  <td className="text-right tabular-nums">{r.worker_count}</td>
                  <td className="text-right font-mono tabular-nums font-bold" style={{ color: '#a855f7' }}>{fmtCLP(r.total_liquid)}</td>
                  <td className="text-right pr-4"><ArrowRight className="w-4 h-4 inline text-muted-foreground" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Trabajadores */}
      <section className="p-card overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-2">
          <Users className="w-4 h-4" style={{ color: '#a855f7' }} />
          <h2 className="text-sm font-bold tracking-tight" style={{ color: '#1B3A5C' }}>Trabajadores y remuneraciones</h2>
          <span className="ml-auto text-xs text-muted-foreground">{sortedWorkers.length} trabajadores</span>
        </div>
        <div className="overflow-x-auto">
          <table className="p-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Sucursal</th>
                <th>Tipo contrato</th>
                <th>Vencimiento</th>
                <th className="text-right">Sueldo líquido</th>
                <th className="text-right">Variación</th>
              </tr>
            </thead>
            <tbody>
              {sortedWorkers.length === 0 ? (
                <tr><td colSpan={6} className="p-10 text-center text-muted-foreground">Sin trabajadores.</td></tr>
              ) : sortedWorkers.map(r => (
                <tr key={r.worker_id}>
                  <td>
                    <Link to={`/portal/trabajadores/${r.worker_id}`} className="font-semibold hover:underline" style={{ color: '#1B3A5C' }}>
                      {r.nombre}
                    </Link>
                  </td>
                  <td className="text-xs text-muted-foreground">{r.branch}</td>
                  <td className="capitalize">{r.contract_type?.replace('_', ' ') ?? '—'}</td>
                  <td className="font-mono text-xs">{fmtDate(r.contract_end)}</td>
                  <td className="text-right font-mono tabular-nums">
                    {r.liquid_salary > 0 ? fmtCLP(r.liquid_salary) : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="text-right">
                    {r.delta_pct == null ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <span className={`inline-flex items-center gap-1 font-semibold ${r.delta_pct >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {r.delta_pct >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                        {fmtPct(r.delta_pct)}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Kpi({ icon, label, value, extra }: { icon: React.ReactNode; label: string; value: string; extra?: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-4 border border-slate-200 bg-white" style={{ boxShadow: 'var(--p-shadow-sm)' }}>
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
        <span style={{ color: '#a855f7' }}>{icon}</span>{label}
      </div>
      <p className="text-2xl font-bold mt-1.5 tracking-tight" style={{ color: '#1B3A5C' }}>{value}</p>
      {extra}
    </div>
  );
}
