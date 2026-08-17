import jsPDF from "jspdf";
import logo from "../../Assests/Images/logo.jpg";

// ─── text helpers ───────────────────────────────────────────────────────────

function toAsciiText(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/\u00A0/g, " ")
    .replace(/[^\x20-\x7E\n]/g, "");
}

function splitSafeText(doc, text, maxWidth) {
  return doc.splitTextToSize(toAsciiText(text), maxWidth);
}

// ─── simple text-list export ────────────────────────────────────────────────

export function diagramToPdf({ name, nodes = [], connections = [] }) {
  const doc = new jsPDF();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(toAsciiText(name || "Diagram"), 10, 20);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.text("Nodes:", 10, 35);

  nodes.forEach((node, i) => {
    doc.text(
      toAsciiText(`${i + 1}. ${node.label || node.shape} (${node.shape})`),
      15,
      45 + i * 8
    );
  });

  const yStart = 45 + nodes.length * 8 + 10;
  doc.text("Connections:", 10, yStart);

  connections.forEach((conn, i) => {
    doc.text(
      toAsciiText(`${i + 1}. ${conn.from} -> ${conn.to}`),
      15,
      yStart + 10 + i * 8
    );
  });

  return doc.output("blob");
}

// ─── geometry helpers ───────────────────────────────────────────────────────

function getNodeCenter(node) {
  return { x: node.x + node.w / 2, y: node.y + node.h / 2 };
}

function getEdgePoint(node, target) {
  const cx = node.x + node.w / 2;
  const cy = node.y + node.h / 2;
  const dx = target.x - cx;
  const dy = target.y - cy;
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);
  const hw = node.w / 2;
  const hh = node.h / 2;

  if (absDx === 0 && absDy === 0) return { x: cx, y: cy };

  const scaleX = absDx > 0 ? hw / absDx : Infinity;
  const scaleY = absDy > 0 ? hh / absDy : Infinity;
  const scale = Math.min(scaleX, scaleY);

  return { x: cx + dx * scale, y: cy + dy * scale };
}

function sampleQuadratic(p0, cp, p1, steps = 24) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = (1 - t) ** 2 * p0.x + 2 * (1 - t) * t * cp.x + t ** 2 * p1.x;
    const y = (1 - t) ** 2 * p0.y + 2 * (1 - t) * t * cp.y + t ** 2 * p1.y;
    pts.push({ x, y });
  }
  return pts;
}

function hexToRgb(hex) {
  const h = (hex || "").replace("#", "");
  if (h.length !== 6) return [255, 255, 255];
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

// ─── image helper ───────────────────────────────────────────────────────────
// Returns the data URL *and* the image's natural pixel dimensions, so the
// header can fit the logo into its box without stretching/distorting it.

function loadImageAsDataUrl(src) {
  return new Promise((resolve, reject) => {
    if (!src) {
      resolve(null);
      return;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);

      const isPng = src.toLowerCase().includes(".png");
      resolve({
        dataUrl: canvas.toDataURL(isPng ? "image/png" : "image/jpeg", 1.0),
        format: isPng ? "PNG" : "JPEG",
        width: canvas.width,
        height: canvas.height,
      });
    };

    img.onerror = reject;
    img.src = src;
  });
}

// ─── low-level vector drawing ───────────────────────────────────────────────

function drawPolyline(doc, points, style) {
  if (points.length < 2) return;

  const segs = [];
  for (let i = 1; i < points.length; i++) {
    segs.push([points[i].x - points[i - 1].x, points[i].y - points[i - 1].y]);
  }

  doc.lines(segs, points[0].x, points[0].y, [1, 1], style, true);
}

// function drawArrowHead(doc, tip, angle, color = "#1f1f1f") {
//   const headLen = 7;
//   const p1 = {
//     x: tip.x - headLen * Math.cos(angle - Math.PI / 6),
//     y: tip.y - headLen * Math.sin(angle - Math.PI / 6),
//   };
//   const p2 = {
//     x: tip.x - headLen * Math.cos(angle + Math.PI / 6),
//     y: tip.y - headLen * Math.sin(angle + Math.PI / 6),
//   };

//   doc.setFillColor(...hexToRgb(color));
//   doc.triangle(tip.x, tip.y, p1.x, p1.y, p2.x, p2.y, "F");
// }

