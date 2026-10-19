// 44 sample jobs on the mock JobHub board. Built from role templates so each
// listing has realistic skills, description and responsibilities. All dummy data.
import type { Job, JobType, WorkMode } from "../types.ts";
import { COMPANY_BY_ID } from "./companies.ts";

interface Role {
  title: string;
  category: string;
  skills: string[];
  nice: string[];
  pitch: string;
  resp: string[];
}

const ROLES: Record<string, Role> = {
  fe: { title: "Frontend Developer", category: "Engineering", skills: ["React", "TypeScript", "JavaScript", "HTML", "CSS"], nice: ["Next.js", "Tailwind CSS", "Jest"], pitch: "build fast, accessible web interfaces used by thousands of customers every day", resp: ["Build reusable React components and pages", "Work with designers to turn Figma files into pixel-perfect UI", "Improve performance, accessibility and test coverage"] },
  fs: { title: "Full Stack Engineer", category: "Engineering", skills: ["React", "Node.js", "TypeScript", "PostgreSQL", "REST APIs"], nice: ["Docker", "AWS", "GraphQL"], pitch: "own features end to end, from database schema to the final pixel", resp: ["Design and build APIs and the UI that uses them", "Write clean, tested code and review pull requests", "Monitor production and fix issues quickly"] },
  be: { title: "Backend Engineer", category: "Engineering", skills: ["Java", "Spring Boot", "SQL", "Microservices", "REST APIs"], nice: ["Kafka", "Docker", "Kubernetes"], pitch: "design reliable services that handle millions of requests a day", resp: ["Build and scale backend microservices", "Model data and write efficient SQL queries", "Improve reliability, observability and on-call runbooks"] },
  py: { title: "Python Developer", category: "Engineering", skills: ["Python", "Django", "SQL", "REST APIs", "Git"], nice: ["FastAPI", "Redis", "Docker"], pitch: "build the Python services and internal tools that power our platform", resp: ["Develop Django/FastAPI services and admin tools", "Write automated tests and documentation", "Integrate third-party APIs and data sources"] },
  node: { title: "Node.js Developer", category: "Engineering", skills: ["Node.js", "JavaScript", "MongoDB", "REST APIs", "Git"], nice: ["TypeScript", "Redis", "AWS"], pitch: "build real-time backend services and integrations", resp: ["Build Node.js APIs and background workers", "Design MongoDB collections and indexes", "Integrate payment, SMS and map providers"] },
  mob: { title: "Mobile App Developer (Flutter)", category: "Engineering", skills: ["Flutter", "Dart", "REST APIs", "Git"], nice: ["Android", "iOS", "Figma"], pitch: "ship a smooth, offline-friendly mobile app on Android and iOS", resp: ["Build Flutter screens and state management", "Integrate APIs, push notifications and analytics", "Release builds to the Play Store and App Store"] },
  rn: { title: "React Native Developer", category: "Engineering", skills: ["React Native", "JavaScript", "TypeScript", "REST APIs"], nice: ["Redux", "Android", "iOS"], pitch: "build our customer app with React Native", resp: ["Build and polish mobile features", "Fix crashes and improve app start time", "Work closely with product and design"] },
  devops: { title: "DevOps Engineer", category: "Infrastructure", skills: ["AWS", "Docker", "Kubernetes", "CI/CD", "Linux"], nice: ["Terraform", "Python", "Go"], pitch: "keep our cloud platform fast, secure and cost-efficient", resp: ["Automate infrastructure with code", "Run CI/CD pipelines and Kubernetes clusters", "Lead incident response and capacity planning"] },
  sre: { title: "Site Reliability Engineer", category: "Infrastructure", skills: ["Linux", "Kubernetes", "Go", "AWS", "CI/CD"], nice: ["Terraform", "Kafka", "Python"], pitch: "make our services reliable at scale", resp: ["Define SLOs and build monitoring", "Automate toil and improve deployments", "Join a fair on-call rotation"] },
  da: { title: "Data Analyst", category: "Data", skills: ["SQL", "Excel", "Power BI", "Statistics", "Data Visualization"], nice: ["Python", "Tableau", "Pandas"], pitch: "turn business data into clear dashboards and decisions", resp: ["Build dashboards and weekly business reports", "Answer ad-hoc questions with SQL", "Partner with teams to define and track KPIs"] },
  ds: { title: "Data Scientist", category: "Data", skills: ["Python", "Machine Learning", "SQL", "Statistics", "Pandas"], nice: ["scikit-learn", "Deep Learning", "Spark"], pitch: "build models that improve recommendations, pricing and risk", resp: ["Explore data and build ML models", "Run A/B tests and explain results", "Deploy models with the engineering team"] },
  ml: { title: "Machine Learning Engineer", category: "Data", skills: ["Python", "PyTorch", "Machine Learning", "Docker", "NLP"], nice: ["TensorFlow", "Kubernetes", "AWS"], pitch: "train and serve ML models in production", resp: ["Train, evaluate and optimise models", "Build model serving and monitoring pipelines", "Keep up with research and prototype new ideas"] },
  de: { title: "Data Engineer", category: "Data", skills: ["Python", "SQL", "Spark", "Airflow", "AWS"], nice: ["Kafka", "Docker", "PostgreSQL"], pitch: "build the data pipelines that every team relies on", resp: ["Build batch and streaming pipelines", "Model the data warehouse", "Improve data quality and lineage"] },
  ui: { title: "UI/UX Designer", category: "Design", skills: ["Figma", "UI Design", "Prototyping", "UX Research"], nice: ["Design Systems", "Illustrator", "HTML"], pitch: "design simple, delightful experiences for our users", resp: ["Run user research and usability tests", "Create wireframes, prototypes and final UI", "Grow and maintain our design system"] },
  pd: { title: "Product Designer", category: "Design", skills: ["Figma", "Prototyping", "Design Systems", "UX Research"], nice: ["UI Design", "Analytics", "HTML"], pitch: "shape our product from first sketch to shipped feature", resp: ["Own design for a product area", "Test ideas with real users", "Collaborate daily with engineers and PMs"] },
  qa: { title: "QA Automation Engineer", category: "Quality", skills: ["Selenium", "Test Automation", "Java", "Manual Testing", "Agile"], nice: ["Cypress", "CI/CD", "Jira"], pitch: "make sure every release is stable and bug-free", resp: ["Write automated UI and API tests", "Plan test cases for new features", "Run regression suites in CI"] },
  pm: { title: "Product Manager", category: "Product", skills: ["Product Management", "Agile", "Analytics", "Stakeholder Management", "Communication"], nice: ["SQL", "Jira", "Figma"], pitch: "decide what we build next and why", resp: ["Own the roadmap for a product area", "Write clear specs and success metrics", "Talk to customers every week"] },
  dm: { title: "Digital Marketing Executive", category: "Marketing", skills: ["Digital Marketing", "SEO", "Social Media", "Analytics", "Content Writing"], nice: ["Excel", "Figma", "Communication"], pitch: "grow our brand and bring in new customers", resp: ["Plan and run paid and organic campaigns", "Track performance and optimise spend", "Write content for web and social channels"] },
  sec: { title: "Security Analyst", category: "Security", skills: ["Network Security", "SIEM", "Linux", "Cloud Security"], nice: ["Penetration Testing", "Python", "AWS"], pitch: "detect and respond to threats before they become incidents", resp: ["Monitor alerts and investigate incidents", "Harden cloud and network configuration", "Run security awareness sessions"] },
  cs: { title: "Customer Success Manager", category: "Operations", skills: ["Customer Success", "Communication", "Salesforce", "Negotiation"], nice: ["Analytics", "Excel", "Jira"], pitch: "help our customers get real value from the product", resp: ["Onboard and train new customers", "Run quarterly business reviews", "Reduce churn and grow accounts"] },
  fa: { title: "Financial Analyst", category: "Finance", skills: ["Financial Modeling", "Excel", "Accounting", "Statistics"], nice: ["Power BI", "SQL", "Communication"], pitch: "guide business decisions with sharp financial analysis", resp: ["Build budgets, forecasts and models", "Prepare monthly reports for leadership", "Analyse unit economics and pricing"] },
  tw: { title: "Technical Writer", category: "Content", skills: ["Technical Writing", "Communication", "Git", "HTML"], nice: ["REST APIs", "Figma", "Agile"], pitch: "write clear docs that developers actually enjoy reading", resp: ["Write guides, API references and tutorials", "Work with engineers to document new features", "Keep docs accurate and searchable"] },
  intern: { title: "Software Engineering Intern", category: "Engineering", skills: ["JavaScript", "HTML", "CSS", "Git"], nice: ["React", "Python", "SQL"], pitch: "learn by shipping real features with a supportive mentor", resp: ["Fix bugs and build small features", "Write tests and documentation", "Present your project at demo day"] },
};

