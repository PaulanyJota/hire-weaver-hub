-- Reemplazar políticas USING(true) por auth.uid() IS NOT NULL
DROP POLICY IF EXISTS "Authenticated full access" ON public.postulantes;
DROP POLICY IF EXISTS "Authenticated full access" ON public.conversaciones;
DROP POLICY IF EXISTS "Authenticated full access" ON public.clientes;
DROP POLICY IF EXISTS "Authenticated full access" ON public.vacantes;

CREATE POLICY "Authenticated access" ON public.postulantes
  FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated access" ON public.conversaciones
  FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated access" ON public.clientes
  FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated access" ON public.vacantes
  FOR ALL TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Hacer el bucket cvs privado y reemplazar SELECT público por SELECT authenticated
UPDATE storage.buckets SET public = false WHERE id = 'cvs';

DROP POLICY IF EXISTS "cvs_public_read_individual" ON storage.objects;

CREATE POLICY "cvs_authenticated_read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'cvs');