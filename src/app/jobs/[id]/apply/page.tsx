// Apply route (server): pre-renders the JobHub form page for every job.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JOBS, JOB_BY_ID } from "@/lib/data/jobs";
import { ApplyView } from "@/components/pages/ApplyView";

export const dynamicParams = false;
export const generateStaticParams = () => JOBS.map((j) => ({ id: j.id }));

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const job = JOB_BY_ID[(await params).id];
  return job ? { title: `Apply: ${job.title} at ${job.companyName}` } : {};
}

export default async function ApplyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!JOB_BY_ID[id]) notFound();
  return <ApplyView id={id} />;
}
