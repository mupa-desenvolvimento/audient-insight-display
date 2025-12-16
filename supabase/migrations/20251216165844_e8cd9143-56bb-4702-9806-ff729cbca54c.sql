-- =====================================================
-- TENANT SCHEMA PROVISIONING FUNCTIONS
-- =====================================================

-- Function to create a new tenant schema with all required tables
CREATE OR REPLACE FUNCTION public.create_tenant_schema(p_tenant_id uuid, p_schema_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is super admin
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only super admins can create tenant schemas';
  END IF;

  -- Create the schema
  EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', p_schema_name);

  -- Create countries table
  EXECUTE format('
    CREATE TABLE %I.countries (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      code text UNIQUE NOT NULL,
      name text NOT NULL,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    )', p_schema_name);

  -- Create regions table
  EXECUTE format('
    CREATE TABLE %I.regions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      country_id uuid NOT NULL REFERENCES %I.countries(id) ON DELETE CASCADE,
      code text,
      name text NOT NULL,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    )', p_schema_name, p_schema_name);

  -- Create states table
  EXECUTE format('
    CREATE TABLE %I.states (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      region_id uuid NOT NULL REFERENCES %I.regions(id) ON DELETE CASCADE,
      code text NOT NULL,
      name text NOT NULL,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    )', p_schema_name, p_schema_name);

  -- Create cities table
  EXECUTE format('
    CREATE TABLE %I.cities (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      state_id uuid NOT NULL REFERENCES %I.states(id) ON DELETE CASCADE,
      name text NOT NULL,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    )', p_schema_name, p_schema_name);

  -- Create stores table
  EXECUTE format('
    CREATE TABLE %I.stores (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      city_id uuid NOT NULL REFERENCES %I.cities(id) ON DELETE CASCADE,
      code text UNIQUE NOT NULL,
      name text NOT NULL,
      address text,
      bairro text,
      cep text,
      cnpj text,
      regional_responsavel text,
      is_active boolean DEFAULT true,
      metadata jsonb DEFAULT ''{}''::jsonb,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    )', p_schema_name, p_schema_name);

  -- Create media_items table
  EXECUTE format('
    CREATE TABLE %I.media_items (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL,
      type text DEFAULT ''image'',
      file_url text,
      file_size integer,
      duration integer,
      resolution text,
      status text DEFAULT ''active'',
      metadata jsonb,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    )', p_schema_name);

  -- Create channels table
  EXECUTE format('
    CREATE TABLE %I.channels (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL,
      type text DEFAULT ''default'',
      source text DEFAULT ''upload'',
      description text,
      priority integer DEFAULT 0,
      is_active boolean DEFAULT true,
      metadata jsonb,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    )', p_schema_name);

  -- Create playlists table
  EXECUTE format('
    CREATE TABLE %I.playlists (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      channel_id uuid REFERENCES %I.channels(id) ON DELETE SET NULL,
      name text NOT NULL,
      description text,
      is_active boolean DEFAULT true,
      priority integer,
      schedule jsonb,
      start_date date,
      end_date date,
      start_time time,
      end_time time,
      days_of_week integer[],
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    )', p_schema_name, p_schema_name);

  -- Create playlist_items table
  EXECUTE format('
    CREATE TABLE %I.playlist_items (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      playlist_id uuid NOT NULL REFERENCES %I.playlists(id) ON DELETE CASCADE,
      media_id uuid NOT NULL REFERENCES %I.media_items(id) ON DELETE CASCADE,
      position integer DEFAULT 0,
      duration_override integer,
      created_at timestamptz DEFAULT now()
    )', p_schema_name, p_schema_name, p_schema_name);

  -- Create display_profiles table
  EXECUTE format('
    CREATE TABLE %I.display_profiles (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL,
      resolution text DEFAULT ''1080x1920'',
      orientation text DEFAULT ''portrait'',
      has_touch boolean DEFAULT false,
      default_layout text,
      permitted_channels text[],
      offline_behavior text,
      idle_behavior text,
      metadata jsonb,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    )', p_schema_name);

  -- Create devices table
  EXECUTE format('
    CREATE TABLE %I.devices (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      store_id uuid REFERENCES %I.stores(id) ON DELETE SET NULL,
      display_profile_id uuid REFERENCES %I.display_profiles(id) ON DELETE SET NULL,
      device_code text UNIQUE NOT NULL,
      name text NOT NULL,
      status text DEFAULT ''offline'',
      is_active boolean DEFAULT true,
      camera_enabled boolean DEFAULT false,
      resolution text,
      last_seen_at timestamptz,
      metadata jsonb,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    )', p_schema_name, p_schema_name, p_schema_name);

  -- Create device_groups table
  EXECUTE format('
    CREATE TABLE %I.device_groups (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      store_id uuid REFERENCES %I.stores(id) ON DELETE SET NULL,
      name text NOT NULL,
      description text,
      screen_type text,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    )', p_schema_name, p_schema_name);

  -- Create device_group_members table
  EXECUTE format('
    CREATE TABLE %I.device_group_members (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      group_id uuid NOT NULL REFERENCES %I.device_groups(id) ON DELETE CASCADE,
      device_id uuid NOT NULL REFERENCES %I.devices(id) ON DELETE CASCADE,
      created_at timestamptz DEFAULT now(),
      UNIQUE(group_id, device_id)
    )', p_schema_name, p_schema_name, p_schema_name);

  -- Create device_group_channels table
  EXECUTE format('
    CREATE TABLE %I.device_group_channels (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      group_id uuid NOT NULL REFERENCES %I.device_groups(id) ON DELETE CASCADE,
      channel_id uuid NOT NULL REFERENCES %I.channels(id) ON DELETE CASCADE,
      position integer DEFAULT 0,
      created_at timestamptz DEFAULT now(),
      UNIQUE(group_id, channel_id)
    )', p_schema_name, p_schema_name, p_schema_name);

  -- Create user_roles table (tenant-specific roles)
  EXECUTE format('
    CREATE TABLE %I.user_roles (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL,
      role text NOT NULL,
      created_at timestamptz DEFAULT now(),
      UNIQUE(user_id, role)
    )', p_schema_name);

  -- Create user_permissions table
  EXECUTE format('
    CREATE TABLE %I.user_permissions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL,
      entity_type text NOT NULL,
      entity_id uuid NOT NULL,
      created_at timestamptz DEFAULT now(),
      UNIQUE(user_id, entity_type, entity_id)
    )', p_schema_name);

  -- Create import_logs table
  EXECUTE format('
    CREATE TABLE %I.import_logs (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid,
      type text NOT NULL,
      file_name text,
      status text DEFAULT ''pending'',
      total_rows integer,
      success_rows integer,
      error_rows integer,
      errors jsonb,
      completed_at timestamptz,
      created_at timestamptz DEFAULT now()
    )', p_schema_name);

  -- Update tenant record with migration info
  UPDATE public.tenants 
  SET last_migration_at = now(), migration_version = 1
  WHERE id = p_tenant_id;

  -- Log the action
  INSERT INTO public.tenant_admin_logs (actor_id, actor_email, action, tenant_id, details)
  SELECT auth.uid(), 
         (SELECT email FROM auth.users WHERE id = auth.uid()),
         'create_schema',
         p_tenant_id,
         jsonb_build_object('schema_name', p_schema_name);
END;
$$;

-- Function to drop a tenant schema (with safety confirmation)
CREATE OR REPLACE FUNCTION public.drop_tenant_schema(p_tenant_id uuid, p_schema_name text, p_confirm text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is super admin
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only super admins can drop tenant schemas';
  END IF;

  -- Require explicit confirmation
  IF p_confirm != 'CONFIRM_DELETE_' || p_schema_name THEN
    RAISE EXCEPTION 'Invalid confirmation. Use CONFIRM_DELETE_<schema_name>';
  END IF;

  -- Drop the schema and all its contents
  EXECUTE format('DROP SCHEMA IF EXISTS %I CASCADE', p_schema_name);

  -- Log the action
  INSERT INTO public.tenant_admin_logs (actor_id, actor_email, action, tenant_id, details)
  SELECT auth.uid(),
         (SELECT email FROM auth.users WHERE id = auth.uid()),
         'drop_schema',
         p_tenant_id,
         jsonb_build_object('schema_name', p_schema_name);
END;
$$;

-- Function to list all tenant schemas
CREATE OR REPLACE FUNCTION public.list_tenant_schemas()
RETURNS TABLE(tenant_id uuid, tenant_name text, schema_name text, is_active boolean, created_at timestamptz)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only super admins can list all schemas
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only super admins can list tenant schemas';
  END IF;

  RETURN QUERY
  SELECT t.id, t.name, t.schema_name, t.is_active, t.created_at
  FROM public.tenants t
  ORDER BY t.name;
END;
$$;