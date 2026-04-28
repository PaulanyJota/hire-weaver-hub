import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { usePortalAuth } from '../hooks/usePortalAuth';
import { Plus, X } from 'lucide-react';

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

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Incidencias</h1>
          <p className="text-sm text-muted-foreground mt-1">{items.length} registros</p>
        </div>
        <button onClick={() => setOpen(true)} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#1F4E78] rounded-lg hover:opacity-90">
          <Plus className="w-4 h-4" /> Nueva incidencia
        </button>
      </header>

      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : items.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground">
          Sin incidencias registradas.
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs text-muted-foreground">
              <tr className="text-left">
                <th className="p-3 font-medium">Fecha</th>
                <th className="p-3 font-medium">Trabajador</th>
                <th className="p-3 font-medium">Tipo</th>
                <th className="p-3 font-medium">Severidad</th>
                <th className="p-3 font-medium">Descripción</th>
              </tr>
            </thead>
            <tbody>
              {items.map(i => (
                <tr key={i.id} className="border-t border-border hover:bg-muted/30">
                  <td className="p-3 text-xs">{new Date(i.date).toLocaleDateString('es-CL')}</td>
                  <td className="p-3 font-medium">{i.worker?.first_name} {i.worker?.last_name}</td>
                  <td className="p-3 capitalize">{i.incident_type.replace('_', ' ')}</td>
                  <td className="p-3"><span className="inline-block px-2 py-0.5 rounded-full bg-[#1F4E78]/10 text-[#1F4E78] text-xs">{i.severity ?? '-'}/5</span></td>
                  <td className="p-3 text-muted-foreground max-w-md truncate">{i.description ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setOpen(false)}>
          <form onSubmit={submit} onClick={e => e.stopPropagation()} className="bg-card border border-border rounded-2xl p-6 w-full max-w-lg space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Nueva incidencia</h2>
              <button type="button" onClick={() => setOpen(false)}><X className="w-5 h-5" /></button>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Trabajador</label>
              <select required value={form.worker_id} onChange={e => setForm({ ...form, worker_id: e.target.value })} className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm">
                <option value="">Seleccionar...</option>
                {workers.map(w => <option key={w.id} value={w.id}>{w.first_name} {w.last_name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Tipo</label>
                <select value={form.incident_type} onChange={e => setForm({ ...form, incident_type: e.target.value })} className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm capitalize">
                  {TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Fecha</label>
                <input required type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Severidad: {form.severity}</label>
              <input type="range" min={1} max={5} value={form.severity} onChange={e => setForm({ ...form, severity: Number(e.target.value) })} className="w-full" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Descripción</label>
              <textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm" />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 text-sm border border-border rounded-lg">Cancelar</button>
              <button type="submit" disabled={busy} className="px-4 py-2 text-sm text-white bg-[#1F4E78] rounded-lg disabled:opacity-50">{busy ? 'Guardando...' : 'Registrar'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
