import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type UserRole = 'admin' | 'store_owner' | 'user';

export const useUserRole = () => {
  const [role, setRole] = useState<UserRole>('user');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRole = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          setRole('user');
          setLoading(false);
          return;
        }

        // Check if user is admin
        const { data: adminRole } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .eq('role', 'admin')
          .maybeSingle();

        if (adminRole) {
          setRole('admin');
          setLoading(false);
          return;
        }

        // Check if user is store owner
        const { data: ownerRole } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .eq('role', 'store_owner')
          .maybeSingle();

        if (ownerRole) {
          setRole('store_owner');
          setLoading(false);
          return;
        }

        setRole('user');
        setLoading(false);
      } catch (error) {
        console.error('Error fetching user role:', error);
        setRole('user');
        setLoading(false);
      }
    };

    fetchRole();
  }, []);

  return { role, loading };
};
