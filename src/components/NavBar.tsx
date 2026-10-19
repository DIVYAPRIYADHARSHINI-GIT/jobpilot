"use client";
// Top navigation: brand + tagline, page links, notifications bell (status
// updates + reminders), language switcher, theme toggle and a mobile menu.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useI18n, LANGS, type Lang } from "@/i18n";
import type { TKey } from "@/i18n/en";
import { markRead, useAppState } from "@/lib/store";
import { computeReminders } from "@/lib/reminders";
import { useTheme } from "./ThemeProvider";
import { cx } from "./ui";
import { IconBell, IconBoard, IconBolt, IconBriefcase, IconCalendar, IconChart, IconGlobe, IconHome, IconLogo, IconMenu, IconMoon, IconSettings, IconSun, IconUser, IconX } from "./Icons";

const LINKS: Array<{ href: string; key: TKey; Icon: typeof IconHome }> = [
  { href: "/", key: "nav.home", Icon: IconHome },
  { href: "/jobs", key: "nav.jobs", Icon: IconBriefcase },
  { href: "/tracker", key: "nav.tracker", Icon: IconBoard },
  { href: "/dashboard", key: "nav.dashboard", Icon: IconChart },
  { href: "/auto-apply", key: "nav.autoApply", Icon: IconBolt },
  { href: "/profile", key: "nav.profile", Icon: IconUser },
];

/** Current time, refreshed every minute (for reminders). */
function useMinuteClock() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function useClickOutside(ref: React.RefObject<HTMLElement | null>, open: boolean, close: () => void) {
  const closeRef = useRef(close);
  closeRef.current = close;
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) closeRef.current();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeRef.current();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, ref]);
}

