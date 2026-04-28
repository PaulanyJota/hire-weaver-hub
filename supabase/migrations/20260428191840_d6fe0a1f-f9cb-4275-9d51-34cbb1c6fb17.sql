
-- ============ ENUMS ============
CREATE TYPE public.portal_user_role AS ENUM ('client_user','client_admin','nodo_admin');
CREATE TYPE public.portal_attendance_source AS ENUM ('buk','manual_client','manual_nodo');
CREATE TYPE public.portal_absence_type AS ENUM ('vacaciones','licencia_medica','permiso_sin_goce','permiso_con_goce','maternal','paternal','otro');
CREATE TYPE public.portal_incident_type AS ENUM ('atraso','inasistencia','falta_grave','accidente','observacion','felicitacion','otro');
CREATE TYPE public.portal_approval_status AS ENUM ('pendiente','aprobada','rechazada','cancelada');
CREATE TYPE public.portal_sync_status AS ENUM ('success','partial','failed');

-- ============ portal_companies ============
CREATE TABLE public.portal_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  buk_area_name text NOT NULL UNIQUE,
  rut text,
  logo_url text,
  primary_color text NOT NULL DEFAULT '#1F4E78',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.portal_companies ENABLE ROW LEVEL SECURITY;

-- ============ portal_user_profiles ============
CREATE TABLE public.portal_user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  portal_company_id uuid REFERENCES public.portal_companies(id) ON DELETE RESTRICT,
  role public.portal_user_role NOT NULL DEFAULT 'client_user',
  full_name text NOT NULL,
  phone text,
  active boolean NOT NULL DEFAULT true,
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT portal_user_company_role_chk CHECK (
    (role = 'nodo_admin' AND portal_company_id IS NULL) OR
    (role <> 'nodo_admin' AND portal_company_id IS NOT NULL)
  )
);
ALTER TABLE public.portal_user_profiles ENABLE ROW LEVEL SECURITY;

-- ============ Helper functions (SECURITY DEFINER) ============
CREATE OR REPLACE FUNCTION public.portal_current_user_company_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT portal_company_id FROM public.portal_user_profiles WHERE id = auth.uid() AND active = true $$;

CREATE OR REPLACE FUNCTION public.portal_is_nodo_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.portal_user_profiles WHERE id = auth.uid() AND role = 'nodo_admin' AND active = true) $$;

CREATE OR REPLACE FUNCTION public.portal_is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.portal_user_profiles WHERE id = auth.uid() AND role IN ('client_admin','nodo_admin') AND active = true) $$;

REVOKE EXECUTE ON FUNCTION public.portal_current_user_company_id() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.portal_is_nodo_admin() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.portal_is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.portal_current_user_company_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.portal_is_nodo_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.portal_is_admin() TO authenticated;

-- ============ portal_workers ============
CREATE TABLE public.portal_workers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_company_id uuid NOT NULL REFERENCES public.portal_companies(id) ON DELETE CASCADE,
  buk_employee_id text,
  rut text,
  rut_display text GENERATED ALWAYS AS (
    CASE WHEN rut IS NULL OR length(regexp_replace(rut,'[^0-9kK]','','g')) < 5
      THEN '•••••'
      ELSE '••••••' || right(regexp_replace(rut,'[^0-9kK]','','g'), 5)
    END
  ) STORED,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text,
  phone text,
  hire_date date,
  termination_date date,
  position text,
  area text,
  sub_area text,
  division text,
  cost_center text,
  active boolean NOT NULL DEFAULT true,
  photo_url text,
  buk_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (portal_company_id, buk_employee_id)
);
ALTER TABLE public.portal_workers ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_portal_workers_company ON public.portal_workers(portal_company_id);
CREATE INDEX idx_portal_workers_active ON public.portal_workers(portal_company_id, active);

-- ============ portal_contracts ============
CREATE TABLE public.portal_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL REFERENCES public.portal_workers(id) ON DELETE CASCADE,
  contract_type text,
  start_date date,
  end_date date,
  weekly_hours numeric,
  position text,
  is_current boolean NOT NULL DEFAULT true,
  buk_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.portal_contracts ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_portal_contracts_worker ON public.portal_contracts(worker_id);