// function drawConnection(doc, conn, from, to) {
//   const toCenter = getNodeCenter(to);
//   const fromCenter = getNodeCenter(from);
//   const start = getEdgePoint(from, toCenter);
//   const end = getEdgePoint(to, fromCenter);

//   const cp = conn.controlPoint || {
//     x: (start.x + end.x) / 2,
//     y: (start.y + end.y) / 2,
//   };

//   const dx = end.x - cp.x;
//   const dy = end.y - cp.y;
//   const len = Math.sqrt(dx * dx + dy * dy) || 1;
//   const shortenBy = 8;

//   const endShort =
//     len > shortenBy
//       ? { x: end.x - (dx / len) * shortenBy, y: end.y - (dy / len) * shortenBy }
//       : end;

//   const pts = sampleQuadratic(start, cp, endShort);

//   doc.setDrawColor(31, 31, 31);
//   doc.setLineWidth(1);

//   for (let i = 1; i < pts.length; i++) {
//     doc.line(pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y);
//   }

//   const angle = Math.atan2(end.y - cp.y, end.x - cp.x);
//   drawArrowHead(doc, end, angle);

//   if (conn.label) {
//     doc.setFont("helvetica", "normal");
//     doc.setFontSize(8);
//     doc.setTextColor(85, 85, 85);

//     const labelLines = splitSafeText(doc, conn.label, 60);
//     doc.text(labelLines, cp.x, cp.y - 4, { align: "center" });
//   }
// }


// ─── connection label font also scale-aware ─────────────────────────────────


function drawArrowHead(doc, tip, angle, color = "#1f1f1f", scale = 1) {
  const headLen = Math.max(3, 7 * scale);
  const p1 = {
    x: tip.x - headLen * Math.cos(angle - Math.PI / 6),
    y: tip.y - headLen * Math.sin(angle - Math.PI / 6),
  };
  const p2 = {
    x: tip.x - headLen * Math.cos(angle + Math.PI / 6),
    y: tip.y - headLen * Math.sin(angle + Math.PI / 6),
  };

  doc.setFillColor(...hexToRgb(color));
  doc.triangle(tip.x, tip.y, p1.x, p1.y, p2.x, p2.y, "F");
}

function drawConnection(doc, conn, from, to, scale = 1) {
  const toCenter = getNodeCenter(to);
  const fromCenter = getNodeCenter(from);
  const start = getEdgePoint(from, toCenter);
  const end = getEdgePoint(to, fromCenter);

  const cp = conn.controlPoint || {
    x: (start.x + end.x) / 2,
    y: (start.y + end.y) / 2,
  };

  const dx = end.x - cp.x;
  const dy = end.y - cp.y;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const shortenBy = 8;

  const endShort =
    len > shortenBy
      ? { x: end.x - (dx / len) * shortenBy, y: end.y - (dy / len) * shortenBy }
      : end;

  const pts = sampleQuadratic(start, cp, endShort);

  doc.setDrawColor(31, 31, 31);
  doc.setLineWidth(Math.max(0.5, 1 * scale));

  for (let i = 1; i < pts.length; i++) {
    doc.line(pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y);
  }

  const angle = Math.atan2(end.y - cp.y, end.x - cp.x);
  drawArrowHead(doc, end, angle, "#1f1f1f", scale);

  if (conn.label) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(Math.max(6, 8 * scale));
    doc.setTextColor(85, 85, 85);

    const labelLines = splitSafeText(doc, conn.label, 60);
    doc.text(labelLines, cp.x, cp.y - 4, { align: "center" });
  }
}

