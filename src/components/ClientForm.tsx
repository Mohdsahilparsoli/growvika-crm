"use client";

import { useState } from "react";
import { BILLING_CYCLES, Client, ClientStatus } from "@/lib/types";
import { useStore } from "@/lib/store";
import { Button, Field, Input, Select, Textarea } from "./ui";
import { todayISO } from "@/lib/format";

export const emptyClient = (assignedTo: string): Client => ({
  id: "",
  name: "",
  business: "",
  phone: "",
  whatsapp: "",
  email: "",
  address: "",
  city: "",
  state: "",
  gst: "",
  services: [],
  status: "Active",
  joinedAt: todayISO(),
  notes: "",
  assignedTo,
  totalBilling: 0,
  gstApplicable: false,
  planStatus: "Not decided",
  plan: "",
  billingCycle: "",
});

export default function ClientForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: Client;
  onSave: (c: Client) => void;
  onCancel: () => void;
}) {
  const { db, isAdmin } = useStore();
  const [c, setC] = useState<Client>(initial);
  const [err, setErr] = useState("");
  const set = <K extends keyof Client>(k: K, v: Client[K]) => {
    setC((p) => ({ ...p, [k]: v }));
    setErr("");
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!c.name.trim() || !c.business.trim()) return setErr("Client name and business name are required");
    if (!/^\d{10}$/.test(c.phone.replace(/\D/g, ""))) return setErr("Enter a valid 10-digit phone number");
    onSave({ ...c, whatsapp: c.whatsapp || c.phone });
  };

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <Field label="Client name *">
        <Input value={c.name} onChange={(e) => set("name", e.target.value)} />
      </Field>
      <Field label="Business name *">
        <Input value={c.business} onChange={(e) => set("business", e.target.value)} />
      </Field>
      <Field label="Phone *">
        <Input value={c.phone} onChange={(e) => set("phone", e.target.value)} inputMode="numeric" />
      </Field>
      <Field label="WhatsApp (leave blank to use phone)">
        <Input value={c.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} inputMode="numeric" />
      </Field>
      <Field label="Email">
        <Input type="email" value={c.email} onChange={(e) => set("email", e.target.value)} />
      </Field>
      <Field label="GST number">
        <Input value={c.gst} onChange={(e) => set("gst", e.target.value.toUpperCase())} />
      </Field>
      <Field label="Address" full>
        <Input value={c.address} onChange={(e) => set("address", e.target.value)} />
      </Field>
      <Field label="City">
        <Input value={c.city} onChange={(e) => set("city", e.target.value)} />
      </Field>
      <Field label="State">
        <Input value={c.state} onChange={(e) => set("state", e.target.value)} />
      </Field>
      <Field label="Services" full>
        <div className="flex flex-wrap gap-2">
          {Array.from(new Set([...db.settings.services, ...c.services])).map((s) => {
            const on = c.services.includes(s);
            return (
              <button
                type="button"
                key={s}
                onClick={() => set("services", on ? c.services.filter((x) => x !== s) : [...c.services, s])}
                className={`rounded-full border px-3 py-1 text-xs ${
                  on ? "border-brand-500 bg-brand-50 text-brand-700" : "border-slate-300 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {s}
              </button>
            );
          })}
        </div>
      </Field>
      <Field label="Status">
        <Select value={c.status} onChange={(e) => set("status", e.target.value as ClientStatus)} options={["Active", "VIP", "Inactive"]} />
      </Field>
      <Field label="Client since">
        <Input type="date" value={c.joinedAt} onChange={(e) => set("joinedAt", e.target.value)} />
      </Field>
      <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-4 sm:col-span-2">
        <p className="text-xs font-medium text-slate-600">Plan</p>
        <div className="mt-2 inline-flex rounded-lg border border-slate-300 bg-white p-0.5">
          {(["Decided", "Not decided"] as const).map((ps) => {
            const on = (c.planStatus ?? "Decided") === ps;
            return (
              <button
                type="button"
                key={ps}
                onClick={() => set("planStatus", ps)}
                className={`rounded-md px-3 py-1.5 text-sm ${on ? "bg-brand-500 text-white" : "text-slate-600 hover:bg-slate-50"}`}
              >
                {ps === "Decided" ? "Plan decided" : "Not decided yet"}
              </button>
            );
          })}
        </div>
        {(c.planStatus ?? "Decided") === "Decided" ? (
          <div className="mt-3 grid gap-4 sm:grid-cols-3">
            <Field label="Plan">
              <Select value={c.plan ?? ""} onChange={(e) => set("plan", e.target.value)} options={[{ value: "", label: "Select plan" }, ...Array.from(new Set([...db.settings.plans, c.plan ?? ""].filter(Boolean)))]} />
            </Field>
            <Field label="Billing cycle">
              <Select value={c.billingCycle ?? ""} onChange={(e) => set("billingCycle", e.target.value)} options={[{ value: "", label: "Select" }, ...BILLING_CYCLES]} />
            </Field>
            {isAdmin && (
              <Field label="Total package amount (₹)">
                <Input type="number" min={0} value={c.totalBilling || ""} onChange={(e) => set("totalBilling", Number(e.target.value))} />
              </Field>
            )}
          </div>
        ) : (
          <p className="mt-3 text-xs text-slate-500">
            You can still record advance payments. Once the client chooses a plan, come back here, select &quot;Plan decided&quot; and enter the plan and amount. The balance will be calculated then.
          </p>
        )}
      </div>
      {isAdmin && (
        <>
          <Field label="Assigned to">
            <Select
              value={c.assignedTo}
              onChange={(e) => set("assignedTo", e.target.value)}
              options={db.users.filter((u) => u.active).map((u) => ({ value: u.id, label: u.name }))}
            />
          </Field>
          {db.company.gst && <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2">
            <input type="checkbox" checked={c.gstApplicable} onChange={(e) => set("gstApplicable", e.target.checked)} className="h-4 w-4 accent-brand-500" />
            Add GST ({db.settings.gstRate}%) to invoices
          </label>}
        </>
      )}
      <Field label="Notes" full>
        <Textarea value={c.notes} onChange={(e) => set("notes", e.target.value)} placeholder="e.g. Call only in the evening" />
      </Field>
      {err && <p className="text-sm text-red-600 sm:col-span-2">{err}</p>}
      <div className="flex justify-end gap-2 sm:col-span-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit">Save</Button>
      </div>
    </form>
  );
}
