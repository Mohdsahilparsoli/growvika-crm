import "server-only";
import nodemailer from "nodemailer";
import { getSetting, setSetting } from "./db";

export interface SmtpConfig {
  provider: string;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromName: string;
  replyTo: string;
}

export const DEFAULT_SMTP: SmtpConfig = {
  provider: "google",
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  user: "",
  pass: "",
  fromName: "GrowVika",
  replyTo: "",
};

export async function getSmtp(): Promise<SmtpConfig> {
  const saved = await getSetting<Partial<SmtpConfig>>("smtp", {});
  const cfg = { ...DEFAULT_SMTP, ...saved };
  if (process.env.SMTP_PASS) cfg.pass = process.env.SMTP_PASS;
  if (process.env.SMTP_USER) cfg.user = process.env.SMTP_USER;
  return cfg;
}

export async function publicSmtp() {
  const c = await getSmtp();
  return { provider: c.provider, host: c.host, port: c.port, secure: c.secure, user: c.user, fromName: c.fromName, replyTo: c.replyTo, hasPassword: !!c.pass, configured: !!(c.host && c.user && c.pass) };
}

export async function saveSmtp(input: Partial<SmtpConfig>) {
  const cur = await getSetting<Partial<SmtpConfig>>("smtp", {});
  const next: SmtpConfig = {
    ...DEFAULT_SMTP,
    ...cur,
    provider: String(input.provider ?? cur.provider ?? "google").slice(0, 40),
    host: String(input.host ?? cur.host ?? "").trim().slice(0, 200),
    port: Number(input.port ?? cur.port ?? 465) || 465,
    secure: input.secure !== undefined ? !!input.secure : cur.secure ?? true,
    user: String(input.user ?? cur.user ?? "").trim().slice(0, 200),
    fromName: String(input.fromName ?? cur.fromName ?? "").trim().slice(0, 100),
    replyTo: String(input.replyTo ?? cur.replyTo ?? "").trim().slice(0, 200),
    pass: typeof input.pass === "string" && input.pass.length > 0 ? input.pass.replace(/\s+/g, "") : (cur.pass as string) ?? "",
  };
  await setSetting("smtp", next);
}

export interface Attachment {
  filename: string;
  base64: string;
}

export async function sendMail(opts: { to: string; cc?: string; subject: string; text: string; attachments?: Attachment[] }) {
  const c = await getSmtp();
  if (!c.host || !c.user || !c.pass) throw new Error("Email is not set up yet. Go to Team & Settings → Email sending.");
  const transport = nodemailer.createTransport({
    host: c.host,
    port: c.port,
    secure: c.secure,
    auth: { user: c.user, pass: c.pass },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
  });
  const html = opts.text
    .split("\n")
    .map((l) => l.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"))
    .join("<br>");
  try {
    const info = await transport.sendMail({
      from: c.fromName ? `"${c.fromName.replace(/"/g, "")}" <${c.user}>` : c.user,
      to: opts.to,
      cc: opts.cc || undefined,
      replyTo: c.replyTo || (await getSetting<{ email?: string }>("company", {})).email || undefined,
      subject: opts.subject,
      text: opts.text,
      html: `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#0f172a">${html}</div>`,
      attachments: (opts.attachments ?? []).map((a) => ({ filename: a.filename, content: Buffer.from(a.base64, "base64"), contentType: "application/pdf" })),
    });
    return info.messageId;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/Invalid login|Username and Password not accepted|535/i.test(msg)) {
      throw new Error("Email login failed. For Google Workspace, use an App Password (not your normal password). Check Team & Settings → Email sending.");
    }
    if (/timeout/i.test(msg)) throw new Error("The email server did not respond. Check the provider settings and password, then try again.");
    throw new Error("Could not send email: " + msg);
  }
}
