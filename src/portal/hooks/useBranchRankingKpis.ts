import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface BranchRankingKpis {
  ranking_asistencia: Array<{ sucursal: string; trabajadores: number; presencias: number; pct_asistencia: number }>;
  comision_per_capita: Array<{ sucursal: string; trabajadores_totales: number; con_comision: number; total_comisiones: number; comision_per_capita: number }>;
  valor_hora_equipo: number;
  roi_comisiones_pct: number;
}

const LUCANO_COMPANY_ID = '11111111-1111-1111-1111-111111111111';

export function useBranchRankingKpis(companyId?: string | null) {
  const cid = companyId ?? LUCANO_COMPANY_ID;
  return useQuery<BranchRankingKpis | null>({
    queryKey: ['branch-ranking-kpis', cid],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_branch_ranking_kpis' as any, { p_company_id: cid });
      if (error) { console.error('[branch-ranking-kpis]', error); return null; }
      return (data as BranchRankingKpis) ?? null;
    },
    staleTime: 60_000,
  });
}

export interface PunctualityKpis {
  puntualidad_semana: number;
  puntualidad_prev: number;
  delta_puntualidad: number;
  streak_sin_atrasos: number;
  activos_ahora: number;
  trabajadores_100_pct: number;
}

export function usePunctualityKpis(companyId?: string | null, tolerance = 5) {
  const cid = companyId ?? LUCANO_COMPANY_ID;
  return useQuery<PunctualityKpis | null>({
    queryKey: ['punctuality-kpis', cid, tolerance],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_punctuality_kpis' as any, {
        p_company_id: cid, p_tolerance_minutes: tolerance,
      });
      if (error) { console.error('[punctuality-kpis]', error); return null; }
      return (data as PunctualityKpis) ?? null;
    },
    staleTime: 60_000,
  });
}

export interface PerfectAttendanceWorker {
  worker_id: string;
  nombre: string;
  sucursal: string;
  dias_presentes: number;
}

export function usePerfectAttendance(companyId?: string | null) {
  const cid = companyId ?? LUCANO_COMPANY_ID;
  return useQuery<PerfectAttendanceWorker[]>({
    queryKey: ['perfect-attendance', cid],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_perfect_attendance' as any, { p_company_id: cid });
      if (error) { console.error('[perfect-attendance]', error); return []; }
      return (data as PerfectAttendanceWorker[]) ?? [];
    },
    staleTime: 60_000,
  });
}
