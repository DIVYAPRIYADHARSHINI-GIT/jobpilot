// Dependency-free text extraction for resume uploads (server only).
//  - DOCX: read word/document.xml from the zip (stored or deflated entries).
//  - PDF: decode Flate streams + object streams, map fonts through their
//    ToUnicode CMaps and read text-showing operators from page content.
// Good enough for typical text-based resumes; scanned (image) PDFs have no text.
import { inflateRawSync, inflateSync, constants } from "node:zlib";

export class ExtractError extends Error {
  code: string;
  constructor(code: string) {
    super(code);
    this.code = code;
  }
}

export function extractText(buf: Buffer, name: string, mime = ""): string {
  const lower = name.toLowerCase();
  if (buf.subarray(0, 5).toString("latin1") === "%PDF-") return extractPdf(buf);
  if (buf[0] === 0x50 && buf[1] === 0x4b) return extractDocx(buf);
  if (lower.endsWith(".txt") || mime.startsWith("text/")) return buf.toString("utf8");
  throw new ExtractError("unsupported");
}

/* ----------------------------------- DOCX ---------------------------------- */

export function unzipEntry(buf: Buffer, wanted: string): Buffer | null {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65_557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) return null;
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  for (let n = 0; n < count && p + 46 <= buf.length; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) break;
    const method = buf.readUInt16LE(p + 10);
    const compSize = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localOff = buf.readUInt32LE(p + 42);
    const fname = buf.subarray(p + 46, p + 46 + nameLen).toString("utf8");
    if (fname === wanted) {
      const start = localOff + 30 + buf.readUInt16LE(localOff + 26) + buf.readUInt16LE(localOff + 28);
      const data = buf.subarray(start, start + compSize);
      if (method === 0) return Buffer.from(data);
      if (method === 8) return inflateRawSync(data);
      return null;
    }
    p += 46 + nameLen + extraLen + commentLen;
  }
  return null;
}

const decodeEntities = (s: string) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&amp;/g, "&");

export function extractDocx(buf: Buffer): string {
  const xml = unzipEntry(buf, "word/document.xml");
  if (!xml) throw new ExtractError("docx");
  return decodeEntities(
    xml
      .toString("utf8")
      .replace(/<w:tab\/>/g, "\t")
      .replace(/<w:br[^>]*\/>/g, "\n")
      .replace(/<\/w:p>/g, "\n")
      .replace(/<[^>]+>/g, ""),
  );
}

/* ------------------------------------ PDF ---------------------------------- */

interface PdfObj {
  dict: string;
  stream?: Buffer;
}
interface CMap {
  bytes: number;
  map: Map<number, string>;
}

function inflate(data: Buffer): Buffer | null {
  try {
    return inflateSync(data);
  } catch {
    try {
      return inflateSync(data, { finishFlush: constants.Z_SYNC_FLUSH });
    } catch {
      return null;
    }
  }
}

function readObjects(src: string, buf: Buffer): Map<number, PdfObj> {
  const objects = new Map<number, PdfObj>();
  const re = /(\d+)\s+\d+\s+obj\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    const num = Number(m[1]);
    const start = m.index + m[0].length;
    const end = src.indexOf("endobj", start);
    if (end < 0) break;
    const body = src.slice(start, end);
    const si = body.search(/>>\s*stream(\r\n|\n|\r)/);
    if (si >= 0) {
      const sm = body.slice(si).match(/^>>\s*stream(\r\n|\n|\r)/)!;
      const dataStart = start + si + sm[0].length;
      let dataEnd = src.lastIndexOf("endstream", end);
      if (dataEnd < dataStart) dataEnd = end;
      const dict = body.slice(0, si + 2);
      let data: Buffer | null = buf.subarray(dataStart, dataEnd);
      if (/\/FlateDecode/.test(dict)) data = inflate(data);
      else if (/\/Filter/.test(dict)) data = null; // images etc.
      objects.set(num, { dict, stream: data ?? undefined });
    } else {
      objects.set(num, { dict: body });
    }
    re.lastIndex = end + 6;
  }
  // Compressed object streams (PDF 1.5+).
  for (const obj of [...objects.values()]) {
    if (!obj.stream || !/\/Type\s*\/ObjStm/.test(obj.dict)) continue;
    const text = obj.stream.toString("latin1");
    const n = Number(obj.dict.match(/\/N\s+(\d+)/)?.[1] ?? 0);
    const first = Number(obj.dict.match(/\/First\s+(\d+)/)?.[1] ?? 0);
    const nums = text.slice(0, first).trim().split(/\s+/).map(Number);
    for (let i = 0; i < n; i++) {
      const id = nums[i * 2];
      const off = first + nums[i * 2 + 1];
      const next = i + 1 < n ? first + nums[i * 2 + 3] : text.length;
      if (!objects.has(id)) objects.set(id, { dict: text.slice(off, next) });
    }
  }
  return objects;
}

