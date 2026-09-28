"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2, Check, X } from "lucide-react";
import { useStore, uid } from "@/lib/store";
import { BILLING_CYCLES, PlanOption } from "@/lib/types";
import { inr } from "@/lib/format";
import { Button, Card, Input } from "./ui";

const blank = (category = ""): PlanOption => ({ id: "", category, name: "", price: 0, cycle: "One-time" });

function Row({ p, onSave, onCancel, categories }: { p: PlanOption; onSave: (p: PlanOption) => void; onCancel: () => void; categories: string[] }) {
  const [f, setF] = useState(p);
  const [err, setErr] = useState("");
  const save = () => {
    if (!f.category.trim()) return setErr("Enter a category");
    if (!f.name.trim()) return setErr("Enter a plan name");
    onSave({ ...f, category: f.category.trim(), name: f.name.trim(), price: Math.max(0, Math.round(f.price || 0)) });
  };
  return (
    <div className="rounded-lg border border-brand-200 bg-brand-50/40 p-3">
      <div className="grid gap-2 sm:grid-cols-[1.2fr_1.5fr_1fr_1fr_auto]">
        <Input list="plan-categories" placeholder="Category (e.g. Website)" value={f.category} onChange={(e) => { setErr(""); setF({ ...f, category: e.target.value }); }} />
        <Input placeholder="Plan name (e.g. Basic)" value={f.name} onChange={(e) => { setErr(""); setF({ ...f, name: e.target.value }); }} />
        <Input type="number" min={0} placeholder="Price ₹" value={f.price || ""} onChange={(e) => setF({ ...f, price: Number(e.target.value) })} />
        <select value={f.cycle} onChange={(e) => setF({ ...f, cycle: e.target.value })} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
          {Array.from(new Set([...BILLING_CYCLES, f.cycle].filter(Boolean))).map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <div className="flex gap-1">
          <Button type="button" size="sm" onClick={save} aria-label="Save plan"><Check size={14} /></Button>
          <Button type="button" size="sm" variant="secondary" onClick={onCancel} aria-label="Cancel"><X size={14} /></Button>
        </div>
      </div>
      <datalist id="plan-categories">{categories.map((c) => <option key={c} value={c} />)}</datalist>
      {err && <p className="mt-2 text-xs text-red-600">{err}</p>}
    </div>
  );
}

export default function PlanEditor() {
  const { db, update } = useStore();
  const plans = db.settings.plans ?? [];
  const categories = Array.from(new Set(plans.map((p) => p.category)));
  const [editing, setEditing] = useState<string | null>(null);

  const save = (p: PlanOption) => {
    update((d) => {
      const list = d.settings.plans ?? [];
      const next = p.id ? list.map((x) => (x.id === p.id ? p : x)) : [...list, { ...p, id: uid("pl") }];
      return { ...d, settings: { ...d.settings, plans: next } };
    });
    setEditing(null);
  };

  const remove = (p: PlanOption) => {
    if (!confirm(`Delete plan "${p.category} – ${p.name}"? Existing clients on this plan keep their details.`)) return;
    update((d) => ({ ...d, settings: { ...d.settings, plans: (d.settings.plans ?? []).filter((x) => x.id !== p.id) } }));
  };

  return (
    <Card className="mt-6 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-medium text-slate-900">Plans &amp; prices</h3>
          <p className="text-xs text-slate-500">These appear in the client form. Picking a plan fills in its price and billing cycle.</p>
        </div>
        <Button size="sm" onClick={() => setEditing("new")}><Plus size={14} /> Add plan</Button>
      </div>

      <div className="mt-4 space-y-5">
        {editing === "new" && <Row p={blank(categories[0] ?? "")} categories={categories} onSave={save} onCancel={() => setEditing(null)} />}
        {plans.length === 0 && editing !== "new" && (
          <p className="rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">No plans yet. Click &quot;Add plan&quot; to add your first one.</p>
        )}
        {categories.map((cat) => (
          <div key={cat}>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">{cat}</p>
            <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
              {plans.filter((p) => p.category === cat).map((p) =>
                editing === p.id ? (
                  <div key={p.id} className="p-2"><Row p={p} categories={categories} onSave={save} onCancel={() => setEditing(null)} /></div>
                ) : (
                  <div key={p.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">{p.name}</p>
                      <p className="text-xs text-slate-500">{p.cycle || "—"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold tabular-nums text-slate-900">{inr(p.price)}</span>
                      <Button size="sm" variant="ghost" onClick={() => setEditing(p.id)} aria-label="Edit plan"><Pencil size={14} /></Button>
                      <Button size="sm" variant="ghost" onClick={() => remove(p)} aria-label="Delete plan"><Trash2 size={14} className="text-red-500" /></Button>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
