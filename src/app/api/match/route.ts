// POST /api/match  { profile, jobIds?: string[] }
// Returns { results: { [jobId]: MatchResult } } for all (or the given) JobHub jobs.
import { handleError, InputError, json, readJson, sanitizeProfile } from "@/lib/api";
import { JOBS, JOB_BY_ID } from "@/lib/data/jobs";
import { matchAll } from "@/lib/match";

export async function POST(req: Request) {
  try {
    const body = await readJson<{ profile?: unknown; jobIds?: unknown }>(req);
    const profile = sanitizeProfile(body.profile);
    let jobs = JOBS;
    if (Array.isArray(body.jobIds)) {
      jobs = body.jobIds.map((id) => JOB_BY_ID[String(id)]).filter(Boolean);
      if (!jobs.length) throw new InputError("noJobs");
    }
    return json({ results: matchAll(jobs, profile) });
  } catch (e) {
    return handleError(e);
  }
}
