import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, AlertTriangle, ChevronRight, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import PortalPageHeader from '../components/PortalPageHeader';
import WorkerNameLink from '../components/WorkerNameLink';
import { sucursalGeoIndexByName } from '../lib/sucursales';
import PortalSearchBar, { matchesSearch } from '../components/PortalSearchBar';

type Estado = 'marca_ok' | 'registrado_sin_marcar';

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

// Orden por estado: los que requieren atención primero
const ESTADO_ORDER: Record<Estado, number> = {
  registrado_sin_marcar: 0,
  marca_ok: 1,
};

const estadoBadge = (e: Estado, label: string) => {
  const map: Record<Estado, { bg: string; text: string; border: string }> = {
    marca_ok: { bg: '#1D9E7515', text: '#0f7a55', border: '#1D9E7540' },
    registrado_sin_marcar: { bg: '#F9731615', text: '#c2410c', border: '#F9731640' },
  };
  const c = map[e];
  return (
    <span className="px-2.5 py-1 rounded-full text-[11px] font-bold border whitespace-nowrap"
      style={{ background: c.bg, color: c.text, borderColor: c.border }}>
      {label}
    </span>
  );
};

type SortKey = 'hire_date' | 'ultimo_checkin' | 'estado';
type SortDir = 'asc' | 'desc';

