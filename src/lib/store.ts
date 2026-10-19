"use client";
// localStorage-backed app store (profile, applications, settings, notifications).
// A single module-level snapshot + useSyncExternalStore: snapshots only change
// on writes, so components never re-render in a loop.
import { useSyncExternalStore } from "react";
import type { AppNotification, Application, Job, MatchResult, PortalStatus, Profile, Settings, Stage, TimelineEvent } from "./types";
import { formatSalary } from "./data/jobs";
import { stageForStatus } from "./portal";
import { DEMO_PROFILE, demoApplications } from "./demo";

export const KEYS = {
  profile: "jobpilot.profile.v1",
  apps: "jobpilot.apps.v1",
  settings: "jobpilot.settings.v1",
  notifications: "jobpilot.notifications.v1",
  read: "jobpilot.read.v1",
} as const;

export interface AppState {
  profile: Profile | null;
  apps: Application[];
  settings: Settings;
  notifications: AppNotification[];
  read: string[];
}

export const DEFAULT_SETTINGS: Settings = { autoApply: { enabled: false, minScore: 75, dailyLimit: 5 }, simSpeed: "fast" };

const SERVER_STATE: AppState = { profile: null, apps: [], settings: DEFAULT_SETTINGS, notifications: [], read: [] };

let state: AppState | null = null;
const listeners = new Set<() => void>();

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const v = JSON.parse(raw);
    return v ?? fallback;
  } catch {
    return fallback;
  }
}

function load(): AppState {
  if (typeof window === "undefined") return SERVER_STATE;
  const s = readJson<Partial<Settings>>(KEYS.settings, {});
  const apps = readJson<Application[]>(KEYS.apps, []);
  return {
    profile: readJson<Profile | null>(KEYS.profile, null),
    apps: Array.isArray(apps) ? apps.filter((a) => a && a.id && a.jobId) : [],
    settings: { ...DEFAULT_SETTINGS, ...s, autoApply: { ...DEFAULT_SETTINGS.autoApply, ...(s.autoApply ?? {}) } },
    notifications: readJson<AppNotification[]>(KEYS.notifications, []),
    read: readJson<string[]>(KEYS.read, []),
  };
}

function getState(): AppState {
  if (!state) state = load();
  return state;
}

function persist(key: keyof AppState, value: unknown) {
  try {
    localStorage.setItem(KEYS[key], JSON.stringify(value));
  } catch {
    /* quota / private mode: keep in memory */
  }
}

export function setState(patch: Partial<AppState> | ((s: AppState) => Partial<AppState>)) {
  const cur = getState();
  const p = typeof patch === "function" ? patch(cur) : patch;
  const keys = Object.keys(p) as (keyof AppState)[];
  if (keys.length === 0) return;
  state = { ...cur, ...p };
  for (const k of keys) persist(k, state[k]);
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => {
    if (e.key && Object.values(KEYS).includes(e.key as (typeof KEYS)[keyof typeof KEYS])) {
      state = load();
      l();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", onStorage);
  };
}

export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, getState, () => SERVER_STATE);
}

const noop = () => () => {};
/** false during SSR/hydration, true after: use to show loading skeletons. */
export function useHydrated() {
  return useSyncExternalStore(noop, () => true, () => false);
}

export const peekState = () => getState();

/* -------------------------------- actions -------------------------------- */

const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
const dayKey = (t: number) => new Date(t).toISOString().slice(0, 10);
export const addDaysKey = (t: number, days: number) => dayKey(t + days * 86_400_000);

export function saveProfile(p: Profile) {
  setState({ profile: { ...p, updatedAt: Date.now() } });
}

export function updateSettings(patch: Partial<Settings>) {
  setState((s) => ({ settings: { ...s.settings, ...patch, autoApply: { ...s.settings.autoApply, ...(patch.autoApply ?? {}) } } }));
}

function baseApp(job: Job, match: MatchResult | undefined, now: number): Application {
  return {
    id: uid(),
    jobId: job.id,
    companyId: job.companyId,
    title: job.title,
    company: job.companyName,
    location: job.location,
    salary: formatSalary(job),
    stage: "saved",
    savedAt: now,
    updatedAt: now,
    matchScore: match?.score ?? 0,
    matchedSkills: match?.matched ?? [],
    missingSkills: match?.missing ?? [],
    source: "manual",
    notes: "",
    timeline: [{ status: "saved", at: now }],
  };
}

export const appForJob = (apps: Application[], jobId: string) => apps.find((a) => a.jobId === jobId);

