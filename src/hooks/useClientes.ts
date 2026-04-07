import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ClienteDB {
  id: string;
  nombre: string;
  industria: string | null;
  contacto: string | null;
  email: string | null;
  estado: string;
  created_at: string;
}

export function useClientes() {
  const [clientes, setClientes] = useState<ClienteDB[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('clientes')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setClientes(data as ClienteDB[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const addCliente = async (c: { nombre: string; industria: string; contacto: string; email: string }) => {
    const { error } = await supabase.from('clientes').insert(c as any);
    if (!error) await fetch();
    return !error;
  };

  return { clientes, loading, refetch: fetch, addCliente };
}
