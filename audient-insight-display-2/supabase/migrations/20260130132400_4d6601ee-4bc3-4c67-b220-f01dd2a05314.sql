-- Drop the remaining old unique constraint on code
ALTER TABLE public.countries DROP CONSTRAINT IF EXISTS countries_code_key;