import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface UserCompany {
  id: string;
  name: string;
  slug: string;
  tenant_id: string | null;
}

export function useUserCompany() {
  const { user } = useAuth();

  const { data: company, isLoading, error } = useQuery({
    queryKey: ["user-company", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // First get the user's tenant
      const { data: mapping, error: mappingError } = await supabase
        .from("user_tenant_mappings")
        .select("tenant_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (mappingError) throw mappingError;
      if (!mapping?.tenant_id) return null;

      // Then get the company for that tenant
      const { data: companies, error: companiesError } = await supabase
        .from("companies")
        .select("id, name, slug, tenant_id")
        .eq("tenant_id", mapping.tenant_id)
        .eq("is_active", true)
        .limit(1);

      if (companiesError) throw companiesError;
      
      return companies && companies.length > 0 ? companies[0] as UserCompany : null;
    },
    enabled: !!user?.id,
  });

  return {
    company,
    isLoading,
    error,
  };
}