-- ============ portal_attendance ============
CREATE TABLE public.portal_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL REFERENCES public.portal_workers(id) ON DELETE CASCADE,
  date date NOT NULL,
  shift_start time,
  shift_end time,
  check_in timestamptz,
  check_out timestamptz,
  worked_hours numeric,
  late_minutes integer,
  source public.portal_attendance_source NOT NULL DEFAULT 'buk',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (worker_id, date)
);
ALTER TABLE public.portal_attendance ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_portal_attendance_worker_date ON public.portal_attendance(worker_id, date);

-- ============ portal_absences ============
CREATE TABLE public.portal_absences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL REFERENCES public.portal_workers(id) ON DELETE CASCADE,
  absence_type public.portal_absence_type NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  business_days integer,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.portal_absences ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_portal_absences_worker ON public.portal_absences(worker_id);
CREATE INDEX idx_portal_absences_dates ON public.portal_absences(start_date, end_date);

-- ============ portal_overtime ============
CREATE TABLE public.portal_overtime (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL REFERENCES public.portal_workers(id) ON DELETE CASCADE,
  date date NOT NULL,
  hours numeric NOT NULL,
  type text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.portal_overtime ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_portal_overtime_worker_date ON public.portal_overtime(worker_id, date);

-- ============ portal_incidents ============
CREATE TABLE public.portal_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL REFERENCES public.portal_workers(id) ON DELETE CASCADE,
  reported_by uuid REFERENCES public.portal_user_profiles(id) ON DELETE SET NULL,
  incident_type public.portal_incident_type NOT NULL,
  date date NOT NULL,
  description text,
  severity smallint CHECK (severity BETWEEN 1 AND 5),
  attachment_url text,
  notified_to_nodo boolean NOT NULL DEFAULT false,
  notified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.portal_incidents ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_portal_incidents_worker ON public.portal_incidents(worker_id);

-- ============ portal_approval_requests ============
CREATE TABLE public.portal_approval_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL REFERENCES public.portal_workers(id) ON DELETE CASCADE,
  request_type public.portal_absence_type NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  reason text,
  status public.portal_approval_status NOT NULL DEFAULT 'pendiente',
  submitted_at timestamptz NOT NULL DEFAULT now(),
  decided_by uuid REFERENCES public.portal_user_profiles(id) ON DELETE SET NULL,
  decided_at timestamptz,
  decision_notes text,
  notified_to_nodo boolean NOT NULL DEFAULT false,
  notified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.portal_approval_requests ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_portal_approvals_worker ON public.portal_approval_requests(worker_id);
CREATE INDEX idx_portal_approvals_status ON public.portal_approval_requests(status);

-- ============ portal_buk_sync_log ============
CREATE TABLE public.portal_buk_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity text NOT NULL,
  portal_company_id uuid REFERENCES public.portal_companies(id) ON DELETE SET NULL,
  status public.portal_sync_status NOT NULL,
  records_total integer DEFAULT 0,
  records_inserted integer DEFAULT 0,
  records_updated integer DEFAULT 0,
  records_failed integer DEFAULT 0,
  error_message text,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);
ALTER TABLE public.portal_buk_sync_log ENABLE ROW LEVEL SECURITY;

-- ============ updated_at triggers ============
CREATE TRIGGER trg_portal_companies_updated BEFORE UPDATE ON public.portal_companies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_portal_user_profiles_updated BEFORE UPDATE ON public.portal_user_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_portal_workers_updated BEFORE UPDATE ON public.portal_workers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_portal_contracts_updated BEFORE UPDATE ON public.portal_contracts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_portal_attendance_updated BEFORE UPDATE ON public.portal_attendance FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_portal_absences_updated BEFORE UPDATE ON public.portal_absences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_portal_overtime_updated BEFORE UPDATE ON public.portal_overtime FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_portal_incidents_updated BEFORE UPDATE ON public.portal_incidents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_portal_approvals_updated BEFORE UPDATE ON public.portal_approval_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ RLS POLICIES ============

-- portal_companies
CREATE POLICY "portal_companies select" ON public.portal_companies FOR SELECT TO authenticated
USING (public.portal_is_nodo_admin() OR id = public.portal_current_user_company_id());
CREATE POLICY "portal_companies all nodo" ON public.portal_companies FOR ALL TO authenticated
USING (public.portal_is_nodo_admin()) WITH CHECK (public.portal_is_nodo_admin());

