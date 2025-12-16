import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface UserTenantMapping {
  id: string;
  user_id: string;
  tenant_id: string;
  is_tenant_admin: boolean | null;
  created_at: string | null;
  user?: UserProfile;
}

export function useUserTenantMappings(tenantId?: string) {
  const [mappings, setMappings] = useState<UserTenantMapping[]>([]);
  const [availableUsers, setAvailableUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMappings = async () => {
    if (!tenantId) {
      setMappings([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      // Fetch mappings for this tenant
      const { data: mappingsData, error: mappingsError } = await supabase
        .from('user_tenant_mappings')
        .select('*')
        .eq('tenant_id', tenantId);

      if (mappingsError) throw mappingsError;

      // Fetch profiles for mapped users
      if (mappingsData && mappingsData.length > 0) {
        const userIds = mappingsData.map(m => m.user_id);
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('*')
          .in('id', userIds);

        if (profilesError) throw profilesError;

        // Combine mappings with user profiles
        const mappingsWithUsers = mappingsData.map(mapping => ({
          ...mapping,
          user: profiles?.find(p => p.id === mapping.user_id)
        }));

        setMappings(mappingsWithUsers);
      } else {
        setMappings([]);
      }
    } catch (error) {
      console.error('Error fetching mappings:', error);
      toast.error('Erro ao carregar usuários do tenant');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAvailableUsers = async () => {
    try {
      // Fetch all profiles
      const { data: allProfiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('email');

      if (profilesError) throw profilesError;

      if (!tenantId) {
        setAvailableUsers(allProfiles || []);
        return;
      }

      // Fetch existing mappings for this tenant
      const { data: existingMappings, error: mappingsError } = await supabase
        .from('user_tenant_mappings')
        .select('user_id')
        .eq('tenant_id', tenantId);

      if (mappingsError) throw mappingsError;

      // Filter out users already assigned to this tenant
      const assignedUserIds = existingMappings?.map(m => m.user_id) || [];
      const available = (allProfiles || []).filter(
        profile => !assignedUserIds.includes(profile.id)
      );

      setAvailableUsers(available);
    } catch (error) {
      console.error('Error fetching available users:', error);
    }
  };

  useEffect(() => {
    fetchMappings();
    fetchAvailableUsers();
  }, [tenantId]);

  const addUserToTenant = async (userId: string, isTenantAdmin: boolean = false) => {
    if (!tenantId) return;

    try {
      const { error } = await supabase
        .from('user_tenant_mappings')
        .insert({
          user_id: userId,
          tenant_id: tenantId,
          is_tenant_admin: isTenantAdmin
        });

      if (error) throw error;

      await fetchMappings();
      await fetchAvailableUsers();
      toast.success('Usuário adicionado ao tenant');
    } catch (error: unknown) {
      const err = error as { code?: string };
      if (err.code === '23505') {
        toast.error('Usuário já está associado a este tenant');
      } else {
        toast.error('Erro ao adicionar usuário');
      }
      throw error;
    }
  };

  const removeUserFromTenant = async (mappingId: string) => {
    try {
      const { error } = await supabase
        .from('user_tenant_mappings')
        .delete()
        .eq('id', mappingId);

      if (error) throw error;

      await fetchMappings();
      await fetchAvailableUsers();
      toast.success('Usuário removido do tenant');
    } catch (error) {
      toast.error('Erro ao remover usuário');
      throw error;
    }
  };

  const toggleTenantAdmin = async (mappingId: string, isAdmin: boolean) => {
    try {
      const { error } = await supabase
        .from('user_tenant_mappings')
        .update({ is_tenant_admin: isAdmin })
        .eq('id', mappingId);

      if (error) throw error;

      await fetchMappings();
      toast.success(isAdmin ? 'Usuário promovido a admin' : 'Admin removido');
    } catch (error) {
      toast.error('Erro ao atualizar permissão');
      throw error;
    }
  };

  return {
    mappings,
    availableUsers,
    isLoading,
    refetch: () => {
      fetchMappings();
      fetchAvailableUsers();
    },
    addUserToTenant,
    removeUserFromTenant,
    toggleTenantAdmin
  };
}
