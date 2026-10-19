// GET /api/portal/forms/:jobId  -> the company-specific JobHub application form.
import { json } from "@/lib/api";
import { JOB_BY_ID } from "@/lib/data/jobs";
import { getForm } from "@/lib/forms";

export async function GET(_req: Request, ctx: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await ctx.params;
  const job = JOB_BY_ID[jobId];
  if (!job) return json({ error: "jobNotFound" }, 404);
  return json({ form: getForm(job) });
}
