// POST /api/parse-resume  (multipart/form-data, field "file": PDF or DOCX, max 4 MB)
// Extracts the text and parses it into a partial profile the user can edit.
import { handleError, InputError, json } from "@/lib/api";
import { ExtractError, extractText } from "@/lib/extract";
import { parseResumeText } from "@/lib/resume";

export const runtime = "nodejs";
const MAX = 4 * 1024 * 1024;

export async function POST(req: Request) {
  try {
    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      throw new InputError("badForm");
    }
    const file = form.get("file");
    if (!file || typeof file === "string") throw new InputError("noFile");
    if (file.size > MAX) throw new InputError("tooBig", 413);
    if (!/\.(pdf|docx|txt)$/i.test(file.name)) throw new InputError("badType", 415);
    const buf = Buffer.from(await file.arrayBuffer());
    let text: string;
    try {
      text = extractText(buf, file.name, file.type);
    } catch (e) {
      if (e instanceof ExtractError) throw new InputError(e.code === "unsupported" ? "badType" : "unreadable", 422);
      throw new InputError("unreadable", 422);
    }
    const profile = parseResumeText(text, file.name);
    return json({ profile, chars: text.length });
  } catch (e) {
    return handleError(e);
  }
}
