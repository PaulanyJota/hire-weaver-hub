import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { usePortalAuth } from '../hooks/usePortalAuth';
import { Users, CheckCircle2, Clock, TrendingUp, Activity, Menu, Flame, DollarSign } from 'lucide-react';
import { usePortalSidebar } from '../hooks/usePortalSidebar';

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PortalAvatar } from '../components/Avatar';
import PortalDashboardExtras from '../components/PortalDashboardExtras';
import UpcomingBirthdaysWidget from '../components/UpcomingBirthdaysWidget';
import WorkerNameLink from '../components/WorkerNameLink';
import { usePunctualityKpis, useOvertimeKpis, useSalaryKpis } from '../hooks/useBranchRankingKpis';
import { branchName } from '../constants/branches';
import lucanoLogo from '@/assets/lucano-logo.png.asset.json';
import PortalSearchBar, { matchesSearch } from '../components/PortalSearchBar';
import { sucursalName } from '../lib/sucursales';

interface Worker { id: string; first_name: string; last_name: string; photo_url: string | null; active: boolean; cost_center: string | null }
interface Att { worker_id: string; date: string; check_in: string | null; worked_hours: number | null; late_minutes: number | null }
interface IncidentRow {
  id: string; date: string; incident_type: string; description: string | null; severity: number | null;
  worker: { id: string; first_name: string; last_name: string } | null;
}

