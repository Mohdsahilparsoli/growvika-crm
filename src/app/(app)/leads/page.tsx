"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, ChevronLeft, ChevronRight, Phone, Plus, UserPlus, Trash2 } from "lucide-react";
import { useStore, uid } from "@/lib/store";
import { LEAD_STAGES, Lead, LeadStage } from "@/lib/types";
import { Badge, Button, Card, Fab, Field, Input, Modal, PageHeader, Select, Textarea, PhoneInput } from "@/components/ui";
import { emptyClient } from "@/components/ClientForm";
import { fmtDate, todayISO, normalizePhone, telLink } from "@/lib/format";

const stageStyle: Record<LeadStage, string> = {
  "New Lead": "border-t-sky-500",
  Contacted: "border-t-violet-500",
  "No Response": "border-t-slate-500",
  Interested: "border-t-cyan-500",
  "Meeting Scheduled": "border-t-indigo-500",
  "Meeting Cancelled": "border-t-rose-500",
  "Meeting Done": "border-t-amber-500",
  "Demo Sent": "border-t-fuchsia-500",
  "Proposal Sent": "border-t-orange-500",
  Negotiation: "border-t-yellow-500",
  "On Hold": "border-t-stone-400",
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
    if (!/^\d{10}$/.test(normalizePhone(form.phone))) return setErr("Enter a valid 10-digit phone number");
    form.phone = normalizePhone(form.phone);
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
            <Button onClick={openNew} className="max-lg:hidden"><Plus size={16} /> New lead</Button>
          </>
        }
      />

      <div className="no-scrollbar -mx-4 mb-3 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
        {LEAD_STAGES.map((stage) => {
          const n = leads.filter((l) => l.stage === stage).length;
          return (
            <button
              key={stage}
              type="button"
              onClick={() => document.getElementById(`stage-${stage}`)?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" })}
              className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs sm:px-2.5 sm:py-1 ${n ? "border-brand-200 bg-brand-50 font-medium text-brand-700" : "border-slate-200 bg-white text-slate-500"} hover:border-brand-400`}
            >
              {stage} <span className="tabular-nums">{n}</span>
            </button>
          );
        })}
      </div>
      <p className="mb-3 text-xs text-slate-500"><span className="lg:hidden">Swipe sideways to see every stage. Tap a stage above to jump to it; use the arrows on a card to move it.</span><span className="hidden lg:inline">Click a stage above to jump to it. Drag a card to another stage, or use the arrows.</span></p>

      <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-4 sm:mx-0 sm:snap-none sm:gap-4 sm:px-0">
        {LEAD_STAGES.map((stage) => {
          const col = leads.filter((l) => l.stage === stage);
          return (
            <div
              key={stage}
              id={`stage-${stage}`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                const l = db.leads.find((x) => x.id === dragId);
                if (l && l.stage !== stage) move(l, stage);
                setDragId(null);
              }}
              className={`w-[84vw] shrink-0 snap-start scroll-ml-2 rounded-2xl sm:w-64 sm:rounded-xl border border-t-4 border-slate-200 bg-slate-100/60 ${stageStyle[stage]}`}
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
                          <a href={telLink(l.phone)} className="rounded p-1 text-slate-400 hover:bg-slate-100" aria-label="Call"><Phone size={15} /></a>
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

      <Fab onClick={openNew} label="New lead" />

      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? "Edit lead" : "New lead"}>
        {form && (
          <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
            <Field label="Name *"><Input value={form.name} onChange={(e) => { setErr(""); setForm({ ...form, name: e.target.value }); }} autoFocus /></Field>
            <Field label="Business"><Input value={form.business} onChange={(e) => setForm({ ...form, business: e.target.value })} /></Field>
            <Field label="Phone *"><PhoneInput value={normalizePhone(form.phone)} onChange={(v) => { setErr(""); setForm({ ...form, phone: v }); }} /></Field>
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
            <div className="form-actions flex justify-between gap-2 sm:col-span-2">
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
