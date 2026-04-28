
-- Restrict postulantes (candidate PII) to admins only
DROP POLICY IF EXISTS "Authenticated access" ON public.postulantes;
CREATE POLICY "Admins manage postulantes"
  ON public.postulantes FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Restrict clientes to admins only
DROP POLICY IF EXISTS "Authenticated access" ON public.clientes;
CREATE POLICY "Admins manage clientes"
  ON public.clientes FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Restrict conversaciones to admins only
DROP POLICY IF EXISTS "Authenticated access" ON public.conversaciones;
CREATE POLICY "Admins manage conversaciones"
  ON public.conversaciones FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Restrict leads_comerciales to admins only
DROP POLICY IF EXISTS "Authenticated access leads_comerciales" ON public.leads_comerciales;
CREATE POLICY "Admins manage leads_comerciales"
  ON public.leads_comerciales FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Restrict legal_documentos to admins only (table-level)
DROP POLICY IF EXISTS "Authenticated access legal_documentos" ON public.legal_documentos;
CREATE POLICY "Admins manage legal_documentos"
  ON public.legal_documentos FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Restrict vacantes from public to authenticated admins
DROP POLICY IF EXISTS "pol_vacantes" ON public.vacantes;
CREATE POLICY "Admins manage vacantes"
  ON public.vacantes FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Storage: remove public CV policies, keep authenticated-only ones
DROP POLICY IF EXISTS "Anyone can delete CVs" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update CVs" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload CVs" ON storage.objects;
DROP POLICY IF EXISTS "CVs are publicly accessible" ON storage.objects;

-- Storage: tighten legal-docs to ownership via legal_documentos.uploaded_by
DROP POLICY IF EXISTS "Authenticated read legal-docs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update legal-docs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete legal-docs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload legal-docs" ON storage.objects;

CREATE POLICY "Admins read legal-docs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'legal-docs'
    AND public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins upload legal-docs"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'legal-docs'
    AND public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Owner or admin update legal-docs"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'legal-docs'
    AND (
      public.has_role(auth.uid(), 'admin')
      OR EXISTS (
        SELECT 1 FROM public.legal_documentos ld
        WHERE ld.storage_path = storage.objects.name
          AND ld.uploaded_by = auth.uid()
      )
    )
  );

CREATE POLICY "Owner or admin delete legal-docs"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'legal-docs'
    AND (
      public.has_role(auth.uid(), 'admin')
      OR EXISTS (
        SELECT 1 FROM public.legal_documentos ld
        WHERE ld.storage_path = storage.objects.name
          AND ld.uploaded_by = auth.uid()
      )
    )
  );
