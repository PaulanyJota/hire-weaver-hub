import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { PortalAvatar } from '../components/Avatar';
import { formatRut } from '../lib/formatRut';
import { fmtPeriodSafe } from '../components/SucursalPayroll';
import { shiftedPeriodEs, fmtPeriodEs } from '../lib/periodLabel';
import {
  ArrowLeft, Mail, Phone, MapPin, Building2, Calendar, BadgeCheck,
  Briefcase, FileText, CalendarX, Clock, CalendarCheck, Timer, DollarSign,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  LineChart, Line,
} from 'recharts';
import { useSalaryBreakdown } from '../hooks/useBranchRankingKpis';


interface Worker {
  id: string;
  first_name: string; last_name: string;
  rut: string | null;
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

function ContractTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl p-4 border border-orange-200">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
      <span
        className="inline-block mt-2 px-2.5 py-1 rounded-lg text-sm font-bold capitalize"
        style={{ background: '#FFF7ED', color: '#EA580C', border: '1px solid #FED7AA' }}
      >
        {value}
      </span>
    </div>
  );
}

export default function PortalTrabajadorDetalle() {
  const { id } = useParams<{ id: string }>();
  const [worker, setWorker] = useState<Worker | null>(null);
  const [contract, setContract] = useState<Contract | null>(null);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [absences30, setAbsences30] = useState(0);
  const [profileExt, setProfileExt] = useState<any | null>(null);
  const [payHistory, setPayHistory] = useState<Array<{ period: string; sueldo_liquido: number; comisiones: number; total: number }>>([]);
  const [salaryHist, setSalaryHist] = useState<Array<{ period: string; liquid_salary: number; delta_pct: number | null }>>([]);
  const [commissions, setCommissions] = useState<{ history: Array<{ period: string; total: number; detalle: Array<{ concept: string; amount: number }> }>; by_concept: Array<{ concept: string; total: number; veces: number }>; total_all: number } | null>(null);
  const [inferred, setInferred] = useState<{ dias_activos: number[]; hora_entrada: string | null; hora_salida: string | null; jornada_horas: number | null } | null>(null);
  const [loading, setLoading] = useState(true);

  const { data: breakdownAll = [] } = useSalaryBreakdown(null, null);
  const breakdown = useMemo(() => breakdownAll.find(b => b.worker_id === id) ?? null, [breakdownAll, id]);


  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const since = new Date(); since.setDate(since.getDate() - 30);
      const sinceStr = since.toISOString().slice(0, 10);

      const [w, c, a, ab, prof, pay, sal, com] = await Promise.all([
        supabase.from('portal_workers')
          .select('id, first_name, last_name, rut, rut_display, position, area, sub_area, division, cost_center, hire_date, termination_date, active, photo_url, email, phone')
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
        supabase.rpc('get_worker_profile' as any, { p_worker_id: id }),
        supabase.rpc('get_worker_pay_history' as any, { p_worker_id: id }),
        supabase.rpc('get_worker_salary_history' as any, { p_worker_id: id }),
        supabase.rpc('get_worker_commissions' as any, { p_worker_id: id, p_periods: 6 }),
      ]);
      if (cancelled) return;
      setWorker((w.data as Worker) ?? null);
      setContract((c.data as Contract) ?? null);
      setAttendance((a.data ?? []) as Attendance[]);
      setAbsences30(ab.count ?? 0);
      const profArr = (prof.data ?? []) as any[];
      setProfileExt(profArr[0] ?? null);
      // Los RPCs de payroll devuelven payment_period (mes de pago) y worked_period (mes trabajado).
      // En Chile mostramos al usuario el mes TRABAJADO.
      const payArr = ((pay.data ?? []) as any[])
        .map((r: any) => ({
          period: r.worked_period ?? r.period,
          sueldo_liquido: Number(r.net_salary ?? r.liquid_salary ?? r.sueldo_liquido ?? 0),
          comisiones: Number(r.comisiones ?? 0),
          total: Number(r.total ?? r.net_salary ?? r.liquid_salary ?? 0),
        }))
        .sort((x, y) => (x.period < y.period ? 1 : -1));
      setPayHistory(payArr);
      setSalaryHist(((sal.data ?? []) as any[]).map((r: any) => ({
        period: r.worked_period ?? r.period,
        liquid_salary: Number(r.liquid_salary ?? 0),
        delta_pct: r.delta_pct == null ? null : Number(r.delta_pct),
      })));
      setCommissions((com.data as any) ?? null);

      // Inferred schedule: try to fetch; if missing, infer then fetch again
      const fetchInferred = async () => {
        const { data: row } = await supabase.from('worker_inferred_schedule' as any)
          .select('dias_activos, hora_entrada, hora_salida, jornada_horas')
          .eq('worker_id', id).maybeSingle();
        return row as any;
      };
      let sched = await fetchInferred();
      if (!sched) {
        await supabase.rpc('infer_worker_schedule' as any, { p_worker_id: id, p_lookback_days: 60 });
        sched = await fetchInferred();
      }
      if (!cancelled && sched) {
        setInferred({
          dias_activos: Array.isArray(sched.dias_activos) ? sched.dias_activos.map((n: any) => Number(n)) : [],
          hora_entrada: sched.hora_entrada ?? null,
          hora_salida: sched.hora_salida ?? null,
          jornada_horas: sched.jornada_horas != null ? Number(sched.jornada_horas) : null,
        });
      }
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
      <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!worker) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
        <Link to="/portal/trabajadores" className="inline-flex items-center gap-2 text-sm text-[hsl(213_78%_29%)] hover:underline">
          <ArrowLeft className="w-4 h-4" /> Volver
        </Link>
        <p className="mt-6 text-muted-foreground">Trabajador no encontrado o sin acceso.</p>
      </div>
    );
  }

  const fullName = `${worker.first_name} ${worker.last_name}`;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
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
          <InfoRow icon={<BadgeCheck className="w-4 h-4" />} label="RUT" value={formatRut(worker.rut ?? worker.rut_display)} mono />
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

      {/* Contrato */}
      <section className="p-card p-6 border border-orange-200 bg-white">
        <p className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: '#EA580C' }}>Contrato</p>
        <h2 className="text-xl font-bold mt-1" style={{ color: '#1B3A5C' }}>Información contractual</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          <ContractTile label="Tipo de contrato" value={profileExt?.contract_type ?? '—'} />
          <ContractTile label="Vencimiento" value={profileExt?.contract_end ? new Date(profileExt.contract_end + 'T00:00:00').toLocaleDateString('es-CL') : '—'} />
          <ContractTile label="Modalidad" value={profileExt?.modality ?? '—'} />
          <ContractTile label="Horas semanales" value={profileExt?.weekly_hours != null ? `${profileExt.weekly_hours} h` : '—'} />
        </div>
      </section>

      {/* Horario inferido */}
      <section className="p-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-4 h-4" style={{ color: '#FB923C' }} />
          <h2 className="text-sm font-bold tracking-tight" style={{ color: '#1B3A5C' }}>Horario inferido</h2>
          <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground">según marcaciones últimos 60 días</span>
        </div>
        {!inferred ? (
          <p className="text-sm text-muted-foreground">Sin datos suficientes para inferir horario.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Días activos</p>
              <div className="flex flex-wrap gap-1.5">
                {['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'].map((d, i) => {
                  const active = inferred.dias_activos.includes(i);
                  return (
                    <span key={i}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold"
                      style={active
                        ? { background: 'linear-gradient(135deg, #F97316, #EA580C)', color: 'white' }
                        : { background: '#f1f5f9', color: '#94a3b8' }}>
                      {d}
                    </span>
                  );
                })}
              </div>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Horario típico</p>
              <p className="text-lg font-bold tabular-nums" style={{ color: '#1B3A5C' }}>
                {inferred.hora_entrada ? inferred.hora_entrada.slice(0,5) : '—'}
                <span className="text-muted-foreground mx-2">→</span>
                {inferred.hora_salida ? inferred.hora_salida.slice(0,5) : '—'}
              </p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Jornada promedio</p>
              <p className="text-lg font-bold tabular-nums" style={{ color: '#1B3A5C' }}>
                {inferred.jornada_horas != null ? `${inferred.jornada_horas.toFixed(1)} h` : '—'}
              </p>
            </div>
          </div>
        )}
      </section>


      {/* Remuneraciones */}
      <section className="p-card overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-2">
          <DollarSign className="w-4 h-4" style={{ color: '#FB923C' }} />
          <h2 className="text-sm font-bold tracking-tight" style={{ color: '#1B3A5C' }}>Remuneraciones</h2>
          <span className="ml-auto text-xs text-muted-foreground tabular-nums">{payHistory.length} período{payHistory.length === 1 ? '' : 's'}</span>
        </div>
        {salaryHist.length >= 2 && (
          <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-br from-orange-50/40 to-slate-50/40">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Evolución sueldo líquido</p>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={salaryHist.map(s => ({
                  period: fmtPeriodSafe(s.period),
                  liquido: s.liquid_salary,
                }))} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gSalLine" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#F97316" />
                      <stop offset="100%" stopColor="#EA580C" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="period" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false}
                    tickFormatter={(v) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${Math.round(v / 1000)}k` : v} />
                  <Tooltip
                    formatter={(v: any) => ['$' + Math.round(Number(v)).toLocaleString('es-CL'), 'Líquido']}
                    contentStyle={{ background: 'white', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 12 }}
                  />
                  <Line type="monotone" dataKey="liquido" stroke="url(#gSalLine)" strokeWidth={3} dot={{ r: 3, fill: '#FB923C' }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="p-table">
            <thead>
              <tr>
                <th>Período</th>
                <th className="text-right">Sueldo líquido</th>
                <th className="text-right">Comisiones</th>
                <th className="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {payHistory.length === 0 ? (
                <tr><td colSpan={4} className="p-10 text-center text-muted-foreground">Sin remuneraciones registradas.</td></tr>
              ) : payHistory.map(r => (
                <tr key={r.period}>
                  <td className="font-semibold" style={{ color: '#1B3A5C' }}>{fmtPeriodSafe(r.period)}</td>
                  <td className="text-right font-mono tabular-nums">
                    {Number(r.sueldo_liquido) > 0 ? '$' + Math.round(Number(r.sueldo_liquido)).toLocaleString('es-CL') : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="text-right font-mono tabular-nums">{'$' + Math.round(Number(r.comisiones) || 0).toLocaleString('es-CL')}</td>
                  <td className="text-right font-mono tabular-nums font-bold" style={{ color: '#FB923C' }}>{'$' + Math.round(Number(r.total) || 0).toLocaleString('es-CL')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Comisiones */}
      {commissions && commissions.history && commissions.history.length > 0 && (
        <section className="p-card overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-2">
            <DollarSign className="w-4 h-4" style={{ color: '#F97316' }} />
            <h2 className="text-sm font-bold tracking-tight" style={{ color: '#1B3A5C' }}>Comisiones · últimos 6 meses</h2>
            <span className="ml-auto text-xs tabular-nums font-bold" style={{ color: '#F97316' }}>
              Total: ${Math.round(commissions.total_all || 0).toLocaleString('es-CL')}
            </span>
          </div>
          <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-3">Total por mes</p>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[...commissions.history].sort((a, b) => (a.period < b.period ? -1 : 1)).map(h => ({
                    period: fmtPeriodEs(h.period),
                    total: Number(h.total) || 0,
                  }))} margin={{ top: 8, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gCom" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#FB923C" />
                        <stop offset="100%" stopColor="#EA580C" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="period" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false}
                      tickFormatter={(v) => v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`} />
                    <Tooltip
                      formatter={(v: any) => ['$' + Math.round(Number(v)).toLocaleString('es-CL'), 'Comisión']}
                      contentStyle={{ background: 'white', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 12 }}
                    />
                    <Bar dataKey="total" fill="url(#gCom)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-3">Desglose por concepto</p>
              <ul className="divide-y divide-slate-100">
                {(commissions.by_concept ?? []).map(c => (
                  <li key={c.concept} className="flex items-center justify-between py-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: '#1B3A5C' }}>{c.concept}</p>
                      <p className="text-[10px] text-muted-foreground">{c.veces} vez{c.veces === 1 ? '' : 'es'}</p>
                    </div>
                    <p className="font-mono tabular-nums text-sm font-bold shrink-0" style={{ color: '#F97316' }}>
                      ${Math.round(Number(c.total) || 0).toLocaleString('es-CL')}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

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
          <div className="overflow-x-auto">
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

