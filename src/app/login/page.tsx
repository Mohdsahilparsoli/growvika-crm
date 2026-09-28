"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { Button, Input } from "@/components/ui";

export default function LoginPage() {
  const { login, user, ready } = useStore();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    if (ready && user) router.replace("/");
  }, [ready, user, router]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return setErr("Please enter your email and password");
    if (login(email, password)) router.replace("/");
    else setErr("Incorrect email or password");
  };

  const quick = (em: string, pw: string) => {
    setEmail(em);
    setPassword(pw);
    setErr("");
  };

  return (
    <div className="flex min-h-screen">
      <div className="hidden w-1/2 flex-col justify-between bg-navy-900 p-12 lg:flex">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-white.png" alt="GrowVika" className="h-9 w-auto self-start" />
        <div>
          <h1 className="text-4xl font-semibold leading-tight text-white">
            Clients, billing and money,
            <br />
            <span className="text-brand-400">all in one place.</span>
          </h1>
          <p className="mt-4 max-w-md text-slate-400">
            From lead to client, an invoice for every payment, and a clear view of your company&apos;s money: what came in, where it was spent, and what&apos;s left.
          </p>
        </div>
        <p className="text-xs text-slate-500">GrowVika CRM · Demo version</p>
      </div>

      <div className="flex flex-1 items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-dark.png" alt="GrowVika" className="mb-10 h-7 w-auto lg:hidden" />
          <h2 className="text-2xl font-semibold text-slate-900">Sign in</h2>
          <p className="mt-1 text-sm text-slate-500">Sign in to your GrowVika account</p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <label className="block">
              <span className="text-xs font-medium text-slate-600">Email</span>
              <Input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setErr(""); }} placeholder="admin@growvika.com" className="mt-1" />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-slate-600">Password</span>
              <Input type="password" value={password} onChange={(e) => { setPassword(e.target.value); setErr(""); }} placeholder="••••••••" className="mt-1" />
            </label>
            {err && <p className="text-sm text-red-600">{err}</p>}
            <Button type="submit" className="w-full">Sign in</Button>
          </form>

          <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Demo logins (click to fill)</p>
            <div className="mt-3 space-y-2">
              <button onClick={() => quick("admin@growvika.com", "admin123")} className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-left text-sm hover:bg-slate-50">
                <span><b className="font-medium">Admin</b> · admin@growvika.com</span>
                <span className="text-xs text-slate-400">admin123</span>
              </button>
              <button onClick={() => quick("riya@growvika.com", "riya123")} className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-left text-sm hover:bg-slate-50">
                <span><b className="font-medium">Employee</b> · riya@growvika.com</span>
                <span className="text-xs text-slate-400">riya123</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