-- portal_user_profiles
CREATE POLICY "portal_user_profiles self select" ON public.portal_user_profiles FOR SELECT TO authenticated
USING (id = auth.uid() OR public.portal_is_nodo_admin() OR (public.portal_is_admin() AND portal_company_id = public.portal_current_user_company_id()));
CREATE POLICY "portal_user_profiles all nodo" ON public.portal_user_profiles FOR ALL TO authenticated
USING (public.portal_is_nodo_admin()) WITH CHECK (public.portal_is_nodo_admin());
CREATE POLICY "portal_user_profiles self update" ON public.portal_user_profiles FOR UPDATE TO authenticated
USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- portal_workers
CREATE POLICY "portal_workers select" ON public.portal_workers FOR SELECT TO authenticated
USING (public.portal_is_nodo_admin() OR portal_company_id = public.portal_current_user_company_id());
CREATE POLICY "portal_workers all nodo" ON public.portal_workers FOR ALL TO authenticated
USING (public.portal_is_nodo_admin()) WITH CHECK (public.portal_is_nodo_admin());

-- helper inline used in subtable policies via subquery
-- portal_contracts
CREATE POLICY "portal_contracts select" ON public.portal_contracts FOR SELECT TO authenticated
USING (public.portal_is_nodo_admin() OR EXISTS (SELECT 1 FROM public.portal_workers w WHERE w.id = worker_id AND w.portal_company_id = public.portal_current_user_company_id()));
CREATE POLICY "portal_contracts all nodo" ON public.portal_contracts FOR ALL TO authenticated
USING (public.portal_is_nodo_admin()) WITH CHECK (public.portal_is_nodo_admin());

-- portal_attendance
CREATE POLICY "portal_attendance select" ON public.portal_attendance FOR SELECT TO authenticated
USING (public.portal_is_nodo_admin() OR EXISTS (SELECT 1 FROM public.portal_workers w WHERE w.id = worker_id AND w.portal_company_id = public.portal_current_user_company_id()));
CREATE POLICY "portal_attendance insert client" ON public.portal_attendance FOR INSERT TO authenticated
WITH CHECK (
  source = 'manual_client'
  AND EXISTS (SELECT 1 FROM public.portal_workers w WHERE w.id = worker_id AND w.portal_company_id = public.portal_current_user_company_id())
);
CREATE POLICY "portal_attendance all nodo" ON public.portal_attendance FOR ALL TO authenticated
USING (public.portal_is_nodo_admin()) WITH CHECK (public.portal_is_nodo_admin());

-- portal_absences
CREATE POLICY "portal_absences select" ON public.portal_absences FOR SELECT TO authenticated
USING (public.portal_is_nodo_admin() OR EXISTS (SELECT 1 FROM public.portal_workers w WHERE w.id = worker_id AND w.portal_company_id = public.portal_current_user_company_id()));
CREATE POLICY "portal_absences all nodo" ON public.portal_absences FOR ALL TO authenticated
USING (public.portal_is_nodo_admin()) WITH CHECK (public.portal_is_nodo_admin());

-- portal_overtime
CREATE POLICY "portal_overtime select" ON public.portal_overtime FOR SELECT TO authenticated
USING (public.portal_is_nodo_admin() OR EXISTS (SELECT 1 FROM public.portal_workers w WHERE w.id = worker_id AND w.portal_company_id = public.portal_current_user_company_id()));
CREATE POLICY "portal_overtime all nodo" ON public.portal_overtime FOR ALL TO authenticated
USING (public.portal_is_nodo_admin()) WITH CHECK (public.portal_is_nodo_admin());

-- portal_incidents
CREATE POLICY "portal_incidents select" ON public.portal_incidents FOR SELECT TO authenticated
USING (public.portal_is_nodo_admin() OR EXISTS (SELECT 1 FROM public.portal_workers w WHERE w.id = worker_id AND w.portal_company_id = public.portal_current_user_company_id()));
CREATE POLICY "portal_incidents insert client" ON public.portal_incidents FOR INSERT TO authenticated
WITH CHECK (
  reported_by = auth.uid()
  AND EXISTS (SELECT 1 FROM public.portal_workers w WHERE w.id = worker_id AND w.portal_company_id = public.portal_current_user_company_id())
);
CREATE POLICY "portal_incidents all nodo" ON public.portal_incidents FOR ALL TO authenticated
USING (public.portal_is_nodo_admin()) WITH CHECK (public.portal_is_nodo_admin());

