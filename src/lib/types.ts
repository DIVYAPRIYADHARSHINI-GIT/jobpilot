// Shared data model for JobPilot (client + API routes). Pure types only.

export type Stage = "saved" | "applied" | "interview" | "offer" | "rejected";
export const STAGES: Stage[] = ["saved", "applied", "interview", "offer", "rejected"];

/** Status reported by the mock JobHub portal. */
export type PortalStatus = "applied" | "viewed" | "interview" | "offer" | "rejected";

export type WorkMode = "Onsite" | "Hybrid" | "Remote";
export type JobType = "Full-time" | "Contract" | "Internship";
export type SimSpeed = "fast" | "realistic";

export interface Education {
  degree: string;
  institution: string;
  year: string;
  score: string;
}

export interface Experience {
  title: string;
  company: string;
  start: string;
  end: string;
  description: string;
}

export interface Preferences {
  roles: string[];
  locations: string[];
  remoteOk: boolean;
  jobTypes: JobType[];
  /** Minimum acceptable salary, lakhs per annum (LPA). */
  minSalary: number;
  expectedSalary: number;
  noticePeriodDays: number;
  willingToRelocate: boolean;
}

export interface Profile {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  headline: string;
  summary: string;
  linkedin: string;
  github: string;
  portfolio: string;
  languages: string;
  totalExperience: number;
  currentSalary: number;
  workAuthorization: "Yes" | "No";
  skills: string[];
  education: Education[];
  experience: Experience[];
  preferences: Preferences;
  resumeFileName: string;
  updatedAt: number;
}

export interface CompanyLogo {
  c1: string;
  c2: string;
  shape: "circle" | "hex" | "square" | "diamond" | "leaf" | "wave" | "triangle";
}

export interface Company {
  id: string;
  name: string;
  industry: string;
  city: string;
  size: string;
  about: string;
  logo: CompanyLogo;
  formVariant: 0 | 1 | 2 | 3;
  questions: QuestionKey[];
}

export interface Job {
  id: string;
  companyId: string;
  companyName: string;
  title: string;
  category: string;
  location: string;
  city: string;
  workMode: WorkMode;
  type: JobType;
  salaryMin: number;
  salaryMax: number;
  expMin: number;
  expMax: number;
  skills: string[];
  niceToHave: string[];
  description: string;
  responsibilities: string[];
  postedDaysAgo: number;
  officeImage: number;
}

export type QuestionKey =
  | "why_company"
  | "relocate"
  | "remote"
  | "portfolio"
  | "project"
  | "start_date"
  | "work_auth"
  | "degree"
  | "source"
  | "strength"
  | "shift"
  | "languages";

export type FieldType = "text" | "email" | "tel" | "number" | "textarea" | "select" | "file" | "date" | "url";

export interface FormField {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: string[];
  placeholder?: string;
  help?: string;
  custom?: boolean;
  maxLength?: number;
}

export interface FormSection {
  title: string;
  fields: FormField[];
}

export interface AppForm {
  jobId: string;
  companyId: string;
  variant: number;
  heading: string;
  sections: FormSection[];
}

export interface MatchResult {
  jobId: string;
  score: number;
  matched: string[];
  missing: string[];
  breakdown: { skills: number; experience: number; preferences: number };
  reasons: string[];
}

export interface TimelineEvent {
  status: PortalStatus | Stage;
  at: number;
}

export interface Application {
  id: string;
  jobId: string;
  companyId: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  stage: Stage;
  portalStatus?: PortalStatus;
  receiptId?: string;
  savedAt: number;
  submittedAt?: number;
  updatedAt: number;
  matchScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  source: "manual" | "auto" | "demo";
  answers?: Record<string, string>;
  notes: string;
  interviewDate?: string;
  followUpDate?: string;
  timeline: TimelineEvent[];
  /** The user moved the card by hand: portal updates no longer move it. */
  manualStage?: boolean;
}

export interface Settings {
  autoApply: { enabled: boolean; minScore: number; dailyLimit: number };
  simSpeed: SimSpeed;
}

export interface AppNotification {
  id: string;
  kind: "status" | "followup" | "interview";
  appId: string;
  status?: PortalStatus;
  company: string;
  title: string;
  at: number;
  date?: string;
}
