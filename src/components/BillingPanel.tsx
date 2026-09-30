"use client";

import { useEffect, useState } from "react";
import { Download, FileText, Pencil, Plus, Send, Trash2, MessageCircle } from "lucide-react";
import { useStore, uid } from "@/lib/store";
import { PAY_MODES, Payment, PayMode } from "@/lib/types";
import { Badge, Button, Card, Empty, Field, Input, Modal, Select, StatCard, Td, Th } from "./ui";
import { daysBetween, billedToDate, periodLabel, clientPlans, planBreakdown, planName, isPaid, planSummary, fmtDate, inr, planCategoriesForService, planDecided, todayISO, waLink } from "@/lib/format";
import EmailSender from "./EmailSender";

const NO_PLAN = "No plan decided";
const CUSTOM = "__custom_plan";
import { fullBillPDF, paymentInvoicePDF } from "@/lib/pdfLazy";

type SendTarget = { kind: "payment"; payment: Payment } | { kind: "full" };

export default function BillingPanel({ clientId }: { clientId: string }) {
  const { db, update, saving } = useStore();
  const [justAdded, setJustAdded] = useState<string | null>(null);
  const nextInvoice = `${db.settings.invoicePrefix}${String(db.invoiceCounter + 1).padStart(4, "0")}`;
  const c = db.clients.find((x) => x.id === clientId)!;
  const pays = db.payments
    .filter((p) => p.clientId === clientId)
    .sort((a, b) => b.date.localeCompare(a.date) || b.invoiceNo.localeCompare(a.invoiceNo));
  const paid = pays.filter(isPaid).reduce((s, p) => s + p.amount, 0);
  const dueTotal = pays.filter((p) => !isPaid(p)).reduce((s, p) => s + p.amount, 0);
  const dueCount = pays.filter((p) => !isPaid(p)).length;
  const decided = planDecided(c);
  const billed = billedToDate(db, c);
  const bal = decided ? billed - paid : 0;
  const breakdown = planBreakdown(db, c);
  const hasRecurring = breakdown.rows.some((r) => r.schedule.recurring);
  const nextRenewal = breakdown.rows.map((r) => r.schedule.nextDate).filter(Boolean).sort()[0] ?? "";
  const planTotals = {
    amount: breakdown.rows.reduce((s, r) => s + r.amount, 0),
    paid: breakdown.rows.reduce((s, r) => s + r.paid, 0) + breakdown.other.paid,
    due: breakdown.rows.reduce((s, r) => s + r.due, 0) + breakdown.other.due,
    remaining: 0,
  };
  planTotals.remaining = Math.max(0, planTotals.amount - planTotals.paid);

  const [form, setForm] = useState<Payment | null>(null);
  const [err, setErr] = useState("");
  const [send, setSend] = useState<SendTarget | null>(null);

  useEffect(() => {
    if (!justAdded || saving) return;
    const p = db.payments.find((x) => x.id === justAdded);
    setJustAdded(null);
    if (p) setSend({ kind: "payment", payment: p });
  }, [justAdded, saving, db.payments]);

  const allServices = Array.from(new Set([...db.settings.services, ...c.services]));
  const planCategories = Array.from(new Set(db.settings.plans.map((x) => x.category)));
  const planOptionLabel = (x: { category: string; name: string }) => `${x.category}: ${x.name}`;

  const [customPlan, setCustomPlan] = useState(false);

  const openNew = () => {
    setCustomPlan(false);
    setErr("");
    setForm({ id: "", clientId, date: todayISO(), amount: 0, mode: "UPI", invoiceNo: "", note: "", service: c.services[0] ?? "", plan: NO_PLAN, status: "Paid" });
  };

  const markPaid = (p: Payment) => {
    setErr("");
    setCustomPlan(!!p.plan && p.plan !== NO_PLAN && !db.settings.plans.some((x) => planOptionLabel(x) === p.plan) && !clientPlans(c).some((x) => planName(x) === p.plan));
    setForm({ ...p, status: "Paid", date: todayISO() });
  };

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    if (!form.amount || form.amount <= 0) return setErr("Enter a valid amount");
    if (!form.date) return setErr("Pick a date");
    if (customPlan && !(form.plan ?? "").trim()) return setErr("Type the custom plan name");
    if (form.id) {
      update((d) => ({ ...d, payments: d.payments.map((p) => (p.id === form.id ? form : p)) }));
      setForm(null);
    } else {
      const id = uid("p");
      update((d) => ({ ...d, invoiceCounter: d.invoiceCounter + 1, payments: [...d.payments, { ...form, id, invoiceNo: nextInvoice }] }));
      setForm(null);
      setJustAdded(id);
    }
  };

  const del = (p: Payment) => {
    if (confirm(`Delete ${p.invoiceNo} (${inr(p.amount)})?`)) {
      update((d) => ({ ...d, payments: d.payments.filter((x) => x.id !== p.id) }));
    }
  };

  const sendMsg = (t: SendTarget) =>
    t.kind === "payment" && !isPaid(t.payment)
      ? `Hello ${c.name},\n\nPlease find attached invoice ${t.payment.invoiceNo} dated ${fmtDate(t.payment.date)}${t.payment.service ? ` for ${t.payment.service}` : ""}.\n\nAmount due: ${inr(t.payment.amount)}\n\nKindly make the payment at your earliest convenience.\n\nThank you,\n${db.company.name}`
      : t.kind === "payment"
      ? `Hello ${c.name},\n\nWe have received your payment of ${inr(t.payment.amount)}${t.payment.service ? ` for ${t.payment.service}` : ""} (${t.payment.mode}, ${fmtDate(t.payment.date)}). Please find invoice ${t.payment.invoiceNo} attached.\n\n${decided ? `Total billed till date: ${inr(billedToDate(db, c, t.payment.date))}\nBalance due: ${inr(Math.max(0, billedToDate(db, c, t.payment.date) - db.payments.filter((p) => p.clientId === c.id && (p.date < t.payment.date || (p.date === t.payment.date && p.invoiceNo <= t.payment.invoiceNo)) && isPaid(p)).reduce((s, p) => s + p.amount, 0)))}` : "This has been recorded as an advance. Your plan and final amount will be confirmed soon."}\n\nThank you,\n${db.company.name}`
      : `Hello ${c.name},\n\nPlease find your complete bill to date attached.\n\n${decided ? `Total billing: ${inr(billed)}\nTotal received: ${inr(paid)}\nBalance due: ${inr(Math.max(0, bal, dueTotal))}${nextRenewal ? `\nNext renewal: ${fmtDate(nextRenewal)}` : ""}` : `Advance received: ${inr(paid)}${dueTotal ? `\nAmount due: ${inr(dueTotal)}` : ""}\nPlan and final amount: to be decided`}\n\nThank you,\n${db.company.name}`;

  const download = (t: SendTarget) => (t.kind === "payment" ? paymentInvoicePDF(db, t.payment) : fullBillPDF(db, clientId));

  return (
    <div className="space-y-4">
      <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium text-slate-900">{c.business} · Billing</p>
          <p className="text-xs text-slate-500">
            {pays.length} {pays.length === 1 ? "bill" : "bills"}{dueCount ? ` (${dueCount} due)` : ""} · {c.gstApplicable && db.company.gst ? `GST invoice (${db.settings.gstRate}%)` : "Invoice without GST"}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <Button onClick={openNew} className="order-first col-span-2 sm:order-last">
            <Plus size={16} /> Add Payment
          </Button>
          <Button variant="secondary" onClick={() => fullBillPDF(db, clientId)} disabled={!pays.length}>
            <Download size={16} /> <span className="sm:hidden">Full Bill</span><span className="hidden sm:inline">Download Full Bill</span>
          </Button>
          <Button variant="secondary" onClick={() => setSend({ kind: "full" })} disabled={!pays.length}>
            <Send size={16} /> <span className="sm:hidden">Send Bill</span><span className="hidden sm:inline">Send Full Bill</span>
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 [&>*:first-child]:col-span-2 sm:[&>*:first-child]:col-span-1">
        {decided ? (
          <>
            <StatCard label={hasRecurring ? "Billed till date" : "Total billing"} value={inr(billed)} hint={nextRenewal ? `Next renewal ${fmtDate(nextRenewal)}` : planSummary(c) || undefined} />
            <StatCard label="Total received" value={inr(paid)} tone="good" />
            <StatCard label="Balance pending" value={inr(Math.max(0, bal, dueTotal))} tone={Math.max(bal, dueTotal) > 0 ? "bad" : "good"} hint={dueCount ? `${dueCount} unpaid bill${dueCount > 1 ? "s" : ""} · ${inr(dueTotal)}` : bal < 0 ? `Fully paid · ${inr(-bal)} extra received` : bal === 0 ? "Fully paid" : undefined} />
          </>
        ) : (
          <>
            <StatCard label="Plan" value="Not decided" tone="warn" hint="Set the plan from Edit client" />
            <StatCard label="Advance received" value={inr(paid)} tone="good" />
            {dueTotal > 0 ? (
              <StatCard label="Bills due" value={inr(dueTotal)} tone="bad" hint={`${dueCount} unpaid bill${dueCount > 1 ? "s" : ""}`} />
            ) : (
              <StatCard label="Balance pending" value="—" hint="Shows once the plan is decided" />
            )}
          </>
        )}
      </div>

      {breakdown.rows.length > 0 && (
        <Card className="overflow-hidden">
          <div className="border-b border-slate-100 px-4 py-3">
            <h3 className="font-medium text-slate-900">Plan-wise summary</h3>
            <p className="text-xs text-slate-500">Payments are counted against the plan chosen on each bill. Renewing plans are billed once per cycle from their start date.</p>
          </div>
          <ul className="divide-y divide-slate-100 md:hidden">
            {breakdown.rows.map((r) => (
              <li key={r.label} className="px-4 py-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[15px] font-medium text-slate-900">{r.label}</p>
                    <p className="text-xs text-slate-500">
                      {r.cycle || "—"}{r.schedule.recurring ? ` · ${inr(r.price)} / cycle · ${periodLabel(r.schedule, r.cycle)}` : ""}
                    </p>
                  </div>
                  <span className={`shrink-0 text-[15px] font-semibold tabular-nums ${r.remaining > 0 ? "text-red-600" : "text-emerald-600"}`}>{r.remaining > 0 ? inr(r.remaining) : "Paid"}</span>
                </div>
                <div className="mt-2.5 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-2.5 text-center">
                  <div><p className="text-[10px] uppercase tracking-wide text-slate-500">Billed</p><p className="text-sm font-medium tabular-nums text-slate-900">{inr(r.amount)}</p></div>
                  <div><p className="text-[10px] uppercase tracking-wide text-slate-500">Paid</p><p className="text-sm font-medium tabular-nums text-emerald-600">{inr(r.paid)}</p></div>
                  <div><p className="text-[10px] uppercase tracking-wide text-slate-500">Bill due</p><p className={`text-sm font-medium tabular-nums ${r.due ? "text-red-600" : "text-slate-400"}`}>{r.due ? inr(r.due) : "—"}</p></div>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Started {fmtDate(r.schedule.start)}
                  {r.schedule.nextDate ? <> · Next renewal <span className="font-medium text-slate-700">{fmtDate(r.schedule.nextDate)}</span></> : r.schedule.ended ? " · Stopped" : " · One-time"}
                </p>
              </li>
            ))}
            {(breakdown.other.paid > 0 || breakdown.other.due > 0) && (
              <li className="bg-amber-50/50 px-4 py-3.5">
                <p className="text-[15px] font-medium text-slate-700">Other payments</p>
                <p className="text-xs text-slate-500">No plan chosen on the bill</p>
                <p className="mt-1.5 text-sm">
                  <span className="text-emerald-600">Paid {inr(breakdown.other.paid)}</span>
                  {breakdown.other.due > 0 && <span className="text-red-600"> · Due {inr(breakdown.other.due)}</span>}
                </p>
              </li>
            )}
            <li className="flex items-center justify-between bg-slate-50 px-4 py-3">
              <span className="font-semibold text-slate-900">Total remaining</span>
              <span className="font-semibold tabular-nums text-red-600">{inr(planTotals.remaining)}</span>
            </li>
          </ul>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[860px]">
              <thead className="bg-slate-50">
                <tr><Th>Plan</Th><Th>Cycle</Th><Th>Start</Th><Th>Next renewal</Th><Th right>Billed till date</Th><Th right>Paid</Th><Th right>Bill due</Th><Th right>Remaining</Th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {breakdown.rows.map((r) => (
                  <tr key={r.label}>
                    <Td className="font-medium text-slate-900">{r.label}</Td>
                    <Td>{r.cycle || "—"}{r.schedule.recurring && <span className="block text-xs text-slate-400">{inr(r.price)} / cycle</span>}</Td>
                    <Td className="whitespace-nowrap">{fmtDate(r.schedule.start)}</Td>
                    <Td className="whitespace-nowrap">{r.schedule.nextDate ? <RenewalDate iso={r.schedule.nextDate} /> : r.schedule.ended ? <span className="text-slate-400">Stopped</span> : <span className="text-slate-400">One-time</span>}</Td>
                    <Td right>{inr(r.amount)}{r.schedule.recurring && <span className="block text-xs text-slate-400">{periodLabel(r.schedule, r.cycle)}</span>}</Td>
                    <Td right className="text-emerald-600">{inr(r.paid)}</Td>
                    <Td right className={r.due ? "text-red-600" : "text-slate-400"}>{r.due ? inr(r.due) : "—"}</Td>
                    <Td right className={r.remaining > 0 ? "font-semibold text-red-600" : "font-semibold text-emerald-600"}>{r.remaining > 0 ? inr(r.remaining) : "Fully paid"}</Td>
                  </tr>
                ))}
                {(breakdown.other.paid > 0 || breakdown.other.due > 0) && (
                  <tr className="bg-amber-50/40">
                    <Td className="text-slate-600">Other payments <span className="block text-xs text-slate-400">No plan chosen on the bill. Edit the bill to link it to a plan.</span></Td>
                    <Td>—</Td>
                    <Td>—</Td>
                    <Td>—</Td>
                    <Td right>—</Td>
                    <Td right className="text-emerald-600">{inr(breakdown.other.paid)}</Td>
                    <Td right className={breakdown.other.due ? "text-red-600" : "text-slate-400"}>{breakdown.other.due ? inr(breakdown.other.due) : "—"}</Td>
                    <Td right>—</Td>
                  </tr>
                )}
              </tbody>
              <tfoot className="bg-slate-50 font-semibold">
                <tr>
                  <Td className="font-semibold text-slate-900">Total</Td>
                  <Td />
                  <Td />
                  <Td />
                  <Td right className="font-semibold">{inr(planTotals.amount)}</Td>
                  <Td right className="font-semibold text-emerald-600">{inr(planTotals.paid)}</Td>
                  <Td right className="font-semibold text-red-600">{planTotals.due ? inr(planTotals.due) : "—"}</Td>
                  <Td right className="font-semibold text-red-600">{inr(planTotals.remaining)}</Td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="border-b border-slate-100 px-4 py-3">
          <h3 className="font-medium text-slate-900">Billing history</h3>
        </div>
        {pays.length === 0 ? (
          <Empty text="No payments yet. Use 'Add Payment' to record the first one." />
        ) : (
          <>
          <ul className="divide-y divide-slate-100 md:hidden">
            {pays.map((p) => (
              <li key={p.id} className="px-4 py-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[15px] font-medium text-slate-900">{[p.service, p.plan && p.plan !== NO_PLAN ? p.plan : ""].filter(Boolean).join(" · ") || "Payment"}</p>
                    <p className="mt-0.5 text-xs text-slate-500"><span className="font-mono">{p.invoiceNo}</span> · {fmtDate(p.date)}</p>
                    {p.note && <p className="mt-0.5 text-xs text-slate-500">{p.note}</p>}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[15px] font-semibold tabular-nums text-slate-900">{inr(p.amount)}</p>
                    <div className="mt-1">{isPaid(p) ? <Badge tone="green">Paid · {p.mode}</Badge> : <Badge tone="red">Due</Badge>}</div>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  {!isPaid(p) && <Button size="sm" onClick={() => markPaid(p)}>Mark as paid</Button>}
                  <Button size="sm" variant="secondary" onClick={() => paymentInvoicePDF(db, p)}><FileText size={14} /> PDF</Button>
                  <Button size="sm" variant="secondary" onClick={() => setSend({ kind: "payment", payment: p })}><Send size={14} /> Send</Button>
                  <div className="ml-auto flex">
                    <Button size="sm" variant="ghost" onClick={() => { setErr(""); setCustomPlan(!!p.plan && p.plan !== NO_PLAN && !db.settings.plans.some((x) => planOptionLabel(x) === p.plan) && !clientPlans(c).some((x) => planName(x) === p.plan)); setForm(p); }} aria-label="Edit">
                      <Pencil size={15} />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => del(p)} aria-label="Delete">
                      <Trash2 size={15} className="text-red-500" />
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[880px]">
              <thead className="bg-slate-50">
                <tr>
                  <Th>Date</Th>
                  <Th>Invoice No.</Th>
                  <Th>Status</Th>
                  <Th>Service</Th>
                  <Th>Plan</Th>
                  <Th>Note</Th>
                  <Th right>Amount</Th>
                  <Th right>Actions</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pays.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/60">
                    <Td>{fmtDate(p.date)}</Td>
                    <Td className="font-mono text-xs">{p.invoiceNo}</Td>
                    <Td>{isPaid(p) ? <Badge tone="green">Paid · {p.mode}</Badge> : <Badge tone="red">Due</Badge>}</Td>
                    <Td className="text-slate-700">{p.service || "—"}</Td>
                    <Td className="text-slate-500">{p.plan || "—"}</Td>
                    <Td className="text-slate-500">{p.note || "—"}</Td>
                    <Td right className="font-semibold text-slate-900">{inr(p.amount)}</Td>
                    <Td right>
                      <div className="flex justify-end gap-1">
                        {!isPaid(p) && (
                          <Button size="sm" onClick={() => markPaid(p)} title="Payment received">
                            Mark as paid
                          </Button>
                        )}
                        <Button size="sm" variant="secondary" onClick={() => paymentInvoicePDF(db, p)} title="Download PDF">
                          <FileText size={14} /> PDF
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => setSend({ kind: "payment", payment: p })} title="Send">
                          <Send size={14} /> Send
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => { setErr(""); setCustomPlan(!!p.plan && p.plan !== NO_PLAN && !db.settings.plans.some((x) => planOptionLabel(x) === p.plan) && !clientPlans(c).some((x) => planName(x) === p.plan)); setForm(p); }} aria-label="Edit">
                          <Pencil size={14} />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => del(p)} aria-label="Delete">
                          <Trash2 size={14} className="text-red-500" />
                        </Button>
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </Card>

      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? `Edit payment · ${form.invoiceNo}` : "Add a payment"}>
        {form && (
          <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
            <Field label="Date">
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </Field>
            <Field label="Amount (₹)">
              <Input type="number" min={1} value={form.amount || ""} onChange={(e) => { setErr(""); setForm({ ...form, amount: Number(e.target.value) }); }} autoFocus />
            </Field>
            <Field label="Service" full>
              <Select
                value={form.service ?? ""}
                onChange={(e) => { setCustomPlan(false); setForm({ ...form, service: e.target.value, plan: NO_PLAN }); }}
                options={[{ value: "", label: "Select service" }, ...Array.from(new Set([...allServices, form.service ?? ""].filter(Boolean)))]}
              />
            </Field>
            <Field label="Plan" full>
              <select
                value={customPlan ? CUSTOM : form.plan || NO_PLAN}
                onChange={(e) => {
                  if (e.target.value === CUSTOM) { setCustomPlan(true); setForm({ ...form, plan: "" }); }
                  else { setCustomPlan(false); setForm({ ...form, plan: e.target.value }); }
                }}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none lg:rounded-lg lg:py-2 focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              >
                <option value={NO_PLAN}>No plan decided</option>
                {clientPlans(c).length > 0 && planDecided(c) && (
                  <optgroup label="This client's plans">
                    {clientPlans(c).map((x) => (
                      <option key={`cp-${x.id}`} value={planName(x)}>{planName(x)} — {inr(x.price)}{x.cycle ? ` / ${x.cycle}` : ""}</option>
                    ))}
                  </optgroup>
                )}
                {planCategoriesForService(form.service ?? "", planCategories).map((cat) => (
                  <optgroup key={cat} label={cat}>
                    {db.settings.plans.filter((x) => x.category === cat).map((x) => (
                      <option key={x.id} value={planOptionLabel(x)}>{x.category} · {x.name} — {inr(x.price)}{x.cycle ? ` / ${x.cycle}` : ""}</option>
                    ))}
                  </optgroup>
                ))}
                <optgroup label="Custom">
                  <option value={CUSTOM}>Custom plan (type name)</option>
                </optgroup>
              </select>
              {customPlan && (
                <Input className="mt-2" value={form.plan ?? ""} onChange={(e) => { setErr(""); setForm({ ...form, plan: e.target.value }); }} placeholder="Type plan name, e.g. GMB Special – 3 months" autoFocus />
              )}
              {!customPlan && form.service && planCategoriesForService(form.service, planCategories).length === 0 && (
                <span className="text-xs text-slate-500">No plans linked to {form.service}. Choose &quot;No plan decided&quot; or type a custom plan.</span>
              )}
            </Field>
            <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 sm:col-span-2">
              <input type="checkbox" checked={form.status === "Due"} onChange={(e) => setForm({ ...form, status: e.target.checked ? "Due" : "Paid" })} className="h-4 w-4 accent-red-500" />
              Payment not received yet (mark as due)
            </label>
            {form.status !== "Due" && <Field label="Payment mode">
              <Select value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value as PayMode })} options={PAY_MODES} />
            </Field>}
            <Field label="Note">
              <Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="e.g. 2nd installment" />
            </Field>
            {!form.id && (
              <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600 sm:col-span-2">
                Invoice number will be: <b>{nextInvoice}</b> · {form.status === "Due" ? "This bill will show as due until you mark it as paid" : decided ? `Currently due: ${inr(Math.max(0, bal))}` : "Plan not decided, this will be recorded as an advance"}
                {form.status !== "Due" && decided && form.amount > bal && bal > 0 && <span className="ml-1 text-amber-600">(more than the amount due)</span>}
              </p>
            )}
            {err && <p className="text-sm text-red-600 sm:col-span-2">{err}</p>}
            <div className="flex justify-end gap-2 sm:col-span-2">
              <Button type="button" variant="secondary" onClick={() => setForm(null)}>Cancel</Button>
              <Button type="submit">{form.status === "Due" ? "Save as due" : "Save payment"}</Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal wide open={!!send} onClose={() => setSend(null)} title={send?.kind === "payment" ? `Send invoice · ${send.payment.invoiceNo}` : "Send full bill"}>
        {send && (
          <div className="space-y-4">
            <EmailSender
              key={send.kind === "payment" ? send.payment.id : "full"}
              client={c}
              subject={send.kind === "payment" ? `Invoice ${send.payment.invoiceNo} - ${db.company.name}` : `Your bill - ${db.company.name}`}
              message={sendMsg(send)}
              logLabel={send.kind === "payment" ? `Invoice ${send.payment.invoiceNo}` : "Full bill"}
              makePdf={() => (send.kind === "payment" ? paymentInvoicePDF(db, send.payment, "base64") : fullBillPDF(db, clientId, "base64"))}
            />
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Or share another way</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button variant="whatsapp" onClick={() => { download(send); window.open(waLink(c.whatsapp || c.phone, sendMsg(send)), "_blank"); }}>
                <MessageCircle size={16} /> WhatsApp
              </Button>
              <Button variant="secondary" onClick={() => download(send)}>
                <Download size={16} /> Download PDF
              </Button>
            </div>
            <p className="text-xs text-slate-500">WhatsApp: the PDF downloads and WhatsApp opens with the message. Attach the PDF there and send.</p>
          </div>
        )}
      </Modal>
    </div>
  );
}

function RenewalDate({ iso }: { iso: string }) {
  const days = daysBetween(todayISO(), iso);
  return (
    <span>
      {fmtDate(iso)}
      <span className={`block text-xs ${days <= 7 ? "text-red-600" : days <= 30 ? "text-amber-600" : "text-slate-400"}`}>
        {days === 0 ? "Today" : days === 1 ? "Tomorrow" : `in ${days} days`}
      </span>
    </span>
  );
}
