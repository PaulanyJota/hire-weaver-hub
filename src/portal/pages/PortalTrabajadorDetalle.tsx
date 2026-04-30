import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { PortalAvatar } from '../components/Avatar';
import {
  ArrowLeft, Mail, Phone, MapPin, Building2, Calendar, BadgeCheck,
  Briefcase, FileText, CalendarX, Clock, CalendarCheck, Timer,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';

interface Worker {
  id: string;
  first_name: string; last_name: string;
  rut_display: string | null;
  position: string | null;
  area: string | null;
  sub_area: string | null;
  division: string | null;
  cost_center: string | null;
  hire_date: string | null;
  termination_date: string | null;
  active: boolean;
  photo_url: string | null;
  email: string | null;
  phone: string | null;
}

interface Contract {
  id: string;
  contract_type: string | null;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
}

interface Attendance {
  id: string;
  date: string;
  shift_start: string | null;
  shift_end: string | null;
  check_in: string | null;
  check_out: string | null;
  worked_hours: number | null;
  late_minutes: number | null;
}

const fmtDate = (d: string | null) => (d ? new Date(d + (d.length === 10 ? 'T00:00:00' : '')).toLocaleDateString('es-CL') : '—');
const fmtTime = (t: string | null) =>
  t ? new Date(t).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false }) : '—';
