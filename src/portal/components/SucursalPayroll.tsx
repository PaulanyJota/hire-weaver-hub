import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePortalAuth } from '@/portal/hooks/usePortalAuth';
import { Skeleton } from '@/components/ui/skeleton';
import { formatRut } from '@/portal/lib/formatRut';
import { DollarSign } from 'lucide-react';
import WorkerNameLink from './WorkerNameLink';

interface PayrollRow {
  worker_id: string;
  nombre: string;
  rut: string;
  cargo: string;
  sueldo_liquido: number;
  comisiones: number;
  total: number;
}

const fmtCLP = (n: number) => '$' + Math.round(Number(n) || 0).toLocaleString('es-CL');

export const fmtPeriodSafe = (p: string) => {
  if (!p) return '';
  const ymd = p.slice(0, 10).split('-');
  if (ymd.length < 2) return p;
  const y = Number(ymd[0]);
  const m = Number(ymd[1]);
  if (!y || !m) return p;
  const d = new Date(Date.UTC(y, m - 1, 1));
  const s = d.toLocaleDateString('es-CL', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

export default function SucursalPayroll({ costCenter }: { costCenter: string }) {
  const { profile } = usePortalAuth();
  const companyId = profile?.portal_company_id ?? null;
  const [periods, setPeriods] = useState<string[]>([]);
  const [period, setPeriod] = useState<string | null>(null);
  const [rows, setRows] = useState<PayrollRow[]>([]);
  const [loadingP, setLoadingP] = useState(true);
  const [loadingR, setLoadingR] = useState(false);

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoadingP(true);
      const { data, error } = await supabase.rpc('get_branch_periods', {
        p_company_id: companyId as any, p_cost_center: costCenter,
      });
      if (cancel) return;
      if (error) console.error('[branch-periods]', error);
      const list = (data ?? []).map((r: any) => r.period as string);
      setPeriods(list);
      setPeriod(list[0] ?? null);
      setLoadingP(false);
    })();
    return () => { cancel = true; };
  }, [companyId, costCenter]);

  useEffect(() => {
    if (!period) { setRows([]); return; }
    let cancel = false;
    (async () => {
      setLoadingR(true);
      const { data, error } = await supabase.rpc('get_branch_payroll', {
        p_company_id: companyId as any, p_cost_center: costCenter, p_period: period,
      });
      if (cancel) return;
      if (error) console.error('[branch-payroll]', error);
      const sorted = ((data ?? []) as PayrollRow[])
        .slice()
        .sort((a, b) => (Number(b.total) || 0) - (Number(a.total) || 0));
      setRows(sorted);
      setLoadingR(false);
    })();
    return () => { cancel = true; };
  }, [companyId, costCenter, period]);

  const totals = useMemo(() => ({
    liquido: rows.reduce((s, r) => s + (Number(r.sueldo_liquido) || 0), 0),
    comisiones: rows.reduce((s, r) => s + (Number(r.comisiones) || 0), 0),
    total: rows.reduce((s, r) => s + (Number(r.total) || 0), 0),
  }), [rows]);

  if (loadingP) return <div className="p-card p-6"><Skeleton className="h-24 w-full" /></div>;

  if (periods.length === 0) {
    return (
      <div className="p-card p-10 text-center">
        <DollarSign className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">Sin remuneraciones registradas para esta sucursal.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div
        className="rounded-2xl p-5 text-white shadow-lg"
        style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #ec4899 100%)' }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-wider font-semibold opacity-80">Remuneraciones de la sucursal</p>
            <h3 className="text-xl font-bold mt-1">Trabajadores vigentes</h3>
          </div>
          <select
            value={period ?? ''}
            onChange={e => setPeriod(e.target.value)}
            className="bg-white/15 backdrop-blur border border-white/20 rounded-lg px-3 py-2 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-white/40"
          >
            {periods.map(p => (
              <option key={p} value={p} className="text-slate-900">{fmtPeriodSafe(p)}</option>
            ))}
          </select>
        </div>
      </div>

      <div
        className="rounded-2xl p-5 text-white shadow-lg"
        style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #ec4899 100%)' }}
      >
        <p className="text-[11px] uppercase tracking-wider font-semibold opacity-80">
          Totales {period && <>· {fmtPeriodSafe(period)}</>}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3">
          <div className="bg-white/15 backdrop-blur rounded-xl p-4 border border-white/20">
            <p className="text-xs opacity-90">Suma sueldo líquido</p>
            <p className="text-2xl font-bold mt-1 tabular-nums">
              {totals.liquido > 0 ? fmtCLP(totals.liquido) : '—'}
            </p>
          </div>
          <div className="bg-white/15 backdrop-blur rounded-xl p-4 border border-white/20">
            <p className="text-xs opacity-90">Suma comisiones</p>
            <p className="text-2xl font-bold mt-1 tabular-nums">{fmtCLP(totals.comisiones)}</p>
          </div>
          <div className="bg-white/15 backdrop-blur rounded-xl p-4 border border-white/20">
            <p className="text-xs opacity-90">Total general</p>
            <p className="text-2xl font-bold mt-1 tabular-nums">{fmtCLP(totals.total)}</p>
          </div>
        </div>
      </div>

      <div className="p-card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-bold tracking-tight" style={{ color: '#1B3A5C' }}>
            Detalle por trabajador {period && <span className="text-muted-foreground font-normal">· {fmtPeriodSafe(period)}</span>}
          </h3>
          <span className="text-xs text-muted-foreground tabular-nums">{rows.length} trabajadores</span>
        </div>
        <div className="overflow-x-auto">
          <table className="p-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>RUT</th>
                <th>Cargo</th>
                <th className="text-right">Sueldo líquido</th>
                <th className="text-right">Comisiones</th>
                <th className="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {loadingR ? (
                [1,2,3,4].map(i => <tr key={i}><td colSpan={6}><Skeleton className="h-8 w-full" /></td></tr>)
              ) : rows.length === 0 ? (
                <tr><td colSpan={6} className="p-10 text-center text-muted-foreground">Sin remuneraciones en este período.</td></tr>
              ) : rows.map(r => (
                <tr key={r.worker_id}>
                  <td><WorkerNameLink workerId={r.worker_id} name={r.nombre} /></td>
                  <td className="font-mono tabular-nums text-xs">{formatRut(r.rut)}</td>
                  <td className="text-sm">{r.cargo}</td>
                  <td className="text-right font-mono tabular-nums">
                    {Number(r.sueldo_liquido) > 0 ? fmtCLP(r.sueldo_liquido) : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="text-right font-mono tabular-nums">{fmtCLP(r.comisiones)}</td>
                  <td className="text-right font-mono tabular-nums font-bold" style={{ color: '#a855f7' }}>{fmtCLP(r.total)}</td>
                </tr>
              ))}
            </tbody>
            {rows.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-slate-300 bg-slate-50/60">
                  <td colSpan={3} className="font-bold text-sm" style={{ color: '#1B3A5C' }}>Totales</td>
                  <td className="text-right font-mono tabular-nums font-bold">{fmtCLP(totals.liquido)}</td>
                  <td className="text-right font-mono tabular-nums font-bold">{fmtCLP(totals.comisiones)}</td>
                  <td className="text-right font-mono tabular-nums font-bold" style={{ color: '#a855f7' }}>{fmtCLP(totals.total)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
