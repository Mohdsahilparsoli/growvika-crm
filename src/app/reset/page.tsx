"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button, Input } from "@/components/ui";
import AuthFrame from "@/components/AuthFrame";

export default function ResetPage() {
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("token") ?? "";
    setToken(t);
    const e = new URLSearchParams(window.location.search).get("email") ?? "";
    if (e) setEmail(e);
  }, []);

  const post = async (url: string, body: unknown) => {
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || "Something went wrong. Please try again.");
    return d;
  };

  const requestLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return setErr("Please enter your email");
    setBusy(true); setErr(""); setMsg("");
    try {
      await post("/api/auth/forgot", { email });
      setMsg(`If ${email} has a GrowVika account, a reset link is on its way. Check your inbox (and spam). The link expires in 30 minutes.`);
    } catch (x) {
      setErr((x as Error).message);
    }
    setBusy(false);
  };

  const setNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return setErr("New password must be at least 8 characters");
    if (password !== confirm) return setErr("The two passwords do not match");
    setBusy(true); setErr("");
    try {
      await post("/api/auth/reset", { token, password });
      window.location.href = "/";
    } catch (x) {
      setErr((x as Error).message);
      setBusy(false);
    }
  };

  const passwordFields = (
    <>
      <label className="block">
        <span className="text-xs font-medium text-slate-600">New password (min 8 characters)</span>
        <Input type="password" autoComplete="new-password" value={password} onChange={(e) => { setPassword(e.target.value); setErr(""); }} className="mt-1" />
      </label>
      <label className="block">
        <span className="text-xs font-medium text-slate-600">Confirm new password</span>
        <Input type="password" autoComplete="new-password" value={confirm} onChange={(e) => { setConfirm(e.target.value); setErr(""); }} className="mt-1" />
      </label>
    </>
  );

  return (
    <AuthFrame>
      <h2 className="text-2xl font-semibold text-slate-900">{token ? "Choose a new password" : "Forgot password"}</h2>
      <p className="mt-1 text-sm text-slate-500">
        {token ? "Enter your new password below." : "We will email you a link to reset your password."}
      </p>

      {token ? (
        <form onSubmit={setNew} className="mt-6 space-y-4">
          {passwordFields}
          {err && <p className="text-sm text-red-600">{err}</p>}
          <Button type="submit" className="w-full" disabled={busy}>{busy && <Loader2 size={16} className="animate-spin" />} Save new password</Button>
        </form>
      ) : (
        <form onSubmit={requestLink} className="mt-6 space-y-4">
          <label className="block">
            <span className="text-xs font-medium text-slate-600">Your email</span>
            <Input type="email" autoComplete="email" value={email} onChange={(e) => { setEmail(e.target.value); setErr(""); }} className="mt-1" />
          </label>
          {err && <p className="text-sm text-red-600">{err}</p>}
          {msg && <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{msg}</p>}
          <Button type="submit" className="w-full" disabled={busy}>{busy && <Loader2 size={16} className="animate-spin" />} Send reset link</Button>
        </form>
      )}

      <div className="mt-6 space-y-2 text-xs text-slate-500">
        <p><Link href="/login" className="text-brand-600 hover:underline">← Back to sign in</Link></p>
      </div>
    </AuthFrame>
  );
}
