"use client";

import { useState } from "react";
import { Download, FileText, Mail, Pencil, Plus, Send, Trash2, MessageCircle } from "lucide-react";
import { useStore, uid } from "@/lib/store";
import { PAY_MODES, Payment, PayMode } from "@/lib/types";
import { Badge, Button, Card, Empty, Field, Input, Modal, Select, StatCard, Td, Th } from "./ui";
import { fmtDate, inr, mailLink, todayISO, waLink } from "@/lib/format";
import { fullBillPDF, paymentInvoicePDF } from "@/lib/pdf";

type SendTarget = { kind: "payment"; payment: Payment } | { kind: "full" };

export default function BillingPanel({ clientId }: { clientId: string }) {
  const { db, update } = useStore();
  const c = db.clients.find((x) => x.id === clientId)!;
  const pays = db.payments
    .filter((p) => p.clientId === clientId)
    .sort((a, b) => b.date.localeCompare(a.date) || b.invoiceNo.localeCompare(a.invoiceNo));
  const paid = pays.reduce((s, p) => s + p.amount, 0);
  const bal = c.totalBilling - paid;

  const [form, setForm] = useState<Payment | null>(null);
  const [err, setErr] = useState("");
  const [send, setSend] = useState<SendTarget | null>(null);

  const openNew = () => {
    setErr("");
    setForm({ id: "", clientId, date: todayISO(), amount: 0, mode: "UPI", invoiceNo: "", note: "" });
  };

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    if (!form.amount || form.amount <= 0) return setErr("Sahi amount daalein");
    if (!form.date) return setErr("Date chunein");
    if (form.id) {
      update((d) => ({ ...d, payments: d.payments.map((p) => (p.id === form.id ? form : p)) }));
      setForm(null);
    } else {
      let created: Payment | null = null;
      update((d) => {
        const n = d.invoiceCounter + 1;
        created = { ...form, id: uid("p"), invoiceNo: `GV-${String(n).padStart(4, "0")}` };
        return { ...d, invoiceCounter: n, payments: [...d.payments, created] };
      });
      setForm(null);
      setTimeout(() => created && setSend({ kind: "payment", payment: created }), 50);
    }
  };

  const del = (p: Payment) => {
    if (confirm(`${p.invoiceNo} (${inr(p.amount)}) delete karna hai?`)) {
      update((d) => ({ ...d, payments: d.payments.filter((x) => x.id !== p.id) }));
    }
  };

  const sendMsg = (t: SendTarget) =>
    t.kind === "payment"
      ? `Namaste ${c.name} ji,\n\nAapka ${inr(t.payment.amount)} ka payment (${t.payment.mode}, ${fmtDate(t.payment.date)}) receive ho gaya hai. Invoice No. ${t.payment.invoiceNo} attach hai.\n\nTotal package: ${inr(c.totalBilling)}\nBalance: ${inr(c.totalBilling - db.payments.filter((p) => p.clientId === c.id && (p.date < t.payment.date || (p.date === t.payment.date && p.invoiceNo <= t.payment.invoiceNo))).reduce((s, p) => s + p.amount, 0))}\n\nDhanyavaad,\n${db.company.name}`
      : `Namaste ${c.name} ji,\n\nAapka ab tak ka poora bill attach hai.\n\nTotal billing: ${inr(c.totalBilling)}\nTotal received: ${inr(paid)}\nBalance: ${inr(bal)}\n\nDhanyavaad,\n${db.company.name}`;

  const download = (t: SendTarget) => (t.kind === "payment" ? paymentInvoicePDF(db, t.payment) : fullBillPDF(db, clientId));

  return (
    <div className="space-y-4">
      <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium text-slate-900">{c.business} · Billing</p>
          <p className="text-xs text-slate-500">
            {pays.length} payments · {c.gstApplicable ? "GST invoice (18%)" : "Bina GST"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => fullBillPDF(db, clientId)} disabled={!pays.length}>
            <Download size={16} /> Download Full Bill
          </Button>
          <Button variant="secondary" onClick={() => setSend({ kind: "full" })} disabled={!pays.length}>
            <Send size={16} /> Send Full Bill
          </Button>
          <Button onClick={openNew}>
            <Plus size={16} /> Add Payment
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total billing" value={inr(c.totalBilling)} />
        <StatCard label="Total received" value={inr(paid)} tone="good" />
        <StatCard label="Balance pending" value={inr(bal)} tone={bal > 0 ? "bad" : "good"} hint={bal <= 0 ? "Fully paid" : undefined} />
      </div>

      <Card className="overflow-hidden">
        <div className="border-b border-slate-100 px-4 py-3">
          <h3 className="font-medium text-slate-900">Billing history</h3>
        </div>
        {pays.length === 0 ? (
          <Empty text="Abhi tak koi payment nahi. 'Add Payment' se pehli payment jodein." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead className="bg-slate-50">
                <tr>
                  <Th>Date</Th>
                  <Th>Invoice No.</Th>
                  <Th>Mode</Th>
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
                    <Td><Badge tone="blue">{p.mode}</Badge></Td>
                    <Td className="text-slate-500">{p.note || "—"}</Td>
                    <Td right className="font-semibold text-slate-900">{inr(p.amount)}</Td>
                    <Td right>
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="secondary" onClick={() => paymentInvoicePDF(db, p)} title="PDF download">
                          <FileText size={14} /> PDF
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => setSend({ kind: "payment", payment: p })} title="Send">
                          <Send size={14} /> Send
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => { setErr(""); setForm(p); }} aria-label="Edit">
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
        )}
      </Card>

      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? `Payment edit · ${form.invoiceNo}` : "Nayi payment add karein"}>
        {form && (
          <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
            <Field label="Date">
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </Field>
            <Field label="Amount (₹)">
              <Input type="number" min={1} value={form.amount || ""} onChange={(e) => { setErr(""); setForm({ ...form, amount: Number(e.target.value) }); }} autoFocus />
            </Field>
            <Field label="Payment mode">
              <Select value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value as PayMode })} options={PAY_MODES} />
            </Field>
            <Field label="Note">
              <Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Jaise: 2nd installment" />
            </Field>
            {!form.id && (
              <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600 sm:col-span-2">
                Invoice number apne aap banega: <b>GV-{String(db.invoiceCounter + 1).padStart(4, "0")}</b> · Abhi baaki: {inr(bal)}
                {form.amount > bal && bal > 0 && <span className="ml-1 text-amber-600">(amount baaki se zyada hai)</span>}
              </p>
            )}
            {err && <p className="text-sm text-red-600 sm:col-span-2">{err}</p>}
            <div className="flex justify-end gap-2 sm:col-span-2">
              <Button type="button" variant="secondary" onClick={() => setForm(null)}>Cancel</Button>
              <Button type="submit">Save payment</Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={!!send} onClose={() => setSend(null)} title={send?.kind === "payment" ? `Invoice bhejein · ${send.payment.invoiceNo}` : "Full bill bhejein"}>
        {send && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Button dabane par PDF download hoga aur WhatsApp/Email message ke saath khulega. Wahan downloaded PDF attach karke bhej dein.
            </p>
            <pre className="whitespace-pre-wrap rounded-lg bg-slate-50 p-3 font-sans text-xs text-slate-700">{sendMsg(send)}</pre>
            <div className="grid gap-2 sm:grid-cols-3">
              <Button variant="whatsapp" onClick={() => { download(send); window.open(waLink(c.whatsapp || c.phone, sendMsg(send)), "_blank"); }}>
                <MessageCircle size={16} /> WhatsApp
              </Button>
              <Button variant="secondary" onClick={() => { download(send); window.location.href = mailLink(c.email, send.kind === "payment" ? `Invoice ${send.payment.invoiceNo} - ${db.company.name}` : `Full Bill - ${db.company.name}`, sendMsg(send)); }} disabled={!c.email}>
                <Mail size={16} /> Email
              </Button>
              <Button variant="secondary" onClick={() => download(send)}>
                <Download size={16} /> Sirf PDF
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
