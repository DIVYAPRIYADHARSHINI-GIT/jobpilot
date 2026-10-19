// End-to-end test with the locally installed headless Chrome (no npm deps).
//
//   npm run build && npx next start -p 3300 &
//   caffeinate -dims BASE_URL=http://localhost:3300 node tests/e2e/smoke.mjs
//
// Full flow (resume upload -> profile -> match -> auto-fill -> submit ->
// tracker -> status updates), auto-apply, drag & drop, exports, reminders,
// every page on desktop + mobile + dark mode in English, Tamil and Hindi.
// Short timeouts, a freeze heartbeat and a global watchdog: fail fast, never hang.
import { mkdirSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { launch, sleep } from "./cdp.mjs";

const BASE = (process.env.BASE_URL ?? "http://localhost:3300").replace(/\/$/, "");
const OUT = join(dirname(fileURLToPath(import.meta.url)), "output", process.env.OUT_NAME ?? "local");
const DL = join(OUT, "downloads");
rmSync(DL, { recursive: true, force: true });
mkdirSync(DL, { recursive: true });
const SHOTS = process.env.SHOTS !== "0";
const JOB = "nimbusloop-frontend-developer-1";

const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok: Boolean(ok), detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
}

const { newPage, close } = await launch({ port: Number(process.env.CDP_PORT ?? 9355) });
const WATCHDOG_MS = Number(process.env.E2E_TIMEOUT_MS ?? 5 * 60_000);
const watchdog = setTimeout(async () => {
  console.error(`E2E watchdog: aborting after ${WATCHDOG_MS / 1000}s`);
  await close().catch(() => {});
  process.exit(2);
}, WATCHDOG_MS);
watchdog.unref();

let seq = 0;
/** Fresh page: clean storage (optional), theme, language and a freeze heartbeat. */
async function freshPage({ width = 1366, height = 900, mobile = false, dark = false, lang = "en", clear = true, extra = "" } = {}) {
  const p = await newPage();
  await p.viewport(width, height, mobile);
  const key = `jp-init-${++seq}`;
  await p.addInitScript(`
    try {
      if (!sessionStorage.getItem('${key}')) {
        ${clear ? "localStorage.clear();" : ""}
        sessionStorage.setItem('${key}', '1');
        localStorage.setItem('jobpilot.theme', '${dark ? "dark" : "light"}');
        localStorage.setItem('jobpilot.lang', '${lang}');
      }
    } catch (e) {}
    window.__beat = 0; setInterval(() => { window.__beat++; }, 50);
    ${extra}
  `);
  return p;
}

async function notFrozen(p, label) {
  const a = await p.eval("window.__beat");
  await sleep(500);
  const b = await p.eval("window.__beat");
  check(`${label}: responsive (no freeze)`, b - a >= 5, `${b - a} beats/500ms`);
}
async function shot(p, name) {
  if (SHOTS) await p.screenshot(join(OUT, `${name}.png`)).catch(() => {});
}
async function step(name, fn) {
  try {
    await fn();
  } catch (e) {
    check(name, false, String(e?.message ?? e).split("\n")[0]);
  }
}
const noErrors = (p, label) => check(`${label}: no console errors`, p.errors.length === 0, p.errors.slice(0, 2).join(" | "));
const noHScroll = async (p, label) => check(`${label}: no horizontal overflow`, (await p.eval("document.documentElement.scrollWidth - window.innerWidth")) <= 1, `${await p.eval("document.documentElement.scrollWidth")}px`);

/** Upload a local file into an <input type=file> via a DataTransfer built in-page. */
async function uploadFile(p, selector, path, name, mime) {
  const b64 = readFileSync(path).toString("base64");
  await p.eval(`(() => {
    const bin = atob(${JSON.stringify(b64)}); const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const dt = new DataTransfer(); dt.items.add(new File([bytes], ${JSON.stringify(name)}, { type: ${JSON.stringify(mime)} }));
    const input = document.querySelector(${JSON.stringify(selector)}); input.files = dt.files;
    input.dispatchEvent(new Event('change', { bubbles: true })); return true;
  })()`);
}

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

