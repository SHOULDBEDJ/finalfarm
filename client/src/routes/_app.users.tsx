import { useEffect, useState } from "react";
import { Users, Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui-bits/PageHeader";
import { StatCard } from "@/components/ui-bits/StatCard";
import { StatusBadge } from "@/components/ui-bits/Badge";
import { EmptyState } from "@/components/ui-bits/EmptyState";
import { ConfirmDialog } from "@/components/ui-bits/ConfirmDialog";
import { Modal } from "@/components/ui-bits/Modal";
import api from "@/lib/api";
import { logActivity } from "@/lib/activity";
import { useAuth } from "@/lib/auth";
import { initials, avatarColor, formatDateIST } from "@/lib/format";
import { useGlobalLoader } from "@/components/ui-bits/GlobalLoader";

interface UserRow { id: string; username: string; full_name: string; email: string | null; status: string; last_login_at: string | null; created_at: string; role: string; }

export default function UsersPage() {
  const { user: me } = useAuth();
  const [list, setList] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const { showLoader } = useGlobalLoader();
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm();

  const load = async () => {
    try {
      const data = await api.get<UserRow[]>("/users");
      setList(data);
    } catch (err) {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const [toggleTarget, setToggleTarget] = useState<UserRow | null>(null);

  const doToggle = async () => {
    if (!toggleTarget) return;
    if (toggleTarget.id === me?.id) { toast.error("Cannot suspend your own account"); setToggleTarget(null); return; }
    const next = toggleTarget.status === "Active" ? "Suspended" : "Active";
    try {
      await showLoader();
      await api.put(`/users/${toggleTarget.id}/status`, { status: next });
      await logActivity("Status Change", "Users", `${toggleTarget.username} → ${next}`);
      toast.success("Status updated"); 
      setToggleTarget(null); 
      load();
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    }
  };

  const onAddUser = async (data: any) => {
    try {
      await showLoader();
      await api.post("/users", data);
      await logActivity("Create", "Users", `Added user ${data.username}`);
      toast.success("User created successfully");
      setShowAdd(false);
      reset();
      load();
    } catch (err: any) {
      toast.error(err.message || "Failed to create user");
    }
  };

  const active = list.filter((u) => u.status === "Active").length;
  const inactive = list.length - active;

  return (
    <div className="space-y-5">
      <PageHeader icon={Users} title="Users" subtitle="Manage team members and roles"
        action={<button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-2 rounded-md bg-navy px-4 py-2.5 text-sm font-medium text-white hover:bg-navy-hover"><Plus size={16}/> Add User</button>} />

      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={Users} label="Total" value={list.length} tone="navy" />
        <StatCard icon={Users} label="Active" value={active} tone="success" />
        <StatCard icon={Users} label="Inactive" value={inactive} tone="danger" />
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-card border border-border" />)}
        </div>
      ) : list.length === 0 ? (
        <EmptyState icon={Users} title="No users found" />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[700px]">
            <thead><tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3">User</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Last Login</th><th className="px-4 py-3">Status</th>
            </tr></thead>
            <tbody>
              {list.map((u) => (
                <tr key={u.id} className="border-b border-[#f0f0f0]">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold text-white ${avatarColor(u.username)}`}>{initials(u.full_name)}</div>
                      <div><div className="text-sm font-medium">{u.full_name}</div><div className="text-[11px] text-muted-foreground">@{u.username}</div></div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-sm text-muted-foreground">{u.email ?? "-"}</td>
                  <td className="px-4 py-3.5"><StatusBadge tone={u.role === "SuperAdmin" ? "navy" : u.role === "Admin" ? "info" : "neutral"}>{u.role}</StatusBadge></td>
                  <td className="px-4 py-3.5 text-xs text-muted-foreground">{u.last_login_at ? formatDateIST(u.last_login_at) : "Never"}</td>
                  <td className="px-4 py-3.5">
                    <button onClick={() => setToggleTarget(u)} className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 hover:bg-muted">
                      <span className={`h-2.5 w-2.5 rounded-full ${u.status === "Active" ? "bg-success" : "bg-danger"}`} />
                      <span className="text-xs font-medium">{u.status}</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add User"
        footer={<><button onClick={() => setShowAdd(false)} className="rounded-md border border-border px-4 py-2 text-sm">Cancel</button><button form="user-form" type="submit" disabled={isSubmitting} className="rounded-md bg-navy px-4 py-2 text-sm text-white">Create User</button></>}>
        <form id="user-form" onSubmit={handleSubmit(onAddUser)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Full Name *"><input {...register("fullName", { required: true })} className={inp}/></Field>
          <Field label="Username *"><input {...register("username", { required: true })} className={inp}/></Field>
          <Field label="Email"><input type="email" {...register("email")} className={inp}/></Field>
          <Field label="Role *"><select {...register("role", { required: true })} className={inp}><option value="Staff">Staff</option><option value="Admin">Admin</option><option value="SuperAdmin">SuperAdmin</option></select></Field>
          <div className="sm:col-span-2"><Field label="Password *"><input type="password" {...register("password", { required: true, minLength: 8 })} className={inp}/></Field></div>
        </form>
      </Modal>

      <ConfirmDialog open={!!toggleTarget} title={toggleTarget?.status === "Active" ? "Suspend user?" : "Activate user?"}
        body={`${toggleTarget?.status === "Active" ? "Suspend" : "Activate"} ${toggleTarget?.full_name}?`}
        confirmLabel={toggleTarget?.status === "Active" ? "Suspend" : "Activate"} danger={toggleTarget?.status === "Active"}
        onCancel={() => setToggleTarget(null)} onConfirm={doToggle} />
    </div>
  );
}

const inp = "w-full rounded-md border border-input bg-muted px-3 py-2 text-base outline-none focus:border-navy";
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-xs font-medium">{label}</span>{children}</label>;
}
