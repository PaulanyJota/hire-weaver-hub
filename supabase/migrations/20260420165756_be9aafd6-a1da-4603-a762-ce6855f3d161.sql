-- 1. Roles enum + tabla user_roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 2. Función security definer (evita recursión RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 3. Políticas user_roles
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4. Trigger: auto-asigna 'admin' a @nodotalentos.cl, sino 'user'
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email ILIKE '%@nodotalentos.cl' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();

-- 5. Fix search_path en función existente
ALTER FUNCTION public.normalize_postulante_nombre(text) SET search_path = public;

-- 6. Endurecer RLS de tablas de negocio (solo authenticated)
DROP POLICY IF EXISTS "Allow all" ON public.postulantes;
DROP POLICY IF EXISTS "Allow all" ON public.conversaciones;
DROP POLICY IF EXISTS "Allow all access to clientes" ON public.clientes;
DROP POLICY IF EXISTS "Allow all access to vacantes" ON public.vacantes;

CREATE POLICY "Authenticated full access" ON public.postulantes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated full access" ON public.conversaciones
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated full access" ON public.clientes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated full access" ON public.vacantes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 7. Bucket cvs: quitar listado público, mantener lectura por URL pública
DROP POLICY IF EXISTS "Public read cvs" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "cvs_public_read" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload cvs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update cvs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete cvs" ON storage.objects;

-- Lectura pública individual (URLs siguen funcionando), pero list de bucket solo authenticated
CREATE POLICY "cvs_public_read_individual"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'cvs' AND name IS NOT NULL);

CREATE POLICY "cvs_authenticated_write"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'cvs');

CREATE POLICY "cvs_authenticated_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'cvs');

CREATE POLICY "cvs_authenticated_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'cvs');