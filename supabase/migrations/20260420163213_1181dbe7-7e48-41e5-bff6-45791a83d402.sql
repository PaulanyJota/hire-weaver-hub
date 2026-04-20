DROP INDEX IF EXISTS postulantes_unique_nombre_email_tel;
DROP INDEX IF EXISTS postulantes_unique_nombre_telefono;
DROP INDEX IF EXISTS postulantes_unique_nombre_email;
DROP INDEX IF EXISTS postulantes_unique_nombre_only;

UPDATE postulantes
SET nombre = trim(both '"' from trim(nombre))
WHERE nombre LIKE '"%' OR nombre LIKE '%"';

UPDATE postulantes SET email = NULL WHERE email = '' OR trim(email) = '';
UPDATE postulantes SET telefono = NULL WHERE telefono = '' OR trim(telefono) = '';

-- Dedup by normalized name + (phone or email)
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY
        lower(trim(regexp_replace(nombre, '"', '', 'g'))),
        COALESCE(lower(trim(telefono)), lower(trim(email)), id::text)
      ORDER BY
        (CASE WHEN telefono IS NOT NULL THEN 4 ELSE 0 END
         + CASE WHEN email IS NOT NULL THEN 2 ELSE 0 END
         + CASE WHEN cv_url IS NOT NULL AND cv_url <> '' THEN 1 ELSE 0 END
        ) DESC,
        created_at DESC
    ) AS rn
  FROM postulantes
)
DELETE FROM postulantes WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- For each name with a contact-bearing record, drop the contactless siblings (they're scraper noise)
WITH name_groups AS (
  SELECT lower(trim(regexp_replace(nombre, '"', '', 'g'))) AS norm_name
  FROM postulantes
  WHERE telefono IS NOT NULL OR email IS NOT NULL
  GROUP BY 1
)
DELETE FROM postulantes p
WHERE p.telefono IS NULL
  AND p.email IS NULL
  AND lower(trim(regexp_replace(p.nombre, '"', '', 'g'))) IN (SELECT norm_name FROM name_groups);

CREATE OR REPLACE FUNCTION public.normalize_postulante_nombre(n text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT lower(trim(regexp_replace(COALESCE(n, ''), '"', '', 'g')));
$$;

CREATE UNIQUE INDEX postulantes_unique_nombre_telefono
ON postulantes (public.normalize_postulante_nombre(nombre), lower(trim(telefono)))
WHERE telefono IS NOT NULL;

CREATE UNIQUE INDEX postulantes_unique_nombre_email
ON postulantes (public.normalize_postulante_nombre(nombre), lower(trim(email)))
WHERE telefono IS NULL AND email IS NOT NULL;