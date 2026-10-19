"use client";
// Auto-apply: pick a minimum match score + daily limit, review the queue in a
// confirmation summary, then JobPilot auto-fills and submits each application
// to JobHub one by one (sequential, with progress), skipping any job whose
// required fields the profile can't fill.
import Link from "next/link";
import { useMemo, useState } from "react";
import { useI18n } from "@/i18n";
import { JOBS, formatSalary } from "@/lib/data/jobs";
import { getForm } from "@/lib/forms";
import { autofill } from "@/lib/autofill";
import { autoAppliedToday, recordSubmission, updateSettings, useAppState, useHydrated } from "@/lib/store";
import { submitApplication, useMatches } from "@/lib/client";
import { CompanyLogo } from "@/components/CompanyLogo";
import { SuccessBurst } from "@/components/SuccessBurst";
import { Button, Card, Dialog, EmptyState, LinkButton, MatchRing, PageHeader, PageSkeleton, Spinner, cx } from "@/components/ui";
import { IconBolt, IconSend } from "@/components/Icons";

export default function AutoApplyPage() {
  const hydrated = useHydrated();
  if (!hydrated) return <PageSkeleton />;
  return <AutoApply />;
}

interface RunResult {
  done: number;
  failed: number;
  skipped: number;
}

function AutoApply() {
  const { t } = useI18n();
  const { profile, apps, settings } = useAppState();
  const matches = useMatches(profile);
  const { enabled, minScore, dailyLimit } = settings.autoApply;
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [progress, setProgress] = useState<{ done: number; n: number } | null>(null);
  const [result, setResult] = useState<RunResult | null>(null);

  const used = autoAppliedToday(apps);
  const remaining = Math.max(0, dailyLimit - used);
  const appliedIds = useMemo(() => new Set(apps.filter((a) => a.stage !== "saved").map((a) => a.jobId)), [apps]);
  const eligible = useMemo(() => {
    if (!matches) return [];
    return JOBS.filter((j) => !appliedIds.has(j.id) && (matches[j.id]?.score ?? 0) >= minScore).sort((a, b) => matches[b.id].score - matches[a.id].score);
  }, [matches, appliedIds, minScore]);
  const queue = eligible.slice(0, remaining);

  if (!profile || !matches) {
    return (
      <div>
        <PageHeader title={t("auto.title")} subtitle={t("auto.subtitle")} />
        <EmptyState image="/images/empty-jobs.svg" title={t("profile.needed")} text="">
          <LinkButton href="/profile">{t("home.ctaStart")}</LinkButton>
        </EmptyState>
      </div>
    );
  }

  async function run() {
    const list = queue;
    const res: RunResult = { done: 0, failed: 0, skipped: 0 };
    setProgress({ done: 0, n: list.length });
    for (let i = 0; i < list.length; i++) {
      const job = list[i];
      const form = getForm(job);
      const fill = autofill(form, job, profile!);
      if (fill.missing.length) {
        res.skipped++;
      } else {
        try {
          const r = await submitApplication(job.id, fill.answers);
          recordSubmission(job, matches![job.id], fill.answers, r.receiptId, r.submittedAt, "auto");
          res.done++;
        } catch {
          res.failed++;
        }
      }
      setProgress({ done: i + 1, n: list.length });
    }
    setProgress(null);
    setSummaryOpen(false);
    setResult(res);
  }

  const running = progress !== null;

  return (
    <div className="space-y-5">
      <PageHeader title={t("auto.title")} subtitle={t("auto.subtitle")} />
      <Card className="grid gap-5 lg:grid-cols-3">
        <label className="flex items-center gap-3 lg:col-span-3">
          <button type="button" role="switch" aria-checked={enabled} onClick={() => updateSettings({ autoApply: { ...settings.autoApply, enabled: !enabled } })} data-testid="auto-toggle" className={cx("relative h-7 w-12 shrink-0 rounded-full transition-colors", enabled ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-700")}>
            <span className={cx("absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all", enabled ? "left-6" : "left-1")} />
          </button>
          <span className="font-semibold text-slate-900 dark:text-white">{t("auto.enable")}</span>
          <IconBolt size={18} className={enabled ? "text-amber-500" : "text-slate-400"} />
        </label>
        <label className="text-sm font-medium">
          {t("auto.minScore")}: <b className="text-indigo-700 dark:text-indigo-300" data-testid="auto-min-value">{minScore}%</b>
          <input type="range" min={40} max={95} step={5} value={minScore} onChange={(e) => updateSettings({ autoApply: { ...settings.autoApply, minScore: Number(e.target.value) } })} className="mt-2 w-full accent-indigo-600" data-testid="auto-min" />
        </label>
        <label className="text-sm font-medium">
          {t("auto.dailyLimit")}
          <select value={dailyLimit} onChange={(e) => updateSettings({ autoApply: { ...settings.autoApply, dailyLimit: Number(e.target.value) } })} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950" data-testid="auto-limit">
            {[1, 3, 5, 10, 15, 20].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <div className="text-sm">
          <p className="font-medium">{t("auto.usedToday", { used, limit: dailyLimit })}</p>
          <div className="mt-2 h-2 rounded-full bg-slate-200 dark:bg-slate-800"><div className="h-full rounded-full bg-amber-500" style={{ width: `${Math.min(100, (used / dailyLimit) * 100)}%` }} /></div>
        </div>
      </Card>

      {result && (
        <Card className="text-center" data-testid="auto-result">
          <SuccessBurst />
          <p className="mt-3 text-lg font-bold text-slate-900 dark:text-white">{t("auto.done", { n: result.done })}</p>
          <p className="text-sm text-slate-500">
            {result.failed > 0 && `${t("auto.failed", { n: result.failed })} · `}
            {result.skipped > 0 && t("auto.skipped", { n: result.skipped })}
          </p>
          <LinkButton href="/tracker" className="mt-4">{t("apply.success.tracker")}</LinkButton>
        </Card>
      )}

      <Card>
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-slate-900 dark:text-white">{t("auto.eligible")}</h2>
            <p className="text-sm text-slate-500" data-testid="auto-eligible">{t("auto.eligibleCount", { n: eligible.length, score: minScore })} · {t("auto.queue", { n: queue.length })}</p>
          </div>
          <Button onClick={() => setSummaryOpen(true)} disabled={!enabled || queue.length === 0} data-testid="auto-review">
            <IconSend size={18} />
            {t("auto.review")}
          </Button>
        </div>
        {!enabled && <p className="mb-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">{t("auto.disabled")}</p>}
        {enabled && remaining === 0 && <p className="mb-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300" data-testid="auto-limit-reached">{t("auto.limitReached")}</p>}
        {eligible.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500" data-testid="auto-none">{t("auto.none", { score: minScore })}</p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {eligible.map((j, i) => (
              <li key={j.id} className={cx("flex items-center gap-3 py-2", i >= remaining && "opacity-50")} data-testid="auto-item">
                <CompanyLogo companyId={j.companyId} size={36} />
                <Link href={`/jobs/${j.id}`} className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-slate-900 hover:text-indigo-700 dark:text-white">{j.title}</span>
                  <span className="block truncate text-xs text-slate-500">{j.companyName} · {j.location} · {formatSalary(j)}</span>
                </Link>
                <MatchRing score={matches[j.id].score} size={40} />
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Dialog
        open={summaryOpen}
        onClose={() => setSummaryOpen(false)}
        busy={running}
        title={t("auto.summary.title")}
        testId="auto-summary"
        wide
        footer={
          <>
            <Button variant="secondary" onClick={() => setSummaryOpen(false)} disabled={running}>{t("common.cancel")}</Button>
            <Button onClick={run} disabled={running} data-testid="auto-confirm">
              {running ? <Spinner /> : <IconSend size={18} />}
              {running ? t("auto.progress", { done: progress!.done, n: progress!.n }) : t("auto.summary.send", { n: queue.length })}
            </Button>
          </>
        }
      >
        <p>{t("auto.summary.text", { n: queue.length })}</p>
        <ul className="mt-3 max-h-72 space-y-2 overflow-y-auto">
          {queue.map((j) => (
            <li key={j.id} className="flex items-center gap-3 rounded-xl bg-slate-50 p-2 text-sm dark:bg-slate-800/60">
              <CompanyLogo companyId={j.companyId} size={32} />
              <span className="min-w-0 flex-1"><b className="block truncate">{j.title}</b><span className="text-xs text-slate-500">{j.companyName}</span></span>
              <span className="font-semibold text-emerald-600">{matches[j.id].score}%</span>
            </li>
          ))}
        </ul>
        {running && (
          <div className="mt-3 h-2 rounded-full bg-slate-200 dark:bg-slate-800" data-testid="auto-progress">
            <div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${(progress!.done / Math.max(1, progress!.n)) * 100}%` }} />
          </div>
        )}
      </Dialog>
    </div>
  );
}
