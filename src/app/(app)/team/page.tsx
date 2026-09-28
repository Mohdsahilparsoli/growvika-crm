"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, X } from "lucide-react";
import { useStore, uid } from "@/lib/store";
import { Company, Role, Settings, User } from "@/lib/types";
import { Badge, Button, Card, Field, Input, Modal, PageHeader, Select, Td, Th } from "@/components/ui";
import PlanEditor from "@/components/PlanEditor";

function ListEditor({ label, items, onChange }: { label: string; items: string[]; onChange: (v: string[]) => void }) {
  const [val, setVal] = useState("");
  const add = () => {
    const v = val.trim();
    if (v && !items.includes(v)) onChange([...items, v]);
    setVal("");
  };
  return (
    <div>
      <p className="text-xs font-medium text-slate-600">{label}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {items.map((it) => (
          <span key={it} className="inline-flex items-center gap-1 rounded-full bg-slate-100 py-1 pl-3 pr-1.5 text-xs text-slate-700">
            {it}
            <button type="button" onClick={() => onChange(items.filter((x) => x !== it))} className="rounded-full p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700" aria-label={`Remove ${it}`}>
              <X size={12} />
            </button>
          </span>
        ))}
        {items.length === 0 && <span className="text-xs text-slate-400">Nothing added yet</span>}
      </div>
      <div className="mt-2 flex gap-2">
        <Input value={val} onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} placeholder="Add new…" className="py-1.5" />
        <Button type="button" variant="secondary" size="sm" onClick={add}>Add</Button>
      </div>
    </div>
  );
}