function drawNodeShape(doc, node) {
  const { x, y, w, h, shape, fillColor, strokeColor } = node;

  // Plain text labels (no shape) should never get a box drawn around
  // them — only actual shape nodes (rectangle, diamond, circle, etc.)
  // get a border/fill. This is what was wrapping floating text labels
  // like "Sample text" in a rectangle.
  if (shape === "text") return;

  const cx = x + w / 2;
  const cy = y + h / 2;

  const fill =
    !fillColor || fillColor === "transparent" || fillColor === "theme-auto"
      ? "#ffffff"
      : fillColor;

  const stroke =
    !strokeColor || strokeColor === "theme-auto" ? "#1f1f1f" : strokeColor;

  doc.setFillColor(...hexToRgb(fill));
  doc.setDrawColor(...hexToRgb(stroke));
  doc.setLineWidth(1);

  const style = shape === "text" ? "S" : "FD";

  if (shape === "rectangle" || shape === "process" || !shape) {
    doc.roundedRect(x, y, w, h, 4, 4, style);
  } else if (shape === "diamond") {
    drawPolyline(doc, [
      { x: cx, y },
      { x: x + w, y: cy },
      { x: cx, y: y + h },
      { x, y: cy },
    ], style);
  } else if (shape === "circle" || shape === "ellipse") {
    doc.ellipse(cx, cy, w / 2, h / 2, style);
  } else if (shape === "parallelogram") {
    const skew = w * 0.15;
    drawPolyline(doc, [
      { x: x + skew, y },
      { x: x + w, y },
      { x: x + w - skew, y: y + h },
      { x, y: y + h },
    ], style);
  } else if (shape === "hexagon") {
    const r2 = w * 0.18;
    drawPolyline(doc, [
      { x: x + r2, y },
      { x: x + w - r2, y },
      { x: x + w, y: cy },
      { x: x + w - r2, y: y + h },
      { x: x + r2, y: y + h },
      { x, y: cy },
    ], style);
  } else if (shape === "cylinder") {
    const ry = h * 0.15;
    doc.rect(x, y + ry, w, h - ry * 2, style);

    const bottomLeft = sampleQuadratic(
      { x, y: y + h - ry },
      { x, y: y + h },
      { x: cx, y: y + h },
      10
    );
    const bottomRight = sampleQuadratic(
      { x: cx, y: y + h },
      { x: x + w, y: y + h },
      { x: x + w, y: y + h - ry },
      10
    );

    drawPolyline(
      doc,
      [...bottomLeft, ...bottomRight, { x: x + w, y: y + ry }, { x, y: y + ry }],
      style
    );

    doc.ellipse(cx, y + ry, w / 2, ry, style);
  } else {
    doc.rect(x, y, w, h, style);
  }
}

// function drawNodeLabel(doc, node) {
//   const { x, y, w, h, shape, label, strokeColor } = node;
//   const cx = x + w / 2;
//   const cy = y + h / 2;

//   const stroke =
//     !strokeColor || strokeColor === "theme-auto" ? "#1f1f1f" : strokeColor;
//   const textColor = shape === "text" ? stroke : "#1f1f1f";

//   doc.setTextColor(...hexToRgb(textColor));
//   doc.setFont("helvetica", "normal");
//   doc.setFontSize(10);

//   const maxTextW = Math.max(w - 16, 20);
//   const lines = splitSafeText(doc, label || "", maxTextW);
//   const lineH = 12;
//   const maxLinesThatFit = Math.max(1, Math.floor((h - 10) / lineH));
//   const visibleLines = lines.slice(0, maxLinesThatFit);

//   if (lines.length > maxLinesThatFit && visibleLines.length > 0) {
//     let last = visibleLines[visibleLines.length - 1];
//     if (last.length > 3) last = `${last.slice(0, last.length - 3)}...`;
//     visibleLines[visibleLines.length - 1] = last;
//   }

//   const totalH = visibleLines.length * lineH;
//   let ty = cy - totalH / 2 + 9;

//   visibleLines.forEach((line) => {
//     doc.text(line, cx, ty, { align: "center" });
//     ty += lineH;
//   });
// }

// ─── header ─────────────────────────────────────────────────────────────────


// ─── node label (now scale-aware, auto-shrinks before truncating) ──────────

