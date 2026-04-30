import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { PortalAvatar } from '../components/Avatar';
import { Search } from 'lucide-react';

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
}

const PAGE = 25;

export default function PortalTrabajadores() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [areaFilter, setAreaFilter] = useState('');
  const [estadoFilter, setEstadoFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [page, setPage] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('portal_workers')
        .select('id, first_name, last_name, rut_display, position, area, hire_date, active, photo_url')
        .order('first_name');
      if (!cancelled) {
        setWorkers((data ?? []) as Worker[]);
        setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const areas = useMemo(() => Array.from(new Set(workers.map(w => w.area).filter(Boolean))) as string[], [workers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return workers.filter(w => {
      if (estadoFilter === 'active' && !w.active) return false;
      if (estadoFilter === 'inactive' && w.active) return false;
      if (areaFilter && w.area !== areaFilter) return false;
      if (q && !`${w.first_name} ${w.last_name} ${w.position ?? ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [workers, search, areaFilter, estadoFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE));
  const visible = filtered.slice(page * PAGE, (page + 1) * PAGE);

  useEffect(() => { setPage(0); }, [search, areaFilter, estadoFilter]);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Trabajadores</h1>
        <p className="text-sm text-muted-foreground mt-1">{filtered.length} resultados</p>
      </header>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre o cargo..."
            className="w-full pl-9 pr-3 py-2 bg-card border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#1F4E78]/20"
          />
        </div>
        <select value={areaFilter} onChange={e => setAreaFilter(e.target.value)} className="px-3 py-2 bg-card border border-border rounded-lg text-sm">
          <option value="">Todas las áreas</option>
          {areas.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={estadoFilter} onChange={e => setEstadoFilter(e.target.value as any)} className="px-3 py-2 bg-card border border-border rounded-lg text-sm">
          <option value="all">Todos los estados</option>
          <option value="active">Activos</option>
          <option value="inactive">Inactivos</option>
        </select>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr className="text-left text-xs text-muted-foreground">
              <th className="p-3 font-medium">Trabajador</th>
              <th className="p-3 font-medium">RUT</th>
              <th className="p-3 font-medium">Cargo</th>
              <th className="p-3 font-medium">Área</th>
              <th className="p-3 font-medium">Ingreso</th>
              <th className="p-3 font-medium">Estado</th>
              <th className="p-3 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [1,2,3,4].map(i => (
                <tr key={i} className="border-t border-border">
                  <td colSpan={7} className="p-3"><Skeleton className="h-8 w-full" /></td>
                </tr>
              ))
            ) : visible.length === 0 ? (
              <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Sin resultados.</td></tr>
            ) : visible.map(w => (
              <tr key={w.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    <PortalAvatar name={`${w.first_name} ${w.last_name}`} photoUrl={w.photo_url} />
                    <span className="font-medium">{w.first_name} {w.last_name}</span>
                  </div>
                </td>
                <td className="p-3 font-mono text-xs">{w.rut_display ?? '—'}</td>
                <td className="p-3">{w.position ?? '—'}</td>
                <td className="p-3">{w.area ?? '—'}</td>
                <td className="p-3 text-xs">{w.hire_date ? new Date(w.hire_date).toLocaleDateString('es-CL') : '—'}</td>
                <td className="p-3">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${w.active ? 'bg-emerald-100 text-emerald-700' : 'bg-muted text-muted-foreground'}`}>
                    {w.active ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="p-3 text-right">
                  <Link to={`/portal/trabajadores/${w.id}`} className="text-xs text-[#1F4E78] hover:underline font-medium">Ver detalle</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pageCount > 1 && (
        <div className="flex justify-between items-center text-xs">
          <span className="text-muted-foreground">Página {page + 1} de {pageCount}</span>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="px-3 py-1.5 border border-border rounded-lg disabled:opacity-50">Anterior</button>
            <button onClick={() => setPage(p => Math.min(pageCount - 1, p + 1))} disabled={page >= pageCount - 1} className="px-3 py-1.5 border border-border rounded-lg disabled:opacity-50">Siguiente</button>
          </div>
        </div>
      )}
    </div>
  );
}
