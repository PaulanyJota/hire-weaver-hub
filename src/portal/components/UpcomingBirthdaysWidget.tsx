import { useEffect, useState } from 'react';
import { Cake } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { branchName } from '../constants/branches';

interface BirthdayRow {
  worker_name: string;
  cost_center: string | null;
  birth_date: string | null;
  age_turning: number | null;
  days_until: number | null;
  birthday_this_year: string | null;
}

interface Props {
  companyId?: string;
}

const COMPANY_ID_FALLBACK = '11111111-1111-1111-1111-111111111111';

export default function UpcomingBirthdaysWidget({ companyId }: Props) {
  const [rows, setRows] = useState<BirthdayRow[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.rpc('get_upcoming_birthdays' as any, {
          p_company_id: companyId ?? COMPANY_ID_FALLBACK,
          p_days: 60,
        });
        if (cancelled) return;
        if (error) {
          console.error('[upcoming-birthdays]', error);
          setRows([]);
        } else {
          setRows((data as BirthdayRow[]) ?? []);
        }
      } catch (e) {
        if (!cancelled) setRows([]);
        console.error('[upcoming-birthdays]', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [companyId]);

  const visible = (rows ?? []).filter(r => r.birth_date && r.days_until !== null);

  return (
    <div className="p-card p-5 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: '#F9731615', color: '#F97316' }}
        >
          <Cake className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Próximos cumpleaños</p>
          <p className="text-xs text-slate-500">Siguientes 60 días</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : visible.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-center py-6">
          <p className="text-xs text-slate-500 leading-relaxed">
            🎂 Sin cumpleaños próximos registrados<br />
            <span className="text-slate-400">datos en sincronización</span>
          </p>
        </div>
      ) : (
        <ul className="space-y-2 overflow-y-auto pr-1" style={{ maxHeight: 280 }}>
          {visible.slice(0, 50).map((r, i) => {
            const d = r.days_until ?? 0;
            let badge: { text: string; bg: string; color: string };
            if (d === 0) badge = { text: '🎂 HOY', bg: '#F97316', color: '#fff' };
            else if (d <= 7) badge = { text: 'Esta semana', bg: '#FEF3C7', color: '#B45309' };
            else badge = { text: `en ${d} días`, bg: '#F1F5F9', color: '#475569' };

            return (
              <li
                key={i}
                className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{r.worker_name}</p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {r.cost_center ? branchName(r.cost_center) : '—'}
                    {r.age_turning != null && ` · cumple ${r.age_turning}`}
                  </p>
                </div>
                <span
                  className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md shrink-0"
                  style={{ background: badge.bg, color: badge.color }}
                >
                  {badge.text}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
