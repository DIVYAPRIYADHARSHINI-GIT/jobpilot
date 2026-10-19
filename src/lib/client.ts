"use client";
// Client-side calls to the JobPilot API routes, with timeouts so the UI can
// never hang on a slow request, and a memoised match hook.
import { useEffect, useMemo, useState } from "react";
import type { Job, MatchResult, Profile } from "./types";
import type { AutofillResult } from "./autofill";
import type { AppForm } from "./types";
import { JOBS } from "./data/jobs";
import { matchAll, matchJob } from "./match";

export class ApiError extends Error {
  status: number;
  data: Record<string, unknown>;
  constructor(status: number, data: Record<string, unknown>) {
    super(String(data.error ?? status));
    this.status = status;
    this.data = data;
  }
}

export async function api<T>(path: string, init: RequestInit & { timeoutMs?: number } = {}): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), init.timeoutMs ?? 12_000);
  try {
    const res = await fetch(path, { ...init, signal: ctrl.signal });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) throw new ApiError(res.status, data);
    return data as T;
  } finally {
    clearTimeout(timer);
  }
}

export const postJson = <T,>(path: string, body: unknown, timeoutMs?: number) =>
  api<T>(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), timeoutMs });

export function parseResume(file: File) {
  const fd = new FormData();
  fd.append("file", file);
  return api<{ profile: Partial<Profile>; chars: number }>("/api/parse-resume", { method: "POST", body: fd, timeoutMs: 20_000 });
}

export const fetchAutofill = (profile: Profile, jobId: string) => postJson<AutofillResult & { form: AppForm; match: MatchResult }>("/api/autofill", { profile, jobId });

export const submitApplication = (jobId: string, answers: Record<string, string>) =>
  postJson<{ ok: true; receiptId: string; submittedAt: number; status: "applied" }>("/api/portal/submit", { jobId, answers }, 15_000);

/**
 * Match scores for all jobs. Computed instantly on the client (same pure
 * module), then confirmed by /api/match. Memoised on the profile object, so it
 * only recomputes when the saved profile changes.
 */
export function useMatches(profile: Profile | null): Record<string, MatchResult> | null {
  const local = useMemo(() => (profile ? matchAll(JOBS, profile) : null), [profile]);
  const [remote, setRemote] = useState<{ for: Profile; results: Record<string, MatchResult> } | null>(null);
  useEffect(() => {
    if (!profile) return;
    let alive = true;
    postJson<{ results: Record<string, MatchResult> }>("/api/match", { profile }, 8000)
      .then((r) => alive && setRemote({ for: profile, results: r.results }))
      .catch(() => {
        /* local scores are already shown */
      });
    return () => {
      alive = false;
    };
  }, [profile]);
  if (!profile) return null;
  return remote && remote.for === profile ? remote.results : local;
}

export function useMatch(profile: Profile | null, job: Job | undefined): MatchResult | null {
  return useMemo(() => (profile && job ? matchJob(job, profile) : null), [profile, job]);
}
