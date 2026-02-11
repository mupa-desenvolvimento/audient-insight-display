-- Drop the old unique constraint on just name (causing the conflict)
ALTER TABLE public.countries DROP CONSTRAINT IF EXISTS countries_name_key;

-- Also check and drop any other old constraints that might conflict
ALTER TABLE public.regions DROP CONSTRAINT IF EXISTS regions_name_key;
ALTER TABLE public.states DROP CONSTRAINT IF EXISTS states_code_key;
ALTER TABLE public.stores DROP CONSTRAINT IF EXISTS stores_code_key;