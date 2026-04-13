
-- Step 1: Remove duplicates, keeping only the most recent record per (nombre, email, telefono)
DELETE FROM postulantes
WHERE id NOT IN (
  SELECT DISTINCT ON (lower(trim(nombre)), lower(trim(COALESCE(email, ''))), lower(trim(COALESCE(telefono, ''))))
    id
  FROM postulantes
  ORDER BY lower(trim(nombre)), lower(trim(COALESCE(email, ''))), lower(trim(COALESCE(telefono, ''))), created_at DESC
);

-- Step 2: Create a unique index to prevent future duplicates
CREATE UNIQUE INDEX postulantes_unique_nombre_email_tel
ON postulantes (lower(trim(nombre)), lower(trim(COALESCE(email, ''))), lower(trim(COALESCE(telefono, ''))));
