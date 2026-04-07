
CREATE TABLE public.clientes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  industria TEXT,
  contacto TEXT,
  email TEXT,
  estado TEXT NOT NULL DEFAULT 'Activo',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to clientes" ON public.clientes
  FOR ALL USING (true) WITH CHECK (true);

-- Seed with existing mock data
INSERT INTO public.clientes (nombre, industria, contacto, email, estado) VALUES
  ('TechCorp Solutions', 'Tecnología', 'Ana Silva', 'ana@techcorp.cl', 'Activo'),
  ('Retail S.A.', 'Retail', 'Carlos Pinto', 'carlos@retailsa.cl', 'Activo'),
  ('Europcar', 'Rent a Car', '', '', 'Activo'),
  ('Nodo Talentos', 'Reclutamiento', '', '', 'Activo'),
  ('Cliente Logístico', 'Logística', '', '', 'Activo'),
  ('Cliente Servicios', 'Servicios', '', '', 'Activo');
