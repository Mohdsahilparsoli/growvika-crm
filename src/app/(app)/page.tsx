"use client";

import Link from "next/link";
import { Users, TrendingUp, Clock, Wallet, Target, PhoneCall } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useStore } from "@/lib/store";
import { Badge, Card, PageHeader, StatCard, Empty } from "@/components/ui";
import { clientBalance, fmtDate, inr, inRange, monthLabel, todayISO, totalExpense, totalIncome } from "@/lib/format";

export default function Dashboard() {
  const { db, user, isAdmin, userName } = useStore();
  const today = todayISO();

  const myClients = isAdmin ? db.clients : db.clients.filter((c) => c.assignedTo === user!.id);
  const myLeads = isAdmin ? db.leads : db.leads.filter((l) => l.assignedTo === user!.id);
  const openLeads = myLeads.filter((l) => l.stage !== "Won" && l.stage !== "Lost");
  const followUps = openLeads
    .filter((l) => l.followUp && l.followUp <= today)
    .sort((a, b) => a.followUp.localeCompare(b.followUp));
  const upcoming = openLeads
    .filter((l) => l.followUp && l.followUp > today)
    .sort((a, b) => a.followUp.localeCompare(b.followUp))
    .slice(0, 4);

  const monthIncome = db.payments.filter((p) => inRange(p.date, "this")).reduce((s, p) => s + p.amount, 0);
  const monthExpense = db.expenses.filter((e) => inRange(e.date, "this")).reduce((s, e) => s + e.amount, 0);
  const pending = db.clients
    .map((c) => ({ c, bal: clientBalance(db, c.id) }))
    .filter((x) => x.bal > 0)
    .sort((a, b) => b.bal - a.bal);
  const pendingTotal = pending.reduce((s, x) => s + x.bal, 0);
  const bacha = totalIncome(db) - totalExpense(db);

  const months: string[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  const chart = months.map((m) => ({
    month: monthLabel(m),
    Aaya: db.payments.filter((p) => p.date.startsWith(m)).reduce((s, p) => s + p.amount, 0),
    Kharcha: db.expenses.filter((e) => e.date.startsWith(m)).reduce((s, e) => s + e.amount, 0),
  }));

  const newLeadsMonth = myLeads.filter((l) => inRange(l.createdAt, "this")).length;
  const wonMonth = myLeads.filter((l) => l.stage === "Won" && inRange(l.createdAt, "this")).length;

  return (
    <div>
      <PageHeader
        title={`Namaste, ${user!.name.split(" ")[0]}`}
        subtitle={`Aaj ${fmtDate(today)} · Growvika ka poora haal ek nazar mein`}
      />

      {isAdmin ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Clients" value={String(db.clients.length)} hint={`${db.clients.filter((c) => c.status !== "Inactive").length} active`} icon={<Users size={18} />} />
          <StatCard label="Is mahine aaya" value={inr(monthIncome)} hint={`Kharcha ${inr(monthExpense)}`} tone="good" icon={<TrendingUp size={18} />} />
          <StatCard label="Pending payments" value={inr(pendingTotal)} hint={`${pending.length} clients se baaki`} tone="warn" icon={<Clock size={18} />} />
          <StatCard label="Bacha hua (total)" value={inr(bacha)} hint="Aaya − Kharcha" tone={bacha >= 0 ? "default" : "bad"} icon={<Wallet size={18} />} />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Mere clients" value={String(myClients.length)} icon={<Users size={18} />} />
          <StatCard label="Open leads" value={String(openLeads.length)} icon={<Target size={18} />} />
          <StatCard label="Aaj ke follow-ups" value={String(followUps.length)} tone={followUps.length ? "warn" : "default"} icon={<PhoneCall size={18} />} />
          <StatCard label="Is mahine naye leads" value={String(newLeadsMonth)} hint={`${wonMonth} deal pakki`} tone="good" icon={<TrendingUp size={18} />} />
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
            <h3 className="font-medium text-slate-900">Aaj ke follow-ups</h3>
            <Link href="/leads" className="text-sm text-emerald-600 hover:underline">Saare leads →</Link>
          </div>
          {followUps.length === 0 ? (
            <Empty text="Aaj koi follow-up baaki nahi hai" />
          ) : (
            <ul className="divide-y divide-slate-100">
              {followUps.map((l) => (
                <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{l.name} · {l.business}</p>
                    <p className="text-xs text-slate-500">{l.service} · {l.stage} · {userName(l.assignedTo)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {l.followUp < today && <Badge tone="red">Overdue · {fmtDate(l.followUp)}</Badge>}
                    <a href={`tel:${l.phone}`} className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-50">Call {l.phone}</a>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {upcoming.length > 0 && (
            <div className="border-t border-slate-100 px-5 py-3">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Aane wale</p>
              <div className="flex flex-wrap gap-2">
                {upcoming.map((l) => (
                  <span key={l.id} className="rounded-lg bg-slate-50 px-2.5 py-1 text-xs text-slate-600">
                    {fmtDate(l.followUp)} · {l.business}
                  </span>
                ))}
              </div>
            </div>
          )}
        </Card>

        {isAdmin ? (
          <Card>
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
              <h3 className="font-medium text-slate-900">Pending payments</h3>
              <Link href="/billing" className="text-sm text-emerald-600 hover:underline">Billing →</Link>
            </div>
            {pending.length === 0 ? (
              <Empty text="Koi payment baaki nahi" />
            ) : (
              <ul className="divide-y divide-slate-100">
                {pending.map(({ c, bal }) => (
                  <li key={c.id}>
                    <Link href={`/clients/${c.id}?tab=billing`} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{c.business}</p>
                        <p className="text-xs text-slate-500">Total {inr(c.totalBilling)}</p>
                      </div>
                      <span className="text-sm font-semibold tabular-nums text-red-600">{inr(bal)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        ) : (
          <Card>
            <div className="border-b border-slate-100 px-5 py-3">
              <h3 className="font-medium text-slate-900">Mere clients</h3>
            </div>
            <ul className="divide-y divide-slate-100">
              {myClients.map((c) => (
                <li key={c.id}>
                  <Link href={`/clients/${c.id}`} className="block px-5 py-3 hover:bg-slate-50">
                    <p className="text-sm font-medium text-slate-900">{c.business}</p>
                    <p className="text-xs text-slate-500">{c.services.join(", ")}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>

      {isAdmin && (
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <Card className="p-5 lg:col-span-2">
            <h3 className="font-medium text-slate-900">Mahine-wise: Aaya vs Kharcha</h3>
            <p className="text-xs text-slate-500">Pichhle 6 mahine</p>
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chart} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${Number(v) / 1000}k`} width={40} />
                  <Tooltip formatter={(v) => inr(Number(v))} cursor={{ fill: "#f1f5f9" }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Aaya" fill="#059669" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Kharcha" fill="#f87171" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card className="p-5">
            <h3 className="font-medium text-slate-900">Leads kahan se aa rahe hain</h3>
            <p className="text-xs text-slate-500">Saare leads</p>
            <ul className="mt-4 space-y-3">
              {Object.entries(
                db.leads.reduce<Record<string, number>>((a, l) => ((a[l.source] = (a[l.source] ?? 0) + 1), a), {})
              )
                .sort((a, b) => b[1] - a[1])
                .map(([src, n]) => (
                  <li key={src}>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-700">{src}</span>
                      <span className="tabular-nums text-slate-500">{n}</span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-slate-100">
                      <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${(n / db.leads.length) * 100}%` }} />
                    </div>
                  </li>
                ))}
            </ul>
          </Card>
        </div>
      )}
    </div>
  );
}
