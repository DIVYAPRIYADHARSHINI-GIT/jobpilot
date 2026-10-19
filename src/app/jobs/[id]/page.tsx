// Job detail route (server): pre-renders every JobHub job; unknown ids 404.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JOBS, JOB_BY_ID } from "@/lib/data/jobs";
import { JobDetailView } from "@/components/pages/JobDetailView";

export const dynamicParams = false;
export const generateStaticParams = () => JOBS.map((j) => ({ id: j.id }));

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const job = JOB_BY_ID[(await params).id];
  return job ? { title: `${job.title} at ${job.companyName}`, description: job.description.slice(0, 160) } : {};
}

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!JOB_BY_ID[id]) notFound();
  return <JobDetailView id={id} />;
}
