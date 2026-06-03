import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import PortalPageHeader from '../components/PortalPageHeader';
import { sucursalName } from '../lib/sucursales';
import { formatRut } from '../lib/formatRut';
import WorkerNameLink from '../components/WorkerNameLink';
import { ArrowLeft, Users, CheckCircle2, Sunrise, Sunset, DollarSign } from 'lucide-react';
import SucursalComisiones from '../components/SucursalComisiones';

interface Row {
  worker_id: string;
  nombre: string;
  cargo: string;
  rut: string;
  estado: string;
  ultima_marca: string | null;
  ultima_entrada: string;
  ultima_salida: string;
  turno_inicio: string;
  turno_fin: string;
  marcas_30d: number;
  pct_puntualidad: number | null;
  dias_sin_marca: number | null;
}

export default function PortalSucursalDetalle() {
  const { cost_center } = useParams<{ cost_center: string }>();
  const cc = decodeURIComponent(cost_center ?? '');
  const nombre = sucursalName(cc);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'trabajadores' | 'comisiones'>('trabajadores');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_branch_detail', { p_cost_center: cc });
      if (!cancelled) {
        if (error) console.error('[branch-detail]', error);
        setRows((data ?? []) as Row[]);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [cc]);

  const kpis = useMemo(() => {
    const total = rows.length;
    const hoy = rows.filter(r => r.ultima_marca && new Date(r.ultima_marca).toDateString() === new Date().toDateString()).length;
    const inicios = rows.map(r => r.turno_inicio).filter(t => t && t !== '—');
    const fines = rows.map(r => r.turno_fin).filter(t => t && t !== '—');
    const avg = (arr: string[]) => {
      if (!arr.length) return '—';
      const mins = arr.map(t => {
        const [h, m] = t.split(':').map(Number);
        return h * 60 + m;
      });
      const a = Math.round(mins.reduce((s, x) => s + x, 0) / mins.length);
      return `${String(Math.floor(a / 60)).padStart(2, '0')}:${String(a % 60).padStart(2, '0')}`;
    };
    return { total, hoy, inicio: avg(inicios), fin: avg(fines) };
  }, [rows]);

  const cards = [
    { label: 'Total trabajadores', value: kpis.total, icon: Users, color: '#1B3A5C' },
    { label: 'Asistencia hoy', value: kpis.hoy, icon: CheckCircle2, color: '#1D9E75' },
    { label: 'Turno promedio inicio', value: kpis.inicio, icon: Sunrise, color: '#F97316' },
    { label: 'Turno promedio fin', value: kpis.fin, icon: Sunset, color: '#3DA5E0' },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <Link to="/portal" className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-3.5 h-3.5" /> Volver al inicio
      </Link>

      <PortalPageHeader eyebrow="Sucursal" title={nombre} subtitle={`${cc} · ${kpis.total} trabajadores`} />

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(c => (
          <div key={c.label} className="p-card p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{c.label}</p>
                {loading ? <Skeleton className="h-9 w-20 mt-2" /> : (
                  <p className="text-3xl font-bold mt-2 tabular-nums" style={{ color: c.color }}>{c.value}</p>
                )}
              </div>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `${c.color}15`, color: c.color }}>
                <c.icon className="w-5 h-5" />
              </div>
            </div>
          </div>
        ))}
      </section>

      <div className="flex gap-2 border-b border-slate-200">
        {([
          { id: 'trabajadores', label: 'Trabajadores', icon: Users },
          { id: 'comisiones', label: 'Comisiones', icon: DollarSign },
        ] as const).map(t => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
                active
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'trabajadores' && (
        <div className="p-card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <h2 className="text-sm font-bold tracking-tight" style={{ color: '#1B3A5C' }}>Detalle de trabajadores</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="p-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>RUT</th>
                  <th>Cargo</th>
                  <th>Última entrada</th>
                  <th>Última salida</th>
                  <th>Turno</th>
                  <th>Score</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [1,2,3,4].map(i => <tr key={i}><td colSpan={7}><Skeleton className="h-8 w-full" /></td></tr>)
                ) : rows.length === 0 ? (
                  <tr><td colSpan={7} className="p-12 text-center text-muted-foreground">Sin trabajadores en esta sucursal.</td></tr>
                ) : rows.map(r => {
                  const score = r.pct_puntualidad;
                  const scoreColor = score == null ? '#94a3b8' : score >= 90 ? '#1D9E75' : score >= 50 ? '#F97316' : '#dc2626';
                  return (
                    <tr key={r.worker_id}>
                      <td>
                        <WorkerNameLink workerId={r.worker_id} name={r.nombre} sucursal={cc} />
                      </td>
                      <td className="font-mono tabular-nums text-xs">{formatRut(r.rut)}</td>
                      <td className="text-sm">{r.cargo}</td>
                      <td className="font-mono tabular-nums text-xs">{r.ultima_entrada}</td>
                      <td className="font-mono tabular-nums text-xs">{r.ultima_salida}</td>
                      <td className="font-mono tabular-nums text-xs">{r.turno_inicio}–{r.turno_fin}</td>
                      <td>
                        <span className="px-2 py-0.5 rounded-md text-xs font-bold tabular-nums"
                          style={{ background: `${scoreColor}15`, color: scoreColor }}>
                          {score == null ? '—' : `${score}%`}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'comisiones' && <SucursalComisiones costCenter={cc} />}
    </div>
  );
}
