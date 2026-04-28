import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePortalAuth } from '../hooks/usePortalAuth';
import { Users, UserMinus, Clock, ClipboardCheck } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';

interface Metrics {
  active_workers: number;
  currently_absent: number;
  overtime_hours_this_month: number;
  pending_approvals: number;
}

interface IncidentRow {
  id: string;
  date: string;
  incident_type: string;
  description: string | null;
  severity: number | null;
  worker: { first_name: string; last_name: string } | null;
}

export default function PortalDashboard() {
  const { profile, company, isNodoAdmin } = usePortalAuth();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [chartData, setChartData] = useState<{ month: string; horas: number }[]>([]);
  const [incidents, setIncidents] = useState<IncidentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const { data: m } = await supabase.from('portal_dashboard_metrics').select('*');
        const agg = (m ?? []).reduce(
          (acc, r: any) => ({
            active_workers: acc.active_workers + Number(r.active_workers ?? 0),
            currently_absent: acc.currently_absent + Number(r.currently_absent ?? 0),
            overtime_hours_this_month: acc.overtime_hours_this_month + Number(r.overtime_hours_this_month ?? 0),
            pending_approvals: acc.pending_approvals + Number(r.pending_approvals ?? 0),
          }),
          { active_workers: 0, currently_absent: 0, overtime_hours_this_month: 0, pending_approvals: 0 }
        );
        if (cancelled) return;
        setMetrics(agg);

        // Overtime últimos 6 meses
        const since = new Date();
        since.setMonth(since.getMonth() - 5);
        since.setDate(1);
        const { data: ot } = await supabase
          .from('portal_overtime')
          .select('date, hours')
          .gte('date', since.toISOString().slice(0, 10));

        const buckets = new Map<string, number>();
        for (let i = 5; i >= 0; i--) {
          const d = new Date();
          d.setMonth(d.getMonth() - i);
          const k = d.toLocaleDateString('es-CL', { month: 'short' });
          buckets.set(k, 0);
        }
        (ot ?? []).forEach((r: any) => {
          const d = new Date(r.date);
          const k = d.toLocaleDateString('es-CL', { month: 'short' });
          if (buckets.has(k)) buckets.set(k, (buckets.get(k) ?? 0) + Number(r.hours));
        });
        if (cancelled) return;
        setChartData(Array.from(buckets, ([month, horas]) => ({ month, horas })));

        const { data: inc } = await supabase
          .from('portal_incidents')
          .select('id, date, incident_type, description, severity, worker:portal_workers(first_name,last_name)')
          .order('date', { ascending: false })
          .limit(5);
        if (cancelled) return;
        setIncidents((inc ?? []) as any);
      } catch (err) {
        console.error('[portal-dashboard]', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const today = new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const firstName = profile?.full_name.split(' ')[0] ?? '';

  const cards = [
    { label: 'Trabajadores activos', value: metrics?.active_workers ?? 0, icon: Users },
    { label: 'Ausentes hoy', value: metrics?.currently_absent ?? 0, icon: UserMinus },
    { label: 'HE este mes', value: (metrics?.overtime_hours_this_month ?? 0).toFixed(1), icon: Clock },
    { label: 'Aprobaciones pendientes', value: metrics?.pending_approvals ?? 0, icon: ClipboardCheck },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Hola, {firstName} 👋</h1>
        <p className="text-sm text-muted-foreground capitalize mt-1">
          {today} {isNodoAdmin && '· Vista global Nodo'} {company && !isNodoAdmin && `· ${company.name}`}
        </p>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(c => (
          <div key={c.label} className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">{c.label}</p>
                {loading ? <Skeleton className="h-8 w-16 mt-2" /> : <p className="text-3xl font-bold mt-2">{c.value}</p>}
              </div>
              <div className="w-10 h-10 rounded-lg bg-[#1F4E78]/10 text-[#1F4E78] flex items-center justify-center">
                <c.icon className="w-5 h-5" />
              </div>
            </div>
          </div>
        ))}
      </section>

      <section className="bg-card border border-border rounded-xl p-5">
        <h2 className="text-sm font-semibold mb-4">Horas extra · últimos 6 meses</h2>
        {loading ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
              <Line type="monotone" dataKey="horas" stroke="#1F4E78" strokeWidth={2.5} dot={{ r: 4, fill: '#1F4E78' }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </section>

      <section className="bg-card border border-border rounded-xl p-5">
        <h2 className="text-sm font-semibold mb-4">Últimas incidencias</h2>
        {loading ? (
          <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : incidents.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Sin incidencias registradas.</p>
        ) : (
          <ul className="divide-y divide-border">
            {incidents.map(i => (
              <li key={i.id} className="py-3 flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-[#1F4E78] mt-2 shrink-0" />
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
      </section>
    </div>
  );
}
