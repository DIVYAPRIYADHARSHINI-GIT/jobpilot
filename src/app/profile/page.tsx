"use client";
// Profile & resume: upload a PDF/DOCX (parsed by /api/parse-resume) or fill
// the form by hand. Draft lives in local state; saved to localStorage on Save.
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/i18n";
import type { TKey } from "@/i18n/en";
import type { Education, Experience, JobType, Profile } from "@/lib/types";
import { saveProfile, useAppState, useHydrated } from "@/lib/store";
import { parseResume, ApiError } from "@/lib/client";
import { DEMO_PROFILE } from "@/lib/demo";
import { ALL_SKILLS, uniqueSkills } from "@/lib/data/skills";
import { Button, Card, Chip, Field, inputCls, PageHeader, PageSkeleton, Spinner, toast, cx } from "@/components/ui";
import { IconCheckCircle, IconFile, IconPlus, IconTrash, IconUpload, IconX } from "@/components/Icons";

const EMPTY: Profile = {
  fullName: "",
  email: "",
  phone: "",
  location: "",
  headline: "",
  summary: "",
  linkedin: "",
  github: "",
  portfolio: "",
  languages: "",
  totalExperience: 0,
  currentSalary: 0,
  workAuthorization: "Yes",
  skills: [],
  education: [],
  experience: [],
  preferences: { roles: [], locations: [], remoteOk: true, jobTypes: ["Full-time"], minSalary: 0, expectedSalary: 0, noticePeriodDays: 30, willingToRelocate: false },
  resumeFileName: "",
  updatedAt: 0,
};

