// Demo profile + a realistic tracker history (6 weeks of applications) so the
// dashboard, tracker, reminders and exports have something to show instantly.
import type { Application, PortalStatus, Profile, Stage, TimelineEvent } from "./types.ts";
import { JOBS, formatSalary } from "./data/jobs.ts";
import { matchJob } from "./match.ts";
import { makeReceipt } from "./portal.ts";

export const DEMO_PROFILE: Profile = {
  fullName: "Ananya Raman",
  email: "ananya.raman@example.com",
  phone: "+91 98765 43210",
  location: "Chennai",
  headline: "Frontend Developer",
  summary: "Frontend developer with 3 years of experience building fast, accessible web apps with React, TypeScript and Next.js.",
  linkedin: "https://linkedin.com/in/ananya-raman-demo",
  github: "https://github.com/ananya-demo",
  portfolio: "https://ananya-demo.example.com",
  languages: "English, Tamil, Hindi",
  totalExperience: 3,
  currentSalary: 9,
  workAuthorization: "Yes",
  skills: ["React", "TypeScript", "JavaScript", "Next.js", "HTML", "CSS", "Tailwind CSS", "Redux", "Jest", "Git", "REST APIs", "Figma", "Node.js"],
  education: [{ degree: "B.E. Computer Science", institution: "Anna University", year: "2021", score: "8.4 CGPA" }],
  experience: [
    { title: "Frontend Developer", company: "Bluefin Apps", start: "2023", end: "Present", description: "Built a React and TypeScript design system used by 6 product teams and cut page load time by 35%." },
    { title: "Junior Web Developer", company: "Sunrise Digital", start: "2021", end: "2022", description: "Developed responsive marketing sites with HTML, CSS, JavaScript and Tailwind CSS." },
  ],
  preferences: { roles: ["Frontend Developer", "Full Stack Engineer"], locations: ["Chennai", "Bengaluru"], remoteOk: true, jobTypes: ["Full-time", "Contract"], minSalary: 8, expectedSalary: 14, noticePeriodDays: 30, willingToRelocate: false },
  resumeFileName: "ananya-raman-resume.pdf",
  updatedAt: 0,
};

const DAY = 86_400_000;

// [job index, days ago submitted (null = saved only), final stage]
const PLAN: Array<[number, number | null, Stage]> = [
  [0, 38, "rejected"],
  [17, 35, "interview"],
  [37, 33, "offer"],
  [2, 29, "applied"],
  [4, 26, "rejected"],
  [21, 22, "interview"],
  [33, 19, "applied"],
  [40, 15, "rejected"],
  [12, 12, "applied"],
  [28, 8, "interview"],
  [5, 5, "applied"],
  [34, 2, "applied"],
  [10, null, "saved"],
  [26, null, "saved"],
];

const pad = (n: number) => String(n).padStart(2, "0");
const localDate = (t: number) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export function demoApplications(now = Date.now()): Application[] {
  return PLAN.map(([jobIdx, ago, stage], k) => {
    const job = JOBS[jobIdx];
    const m = matchJob(job, DEMO_PROFILE);
    const savedAt = now - ((ago ?? 3) + 1) * DAY;
    const submittedAt = ago === null ? undefined : now - ago * DAY;
    const timeline: TimelineEvent[] = [{ status: "saved", at: savedAt }];
    let portalStatus: PortalStatus | undefined;
    let interviewDate: string | undefined;
    if (submittedAt) {
      timeline.push({ status: "applied", at: submittedAt });
      portalStatus = "applied";
      if (ago! > 1) {
        timeline.push({ status: "viewed", at: submittedAt + DAY });
        portalStatus = "viewed";
      }
      if (stage === "interview" || stage === "offer") {
        timeline.push({ status: "interview", at: submittedAt + 4 * DAY });
        portalStatus = "interview";
        // Upcoming interviews for the active ones, past for the offer.
        interviewDate = stage === "interview" ? `${localDate(now + (k % 3 + 1) * DAY)}T${pad(10 + (k % 5))}:30` : `${localDate(submittedAt + 8 * DAY)}T11:00`;
      }
      if (stage === "offer") {
        timeline.push({ status: "offer", at: submittedAt + 14 * DAY });
        portalStatus = "offer";
      }
      if (stage === "rejected") {
        timeline.push({ status: "rejected", at: submittedAt + 6 * DAY });
        portalStatus = "rejected";
      }
    }
    return {
      id: `demo-${k + 1}`,
      jobId: job.id,
      companyId: job.companyId,
      title: job.title,
      company: job.companyName,
      location: job.location,
      salary: formatSalary(job),
      stage,
      portalStatus,
      // Demo receipts use a fixed prefix so the portal simulator leaves them alone.
      receiptId: submittedAt ? `DEMO-${makeReceipt(job.id, submittedAt).slice(3)}` : undefined,
      savedAt,
      submittedAt,
      updatedAt: timeline[timeline.length - 1].at,
      matchScore: m.score,
      matchedSkills: m.matched,
      missingSkills: m.missing,
      source: "demo",
      notes: stage === "interview" ? "Prep: system design basics, React performance, past projects." : stage === "offer" ? "Offer: 15 LPA + benefits. Reply by Friday." : "",
      interviewDate,
      followUpDate: stage === "applied" && submittedAt ? localDate(submittedAt + 7 * DAY) : undefined,
      timeline,
      manualStage: false,
    } satisfies Application;
  });
}
