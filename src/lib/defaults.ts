import { Company, DB, Settings } from "./types";

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
  services: ["SEO", "Social Media", "Meta Ads", "Google Ads", "Website", "Branding", "Content"],
  leadSources: ["Instagram", "Facebook", "Referral", "Website", "Call", "Google"],
  expenseCategories: ["Ads", "Tools / Software", "Salary / Freelancer", "Office", "Travel", "Equipment", "Other"],
  invoicePrefix: "GV-",
  gstRate: 18,
  sacCode: "998361",
};

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
