// Resume parsing: text -> partial Profile using simple heuristics (emails,
// phones, links, section headings, skill vocabulary, year ranges). Used by
// /api/parse-resume after PDF/DOCX text extraction (see extract.ts).
import type { Education, Experience, Profile } from "./types.ts";
import { extractSkills } from "./data/skills.ts";

export type ParsedResume = Partial<Omit<Profile, "preferences">> & { preferences?: Partial<Profile["preferences"]> };

const SECTION_RE = /^(summary|profile|about me|objective|professional summary|experience|work experience|employment|professional experience|education|academics|skills|technical skills|key skills|projects|certifications|languages|contact|preferences)\s*:?\s*$/i;

const CITIES = ["Bengaluru", "Bangalore", "Chennai", "Mumbai", "Pune", "Hyderabad", "Delhi", "New Delhi", "Noida", "Gurugram", "Gurgaon", "Kochi", "Ahmedabad", "Kolkata", "Coimbatore", "Madurai", "Jaipur", "Remote"];

function sectionOf(heading: string): string {
  const h = heading.toLowerCase();
  if (/summary|profile|about|objective/.test(h)) return "summary";
  if (/experience|employment/.test(h)) return "experience";
  if (/education|academics/.test(h)) return "education";
  if (/skills/.test(h)) return "skills";
  if (/language/.test(h)) return "languages";
  return h;
}

function splitSections(lines: string[]) {
  const sections: Record<string, string[]> = { header: [] };
  let cur = "header";
  for (const line of lines) {
    if (SECTION_RE.test(line)) {
      cur = sectionOf(line.replace(/:$/, ""));
      sections[cur] ??= [];
      continue;
    }
    (sections[cur] ??= []).push(line);
  }
  return sections;
}

