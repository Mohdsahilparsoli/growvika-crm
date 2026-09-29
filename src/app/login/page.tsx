"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { Button, Input } from "@/components/ui";
import AuthFrame from "@/components/AuthFrame";

export default function LoginPage() {
  const { login, status, refresh } = useStore();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [noDb, setNoDb] = useState(false);

  useEffect(() => {
    if (status === "ready") router.replace("/");
  }, [status, router]);

  useEffect(() => {
    fetch("/api/setup", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.database === false) setNoDb(true);
        else if (d.needsSetup) router.replace("/setup");
      })
      .catch(() => {});
  }, [router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return setErr("Please enter your email and password");
    setBusy(true);
    const error = await login(email, password);
    setBusy(false);
    if (error) setErr(error);
    else {
      await refresh();
      router.replace("/");
    }
  };

  return (
    <AuthFrame>
      <h2 className="text-2xl font-semibold text-slate-900">Sign in</h2>
      <p className="mt-1 text-sm text-slate-500">Sign in to your GrowVika account</p>

      {noDb && (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Database is not connected yet. In Vercel, open Storage → Create Database → Neon, connect it to this project and redeploy.
        </p>
      )}

      <form onSubmit={submit} className="mt-6 space-y-4">
        <label className="block">
          <span className="text-xs font-medium text-slate-600">Email</span>
          <Input type="email" autoComplete="email" value={email} onChange={(e) => { setEmail(e.target.value); setErr(""); }} className="mt-1" />
        </label>
        <label className="block">
          <span className="text-xs font-medium text-slate-600">Password</span>
          <Input type="password" autoComplete="current-password" value={password} onChange={(e) => { setPassword(e.target.value); setErr(""); }} className="mt-1" />
        </label>
        {err && <p className="text-sm text-red-600">{err}</p>}
        <Button type="submit" className="w-full" disabled={busy}>
          {busy && <Loader2 size={16} className="animate-spin" />} Sign in
        </Button>
      </form>
      <p className="mt-6 text-xs text-slate-500">
        <Link href={`/reset${email ? `?email=${encodeURIComponent(email)}` : ""}`} className="font-medium text-brand-600 hover:underline">Forgot password?</Link>{" "}
        Get a reset link on your email. Team members can also ask the admin to reset it.
      </p>
    </AuthFrame>
  );
}
