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
    if (!email || !password) return setErr("Email aur password dono daalein");
    if (login(email, password)) router.replace("/");
    else setErr("Email ya password galat hai");
  };

  const quick = (em: string, pw: string) => {
    setEmail(em);
    setPassword(pw);
    setErr("");
  };

  return (
    <div className="flex min-h-screen">
      <div className="hidden w-1/2 flex-col justify-between bg-slate-900 p-12 lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600 text-xl font-bold text-white">G</div>
          <span className="text-xl font-semibold text-white">Growvika</span>
        </div>
        <div>
          <h1 className="text-4xl font-semibold leading-tight text-white">
            Clients, billing aur paisa,
            <br />
            <span className="text-emerald-400">sab ek jagah.</span>
          </h1>
          <p className="mt-4 max-w-md text-slate-400">
            Leads se client tak, har payment ka invoice, aur company ka poora hisaab: kitna aaya, kahan kharch hua, kitna bacha.
          </p>
        </div>
        <p className="text-xs text-slate-500">Growvika CRM · Demo version</p>
      </div>

      <div className="flex flex-1 items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 font-bold text-white">G</div>
            <span className="text-lg font-semibold">Growvika</span>
          </div>
          <h2 className="text-2xl font-semibold text-slate-900">Login karein</h2>
          <p className="mt-1 text-sm text-slate-500">Apne Growvika account se sign in karein</p>

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
            <Button type="submit" className="w-full">Login</Button>
          </form>

          <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Demo logins (click karke bharein)</p>
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