// ------------------------------------------------------------------ Home + empty states
await step("home", async () => {
  const p = await freshPage();
  await p.goto(`${BASE}/`);
  check("home: brand + tagline in nav", (await p.text("[data-testid=brand]"))?.includes("JobPilot") && (await p.text("[data-testid=tagline]"))?.includes("Apply smarter, not harder."));
  check("home: hero illustration loaded", await p.eval("(() => { const i = [...document.images].find(i => i.src.includes('hero.svg')); return !!i && i.complete && i.naturalWidth > 0; })()"));
  check("home: demo-only notice", (await p.text("[data-testid=demo-notice]"))?.includes("JobHub"));
  await notFrozen(p, "home");
  await shot(p, "01-home");
  await p.goto(`${BASE}/tracker`);
  check("tracker: empty state with illustration", (await p.count("[data-testid=empty-state] img")) === 1);
  await shot(p, "02-tracker-empty");
  await p.goto(`${BASE}/dashboard`);
  check("dashboard: empty state", (await p.count("[data-testid=empty-state]")) === 1);
  await p.goto(`${BASE}/jobs`);
  check("jobs: 40+ job cards", (await p.count("[data-testid=job-card]")) >= 40, String(await p.count("[data-testid=job-card]")));
  check("jobs: profile CTA without profile", (await p.count("[data-testid=profile-cta]")) === 1);
  await p.fill("[data-testid=job-search]", "zzzz-no-such-skill");
  await p.waitFor("document.querySelector('[data-testid=empty-state]')", 3000);
  check("jobs: no-results empty state", true);
  await shot(p, "03-jobs-empty");
  await p.click("[data-testid=clear-filters]");
  await p.waitFor("document.querySelectorAll('[data-testid=job-card]').length >= 40", 3000);
  check("jobs: clear filters restores list", true);
  await p.goto(`${BASE}/jobs/no-such-job`);
  check("unknown job -> 404 page", (await p.text("main"))?.includes("404"));
  noErrors(p, "home/empty");
  await p.close();
});

