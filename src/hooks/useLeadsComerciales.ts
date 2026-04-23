import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type EtapaComercial =
  | 'Prospecto'
  | 'Contactado'
  | 'Reunión Agendada'
  | 'Propuesta Enviada'
  | 'Negociación'
  | 'Cliente Activo'
  | 'Descartado';

export type PrioridadLead = 'Alta' | 'Media' | 'Baja';

export interface LeadComercialDB {
  id: string;
  empresa: string;
  contacto: string | null;
  cargo: string | null;
  email: string | null;
  telefono: string | null;
  tipo_empresa: string | null;
  ciudad: string | null;
  comuna: string | null;
  region: string | null;
  pais: string | null;
  sitio_web: string | null;
  prioridad: PrioridadLead;
  origen: string | null;
  estado_verificacion: string | null;
  etapa: EtapaComercial;
  notas: string | null;
  created_at: string;
  updated_at: string;
}

export type LeadInsert = Omit<LeadComercialDB, 'id' | 'created_at' | 'updated_at'>;

export function useLeadsComerciales() {
  const [leads, setLeads] = useState<LeadComercialDB[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('leads_comerciales')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setLeads(data as LeadComercialDB[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const addLead = async (lead: Partial<LeadInsert> & { empresa: string }) => {
    const { error } = await supabase.from('leads_comerciales').insert(lead as any);
    if (!error) await fetchAll();
    return { ok: !error, error };
  };

  const updateEtapa = async (id: string, etapa: EtapaComercial) => {
    // Optimista
    setLeads(prev => prev.map(l => (l.id === id ? { ...l, etapa } : l)));
    const { error } = await supabase
      .from('leads_comerciales')
      .update({ etapa })
      .eq('id', id);
    if (error) await fetchAll();
    return !error;
  };

  const deleteLead = async (id: string) => {
    const { error } = await supabase.from('leads_comerciales').delete().eq('id', id);
    if (!error) setLeads(prev => prev.filter(l => l.id !== id));
    return !error;
  };

  return { leads, loading, refetch: fetchAll, addLead, updateEtapa, deleteLead };
}
