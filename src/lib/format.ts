import { Client, ClientPlan, DB } from "./types";

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

export const isPaid = (p: { status?: string }) => p.status !== "Due";

export const paidFor = (db: DB, clientId: string) =>
  db.payments.filter((p) => p.clientId === clientId && isPaid(p)).reduce((s, p) => s + p.amount, 0);

export const dueFor = (db: DB, clientId: string) =>
  db.payments.filter((p) => p.clientId === clientId && !isPaid(p)).reduce((s, p) => s + p.amount, 0);

// What the client still owes: the plan balance, or the unpaid bills if that is higher
export const pendingFor = (db: DB, clientId: string) => {
  const c = db.clients.find((x) => x.id === clientId);
  if (!c) return 0;
  const bal = planDecided(c) ? Math.max(0, c.totalBilling - paidFor(db, clientId)) : 0;
  return Math.max(bal, dueFor(db, clientId));
};

export const clientBalance = (db: DB, clientId: string) => {
  const c = db.clients.find((x) => x.id === clientId);
  if (!c || !planDecided(c)) return 0;
  return c.totalBilling - paidFor(db, clientId);
};

export const totalIncome = (db: DB) => db.payments.filter(isPaid).reduce((s, p) => s + p.amount, 0);
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

// Which plan categories belong to which service (used in the payment form)
const SERVICE_PLAN_MAP: Record<string, string[]> = {
  seo: ["Website SEO"],
  "website seo": ["Website SEO"],
  gmb: ["Local SEO (GMB)"],
  "local seo": ["Local SEO (GMB)"],
  "social media": ["Social Media"],
  "meta ads": ["Ads Management"],
  "google ads": ["Ads Management"],
  ads: ["Ads Management"],
  "ads management": ["Ads Management"],
  website: ["Website", "Website Care & Hosting"],
  "app development": ["App Development"],
  "custom development": ["Custom WordPress", "PHP Laravel", "Next.js / React", "Development Care"],
  "crm development": ["CRM – PHP Laravel", "CRM – Next.js + Node.js", "CRM Care"],
  crm: ["CRM – PHP Laravel", "CRM – Next.js + Node.js", "CRM Care"],
};

export function planCategoriesForService(service: string, allCategories: string[]): string[] {
  const key = service.trim().toLowerCase();
  if (!key) return [];
  const mapped = SERVICE_PLAN_MAP[key];
  if (mapped) return allCategories.filter((cat) => mapped.includes(cat));
  // Services you add yourself: match plan categories with the same name
  return allCategories.filter((cat) => {
    const c = cat.toLowerCase();
    return c === key || c.startsWith(key + " ") || c.includes(`(${key})`);
  });
}

// Show Indian numbers as +91-XXXXXXXXXX
export const formatPhone = (phone: string) => {
  const raw = (phone ?? "").trim();
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+91-${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+91-${digits.slice(2)}`;
  if (digits.length === 11 && digits.startsWith("0")) return `+91-${digits.slice(1)}`;
  return raw;
};

// Keep only the 10-digit Indian mobile number (drops +91, 91 or a leading 0)
export const normalizePhone = (phone: string) => {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  return digits;
};

export const telLink = (phone: string) => {
  const n = normalizePhone(phone);
  return n.length === 10 ? `tel:+91${n}` : `tel:${phone}`;
};

// All plans of a client (supports older clients that had a single plan)
export const clientPlans = (c: Client): ClientPlan[] => {
  if (c.plans && c.plans.length) return c.plans;
  if (c.plan) return [{ id: "legacy", category: c.planCategory ?? "", name: c.plan, price: c.totalBilling, cycle: c.billingCycle ?? "" }];
  return [];
};

export const planName = (p: Pick<ClientPlan, "category" | "name">) => [p.category, p.name].filter(Boolean).join(": ");

export const planSummary = (c: Client) => clientPlans(c).map(planName).join(", ");

// Plan-wise summary: each plan's amount, what was paid against it, and what is left.
// Payments are matched to a plan by the plan chosen on the bill.
export interface PlanRow {
  label: string;
  cycle: string;
  amount: number;
  paid: number;
  due: number;
  remaining: number;
}

export const planBreakdown = (db: DB, c: Client) => {
  const pays = db.payments.filter((p) => p.clientId === c.id);
  const plans = planDecided(c) ? clientPlans(c) : [];
  const used = new Set<string>();
  const rows: PlanRow[] = plans.map((pl) => {
    const label = planName(pl);
    const mine = pays.filter((p) => (p.plan ?? "").trim().toLowerCase() === label.trim().toLowerCase());
    mine.forEach((p) => used.add(p.id));
    const paid = mine.filter(isPaid).reduce((s, p) => s + p.amount, 0);
    const due = mine.filter((p) => !isPaid(p)).reduce((s, p) => s + p.amount, 0);
    return { label, cycle: pl.cycle, amount: pl.price, paid, due, remaining: Math.max(0, pl.price - paid) };
  });
  const rest = pays.filter((p) => !used.has(p.id));
  const other = {
    paid: rest.filter(isPaid).reduce((s, p) => s + p.amount, 0),
    due: rest.filter((p) => !isPaid(p)).reduce((s, p) => s + p.amount, 0),
  };
  return { rows, other };
};