// ------------------------------------------------------------------ Full flow
await step("full flow", async () => {
  const p = await freshPage();
  await p.goto(`${BASE}/profile`);
  // Resume upload (PDF) -> parsed into the profile.
  await uploadFile(p, "[data-testid=resume-input]", join(ROOT, "public/samples/sample-resume.pdf"), "my-resume.pdf", "application/pdf");
  await p.waitFor("document.querySelector('[data-testid=parse-msg]')", 8000);
  check("profile: PDF resume parsed", (await p.eval("document.querySelector('[data-testid=parse-msg]').dataset.tone")) === "ok", await p.text("[data-testid=parse-msg]"));
  check("profile: name/email filled from resume", (await p.eval("document.querySelector('[data-testid=pf-fullName]').value")) === "Ananya Raman" && (await p.eval("document.querySelector('[data-testid=pf-email]').value")) === "ananya.raman@example.com");
  check("profile: skills parsed", (await p.count("[data-testid=skill-list] > span")) >= 8, String(await p.count("[data-testid=skill-list] > span")));
  check("profile: experience parsed", await p.eval("[...document.querySelectorAll('input')].some(i => i.value === 'Bluefin Apps')"));
  check("profile: resume file name shown", (await p.text("[data-testid=resume-name]")) === "my-resume.pdf");
  // DOCX too.
  await uploadFile(p, "[data-testid=resume-input]", join(ROOT, "public/samples/sample-resume.docx"), "cv.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
  await p.waitFor("document.querySelector('[data-testid=resume-name]')?.innerText === 'cv.docx'", 8000);
  check("profile: DOCX resume parsed", (await p.eval("document.querySelector('[data-testid=parse-msg]').dataset.tone")) === "ok");
  // Bad file type rejected.
  await uploadFile(p, "[data-testid=resume-input]", join(ROOT, "package.json"), "photo.png", "image/png");
  await sleep(200);
  check("profile: wrong file type rejected", (await p.eval("document.querySelector('[data-testid=parse-msg]').dataset.tone")) === "err");
  // Edit: add a skill, then validation on a bad email.
  await p.fill("[data-testid=skill-input]", "Docker");
  await p.click("[data-testid=skill-add]");
  check("profile: skill added manually", await p.eval("[...document.querySelectorAll('[data-testid=skill-list] > span')].some(s => s.innerText.includes('Docker'))"));
  await p.fill("[data-testid=pf-email]", "not-an-email");
  await p.click("[data-testid=save-profile]");
  check("profile: invalid email blocks save", !(await p.eval("localStorage.getItem('jobpilot.profile.v1')")));
  await p.fill("[data-testid=pf-email]", "ananya.raman@example.com");
  await p.fill("[data-testid=pf-expected]", "14");
  await shot(p, "10-profile-parsed");
  await p.click("[data-testid=save-profile]");
  await p.waitFor("location.pathname === '/jobs'", 5000);
  check("profile: saved -> redirected to JobHub", await p.eval("!!JSON.parse(localStorage.getItem('jobpilot.profile.v1')).skills.includes('Docker')"));
  // Match scores.
  await p.waitFor("document.querySelectorAll('[data-testid=match-ring]').length >= 40", 5000);
  const scores = await p.eval("[...document.querySelectorAll('[data-testid=job-card] [data-testid=match-ring]')].map(e => Number(e.dataset.score))");
  check("jobs: match score on every card", scores.length >= 40 && scores.every((s) => s >= 0 && s <= 100));
  check("jobs: sorted by best match", scores.every((s, i) => i === 0 || scores[i - 1] >= s), scores.slice(0, 5).join(","));
  await p.fill("[data-testid=min-match]", "80");
  await sleep(200);
  const filtered = await p.eval("[...document.querySelectorAll('[data-testid=job-card] [data-testid=match-ring]')].map(e => Number(e.dataset.score))");
  check("jobs: min-match filter works", filtered.length > 0 && filtered.length < scores.length && filtered.every((s) => s >= 80), `${filtered.length} jobs`);
  await p.fill("[data-testid=min-match]", "0");
  await shot(p, "11-jobs-matched");
  // Save a job.
  await p.eval("document.querySelectorAll('[data-testid=job-card]')[3].querySelector('[data-testid=save-job]').click()");
  await sleep(150);
  check("jobs: save job -> tracker 'saved'", await p.eval("JSON.parse(localStorage.getItem('jobpilot.apps.v1')).some(a => a.stage === 'saved')"));
  // Job detail.
  await p.goto(`${BASE}/jobs/${JOB}`);
  check("detail: office image", await p.eval("(() => { const i = document.querySelector('[data-testid=office-image]'); return !!i && i.complete && i.naturalWidth > 0; })()"));
  check("detail: matched + missing skills panels", (await p.count("[data-testid=matched-skills] span")) > 0 && (await p.count("[data-testid=missing-skills]")) === 1);
  await shot(p, "12-job-detail");
  // Apply: auto-fill.
  await p.click("[data-testid=apply-now]");
  await p.waitFor("location.pathname.endsWith('/apply') && document.querySelector('[data-testid=autofill]')", 6000);
  await p.click("[data-testid=review-submit]");
  check("apply: empty form shows validation errors", (await p.count("[role=alert]")) >= 5);
  check("apply: no dialog with errors", (await p.count("[data-testid=submit-dialog]")) === 0);
  await p.click("[data-testid=autofill]");
  await p.waitFor("document.querySelectorAll('[data-autofilled=true]').length > 5", 6000);
  const hl = await p.count("[data-autofilled=true]");
  const total = await p.count("[data-testid=apply-form] [data-testid^=field-]");
  check("apply: auto-filled fields highlighted", hl >= 10, `${hl} highlighted / ${total} fields`);
  check("apply: name + email filled", (await p.eval("document.querySelector('[data-testid=field-fullName]').value")) === "Ananya Raman");
  const cover = await p.eval("document.querySelector('[data-testid=field-coverLetter]').value");
  check("apply: tailored cover letter", cover.includes("NimbusLoop") && cover.includes("Frontend Developer") && cover.length > 400, `${cover.length} chars`);
  const why = await p.eval("document.querySelector('[data-testid=field-q_why_company]')?.value ?? ''");
  check("apply: custom question answered", why.includes("NimbusLoop"), why.slice(0, 60));
  check("apply: resume attached", (await p.text("[data-testid=field-resume-name]"))?.includes("cv.docx"));
  await shot(p, "13-apply-autofilled");
  // Edit a field, then submit with confirmation.
  await p.fill("[data-testid=field-expectedSalary]", "15");
  await p.click("[data-testid=review-submit]");
  await p.waitFor("document.querySelector('[data-testid=submit-dialog]')", 3000);
  check("apply: confirmation dialog before submit", (await p.text("[data-testid=submit-dialog]"))?.includes("NimbusLoop"));
  check("apply: nothing stored before confirm", await p.eval("!JSON.parse(localStorage.getItem('jobpilot.apps.v1') || '[]').some(a => a.receiptId)"));
  await shot(p, "14-confirm-dialog");
  await p.click("[data-testid=confirm-submit]");
  await p.waitFor("document.querySelector('[data-testid=apply-success]')", 8000);
  check("apply: success animation", (await p.count("[data-testid=success-animation]")) === 1);
  await sleep(1200);
  check("apply: success check fully drawn", await p.eval("getComputedStyle(document.querySelector('[data-testid=success-animation] .animate-draw')).strokeDashoffset === '0px'"));
  await shot(p, "15-apply-success");
  const app = await p.eval(`JSON.parse(localStorage.getItem('jobpilot.apps.v1')).find(a => a.jobId === '${JOB}')`);
  check("apply: stored with receipt, stage applied", app?.stage === "applied" && /^JH-/.test(app.receiptId) && app.answers.expectedSalary === "15", app?.receiptId);
  // Tracker.
  await p.click("[data-testid=go-tracker]");
  await p.waitFor("document.querySelector('[data-testid=kanban]')", 5000);
  check("tracker: applied card on board", (await p.count("[data-testid=col-applied] [data-testid=kanban-card]")) === 1);
  check("tracker: saved card on board", (await p.count("[data-testid=col-saved] [data-testid=kanban-card]")) === 1);
  // Simulate time: shift submittedAt 3 minutes back so JobHub returns a decision, then poll.
  await p.eval(`(() => { const k='jobpilot.apps.v1'; const a = JSON.parse(localStorage.getItem(k)); a.forEach(x => { if (x.receiptId) x.submittedAt -= 4*60_000; }); localStorage.setItem(k, JSON.stringify(a)); })()`);
  await p.goto(`${BASE}/tracker`);
  await p.waitFor("JSON.parse(localStorage.getItem('jobpilot.apps.v1')).find(a => a.receiptId)?.portalStatus !== 'applied'", 8000);
  const st = await p.eval("JSON.parse(localStorage.getItem('jobpilot.apps.v1')).find(a => a.receiptId)");
  check("portal: simulated status update received", ["offer", "rejected"].includes(st.portalStatus), `${st.portalStatus} / stage ${st.stage}`);
  check("portal: card moved to matching column", st.stage === st.portalStatus);
  check("notifications: bell shows unread count", Number(await p.text("[data-testid=notif-count]")) >= 1);
  await p.click("[data-testid=notif-bell]");
  check("notifications: panel lists status update", (await p.text("[data-testid=notif-panel]"))?.includes("NimbusLoop"));
  await shot(p, "16-notifications");
  await p.click("[data-testid=notif-mark-all]");
  check("notifications: mark all read", (await p.count("[data-testid=notif-count]")) === 0);
  await p.click("[data-testid=notif-bell]");
  noErrors(p, "full flow");
  await notFrozen(p, "tracker");
  await p.close();
});

// ------------------------------------------------------------------ Tracker with demo data: drag & drop, notes, reminders, table, export
await step("tracker", async () => {
  const p = await freshPage();
  await p.goto(`${BASE}/`);
  await p.click("[data-testid=cta-demo]");
  await p.waitFor("location.pathname === '/tracker' && document.querySelectorAll('[data-testid=kanban-card]').length === 14", 6000);
  check("demo data: 14 cards on board", true);
  // Drag & drop: saved -> interview using real DragEvents + DataTransfer.
  const id = await p.eval("document.querySelector('[data-testid=col-saved] [data-testid=kanban-card]').dataset.appId");
  await p.eval(`(() => {
    const card = document.querySelector('[data-app-id="${id}"]'); const col = document.querySelector('[data-testid=col-interview]');
    const dt = new DataTransfer();
    card.dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer: dt }));
    col.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt }));
    col.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }));
    return true; })()`);
  await sleep(250);
  check("kanban: drag & drop moves card", (await p.eval(`document.querySelector('[data-app-id="${id}"]').dataset.stage`)) === "interview");
  check("kanban: move persisted", await p.eval(`JSON.parse(localStorage.getItem('jobpilot.apps.v1')).find(a => a.id === '${id}').stage === 'interview'`));
  // "Move to" select (touch / keyboard alternative).
  await p.fill(`[data-app-id="${id}"] [data-testid=card-move]`, "offer");
  await sleep(150);
  check("kanban: 'Move to' select works", (await p.eval(`document.querySelector('[data-app-id="${id}"]').dataset.stage`)) === "offer");
  await shot(p, "20-kanban");
  // Detail: notes + interview date.
  await p.eval(`document.querySelector('[data-app-id="${id}"] [data-testid=card-open]').click()`);
  await p.waitFor("document.querySelector('[data-testid=app-detail]')", 3000);
  await p.fill("[data-testid=detail-notes]", "Call recruiter Priya on Monday");
  await p.fill("[data-testid=detail-interview]", "2030-01-15T10:30");
  await p.click("[data-testid=detail-close]");
  await sleep(150);
  const saved = await p.eval(`JSON.parse(localStorage.getItem('jobpilot.apps.v1')).find(a => a.id === '${id}')`);
  check("detail: notes + interview date saved", saved.notes.includes("Priya") && saved.interviewDate === "2030-01-15T10:30");
  // Reminders from demo data (upcoming interviews / due follow-ups).
  await p.click("[data-testid=notif-bell]");
  check("reminders: interview + follow-up reminders in bell", (await p.count("[data-testid=reminder-item]")) >= 2, String(await p.count("[data-testid=reminder-item]")));
  await shot(p, "21-reminders");
  await p.click("[data-testid=notif-bell]");
  // Delete with confirmation.
  await p.eval("document.querySelector('[data-testid=col-rejected] [data-testid=card-open]').click()");
  await p.waitFor("document.querySelector('[data-testid=app-detail]')", 3000);
  await p.click("[data-testid=detail-delete]");
  await p.waitFor("document.querySelector('[data-testid=confirm-dialog]')", 2000);
  await p.click("[data-testid=confirm-yes]");
  await sleep(200);
  check("detail: delete after confirmation", (await p.count("[data-testid=kanban-card]")) === 13);
  // Table view: search + filter.
  await p.click("[data-testid=view-table]");
  check("table: 13 rows", (await p.count("[data-testid=table-row]")) === 13);
  await p.fill("[data-testid=table-search]", "Priya");
  await sleep(200);
  check("table: search by notes", (await p.count("[data-testid=table-row]")) === 1);
  await p.fill("[data-testid=table-search]", "");
  await p.fill("[data-testid=table-stage]", "interview");
  await sleep(150);
  const rows = await p.count("[data-testid=table-row]");
  check("table: stage filter", rows >= 1 && rows < 13, String(rows));
  await shot(p, "22-table");
  // Exports.
  await p.setDownloadDir(DL);
  await p.click("[data-testid=export-open]");
  await p.click("[data-testid=export-csv]");
  await p.click("[data-testid=export-open]");
  await p.click("[data-testid=export-pdf]");
  let files = [];
  for (let i = 0; i < 30 && files.filter((f) => !f.endsWith(".crdownload")).length < 2; i++) {
    await sleep(200);
    files = readdirSync(DL);
  }
  const csv = files.find((f) => f.endsWith(".csv"));
  const pdf = files.find((f) => f.endsWith(".pdf"));
  check("export: CSV downloaded", !!csv && readFileSync(join(DL, csv)).toString("utf8").split("\r\n").filter(Boolean).length === 14, csv);
  check("export: PDF downloaded", !!pdf && readFileSync(join(DL, pdf)).subarray(0, 5).toString() === "%PDF-", pdf);
  // Dashboard.
  await p.goto(`${BASE}/dashboard`);
  await p.waitFor("document.querySelector('[data-testid=weekly-chart] svg.recharts-surface')", 6000);
  const kpis = await p.eval("[...document.querySelectorAll('[data-testid=kpi-value]')].map(e => e.innerText)");
  check("dashboard: 4 KPIs", kpis.length === 4, kpis.join(" | "));
  check("dashboard: weekly bars rendered", (await p.count("[data-testid=weekly-chart] .recharts-bar-rectangle")) >= 1);
  check("dashboard: top missing skills", (await p.count("[data-testid=missing-skills-list] li")) >= 3);
  await notFrozen(p, "dashboard");
  await shot(p, "23-dashboard");
  noErrors(p, "tracker/dashboard");
  await p.close();
});

// ------------------------------------------------------------------ Auto-apply
await step("auto-apply", async () => {
  const p = await freshPage();
  await p.goto(`${BASE}/profile`);
  await p.click("[data-testid=use-demo-profile]");
  await p.click("[data-testid=save-profile]");
  await p.waitFor("location.pathname === '/jobs'", 5000);
  await p.goto(`${BASE}/auto-apply`);
  check("auto: review disabled until mode enabled", await p.eval("document.querySelector('[data-testid=auto-review]').disabled"));
  await p.click("[data-testid=auto-toggle]");
  await p.fill("[data-testid=auto-limit]", "3");
  await p.fill("[data-testid=auto-min]", "70");
  await sleep(200);
  const eligible = await p.count("[data-testid=auto-item]");
  check("auto: eligible jobs listed above min score", eligible >= 3, String(eligible));
  await p.click("[data-testid=auto-review]");
  await p.waitFor("document.querySelector('[data-testid=auto-summary]')", 3000);
  check("auto: confirmation summary lists 3 jobs", (await p.count("[data-testid=auto-summary] li")) === 3);
  check("auto: nothing sent before confirm", await p.eval("JSON.parse(localStorage.getItem('jobpilot.apps.v1') || '[]').length === 0"));
  await shot(p, "30-auto-summary");
  await p.click("[data-testid=auto-confirm]");
  await p.waitFor("document.querySelector('[data-testid=auto-result]')", 15000);
  const autos = await p.eval("JSON.parse(localStorage.getItem('jobpilot.apps.v1')).filter(a => a.source === 'auto' && a.receiptId).length");
  check("auto: 3 applications submitted", autos === 3, String(autos));
  check("auto: daily limit reached message", (await p.count("[data-testid=auto-limit-reached]")) === 1);
  check("auto: review disabled at limit", await p.eval("document.querySelector('[data-testid=auto-review]').disabled"));
  await shot(p, "31-auto-done");
  noErrors(p, "auto-apply");
  await p.close();
});

// ------------------------------------------------------------------ All pages x languages x themes x devices
const PAGES = ["/", "/jobs", `/jobs/${JOB}`, `/jobs/${JOB}/apply`, "/profile", "/tracker", "/dashboard", "/auto-apply", "/settings"];
const TAGLINES = { en: "Apply smarter", ta: "புத்திசாலித்தனமாக", hi: "समझदारी" };
for (const lang of ["en", "ta", "hi"]) {
  for (const [device, opts] of [["desktop", { width: 1366, height: 900 }], ["mobile", { width: 375, height: 760, mobile: true }]]) {
    const dark = (lang === "en" && device === "mobile") || lang === "ta" || (lang === "hi" && device === "desktop");
    await step(`pages ${lang} ${device}`, async () => {
      const p = await freshPage({ ...opts, dark, lang, extra: "" });
      // Seed demo data so every page has content.
      await p.goto(`${BASE}/settings`);
      await p.click("[data-testid=load-demo]");
      await p.click("[data-testid=confirm-yes]");
      await sleep(150);
      let ok = 0;
      const fails = [];
      for (const path of PAGES) {
        await p.goto(`${BASE}${path}`, { wait: 250 });
        const good = (await p.eval(`document.documentElement.lang === '${lang}' && document.documentElement.classList.contains('dark') === ${dark} && !document.querySelector('[data-testid=loading]') && (document.querySelector('[data-testid=tagline]')?.innerText ?? '').includes(${JSON.stringify(TAGLINES[lang])})`)) && (await p.eval("document.documentElement.scrollWidth - window.innerWidth")) <= 1;
        if (good) ok++;
        else fails.push(path);
        if (path === "/" || path === "/tracker" || path === `/jobs/${JOB}/apply` || path === "/dashboard") await shot(p, `40-${lang}-${device}${dark ? "-dark" : ""}-${path.replace(/\//g, "_") || "home"}`);
      }
      check(`${lang} ${device}${dark ? " dark" : ""}: all ${PAGES.length} pages render translated, themed, no overflow`, ok === PAGES.length, fails.join(", "));
      // Untranslated-key check: no raw "x.y" keys rendered.
      await p.goto(`${BASE}/jobs`, { wait: 200 });
      check(`${lang} ${device}: no raw i18n keys`, !(await p.eval("/\\b(jobs|apply|tracker|dash|profile|common|nav|auto|notif|settings|stage|status)\\.[a-z][A-Za-z.]+\\b/.test(document.body.innerText)")));
      if (device === "mobile") {
        await p.click("[data-testid=menu-toggle]");
        check(`${lang} mobile: hamburger menu opens`, (await p.count("[data-testid=mobile-menu] a")) >= 7);
        await shot(p, `41-${lang}-mobile-menu`);
      }
      await notFrozen(p, `${lang} ${device}`);
      noErrors(p, `${lang} ${device}`);
      await p.close();
    });
  }
}

// ------------------------------------------------------------------ Tablet / small-laptop widths (Tamil has the longest labels)
await step("widths", async () => {
  for (const w of [1024, 1280, 768]) {
    const p = await freshPage({ width: w, height: 800, lang: "ta" });
    await p.goto(`${BASE}/tracker`, { wait: 200 });
    await noHScroll(p, `ta ${w}px tracker`);
    const navH = await p.eval("document.querySelector('header').getBoundingClientRect().height");
    check(`ta ${w}px: nav stays one row`, navH <= 66, `${navH}px`);
    await p.close();
  }
});

// ------------------------------------------------------------------ Language + theme switchers
await step("switchers", async () => {
  const p = await freshPage();
  await p.goto(`${BASE}/jobs`);
  await p.fill("[data-testid=lang-select]", "ta");
  await sleep(150);
  check("switcher: Tamil applied live", (await p.text("[data-testid=tagline]"))?.includes(TAGLINES.ta) && (await p.eval("document.documentElement.lang")) === "ta");
  await p.fill("[data-testid=lang-select]", "hi");
  await sleep(150);
  check("switcher: Hindi applied live", (await p.text("[data-testid=tagline]"))?.includes(TAGLINES.hi));
  await p.goto(`${BASE}/jobs`);
  check("switcher: language persists after reload", (await p.eval("document.documentElement.lang")) === "hi");
  await p.click("[data-testid=theme-toggle]");
  check("switcher: dark mode toggled + saved", await p.eval("document.documentElement.classList.contains('dark') && localStorage.getItem('jobpilot.theme') === 'dark'"));
  await p.goto(`${BASE}/jobs`);
  check("switcher: dark persists (no flash)", await p.eval("document.documentElement.classList.contains('dark')"));
  noErrors(p, "switchers");
  await p.close();
});

// ------------------------------------------------------------------ API contract
await step("api", async () => {
  const post = (path, body) => fetch(`${BASE}${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: typeof body === "string" ? body : JSON.stringify(body), signal: AbortSignal.timeout(8000) });
  const jobs = await (await fetch(`${BASE}/api/portal/jobs`, { signal: AbortSignal.timeout(8000) })).json();
  check("api: /portal/jobs returns 40+ jobs", jobs.count >= 40);
  check("api: /portal/forms/:id", (await (await fetch(`${BASE}/api/portal/forms/${JOB}`)).json()).form?.sections?.length >= 4);
  check("api: unknown job 404", (await fetch(`${BASE}/api/portal/jobs/nope`)).status === 404);
  check("api: bad JSON -> 400", (await post("/api/match", "{bad")).status === 400);
  check("api: invalid submission -> 422", (await post("/api/portal/submit", { jobId: JOB, answers: { email: "x" } })).status === 422);
  const st = await (await post("/api/portal/status", { items: [{ receiptId: "JH-TEST-1234567", submittedAt: Date.now() - 600_000, score: 90 }], speed: "fast" })).json();
  check("api: /portal/status simulates progress", ["offer", "rejected"].includes(st.updates?.[0]?.status), st.updates?.[0]?.status);
  const fd = new FormData();
  fd.append("file", new Blob([readFileSync(join(ROOT, "public/samples/sample-resume.pdf"))], { type: "application/pdf" }), "r.pdf");
  const parsed = await (await fetch(`${BASE}/api/parse-resume`, { method: "POST", body: fd, signal: AbortSignal.timeout(8000) })).json();
  check("api: /parse-resume PDF", parsed.profile?.fullName === "Ananya Raman");
});

await close();
clearTimeout(watchdog);
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) {
  console.log("Failures:");
  failed.forEach((f) => console.log(` - ${f.name} ${f.detail}`));
  process.exit(1);
}
process.exit(0);
