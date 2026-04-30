import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { usePortalAuth } from '../hooks/usePortalAuth';
import { Plus, X, AlertTriangle } from 'lucide-react';

interface Incident {
  id: string;
  incident_type: string;
  date: string;
  description: string | null;
  severity: number | null;
  worker: { first_name: string; last_name: string } | null;
}

interface WorkerOpt { id: string; first_name: string; last_name: string; }

const TYPES = ['atraso','inasistencia','falta_grave','accidente','observacion','felicitacion','otro'];

export default function PortalIncidencias() {
  const { profile } = usePortalAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<Incident[]>([]);
  const [workers, setWorkers] = useState<WorkerOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ worker_id: '', incident_type: 'observacion', date: new Date().toISOString().slice(0,10), description: '', severity: 2 });

  const load = async () => {
    setLoading(true);
    const [{ data: inc }, { data: ws }] = await Promise.all([
      supabase.from('portal_incidents')
        .select('id, incident_type, date, description, severity, worker:portal_workers(first_name,last_name)')
        .order('date', { ascending: false }),
      supabase.from('portal_workers').select('id, first_name, last_name').eq('active', true).order('first_name'),
    ]);
    setItems((inc ?? []) as any);
    setWorkers((ws ?? []) as any);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.worker_id) { toast({ title: 'Selecciona un trabajador', variant: 'destructive' }); return; }
    setBusy(true);
    try {
      const { error } = await supabase.from('portal_incidents').insert({
        worker_id: form.worker_id,
        reported_by: profile?.id,
        incident_type: form.incident_type as any,
        date: form.date,
        description: form.description || null,
        severity: form.severity,
        notified_to_nodo: false,
      });
      if (error) throw error;
      toast({ title: 'Incidencia registrada' });
      setOpen(false);
      setForm({ worker_id: '', incident_type: 'observacion', date: new Date().toISOString().slice(0,10), description: '', severity: 2 });
      await load();
    } catch (err) {
      console.error('[portal-incidencias]', err);
      toast({ title: 'No pudimos guardar la incidencia', description: 'Intenta nuevamente.', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const sevPill = (s: number | null) => {
    const v = s ?? 1;
    if (v >= 4) return 'p-pill-danger';
    if (v >= 3) return 'p-pill-warning';
    return 'p-pill-muted';
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <header className="p-fade-up flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="p-section-title">Registro</p>
          <h1 className="text-3xl font-bold tracking-tight mt-1">Incidencias</h1>
          <p className="text-sm text-muted-foreground mt-1.5">{items.length} registros en total</p>
        </div>
        <button onClick={() => setOpen(true)} className="p-btn-primary inline-flex items-center gap-2 px-4 py-2.5 text-sm">
          <Plus className="w-4 h-4" /> Nueva incidencia
        </button>
      </header>

      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div>
      ) : items.length === 0 ? (
        <div className="p-card p-12 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-[hsl(25_95%_53%/0.10)] text-[hsl(25_90%_45%)] flex items-center justify-center mb-3">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <p className="font-semibold">Sin incidencias registradas</p>
          <p className="text-sm text-muted-foreground mt-1">Cuando registres una, aparecerá aquí.</p>
        </div>
      ) : (
        <div className="p-card overflow-hidden">
          <table className="p-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Trabajador</th>
                <th>Tipo</th>
                <th>Severidad</th>
                <th>Descripción</th>
              </tr>
            </thead>
            <tbody>
              {items.map(i => (
                <tr key={i.id}>
                  <td className="text-xs text-muted-foreground">{new Date(i.date).toLocaleDateString('es-CL')}</td>
                  <td className="font-semibold">{i.worker?.first_name} {i.worker?.last_name}</td>
                  <td className="capitalize text-sm">{i.incident_type.replace('_', ' ')}</td>
                  <td><span className={`p-pill ${sevPill(i.severity)}`}>{i.severity ?? '-'}/5</span></td>
                  <td className="text-muted-foreground max-w-md truncate">{i.description ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-150" onClick={() => setOpen(false)}>
          <form onSubmit={submit} onClick={e => e.stopPropagation()}
            className="bg-white border border-border rounded-2xl p-6 w-full max-w-lg space-y-4 shadow-2xl p-fade-up">
            <div className="flex items-center justify-between">
              <div>
                <p className="p-section-title">Reporte</p>
                <h2 className="text-xl font-bold tracking-tight">Nueva incidencia</h2>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center"><X className="w-5 h-5" /></button>
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground/80 block mb-1.5">Trabajador</label>
              <select required value={form.worker_id} onChange={e => setForm({ ...form, worker_id: e.target.value })} className="p-select">
                <option value="">Seleccionar...</option>
                {workers.map(w => <option key={w.id} value={w.id}>{w.first_name} {w.last_name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-foreground/80 block mb-1.5">Tipo</label>
                <select value={form.incident_type} onChange={e => setForm({ ...form, incident_type: e.target.value })} className="p-select capitalize">
                  {TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground/80 block mb-1.5">Fecha</label>
                <input required type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="p-input" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground/80 block mb-1.5">
                Severidad: <span className="text-[hsl(213_78%_29%)] font-bold">{form.severity}/5</span>
              </label>
              <input type="range" min={1} max={5} value={form.severity} onChange={e => setForm({ ...form, severity: Number(e.target.value) })} className="w-full accent-[hsl(213_78%_29%)]" />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground/80 block mb-1.5">Descripción</label>
              <textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="p-textarea" />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button type="button" onClick={() => setOpen(false)} className="p-btn-ghost px-4 py-2 text-sm">Cancelar</button>
              <button type="submit" disabled={busy} className="p-btn-primary px-4 py-2 text-sm">{busy ? 'Guardando...' : 'Registrar'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
