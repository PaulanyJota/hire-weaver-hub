import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { PortalAvatar } from '../components/Avatar';
import { Search, ArrowRight, Users } from 'lucide-react';

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

  const activeCount = workers.filter(w => w.active).length;
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE));
  const visible = filtered.slice(page * PAGE, (page + 1) * PAGE);

  useEffect(() => { setPage(0); }, [search, areaFilter, estadoFilter]);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <header className="p-fade-up flex items-end justify-between flex-wrap gap-4">
        <div>
          <p className="p-section-title">Equipo</p>
          <h1 className="text-3xl font-bold tracking-tight mt-1">Trabajadores</h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            <span className="font-semibold text-foreground">{filtered.length}</span> de {workers.length} · {activeCount} activos
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-border shadow-sm">
          <Users className="w-4 h-4 text-[hsl(213_78%_29%)]" />
          <span className="text-xs font-semibold">{areas.length} áreas</span>
        </div>
      </header>

      <div className="p-card p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre o cargo..."
            className="p-input pl-9"
          />
        </div>
        <select value={areaFilter} onChange={e => setAreaFilter(e.target.value)} className="p-select w-auto min-w-[180px]">
          <option value="">Todas las áreas</option>
          {areas.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={estadoFilter} onChange={e => setEstadoFilter(e.target.value as any)} className="p-select w-auto min-w-[160px]">
          <option value="all">Todos los estados</option>
          <option value="active">Activos</option>
          <option value="inactive">Inactivos</option>
        </select>
      </div>

      <div className="p-card overflow-hidden">
        <table className="p-table">
          <thead>
            <tr>
              <th>Trabajador</th>
              <th>RUT</th>
              <th>Cargo</th>
              <th>Área</th>
              <th>Ingreso</th>
              <th>Estado</th>
              <th className="text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [1,2,3,4,5].map(i => (
                <tr key={i}>
                  <td colSpan={7}><Skeleton className="h-8 w-full" /></td>
                </tr>
              ))
            ) : visible.length === 0 ? (
              <tr><td colSpan={7} className="p-12 text-center text-muted-foreground">Sin resultados.</td></tr>
            ) : visible.map(w => (
              <tr key={w.id}>
                <td>
                  <div className="flex items-center gap-3">
                    <PortalAvatar name={`${w.first_name} ${w.last_name}`} photoUrl={w.photo_url} size={36} />
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{w.first_name} {w.last_name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{w.position ?? '—'}</p>
                    </div>
                  </div>
                </td>
                <td className="font-mono text-xs text-muted-foreground">{w.rut_display ?? '—'}</td>
                <td className="text-sm">{w.position ?? '—'}</td>
                <td className="text-sm">{w.area ?? '—'}</td>
                <td className="text-xs text-muted-foreground">{w.hire_date ? new Date(w.hire_date).toLocaleDateString('es-CL') : '—'}</td>
                <td>
                  <span className={`p-pill ${w.active ? 'p-pill-success' : 'p-pill-muted'}`}>
                    {w.active ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="text-right">
                  <Link
                    to={`/portal/trabajadores/${w.id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[hsl(213_78%_29%)] hover:bg-[hsl(213_78%_29%/0.08)] transition-colors"
                  >
                    Ver detalle <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pageCount > 1 && (
        <div className="flex justify-between items-center text-xs">
          <span className="text-muted-foreground">Página <strong className="text-foreground">{page + 1}</strong> de {pageCount}</span>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="p-btn-ghost px-3 py-1.5 text-xs disabled:opacity-50">Anterior</button>
            <button onClick={() => setPage(p => Math.min(pageCount - 1, p + 1))} disabled={page >= pageCount - 1} className="p-btn-ghost px-3 py-1.5 text-xs disabled:opacity-50">Siguiente</button>
          </div>
        </div>
      )}
    </div>
  );
}
