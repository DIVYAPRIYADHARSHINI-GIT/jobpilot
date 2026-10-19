"use client";
import { useState } from "react";
import { useI18n, LANGS, type Lang } from "@/i18n";
import type { TKey } from "@/i18n/en";
import { loadDemoData, resetAll, updateSettings, useAppState, useHydrated } from "@/lib/store";
import { useTheme } from "@/components/ThemeProvider";
import { Button, Card, ConfirmDialog, PageHeader, PageSkeleton, toast, cx } from "@/components/ui";

export default function SettingsPage() {
  const hydrated = useHydrated();
  if (!hydrated) return <PageSkeleton />;
  return <Settings />;
}

function Settings() {
  const { t, lang, setLang } = useI18n();
  const { dark, setDark } = useTheme();
  const { settings } = useAppState();
  const [confirm, setConfirm] = useState<"demo" | "reset" | null>(null);
  const pill = (on: boolean) => cx("rounded-xl px-3 py-2 text-sm font-semibold ring-1", on ? "bg-indigo-600 text-white ring-indigo-600" : "bg-white text-slate-700 ring-slate-300 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700");

  return (
    <div className="max-w-3xl space-y-5">
      <PageHeader title={t("settings.title")} />
      <Card className="space-y-4">
        <h2 className="font-semibold text-slate-900 dark:text-white">{t("settings.appearance")}</h2>
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-32 text-sm">{t("settings.dark")}</span>
          <button type="button" className={pill(!dark)} onClick={() => setDark(false)} data-testid="set-light">☀</button>
          <button type="button" className={pill(dark)} onClick={() => setDark(true)} data-testid="set-dark">☾</button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-32 text-sm">{t("settings.language")}</span>
          {LANGS.map((l: Lang) => (
            <button key={l} type="button" className={pill(lang === l)} onClick={() => setLang(l)} data-testid={`set-lang-${l}`}>{t(`lang.${l}` as TKey)}</button>
          ))}
        </div>
      </Card>
      <Card className="space-y-3">
        <h2 className="font-semibold text-slate-900 dark:text-white">{t("settings.simulation")}</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">{t("settings.simHint")}</p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-32 text-sm">{t("settings.simSpeed")}</span>
          {(["fast", "realistic"] as const).map((s) => (
            <button key={s} type="button" className={pill(settings.simSpeed === s)} onClick={() => updateSettings({ simSpeed: s })} data-testid={`sim-${s}`}>{t(`settings.sim.${s}`)}</button>
          ))}
        </div>
      </Card>
      <Card className="space-y-3">
        <h2 className="font-semibold text-slate-900 dark:text-white">{t("settings.data")}</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">{t("settings.dataHint")}</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setConfirm("demo")} data-testid="load-demo">{t("settings.loadDemo")}</Button>
          <Button variant="danger" onClick={() => setConfirm("reset")} data-testid="reset-all">{t("settings.reset")}</Button>
        </div>
      </Card>
      <Card>
        <h2 className="font-semibold text-slate-900 dark:text-white">{t("settings.about")}</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{t("settings.aboutText")}</p>
      </Card>
      <ConfirmDialog
        open={confirm !== null}
        danger={confirm === "reset"}
        title={confirm === "reset" ? t("settings.reset") : t("settings.loadDemo")}
        text={confirm === "reset" ? t("settings.resetConfirm") : t("settings.loadDemoConfirm")}
        confirmLabel={t("common.confirm")}
        cancelLabel={t("common.cancel")}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          if (confirm === "reset") {
            resetAll();
            toast(t("settings.resetDone"), "info");
          } else {
            loadDemoData();
            toast(t("home.demoLoaded"));
          }
          setConfirm(null);
        }}
      />
    </div>
  );
}
