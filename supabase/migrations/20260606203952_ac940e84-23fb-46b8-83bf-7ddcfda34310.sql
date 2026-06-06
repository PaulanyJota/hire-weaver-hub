
-- 1) Add liquid_salary to portal_contracts
ALTER TABLE public.portal_contracts
  ADD COLUMN IF NOT EXISTS liquid_salary numeric;

-- 2) get_contracts_kpis(p_company_id)
CREATE OR REPLACE FUNCTION public.get_contracts_kpis(p_company_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_result jsonb;
  v_last_period date;
  v_prev_period date;
BEGIN
  -- Latest and previous period from portal_payroll (scoped to company)
  SELECT MAX(period) INTO v_last_period
    FROM portal_payroll pp
    WHERE p_company_id IS NULL OR pp.portal_company_id = p_company_id;

  SELECT MAX(period) INTO v_prev_period
    FROM portal_payroll pp
    WHERE (p_company_id IS NULL OR pp.portal_company_id = p_company_id)
      AND period < v_last_period;

  WITH suc AS (
    SELECT * FROM (VALUES
      ('LC_AE','Aeropuerto SCL'),('LC_CO','Concepción'),('LC_LS','La Serena'),
      ('LC_ÑU','Ñuñoa'),('LC_PA','Punta Arenas'),('LC_PM','Puerto Montt'),
      ('LC_PN','Puerto Natales'),('LC_TE','Temuco'),('LC_VM','Viña del Mar'),
      ('LC_VI','Vitacura'),('AL_MF','Maipú'),('AL_PU','Pudahuel')
    ) AS t(cc, sucursal)
  ),
  active_workers AS (
    SELECT w.id, w.first_name, w.last_name, w.cost_center, w.portal_company_id
    FROM portal_workers w
    WHERE w.active = true
      AND (p_company_id IS NULL OR w.portal_company_id = p_company_id)
  ),
  current_contracts AS (
    SELECT c.worker_id, c.contract_type, c.end_date, c.liquid_salary
    FROM portal_contracts c
    WHERE c.is_current = true
      AND c.worker_id IN (SELECT id FROM active_workers)
  ),
  counts AS (
    SELECT
      (SELECT COUNT(*) FROM active_workers)::int AS total_workers,
      COUNT(*) FILTER (WHERE contract_type = 'indefinido')::numeric AS n_indef,
      COUNT(*) FILTER (WHERE contract_type = 'plazo_fijo')::numeric AS n_plazo,
      COUNT(*)::numeric AS n_total_contracts,
      AVG(liquid_salary) FILTER (WHERE liquid_salary IS NOT NULL) AS avg_liq
    FROM current_contracts
  ),
  vencen_30 AS (
    SELECT jsonb_agg(jsonb_build_object(
      'worker_id', cc.worker_id,
      'nombre', aw.first_name || ' ' || aw.last_name,
      'branch', COALESCE(s.sucursal, aw.cost_center),
      'cost_center', aw.cost_center,
      'contract_end', cc.end_date
    ) ORDER BY cc.end_date) AS arr
    FROM current_contracts cc
    JOIN active_workers aw ON aw.id = cc.worker_id
    LEFT JOIN suc s ON s.cc = aw.cost_center
    WHERE cc.end_date IS NOT NULL
      AND cc.end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
  ),
  vencen_90 AS (
    SELECT jsonb_agg(jsonb_build_object(
      'worker_id', cc.worker_id,
      'nombre', aw.first_name || ' ' || aw.last_name,
      'branch', COALESCE(s.sucursal, aw.cost_center),
      'cost_center', aw.cost_center,
      'contract_end', cc.end_date
    ) ORDER BY cc.end_date) AS arr
    FROM current_contracts cc
    JOIN active_workers aw ON aw.id = cc.worker_id
    LEFT JOIN suc s ON s.cc = aw.cost_center
    WHERE cc.end_date IS NOT NULL
      AND cc.end_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '90 days'
  ),
  payroll_last AS (
    SELECT pp.worker_id, pp.cost_center, SUM(pp.net_salary) AS net
    FROM portal_payroll pp
    WHERE pp.period = v_last_period
      AND (p_company_id IS NULL OR pp.portal_company_id = p_company_id)
    GROUP BY pp.worker_id, pp.cost_center
  ),
  masa_total AS (
    SELECT COALESCE(SUM(net), 0)::numeric AS total FROM payroll_last
  ),
  masa_prev AS (
    SELECT COALESCE(SUM(net_salary), 0)::numeric AS total
    FROM portal_payroll pp
    WHERE pp.period = v_prev_period
      AND (p_company_id IS NULL OR pp.portal_company_id = p_company_id)
  ),
  por_sucursal AS (
    SELECT jsonb_agg(jsonb_build_object(
      'branch_name', COALESCE(s.sucursal, pl.cost_center),
      'cost_center', pl.cost_center,
      'total_liquid', round(SUM(pl.net))::numeric,
      'worker_count', COUNT(DISTINCT pl.worker_id)
    ) ORDER BY SUM(pl.net) DESC) AS arr
    FROM payroll_last pl
    LEFT JOIN suc s ON s.cc = pl.cost_center
    GROUP BY 1=1
  )
  SELECT jsonb_build_object(
    'total_workers', c.total_workers,
    'indefinido_pct', CASE WHEN c.n_total_contracts > 0 THEN round(100.0 * c.n_indef / c.n_total_contracts, 1) ELSE 0 END,
    'plazo_fijo_pct', CASE WHEN c.n_total_contracts > 0 THEN round(100.0 * c.n_plazo / c.n_total_contracts, 1) ELSE 0 END,
    'vencen_30_dias', COALESCE((SELECT arr FROM vencen_30), '[]'::jsonb),
    'vencen_90_dias', COALESCE((SELECT arr FROM vencen_90), '[]'::jsonb),
    'avg_liquid_salary', round(COALESCE(c.avg_liq, 0))::numeric,
    'total_masa_salarial', (SELECT total FROM masa_total),
    'masa_por_sucursal', COALESCE((SELECT arr FROM por_sucursal), '[]'::jsonb),
    'variacion_masa_mes_anterior',
      CASE WHEN (SELECT total FROM masa_prev) > 0
        THEN round(100.0 * ((SELECT total FROM masa_total) - (SELECT total FROM masa_prev)) / (SELECT total FROM masa_prev), 1)
        ELSE NULL END,
    'last_period', v_last_period,
    'prev_period', v_prev_period
  ) INTO v_result
  FROM counts c;

  RETURN v_result;
END;
$function$;

-- 3) get_worker_salary_history(p_worker_id)
CREATE OR REPLACE FUNCTION public.get_worker_salary_history(p_worker_id uuid)
RETURNS TABLE(period date, liquid_salary numeric, delta_pct numeric)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH agg AS (
    SELECT pp.period, SUM(pp.net_salary)::numeric AS net
    FROM portal_payroll pp
    WHERE pp.worker_id = p_worker_id
    GROUP BY pp.period
  ),
  ord AS (
    SELECT period, round(net)::numeric AS liquid_salary,
      LAG(net) OVER (ORDER BY period) AS prev_net
    FROM agg
  )
  SELECT period, liquid_salary,
    CASE WHEN prev_net IS NULL OR prev_net = 0 THEN NULL
         ELSE round(100.0 * (liquid_salary - prev_net) / prev_net, 1) END AS delta_pct
  FROM ord
  ORDER BY period ASC;
$function$;