-- portal_approval_requests
CREATE POLICY "portal_approvals select" ON public.portal_approval_requests FOR SELECT TO authenticated
USING (public.portal_is_nodo_admin() OR EXISTS (SELECT 1 FROM public.portal_workers w WHERE w.id = worker_id AND w.portal_company_id = public.portal_current_user_company_id()));
CREATE POLICY "portal_approvals update client_admin" ON public.portal_approval_requests FOR UPDATE TO authenticated
USING (
  status = 'pendiente'
  AND public.portal_is_admin()
  AND EXISTS (SELECT 1 FROM public.portal_workers w WHERE w.id = worker_id AND w.portal_company_id = public.portal_current_user_company_id())
)
WITH CHECK (
  status IN ('aprobada','rechazada')
  AND public.portal_is_admin()
  AND EXISTS (SELECT 1 FROM public.portal_workers w WHERE w.id = worker_id AND w.portal_company_id = public.portal_current_user_company_id())
);
CREATE POLICY "portal_approvals all nodo" ON public.portal_approval_requests FOR ALL TO authenticated
USING (public.portal_is_nodo_admin()) WITH CHECK (public.portal_is_nodo_admin());

-- portal_buk_sync_log
CREATE POLICY "portal_buk_sync_log nodo only" ON public.portal_buk_sync_log FOR ALL TO authenticated
USING (public.portal_is_nodo_admin()) WITH CHECK (public.portal_is_nodo_admin());

-- ============ VIEW dashboard metrics ============
CREATE OR REPLACE VIEW public.portal_dashboard_metrics
WITH (security_invoker = true)
AS
SELECT
  c.id AS portal_company_id,
  c.name,
  COUNT(DISTINCT w.id) FILTER (WHERE w.active) AS active_workers,
  COUNT(DISTINCT a.worker_id) FILTER (WHERE CURRENT_DATE BETWEEN a.start_date AND a.end_date) AS currently_absent,
  COALESCE(SUM(o.hours) FILTER (WHERE date_trunc('month', o.date) = date_trunc('month', CURRENT_DATE)), 0) AS overtime_hours_this_month,
  COUNT(DISTINCT ar.id) FILTER (WHERE ar.status = 'pendiente') AS pending_approvals
FROM public.portal_companies c
LEFT JOIN public.portal_workers w ON w.portal_company_id = c.id
LEFT JOIN public.portal_absences a ON a.worker_id = w.id
LEFT JOIN public.portal_overtime o ON o.worker_id = w.id
LEFT JOIN public.portal_approval_requests ar ON ar.worker_id = w.id
GROUP BY c.id, c.name;

-- ============ SEED DATA ============
INSERT INTO public.portal_companies (id, name, buk_area_name, rut, primary_color) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Lucano', 'Lucano', '76.123.456-7', '#1F4E78'),
  ('22222222-2222-2222-2222-222222222222', 'Grupo Alval', 'Grupo Alval', '77.987.654-3', '#1F4E78');

-- Workers Lucano (4)
INSERT INTO public.portal_workers (id, portal_company_id, buk_employee_id, rut, first_name, last_name, email, phone, hire_date, position, area, sub_area, division, cost_center, active) VALUES
  ('a1111111-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','LUC-001','12345678-9','María','González','maria.gonzalez@lucano.cl','+56912345001','2024-03-15','Operaria','Producción','Línea A','Operaciones','CC-LUC-01',true),
  ('a1111111-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','LUC-002','13456789-K','Juan','Pérez','juan.perez@lucano.cl','+56912345002','2024-06-01','Supervisor de turno','Producción','Línea B','Operaciones','CC-LUC-01',true),
  ('a1111111-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111','LUC-003','14567890-1','Carolina','Soto','carolina.soto@lucano.cl','+56912345003','2025-01-20','Bodeguera','Logística','Bodega Central','Operaciones','CC-LUC-02',true),
  ('a1111111-0000-0000-0000-000000000004','11111111-1111-1111-1111-111111111111','LUC-004','15678901-2','Pedro','Muñoz','pedro.munoz@lucano.cl','+56912345004','2025-09-10','Operario','Producción','Línea A','Operaciones','CC-LUC-01',true);

