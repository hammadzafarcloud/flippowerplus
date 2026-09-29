import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getMyAccount, listTeamLogins, createTeamLogin, updateTeamLogin, deleteTeamLogin } from "@/lib/team.functions";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Flip Power CRM | Workspace" },
      { name: "description", content: "Manage Flip Power leads, site visits, tasks, bookings, inventory, expenses and team access." },
      { property: "og:title", content: "Flip Power CRM | Workspace" },
      { property: "og:description", content: "Manage Flip Power leads, site visits, tasks, bookings, inventory, expenses and team access." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CrmHost,
});

function CrmHost() {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const signOut = useCallback(async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }, [navigate, queryClient]);

  useEffect(() => {
    let accountPromise: Promise<any> | null = null;
    const getAccount = () => (accountPromise ||= getMyAccount());
    async function getUserId() {
      const { data } = await supabase.auth.getUser();
      return data.user?.id;
    }
    async function getWorkspaceId() {
      try { return (await getAccount()).workspaceId as string; } catch { return (await getUserId()) ?? ""; }
    }

    async function handler(e: MessageEvent) {
      const msg = e.data;
      if (!msg) return;

      if (msg.__crmExternalUrl && typeof msg.url === "string") {
        try {
          const url = new URL(msg.url);
          const allowedHosts = new Set(["web.whatsapp.com", "api.whatsapp.com", "wa.me"]);
          if (url.protocol === "https:" && allowedHosts.has(url.hostname)) {
            window.open(url.toString(), "_blank", "noopener,noreferrer");
          }
        } catch {
          // Ignore malformed external URLs.
        }
        return;
      }

      if (msg.__crmSignOut) {
        await signOut();
        return;
      }

      if (!msg.__crmCall) return;
      const userId = await getUserId();
      if (!userId) return;
      const source = e.source as Window | null;
      const reply = (value: unknown) => source?.postMessage({ __crmReply: true, id: msg.id, value }, "*");

      if (msg.op === "session") {
        try { reply(await getAccount()); } catch (err: any) { reply({ isAdmin: true, role: "Admin", permissions: [], error: err?.message }); }
        return;
      }
      if (msg.op === "team") {
        const { action, args } = msg as { action: string; args: any };
        try {
          let data: unknown = null;
          if (action === "list") data = await listTeamLogins();
          else if (action === "create") data = await createTeamLogin({ data: args });
          else if (action === "update") data = await updateTeamLogin({ data: args });
          else if (action === "delete") data = await deleteTeamLogin({ data: args });
          reply({ ok: true, data });
        } catch (err: any) {
          reply({ ok: false, error: err?.message || "error" });
        }
        return;
      }
      const wsId = await getWorkspaceId();

      if (msg.op === "get") {
        const { data } = await supabase
          .from("user_kv")
          .select("value")
          .eq("user_id", wsId)
          .eq("key", msg.key)
          .maybeSingle();
        reply(data && data.value != null ? { value: data.value as string } : null);
      } else if (msg.op === "set") {
        await supabase
          .from("user_kv")
          .upsert({ user_id: wsId, key: msg.key, value: msg.value, updated_at: new Date().toISOString() });
        reply({ ok: true });
      } else if (msg.op === "booking") {
        const { action, args } = msg as { action: string; args: any };
        try {
          if (action === "listLinks") {
            const { data, error } = await supabase.from("booking_links").select("*").eq("owner_id", wsId).order("created_at", { ascending: false });
            reply({ ok: !error, data: data || [], error: error?.message });
          } else if (action === "saveLink") {
            const row = { ...args, owner_id: wsId };
            const { data, error } = row.id
              ? await supabase.from("booking_links").update(row).eq("id", row.id).eq("owner_id", wsId).select().single()
              : await supabase.from("booking_links").insert(row).select().single();
            reply({ ok: !error, data, error: error?.message });
          } else if (action === "deleteLink") {
            const { error } = await supabase.from("booking_links").delete().eq("id", args.id).eq("owner_id", wsId);
            reply({ ok: !error, error: error?.message });
          } else if (action === "listSubmissions") {
            const { data, error } = await supabase.from("booking_submissions").select("*").eq("owner_id", wsId).order("created_at", { ascending: false });
            reply({ ok: !error, data: data || [], error: error?.message });
          } else if (action === "updateSubmission") {
            const { id, ...rest } = args;
            const { data, error } = await supabase.from("booking_submissions").update(rest).eq("id", id).eq("owner_id", wsId).select().single();
            reply({ ok: !error, data, error: error?.message });
          } else {
            reply({ ok: false, error: "unknown action" });
          }
        } catch (err: any) {
          reply({ ok: false, error: err?.message || "error" });
        }
      }
    }

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [signOut]);

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh", overflow: "hidden" }}>
      <iframe
        ref={iframeRef}
        title="Flip Power CRM"
        src="/crm-app.html"
        style={{ width: "100%", height: "100%", border: 0, display: "block" }}
      />
    </div>
  );
}
