"use client";

export default function AuthFrame({ children }: { children: React.ReactNode }) {
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
        <p className="text-xs text-slate-500">GrowVika CRM</p>
      </div>
      <div className="flex flex-1 items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-dark.png" alt="GrowVika" className="mb-10 h-7 w-auto lg:hidden" />
          {children}
        </div>
      </div>
    </div>
  );
}

