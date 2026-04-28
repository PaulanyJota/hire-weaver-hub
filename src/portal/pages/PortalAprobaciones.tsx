import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { usePortalAuth } from '../hooks/usePortalAuth';

interface Approval {
  id: string;
  request_type: string;
  start_date: string;
  end_date: string;
  reason: string | null;
  submitted_at: string;
  worker: { first_name: string; last_name: string } | null;
}

export default function PortalAprobaciones() {
  const { profile } = usePortalAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [decisionNotes, setDecisionNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('portal_approval_requests')
      .select('id, request_type, start_date, end_date, reason, submitted_at, worker:portal_workers(first_name,last_name)')
      .eq('status', 'pendiente')
      .order('submitted_at', { ascending: false });
    setItems((data ?? []) as any);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const decide = async (id: string, status: 'aprobada' | 'rechazada') => {
    setBusy(id);
    try {
      const { error } = await supabase
        .from('portal_approval_requests')
        .update({
          status,
          decision_notes: decisionNotes[id] ?? null,
          decided_by: profile?.id,
          decided_at: new Date().toISOString(),
          notified_to_nodo: false,
        })
        .eq('id', id);
      if (error) throw error;
      toast({ title: status === 'aprobada' ? 'Solicitud aprobada' : 'Solicitud rechazada' });
      await load();
    } catch (err) {
      console.error('[portal-aprobaciones]', err);
      toast({ title: 'No pudimos guardar la decisión', description: 'Intenta nuevamente en unos segundos.', variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Aprobaciones pendientes</h1>
        <p className="text-sm text-muted-foreground mt-1">{items.length} solicitudes por revisar</p>
      </header>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-32 w-full" />)}</div>
      ) : items.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground">
          No hay solicitudes pendientes.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(a => (
            <div key={a.id} className="bg-card border border-border rounded-xl p-5">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                <div>
                  <p className="font-semibold">{a.worker?.first_name} {a.worker?.last_name}</p>
                  <p className="text-xs text-muted-foreground capitalize mt-0.5">{a.request_type.replace('_', ' ')}</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(a.start_date).toLocaleDateString('es-CL')} → {new Date(a.end_date).toLocaleDateString('es-CL')}
                </p>
              </div>
              {a.reason && <p className="text-sm text-muted-foreground mb-3">{a.reason}</p>}
              <textarea
                value={decisionNotes[a.id] ?? ''}
                onChange={e => setDecisionNotes(p => ({ ...p, [a.id]: e.target.value }))}
                placeholder="Notas de la decisión (opcional)"
                rows={2}
                className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#1F4E78]/20 mb-3"
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => decide(a.id, 'rechazada')} disabled={busy === a.id}
                  className="px-4 py-2 text-sm font-medium border border-border rounded-lg hover:bg-muted disabled:opacity-50"
                >Rechazar</button>
                <button
                  onClick={() => decide(a.id, 'aprobada')} disabled={busy === a.id}
                  className="px-4 py-2 text-sm font-medium text-white bg-[#1F4E78] rounded-lg hover:opacity-90 disabled:opacity-50"
                >Aprobar</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
