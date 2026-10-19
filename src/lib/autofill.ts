// Auto-fill: map a profile onto any JobHub form, write tailored answers to the
// company's custom questions and generate a cover letter from a template using
// the job description. Pure and deterministic (same input -> same output).
import type { AppForm, Job, Profile } from "./types.ts";
import { COMPANY_BY_ID } from "./data/companies.ts";
import { formFields, NOTICE_OPTIONS, EXPERIENCE_RANGES, DEGREE_OPTIONS } from "./forms.ts";
import { matchJob } from "./match.ts";

export interface AutofillResult {
  answers: Record<string, string>;
  /** Field ids that were filled automatically (highlighted in the UI). */
  filled: string[];
  /** Required fields the profile could not fill. */
  missing: string[];
}

export function noticeLabel(days: number): string {
  if (days <= 0) return "Immediate";
  let best = NOTICE_OPTIONS[1];
  let bestDiff = Infinity;
  for (const opt of NOTICE_OPTIONS.slice(1)) {
    const d = Math.abs(parseInt(opt, 10) - days);
    if (d < bestDiff) {
      bestDiff = d;
      best = opt;
    }
  }
  return best;
}

export function experienceRange(years: number): string {
  if (years < 1) return EXPERIENCE_RANGES[0];
  if (years < 3) return EXPERIENCE_RANGES[1];
  if (years < 5) return EXPERIENCE_RANGES[2];
  if (years < 8) return EXPERIENCE_RANGES[3];
  return EXPERIENCE_RANGES[4];
}

export function degreeOption(degree: string): string {
  const d = degree.toLowerCase().replace(/[.\s]/g, "");
  const table: Array<[RegExp, string]> = [
    [/mtech|^me\b|mastersofengineering|^me$/, "M.E. / M.Tech"],
    [/btech|^be|bachelorofengineering|bachelorsofengineering/, "B.E. / B.Tech"],
    [/mba/, "MBA"],
    [/mca/, "MCA"],
    [/bca/, "BCA"],
    [/msc/, "M.Sc"],
    [/bsc/, "B.Sc"],
    [/bcom/, "B.Com"],
  ];
  for (const [re, opt] of table) if (re.test(d)) return opt;
  return degree ? "Other" : "";
}

/** Today + notice period, as yyyy-mm-dd (the earliest joining date). */
export function joinDate(noticeDays: number, now = Date.now()): string {
  const d = new Date(now + Math.max(0, noticeDays) * 86_400_000);
  return d.toISOString().slice(0, 10);
}

const firstName = (p: Profile) => p.fullName.trim().split(/\s+/)[0] ?? "";
const lastName = (p: Profile) => p.fullName.trim().split(/\s+/).slice(1).join(" ");
const currentJob = (p: Profile) => p.experience[0];

export function relevantSkills(job: Job, profile: Profile): string[] {
  const m = matchJob(job, profile);
  const rest = profile.skills.filter((s) => !m.matched.some((x) => x.toLowerCase() === s.toLowerCase()));
  return [...m.matched, ...rest].slice(0, 10);
}

export function coverLetter(job: Job, profile: Profile): string {
  const company = COMPANY_BY_ID[job.companyId];
  const m = matchJob(job, profile);
  const top = (m.matched.length ? m.matched : profile.skills).slice(0, 3);
  const cur = currentJob(profile);
  const years = profile.totalExperience;
  const exp = years > 0 ? `${years}+ years of experience${cur ? ` as a ${cur.title} at ${cur.company}` : ""}` : "a strong academic foundation and hands-on project experience";
  const edu = profile.education[0];
  const learn = m.missing.length ? ` I am also actively learning ${m.missing.slice(0, 2).join(" and ")} to grow into the full scope of the role.` : "";
  const resp = job.responsibilities[0]?.toLowerCase() ?? "deliver great work";
  return [
    `Dear ${company.name} Hiring Team,`,
    "",
    `I am excited to apply for the ${job.title} role at ${company.name}. With ${exp}, I am confident I can help your team ${resp}.`,
    "",
    `Your description mentions ${job.skills.slice(0, 3).join(", ")}. ${top.length ? `I have worked hands-on with ${top.join(", ")}` : "I learn new tools quickly"}${cur?.description ? `, most recently where I ${lowerFirst(cur.description.replace(/\.$/, ""))}` : ""}.${learn}`,
    "",
    `${company.about} That mission genuinely interests me, and I would love to contribute to it${edu ? `, building on my ${edu.degree} from ${edu.institution}` : ""}.`,
    "",
    "Thank you for your time and consideration. I look forward to hearing from you.",
    "",
    "Sincerely,",
    profile.fullName || "Applicant",
    [profile.email, profile.phone].filter(Boolean).join(" | "),
  ].join("\n");
}

