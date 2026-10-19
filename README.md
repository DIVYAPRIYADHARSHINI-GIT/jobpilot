# JobPilot ✈️

**Apply smarter, not harder.**

JobPilot is a demo **automatic job-application tracker**. You fill your profile once (or upload a resume), and JobPilot matches you to jobs, auto-fills each application with tailored answers and a cover letter, submits with one click (or auto-applies in bulk), then tracks every application on a Kanban board until you get an offer.

> ⚠️ **Demo only — works only with the built-in "JobHub" demo portal.**
> All jobs, companies and logos are fictional. JobPilot never logs in to, scrapes or submits anything to real job sites. Every "submission" is stored inside the app, and status updates are simulated.

## 🌐 Live demo

- **Live site:** _coming soon (added after deployment)_
- **Source:** https://github.com/DIVYAPRIYADHARSHINI-GIT/jobpilot

## ✨ Features

| # | Feature | What it does |
|---|---------|--------------|
| — | **JobHub demo portal** | 46 realistic sample jobs at 14 fictional companies (title, company, location, salary, skills, description). Each company uses a different application form layout plus its own custom questions. Submissions get simulated updates: Applied → Viewed → Interview → Offer / Rejected. |
| 1 | **Profile & resume** | Fill the profile once (personal details, education, experience, skills, preferences), or upload a **PDF/DOCX** resume that is parsed into the profile for you to review and edit. Sample resumes are included. |
| 2 | **Job matching** | A match score (%) for every job: 60% skills, 25% experience, 15% preferences (role, city/remote, salary, job type). Shows the matched and missing skills. |
| 3 | **Auto-fill** | One click fills any JobHub form from your profile, answers the custom questions and writes a cover letter from a template using the job description. Auto-filled fields are highlighted so you can review and edit them. |
| 4 | **Auto-submit** | Submit after review, with a confirmation dialog, or turn on **Auto-apply** to apply to every job above a chosen match score. Auto-apply has a daily limit and shows a confirmation summary before anything is sent. |
| 5 | **Application tracker** | Kanban board (Saved, Applied, Interview, Offer, Rejected) with drag and drop (plus a "Move to" menu on touch screens), notes, interview dates and history. There is also a table view with search and filters. |
| 6 | **Reminders** | Follow-up and interview reminders, plus status updates, appear as in-app notifications (the bell icon). |
| 7 | **Dashboard** | Total applications, response rate, interviews, offers, an applications-per-week chart, the pipeline and your top missing skills. |
| 8 | **Export** | Download the tracker as **CSV** (opens in Excel, UTF-8) and as a **PDF summary**. |
| 9 | **3 languages** | English, தமிழ் (Tamil) and हिन्दी (Hindi), with a language switcher. |

**Design:** blue/indigo theme, light/dark mode, fully responsive, loading skeletons, illustrated empty states, a success animation after you submit and confirmation dialogs before any submission. Every illustration (hero, empty states, 6 office scenes, company logos and icons) is a custom SVG stored in the repo, so nothing is fetched from third parties.

## 🛠 Tech stack

- **Next.js 16** (App Router, TypeScript) + **React 19**
- **Tailwind CSS 4**
- **Recharts** for the dashboard charts
- **API routes** for resume parsing, matching, auto-fill and the mock portal
- **localStorage** for the profile, applications and settings (no database)
- Deployed on **Vercel** (Hobby plan); every push to `main` auto-deploys

Resume parsing (PDF + DOCX text extraction), CSV and PDF export are written in plain TypeScript. Beyond Next.js, React, Tailwind and Recharts there are no extra runtime dependencies.

### API routes

| Route | Purpose |
|-------|---------|
| `POST /api/parse-resume` | Upload a PDF/DOCX file (max 4 MB) and get back the parsed profile fields |
| `POST /api/match` | Profile in, match score + matched/missing skills for every job out |
| `POST /api/autofill` | Profile + job in, the filled form answers + tailored cover letter out |
| `GET /api/portal/jobs`, `GET /api/portal/jobs/:id` | JobHub listings |
| `GET /api/portal/forms/:jobId` | The company-specific application form |
| `POST /api/portal/submit` | Validates the answers and returns a receipt (mock submission) |
| `POST /api/portal/status` | Simulated employer progress for your submissions (stateless and deterministic) |

## 🚀 Setup

Requires **Node.js 22.18+**.

```bash
git clone https://github.com/DIVYAPRIYADHARSHINI-GIT/jobpilot.git
cd jobpilot
npm install
npm run dev          # http://localhost:3000
```

Other scripts:

```bash
npm run build        # production build
npm start            # serve the production build
npm run typecheck    # TypeScript
npm test             # unit tests (node --test)
npm run e2e          # headless-Chrome end-to-end suite (needs Google Chrome + a running server)
```

Run the end-to-end suite against a local production build:

```bash
npm run build && npx next start -p 3300 &
BASE_URL=http://localhost:3300 npm run e2e
```

## 🧭 Try it in 1 minute

1. **Profile** → click "sample PDF" to parse a demo resume (or "Use demo profile") → **Save profile**.
2. **JobHub** → jobs are sorted by match score; open one to see the matched and missing skills.
3. **Apply** → **Auto-fill from profile** → review the highlighted fields → **Review & submit** → confirm.
4. **Tracker** → your application moves along by itself. Status updates take a few minutes in "Fast demo" mode; you can switch to "Realistic (days)" in Settings.
5. **Auto-apply** → enable it, pick a minimum score and a daily limit → review the summary → submit.
6. **Dashboard** / **Export** → charts, CSV and PDF. Short on time? Click **Try with demo data** on the home page.

## 📁 Project structure

```
src/
  app/                 pages (home, jobs, job detail, apply, profile, tracker, dashboard, auto-apply, settings) + api/
  components/          UI kit, NavBar, JobCard, charts, company logos, icons, success animation
  i18n/                en / ta / hi dictionaries (type-checked: every key in all 3 languages)
  lib/
    data/              jobs, companies, skill vocabulary
    forms.ts           JobHub form layouts + validation
    match.ts           match scoring
    autofill.ts        form mapping, custom answers, cover letter
    resume.ts          resume text -> profile
    extract.ts         PDF/DOCX text extraction
    portal.ts          submission receipts + simulated status timeline
    store.ts           localStorage store (useSyncExternalStore)
    stats.ts / pdf.ts  dashboard stats, CSV + PDF export
public/images/         hero, empty-state and office SVG illustrations
public/samples/        sample resume (PDF + DOCX)
tests/                 unit tests + headless-Chrome e2e suite
```

## ✅ Testing

- **Unit tests** (`npm test`) cover the job data, the forms, skill parsing, matching, auto-fill for all 46 forms, validation, PDF/DOCX resume parsing, the portal simulation, stats, reminders, CSV injection-safety and PDF output.
- **End-to-end** (`npm run e2e`): 120 checks in headless Chrome. They cover the full profile → match → auto-fill → submit → tracker flow, simulated status updates, notifications, drag and drop, notes, delete, the table view, CSV/PDF downloads, the dashboard, auto-apply with its daily limit, every page on desktop and mobile in light and dark mode in all 3 languages, a freeze heartbeat on every page, and the API contract. Each step uses short timeouts, and a global watchdog stops the run if anything hangs.

## 📝 Notes

- Data is stored only in your browser (localStorage). Use **Settings → Reset all data** to clear it.
- Job listings stay in English, like on real job boards; the whole UI is translated.
- The PDF summary is in English because the built-in PDF fonts can't render Tamil/Devanagari.

## License

MIT. All company names, logos, jobs and people in this demo are fictional.