export default function PortalControlMarcaje() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [estadoFilter, setEstadoFilter] = useState<'' | Estado>('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_marcaje_control');
      if (cancelled) return;
      if (error) console.error('get_marcaje_control', error);
      // Excluir estado 'no_en_geovictoria' de toda la vista
      const filtered = ((data ?? []) as any[]).filter(
        r => r.estado === 'marca_ok' || r.estado === 'registrado_sin_marcar'
      ) as Row[];
      setRows(filtered);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const counts = useMemo(() => ({
    ok: rows.filter(r => r.estado === 'marca_ok').length,
    sin: rows.filter(r => r.estado === 'registrado_sin_marcar').length,
  }), [rows]);

  // Agrupar por sucursal en orden norte-sur
  const filteredRows = useMemo(() => {
    let list = estadoFilter ? rows.filter(r => r.estado === estadoFilter) : rows;
    if (search.trim()) {
      list = list.filter(r => matchesSearch([
        r.nombre, r.rut, r.cargo, r.sucursal_codigo, r.sucursal_nombre, r.estado_label,
      ], search));
    }
    return list;
  }, [rows, estadoFilter, search]);

  // Agrupar por sucursal en orden norte-sur
  const grupos = useMemo(() => {
    const map = new Map<string, Row[]>();
    for (const r of filteredRows) {
      const key = r.sucursal_nombre ?? 'Sin sucursal';
      const arr = map.get(key) ?? [];
      arr.push(r);
      map.set(key, arr);
    }
    return Array.from(map.entries())
      .sort((a, b) => {
        const ga = sucursalGeoIndexByName(a[0]);
        const gb = sucursalGeoIndexByName(b[0]);
        if (ga !== gb) return ga - gb;
        return a[0].localeCompare(b[0]);
      })
      .map(([sucursal, items]) => ({
        sucursal,
        items,
        ok: items.filter(i => i.estado === 'marca_ok').length,
        sin: items.filter(i => i.estado === 'registrado_sin_marcar').length,
      }));
  }, [filteredRows]);

  const toggle = (s: string) => {
    setExpanded(prev => {
      const n = new Set(prev);
      if (n.has(s)) n.delete(s); else n.add(s);
      return n;
    });
  };

  return (
    <div className="space-y-6">
      <PortalPageHeader
        eyebrow="Control"
        title="Control de marcaje"
        subtitle="Cruce contratos BUK vs marcaje Geovictoria"
      />

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
      </div>

      <PortalSearchBar
        value={search}
        onChange={setSearch}
        placeholder="Buscar por nombre, RUT, cargo o sucursal…"
        total={rows.length}
        results={filteredRows.length}
      />

      {/* Tabla agrupada por sucursal */}
      <div className="p-card overflow-hidden rounded-xl border border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-5 pb-3">
          <h3 className="text-sm font-bold tracking-tight" style={{ color: '#1B3A5C' }}>
            Detalle por sucursal ({grupos.length})
          </h3>
          <div className="flex gap-2 flex-wrap">
            <select
              className="p-select"
              style={{ width: 220 }}
              value={estadoFilter}
              onChange={e => setEstadoFilter(e.target.value as any)}
            >
              <option value="">Todos los estados</option>
              <option value="marca_ok">Marca OK</option>
              <option value="registrado_sin_marcar">Registrado sin marcar</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="p-5 pt-0 space-y-2">
            {[0,1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
          </div>
        ) : grupos.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-semibold" style={{ color: '#1B3A5C' }}>Sin trabajadores para mostrar</p>
            <p className="text-xs mt-1 text-muted-foreground">Prueba ajustando los filtros.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {grupos.map(g => {
              const isOpen = expanded.has(g.sucursal);
              return (
                <div key={g.sucursal}>
                  <button
                    onClick={() => toggle(g.sucursal)}
                    className="w-full flex items-center gap-3 px-5 py-3 hover:bg-slate-50/60 text-left"
                  >
                    <ChevronRight
                      className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-90' : ''}`}
                    />
                    <span className="font-semibold text-sm flex-1" style={{ color: '#1B3A5C' }}>
                      {g.sucursal}
                    </span>
                    <span className="text-[11px] tabular-nums text-slate-500">
                      {g.items.length} trabajador{g.items.length === 1 ? '' : 'es'}
                    </span>
                    {g.sin > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold border whitespace-nowrap"
                        style={{ background: '#F9731615', color: '#c2410c', borderColor: '#F9731640' }}>
                        {g.sin} sin marcar
                      </span>
                    )}
                    {g.ok > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold border whitespace-nowrap"
                        style={{ background: '#1D9E7515', color: '#0f7a55', borderColor: '#1D9E7540' }}>
                        {g.ok} OK
                      </span>
                    )}
                  </button>
                  {isOpen && (
                    <div className="px-2 sm:px-5 pb-4">
                      <SortableWorkerTable items={g.items} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function SortableWorkerTable({ items }: { items: Row[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('ultimo_checkin');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const onHeader = (k: SortKey) => {
    if (k === sortKey) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(k);
      setSortDir('asc');
    }
  };

  const sorted = useMemo(() => {
    const sign = sortDir === 'asc' ? 1 : -1;
    const arr = [...items];
    arr.sort((a, b) => {
      if (sortKey === 'estado') {
        return (ESTADO_ORDER[a.estado] - ESTADO_ORDER[b.estado]) * sign;
      }
      const va = (a as any)[sortKey] as string | null;
      const vb = (b as any)[sortKey] as string | null;
      if (va == null && vb == null) return 0;
      if (va == null) return 1;   // nulls al final siempre
      if (vb == null) return -1;
      return va.localeCompare(vb) * sign;
    });
    return arr;
  }, [items, sortKey, sortDir]);

  const Icon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ArrowUpDown className="w-3 h-3 inline ml-1 text-slate-300" />;
    return sortDir === 'asc'
      ? <ArrowUp className="w-3 h-3 inline ml-1 text-slate-600" />
      : <ArrowDown className="w-3 h-3 inline ml-1 text-slate-600" />;
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[11px] uppercase tracking-wider text-muted-foreground border-b border-slate-200 bg-slate-50/60">
            <th className="px-4 py-2.5 text-left font-semibold">Trabajador</th>
            <th className="px-4 py-2.5 text-left font-semibold hidden md:table-cell">RUT</th>
            <th className="px-4 py-2.5 text-left font-semibold hidden lg:table-cell">Cargo</th>
            <th className="px-4 py-2.5 text-left font-semibold hidden sm:table-cell">
              <button onClick={() => onHeader('hire_date')} className="inline-flex items-center hover:text-slate-900">
                Ingreso <Icon k="hire_date" />
              </button>
            </th>
            <th className="px-4 py-2.5 text-left font-semibold hidden sm:table-cell">
              <button onClick={() => onHeader('ultimo_checkin')} className="inline-flex items-center hover:text-slate-900">
                Última marca <Icon k="ultimo_checkin" />
              </button>
            </th>
            <th className="px-4 py-2.5 text-left font-semibold">
              <button onClick={() => onHeader('estado')} className="inline-flex items-center hover:text-slate-900">
                Estado <Icon k="estado" />
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(r => (
            <tr key={r.worker_id} className="border-t border-slate-100 hover:bg-slate-50/60">
              <td className="px-4 py-2.5">
                <WorkerNameLink workerId={r.worker_id} name={r.nombre} sucursal={r.sucursal_nombre} />
              </td>
              <td className="px-4 py-2.5 hidden md:table-cell tabular-nums text-slate-600">{r.rut}</td>
              <td className="px-4 py-2.5 hidden lg:table-cell text-slate-600">{r.cargo}</td>
              <td className="px-4 py-2.5 hidden sm:table-cell tabular-nums text-slate-600">{fmtDate(r.hire_date)}</td>
              <td className="px-4 py-2.5 hidden sm:table-cell tabular-nums text-slate-600">
                {r.ultimo_checkin ? fmtDate(r.ultimo_checkin) : <span className="text-slate-400">Nunca</span>}
              </td>
              <td className="px-4 py-2.5">{estadoBadge(r.estado, r.estado_label)}</td>
            </tr>
          ))}
        </tbody>
      </table>
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
