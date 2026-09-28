"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import {
  LayoutDashboard,
  Users,
  Target,
  Receipt,
  Wallet,
  UserCog,
  LogOut,
  Menu,
  X,
  Lock,
  Loader2,
  AlertTriangle,
  Database,
} from "lucide-react";
import { useStore } from "@/lib/store";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, admin: false },
  { href: "/clients", label: "Clients", icon: Users, admin: false },
  { href: "/leads", label: "Leads Pipeline", icon: Target, admin: false },
  { href: "/billing", label: "Billing", icon: Receipt, admin: true },
  { href: "/expenses", label: "Company Account", icon: Wallet, admin: true },
  { href: "/team", label: "Team & Settings", icon: UserCog, admin: true },
];

export default function Shell({ children }: { children: ReactNode }) {
  const { status, user, isAdmin, logout, saving, error, clearError } = useStore();
  const router = useRouter();
  const path = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (status === "signed-out") router.replace("/login");
  }, [status, router]);

  useEffect(() => setOpen(false), [path]);

  if (status === "no-database") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
        <Database className="text-slate-400" size={36} />
        <p className="mt-3 text-lg font-medium text-slate-900">Database not connected</p>
        <p className="mt-1 max-w-md text-sm text-slate-500">
          Open your project on Vercel → Storage → Create Database → Neon, connect it to this project, then redeploy.
        </p>
      </div>
    );
  }

  if (status === "error" && !user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
        <AlertTriangle className="text-amber-500" size={36} />
        <p className="mt-3 text-lg font-medium text-slate-900">Something went wrong</p>
        <p className="mt-1 max-w-md text-sm text-slate-500">{error}</p>
        <button onClick={() => location.reload()} className="mt-4 rounded-lg border border-slate-300 px-3 py-1.5 text-sm">Try again</button>
      </div>
    );
  }

  if (status !== "ready" || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-2 text-sm text-slate-500">
        <Loader2 className="animate-spin" size={16} /> Loading…
      </div>
    );
  }

  const items = NAV.filter((n) => isAdmin || !n.admin);
  const current = NAV.find((n) => (n.href === "/" ? path === "/" : path.startsWith(n.href)));
  const blocked = current?.admin && !isAdmin;

  const nav = (
    <nav className="flex h-full flex-col">
      <div className="px-6 pb-6 pt-7">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-white.png" alt="GrowVika" className="h-7 w-auto" />
        <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">Client Management</p>
      </div>
      <div className="flex-1 space-y-1 px-3">
        {items.map((n) => {
          const active = n.href === "/" ? path === "/" : path.startsWith(n.href);
          const Icon = n.icon;
          return (
            <Link
              key={n.href}
              href={n.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                active ? "bg-brand-500 text-white" : "text-slate-300 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon size={18} />
              {n.label}
            </Link>
          );
        })}
      </div>
      <div className="space-y-2 border-t border-white/10 p-4">
        <div className="px-1">
          <p className="truncate text-sm font-medium text-white">{user.name}</p>
          <p className="text-xs capitalize text-slate-400">{user.role}</p>
        </div>
        <button
          onClick={async () => {
            await logout();
            router.replace("/login");
          }}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white"
        >
          <LogOut size={16} /> Log out
        </button>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 hidden w-64 bg-navy-900 lg:block">{nav}</aside>

      <header className="sticky top-0 z-30 flex items-center justify-between bg-navy-900 px-4 py-3 lg:hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-white.png" alt="GrowVika" className="h-6 w-auto" />
        <button onClick={() => setOpen(true)} className="rounded-lg p-2 text-slate-300 hover:bg-white/10" aria-label="Open menu">
          <Menu size={20} />
        </button>
      </header>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 bg-navy-900">
            <button onClick={() => setOpen(false)} className="absolute right-3 top-6 text-slate-400" aria-label="Close menu">
              <X size={20} />
            </button>
            {nav}
          </aside>
        </div>
      )}

      {(saving || error) && (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm">
          {error ? (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-white px-4 py-3 text-sm text-red-700 shadow-lg">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <span className="flex-1">{error}</span>
              <button onClick={clearError} className="text-red-400 hover:text-red-700" aria-label="Dismiss"><X size={16} /></button>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-lg bg-navy-900 px-3 py-2 text-xs text-white shadow-lg">
              <Loader2 size={14} className="animate-spin" /> Saving…
            </div>
          )}
        </div>
      )}

      <main className="lg:pl-64">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {blocked ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <Lock className="text-slate-400" size={32} />
              <p className="mt-3 font-medium text-slate-900">This page is for admins only</p>
              <p className="mt-1 text-sm text-slate-500">Your account doesn&apos;t have access to this section.</p>
            </div>
          ) : (
            children
          )}
        </div>
      </main>
    </div>
  );
}
