"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { Plus, X } from "lucide-react";

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between lg:mb-6">
      <div>
        <h1 className="text-[28px] font-bold leading-tight tracking-tight text-slate-900 lg:text-2xl lg:font-semibold">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-slate-500 lg:mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">{actions}</div>}
    </div>
  );
}

// Round "+" button above the tab bar on phones (hidden on desktop, where the page button is used)
export function Fab({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="bottom-tabbar animate-pop fixed right-4 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-brand-500 text-white shadow-lg shadow-brand-500/30 transition-transform active:scale-90 lg:hidden"
    >
      <Plus size={26} />
    </button>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-slate-200/80 bg-white lg:rounded-xl lg:border-slate-200 ${className}`}>{children}</div>;
}

type BtnVariant = "primary" | "secondary" | "ghost" | "danger" | "whatsapp";
const variants: Record<BtnVariant, string> = {
  primary: "bg-brand-500 text-white hover:bg-brand-600 border-brand-500",
  secondary: "bg-white text-slate-700 hover:bg-slate-50 border-slate-300",
  ghost: "bg-transparent text-slate-600 hover:bg-slate-100 border-transparent",
  danger: "bg-white text-red-600 hover:bg-red-50 border-red-200",
  whatsapp: "bg-[#25D366] text-white hover:bg-[#1ebe5b] border-[#25D366]",
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: "sm" | "md" }) {
  // Bigger touch targets on phones, normal size on desktop
  const sz = size === "sm" ? "px-3 py-2 text-xs gap-1 lg:px-2.5 lg:py-1.5" : "px-4 py-2.5 text-[15px] gap-1.5 lg:px-3.5 lg:py-2 lg:text-sm";
  return (
    <button
      {...rest}
      className={`inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-xl border font-medium transition active:scale-[0.97] disabled:opacity-50 disabled:active:scale-100 lg:rounded-lg ${sz} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "good" | "bad" | "warn";
  icon?: ReactNode;
}) {
  const toneCls = {
    default: "text-slate-900",
    good: "text-emerald-600",
    bad: "text-red-600",
    warn: "text-amber-600",
  }[tone];
  return (
    <Card className="p-3.5 lg:p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500 lg:text-xs">{label}</p>
        {icon && <span className="text-slate-400">{icon}</span>}
      </div>
      <p className={`mt-1.5 text-xl font-semibold tabular-nums lg:mt-2 lg:text-2xl ${toneCls}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </Card>
  );
}

const badgeTones: Record<string, string> = {
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  red: "bg-red-50 text-red-700 ring-red-200",
  amber: "bg-amber-50 text-amber-700 ring-amber-200",
  blue: "bg-sky-50 text-sky-700 ring-sky-200",
  purple: "bg-violet-50 text-violet-700 ring-violet-200",
  gray: "bg-slate-100 text-slate-600 ring-slate-200",
};

export function Badge({ children, tone = "gray" }: { children: ReactNode; tone?: keyof typeof badgeTones | string }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
        badgeTones[tone] ?? badgeTones.gray
      }`}
    >
      {children}
    </span>
  );
}

// Locks page scrolling behind an open sheet/modal
function useScrollLock(open: boolean) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);
}

function useEscape(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);
}

// Drag the top of a sheet down to close it (phones)
function useSwipeDown(onClose: () => void) {
  const [dy, setDy] = useState(0);
  const startY = useRef<number | null>(null);
  const dist = useRef(0); // ref, so a fast flick still closes before React re-renders
  return {
    dy,
    handlers: {
      onTouchStart: (e: React.TouchEvent) => {
        startY.current = e.touches[0].clientY;
        dist.current = 0;
      },
      onTouchMove: (e: React.TouchEvent) => {
        if (startY.current === null) return;
        dist.current = Math.max(0, e.touches[0].clientY - startY.current);
        setDy(dist.current);
      },
      onTouchEnd: () => {
        if (dist.current > 90) onClose();
        startY.current = null;
        dist.current = 0;
        setDy(0);
      },
    },
  };
}

