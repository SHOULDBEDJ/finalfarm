import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import api from "@/lib/api";

export default function LoginPage() {
  const { user, login, loading } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(true);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [logo, setLogo] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) navigate("/dashboard", { replace: true });
  }, [user, loading, navigate]);

  useEffect(() => {
    api.get<any>("/settings").then(data => {
      if (data?.logo_url) setLogo(data.logo_url);
    });
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(""); setBusy(true);
    try {
      await login(username.trim(), password, remember);
      await logActivity("Login", "Auth", `User ${username} logged in`);
      navigate("/dashboard", { replace: true });
    } catch (e: any) {
      setErr(e?.message ?? "Invalid username or password");
    } finally { setBusy(false); }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background px-4">
      {/* watermark */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.04]">
        <div className="text-[20rem] font-black text-navy">16</div>
      </div>

      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-2xl">
        <div className="mb-8 flex flex-col items-center">
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-gold shadow-lg">
            {logo ? (
              <img src={logo} alt="Logo" className="h-full w-full object-contain" />
            ) : (
              <span className="text-3xl font-black text-navy">16</span>
            )}
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-navy">16 EYES Farm House</h1>
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground/60 mt-1">Management Portal</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">Username</label>
            <input
              value={username} onChange={(e) => setUsername(e.target.value)}
              required autoComplete="username"
              className="w-full rounded-lg border border-input bg-muted px-4 py-3 text-base outline-none transition-all focus:border-navy focus:bg-white focus:ring-4 focus:ring-navy/5"
              style={{ fontSize: 16 }}
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">Password</label>
            <div className="relative">
              <input
                type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                required autoComplete="current-password"
                className="w-full rounded-lg border border-input bg-muted px-4 py-3 pr-12 text-base outline-none transition-all focus:border-navy focus:bg-white focus:ring-4 focus:ring-navy/5"
                style={{ fontSize: 16 }}
              />
              <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-navy" aria-label="Toggle password">
                {show ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-navy focus:ring-navy" />
              Remember me
            </label>
          </div>

          {err && (
            <div className="flex items-center gap-2 rounded-lg bg-danger/10 p-3 text-sm font-medium text-danger animate-shake">
              <span className="h-1.5 w-1.5 rounded-full bg-danger" />
              {err}
            </div>
          )}

          <button
            type="submit" disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-navy py-3.5 text-sm font-bold text-white shadow-xl shadow-navy/10 transition-all hover:bg-navy-hover hover:shadow-navy/20 active:translate-y-0.5 disabled:opacity-50"
            style={{ touchAction: "manipulation" }}
          >
            {busy && <Loader2 size={18} className="animate-spin" />} Sign In
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-border">
          <p className="text-center text-[10px] uppercase tracking-widest text-muted-foreground">
            Secured Access for 16 Eyes Farm House
          </p>
        </div>
      </div>
    </div>
  );
}
