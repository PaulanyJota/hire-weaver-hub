import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Conteo unificado de sucursales para todo el portal cliente.
 * Usa get_branches_summary que ya filtra sucursales con 0 trabajadores activos.
 */
export function useSucursalesCount() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.rpc('get_branches_summary');
      if (!cancelled) setCount((data ?? []).length);
    })();
    return () => { cancelled = true; };
  }, []);

  return count;
}