function Notifications() {
  const { t, formatDate } = useI18n();
  const { apps, notifications, read } = useAppState();
  const now = useMinuteClock();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, open, () => setOpen(false));
  const reminders = useMemo(() => computeReminders(apps, now), [apps, now]);
  const readSet = useMemo(() => new Set(read), [read]);
  const unread = reminders.filter((r) => !readSet.has(r.id)).length + notifications.filter((n) => !readSet.has(n.id)).length;
  const allIds = () => [...reminders.map((r) => r.id), ...notifications.map((n) => n.id)];
  const fmt = (d: string) => formatDate(d, d.length > 10 ? { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" } : { day: "numeric", month: "short" });

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-label={t("nav.notifications")} aria-expanded={open} data-testid="notif-bell" className="relative rounded-xl p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
        <IconBell />
        {unread > 0 && (
          <span data-testid="notif-count" className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[11px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div data-testid="notif-panel" className="animate-pop-in fixed inset-x-2 top-16 z-50 max-h-[70vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3 shadow-xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-96 dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900 dark:text-white">{t("notif.title")}</h3>
            {unread > 0 && (
              <button type="button" className="text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400" onClick={() => markRead(allIds())} data-testid="notif-mark-all">
                {t("notif.markAll")}
              </button>
            )}
          </div>
          {reminders.length === 0 && notifications.length === 0 && <p className="py-6 text-center text-sm text-slate-500">{t("notif.empty")}</p>}
          {reminders.length > 0 && (
            <>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{t("notif.reminders")}</p>
              <ul className="mt-1 space-y-1">
                {reminders.map((r) => (
                  <li key={r.id} data-testid="reminder-item">
                    <Link href="/tracker" onClick={() => { markRead([r.id]); setOpen(false); }} className={cx("flex gap-3 rounded-xl p-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800", !readSet.has(r.id) && "bg-amber-50/70 dark:bg-amber-500/10")}>
                      <span className={cx("mt-0.5 shrink-0", r.kind === "interview" ? "text-indigo-600" : "text-amber-600")}>
                        <IconCalendar size={18} />
                      </span>
                      <span>{r.kind === "interview" ? t("notif.interview", { company: r.company, title: r.title, date: fmt(r.date) }) : t("notif.followup", { company: r.company, title: r.title })}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
          {notifications.length > 0 && (
            <>
              <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{t("notif.updates")}</p>
              <ul className="mt-1 space-y-1">
                {notifications.slice(0, 20).map((n) => (
                  <li key={n.id}>
                    <Link href="/tracker" onClick={() => { markRead([n.id]); setOpen(false); }} className={cx("flex gap-3 rounded-xl p-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800", !readSet.has(n.id) && "bg-indigo-50/70 dark:bg-indigo-500/10")}>
                      <span className={cx("mt-1.5 h-2 w-2 shrink-0 rounded-full", n.status === "offer" ? "bg-emerald-500" : n.status === "rejected" ? "bg-rose-500" : n.status === "interview" ? "bg-violet-500" : "bg-sky-500")} />
                      <span>
                        {t(`notif.status.${n.status ?? "applied"}` as TKey, { company: n.company, title: n.title })}
                        <span className="block text-xs text-slate-500">{formatDate(n.at, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function LangSwitcher() {
  const { t, lang, setLang } = useI18n();
  return (
    <label className="relative flex items-center gap-1 rounded-xl px-2 py-1.5 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
      <IconGlobe size={18} />
      <span className="sr-only">{t("nav.language")}</span>
      <select value={lang} onChange={(e) => setLang(e.target.value as Lang)} data-testid="lang-select" aria-label={t("nav.language")} className="cursor-pointer bg-transparent text-sm font-medium outline-none dark:bg-slate-900">
        {LANGS.map((l) => (
          <option key={l} value={l}>
            {t(`lang.${l}` as TKey)}
          </option>
        ))}
      </select>
    </label>
  );
}

export function NavBar() {
  const { t } = useI18n();
  const { dark, toggle } = useTheme();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    // Close the mobile menu on navigation (state update during render, no effect loop).
    setLastPath(pathname);
    setMenuOpen(false);
  }
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur dark:border-slate-800 dark:bg-slate-950/85">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-3 sm:px-4">
        <Link href="/" className="flex min-w-0 items-center gap-2" data-testid="brand">
          <IconLogo />
          <span className="min-w-0 leading-tight">
            <span className="block text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">
              Job<span className="text-indigo-600 dark:text-indigo-400">Pilot</span>
            </span>
            <span className="block max-w-[11rem] truncate text-[11px] font-medium text-slate-500 sm:max-w-none dark:text-slate-400" data-testid="tagline" title={t("app.tagline")}>
              {t("app.tagline")}
            </span>
          </span>
        </Link>
        <nav className="ml-3 hidden flex-1 items-center gap-0.5 xl:flex" aria-label="Main">
          {LINKS.map(({ href, key, Icon }) => (
            <Link key={href} href={href} data-testid={`nav-${href.slice(1) || "home"}`} className={cx("flex items-center gap-1.5 whitespace-nowrap rounded-xl px-2.5 py-2 text-sm font-medium transition-colors", isActive(href) ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800")}>
              <Icon size={17} />
              {t(key)}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-0.5">
          <div className="hidden sm:block">
            <LangSwitcher />
          </div>
          <Notifications />
          <button type="button" onClick={toggle} aria-label={t("nav.theme")} data-testid="theme-toggle" className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
            {dark ? <IconSun /> : <IconMoon />}
          </button>
          <Link href="/settings" aria-label={t("nav.settings")} className="hidden rounded-xl p-2 text-slate-600 hover:bg-slate-100 sm:block dark:text-slate-300 dark:hover:bg-slate-800">
            <IconSettings />
          </Link>
          <button type="button" onClick={() => setMenuOpen((o) => !o)} aria-label={t("nav.menu")} aria-expanded={menuOpen} data-testid="menu-toggle" className="rounded-xl p-2 text-slate-700 hover:bg-slate-100 xl:hidden dark:text-slate-200 dark:hover:bg-slate-800">
            {menuOpen ? <IconX /> : <IconMenu />}
          </button>
        </div>
      </div>
      {menuOpen && (
        <nav className="animate-slide-up border-t border-slate-200 bg-white px-3 pb-4 pt-2 xl:hidden dark:border-slate-800 dark:bg-slate-950" aria-label="Mobile" data-testid="mobile-menu">
          <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
            {[...LINKS, { href: "/settings", key: "nav.settings" as TKey, Icon: IconSettings }].map(({ href, key, Icon }) => (
              <Link key={href} href={href} className={cx("flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium", isActive(href) ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300" : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800")}>
                <Icon size={18} />
                {t(key)}
              </Link>
            ))}
          </div>
          <div className="mt-2 sm:hidden">
            <LangSwitcher />
          </div>
        </nav>
      )}
    </header>
  );
}