/** Value of /Key in a dict: inline <<...>> dict, [..] array, or resolved indirect ref. */
function dictValue(dict: string, key: string, objects: Map<number, PdfObj>): string | null {
  const i = dict.search(new RegExp(`/${key}(?![A-Za-z])`));
  if (i < 0) return null;
  const rest = dict.slice(i + key.length + 1).trimStart();
  const ref = rest.match(/^(\d+)\s+\d+\s+R/);
  if (ref) return objects.get(Number(ref[1]))?.dict ?? null;
  if (rest.startsWith("<<")) {
    let depth = 0;
    for (let j = 0; j < rest.length - 1; j++) {
      if (rest[j] === "<" && rest[j + 1] === "<") {
        depth++;
        j++;
      } else if (rest[j] === ">" && rest[j + 1] === ">") {
        depth--;
        j++;
        if (depth === 0) return rest.slice(0, j + 1);
      }
    }
  }
  if (rest.startsWith("[")) return rest.slice(0, rest.indexOf("]") + 1);
  return null;
}

function utf16(hex: string): string {
  let s = "";
  for (let i = 0; i + 4 <= hex.length; i += 4) s += String.fromCharCode(parseInt(hex.slice(i, i + 4), 16));
  if (hex.length % 4 === 2) s += String.fromCharCode(parseInt(hex.slice(-2), 16));
  return s;
}

function parseCMap(text: string): CMap {
  const map = new Map<number, string>();
  const cs = text.match(/begincodespacerange\s*<([0-9a-fA-F]+)>/);
  const bytes = cs ? Math.max(1, cs[1].length / 2) : 2;
  for (const block of text.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) {
    for (const p of block[1].matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]*)>/g)) map.set(parseInt(p[1], 16), utf16(p[2]));
  }
  for (const block of text.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)) {
    for (const p of block[1].matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*(<[0-9a-fA-F]+>|\[[^\]]*\])/g)) {
      const lo = parseInt(p[1], 16);
      const hi = Math.min(parseInt(p[2], 16), lo + 65_535);
      if (p[3].startsWith("<")) {
        const dst = p[3].slice(1, -1);
        const head = dst.slice(0, -4);
        const tail = parseInt(dst.slice(-4), 16);
        for (let c = lo; c <= hi; c++) map.set(c, utf16(head + (tail + c - lo).toString(16).padStart(4, "0")));
      } else {
        const items = [...p[3].matchAll(/<([0-9a-fA-F]+)>/g)].map((x) => utf16(x[1]));
        items.forEach((v, k) => map.set(lo + k, v));
      }
    }
  }
  return { bytes, map };
}

function decodeBytes(bytes: string, cmap: CMap | null): string {
  if (!cmap) return bytes;
  let out = "";
  for (let i = 0; i + cmap.bytes <= bytes.length; i += cmap.bytes) {
    let code = 0;
    for (let k = 0; k < cmap.bytes; k++) code = (code << 8) | bytes.charCodeAt(i + k);
    out += cmap.map.get(code) ?? "";
  }
  return out;
}

