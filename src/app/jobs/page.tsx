"use client";
// JobHub job board: search, filters, sort by match / recency / salary.
import Link from "next/link";
import { useCallback, useDeferredValue, useMemo, useState } from "react";
import { useI18n } from "@/i18n";
import { CATEGORIES, CITIES, JOBS } from "@/lib/data/jobs";
import type { Job, WorkMode } from "@/lib/types";
import { toggleSaved, useAppState, useHydrated } from "@/lib/store";
import { useMatches } from "@/lib/client";
import { JobCard } from "@/components/JobCard";
import { Button, EmptyState, PageHeader, PageSkeleton, inputCls, cx } from "@/components/ui";
import { IconSearch, IconUser } from "@/components/Icons";

type Sort = "match" | "recent" | "salary";

export default function JobsPage() {
  const hydrated = useHydrated();
  if (!hydrated) return <PageSkeleton />;
  return <JobBoard />;
}

function JobBoard() {
  const { t } = useI18n();
  const { profile, apps } = useAppState();
  const matches = useMatches(profile);
  const [q, setQ] = useState("");
  const query = useDeferredValue(q);
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");
  const [mode, setMode] = useState<"" | WorkMode>("");
  const [minMatch, setMinMatch] = useState(0);
  const [sort, setSort] = useState<Sort>(profile ? "match" : "recent");

  const appByJob = useMemo(() => new Map(apps.map((a) => [a.jobId, a])), [apps]);
  const onToggleSave = useCallback((job: Job) => toggleSaved(job, matches?.[job.id]), [matches]);

  const list = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const out = JOBS.filter((j) => {
      if (category && j.category !== category) return false;
      if (city && j.city !== city) return false;
      if (mode && j.workMode !== mode) return false;
      if (matches && minMatch && (matches[j.id]?.score ?? 0) < minMatch) return false;
      if (needle && !`${j.title} ${j.companyName} ${j.skills.join(" ")} ${j.niceToHave.join(" ")} ${j.location}`.toLowerCase().includes(needle)) return false;
      return true;
    });
    const s = matches ? sort : sort === "match" ? "recent" : sort;
    return out.sort((a, b) => (s === "match" ? (matches![b.id]?.score ?? 0) - (matches![a.id]?.score ?? 0) : s === "salary" ? b.salaryMax - a.salaryMax : a.postedDaysAgo - b.postedDaysAgo));
  }, [query, category, city, mode, minMatch, sort, matches]);

  const clear = () => {
    setQ("");
    setCategory("");
    setCity("");
    setMode("");
    setMinMatch(0);
  };
  const sel = cx(inputCls(), "py-2");

  return (
    <div>
      <PageHeader title={t("jobs.title")} subtitle={t("jobs.subtitle", { n: JOBS.length })} />
      {!profile && (
        <Link href="/profile" className="mb-4 flex items-center gap-3 rounded-2xl bg-indigo-50 p-3 text-sm font-medium text-indigo-800 ring-1 ring-indigo-200 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-200 dark:ring-indigo-500/30" data-testid="profile-cta">
          <IconUser size={18} />
          {t("jobs.profileCta")} →
        </Link>
      )}
      <div className="mb-4 grid gap-2 rounded-2xl border border-slate-200 bg-white p-3 sm:grid-cols-2 lg:grid-cols-6 dark:border-slate-700/70 dark:bg-slate-900">
        <label className="relative sm:col-span-2">
          <span className="sr-only">{t("common.search")}</span>
          <IconSearch size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("jobs.searchPlaceholder")} className={cx(inputCls(), "pl-10")} data-testid="job-search" type="search" />
        </label>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className={sel} aria-label={t("jobs.category")} data-testid="filter-category">
          <option value="">{t("jobs.category")}: {t("common.all")}</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={city} onChange={(e) => setCity(e.target.value)} className={sel} aria-label={t("jobs.city")} data-testid="filter-city">
          <option value="">{t("jobs.city")}: {t("common.all")}</option>
          {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={mode} onChange={(e) => setMode(e.target.value as "" | WorkMode)} className={sel} aria-label={t("jobs.mode")} data-testid="filter-mode">
          <option value="">{t("jobs.mode")}: {t("common.all")}</option>
          {(["Onsite", "Hybrid", "Remote"] as const).map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className={sel} aria-label={t("jobs.sort")} data-testid="sort">
          {profile && <option value="match">{t("jobs.sort.match")}</option>}
          <option value="recent">{t("jobs.sort.recent")}</option>
          <option value="salary">{t("jobs.sort.salary")}</option>
        </select>
        {profile && (
          <label className="flex items-center gap-3 text-sm text-slate-600 sm:col-span-2 lg:col-span-6 dark:text-slate-400">
            <span className="shrink-0">{t("jobs.minMatch")}: <b className="text-slate-900 dark:text-white">{minMatch}%</b></span>
            <input type="range" min={0} max={90} step={5} value={minMatch} onChange={(e) => setMinMatch(Number(e.target.value))} className="w-full max-w-xs accent-indigo-600" data-testid="min-match" />
          </label>
        )}
      </div>
      <p className="mb-3 text-sm text-slate-500" data-testid="job-count">{t("jobs.results", { n: list.length })}</p>
      {list.length === 0 ? (
        <EmptyState image="/images/empty-jobs.svg" title={t("jobs.empty.title")} text={t("jobs.empty.text")}>
          <Button onClick={clear} data-testid="clear-filters">{t("jobs.clearFilters")}</Button>
        </EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((j) => (
            <JobCard key={j.id} job={j} match={matches?.[j.id]} app={appByJob.get(j.id)} onToggleSave={onToggleSave} />
          ))}
        </div>
      )}
    </div>
  );
}