-- Workers Grupo Alval (4)
INSERT INTO public.portal_workers (id, portal_company_id, buk_employee_id, rut, first_name, last_name, email, phone, hire_date, position, area, sub_area, division, cost_center, active) VALUES
  ('a2222222-0000-0000-0000-000000000001','22222222-2222-2222-2222-222222222222','ALV-001','16789012-3','Andrea','Rojas','andrea.rojas@alval.cl','+56922345001','2024-02-10','Cajera','Retail','Tienda Centro','Comercial','CC-ALV-01',true),
  ('a2222222-0000-0000-0000-000000000002','22222222-2222-2222-2222-222222222222','ALV-002','17890123-4','Francisco','Lagos','francisco.lagos@alval.cl','+56922345002','2024-08-01','Jefe de tienda','Retail','Tienda Centro','Comercial','CC-ALV-01',true),
  ('a2222222-0000-0000-0000-000000000003','22222222-2222-2222-2222-222222222222','ALV-003','18901234-5','Patricia','Vega','patricia.vega@alval.cl','+56922345003','2025-04-15','Reponedora','Retail','Tienda Norte','Comercial','CC-ALV-02',true),
  ('a2222222-0000-0000-0000-000000000004','22222222-2222-2222-2222-222222222222','ALV-004','19012345-6','Cristián','Fuentes','cristian.fuentes@alval.cl','+56922345004','2026-01-05','Cajero','Retail','Tienda Norte','Comercial','CC-ALV-02',true);

-- Contratos vigentes (1 por trabajador)
INSERT INTO public.portal_contracts (worker_id, contract_type, start_date, end_date, weekly_hours, position, is_current)
SELECT id, 'Indefinido', hire_date, NULL, 45, position, true FROM public.portal_workers;

-- Ausencias (5)
INSERT INTO public.portal_absences (worker_id, absence_type, start_date, end_date, business_days, reason) VALUES
  ('a1111111-0000-0000-0000-000000000001','vacaciones','2026-04-20','2026-04-30',9,'Vacaciones programadas'),
  ('a1111111-0000-0000-0000-000000000002','licencia_medica','2026-04-25','2026-05-02',6,'Reposo médico'),
  ('a2222222-0000-0000-0000-000000000001','permiso_con_goce','2026-04-28','2026-04-28',1,'Trámite personal'),
  ('a2222222-0000-0000-0000-000000000003','vacaciones','2026-05-05','2026-05-15',9,'Vacaciones'),
  ('a1111111-0000-0000-0000-000000000004','licencia_medica','2026-04-10','2026-04-15',4,'Resfrío');

-- Horas extra (10)
INSERT INTO public.portal_overtime (worker_id, date, hours, type, notes) VALUES
  ('a1111111-0000-0000-0000-000000000001','2026-04-05',2.5,'150%','Cierre de mes'),
  ('a1111111-0000-0000-0000-000000000002','2026-04-08',3.0,'150%','Inventario'),
  ('a1111111-0000-0000-0000-000000000003','2026-04-12',1.5,'150%','Despacho urgente'),
  ('a1111111-0000-0000-0000-000000000004','2026-04-15',2.0,'150%','Producción extra'),
  ('a1111111-0000-0000-0000-000000000001','2026-04-22',2.0,'150%','Pedido especial'),
  ('a2222222-0000-0000-0000-000000000001','2026-04-03',1.0,'150%','Cierre tienda'),
  ('a2222222-0000-0000-0000-000000000002','2026-04-10',2.5,'150%','Inventario'),
  ('a2222222-0000-0000-0000-000000000003','2026-04-14',1.5,'150%','Reposición'),
  ('a2222222-0000-0000-0000-000000000004','2026-04-18',2.0,'150%','Cierre mensual'),
  ('a2222222-0000-0000-0000-000000000002','2026-04-25',3.0,'200%','Inventario domingo');

-- Incidencias (2)
INSERT INTO public.portal_incidents (worker_id, incident_type, date, description, severity, notified_to_nodo) VALUES
  ('a1111111-0000-0000-0000-000000000004','atraso','2026-04-22','Llegó 35 minutos tarde sin aviso',2,false),
  ('a2222222-0000-0000-0000-000000000003','felicitacion','2026-04-20','Excelente atención al cliente reconocida por supervisor',1,false);

-- Solicitudes pendientes (2)
INSERT INTO public.portal_approval_requests (worker_id, request_type, start_date, end_date, reason, status) VALUES
  ('a1111111-0000-0000-0000-000000000003','vacaciones','2026-06-01','2026-06-10','Vacaciones de invierno','pendiente'),
  ('a2222222-0000-0000-0000-000000000004','permiso_sin_goce','2026-05-20','2026-05-22','Asuntos personales','pendiente');