// Phone-only bottom sheet (e.g. the "More" menu)
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useScrollLock(open);
  useEscape(open, onClose);
  const swipe = useSwipeDown(onClose);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="animate-fade absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div
        className="animate-sheet pb-safe absolute inset-x-0 bottom-0 max-h-[90dvh] overflow-y-auto rounded-t-3xl bg-white shadow-2xl"
        style={{ transform: swipe.dy ? `translateY(${swipe.dy}px)` : undefined, transition: swipe.dy ? "none" : "transform .2s" }}
      >
        <div {...swipe.handlers} className="sticky top-0 z-10 bg-white/95 px-5 pb-2 pt-2.5 backdrop-blur">
          <div className="mx-auto h-1.5 w-10 rounded-full bg-slate-300" />
          <div className="mt-2 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
            <button onClick={onClose} className="-mr-1 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 active:bg-slate-200" aria-label="Close"><X size={16} /></button>
          </div>
        </div>
        <div className="px-5 pb-6 pt-2">{children}</div>
      </div>
    </div>
  );
}

// A dialog on desktop; a bottom sheet that slides up (and swipes down to close) on phones
export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  useScrollLock(open);
  useEscape(open, onClose);
  const swipe = useSwipeDown(onClose);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center lg:items-center lg:overflow-y-auto lg:p-4">
      <div className="animate-fade absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div
        className={`animate-sheet lg:animate-pop relative flex max-h-[94dvh] w-full flex-col rounded-t-3xl bg-white shadow-2xl lg:max-h-[calc(100dvh-2rem)] lg:rounded-xl lg:shadow-xl ${wide ? "lg:max-w-2xl" : "lg:max-w-lg"}`}
        style={{ transform: swipe.dy ? `translateY(${swipe.dy}px)` : undefined, transition: swipe.dy ? "none" : "transform .2s" }}
      >
        <div {...swipe.handlers} className="shrink-0 border-b border-slate-100 px-5 pb-3 pt-2.5 lg:border-slate-200 lg:py-3">
          <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-slate-300 lg:hidden" />
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900 lg:text-base">{title}</h2>
            <button onClick={onClose} className="-mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 active:bg-slate-200 lg:h-auto lg:w-auto lg:rounded lg:bg-transparent lg:p-1 lg:text-slate-400 lg:hover:bg-slate-100" aria-label="Close">
              <X size={18} />
            </button>
          </div>
        </div>
        <div className="pb-safe overflow-y-auto overscroll-contain">
          <div className="p-4 lg:p-5 pb-8 lg:pb-5">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function Field({ label, children, full }: { label: string; children: ReactNode; full?: boolean }) {
  return (
    <label className={`flex flex-col gap-1 ${full ? "sm:col-span-2" : ""}`}>
      <span className="text-xs font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}

const inputCls =
  "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 lg:rounded-lg lg:py-2";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputCls} ${props.className ?? ""}`} />;
}

export function Select({ options, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { options: (string | { value: string; label: string })[] }) {
  return (
    <select {...props} className={`${inputCls.replace("w-full ", "")} ${props.className ?? "w-full"}`}>
      {options.map((o) =>
        typeof o === "string" ? (
          <option key={o} value={o}>
            {o}
          </option>
        ) : (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        )
      )}
    </select>
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={3} {...props} className={`${inputCls} ${props.className ?? ""}`} />;
}

export function Empty({ text }: { text: string }) {
  return <div className="px-4 py-10 text-center text-sm text-slate-500">{text}</div>;
}

export function Th({ children, right }: { children?: ReactNode; right?: boolean }) {
  return (
    <th className={`px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-slate-500 ${right ? "text-right" : "text-left"}`}>
      {children}
    </th>
  );
}

export function Td({ children, right, className = "" }: { children?: ReactNode; right?: boolean; className?: string }) {
  return <td className={`px-4 py-3 text-sm text-slate-700 ${right ? "whitespace-nowrap text-right tabular-nums" : ""} ${className}`}>{children}</td>;
}

export function PhoneInput({ value, onChange, className = "" }: { value: string; onChange: (v: string) => void; className?: string }) {
  return (
    <div className={`flex w-full overflow-hidden rounded-xl border border-slate-300 lg:rounded-lg bg-white focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100 ${className}`}>
      <span className="flex items-center border-r border-slate-200 bg-slate-50 px-3 text-sm text-slate-600">+91-</span>
      <input
        value={value}
        onChange={(e) => {
          const d = e.target.value.replace(/\D/g, "");
          onChange(d.length > 10 && (d.startsWith("91") || d.startsWith("0")) ? d.slice(d.length - 10) : d.slice(0, 10));
        }}
        inputMode="numeric"
        placeholder="10-digit mobile number"
        type="tel"
        autoComplete="tel-national"
        className="w-full bg-white px-3 py-2.5 text-sm text-slate-900 outline-none lg:py-2"
      />
    </div>
  );
}
