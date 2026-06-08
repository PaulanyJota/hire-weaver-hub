import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import PortalPageHeader from '../components/PortalPageHeader';
import { usePortalAuth } from '../hooks/usePortalAuth';
import { sucursalGeoIndexByName } from '../lib/sucursales';
import { ChevronDown, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import PortalSearchBar, { matchesSearch } from '../components/PortalSearchBar';

type Row = {
  cost_center: string | null;
  sucursal: string | null;
  worker_id: string;
  nombre: string;
  horas: number | null;
};

interface Grupo {
  cost_center: string;
  sucursal: string;
  total: number;
  workers: Row[];
}

export default function PortalHorasSemana() {
  const { profile, isNodoAdmin } = usePortalAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const companyId = isNodoAdmin ? null : (profile?.portal_company_id ?? null);
      const { data, error } = await supabase.rpc('get_week_hours', { p_company_id: companyId });
      if (cancelled) return;
      if (error) console.error('get_week_hours', error);
      setRows((data ?? []) as Row[]);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [profile, isNodoAdmin]);

  const groups: Grupo[] = useMemo(() => {
    const filteredRows = search.trim()
      ? rows.filter(r => matchesSearch([r.nombre, r.cost_center, r.sucursal], search))
      : rows;
    const map = new Map<string, Grupo>();
    filteredRows.forEach(r => {
      const key = r.cost_center ?? '__none__';
      const sucursal = r.sucursal ?? 'Sin sucursal';
      if (!map.has(key)) map.set(key, { cost_center: key, sucursal, total: 0, workers: [] });
      const g = map.get(key)!;
      g.workers.push(r);
      g.total += Number(r.horas ?? 0);
    });
    const list = Array.from(map.values());
    list.forEach(g => g.workers.sort((a, b) => Number(b.horas ?? 0) - Number(a.horas ?? 0)));
    return list.sort((a, b) => sucursalGeoIndexByName(a.sucursal) - sucursalGeoIndexByName(b.sucursal));
  }, [rows, search]);

  const totalGeneral = useMemo(
    () => groups.reduce((s, g) => s + g.total, 0),
    [groups]
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <PortalPageHeader
        eyebrow="Horas"
        title="Horas semana"
        subtitle={`${totalGeneral.toFixed(1)} h totales · ${groups.length} sucursales`}
      />

      <PortalSearchBar
        value={search}
        onChange={setSearch}
        placeholder="Buscar por nombre o sucursal…"
        total={rows.length}
        results={groups.reduce((s, g) => s + g.workers.length, 0)}
      />

      {loading ? (
        <div className="space-y-3">{[0,1,2].map(i => <Skeleton key={i} className="h-24 w-full" />)}</div>
      ) : groups.length === 0 ? (
        <div className="p-card p-12 text-center text-sm text-muted-foreground">
          Aún no hay horas registradas esta semana.
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map(g => {
            const isOpen = !!expanded[g.cost_center];
            return (
              <div key={g.cost_center} className="p-card overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpanded(c => ({ ...c, [g.cost_center]: !c[g.cost_center] }))}
                  className="w-full flex items-center justify-between gap-3 px-5 py-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: '#1B3A5C15', color: '#1B3A5C' }}>
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div className="text-left min-w-0">
                      <p className="font-bold text-[15px] truncate" style={{ color: '#1B3A5C' }}>{g.sucursal}</p>
                      <p className="text-[11px] text-muted-foreground">{g.workers.length} trabajadores</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold text-white tabular-nums"
                      style={{ background: '#1B3A5C' }}>
                      {g.total.toFixed(1)} h
                    </span>
                    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${!isOpen ? '-rotate-90' : ''}`} />
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-slate-200">
                    <ul className="divide-y divide-slate-100">
                      {g.workers.map(w => (
                        <li key={w.worker_id} className="flex items-center justify-between px-5 py-2.5">
                          <Link to={`/portal/trabajadores/${w.worker_id}`} className="text-sm hover:text-[#1D9E75] transition-colors" style={{ color: '#1B3A5C' }}>{w.nombre}</Link>
                          <span className="text-sm font-mono tabular-nums text-slate-700">{Number(w.horas ?? 0).toFixed(1)} h</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
