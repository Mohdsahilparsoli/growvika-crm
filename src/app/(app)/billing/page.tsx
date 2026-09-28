"use client";

import Link from "next/link";
import { useState } from "react";
import { FileText } from "lucide-react";
import { useStore } from "@/lib/store";
import { Badge, Button, Card, PageHeader, Select, StatCard, Td, Th, Empty } from "@/components/ui";
import { clientBalance, fmtDate, inr, inRange, paidFor, RANGE_LABELS, RangeKey } from "@/lib/format";
import { paymentInvoicePDF } from "@/lib/pdf";

export default function BillingPage() {
  const { db } = useStore();
  const [range, setRange] = useState<RangeKey>("all");

  const totalBilling = db.clients.reduce((s, c) => s + c.totalBilling, 0);
  const received = db.payments.reduce((s, p) => s + p.amount, 0);
  const pending = db.clients.reduce((s, c) => s + Math.max(0, clientBalance(db, c.id)), 0);
  const recent = db.payments
    .filter((p) => inRange(p.date, range))
    .sort((a, b) => b.date.localeCompare(a.date) || b.invoiceNo.localeCompare(a.invoiceNo));
  const rangeTotal = recent.reduce((s, p) => s + p.amount, 0);

  return (
    <div>
      <PageHeader title="Billing" subtitle="Saare clients ki billing ek jagah. Kisi client par click karke uski poori history aur Full Bill dekhein." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total billing" value={inr(totalBilling)} hint={`${db.clients.length} clients`} />
        <StatCard label="Total received" value={inr(received)} tone="good" hint={`${db.payments.length} payments`} />
        <StatCard label="Total pending" value={inr(pending)} tone="bad" />
      </div>

      <Card className="mt-6 overflow-hidden">
        <div className="border-b border-slate-100 px-4 py-3">
          <h3 className="font-medium text-slate-900">Client-wise billing</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead className="bg-slate-50">
              <tr><Th>Client</Th><Th right>Total</Th><Th right>Received</Th><Th right>Baaki</Th><Th right>Status</Th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {db.clients.map((c) => {
                const paid = paidFor(db, c.id);
                const bal = c.totalBilling - paid;
                const pct = c.totalBilling ? Math.min(100, (paid / c.totalBilling) * 100) : 0;
                return (
                  <tr key={c.id} className="hover:bg-slate-50/60">
                    <Td>
                      <Link href={`/clients/${c.id}?tab=billing`} className="font-medium text-slate-900 hover:text-emerald-700">{c.business}</Link>
                      <div className="mt-1.5 h-1.5 w-40 rounded-full bg-slate-100">
                        <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
                      </div>
                    </Td>
                    <Td right>{inr(c.totalBilling)}</Td>
                    <Td right className="text-emerald-600">{inr(paid)}</Td>
                    <Td right className={bal > 0 ? "font-medium text-red-600" : "text-slate-400"}>{inr(bal)}</Td>
                    <Td right>{bal <= 0 ? <Badge tone="green">Paid</Badge> : paid > 0 ? <Badge tone="amber">Partial</Badge> : <Badge tone="red">Pending</Badge>}</Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="mt-6 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div>
            <h3 className="font-medium text-slate-900">Saari payments</h3>
            <p className="text-xs text-slate-500">{recent.length} payments · {inr(rangeTotal)}</p>
          </div>
          <Select value={range} onChange={(e) => setRange(e.target.value as RangeKey)} options={(Object.keys(RANGE_LABELS) as RangeKey[]).map((k) => ({ value: k, label: RANGE_LABELS[k] }))} className="w-44" />
        </div>
        {recent.length === 0 ? <Empty text="Is period mein koi payment nahi" /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead className="bg-slate-50">
                <tr><Th>Date</Th><Th>Invoice</Th><Th>Client</Th><Th>Mode</Th><Th right>Amount</Th><Th right></Th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recent.map((p) => {
                  const c = db.clients.find((x) => x.id === p.clientId);
                  return (
                    <tr key={p.id}>
                      <Td>{fmtDate(p.date)}</Td>
                      <Td className="font-mono text-xs">{p.invoiceNo}</Td>
                      <Td>{c?.business ?? "—"}</Td>
                      <Td><Badge tone="blue">{p.mode}</Badge></Td>
                      <Td right className="font-semibold text-slate-900">{inr(p.amount)}</Td>
                      <Td right>{c && <Button size="sm" variant="secondary" onClick={() => paymentInvoicePDF(db, p)}><FileText size={14} /> PDF</Button>}</Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
