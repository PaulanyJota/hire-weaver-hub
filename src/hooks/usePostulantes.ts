import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

export type Postulante = Tables<'postulantes'>;

const PAGE_SIZE = 20;

export function usePostulantes() {
  const [postulantes, setPostulantes] = useState<Postulante[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const fetchPostulantes = useCallback(async () => {
    setLoading(true);
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from('postulantes')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (searchQuery.trim()) {
      query = query.or(`nombre.ilike.%${searchQuery}%,profesion.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`);
    }

    const { data, error, count } = await query;

    if (!error && data) {
      setPostulantes(data);
      if (count !== null) setTotalCount(count);
    }
    setLoading(false);
  }, [page, searchQuery]);

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

  return {
    postulantes,
    loading,
    refetch: fetchPostulantes,
    updateEstadoPipeline,
    page,
    setPage,
    totalPages,
    totalCount,
    searchQuery,
    setSearchQuery,
  };
}

/** Fetches ALL postulantes (for pipeline view) */
export function useAllPostulantes() {
  const [postulantes, setPostulantes] = useState<Postulante[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    // Supabase default limit is 1000, we have ~579 so one call is fine
    const { data, error } = await supabase
      .from('postulantes')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) setPostulantes(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

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

  return { postulantes, loading, refetch: fetchAll, updateEstadoPipeline };
}