function drawNodeLabel(doc, node, scale = 1) {
  const { x, y, w, h, shape, label, strokeColor } = node;
  const cx = x + w / 2;
  const cy = y + h / 2;

  const stroke =
    !strokeColor || strokeColor === "theme-auto" ? "#1f1f1f" : strokeColor;
  const textColor = shape === "text" ? stroke : "#1f1f1f";

  doc.setTextColor(...hexToRgb(textColor));
  doc.setFont("helvetica", "normal");

  const maxTextW = Math.max(w - 16, 20);

  // Start at a font size proportional to how much the whole diagram was
  // scaled, then shrink further in small steps until the label's lines
  // actually fit inside the node's height. This is what was missing:
  // font size was fixed at 10pt regardless of how small `w`/`h` had
  // become after fitScale, so text wrapped into tiny/mid-word fragments
  // and then got truncated with "...".
  const baseFontSize = 10 * scale;
  const minFontSize = Math.max(4, 5 * scale); // never go unreadably small
  let fontSize = baseFontSize;
  let lines = [];
  let lineH = 0;

  while (fontSize >= minFontSize) {
    doc.setFontSize(fontSize);
    lines = splitSafeText(doc, label || "", maxTextW);
    lineH = fontSize * 1.25;
    const neededH = lines.length * lineH;

    if (neededH <= h - 6 || fontSize <= minFontSize) break;
    fontSize -= 0.5;
  }

  doc.setFontSize(fontSize);

  const maxLinesThatFit = Math.max(1, Math.floor((h - 6) / lineH));
  const visibleLines = lines.slice(0, maxLinesThatFit);

  // Only truncate as an absolute last resort, if shrinking the font
  // still wasn't enough to fit every line.
  if (lines.length > maxLinesThatFit && visibleLines.length > 0) {
    let last = visibleLines[visibleLines.length - 1];
    if (last.length > 3) last = `${last.slice(0, last.length - 3)}...`;
    visibleLines[visibleLines.length - 1] = last;
  }

  const totalH = visibleLines.length * lineH;
  let ty = cy - totalH / 2 + lineH * 0.75;

  visibleLines.forEach((line) => {
    doc.text(line, cx, ty, { align: "center" });
    ty += lineH;
  });
}

function buildDefaultRows(opts) {
  const rows = [];

  if (opts.docNo || opts.documentNo) {
    rows.push({
      label: "DOC.NO",
      value: toAsciiText(opts.docNo || opts.documentNo),
    });
  }

  if (opts.date) {
    rows.push({
      label: "DATE",
      value: toAsciiText(opts.date),
    });
  }

  if (!rows.length) {
    rows.push({ label: "DOC.NO", value: "-" });
    rows.push({ label: "DATE", value: "-" });
  }

  return rows;
}

