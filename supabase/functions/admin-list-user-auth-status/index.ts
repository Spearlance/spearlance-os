import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (!user) throw new Error("Unauthorized");

    const { data: callerProfile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (callerProfile?.role !== "admin") {
      throw new Error("Only admins can view auth status");
    }

    let page = 1;
    const perPage = 200;
    const statuses: Array<{
      id: string;
      email: string | null;
      email_confirmed_at: string | null;
      last_sign_in_at: string | null;
      created_at: string | null;
    }> = [];

    while (true) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
      if (error) throw error;

      const users = data.users ?? [];
      statuses.push(
        ...users.map((entry) => ({
          id: entry.id,
          email: entry.email ?? null,
          email_confirmed_at: entry.email_confirmed_at ?? null,
          last_sign_in_at: entry.last_sign_in_at ?? null,
          created_at: entry.created_at ?? null,
        })),
      );

      if (users.length < perPage) break;
      page += 1;
    }

    return new Response(
      JSON.stringify({ users: statuses }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("Error in admin-list-user-auth-status:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Unknown error" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
