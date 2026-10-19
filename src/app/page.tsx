"use client";
// Home: hero illustration, CTAs, how-it-works steps and feature list.
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n";
import type { TKey } from "@/i18n/en";
import { JOBS } from "@/lib/data/jobs";
import { COMPANIES } from "@/lib/data/companies";
import { loadDemoData, useAppState, useHydrated } from "@/lib/store";
import { Button, Card, LinkButton, toast } from "@/components/ui";
import { CompanyLogo } from "@/components/CompanyLogo";
import { IconArrowRight, IconBell, IconBoard, IconChart, IconDownload, IconSend, IconSparkles, IconTarget, IconUser } from "@/components/HomeIcons";

const STEPS: Array<{ n: number; Icon: typeof IconUser }> = [
  { n: 1, Icon: IconUser },
  { n: 2, Icon: IconTarget },
  { n: 3, Icon: IconSparkles },
  { n: 4, Icon: IconSend },
];

const FEATURES: Array<{ key: TKey; Icon: typeof IconUser }> = [
  { key: "home.f.tracker", Icon: IconBoard },
  { key: "home.f.reminders", Icon: IconBell },
  { key: "home.f.dashboard", Icon: IconChart },
  { key: "home.f.export", Icon: IconDownload },
];

export default function Home() {
  const { t, formatNumber } = useI18n();
  const router = useRouter();
  const hydrated = useHydrated();
  const { profile } = useAppState();

  const tryDemo = () => {
    loadDemoData();
    toast(t("home.demoLoaded"));
    router.push("/tracker");
  };

  return (
    <div className="space-y-14">
      <section className="grid items-center gap-8 lg:grid-cols-2">
        <div className="animate-slide-up">
          <span className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-sm font-semibold text-indigo-700 ring-1 ring-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-300 dark:ring-indigo-500/30">
            <IconSparkles size={16} />
            {t("home.badge")}
          </span>
          <h1 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-5xl dark:text-white" data-testid="home-title">
            {t("home.title")}
          </h1>
          <p className="mt-3 text-lg font-semibold text-indigo-600 dark:text-indigo-400">{t("app.tagline")}</p>
          <p className="mt-3 max-w-xl text-slate-600 dark:text-slate-400">{t("home.subtitle")}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <LinkButton href={hydrated && profile ? "/jobs" : "/profile"} size="lg" data-testid="cta-start">
              {hydrated && profile ? t("home.ctaJobs") : t("home.ctaStart")}
              <IconArrowRight size={18} />
            </LinkButton>
            {!(hydrated && profile) && (
              <LinkButton href="/jobs" size="lg" variant="secondary">
                {t("home.ctaJobs")}
              </LinkButton>
            )}
            <Button size="lg" variant="ghost" onClick={tryDemo} data-testid="cta-demo">
              {t("home.ctaDemo")}
            </Button>
          </div>
          <dl className="mt-8 grid max-w-md grid-cols-3 gap-3">
            {[
              [JOBS.length, "home.stat.jobs"],
              [COMPANIES.length, "home.stat.companies"],
              [3, "home.stat.languages"],
            ].map(([n, k]) => (
              <div key={k} className="rounded-2xl bg-white p-3 text-center ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
                <dt className="text-2xl font-extrabold text-slate-900 dark:text-white">{formatNumber(n as number)}</dt>
                <dd className="text-xs text-slate-500 dark:text-slate-400">{t(k as TKey)}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="relative mx-auto w-full max-w-lg">
          <div className="absolute inset-6 -z-10 rounded-full bg-indigo-400/20 blur-3xl dark:bg-indigo-500/20" />
          <Image src="/images/hero.svg" alt="Illustration of a job seeker sending applications along a rising career path" width={560} height={440} priority className="animate-float h-auto w-full" />
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t("home.how")}</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(({ n, Icon }) => (
            <Card key={n} className="relative overflow-hidden">
              <span className="absolute -right-2 -top-4 text-7xl font-black text-indigo-50 dark:text-indigo-500/10">{n}</span>
              <span className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 text-white">
                <Icon size={22} />
              </span>
              <h3 className="relative mt-3 font-semibold text-slate-900 dark:text-white">{t(`home.step${n}.title` as TKey)}</h3>
              <p className="relative mt-1 text-sm text-slate-600 dark:text-slate-400">{t(`home.step${n}.text` as TKey)}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="grid gap-6 rounded-3xl bg-gradient-to-br from-indigo-600 to-blue-700 p-6 text-white sm:p-8 lg:grid-cols-2">
        <div>
          <h2 className="text-2xl font-bold">{t("home.featuresTitle")}</h2>
          <ul className="mt-4 space-y-3">
            {FEATURES.map(({ key, Icon }) => (
              <li key={key} className="flex items-start gap-3">
                <span className="rounded-lg bg-white/15 p-1.5">
                  <Icon size={18} />
                </span>
                <span className="pt-1">{t(key)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="grid grid-cols-4 gap-3 self-center sm:grid-cols-7 lg:grid-cols-4 xl:grid-cols-7">
          {COMPANIES.map((c) => (
            <div key={c.id} className="flex flex-col items-center gap-1" title={c.name}>
              <CompanyLogo companyId={c.id} size={48} />
              <span className="line-clamp-1 text-center text-[11px] text-indigo-100">{c.name}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