type Tok = { t: "str"; v: string } | { t: "num"; v: number } | { t: "name"; v: string } | { t: "arr"; v: Tok[] } | { t: "mark" };

/** Read text from a page content stream. */
export function contentText(cs: string, fonts: Map<string, CMap | null>): string {
  let out = "";
  let font: CMap | null = null;
  let lineY = 0;
  let shownY: number | null = null;
  const stack: Tok[] = [];
  const show = (s: string) => {
    if (!s) return;
    if (shownY !== null && Math.abs(lineY - shownY) > 2) out += "\n";
    out += s;
    shownY = lineY;
  };
  const strOf = (tok?: Tok) => (tok && tok.t === "str" ? decodeBytes(tok.v, font) : "");
  let i = 0;
  const n = cs.length;
  while (i < n) {
    const c = cs[i];
    if (c === " " || c === "\n" || c === "\r" || c === "\t" || c === "\f" || c === "\0") {
      i++;
    } else if (c === "%") {
      while (i < n && cs[i] !== "\n" && cs[i] !== "\r") i++;
    } else if (c === "(") {
      let depth = 1;
      let s = "";
      i++;
      while (i < n && depth > 0) {
        const ch = cs[i];
        if (ch === "\\") {
          const nx = cs[i + 1];
          if (/[0-7]/.test(nx)) {
            const oct = cs.slice(i + 1, i + 4).match(/^[0-7]{1,3}/)![0];
            s += String.fromCharCode(parseInt(oct, 8));
            i += 1 + oct.length;
            continue;
          }
          const esc: Record<string, string> = { n: "\n", r: "\r", t: "\t", b: "\b", f: "\f" };
          if (nx === "\n" || nx === "\r") s += "";
          else s += esc[nx] ?? nx;
          i += 2;
          continue;
        }
        if (ch === "(") depth++;
        if (ch === ")") depth--;
        if (depth > 0) s += ch;
        i++;
      }
      stack.push({ t: "str", v: s });
    } else if (c === "<" && cs[i + 1] === "<") {
      let depth = 0;
      while (i < n) {
        if (cs[i] === "<" && cs[i + 1] === "<") {
          depth++;
          i += 2;
        } else if (cs[i] === ">" && cs[i + 1] === ">") {
          depth--;
          i += 2;
          if (depth === 0) break;
        } else i++;
      }
      stack.push({ t: "mark" });
    } else if (c === "<") {
      const end = cs.indexOf(">", i);
      const hex = cs.slice(i + 1, end < 0 ? n : end).replace(/\s+/g, "");
      let s = "";
      for (let k = 0; k < hex.length; k += 2) s += String.fromCharCode(parseInt(hex.slice(k, k + 2).padEnd(2, "0"), 16));
      stack.push({ t: "str", v: s });
      i = end < 0 ? n : end + 1;
    } else if (c === "[") {
      stack.push({ t: "mark" });
      i++;
    } else if (c === "]") {
      const arr: Tok[] = [];
      while (stack.length && stack[stack.length - 1].t !== "mark") arr.unshift(stack.pop()!);
      stack.pop();
      stack.push({ t: "arr", v: arr });
      i++;
    } else if (c === "/") {
      let j = i + 1;
      while (j < n && !/[\s/[\]()<>{}%]/.test(cs[j])) j++;
      stack.push({ t: "name", v: cs.slice(i + 1, j) });
      i = j;
    } else if (/[0-9+\-.]/.test(c)) {
      let j = i + 1;
      while (j < n && /[0-9.]/.test(cs[j])) j++;
      stack.push({ t: "num", v: Number(cs.slice(i, j)) || 0 });
      i = j;
    } else {
      let j = i;
      while (j < n && !/[\s/[\]()<>{}%]/.test(cs[j])) j++;
      if (j === i) j = i + 1;
      const op = cs.slice(i, j);
      i = j;
      const num = (k: number) => {
        const tok = stack[stack.length - k];
        return tok && tok.t === "num" ? tok.v : 0;
      };
      switch (op) {
        case "Tf": {
          const nameTok = stack[stack.length - 2];
          font = nameTok && nameTok.t === "name" ? (fonts.get(nameTok.v) ?? null) : null;
          break;
        }
        case "Td":
        case "TD":
          lineY += num(1);
          break;
        case "Tm":
          lineY = num(1);
          break;
        case "T*":
          lineY -= 12;
          break;
        case "Tj":
          show(strOf(stack[stack.length - 1]));
          break;
        case "'":
        case '"':
          lineY -= 12;
          show(strOf(stack[stack.length - 1]));
          break;
        case "TJ": {
          const arr = stack[stack.length - 1];
          if (arr && arr.t === "arr") {
            let s = "";
            for (const el of arr.v) {
              if (el.t === "str") s += decodeBytes(el.v, font);
              else if (el.t === "num" && el.v < -180 && !s.endsWith(" ")) s += " ";
            }
            show(s);
          }
          break;
        }
        case "BT":
          break;
        case "ET":
          if (out && !out.endsWith(" ") && !out.endsWith("\n")) out += " ";
          break;
        case "BI": {
          const ei = cs.indexOf("EI", i);
          i = ei < 0 ? n : ei + 2;
          break;
        }
      }
      stack.length = 0;
    }
  }
  return out;
}

