// Generates the 6 custom office/workplace SVG illustrations used on job detail
// pages (public/images/office/office-N.svg). Run: node scripts/make-office-svgs.mjs
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "images", "office");
mkdirSync(OUT, { recursive: true });

const SCENES = [
  { name: "Open-plan office with city view", wall: "#eef2ff", floor: "#c7d2fe", sky: ["#bfdbfe", "#e0e7ff"], accent: "#4f46e5", wood: "#a16207", kind: "open" },
  { name: "Meeting room with whiteboard", wall: "#ecfeff", floor: "#a5f3fc", sky: ["#99f6e4", "#ecfeff"], accent: "#0891b2", wood: "#92400e", kind: "meeting" },
  { name: "Cosy lounge and coffee bar", wall: "#fdf4ff", floor: "#f5d0fe", sky: ["#fbcfe8", "#fdf4ff"], accent: "#a21caf", wood: "#9a3412", kind: "lounge" },
  { name: "Focus desks by large windows", wall: "#f0fdf4", floor: "#bbf7d0", sky: ["#bbf7d0", "#f0fdf4"], accent: "#16a34a", wood: "#854d0e", kind: "open" },
  { name: "Team collaboration area", wall: "#fff7ed", floor: "#fed7aa", sky: ["#fde68a", "#fff7ed"], accent: "#ea580c", wood: "#7c2d12", kind: "meeting" },
  { name: "Night shift engineering floor", wall: "#1e1b4b", floor: "#312e81", sky: ["#0f172a", "#312e81"], accent: "#818cf8", wood: "#4338ca", kind: "lounge", night: true },
];

const W = 800;
const H = 360;

function skyline(x0, y0, w, h, color, seed) {
  let s = seed;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  let out = "";
  let x = x0;
  while (x < x0 + w) {
    const bw = 18 + rnd() * 26;
    const bh = h * (0.35 + rnd() * 0.6);
    out += `<rect x="${x.toFixed(1)}" y="${(y0 + h - bh).toFixed(1)}" width="${Math.min(bw, x0 + w - x).toFixed(1)}" height="${bh.toFixed(1)}" fill="${color}"/>`;
    x += bw + 3;
  }
  return out;
}

function windowPane(x, y, w, h, sc, i) {
  return `<g><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="url(#sky${i})"/>${skyline(x + 4, y + h * 0.35, w - 8, h * 0.65 - 2, sc.night ? "#1e293b" : "#a5b4fc", i * 7 + x)}${sc.night ? starField(x, y, w, h * 0.4, i) : `<circle cx="${x + w * 0.75}" cy="${y + h * 0.22}" r="12" fill="#fde68a"/>`}<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="none" stroke="#fff" stroke-width="6"/><line x1="${x + w / 2}" y1="${y}" x2="${x + w / 2}" y2="${y + h}" stroke="#fff" stroke-width="4"/></g>`;
}

function starField(x, y, w, h, seed) {
  let out = "";
  for (let k = 0; k < 8; k++) out += `<circle cx="${x + 10 + ((k * 37 + seed * 11) % (w - 20))}" cy="${y + 8 + ((k * 23) % Math.max(10, h - 10))}" r="1.6" fill="#e0e7ff"/>`;
  return out;
}

function desk(x, y, sc, person, tone) {
  const screen = sc.night ? "#22d3ee" : sc.accent;
  return `<g transform="translate(${x} ${y})">
    ${person ? personAt(40, -6, tone, sc) : ""}
    <rect x="-6" y="40" width="132" height="10" rx="4" fill="${sc.wood}"/>
    <rect x="6" y="50" width="6" height="56" fill="${sc.wood}" opacity=".8"/><rect x="108" y="50" width="6" height="56" fill="${sc.wood}" opacity=".8"/>
    <rect x="62" y="-14" width="56" height="38" rx="4" fill="#0f172a"/><rect x="65" y="-11" width="50" height="32" rx="2" fill="${screen}" opacity=".85"/>
    <rect x="70" y="-6" width="26" height="4" rx="2" fill="#e0e7ff"/><rect x="70" y="2" width="38" height="3" rx="1.5" fill="#e0e7ff" opacity=".7"/><rect x="70" y="9" width="30" height="3" rx="1.5" fill="#e0e7ff" opacity=".7"/>
    <rect x="86" y="24" width="8" height="16" fill="#334155"/><rect x="76" y="37" width="28" height="4" rx="2" fill="#334155"/>
    <rect x="10" y="30" width="16" height="10" rx="2" fill="#fff" stroke="${sc.accent}" stroke-width="2"/>
  </g>`;
}

function personAt(x, y, tone, sc) {
  const skin = ["#d39b72", "#8d5524", "#e0ac69", "#c68642"][tone % 4];
  const shirt = [sc.accent, "#0ea5e9", "#f59e0b", "#10b981"][tone % 4];
  return `<g transform="translate(${x} ${y})">
    <rect x="-20" y="30" width="40" height="60" rx="8" fill="#475569"/>
    <path d="M-18 46 c0 -22 8 -32 18 -32 s18 10 18 32z" fill="${shirt}"/>
    <circle cx="0" cy="0" r="12" fill="${skin}"/>
    <path d="M-12 -2 c-1 -14 10 -18 16 -16 c8 2 10 10 8 16 c-4 -6 -12 -8 -24 0z" fill="#1e1b4b"/>
  </g>`;
}

