// Fictional company logos drawn as inline SVG from each company's palette + shape.
import type { Company } from "@/lib/types";
import { COMPANY_BY_ID } from "@/lib/data/companies";

function Shape({ shape, id }: { shape: Company["logo"]["shape"]; id: string }) {
  const fill = `url(#lg-${id})`;
  switch (shape) {
    case "circle":
      return <><circle cx="20" cy="20" r="11" fill={fill} /><circle cx="20" cy="20" r="5" fill="#fff" opacity=".9" /></>;
    case "hex":
      return <path d="M20 7 31 13.5v13L20 33 9 26.5v-13z" fill={fill} />;
    case "square":
      return <><rect x="9" y="9" width="22" height="22" rx="6" fill={fill} /><rect x="15" y="15" width="10" height="10" rx="2" fill="#fff" opacity=".85" /></>;
    case "diamond":
      return <><path d="M20 6 34 20 20 34 6 20z" fill={fill} /><path d="M20 14 26 20 20 26 14 20z" fill="#fff" opacity=".85" /></>;
    case "leaf":
      return <><path d="M9 31C9 17 17 9 31 9c0 14-8 22-22 22z" fill={fill} /><path d="M11 29 25 15" stroke="#fff" strokeWidth="2" strokeLinecap="round" /></>;
    case "wave":
      return <><circle cx="20" cy="20" r="12" fill={fill} /><path d="M9 21c3-3 5-3 8 0s5 3 8 0 4-2 6 0" stroke="#fff" strokeWidth="2.4" fill="none" strokeLinecap="round" /></>;
    case "triangle":
      return <><path d="M20 7 33 31H7z" fill={fill} /><path d="M20 17 26 28H14z" fill="#fff" opacity=".85" /></>;
  }
}

export function CompanyLogo({ companyId, size = 44, className = "" }: { companyId: string; size?: number; className?: string }) {
  const c = COMPANY_BY_ID[companyId];
  if (!c) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" role="img" aria-label={`${c.name} logo`} className={`shrink-0 rounded-xl bg-white ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700 ${className}`}>
      <defs>
        <linearGradient id={`lg-${c.id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={c.logo.c1} />
          <stop offset="1" stopColor={c.logo.c2} />
        </linearGradient>
      </defs>
      <Shape shape={c.logo.shape} id={c.id} />
    </svg>
  );
}
