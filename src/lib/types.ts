export type Role = "admin" | "employee";

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: Role;
  active: boolean;
}

export type ClientStatus = "Active" | "Inactive" | "VIP";
export type PlanStatus = "Decided" | "Not decided";
export const BILLING_CYCLES = ["One-time", "Monthly", "Quarterly", "Half-yearly", "Yearly"];

export interface Client {
  id: string;
  name: string;
  business: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  city: string;
  state: string;
  gst: string;
  services: string[];
  status: ClientStatus;
  joinedAt: string;
  notes: string;
  assignedTo: string;
  totalBilling: number;
  gstApplicable: boolean;
  planStatus?: PlanStatus;
  plan?: string;
  billingCycle?: string;
  planCategory?: string;
  plans?: ClientPlan[];
}

export interface ClientPlan {
  id: string;
  category: string;
  name: string;
  price: number;
  cycle: string;
}

export type PayMode = "UPI" | "Bank Transfer" | "Cash" | "Cheque";

export interface Payment {
  id: string;
  clientId: string;
  date: string;
  amount: number;
  mode: PayMode;
  invoiceNo: string;
  note: string;
  service?: string;
  plan?: string;
}

export type LeadStage =
  | "New Lead"
  | "Contacted"
  | "Meeting Done"
  | "Proposal Sent"
  | "Won"
  | "Lost";

export interface Lead {
  id: string;
  name: string;
  business: string;
  phone: string;
  source: string;
  service: string;
  stage: LeadStage;
  followUp: string;
  assignedTo: string;
  note: string;
  lostReason: string;
  createdAt: string;
}

export type CommType = "Call" | "WhatsApp" | "Meeting" | "Email";

export interface Comm {
  id: string;
  clientId: string;
  date: string;
  type: CommType;
  summary: string;
  by: string;
  nextAction: string;
  fileName: string;
}

export interface Expense {
  id: string;
  date: string;
  amount: number;
  where: string;
  why: string;
  category: string;
  mode: PayMode;
  note: string;
}

export interface Company {
  name: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  gst: string;
  udyam?: string;
  signature?: string;
}

export interface PlanOption {
  id: string;
  category: string;
  name: string;
  price: number;
  cycle: string;
}

export interface Settings {
  services: string[];
  plans: PlanOption[];
  leadSources: string[];
  expenseCategories: string[];
  invoicePrefix: string;
  gstRate: number;
  sacCode: string;
}

export interface DB {
  company: Company;
  settings: Settings;
  users: User[];
  clients: Client[];
  payments: Payment[];
  leads: Lead[];
  comms: Comm[];
  expenses: Expense[];
  invoiceCounter: number;
}

export const LEAD_STAGES: LeadStage[] = [
  "New Lead",
  "Contacted",
  "Meeting Done",
  "Proposal Sent",
  "Won",
  "Lost",
];

export const PAY_MODES: PayMode[] = ["UPI", "Bank Transfer", "Cash", "Cheque"];
export const COMM_TYPES: CommType[] = ["Call", "WhatsApp", "Meeting", "Email"];
