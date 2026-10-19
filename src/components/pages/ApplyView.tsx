"use client";
// JobHub application form for one job. The form layout + custom questions come
// from the company (getForm). "Auto-fill" calls /api/autofill and highlights
// every filled field; the user reviews/edits, then a confirmation dialog
// appears before /api/portal/submit is called. Success shows an animation.
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useI18n } from "@/i18n";
import type { TKey } from "@/i18n/en";
import type { FormField, Profile } from "@/lib/types";
import { JOB_BY_ID } from "@/lib/data/jobs";
import { getForm, formFields, validateAnswers } from "@/lib/forms";
import { autofill, coverLetter } from "@/lib/autofill";
import { appForJob, recordSubmission, useAppState, useHydrated } from "@/lib/store";
import { ApiError, fetchAutofill, submitApplication, useMatch } from "@/lib/client";
import { CompanyLogo } from "@/components/CompanyLogo";
import { SuccessBurst } from "@/components/SuccessBurst";
import { Button, Card, Chip, Dialog, Field, LinkButton, MatchRing, PageSkeleton, Spinner, dismissToasts, inputCls, toast, cx } from "@/components/ui";
import { IconArrowLeft, IconCheckCircle, IconFile, IconRefresh, IconSend, IconSparkles, IconUser } from "@/components/Icons";

export function ApplyView({ id }: { id: string }) {
  const hydrated = useHydrated();
  if (!hydrated) return <PageSkeleton />;
  return <ApplyForm id={id} />;
}

const words = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0);

