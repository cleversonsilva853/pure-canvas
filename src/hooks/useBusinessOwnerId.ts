import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useBusinessOwnerId = () => {
  const { user } = useAuth();

  const { data: ownerId } = useQuery({
    queryKey: ['business_owner_id', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_business_owner_id', { _user_id: user!.id });
      if (error) throw error;
      return data as string;
    },
    enabled: !!user,
    staleTime: Infinity,
  });

  return ownerId ?? user?.id;
};
