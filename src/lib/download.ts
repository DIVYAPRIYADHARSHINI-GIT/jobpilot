"use client";
import type { Application } from "./types";
import { toCsv, localDay } from "./stats";
import { buildSummaryPdf } from "./pdf";

function save(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function downloadCsv(apps: Application[]) {
  save(new Blob([toCsv(apps)], { type: "text/csv;charset=utf-8" }), `jobpilot-tracker-${localDay(Date.now())}.csv`);
}

export function downloadPdf(apps: Application[], name?: string) {
  const bytes = buildSummaryPdf(apps, { name });
  save(new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" }), `jobpilot-summary-${localDay(Date.now())}.pdf`);
}
