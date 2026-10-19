// POST /api/portal/submit  { jobId, answers, score?, source? }
// Mock JobHub submission: validates answers against the company form and
// returns a receipt. Nothing leaves the app; the client stores the record.
import { handleError, InputError, json, readJson } from "@/lib/api";
import { JOB_BY_ID } from "@/lib/data/jobs";
import { getForm, validateAnswers } from "@/lib/forms";
import { makeReceipt } from "@/lib/portal";

export async function POST(req: Request) {
  try {
    const body = await readJson<{ jobId?: unknown; answers?: unknown }>(req, 100_000);
    const job = JOB_BY_ID[String(body.jobId ?? "")];
    if (!job) throw new InputError("jobNotFound", 404);
    if (!body.answers || typeof body.answers !== "object") throw new InputError("badAnswers");
    const answers: Record<string, string> = {};
    for (const [k, v] of Object.entries(body.answers as Record<string, unknown>).slice(0, 60)) answers[k.slice(0, 40)] = String(v ?? "").slice(0, 4000);
    const errors = validateAnswers(getForm(job), answers);
    if (Object.keys(errors).length) return json({ error: "validation", errors }, 422);
    const submittedAt = Date.now();
    const receiptId = makeReceipt(job.id, submittedAt, answers.email ?? "");
    // Simulated network latency of a real career site.
    await new Promise((r) => setTimeout(r, 250));
    return json({ ok: true, receiptId, submittedAt, status: "applied", company: job.companyName, title: job.title });
  } catch (e) {
    return handleError(e);
  }
}
