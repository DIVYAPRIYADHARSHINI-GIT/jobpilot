"use client";
import { useI18n } from "@/i18n";
import { IconLogo } from "./Icons";

export function Footer() {
  const { t } = useI18n();
  return (
    <footer className="border-t border-slate-200 bg-white/60 dark:border-slate-800 dark:bg-slate-950/60">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between dark:text-slate-400">
        <div className="flex items-center gap-2">
          <IconLogo size={20} />
          <span className="font-semibold text-slate-700 dark:text-slate-200">JobPilot</span>
          <span>· {t("app.tagline")}</span>
        </div>
        <p data-testid="demo-notice">{t("app.demoNotice")}</p>
      </div>
    </footer>
  );
}
