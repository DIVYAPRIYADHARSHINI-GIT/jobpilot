"use client";
// Small shared UI primitives: buttons, cards, badges, match ring, dialogs,
// empty states, skeletons and a lightweight toast system.
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { scoreTone } from "@/lib/match";
import { IconAlert, IconCheckCircle, IconX } from "./Icons";

export const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(" ");

type BtnVariant = "primary" | "secondary" | "ghost" | "danger" | "success";
const BTN: Record<BtnVariant, string> = {
  primary: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm shadow-indigo-600/20 disabled:bg-indigo-400",
  secondary: "bg-white text-slate-800 ring-1 ring-slate-300 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-600 dark:hover:bg-slate-700",
  ghost: "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800",
  danger: "bg-rose-600 text-white hover:bg-rose-700",
  success: "bg-emerald-600 text-white hover:bg-emerald-700",
};

export function btn(variant: BtnVariant = "primary", size: "sm" | "md" | "lg" = "md") {
  const s = size === "sm" ? "px-3 py-1.5 text-sm" : size === "lg" ? "px-5 py-3 text-base" : "px-4 py-2 text-sm";
  return cx("inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:cursor-not-allowed disabled:opacity-70", s, BTN[variant]);
}

export function Button({ variant = "primary", size = "md", className, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: "sm" | "md" | "lg" }) {
  return <button type="button" className={cx(btn(variant, size), className)} {...rest} />;
}

export function Card({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cx("rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 dark:border-slate-700/70 dark:bg-slate-900", className)} {...rest}>
      {children}
    </div>
  );
}

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">{title}</h1>
        {subtitle && <p className="mt-1 text-slate-600 dark:text-slate-400">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

export function Chip({ children, tone = "slate", className }: { children: React.ReactNode; tone?: "slate" | "green" | "red" | "indigo" | "amber" | "cyan"; className?: string }) {
  const tones = {
    slate: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    green: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30",
    red: "bg-rose-50 text-rose-700 ring-1 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/30",
    indigo: "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-300 dark:ring-indigo-500/30",
    amber: "bg-amber-50 text-amber-800 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30",
    cyan: "bg-cyan-50 text-cyan-800 ring-1 ring-cyan-200 dark:bg-cyan-500/10 dark:text-cyan-300 dark:ring-cyan-500/30",
  };
  return <span className={cx("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium", tones[tone], className)}>{children}</span>;
}

const RING = { high: "#16a34a", mid: "#f59e0b", low: "#e11d48" };

export function MatchRing({ score, size = 56, label }: { score: number; size?: number; label?: string }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  const tone = scoreTone(score);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} data-testid="match-ring" data-score={score} title={label}>
      <svg viewBox="0 0 52 52" width={size} height={size} className="-rotate-90">
        <circle cx="26" cy="26" r={r} fill="none" strokeWidth="5" className="stroke-slate-200 dark:stroke-slate-700" />
        <circle cx="26" cy="26" r={r} fill="none" strokeWidth="5" stroke={RING[tone]} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} style={{ transition: "stroke-dashoffset .6s ease" }} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-slate-900 dark:text-white" style={{ fontSize: size < 48 ? 11 : 14 }}>
        {score}%
      </span>
    </div>
  );
}

export function EmptyState({ image, title, text, children }: { image: string; title: string; text: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center px-4 py-10 text-center" data-testid="empty-state">
      <Image src={image} alt="" width={280} height={192} className="h-auto w-56 sm:w-64" />
      <h2 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">{title}</h2>
      <p className="mt-1 max-w-md text-slate-600 dark:text-slate-400">{text}</p>
      {children && <div className="mt-5 flex flex-wrap justify-center gap-2">{children}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx("animate-pulse rounded-xl bg-slate-200/80 dark:bg-slate-800", className)} />;
}

export function PageSkeleton() {
  return (
    <div data-testid="loading" className="space-y-4" aria-busy="true">
      <Skeleton className="h-9 w-56" />
      <Skeleton className="h-5 w-80 max-w-full" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-36" />
        ))}
      </div>
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <span className={cx("inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent", className)} aria-hidden="true" />;
}

