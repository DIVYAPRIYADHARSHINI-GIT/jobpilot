// GET /api/portal/jobs  -> all JobHub listings + companies (mock portal).

import { JOBS } from "@/lib/data/jobs";
import { COMPANIES } from "@/lib/data/companies";

export const dynamic = "force-static";

export function GET() {
  return Response.json({ jobs: JOBS, companies: COMPANIES, count: JOBS.length }, { headers: { "Cache-Control": "public, max-age=300" } });
}

