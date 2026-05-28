import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { ShieldCheck, ArrowRight } from 'lucide-react';

interface Row { estado: 'marca_ok' | 'registrado_sin_marcar' | 'no_en_geovictoria' }

export default function ControlMarcajeSummary() {
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState({ ok: 0, sin: 0, no: 0 });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.rpc('get_marcaje_control');
      if (cancelled) return;
      if (error) console.error('[control-marcaje-summary]', error);
      const rows = (data ?? []) as Row[];
      setCounts({
        ok: rows.filter(r => r.estado === 'marca_ok').length,
        sin: rows.filter(r => r.estado === 'registrado_sin_marcar').length,
        no: rows.filter(r => r.estado === 'no_en_geovictoria').length,
      });
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const items = [
    { label: 'Marca OK', value: counts.ok, color: '#1D9E75', bg: '#1D9E7515' },
    { label: 'Registrado sin marcar', value: counts.sin, color: '#F97316', bg: '#F9731615' },
    { label: 'No en Geovictoria', value: counts.no, color: '#dc2626', bg: '#dc262615' },
  ];

  return (
    <section className="p-card p-5 rounded-xl border border-slate-200">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#1B3A5C15', color: '#1B3A5C' }}>
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-bold tracking-tight" style={{ color: '#1B3A5C' }}>Control de marcaje</h2>
            <p className="text-xs text-muted-foreground">Cruce contratos BUK vs marcaje Geovictoria</p>
          </div>
        </div>
        <Link
          to="/portal/control-marcaje"
          className="inline-flex items-center gap-1 text-xs font-semibold whitespace-nowrap"
          style={{ color: '#3DA5E0' }}
        >
          Ver detalle completo <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {items.map(it => (
          <div key={it.label} className="rounded-xl border border-slate-200 p-4" style={{ background: it.bg }}>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">{it.label}</p>
            {loading ? <Skeleton className="h-9 w-16 mt-2" /> : (
              <p className="text-3xl font-bold tabular-nums mt-1" style={{ color: it.color }}>{it.value}</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
