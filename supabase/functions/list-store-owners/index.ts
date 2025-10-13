// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!url || !anonKey || !serviceKey) {
      return new Response(JSON.stringify({ error: "Server not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auth client with the caller's JWT
    const authClient = createClient(url, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await authClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Service role client for privileged reads
    const adminClient = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Ensure caller is an admin
    const { data: isAdmin, error: roleError } = await adminClient
      .from("user_roles")
      .select("id")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError || !isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get all store owners
    const { data: roles, error: rolesError } = await adminClient
      .from("user_roles")
      .select("user_id")
      .eq("role", "store_owner");
    if (rolesError) throw rolesError;

    const ownerIds = (roles || []).map((r: any) => r.user_id);
    if (ownerIds.length === 0) {
      return new Response(JSON.stringify({ owners: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [{ data: profiles, error: profilesError }, { data: stores, error: storesError }] = await Promise.all([
      adminClient.from("profiles").select("id, email, full_name, created_at").in("id", ownerIds),
      adminClient.from("stores").select("id, name, owner_id").in("owner_id", ownerIds),
    ]);
    if (profilesError) throw profilesError;
    if (storesError) throw storesError;

    const owners = (profiles || []).map((p: any) => ({
      id: p.id,
      email: p.email,
      full_name: p.full_name,
      created_at: p.created_at,
      stores: (stores || [])
        .filter((s: any) => s.owner_id === p.id)
        .map((s: any) => ({ id: s.id, name: s.name })),
    }));

    return new Response(JSON.stringify({ owners }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
