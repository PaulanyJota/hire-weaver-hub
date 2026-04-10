import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RESPONSABLES } from '@/data/mockData';
import { getClienteForVacante } from '@/lib/clienteMapping';

export interface VacanteReal {
  id: string;
  cargo: string;
  ubicacion: string;
  postulantes: number;
  estado: 'Activa' | 'Pausada' | 'Cerrada';
  tipo: string;
  responsableId: string;
  clienteNombre: string;
}

// Patterns that indicate email/notification subjects, not real job postings
const NOISE_PATTERNS = [
  /^Re:/i,
  /^Fwd:/i,
  /Notificacion/i,
  /Resumen semanal/i,
  /Nueva Clave/i,
  /Obtén mas Postulantes/i,
  /Anuncio destacado/i,
  /Pendiente de Confirmacion/i,
  /^API$/i,
  /pago realizado/i,
  /Flow$/i,
];

function isRealVacante(name: string): boolean {
  return !NOISE_PATTERNS.some(p => p.test(name));
}

// Extract location from cargo name (e.g. "Operario - Pudahuel" → "Pudahuel")
function extractUbicacion(cargo: string): string {
  const dashIdx = cargo.lastIndexOf(' - ');
  if (dashIdx > 0) return cargo.substring(dashIdx + 3).trim();
  const commaIdx = cargo.lastIndexOf(',');
  if (commaIdx > 0) return cargo.substring(commaIdx + 1).trim();
  return 'Santiago';
}

// Detect service type from cargo keywords
function detectTipo(cargo: string): string {
  const lower = cargo.toLowerCase();
  if (lower.includes('counter') || lower.includes('ejecutivo')) return 'Outsourcing';
  if (lower.includes('operario') || lower.includes('bodega') || lower.includes('gruero') || lower.includes('limpieza')) return 'EST';
  return 'Reclutamiento';
}

// Detect client from cargo keywords
function detectCliente(cargo: string): string {
  return getClienteForVacante(cargo);
}

// Assign responsable round-robin based on hash
function assignResponsable(cargo: string): string {
  let hash = 0;
  for (let i = 0; i < cargo.length; i++) hash = ((hash << 5) - hash) + cargo.charCodeAt(i);
  const ids = RESPONSABLES.map(r => r.id);
  return ids[Math.abs(hash) % ids.length];
}

export function useVacantesReales() {
  const [rawData, setRawData] = useState<{ vacante_origen: string; total: number }[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    // We fetch all postulantes' vacante_origen to group client-side
    const { data, error } = await supabase
      .from('postulantes')
      .select('vacante_origen');

    if (!error && data) {
      const counts: Record<string, number> = {};
      data.forEach(row => {
        const v = row.vacante_origen;
        if (v) counts[v] = (counts[v] || 0) + 1;
      });
      const arr = Object.entries(counts).map(([vacante_origen, total]) => ({ vacante_origen, total }));
      arr.sort((a, b) => b.total - a.total);
      setRawData(arr);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const vacantes: VacanteReal[] = useMemo(() => {
    return rawData
      .filter(r => isRealVacante(r.vacante_origen))
      .map((r, i) => ({
        id: `vr-${i}`,
        cargo: r.vacante_origen,
        ubicacion: extractUbicacion(r.vacante_origen),
        postulantes: r.total,
        estado: 'Activa' as const,
        tipo: detectTipo(r.vacante_origen),
        responsableId: assignResponsable(r.vacante_origen),
        clienteNombre: detectCliente(r.vacante_origen),
      }));
  }, [rawData]);

  return { vacantes, loading, refetch: fetchData };
}
