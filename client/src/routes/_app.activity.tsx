import { useEffect, useState } from "react";
import { History, User, Clock, Tag, MessageSquare } from "lucide-react";
import { PageHeader } from "@/components/ui-bits/PageHeader";
import { EmptyState } from "@/components/ui-bits/EmptyState";
import api from "@/lib/api";
import { formatDateTimeIST } from "@/lib/format";

interface ActivityRow { id: string; action: string; module: string; details: string | null; created_at: string; performer: { full_name: string | null; email: string } | null; }

export default function ActivityPage() {
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const data = await api.get<ActivityRow[]>("/activity");
      setRows(data);
    } catch (err) {
      console.error("Failed to load activity logs:", err);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6">
      <PageHeader icon={History} title="Activity Log" subtitle="Audit trail of system changes and operations" />

      {loading ? (
        <div className="space-y-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-card border border-border" />)}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState icon={History} title="No activity recorded" subtitle="System actions will appear here once they occur." />
      ) : (
        <div className="relative space-y-3">
          <div className="absolute left-[27px] top-4 bottom-4 w-px bg-border sm:left-[35px]" />
          {rows.map((r) => (
            <div key={r.id} className="relative flex items-start gap-4 rounded-xl border border-border bg-card p-4 shadow-sm hover:border-navy/20">
              <div className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-navy text-white sm:h-9 sm:w-9">
                <History size={14} className="sm:size-18" />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-navy">{r.action}</span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-gold/10 px-2 py-0.5 text-[10px] font-medium text-gold uppercase tracking-wider"><Tag size={10}/> {r.module}</span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground"><Clock size={11}/> {formatDateTimeIST(r.created_at)}</span>
                </div>
                {r.details && <p className="text-sm text-muted-foreground flex items-center gap-1.5"><MessageSquare size={12} className="shrink-0"/> {r.details}</p>}
                <div className="mt-2 flex items-center gap-1.5 text-xs text-navy/70">
                  <User size={12}/> <span>{r.performer?.full_name || r.performer?.email || "System"}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
