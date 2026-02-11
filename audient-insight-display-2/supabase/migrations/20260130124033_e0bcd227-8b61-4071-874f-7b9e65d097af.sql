-- Add unique constraints for tenant-scoped geography tables
-- This allows ON CONFLICT to work properly for upserts

-- Countries: unique constraint on (code, tenant_id)
ALTER TABLE public.countries 
DROP CONSTRAINT IF EXISTS countries_code_tenant_unique;

ALTER TABLE public.countries 
ADD CONSTRAINT countries_code_tenant_unique UNIQUE (code, tenant_id);

-- Regions: unique constraint on (name, country_id, tenant_id)
ALTER TABLE public.regions 
DROP CONSTRAINT IF EXISTS regions_name_country_tenant_unique;

ALTER TABLE public.regions 
ADD CONSTRAINT regions_name_country_tenant_unique UNIQUE (name, country_id, tenant_id);

-- States: unique constraint on (code, region_id, tenant_id)
ALTER TABLE public.states 
DROP CONSTRAINT IF EXISTS states_code_region_tenant_unique;

ALTER TABLE public.states 
ADD CONSTRAINT states_code_region_tenant_unique UNIQUE (code, region_id, tenant_id);

-- Cities: unique constraint on (name, state_id, tenant_id)
ALTER TABLE public.cities 
DROP CONSTRAINT IF EXISTS cities_name_state_tenant_unique;

ALTER TABLE public.cities 
ADD CONSTRAINT cities_name_state_tenant_unique UNIQUE (name, state_id, tenant_id);

-- Stores: unique constraint on (code, tenant_id)
ALTER TABLE public.stores 
DROP CONSTRAINT IF EXISTS stores_code_tenant_unique;

ALTER TABLE public.stores 
ADD CONSTRAINT stores_code_tenant_unique UNIQUE (code, tenant_id);