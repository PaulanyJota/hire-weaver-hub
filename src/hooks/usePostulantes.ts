import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

export type Postulante = Tables<'postulantes'>;

export function usePostulantes() {
  const [postulantes, setPostulantes] = useState<Postulante[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPostulantes = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('postulantes')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setPostulantes(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPostulantes();
  }, [fetchPostulantes]);

  const updateEstadoPipeline = async (id: string, nuevoEstado: string) => {
    const { error } = await supabase
      .from('postulantes')
      .update({ estado_pipeline: nuevoEstado })
      .eq('id', id);

    if (!error) {
      setPostulantes(prev =>
        prev.map(p => (p.id === id ? { ...p, estado_pipeline: nuevoEstado } : p))
      );
    }
    return { error };
  };

  return { postulantes, loading, refetch: fetchPostulantes, updateEstadoPipeline };
}
