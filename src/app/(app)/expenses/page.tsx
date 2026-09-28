"use client";

import { useState } from "react";
import { Download, Plus, Search, Trash2, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { useStore, uid } from "@/lib/store";
import { Expense, PAY_MODES, PayMode } from "@/lib/types";
import { Badge, Button, Card, Empty, Field, Input, Modal, PageHeader, Select, StatCard, Td, Textarea, Th } from "@/components/ui";
import { fmtDate, inr, inRange, RANGE_LABELS, RangeKey, todayISO, totalExpense, totalIncome } from "@/lib/format";
import { expenseReportPDF } from "@/lib/pdf";

const COLORS = ["#059669", "#0ea5e9", "#8b5cf6", "#f59e0b", "#ef4444", "#64748b", "#ec4899"];

export default function ExpensesPage() {
  const { db, update } = useStore();
  const [range, setRange] = useState<RangeKey>("all");
  const [cat, setCat] = useState("All");
  const [q, setQ] = useState("");
  const [form, setForm] = useState<Expense | null>(null);
  const [err, setErr] = useState("");

  const inPeriod = db.expenses.filter((e) => inRange(e.date, range));
  const income = db.payments.filter((p) => inRange(p.date, range)).reduce((s, p) => s + p.amount, 0);
  const spent = inPeriod.reduce((s, e) => s + e.amount, 0);
  const list = inPeriod
    .filter((e) => cat === "All" || e.category === cat)
    .filter((e) => {
      const t = q.trim().toLowerCase();
      return !t || `${e.where} ${e.why} ${e.note}`.toLowerCase().includes(t);
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  const byCat = Array.from(new Set([...db.settings.expenseCategories, ...inPeriod.map((e) => e.category)])).map((c) => ({ name: c, value: inPeriod.filter((e) => e.category === c).reduce((s, e) => s + e.amount, 0) }))
    .filter((x) => x.value > 0)
    .sort((a, b) => b.value - a.value);

  const allTimeBacha = totalIncome(db) - totalExpense(db);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    if (!form.amount || form.amount <= 0) return setErr("Enter a valid amount");
    if (!form.where.trim()) return setErr("Enter where the money was spent");
    if (!form.why.trim()) return setErr("Enter why the money was spent");
    if (form.id) update((d) => ({ ...d, expenses: d.expenses.map((x) => (x.id === form.id ? form : x)) }));
    else update((d) => ({ ...d, expenses: [...d.expenses, { ...form, id: uid("e") }] }));
    setForm(null);
  };

  return (
    <div>
      <PageHeader
        title="Company Account"
        subtitle="What came in, where and why it was spent, and what's left"
        actions={
          <>
            <Select value={range} onChange={(e) => setRange(e.target.value as RangeKey)} options={(Object.keys(RANGE_LABELS) as RangeKey[]).map((k) => ({ value: k, label: RANGE_LABELS[k] }))} className="w-44" />
            <Button variant="secondary" onClick={() => expenseReportPDF(db, RANGE_LABELS[range], income, inPeriod)}>
              <Download size={16} /> Report PDF
            </Button>
            <Button onClick={() => { setErr(""); setForm({ id: "", date: todayISO(), amount: 0, where: "", why: "", category: db.settings.expenseCategories[0] ?? "Other", mode: "UPI", note: "" }); }}>
              <Plus size={16} /> Add expense
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total income" value={inr(income)} tone="good" hint={`${RANGE_LABELS[range]} · client payments`} icon={<TrendingUp size={18} />} />
        <StatCard label="Total expenses" value={inr(spent)} tone="bad" hint={`${inPeriod.length} entries`} icon={<TrendingDown size={18} />} />
        <StatCard
          label="Balance left"
          value={inr(income - spent)}
          tone={income - spent >= 0 ? "default" : "bad"}
          hint={range === "all" ? "Income − Expenses" : `All time: ${inr(allTimeBacha)}`}
          icon={<Wallet size={18} />}
        />
      </div>

      {income > 0 && (
        <Card className="mt-4 p-4">
          <div className="flex justify-between text-xs text-slate-500">
            <span>How much of the income has been spent</span>
            <span className="font-medium text-slate-700">{Math.round((spent / income) * 100)}% spent · {Math.max(0, 100 - Math.round((spent / income) * 100))}% left</span>
          </div>
          <div className="mt-2 flex h-3 overflow-hidden rounded-full bg-emerald-100">
            <div className="h-3 bg-red-400" style={{ width: `${Math.min(100, (spent / income) * 100)}%` }} />
          </div>
        </Card>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="p-5">
          <h3 className="font-medium text-slate-900">Where the money goes</h3>
          <p className="text-xs text-slate-500">Expenses by category</p>
          {byCat.length === 0 ? <Empty text="No expenses" /> : (
            <>
              <div className="mt-2 h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={byCat} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                      {byCat.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => inr(Number(v))} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="mt-2 space-y-2">
                {byCat.map((c, i) => (
                  <li key={c.name}>
                    <button onClick={() => setCat(cat === c.name ? "All" : c.name)} className={`flex w-full items-center justify-between rounded-md px-2 py-1 text-sm ${cat === c.name ? "bg-slate-100" : "hover:bg-slate-50"}`}>
                      <span className="flex items-center gap-2 text-slate-700">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                        {c.name}
                      </span>
                      <span className="tabular-nums text-slate-600">{inr(c.value)} <span className="text-xs text-slate-400">({Math.round((c.value / spent) * 100)}%)</span></span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>

        <Card className="overflow-hidden lg:col-span-2">
          <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3">
            <h3 className="mr-auto font-medium text-slate-900">Expense details {cat !== "All" && <Badge tone="purple">{cat}</Badge>}</h3>
            <div className="relative w-full sm:w-56">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search where / why" className="py-1.5 pl-8" />
            </div>
            <Select value={cat} onChange={(e) => setCat(e.target.value)} options={[{ value: "All", label: "All categories" }, ...db.settings.expenseCategories]} className="w-full py-1.5 sm:w-44" />
          </div>
          {list.length === 0 ? <Empty text="No entries found" /> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead className="bg-slate-50">
                  <tr><Th>Date</Th><Th>Where</Th><Th>Why</Th><Th>Category</Th><Th right>Amount</Th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {list.map((e) => (
                    <tr key={e.id} onClick={() => { setErr(""); setForm(e); }} className="cursor-pointer hover:bg-slate-50">
                      <Td className="whitespace-nowrap">{fmtDate(e.date)}</Td>
                      <Td className="font-medium text-slate-900">{e.where}<p className="text-xs font-normal text-slate-400">{e.mode}</p></Td>
                      <Td className="max-w-xs text-slate-600">{e.why}</Td>
                      <Td><Badge>{e.category}</Badge></Td>
                      <Td right className="font-semibold text-red-600">− {inr(e.amount)}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? "Expense details" : "New expense"}>
        {form && (
          <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
            <Field label="Date"><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
            <Field label="Amount (₹) *"><Input type="number" min={1} value={form.amount || ""} onChange={(e) => { setErr(""); setForm({ ...form, amount: Number(e.target.value) }); }} autoFocus={!form.id} /></Field>
            <Field label="Where was it spent *" full><Input value={form.where} onChange={(e) => { setErr(""); setForm({ ...form, where: e.target.value }); }} placeholder="e.g. Meta Ads, Canva Pro, freelancer" /></Field>
            <Field label="Why was it spent *" full><Textarea value={form.why} onChange={(e) => { setErr(""); setForm({ ...form, why: e.target.value }); }} placeholder="e.g. Diwali ads for Sharma Traders" /></Field>
            <Field label="Category"><Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} options={Array.from(new Set([...db.settings.expenseCategories, form.category].filter(Boolean)))} /></Field>
            <Field label="Payment mode"><Select value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value as PayMode })} options={PAY_MODES} /></Field>
            <Field label="Bill / receipt photo (demo saves the file name only)" full>
              <Input type="file" accept="image/*,.pdf" onChange={(e) => setForm({ ...form, note: e.target.files?.[0]?.name ? `Bill: ${e.target.files[0].name}` : form.note })} />
            </Field>
            <Field label="Note" full><Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></Field>
            {err && <p className="text-sm text-red-600 sm:col-span-2">{err}</p>}
            <div className="flex justify-between gap-2 sm:col-span-2">
              {form.id ? (
                <Button type="button" variant="danger" onClick={() => { if (confirm("Delete this expense?")) { update((d) => ({ ...d, expenses: d.expenses.filter((x) => x.id !== form.id) })); setForm(null); } }}>
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
