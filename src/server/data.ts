import "server-only";
import { db, deleteRecord, deleteWhere, getRecord, getSetting, listRecords, nextInvoiceNumber, putRecord } from "./db";
import { SessionUser } from "./auth";
import { DEFAULT_COMPANY, DEFAULT_SETTINGS } from "@/lib/defaults";
import { Client, Comm, Company, DB, Expense, Lead, Payment, Settings, User } from "@/lib/types";

export const COLLECTIONS = ["clients", "payments", "leads", "comms", "expenses"] as const;
export type Collection = (typeof COLLECTIONS)[number];

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const str = (v: unknown, max = 2000) => (typeof v === "string" ? v.slice(0, max).trim() : "");
const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
};
const date = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : "");
const pick = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T =>
  allowed.includes(v as T) ? (v as T) : fallback;

function clean(col: Collection, raw: Record<string, unknown>, id: string): Record<string, unknown> {
  switch (col) {
    case "clients": {
      const c: Client = {
        id,
        name: str(raw.name, 200),
        business: str(raw.business, 200),
        phone: str(raw.phone, 20),
        whatsapp: str(raw.whatsapp, 20),
        email: str(raw.email, 200),
        address: str(raw.address, 500),
        city: str(raw.city, 100),
        state: str(raw.state, 100),
        gst: str(raw.gst, 20).toUpperCase(),
        services: Array.isArray(raw.services) ? raw.services.map((s) => str(s, 100)).filter(Boolean) : [],
        status: pick(raw.status, ["Active", "Inactive", "VIP"] as const, "Active"),
        joinedAt: date(raw.joinedAt),
        notes: str(raw.notes, 5000),
        assignedTo: str(raw.assignedTo, 100),
        totalBilling: Math.max(0, num(raw.totalBilling)),
        gstApplicable: !!raw.gstApplicable,
        planStatus: pick(raw.planStatus, ["Decided", "Not decided"] as const, "Decided"),
        plan: str(raw.plan, 100),
        billingCycle: str(raw.billingCycle, 50),
      };
      if (c.planStatus === "Not decided") c.totalBilling = 0;
      if (!c.name || !c.business) throw new HttpError(400, "Client name and business name are required");
      return c as unknown as Record<string, unknown>;
    }
    case "payments": {
      const p: Payment = {
        id,
        clientId: str(raw.clientId, 100),
        date: date(raw.date),
        amount: num(raw.amount),
        mode: pick(raw.mode, ["UPI", "Bank Transfer", "Cash", "Cheque"] as const, "UPI"),
        invoiceNo: str(raw.invoiceNo, 50),
        note: str(raw.note, 500),
      };
      if (!p.clientId || !p.date || p.amount <= 0) throw new HttpError(400, "Payment needs a client, date and amount");
      return p as unknown as Record<string, unknown>;
    }
    case "leads": {
      const l: Lead = {
        id,
        name: str(raw.name, 200),
        business: str(raw.business, 200),
        phone: str(raw.phone, 20),
        source: str(raw.source, 100),
        service: str(raw.service, 100),
        stage: pick(raw.stage, ["New Lead", "Contacted", "Meeting Done", "Proposal Sent", "Won", "Lost"] as const, "New Lead"),
        followUp: date(raw.followUp),
        assignedTo: str(raw.assignedTo, 100),
        note: str(raw.note, 5000),
        lostReason: str(raw.lostReason, 500),
        createdAt: date(raw.createdAt) || new Date().toISOString().slice(0, 10),
      };
      if (!l.name) throw new HttpError(400, "Lead name is required");
      return l as unknown as Record<string, unknown>;
    }
    case "comms": {
      const m: Comm = {
        id,
        clientId: str(raw.clientId, 100),
        date: date(raw.date),
        type: pick(raw.type, ["Call", "WhatsApp", "Meeting", "Email"] as const, "Call"),
        summary: str(raw.summary, 5000),
        by: str(raw.by, 100),
        nextAction: str(raw.nextAction, 1000),
        fileName: str(raw.fileName, 300),
      };
      if (!m.clientId || !m.summary) throw new HttpError(400, "Entry needs a client and a summary");
      return m as unknown as Record<string, unknown>;
    }
    case "expenses": {
      const e: Expense = {
        id,
        date: date(raw.date),
        amount: num(raw.amount),
        where: str(raw.where, 300),
        why: str(raw.why, 2000),
        category: str(raw.category, 100),
        mode: pick(raw.mode, ["UPI", "Bank Transfer", "Cash", "Cheque"] as const, "UPI"),
        note: str(raw.note, 1000),
      };
      if (!e.date || e.amount <= 0 || !e.where || !e.why) throw new HttpError(400, "Expense needs a date, amount, where and why");
      return e as unknown as Record<string, unknown>;
    }
  }
}

async function clientOwnedBy(clientId: string, userId: string) {
  const c = await getRecord<Client>("clients", clientId);
  return !!c && c.assignedTo === userId;
}

