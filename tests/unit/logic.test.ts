// Unit tests for JobPilot's pure logic (node --test, no extra packages).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { JOBS, JOB_BY_ID } from "../../src/lib/data/jobs.ts";
import { COMPANIES } from "../../src/lib/data/companies.ts";
import { canonicalSkill, extractSkills } from "../../src/lib/data/skills.ts";
import { getForm, formFields, validateAnswers } from "../../src/lib/forms.ts";
import { matchJob } from "../../src/lib/match.ts";
import { autofill, noticeLabel, experienceRange, degreeOption } from "../../src/lib/autofill.ts";
import { parseResumeText } from "../../src/lib/resume.ts";
import { extractText } from "../../src/lib/extract.ts";
import { portalState, makeReceipt, SPEEDS } from "../../src/lib/portal.ts";
import { DEMO_PROFILE, demoApplications } from "../../src/lib/demo.ts";
import { computeStats, toCsv } from "../../src/lib/stats.ts";
import { computeReminders } from "../../src/lib/reminders.ts";
import { buildSummaryPdf } from "../../src/lib/pdf.ts";

test("job board has 40+ jobs with unique ids at fictional companies", () => {
  assert.ok(JOBS.length >= 40, `only ${JOBS.length} jobs`);
  assert.equal(new Set(JOBS.map((j) => j.id)).size, JOBS.length);
  for (const j of JOBS) {
    assert.ok(j.title && j.companyName && j.location && j.description.length > 80, j.id);
    assert.ok(j.skills.length >= 4 && j.salaryMax >= j.salaryMin, j.id);
  }
  assert.ok(COMPANIES.length >= 10);
});

test("forms differ per company and include custom questions", () => {
  const signatures = new Set(COMPANIES.map((c) => {
    const job = JOBS.find((j) => j.companyId === c.id)!;
    return formFields(getForm(job)).map((f) => f.id).join(",");
  }));
  assert.ok(signatures.size >= 8, `only ${signatures.size} distinct forms`);
  for (const j of JOBS) {
    const ids = formFields(getForm(j)).map((f) => f.id);
    assert.ok(ids.includes("email") && ids.includes("resume") && ids.includes("coverLetter"));
    assert.ok(formFields(getForm(j)).filter((f) => f.custom).length >= 3);
  }
});

test("skill aliases normalise and extract", () => {
  assert.equal(canonicalSkill("reactjs"), "React");
  assert.equal(canonicalSkill("NodeJS"), "Node.js");
  const s = extractSkills("Built apps with ReactJS, node.js, Postgres and Docker. Learning Go.");
  for (const k of ["React", "Node.js", "PostgreSQL", "Docker", "Go"]) assert.ok(s.includes(k), k);
  assert.ok(!extractSkills("I want to go home").includes("Go"));
});

test("match score: frontend profile ranks frontend jobs high and lists missing skills", () => {
  const fe = matchJob(JOBS[0], DEMO_PROFILE);
  assert.ok(fe.score >= 80, `frontend score ${fe.score}`);
  const fin = matchJob(JOBS.find((j) => j.title.includes("Financial"))!, DEMO_PROFILE);
  assert.ok(fin.score < 40, `finance score ${fin.score}`);
  assert.ok(fin.missing.includes("Financial Modeling"));
  assert.ok(fe.score >= 0 && fe.score <= 100);
});

test("auto-fill fills every required field of every form for the demo profile", () => {
  for (const j of JOBS) {
    const form = getForm(j);
    const r = autofill(form, j, DEMO_PROFILE, Date.UTC(2026, 9, 1));
    assert.deepEqual(r.missing, [], `${j.id} missing ${r.missing}`);
    assert.deepEqual(validateAnswers(form, r.answers), {}, j.id);
    assert.ok(r.answers.coverLetter.includes(j.companyName) && r.answers.coverLetter.includes(j.title));
  }
  assert.equal(noticeLabel(0), "Immediate");
  assert.equal(noticeLabel(45), "30 days");
  assert.equal(experienceRange(3), "3-5 years");
  assert.equal(degreeOption("B.E. Computer Science"), "B.E. / B.Tech");
  assert.equal(degreeOption("MBA Finance"), "MBA");
});

