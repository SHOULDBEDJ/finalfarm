import { useEffect, useState, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { User as UserIcon, Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui-bits/PageHeader";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { logActivity } from "@/lib/db";
import { initials, avatarColor, passwordStrength, formatMonthYear } from "@/lib/format";
import { useGlobalLoader } from "@/components/ui-bits/GlobalLoader";

export const Route = createFileRoute("/_app/profile")({
  head: () => ({ meta: [{ title: "Profile | 16 Eyes Farm House" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, refresh, logout } = useAuth();
  const { showLoader } = useGlobalLoader();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [pw, setPw] = useState("");
  const [memberSince, setMemberSince] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName);
      setEmail(user.email ?? "");
      setAvatarUrl(user.avatarUrl ?? null);
      api.get<any>(`/users/${user.id}`).then((data) => {
        if (data && data.created_at) {
          setMemberSince(formatMonthYear(data.created_at));
        }
      });
    }
  }, [user]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be under 10MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const saveAccount = async () => {
    if (!user) return;
    try {
      await showLoader(); // Trigger global animation
      await api.put(`/users/${user.id}`, { 
        full_name: fullName, 
        email,
        avatar_url: avatarUrl 
      });
      await logActivity("Edit", "Profile", "Updated account details & logo");
      await refresh();
      toast.success("Profile updated");
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile");
    }
  };

  const updatePassword = async () => {
    if (pw.length < 8) return toast.error("Password too short");
    try {
      await showLoader();
      await api.put(`/users/${user?.id}/password`, { password: pw });
      await logActivity("Password Change", "Profile", "Password updated");
      toast.success("Password updated. Logging out…");
      setTimeout(async () => {
        await logout();
        window.location.href = "/login";
      }, 500);
    } catch (err: any) {
      toast.error(err.message || "Failed to update password");
    }
  };

  if (!user) return null;
  const strength = passwordStrength(pw);

  return (
    <div className="space-y-5">
      <PageHeader icon={UserIcon} title="Profile" subtitle="Manage your account" />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="mb-6 flex flex-col items-center">
            <div className="relative group">
              <div className={`flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border-4 border-gold/20 text-3xl font-bold text-white shadow-xl transition-all group-hover:border-gold ${avatarColor(user.username)}`}>
                {avatarUrl ? (
                  <img src={avatarUrl} alt={user.fullName} className="h-full w-full object-cover" />
                ) : (
                  initials(user.fullName)
                )}
              </div>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 rounded-full bg-navy p-2.5 text-white shadow-lg transition-transform hover:scale-110 active:scale-95"
              >
                <Camera size={20} />
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="image/*" 
                className="hidden" 
              />
            </div>
            <div className="mt-4 text-center">
              <h3 className="text-lg font-bold">{user.fullName}</h3>
              <span className="mt-1 inline-block rounded-full bg-gold/15 px-3 py-1 text-xs font-semibold text-gold">{user.role}</span>
              {memberSince && <p className="mt-2 text-xs text-muted-foreground italic">Member since {memberSince}</p>}
            </div>
          </div>
          <div className="space-y-4">
            <Field label="Full Name">
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} className={inp} placeholder="Enter your full name" />
            </Field>
            <Field label="Username">
              <input value={user.username} disabled className={inp + " opacity-60 cursor-not-allowed"} />
            </Field>
            <Field label="Email">
              <input value={email} onChange={(e) => setEmail(e.target.value)} className={inp} placeholder="Enter your email" />
            </Field>
            <button 
              onClick={saveAccount} 
              className="w-full rounded-md bg-navy py-3 text-sm font-semibold text-white shadow-lg transition-all hover:bg-navy-hover hover:shadow-navy/20 active:translate-y-0.5"
            >
              Save Changes
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Security Settings</h3>
          <div className="space-y-4">
            <Field label="New Password">
              <input 
                type="password" 
                value={pw} 
                onChange={(e) => setPw(e.target.value)} 
                className={inp} 
                placeholder="••••••••"
              />
            </Field>
            {pw && (
              <div className="space-y-2">
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className={`h-full transition-all duration-500 ${strength.color}`} style={{ width: `${strength.pct}%` }} />
                </div>
                <div className="text-xs font-medium text-muted-foreground">Strength: <span className={strength.color.replace('bg-', 'text-')}>{strength.label}</span></div>
              </div>
            )}
            <button 
              onClick={updatePassword} 
              disabled={pw.length < 8} 
              className="w-full rounded-md bg-navy py-3 text-sm font-semibold text-white shadow-lg transition-all hover:bg-navy-hover disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Update Password
            </button>
            <p className="text-[11px] text-center text-muted-foreground">Password must be at least 8 characters long.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

const inp = "w-full rounded-md border border-input bg-muted px-3 py-2.5 text-base outline-none transition-all focus:border-navy focus:bg-white focus:ring-4 focus:ring-navy/5";
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
