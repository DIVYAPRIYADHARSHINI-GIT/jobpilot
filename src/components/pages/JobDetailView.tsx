"use client";
// Job detail: office illustration, description, match breakdown, matched /
// missing skills and the Apply / Save actions.
import Image from "next/image";
import Link from "next/link";
import { useI18n } from "@/i18n";
import { JOB_BY_ID, formatSalary } from "@/lib/data/jobs";
import { COMPANY_BY_ID } from "@/lib/data/companies";
import { appForJob, toggleSaved, useAppState, useHydrated } from "@/lib/store";
import { useMatch } from "@/lib/client";
import { CompanyLogo } from "@/components/CompanyLogo";
import { Card, Chip, LinkButton, MatchRing, PageSkeleton, cx } from "@/components/ui";
import { IconArrowLeft, IconBookmark, IconBriefcase, IconCheckCircle, IconClock, IconMapPin, IconRupee, IconSend, IconUsers } from "@/components/Icons";

export function JobDetailView({ id }: { id: string }) {
  const hydrated = useHydrated();
  if (!hydrated) return <PageSkeleton />;
  return <JobDetail id={id} />;
}

function JobDetail({ id }: { id: string }) {
  const { t, formatDate } = useI18n();
  const job = JOB_BY_ID[id];
  const company = COMPANY_BY_ID[job.companyId];
  const { profile, apps } = useAppState();
  const match = useMatch(profile, job);
  const app = appForJob(apps, job.id);
  const applied = !!app && app.stage !== "saved";

  return (
    <div className="space-y-5">
      <Link href="/jobs" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-indigo-700 dark:text-slate-400">
        <IconArrowLeft size={16} />
        {t("jobs.backToJobs")}
      </Link>
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white dark:border-slate-700/70 dark:bg-slate-900">
        <Image src={`/images/office/office-${job.officeImage}.svg`} alt={t("jobs.officeAlt", { company: company.name })} width={800} height={360} className="h-40 w-full object-cover sm:h-56" priority data-testid="office-image" />
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start">
          <CompanyLogo companyId={company.id} size={64} className="-mt-12 border-4 border-white dark:border-slate-900" />
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl dark:text-white" data-testid="job-detail-title">{job.title}</h1>
            <p className="text-slate-600 dark:text-slate-400">{company.name} · {company.industry}</p>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600 dark:text-slate-400">
              <span className="inline-flex items-center gap-1"><IconMapPin size={16} />{job.location} · {job.workMode}</span>
              <span className="inline-flex items-center gap-1"><IconRupee size={16} />{formatSalary(job)}</span>
              <span className="inline-flex items-center gap-1"><IconBriefcase size={16} />{job.type} · {job.expMax === 0 ? "0" : `${job.expMin}-${job.expMax}`} {t("jobs.experience").toLowerCase()}</span>
              <span className="inline-flex items-center gap-1"><IconClock size={16} />{t("common.daysAgo", { n: job.postedDaysAgo })}</span>
              <span className="inline-flex items-center gap-1"><IconUsers size={16} />{company.size}</span>
            </div>
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:items-end">
            {applied ? (
              <>
                <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400" data-testid="already-applied">
                  <IconCheckCircle size={18} />
                  {t("jobs.alreadyApplied", { date: formatDate(app!.submittedAt ?? app!.updatedAt) })}
                </span>
                <LinkButton href="/tracker" variant="secondary">{t("jobs.openTracker")}</LinkButton>
              </>
            ) : (
              <>
                <LinkButton href={`/jobs/${job.id}/apply`} size="lg" data-testid="apply-now">
                  <IconSend size={18} />
                  {t("jobs.applyNow")}
                </LinkButton>
                <button type="button" onClick={() => toggleSaved(job, match ?? undefined)} data-testid="detail-save" className={cx("inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold ring-1", app ? "bg-amber-50 text-amber-800 ring-amber-300 dark:bg-amber-500/10 dark:text-amber-300" : "text-slate-700 ring-slate-300 hover:bg-slate-50 dark:text-slate-200 dark:ring-slate-600")}>
                  <IconBookmark size={16} filled={!!app} />
                  {app ? t("jobs.saved") : t("jobs.save")}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <h2 className="font-semibold text-slate-900 dark:text-white">{t("jobs.about")}</h2>
            <p className="mt-2 leading-relaxed text-slate-700 dark:text-slate-300" data-testid="job-description">{job.description}</p>
            <h3 className="mt-5 font-semibold text-slate-900 dark:text-white">{t("jobs.responsibilities")}</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-700 dark:text-slate-300">
              {job.responsibilities.map((r) => <li key={r}>{r}</li>)}
            </ul>
            <h3 className="mt-5 font-semibold text-slate-900 dark:text-white">{t("jobs.requiredSkills")}</h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {job.skills.map((s) => <Chip key={s} tone={match ? (match.matched.includes(s) ? "green" : "red") : "indigo"}>{s}</Chip>)}
            </div>
            <h3 className="mt-4 font-semibold text-slate-900 dark:text-white">{t("jobs.niceToHave")}</h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {job.niceToHave.map((s) => <Chip key={s} tone={match?.matched.includes(s) ? "green" : "slate"}>{s}</Chip>)}
            </div>
          </Card>
          <Card>
            <h2 className="font-semibold text-slate-900 dark:text-white">{t("jobs.aboutCompany", { company: company.name })}</h2>
            <p className="mt-2 text-slate-700 dark:text-slate-300">{company.about}</p>
          </Card>
        </div>
        <Card className="h-fit" data-testid="match-panel">
          <h2 className="font-semibold text-slate-900 dark:text-white">{t("jobs.matchScore")}</h2>
          {match ? (
            <>
              <div className="mt-3 flex items-center gap-4">
                <MatchRing score={match.score} size={84} />
                <div className="flex-1 space-y-2 text-sm">
                  {(["skills", "experience", "preferences"] as const).map((k) => (
                    <div key={k}>
                      <div className="flex justify-between text-slate-600 dark:text-slate-400"><span>{t(`jobs.breakdown.${k}`)}</span><span>{match.breakdown[k]}%</span></div>
                      <div className="mt-0.5 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800"><div className="h-full rounded-full bg-indigo-600" style={{ width: `${match.breakdown[k]}%` }} /></div>
                    </div>
                  ))}
                </div>
              </div>
              <h3 className="mt-5 text-sm font-semibold text-emerald-700 dark:text-emerald-400">{t("jobs.matched")} ({match.matched.length})</h3>
              <div className="mt-2 flex flex-wrap gap-1.5" data-testid="matched-skills">
                {match.matched.map((s) => <Chip key={s} tone="green">✓ {s}</Chip>)}
              </div>
              <h3 className="mt-4 text-sm font-semibold text-rose-700 dark:text-rose-400">{t("jobs.missing")} ({match.missing.length})</h3>
              <div className="mt-2 flex flex-wrap gap-1.5" data-testid="missing-skills">
                {match.missing.length ? match.missing.map((s) => <Chip key={s} tone="red">✕ {s}</Chip>) : <span className="text-sm text-slate-500">{t("jobs.noMissing")}</span>}
              </div>
            </>
          ) : (
            <div className="mt-3 text-sm text-slate-600 dark:text-slate-400">
              <p>{t("jobs.profileCta")}</p>
              <LinkButton href="/profile" className="mt-3" size="sm">{t("home.ctaStart")}</LinkButton>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
