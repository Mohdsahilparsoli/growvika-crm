"use client";

import Link from "next/link";
import { useState } from "react";
import { FileText } from "lucide-react";
import { useStore } from "@/lib/store";
import { Badge, Button, Card, PageHeader, Select, StatCard, Td, Th, Empty } from "@/components/ui";
import { billedToDate, clientBalance, fmtDate, inr, inRange, paidFor, planDecided, RANGE_LABELS, RangeKey, dueFor, isPaid, pendingFor } from "@/lib/format";
import { paymentInvoicePDF } from "@/lib/pdfLazy";

export default function BillingPage() {
  const { db } = useStore();
  const [range, setRange] = useState<RangeKey>("all");

  const totalBilling = db.clients.reduce((s, c) => s + billedToDate(db, c), 0);
  const received = db.payments.filter(isPaid).reduce((s, p) => s + p.amount, 0);
  const pending = db.clients.reduce((s, c) => s + pendingFor(db, c.id), 0);
  const dueCount = db.payments.filter((p) => !isPaid(p)).length;
  const recent = db.payments
    .filter((p) => inRange(p.date, range))
    .sort((a, b) => b.date.localeCompare(a.date) || b.invoiceNo.localeCompare(a.invoiceNo));
  const rangeTotal = recent.filter(isPaid).reduce((s, p) => s + p.amount, 0);

  return (
    <div>
      <PageHeader title="Billing" subtitle="Billing for all clients in one place. Click a client to see its full history and Full Bill." />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 [&>*:first-child]:col-span-2 sm:[&>*:first-child]:col-span-1">
        <StatCard label="Total billed till date" value={inr(totalBilling)} hint={`${db.clients.length} clients`} />
        <StatCard label="Total received" value={inr(received)} tone="good" hint={`${db.payments.length - dueCount} payments`} />
        <StatCard label="Total pending" value={inr(pending)} tone="bad" hint={dueCount ? `${dueCount} unpaid bills` : undefined} />
      </div>

      <Card className="mt-4 overflow-hidden lg:mt-6">
        <div className="border-b border-slate-100 px-4 py-3">
          <h3 className="font-medium text-slate-900">Billing by client</h3>
        </div>
        {/* Phones: one row per client */}
        <ul className="divide-y divide-slate-100 md:hidden">
          {db.clients.map((c) => {
            const paid = paidFor(db, c.id);
            const decided = planDecided(c);
            const due = dueFor(db, c.id);
            const billed = billedToDate(db, c);
            const bal = Math.max(decided ? billed - paid : 0, due);
            const pct = decided && billed ? Math.min(100, (paid / billed) * 100) : 0;
            return (
              <li key={c.id}>
                <Link href={`/clients/${c.id}?tab=billing`} className="block px-4 py-3 active:bg-slate-50">
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-[15px] font-medium text-slate-900">{c.business}</p>
                    <span className={`shrink-0 text-[15px] font-semibold tabular-nums ${bal > 0 ? "text-red-600" : decided ? "text-emerald-600" : "text-amber-600"}`}>
                      {bal > 0 ? inr(bal) : decided ? "Paid" : "Not decided"}
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-3">
                    <div className="h-1.5 flex-1 rounded-full bg-slate-100"><div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${pct}%` }} /></div>
                    <span className="shrink-0 text-xs text-slate-500">{inr(paid)}{decided ? ` of ${inr(billed)}` : " advance"}</span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[640px]">
            <thead className="bg-slate-50">
              <tr><Th>Client</Th><Th right>Billed till date</Th><Th right>Received</Th><Th right>Due</Th><Th right>Status</Th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {db.clients.map((c) => {
                const paid = paidFor(db, c.id);
                const decided = planDecided(c);
                const due = dueFor(db, c.id);
                const billed = billedToDate(db, c);
                const bal = Math.max(decided ? billed - paid : 0, due);
                const pct = decided && billed ? Math.min(100, (paid / billed) * 100) : 0;
                return (
                  <tr key={c.id} className="hover:bg-slate-50/60">
                    <Td>
                      <Link href={`/clients/${c.id}?tab=billing`} className="font-medium text-slate-900 hover:text-brand-600">{c.business}</Link>
                      <div className="mt-1.5 h-1.5 w-40 rounded-full bg-slate-100">
                        <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
                      </div>
                    </Td>
                    <Td right>{decided ? inr(billed) : <span className="text-amber-600">Not decided</span>}</Td>
                    <Td right className="text-emerald-600">{inr(paid)}</Td>
                    <Td right className={bal > 0 ? "font-medium text-red-600" : "text-slate-400"}>{decided || due ? inr(Math.max(0, bal)) : "—"}</Td>
                    <Td right>{due > 0 ? <Badge tone="red">Bill due</Badge> : !decided ? <Badge tone="amber">{paid > 0 ? "Advance" : "Plan pending"}</Badge> : bal <= 0 ? <Badge tone="green">Paid</Badge> : paid > 0 ? <Badge tone="amber">Partial</Badge> : <Badge tone="red">Pending</Badge>}</Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="mt-4 overflow-hidden lg:mt-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div>
            <h3 className="font-medium text-slate-900">All payments</h3>
            <p className="text-xs text-slate-500">{recent.length} payments · {inr(rangeTotal)}</p>
          </div>
          <Select value={range} onChange={(e) => setRange(e.target.value as RangeKey)} options={(Object.keys(RANGE_LABELS) as RangeKey[]).map((k) => ({ value: k, label: RANGE_LABELS[k] }))} className="w-44" />
        </div>
        {recent.length === 0 ? <Empty text="No payments in this period" /> : (
          <>
          <ul className="divide-y divide-slate-100 md:hidden">
            {recent.map((p) => {
              const c = db.clients.find((x) => x.id === p.clientId);
              return (
                <li key={p.id} className="flex items-center gap-3 px-4 py-3">
                  <Link href={c ? `/clients/${c.id}?tab=billing` : "#"} className="min-w-0 flex-1 active:opacity-60">
                    <p className="truncate text-[15px] font-medium text-slate-900">{c?.business ?? "—"}</p>
                    <p className="truncate text-xs text-slate-500">{fmtDate(p.date)} · <span className="font-mono">{p.invoiceNo}</span>{p.service ? ` · ${p.service}` : ""}</p>
                  </Link>
                  <div className="shrink-0 text-right">
                    <p className="text-[15px] font-semibold tabular-nums text-slate-900">{inr(p.amount)}</p>
                    <p className={`text-xs ${isPaid(p) ? "text-slate-500" : "font-medium text-red-600"}`}>{isPaid(p) ? p.mode : "Due"}</p>
                  </div>
                  {c && (
                    <button onClick={() => paymentInvoicePDF(db, p)} aria-label="Download PDF" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 active:bg-slate-200">
                      <FileText size={16} />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[640px]">
              <thead className="bg-slate-50">
                <tr><Th>Date</Th><Th>Invoice</Th><Th>Client</Th><Th>For</Th><Th>Mode</Th><Th right>Amount</Th><Th right></Th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recent.map((p) => {
                  const c = db.clients.find((x) => x.id === p.clientId);
                  return (
                    <tr key={p.id}>
                      <Td>{fmtDate(p.date)}</Td>
                      <Td className="font-mono text-xs">{p.invoiceNo}</Td>
                      <Td>{c?.business ?? "—"}</Td>
                      <Td className="text-slate-500">{[p.service, p.plan].filter(Boolean).join(" · ") || "—"}</Td>
                      <Td>{isPaid(p) ? <Badge tone="blue">{p.mode}</Badge> : <Badge tone="red">Due</Badge>}</Td>
                      <Td right className="font-semibold text-slate-900">{inr(p.amount)}</Td>
                      <Td right>{c && <Button size="sm" variant="secondary" onClick={() => paymentInvoicePDF(db, p)}><FileText size={14} /> PDF</Button>}</Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </>
        )}
      </Card>
    </div>
  );
}
