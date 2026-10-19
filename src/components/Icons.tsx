// Custom inline SVG icon set (24x24, stroke-based). No icon library needed.
import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };

function Base({ size = 20, children, ...rest }: P & { children: React.ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>
      {children}
    </svg>
  );
}

export const IconLogo = ({ size = 28, ...p }: P) => (
  <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" {...p}>
    <defs>
      <linearGradient id="jp-logo" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#6366f1" />
        <stop offset="1" stopColor="#2563eb" />
      </linearGradient>
    </defs>
    <rect width="32" height="32" rx="9" fill="url(#jp-logo)" />
    <path d="M7 17.5 25 8l-5.5 17-4.2-6.3z" fill="#fff" />
    <path d="M15.3 18.7 25 8" stroke="#c7d2fe" strokeWidth="1.6" />
    <path d="M15.3 18.7 14.6 24l2.6-2.6" fill="#e0e7ff" />
  </svg>
);

export const IconHome = (p: P) => <Base {...p}><path d="M3 11 12 4l9 7" /><path d="M5 10v10h14V10" /><path d="M10 20v-6h4v6" /></Base>;
export const IconBriefcase = (p: P) => <Base {...p}><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M3 13h18" /></Base>;
export const IconBoard = (p: P) => <Base {...p}><rect x="3" y="4" width="5" height="16" rx="1.5" /><rect x="10" y="4" width="5" height="11" rx="1.5" /><rect x="17" y="4" width="4" height="7" rx="1.5" /></Base>;
export const IconChart = (p: P) => <Base {...p}><path d="M4 20V10" /><path d="M10 20V4" /><path d="M16 20v-7" /><path d="M22 20H2" /></Base>;
export const IconUser = (p: P) => <Base {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-7 8-7s8 3 8 7" /></Base>;
export const IconBolt = (p: P) => <Base {...p}><path d="M13 2 4 14h7l-1 8 9-12h-7z" /></Base>;
export const IconSettings = (p: P) => <Base {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></Base>;
export const IconBell = (p: P) => <Base {...p}><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0" /></Base>;
export const IconSun = (p: P) => <Base {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></Base>;
export const IconMoon = (p: P) => <Base {...p}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></Base>;
export const IconMenu = (p: P) => <Base {...p}><path d="M4 6h16M4 12h16M4 18h16" /></Base>;
export const IconX = (p: P) => <Base {...p}><path d="M18 6 6 18M6 6l12 12" /></Base>;
export const IconSearch = (p: P) => <Base {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></Base>;
export const IconMapPin = (p: P) => <Base {...p}><path d="M12 21s-7-6.3-7-12a7 7 0 1 1 14 0c0 5.7-7 12-7 12z" /><circle cx="12" cy="9" r="2.5" /></Base>;
export const IconRupee = (p: P) => <Base {...p}><path d="M6 4h12M6 9h12M14 4c3 0 4 2.5 4 5s-2 5-6 5H6l8 7" /></Base>;
export const IconClock = (p: P) => <Base {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Base>;
export const IconBookmark = ({ filled, ...p }: P & { filled?: boolean }) => <Base {...p}><path d="M6 3h12v18l-6-4-6 4z" fill={filled ? "currentColor" : "none"} /></Base>;
export const IconCheck = (p: P) => <Base {...p}><path d="m5 12 5 5L20 7" /></Base>;
export const IconCheckCircle = (p: P) => <Base {...p}><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></Base>;
export const IconAlert = (p: P) => <Base {...p}><path d="M12 3 2 20h20z" /><path d="M12 10v4M12 17h.01" /></Base>;
export const IconUpload = (p: P) => <Base {...p}><path d="M12 16V4M7 9l5-5 5 5" /><path d="M4 16v4h16v-4" /></Base>;
export const IconDownload = (p: P) => <Base {...p}><path d="M12 4v12M7 11l5 5 5-5" /><path d="M4 20h16" /></Base>;
export const IconSparkles = (p: P) => <Base {...p}><path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8z" /><path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z" /><path d="M5 15l.6 1.4L7 17l-1.4.6L5 19l-.6-1.4L3 17l1.4-.6z" /></Base>;
export const IconSend = (p: P) => <Base {...p}><path d="M22 2 11 13" /><path d="M22 2 15 22l-4-9-9-4z" /></Base>;
export const IconPlus = (p: P) => <Base {...p}><path d="M12 5v14M5 12h14" /></Base>;
export const IconTrash = (p: P) => <Base {...p}><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" /></Base>;
export const IconCalendar = (p: P) => <Base {...p}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></Base>;
export const IconNote = (p: P) => <Base {...p}><path d="M5 3h10l4 4v14H5z" /><path d="M14 3v5h5M9 13h6M9 17h4" /></Base>;
export const IconArrowLeft = (p: P) => <Base {...p}><path d="M19 12H5M11 18l-6-6 6-6" /></Base>;
export const IconArrowRight = (p: P) => <Base {...p}><path d="M5 12h14M13 6l6 6-6 6" /></Base>;
export const IconGlobe = (p: P) => <Base {...p}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></Base>;
export const IconTable = (p: P) => <Base {...p}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 10h18M3 15h18M9 4v16" /></Base>;
export const IconFilter = (p: P) => <Base {...p}><path d="M3 5h18l-7 8v6l-4 2v-8z" /></Base>;
export const IconFile = (p: P) => <Base {...p}><path d="M6 2h9l5 5v15H6z" /><path d="M14 2v6h6" /></Base>;
export const IconGrip = (p: P) => <Base {...p}><circle cx="9" cy="6" r="1" /><circle cx="15" cy="6" r="1" /><circle cx="9" cy="12" r="1" /><circle cx="15" cy="12" r="1" /><circle cx="9" cy="18" r="1" /><circle cx="15" cy="18" r="1" /></Base>;
export const IconTrophy = (p: P) => <Base {...p}><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z" /><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" /></Base>;
export const IconEye = (p: P) => <Base {...p}><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></Base>;
export const IconUsers = (p: P) => <Base {...p}><circle cx="9" cy="8" r="3.5" /><path d="M2 20c0-3.5 3-6 7-6s7 2.5 7 6" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14c2.5.6 4 2.8 4 6" /></Base>;
export const IconRefresh = (p: P) => <Base {...p}><path d="M20 11a8 8 0 0 0-14.8-4M4 4v4h4M4 13a8 8 0 0 0 14.8 4M20 20v-4h-4" /></Base>;