function ApplyForm({ id }: { id: string }) {
  const { t } = useI18n();
  const job = JOB_BY_ID[id];
  const form = useMemo(() => getForm(job), [job]);
  const fields = useMemo(() => formFields(form), [form]);
  const { profile, apps } = useAppState();
  const match = useMatch(profile, job);
  const existing = appForJob(apps, job.id);
  const alreadyApplied = !!existing && existing.stage !== "saved";

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [filled, setFilled] = useState<Set<string>>(new Set());
  const [fillMsg, setFillMsg] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [filling, setFilling] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const setAnswer = (fid: string, v: string) => {
    setAnswers((a) => ({ ...a, [fid]: v }));
    if (errors[fid]) setErrors((e) => ({ ...e, [fid]: "" }));
  };

  async function doAutofill(p: Profile) {
    setFilling(true);
    try {
      let r: { answers: Record<string, string>; filled: string[]; missing: string[] };
      try {
        r = await fetchAutofill(p, job.id);
      } catch {
        r = autofill(form, job, p); // offline fallback: same pure logic
      }
      setAnswers(r.answers);
      setFilled(new Set(r.filled));
      setErrors({});
      setFillMsg(`${t("apply.autofilled", { n: r.filled.length })}${r.missing.length ? ` ${t("apply.missingAfterFill", { n: r.missing.length })}` : ""}`);
    } finally {
      setFilling(false);
    }
  }

  function review() {
    const errs = validateAnswers(form, answers);
    const msgs: Record<string, string> = {};
    for (const [k, code] of Object.entries(errs)) msgs[k] = t(`apply.err.${code}` as TKey);
    setErrors(msgs);
    const n = Object.keys(msgs).length;
    if (n) {
      toast(t("apply.fixErrors", { n }), "error");
      document.getElementById(`f-${Object.keys(msgs)[0]}`)?.focus();
      return;
    }
    setConfirmOpen(true);
  }

  async function submit() {
    setSubmitting(true);
    try {
      const r = await submitApplication(job.id, answers);
      recordSubmission(job, match ?? undefined, answers, r.receiptId, r.submittedAt, "manual");
      setConfirmOpen(false);
      dismissToasts();
      setReceipt(r.receiptId);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      if (e instanceof ApiError && e.data.errors) {
        const msgs: Record<string, string> = {};
        for (const [k, code] of Object.entries(e.data.errors as Record<string, string>)) msgs[k] = t(`apply.err.${code}` as TKey);
        setErrors(msgs);
        setConfirmOpen(false);
      }
      toast(t("common.error"), "error");
    } finally {
      setSubmitting(false);
    }
  }

  if (receipt) {
    return (
      <Card className="mx-auto max-w-xl py-10 text-center" data-testid="apply-success">
        <SuccessBurst />
        <h1 className="mt-4 text-2xl font-bold text-slate-900 dark:text-white">{t("apply.success.title")}</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">{t("apply.success.text", { company: job.companyName, receipt })}</p>
        <p className="mt-1 text-sm text-slate-500">{t("apply.success.next")}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <LinkButton href="/tracker" data-testid="go-tracker">{t("apply.success.tracker")}</LinkButton>
          <LinkButton href="/jobs" variant="secondary">{t("apply.success.more")}</LinkButton>
        </div>
      </Card>
    );
  }

  const renderField = (f: FormField) => {
    const v = answers[f.id] ?? "";
    const err = errors[f.id];
    const common = { id: `f-${f.id}`, name: f.id, "data-testid": `field-${f.id}`, "aria-invalid": !!err, className: inputCls(!!err) };
    let control: React.ReactNode;
    if (f.type === "textarea") {
      control = (
        <>
          <textarea {...common} rows={f.id === "coverLetter" ? 12 : 4} value={v} maxLength={f.maxLength} onChange={(e) => setAnswer(f.id, e.target.value)} />
          {f.id === "coverLetter" && (
            <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
              <span data-testid="cover-words">{t("apply.coverWords", { n: words(v) })}</span>
              {profile && (
                <button type="button" className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:underline dark:text-indigo-400" onClick={() => { setAnswer(f.id, coverLetter(job, profile)); setFilled((s) => new Set(s).add(f.id)); }}>
                  <IconRefresh size={14} />
                  {t("apply.regenerate")}
                </button>
              )}
            </div>
          )}
        </>
      );
    } else if (f.type === "select") {
      control = (
        <select {...common} value={v} onChange={(e) => setAnswer(f.id, e.target.value)}>
          <option value="">{t("apply.selectPlaceholder")}</option>
          {f.options!.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      );
    } else if (f.type === "file") {
      control = (
        <div className={cx("flex flex-wrap items-center gap-3 rounded-xl border px-3 py-2", err ? "border-rose-400" : "border-slate-300 dark:border-slate-700")}>
          <IconFile size={18} className="text-slate-500" />
          <span className="min-w-0 flex-1 truncate text-sm" data-testid="field-resume-name">{v ? t("apply.resumeFile", { name: v }) : "—"}</span>
          <input ref={fileRef} type="file" accept=".pdf,.docx" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) setAnswer(f.id, file.name); }} />
          <Button size="sm" variant="secondary" onClick={() => fileRef.current?.click()} id={common.id}>{t("apply.chooseFile")}</Button>
        </div>
      );
    } else {
      control = <input {...common} type={f.type} value={v} placeholder={f.placeholder} min={f.type === "number" ? 0 : undefined} step={f.type === "number" ? "any" : undefined} onChange={(e) => setAnswer(f.id, e.target.value)} />;
    }
    return (
      <div key={f.id} className={cx(f.type === "textarea" && "sm:col-span-2")}>
        <Field label={f.label} htmlFor={`f-${f.id}`} error={err} required={f.required} highlight={filled.has(f.id)} badge={f.custom ? <Chip tone="cyan">{t("apply.custom")}</Chip> : null}>
          {control}
        </Field>
      </div>
    );
  };

  const answeredCount = Object.values(answers).filter((v) => v.trim()).length;

  return (
    <div className="space-y-5 pb-24">
      <Link href={`/jobs/${job.id}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-indigo-700 dark:text-slate-400">
        <IconArrowLeft size={16} />
        {job.title}
      </Link>

      <Card className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <CompanyLogo companyId={job.companyId} size={56} />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">JobHub · {t("apply.title")}</p>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white" data-testid="form-heading">{form.heading}</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">{job.title} · {job.location}</p>
          <p className="mt-1 text-xs text-slate-500">{t("apply.portalNote")}</p>
        </div>
        {match && <MatchRing score={match.score} size={60} />}
      </Card>

      {alreadyApplied && (
        <p className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300" data-testid="apply-already">
          <IconCheckCircle size={18} />
          {t("apply.alreadyApplied")}
          <Link href="/tracker" className="ml-auto underline">{t("jobs.openTracker")}</Link>
        </p>
      )}

      <div className="sticky top-16 z-20 -mx-3 flex flex-col gap-3 border-b border-slate-200 bg-slate-50/95 px-3 py-3 backdrop-blur sm:mx-0 sm:flex-row sm:items-center sm:rounded-2xl sm:border dark:border-slate-800 dark:bg-slate-950/95">
        {profile ? (
          <Button onClick={() => doAutofill(profile)} disabled={filling || submitting || alreadyApplied} data-testid="autofill">
            {filling ? <Spinner /> : <IconSparkles size={18} />}
            {filling ? t("apply.autofilling") : t("apply.autofill")}
          </Button>
        ) : (
          <LinkButton href="/profile" variant="secondary" data-testid="autofill-need-profile">
            <IconUser size={18} />
            {t("profile.needed")}
          </LinkButton>
        )}
        <p className="flex-1 text-sm text-slate-600 dark:text-slate-400" data-testid="autofill-msg" aria-live="polite">{fillMsg}</p>
        {filled.size > 0 && (
          <span className="inline-flex items-center gap-2 text-xs font-medium text-indigo-700 dark:text-indigo-300">
            <span className="h-3 w-3 rounded bg-indigo-100 ring-2 ring-indigo-300 dark:bg-indigo-500/20 dark:ring-indigo-500/50" />
            {t("apply.legend")}
          </span>
        )}
      </div>

      <form onSubmit={(e) => { e.preventDefault(); review(); }} noValidate className="space-y-5" data-testid="apply-form" data-variant={form.variant}>
        {form.sections.map((s) => (
          <Card key={s.title}>
            <h2 className="mb-4 font-semibold text-slate-900 dark:text-white">{s.title}</h2>
            <div className="grid gap-5 sm:grid-cols-2">{s.fields.map(renderField)}</div>
          </Card>
        ))}
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/90 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
          <div className="mx-auto flex max-w-7xl items-center justify-end gap-3">
            <span className="hidden text-sm text-slate-500 sm:inline">{answeredCount}/{fields.length}</span>
            <Button type="submit" size="lg" disabled={submitting || alreadyApplied} data-testid="review-submit">
              <IconSend size={18} />
              {t("apply.submit")}
            </Button>
          </div>
        </div>
      </form>

      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        busy={submitting}
        title={t("apply.confirm.title")}
        testId="submit-dialog"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)} disabled={submitting}>{t("common.cancel")}</Button>
            <Button onClick={submit} disabled={submitting} data-testid="confirm-submit">
              {submitting ? <Spinner /> : <IconSend size={18} />}
              {submitting ? t("apply.submitting") : t("apply.confirm.send")}
            </Button>
          </>
        }
      >
        <div className="flex items-center gap-3">
          <CompanyLogo companyId={job.companyId} size={44} />
          <p>{t("apply.confirm.text", { title: job.title, company: job.companyName })}</p>
        </div>
        <ul className="mt-4 space-y-1 rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800/60">
          {["fullName", "firstName", "email", "phone", "expectedSalary"].filter((k) => answers[k]).map((k) => (
            <li key={k} className="flex justify-between gap-3"><span className="text-slate-500">{fields.find((f) => f.id === k)?.label}</span><span className="truncate font-medium">{answers[k]}</span></li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-slate-500">{t("apply.confirm.fields", { n: answeredCount, words: words(answers.coverLetter ?? "") })}</p>
      </Dialog>
    </div>
  );
}
