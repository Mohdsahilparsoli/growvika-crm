"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, Mail } from "lucide-react";
import { Button, Card, Field, Input, Select } from "./ui";

const PRESETS: Record<string, { label: string; host: string; port: number; secure: boolean }> = {
  google: { label: "Google Workspace / Gmail", host: "smtp.gmail.com", port: 465, secure: true },
  zoho: { label: "Zoho Mail (India)", host: "smtp.zoho.in", port: 465, secure: true },
  hostinger: { label: "Hostinger Email", host: "smtp.hostinger.com", port: 465, secure: true },
  titan: { label: "Titan / GoDaddy Email", host: "smtp.titan.email", port: 465, secure: true },
  microsoft: { label: "Microsoft 365 / Outlook", host: "smtp.office365.com", port: 587, secure: false },
  custom: { label: "Other (custom SMTP)", host: "", port: 465, secure: true },
};

interface Cfg {
  provider: string;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  fromName: string;
  replyTo: string;
  hasPassword: boolean;
  configured: boolean;
}

export default function EmailSettings({ defaultFromName }: { defaultFromName: string }) {
  const [cfg, setCfg] = useState<Cfg | null>(null);
  const [pass, setPass] = useState("");
  const [busy, setBusy] = useState<"" | "save" | "test">("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/email/settings", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setCfg({ ...d, fromName: d.fromName || defaultFromName }))
      .catch(() => setMsg({ ok: false, text: "Could not load email settings" }));
  }, [defaultFromName]);

  if (!cfg) return null;

  const set = <K extends keyof Cfg>(k: K, v: Cfg[K]) => {
    setMsg(null);
    setCfg({ ...cfg, [k]: v });
  };

  const choose = (provider: string) => {
    const p = PRESETS[provider];
    setMsg(null);
    setCfg({ ...cfg, provider, ...(provider === "custom" ? {} : { host: p.host, port: p.port, secure: p.secure }) });
  };

  const save = async (): Promise<boolean> => {
    if (!/^\S+@\S+\.\S+$/.test(cfg.user)) {
      setMsg({ ok: false, text: "Enter the email address you send from" });
      return false;
    }
    if (!cfg.hasPassword && !pass) {
      setMsg({ ok: false, text: "Enter the app password" });
      return false;
    }
    setBusy("save");
    const res = await fetch("/api/email/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...cfg, pass }),
    });
    const d = await res.json().catch(() => ({}));
    setBusy("");
    if (!res.ok) {
      setMsg({ ok: false, text: d.error || "Could not save" });
      return false;
    }
    setCfg({ ...cfg, ...d });
    setPass("");
    setMsg({ ok: true, text: "Saved" });
    return true;
  };

  const test = async () => {
    if ((pass || !cfg.configured) && !(await save())) return;
    setBusy("test");
    const res = await fetch("/api/email/test", { method: "POST" });
    const d = await res.json().catch(() => ({}));
    setBusy("");
    setMsg(res.ok ? { ok: true, text: `Test email sent to ${d.to}. Check your inbox.` } : { ok: false, text: d.error || "Test failed" });
  };

  const isGoogle = cfg.provider === "google";

  return (
    <Card className="mt-6 scroll-mt-6 p-5">
      <div id="email" className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="flex items-center gap-2 font-medium text-slate-900"><Mail size={16} /> Email sending</h3>
          <p className="text-xs text-slate-500">Invoices and bills are sent from this email address, with the PDF attached.</p>
        </div>
        {cfg.configured ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700"><CheckCircle2 size={14} /> Connected</span>
        ) : (
          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">Not set up</span>
        )}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="Email provider">
          <Select value={cfg.provider} onChange={(e) => choose(e.target.value)} options={Object.entries(PRESETS).map(([value, p]) => ({ value, label: p.label }))} />
        </Field>
        <Field label="Send from (your email)">
          <Input type="email" value={cfg.user} onChange={(e) => set("user", e.target.value.trim())} placeholder="sahil@growvika.com" />
        </Field>
        <Field label={isGoogle ? "Google App Password" : "Email password"}>
          <Input type="password" autoComplete="new-password" value={pass} onChange={(e) => { setMsg(null); setPass(e.target.value); }} placeholder={cfg.hasPassword ? "Saved (type to change)" : isGoogle ? "16-letter app password" : "Password"} />
        </Field>
        <Field label="Sender name">
          <Input value={cfg.fromName} onChange={(e) => set("fromName", e.target.value)} placeholder="GrowVika" />
        </Field>
        {cfg.provider === "custom" && (
          <>
            <Field label="SMTP host"><Input value={cfg.host} onChange={(e) => set("host", e.target.value.trim())} placeholder="smtp.example.com" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Port"><Input type="number" value={cfg.port} onChange={(e) => set("port", Number(e.target.value))} /></Field>
              <Field label="Security"><Select value={cfg.secure ? "ssl" : "tls"} onChange={(e) => set("secure", e.target.value === "ssl")} options={[{ value: "ssl", label: "SSL (465)" }, { value: "tls", label: "STARTTLS (587)" }]} /></Field>
            </div>
          </>
        )}
      </div>

      {isGoogle && (
        <div className="mt-4 rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
          <p className="font-medium text-slate-700">How to get a Google App Password (one time):</p>
          <ol className="mt-1 list-decimal space-y-0.5 pl-4">
            <li>Sign in to <b>{cfg.user || "your GrowVika email"}</b> and open <a className="text-brand-600 underline" href="https://myaccount.google.com/security" target="_blank" rel="noreferrer">myaccount.google.com/security</a>.</li>
            <li>Turn on <b>2-Step Verification</b> if it is off.</li>
            <li>Open <a className="text-brand-600 underline" href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer">myaccount.google.com/apppasswords</a>, type a name like &quot;GrowVika CRM&quot; and click <b>Create</b>.</li>
            <li>Copy the 16-letter password, paste it above and click <b>Save &amp; send test</b>.</li>
          </ol>
          <p className="mt-1">Don&apos;t use your normal Gmail password. If the App passwords page is missing, your Workspace admin needs to allow 2-Step Verification.</p>
        </div>
      )}

      {msg && <p className={`mt-3 text-sm ${msg.ok ? "text-emerald-600" : "text-red-600"}`}>{msg.text}</p>}

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <Button variant="secondary" onClick={save} disabled={!!busy}>{busy === "save" && <Loader2 size={14} className="animate-spin" />} Save</Button>
        <Button onClick={test} disabled={!!busy}>{busy === "test" && <Loader2 size={14} className="animate-spin" />} Save &amp; send test</Button>
      </div>
    </Card>
  );
}