// [company, role, seniority prefix, city, mode, type, salMin, salMax (LPA), expMin, expMax, posted days ago]
type Row = [string, keyof typeof ROLES, string, string, WorkMode, JobType, number, number, number, number, number];

const ROWS: Row[] = [
  ["nimbusloop", "fe", "", "Bengaluru", "Hybrid", "Full-time", 10, 16, 2, 4, 1],
  ["nimbusloop", "devops", "Senior ", "Bengaluru", "Hybrid", "Full-time", 24, 36, 5, 8, 3],
  ["nimbusloop", "fs", "", "Bengaluru", "Remote", "Full-time", 14, 22, 3, 5, 6],
  ["nimbusloop", "tw", "", "Remote", "Remote", "Contract", 8, 12, 1, 3, 9],
  ["quillbyte", "fe", "Junior ", "Chennai", "Onsite", "Full-time", 5, 8, 0, 2, 2],
  ["quillbyte", "pd", "", "Chennai", "Hybrid", "Full-time", 12, 18, 2, 5, 4],
  ["quillbyte", "mob", "", "Chennai", "Hybrid", "Full-time", 9, 14, 2, 4, 7],
  ["quillbyte", "intern", "", "Chennai", "Onsite", "Internship", 3, 4, 0, 0, 1],
  ["tealcrest", "be", "Senior ", "Mumbai", "Hybrid", "Full-time", 28, 40, 5, 9, 2],
  ["tealcrest", "fa", "", "Mumbai", "Onsite", "Full-time", 9, 14, 1, 4, 5],
  ["tealcrest", "ds", "", "Mumbai", "Hybrid", "Full-time", 18, 28, 3, 6, 8],
  ["tealcrest", "qa", "", "Pune", "Hybrid", "Full-time", 8, 13, 2, 5, 11],
  ["orbitwell", "py", "", "Hyderabad", "Hybrid", "Full-time", 10, 17, 2, 5, 3],
  ["orbitwell", "da", "", "Hyderabad", "Onsite", "Full-time", 7, 11, 1, 3, 6],
  ["orbitwell", "cs", "", "Hyderabad", "Onsite", "Full-time", 8, 12, 2, 5, 10],
  ["pixelharbor", "ui", "", "Pune", "Hybrid", "Full-time", 8, 14, 1, 4, 2],
  ["pixelharbor", "ui", "Senior ", "Remote", "Remote", "Contract", 18, 26, 5, 8, 12],
  ["pixelharbor", "fe", "", "Pune", "Hybrid", "Full-time", 9, 15, 2, 4, 5],
  ["greengrid", "de", "", "Ahmedabad", "Hybrid", "Full-time", 14, 22, 3, 6, 4],
  ["greengrid", "py", "Junior ", "Ahmedabad", "Onsite", "Full-time", 5, 8, 0, 2, 9],
  ["greengrid", "pm", "", "Ahmedabad", "Hybrid", "Full-time", 20, 30, 4, 8, 14],
  ["cartwheel", "fs", "Senior ", "Gurugram", "Hybrid", "Full-time", 26, 38, 5, 8, 1],
  ["cartwheel", "dm", "", "Gurugram", "Onsite", "Full-time", 5, 8, 1, 3, 3],
  ["cartwheel", "da", "", "Gurugram", "Hybrid", "Full-time", 8, 12, 2, 4, 7],
  ["cartwheel", "node", "", "Gurugram", "Hybrid", "Full-time", 12, 18, 2, 5, 13],
  ["sentinelfox", "sec", "", "Bengaluru", "Onsite", "Full-time", 12, 20, 2, 5, 2],
  ["sentinelfox", "sre", "", "Bengaluru", "Hybrid", "Full-time", 22, 32, 4, 7, 6],
  ["sentinelfox", "be", "", "Bengaluru", "Hybrid", "Full-time", 16, 24, 3, 6, 15],
  ["brightpath", "node", "", "Chennai", "Hybrid", "Full-time", 9, 15, 2, 4, 1],
  ["brightpath", "de", "Senior ", "Chennai", "Hybrid", "Full-time", 24, 34, 5, 8, 8],
  ["brightpath", "qa", "", "Chennai", "Onsite", "Full-time", 6, 10, 1, 3, 4],
  ["lumenai", "ml", "", "Hyderabad", "Hybrid", "Full-time", 22, 35, 2, 5, 2],
  ["lumenai", "ds", "Junior ", "Remote", "Remote", "Full-time", 9, 14, 0, 2, 5],
  ["lumenai", "fs", "", "Hyderabad", "Hybrid", "Full-time", 15, 24, 2, 5, 10],
  ["kitekart", "rn", "", "Mumbai", "Hybrid", "Full-time", 12, 20, 2, 5, 3],
  ["kitekart", "pm", "Associate ", "Mumbai", "Onsite", "Full-time", 14, 20, 1, 3, 6],
  ["kitekart", "devops", "", "Mumbai", "Hybrid", "Full-time", 14, 22, 2, 5, 9],
  ["coralbay", "fe", "", "Kochi", "Remote", "Full-time", 8, 13, 1, 4, 2],
  ["coralbay", "dm", "Senior ", "Kochi", "Hybrid", "Full-time", 9, 14, 4, 7, 7],
  ["coralbay", "intern", "", "Kochi", "Hybrid", "Internship", 2, 3, 0, 0, 3],
  ["stackforge", "fs", "", "Remote", "Remote", "Full-time", 18, 28, 3, 6, 1],
  ["stackforge", "tw", "Senior ", "Remote", "Remote", "Full-time", 14, 20, 4, 7, 5],
  ["stackforge", "sre", "", "Remote", "Remote", "Contract", 20, 30, 3, 6, 12],
  ["meadowbank", "py", "Senior ", "Noida", "Hybrid", "Full-time", 20, 30, 5, 8, 2],
  ["meadowbank", "qa", "", "Noida", "Hybrid", "Full-time", 7, 12, 2, 4, 6],
  ["meadowbank", "fa", "Senior ", "Noida", "Onsite", "Full-time", 16, 24, 5, 9, 11],
];

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export const JOBS: Job[] = ROWS.map((r, i) => {
  const [companyId, roleKey, prefix, city, workMode, type, salaryMin, salaryMax, expMin, expMax, postedDaysAgo] = r;
  const role = ROLES[roleKey];
  const company = COMPANY_BY_ID[companyId];
  const title = `${prefix}${role.title}`;
  const expText = expMax === 0 ? "students and fresh graduates" : `${expMin}-${expMax} years of experience`;
  return {
    id: `${slug(company.name)}-${slug(title)}-${i + 1}`,
    companyId,
    companyName: company.name,
    title,
    category: role.category,
    location: workMode === "Remote" ? "Remote (India)" : `${city}, India`,
    city: workMode === "Remote" ? "Remote" : city,
    workMode,
    type,
    salaryMin,
    salaryMax,
    expMin,
    expMax,
    skills: role.skills,
    niceToHave: role.nice,
    description: `${company.name} is hiring a ${title} to ${role.pitch}. ${company.about} You will work with ${role.skills.slice(0, 3).join(", ")} and more in a ${workMode.toLowerCase()} team. This role suits ${expText}.`,
    responsibilities: role.resp,
    postedDaysAgo,
    officeImage: (i % 6) + 1,
  };
});

export const JOB_BY_ID: Record<string, Job> = Object.fromEntries(JOBS.map((j) => [j.id, j]));

export const CATEGORIES = [...new Set(JOBS.map((j) => j.category))].sort();
export const CITIES = [...new Set(JOBS.map((j) => j.city))].sort();

export const formatSalary = (j: Pick<Job, "salaryMin" | "salaryMax">) => `₹${j.salaryMin}-${j.salaryMax} LPA`;
