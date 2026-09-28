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
  RotateCcw,
  Lock,
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
  const { ready, user, isAdmin, logout, resetDemo } = useStore();
  const router = useRouter();
  const path = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (ready && !user) router.replace("/login");
  }, [ready, user, router]);

  useEffect(() => setOpen(false), [path]);

  if (!ready || !user) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Loading…</div>;
  }

  const items = NAV.filter((n) => isAdmin || !n.admin);
  const current = NAV.find((n) => (n.href === "/" ? path === "/" : path.startsWith(n.href)));
  const blocked = current?.admin && !isAdmin;

  const nav = (
    <nav className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-lg font-bold text-white">G</div>
        <div>
          <p className="text-base font-semibold leading-tight text-white">Growvika</p>
          <p className="text-xs text-slate-400">Client Management</p>
        </div>
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
                active ? "bg-emerald-600 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Icon size={18} />
              {n.label}
            </Link>
          );
        })}
      </div>
      <div className="space-y-2 border-t border-slate-800 p-4">
        <div className="px-1">
          <p className="truncate text-sm font-medium text-white">{user.name}</p>
          <p className="text-xs capitalize text-slate-400">{user.role}</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => {
              if (confirm("Demo data reset karna hai? Aapki saari entries hat jayengi.")) resetDemo();
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <RotateCcw size={14} /> Reset demo data
          </button>
        )}
        <button
          onClick={() => {
            logout();
            router.replace("/login");
          }}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white"
        >
          <LogOut size={16} /> Logout
        </button>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 hidden w-64 bg-slate-900 lg:block">{nav}</aside>

      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 font-bold text-white">G</div>
          <span className="font-semibold text-slate-900">Growvika</span>
        </div>
        <button onClick={() => setOpen(true)} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100" aria-label="Menu">
          <Menu size={20} />
        </button>
      </header>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 bg-slate-900">
            <button onClick={() => setOpen(false)} className="absolute right-3 top-5 text-slate-400" aria-label="Close menu">
              <X size={20} />
            </button>
            {nav}
          </aside>
        </div>
      )}

      <main className="lg:pl-64">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {blocked ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <Lock className="text-slate-400" size={32} />
              <p className="mt-3 font-medium text-slate-900">Ye page sirf Admin ke liye hai</p>
              <p className="mt-1 text-sm text-slate-500">Aapke login se ye section nahi dikhega.</p>
            </div>
          ) : (
            children
          )}
        </div>
      </main>
    </div>
  );
}
