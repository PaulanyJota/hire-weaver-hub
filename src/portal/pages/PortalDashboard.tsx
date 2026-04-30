import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePortalAuth } from '../hooks/usePortalAuth';
import { Users, CheckCircle2, Clock, Timer } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { PortalAvatar } from '../components/Avatar';

interface Worker { id: string; first_name: string; last_name: string; photo_url: string | null; active: boolean }
interface Att { worker_id: string; date: string; check_in: string | null; worked_hours: number | null; late_minutes: number | null }
interface IncidentRow {
  id: string; date: string; incident_type: string; description: string | null;
  worker: { first_name: string; last_name: string } | null;
}

const todayStr = () => new Date().toISOString().slice(0, 10);
const mondayStr = () => {
  const d = new Date();
  const diff = (d.getDay() + 6) % 7; // 0=lunes
  d.setDate(d.getDate() - diff);
  return d.toISOString().slice(0, 10);
};
const monthStartStr = () => {
  const d = new Date(); d.setDate(1);
  return d.toISOString().slice(0, 10);
};
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
            .select('id, date, incident_type, description, worker:portal_workers(first_name,last_name)')
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

  // KPIs
  const kpiAttendanceToday = useMemo(
    () => new Set(attendanceToday.map(r => r.worker_id)).size,
    [attendanceToday]
  );
  const kpiHoursWeek = useMemo(
    () => weekAtt.reduce((s, r) => s + Number(r.worked_hours ?? 0), 0),
    [weekAtt]
  );
  const kpiLateWeek = useMemo(
    () => weekAtt.reduce((s, r) => s + Number(r.late_minutes ?? 0), 0),
    [weekAtt]
  );

  // Chart 1: horas/día últimos 14 días
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

  // Chart 2: top 10 trabajadores por horas este mes
  const top10 = useMemo(() => {
    const acc = new Map<string, number>();
    monthAtt.forEach(r => {
      acc.set(r.worker_id, (acc.get(r.worker_id) ?? 0) + Number(r.worked_hours ?? 0));
    });
    return Array.from(acc.entries())
      .map(([wid, horas]) => {
        const w = workersById[wid];
        return { name: w ? `${w.first_name} ${w.last_name[0] ?? ''}.` : '—', horas: Number(horas.toFixed(1)) };
      })
      .sort((a, b) => b.horas - a.horas)
      .slice(0, 10);
  }, [monthAtt, workersById]);

  const today = new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const firstName = profile?.full_name.split(' ')[0] ?? '';

  const cards = [
    { label: 'Trabajadores activos', value: activeWorkers, icon: Users, color: '#1F4E78' },
    { label: 'Asistencias hoy', value: kpiAttendanceToday, icon: CheckCircle2, color: '#16a34a' },
    { label: 'Horas trabajadas (semana)', value: kpiHoursWeek.toFixed(1), icon: Clock, color: '#2563eb' },
    { label: 'Atrasos esta semana (min)', value: kpiLateWeek, icon: Timer, color: '#f97316' },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Hola, {firstName} 👋</h1>
        <p className="text-sm text-muted-foreground capitalize mt-1">
          {today} {isNodoAdmin && '· Vista global Nodo'} {company && !isNodoAdmin && `· ${company.name}`}
        </p>
      </header>

      {/* (A) KPIs */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(c => (
          <div key={c.label} className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">{c.label}</p>
                {loading ? <Skeleton className="h-8 w-16 mt-2" /> : <p className="text-3xl font-bold mt-2">{c.value}</p>}
              </div>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${c.color}1a`, color: c.color }}>
                <c.icon className="w-5 h-5" />
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* (B) Dos gráficos */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold mb-4">Horas trabajadas por día · últimos 14 días</h2>
          {loading ? <Skeleton className="h-64 w-full" /> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chart14}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="fecha" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="horas" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold mb-4">Top 10 trabajadores por horas · este mes</h2>
          {loading ? <Skeleton className="h-64 w-full" /> : top10.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">Sin datos este mes.</p>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(260, top10.length * 28)}>
              <BarChart data={top10} layout="vertical" margin={{ left: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" width={120} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="horas" fill="#16a34a" radius={[0, 4, 4, 0]}>
                  {top10.map((_, i) => <Cell key={i} fill="#16a34a" />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      {/* (C) Asistencia hoy + Últimas incidencias */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold mb-4">Asistencia hoy</h2>
          {loading ? (
            <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : attendanceToday.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Aún no hay marcaciones para hoy.</p>
          ) : (
            <ul className="divide-y divide-border max-h-80 overflow-y-auto">
              {attendanceToday.map(r => {
                const w = workersById[r.worker_id];
                const time = new Date(r.check_in).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false });
                return (
                  <li key={r.worker_id} className="py-2.5 flex items-center gap-3">
                    <PortalAvatar name={w ? `${w.first_name} ${w.last_name}` : '?'} photoUrl={w?.photo_url} size={32} />
                    <span className="flex-1 text-sm font-medium truncate">{w ? `${w.first_name} ${w.last_name}` : '—'}</span>
                    <span className="text-xs font-mono text-[#16a34a]">{time}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold mb-4">Últimas incidencias</h2>
          {loading ? (
            <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : incidents.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Sin incidencias registradas.</p>
          ) : (
            <ul className="divide-y divide-border">
              {incidents.map(i => (
                <li key={i.id} className="py-3 flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-[#f97316] mt-2 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">
                      {i.worker?.first_name} {i.worker?.last_name}
                      <span className="ml-2 text-xs text-muted-foreground font-normal capitalize">· {i.incident_type.replace('_', ' ')}</span>
                    </p>
                    {i.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{i.description}</p>}
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">{new Date(i.date).toLocaleDateString('es-CL')}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
