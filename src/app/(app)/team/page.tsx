"use client";

import { useState } from "react";
import { Plus, Pencil } from "lucide-react";
import { useStore, uid } from "@/lib/store";
import { Company, Role, User } from "@/lib/types";
import { Badge, Button, Card, Field, Input, Modal, PageHeader, Select, Td, Th } from "@/components/ui";

export default function TeamPage() {
  const { db, user, update } = useStore();
  const [form, setForm] = useState<User | null>(null);
  const [err, setErr] = useState("");
  const [co, setCo] = useState<Company>(db.company);
  const [saved, setSaved] = useState(false);

  const counts = (id: string) => ({
    clients: db.clients.filter((c) => c.assignedTo === id).length,
    leads: db.leads.filter((l) => l.assignedTo === id && l.stage !== "Won" && l.stage !== "Lost").length,
  });

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    if (!form.name.trim()) return setErr("Naam daalein");
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return setErr("Sahi email daalein");
    if (form.password.length < 4) return setErr("Password kam se kam 4 characters ka ho");
    if (db.users.some((u) => u.email.toLowerCase() === form.email.toLowerCase() && u.id !== form.id)) return setErr("Ye email pehle se hai");
    if (form.id) update((d) => ({ ...d, users: d.users.map((u) => (u.id === form.id ? form : u)) }));
    else update((d) => ({ ...d, users: [...d.users, { ...form, id: uid("u") }] }));
    setForm(null);
  };

  const toggle = (u: User) => {
    if (u.id === user!.id) return;
    if (u.active) {
      const others = db.users.filter((x) => x.id !== u.id && x.active);
      const to = prompt(
        `${u.name} ka login band karna hai. Uske clients/leads kisko dene hain?\n${others.map((o, i) => `${i + 1}. ${o.name}`).join("\n")}\n\nNumber likhein:`,
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
        subtitle="Team ke logins aur company ki details (invoice par dikhti hain)"
        actions={<Button onClick={() => { setErr(""); setForm({ id: "", name: "", email: "", password: "", role: "employee", active: true }); }}><Plus size={16} /> Team member</Button>}
      />

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead className="bg-slate-50">
              <tr><Th>Naam</Th><Th>Email</Th><Th>Role</Th><Th right>Clients</Th><Th right>Open leads</Th><Th right>Status</Th><Th right></Th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {db.users.map((u) => {
                const n = counts(u.id);
                return (
                  <tr key={u.id} className={u.active ? "" : "opacity-60"}>
                    <Td className="font-medium text-slate-900">{u.name}</Td>
                    <Td>{u.email}</Td>
                    <Td><Badge tone={u.role === "admin" ? "purple" : "blue"}>{u.role === "admin" ? "Admin" : "Employee"}</Badge></Td>
                    <Td right>{n.clients}</Td>
                    <Td right>{n.leads}</Td>
                    <Td right>
                      <button disabled={u.id === user!.id} onClick={() => toggle(u)} className="disabled:cursor-not-allowed">
                        {u.active ? <Badge tone="green">Active</Badge> : <Badge tone="red">Band</Badge>}
                      </button>
                    </Td>
                    <Td right>
                      <Button size="sm" variant="ghost" onClick={() => { setErr(""); setForm(u); }} aria-label="Edit"><Pencil size={14} /></Button>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="border-t border-slate-100 px-4 py-2.5 text-xs text-slate-500">
          Employee sirf apne assigned clients aur leads dekh sakta hai. Billing, Company Account aur ye page sirf Admin ko dikhte hain. Status par click karke login band/chalu karein.
        </p>
      </Card>

      <Card className="mt-6 p-5">
        <h3 className="font-medium text-slate-900">Company details</h3>
        <p className="text-xs text-slate-500">Ye details har invoice aur report PDF par aati hain</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            update((d) => ({ ...d, company: co }));
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
          }}
          className="mt-4 grid gap-4 sm:grid-cols-2"
        >
          <Field label="Company naam"><Input value={co.name} onChange={(e) => setCo({ ...co, name: e.target.value })} /></Field>
          <Field label="Tagline"><Input value={co.tagline} onChange={(e) => setCo({ ...co, tagline: e.target.value })} /></Field>
          <Field label="Address" full><Input value={co.address} onChange={(e) => setCo({ ...co, address: e.target.value })} /></Field>
          <Field label="Phone"><Input value={co.phone} onChange={(e) => setCo({ ...co, phone: e.target.value })} /></Field>
          <Field label="Email"><Input value={co.email} onChange={(e) => setCo({ ...co, email: e.target.value })} /></Field>
          <Field label="GSTIN (khali chhodein agar GST nahi hai)"><Input value={co.gst} onChange={(e) => setCo({ ...co, gst: e.target.value.toUpperCase() })} /></Field>
          <div className="flex items-end justify-end gap-3">
            {saved && <span className="text-sm text-emerald-600">Save ho gaya ✓</span>}
            <Button type="submit">Save details</Button>
          </div>
        </form>
      </Card>

      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? "Team member edit" : "Naya team member"}>
        {form && (
          <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
            <Field label="Naam"><Input value={form.name} onChange={(e) => { setErr(""); setForm({ ...form, name: e.target.value }); }} autoFocus /></Field>
            <Field label="Email (login ke liye)"><Input type="email" value={form.email} onChange={(e) => { setErr(""); setForm({ ...form, email: e.target.value }); }} /></Field>
            <Field label="Password"><Input value={form.password} onChange={(e) => { setErr(""); setForm({ ...form, password: e.target.value }); }} /></Field>
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
