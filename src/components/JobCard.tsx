"use client";
import Link from "next/link";
import { memo } from "react";
import { useI18n } from "@/i18n";
import type { Application, Job, MatchResult } from "@/lib/types";
import { formatSalary } from "@/lib/data/jobs";
import { CompanyLogo } from "./CompanyLogo";
import { Chip, MatchRing, cx } from "./ui";
import { IconBookmark, IconBriefcase, IconCheckCircle, IconClock, IconMapPin, IconRupee } from "./Icons";

export const JobCard = memo(function JobCard({ job, match, app, onToggleSave }: { job: Job; match?: MatchResult; app?: Application; onToggleSave: (job: Job) => void }) {
  const { t } = useI18n();
  const applied = !!app && app.stage !== "saved";
  const saved = !!app && app.stage === "saved";
  return (
    <article data-testid="job-card" data-job-id={job.id} className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md dark:border-slate-700/70 dark:bg-slate-900 dark:hover:border-indigo-500/50">
      <div className="flex items-start gap-3">
        <CompanyLogo companyId={job.companyId} />
        <div className="min-w-0 flex-1">
          <Link href={`/jobs/${job.id}`} className="line-clamp-2 font-semibold text-slate-900 hover:text-indigo-700 dark:text-white dark:hover:text-indigo-300" data-testid="job-title">
            {job.title}
          </Link>
          <p className="truncate text-sm text-slate-600 dark:text-slate-400">{job.companyName}</p>
        </div>
        {match && <MatchRing score={match.score} size={48} label={t("jobs.matchScore")} />}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
        <span className="inline-flex items-center gap-1"><IconMapPin size={14} />{job.location}</span>
        <span className="inline-flex items-center gap-1"><IconRupee size={14} />{formatSalary(job)}</span>
        <span className="inline-flex items-center gap-1"><IconBriefcase size={14} />{job.expMax === 0 ? job.type : t("common.years", { n: `${job.expMin}-${job.expMax}` })}</span>
        <span className="inline-flex items-center gap-1"><IconClock size={14} />{t("common.daysAgo", { n: job.postedDaysAgo })}</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {job.skills.map((s) => {
          const has = match ? match.matched.includes(s) : false;
          return (
            <Chip key={s} tone={!match ? "slate" : has ? "green" : "red"}>
              {match && (has ? "✓" : "✕")} {s}
            </Chip>
          );
        })}
      </div>
      {match && match.missing.length > 0 && (
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          {t("jobs.missing")}: <span className="font-medium text-rose-600 dark:text-rose-400">{match.missing.join(", ")}</span>
        </p>
      )}
      <div className="mt-auto flex items-center gap-2 pt-4">
        <button type="button" onClick={() => onToggleSave(job)} disabled={applied} aria-pressed={saved} data-testid="save-job" className={cx("inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold ring-1 transition-colors disabled:opacity-60", saved ? "bg-amber-50 text-amber-800 ring-amber-300 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/40" : "text-slate-700 ring-slate-300 hover:bg-slate-50 dark:text-slate-200 dark:ring-slate-600 dark:hover:bg-slate-800")}>
          <IconBookmark size={16} filled={saved} />
          {saved ? t("jobs.saved") : t("jobs.save")}
        </button>
        {applied ? (
          <span className="ml-auto inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400" data-testid="applied-badge">
            <IconCheckCircle size={18} />
            {t("jobs.applied")}
          </span>
        ) : (
          <Link href={`/jobs/${job.id}/apply`} data-testid="apply-link" className="ml-auto inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
            {t("jobs.apply")}
          </Link>
        )}
      </div>
    </article>
  );
});
