
-- Add new statuses for document requests workflow
ALTER TYPE portal_approval_status ADD VALUE IF NOT EXISTS 'en_proceso';
ALTER TYPE portal_approval_status ADD VALUE IF NOT EXISTS 'completada';

-- Make absence-specific fields nullable so document-type requests can be inserted
ALTER TABLE public.portal_approval_requests ALTER COLUMN worker_id DROP NOT NULL;
ALTER TABLE public.portal_approval_requests ALTER COLUMN start_date DROP NOT NULL;
ALTER TABLE public.portal_approval_requests ALTER COLUMN end_date DROP NOT NULL;

-- Allow client_admin / nodo_admin to insert document requests
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='portal_approval_requests'
      AND policyname='portal_admins_insert_doc_requests'
  ) THEN
    CREATE POLICY portal_admins_insert_doc_requests
      ON public.portal_approval_requests
      FOR INSERT TO authenticated
      WITH CHECK (public.portal_is_admin());
  END IF;
END$$;