const lowerFirst = (s: string) => (s ? s[0].toLowerCase() + s.slice(1) : s);

export function answerQuestion(id: string, job: Job, profile: Profile, now = Date.now()): string {
  const company = COMPANY_BY_ID[job.companyId];
  const m = matchJob(job, profile);
  const p = profile.preferences;
  const top = (m.matched.length ? m.matched : profile.skills).slice(0, 3).join(", ");
  const cur = currentJob(profile);
  switch (id) {
    case "q_why_company":
      return `${company.name} stands out to me because ${lowerFirst(company.about.replace(/\.$/, ""))}. As a ${job.title}, I can bring my experience with ${top || "modern tools"} to that mission, and I value the ${job.workMode.toLowerCase()} culture and the chance to grow in ${company.industry.toLowerCase()}.`;
    case "q_relocate":
      return job.workMode === "Remote" || p.willingToRelocate || p.locations.some((l) => l.toLowerCase() === job.city.toLowerCase()) ? "Yes" : "No";
    case "q_remote":
      return p.remoteOk && job.workMode === "Remote" ? "Remote" : job.workMode === "Onsite" ? "Onsite" : p.remoteOk ? "Remote" : "Hybrid";
    case "q_portfolio":
      return profile.portfolio || profile.github || profile.linkedin;
    case "q_project":
      return cur?.description
        ? `At ${cur.company}, I ${lowerFirst(cur.description.replace(/\.$/, ""))}. I used ${top || "the team's stack"} and focused on clean, tested code and measurable impact.`
        : `I built a personal project using ${top || "modern web tools"} that solved a real problem for my classmates. I planned the features, shipped it end to end and improved it based on user feedback.`;
    case "q_start_date":
      return joinDate(p.noticePeriodDays, now);
    case "q_work_auth":
      return profile.workAuthorization || "Yes";
    case "q_degree":
      return degreeOption(profile.education[0]?.degree ?? "");
    case "q_source":
      return "JobHub";
    case "q_strength":
      return `My biggest strength is turning requirements into working results quickly. I combine ${top || "solid technical skills"} with clear communication, so the people I work with always know where things stand.`;
    case "q_shift":
      return "Yes";
    case "q_languages":
      return profile.languages;
    default:
      return "";
  }
}

export function autofill(form: AppForm, job: Job, profile: Profile, now = Date.now()): AutofillResult {
  const cur = currentJob(profile);
  const skills = relevantSkills(job, profile);
  const base: Record<string, string> = {
    fullName: profile.fullName,
    firstName: firstName(profile),
    lastName: lastName(profile),
    email: profile.email,
    phone: profile.phone,
    city: profile.location,
    linkedin: profile.linkedin,
    portfolio: profile.portfolio || profile.github,
    experienceYears: profile.totalExperience || profile.totalExperience === 0 ? String(profile.totalExperience) : "",
    experienceRange: experienceRange(profile.totalExperience),
    currentTitle: cur?.title ?? "",
    currentCompany: cur?.company ?? "",
    currentSalary: profile.currentSalary ? String(profile.currentSalary) : "",
    skills: skills.join(", "),
    primarySkills: skills.slice(0, 5).join(", "),
    highestDegree: degreeOption(profile.education[0]?.degree ?? ""),
    noticeDays: String(profile.preferences.noticePeriodDays),
    noticePeriod: noticeLabel(profile.preferences.noticePeriodDays),
    expectedSalary: profile.preferences.expectedSalary ? String(profile.preferences.expectedSalary) : "",
    availableFrom: joinDate(profile.preferences.noticePeriodDays, now),
    resume: profile.resumeFileName,
    coverLetter: coverLetter(job, profile),
  };
  const answers: Record<string, string> = {};
  const filled: string[] = [];
  const missing: string[] = [];
  for (const field of formFields(form)) {
    const v = (field.custom ? answerQuestion(field.id, job, profile, now) : base[field.id]) ?? "";
    answers[field.id] = v;
    if (v.trim()) filled.push(field.id);
    else if (field.required) missing.push(field.id);
  }
  return { answers, filled, missing };
}

export { DEGREE_OPTIONS };