export default function TeamPage() {
  const { db, user, update } = useStore();
  const [form, setForm] = useState<User | null>(null);
  const [err, setErr] = useState("");
  const [co, setCo] = useState<Company>(db.company);
  const [st, setSt] = useState<Settings>(db.settings);
  const [saved, setSaved] = useState("");

  useEffect(() => setCo(db.company), [db.company]);
  useEffect(() => setSt(db.settings), [db.settings]);

  const counts = (id: string) => ({
    clients: db.clients.filter((c) => c.assignedTo === id).length,
    leads: db.leads.filter((l) => l.assignedTo === id && l.stage !== "Won" && l.stage !== "Lost").length,
  });

  const flash = (k: string) => {
    setSaved(k);
    setTimeout(() => setSaved(""), 2000);
  };

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    const isNew = !form.id;
    if (!form.name.trim()) return setErr("Enter a name");
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return setErr("Enter a valid email");
    if (isNew && (form.password ?? "").length < 8) return setErr("Password must be at least 8 characters");
    if (!isNew && form.password && form.password.length < 8) return setErr("New password must be at least 8 characters");
    if (db.users.some((u) => u.email.toLowerCase() === form.email.toLowerCase() && u.id !== form.id)) return setErr("This email is already in use");
    const rec: User = { ...form, email: form.email.trim().toLowerCase() };
    if (!rec.password) delete rec.password;
    if (isNew) update((d) => ({ ...d, users: [...d.users, { ...rec, id: uid("u") }] }));
    else update((d) => ({ ...d, users: d.users.map((u) => (u.id === rec.id ? rec : u)) }));
    setForm(null);
  };

  const toggle = (u: User) => {
    if (u.id === user!.id) return;
    if (u.active) {
      const others = db.users.filter((x) => x.id !== u.id && x.active);
      const to = prompt(
        `Deactivate ${u.name}? Who should take over their clients and leads?\n${others.map((o, i) => `${i + 1}. ${o.name}`).join("\n")}\n\nEnter a number:`,
        "1"
      );
      if (to === null) return;
      const target = others[Number(to) - 1] ?? others[0];
      update((d) => ({
        ...d,
        users: d.users.map((x) => (x.id === u.id ? { ...x, active: false } : x)),
        clients: d.clients.map((c) => (c.assignedTo === u.id ? { ...c, assignedTo: target.id } : c)),
        leads: d.leads.map((l) => (l.assignedTo === u.id ? { ...l, assignedTo: target.id } : l)),
      }));
    } else {
      update((d) => ({ ...d, users: d.users.map((x) => (x.id === u.id ? { ...x, active: true } : x)) }));
    }
  };

  return (
    <div>
      <PageHeader
        title="Team & Settings"
        subtitle="Team logins, company details, invoice settings and your own lists"
        actions={<Button onClick={() => { setErr(""); setForm({ id: "", name: "", email: "", password: "", role: "employee", active: true }); }}><Plus size={16} /> Team member</Button>}
      />

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead className="bg-slate-50">
              <tr><Th>Name</Th><Th>Email</Th><Th>Role</Th><Th right>Clients</Th><Th right>Open leads</Th><Th right>Status</Th><Th right></Th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {db.users.map((u) => {
                const n = counts(u.id);
                return (
                  <tr key={u.id} className={u.active ? "" : "opacity-60"}>
                    <Td className="font-medium text-slate-900">{u.name}{u.id === user!.id && <span className="ml-1 text-xs font-normal text-slate-400">(you)</span>}</Td>
                    <Td>{u.email}</Td>
                    <Td><Badge tone={u.role === "admin" ? "purple" : "blue"}>{u.role === "admin" ? "Admin" : "Employee"}</Badge></Td>
                    <Td right>{n.clients}</Td>
                    <Td right>{n.leads}</Td>
                    <Td right>
                      <button disabled={u.id === user!.id} onClick={() => toggle(u)} className="disabled:cursor-not-allowed">
                        {u.active ? <Badge tone="green">Active</Badge> : <Badge tone="red">Inactive</Badge>}
                      </button>
                    </Td>
                    <Td right>
                      <Button size="sm" variant="ghost" onClick={() => { setErr(""); setForm({ ...u, password: "" }); }} aria-label="Edit"><Pencil size={14} /></Button>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="border-t border-slate-100 px-4 py-2.5 text-xs text-slate-500">
          Employees only see their assigned clients and leads. Billing, Company Account and this page are admin-only. Click a status to activate or deactivate a login.
        </p>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="font-medium text-slate-900">Company details</h3>
          <p className="text-xs text-slate-500">Shown on every invoice and report PDF</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              update((d) => ({ ...d, company: co }));
              flash("company");
            }}
            className="mt-4 grid gap-4 sm:grid-cols-2"
          >
            <Field label="Company name"><Input value={co.name} onChange={(e) => setCo({ ...co, name: e.target.value })} /></Field>
            <Field label="Tagline"><Input value={co.tagline} onChange={(e) => setCo({ ...co, tagline: e.target.value })} /></Field>
            <Field label="Address" full><Input value={co.address} onChange={(e) => setCo({ ...co, address: e.target.value })} /></Field>
            <Field label="Phone"><Input value={co.phone} onChange={(e) => setCo({ ...co, phone: e.target.value })} /></Field>
            <Field label="Email"><Input value={co.email} onChange={(e) => setCo({ ...co, email: e.target.value })} /></Field>
            <Field label="Udyam registration no."><Input value={co.udyam ?? ""} onChange={(e) => setCo({ ...co, udyam: e.target.value.toUpperCase() })} placeholder="UDYAM-XX-00-0000000" /></Field>
            <Field label="GSTIN (leave blank if not registered)"><Input value={co.gst} onChange={(e) => setCo({ ...co, gst: e.target.value.toUpperCase() })} /></Field>
            {!co.gst && <p className="text-xs text-slate-500 sm:col-span-2">No GSTIN, so invoices are issued without GST. Add your GSTIN here once you register and GST options will turn on.</p>}
            <div className="flex items-center justify-end gap-3 sm:col-span-2">
              {saved === "company" && <span className="text-sm text-brand-600">Saved ✓</span>}
              <Button type="submit">Save company details</Button>
            </div>
          </form>
        </Card>

        <Card className="p-5">
          <h3 className="font-medium text-slate-900">Invoice settings</h3>
          <p className="text-xs text-slate-500">Used for new invoices and GST calculation</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              update((d) => ({ ...d, settings: { ...d.settings, invoicePrefix: st.invoicePrefix, gstRate: Number(st.gstRate) || 0, sacCode: st.sacCode } }));
              flash("invoice");
            }}
            className="mt-4 grid gap-4 sm:grid-cols-3"
          >
            <Field label="Invoice prefix"><Input value={st.invoicePrefix} onChange={(e) => setSt({ ...st, invoicePrefix: e.target.value })} /></Field>
            <Field label="GST rate (%)"><Input type="number" min={0} max={100} step="0.01" value={st.gstRate} onChange={(e) => setSt({ ...st, gstRate: Number(e.target.value) })} /></Field>
            <Field label="SAC code"><Input value={st.sacCode} onChange={(e) => setSt({ ...st, sacCode: e.target.value })} /></Field>
            <p className="text-xs text-slate-500 sm:col-span-3">
              Next invoice: <b>{st.invoicePrefix}{String(db.invoiceCounter + 1).padStart(4, "0")}</b>. Invoice numbers are given by the server so they never repeat.
            </p>
            <div className="flex items-center justify-end gap-3 sm:col-span-3">
              {saved === "invoice" && <span className="text-sm text-brand-600">Saved ✓</span>}
              <Button type="submit">Save invoice settings</Button>
            </div>
          </form>
        </Card>
      </div>

      <PlanEditor />

      <Card className="mt-6 p-5">
        <h3 className="font-medium text-slate-900">Your lists</h3>
        <p className="text-xs text-slate-500">These options appear in the forms across the app. Changes save instantly.</p>
        <div className="mt-5 grid gap-6 lg:grid-cols-3">
          <ListEditor label="Services" items={db.settings.services} onChange={(v) => update((d) => ({ ...d, settings: { ...d.settings, services: v } }))} />
          <ListEditor label="Lead sources" items={db.settings.leadSources} onChange={(v) => update((d) => ({ ...d, settings: { ...d.settings, leadSources: v } }))} />
          <ListEditor label="Expense categories" items={db.settings.expenseCategories} onChange={(v) => update((d) => ({ ...d, settings: { ...d.settings, expenseCategories: v } }))} />
        </div>
      </Card>

      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? "Edit team member" : "New team member"}>
        {form && (
          <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
            <Field label="Name"><Input value={form.name} onChange={(e) => { setErr(""); setForm({ ...form, name: e.target.value }); }} autoFocus /></Field>
            <Field label="Email (used to sign in)"><Input type="email" value={form.email} onChange={(e) => { setErr(""); setForm({ ...form, email: e.target.value }); }} /></Field>
            <Field label={form.id ? "New password (leave blank to keep)" : "Password (min 8 characters)"}>
              <Input type="password" autoComplete="new-password" value={form.password ?? ""} onChange={(e) => { setErr(""); setForm({ ...form, password: e.target.value }); }} />
            </Field>
            <Field label="Role">
              <Select value={form.role} disabled={form.id === user!.id} onChange={(e) => setForm({ ...form, role: e.target.value as Role })} options={[{ value: "employee", label: "Employee" }, { value: "admin", label: "Admin" }]} />
            </Field>
            {err && <p className="text-sm text-red-600 sm:col-span-2">{err}</p>}
            <div className="flex justify-end gap-2 sm:col-span-2">
              <Button type="button" variant="secondary" onClick={() => setForm(null)}>Cancel</Button>
              <Button type="submit">Save</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
