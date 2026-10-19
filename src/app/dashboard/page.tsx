"use client";
// Dashboard: KPIs, applications per week, pipeline donut, top missing skills
// and upcoming reminders. All derived with useMemo from the stored apps.
import Link from "next/link";
import { useMemo } from "react";
import { useI18n } from "@/i18n";
import type { Stage } from "@/lib/types";
import { STAGES } from "@/lib/types";
import { loadDemoData, useAppState, useHydrated } from "@/lib/store";
import { computeStats } from "@/lib/stats";
import { computeReminders } from "@/lib/reminders";
import { WeeklyChart, PipelineChart } from "@/components/Charts";
import { Button, Card, EmptyState, LinkButton, PageHeader, PageSkeleton, toast } from "@/components/ui";
import { IconCalendar, IconEye, IconSend, IconTrophy, IconUsers } from "@/components/Icons";

const STAGE_COLORS: Record<Stage, string> = { saved: "#94a3b8", applied: "#3b82f6", interview: "#8b5cf6", offer: "#10b981", rejected: "#f43f5e" };

export default function DashboardPage() {
  const hydrated = useHydrated();
  if (!hydrated) return <PageSkeleton />;
  return <Dashboard />;
}

function Dashboard() {
  const { t, formatDate, formatNumber } = useI18n();
  const { apps } = useAppState();
  const stats = useMemo(() => computeStats(apps), [apps]);
  const reminders = useMemo(() => computeReminders(apps), [apps]);
  const weekly = useMemo(() => stats.perWeek.map((w) => ({ name: formatDate(w.week, { day: "numeric", month: "short" }), count: w.count })), [stats, formatDate]);
  const pipeline = useMemo(() => STAGES.map((s) => ({ name: t(`stage.${s}`), value: stats.byStage[s], color: STAGE_COLORS[s] })), [stats, t]);

  if (!apps.length) {
    return (
      <div>
        <PageHeader title={t("dash.title")} subtitle={t("dash.subtitle")} />
        <EmptyState image="/images/empty-applications.svg" title={t("dash.empty.title")} text={t("dash.empty.text")}>
          <LinkButton href="/jobs">{t("home.ctaJobs")}</LinkButton>
          <Button variant="secondary" onClick={() => { loadDemoData(); toast(t("home.demoLoaded")); }} data-testid="dash-demo">{t("settings.loadDemo")}</Button>
        </EmptyState>
      </div>
    );
  }

  const kpis = [
    { label: t("dash.total"), value: formatNumber(stats.total), Icon: IconSend, tone: "bg-indigo-600" },
    { label: t("dash.responseRate"), value: `${formatNumber(stats.responseRate)}%`, Icon: IconEye, tone: "bg-sky-500" },
    { label: t("dash.interviews"), value: formatNumber(stats.interviews), Icon: IconUsers, tone: "bg-violet-500" },
    { label: t("dash.offers"), value: formatNumber(stats.offers), Icon: IconTrophy, tone: "bg-emerald-500" },
  ];
  const maxMissing = stats.missingSkills[0]?.count ?? 1;

  return (
    <div className="space-y-5">
      <PageHeader title={t("dash.title")} subtitle={t("dash.subtitle")} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map(({ label, value, Icon, tone }) => (
          <Card key={label} className="flex items-center gap-3" data-testid="kpi">
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white ${tone}`}><Icon size={20} /></span>
            <div className="min-w-0">
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white" data-testid="kpi-value">{value}</p>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">{label}</p>
            </div>
          </Card>
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="mb-3 font-semibold text-slate-900 dark:text-white">{t("dash.perWeek")}</h2>
          <WeeklyChart data={weekly} label={t("dash.applications")} />
        </Card>
        <Card>
          <h2 className="mb-1 font-semibold text-slate-900 dark:text-white">{t("dash.pipeline")}</h2>
          <PipelineChart data={pipeline} />
          <ul className="mt-2 grid grid-cols-2 gap-1 text-xs">
            {STAGES.map((s) => (
              <li key={s} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: STAGE_COLORS[s] }} />{t(`stage.${s}`)} <b className="ml-auto pr-2">{stats.byStage[s]}</b></li>
            ))}
          </ul>
        </Card>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <h2 className="font-semibold text-slate-900 dark:text-white">{t("dash.missingSkills")}</h2>
          <p className="text-xs text-slate-500">{t("dash.missingHint")}</p>
          <ul className="mt-3 space-y-2" data-testid="missing-skills-list">
            {stats.missingSkills.length === 0 && <li className="text-sm text-slate-500">{t("dash.noMissing")}</li>}
            {stats.missingSkills.map((m) => (
              <li key={m.skill} className="text-sm">
                <div className="flex justify-between"><span className="font-medium">{m.skill}</span><span className="text-slate-500">{m.count}</span></div>
                <div className="mt-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-gradient-to-r from-rose-400 to-rose-500" style={{ width: `${(m.count / maxMissing) * 100}%` }} /></div>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <h2 className="font-semibold text-slate-900 dark:text-white">{t("dash.upcoming")}</h2>
          <ul className="mt-3 space-y-2" data-testid="upcoming-list">
            {reminders.length === 0 && <li className="text-sm text-slate-500">{t("dash.noUpcoming")}</li>}
            {reminders.map((r) => (
              <li key={r.id}>
                <Link href="/tracker" className="flex items-center gap-3 rounded-xl p-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800">
                  <span className={r.kind === "interview" ? "text-violet-600" : "text-amber-600"}><IconCalendar size={18} /></span>
                  <span className="flex-1">{r.kind === "interview" ? t("notif.interview", { company: r.company, title: r.title, date: formatDate(r.date, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) }) : t("notif.followup", { company: r.company, title: r.title })}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