const fmtShiftTime = (t: string | null) => (t ? t.slice(0, 5) : '—');
const ddMM = (d: string) => {
  const dt = new Date(d + 'T00:00:00');
  return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}`;
};
const isWeekend = (d: string) => {
  const dt = new Date(d + 'T00:00:00');
  const w = dt.getDay();
  return w === 0 || w === 6;
};

export default function PortalTrabajadorDetalle() {
  const { id } = useParams<{ id: string }>();
  const [worker, setWorker] = useState<Worker | null>(null);
  const [contract, setContract] = useState<Contract | null>(null);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [absences30, setAbsences30] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const since = new Date(); since.setDate(since.getDate() - 30);
      const sinceStr = since.toISOString().slice(0, 10);

      const [w, c, a, ab] = await Promise.all([
        supabase.from('portal_workers')
          .select('id, first_name, last_name, rut_display, position, area, sub_area, division, cost_center, hire_date, termination_date, active, photo_url, email, phone')
          .eq('id', id).maybeSingle(),
        supabase.from('portal_contracts')
          .select('id, contract_type, start_date, end_date, is_current')
          .eq('worker_id', id).order('is_current', { ascending: false }).order('start_date', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('portal_attendance')
          .select('id, date, shift_start, shift_end, check_in, check_out, worked_hours, late_minutes')
          .eq('worker_id', id).order('date', { ascending: false }).limit(30),
        supabase.from('portal_absences')
          .select('id', { count: 'exact', head: true })
          .eq('worker_id', id).gte('start_date', sinceStr),
      ]);
      if (cancelled) return;
      setWorker((w.data as Worker) ?? null);
      setContract((c.data as Contract) ?? null);
      setAttendance((a.data ?? []) as Attendance[]);
      setAbsences30(ab.count ?? 0);
      setLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, [id]);

  const kpis = useMemo(() => {
    const dias = attendance.filter(r => !!r.check_in).length;
    const horas = attendance.reduce((s, r) => s + Number(r.worked_hours ?? 0), 0);
    const atrasos = attendance.reduce((s, r) => s + Number(r.late_minutes ?? 0), 0);
    return { dias, horas, atrasos };
  }, [attendance]);

  const chartData = useMemo(() => {
    return [...attendance].sort((x, y) => x.date.localeCompare(y.date))
      .map(r => ({ fecha: ddMM(r.date), horas: Number(r.worked_hours ?? 0) }));
  }, [attendance]);

  if (loading) {
    return (
      <div className="p-8 max-w-6xl mx-auto space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!worker) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <Link to="/portal/trabajadores" className="inline-flex items-center gap-2 text-sm text-[hsl(213_78%_29%)] hover:underline">
          <ArrowLeft className="w-4 h-4" /> Volver
        </Link>
        <p className="mt-6 text-muted-foreground">Trabajador no encontrado o sin acceso.</p>
      </div>
    );
  }

  const fullName = `${worker.first_name} ${worker.last_name}`;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <Link to="/portal/trabajadores" className="inline-flex items-center gap-1.5 text-sm font-medium text-[hsl(213_78%_29%)] hover:gap-2 transition-all">
        <ArrowLeft className="w-4 h-4" /> Volver a trabajadores
      </Link>

      {/* Header gradient */}
      <header className="p-fade-up relative overflow-hidden rounded-2xl p-6 text-white"
        style={{ background: 'linear-gradient(135deg, hsl(215 32% 14%) 0%, hsl(213 78% 28%) 60%, hsl(199 89% 42%) 100%)' }}>
        <div className="absolute -top-20 -right-10 w-72 h-72 rounded-full opacity-25 blur-3xl"
          style={{ background: 'radial-gradient(closest-side, hsl(199 89% 60%), transparent)' }} />
        <div className="relative flex items-start gap-5 flex-wrap">
          <PortalAvatar name={fullName} photoUrl={worker.photo_url} size={84} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{fullName}</h1>
              <span className={`p-pill ${worker.active ? 'p-pill-success' : 'p-pill-muted'}`} style={{ background: 'rgba(255,255,255,0.15)', color: 'white', borderColor: 'rgba(255,255,255,0.25)' }}>
                {worker.active ? 'Activo' : 'Inactivo'}
              </span>
            </div>
            <p className="text-sm text-white/85 mt-1">
              {worker.position ?? '—'}{worker.area ? ` · ${worker.area}` : ''}
            </p>
            {worker.email && (
              <div className="flex flex-wrap gap-3 mt-3 text-xs text-white/75">
                <span className="inline-flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" />{worker.email}</span>
                {worker.phone && <span className="inline-flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" />{worker.phone}</span>}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Información personal */}
      <section className="p-card p-6">
        <h2 className="p-section-title mb-4">Información personal</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-sm">
          <InfoRow icon={<BadgeCheck className="w-4 h-4" />} label="RUT" value={worker.rut_display ?? '—'} mono />
          <InfoRow icon={<Mail className="w-4 h-4" />} label="Correo" value={worker.email ?? '—'} />
          <InfoRow icon={<Phone className="w-4 h-4" />} label="Teléfono" value={worker.phone ?? '—'} />
          <InfoRow icon={<Briefcase className="w-4 h-4" />} label="Cargo" value={worker.position ?? '—'} />
          <InfoRow icon={<MapPin className="w-4 h-4" />} label="Área" value={worker.area ?? '—'} />
          <InfoRow icon={<Building2 className="w-4 h-4" />} label="Centro de costo" value={worker.cost_center ?? '—'} />
          <InfoRow icon={<FileText className="w-4 h-4" />} label="Tipo de contrato" value={contract?.contract_type ?? '—'} />
          <InfoRow icon={<Calendar className="w-4 h-4" />} label="Fecha de ingreso" value={fmtDate(worker.hire_date)} />
          {worker.termination_date && (
            <InfoRow icon={<CalendarX className="w-4 h-4" />} label="Fecha de término" value={fmtDate(worker.termination_date)} />
          )}
        </div>
      </section>

      {/* Asistencia */}
      <section className="p-card p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="p-section-title">Asistencia · últimos 30 días</h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-stagger">
          <MiniKpi icon={<CalendarCheck className="w-4 h-4" />} label="Días trabajados" value={kpis.dias.toString()} color="hsl(152 60% 38%)" />
          <MiniKpi icon={<Clock className="w-4 h-4" />} label="Horas totales" value={kpis.horas.toFixed(1)} color="hsl(199 89% 42%)" />
          <MiniKpi icon={<Timer className="w-4 h-4" />} label="Atrasos (min)" value={kpis.atrasos.toString()} color="hsl(25 95% 48%)" />
          <MiniKpi icon={<CalendarX className="w-4 h-4" />} label="Ausencias" value={absences30.toString()} color="hsl(0 73% 50%)" />
        </div>

        <div className="h-64">
          {chartData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">Sin registros de asistencia.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <defs>
                  <linearGradient id="gdet" x1="0" y1="0" x2="0" y2="1">
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
                <Bar dataKey="horas" fill="url(#gdet)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-xl overflow-hidden border border-border">
          <table className="p-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Turno</th>
                <th>Ingreso</th>
                <th>Salida</th>
                <th>Horas</th>
                <th>Atraso</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {attendance.length === 0 ? (
                <tr><td colSpan={7} className="p-12 text-center text-muted-foreground">Sin registros.</td></tr>
              ) : attendance.map(r => {
                const weekend = isWeekend(r.date);
                const estado = weekend ? 'Fin de semana' : r.check_in ? 'Asistió' : 'Ausente';
                const cls = weekend ? 'p-pill-muted' : r.check_in ? 'p-pill-success' : 'p-pill-danger';
                return (
                  <tr key={r.id}>
                    <td>{fmtDate(r.date)}</td>
                    <td className="text-xs text-muted-foreground">{fmtShiftTime(r.shift_start)} – {fmtShiftTime(r.shift_end)}</td>
                    <td className="font-mono text-xs">{fmtTime(r.check_in)}</td>
                    <td className="font-mono text-xs">{fmtTime(r.check_out)}</td>
                    <td className="font-semibold">{r.worked_hours?.toFixed(2) ?? '—'}</td>
                    <td className="text-xs">{r.late_minutes ?? 0} min</td>
                    <td><span className={`p-pill ${cls}`}>{estado}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function InfoRow({ icon, label, value, mono }: { icon: React.ReactNode; label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center gap-3 min-w-0 py-1">
      <span className="w-8 h-8 rounded-lg bg-[hsl(213_78%_29%/0.08)] text-[hsl(213_78%_29%)] flex items-center justify-center shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
        <p className={`truncate font-medium ${mono ? 'font-mono text-xs' : 'text-sm'}`}>{value}</p>
      </div>
    </div>
  );
}

function MiniKpi({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl p-4 border border-border bg-white" style={{ boxShadow: 'var(--p-shadow-sm)' }}>
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
        <span style={{ color }}>{icon}</span>
        {label}
      </div>
      <p className="text-2xl font-bold mt-1.5 tracking-tight" style={{ color }}>{value}</p>
    </div>
  );
}