/** Accessible modal dialog (Escape / backdrop closes unless `busy`). */
export function Dialog({ open, onClose, title, children, footer, busy, testId = "dialog", wide }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; footer?: React.ReactNode; busy?: boolean; testId?: string; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) closeRef.current();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      prev?.focus?.();
    };
  }, [open, busy]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} data-testid={testId} className={cx("animate-pop-in max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl outline-none sm:rounded-2xl dark:bg-slate-900 dark:ring-1 dark:ring-slate-700", wide ? "sm:max-w-2xl" : "sm:max-w-md")}>
        <div className="mb-3 flex items-start justify-between gap-3">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h2>
          <button type="button" onClick={onClose} disabled={busy} aria-label="Close" className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-800">
            <IconX size={18} />
          </button>
        </div>
        <div className="text-slate-700 dark:text-slate-300">{children}</div>
        {footer && <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, title, text, confirmLabel, cancelLabel, onConfirm, onCancel, danger, testId = "confirm-dialog" }: { open: boolean; title: string; text: React.ReactNode; confirmLabel: string; cancelLabel: string; onConfirm: () => void; onCancel: () => void; danger?: boolean; testId?: string }) {
  return (
    <Dialog open={open} onClose={onCancel} title={title} testId={testId} footer={<><Button variant="secondary" onClick={onCancel}>{cancelLabel}</Button><Button variant={danger ? "danger" : "primary"} onClick={onConfirm} data-testid="confirm-yes">{confirmLabel}</Button></>}>
      <div className="flex gap-3">
        <span className={cx("mt-0.5 shrink-0", danger ? "text-rose-600" : "text-indigo-600")}>
          <IconAlert size={22} />
        </span>
        <div>{text}</div>
      </div>
    </Dialog>
  );
}

/* --------------------------------- toasts -------------------------------- */

interface Toast {
  id: number;
  text: string;
  tone: "success" | "error" | "info";
}
let toasts: Toast[] = [];
const toastListeners = new Set<() => void>();
const emitToasts = () => toastListeners.forEach((l) => l());
let toastSeq = 0;

export function toast(text: string, tone: Toast["tone"] = "success") {
  const id = ++toastSeq;
  toasts = [...toasts.slice(-3), { id, text, tone }];
  emitToasts();
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    emitToasts();
  }, 3800);
}

export function dismissToasts() {
  toasts = [];
  emitToasts();
}

const EMPTY: Toast[] = [];
export function Toaster() {
  const list = useSyncExternalStore(
    (l) => {
      toastListeners.add(l);
      return () => toastListeners.delete(l);
    },
    () => toasts,
    () => EMPTY,
  );
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4" aria-live="polite" data-testid="toaster">
      {list.map((t) => (
        <div key={t.id} data-testid="toast" className={cx("animate-slide-up pointer-events-auto flex max-w-md items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg", t.tone === "error" ? "bg-rose-600" : t.tone === "info" ? "bg-slate-800 dark:bg-slate-700" : "bg-emerald-600")}>
          {t.tone === "error" ? <IconAlert size={18} /> : <IconCheckCircle size={18} />}
          {t.text}
        </div>
      ))}
    </div>
  );
}

export function LinkButton({ href, variant = "primary", size = "md", className, children, ...rest }: { href: string; variant?: BtnVariant; size?: "sm" | "md" | "lg"; className?: string; children: React.ReactNode } & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href">) {
  return (
    <Link href={href} className={cx(btn(variant, size), className)} {...rest}>
      {children}
    </Link>
  );
}

export function Field({ label, error, hint, children, highlight, htmlFor, required, badge }: { label: string; error?: string; hint?: string; children: React.ReactNode; highlight?: boolean; htmlFor?: string; required?: boolean; badge?: React.ReactNode }) {
  return (
    <div className={cx("rounded-xl transition-colors", highlight && "autofilled bg-indigo-50/70 p-2 ring-2 ring-indigo-300 -m-2 dark:bg-indigo-500/10 dark:ring-indigo-500/50")} data-autofilled={highlight ? "true" : undefined}>
      <label htmlFor={htmlFor} className="mb-1 flex flex-wrap items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
        <span>
          {label}
          {required && <span className="text-rose-500"> *</span>}
        </span>
        {badge}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
      {error && (
        <p className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export const inputCls = (error?: boolean) =>
  cx(
    "w-full rounded-xl border bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500",
    error ? "border-rose-400 dark:border-rose-500" : "border-slate-300 dark:border-slate-700",
  );