test("validation catches bad email / phone / missing required", () => {
  const form = getForm(JOBS[0]);
  const e = validateAnswers(form, { email: "nope", phone: "12" });
  assert.equal(e.email, "email");
  assert.equal(e.phone, "phone");
  assert.equal(e.fullName, "required");
});

test("resume parsing from PDF and DOCX samples", () => {
  for (const f of ["sample-resume.pdf", "sample-resume.docx"]) {
    const buf = readFileSync(new URL(`../../public/samples/${f}`, import.meta.url));
    const p = parseResumeText(extractText(buf, f), f);
    assert.equal(p.fullName, "Ananya Raman", f);
    assert.equal(p.email, "ananya.raman@example.com");
    assert.equal(p.location, "Chennai");
    assert.equal(p.totalExperience, 3);
    assert.equal(p.experience?.[0].company, "Bluefin Apps", f);
    assert.equal(p.education?.[0].institution, "Anna University");
    assert.ok(p.skills!.includes("React") && p.skills!.includes("TypeScript"));
  }
  assert.throws(() => extractText(Buffer.from("hello"), "x.png"));
});

test("portal simulation progresses Applied -> Viewed -> decision deterministically", () => {
  const t0 = 1_700_000_000_000;
  const r = makeReceipt("job", t0);
  assert.match(r, /^JH-/);
  assert.equal(portalState(r, t0, 80, "fast", t0).status, "applied");
  assert.equal(portalState(r, t0, 80, "fast", t0 + SPEEDS.fast.viewed * 1.6).status, "viewed");
  const end = portalState(r, t0, 80, "fast", t0 + SPEEDS.fast.final * 2);
  assert.ok(end.final && (end.status === "offer" || end.status === "rejected"));
  assert.deepEqual(portalState(r, t0, 80, "fast", t0 + 999_999), portalState(r, t0, 80, "fast", t0 + 999_999));
  const times = end.timeline.map((e) => e.at);
  assert.deepEqual(times, [...times].sort((a, b) => a - b));
});

test("demo data, stats, reminders, CSV and PDF", () => {
  const now = Date.now();
  const apps = demoApplications(now);
  const s = computeStats(apps, now);
  assert.equal(s.total, 12);
  assert.equal(s.saved, 2);
  assert.ok(s.offers >= 1 && s.interviews >= 3);
  assert.ok(s.responseRate > 0 && s.responseRate <= 100);
  assert.equal(s.perWeek.length, 8);
  assert.equal(s.perWeek.reduce((a, w) => a + w.count, 0), s.total - apps.filter((a) => a.submittedAt && a.submittedAt < new Date(s.perWeek[0].week).getTime()).length);
  assert.ok(s.missingSkills.length > 0);
  const rem = computeReminders(apps, now);
  assert.ok(rem.some((r) => r.kind === "interview"));
  const csv = toCsv(apps);
  assert.ok(csv.startsWith("\uFEFFCompany,Role"));
  assert.equal(csv.trim().split("\r\n").length, apps.length + 1);
  const evil = toCsv([{ ...apps[0], notes: '=HYPERLINK("x")' }]);
  assert.ok(evil.includes(`"'=HYPERLINK(""x"")"`));
  const pdf = Buffer.from(buildSummaryPdf(apps, { name: "Ananya Raman", now }));
  assert.equal(pdf.subarray(0, 8).toString(), "%PDF-1.4");
  assert.ok(pdf.toString("latin1").includes("%%EOF"));
  // Survives non-Latin text.
  const pdf2 = Buffer.from(buildSummaryPdf([{ ...apps[0], company: "தமிழ் Co (test)" }], { name: "दिव्या" }));
  assert.ok(pdf2.length > 1000);
  assert.ok(JOB_BY_ID[apps[0].jobId]);
});
