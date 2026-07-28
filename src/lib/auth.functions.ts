import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

type Role = "admin" | "staff";

const tokenSchema = z.object({ token: z.string().min(10) });

/** List every account in the app's auth database, with its role. */
export const listUsers = createServerFn({ method: "POST" })
  .inputValidator((input) => tokenSchema.parse(input))
  .handler(async ({ data }) => {
    const { requireExternalAdmin } = await import("./external-admin.server");
    const { admin } = await requireExternalAdmin(data.token);

    const all: { id: string; email: string; createdAt: string }[] = [];
    for (let page = 1; page <= 20; page++) {
      const { data: res, error } = await admin.auth.admin.listUsers({
        page,
        perPage: 1000,
      });
      if (error) throw new Error(error.message);
      res.users.forEach((u) =>
        all.push({ id: u.id, email: u.email ?? "", createdAt: u.created_at }),
      );
      if (res.users.length < 1000) break;
    }

    const { data: roles } = await admin
      .from("user_roles")
      .select("user_id, role")
      .in(
        "user_id",
        all.length ? all.map((u) => u.id) : ["00000000-0000-0000-0000-000000000000"],
      );
    const roleMap = new Map<string, Role>();
    (roles ?? []).forEach((r: { user_id: string; role: string }) => {
      const cur = roleMap.get(r.user_id);
      if (r.role === "admin" || !cur) roleMap.set(r.user_id, r.role as Role);
    });

    return all.map((u) => ({ ...u, role: roleMap.get(u.id) ?? ("staff" as Role) }));
  });

export const createUser = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    tokenSchema
      .extend({
        email: z.string().email(),
        password: z.string().min(8).max(72),
        role: z.enum(["admin", "staff"]),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { requireExternalAdmin } = await import("./external-admin.server");
    const { admin } = await requireExternalAdmin(data.token);
    const { data: created, error } = await admin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
    });
    if (error || !created.user) throw new Error(error?.message ?? "Failed");
    const { error: rErr } = await admin
      .from("user_roles")
      .insert({ user_id: created.user.id, role: data.role });
    if (rErr) throw new Error(rErr.message);
    await admin
      .from("account_requests")
      .upsert(
        { id: created.user.id, email: data.email, status: "approved", requested_role: data.role },
        { onConflict: "id" },
      );
    return { id: created.user.id };
  });

export const updateUserRole = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    tokenSchema
      .extend({ userId: z.string().uuid(), role: z.enum(["admin", "staff"]) })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { requireExternalAdmin } = await import("./external-admin.server");
    const { admin } = await requireExternalAdmin(data.token);
    await admin.from("user_roles").delete().eq("user_id", data.userId);
    const { error } = await admin
      .from("user_roles")
      .insert({ user_id: data.userId, role: data.role });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteUser = createServerFn({ method: "POST" })
  .inputValidator((input) => tokenSchema.extend({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { requireExternalAdmin } = await import("./external-admin.server");
    const { admin, userId } = await requireExternalAdmin(data.token);
    if (data.userId === userId) throw new Error("You cannot delete yourself.");
    const { error } = await admin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    await admin.from("account_requests").delete().eq("id", data.userId);
    return { ok: true };
  });
