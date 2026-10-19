// Match score (0-100) = 60% skills + 25% experience + 15% preferences.
// Pure and deterministic, shared by /api/match and the client fallback.
import type { Job, MatchResult, Profile } from "./types.ts";
import { canonicalSkill } from "./data/skills.ts";

const norm = (s: string) => canonicalSkill(s).toLowerCase();

export function skillScore(job: Job, profile: Profile) {
  const have = new Set(profile.skills.map(norm));
  const matched = job.skills.filter((s) => have.has(norm(s)));
  const missing = job.skills.filter((s) => !have.has(norm(s)));
  const niceMatched = job.niceToHave.filter((s) => have.has(norm(s)));
  const niceMissing = job.niceToHave.filter((s) => !have.has(norm(s)));
  const req = job.skills.length ? matched.length / job.skills.length : 1;
  const nice = job.niceToHave.length ? niceMatched.length / job.niceToHave.length : 0;
  return { value: Math.min(1, req * 0.85 + nice * 0.15), matched, missing, niceMatched, niceMissing };
}

export function experienceScore(job: Job, years: number) {
  if (years >= job.expMin && years <= job.expMax + 2) return 1;
  if (years < job.expMin) return Math.max(0, 1 - (job.expMin - years) * 0.3);
  // Overqualified: mild penalty.
  return Math.max(0.5, 1 - (years - job.expMax - 2) * 0.1);
}

export function preferenceScore(job: Job, profile: Profile) {
  const p = profile.preferences;
  const reasons: string[] = [];
  let pts = 0;
  // Role (40%)
  const title = job.title.toLowerCase();
  const roleHit = p.roles.length === 0 || p.roles.some((r) => r.trim() && (title.includes(r.toLowerCase().trim()) || r.toLowerCase().split(/\s+/).filter((w) => w.length > 3).some((w) => title.includes(w))));
  if (roleHit) {
    pts += 0.4;
    reasons.push("role");
  }
  // Location (30%)
  const locs = p.locations.map((l) => l.toLowerCase().trim()).filter(Boolean);
  const locHit = (job.workMode === "Remote" && p.remoteOk) || locs.length === 0 || locs.includes(job.city.toLowerCase()) || (p.willingToRelocate && job.workMode !== "Remote");
  if (locHit) {
    pts += 0.3;
    reasons.push("location");
  }
  // Salary (20%)
  if (!p.minSalary || job.salaryMax >= p.minSalary) {
    pts += 0.2;
    reasons.push("salary");
  }
  // Job type (10%)
  if (p.jobTypes.length === 0 || p.jobTypes.includes(job.type)) {
    pts += 0.1;
    reasons.push("type");
  }
  return { value: pts, reasons };
}

export function matchJob(job: Job, profile: Profile): MatchResult {
  const s = skillScore(job, profile);
  const e = experienceScore(job, profile.totalExperience || 0);
  const p = preferenceScore(job, profile);
  const score = Math.round((s.value * 0.6 + e * 0.25 + p.value * 0.15) * 100);
  return {
    jobId: job.id,
    score: Math.max(0, Math.min(100, score)),
    matched: [...s.matched, ...s.niceMatched],
    missing: s.missing,
    breakdown: { skills: Math.round(s.value * 100), experience: Math.round(e * 100), preferences: Math.round(p.value * 100) },
    reasons: p.reasons,
  };
}

export function matchAll(jobs: Job[], profile: Profile): Record<string, MatchResult> {
  return Object.fromEntries(jobs.map((j) => [j.id, matchJob(j, profile)]));
}

export const scoreTone = (score: number) => (score >= 75 ? "high" : score >= 50 ? "mid" : "low");