function plant(x, y, s = 1) {
  return `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-14 0 h28 l-4 -30 h-20z" fill="#f59e0b"/><path d="M0 -30 c-22 -12 -26 -40 -16 -56 c12 10 16 34 16 56z" fill="#22c55e"/><path d="M0 -30 c18 -18 38 -18 46 -10 c-12 14 -30 16 -46 10z" fill="#16a34a"/><path d="M0 -30 c-10 -24 0 -44 12 -50 c4 16 0 36 -12 50z" fill="#4ade80"/></g>`;
}

function lamp(x, sc) {
  return `<g><line x1="${x}" y1="0" x2="${x}" y2="44" stroke="#64748b" stroke-width="2"/><path d="M${x - 18} 62 q18 -26 36 0z" fill="${sc.accent}"/><ellipse cx="${x}" cy="62" rx="18" ry="4" fill="#fde68a" opacity=".9"/></g>`;
}

function meetingRoom(sc) {
  return `<g>
    <rect x="80" y="70" width="230" height="130" rx="8" fill="#fff" stroke="#cbd5e1" stroke-width="4"/>
    <path d="M104 170 l40 -40 30 24 46 -58 40 28" fill="none" stroke="${sc.accent}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
    <rect x="104" y="88" width="70" height="8" rx="4" fill="#94a3b8"/><rect x="240" y="150" width="46" height="30" rx="4" fill="#fde68a"/><rect x="196" y="150" width="36" height="30" rx="4" fill="#a7f3d0"/>
    <ellipse cx="520" cy="262" rx="190" ry="26" fill="${sc.wood}"/>
    ${personAt(380, 198, 1, sc)}${personAt(470, 190, 2, sc)}${personAt(570, 190, 0, sc)}${personAt(660, 198, 3, sc)}
    <rect x="470" y="240" width="40" height="8" rx="3" fill="#0f172a"/><rect x="570" y="240" width="40" height="8" rx="3" fill="#0f172a"/>
  </g>`;
}

function lounge(sc) {
  return `<g>
    <rect x="70" y="210" width="230" height="60" rx="22" fill="${sc.accent}"/><rect x="60" y="190" width="40" height="80" rx="18" fill="${sc.accent}" opacity=".85"/><rect x="270" y="190" width="40" height="80" rx="18" fill="${sc.accent}" opacity=".85"/>
    <rect x="96" y="196" width="80" height="30" rx="12" fill="#fff" opacity=".35"/><rect x="190" y="196" width="80" height="30" rx="12" fill="#fff" opacity=".35"/>
    ${personAt(160, 170, 2, sc)}
    <rect x="160" y="284" width="90" height="10" rx="5" fill="${sc.wood}"/><circle cx="190" cy="278" r="7" fill="#fff" stroke="${sc.accent}" stroke-width="2"/>
    <rect x="470" y="150" width="270" height="20" rx="6" fill="${sc.wood}"/><rect x="480" y="170" width="250" height="120" fill="${sc.wood}" opacity=".75"/>
    <rect x="520" y="110" width="34" height="40" rx="6" fill="#334155"/><rect x="528" y="120" width="18" height="10" rx="3" fill="#22d3ee"/>
    <circle cx="610" cy="140" r="9" fill="#fff" stroke="${sc.accent}" stroke-width="2"/><circle cx="640" cy="140" r="9" fill="#fff" stroke="${sc.accent}" stroke-width="2"/>
    ${desk(330, 190, sc, true, 3)}
  </g>`;
}

function openPlan(sc) {
  return `<g>${desk(70, 196, sc, true, 0)}${desk(250, 196, sc, true, 1)}${desk(430, 196, sc, false, 2)}${desk(610, 196, sc, true, 3)}</g>`;
}

SCENES.forEach((sc, idx) => {
  const i = idx + 1;
  const panes = [0, 1, 2, 3].map((k) => windowPane(70 + k * 170, 40, 150, 120, sc, i)).join("");
  const body = sc.kind === "meeting" ? meetingRoom(sc) : sc.kind === "lounge" ? lounge(sc) : openPlan(sc);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="t${i}">
  <title id="t${i}">${sc.name} (illustration)</title>
  <defs><linearGradient id="sky${i}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sc.sky[0]}"/><stop offset="1" stop-color="${sc.sky[1]}"/></linearGradient></defs>
  <rect width="${W}" height="${H}" fill="${sc.wall}"/>
  ${sc.kind === "meeting" ? windowPane(560, 40, 170, 120, sc, i) : panes}
  <rect y="290" width="${W}" height="70" fill="${sc.floor}"/>
  <rect y="286" width="${W}" height="6" fill="${sc.accent}" opacity=".35"/>
  ${lamp(200, sc)}${lamp(400, sc)}${lamp(600, sc)}
  ${body}
  ${plant(40, 300, 1)}${plant(765, 300, 0.9)}
</svg>
`;
  writeFileSync(join(OUT, `office-${i}.svg`), svg);
});
console.log(`wrote ${SCENES.length} office SVGs to ${OUT}`);
