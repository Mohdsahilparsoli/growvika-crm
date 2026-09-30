"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useRef, useState } from "react";
import {
  LayoutDashboard,
  Users,
  Target,
  Receipt,
  Wallet,
  UserCog,
  LogOut,
  Lock,
  Loader2,
  AlertTriangle,
  Database,
  X,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  RefreshCw,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { Sheet } from "./ui";

const NAV = [
  { href: "/", label: "Dashboard", short: "Home", icon: LayoutDashboard, admin: false },
  { href: "/clients", label: "Clients", short: "Clients", icon: Users, admin: false },
  { href: "/leads", label: "Leads Pipeline", short: "Leads", icon: Target, admin: false },
  { href: "/billing", label: "Billing", short: "Billing", icon: Receipt, admin: true },
  { href: "/expenses", label: "Company Account", short: "Account", icon: Wallet, admin: true },
  { href: "/team", label: "Team & Settings", short: "Settings", icon: UserCog, admin: true },
];

const isActive = (href: string, path: string) => (href === "/" ? path === "/" : path === href || path.startsWith(href + "/"));

export default function Shell({ children }: { children: ReactNode }) {
  const { status, user, isAdmin, logout, saving, error, clearError, db, refresh } = useStore();
  const router = useRouter();
  const path = usePathname();
  const [more, setMore] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (status === "signed-out") router.replace("/login");
  }, [status, router]);

  useEffect(() => setMore(false), [path]);

  // Phone top bar: show the page title once the big title has scrolled away (like iOS)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 44);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [path]);

  const pull = usePullToRefresh(refresh);

  if (status === "no-database") {
    return (
      <div className="pt-safe flex min-h-screen flex-col items-center justify-center p-6 text-center">
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
      <div className="pt-safe flex min-h-screen flex-col items-center justify-center p-6 text-center">
        <AlertTriangle className="text-amber-500" size={36} />
        <p className="mt-3 text-lg font-medium text-slate-900">Something went wrong</p>
        <p className="mt-1 max-w-md text-sm text-slate-500">{error}</p>
        <button onClick={() => location.reload()} className="mt-4 rounded-lg border border-slate-300 px-3 py-1.5 text-sm">Try again</button>
      </div>
    );
  }

  // Data normally arrives with the page itself; this blank screen only shows if it had to be re-fetched
  if (status !== "ready" || !user) return <div className="min-h-screen bg-slate-50" />;

  const items = NAV.filter((n) => isAdmin || !n.admin);
  const current = NAV.find((n) => isActive(n.href, path));
  const blocked = current?.admin && !isAdmin;

  // Phone tab bar: 4 main sections + "More"
  const tabs = items.filter((n) => ["/", "/clients", "/leads", "/billing"].includes(n.href));
  const moreItems = items.filter((n) => !tabs.includes(n));
  const moreActive = moreItems.some((n) => isActive(n.href, path));

  // Title and back button for the phone top bar
  const clientMatch = /^\/clients\/([^/]+)$/.exec(path);
  const detailClient = clientMatch ? db.clients.find((c) => c.id === decodeURIComponent(clientMatch[1])) : undefined;
  const title = clientMatch ? detailClient?.business ?? "Client" : current?.label ?? "GrowVika";
  const back = clientMatch ? "/clients" : null;

  const doLogout = async () => {
    await logout();
    router.replace("/login");
  };

  const sidebar = (
    <nav className="flex h-full flex-col">
      <div className="px-6 pb-6 pt-7">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-white.png" alt="GrowVika" className="h-7 w-auto" />
        <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">Client Management</p>
      </div>
      <div className="flex-1 space-y-1 px-3">
        {items.map((n) => {
          const active = isActive(n.href, path);
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
        <button onClick={doLogout} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white">
          <LogOut size={16} /> Log out
        </button>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ---------- Desktop sidebar ---------- */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 bg-navy-900 lg:block">{sidebar}</aside>

      {/* ---------- Phone: top bar (sits under the iPhone status bar) ---------- */}
      <header className="pt-safe sticky top-0 z-30 bg-navy-900 lg:hidden">
        <div className="relative flex h-12 items-center justify-between px-2">
          <div className="flex min-w-0 items-center">
            {back ? (
              <Link href={back} className="flex items-center rounded-lg py-2 pl-1 pr-2 text-[15px] text-brand-300 active:opacity-60">
                <ChevronLeft size={24} className="-ml-1" /> Clients
              </Link>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src="/logo-white.png" alt="GrowVika" className="ml-2 h-[18px] w-auto" />
            )}
          </div>
          <p
            className={`pointer-events-none absolute inset-x-24 truncate text-center text-[15px] font-semibold text-white transition-opacity duration-200 ${
              scrolled || back ? "opacity-100" : "opacity-0"
            }`}
          >
            {title}
          </p>
          <div className="flex w-10 items-center justify-end pr-2 text-slate-300">
            {saving && <Loader2 size={18} className="animate-spin" aria-label="Saving" />}
          </div>
        </div>
      </header>

      {/* Pull-to-refresh indicator (phone) */}
      {pull.distance > 0 && (
        <div className="pointer-events-none fixed inset-x-0 z-20 flex justify-center lg:hidden" style={{ top: `calc(env(safe-area-inset-top) + 3rem + ${Math.min(pull.distance, 80) - 36}px)` }}>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-md ring-1 ring-slate-200">
            <RefreshCw
              size={17}
              className={`text-brand-500 ${pull.refreshing ? "animate-spin" : ""}`}
              style={pull.refreshing ? undefined : { transform: `rotate(${pull.distance * 3}deg)`, opacity: Math.min(1, pull.distance / 70) }}
            />
          </div>
        </div>
      )}

      {/* ---------- Messages ---------- */}
      {(saving || error) && (
        <div className={`bottom-tabbar fixed inset-x-4 z-50 flex justify-center lg:inset-x-auto lg:bottom-4 lg:right-4 ${!error ? "hidden lg:flex" : ""}`}>
          {error ? (
            <div className="animate-pop flex w-full max-w-sm items-start gap-2 rounded-2xl border border-red-200 bg-white px-4 py-3 text-sm text-red-700 shadow-lg lg:rounded-lg">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <span className="flex-1">{error}</span>
              <button onClick={clearError} className="-m-1 p-1 text-red-400 hover:text-red-700" aria-label="Dismiss"><X size={16} /></button>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-lg bg-navy-900 px-3 py-2 text-xs text-white shadow-lg">
              <Loader2 size={14} className="animate-spin" /> Saving…
            </div>
          )}
        </div>
      )}

      {/* ---------- Page ---------- */}
      <main className="pb-tabbar lg:pb-0 lg:pl-64">
        <div key={path} className="animate-page mx-auto max-w-7xl px-4 pb-6 pt-4 sm:px-6 lg:px-8 lg:py-8">
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

      {/* ---------- Phone: bottom tab bar ---------- */}
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-slate-200/80 bg-white/90 backdrop-blur-xl lg:hidden">
        <div className="flex h-[3.4rem] items-stretch">
          {tabs.map((n) => {
            const active = isActive(n.href, path);
            const Icon = n.icon;
            return (
              <Link key={n.href} href={n.href} className={`flex flex-1 flex-col items-center justify-center gap-0.5 text-[10.5px] font-medium active:opacity-60 ${active ? "text-brand-500" : "text-slate-400"}`}>
                <Icon size={23} strokeWidth={active ? 2.3 : 1.8} />
                {n.short}
              </Link>
            );
          })}
          <button onClick={() => setMore(true)} className={`flex flex-1 flex-col items-center justify-center gap-0.5 text-[10.5px] font-medium active:opacity-60 ${moreActive || more ? "text-brand-500" : "text-slate-400"}`}>
            <MoreHorizontal size={23} strokeWidth={moreActive ? 2.3 : 1.8} />
            More
          </button>
        </div>
      </nav>

      {/* ---------- Phone: "More" sheet ---------- */}
      <Sheet open={more} onClose={() => setMore(false)} title="More">
        <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-500 text-lg font-semibold text-white">{user.name.charAt(0)}</div>
          <div className="min-w-0">
            <p className="truncate font-medium text-slate-900">{user.name}</p>
            <p className="truncate text-xs text-slate-500">{user.email} · <span className="capitalize">{user.role}</span></p>
          </div>
        </div>
        {moreItems.length > 0 && (
          <div className="mt-4 divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200">
            {moreItems.map((n) => {
              const Icon = n.icon;
              return (
                <Link key={n.href} href={n.href} className="flex items-center gap-3 bg-white px-4 py-3.5 text-[15px] text-slate-900 active:bg-slate-50">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600"><Icon size={18} /></span>
                  <span className="flex-1">{n.label}</span>
                  <ChevronRight size={18} className="text-slate-300" />
                </Link>
              );
            })}
          </div>
        )}
        <button onClick={doLogout} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-[15px] font-medium text-red-600 active:bg-red-50">
          <LogOut size={18} /> Log out
        </button>
      </Sheet>
    </div>
  );
}

// Pull down at the top of the page to reload data (the app has no browser reload button)
function usePullToRefresh(onRefresh: () => Promise<void>) {
  const [distance, setDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const start = useRef<{ x: number; y: number } | null>(null);
  const dist = useRef(0);

  useEffect(() => {
    const onStart = (e: TouchEvent) => {
      if (window.scrollY > 0 || refreshing || document.body.style.overflow === "hidden" || window.innerWidth >= 1024) return;
      start.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };
    const onMove = (e: TouchEvent) => {
      if (!start.current) return;
      const dy = e.touches[0].clientY - start.current.y;
      const dx = e.touches[0].clientX - start.current.x;
      if (dy <= 0 || Math.abs(dx) > dy || window.scrollY > 0) {
        start.current = dy < 0 || Math.abs(dx) > Math.abs(dy) ? null : start.current;
        dist.current = 0;
        setDistance(0);
        return;
      }
      dist.current = Math.min(110, dy * 0.5);
      setDistance(dist.current);
    };
    const onEnd = async () => {
      if (!start.current) return;
      start.current = null;
      if (dist.current >= 70) {
        setRefreshing(true);
        setDistance(70);
        try {
          await onRefresh();
        } finally {
          setRefreshing(false);
          setDistance(0);
        }
      } else setDistance(0);
      dist.current = 0;
    };
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd);
    window.addEventListener("touchcancel", onEnd);
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };
  }, [onRefresh, refreshing]);

  return { distance, refreshing };
}
