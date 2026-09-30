"use client";

import { useState } from "react";
import { BILLING_CYCLES, Client, ClientPlan, ClientStatus } from "@/lib/types";
import { clientPlans, fmtDate, inr, normalizePhone, periodLabel, planSchedule } from "@/lib/format";
import { useStore } from "@/lib/store";
import { Button, Field, Input, Select, Textarea, PhoneInput } from "./ui";
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
  plans: [],
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

  const planCategories = Array.from(new Set(db.settings.plans.map((p) => p.category)));
  const catalogKey = (p: { category: string; name: string }) => `${p.category}|${p.name}`;
  const [rows, setRows] = useState<(ClientPlan & { custom: boolean })[]>(() =>
    clientPlans(initial).map((p, i) => ({
      ...p,
      id: p.id === "legacy" ? `pl${i}` : p.id,
      custom: !db.settings.plans.some((x) => catalogKey(x) === catalogKey(p)),
    }))
  );
  const total = rows.reduce((sum, r) => sum + (Number(r.price) || 0), 0);

  const updateRow = (id: string, patch: Partial<ClientPlan & { custom: boolean }>) => {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    setErr("");
  };
  const addRow = () => setRows((rs) => [...rs, { id: `pl${Date.now().toString(36)}${rs.length}`, category: "", name: "", price: 0, cycle: "", custom: false }]);
  const removeRow = (id: string) => setRows((rs) => rs.filter((r) => r.id !== id));
  const pickPlan = (id: string, value: string) => {
    if (value === "__custom") return updateRow(id, { custom: true, category: "Custom", name: "", price: 0 });
    const p = db.settings.plans.find((x) => x.id === value);
    if (p) updateRow(id, { custom: false, category: p.category, name: p.name, price: p.price, cycle: p.cycle });
    else updateRow(id, { custom: false, category: "", name: "", price: 0, cycle: "" });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!c.name.trim() || !c.business.trim()) return setErr("Client name and business name are required");
    const phone = normalizePhone(c.phone);
    const whatsapp = normalizePhone(c.whatsapp) || phone;
    if (!/^\d{10}$/.test(phone)) return setErr("Enter a valid 10-digit phone number");
    if (whatsapp && !/^\d{10}$/.test(whatsapp)) return setErr("Enter a valid 10-digit WhatsApp number");
    const decided = (c.planStatus ?? "Decided") === "Decided";
    const plans = rows.map(({ custom: _custom, ...r }) => {
      const recurring = !!r.cycle && r.cycle !== "One-time";
      return {
        ...r,
        name: r.name.trim(),
        price: Number(r.price) || 0,
        startDate: recurring ? r.startDate || c.joinedAt : r.startDate,
        endDate: recurring ? r.endDate || undefined : undefined,
      };
    });
    if (decided && plans.some((p) => !p.name)) return setErr("Choose a plan in every row, or remove the empty row");
    const first = plans[0];
    onSave({
      ...c,
      phone,
      whatsapp,
      plans: decided ? plans : [],
      totalBilling: decided ? (plans.length ? plans.reduce((sum, p) => sum + p.price, 0) : c.totalBilling) : 0,
      plan: decided ? first?.name ?? "" : "",
      planCategory: decided ? first?.category ?? "" : "",
      billingCycle: decided ? first?.cycle ?? "" : "",
    });
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
        <PhoneInput value={normalizePhone(c.phone)} onChange={(v) => set("phone", v)} />
      </Field>
      <Field label="WhatsApp (leave blank to use phone)">
        <PhoneInput value={normalizePhone(c.whatsapp)} onChange={(v) => set("whatsapp", v)} />
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
                onClick={() => { set("planStatus", ps); if (ps === "Decided" && rows.length === 0) addRow(); }}
                className={`rounded-md px-3 py-1.5 text-sm ${on ? "bg-brand-500 text-white" : "text-slate-600 hover:bg-slate-50"}`}
              >
                {ps === "Decided" ? "Plan decided" : "Not decided yet"}
              </button>
            );
          })}
        </div>
        {(c.planStatus ?? "Decided") === "Decided" ? (
          <div className="mt-3 space-y-3">
            {db.settings.plans.length === 0 && (
              <p className="text-xs text-amber-700">No plans added yet. Add your plans with prices in Team &amp; Settings → Plans &amp; prices.</p>
            )}
            {rows.map((r, i) => {
              const selected = r.custom ? "__custom" : db.settings.plans.find((x) => catalogKey(x) === catalogKey(r))?.id ?? "";
              const catalog = db.settings.plans.find((x) => catalogKey(x) === catalogKey(r));
              return (
                <div key={r.id} className="rounded-lg border border-slate-200 bg-white p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-500">Plan {i + 1}</span>
                    <button type="button" onClick={() => removeRow(r.id)} className="text-xs text-red-500 hover:underline">Remove</button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
                    <select
                      value={selected}
                      onChange={(e) => pickPlan(r.id, e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none lg:rounded-lg lg:py-2 focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                    >
                      <option value="">Select a plan</option>
                      {planCategories.map((cat) => (
                        <optgroup key={cat} label={cat}>
                          {db.settings.plans.filter((p) => p.category === cat).map((p) => (
                            <option key={p.id} value={p.id}>
                              {cat} · {p.name}{isAdmin ? ` — ${inr(p.price)}` : ""}{p.cycle ? ` / ${p.cycle}` : ""}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                      <optgroup label="Custom"><option value="__custom">Custom plan (type name)</option></optgroup>
                    </select>
                    <Select value={r.cycle} onChange={(e) => updateRow(r.id, { cycle: e.target.value })} options={[{ value: "", label: "Billing cycle" }, ...Array.from(new Set([...BILLING_CYCLES, r.cycle].filter(Boolean)))]} />
                    {isAdmin ? (
                      <Input type="number" min={0} placeholder="Amount ₹" value={r.price || ""} onChange={(e) => updateRow(r.id, { price: Number(e.target.value) })} />
                    ) : <span />}
                  </div>
                  {r.cycle && r.cycle !== "One-time" && (() => {
                    const sched = planSchedule({ ...r, startDate: r.startDate || c.joinedAt }, c);
                    return (
                      <div className="mt-2 grid gap-3 sm:grid-cols-2">
                        <label className="text-xs text-slate-500">Plan start date
                          <Input type="date" className="mt-1" value={r.startDate || c.joinedAt} onChange={(e) => updateRow(r.id, { startDate: e.target.value })} />
                        </label>
                        <label className="text-xs text-slate-500">Stopped on (optional, if the client stops renewing)
                          <Input type="date" className="mt-1" value={r.endDate ?? ""} onChange={(e) => updateRow(r.id, { endDate: e.target.value || undefined })} />
                        </label>
                        <p className="text-xs text-slate-600 sm:col-span-2">
                          {sched.ended ? <>Renewals stopped. Billed for {periodLabel(sched, r.cycle)}.</> : <>Next renewal: <b>{fmtDate(sched.nextDate)}</b>{isAdmin ? <> · Billed till date: <b>{inr(sched.billed)}</b> ({periodLabel(sched, r.cycle)})</> : null}</>}
                        </p>
                      </div>
                    );
                  })()}
                  {r.custom && (
                    <Input className="mt-2" value={r.name} onChange={(e) => updateRow(r.id, { name: e.target.value })} placeholder="Custom plan name, e.g. Website + SEO combo" />
                  )}
                  {isAdmin && catalog && r.price !== catalog.price && (
                    <p className="mt-1.5 text-xs text-slate-500">Plan price is {inr(catalog.price)}. You changed it to {inr(r.price)} (e.g. a discount).</p>
                  )}
                </div>
              );
            })}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={addRow}>+ Add {rows.length ? "another" : "a"} plan</Button>
              {isAdmin && rows.length > 0 && (
                <p className="text-sm text-slate-700">Total package amount: <b className="tabular-nums">{inr(total)}</b>{rows.some((r) => r.cycle && r.cycle !== "One-time") && <span className="text-xs text-slate-500"> (renewing plans counted once per cycle)</span>}</p>
              )}
            </div>
          </div>
        ) : (
          <p className="mt-3 text-xs text-slate-500">
            You can still record advance payments. Once the client chooses a plan, come back here, select &quot;Plan decided&quot; and enter the plan and amount. The balance will be calculated then.
          </p>
        )}
      </div>
      {isAdmin && (
        <>
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
