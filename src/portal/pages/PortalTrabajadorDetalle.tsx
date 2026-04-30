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
  first_name: string;
  last_name: string;
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
  date: string; // YYYY-MM-DD
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
      const since = new Date();
      since.setDate(since.getDate() - 30);
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
    return [...attendance]
      .sort((x, y) => x.date.localeCompare(y.date))
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
        <Link to="/portal/trabajadores" className="inline-flex items-center gap-2 text-sm text-[#1F4E78] hover:underline">
          <ArrowLeft className="w-4 h-4" /> Volver
        </Link>
        <p className="mt-6 text-muted-foreground">Trabajador no encontrado o sin acceso.</p>
      </div>
    );
  }

  const fullName = `${worker.first_name} ${worker.last_name}`;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <Link to="/portal/trabajadores" className="inline-flex items-center gap-2 text-sm text-[#1F4E78] hover:underline">
        <ArrowLeft className="w-4 h-4" /> Volver a trabajadores
      </Link>

      {/* (A) Header */}
      <header className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-start gap-5">
          <PortalAvatar name={fullName} photoUrl={worker.photo_url} size={72} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold">{fullName}</h1>
              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${worker.active ? 'bg-emerald-100 text-emerald-700' : 'bg-muted text-muted-foreground'}`}>
                {worker.active ? 'Activo' : 'Inactivo'}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {worker.position ?? '—'}{worker.area ? ` · ${worker.area}` : ''}
            </p>
          </div>
        </div>
      </header>

      {/* (B) Información personal */}
      <section className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-sm font-semibold mb-4">Información personal</h2>
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

      {/* (C) Asistencia últimos 30 días */}
      <section className="bg-card border border-border rounded-xl p-6 space-y-6">
        <h2 className="text-sm font-semibold">Asistencia · últimos 30 días</h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MiniKpi icon={<CalendarCheck className="w-4 h-4" />} label="Días trabajados" value={kpis.dias.toString()} color="#16a34a" />
          <MiniKpi icon={<Clock className="w-4 h-4" />} label="Horas totales" value={kpis.horas.toFixed(1)} color="#2563eb" />
          <MiniKpi icon={<Timer className="w-4 h-4" />} label="Atrasos (min)" value={kpis.atrasos.toString()} color="#f97316" />
          <MiniKpi icon={<CalendarX className="w-4 h-4" />} label="Ausencias" value={absences30.toString()} color="#dc2626" />
        </div>

        <div className="h-64">
          {chartData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">Sin registros de asistencia.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="fecha" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="horas" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left text-xs text-muted-foreground">
                <th className="p-3 font-medium">Fecha</th>
                <th className="p-3 font-medium">Turno</th>
                <th className="p-3 font-medium">Ingreso</th>
                <th className="p-3 font-medium">Salida</th>
                <th className="p-3 font-medium">Horas</th>
                <th className="p-3 font-medium">Atraso (min)</th>
                <th className="p-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {attendance.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Sin registros.</td></tr>
              ) : attendance.map(r => {
                const weekend = isWeekend(r.date);
                const estado = weekend ? 'Fin de semana' : r.check_in ? 'Asistió' : 'Ausente';
                const estadoClass = weekend
                  ? 'bg-muted text-muted-foreground'
                  : r.check_in
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-red-100 text-red-700';
                return (
                  <tr key={r.id} className="border-t border-border">
                    <td className="p-3">{fmtDate(r.date)}</td>
                    <td className="p-3 text-xs">{fmtShiftTime(r.shift_start)} – {fmtShiftTime(r.shift_end)}</td>
                    <td className="p-3">{fmtTime(r.check_in)}</td>
                    <td className="p-3">{fmtTime(r.check_out)}</td>
                    <td className="p-3">{r.worked_hours?.toFixed(2) ?? '—'}</td>
                    <td className="p-3">{r.late_minutes ?? 0}</td>
                    <td className="p-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${estadoClass}`}>{estado}</span>
                    </td>
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
    <div className="flex items-center gap-2 min-w-0">
      <span className="text-muted-foreground shrink-0">{icon}</span>
      <span className="text-muted-foreground shrink-0">{label}:</span>
      <span className={`truncate ${mono ? 'font-mono text-xs' : ''}`}>{value}</span>
    </div>
  );
}

function MiniKpi({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="border border-border rounded-lg p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span style={{ color }}>{icon}</span>
        {label}
      </div>
      <p className="text-2xl font-bold mt-1.5" style={{ color }}>{value}</p>
    </div>
  );
}
