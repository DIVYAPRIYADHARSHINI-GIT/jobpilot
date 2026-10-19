// Derived reminders (not stored): follow-ups that are due and interviews in
// the next 7 days (or today). Pure so it can be unit tested.
import type { Application } from "./types.ts";

export interface Reminder {
  id: string;
  kind: "followup" | "interview";
  appId: string;
  company: string;
  title: string;
  date: string;
  /** Sort key (ms). */
  at: number;
  due: boolean;
}

const DAY = 86_400_000;

function parseLocal(d: string): number {
  const t = new Date(d.length === 10 ? `${d}T09:00:00` : d).getTime();
  return Number.isNaN(t) ? NaN : t;
}

export function computeReminders(apps: Application[], now = Date.now()): Reminder[] {
  const out: Reminder[] = [];
  for (const a of apps) {
    if (a.interviewDate && a.stage !== "rejected" && a.stage !== "offer") {
      const at = parseLocal(a.interviewDate);
      if (!Number.isNaN(at) && at >= now - 6 * 3600_000 && at <= now + 7 * DAY) {
        out.push({ id: `iv-${a.id}-${a.interviewDate}`, kind: "interview", appId: a.id, company: a.company, title: a.title, date: a.interviewDate, at, due: at - now < DAY });
      }
    }
    if (a.followUpDate && a.stage === "applied") {
      const at = parseLocal(a.followUpDate);
      if (!Number.isNaN(at) && at <= now + 2 * DAY) {
        out.push({ id: `fu-${a.id}-${a.followUpDate}`, kind: "followup", appId: a.id, company: a.company, title: a.title, date: a.followUpDate, at, due: at <= now });
      }
    }
  }
  return out.sort((x, y) => x.at - y.at);
}
