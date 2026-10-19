// Mock JobHub portal simulation. A submission gets a receipt id; its status
// timeline (Applied -> Viewed -> Interview -> Offer/Rejected) is derived
// deterministically from the receipt, submit time, match score and sim speed,
// so the API stays stateless (works on Vercel without a database).
import type { PortalStatus, SimSpeed, Stage, TimelineEvent } from "./types.ts";

export function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function makeReceipt(jobId: string, now: number, salt = ""): string {
  return `JH-${now.toString(36).toUpperCase()}-${hash(`${jobId}|${now}|${salt}`).toString(36).toUpperCase().padStart(7, "0").slice(0, 7)}`;
}

const MIN = 60_000;
const DAY = 86_400_000;
/** Base delays after submission: viewed, decision (interview/rejected), final (offer/rejected). */
export const SPEEDS: Record<SimSpeed, { viewed: number; decision: number; final: number }> = {
  fast: { viewed: 0.3 * MIN, decision: 1 * MIN, final: 2 * MIN },
  realistic: { viewed: 1 * DAY, decision: 4 * DAY, final: 10 * DAY },
};

export interface PortalState {
  status: PortalStatus;
  timeline: TimelineEvent[];
  interviewDate?: string;
  final: boolean;
}

const pad = (n: number) => String(n).padStart(2, "0");
/** yyyy-mm-ddT11:00 two days after the interview invite (local "datetime-local" format). */
function interviewSlot(at: number): string {
  const d = new Date(at + 2 * DAY);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T11:00`;
}

export function portalState(receiptId: string, submittedAt: number, score: number, speed: SimSpeed, now: number): PortalState {
  const h = hash(receiptId);
  const base = SPEEDS[speed] ?? SPEEDS.fast;
  const jitter = (shift: number) => 1 + ((h >>> shift) % 50) / 100;
  const viewedAt = submittedAt + base.viewed * jitter(0);
  const decisionAt = Math.max(viewedAt + 1000, submittedAt + base.decision * jitter(5));
  const finalAt = Math.max(decisionAt + 1000, submittedAt + base.final * jitter(10));
  const interviewChance = Math.max(15, Math.min(90, Math.round(score * 0.9)));
  const getsInterview = h % 100 < interviewChance;
  const getsOffer = (h >>> 16) % 100 < 55;

  const timeline: TimelineEvent[] = [{ status: "applied", at: submittedAt }];
  let status: PortalStatus = "applied";
  let interviewDate: string | undefined;
  if (now >= viewedAt) {
    status = "viewed";
    timeline.push({ status, at: Math.round(viewedAt) });
  }
  if (now >= decisionAt) {
    status = getsInterview ? "interview" : "rejected";
    timeline.push({ status, at: Math.round(decisionAt) });
    if (getsInterview) interviewDate = interviewSlot(decisionAt);
  }
  if (getsInterview && now >= finalAt) {
    status = getsOffer ? "offer" : "rejected";
    timeline.push({ status, at: Math.round(finalAt) });
  }
  return { status, timeline, interviewDate, final: status === "offer" || status === "rejected" };
}

export function stageForStatus(s: PortalStatus): Stage {
  return s === "viewed" || s === "applied" ? "applied" : s;
}

export const isFinal = (s?: PortalStatus) => s === "offer" || s === "rejected";
