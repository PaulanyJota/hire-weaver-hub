import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { PortalAvatar } from '../components/Avatar';
import PortalPageHeader from '../components/PortalPageHeader';
import { formatRut } from '../lib/formatRut';
import { sucursalName } from '../lib/sucursales';
import WorkerNameLink from '../components/WorkerNameLink';
import { Search, ArrowRight, ChevronDown, MapPin } from 'lucide-react';

interface Worker {
  id: string;
  first_name: string;
  last_name: string;
  rut: string | null;
  rut_display: string | null;
  position: string | null;
  area: string | null;
  cost_center: string | null;
  hire_date: string | null;
  active: boolean;
  photo_url: string | null;
}

export default function PortalTrabajadores() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [estadoFilter, setEstadoFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('portal_workers')
        .select('id, first_name, last_name, rut, rut_display, position, area, cost_center, hire_date, active, photo_url')
        .order('first_name');
      if (!cancelled) {
        setWorkers((data ?? []) as Worker[]);
        setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return workers.filter(w => {
      if (estadoFilter === 'active' && !w.active) return false;
      if (estadoFilter === 'inactive' && w.active) return false;
      if (q && !`${w.first_name} ${w.last_name} ${w.position ?? ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [workers, search, estadoFilter]);

  const groups = useMemo(() => {
    const map = new Map<string, Worker[]>();
    filtered.forEach(w => {
      const key = w.cost_center ?? '__none__';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(w);
    });
    return Array.from(map.entries())
      .map(([cc, list]) => ({
        cost_center: cc,
        nombre: cc === '__none__' ? 'Sin sucursal' : sucursalName(cc),
        workers: list,
        activos: list.filter(w => w.active).length,
      }))
      .sort((a, b) => b.activos - a.activos);
  }, [filtered]);

  const activeCount = workers.filter(w => w.active).length;
  const sucursalesCount = new Set(workers.map(w => w.cost_center).filter(Boolean)).size;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <PortalPageHeader
        eyebrow="Equipo"
        title="Trabajadores"
        subtitle={`${filtered.length} de ${workers.length} · ${activeCount} activos · ${sucursalesCount} sucursales`}
      />

      <div className="p-card p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre o cargo..."
            className="p-input pl-9"
          />
        </div>
        <select value={estadoFilter} onChange={e => setEstadoFilter(e.target.value as any)} className="p-select w-auto min-w-[160px]">
          <option value="all">Todos los estados</option>
          <option value="active">Activos</option>
          <option value="inactive">Inactivos</option>
        </select>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-32 w-full" />)}</div>
      ) : groups.length === 0 ? (
        <div className="p-card p-12 text-center text-muted-foreground">Sin resultados.</div>
      ) : (
        <div className="space-y-4">
          {groups.map(g => {
            const isCollapsed = collapsed[g.cost_center];
            return (
              <div key={g.cost_center} className="p-card overflow-hidden">
                <button
                  type="button"
                  onClick={() => setCollapsed(c => ({ ...c, [g.cost_center]: !c[g.cost_center] }))}
                  className="w-full flex items-center justify-between gap-3 px-5 py-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: '#1B3A5C15', color: '#1B3A5C' }}>
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div className="text-left min-w-0">
                      <p className="font-bold text-[15px] truncate" style={{ color: '#1B3A5C' }}>{g.nombre}</p>
                      <p className="text-[11px] text-muted-foreground">{g.workers.length} trabajadores</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold text-white tabular-nums"
                      style={{ background: '#F97316' }}>
                      {g.activos} activos
                    </span>
                    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
                  </div>
                </button>

                {!isCollapsed && (
                  <div className="border-t border-slate-200">
                    <table className="p-table">
                      <thead>
                        <tr>
                          <th>Trabajador</th>
                          <th>RUT</th>
                          <th>Cargo</th>
                          <th>Ingreso</th>
                          <th>Estado</th>
                          <th className="text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {g.workers.map(w => (
                          <tr key={w.id}>
                            <td>
                              <div className="flex items-center gap-3">
                                <PortalAvatar name={`${w.first_name} ${w.last_name}`} photoUrl={w.photo_url} size={34} />
                                <div className="min-w-0">
                                  <WorkerNameLink workerId={w.id} name={`${w.first_name} ${w.last_name}`} sucursal={w.cost_center} />
                                  <p className="text-[11px] text-muted-foreground truncate">{w.position ?? '—'}</p>
                                </div>
                              </div>
                            </td>
                            <td className="font-mono tabular-nums text-xs">{formatRut(w.rut ?? w.rut_display)}</td>
                            <td className="text-sm">{w.position ?? '—'}</td>
                            <td className="text-xs text-muted-foreground">{w.hire_date ? new Date(w.hire_date).toLocaleDateString('es-CL') : '—'}</td>
                            <td>
                              <span className={`p-pill ${w.active ? 'p-pill-success' : 'p-pill-muted'}`}>
                                {w.active ? 'Activo' : 'Inactivo'}
                              </span>
                            </td>
                            <td className="text-right">
                              <Link
                                to={`/portal/trabajadores/${w.id}`}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-slate-100 transition-colors"
                                style={{ color: '#1B3A5C' }}
                              >
                                Ver detalle <ArrowRight className="w-3.5 h-3.5" />
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
