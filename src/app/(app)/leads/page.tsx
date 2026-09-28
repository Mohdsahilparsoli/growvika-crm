"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, ChevronLeft, ChevronRight, Phone, Plus, UserPlus, Trash2 } from "lucide-react";
import { useStore, uid } from "@/lib/store";
import { LEAD_STAGES, Lead, LeadStage } from "@/lib/types";
import { Badge, Button, Card, Field, Input, Modal, PageHeader, Select, Textarea } from "@/components/ui";
import { emptyClient } from "@/components/ClientForm";
import { fmtDate, todayISO } from "@/lib/format";

const stageStyle: Record<LeadStage, string> = {
  "New Lead": "border-t-sky-500",
  Contacted: "border-t-violet-500",
  "Meeting Done": "border-t-amber-500",
  "Proposal Sent": "border-t-orange-500",
  Won: "border-t-emerald-500",
  Lost: "border-t-slate-400",
};

export default function LeadsPage() {
  const { db, user, isAdmin, update, userName } = useStore();
  const router = useRouter();
  const today = todayISO();
  const [form, setForm] = useState<Lead | null>(null);
  const [err, setErr] = useState("");
  const [dragId, setDragId] = useState<string | null>(null);
  const [who, setWho] = useState("all");

  const leads = (isAdmin ? db.leads : db.leads.filter((l) => l.assignedTo === user!.id)).filter(
    (l) => who === "all" || l.assignedTo === who
  );

  const move = (l: Lead, stage: LeadStage) => {
    let lostReason = l.lostReason;
    if (stage === "Lost" && l.stage !== "Lost") {
      const r = prompt("Why was the deal lost? (reason)", l.lostReason || "");
      if (r === null) return;
      lostReason = r;
    }
    update((d) => ({ ...d, leads: d.leads.map((x) => (x.id === l.id ? { ...x, stage, lostReason } : x)) }));
  };

  const convert = (l: Lead) => {
    const id = uid("c");
    const base = emptyClient(user!.id);
    update((d) => ({
      ...d,
      clients: [...d.clients, { ...base, id, name: l.name, business: l.business, phone: l.phone, whatsapp: l.phone, services: l.service ? [l.service] : [], notes: l.note }],
      leads: d.leads.map((x) => (x.id === l.id ? { ...x, stage: "Won", note: `${x.note}${x.note ? " · " : ""}Converted to client` } : x)),
    }));
    router.push(`/clients/${id}`);
  };

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    if (!form.name.trim()) return setErr("Enter the lead's name");
    if (!/^\d{10}$/.test(form.phone.replace(/\D/g, ""))) return setErr("Enter a valid 10-digit phone number");
    if (form.id) update((d) => ({ ...d, leads: d.leads.map((x) => (x.id === form.id ? form : x)) }));
    else update((d) => ({ ...d, leads: [...d.leads, { ...form, id: uid("l") }] }));
    setForm(null);
  };

  const openNew = () => {
    setErr("");
    setForm({ id: "", name: "", business: "", phone: "", source: db.settings.leadSources[0] ?? "", service: db.settings.services[0] ?? "", stage: "New Lead", followUp: today, assignedTo: user!.id, note: "", lostReason: "", createdAt: today });
  };

  const openCount = leads.filter((l) => l.stage !== "Won" && l.stage !== "Lost").length;
  const won = leads.filter((l) => l.stage === "Won").length;
  const closed = won + leads.filter((l) => l.stage === "Lost").length;

  return (
    <div>
      <PageHeader
        title="Leads pipeline"
        subtitle={`${openCount} open leads · ${won} won${closed ? ` · win rate ${Math.round((won / closed) * 100)}%` : ""}`}
        actions={
          <>
            {isAdmin && (
              <Select value={who} onChange={(e) => setWho(e.target.value)} options={[{ value: "all", label: "Whole team" }, ...db.users.map((u) => ({ value: u.id, label: u.name }))]} className="w-44" />
            )}
            <Button onClick={openNew}><Plus size={16} /> New lead</Button>
          </>
        }
      />

      <p className="mb-3 text-xs text-slate-500">Drag a card to another stage, or use the arrows.</p>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {LEAD_STAGES.map((stage) => {
          const col = leads.filter((l) => l.stage === stage);
          return (
            <div
              key={stage}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                const l = db.leads.find((x) => x.id === dragId);
                if (l && l.stage !== stage) move(l, stage);
                setDragId(null);
              }}
              className={`w-72 shrink-0 rounded-xl border border-t-4 border-slate-200 bg-slate-100/60 ${stageStyle[stage]}`}
            >
              <div className="flex items-center justify-between px-3 py-2.5">
                <h3 className="text-sm font-medium text-slate-800">{stage}</h3>
                <span className="rounded-full bg-white px-2 text-xs text-slate-500">{col.length}</span>
              </div>
              <div className="min-h-24 space-y-2 px-2 pb-3">
                {col.map((l) => {
                  const idx = LEAD_STAGES.indexOf(l.stage);
                  const due = l.followUp && l.followUp <= today && stage !== "Won" && stage !== "Lost";
                  return (
                    <Card key={l.id} className="cursor-grab p-3 active:cursor-grabbing">
                      <div draggable onDragStart={() => setDragId(l.id)} onClick={() => { setErr(""); setForm(l); }}>
                        <p className="text-sm font-medium text-slate-900">{l.name}</p>
                        <p className="text-xs text-slate-500">{l.business}</p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          <Badge tone="blue">{l.service}</Badge>
                          <Badge>{l.source}</Badge>
                        </div>
                        {l.followUp && stage !== "Won" && stage !== "Lost" && (
                          <p className={`mt-2 flex items-center gap-1 text-xs ${due ? "font-medium text-red-600" : "text-slate-500"}`}>
                            <CalendarClock size={12} /> Follow-up {fmtDate(l.followUp)}
                          </p>
                        )}
                        {stage === "Lost" && l.lostReason && <p className="mt-2 text-xs text-slate-500">Reason: {l.lostReason}</p>}
                        {l.note && <p className="mt-1 line-clamp-2 text-xs text-slate-500">{l.note}</p>}
                        <p className="mt-2 text-[11px] text-slate-400">{userName(l.assignedTo)}</p>
                      </div>
                      <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2">
                        <div className="flex gap-1">
                          <button disabled={idx === 0} onClick={() => move(l, LEAD_STAGES[idx - 1])} className="rounded p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30" aria-label="Previous stage"><ChevronLeft size={16} /></button>
                          <button disabled={idx === LEAD_STAGES.length - 1} onClick={() => move(l, LEAD_STAGES[idx + 1])} className="rounded p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30" aria-label="Next stage"><ChevronRight size={16} /></button>
                          <a href={`tel:${l.phone}`} className="rounded p-1 text-slate-400 hover:bg-slate-100" aria-label="Call"><Phone size={15} /></a>
                        </div>
                        {(stage === "Proposal Sent" || stage === "Won") && !l.note.includes("Converted to client") && (
                          <button onClick={() => convert(l)} className="flex items-center gap-1 rounded-md bg-brand-50 px-2 py-1 text-xs font-medium text-brand-700 hover:bg-brand-100">
                            <UserPlus size={12} /> Make client
                          </button>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? "Edit lead" : "New lead"}>
        {form && (
          <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
            <Field label="Name *"><Input value={form.name} onChange={(e) => { setErr(""); setForm({ ...form, name: e.target.value }); }} autoFocus /></Field>
            <Field label="Business"><Input value={form.business} onChange={(e) => setForm({ ...form, business: e.target.value })} /></Field>
            <Field label="Phone *"><Input value={form.phone} onChange={(e) => { setErr(""); setForm({ ...form, phone: e.target.value }); }} inputMode="numeric" /></Field>
            <Field label="Source"><Select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} options={Array.from(new Set([...db.settings.leadSources, form.source].filter(Boolean)))} /></Field>
            <Field label="Interested in"><Select value={form.service} onChange={(e) => setForm({ ...form, service: e.target.value })} options={Array.from(new Set([...db.settings.services, form.service].filter(Boolean)))} /></Field>
            <Field label="Stage"><Select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value as LeadStage })} options={LEAD_STAGES} /></Field>
            <Field label="Next follow-up"><Input type="date" value={form.followUp} onChange={(e) => setForm({ ...form, followUp: e.target.value })} /></Field>
            <Field label="Assigned to">
              <Select value={form.assignedTo} disabled={!isAdmin} onChange={(e) => setForm({ ...form, assignedTo: e.target.value })} options={db.users.filter((u) => u.active).map((u) => ({ value: u.id, label: u.name }))} />
            </Field>
            {form.stage === "Lost" && (
              <Field label="Why was it lost" full><Input value={form.lostReason} onChange={(e) => setForm({ ...form, lostReason: e.target.value })} /></Field>
            )}
            <Field label="Note" full><Textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></Field>
            {err && <p className="text-sm text-red-600 sm:col-span-2">{err}</p>}
            <div className="flex justify-between gap-2 sm:col-span-2">
              {form.id ? (
                <Button type="button" variant="danger" onClick={() => { if (confirm("Delete this lead?")) { update((d) => ({ ...d, leads: d.leads.filter((x) => x.id !== form.id) })); setForm(null); } }}>
                  <Trash2 size={14} /> Delete
                </Button>
              ) : <span />}
              <div className="flex gap-2">
                <Button type="button" variant="secondary" onClick={() => setForm(null)}>Cancel</Button>
                <Button type="submit">Save</Button>
              </div>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
