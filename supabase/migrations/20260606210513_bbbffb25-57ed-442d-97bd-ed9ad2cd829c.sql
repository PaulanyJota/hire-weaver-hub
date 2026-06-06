
DROP FUNCTION IF EXISTS public.get_attendance_today_smart(uuid, date);
DROP FUNCTION IF EXISTS public.infer_worker_schedule(uuid, int);
DROP FUNCTION IF EXISTS public.refresh_all_inferred_schedules(uuid, int);

CREATE TABLE IF NOT EXISTS public.worker_inferred_schedule (
  worker_id uuid PRIMARY KEY,
  dias_activos jsonb NOT NULL DEFAULT '[1,2,3,4,5]'::jsonb,
  hora_entrada time,
  hora_salida time,
  jornada_horas numeric,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.worker_inferred_schedule TO authenticated;
GRANT ALL ON public.worker_inferred_schedule TO service_role;

ALTER TABLE public.worker_inferred_schedule ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wis select scoped" ON public.worker_inferred_schedule;
CREATE POLICY "wis select scoped"
  ON public.worker_inferred_schedule FOR SELECT
  TO authenticated
  USING (
    public.portal_is_nodo_admin() OR EXISTS (
      SELECT 1 FROM public.portal_workers w
      WHERE w.id = worker_inferred_schedule.worker_id
        AND w.portal_company_id = public.portal_current_user_company_id()
    )
  );

CREATE OR REPLACE FUNCTION public.infer_worker_schedule(p_worker_id uuid, p_lookback_days int DEFAULT 60)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_total int;
  v_weeks int;
  v_dias jsonb;
  v_entrada time;
  v_salida time;
  v_jornada numeric;
BEGIN
  SELECT COUNT(*) INTO v_total
  FROM portal_attendance a
  WHERE a.worker_id = p_worker_id
    AND a.date >= CURRENT_DATE - (p_lookback_days || ' days')::interval
    AND a.check_in IS NOT NULL;

  SELECT COUNT(DISTINCT date_trunc('week', a.date)) INTO v_weeks
  FROM portal_attendance a
  WHERE a.worker_id = p_worker_id
    AND a.date >= CURRENT_DATE - (p_lookback_days || ' days')::interval
    AND a.check_in IS NOT NULL;

  IF v_total < 5 THEN
    v_dias := '[1,2,3,4,5]'::jsonb;
  ELSE
    WITH per_day AS (
      SELECT EXTRACT(DOW FROM a.date)::int AS dow,
        COUNT(DISTINCT date_trunc('week', a.date)) AS weeks_present
      FROM portal_attendance a
      WHERE a.worker_id = p_worker_id
        AND a.date >= CURRENT_DATE - (p_lookback_days || ' days')::interval
        AND a.check_in IS NOT NULL
      GROUP BY EXTRACT(DOW FROM a.date)
    )
    SELECT COALESCE(jsonb_agg(dow ORDER BY dow), '[]'::jsonb) INTO v_dias
    FROM per_day
    WHERE weeks_present::numeric / GREATEST(v_weeks, 1) >= 0.5;

    IF v_dias = '[]'::jsonb OR v_dias IS NULL THEN
      v_dias := '[1,2,3,4,5]'::jsonb;
    END IF;
  END IF;

  SELECT
    ('00:00:00'::time + (
      percentile_cont(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (a.check_in AT TIME ZONE 'America/Santiago')::time))
    ) * interval '1 second')::time,
    ('00:00:00'::time + (
      percentile_cont(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (a.check_out AT TIME ZONE 'America/Santiago')::time))
    ) * interval '1 second')::time,
    AVG(a.worked_hours)
  INTO v_entrada, v_salida, v_jornada
  FROM portal_attendance a
  WHERE a.worker_id = p_worker_id
    AND a.date >= CURRENT_DATE - (p_lookback_days || ' days')::interval
    AND a.check_in IS NOT NULL;

  INSERT INTO worker_inferred_schedule (worker_id, dias_activos, hora_entrada, hora_salida, jornada_horas, updated_at)
  VALUES (p_worker_id, v_dias, v_entrada, v_salida, ROUND(COALESCE(v_jornada, 0), 2), now())
  ON CONFLICT (worker_id) DO UPDATE
  SET dias_activos = EXCLUDED.dias_activos,
      hora_entrada = EXCLUDED.hora_entrada,
      hora_salida = EXCLUDED.hora_salida,
      jornada_horas = EXCLUDED.jornada_horas,
      updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_all_inferred_schedules(p_company_id uuid DEFAULT NULL, p_lookback_days int DEFAULT 60)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  r record;
  n int := 0;