const todayStr = () => new Date().toISOString().slice(0, 10);
const mondayStr = () => {
  const d = new Date();
  const diff = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - diff);
  return d.toISOString().slice(0, 10);
};
const monthStartStr = () => { const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10); };
const ddMM = (d: string) => {
  const dt = new Date(d + 'T00:00:00');
  return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}`;
};

export default function PortalDashboard() {
  const { profile, company, isNodoAdmin } = usePortalAuth();
  const { data: punct } = usePunctualityKpis(company?.id);
  const { data: branchKpis } = useBranchRankingKpis(company?.id);
  const { data: overtime } = useOvertimeKpis(company?.id);
  const { data: salary } = useSalaryKpis(company?.id);
  const [loading, setLoading] = useState(true);
  const [activeWorkers, setActiveWorkers] = useState(0);
  const [attendanceToday, setAttendanceToday] = useState<Array<{ worker_id: string; check_in: string }>>([]);
  const [weekAtt, setWeekAtt] = useState<Att[]>([]);
  const [last14, setLast14] = useState<Att[]>([]);
  const [monthAtt, setMonthAtt] = useState<Att[]>([]);
  const [workersById, setWorkersById] = useState<Record<string, Worker>>({});
  const [incidents, setIncidents] = useState<IncidentRow[]>([]);
  const [commTotal, setCommTotal] = useState<{ total: number; delta_pct: number | null } | null>(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      const { data } = await supabase.rpc('get_commissions_historical' as any, { p_company_id: company?.id ?? '11111111-1111-1111-1111-111111111111' });
      if (cancel) return;
      const first = (data as any)?.by_period?.[0];
      if (first) setCommTotal({ total: Number(first.total) || 0, delta_pct: first.delta_mes_pct == null ? null : Number(first.delta_mes_pct) });
    })();
    return () => { cancel = true; };
  }, [company?.id]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const today = todayStr();
        const monday = mondayStr();
        const monthStart = monthStartStr();
        const since14 = new Date(); since14.setDate(since14.getDate() - 13);
        const since14Str = since14.toISOString().slice(0, 10);

        const [workersRes, todayRes, weekRes, last14Res, monthRes, incRes] = await Promise.all([
          supabase.from('portal_workers').select('id, first_name, last_name, photo_url, active, cost_center'),
          supabase.from('portal_attendance').select('worker_id, date, check_in, worked_hours, late_minutes').eq('date', today).not('check_in', 'is', null),
          supabase.from('portal_attendance').select('worker_id, date, check_in, worked_hours, late_minutes').gte('date', monday),
          supabase.from('portal_attendance').select('worker_id, date, check_in, worked_hours, late_minutes').gte('date', since14Str),
          supabase.from('portal_attendance').select('worker_id, date, check_in, worked_hours, late_minutes').gte('date', monthStart),
          supabase.from('portal_incidents')
            .select('id, date, incident_type, description, severity, worker:portal_workers(id,first_name,last_name)')
            .order('date', { ascending: false }).limit(5),
        ]);
        if (cancelled) return;

        const workers = (workersRes.data ?? []) as Worker[];
        const map: Record<string, Worker> = {};
        workers.forEach(w => { map[w.id] = w; });
        setWorkersById(map);
        setActiveWorkers(workers.filter(w => w.active).length);
        setAttendanceToday((todayRes.data ?? []).map((r: any) => ({ worker_id: r.worker_id, check_in: r.check_in })));
        setWeekAtt((weekRes.data ?? []) as Att[]);
        setLast14((last14Res.data ?? []) as Att[]);
        setMonthAtt((monthRes.data ?? []) as Att[]);
        setIncidents((incRes.data ?? []) as any);
      } catch (err) {
        console.error('[portal-dashboard]', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const kpiAttendanceToday = useMemo(() => new Set(attendanceToday.map(r => r.worker_id)).size, [attendanceToday]);
  const kpiHoursWeek = useMemo(() => {
    const total = weekAtt.reduce((s, r) => s + Math.max(0, Number(r.worked_hours ?? 0)), 0);
    return total > 0 ? total : 0;
  }, [weekAtt]);
  const kpiLateWeek = useMemo(() => weekAtt.reduce((s, r) => s + Number(r.late_minutes ?? 0), 0), [weekAtt]);
  const attendanceRate = activeWorkers > 0 ? Math.round((kpiAttendanceToday / activeWorkers) * 100) : 0;

  const chart14 = useMemo(() => {
    const buckets = new Map<string, number>();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      buckets.set(d.toISOString().slice(0, 10), 0);
    }
    last14.forEach(r => {
      if (buckets.has(r.date)) buckets.set(r.date, (buckets.get(r.date) ?? 0) + Number(r.worked_hours ?? 0));
    });
    return Array.from(buckets, ([date, horas]) => ({ fecha: ddMM(date), horas: Number(horas.toFixed(1)) }));
  }, [last14]);

  const top10 = useMemo(() => {
    const acc = new Map<string, number>();
    monthAtt.forEach(r => { acc.set(r.worker_id, (acc.get(r.worker_id) ?? 0) + Number(r.worked_hours ?? 0)); });
    return Array.from(acc.entries())
      .map(([wid, horas]) => {
        const w = workersById[wid];
        return {
          id: wid,
          name: w ? `${w.first_name} ${w.last_name}` : '—',
          cost_center: w?.cost_center ?? null,
          horas: Number(horas.toFixed(1)),
        };
      })
      .sort((a, b) => b.horas - a.horas).slice(0, 10);
  }, [monthAtt, workersById]);

  const today = new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const firstName = profile?.full_name.split(' ')[0] ?? '';

  // KPI Horas extra — métrica informativa, sin tono de alarma
  const otTotal = overtime?.total_horas_extra ?? 0;
  const otDelta = overtime?.delta_pct ?? 0;
  const otCount = overtime?.trabajadores_afectados ?? 0;
  const otAccent = '#64748B';
  const otGlow = 'hsl(215 16% 47% / 0.12)';
  const otSub = overtime
    ? (otTotal === 0
        ? 'Sin horas extra este mes'
        : `${otCount} trabajador${otCount === 1 ? '' : 'es'} · ${overtime.dias_con_extra} día${overtime.dias_con_extra === 1 ? '' : 's'}`)
    : '';

  const [otOpen, setOtOpen] = useState(false);

  const commValue = commTotal ? `$${Math.round(commTotal.total).toLocaleString('es-CL')}` : '—';
  const commDelta = commTotal?.delta_pct ?? null;
  const periodoLabel = salary?.periodo_label ?? '';

  const cards: Array<any> = [
    { label: 'Trabajadores activos', value: activeWorkers, icon: Users, glow: 'hsl(213 78% 29% / 0.15)', accent: 'hsl(213 78% 29%)', to: '/portal/trabajadores' },
    { label: 'Asistencias hoy', value: kpiAttendanceToday, sub: `${attendanceRate}% del equipo`, icon: CheckCircle2, glow: 'hsl(152 60% 45% / 0.18)', accent: 'hsl(152 60% 38%)', to: '/portal/asistencias-hoy' },
    {
      label: 'Horas extra',
      value: overtime ? `${otTotal.toFixed(1)}h` : '—',
      sub: otSub,
      icon: Clock,
      glow: otGlow,
      accent: otAccent,
      delta: otDelta,
      kind: 'overtime',
      onClick: () => setOtOpen(true),
    },
    {
      label: periodoLabel ? `Comisiones ${periodoLabel}` : 'Comisiones',
      value: commValue,
      sub: commDelta == null ? 'total del equipo' : (commDelta >= 0 ? `↑${commDelta.toFixed(1)}% vs mes anterior` : `↓${Math.abs(commDelta).toFixed(1)}% vs mes anterior`),
      subColor: commDelta == null ? undefined : (commDelta >= 0 ? '#059669' : '#DC2626'),
      icon: DollarSign,
      glow: 'hsl(25 95% 53% / 0.18)',
      accent: '#F97316',
      to: '/portal/comisiones',
    },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-7">
      {/* Hero */}
      <header className="p-fade-up relative overflow-hidden rounded-2xl p-4 sm:p-6 lg:p-8 text-white"
        style={{ background: 'linear-gradient(135deg, hsl(215 32% 14%) 0%, hsl(213 78% 28%) 55%, hsl(199 89% 42%) 100%)' }}>
        <div className="absolute -top-20 -right-10 w-72 h-72 rounded-full opacity-30 blur-3xl"
          style={{ background: 'radial-gradient(closest-side, hsl(199 89% 60%), transparent)' }} />
        <div className="relative flex items-start justify-between flex-wrap gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <HamburgerBtn />
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs uppercase tracking-widest text-white/65 font-semibold">Panel general</p>
              <div className="flex items-center gap-3 flex-wrap mt-1">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight break-words">Hola, {firstName} 👋</h1>
                <img
                  src={lucanoLogo.url}
                  alt="Lucano Rent a Car"
                  className="h-8 object-contain shrink-0"
                />
              </div>
              <p className="text-xs sm:text-sm text-white/75 capitalize mt-1.5">
                {today}{isNodoAdmin && ' · Vista global Nodo'}{company && !isNodoAdmin && ` · ${company.name}`}
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 backdrop-blur border border-white/15">
            <Activity className="w-4 h-4" />
            <span className="text-xs font-medium">Datos en vivo</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
        </div>
      </header>

      <DashboardQuickSearch workersById={workersById} />




      {/* KPIs + Cumpleaños */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-stagger">
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {cards.map(c => {
            const isOvertime = c.kind === 'overtime';
            const deltaNode = isOvertime && overtime && (otTotal > 0 || (overtime.total_mes_anterior ?? 0) > 0) ? (
              <p className={`text-[11px] mt-1 font-medium ${otDelta < 0 ? 'text-emerald-600' : otDelta > 0 ? 'text-slate-500' : 'text-muted-foreground'}`}>
                {otDelta < 0
                  ? `↓${Math.abs(otDelta).toFixed(1)}% vs mes anterior · buena noticia`
                  : otDelta > 0
                  ? `↑${otDelta.toFixed(1)}% vs mes anterior`
                  : 'igual que mes anterior'}
              </p>
            ) : null;
            const inner = (
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{c.label}</p>
                  {loading ? <Skeleton className="h-9 w-20 mt-2" /> : (
                    <p className="text-3xl font-bold mt-2 tracking-tight" style={{ color: c.accent }}>{c.value}</p>
                  )}
                  {c.sub && !loading && (
                    <p className="text-xs mt-1" style={{ color: c.subColor ?? 'hsl(var(--muted-foreground))' }}>{c.sub}</p>
                  )}
                  {deltaNode}
                </div>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `${c.accent}15`, color: c.accent }}>
                  <c.icon className="w-5 h-5" />
                </div>
              </div>
            );
            if (c.to) {
              return (
                <Link
                  key={c.label}
                  to={c.to}
                  className="p-kpi cursor-pointer hover:-translate-y-0.5 hover:shadow-lg transition-all"
                  style={{ ['--p-kpi-glow' as any]: c.glow }}
                >
                  {inner}
                </Link>
              );
            }
            if (c.onClick) {
              return (
                <button
                  key={c.label}
                  type="button"
                  onClick={c.onClick}
                  className="p-kpi cursor-pointer hover:-translate-y-0.5 hover:shadow-lg transition-all text-left"
                  style={{ ['--p-kpi-glow' as any]: c.glow }}
                >
                  {inner}
                </button>
              );
            }
            return (
              <div key={c.label} className="p-kpi" style={{ ['--p-kpi-glow' as any]: c.glow }}>
                {inner}
              </div>
            );
          })}
        </div>
        <UpcomingBirthdaysWidget companyId={company?.id} />
      </section>

      {/* Modal — detalle trabajadores con horas extra */}
      <Dialog open={otOpen} onOpenChange={setOtOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-500" />
              Trabajadores con horas extra este mes
            </DialogTitle>
          </DialogHeader>
          {!overtime ? (
            <div className="space-y-2 py-2">{[1,2,3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : (overtime.top_trabajadores?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Sin trabajadores con horas extra este mes.</p>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto">
              <p className="text-xs text-muted-foreground mb-3">
                {overtime.trabajadores_afectados} trabajador{overtime.trabajadores_afectados === 1 ? '' : 'es'} · {overtime.total_horas_extra.toFixed(1)}h en total
              </p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-muted-foreground border-b">
                    <th className="text-left py-2 font-semibold">Trabajador</th>
                    <th className="text-left px-2 py-2 font-semibold">Sucursal</th>
                    <th className="text-right px-2 py-2 font-semibold">Horas extra</th>
                    <th className="text-right py-2 font-semibold">Días</th>
                  </tr>
                </thead>
                <tbody>
                  {overtime.top_trabajadores.map((t, i) => (
                    <tr key={i} className="border-b last:border-0 hover:bg-muted/40">
                      <td className="py-2 font-medium text-slate-800">{t.nombre}</td>
                      <td className="px-2 py-2 text-slate-600">{branchName(t.sucursal)}</td>
                      <td className="px-2 py-2 text-right font-mono tabular-nums font-semibold text-slate-800">{t.horas_extra.toFixed(1)}h</td>
                      <td className="py-2 text-right tabular-nums text-slate-600">{t.dias}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>



      {/* KPIs sorpresa — puntualidad / actividad / racha */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* En turno ahora */}
        <div className="p-card p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">En turno ahora</p>
              {!punct ? <Skeleton className="h-9 w-16 mt-2" /> : (
                <p className="text-3xl font-bold mt-2 tracking-tight" style={{ color: 'hsl(152 60% 38%)' }}>
                  {punct.activos_ahora}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-1">trabajadores con turno activo</p>
            </div>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-emerald-50">
              <span className="relative flex items-center justify-center">
                <span className="absolute w-3 h-3 rounded-full bg-emerald-400 animate-ping opacity-75" />
                <span className="relative w-3 h-3 rounded-full bg-emerald-500" />
              </span>
            </div>
          </div>
        </div>

        {/* Puntualidad semana */}
        <div className="p-card p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Puntualidad semana</p>
              {!punct ? <Skeleton className="h-9 w-20 mt-2" /> : punct.puntualidad_semana === 0 ? (
                <p className="text-sm font-medium mt-3 tracking-tight text-slate-400">Sin datos de horario</p>

              ) : (
                <p className="text-3xl font-bold mt-2 tracking-tight" style={{ color: '#F97316' }}>
                  {punct.puntualidad_semana}%
                </p>
              )}
              {punct && punct.puntualidad_semana !== 0 && (
                <p className={`text-xs mt-1 font-medium ${
                  punct.delta_puntualidad > 0 ? 'text-emerald-600' :
                  punct.delta_puntualidad < 0 ? 'text-red-600' : 'text-muted-foreground'
                }`}>
                  {punct.delta_puntualidad > 0 ? `↑${punct.delta_puntualidad}% vs semana anterior` :
                   punct.delta_puntualidad < 0 ? `↓${Math.abs(punct.delta_puntualidad)}% vs semana anterior` :
                   'igual que la semana anterior'}
                </p>
              )}
            </div>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-orange-50" style={{ color: '#F97316' }}>
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Streak sin atrasos */}
        <div className="p-card p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">🔥 Sin atrasos</p>
              {!punct ? <Skeleton className="h-9 w-20 mt-2" /> : (
                <p className={`text-3xl font-bold mt-2 tracking-tight ${punct.streak_sin_atrasos === 0 ? 'text-slate-400' : ''}`}
                  style={punct.streak_sin_atrasos === 0 ? undefined : { color: '#F97316' }}>
                  {punct.streak_sin_atrasos} días
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-1">racha consecutiva sin atrasos &gt;15min</p>
            </div>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-orange-50" style={{ color: '#F97316' }}>
              <Flame className="w-5 h-5" />
            </div>
          </div>
        </div>
      </section>

      {/* Sucursales + Charts enriquecidos */}
      <PortalDashboardExtras />


      {/* Charts */}
      <section className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="p-card p-5 lg:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold tracking-tight">Horas trabajadas · últimos 14 días</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Total diario del equipo</p>
            </div>
            <span className="p-pill p-pill-info"><TrendingUp className="w-3 h-3" /> Tendencia</span>
          </div>
          {loading ? <Skeleton className="h-64 w-full" /> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chart14}>
                <defs>
                  <linearGradient id="g14" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(199 89% 48%)" />
                    <stop offset="100%" stopColor="hsl(213 78% 29%)" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="fecha" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: 'hsl(213 78% 29% / 0.05)' }}
                  contentStyle={{ background: 'white', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 12, boxShadow: '0 8px 24px -8px rgba(0,0,0,0.15)' }}
                />
                <Bar dataKey="horas" fill="url(#g14)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="p-card p-5 lg:col-span-2">
          <h2 className="text-sm font-bold tracking-tight mb-4">Top horas · este mes</h2>
          {loading ? <Skeleton className="h-64 w-full" /> : top10.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">Sin datos este mes.</p>
          ) : (() => {
            const max = Math.max(...top10.map(t => t.horas), 1);
            return (
              <ul className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                {top10.map((t, i) => (
                  <li key={t.id} className="flex items-center gap-3">
                    <span className="text-[11px] font-bold tabular-nums w-5 text-slate-400 shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <WorkerNameLink workerId={t.id} name={t.name} sucursal={t.cost_center} />
                      <div className="mt-1.5 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${(t.horas / max) * 100}%`,
                            background: 'linear-gradient(90deg, hsl(152 60% 45%), hsl(152 70% 35%))',
                          }}
                        />
                      </div>
                    </div>
                    <span className="text-xs font-mono tabular-nums shrink-0 text-slate-700">{t.horas}h</span>
                  </li>
                ))}
              </ul>
            );
          })()}
        </div>
      </section>

      {/* Attendance + incidents */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="p-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold tracking-tight">Asistencia hoy</h2>
            <span className="p-pill p-pill-success">{kpiAttendanceToday} presentes</span>
          </div>
          {loading ? (
            <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : attendanceToday.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Aún no hay marcaciones para hoy.</p>
          ) : (
            <ul className="divide-y divide-border max-h-80 overflow-y-auto -mx-2">
              {attendanceToday.map(r => {
                const w = workersById[r.worker_id];
                const time = new Date(r.check_in).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false });
                return (
                  <li key={r.worker_id} className="px-2 py-2.5 flex items-center gap-3 hover:bg-muted/40 rounded-lg transition-colors">
                    <PortalAvatar name={w ? `${w.first_name} ${w.last_name}` : '?'} photoUrl={w?.photo_url} size={34} />
                    <div className="flex-1 min-w-0">
                      <WorkerNameLink
                        workerId={r.worker_id}
                        name={w ? `${w.first_name} ${w.last_name}` : '—'}
                        sucursal={w?.cost_center}
                      />
                    </div>
                    <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-[hsl(152_60%_38%/0.10)] text-[hsl(152_60%_28%)] shrink-0">{time}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="p-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold tracking-tight">Últimas incidencias</h2>
            <span className="p-pill p-pill-warning">{incidents.length} recientes</span>
          </div>
          {loading ? (
            <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : incidents.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Sin incidencias registradas.</p>
          ) : (
            <ul className="divide-y divide-border">
              {incidents.map(i => {
                const sev = i.severity ?? 1;
                const sevClass = sev >= 4 ? 'p-pill-danger' : sev >= 3 ? 'p-pill-warning' : 'p-pill-muted';
                return (
                  <li key={i.id} className="py-3 flex items-start gap-3">
                    <span className={`p-pill ${sevClass} mt-0.5`}>{sev}/5</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">
                        {i.worker?.id ? (
                          <Link to={`/portal/trabajadores/${i.worker.id}`} className="hover:text-[#1D9E75] transition-colors">
                            {i.worker.first_name} {i.worker.last_name}
                          </Link>
                        ) : (
                          <>{i.worker?.first_name} {i.worker?.last_name}</>
                        )}
                        <span className="ml-2 text-xs text-muted-foreground font-normal capitalize">· {i.incident_type.replace('_', ' ')}</span>
                      </p>
                      {i.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{i.description}</p>}
                    </div>
                    <span className="text-[11px] text-muted-foreground shrink-0">{new Date(i.date).toLocaleDateString('es-CL')}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function HamburgerBtn() {
  const { toggle } = usePortalSidebar();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Abrir menú"
      className="lg:hidden shrink-0 mt-0.5 w-10 h-10 rounded-xl bg-white/10 backdrop-blur border border-white/15 flex items-center justify-center hover:bg-white/15 transition-colors"
    >
      <Menu className="w-5 h-5" />
    </button>
  );
}

function DashboardQuickSearch({ workersById }: { workersById: Record<string, Worker> }) {
  const [search, setSearch] = useState('');
  const list = useMemo(() => Object.values(workersById), [workersById]);
  const results = useMemo(() => {
    if (!search.trim()) return [];
    return list
      .filter(w => matchesSearch([
        `${w.first_name} ${w.last_name}`,
        w.cost_center, w.cost_center ? sucursalName(w.cost_center) : null,
      ], search))
      .slice(0, 8);
  }, [list, search]);
  return (
    <div className="space-y-2">
      <PortalSearchBar
        value={search}
        onChange={setSearch}
        placeholder="Buscar trabajador por nombre o sucursal…"
        total={list.length}
        results={search.trim() ? results.length : undefined}
      />
      {search.trim() && results.length > 0 && (
        <div className="p-card divide-y divide-slate-100 overflow-hidden">
          {results.map(w => (
            <Link
              key={w.id}
              to={`/portal/trabajadores/${w.id}`}
              className="flex items-center justify-between px-4 py-2.5 hover:bg-orange-50/40"
            >
              <span className="text-sm font-semibold" style={{ color: '#1B3A5C' }}>{w.first_name} {w.last_name}</span>
              <span className="text-[11px] text-muted-foreground">{w.cost_center ? sucursalName(w.cost_center) : '—'}</span>
            </Link>
          ))}
        </div>
      )}
      {search.trim() && results.length === 0 && (
        <div className="p-card px-4 py-3 text-xs text-muted-foreground">Sin trabajadores que coincidan.</div>
      )}
    </div>
  );
}


