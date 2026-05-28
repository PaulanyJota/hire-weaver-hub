import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import {
  LineChart, Line, PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, Cake, FileWarning, AlertTriangle, ArrowRight } from 'lucide-react';
import { sucursalName } from '../lib/sucursales';

interface BranchSummary {
  cost_center: string;
  sucursal_nombre: string;
  total_workers: number;
  workers_activos: number;
  marcas_hoy: number;
  workers_marcaron_hoy: number;
  pct_asistencia_hoy: number;
  turno_promedio_inicio: string;
  turno_promedio_fin: string;
  ultima_marca: string | null;
}

interface TrendRow {
  dia: string;
  dia_label: string;
  marcaron: number;
  activos: number;
  pct: number;
}

interface AttRow { worker_id: string; date: string; worked_hours: number | null }
interface WorkerRow { id: string; first_name: string; last_name: string; cost_center: string | null; hire_date: string | null; active: boolean }
interface ContractRow { worker_id: string; end_date: string | null; is_current: boolean }

const PALETTE = ['#1B3A5C', '#F97316', '#3DA5E0', '#1D9E75', '#0F2440', '#7C3AED', '#EAB308', '#DC2626'];

const last7Days = () => {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
};

export default function PortalDashboardExtras() {
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<BranchSummary[]>([]);
  const [weekAtt, setWeekAtt] = useState<AttRow[]>([]);
  const [workers, setWorkers] = useState<WorkerRow[]>([]);
  const [contracts, setContracts] = useState<ContractRow[]>([]);

  const [trend, setTrend] = useState<TrendRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const since = last7Days()[0];
        const [bRes, wRes, aRes, cRes, tRes] = await Promise.all([
          supabase.rpc('get_branches_summary'),
          supabase.from('portal_workers').select('id, first_name, last_name, cost_center, hire_date, active'),
          supabase.from('portal_attendance').select('worker_id, date, worked_hours').gte('date', since),
          supabase.from('portal_contracts').select('worker_id, end_date, is_current').eq('is_current', true),
          supabase.rpc('get_attendance_trend', { p_days: 7 }),
        ]);
        if (cancelled) return;
        setBranches((bRes.data ?? []) as BranchSummary[]);
        setWorkers((wRes.data ?? []) as WorkerRow[]);
        setWeekAtt((aRes.data ?? []) as AttRow[]);
        setContracts((cRes.data ?? []) as ContractRow[]);
        setTrend((tRes.data ?? []) as TrendRow[]);
      } catch (err) {
        console.error('[dashboard-extras]', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const activeWorkers = useMemo(() => workers.filter(w => w.active), [workers]);

  // Tendencia última semana — % asistencia diaria desde RPC
  const trendData = useMemo(
    () => trend.map(t => ({
      dia: t.dia_label,
      pct: t.pct,
      marcaron: t.marcaron,
      activos: t.activos,
    })),
    [trend]
  );

  // Donut por sucursal
  const donutData = useMemo(() => {
    const map = new Map<string, number>();
    activeWorkers.forEach(w => {
      const k = w.cost_center ?? 'Sin sucursal';
      map.set(k, (map.get(k) ?? 0) + 1);
    });
    return Array.from(map.entries()).map(([cc, value]) => ({
      name: cc === 'Sin sucursal' ? cc : sucursalName(cc),
      value,
    })).sort((a, b) => b.value - a.value);
  }, [activeWorkers]);

  // Top 5 sucursales por horas semana
  const topHoursData = useMemo(() => {
    const byWorker = new Map<string, string | null>();
    workers.forEach(w => byWorker.set(w.id, w.cost_center));
    const map = new Map<string, number>();
    weekAtt.forEach(a => {
      const cc = byWorker.get(a.worker_id) ?? null;
      if (!cc) return;
      map.set(cc, (map.get(cc) ?? 0) + Number(a.worked_hours ?? 0));
    });
    return Array.from(map.entries())
      .map(([cc, h]) => ({ name: sucursalName(cc), horas: Math.round(h) }))
      .sort((a, b) => b.horas - a.horas)
      .slice(0, 5);
  }, [weekAtt, workers]);

  // Próximas alertas
  const alerts = useMemo(() => {
    const out: Array<{ kind: 'aniversario' | 'contrato' | 'sin_marca'; text: string; sub: string; color: string; icon: any }> = [];
    const now = new Date();
    const in30 = new Date(); in30.setDate(in30.getDate() + 30);

    activeWorkers.forEach(w => {
      if (w.hire_date) {
        const hd = new Date(w.hire_date);
        const anniv = new Date(now.getFullYear(), hd.getMonth(), hd.getDate());
        if (anniv < now) anniv.setFullYear(now.getFullYear() + 1);
        const diffDays = Math.round((anniv.getTime() - now.getTime()) / 86400000);
        if (diffDays >= 0 && diffDays <= 14) {
          const years = anniv.getFullYear() - hd.getFullYear();
          out.push({
            kind: 'aniversario',
            text: `${w.first_name} ${w.last_name}`,
            sub: `${years} año${years !== 1 ? 's' : ''} en ${diffDays === 0 ? 'hoy' : `${diffDays}d`}`,
            color: '#3DA5E0',
            icon: Cake,
          });
        }
      }
    });

    const byId = new Map(workers.map(w => [w.id, w]));
    contracts.forEach(c => {
      if (!c.end_date) return;
      const ed = new Date(c.end_date);
      const diffDays = Math.round((ed.getTime() - now.getTime()) / 86400000);
      if (diffDays >= 0 && diffDays <= 30) {
        const w = byId.get(c.worker_id);
        if (w && w.active) {
          out.push({
            kind: 'contrato',
            text: `${w.first_name} ${w.last_name}`,
            sub: `Contrato vence en ${diffDays}d`,
            color: '#F97316',
            icon: FileWarning,
          });
        }
      }
    });

    return out.slice(0, 8);
  }, [activeWorkers, contracts, workers]);

  return (
    <>
      {/* Cards por sucursal */}
      <section className="space-y-3">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-base font-bold tracking-tight" style={{ color: '#1B3A5C' }}>Sucursales</h2>
            <p className="text-xs text-muted-foreground">Vista general por punto de venta</p>
          </div>
          <span className="text-xs text-muted-foreground">{branches.length} sucursales</span>
        </div>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3].map(i => <Skeleton key={i} className="h-32" />)}
          </div>
        ) : branches.length === 0 ? (
          <div className="p-card p-8 text-center text-sm text-muted-foreground">Sin sucursales registradas.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {branches.map(b => {
              const sinMarcaje = b.pct_asistencia_hoy === 0 && b.turno_promedio_inicio === '—';
              const pctColor =
                b.pct_asistencia_hoy >= 80 ? '#1D9E75' :
                b.pct_asistencia_hoy >= 50 ? '#F97316' : '#dc2626';
              return (
                <Link
                  key={b.cost_center}
                  to={`/portal/sucursal/${encodeURIComponent(b.cost_center)}`}
                  className="p-card p-card-hover p-5 group cursor-pointer relative flex flex-col"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: '#1B3A5C15', color: '#1B3A5C' }}>
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-[15px] truncate" style={{ color: '#1B3A5C' }}>{b.sucursal_nombre}</p>
                        <p className="text-[11px] text-muted-foreground">{b.cost_center}</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex items-baseline gap-2">
                    <span className="text-3xl font-bold tabular-nums" style={{ color: '#1B3A5C' }}>{b.workers_activos}</span>
                    <span className="text-xs text-muted-foreground">activos</span>
                  </div>
                  <div className="mt-3 space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Asistencia hoy</span>
                      {sinMarcaje ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                          Sin marcaje configurado
                        </span>
                      ) : (
                        <span className="font-semibold tabular-nums" style={{ color: pctColor }}>{b.pct_asistencia_hoy}%</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Turno promedio</span>
                      <span className="font-mono tabular-nums" style={{ color: '#1B3A5C' }}>
                        {b.turno_promedio_inicio}–{b.turno_promedio_fin}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end gap-1 text-[11px] font-semibold" style={{ color: '#3DA5E0' }}>
                    Ver detalle <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Charts grid */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Tendencia asistencia */}
        <div className="p-card p-5">
          <h2 className="text-sm font-bold tracking-tight mb-4" style={{ color: '#1B3A5C' }}>Tendencia de asistencia · 7 días</h2>
          {loading ? <Skeleton className="h-56 w-full" /> : trendData.every(d => d.pct === 0) ? (
            <p className="text-sm text-muted-foreground text-center py-16">Sin datos de asistencia esta semana.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="dia" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 100]} unit="%" />
                <Tooltip
                  contentStyle={{ borderRadius: 12, fontSize: 12, border: '1px solid #e2e8f0' }}
                  content={({ active, payload }: any) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-sm">
                        <p className="font-semibold" style={{ color: '#1B3A5C' }}>{d.dia}</p>
                        <p className="tabular-nums mt-0.5" style={{ color: '#1D9E75' }}>
                          {d.marcaron} de {d.activos} marcaron ({d.pct}%)
                        </p>
                      </div>
                    );
                  }}
                />
                <Line type="monotone" dataKey="pct" stroke="#1D9E75" strokeWidth={2.5} dot={{ r: 4, fill: '#1D9E75' }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Donut sucursal */}
        <div className="p-card p-5">
          <h2 className="text-sm font-bold tracking-tight mb-4" style={{ color: '#1B3A5C' }}>Distribución por sucursal</h2>
          {loading ? <Skeleton className="h-56 w-full" /> : donutData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-16">Sin trabajadores activos.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={donutData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={2}>
                  {donutData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12, border: '1px solid #e2e8f0' }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top 5 sucursales por horas */}
        <div className="p-card p-5">
          <h2 className="text-sm font-bold tracking-tight mb-4" style={{ color: '#1B3A5C' }}>Top 5 sucursales · horas semana</h2>
          {loading ? <Skeleton className="h-56 w-full" /> : topHoursData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-16">Sin horas registradas.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={topHoursData} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={110} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12, border: '1px solid #e2e8f0' }} />
                <Bar dataKey="horas" fill="#3DA5E0" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Alertas */}
        <div className="p-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold tracking-tight" style={{ color: '#1B3A5C' }}>Próximas alertas</h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white" style={{ background: '#F97316' }}>{alerts.length}</span>
          </div>
          {loading ? (
            <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : alerts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12 flex flex-col items-center gap-2">
              <AlertTriangle className="w-6 h-6 opacity-40" />
              Sin alertas próximas.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100 max-h-56 overflow-y-auto">
              {alerts.map((a, i) => (
                <li key={i} className="py-2.5 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: `${a.color}15`, color: a.color }}>
                    <a.icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate" style={{ color: '#1B3A5C' }}>{a.text}</p>
                    <p className="text-xs text-muted-foreground truncate">{a.sub}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}
