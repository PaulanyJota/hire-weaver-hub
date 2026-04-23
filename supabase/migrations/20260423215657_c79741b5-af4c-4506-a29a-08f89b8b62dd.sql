-- Tabla de leads comerciales (pipeline comercial)
CREATE TABLE public.leads_comerciales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa TEXT NOT NULL,
  contacto TEXT,
  cargo TEXT,
  email TEXT,
  telefono TEXT,
  tipo_empresa TEXT,
  ciudad TEXT,
  comuna TEXT,
  region TEXT,
  pais TEXT DEFAULT 'Chile',
  sitio_web TEXT,
  prioridad TEXT NOT NULL DEFAULT 'Media',
  origen TEXT,
  estado_verificacion TEXT,
  etapa TEXT NOT NULL DEFAULT 'Prospecto',
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.leads_comerciales ENABLE ROW LEVEL SECURITY;

-- Acceso para usuarios autenticados (mismo patrón que clientes/vacantes)
CREATE POLICY "Authenticated access leads_comerciales"
ON public.leads_comerciales
FOR ALL
TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Función reutilizable para updated_at (idempotente)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger para mantener updated_at
CREATE TRIGGER update_leads_comerciales_updated_at
BEFORE UPDATE ON public.leads_comerciales
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Índice para evitar duplicados por nombre de empresa (case-insensitive)
CREATE UNIQUE INDEX idx_leads_comerciales_empresa_unique
ON public.leads_comerciales (lower(trim(empresa)));

-- Índices para filtros frecuentes
CREATE INDEX idx_leads_comerciales_etapa ON public.leads_comerciales (etapa);
CREATE INDEX idx_leads_comerciales_prioridad ON public.leads_comerciales (prioridad);