export function toggleSaved(job: Job, match?: MatchResult) {
  setState((s) => {
    const existing = appForJob(s.apps, job.id);
    if (existing) {
      if (existing.stage !== "saved") return {};
      return { apps: s.apps.filter((a) => a.id !== existing.id) };
    }
    return { apps: [baseApp(job, match, Date.now()), ...s.apps] };
  });
}

export function recordSubmission(job: Job, match: MatchResult | undefined, answers: Record<string, string>, receiptId: string, submittedAt: number, source: "manual" | "auto") {
  setState((s) => {
    const existing = appForJob(s.apps, job.id);
    const app: Application = {
      ...(existing ?? baseApp(job, match, submittedAt)),
      stage: "applied",
      portalStatus: "applied",
      receiptId,
      submittedAt,
      updatedAt: submittedAt,
      matchScore: match?.score ?? existing?.matchScore ?? 0,
      matchedSkills: match?.matched ?? existing?.matchedSkills ?? [],
      missingSkills: match?.missing ?? existing?.missingSkills ?? [],
      source,
      answers,
      followUpDate: addDaysKey(submittedAt, 7),
    };
    app.timeline = [...(existing?.timeline ?? []), { status: "applied", at: submittedAt }];
    return { apps: [app, ...s.apps.filter((a) => a.id !== app.id)] };
  });
}

export function updateApp(id: string, patch: Partial<Application>) {
  setState((s) => ({ apps: s.apps.map((a) => (a.id === id ? { ...a, ...patch, updatedAt: Date.now() } : a)) }));
}

export function moveApp(id: string, stage: Stage) {
  setState((s) => ({
    apps: s.apps.map((a) => (a.id === id && a.stage !== stage ? { ...a, stage, manualStage: true, updatedAt: Date.now(), timeline: [...a.timeline, { status: stage, at: Date.now() }] } : a)),
  }));
}

export function removeApp(id: string) {
  setState((s) => ({ apps: s.apps.filter((a) => a.id !== id) }));
}

const RANK: Record<Stage, number> = { saved: 0, applied: 1, interview: 2, offer: 3, rejected: 3 };

export interface PortalUpdate {
  receiptId: string;
  status: PortalStatus;
  timeline: TimelineEvent[];
  interviewDate?: string;
}

/** Merge portal status updates; returns the notifications created. */
export function applyPortalUpdates(updates: PortalUpdate[]): AppNotification[] {
  const created: AppNotification[] = [];
  setState((s) => {
    let changed = false;
    const apps = s.apps.map((a) => {
      const u = updates.find((x) => x.receiptId === a.receiptId);
      if (!u || u.status === a.portalStatus) return a;
      changed = true;
      const next = stageForStatus(u.status);
      const moveCard = RANK[next] > RANK[a.stage] && a.stage !== "offer" && a.stage !== "rejected";
      created.push({ id: `st-${a.id}-${u.status}`, kind: "status", appId: a.id, status: u.status, company: a.company, title: a.title, at: u.timeline[u.timeline.length - 1]?.at ?? Date.now() });
      const known = new Set(a.timeline.map((e) => `${e.status}`));
      const extra = u.timeline.filter((e) => e.status !== "applied" && !known.has(e.status));
      return {
        ...a,
        portalStatus: u.status,
        stage: moveCard ? next : a.stage,
        interviewDate: a.interviewDate || u.interviewDate,
        timeline: [...a.timeline, ...extra],
        updatedAt: Date.now(),
      };
    });
    if (!changed) return {};
    return { apps, notifications: [...created, ...s.notifications].slice(0, 60) };
  });
  return created;
}

export function markRead(ids: string[]) {
  setState((s) => {
    const set = new Set(s.read);
    const before = set.size;
    ids.forEach((i) => set.add(i));
    return set.size === before ? {} : { read: [...set].slice(-300) };
  });
}

export function clearNotifications() {
  setState({ notifications: [] });
}

export function loadDemoData() {
  const now = Date.now();
  setState({ profile: { ...DEMO_PROFILE, updatedAt: now }, apps: demoApplications(now), notifications: [], read: [] });
}

export function resetAll() {
  setState({ profile: null, apps: [], notifications: [], read: [], settings: DEFAULT_SETTINGS });
}

/** Auto-applied submissions today (for the daily limit). */
export function autoAppliedToday(apps: Application[], now = Date.now()) {
  const today = dayKey(now);
  return apps.filter((a) => a.source === "auto" && a.submittedAt && dayKey(a.submittedAt) === today).length;
}
