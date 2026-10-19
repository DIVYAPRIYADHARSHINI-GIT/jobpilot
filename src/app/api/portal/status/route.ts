// POST /api/portal/status  { items: [{ receiptId, submittedAt, score }], speed }
// Simulated employer progress for each submission (stateless + deterministic).
import { handleError, InputError, json, readJson } from "@/lib/api";
import { portalState } from "@/lib/portal";

export async function POST(req: Request) {
  try {
    const body = await readJson<{ items?: unknown; speed?: unknown }>(req);
    if (!Array.isArray(body.items)) throw new InputError("badItems");
    const speed = body.speed === "realistic" ? "realistic" : "fast";
    const now = Date.now();
    const updates = body.items
      .slice(0, 300)
      .filter((i): i is { receiptId: string; submittedAt: number; score: number } => !!i && typeof (i as { receiptId?: unknown }).receiptId === "string" && /^JH-/.test((i as { receiptId: string }).receiptId))
      .map((i) => {
        const submittedAt = Math.min(now, Number(i.submittedAt) || now);
        return { receiptId: i.receiptId.slice(0, 40), ...portalState(i.receiptId, submittedAt, Number(i.score) || 0, speed, now) };
      });
    return json({ updates, now });
  } catch (e) {
    return handleError(e);
  }
}
