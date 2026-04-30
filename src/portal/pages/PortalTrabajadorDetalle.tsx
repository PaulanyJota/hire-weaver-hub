import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PortalAvatar } from '../components/Avatar';
import { ArrowLeft, Mail, Phone, MapPin, Building2, Calendar, BadgeCheck } from 'lucide-react';

interface Worker {
  id: string;
  first_name: string;
  last_name: string;
  rut_display: string | null;
  position: string | null;
  area: string | null;
  hire_date: string | null;
  active: boolean;
  photo_url: string | null;
  email: string | null;
  phone: string | null;
  sub_area: string | null;
  division: string | null;
}

interface Contract {
  id: string;
  contract_type: string | null;
  start_date: string | null;
  end_date: string | null;
}

interface Attendance {
  id: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  worked_hours: number | null;
  late_minutes: number | null;
}

interface Absence {
  id: string;
  absence_type: string;
  start_date: string;
  end_date: string;
  business_days: number | null;
  reason: string | null;
}

interface Incident {
  id: string;
  incident_type: string;
  description: string | null;
  severity: number;
  date: string;
  created_at: string;
}

const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleDateString('es-CL') : '—');
const fmtTime = (t: string | null) =>
  t ? new Date(t).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : '—';

export default function PortalTrabajadorDetalle() {
  const { id } = useParams<{ id: string }>();
  const [worker, setWorker] = useState<Worker | null>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const [w, c, a, ab, inc] = await Promise.all([
        supabase
          .from('portal_workers')
          .select('id, first_name, last_name, rut_display, position, area, hire_date, active, photo_url, email, phone, sub_area, division')
          .eq('id', id)
          .maybeSingle(),
        supabase.from('portal_contracts').select('id, contract_type, start_date, end_date').eq('worker_id', id).order('start_date', { ascending: false }),
        supabase.from('portal_attendance').select('id, date, check_in, check_out, worked_hours, late_minutes').eq('worker_id', id).order('date', { ascending: false }).limit(30),
        supabase.from('portal_absences').select('id, absence_type, start_date, end_date, business_days, reason').eq('worker_id', id).order('start_date', { ascending: false }).limit(20),
        supabase.from('portal_incidents').select('id, incident_type, description, severity, date, created_at').eq('worker_id', id).order('created_at', { ascending: false }).limit(20),
      ]);
      if (cancelled) return;
      setWorker((w.data as Worker) ?? null);
      setContracts((c.data ?? []) as Contract[]);
      setAttendance((a.data ?? []) as Attendance[]);
      setAbsences((ab.data ?? []) as Absence[]);
      setIncidents((inc.data ?? []) as Incident[]);
      setLoading(false);
    };
    load();
    return () => { cancelled = true; };
  }, [id]);

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
  const activeContract = contracts[0];

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <Link to="/portal/trabajadores" className="inline-flex items-center gap-2 text-sm text-[#1F4E78] hover:underline">
        <ArrowLeft className="w-4 h-4" /> Volver a trabajadores
      </Link>

      {/* Header */}
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 mt-4 text-sm">
              <InfoRow icon={<BadgeCheck className="w-4 h-4" />} label="RUT" value={worker.rut_display ?? '—'} mono />
              <InfoRow icon={<Calendar className="w-4 h-4" />} label="Ingreso" value={fmtDate(worker.hire_date)} />
              <InfoRow icon={<Mail className="w-4 h-4" />} label="Correo" value={worker.email ?? '—'} />
              <InfoRow icon={<Phone className="w-4 h-4" />} label="Teléfono" value={worker.phone ?? '—'} />
              <InfoRow icon={<MapPin className="w-4 h-4" />} label="División" value={worker.division ?? worker.sub_area ?? '—'} />
              <InfoRow icon={<Building2 className="w-4 h-4" />} label="Contrato" value={activeContract?.contract_type ?? '—'} />
            </div>
          </div>
        </div>
      </header>

      <Tabs defaultValue="resumen">
        <TabsList>
          <TabsTrigger value="resumen">Resumen</TabsTrigger>
          <TabsTrigger value="asistencia">Asistencia</TabsTrigger>
          <TabsTrigger value="ausencias">Ausencias</TabsTrigger>
          <TabsTrigger value="contratos">Contratos</TabsTrigger>
          <TabsTrigger value="incidencias">Incidencias</TabsTrigger>
        </TabsList>

        <TabsContent value="resumen" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <KpiCard label="Días registrados (30d)" value={attendance.length.toString()} />
            <KpiCard label="Ausencias activas" value={absences.filter(a => new Date(a.end_date) >= new Date()).length.toString()} />
            <KpiCard label="Incidencias (recientes)" value={incidents.length.toString()} />
          </div>
        </TabsContent>

        <TabsContent value="asistencia" className="mt-4">
          <Card>
            <SimpleTable
              headers={['Fecha', 'Entrada', 'Salida', 'Horas', 'Atraso (min)']}
              rows={attendance.map(a => [fmtDate(a.date), fmtTime(a.check_in), fmtTime(a.check_out), a.worked_hours?.toFixed(2) ?? '—', a.late_minutes?.toString() ?? '0'])}
              empty="Sin registros de asistencia."
            />
          </Card>
        </TabsContent>

        <TabsContent value="ausencias" className="mt-4">
          <Card>
            <SimpleTable
              headers={['Tipo', 'Desde', 'Hasta', 'Días hábiles', 'Motivo']}
              rows={absences.map(a => [a.absence_type, fmtDate(a.start_date), fmtDate(a.end_date), a.business_days?.toString() ?? '—', a.reason ?? '—'])}
              empty="Sin ausencias registradas."
            />
          </Card>
        </TabsContent>

        <TabsContent value="contratos" className="mt-4">
          <Card>
            <SimpleTable
              headers={['Tipo', 'Inicio', 'Término']}
              rows={contracts.map(c => [c.contract_type ?? '—', fmtDate(c.start_date), fmtDate(c.end_date)])}
              empty="Sin contratos registrados."
            />
          </Card>
        </TabsContent>

        <TabsContent value="incidencias" className="mt-4">
          <Card>
            <SimpleTable
              headers={['Título', 'Severidad', 'Estado', 'Creada']}
              rows={incidents.map(i => [i.title, i.severity, i.status, fmtDate(i.created_at)])}
              empty="Sin incidencias."
            />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InfoRow({ icon, label, value, mono }: { icon: React.ReactNode; label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-muted-foreground">{label}:</span>
      <span className={mono ? 'font-mono text-xs' : ''}>{value}</span>
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold mt-1 text-[#1F4E78]">{value}</p>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="bg-card border border-border rounded-xl overflow-hidden">{children}</div>;
}

function SimpleTable({ headers, rows, empty }: { headers: string[]; rows: (string | number)[][]; empty: string }) {
  if (rows.length === 0) {
    return <p className="p-8 text-center text-sm text-muted-foreground">{empty}</p>;
  }
  return (
    <table className="w-full text-sm">
      <thead className="bg-muted/50">
        <tr className="text-left text-xs text-muted-foreground">
          {headers.map(h => <th key={h} className="p-3 font-medium">{h}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="border-t border-border">
            {r.map((c, j) => <td key={j} className="p-3">{c}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