function drawHeader(doc, pageW, margin, opts = {}) {
  const { name, logoDataUrl, logoFormat, logoNaturalW, logoNaturalH, rows } = opts;
  const metaRows = rows && rows.length ? rows : buildDefaultRows(opts);

  const navy = [26, 43, 76];
  const totalH = 64;
  const logoW = 95;
  const metaLabelW = 110;
  const metaValueW = 180;
  const metaW = metaLabelW + metaValueW;
  const titleW = pageW - margin * 2 - logoW - metaW;
  const top = margin;
  const metaX = margin + logoW + titleW;
  const rowH = totalH / metaRows.length;

  doc.setDrawColor(...navy);
  doc.setLineWidth(1.2);
  doc.rect(margin, top, pageW - margin * 2, totalH, "S");
  doc.line(margin + logoW, top, margin + logoW, top + totalH);
  doc.line(metaX, top, metaX, top + totalH);
  doc.line(metaX + metaLabelW, top, metaX + metaLabelW, top + totalH);

  if (logoDataUrl) {
    // Fit the logo into its cell using "contain" sizing (preserve aspect
    // ratio) instead of stretching it to the box's exact width/height —
    // that stretching is what was distorting the logo before.
    const pad = 6;
    const boxW = logoW - pad * 2;
    const boxH = totalH - pad * 2;

    let imgW = boxW;
    let imgH = boxH;

    if (logoNaturalW && logoNaturalH) {
      const ratio = logoNaturalW / logoNaturalH;
      if (boxW / boxH > ratio) {
        imgH = boxH;
        imgW = boxH * ratio;
      } else {
        imgW = boxW;
        imgH = boxW / ratio;
      }
    }

    const imgX = margin + pad + (boxW - imgW) / 2;
    const imgY = top + pad + (boxH - imgH) / 2;

    doc.addImage(logoDataUrl, logoFormat || "JPEG", imgX, imgY, imgW, imgH);
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.setTextColor(...navy);

  const titleLines = splitSafeText(doc, name || "Diagram", titleW - 20);
  const titleLineH = 16;
  const titleStartY = top + totalH / 2 - ((titleLines.length - 1) * titleLineH) / 2 + 5;
  doc.text(titleLines, margin + logoW + titleW / 2, titleStartY, { align: "center" });

  doc.setLineWidth(0.6);
  metaRows.forEach((r, i) => {
    const rowY = top + i * rowH;
    if (i > 0) doc.line(metaX, rowY, metaX + metaW, rowY);

    doc.setFillColor(...navy);
    doc.rect(metaX, rowY, metaLabelW, rowH, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text(toAsciiText(`${r.label}:`), metaX + metaLabelW - 5, rowY + rowH / 2 + 2.5, {
      align: "right",
    });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(20, 20, 20);
    doc.text(toAsciiText(r.value), metaX + metaLabelW + 6, rowY + rowH / 2 + 2.5);
  });

  return top + totalH + 12;
}

// ─── main export ────────────────────────────────────────────────────────────

// Diagram coordinates are authored on-screen at CSS pixel scale (96 dpi).
// PDF units here are points (72 dpi). Mapping px values straight into pt
// 1:1 makes every node render ~33% larger, physically, than it looked on
// screen. PX_TO_PT corrects that so cards come out at a realistic size
// instead of being blown up to fill the page.
const PX_TO_PT = 0.75;

export async function exportDiagramAsPdf({ name, nodes = [], connections = [], meta = {} }) {
  if (!nodes.length) return new jsPDF();

  const padding = 40;
  const minX = Math.min(...nodes.map((n) => n.x)) - padding;
  const minY = Math.min(...nodes.map((n) => n.y)) - padding;
  const maxX = Math.max(...nodes.map((n) => n.x + n.w)) + padding;
  const maxY = Math.max(...nodes.map((n) => n.y + n.h)) + padding;

  const cropW = maxX - minX;
  const cropH = maxY - minY;

  const doc = new jsPDF({
    orientation: cropW > cropH ? "landscape" : "portrait",
    unit: "pt",
    format: "a4",
    compress: true,
  });

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 30;

  let logoData = null;
  try {
    logoData = await loadImageAsDataUrl(meta.logoDataUrl || logo);
  } catch (e) {
    logoData = null;
  }

  const contentTop = drawHeader(doc, pageW, margin, {
    name,
    ...meta,
    logoDataUrl: logoData?.dataUrl,
    logoFormat: logoData?.format || "JPEG",
    logoNaturalW: logoData?.width,
    logoNaturalH: logoData?.height,
  });

  const availW = pageW - margin * 2;
  const availH = pageH - contentTop - margin;

  // Fit to the page, but never render larger than "true" px->pt size.
  const rawFit = Math.min(availW / cropW, availH / cropH);
  const fitScale = Math.min(rawFit, PX_TO_PT);

  const drawW = cropW * fitScale;
  const drawH = cropH * fitScale;
  const offsetX = margin + (availW - drawW) / 2 - minX * fitScale;
  const offsetY = contentTop + (availH - drawH) / 2 - minY * fitScale;

  const transformed = nodes.map((n) => ({
    ...n,
    x: n.x * fitScale + offsetX,
    y: n.y * fitScale + offsetY,
    w: n.w * fitScale,
    h: n.h * fitScale,
  }));

  const nodeMap = Object.fromEntries(transformed.map((n) => [n.id, n]));

  // connections.forEach((conn) => {
  //   const from = nodeMap[conn.from];
  //   const to = nodeMap[conn.to];
  //   if (!from || !to) return;

  //   const scaledConn = conn.controlPoint
  //     ? {
  //         ...conn,
  //         controlPoint: {
  //           x: conn.controlPoint.x * fitScale + offsetX,
  //           y: conn.controlPoint.y * fitScale + offsetY,
  //         },
  //       }
  //     : conn;

  //   drawConnection(doc, scaledConn, from, to);
  // });

  // transformed.forEach((node) => drawNodeShape(doc, node));
  // transformed.forEach((node) => drawNodeLabel(doc, node));
  connections.forEach((conn) => {
    const from = nodeMap[conn.from];
    const to = nodeMap[conn.to];
    if (!from || !to) return;

    const scaledConn = conn.controlPoint
      ? {
          ...conn,
          controlPoint: {
            x: conn.controlPoint.x * fitScale + offsetX,
            y: conn.controlPoint.y * fitScale + offsetY,
          },
        }
      : conn;

    drawConnection(doc, scaledConn, from, to, fitScale);
  });

  transformed.forEach((node) => drawNodeShape(doc, node));
  transformed.forEach((node) => drawNodeLabel(doc, node, fitScale));

  return doc;
}