const JOB_TYPES: JobType[] = ["Full-time", "Contract", "Internship"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^[+()\-\s\d]{8,18}$/;

function completeness(p: Profile): number {
  const checks = [p.fullName, p.email, p.phone, p.location, p.headline, p.summary, p.skills.length >= 3, p.experience.length || p.totalExperience === 0, p.education.length, p.preferences.roles.length, p.preferences.expectedSalary, p.resumeFileName];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function mergeParsed(base: Profile, parsed: Partial<Profile>): { profile: Profile; filled: Set<string> } {
  const filled = new Set<string>();
  const next: Profile = { ...base, preferences: { ...base.preferences } };
  const scalar = ["fullName", "email", "phone", "location", "headline", "summary", "linkedin", "github", "portfolio", "languages", "resumeFileName"] as const;
  for (const k of scalar) {
    const v = parsed[k];
    if (typeof v === "string" && v.trim()) {
      next[k] = v.trim();
      if (k !== "resumeFileName") filled.add(k);
    }
  }
  if (typeof parsed.totalExperience === "number" && parsed.totalExperience > 0) {
    next.totalExperience = parsed.totalExperience;
    filled.add("totalExperience");
  }
  if (parsed.skills?.length) {
    next.skills = uniqueSkills([...base.skills, ...parsed.skills]);
    filled.add("skills");
  }
  if (parsed.experience?.length) {
    next.experience = parsed.experience;
    filled.add("experience");
  }
  if (parsed.education?.length) {
    next.education = parsed.education;
    filled.add("education");
  }
  if (!next.preferences.roles.length && next.headline) next.preferences.roles = [next.headline];
  if (!next.preferences.locations.length && next.location) next.preferences.locations = [next.location];
  return { profile: next, filled };
}

const splitList = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

export default function ProfilePage() {
  const hydrated = useHydrated();
  const { profile } = useAppState();
  if (!hydrated) return <PageSkeleton />;
  // Remount the editor when a different profile is saved/loaded elsewhere.
  return <ProfileEditor key={profile?.updatedAt ?? "new"} initial={profile ?? EMPTY} isNew={!profile} />;
}

function ProfileEditor({ initial, isNew }: { initial: Profile; isNew: boolean }) {
  const { t } = useI18n();
  const router = useRouter();
  const [p, setP] = useState<Profile>(initial);
  const [rolesText, setRolesText] = useState(initial.preferences.roles.join(", "));
  const [locText, setLocText] = useState(initial.preferences.locations.join(", "));
  const [skillInput, setSkillInput] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parseMsg, setParseMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [fromResume, setFromResume] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => {
    setP((prev) => ({ ...prev, [k]: v }));
    setDirty(true);
  };
  const setPref = <K extends keyof Profile["preferences"]>(k: K, v: Profile["preferences"][K]) => {
    setP((prev) => ({ ...prev, preferences: { ...prev.preferences, [k]: v } }));
    setDirty(true);
  };

  async function onFile(file: File | undefined) {
    if (!file) return;
    setParseMsg(null);
    if (!/\.(pdf|docx)$/i.test(file.name)) return setParseMsg({ tone: "err", text: t("profile.upload.badType") });
    if (file.size > 4 * 1024 * 1024) return setParseMsg({ tone: "err", text: t("profile.upload.tooBig") });
    setParsing(true);
    try {
      const r = await parseResume(file);
      const { profile: merged, filled } = mergeParsed(p, { ...r.profile, resumeFileName: file.name });
      setP(merged);
      setRolesText(merged.preferences.roles.join(", "));
      setLocText(merged.preferences.locations.join(", "));
      setFromResume(filled);
      setDirty(true);
      setParseMsg({ tone: "ok", text: t("profile.upload.success", { n: filled.size }) });
    } catch (e) {
      const code = e instanceof ApiError ? String(e.data.error) : "";
      setParseMsg({ tone: "err", text: code === "tooBig" ? t("profile.upload.tooBig") : code === "badType" ? t("profile.upload.badType") : t("profile.upload.failed") });
    } finally {
      setParsing(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function loadSample(kind: "pdf" | "docx") {
    try {
      const res = await fetch(`/samples/sample-resume.${kind}`);
      const blob = await res.blob();
      await onFile(new File([blob], `sample-resume.${kind}`, { type: blob.type }));
    } catch {
      setParseMsg({ tone: "err", text: t("profile.upload.failed") });
    }
  }

  function addSkills(raw: string) {
    const list = splitList(raw);
    if (!list.length) return;
    set("skills", uniqueSkills([...p.skills, ...list]));
    setSkillInput("");
  }

  function validate(): Record<string, string> {
    const e: Record<string, string> = {};
    if (p.fullName.trim().length < 2) e.fullName = t("profile.err.name");
    if (!EMAIL_RE.test(p.email.trim())) e.email = t("profile.err.email");
    if (!PHONE_RE.test(p.phone.trim())) e.phone = t("profile.err.phone");
    if (!p.skills.length) e.skills = t("profile.err.skills");
    return e;
  }

  function save() {
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) {
      toast(t("profile.invalid"), "error");
      document.getElementById(`pf-${Object.keys(e)[0]}`)?.focus();
      return;
    }
    const final: Profile = {
      ...p,
      fullName: p.fullName.trim(),
      email: p.email.trim(),
      phone: p.phone.trim(),
      preferences: { ...p.preferences, roles: splitList(rolesText), locations: splitList(locText) },
    };
    saveProfile(final);
    setDirty(false);
    toast(t("profile.savedToast"));
    if (isNew) router.push("/jobs");
  }

  function useDemo() {
    setP({ ...DEMO_PROFILE });
    setRolesText(DEMO_PROFILE.preferences.roles.join(", "));
    setLocText(DEMO_PROFILE.preferences.locations.join(", "));
    setFromResume(new Set());
    setErrors({});
    setDirty(true);
  }

  const badge = (k: string) => (fromResume.has(k) ? <Chip tone="indigo">{t("profile.parsedBadge")}</Chip> : null);
  const text = (k: "fullName" | "email" | "phone" | "location" | "headline" | "linkedin" | "github" | "portfolio" | "languages", label: TKey, type = "text", required = false) => (
    <Field label={t(label)} htmlFor={`pf-${k}`} error={errors[k]} required={required} badge={badge(k)}>
      <input id={`pf-${k}`} data-testid={`pf-${k}`} type={type} value={p[k]} onChange={(e) => set(k, e.target.value)} className={inputCls(!!errors[k])} autoComplete="on" />
    </Field>
  );
  const suggestions = ALL_SKILLS.filter((s) => skillInput && s.toLowerCase().includes(skillInput.toLowerCase()) && !p.skills.includes(s)).slice(0, 6);
  const pct = completeness(p);

  return (
    <div className="space-y-5 pb-24">
      <PageHeader title={t("profile.title")} subtitle={t("profile.subtitle")}>
        <Button variant="secondary" onClick={useDemo} data-testid="use-demo-profile">
          {t("profile.useDemo")}
        </Button>
      </PageHeader>

      <Card className="border-dashed border-indigo-300 bg-indigo-50/40 dark:border-indigo-500/40 dark:bg-indigo-500/5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white">
            <IconUpload />
          </span>
          <div className="flex-1">
            <h2 className="font-semibold text-slate-900 dark:text-white">{t("profile.upload.title")}</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">{t("profile.upload.text")}</p>
            <p className="mt-1 text-xs text-slate-500">
              {t("profile.upload.samples")}{" "}
              <button type="button" className="font-semibold text-indigo-600 hover:underline dark:text-indigo-400" onClick={() => loadSample("pdf")} disabled={parsing} data-testid="sample-pdf">
                {t("profile.upload.samplePdf")}
              </button>{" "}
              ·{" "}
              <button type="button" className="font-semibold text-indigo-600 hover:underline dark:text-indigo-400" onClick={() => loadSample("docx")} disabled={parsing} data-testid="sample-docx">
                {t("profile.upload.sampleDocx")}
              </button>
            </p>
          </div>
          <input ref={fileRef} type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="hidden" data-testid="resume-input" onChange={(e) => onFile(e.target.files?.[0])} />
          <Button onClick={() => fileRef.current?.click()} disabled={parsing} data-testid="upload-resume">
            {parsing ? <Spinner /> : <IconUpload size={18} />}
            {parsing ? t("profile.upload.parsing") : t("profile.upload.button")}
          </Button>
        </div>
        {parseMsg && (
          <p data-testid="parse-msg" data-tone={parseMsg.tone} className={cx("mt-3 flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium", parseMsg.tone === "ok" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" : "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300")}>
            {parseMsg.tone === "ok" ? <IconCheckCircle size={18} /> : <IconX size={18} />}
            {parseMsg.text}
          </p>
        )}
        <p className="mt-3 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          <IconFile size={16} />
          {t("profile.resumeFile")}: <span className="font-medium text-slate-800 dark:text-slate-200" data-testid="resume-name">{p.resumeFileName || t("profile.noResume")}</span>
        </p>
      </Card>

      <div className="flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-sm font-medium text-slate-600 dark:text-slate-400" data-testid="completeness">{t("profile.completeness", { n: pct })}</span>
      </div>

      <Card>
        <h2 className="mb-4 font-semibold text-slate-900 dark:text-white">{t("profile.section.personal")}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {text("fullName", "profile.fullName", "text", true)}
          {text("email", "profile.email", "email", true)}
          {text("phone", "profile.phone", "tel", true)}
          {text("location", "profile.location")}
          {text("headline", "profile.headline")}
          <Field label={t("profile.totalExperience")} htmlFor="pf-totalExperience" badge={badge("totalExperience")}>
            <input id="pf-totalExperience" data-testid="pf-totalExperience" type="number" min={0} max={50} step={0.5} value={p.totalExperience} onChange={(e) => set("totalExperience", Math.max(0, Number(e.target.value) || 0))} className={inputCls()} />
          </Field>
          <div className="sm:col-span-2">
            <Field label={t("profile.summary")} htmlFor="pf-summary" badge={badge("summary")}>
              <textarea id="pf-summary" rows={3} value={p.summary} onChange={(e) => set("summary", e.target.value)} className={inputCls()} />
            </Field>
          </div>
          {text("linkedin", "profile.linkedin", "url")}
          {text("github", "profile.github", "url")}
          {text("portfolio", "profile.portfolio", "url")}
          {text("languages", "profile.languages")}
          <Field label={t("profile.currentSalary")} htmlFor="pf-currentSalary">
            <input id="pf-currentSalary" type="number" min={0} value={p.currentSalary} onChange={(e) => set("currentSalary", Math.max(0, Number(e.target.value) || 0))} className={inputCls()} />
          </Field>
          <Field label={t("profile.workAuth")} htmlFor="pf-workAuth">
            <select id="pf-workAuth" value={p.workAuthorization} onChange={(e) => set("workAuthorization", e.target.value as "Yes" | "No")} className={inputCls()}>
              <option value="Yes">{t("common.yes")}</option>
              <option value="No">{t("common.no")}</option>
            </select>
          </Field>
        </div>
      </Card>

      <Card>
        <div className="mb-3 flex items-center gap-2">
          <h2 className="font-semibold text-slate-900 dark:text-white">{t("profile.section.skills")}</h2>
          {badge("skills")}
        </div>
        <div className="flex flex-wrap gap-2" data-testid="skill-list">
          {p.skills.map((s) => (
            <span key={s} className="inline-flex items-center gap-1 rounded-full bg-indigo-50 py-1 pl-3 pr-1 text-sm font-medium text-indigo-700 ring-1 ring-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-300 dark:ring-indigo-500/30">
              {s}
              <button type="button" aria-label={`${t("common.remove")} ${s}`} onClick={() => set("skills", p.skills.filter((x) => x !== s))} className="rounded-full p-0.5 hover:bg-indigo-100 dark:hover:bg-indigo-500/20">
                <IconX size={14} />
              </button>
            </span>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <input
            id="pf-skills"
            data-testid="skill-input"
            value={skillInput}
            onChange={(e) => (e.target.value.endsWith(",") ? addSkills(e.target.value) : setSkillInput(e.target.value))}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addSkills(skillInput);
              }
            }}
            placeholder={t("profile.skillsHint")}
            className={inputCls(!!errors.skills)}
          />
          <Button variant="secondary" onClick={() => addSkills(skillInput)} data-testid="skill-add">
            <IconPlus size={16} />
            <span className="hidden sm:inline">{t("profile.addSkill")}</span>
          </Button>
        </div>
        {suggestions.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
            {t("profile.suggested")}:
            {suggestions.map((s) => (
              <button key={s} type="button" className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-700 hover:bg-indigo-100 dark:bg-slate-800 dark:text-slate-300" onClick={() => addSkills(s)}>
                + {s}
              </button>
            ))}
          </div>
        )}
        {errors.skills && <p className="mt-1 text-xs font-medium text-rose-600">{errors.skills}</p>}
      </Card>

      <Card>
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-slate-900 dark:text-white">{t("profile.section.experience")}</h2>
            {badge("experience")}
          </div>
          <Button size="sm" variant="secondary" onClick={() => set("experience", [...p.experience, { title: "", company: "", start: "", end: "", description: "" }])}>
            <IconPlus size={16} />
            {t("profile.addExperience")}
          </Button>
        </div>
        <div className="space-y-4">
          {p.experience.map((x, i) => (
            <RowEditor<Experience>
              key={i}
              value={x}
              onChange={(v) => set("experience", p.experience.map((e, k) => (k === i ? v : e)))}
              onRemove={() => set("experience", p.experience.filter((_, k) => k !== i))}
              fields={[["title", "profile.expTitle"], ["company", "profile.expCompany"], ["start", "profile.expStart"], ["end", "profile.expEnd"]]}
              area={["description", "profile.expDesc"]}
            />
          ))}
        </div>
      </Card>

      <Card>
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-slate-900 dark:text-white">{t("profile.section.education")}</h2>
            {badge("education")}
          </div>
          <Button size="sm" variant="secondary" onClick={() => set("education", [...p.education, { degree: "", institution: "", year: "", score: "" }])}>
            <IconPlus size={16} />
            {t("profile.addEducation")}
          </Button>
        </div>
        <div className="space-y-4">
          {p.education.map((x, i) => (
            <RowEditor<Education>
              key={i}
              value={x}
              onChange={(v) => set("education", p.education.map((e, k) => (k === i ? v : e)))}
              onRemove={() => set("education", p.education.filter((_, k) => k !== i))}
              fields={[["degree", "profile.eduDegree"], ["institution", "profile.eduInstitution"], ["year", "profile.eduYear"], ["score", "profile.eduScore"]]}
            />
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 font-semibold text-slate-900 dark:text-white">{t("profile.section.preferences")}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("profile.prefRoles")} htmlFor="pf-roles">
            <input id="pf-roles" data-testid="pf-roles" value={rolesText} onChange={(e) => { setRolesText(e.target.value); setDirty(true); }} className={inputCls()} />
          </Field>
          <Field label={t("profile.prefLocations")} htmlFor="pf-locs">
            <input id="pf-locs" value={locText} onChange={(e) => { setLocText(e.target.value); setDirty(true); }} className={inputCls()} />
          </Field>
          <Field label={t("profile.prefMinSalary")} htmlFor="pf-min">
            <input id="pf-min" type="number" min={0} value={p.preferences.minSalary} onChange={(e) => setPref("minSalary", Math.max(0, Number(e.target.value) || 0))} className={inputCls()} />
          </Field>
          <Field label={t("profile.prefExpected")} htmlFor="pf-exp">
            <input id="pf-exp" data-testid="pf-expected" type="number" min={0} value={p.preferences.expectedSalary} onChange={(e) => setPref("expectedSalary", Math.max(0, Number(e.target.value) || 0))} className={inputCls()} />
          </Field>
          <Field label={t("profile.prefNotice")} htmlFor="pf-notice">
            <input id="pf-notice" type="number" min={0} max={180} value={p.preferences.noticePeriodDays} onChange={(e) => setPref("noticePeriodDays", Math.min(180, Math.max(0, Number(e.target.value) || 0)))} className={inputCls()} />
          </Field>
          <fieldset>
            <legend className="mb-1 text-sm font-medium text-slate-700 dark:text-slate-300">{t("profile.prefTypes")}</legend>
            <div className="flex flex-wrap gap-2">
              {JOB_TYPES.map((jt) => {
                const on = p.preferences.jobTypes.includes(jt);
                return (
                  <button key={jt} type="button" aria-pressed={on} onClick={() => setPref("jobTypes", on ? p.preferences.jobTypes.filter((x) => x !== jt) : [...p.preferences.jobTypes, jt])} className={cx("rounded-full px-3 py-1.5 text-sm font-medium ring-1", on ? "bg-indigo-600 text-white ring-indigo-600" : "bg-white text-slate-700 ring-slate-300 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700")}>
                    {jt}
                  </button>
                );
              })}
            </div>
          </fieldset>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
            <input type="checkbox" checked={p.preferences.remoteOk} onChange={(e) => setPref("remoteOk", e.target.checked)} className="h-4 w-4 accent-indigo-600" />
            {t("profile.prefRemote")}
          </label>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
            <input type="checkbox" checked={p.preferences.willingToRelocate} onChange={(e) => setPref("willingToRelocate", e.target.checked)} className="h-4 w-4 accent-indigo-600" />
            {t("profile.prefRelocate")}
          </label>
        </div>
      </Card>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/90 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
        <div className="mx-auto flex max-w-7xl items-center justify-end gap-3">
          {dirty && <span className="hidden text-sm text-amber-600 sm:inline dark:text-amber-400">•</span>}
          <Button size="lg" onClick={save} data-testid="save-profile">
            <IconCheckCircle size={18} />
            {t("profile.saveButton")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function RowEditor<T extends object>({ value, onChange, onRemove, fields, area }: { value: T; onChange: (v: T) => void; onRemove: () => void; fields: Array<[keyof T & string, TKey]>; area?: [keyof T & string, TKey] }) {
  const { t } = useI18n();
  const v = value as Record<string, string>;
  return (
    <div className="relative rounded-xl border border-slate-200 p-3 pr-11 dark:border-slate-700">
      <button type="button" onClick={onRemove} aria-label={t("common.remove")} className="absolute right-2 top-2 rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10">
        <IconTrash size={16} />
      </button>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {fields.map(([k, label]) => (
          <label key={k} className="text-xs font-medium text-slate-600 dark:text-slate-400">
            {t(label)}
            <input value={v[k] ?? ""} onChange={(e) => onChange({ ...value, [k]: e.target.value })} className={cx(inputCls(), "mt-1")} />
          </label>
        ))}
        {area && (
          <label className="text-xs font-medium text-slate-600 sm:col-span-2 lg:col-span-4 dark:text-slate-400">
            {t(area[1])}
            <textarea rows={2} value={v[area[0]] ?? ""} onChange={(e) => onChange({ ...value, [area[0]]: e.target.value })} className={cx(inputCls(), "mt-1")} />
          </label>
        )}
      </div>
    </div>
  );
}
