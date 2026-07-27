// Account approval helpers.
// New signups land in `account_requests` with status "pending" and get no role
// until an admin approves them and grants admin/staff access.
import { supabase } from "@/integrations/supabase/custom-client";

// The generated types don't include this table (external project), so use an
// untyped view of the client for these queries only.
const db = supabase as unknown as {
  from: (table: string) => any;
};

export type AccessStatus = "pending" | "approved" | "rejected";

export type AccountRequest = {
  id: string;
  email: string;
  status: AccessStatus;
  requestedRole: "admin" | "staff";
  createdAt: string;
};

function map(r: Record<string, unknown>): AccountRequest {
  return {
    id: r.id as string,
    email: (r.email as string) ?? "",
    status: (r.status as AccessStatus) ?? "pending",
    requestedRole: ((r.requested_role as string) ?? "staff") as "admin" | "staff",
    createdAt: (r.created_at as string) ?? new Date().toISOString(),
  };
}

/** Create (or keep) an access request for a freshly signed-up user. */
export async function requestAccess(userId: string, email: string, status: AccessStatus = "pending") {
  await db
    .from("account_requests")
    .upsert({ id: userId, email, status }, { onConflict: "id" });
}

/** Read the current user's approval status. Missing row = pending. */
export async function getMyAccessStatus(userId: string): Promise<AccessStatus> {
  const { data, error } = await db
    .from("account_requests")
    .select("status")
    .eq("id", userId)
    .maybeSingle();
  if (error || !data) return "pending";
  return (data.status as AccessStatus) ?? "pending";
}

/** Admin: list all access requests, newest first. */
export async function listAccessRequests(): Promise<AccountRequest[]> {
  const { data, error } = await db
    .from("account_requests")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(map);
}

/** Admin: approve a request and grant the chosen role. */
export async function approveAccessRequest(userId: string, role: "admin" | "staff") {
  const { error: rErr } = await (supabase as any)
    .from("user_roles")
    .upsert({ user_id: userId, role }, { onConflict: "user_id,role" });
  if (rErr) throw new Error(rErr.message);
  const { error } = await db
    .from("account_requests")
    .update({ status: "approved", requested_role: role })
    .eq("id", userId);
  if (error) throw new Error(error.message);
}

/** Admin: reject (revoke) access. */
export async function rejectAccessRequest(userId: string) {
  await (supabase as any).from("user_roles").delete().eq("user_id", userId);
  const { error } = await db
    .from("account_requests")
    .update({ status: "rejected" })
    .eq("id", userId);
  if (error) throw new Error(error.message);
}
