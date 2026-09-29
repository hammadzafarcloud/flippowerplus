import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

async function hasAnyUser() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1 });
  if (error) throw new Error("Could not check accounts");
  return data.users.length > 0;
}

export const needsAdminSetup = createServerFn({ method: "POST" }).handler(async () => {
  return { needed: !(await hasAnyUser()) };
});

export const createFirstAdmin = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ email: z.string().trim().email().max(255), password: z.string().min(6).max(72) }).parse(d),
  )
  .handler(async ({ data }) => {
    // Only allowed while the app has zero accounts
    if (await hasAnyUser()) throw new Error("Admin already exists");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
