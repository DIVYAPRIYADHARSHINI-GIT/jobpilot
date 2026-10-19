// GET /api/portal/jobs/:id  -> one JobHub listing with its company.
import { json } from "@/lib/api";
import { JOB_BY_ID } from "@/lib/data/jobs";
import { COMPANY_BY_ID } from "@/lib/data/companies";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const job = JOB_BY_ID[id];
  if (!job) return json({ error: "jobNotFound" }, 404);
  return json({ job, company: COMPANY_BY_ID[job.companyId] });
}
