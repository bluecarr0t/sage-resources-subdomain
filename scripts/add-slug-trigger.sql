-- Optional: Auto-generate slug trigger for sage-glamping-data table
-- This trigger automatically generates a slug from property_name if slug is NULL on INSERT/UPDATE
-- Run this SQL in your Supabase SQL Editor
--
-- NOTE: This trigger generates slugs individually. To ensure all records with the same 
-- property_name share the same slug, you may want to handle this at the application level
-- or run a script after inserts to sync slugs by property_name.

-- Create function to generate slug from property name
CREATE OR REPLACE FUNCTION generate_slug_from_property_name()
RETURNS TRIGGER AS $$
BEGIN
  -- Only generate slug if it's NULL or empty and property_name exists
  IF (NEW.slug IS NULL OR NEW.slug = '') AND NEW.property_name IS NOT NULL AND NEW.property_name != '' THEN
    -- Generate slug using same logic as TypeScript slugifyPropertyName function
    -- First transliterate accented characters to ASCII
    NEW.slug := LOWER(TRIM(NEW.property_name));
    
    -- Transliterate common accented characters to ASCII equivalents
    -- Including macron characters (ā, ē, ī, ō, ū) for Hawaiian and other languages
    -- Apply all replacements in sequence
    NEW.slug := REPLACE(NEW.slug, 'à', 'a');
    NEW.slug := REPLACE(NEW.slug, 'á', 'a');
    NEW.slug := REPLACE(NEW.slug, 'â', 'a');
    NEW.slug := REPLACE(NEW.slug, 'ã', 'a');
    NEW.slug := REPLACE(NEW.slug, 'ä', 'a');
    NEW.slug := REPLACE(NEW.slug, 'å', 'a');
    NEW.slug := REPLACE(NEW.slug, 'ā', 'a');
    NEW.slug := REPLACE(NEW.slug, 'è', 'e');
    NEW.slug := REPLACE(NEW.slug, 'é', 'e');
    NEW.slug := REPLACE(NEW.slug, 'ê', 'e');
    NEW.slug := REPLACE(NEW.slug, 'ë', 'e');
    NEW.slug := REPLACE(NEW.slug, 'ē', 'e');
    NEW.slug := REPLACE(NEW.slug, 'ì', 'i');
    NEW.slug := REPLACE(NEW.slug, 'í', 'i');
    NEW.slug := REPLACE(NEW.slug, 'î', 'i');
    NEW.slug := REPLACE(NEW.slug, 'ï', 'i');
    NEW.slug := REPLACE(NEW.slug, 'ī', 'i');
    NEW.slug := REPLACE(NEW.slug, 'ò', 'o');
    NEW.slug := REPLACE(NEW.slug, 'ó', 'o');
    NEW.slug := REPLACE(NEW.slug, 'ô', 'o');
    NEW.slug := REPLACE(NEW.slug, 'õ', 'o');
    NEW.slug := REPLACE(NEW.slug, 'ö', 'o');
    NEW.slug := REPLACE(NEW.slug, 'ø', 'o');
    NEW.slug := REPLACE(NEW.slug, 'ō', 'o');
    NEW.slug := REPLACE(NEW.slug, 'ù', 'u');
    NEW.slug := REPLACE(NEW.slug, 'ú', 'u');
    NEW.slug := REPLACE(NEW.slug, 'û', 'u');
    NEW.slug := REPLACE(NEW.slug, 'ü', 'u');
    NEW.slug := REPLACE(NEW.slug, 'ū', 'u');
    NEW.slug := REPLACE(NEW.slug, 'ç', 'c');
    NEW.slug := REPLACE(NEW.slug, 'ñ', 'n');
    NEW.slug := REPLACE(NEW.slug, 'ý', 'y');
    NEW.slug := REPLACE(NEW.slug, 'ÿ', 'y');
    
    -- Remove special characters
    NEW.slug := REGEXP_REPLACE(NEW.slug, '[^\w\s-]', '', 'g');
    
    -- Replace spaces with hyphens
    NEW.slug := REGEXP_REPLACE(NEW.slug, '\s+', '-', 'g');
    
    -- Remove multiple consecutive hyphens
    NEW.slug := REGEXP_REPLACE(NEW.slug, '-+', '-', 'g');
    
    -- Trim
    NEW.slug := TRIM(NEW.slug);
    
    -- Check if this property_name already has a slug in the database
    -- If so, use that slug to ensure consistency
    IF NEW.slug IS NOT NULL AND NEW.slug != '' THEN
      SELECT slug INTO NEW.slug
      FROM "sage-glamping-data"
      WHERE property_name = NEW.property_name
        AND slug IS NOT NULL
        AND slug != ''
        AND id != COALESCE(NEW.id, 0)  -- Exclude current record if updating
      LIMIT 1;
      
      -- If no existing slug found, keep the generated one
      -- Otherwise, use the existing slug from another record with same property_name
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for INSERT
DROP TRIGGER IF EXISTS set_slug_before_insert ON "sage-glamping-data";
CREATE TRIGGER set_slug_before_insert
BEFORE INSERT ON "sage-glamping-data"
FOR EACH ROW
EXECUTE FUNCTION generate_slug_from_property_name();

-- Create trigger for UPDATE (only if property_name changes)
DROP TRIGGER IF EXISTS set_slug_before_update ON "sage-glamping-data";
CREATE TRIGGER set_slug_before_update
BEFORE UPDATE ON "sage-glamping-data"
FOR EACH ROW
WHEN (NEW.property_name IS DISTINCT FROM OLD.property_name OR (NEW.slug IS NULL AND OLD.slug IS NOT NULL))
EXECUTE FUNCTION generate_slug_from_property_name();

-- Add comment
COMMENT ON FUNCTION generate_slug_from_property_name() IS 
'Auto-generates slug from property_name if slug is NULL. Ensures records with same property_name share the same slug.';