export function extractPdf(buf: Buffer): string {
  const src = buf.toString("latin1");
  if (/\/Encrypt\s/.test(src)) throw new ExtractError("encrypted");
  const objects = readObjects(src, buf);
  const cmapCache = new Map<number, CMap | null>();
  const fontCMap = (fontObjNum: number): CMap | null => {
    if (cmapCache.has(fontObjNum)) return cmapCache.get(fontObjNum)!;
    const fdict = objects.get(fontObjNum)?.dict ?? "";
    const ref = fdict.match(/\/ToUnicode\s+(\d+)\s+\d+\s+R/);
    const stream = ref ? objects.get(Number(ref[1]))?.stream : undefined;
    const cm = stream ? parseCMap(stream.toString("latin1")) : null;
    cmapCache.set(fontObjNum, cm);
    return cm;
  };
  const pages = [...objects.entries()].filter(([, o]) => /\/Type\s*\/Page(?![s\w])/.test(o.dict)).sort((a, b) => a[0] - b[0]);
  const parts: string[] = [];
  for (const [, page] of pages) {
    let resources = dictValue(page.dict, "Resources", objects);
    let parent = page.dict.match(/\/Parent\s+(\d+)\s+\d+\s+R/);
    for (let k = 0; !resources && parent && k < 4; k++) {
      const pd = objects.get(Number(parent[1]))?.dict ?? "";
      resources = dictValue(pd, "Resources", objects);
      parent = pd.match(/\/Parent\s+(\d+)\s+\d+\s+R/);
    }
    const fonts = new Map<string, CMap | null>();
    const fontDict = resources ? dictValue(resources, "Font", objects) : null;
    if (fontDict) for (const f of fontDict.matchAll(/\/([^\s/<>[\]()]+)\s+(\d+)\s+\d+\s+R/g)) fonts.set(f[1], fontCMap(Number(f[2])));
    const contents = page.dict.match(/\/Contents\s*(\[[^\]]*\]|\d+\s+\d+\s+R)/)?.[1] ?? "";
    let streams = [...contents.matchAll(/(\d+)\s+\d+\s+R/g)].map((r) => objects.get(Number(r[1])));
    // A /Contents ref may point at an array object.
    if (streams.length === 1 && streams[0] && !streams[0].stream && streams[0].dict.trim().startsWith("[")) {
      streams = [...streams[0].dict.matchAll(/(\d+)\s+\d+\s+R/g)].map((r) => objects.get(Number(r[1])));
    }
    const cs = streams.map((s) => s?.stream?.toString("latin1") ?? "").join("\n");
    parts.push(contentText(cs, fonts));
  }
  const text = parts.join("\n").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!text) throw new ExtractError("noText");
  return text;
}
