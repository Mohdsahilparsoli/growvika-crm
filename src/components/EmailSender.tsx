"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, Mail } from "lucide-react";
import { useStore, uid } from "@/lib/store";
import { Client } from "@/lib/types";
import type { PdfResult } from "@/lib/pdf";
import { todayISO } from "@/lib/format";
import { Button, Input, Textarea } from "./ui";

export default function EmailSender({
  client,
  subject: initialSubject,
  message,
  makePdf,
  logLabel,
}: {
  client: Client;
  subject: string;
  message: string;
  makePdf: () => Promise<PdfResult>;
  logLabel: string;
}) {
  const { update, user } = useStore();
  const [cfg, setCfg] = useState<{ configured: boolean; user: string } | null>(null);
  const [to, setTo] = useState(client.email);
  const [cc, setCc] = useState("");
  const [subject, setSubject] = useState(initialSubject);
  const [text, setText] = useState(message);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [sentTo, setSentTo] = useState("");

  useEffect(() => {
    fetch("/api/email/settings", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setCfg({ configured: !!d.configured, user: d.user ?? "" }))
      .catch(() => setCfg({ configured: false, user: "" }));
  }, []);

  const send = async () => {
    setErr("");
    if (!/^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/.test(to.trim())) return setErr("Enter the client's email address");
    setBusy(true);
    try {
      const pdf = await makePdf();
      const res = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: to.trim(), cc, subject, text, attachments: [pdf] }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not send email");
      setSentTo(to.trim());
      update((d) => ({
        ...d,
        clients: !client.email && to.trim() ? d.clients.map((c) => (c.id === client.id ? { ...c, email: to.trim() } : c)) : d.clients,
        comms: [
          ...d.comms,
          { id: uid("m"), clientId: client.id, date: todayISO(), type: "Email", summary: `${logLabel} emailed to ${to.trim()}`, by: user?.id ?? "", nextAction: "", fileName: pdf.filename },
        ],
      }));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (!cfg) {
    return <div className="flex items-center gap-2 rounded-lg border border-slate-200 p-4 text-sm text-slate-500"><Loader2 size={14} className="animate-spin" /> Checking email setup…</div>;
  }

  if (!cfg.configured) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <p className="font-medium">Email sending is not set up yet</p>
        <p className="mt-1">Connect your GrowVika email once in <Link href="/team#email" className="underline">Team &amp; Settings → Email sending</Link>. After that, invoices go straight from your email to the client with the PDF attached.</p>
      </div>
    );
  }

  if (sentTo) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
        <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
        <div>
          <p className="font-medium">Email sent to {sentTo}</p>
          <p className="mt-0.5 text-emerald-700">Sent from {cfg.user} with the PDF attached. Saved in the client&apos;s communication history.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-slate-200 p-4">
      <p className="flex items-center gap-2 text-sm font-medium text-slate-900"><Mail size={16} /> Send on email <span className="font-normal text-slate-500">from {cfg.user}</span></p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block"><span className="text-xs font-medium text-slate-600">To</span><Input className="mt-1" type="email" value={to} onChange={(e) => { setErr(""); setTo(e.target.value); }} placeholder="client@example.com" /></label>
        <label className="block"><span className="text-xs font-medium text-slate-600">CC (optional)</span><Input className="mt-1" value={cc} onChange={(e) => setCc(e.target.value)} placeholder="accounts@example.com" /></label>
      </div>
      <label className="block"><span className="text-xs font-medium text-slate-600">Subject</span><Input className="mt-1" value={subject} onChange={(e) => setSubject(e.target.value)} /></label>
      <label className="block"><span className="text-xs font-medium text-slate-600">Message</span><Textarea className="mt-1 text-xs" rows={7} value={text} onChange={(e) => setText(e.target.value)} /></label>
      {!client.email && <p className="text-xs text-slate-500">This client has no email saved. The address you enter here will be saved to their profile.</p>}
      {err && <p className="text-sm text-red-600">{err}</p>}
      <Button onClick={send} disabled={busy} className="w-full">
        {busy ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />} {busy ? "Sending…" : "Send on Email"}
      </Button>
    </div>
  );
}
