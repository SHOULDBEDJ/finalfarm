import { useEffect, useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, CalendarDays, DollarSign, Receipt, BarChart2, Users, Clock, User, Settings, LogOut,
} from "lucide-react";
import { useAuth, canAccess } from "@/lib/auth";
import { ConfirmDialog } from "@/components/ui-bits/ConfirmDialog";
import { initials, avatarColor } from "@/lib/format";
import { logActivity } from "@/lib/db";
import { api } from "@/lib/api";

const nav = [
  { to: "/dashboard",  label: "Dashboard",    icon: LayoutDashboard },
  { to: "/bookings",   label: "Bookings",     icon: CalendarDays },
  { to: "/income",     label: "Income",       icon: DollarSign },
  { to: "/expenses",   label: "Expenses",     icon: Receipt },
  { to: "/reports",    label: "Reports",      icon: BarChart2 },
  { to: "/users",      label: "Users",        icon: Users },
  { to: "/activity",   label: "Activity Log", icon: Clock },
  { to: "/profile",    label: "Profile",      icon: User },
  { to: "/settings",   label: "Settings",     icon: Settings },
] as const;

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState(false);
  const [logo, setLogo] = useState<string | null>(null);

  useEffect(() => {
    api.get<any>("/settings").then(data => {
      if (data?.logo_url) setLogo(data.logo_url);
    });
  }, []);

  return (
    <aside data-sidebar className="flex h-full w-60 flex-col bg-navy text-white shadow-2xl">
      <div className="flex items-center gap-3 px-5 py-6">
        <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-gold font-bold text-navy shadow-lg ring-2 ring-white/10">
          {logo ? <img src={logo} alt="Logo" className="h-full w-full object-contain" /> : "16"}
        </div>
        <div className="leading-tight">
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold/80">THE</div>
          <div className="text-sm font-black tracking-tight text-white">16 EYES</div>
          <div className="text-[10px] font-medium text-white/40 uppercase tracking-wider">Farm House</div>
        </div>
      </div>

      <nav className="flex-1 space-y-1.5 overflow-y-auto px-3 pb-4 scrollbar-hide">
        {nav.filter((i) => canAccess(user?.role, i.to)).map((item) => {
          const active = path.startsWith(item.to);
          const Icon = item.icon;
          return (
            <Link
              key={item.to} to={item.to} onClick={onNavigate}
              className={[
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-300",
                active 
                  ? "bg-gold text-navy font-bold shadow-lg shadow-gold/20 translate-x-1" 
                  : "text-white/60 hover:bg-white/5 hover:text-white hover:translate-x-1",
              ].join(" ")}
            >
              <Icon size={18} strokeWidth={active ? 2.5 : 2} className={active ? "text-navy" : "text-gold/60 group-hover:text-gold"} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mx-3 mb-3 mt-auto space-y-3 rounded-2xl bg-white/5 p-3">
        {user && (
          <div className="flex items-center gap-3 px-1">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-gold/30 text-xs font-bold text-white shadow-lg ${avatarColor(user.username)}`}>
              {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" /> : initials(user.fullName)}
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <div className="truncate text-xs font-bold text-white">{user.fullName}</div>
              <div className="text-[10px] font-medium text-gold/60 uppercase tracking-wider">{user.role}</div>
            </div>
          </div>
        )}
        <button
          onClick={() => setConfirm(true)}
          className="flex w-full items-center gap-3 rounded-xl bg-danger/10 px-3 py-2.5 text-xs font-bold text-danger transition-all hover:bg-danger hover:text-white"
        >
          <LogOut size={16} strokeWidth={2.5} /> Logout
        </button>
      </div>

      <ConfirmDialog
        open={confirm} title="Logout?" body="Are you sure you want to logout?" confirmLabel="Logout" danger
        onCancel={() => setConfirm(false)}
        onConfirm={async () => {
          setConfirm(false);
          await logActivity("Logout", "Auth", `User ${user?.username} logged out`);
          await logout();
          navigate({ to: "/login", replace: true });
        }}
      />
    </aside>
  );
}
