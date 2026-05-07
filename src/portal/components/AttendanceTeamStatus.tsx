import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, CheckCircle2, Bell, Send, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type StatusRow = {
  worker_id: string;
  nombre: string;
  cargo: string | null;
  sucursal: string | null;
  phone: string | null;
  ultima_marca: string | null;
  dias_sin_marca: number | null;
  clasificacion: 'marco_hoy' | 'recordar' | 'revisar_estado';
  ya_recordado_hoy: boolean;
  ultima_alerta_recordatorio: string | null;
};

const DEFAULT_MSG =
  'Hola {nombre}! 👋 Te escribimos desde Nodo Talentos. Notamos que no has marcado asistencia hoy. ¿Pudiste marcar? Si tienes algún problema, avísanos. ¡Gracias!';

export default function AttendanceTeamStatus() {
  const [rows, setRows] = useState<StatusRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalWorker, setModalWorker] = useState<StatusRow | null>(null);
  const [message, setMessage] = useState(DEFAULT_MSG);
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('get_attendance_status');
    if (error) console.error('get_attendance_status', error);
    setRows((data ?? []) as StatusRow[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const marcaron = rows.filter(r => r.clasificacion === 'marco_hoy');
  const recordar = rows.filter(r => r.clasificacion === 'recordar');
  const revisar = rows.filter(r => r.clasificacion === 'revisar_estado');

  const openModal = (w: StatusRow) => {
    setMessage(DEFAULT_MSG);
    setModalWorker(w);
  };

  const closeModal = () => { if (!sending) setModalWorker(null); };

  const handleSend = async () => {
    if (!modalWorker) return;
    if (message.length < 10 || message.length > 1000) {
      toast({ title: 'Mensaje inválido', description: 'Debe tener entre 10 y 1000 caracteres', variant: 'destructive' });
      return;
    }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-attendance-reminder', {
        body: { worker_id: modalWorker.worker_id, message_text: message },
      });
      const payload: any = data ?? {};
      if (error || (payload && payload.ok === false)) {
        const ctx: any = (error as any)?.context;
        const status = ctx?.status ?? payload?.status;
        if (status === 409 || payload?.ya_enviado_hoy) {
          toast({ title: 'Ya se envió recordatorio hoy', description: `${modalWorker.nombre}`, className: 'bg-amber-50 border-amber-200 text-amber-900' });
        } else {
          toast({ title: 'Error al enviar', description: payload?.error || (error as any)?.message || 'Intenta nuevamente', variant: 'destructive' });
        }
      } else if (payload?.ok) {
        toast({ title: 'Recordatorio enviado', description: `Recordatorio enviado a ${modalWorker.nombre}`, className: 'bg-emerald-50 border-emerald-200 text-emerald-900' });
        setModalWorker(null);
        await load();
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e?.message ?? 'Error inesperado', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const lastDigits = (phone: string | null) => {
    if (!phone) return '----';
    const digits = phone.replace(/\D/g, '');
    return digits.slice(-4) || '----';
  };

  return (
    <section>
      <h2 className="text-base font-bold tracking-tight mb-3" style={{ color: 'hsl(var(--p-text))' }}>
        Estado de marcaje del equipo
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Marcaron hoy */}
        <Column
          title="Marcaron hoy"
          count={marcaron.length}
          tone="teal"
          icon={<CheckCircle2 className="w-3.5 h-3.5" />}
          loading={loading}
          empty="Aún no hay marcas registradas hoy."
        >
          {marcaron.map(w => (
            <li key={w.worker_id} className="px-3 py-2.5 rounded-lg border border-slate-200 bg-white flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate" style={{ color: 'hsl(var(--p-text))' }}>{w.nombre}</p>
                <p className="text-[11px] truncate" style={{ color: 'hsl(var(--p-muted))' }}>
                  {w.cargo ?? 'Sin cargo'} · {w.sucursal ?? '—'}
                </p>
              </div>
              <span className="shrink-0 mt-0.5 w-2 h-2 rounded-full" style={{ background: '#1D9E75' }} />
            </li>
          ))}
        </Column>

        {/* Recordar */}
        <Column
          title="Recordar marcar"
          count={recordar.length}
          tone="orange"
          icon={<Bell className="w-3.5 h-3.5" />}
          loading={loading}
          empty="Nadie pendiente de recordatorio."
        >
          {recordar.map(w => (
            <li key={w.worker_id} className="px-3 py-2.5 rounded-lg border border-slate-200 bg-white flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate" style={{ color: 'hsl(var(--p-text))' }}>{w.nombre}</p>
                <p className="text-[11px] truncate" style={{ color: 'hsl(var(--p-muted))' }}>
                  {w.cargo ?? 'Sin cargo'} · {w.sucursal ?? '—'}
                </p>
                <p className="text-[11px] mt-0.5 tabular-nums" style={{ color: 'hsl(var(--p-muted))' }}>
                  Último día: {w.ultima_marca ?? '—'}
                  {w.dias_sin_marca != null && w.dias_sin_marca > 0 ? ` · ${w.dias_sin_marca}d` : ''}
                </p>
              </div>
              {w.ya_recordado_hoy ? (
                <button
                  disabled
                  className="shrink-0 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-slate-100 text-slate-400 cursor-not-allowed"
                >
                  Ya recordado hoy
                </button>
              ) : (
                <button
                  onClick={() => openModal(w)}
                  className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-white hover:opacity-90 transition"
                  style={{ background: '#F97316' }}
                >
                  <Bell className="w-3 h-3" />
                  Recordar
                </button>
              )}
            </li>
          ))}
        </Column>

        {/* Revisar */}
        <Column
          title="Revisar estado"
          count={revisar.length}
          tone="red"
          icon={<AlertTriangle className="w-3.5 h-3.5" />}
          loading={loading}
          empty="Sin casos críticos."
        >
          {revisar.map(w => (
            <li key={w.worker_id} className="px-3 py-2.5 rounded-lg border border-slate-200 bg-white flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#F97316' }} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate" style={{ color: 'hsl(var(--p-text))' }}>{w.nombre}</p>
                <p className="text-[11px] truncate" style={{ color: 'hsl(var(--p-muted))' }}>
                  {w.cargo ?? 'Sin cargo'} · {w.sucursal ?? '—'}
                </p>
                <p className="text-[11px] mt-0.5 font-medium" style={{ color: '#dc2626' }}>
                  {w.ultima_marca == null
                    ? 'Nunca ha marcado'
                    : `${w.dias_sin_marca ?? 0} días sin marca`}
                </p>
              </div>
            </li>
          ))}
        </Column>
      </div>

      {/* Modal */}
      {modalWorker && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(15,36,64,0.55)', backdropFilter: 'blur(4px)' }}
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-2xl border border-slate-200 w-full max-w-md overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between px-5 py-4 border-b border-slate-200">
              <div className="min-w-0">
                <h3 className="text-sm font-bold tracking-tight" style={{ color: 'hsl(var(--p-text))' }}>
                  Enviar recordatorio a {modalWorker.nombre}
                </h3>
                <p className="text-[11px] mt-0.5 tabular-nums" style={{ color: 'hsl(var(--p-muted))' }}>
                  Teléfono: ***{lastDigits(modalWorker.phone)}
                </p>
              </div>
              <button
                onClick={closeModal}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <textarea
                className="w-full min-h-[140px] rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3DA5E0]/30 focus:border-[#3DA5E0] resize-y"
                value={message}
                onChange={e => setMessage(e.target.value)}
                disabled={sending}
                maxLength={1000}
              />
              <div className="flex items-center justify-between text-[11px]" style={{ color: 'hsl(var(--p-muted))' }}>
                <span>El placeholder <code className="px-1 rounded bg-slate-100">{'{nombre}'}</code> se reemplaza automáticamente.</span>
                <span className={`tabular-nums ${message.length < 10 || message.length > 1000 ? 'text-red-600' : ''}`}>
                  {message.length}/1000
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-200 bg-slate-50">
              <button
                onClick={closeModal}
                disabled={sending}
                className="px-3 py-2 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSend}
                disabled={sending || message.length < 10 || message.length > 1000}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
                style={{ background: '#1D9E75' }}
              >
                <Send className="w-3.5 h-3.5" />
                {sending ? 'Enviando…' : 'Enviar WhatsApp'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function Column({
  title, count, tone, icon, loading, empty, children,
}: {
  title: string;
  count: number;
  tone: 'teal' | 'orange' | 'red';
  icon: React.ReactNode;
  loading: boolean;
  empty: string;
  children: React.ReactNode;
}) {
  const badge =
    tone === 'teal' ? { bg: '#1D9E75', text: '#fff' } :
    tone === 'orange' ? { bg: '#F97316', text: '#fff' } :
    { bg: '#dc2626', text: '#fff' };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold tracking-tight inline-flex items-center gap-1.5" style={{ color: 'hsl(var(--p-text))' }}>
          <span className="text-slate-400">{icon}</span>
          {title}
        </h3>
        <span
          className="px-2 py-0.5 rounded-full text-[11px] font-bold tabular-nums"
          style={{ background: badge.bg, color: badge.text }}
        >
          {count}
        </span>
      </div>

      {loading ? (
        <div className="space-y-2">{[0,1,2].map(i => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}</div>
      ) : count === 0 ? (
        <div className="py-8 text-center">
          <p className="text-xs" style={{ color: 'hsl(var(--p-muted))' }}>{empty}</p>
        </div>
      ) : (
        <ul className="space-y-2 max-h-[400px] overflow-y-auto pr-1">{children}</ul>
      )}
    </div>
  );
}
