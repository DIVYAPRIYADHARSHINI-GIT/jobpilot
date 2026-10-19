// Small helpers shared by the API routes (JSON responses, safe body parsing).
import type { Profile } from "./types";

export class InputError extends Error {
  status: number;
  constructor(code: string, status = 400) {
    super(code);
    this.status = status;
  }
}

export const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { "Cache-Control": "no-store" } });

export async function readJson<T>(req: Request, maxBytes = 200_000): Promise<T> {
  const text = await req.text();
  if (text.length > maxBytes) throw new InputError("tooLarge", 413);
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new InputError("badJson");
  }
}

export function handleError(e: unknown) {
  if (e instanceof InputError) return json({ error: e.message }, e.status);
  console.error(e);
  return json({ error: "server" }, 500);
}

const str = (v: unknown, max = 500) => (typeof v === "string" ? v.slice(0, max) : "");
const num = (v: unknown) => (Number.isFinite(Number(v)) ? Math.max(0, Number(v)) : 0);
const arr = (v: unknown, max = 60) => (Array.isArray(v) ? v.filter((x) => typeof x === "string").slice(0, max).map((x) => (x as string).slice(0, 80)) : []);

/** Coerce an untrusted profile payload into a complete Profile. */
export function sanitizeProfile(p: unknown): Profile {
  if (!p || typeof p !== "object") throw new InputError("badProfile");
  const o = p as Record<string, unknown>;
  const pref = (o.preferences ?? {}) as Record<string, unknown>;
  const list = <T,>(v: unknown, f: (x: Record<string, unknown>) => T) => (Array.isArray(v) ? v.slice(0, 10).filter((x) => x && typeof x === "object").map((x) => f(x as Record<string, unknown>)) : []);
  return {
    fullName: str(o.fullName, 120),
    email: str(o.email, 120),
    phone: str(o.phone, 40),
    location: str(o.location, 80),
    headline: str(o.headline, 120),
    summary: str(o.summary, 1200),
    linkedin: str(o.linkedin, 200),
    github: str(o.github, 200),
    portfolio: str(o.portfolio, 200),
    languages: str(o.languages, 200),
    totalExperience: Math.min(50, num(o.totalExperience)),
    currentSalary: num(o.currentSalary),
    workAuthorization: o.workAuthorization === "No" ? "No" : "Yes",
    skills: arr(o.skills),
    education: list(o.education, (x) => ({ degree: str(x.degree, 120), institution: str(x.institution, 160), year: str(x.year, 10), score: str(x.score, 20) })),
    experience: list(o.experience, (x) => ({ title: str(x.title, 120), company: str(x.company, 120), start: str(x.start, 10), end: str(x.end, 10), description: str(x.description, 800) })),
    preferences: {
      roles: arr(pref.roles, 10),
      locations: arr(pref.locations, 10),
      remoteOk: pref.remoteOk !== false,
      jobTypes: arr(pref.jobTypes, 3).filter((x) => x === "Full-time" || x === "Contract" || x === "Internship") as Profile["preferences"]["jobTypes"],
      minSalary: num(pref.minSalary),
      expectedSalary: num(pref.expectedSalary),
      noticePeriodDays: Math.min(180, num(pref.noticePeriodDays)),
      willingToRelocate: pref.willingToRelocate === true,
    },
    resumeFileName: str(o.resumeFileName, 160),
    updatedAt: num(o.updatedAt),
  };
}