const YEAR_RANGE = /((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+)?((?:19|20)\d{2})\s*(?:-|–|—|to)\s*((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+)?((?:19|20)\d{2}|present|current|now)/i;

function parseExperience(lines: string[]): Experience[] {
  const out: Experience[] = [];
  let cur: Experience | null = null;
  for (const raw of lines) {
    const line = raw.replace(/^[-•*·]\s*/, "").trim();
    if (!line) continue;
    const yr = line.match(YEAR_RANGE);
    if (yr) {
      const head = line.replace(YEAR_RANGE, "").replace(/[|,()\-–—]+\s*$/, "").replace(/\s*[|,(]\s*$/, "").trim();
      const [title, company] = head.split(/\s+(?:at|@)\s+|\s*[|,–—]\s*|\s+-\s+/).map((s) => s?.trim() ?? "");
      cur = { title: title || "", company: company || "", start: yr[2], end: /present|current|now/i.test(yr[4]) ? "Present" : yr[4], description: "" };
      out.push(cur);
    } else if (cur) {
      cur.description = cur.description ? `${cur.description} ${line}` : line;
    }
  }
  return out.slice(0, 6);
}

function parseEducation(lines: string[]): Education[] {
  const out: Education[] = [];
  for (const raw of lines) {
    const line = raw.replace(/^[-•*·]\s*/, "").trim();
    if (!line) continue;
    const year = line.match(/((?:19|20)\d{2})(?!.*(?:19|20)\d{2})/)?.[1] ?? "";
    const score = line.match(/(\d{1,2}(?:\.\d{1,2})?\s*(?:cgpa|gpa|\/\s*10)|\d{2}(?:\.\d)?\s*%)/i)?.[0] ?? "";
    const cleaned = line.replace(/\(?(?:19|20)\d{2}\s*(?:-|–|to)?\s*(?:(?:19|20)\d{2})?\)?/g, "").replace(score, "").replace(/[|,()\-–—]+\s*$/, "").trim();
    const [degree, institution] = cleaned.split(/\s*[|,–—]\s*|\s+-\s+|\s+from\s+/).map((s) => s?.trim() ?? "");
    if (/(b\.?\s?e|b\.?\s?tech|m\.?\s?tech|b\.?\s?sc|m\.?\s?sc|bca|mca|mba|b\.?\s?com|bachelor|master|diploma|ph\.?d|degree|engineering|hsc|class)/i.test(line) || year) {
      out.push({ degree: degree || cleaned, institution: institution || "", year, score: score.trim() });
    }
  }
  return out.slice(0, 4);
}

function totalYears(exp: Experience[], text: string, now = new Date()): number {
  const stated = text.match(/(\d{1,2}(?:\.\d)?)\+?\s*(?:years|yrs)\s+(?:of\s+)?(?:professional\s+|work\s+|industry\s+)?experience/i);
  if (stated) return Number(stated[1]);
  let months = 0;
  for (const e of exp) {
    const s = Number(e.start);
    const end = e.end === "Present" ? now.getFullYear() + now.getMonth() / 12 : Number(e.end);
    if (s && end && end >= s) months += (end - s) * 12;
  }
  return Math.round((months / 12) * 10) / 10;
}

export function parseResumeText(text: string, fileName = ""): ParsedResume {
  const clean = text.normalize("NFKC").replace(/\r/g, "").replace(/\u00a0/g, " ");
  const lines = clean.split("\n").map((l) => l.trim()).filter((l, i, arr) => l || (i > 0 && arr[i - 1]));
  const sections = splitSections(lines.filter(Boolean));
  const email = clean.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/)?.[0] ?? "";
  const phone = clean.match(/(\+?\d{1,3}[\s-]?)?(?:\(?\d{3,5}\)?[\s-]?)?\d{3,5}[\s-]?\d{4,5}/)?.[0]?.trim() ?? "";
  const linkedin = clean.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/[A-Za-z0-9_\-/]+/i)?.[0] ?? "";
  const github = clean.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/[A-Za-z0-9_\-]+/i)?.[0] ?? "";
  const header = sections.header ?? [];
  const nameLine = header.find((l) => /^[A-Za-z][A-Za-z.'\s]{2,40}$/.test(l) && l.split(/\s+/).length <= 5 && !/resume|curriculum|vitae/i.test(l)) ?? "";
  const headline = header.find((l) => l !== nameLine && !l.includes("@") && !/\d{5}/.test(l) && /[A-Za-z]/.test(l) && l.length < 80 && !/linkedin|github|http/i.test(l)) ?? "";
  const location = CITIES.find((c) => new RegExp(`\\b${c}\\b`, "i").test(header.join(" "))) ?? CITIES.find((c) => new RegExp(`\\b${c}\\b`, "i").test(clean)) ?? "";
  const experience = parseExperience(sections.experience ?? []);
  const education = parseEducation(sections.education ?? []);
  const skills = extractSkills([...(sections.skills ?? []), ...(sections.summary ?? []), ...(sections.experience ?? []), ...(sections.projects ?? [])].join("\n") || clean);
  const languages = (sections.languages ?? []).join(", ").replace(/\s*,\s*/g, ", ");
  const portfolio = clean.match(/https?:\/\/(?!(?:www\.)?(?:linkedin|github)\.com)[^\s,)]+/i)?.[0] ?? "";
  return {
    fullName: nameLine.replace(/\s+/g, " ").trim(),
    headline,
    email,
    phone,
    location: location === "Bangalore" ? "Bengaluru" : location === "Gurgaon" ? "Gurugram" : location,
    linkedin: linkedin && !/^https?:/i.test(linkedin) ? `https://${linkedin}` : linkedin,
    github: github && !/^https?:/i.test(github) ? `https://${github}` : github,
    portfolio,
    summary: (sections.summary ?? []).join(" ").slice(0, 600),
    skills,
    experience,
    education,
    languages,
    totalExperience: totalYears(experience, clean),
    resumeFileName: fileName,
  };
}