BEGIN
  FOR r IN
    SELECT id FROM portal_workers
    WHERE active = true
      AND (p_company_id IS NULL OR portal_company_id = p_company_id)
  LOOP
    PERFORM public.infer_worker_schedule(r.id, p_lookback_days);
    n := n + 1;
  END LOOP;
  RETURN n;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_attendance_today_smart(p_company_id uuid, p_date date)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_dow int := EXTRACT(DOW FROM p_date)::int;
  v_result jsonb;
BEGIN
  WITH suc AS (SELECT * FROM (VALUES
     ('LC_AE','Aeropuerto SCL'),('LC_CO','Concepción'),('LC_LS','La Serena'),('LC_ÑU','Ñuñoa'),
     ('LC_PA','Punta Arenas'),('LC_PM','Puerto Montt'),('LC_PN','Puerto Natales'),('LC_TE','Temuco'),
     ('LC_VM','Viña del Mar'),('LC_VI','Vitacura'),('AL_MF','Maipú'),('AL_PU','Pudahuel')
   ) AS t(cc, sucursal)),
  expected AS (
    SELECT w.id AS worker_id,
      (w.first_name || ' ' || w.last_name)::text AS nombre,
      COALESCE(s.sucursal, w.cost_center)::text AS branch_name,
      w.cost_center
    FROM portal_workers w
    LEFT JOIN worker_inferred_schedule sch ON sch.worker_id = w.id
    LEFT JOIN suc s ON s.cc = w.cost_center
    WHERE w.active = true
      AND (p_company_id IS NULL OR w.portal_company_id = p_company_id)
      AND COALESCE(sch.dias_activos, '[1,2,3,4,5]'::jsonb) @> to_jsonb(v_dow)
  ),
  marcas AS (
    SELECT a.worker_id, MIN(a.check_in) AS check_in
    FROM portal_attendance a
    WHERE a.date = p_date AND a.check_in IS NOT NULL
    GROUP BY a.worker_id
  ),
  joined AS (
    SELECT e.worker_id, e.nombre, e.branch_name, e.cost_center,
      m.check_in IS NOT NULL AS marco, m.check_in
    FROM expected e
    LEFT JOIN marcas m ON m.worker_id = e.worker_id
  ),
  counts AS (
    SELECT COUNT(*)::int AS esperados,
      COUNT(*) FILTER (WHERE marco)::int AS marcaron
    FROM joined
  ),
  presentes AS (
    SELECT jsonb_agg(jsonb_build_object(
      'worker_id', worker_id, 'nombre', nombre, 'branch_name', branch_name, 'cost_center', cost_center,
      'hora_entrada', TO_CHAR(check_in AT TIME ZONE 'America/Santiago', 'HH24:MI')
    ) ORDER BY check_in) AS arr
    FROM joined WHERE marco
  ),
  ausentes AS (
    SELECT jsonb_agg(jsonb_build_object(
      'worker_id', worker_id, 'nombre', nombre, 'branch_name', branch_name, 'cost_center', cost_center
    ) ORDER BY nombre) AS arr
    FROM joined WHERE NOT marco
  )
  SELECT jsonb_build_object(
    'esperados_hoy', c.esperados,
    'marcaron_hoy', c.marcaron,
    'pct_asistencia_real', CASE WHEN c.esperados > 0 THEN ROUND(100.0 * c.marcaron / c.esperados, 1) ELSE 0 END,
    'presentes', COALESCE((SELECT arr FROM presentes), '[]'::jsonb),
    'ausentes', COALESCE((SELECT arr FROM ausentes), '[]'::jsonb)
  ) INTO v_result FROM counts c;
  RETURN v_result;
END;
$$;
