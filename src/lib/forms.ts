// JobHub application forms. Each company uses one of 4 form layouts (different
// field names, splits and formats) plus its own custom questions, like real
// career sites. Field ids are canonical so auto-fill can map them from a profile.
import type { AppForm, FormField, FormSection, Job, QuestionKey } from "./types.ts";
import { COMPANY_BY_ID } from "./data/companies.ts";

export const NOTICE_OPTIONS = ["Immediate", "15 days", "30 days", "60 days", "90 days"];
export const EXPERIENCE_RANGES = ["Fresher (0-1 years)", "1-3 years", "3-5 years", "5-8 years", "8+ years"];
export const DEGREE_OPTIONS = ["B.E. / B.Tech", "B.Sc", "B.Com", "BCA", "M.E. / M.Tech", "M.Sc", "MCA", "MBA", "Other"];
export const YES_NO = ["Yes", "No"];

export const QUESTION_FIELDS: Record<QuestionKey, (company: string) => FormField> = {
  why_company: (c) => ({ id: "q_why_company", label: `Why do you want to join ${c}?`, type: "textarea", required: true, custom: true, maxLength: 800 }),
  relocate: () => ({ id: "q_relocate", label: "Are you willing to relocate to the job location?", type: "select", options: YES_NO, required: true, custom: true }),
  remote: () => ({ id: "q_remote", label: "Which work arrangement do you prefer?", type: "select", options: ["Onsite", "Hybrid", "Remote"], required: true, custom: true }),
  portfolio: () => ({ id: "q_portfolio", label: "Link to your portfolio or GitHub", type: "url", required: false, custom: true, placeholder: "https://" }),
  project: () => ({ id: "q_project", label: "Describe a project you are proud of (2-4 sentences).", type: "textarea", required: true, custom: true, maxLength: 800 }),
  start_date: () => ({ id: "q_start_date", label: "Earliest date you can join", type: "date", required: true, custom: true }),
  work_auth: () => ({ id: "q_work_auth", label: "Are you legally authorised to work in India?", type: "select", options: YES_NO, required: true, custom: true }),
  degree: () => ({ id: "q_degree", label: "Highest qualification", type: "select", options: DEGREE_OPTIONS, required: true, custom: true }),
  source: () => ({ id: "q_source", label: "How did you hear about this role?", type: "select", options: ["JobHub", "LinkedIn", "A friend or colleague", "Company website", "Other"], required: false, custom: true }),
  strength: () => ({ id: "q_strength", label: "What is your biggest professional strength?", type: "textarea", required: true, custom: true, maxLength: 500 }),
  shift: () => ({ id: "q_shift", label: "Are you comfortable with occasional rotational shifts?", type: "select", options: YES_NO, required: true, custom: true }),
  languages: () => ({ id: "q_languages", label: "Which languages can you speak fluently?", type: "text", required: false, custom: true }),
};

const f = (id: string, label: string, type: FormField["type"], required = true, extra: Partial<FormField> = {}): FormField => ({ id, label, type, required, ...extra });

const coverLetter = f("coverLetter", "Cover letter", "textarea", true, { maxLength: 3000 });
const resume = f("resume", "Resume (PDF or DOCX)", "file", true);

