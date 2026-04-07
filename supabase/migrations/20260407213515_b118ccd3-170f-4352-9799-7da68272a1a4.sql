
CREATE TABLE public.vacantes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cargo TEXT NOT NULL,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE NOT NULL,
  tipo TEXT DEFAULT 'Reclutamiento',
  ubicacion TEXT DEFAULT '',
  renta TEXT DEFAULT '',
  estado TEXT DEFAULT 'Activa',
  responsable_id TEXT DEFAULT 'JRB',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.vacantes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to vacantes" ON public.vacantes
  FOR ALL USING (true) WITH CHECK (true);
