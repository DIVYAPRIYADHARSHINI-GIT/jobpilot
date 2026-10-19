"use client";
// Background sync with the mock JobHub portal: every 15 s (and on focus) asks
// /api/portal/status for updates on open submissions, merges them into the
// tracker and shows a toast. One interval, no state in render -> no loops.
import { useEffect, useRef } from "react";
import { applyPortalUpdates, peekState, type PortalUpdate } from "@/lib/store";
import { isFinal } from "@/lib/portal";
import { postJson } from "@/lib/client";
import { useI18n } from "@/i18n";
import { toast } from "./ui";

const POLL_MS = 15_000;

export function StatusSync() {
  const { t } = useI18n();
  const tRef = useRef(t);
  tRef.current = t;

  useEffect(() => {
    let busy = false;
    let alive = true;
    const tick = async () => {
      if (busy || document.visibilityState === "hidden") return;
      const { apps, settings } = peekState();
      const items = apps
        .filter((a) => a.receiptId?.startsWith("JH-") && a.submittedAt && !isFinal(a.portalStatus))
        .map((a) => ({ receiptId: a.receiptId!, submittedAt: a.submittedAt!, score: a.matchScore }));
      if (!items.length) return;
      busy = true;
      try {
        const r = await postJson<{ updates: PortalUpdate[] }>("/api/portal/status", { items, speed: settings.simSpeed }, 8000);
        if (!alive) return;
        const created = applyPortalUpdates(r.updates);
        for (const n of created.slice(0, 2)) {
          const key = `notif.status.${n.status ?? "applied"}` as const;
          toast(tRef.current(key, { company: n.company, title: n.title }), n.status === "rejected" ? "info" : "success");
        }
      } catch {
        /* offline or slow: try again next tick */
      } finally {
        busy = false;
      }
    };
    const first = setTimeout(tick, 1500);
    const id = setInterval(tick, POLL_MS);
    const onVis = () => document.visibilityState === "visible" && tick();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      alive = false;
      clearTimeout(first);
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return null;
}
