-- Migration: Add slug to raffles (URL Clean HQ)

-- 1. Create slugify function (handle unaccent and special chars)
CREATE OR REPLACE FUNCTION public.slugify_raffle(title TEXT) RETURNS TEXT AS $$
DECLARE
    slug TEXT;
BEGIN
    -- Lowercase, remove accents (basic version for safety), remove non-alphanumeric, replace spaces with hyphens
    slug := lower(title);
    slug := regexp_replace(slug, '[áàâãä]', 'a', 'g');
    slug := regexp_replace(slug, '[éèêë]', 'e', 'g');
    slug := regexp_replace(slug, '[íìîï]', 'i', 'g');
    slug := regexp_replace(slug, '[óòôõö]', 'o', 'g');
    slug := regexp_replace(slug, '[úùûü]', 'u', 'g');
    slug := regexp_replace(slug, '[ç]', 'c', 'g');
    slug := regexp_replace(slug, '[^a-z0-9\s]', '', 'g');
    slug := trim(both ' ' from slug);
    slug := regexp_replace(slug, '\s+', '-', 'g');
    RETURN slug;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 2. Add slug column
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'raffles' AND column_name = 'slug') THEN
        ALTER TABLE public.raffles ADD COLUMN slug TEXT UNIQUE;
    END IF;
END $$;

-- 3. Update existing records
UPDATE public.raffles SET slug = slugify_raffle(title) WHERE slug IS NULL;

-- 4. Trigger for automatic slug generation
CREATE OR REPLACE FUNCTION public.trg_generate_raffle_slug() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.slug IS NULL OR NEW.slug = '' THEN
        NEW.slug := slugify_raffle(NEW.title);
        -- Uniqueness Check (Collision Handling)
        WHILE EXISTS (SELECT 1 FROM public.raffles WHERE slug = NEW.slug AND id != NEW.id) LOOP
            NEW.slug := NEW.slug || '-' || floor(random() * 999)::text;
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_raffle_slug ON public.raffles;
CREATE TRIGGER trg_generate_raffle_slug
BEFORE INSERT OR UPDATE ON public.raffles
FOR EACH ROW EXECUTE FUNCTION public.trg_generate_raffle_slug();
