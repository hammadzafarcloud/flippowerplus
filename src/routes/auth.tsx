import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/" });
  },
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) navigate({ to: "/" });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.card}>
        <div style={styles.brand}>
          <img
            src="/__l5e/assets-v1/595fc7be-5fc2-41a7-b5bf-69f874f0d80d/flip-power-logo.png"
            alt="Flip Power logo"
            style={styles.mark}
          />
          <div>
            <div style={styles.name}>Flip Power CRM</div>
            <div style={styles.tag}>SOLAR SERVICE CRM</div>
          </div>
        </div>

        <h1 style={styles.h1}>Login</h1>
        <p style={styles.sub}>
          Use the login your admin created for you.
        </p>

        <form onSubmit={handleEmail}>
          <label style={styles.label}>Email</label>
          <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={styles.input} placeholder="you@company.com" />
          <label style={styles.label}>Password</label>
          <input required minLength={6} type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={styles.input} placeholder="••••••••" />
          {err && <div style={styles.err}>{err}</div>}
          <button disabled={busy} type="submit" style={styles.primary}>
            {busy ? "Please wait…" : "Login"}
          </button>
        </form>

      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0F1826", padding: "24px", fontFamily: "'Inter', system-ui, sans-serif" },
  card: { width: "100%", maxWidth: 420, background: "#FAF6EE", borderRadius: 14, padding: "32px 28px", boxShadow: "0 20px 60px rgba(0,0,0,0.35)" },
  brand: { display: "flex", gap: 12, alignItems: "center", marginBottom: 24 },
  mark: { width: 120, height: 44, borderRadius: 8, background: "#fff", objectFit: "contain", padding: 2 },
  name: { fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 16, color: "#0F1826" },
  tag: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, color: "#666B76", letterSpacing: 0.6, textTransform: "uppercase" },
  h1: { fontFamily: "'Space Grotesk', sans-serif", margin: "0 0 6px", fontSize: 24, color: "#20242C" },
  sub: { margin: "0 0 20px", color: "#666B76", fontSize: 14 },
  google: { width: "100%", padding: "11px 14px", background: "#fff", border: "1px solid #E7DFCB", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, fontWeight: 600, color: "#20242C", cursor: "pointer" },
  divider: { textAlign: "center", margin: "16px 0", color: "#9AA0AB", fontSize: 12, position: "relative" },
  label: { display: "block", fontSize: 12, fontWeight: 600, color: "#20242C", margin: "10px 0 6px" },
  input: { width: "100%", padding: "10px 12px", border: "1px solid #E7DFCB", borderRadius: 8, background: "#fff", fontSize: 14, outline: "none" },
  primary: { width: "100%", marginTop: 16, padding: "11px 14px", background: "#FF3131", color: "#fff", border: "none", borderRadius: 10, fontWeight: 600, cursor: "pointer" },
  err: { marginTop: 10, padding: "8px 10px", background: "#F7E2E0", color: "#B93A3A", borderRadius: 6, fontSize: 13 },
  switch: { textAlign: "center", marginTop: 16, fontSize: 13, color: "#666B76" },
  linkBtn: { background: "none", border: "none", color: "#FF3131", fontWeight: 600, cursor: "pointer", padding: 0 },
};