function layout(variant: number): { heading: string; sections: FormSection[] } {
  switch (variant) {
    case 1:
      return {
        heading: "Candidate application",
        sections: [
          { title: "Personal information", fields: [f("firstName", "First name", "text"), f("lastName", "Last name", "text"), f("email", "Email", "email"), f("phone", "Mobile number", "tel"), f("city", "Current city", "text")] },
          { title: "Background", fields: [f("experienceRange", "Total experience", "select", true, { options: EXPERIENCE_RANGES }), f("currentTitle", "Current job title", "text", false), f("skills", "Key skills (comma separated)", "textarea")] },
          { title: "Availability & pay", fields: [f("noticeDays", "Notice period (days)", "number"), f("expectedSalary", "Expected CTC (LPA)", "number")] },
          { title: "Documents", fields: [resume, coverLetter] },
        ],
      };
    case 2:
      return {
        heading: "Apply for this position",
        sections: [
          { title: "Contact", fields: [f("fullName", "Full legal name", "text"), f("email", "Work or personal email", "email"), f("phone", "Phone (with country code)", "tel"), f("linkedin", "LinkedIn profile URL", "url", false)] },
          { title: "Current role", fields: [f("currentCompany", "Current / last employer", "text", false), f("currentTitle", "Designation", "text", false), f("experienceYears", "Years of experience", "number"), f("currentSalary", "Current CTC (LPA)", "number", false)] },
          { title: "Your expectations", fields: [f("expectedSalary", "Expected CTC (LPA)", "number"), f("noticePeriod", "Notice period", "select", true, { options: NOTICE_OPTIONS }), f("skills", "Skills relevant to this role", "textarea")] },
          { title: "Attachments", fields: [resume, coverLetter] },
        ],
      };
    case 3:
      return {
        heading: "Join our team",
        sections: [
          { title: "About you", fields: [f("fullName", "Your name", "text"), f("email", "Email address", "email"), f("phone", "Contact number", "tel"), f("city", "Where are you based?", "text"), f("portfolio", "Portfolio / GitHub", "url", false)] },
          { title: "Experience", fields: [f("experienceYears", "Relevant experience (years)", "number"), f("primarySkills", "Top 5 skills", "text"), f("highestDegree", "Highest degree", "select", true, { options: DEGREE_OPTIONS })] },
          { title: "Logistics", fields: [f("noticePeriod", "Notice period", "select", true, { options: NOTICE_OPTIONS }), f("expectedSalary", "Salary expectation (LPA)", "number"), f("availableFrom", "Available from", "date", false)] },
          { title: "Resume & letter", fields: [resume, f("coverLetter", "Why are you a great fit? (cover letter)", "textarea", true, { maxLength: 3000 })] },
        ],
      };
    default:
      return {
        heading: "Quick application",
        sections: [
          { title: "Basic details", fields: [f("fullName", "Full name", "text"), f("email", "Email", "email"), f("phone", "Phone", "tel")] },
          { title: "Experience & skills", fields: [f("experienceYears", "Total experience (years)", "number"), f("currentTitle", "Current role", "text", false), f("skills", "Skills", "textarea")] },
          { title: "Compensation", fields: [f("expectedSalary", "Expected salary (LPA)", "number"), f("noticePeriod", "Notice period", "select", true, { options: NOTICE_OPTIONS })] },
          { title: "Resume & cover letter", fields: [resume, coverLetter] },
        ],
      };
  }
}

export function getForm(job: Job): AppForm {
  const company = COMPANY_BY_ID[job.companyId];
  const variant = company.formVariant;
  const { heading, sections } = layout(variant);
  const questions = company.questions.map((q) => QUESTION_FIELDS[q](company.name));
  return {
    jobId: job.id,
    companyId: company.id,
    variant,
    heading: `${company.name} · ${heading}`,
    sections: [...sections, { title: `Questions from ${company.name}`, fields: questions }],
  };
}

export const formFields = (form: AppForm) => form.sections.flatMap((s) => s.fields);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^[+()\-\s\d]{8,18}$/;

/** Validate submitted answers against the form. Returns field id -> error code. */
export function validateAnswers(form: AppForm, answers: Record<string, string>): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const field of formFields(form)) {
    const v = (answers[field.id] ?? "").trim();
    if (!v) {
      if (field.required) errors[field.id] = "required";
      continue;
    }
    if (field.type === "email" && !EMAIL_RE.test(v)) errors[field.id] = "email";
    else if (field.type === "tel" && !PHONE_RE.test(v)) errors[field.id] = "phone";
    else if (field.type === "number" && (!Number.isFinite(Number(v)) || Number(v) < 0)) errors[field.id] = "number";
    else if (field.type === "select" && field.options && !field.options.includes(v)) errors[field.id] = "option";
    else if (field.maxLength && v.length > field.maxLength) errors[field.id] = "tooLong";
  }
  return errors;
}
