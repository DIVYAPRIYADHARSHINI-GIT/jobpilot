// Dependency-free PDF summary of the tracker (A4, Helvetica core fonts).
// Like most generated reports it is in English: the PDF core fonts cannot
// render Tamil/Devanagari, and non-Latin text is transliterated away safely.
import type { Application, Stage } from "./types.ts";
import { computeStats, localDay } from "./stats.ts";

const W = 595.28;
const H = 841.89;
const M = 40;

type RGB = [number, number, number];
const INDIGO: RGB = [0.31, 0.27, 0.9];
const SLATE: RGB = [0.39, 0.45, 0.55];
const DARK: RGB = [0.06, 0.09, 0.16];
const STAGE_COLOR: Record<Stage, RGB> = {
  saved: [0.58, 0.64, 0.72],
  applied: [0.23, 0.51, 0.96],
  interview: [0.55, 0.36, 0.96],
  offer: [0.06, 0.73, 0.51],
  rejected: [0.96, 0.25, 0.37],
};

/** Keep printable Latin-1; strip everything the core fonts can't encode. */
export function pdfSafe(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[₹]/g, "Rs ")
    .replace(/[–—]/g, "-")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

// Approximate Helvetica widths (per 1000 em) for truncation.
function textWidth(s: string, size: number) {
  let w = 0;
  for (const ch of s) w += /[il.,'|!:;]/.test(ch) ? 260 : /[mwMW]/.test(ch) ? 850 : /[A-Z]/.test(ch) ? 660 : /[ ]/.test(ch) ? 280 : 540;
  return (w / 1000) * size;
}
function fit(s: string, size: number, max: number) {
  if (textWidth(s, size) <= max) return s;
  let out = s;
  while (out.length > 1 && textWidth(out + "...", size) > max) out = out.slice(0, -1);
  return out + "...";
}

class Page {
  ops: string[] = [];
  color(c: RGB) {
    return `${c.map((v) => v.toFixed(3)).join(" ")}`;
  }
  rect(x: number, y: number, w: number, h: number, c: RGB) {
    this.ops.push(`${this.color(c)} rg ${x.toFixed(2)} ${(H - y - h).toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`);
  }
  line(x1: number, y1: number, x2: number, y2: number, c: RGB, w = 0.6) {
    this.ops.push(`${this.color(c)} RG ${w} w ${x1.toFixed(2)} ${(H - y1).toFixed(2)} m ${x2.toFixed(2)} ${(H - y2).toFixed(2)} l S`);
  }
  text(s: string, x: number, y: number, size = 10, c: RGB = DARK, bold = false, maxW?: number) {
    const raw = maxW ? fit(s, size, maxW) : s;
    this.ops.push(`BT /${bold ? "F2" : "F1"} ${size} Tf ${this.color(c)} rg ${x.toFixed(2)} ${(H - y).toFixed(2)} Td (${pdfSafe(raw)}) Tj ET`);
  }
}

export function buildSummaryPdf(apps: Application[], opts: { name?: string; now?: number } = {}): Uint8Array {
  const now = opts.now ?? Date.now();
  const s = computeStats(apps, now);
  const pages: Page[] = [];
  let p = new Page();
  pages.push(p);

  // Header band
  p.rect(0, 0, W, 78, INDIGO);
  p.text("JobPilot", M, 38, 24, [1, 1, 1], true);
  p.text("Apply smarter, not harder.", M, 58, 11, [0.88, 0.9, 1]);
  p.text("Application summary", W - M - 130, 36, 12, [1, 1, 1], true);
  p.text(`Generated ${localDay(now)}`, W - M - 130, 54, 10, [0.88, 0.9, 1]);
  let y = 104;
  if (opts.name) {
    p.text(`Candidate: ${opts.name}`, M, y, 11, DARK, true);
    y += 18;
  }
  p.text("Demo report - built-in JobHub portal only. No real applications were sent.", M, y, 9, SLATE);
  y += 24;

  // KPI boxes
  const kpis: Array<[string, string]> = [
    ["Applications", String(s.total)],
    ["Response rate", `${s.responseRate}%`],
    ["Interviews", String(s.interviews)],
    ["Offers", String(s.offers)],
    ["Saved", String(s.saved)],
  ];
  const bw = (W - 2 * M - 4 * 10) / 5;
  kpis.forEach(([k, v], i) => {
    const x = M + i * (bw + 10);
    p.rect(x, y, bw, 52, [0.94, 0.95, 1]);
    p.text(v, x + 10, y + 26, 18, INDIGO, true);
    p.text(k, x + 10, y + 42, 8.5, SLATE);
  });
  y += 76;

  // Pipeline bar
  p.text("Pipeline", M, y, 12, DARK, true);
  y += 12;
  const all = apps.length || 1;
  let x = M;
  (Object.keys(STAGE_COLOR) as Stage[]).forEach((st) => {
    const w = ((W - 2 * M) * s.byStage[st]) / all;
    if (w > 0) p.rect(x, y, w, 12, STAGE_COLOR[st]);
    x += w;
  });
  y += 28;
  x = M;
  (Object.keys(STAGE_COLOR) as Stage[]).forEach((st) => {
    p.rect(x, y - 8, 8, 8, STAGE_COLOR[st]);
    const label = `${st[0].toUpperCase()}${st.slice(1)} ${s.byStage[st]}`;
    p.text(label, x + 12, y, 9, SLATE);
    x += textWidth(label, 9) + 30;
  });
  y += 24;

  if (s.missingSkills.length) {
    p.text("Top missing skills", M, y, 12, DARK, true);
    y += 16;
    p.text(s.missingSkills.map((m) => `${m.skill} (${m.count})`).join(",  "), M, y, 9.5, SLATE, false, W - 2 * M);
    y += 26;
  }

  // Table
  const cols: Array<[string, number]> = [["Company", 110], ["Role", 150], ["Stage", 62], ["Match", 42], ["Applied", 64], ["Interview", 87]];
  const header = () => {
    p.rect(M, y - 12, W - 2 * M, 18, [0.95, 0.96, 0.98]);
    let cx = M + 6;
    for (const [h, w] of cols) {
      p.text(h.toUpperCase(), cx, y, 8, SLATE, true);
      cx += w;
    }
    y += 18;
  };
  p.text(`Applications (${apps.length})`, M, y, 12, DARK, true);
  y += 22;
  header();
  const sorted = [...apps].sort((a, b) => (b.submittedAt ?? b.savedAt) - (a.submittedAt ?? a.savedAt));
  for (const a of sorted) {
    if (y > H - 50) {
      p = new Page();
      pages.push(p);
      y = 50;
      header();
    }
    const vals = [a.company, a.title, a.stage[0].toUpperCase() + a.stage.slice(1), `${a.matchScore}%`, a.submittedAt ? localDay(a.submittedAt) : "-", a.interviewDate ? a.interviewDate.replace("T", " ") : "-"];
    let cx = M + 6;
    vals.forEach((v, i) => {
      if (i === 2) p.rect(cx - 2, y - 8, 6, 6, STAGE_COLOR[a.stage]);
      p.text(v, i === 2 ? cx + 7 : cx, y, 9, DARK, i === 0, cols[i][1] - 10);
      cx += cols[i][1];
    });
    p.line(M, y + 6, W - M, y + 6, [0.89, 0.91, 0.94]);
    y += 18;
  }
  if (!apps.length) p.text("No applications yet.", M + 6, y, 10, SLATE);

  pages.forEach((pg, i) => pg.text(`JobPilot demo  -  page ${i + 1} of ${pages.length}`, M, H - 22, 8, SLATE));
  return assemble(pages);
}

function assemble(pages: Page[]): Uint8Array {
  const objs: string[] = [];
  const add = (s: string) => objs.push(s) ;
  // 1 catalog, 2 pages, 3 font regular, 4 font bold, then page/content pairs.
  add("<< /Type /Catalog /Pages 2 0 R >>");
  const kids = pages.map((_, i) => `${5 + i * 2} 0 R`).join(" ");
  add(`<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>`);
  add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
  pages.forEach((pg, i) => {
    const content = pg.ops.join("\n");
    add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${6 + i * 2} 0 R >>`);
    add(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
  });
  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  objs.forEach((o, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}`;
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R /Info << /Title (JobPilot application summary) /Producer (JobPilot) >> >>\nstartxref\n${xref}\n%%EOF\n`;
  // All content is ASCII, so string length == byte length.
  return new TextEncoder().encode(out);
}
