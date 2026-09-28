"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { Button, Input } from "@/components/ui";
import AuthFrame from "@/components/AuthFrame";

export default function SetupPage() {
  const { refresh } = useStore();
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [f, setF] = useState({ name: "", email: "", password: "", confirm: "", company: "GrowVika", phone: "", companyEmail: "", address: "", gst: "", udyam: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/setup", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!d.needsSetup) router.replace("/login");
        else setChecking(false);
      })
      .catch(() => setChecking(false));
  }, [router]);

  const set = (k: keyof typeof f, v: string) => {
    setF((p) => ({ ...p, [k]: v }));
    setErr("");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.name.trim()) return setErr("Enter your name");
    if (!/^\S+@\S+\.\S+$/.test(f.email)) return setErr("Enter a valid email");
    if (f.password.length < 8) return setErr("Password must be at least 8 characters");
    if (f.password !== f.confirm) return setErr("Passwords do not match");
    setBusy(true);
    const res = await fetch("/api/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: f.name,
        email: f.email,
        password: f.password,
        company: { name: f.company, phone: f.phone, email: f.companyEmail, address: f.address, gst: f.gst, udyam: f.udyam, tagline: "Digital Growth Partner" },
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setErr(data.error || "Setup failed");
    await refresh();
    router.replace("/");
  };

  if (checking) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-slate-500"><Loader2 className="mr-2 animate-spin" size={16} /> Loading…</div>;
  }

  return (
    <AuthFrame>
      <h2 className="text-2xl font-semibold text-slate-900">Welcome to GrowVika CRM</h2>
      <p className="mt-1 text-sm text-slate-500">Create your admin account. You can add your team later.</p>
      <form onSubmit={submit} className="mt-6 space-y-3">
        <Input placeholder="Your name" value={f.name} onChange={(e) => set("name", e.target.value)} autoFocus />
        <Input type="email" placeholder="Your email (used to sign in)" value={f.email} onChange={(e) => set("email", e.target.value)} autoComplete="email" />
        <Input type="password" placeholder="Password (min 8 characters)" value={f.password} onChange={(e) => set("password", e.target.value)} autoComplete="new-password" />
        <Input type="password" placeholder="Confirm password" value={f.confirm} onChange={(e) => set("confirm", e.target.value)} autoComplete="new-password" />
        <p className="pt-3 text-xs font-medium uppercase tracking-wide text-slate-500">Company details (shown on invoices)</p>
        <Input placeholder="Company name" value={f.company} onChange={(e) => set("company", e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <Input placeholder="Phone" value={f.phone} onChange={(e) => set("phone", e.target.value)} />
          <Input placeholder="GSTIN (if registered)" value={f.gst} onChange={(e) => set("gst", e.target.value.toUpperCase())} />
        </div>
        <Input placeholder="Udyam registration no. (optional)" value={f.udyam} onChange={(e) => set("udyam", e.target.value.toUpperCase())} />
        <Input type="email" placeholder="Company email" value={f.companyEmail} onChange={(e) => set("companyEmail", e.target.value)} />
        <Input placeholder="Address" value={f.address} onChange={(e) => set("address", e.target.value)} />
        {err && <p className="text-sm text-red-600">{err}</p>}
        <Button type="submit" className="w-full" disabled={busy}>
          {busy && <Loader2 size={16} className="animate-spin" />} Create account
        </Button>
      </form>
    </AuthFrame>
  );
}