export async function snapshot(user: SessionUser): Promise<DB> {
  const admin = user.role === "admin";
  const p = await db();
  const [company, settings, counter, usersRes, clients, leads, comms] = await Promise.all([
    getSetting<Company>("company", DEFAULT_COMPANY),
    getSetting<Settings>("settings", DEFAULT_SETTINGS),
    getSetting<number>("invoiceCounter", 0),
    p.query("SELECT id, name, email, role, active FROM gv_users ORDER BY created_at"),
    listRecords<Client>("clients"),
    listRecords<Lead>("leads"),
    listRecords<Comm>("comms"),
  ]);
  const users = usersRes.rows as User[];
  if (admin) {
    const [payments, expenses] = await Promise.all([listRecords<Payment>("payments"), listRecords<Expense>("expenses")]);
    return { company, settings: { ...DEFAULT_SETTINGS, ...settings }, invoiceCounter: Number(counter), users, clients, leads, comms, payments, expenses };
  }
  const myClients = clients.filter((c) => c.assignedTo === user.id).map((c) => ({ ...c, totalBilling: 0 }));
  const ids = new Set(myClients.map((c) => c.id));
  return {
    company,
    settings: { ...DEFAULT_SETTINGS, ...settings },
    invoiceCounter: 0,
    users: users.map((u) => ({ ...u, email: u.id === user.id ? u.email : "" })),
    clients: myClients,
    leads: leads.filter((l) => l.assignedTo === user.id),
    comms: comms.filter((m) => ids.has(m.clientId)),
    payments: [],
    expenses: [],
  };
}

export async function createRecord(user: SessionUser, col: Collection, raw: Record<string, unknown>) {
  const admin = user.role === "admin";
  const id = str(raw.id, 100) || crypto.randomUUID();
  if (await getRecord(col, id)) throw new HttpError(409, "Record already exists");

  if (!admin) {
    if (col === "payments" || col === "expenses") throw new HttpError(403, "Only admins can do this");
    if (col === "clients" || col === "leads") raw = { ...raw, assignedTo: user.id };
    if (col === "comms" && !(await clientOwnedBy(str(raw.clientId), user.id))) throw new HttpError(403, "This client is not assigned to you");
  }
  if (col === "comms") raw = { ...raw, by: raw.by || user.id };

  const data = clean(col, raw, id);
  if (col === "payments") {
    if (!(await getRecord("clients", String(data.clientId)))) throw new HttpError(400, "Client not found");
    const settings = await getSetting<Settings>("settings", DEFAULT_SETTINGS);
    const n = await nextInvoiceNumber();
    data.invoiceNo = `${settings.invoicePrefix ?? "GV-"}${String(n).padStart(4, "0")}`;
  }
  await putRecord(col, id, data);
  return data;
}

export async function updateRecord(user: SessionUser, col: Collection, id: string, raw: Record<string, unknown>) {
  const admin = user.role === "admin";
  const existing = await getRecord<Record<string, unknown>>(col, id);
  if (!existing) throw new HttpError(404, "Record not found");

  if (!admin) {
    if (col === "payments" || col === "expenses") throw new HttpError(403, "Only admins can do this");
    if ((col === "clients" || col === "leads") && existing.assignedTo !== user.id) throw new HttpError(403, "Not assigned to you");
    if (col === "clients") raw = { ...raw, assignedTo: existing.assignedTo, totalBilling: existing.totalBilling, gstApplicable: existing.gstApplicable };
    if (col === "leads") raw = { ...raw, assignedTo: existing.assignedTo };
    if (col === "comms" && !(await clientOwnedBy(String(existing.clientId), user.id))) throw new HttpError(403, "Not assigned to you");
  }
  if (col === "payments") raw = { ...raw, invoiceNo: existing.invoiceNo, clientId: existing.clientId };
  if (col === "comms") raw = { ...raw, clientId: existing.clientId, by: existing.by };

  const data = clean(col, { ...existing, ...raw }, id);
  await putRecord(col, id, data);
  return data;
}

export async function removeRecord(user: SessionUser, col: Collection, id: string) {
  const admin = user.role === "admin";
  const existing = await getRecord<Record<string, unknown>>(col, id);
  if (!existing) return;
  if (!admin) {
    if (col !== "leads" && col !== "comms") throw new HttpError(403, "Only admins can delete this");
    if (col === "leads" && existing.assignedTo !== user.id) throw new HttpError(403, "Not assigned to you");
    if (col === "comms" && !(await clientOwnedBy(String(existing.clientId), user.id))) throw new HttpError(403, "Not assigned to you");
  }
  if (col === "clients") {
    await deleteWhere("payments", "clientId", id);
    await deleteWhere("comms", "clientId", id);
  }
  await deleteRecord(col, id);
}

export function asCollection(v: string): Collection {
  if (!(COLLECTIONS as readonly string[]).includes(v)) throw new HttpError(404, "Unknown collection");
  return v as Collection;
}

export function handle(e: unknown) {
  if (e instanceof HttpError) return Response.json({ error: e.message }, { status: e.status });
  const msg = e instanceof Error ? e.message : String(e);
  if (msg === "NO_DATABASE") return Response.json({ error: "Database is not connected yet" }, { status: 503 });
  console.error(e);
  return Response.json({ error: "Server error: " + msg }, { status: 500 });
}
