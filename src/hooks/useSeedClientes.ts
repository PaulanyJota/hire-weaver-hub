import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const REQUIRED_CLIENTS = [
  { nombre: 'Todo Espacio', industria: 'Servicios', contacto: '', email: '' },
  { nombre: 'Daniel Achondo', industria: 'Servicios', contacto: '', email: '' },
];

let seeded = false;

/** Ensures required clients exist in the DB (runs once per session) */
export function useSeedClientes() {
  useEffect(() => {
    if (seeded) return;
    seeded = true;

    (async () => {
      const { data: existing } = await supabase.from('clientes').select('nombre');
      const existingNames = new Set((existing || []).map((c: any) => c.nombre));

      for (const client of REQUIRED_CLIENTS) {
        if (!existingNames.has(client.nombre)) {
          await supabase.from('clientes').insert(client as any);
        }
      }
    })();
  }, []);
}
