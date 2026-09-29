import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(supabase: any, userId: string) {
  // Admin = workspace owner (a user who is NOT a created team account)
  const { data } = await supabase.from("team_accounts").select("user_id").eq("user_id", userId).maybeSingle();
  if (data) throw new Error("Only the admin can manage team logins");
}

const accountSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(6).max(72),
  name: z.string().trim().min(1).max(100),
  role: z.string().trim().min(1).max(50),
  permissions: z.array(z.string().max(40)).max(40),
  teamMemberId: z.number().int().nullable(),
});

export const getMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("team_accounts")
      .select("role, permissions, display_name, team_member_id, owner_id")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!data) return { isAdmin: true, workspaceId: context.userId, role: "Admin", permissions: [] as string[], name: null, teamMemberId: null };
    return {
      isAdmin: false,
      workspaceId: data.owner_id,
      role: data.role,
      permissions: (data.permissions as string[]) || [],
      name: data.display_name,
      teamMemberId: data.team_member_id,
    };
  });

export const listTeamLogins = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("team_accounts")
      .select("user_id, email, display_name, role, permissions, team_member_id")
      .eq("owner_id", context.userId);
    if (error) throw new Error(error.message);
    return data || [];
  });

export const createTeamLogin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => accountSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
    });
    if (error || !created.user) throw new Error(error?.message || "Could not create login");
    const { error: e2 } = await supabaseAdmin.from("team_accounts").insert({
      user_id: created.user.id,
      owner_id: context.userId,
      email: data.email,
      display_name: data.name,
      role: data.role,
      permissions: data.permissions,
      team_member_id: data.teamMemberId,
    });
    if (e2) {
      await supabaseAdmin.auth.admin.deleteUser(created.user.id);
      throw new Error(e2.message);
    }
    return { ok: true };
  });

export const updateTeamLogin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      userId: z.string().uuid(),
      role: z.string().trim().min(1).max(50),
      permissions: z.array(z.string().max(40)).max(40),
      name: z.string().trim().min(1).max(100),
      password: z.string().min(6).max(72).optional().or(z.literal("")),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("team_accounts")
      .update({ role: data.role, permissions: data.permissions, display_name: data.name })
      .eq("user_id", data.userId)
      .eq("owner_id", context.userId);
    if (error) throw new Error(error.message);
    if (data.password) {
      const { error: pe } = await supabaseAdmin.auth.admin.updateUserById(data.userId, { password: data.password });
      if (pe) throw new Error(pe.message);
    }
    return { ok: true };
  });

export const deleteTeamLogin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("team_accounts").select("user_id").eq("user_id", data.userId).eq("owner_id", context.userId).maybeSingle();
    if (!row) throw new Error("Not found");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
