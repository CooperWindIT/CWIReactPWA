/**
 * Read the first sheet of an .xlsx file in the browser – no extra npm package.
 * Uses the built-in DecompressionStream (Chrome / Edge 80+, Firefox 113+, Safari 16.4+).
 *
 *   const { headers, rows } = await readXlsx(file);
 *   headers -> ["ItemCode", "ItemName", ...]
 *   rows    -> [["CWIOTS0014", "Bushing", ...], ...]   (empty rows dropped)
 *
 * Old .xls (binary) files are not supported – they throw "XLS_NOT_SUPPORTED".
 */

const td = new TextDecoder("utf-8");

// ---------- tiny ZIP reader ----------
const readZip = (buf) => {
    const dv = new DataView(buf);
    // End Of Central Directory (search backwards)
    let eocd = -1;
    for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 66000); i--) {
        if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) throw new Error("NOT_XLSX");

    const count = dv.getUint16(eocd + 10, true);
    let p = dv.getUint32(eocd + 16, true);
    const entries = {};

    for (let n = 0; n < count; n++) {
        if (dv.getUint32(p, true) !== 0x02014b50) break;
        const method = dv.getUint16(p + 10, true);
        const compSize = dv.getUint32(p + 20, true);
        const nameLen = dv.getUint16(p + 28, true);
        const extraLen = dv.getUint16(p + 30, true);
        const commentLen = dv.getUint16(p + 32, true);
        const localOffset = dv.getUint32(p + 42, true);
        const name = td.decode(new Uint8Array(buf, p + 46, nameLen));
        entries[name] = { method, compSize, localOffset };
        p += 46 + nameLen + extraLen + commentLen;
    }
    return entries;
};

const inflateRaw = async (bytes) => {
    if (typeof DecompressionStream === "undefined") throw new Error("NO_DECOMPRESS");
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
    return new Uint8Array(await new Response(stream).arrayBuffer());
};

const readEntry = async (buf, entry) => {
    const dv = new DataView(buf);
    const o = entry.localOffset;
    const nameLen = dv.getUint16(o + 26, true);
    const extraLen = dv.getUint16(o + 28, true);
    const data = new Uint8Array(buf, o + 30 + nameLen + extraLen, entry.compSize);
    const raw = entry.method === 0 ? data : await inflateRaw(data);
    return td.decode(raw);
};

// ---------- sheet helpers ----------
const xml = (text) => new DOMParser().parseFromString(text, "application/xml");
const byTag = (node, tag) => Array.from(node.getElementsByTagNameNS("*", tag));

// "BC12" -> 54 (0-based column index)
const colIndex = (ref) => {
    const letters = String(ref || "").replace(/[0-9]/g, "");
    let n = 0;
    for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
    return n - 1;
};

const cellText = (c, shared) => {
    const type = c.getAttribute("t");
    if (type === "inlineStr") return byTag(c, "t").map(t => t.textContent).join("");
    const v = byTag(c, "v")[0]?.textContent ?? "";
    if (type === "s") return shared[Number(v)] ?? "";
    if (type === "b") return v === "1" ? "TRUE" : "FALSE";
    return v;
};

// path of the first sheet (follows workbook.xml -> rels)
const firstSheetPath = async (buf, entries) => {
    try {
        const wb = xml(await readEntry(buf, entries["xl/workbook.xml"]));
        const sheet = byTag(wb, "sheet")[0];
        const rid = sheet?.getAttribute("r:id") ||
            sheet?.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id");
        const rels = xml(await readEntry(buf, entries["xl/_rels/workbook.xml.rels"]));
        const rel = byTag(rels, "Relationship").find(r => r.getAttribute("Id") === rid);
        let target = rel?.getAttribute("Target") || "";
        target = target.startsWith("/") ? target.slice(1) : `xl/${target}`;
        if (entries[target]) return target;
    } catch { /* fall back below */ }
    return Object.keys(entries).filter(k => /^xl\/worksheets\/sheet\d+\.xml$/.test(k)).sort()[0];
};

export const readXlsx = async (file) => {
    if (/\.xls$/i.test(file?.name || "")) throw new Error("XLS_NOT_SUPPORTED");

    const buf = await file.arrayBuffer();
    const entries = readZip(buf);
    if (!entries["xl/workbook.xml"]) throw new Error("NOT_XLSX");

    // shared strings
    let shared = [];
    if (entries["xl/sharedStrings.xml"]) {
        const ss = xml(await readEntry(buf, entries["xl/sharedStrings.xml"]));
        shared = byTag(ss, "si").map(si => byTag(si, "t").map(t => t.textContent).join(""));
    }

    const sheetPath = await firstSheetPath(buf, entries);
    if (!sheetPath) throw new Error("NO_SHEET");
    const sheet = xml(await readEntry(buf, entries[sheetPath]));

    const grid = [];
    byTag(sheet, "row").forEach(r => {
        const rowIdx = Number(r.getAttribute("r")) - 1;
        const out = [];
        byTag(r, "c").forEach((c, i) => {
            const ci = c.getAttribute("r") ? colIndex(c.getAttribute("r")) : i;
            out[ci] = cellText(c, shared).trim();
        });
        grid[rowIdx >= 0 ? rowIdx : grid.length] = out;
    });

    const clean = grid.filter(r => r && r.some(v => v !== undefined && v !== ""));
    if (!clean.length) return { headers: [], rows: [] };

    const width = Math.max(...clean.map(r => r.length));
    const pad = (r) => Array.from({ length: width }, (_, i) => (r[i] ?? ""));
    const [head, ...body] = clean.map(pad);

    // drop columns that have no header and no values
    const keep = head.map((h, i) => h !== "" || body.some(r => r[i] !== ""));
    return {
        headers: head.filter((_, i) => keep[i]).map((h, i) => h || `Column ${i + 1}`),
        rows: body.map(r => r.filter((_, i) => keep[i]))
    };
};

export default readXlsx;