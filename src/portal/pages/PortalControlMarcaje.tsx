import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, AlertTriangle, UserX } from 'lucide-react';
import PortalPageHeader from '../components/PortalPageHeader';
import WorkerNameLink from '../components/WorkerNameLink';

type Estado = 'marca_ok' | 'registrado_sin_marcar' | 'no_en_geovictoria';

interface Row {
  worker_id: string;
  nombre: string;
  rut: string;
  cargo: string;
  sucursal_codigo: string | null;
  sucursal_nombre: string | null;
  hire_date: string | null;
  dias_desde_ingreso: number | null;
  filas_geovictoria: number;
  ultimo_checkin: string | null;
  dias_sin_marcar: number | null;
  estado: Estado;
  estado_label: string;
}

const fmtDate = (d: string | null) => {
  if (!d) return '—';
  const dt = new Date(d + (d.length === 10 ? 'T00:00:00' : ''));
  return `${String(dt.getDate()).padStart(2, '0')}-${String(dt.getMonth() + 1).padStart(2, '0')}-${dt.getFullYear()}`;
};

const ESTADO_ORDER: Record<Estado, number> = {
  no_en_geovictoria: 0,
  registrado_sin_marcar: 1,
  marca_ok: 2,
};

const estadoBadge = (e: Estado, label: string) => {
  const map: Record<Estado, { bg: string; text: string; border: string }> = {
    marca_ok: { bg: '#1D9E7515', text: '#0f7a55', border: '#1D9E7540' },
    registrado_sin_marcar: { bg: '#F9731615', text: '#c2410c', border: '#F9731640' },
    no_en_geovictoria: { bg: '#dc262615', text: '#b91c1c', border: '#dc262640' },
  };
  const c = map[e];
  return (
    <span className="px-2.5 py-1 rounded-full text-[11px] font-bold border whitespace-nowrap"
      style={{ background: c.bg, color: c.text, borderColor: c.border }}>
      {label}
    </span>
  );
};

export default function PortalControlMarcaje() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [estadoFilter, setEstadoFilter] = useState<'' | Estado>('');
  const [sucursalFilter, setSucursalFilter] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_marcaje_control');
      if (cancelled) return;
      if (error) console.error('get_marcaje_control', error);
      setRows(((data ?? []) as Row[]));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const counts = useMemo(() => ({
    ok: rows.filter(r => r.estado === 'marca_ok').length,
    sin: rows.filter(r => r.estado === 'registrado_sin_marcar').length,
    no: rows.filter(r => r.estado === 'no_en_geovictoria').length,
  }), [rows]);

  const sucursales = useMemo(
    () => Array.from(new Set(rows.map(r => r.sucursal_nombre).filter(Boolean))) as string[],
    [rows]
  );

  const tabla = useMemo(() => {
    let list = rows.slice();
    if (estadoFilter) list = list.filter(r => r.estado === estadoFilter);
    if (sucursalFilter) list = list.filter(r => r.sucursal_nombre === sucursalFilter);
    list.sort((a, b) => {
      const eo = ESTADO_ORDER[a.estado] - ESTADO_ORDER[b.estado];
      if (eo !== 0) return eo;
      return a.nombre.localeCompare(b.nombre);
    });
    return list;
  }, [rows, estadoFilter, sucursalFilter]);

  return (
    <div className="space-y-6">
      <PortalPageHeader
        eyebrow="Control"
        title="Control de marcaje"
        subtitle="Cruce contratos BUK vs marcaje Geovictoria"
      />

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          icon={<CheckCircle2 className="w-5 h-5" />}
          label="Marca OK"
          value={loading ? null : counts.ok}
          color="#1D9E75"
        />
        <KpiCard
          icon={<AlertTriangle className="w-5 h-5" />}
          label="Registrado sin marcar"
          value={loading ? null : counts.sin}
          color="#F97316"
        />
        <KpiCard
          icon={<UserX className="w-5 h-5" />}
          label="No está en Geovictoria"
          value={loading ? null : counts.no}
          color="#dc2626"
        />
      </div>

      {/* Tabla */}
      <div className="p-card overflow-hidden rounded-xl border border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-5 pb-3">
          <h3 className="text-sm font-bold tracking-tight" style={{ color: '#1B3A5C' }}>
            Detalle ({tabla.length})
          </h3>
          <div className="flex gap-2 flex-wrap">
            <select
              className="p-select"
              style={{ width: 200 }}
              value={estadoFilter}
              onChange={e => setEstadoFilter(e.target.value as any)}
            >
              <option value="">Todos los estados</option>
              <option value="marca_ok">Marca OK</option>
              <option value="registrado_sin_marcar">Registrado sin marcar</option>
              <option value="no_en_geovictoria">No está en Geovictoria</option>
            </select>
            <select
              className="p-select"
              style={{ width: 200 }}
              value={sucursalFilter}
              onChange={e => setSucursalFilter(e.target.value)}
            >
              <option value="">Todas las sucursales</option>
              {sucursales.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="p-5 pt-0 space-y-2">
            {[0,1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
          </div>
        ) : tabla.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-semibold" style={{ color: '#1B3A5C' }}>Sin trabajadores para mostrar</p>
            <p className="text-xs mt-1 text-muted-foreground">Prueba ajustando los filtros.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-muted-foreground border-b border-slate-200">
                  <th className="px-5 py-3 text-left font-semibold">Trabajador</th>
                  <th className="px-5 py-3 text-left font-semibold hidden md:table-cell">RUT</th>
                  <th className="px-5 py-3 text-left font-semibold hidden lg:table-cell">Cargo</th>
                  <th className="px-5 py-3 text-left font-semibold hidden sm:table-cell">Ingreso</th>
                  <th className="px-5 py-3 text-right font-semibold hidden md:table-cell">Días ingreso</th>
                  <th className="px-5 py-3 text-left font-semibold hidden sm:table-cell">Última marca</th>
                  <th className="px-5 py-3 text-left font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody>
                {tabla.map(r => (
                  <tr key={r.worker_id} className="border-t border-slate-100 hover:bg-slate-50/60">
                    <td className="px-5 py-3">
                      <WorkerNameLink workerId={r.worker_id} name={r.nombre} sucursal={r.sucursal_nombre} />
                    </td>
                    <td className="px-5 py-3 hidden md:table-cell tabular-nums text-slate-600">{r.rut}</td>
                    <td className="px-5 py-3 hidden lg:table-cell text-slate-600">{r.cargo}</td>
                    <td className="px-5 py-3 hidden sm:table-cell tabular-nums text-slate-600">{fmtDate(r.hire_date)}</td>
                    <td className="px-5 py-3 hidden md:table-cell text-right tabular-nums text-slate-600">{r.dias_desde_ingreso ?? '—'}</td>
                    <td className="px-5 py-3 hidden sm:table-cell tabular-nums text-slate-600">
                      {r.ultimo_checkin ? fmtDate(r.ultimo_checkin) : <span className="text-slate-400">Nunca</span>}
                    </td>
                    <td className="px-5 py-3">{estadoBadge(r.estado, r.estado_label)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function KpiCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number | null; color: string }) {
  return (
    <div className="p-card p-5 rounded-xl border border-slate-200">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
        <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}15`, color }}>
          {icon}
        </span>
      </div>
      <div className="mt-3 text-3xl font-bold tabular-nums tracking-tight" style={{ color }}>
        {value ?? <Skeleton className="h-8 w-16" />}
      </div>
    </div>
  );
}
