// Canonical skill vocabulary + aliases. Used by resume parsing (find skills
// in free text) and matching (normalise "ReactJS" and "react" to "React").

export const SKILL_ALIASES: Record<string, string[]> = {
  JavaScript: ["javascript", "js", "es6", "ecmascript"],
  TypeScript: ["typescript", "ts"],
  React: ["react", "reactjs", "react.js"],
  "Next.js": ["next.js", "nextjs", "next js"],
  "Node.js": ["node.js", "nodejs", "node js", "node"],
  "Express": ["express.js", "expressjs"],
  "HTML": ["html", "html5"],
  "CSS": ["css", "css3", "scss", "sass"],
  "Tailwind CSS": ["tailwind", "tailwindcss", "tailwind css"],
  "Redux": ["redux"],
  "Vue.js": ["vue", "vue.js", "vuejs"],
  "Angular": ["angular"],
  Python: ["python", "python3"],
  Django: ["django"],
  FastAPI: ["fastapi"],
  Flask: ["flask"],
  Java: ["java"],
  "Spring Boot": ["spring boot", "springboot"],
  Kotlin: ["kotlin"],
  Swift: ["swift"],
  Flutter: ["flutter"],
  Dart: ["dart"],
  "React Native": ["react native"],
  Android: ["android"],
  iOS: ["ios"],
  Go: ["golang", "go lang"],
  "C++": ["c++", "cpp"],
  "C#": ["c#", "csharp", ".net"],
  SQL: ["sql", "mysql", "sqlite"],
  PostgreSQL: ["postgresql", "postgres"],
  MongoDB: ["mongodb", "mongo"],
  Redis: ["redis"],
  GraphQL: ["graphql"],
  "REST APIs": ["rest api", "rest apis", "restful"],
  AWS: ["aws", "amazon web services"],
  Azure: ["azure"],
  GCP: ["gcp", "google cloud"],
  Docker: ["docker"],
  Kubernetes: ["kubernetes", "k8s"],
  Terraform: ["terraform"],
  "CI/CD": ["ci/cd", "cicd", "github actions", "jenkins"],
  Linux: ["linux", "bash", "shell scripting"],
  Git: ["git", "github", "gitlab"],
  "Machine Learning": ["machine learning", "ml"],
  "Deep Learning": ["deep learning"],
  PyTorch: ["pytorch"],
  TensorFlow: ["tensorflow"],
  NLP: ["nlp", "natural language processing"],
  "Computer Vision": ["computer vision", "opencv"],
  Pandas: ["pandas"],
  NumPy: ["numpy"],
  "scikit-learn": ["scikit-learn", "sklearn"],
  Statistics: ["statistics", "statistical"],
  "Data Visualization": ["data visualization", "data visualisation"],
  "Power BI": ["power bi", "powerbi"],
  Tableau: ["tableau"],
  Excel: ["ms excel", "microsoft excel", "spreadsheets"],
  Spark: ["spark", "pyspark"],
  Airflow: ["airflow"],
  Figma: ["figma"],
  "UI Design": ["ui design", "user interface"],
  "UX Research": ["ux research", "user research", "usability testing"],
  Prototyping: ["prototyping", "wireframing", "wireframes"],
  "Design Systems": ["design systems", "design system"],
  "Adobe XD": ["adobe xd"],
  Illustrator: ["illustrator"],
  Selenium: ["selenium"],
  Cypress: ["cypress"],
  Jest: ["jest"],
  "Test Automation": ["test automation", "automation testing", "automated testing"],
  "Manual Testing": ["manual testing"],
  Agile: ["agile", "scrum", "kanban"],
  Jira: ["jira"],
  "Product Management": ["product management", "product manager", "roadmap"],
  "Stakeholder Management": ["stakeholder management", "stakeholders"],
  Analytics: ["analytics", "google analytics", "mixpanel"],
  SEO: ["seo", "search engine optimization"],
  "Content Writing": ["content writing", "copywriting"],
  "Social Media": ["social media"],
  "Digital Marketing": ["digital marketing", "performance marketing", "google ads"],
  Communication: ["communication", "communication skills"],
  Leadership: ["leadership", "team lead", "mentoring"],
  "Network Security": ["network security", "firewalls"],
  SIEM: ["siem", "splunk"],
  "Penetration Testing": ["penetration testing", "pentesting", "ethical hacking"],
  "Cloud Security": ["cloud security"],
  Salesforce: ["salesforce", "crm"],
  "Customer Success": ["customer success", "customer support", "customer service"],
  Negotiation: ["negotiation"],
  "Financial Modeling": ["financial modeling", "financial modelling"],
  Accounting: ["accounting", "tally"],
  "Technical Writing": ["technical writing", "documentation"],
  "System Design": ["system design", "distributed systems"],
  Microservices: ["microservices"],
  Kafka: ["kafka"],
  "Solidity": ["solidity"],
};

export const ALL_SKILLS = Object.keys(SKILL_ALIASES);

const LOOKUP = new Map<string, string>();
for (const [canon, aliases] of Object.entries(SKILL_ALIASES)) {
  LOOKUP.set(canon.toLowerCase(), canon);
  for (const a of aliases) LOOKUP.set(a.toLowerCase(), canon);
}

/** Normalise a skill name to its canonical form (unknown skills are title-trimmed). */
export function canonicalSkill(s: string): string {
  const k = s.trim().toLowerCase().replace(/\s+/g, " ");
  return LOOKUP.get(k) ?? s.trim();
}

export function uniqueSkills(list: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of list) {
    const c = canonicalSkill(s);
    if (!c) continue;
    const key = c.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(c);
    }
  }
  return out;
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Short/ambiguous terms are matched case-sensitively as whole words.
const STRICT = new Set(["go", "ts", "js", "ml", "ios", "node", "spring", "crm", "rest", "git", "excel", "dart", "swift", "express"]);

const MATCHERS: Array<[string, RegExp[]]> = Object.entries(SKILL_ALIASES).map(([canon, aliases]) => [
  canon,
  [canon, ...aliases].map(
    (term) => new RegExp(`(^|[^A-Za-z0-9+#.])${escapeRe(term)}(?=$|[^A-Za-z0-9+#])`, STRICT.has(term.toLowerCase()) ? "" : "i"),
  ),
]);

/** Find canonical skills mentioned anywhere in free text. */
export function extractSkills(text: string): string[] {
  return MATCHERS.filter(([, res]) => res.some((re) => re.test(text))).map(([canon]) => canon);
}
