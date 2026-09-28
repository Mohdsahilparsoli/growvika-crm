import { Client, DB } from "./types";

export const planDecided = (c: Pick<Client, "planStatus">) => c.planStatus !== "Not decided";

export const inr = (n: number) =>
  "₹" + Math.round(n).toLocaleString("en-IN");

export const pdfInr = (n: number) =>
  "Rs. " + Math.round(n).toLocaleString("en-IN");

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const fmtDate = (iso: string) => {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-").map(Number);
  return `${String(d).padStart(2, "0")} ${MONTHS[m - 1]} ${y}`;
};

export const monthLabel = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return `${MONTHS[m - 1]} ${String(y).slice(2)}`;
};

export const todayISO = () => {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
};

export const paidFor = (db: DB, clientId: string) =>
  db.payments.filter((p) => p.clientId === clientId).reduce((s, p) => s + p.amount, 0);

export const clientBalance = (db: DB, clientId: string) => {
  const c = db.clients.find((x) => x.id === clientId);
  if (!c || !planDecided(c)) return 0;
  return c.totalBilling - paidFor(db, clientId);
};

export const totalIncome = (db: DB) => db.payments.reduce((s, p) => s + p.amount, 0);
export const totalExpense = (db: DB) => db.expenses.reduce((s, e) => s + e.amount, 0);

export type RangeKey = "all" | "this" | "last" | "year";

export const inRange = (iso: string, range: RangeKey) => {
  if (range === "all") return true;
  const now = new Date();
  const [y, m] = iso.split("-").map(Number);
  if (range === "this") return y === now.getFullYear() && m === now.getMonth() + 1;
  if (range === "last") {
    const ld = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return y === ld.getFullYear() && m === ld.getMonth() + 1;
  }
  return y === now.getFullYear();
};

export const RANGE_LABELS: Record<RangeKey, string> = {
  all: "All time",
  this: "This month",
  last: "Last month",
  year: "This year",
};

export const waLink = (phone: string, text: string) => {
  const digits = phone.replace(/\D/g, "");
  const full = digits.length === 10 ? "91" + digits : digits;
  return `https://wa.me/${full}?text=${encodeURIComponent(text)}`;
};

export const mailLink = (email: string, subject: string, body: string) =>
  `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

export const statusTone = (s: string) => (s === "VIP" ? "purple" : s === "Active" ? "green" : "gray");
