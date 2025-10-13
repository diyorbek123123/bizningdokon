// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: { ...corsHeaders } });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: req.headers.get('Authorization') || '' } },
    });

    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Validate user and admin role
    const { data: userData, error: userError } = await authClient.auth.getUser();
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const userId = userData.user.id;
    const { data: isAdminData, error: roleError } = await adminClient
      .from('user_roles')
      .select('id')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleError || !isAdminData) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Fetch owners
    const { data: roles, error: rolesError } = await adminClient
      .from('user_roles')
      .select('user_id')
      .eq('role', 'store_owner');

    if (rolesError) throw rolesError;
    const ownerIds = (roles || []).map((r: any) => r.user_id);

    if (ownerIds.length === 0) {
      return new Response(JSON.stringify({ owners: [] }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const { data: profiles, error: profilesError } = await adminClient
      .from('profiles')
      .select('id, email, full_name, created_at')
      .in('id', ownerIds);
    if (profilesError) throw profilesError;

    // Fetch stores for all owners in one query
    const { data: stores, error: storesError } = await adminClient
      .from('stores')
      .select('id, name, owner_id')
      .in('owner_id', ownerIds);
    if (storesError) throw storesError;

    const owners = (profiles || []).map((p: any) => ({
      id: p.id,
      email: p.email,
      full_name: p.full_name,
      created_at: p.created_at,
      stores: (stores || []).filter((s: any) => s.owner_id === p.id).map((s: any) => ({ id: s.id, name: s.name })),
    }));

    return new Response(JSON.stringify({ owners }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
};

// Default export for Deno
export default handler;
