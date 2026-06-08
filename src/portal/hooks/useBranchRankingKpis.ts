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

export interface OvertimeKpis {
  total_horas_extra: number;
  total_mes_anterior: number;
  delta_pct: number;
  trabajadores_afectados: number;
  dias_con_extra: number;
  nivel_alerta: 'ok' | 'warning' | 'critical';
  top_trabajadores: Array<{ nombre: string; sucursal: string; horas_extra: number; dias: number }>;
}

export function useOvertimeKpis(companyId?: string | null) {
  const cid = companyId ?? LUCANO_COMPANY_ID;
  return useQuery<OvertimeKpis | null>({
    queryKey: ['overtime-kpis', cid],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_overtime_kpis' as any, { p_company_id: cid });
      if (error) { console.error('[overtime-kpis]', error); return null; }
      return (data as OvertimeKpis) ?? null;
    },
    staleTime: 60_000,
  });
}

export interface SalaryKpis {
  // Nuevo shape de get_salary_kpis
  period?: string;
  period_label?: string;
  masa_base?: number;
  masa_commissions?: number;
  masa_other?: number;
  masa_total?: number;
  avg_total?: number;
  min_total?: number;
  max_total?: number;
  median_total?: number;
  avg_pct_commissions?: number;
  worker_count?: number;

  // Compat antiguo (no presente en RPC nuevo, pero referenciado en otras vistas)
  periodo_label?: string;
  sueldo_min?: number;
  sueldo_max?: number;
  sueldo_promedio?: number;
  sueldo_mediana?: number;
  masa_est?: number;
  masa_outsourcing?: number;
  comision_sobre_sueldo?: Array<{ nombre: string; sucursal: string; sueldo: number; comision: number; pct_comision: number }>;
  constantes?: Array<{ worker_id: string; nombre: string; sucursal: string }>;
}

export function useSalaryKpis(companyId?: string | null) {
  const cid = companyId ?? LUCANO_COMPANY_ID;
  return useQuery<SalaryKpis | null>({
    queryKey: ['salary-kpis', cid],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_salary_kpis' as any, { p_company_id: cid });
      if (error) { console.error('[salary-kpis]', error); return null; }
      const k = (data as SalaryKpis) ?? null;
      if (k) {
        // alias para código legado
        k.periodo_label ??= k.period_label;
      }
      return k;
    },
    staleTime: 60_000,
  });
}

export interface SalaryBreakdownRow {
  worker_id: string;
  worker_name: string;
  cost_center: string;
  period: string;
  period_label: string;
  base_liquid: number;
  commissions: number;
  overtime: number;
  other_bonuses: number;
  total_liquid: number;
  pct_base: number;
  pct_commissions: number;
  pct_overtime: number;
}

export function useSalaryBreakdown(companyId?: string | null, period?: string | null) {
  const cid = companyId ?? LUCANO_COMPANY_ID;
  return useQuery<SalaryBreakdownRow[]>({
    queryKey: ['salary-breakdown', cid, period ?? 'latest'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_salary_breakdown' as any, {
        p_company_id: cid,
        p_period: period ?? null,
      });
      if (error) { console.error('[salary-breakdown]', error); return []; }
      return (data as SalaryBreakdownRow[]) ?? [];
    },
    staleTime: 60_000,
  });
}

