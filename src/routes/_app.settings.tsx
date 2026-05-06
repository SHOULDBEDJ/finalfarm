import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Settings as SetIcon, Plus, Pencil, Trash2, Save } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui-bits/PageHeader";
import { Modal } from "@/components/ui-bits/Modal";
import { api } from "@/lib/api";
import { logActivity } from "@/lib/db";
import { useGlobalLoader } from "@/components/ui-bits/GlobalLoader";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({ meta: [{ title: "Settings | 16 Eyes Farm House" }] }),
  component: SettingsPage,
});

interface S {
  farmhouse_name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  business_name: string | null;
  business_phone: string | null;
  business_email: string | null;
  business_address: string | null;
  gst_number: string | null;
  tax_percent: number | null;
  default_booking_notes: string | null;
  notify_bookings: boolean;
  notify_payments: boolean;
  notify_daily_summary: boolean;
}

interface Slot {
  id: string;
  name: string;
  color: string;
  start_time: string;
  end_time: string;
  is_overnight: boolean;
}

function SettingsPage() {
  const [s, setS] = useState<S | null>(null);
  const [form, setForm] = useState<Partial<S>>({});
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotTarget, setSlotTarget] = useState<Partial<Slot> | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const { showLoader } = useGlobalLoader();

  const load = async () => {
    try {
      const [st, sl] = await Promise.all([
        api.get<S>("/settings"),
        api.get<Slot[]>("/settings/slots"),
      ]);
      if (st) {
        setS(st);
        setForm(st);
      }
      setSlots(sl || []);
    } catch (err) {
      toast.error("Failed to load settings");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSave = async (section: string, patch: Partial<S>) => {
    setSaving(section);
    try {
      await showLoader();
      await api.put("/settings", patch);
      await logActivity("Settings Updated", "Settings", `${section}: ${Object.keys(patch).join(", ")}`);
      toast.success(`${section} saved successfully`);
      load();
    } catch (err: any) {
      toast.error(err.message || "Failed to save settings");
    } finally {
      setSaving(null);
    }
  };

  const saveSlot = async () => {
    if (!slotTarget || !slotTarget.name || !slotTarget.start_time || !slotTarget.end_time) {
      toast.error("Please fill all required slot fields");
      return;
    }
    try {
      await showLoader();
      if (slotTarget.id) {
        await api.put(`/settings/slots/${slotTarget.id}`, slotTarget);
        toast.success("Slot updated");
      } else {
        await api.post("/settings/slots", slotTarget);
        toast.success("Slot added");
      }
      setSlotTarget(null);
      load();
    } catch (err: any) {
      toast.error(err.message || "Failed to save slot");
    }
  };

  const delSlot = async (id: string) => {
    try {
      await showLoader();
      await api.delete(`/settings/slots/${id}`);
      toast.success("Slot deleted");
      load();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete slot");
    }
  };

  if (!s) return <div className="h-40 animate-pulse rounded-md bg-muted" />;

  return (
    <div className="space-y-5 pb-10">
      <PageHeader icon={SetIcon} title="Settings" subtitle="Configure farmhouse and system preferences" />

      {/* Farmhouse Identity */}
      <Section 
        title="Farmhouse Identity" 
        action={
          <button 
            onClick={() => handleSave("Identity", { 
              farmhouse_name: form.farmhouse_name,
              phone: form.phone,
              email: form.email,
              address: form.address
            })}
            disabled={saving === "Identity"}
            className="inline-flex items-center gap-2 rounded-md bg-navy px-4 py-2 text-sm text-white hover:bg-navy-hover disabled:opacity-50"
          >
            <Save size={14} /> {saving === "Identity" ? "Saving..." : "Save Identity"}
          </button>
        }
      >
        <div className="grid grid-cols-1 gap-4">
          <Field label="Farmhouse Display Name">
            <input 
              value={form.farmhouse_name || ""} 
              onChange={(e) => setForm({ ...form, farmhouse_name: e.target.value })} 
              className={inp} 
              placeholder="e.g. 16 Eyes Farm House"
            />
          </Field>
          <Grid>
            <Field label="Public Phone"><input value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inp}/></Field>
            <Field label="Public Email"><input value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inp}/></Field>
            <div className="sm:col-span-2"><Field label="Physical Address"><input value={form.address || ""} onChange={(e) => setForm({ ...form, address: e.target.value })} className={inp}/></Field></div>
          </Grid>
        </div>
      </Section>

      {/* Business Details */}
      <Section 
        title="Business Details (for receipts/PDFs)" 
        action={
          <button 
            onClick={() => handleSave("Business Details", { 
              business_name: form.business_name,
              business_phone: form.business_phone,
              business_email: form.business_email,
              business_address: form.business_address,
              gst_number: form.gst_number
            })}
            disabled={saving === "Business Details"}
            className="inline-flex items-center gap-2 rounded-md bg-navy px-4 py-2 text-sm text-white hover:bg-navy-hover disabled:opacity-50"
          >
            <Save size={14} /> {saving === "Business Details" ? "Saving..." : "Save Business Details"}
          </button>
        }
      >
        <Grid>
          <Field label="Business Name"><input value={form.business_name || ""} onChange={(e) => setForm({ ...form, business_name: e.target.value })} className={inp}/></Field>
          <Field label="Business Phone"><input value={form.business_phone || ""} onChange={(e) => setForm({ ...form, business_phone: e.target.value })} className={inp}/></Field>
          <Field label="Business Email"><input value={form.business_email || ""} onChange={(e) => setForm({ ...form, business_email: e.target.value })} className={inp}/></Field>
          <Field label="GST Number"><input value={form.gst_number || ""} onChange={(e) => setForm({ ...form, gst_number: e.target.value })} className={inp}/></Field>
          <div className="sm:col-span-2"><Field label="Business Address"><textarea rows={2} value={form.business_address || ""} onChange={(e) => setForm({ ...form, business_address: e.target.value })} className={inp}/></Field></div>
        </Grid>
      </Section>

      <Section 
        title="Booking Preferences"
        action={
          <button 
            onClick={() => handleSave("Preferences", { 
              tax_percent: form.tax_percent,
              default_booking_notes: form.default_booking_notes
            })}
            disabled={saving === "Preferences"}
            className="inline-flex items-center gap-2 rounded-md bg-navy px-4 py-2 text-sm text-white hover:bg-navy-hover disabled:opacity-50"
          >
            <Save size={14} /> {saving === "Preferences" ? "Saving..." : "Save Preferences"}
          </button>
        }
      >
        <Grid>
          <Field label="Currency"><input value="INR (₹)" disabled className={inp + " opacity-60"} /></Field>
          <Field label="Tax %"><input type="number" min={0} step="0.01" value={form.tax_percent ?? 0} onChange={(e) => setForm({ ...form, tax_percent: Number(e.target.value) })} className={inp}/></Field>
          <div className="sm:col-span-2"><Field label="Default Booking Notes (for receipts)"><textarea rows={4} maxLength={1000} value={form.default_booking_notes || ""} onChange={(e) => setForm({ ...form, default_booking_notes: e.target.value })} className={inp}/></Field></div>
        </Grid>
      </Section>

      <Section title="Time Slots">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Manage your farmhouse booking slots.</p>
          <button onClick={() => setSlotTarget({ name: "", color: "#3b82f6", start_time: "09:00", end_time: "18:00", is_overnight: false })} className="inline-flex items-center gap-1 text-xs text-navy hover:underline"><Plus size={14}/> Add Slot</button>
        </div>
        <ul className="space-y-2">
          {slots.map((sl) => (
            <li key={sl.id} className="flex items-center gap-3 rounded-md border border-border p-2">
              <span className="h-4 w-4 rounded-full" style={{ backgroundColor: sl.color }}/>
              <span className="flex-1 text-sm font-medium">{sl.name}</span>
              <span className="text-xs text-muted-foreground">{sl.start_time}–{sl.end_time}</span>
              {sl.is_overnight && <span className="rounded-full bg-warning/20 px-2 py-0.5 text-[10px] text-warning-fg">overnight</span>}
              <div className="flex gap-1"><button onClick={() => setSlotTarget(sl)} className="p-1 hover:text-navy"><Pencil size={12}/></button><button onClick={() => delSlot(sl.id)} className="p-1 hover:text-danger"><Trash2 size={12}/></button></div>
            </li>
          ))}
        </ul>
      </Section>

      <Section 
        title="Notifications"
        action={
          <button 
            onClick={() => handleSave("Notifications", { 
              notify_bookings: form.notify_bookings,
              notify_payments: form.notify_payments,
              notify_daily_summary: form.notify_daily_summary
            })}
            disabled={saving === "Notifications"}
            className="inline-flex items-center gap-2 rounded-md bg-navy px-4 py-2 text-sm text-white hover:bg-navy-hover disabled:opacity-50"
          >
            <Save size={14} /> {saving === "Notifications" ? "Saving..." : "Save Notifications"}
          </button>
        }
      >
        <div className="space-y-2">
          {(["notify_bookings", "notify_payments", "notify_daily_summary"] as const).map((k) => (
            <label key={k} className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={!!form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.checked })} className="h-4 w-4" />
              <span className="capitalize">{k.replace("notify_", "").replace("_", " ")}</span>
            </label>
          ))}
        </div>
      </Section>

      <Modal open={!!slotTarget} onClose={() => setSlotTarget(null)} title={slotTarget?.id ? "Edit Slot" : "Add Slot"}
        footer={<><button onClick={() => setSlotTarget(null)} className="rounded-md border border-border px-4 py-2 text-sm">Cancel</button><button onClick={saveSlot} className="rounded-md bg-navy px-4 py-2 text-sm text-white">Save</button></>}>
        {slotTarget && <div className="space-y-4">
          <Field label="Slot Name"><input value={slotTarget.name || ""} onChange={(e) => setSlotTarget({ ...slotTarget, name: e.target.value })} className={inp}/></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start Time"><input type="time" value={slotTarget.start_time || ""} onChange={(e) => setSlotTarget({ ...slotTarget, start_time: e.target.value })} className={inp}/></Field>
            <Field label="End Time"><input type="time" value={slotTarget.end_time || ""} onChange={(e) => setSlotTarget({ ...slotTarget, end_time: e.target.value })} className={inp}/></Field>
          </div>
          <div className="flex items-center justify-between">
            <Field label="Color"><input type="color" value={slotTarget.color || "#3b82f6"} onChange={(e) => setSlotTarget({ ...slotTarget, color: e.target.value })} className="h-10 w-20 rounded border border-input"/></Field>
            <label className="mt-5 flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" checked={slotTarget.is_overnight || false} onChange={(e) => setSlotTarget({ ...slotTarget, is_overnight: e.target.checked })} className="h-4 w-4"/> Overnight Slot</label>
          </div>
        </div>}
      </Modal>
    </div>
  );
}

// Helper Components & Styles
const inp = "w-full rounded-md border border-input bg-muted px-3 py-2.5 text-base outline-none transition-all focus:border-navy focus:bg-white focus:ring-4 focus:ring-navy/5";
function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between border-b border-border pb-3"><h2 className="text-sm font-semibold text-navy uppercase tracking-wider">{title}</h2>{action}</div>
      {children}
    </section>
  );
}
function Grid({ children }: { children: React.ReactNode }) { return <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
