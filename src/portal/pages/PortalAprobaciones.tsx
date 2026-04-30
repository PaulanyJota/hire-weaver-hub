import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { usePortalAuth } from '../hooks/usePortalAuth';
import { Check, X, ClipboardCheck, CalendarRange } from 'lucide-react';

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
      <header className="p-fade-up">
        <p className="p-section-title">Bandeja</p>
        <h1 className="text-3xl font-bold tracking-tight mt-1">Aprobaciones pendientes</h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          {items.length === 0
            ? 'Estás al día. No hay solicitudes por revisar.'
            : <>Tienes <span className="font-semibold text-foreground">{items.length}</span> {items.length === 1 ? 'solicitud' : 'solicitudes'} esperando tu decisión.</>}
        </p>
      </header>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)}</div>
      ) : items.length === 0 ? (
        <div className="p-card p-12 text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-[hsl(152_60%_38%/0.10)] text-[hsl(152_60%_28%)] flex items-center justify-center mb-3">
            <ClipboardCheck className="w-6 h-6" />
          </div>
          <p className="font-semibold">Todo en orden</p>
          <p className="text-sm text-muted-foreground mt-1">No hay solicitudes pendientes por ahora.</p>
        </div>
      ) : (
        <div className="space-y-3 p-stagger">
          {items.map(a => (
            <div key={a.id} className="p-card p-card-hover p-5">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[hsl(213_78%_29%/0.08)] text-[hsl(213_78%_29%)] flex items-center justify-center shrink-0">
                    <CalendarRange className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold">{a.worker?.first_name} {a.worker?.last_name}</p>
                    <p className="text-xs text-muted-foreground capitalize mt-0.5">{a.request_type.replace('_', ' ')}</p>
                  </div>
                </div>
                <span className="p-pill p-pill-info">
                  {new Date(a.start_date).toLocaleDateString('es-CL')} → {new Date(a.end_date).toLocaleDateString('es-CL')}
                </span>
              </div>
              {a.reason && (
                <p className="text-sm text-foreground/80 mb-3 p-3 rounded-lg bg-muted/40 border border-border">
                  {a.reason}
                </p>
              )}
              <textarea
                value={decisionNotes[a.id] ?? ''}
                onChange={e => setDecisionNotes(p => ({ ...p, [a.id]: e.target.value }))}
                placeholder="Notas de la decisión (opcional)"
                rows={2}
                className="p-textarea mb-3"
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => decide(a.id, 'rechazada')} disabled={busy === a.id}
                  className="p-btn-ghost inline-flex items-center gap-1.5 px-4 py-2 text-sm disabled:opacity-50"
                >
                  <X className="w-4 h-4" /> Rechazar
                </button>
                <button
                  onClick={() => decide(a.id, 'aprobada')} disabled={busy === a.id}
                  className="p-btn-primary inline-flex items-center gap-1.5 px-4 py-2 text-sm"
                >
                  <Check className="w-4 h-4" /> Aprobar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
