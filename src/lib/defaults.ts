import { Company, DB, PlanOption, Settings } from "./types";

export const DEFAULT_COMPANY: Company = {
  name: "GrowVika",
  tagline: "Digital Growth Partner",
  address: "",
  phone: "",
  email: "",
  gst: "",
  udyam: "",
};

export const DEFAULT_SETTINGS: Settings = {
  services: ["SEO", "GMB", "Social Media", "Meta Ads", "Google Ads", "Website", "Branding", "Content"],
  plans: [],
  leadSources: ["Instagram", "Facebook", "Referral", "Website", "Call", "Google"],
  expenseCategories: ["Ads", "Tools / Software", "Salary / Freelancer", "Office", "Travel", "Equipment", "Other"],
  invoicePrefix: "GV-",
  gstRate: 18,
  sacCode: "998361",
};

export function normalizePlans(v: unknown): PlanOption[] {
  if (!Array.isArray(v)) return [];
  const out: PlanOption[] = [];
  v.forEach((p, i) => {
    if (typeof p === "string") {
      if (p.trim()) out.push({ id: `plan${i}`, category: "General", name: p.trim(), price: 0, cycle: "" });
      return;
    }
    if (p && typeof p === "object") {
      const o = p as Record<string, unknown>;
      const name = String(o.name ?? "").trim().slice(0, 120);
      if (!name) return;
      const price = Number(o.price);
      out.push({
        id: String(o.id || `plan${i}`).slice(0, 60),
        category: String(o.category ?? "General").trim().slice(0, 80) || "General",
        name,
        price: Number.isFinite(price) && price >= 0 ? Math.round(price) : 0,
        cycle: String(o.cycle ?? "").trim().slice(0, 40),
      });
    }
  });
  return out;
}

export const emptyDB = (): DB => ({
  company: DEFAULT_COMPANY,
  settings: DEFAULT_SETTINGS,
  users: [],
  clients: [],
  payments: [],
  leads: [],
  comms: [],
  expenses: [],
  invoiceCounter: 0,
});
