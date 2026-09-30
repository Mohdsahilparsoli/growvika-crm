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

// GrowVika works in India time. Using IST everywhere means the server and the
// phone always agree on "today" (the server itself runs on UTC).
export const nowIST = () => new Date(Date.now() + 330 * 60000); // read with getUTC* methods

export const todayISO = () => nowIST().toISOString().slice(0, 10);

export const isPaid = (p: { status?: string }) => p.status !== "Due";

export const paidFor = (db: DB, clientId: string) =>
  db.payments.filter((p) => p.clientId === clientId && isPaid(p)).reduce((s, p) => s + p.amount, 0);

export const dueFor = (db: DB, clientId: string) =>
  db.payments.filter((p) => p.clientId === clientId && !isPaid(p)).reduce((s, p) => s + p.amount, 0);

// What the client still owes: the plan balance, or the unpaid bills if that is higher
export const pendingFor = (db: DB, clientId: string) => {
  const c = db.clients.find((x) => x.id === clientId);
  if (!c) return 0;
  const bal = planDecided(c) ? Math.max(0, billedToDate(db, c) - paidFor(db, clientId)) : 0;
  return Math.max(bal, dueFor(db, clientId));
};

export const clientBalance = (db: DB, clientId: string) => {
  const c = db.clients.find((x) => x.id === clientId);
  if (!c || !planDecided(c)) return 0;
  return billedToDate(db, c) - paidFor(db, clientId);
};

export const totalIncome = (db: DB) => db.payments.filter(isPaid).reduce((s, p) => s + p.amount, 0);
export const totalExpense = (db: DB) => db.expenses.reduce((s, e) => s + e.amount, 0);

export type RangeKey = "all" | "this" | "last" | "year";

export const inRange = (iso: string, range: RangeKey) => {
  if (range === "all") return true;
  const now = nowIST();
  const [y, m] = iso.split("-").map(Number);
  if (range === "this") return y === now.getUTCFullYear() && m === now.getUTCMonth() + 1;
  if (range === "last") {
    const ld = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
    return y === ld.getUTCFullYear() && m === ld.getUTCMonth() + 1;
  }
  return y === now.getUTCFullYear();
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

// ---- Renewals ----
// How many months one billing cycle covers. One-time plans have no renewal.
export const CYCLE_MONTHS: Record<string, number> = { Monthly: 1, Quarterly: 3, "Half-yearly": 6, Yearly: 12 };

export const addMonths = (iso: string, n: number) => {
  const [y, m, d] = iso.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1 + n, 1));
  const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  first.setUTCDate(Math.min(d, last));
  return first.toISOString().slice(0, 10);
};

export const daysBetween = (from: string, to: string) =>
  Math.round((Date.parse(to + "T00:00:00Z") - Date.parse(from + "T00:00:00Z")) / 86400000);

const validISO = (s?: string) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);

export interface PlanSchedule {
  start: string;
  recurring: boolean;
  periods: number; // cycles billed so far (including the current one)
  billed: number; // plan price x cycles so far
  periodStart: string;
  nextDate: string; // next renewal date ("" if one-time or stopped)
  ended: boolean;
}

// Works out, from the start date, how many cycles have been billed up to `asOf`
// and when the next renewal falls.
export const planSchedule = (pl: ClientPlan, c: Pick<Client, "joinedAt">, asOf = todayISO()): PlanSchedule => {
  const start = validISO(pl.startDate) ? pl.startDate! : validISO(c.joinedAt) ? c.joinedAt : asOf;
  const months = CYCLE_MONTHS[pl.cycle];
  if (!months) return { start, recurring: false, periods: 1, billed: pl.price, periodStart: start, nextDate: "", ended: false };
  // Stop date: cycles starting before it are billed; otherwise every cycle started up to today
  const ended = validISO(pl.endDate) && pl.endDate! <= asOf;
  let n = 0;
  while (n < 600 && (ended ? addMonths(start, n * months) < pl.endDate! : addMonths(start, n * months) <= asOf)) n++;
  // Plan starts in the future: nothing billed yet, first payment falls on the start date
  if (!ended && start > asOf) return { start, recurring: true, periods: 0, billed: 0, periodStart: start, nextDate: start, ended: false };
  const periods = Math.max(1, n);
  return {
    start,
    recurring: true,
    periods,
    billed: periods * pl.price,
    periodStart: addMonths(start, (periods - 1) * months),
    nextDate: ended ? "" : addMonths(start, periods * months),
    ended,
  };
};

export const periodLabel = (s: PlanSchedule, cycle: string) => {
  if (!s.recurring) return "";
  const unit = cycle === "Monthly" ? "month" : cycle === "Quarterly" ? "quarter" : cycle === "Half-yearly" ? "half-year" : "year";
  return `${s.periods} ${unit}${s.periods > 1 ? "s" : ""}`;
};

// Plan-wise summary: each plan's amount billed till date, what was paid against it, and what is left.
// Payments are matched to a plan by the plan chosen on the bill.
export interface PlanRow {
  label: string;
  cycle: string;
  price: number; // price per cycle (or one-time price)
  amount: number; // billed till date
  paid: number;
  due: number;
  remaining: number;
  schedule: PlanSchedule;
}

export const planBreakdown = (db: DB, c: Client, asOf = todayISO()) => {
  const pays = db.payments.filter((p) => p.clientId === c.id && p.date <= asOf);
  const plans = planDecided(c) ? clientPlans(c) : [];
  const used = new Set<string>();
  const rows: PlanRow[] = plans.map((pl) => {
    const label = planName(pl);
    const schedule = planSchedule(pl, c, asOf);
    const mine = pays.filter((p) => (p.plan ?? "").trim().toLowerCase() === label.trim().toLowerCase());
    mine.forEach((p) => used.add(p.id));
    const paid = mine.filter(isPaid).reduce((s, p) => s + p.amount, 0);
    const due = mine.filter((p) => !isPaid(p)).reduce((s, p) => s + p.amount, 0);
    return { label, cycle: pl.cycle, price: pl.price, amount: schedule.billed, paid, due, remaining: Math.max(0, schedule.billed - paid), schedule };
  });
  const rest = pays.filter((p) => !used.has(p.id));
  const other = {
    paid: rest.filter(isPaid).reduce((s, p) => s + p.amount, 0),
    due: rest.filter((p) => !isPaid(p)).reduce((s, p) => s + p.amount, 0),
  };
  return { rows, other };
};

// Total billed till date: one-time plans once, recurring plans for every cycle started so far
export const billedToDate = (db: DB, c: Client, asOf = todayISO()) =>
  planDecided(c) ? (clientPlans(c).length ? planBreakdown(db, c, asOf).rows.reduce((s, r) => s + r.amount, 0) : c.totalBilling) : 0;

export interface Renewal {
  client: Client;
  label: string;
  cycle: string;
  price: number;
  nextDate: string;
  daysLeft: number;
  remaining: number;
}

// Recurring plans with their next renewal date, soonest first
export const upcomingRenewals = (db: DB, clients: Client[] = db.clients) => {
  const today = todayISO();
  const out: Renewal[] = [];
  for (const c of clients) {
    if (c.status === "Inactive") continue;
    for (const r of planBreakdown(db, c).rows) {
      if (!r.schedule.nextDate) continue;
      out.push({ client: c, label: r.label, cycle: r.cycle, price: r.price, nextDate: r.schedule.nextDate, daysLeft: daysBetween(today, r.schedule.nextDate), remaining: r.remaining });
    }
  }
  return out.sort((a, b) => a.nextDate.localeCompare(b.nextDate));
};
