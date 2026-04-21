-- Tabla de documentos legales por empresa
CREATE TABLE public.legal_documentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_key TEXT NOT NULL,
  nombre TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  uploaded_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_legal_documentos_empresa ON public.legal_documentos(empresa_key);

ALTER TABLE public.legal_documentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated access legal_documentos"
ON public.legal_documentos
FOR ALL
TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Bucket privado para documentos legales
INSERT INTO storage.buckets (id, name, public)
VALUES ('legal-docs', 'legal-docs', false)
ON CONFLICT (id) DO NOTHING;

-- Policies del bucket
CREATE POLICY "Authenticated read legal-docs"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'legal-docs');

CREATE POLICY "Authenticated upload legal-docs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'legal-docs');

CREATE POLICY "Authenticated update legal-docs"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'legal-docs');

CREATE POLICY "Authenticated delete legal-docs"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'legal-docs');