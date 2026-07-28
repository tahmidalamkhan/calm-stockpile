// Server-only admin client for the external Supabase project the app
// actually authenticates against (see integrations/supabase/custom-client.ts).
// Never import this from client code.
import { createClient } from "@supabase/supabase-js";

const URL = "https://sbhgjftaypfsuhshoesq.supabase.co";

export function getExternalAdmin() {
  const key = process.env.EXTERNAL_SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("EXTERNAL_SUPABASE_SERVICE_ROLE_KEY is not configured");
  return createClient(URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Verify a caller's access token and require the admin role. */
export async function requireExternalAdmin(token: string) {
  const admin = getExternalAdmin();
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) throw new Error("Unauthorized");
  const { data: roles, error: rErr } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", data.user.id)
    .eq("role", "admin")
    .maybeSingle();
  if (rErr) throw new Error(rErr.message);
  if (!roles) throw new Error("Forbidden: admin role required");
  return { admin, userId: data.user.id };
}
