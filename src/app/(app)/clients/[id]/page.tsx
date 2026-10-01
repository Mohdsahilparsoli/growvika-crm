"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, MessageCircle, Paperclip, Pencil, Phone, Plus, Trash2 } from "lucide-react";
import { useStore, uid } from "@/lib/store";
import { Badge, Button, Card, Empty, Field, Input, Modal, Select, Textarea } from "@/components/ui";
import ClientForm from "@/components/ClientForm";
import BillingPanel from "@/components/BillingPanel";
import { COMM_TYPES, Comm, CommType } from "@/lib/types";
import { billedToDate, planSchedule, clientPlans, formatPhone, telLink, clientBalance, fmtDate, inr, paidFor, planDecided, statusTone, todayISO, waLink } from "@/lib/format";

type Tab = "profile" | "billing" | "comms";

const commTone: Record<CommType, string> = { Call: "blue", WhatsApp: "green", Meeting: "purple", Email: "amber" };

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const { db, user, isAdmin, update, userName } = useStore();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("profile");
  const [editing, setEditing] = useState(false);
  const [comm, setComm] = useState<Comm | null>(null);
  const [commErr, setCommErr] = useState("");

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    if (t === "billing" || t === "comms") setTab(t);
  }, []);

  const c = db.clients.find((x) => x.id === id);
  if (!c) {
    return (
      <div className="py-24 text-center">
        <p className="font-medium text-slate-900">Client not found</p>
        <Link href="/clients" className="mt-2 inline-block text-sm text-emerald-600">← Back to clients</Link>
      </div>
    );
  }
  if (!isAdmin && c.assignedTo !== user!.id) {
    return <div className="py-24 text-center text-slate-500">This client is not assigned to you.</div>;
  }

  const comms = db.comms.filter((m) => m.clientId === c.id).sort((a, b) => b.date.localeCompare(a.date));
  const bal = clientBalance(db, c.id);
  const paid = paidFor(db, c.id);
  const decided = planDecided(c);

  const tabs: { key: Tab; label: string; short?: string }[] = [
    { key: "profile", label: "Profile" },
    ...(isAdmin ? [{ key: "billing" as Tab, label: "Billing" }] : []),
    { key: "comms", label: `Communication (${comms.length})`, short: `History (${comms.length})` },
  ];

  const saveComm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comm) return;
    if (!comm.summary.trim()) return setCommErr("Please describe the conversation");
    if (comm.id) update((d) => ({ ...d, comms: d.comms.map((m) => (m.id === comm.id ? comm : m)) }));
    else update((d) => ({ ...d, comms: [...d.comms, { ...comm, id: uid("m") }] }));
    setComm(null);
  };

  const deleteClient = () => {
    if (!confirm(`Delete ${c.business}? All its payments and communication history will also be removed.`)) return;
    update((d) => ({
      ...d,
      clients: d.clients.filter((x) => x.id !== c.id),
      payments: d.payments.filter((p) => p.clientId !== c.id),
      comms: d.comms.filter((m) => m.clientId !== c.id),
    }));
    router.push("/clients");
  };

  return (
    <div>
      <Link href="/clients" className="mb-4 hidden items-center gap-1 lg:inline-flex text-sm text-slate-500 hover:text-slate-800">
        <ArrowLeft size={16} /> All clients
      </Link>

      <Card className="p-4 lg:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xl font-semibold text-brand-700">
              {c.business.charAt(0)}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold text-slate-900">{c.business}</h1>
                <Badge tone={statusTone(c.status)}>{c.status}</Badge>
              </div>
              <p className="text-sm text-slate-500">{c.name} · Client since {fmtDate(c.joinedAt)}</p>
            </div>
          </div>
          {/* Phones: three equal quick-action buttons */}
          <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
            <a href={telLink(c.phone)} className="contents sm:block"><Button variant="secondary" className="w-full"><Phone size={16} /> Call</Button></a>
            <a href={waLink(c.whatsapp || c.phone, `Hello ${c.name},`)} target="_blank" rel="noreferrer" className="contents sm:block">
              <Button variant="whatsapp" className="w-full"><MessageCircle size={16} /> <span className="sm:inline">WhatsApp</span></Button>
            </a>
            <Button variant="secondary" onClick={() => setEditing(true)}><Pencil size={16} /> Edit</Button>
          </div>
        </div>

        {/* Phones: iOS-style segmented control. Desktop: underline tabs */}
        <div className="mt-4 grid grid-flow-col gap-1 rounded-xl bg-slate-100 p-1 lg:mt-5 lg:flex lg:gap-1 lg:rounded-none lg:border-b lg:border-slate-200 lg:bg-transparent lg:p-0">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`whitespace-nowrap rounded-lg px-2 py-2 text-[13px] font-medium transition lg:-mb-px lg:rounded-none lg:border-b-2 lg:px-4 lg:text-sm ${
                tab === t.key
                  ? "bg-white text-slate-900 shadow-sm lg:border-brand-500 lg:bg-transparent lg:text-brand-700 lg:shadow-none"
                  : "text-slate-500 lg:border-transparent lg:hover:text-slate-800"
              }`}
            >
              {t.short ? <><span className="lg:hidden">{t.short}</span><span className="hidden lg:inline">{t.label}</span></> : t.label}
            </button>
          ))}
        </div>
      </Card>

      <div className="mt-4">
        {tab === "profile" && (
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="p-4 lg:p-5 lg:col-span-2">
              <h3 className="mb-4 font-medium text-slate-900">Client details</h3>
              <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                {[
                  ["Client name", c.name],
                  ["Business", c.business],
                  ["Phone", formatPhone(c.phone)],
                  ["WhatsApp", formatPhone(c.whatsapp || c.phone)],
                  ["Email", c.email || "—"],
                  ["GST number", c.gst || "—"],
                  ["Address", [c.address, c.city, c.state].filter(Boolean).join(", ") || "—"],
                  ["Assigned to", userName(c.assignedTo)],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-xs text-slate-500">{k}</dt>
                    <dd className="mt-0.5 text-sm text-slate-900">{v}</dd>
                  </div>
                ))}
              </dl>
            </Card>
            <Card className="p-4 lg:p-5 lg:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-medium text-slate-900">Plan &amp; services</h3>
                {decided ? <Badge tone="green">Plan decided</Badge> : <Badge tone="amber">Plan not decided yet</Badge>}
              </div>
              {decided && clientPlans(c).length > 0 ? (
                <>
                {/* Phones: one row per plan */}
                <ul className="mt-4 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 md:hidden">
                  {clientPlans(c).map((p) => {
                    const sc = planSchedule(p, c);
                    return (
                      <li key={p.id} className="flex items-start justify-between gap-3 px-3.5 py-3">
                        <div className="min-w-0">
                          <p className="text-[15px] font-medium text-slate-900">{p.name}</p>
                          <p className="text-xs text-slate-500">{p.category}{p.cycle ? ` · ${p.cycle}` : ""}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            Start {fmtDate(sc.start)}
                            {sc.nextDate ? <> · <span className="font-medium text-brand-600">Renews {fmtDate(sc.nextDate)}</span></> : sc.ended ? " · Stopped" : ""}
                          </p>
                        </div>
                        {isAdmin && <p className="shrink-0 text-[15px] font-semibold tabular-nums text-slate-900">{inr(p.price)}</p>}
                      </li>
                    );
                  })}
                  {isAdmin && clientPlans(c).length > 1 && (
                    <li className="flex justify-between bg-slate-50 px-3.5 py-2.5 text-sm"><span className="font-medium">Total package</span><span className="font-semibold tabular-nums">{inr(c.totalBilling)}</span></li>
                  )}
                </ul>
                <div className="mt-4 hidden overflow-hidden rounded-lg border border-slate-200 md:block">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                      <tr><th className="px-3 py-2 font-medium">Plan</th><th className="px-3 py-2 font-medium">Billing cycle</th><th className="px-3 py-2 font-medium">Start</th><th className="px-3 py-2 font-medium">Next renewal</th>{isAdmin && <th className="px-3 py-2 text-right font-medium">Amount</th>}</tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {clientPlans(c).map((p) => (
                        <tr key={p.id}>
                          <td className="px-3 py-2 text-slate-900">{p.name}<span className="block text-xs text-slate-500">{p.category}</span></td>
                          <td className="px-3 py-2 text-slate-700">{p.cycle || "—"}</td>
                          {(() => { const sc = planSchedule(p, c); return (<>
                            <td className="whitespace-nowrap px-3 py-2 text-slate-700">{fmtDate(sc.start)}</td>
                            <td className="whitespace-nowrap px-3 py-2 text-slate-700">{sc.nextDate ? fmtDate(sc.nextDate) : sc.ended ? "Stopped" : "—"}</td>
                          </>); })()}
                          {isAdmin && <td className="px-3 py-2 text-right tabular-nums text-slate-900">{inr(p.price)}</td>}
                        </tr>
                      ))}
                    </tbody>
                    {isAdmin && clientPlans(c).length > 1 && (
                      <tfoot className="bg-slate-50"><tr><td className="px-3 py-2 font-medium" colSpan={4}>Total package</td><td className="px-3 py-2 text-right font-semibold tabular-nums">{inr(c.totalBilling)}</td></tr></tfoot>
                    )}
                  </table>
                </div>
                </>
              ) : (
                <p className="mt-4 text-sm text-slate-500">{decided ? "No plan added yet" : "Plan to be decided"}</p>
              )}
              <div className="mt-4">
                <p className="text-xs text-slate-500">Services</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {c.services.length === 0 && <span className="text-sm text-slate-400">No services selected</span>}
                  {c.services.map((s) => (
                    <span key={s} className="rounded-md bg-brand-50 px-2 py-0.5 text-xs text-brand-700">{s}</span>
                  ))}
                </div>
              </div>
              {!decided && (
                <Button variant="secondary" size="sm" className="mt-4" onClick={() => setEditing(true)}>Set plan now</Button>
              )}
            </Card>
            <div className="space-y-4">
              <Card className="p-4 lg:p-5">
                <h3 className="font-medium text-slate-900">Notes</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{c.notes || "No notes"}</p>
              </Card>
              {isAdmin && (
                <Card className="p-4 lg:p-5">
                  <h3 className="font-medium text-slate-900">Billing summary</h3>
                  {decided ? (
                    <div className="mt-3 space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-slate-500">Billed till date</span><span className="tabular-nums">{inr(billedToDate(db, c))}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Received</span><span className="tabular-nums text-emerald-600">{inr(paid)}</span></div>
                      <div className="flex justify-between border-t border-slate-100 pt-2 font-medium"><span>Due</span><span className={`tabular-nums ${bal > 0 ? "text-red-600" : "text-emerald-600"}`}>{inr(Math.max(0, bal))}</span></div>
                    </div>
                  ) : (
                    <div className="mt-3 space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-slate-500">Advance received</span><span className="tabular-nums text-emerald-600">{inr(paid)}</span></div>
                      <p className="border-t border-slate-100 pt-2 text-xs text-amber-700">Balance will show once the plan is decided.</p>
                    </div>
                  )}
                  <Button variant="secondary" size="sm" className="mt-4 w-full" onClick={() => setTab("billing")}>View billing history</Button>
                </Card>
              )}
              {isAdmin && (
                <button onClick={deleteClient} className="flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs text-red-500 hover:bg-red-50">
                  <Trash2 size={14} /> Delete client
                </button>
              )}
            </div>
          </div>
        )}

        {tab === "billing" && isAdmin && <BillingPanel clientId={c.id} />}

        {tab === "comms" && (
          <Card>
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
              <h3 className="font-medium text-slate-900">Communication history</h3>
              <Button size="sm" onClick={() => { setCommErr(""); setComm({ id: "", clientId: c.id, date: todayISO(), type: "Call", summary: "", by: user!.id, nextAction: "", fileName: "" }); }}>
                <Plus size={14} /> New entry
              </Button>
            </div>
            {comms.length === 0 ? (
              <Empty text="No entries yet" />
            ) : (
              <ol className="relative space-y-0 px-5 py-4">
                {comms.map((m, i) => (
                  <li key={m.id} className="relative flex gap-4 pb-6 last:pb-0">
                    {i < comms.length - 1 && <span className="absolute left-[7px] top-5 h-full w-px bg-slate-200" />}
                    <span className="relative mt-1.5 h-[15px] w-[15px] shrink-0 rounded-full border-2 border-brand-500 bg-white" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={commTone[m.type]}>{m.type}</Badge>
                        <span className="text-xs text-slate-500">{fmtDate(m.date)} · {userName(m.by)}</span>
                        <button onClick={() => { setCommErr(""); setComm(m); }} className="ml-auto text-slate-400 hover:text-slate-700" aria-label="Edit"><Pencil size={14} /></button>
                      </div>
                      <p className="mt-1.5 text-sm text-slate-800">{m.summary}</p>
                      {m.nextAction && <p className="mt-1 text-xs text-amber-700">Next: {m.nextAction}</p>}
                      {m.fileName && (
                        <p className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                          <Paperclip size={12} /> {m.fileName}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        )}
      </div>

      <Modal open={editing} onClose={() => setEditing(false)} title="Edit client" wide>
        <ClientForm
          initial={c}
          onCancel={() => setEditing(false)}
          onSave={(nc) => {
            update((d) => ({ ...d, clients: d.clients.map((x) => (x.id === nc.id ? nc : x)) }));
            setEditing(false);
          }}
        />
      </Modal>

      <Modal open={!!comm} onClose={() => setComm(null)} title={comm?.id ? "Edit entry" : "New communication"}>
        {comm && (
          <form onSubmit={saveComm} className="grid gap-4 sm:grid-cols-2">
            <Field label="Date">
              <Input type="date" value={comm.date} onChange={(e) => setComm({ ...comm, date: e.target.value })} />
            </Field>
            <Field label="Type">
              <Select value={comm.type} onChange={(e) => setComm({ ...comm, type: e.target.value as CommType })} options={COMM_TYPES} />
            </Field>
            <Field label="What was discussed *" full>
              <Textarea value={comm.summary} onChange={(e) => { setCommErr(""); setComm({ ...comm, summary: e.target.value }); }} autoFocus />
            </Field>
            <Field label="Next action" full>
              <Input value={comm.nextAction} onChange={(e) => setComm({ ...comm, nextAction: e.target.value })} placeholder="e.g. Send the report by Friday" />
            </Field>
            <Field label="Attach file (demo saves the file name only)" full>
              <Input type="file" onChange={(e) => setComm({ ...comm, fileName: e.target.files?.[0]?.name ?? comm.fileName })} />
            </Field>
            {commErr && <p className="text-sm text-red-600 sm:col-span-2">{commErr}</p>}
            <div className="form-actions flex justify-between gap-2 sm:col-span-2">
              {comm.id ? (
                <Button type="button" variant="danger" onClick={() => { update((d) => ({ ...d, comms: d.comms.filter((x) => x.id !== comm.id) })); setComm(null); }}>
                  <Trash2 size={14} /> Delete
                </Button>
              ) : <span />}
              <div className="flex gap-2">
                <Button type="button" variant="secondary" onClick={() => setComm(null)}>Cancel</Button>
                <Button type="submit">Save</Button>
              </div>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
