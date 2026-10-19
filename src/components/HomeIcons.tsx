// Re-exports used by the home page plus a target icon for "matching".
export { IconArrowRight, IconBell, IconBoard, IconChart, IconDownload, IconSend, IconSparkles, IconUser } from "./Icons";

export const IconTarget = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="12" cy="12" r="1.5" fill="currentColor" />
  </svg>
);
