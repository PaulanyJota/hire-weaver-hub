import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePortalAuth } from '../hooks/usePortalAuth';
import { Users, CheckCircle2, Clock, Timer, TrendingUp, Activity } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { PortalAvatar } from '../components/Avatar';

interface Worker { id: string; first_name: string; last_name: string; photo_url: string | null; active: boolean }
interface Att { worker_id: string; date: string; check_in: string | null; worked_hours: number | null; late_minutes: number | null }
interface IncidentRow {
  id: string; date: string; incident_type: string; description: string | null; severity: number | null;
  worker: { first_name: string; last_name: string } | null;
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
  const [loading, setLoading] = useState(true);
  const [activeWorkers, setActiveWorkers] = useState(0);
  const [attendanceToday, setAttendanceToday] = useState<Array<{ worker_id: string; check_in: string }>>([]);
  const [weekAtt, setWeekAtt] = useState<Att[]>([]);
  const [last14, setLast14] = useState<Att[]>([]);
  const [monthAtt, setMonthAtt] = useState<Att[]>([]);
  const [workersById, setWorkersById] = useState<Record<string, Worker>>({});
  const [incidents, setIncidents] = useState<IncidentRow[]>([]);

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
          supabase.from('portal_workers').select('id, first_name, last_name, photo_url, active'),
          supabase.from('portal_attendance').select('worker_id, date, check_in, worked_hours, late_minutes').eq('date', today).not('check_in', 'is', null),
          supabase.from('portal_attendance').select('worker_id, date, check_in, worked_hours, late_minutes').gte('date', monday),
          supabase.from('portal_attendance').select('worker_id, date, check_in, worked_hours, late_minutes').gte('date', since14Str),
          supabase.from('portal_attendance').select('worker_id, date, check_in, worked_hours, late_minutes').gte('date', monthStart),
          supabase.from('portal_incidents')
            .select('id, date, incident_type, description, severity, worker:portal_workers(first_name,last_name)')
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
  const kpiHoursWeek = useMemo(() => weekAtt.reduce((s, r) => s + Number(r.worked_hours ?? 0), 0), [weekAtt]);
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
        return { name: w ? `${w.first_name} ${w.last_name[0] ?? ''}.` : '—', horas: Number(horas.toFixed(1)) };
      })
      .sort((a, b) => b.horas - a.horas).slice(0, 10);
  }, [monthAtt, workersById]);

  const today = new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const firstName = profile?.full_name.split(' ')[0] ?? '';

  const cards = [
    { label: 'Trabajadores activos', value: activeWorkers, icon: Users, glow: 'hsl(213 78% 29% / 0.15)', accent: 'hsl(213 78% 29%)' },
    { label: 'Asistencias hoy', value: kpiAttendanceToday, sub: `${attendanceRate}% del equipo`, icon: CheckCircle2, glow: 'hsl(152 60% 45% / 0.18)', accent: 'hsl(152 60% 38%)' },
    { label: 'Horas semana', value: kpiHoursWeek.toFixed(0), sub: 'horas registradas', icon: Clock, glow: 'hsl(199 89% 48% / 0.18)', accent: 'hsl(199 89% 42%)' },
    { label: 'Atrasos semana', value: kpiLateWeek, sub: 'minutos acumulados', icon: Timer, glow: 'hsl(25 95% 53% / 0.18)', accent: 'hsl(25 90% 45%)' },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-7">
      {/* Hero */}
      <header className="p-fade-up relative overflow-hidden rounded-2xl p-8 text-white"
        style={{ background: 'linear-gradient(135deg, hsl(215 32% 14%) 0%, hsl(213 78% 28%) 55%, hsl(199 89% 42%) 100%)' }}>
        <div className="absolute -top-20 -right-10 w-72 h-72 rounded-full opacity-30 blur-3xl"
          style={{ background: 'radial-gradient(closest-side, hsl(199 89% 60%), transparent)' }} />
        <div className="relative flex items-start justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-white/65 font-semibold">Panel general</p>
            <h1 className="text-3xl font-bold tracking-tight mt-1">Hola, {firstName} 👋</h1>
            <p className="text-sm text-white/75 capitalize mt-1.5">
              {today}{isNodoAdmin && ' · Vista global Nodo'}{company && !isNodoAdmin && ` · ${company.name}`}
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 backdrop-blur border border-white/15">
            <Activity className="w-4 h-4" />
            <span className="text-xs font-medium">Datos en vivo</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
        </div>
      </header>

      {/* KPIs */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-stagger">
        {cards.map(c => (
          <div key={c.label} className="p-kpi" style={{ ['--p-kpi-glow' as any]: c.glow }}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{c.label}</p>
                {loading ? <Skeleton className="h-9 w-20 mt-2" /> : (
                  <p className="text-3xl font-bold mt-2 tracking-tight" style={{ color: c.accent }}>{c.value}</p>
                )}
                {c.sub && !loading && <p className="text-xs text-muted-foreground mt-1">{c.sub}</p>}
              </div>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `${c.accent}15`, color: c.accent }}>
                <c.icon className="w-5 h-5" />
              </div>
            </div>
          </div>
        ))}
      </section>

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
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(260, top10.length * 28)}>
              <BarChart data={top10} layout="vertical" margin={{ left: 8 }}>
                <defs>
                  <linearGradient id="gtop" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="hsl(152 60% 45%)" />
                    <stop offset="100%" stopColor="hsl(152 70% 35%)" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" width={110} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: 'white', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 12, boxShadow: '0 8px 24px -8px rgba(0,0,0,0.15)' }} />
                <Bar dataKey="horas" fill="url(#gtop)" radius={[0, 6, 6, 0]}>
                  {top10.map((_, i) => <Cell key={i} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
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
                    <span className="flex-1 text-sm font-medium truncate">{w ? `${w.first_name} ${w.last_name}` : '—'}</span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-[hsl(152_60%_38%/0.10)] text-[hsl(152_60%_28%)]">{time}</span>
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
                        {i.worker?.first_name} {i.worker?.last_name}
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
