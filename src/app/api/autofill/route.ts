// POST /api/autofill  { profile, jobId }
// Maps the profile onto this company's JobHub form, answers the custom
// questions and generates a cover letter from the job description.
import { handleError, InputError, json, readJson, sanitizeProfile } from "@/lib/api";
import { JOB_BY_ID } from "@/lib/data/jobs";
import { getForm } from "@/lib/forms";
import { autofill } from "@/lib/autofill";
import { matchJob } from "@/lib/match";

export async function POST(req: Request) {
  try {
    const body = await readJson<{ profile?: unknown; jobId?: unknown }>(req);
    const job = JOB_BY_ID[String(body.jobId ?? "")];
    if (!job) throw new InputError("jobNotFound", 404);
    const profile = sanitizeProfile(body.profile);
    const form = getForm(job);
    return json({ form, match: matchJob(job, profile), ...autofill(form, job, profile) });
  } catch (e) {
    return handleError(e);
  }
}
