// Browser-only user management for static hosting (no server needed).
// Works through the signed-in admin's database permissions.
import { createClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/custom-client";

type Role = "admin" | "manager" | "staff";
export type AppUser = { id: string; email: string; createdAt: string; role: Role };
const db = supabase as any;

export function pickRole(roles: string[]): Role | null {
  if (roles.includes("admin")) return "admin";
  if (roles.includes("manager")) return "manager";
  if (roles.includes("staff")) return "staff";
  return null;
}

/** Users who have a role (approved accounts). */
export async function listAppUsers(): Promise<AppUser[]> {
  const [{ data: roles, error: rErr }, { data: reqs, error: qErr }] = await Promise.all([
    db.from("user_roles").select("user_id, role, created_at"),
    db.from("account_requests").select("id, email, created_at"),
  ]);
  if (rErr) throw new Error(rErr.message);
  if (qErr) throw new Error(qErr.message);
  const byUser = new Map<string, { roles: string[]; created: string }>();
  (roles ?? []).forEach((r: any) => {
    const cur: { roles: string[]; created: string } = byUser.get(r.user_id) ?? { roles: [], created: r.created_at };
    cur.roles.push(r.role);
    byUser.set(r.user_id, cur);
  });
  const reqMap = new Map<string, any>((reqs ?? []).map((r: any) => [r.id, r]));
  return [...byUser.entries()].map(([id, v]) => ({
    id,
    email: reqMap.get(id)?.email ?? id,
    createdAt: reqMap.get(id)?.created_at ?? v.created,
    role: pickRole(v.roles) ?? "staff",
  }));
}

export async function setAppUserRole(userId: string, role: Role) {
  const { error: dErr } = await db.from("user_roles").delete().eq("user_id", userId);
  if (dErr) throw new Error(dErr.message);
  const { error } = await db.from("user_roles").insert({ user_id: userId, role });
  if (error) throw new Error(error.message);
  await db.from("account_requests").update({ status: "approved", requested_role: role }).eq("id", userId);
}

/** Removes all access. The login itself stays but can no longer enter the app. */
export async function removeAppUser(userId: string) {
  const { error } = await db.from("user_roles").delete().eq("user_id", userId);
  if (error) throw new Error(error.message);
  await db.from("account_requests").update({ status: "rejected" }).eq("id", userId);
}

/** Creates a login without replacing the admin's own session. */
export async function createAppUser(email: string, password: string, role: Role) {
  const url = (supabase as any).supabaseUrl as string;
  const key = (supabase as any).supabaseKey as string;
  const temp = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, storageKey: "tmp-create-user" },
  });
  const { data, error } = await temp.auth.signUp({ email, password });
  if (error) throw new Error(error.message);
  if (!data.user) throw new Error("Could not create the account");
  if (data.session) {
    await (temp as any).from("account_requests").upsert(
      { id: data.user.id, email, status: "pending" },
      { onConflict: "id" },
    );
  }
  const { error: rErr } = await db.from("user_roles").insert({ user_id: data.user.id, role });
  if (rErr) throw new Error(rErr.message);
  await db.from("account_requests").update({ status: "approved", requested_role: role }).eq("id", data.user.id);
  return { id: data.user.id, needsConfirm: !data.session };
}
