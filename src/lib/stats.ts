// Dashboard statistics + CSV export, derived from applications. Pure functions.
import type { Application, Stage } from "./types.ts";

export interface Stats {
  total: number;
  saved: number;
  responded: number;
  responseRate: number;
  interviews: number;
  offers: number;
  rejected: number;
  byStage: Record<Stage, number>;
  perWeek: Array<{ week: string; count: number }>;
  missingSkills: Array<{ skill: string; count: number }>;
}

const DAY = 86_400_000;
const pad = (n: number) => String(n).padStart(2, "0");
export const localDay = (t: number) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/** Monday 00:00 (local) of the week containing t. */
export function weekStart(t: number): number {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  const dow = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - dow);
  return d.getTime();
}

const reachedInterview = (a: Application) => a.stage === "interview" || a.stage === "offer" || a.timeline.some((e) => e.status === "interview");

export function computeStats(apps: Application[], now = Date.now(), weeks = 8): Stats {
  const submitted = apps.filter((a) => a.submittedAt);
  const byStage: Record<Stage, number> = { saved: 0, applied: 0, interview: 0, offer: 0, rejected: 0 };
  for (const a of apps) byStage[a.stage]++;
  // A response = the employer did anything beyond "applied" (viewed counts as no response).
  const responded = submitted.filter((a) => a.stage === "interview" || a.stage === "offer" || a.stage === "rejected" || a.portalStatus === "interview" || a.portalStatus === "offer" || a.portalStatus === "rejected").length;
  const interviews = submitted.filter(reachedInterview).length;

  const thisWeek = weekStart(now);
  const perWeekCount = new Map<number, number>();
  for (const a of submitted) {
    const w = weekStart(a.submittedAt!);
    perWeekCount.set(w, (perWeekCount.get(w) ?? 0) + 1);
  }
  const perWeek: Stats["perWeek"] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    // setDate keeps local midnight across DST changes.
    const start = new Date(thisWeek);
    start.setDate(start.getDate() - i * 7);
    const s = start.getTime();
    perWeek.push({ week: localDay(s), count: perWeekCount.get(s) ?? 0 });
  }

  const counts = new Map<string, number>();
  for (const a of apps) for (const s of a.missingSkills) counts.set(s, (counts.get(s) ?? 0) + 1);
  const missingSkills = [...counts.entries()].map(([skill, count]) => ({ skill, count })).sort((x, y) => y.count - x.count || x.skill.localeCompare(y.skill)).slice(0, 8);

  return {
    total: submitted.length,
    saved: byStage.saved,
    responded,
    responseRate: submitted.length ? Math.round((responded / submitted.length) * 100) : 0,
    interviews,
    offers: submitted.filter((a) => a.stage === "offer").length,
    rejected: byStage.rejected,
    byStage,
    perWeek,
    missingSkills,
  };
}

function csvCell(v: unknown): string {
  let s = v === undefined || v === null ? "" : String(v);
  // Neutralise spreadsheet formula injection.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export const CSV_HEADERS = ["Company", "Role", "Location", "Salary", "Stage", "JobHub status", "Match %", "Matched skills", "Missing skills", "Saved on", "Applied on", "Interview", "Follow-up", "Receipt", "Source", "Notes"];

export function toCsv(apps: Application[]): string {
  const rows = apps.map((a) => [
    a.company,
    a.title,
    a.location,
    a.salary,
    a.stage,
    a.portalStatus ?? "",
    a.matchScore,
    a.matchedSkills.join("; "),
    a.missingSkills.join("; "),
    localDay(a.savedAt),
    a.submittedAt ? localDay(a.submittedAt) : "",
    a.interviewDate ?? "",
    a.followUpDate ?? "",
    a.receiptId ?? "",
    a.source,
    a.notes,
  ]);
  // BOM so Excel opens UTF-8 (Tamil/Hindi notes) correctly.
  return "\uFEFF" + [CSV_HEADERS, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}
