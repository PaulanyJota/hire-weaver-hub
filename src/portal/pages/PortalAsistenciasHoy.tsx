import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import PortalPageHeader from '../components/PortalPageHeader';
import { usePortalAuth } from '../hooks/usePortalAuth';
import { sucursalGeoIndexByName } from '../lib/sucursales';
import WorkerNameLink from '../components/WorkerNameLink';

type Row = {
  worker_id: string;
  nombre: string;
  cost_center: string | null;
  sucursal: string | null;
  check_in: string | null;
  check_out: string | null;
  worked_hours: number | null;
};

export default function PortalAsistenciasHoy() {
  const { profile, isNodoAdmin } = usePortalAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const companyId = isNodoAdmin ? null : (profile?.portal_company_id ?? null);
      const { data, error } = await supabase.rpc('get_attendance_today', { p_company_id: companyId });
      if (cancelled) return;
      if (error) console.error('get_attendance_today', error);
      setRows((data ?? []) as Row[]);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [profile, isNodoAdmin]);

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const ga = sucursalGeoIndexByName(a.sucursal);
      const gb = sucursalGeoIndexByName(b.sucursal);
      if (ga !== gb) return ga - gb;
      return (a.check_in ?? '').localeCompare(b.check_in ?? '');
    });
  }, [rows]);

  const today = new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <PortalPageHeader
        eyebrow="Asistencia"
        title="Asistencias hoy"
        subtitle={`${today} · ${rows.length} marcas registradas`}
      />

      <div className="p-card overflow-hidden">
        {loading ? (
          <div className="p-5 space-y-2">
            {[0,1,2,3,4].map(i => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
          </div>
        ) : sorted.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            Aún no hay marcaciones para hoy.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-muted-foreground border-b border-slate-200">
                  <th className="px-5 py-3 text-left font-semibold">Trabajador</th>
                  <th className="px-5 py-3 text-left font-semibold">Sucursal</th>
                  <th className="px-5 py-3 text-left font-semibold tabular-nums">Entrada</th>
                  <th className="px-5 py-3 text-left font-semibold tabular-nums">Salida</th>
                  <th className="px-5 py-3 text-right font-semibold tabular-nums">Horas</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(r => (
                  <tr key={r.worker_id} className="border-t border-slate-100 hover:bg-slate-50/60">
                    <td className="px-5 py-3"><WorkerNameLink workerId={r.worker_id} name={r.nombre} /></td>
                    <td className="px-5 py-3 text-muted-foreground">{r.sucursal ?? '—'}</td>
                    <td className="px-5 py-3 font-mono tabular-nums">{r.check_in ?? '—'}</td>
                    <td className="px-5 py-3 font-mono tabular-nums">{r.check_out ?? '—'}</td>
                    <td className="px-5 py-3 text-right font-mono tabular-nums">{r.worked_hours != null ? Number(r.worked_hours).toFixed(1) : '—'}</td>
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
