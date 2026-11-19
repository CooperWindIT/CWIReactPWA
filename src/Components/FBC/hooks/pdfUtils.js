import jsPDF from "jspdf";
import logo from "../../Assests/Images/logo.jpg";
import {
  ARROW_TYPE,
  ARROWHEAD,
  ARROW_HEAD_LEN,
  ARROW_HEAD_W,
  CONNECTION_WIDTH,
  cornerRadiusFor,
  STROKE_STYLE,
  resolveArrowStyle,
  getConnectionAnchors,
  anchorPoint,
  getElbowPoints,
  trimForArrow,
  polylineMidpoint,
} from "../connectionRouting";

// ─── text helpers ───────────────────────────────────────────────────────────

function toAsciiText(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/ /g, " ")
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

// The canvas eases every elbow corner (see buildPolylinePath). Sampling the
// same easing here keeps a printed arrow looking like the one on screen
// instead of a harder, squarer version of it.
function roundPolylineCorners(points, radius) {
  if (points.length < 3 || radius <= 0) return points;

  const out = [points[0]];

  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const corner = points[i];
    const next = points[i + 1];

    const inLen = Math.hypot(corner.x - prev.x, corner.y - prev.y);
    const outLen = Math.hypot(next.x - corner.x, next.y - corner.y);
    if (inLen < 0.01 || outLen < 0.01) {
      out.push(corner);
      continue;
    }

    const r = Math.min(radius, inLen / 2, outLen / 2);
    const enter = {
      x: corner.x + ((prev.x - corner.x) / inLen) * r,
      y: corner.y + ((prev.y - corner.y) / inLen) * r,
    };
    const exit = {
      x: corner.x + ((next.x - corner.x) / outLen) * r,
      y: corner.y + ((next.y - corner.y) / outLen) * r,
    };

    out.push(enter);
    out.push(...sampleQuadratic(enter, corner, exit, 6).slice(1));
  }

  out.push(points[points.length - 1]);
  return out;
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

// "theme-auto" means "whatever colour the canvas theme is using". A PDF page
// is always white, so it resolves to the dark ink here regardless of which
// theme the diagram was drawn in.
function resolveInk(color, fallback = "#1f1f1f") {
  if (!color || color === "theme-auto") return fallback;
  return color;
}

// Does this shape actually have a background, or is it see-through?
//
// This distinction is why a diagram could come out with no arrows at all. A
// transparent shape used to be painted with a SOLID WHITE fill, which on a
// white page looks identical to transparent — right up until it is drawn over
// something, at which point it quietly erases it. A swimlane frame drawn
// around a whole flowchart wiped every arrow inside it.
function hasBackground(fillColor) {
  return Boolean(
    fillColor && fillColor !== "transparent" && fillColor !== "theme-auto"
  );
}

// ─── containment ────────────────────────────────────────────────────────────

// How far a shape may stick out of another and still count as inside it.
const CONTAINMENT_SLACK = 2;

// Does `outer` fully enclose `inner`? Area is compared as well as bounds so
// two shapes of the same size can't each claim to contain the other.
function nodeContains(outer, inner) {
  if (outer.id === inner.id) return false;
  if (outer.w * outer.h <= inner.w * inner.h) return false;

  return inner.x >= outer.x - CONTAINMENT_SLACK
    && inner.y >= outer.y - CONTAINMENT_SLACK
    && inner.x + inner.w <= outer.x + outer.w + CONTAINMENT_SLACK
    && inner.y + inner.h <= outer.y + outer.h + CONTAINMENT_SLACK;
}

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

      // Flatten onto white before re-encoding. A transparent PNG otherwise
      // composites against black, which turns a logo or a cut-out picture
      // into a dark slab on a white page.
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      const isPng = /^data:image\/png/i.test(src) || src.toLowerCase().includes(".png");
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

function setDash(doc, strokeStyle, strokeWidth) {
  if (typeof doc.setLineDashPattern !== "function") return;

  if (strokeStyle === STROKE_STYLE.DASHED) {
    doc.setLineDashPattern([strokeWidth * 2.8, strokeWidth * 2.2], 0);
    return;
  }

  if (strokeStyle === STROKE_STYLE.DOTTED) {
    // jsPDF won't render a true zero-length dash the way an SVG round cap
    // does, so a very short dash stands in for the dot.
    doc.setLineDashPattern([strokeWidth * 0.3, strokeWidth * 2.2], 0);
    return;
  }

  doc.setLineDashPattern([], 0);
}

// Draws whichever head shape the arrow was given. `angle` is the direction the
// line is travelling AT that end, so the head points the way the arrow goes.
function drawArrowHead(doc, tip, angle, type, color, size, lineWidth) {
  if (!type || type === ARROWHEAD.NONE) return;

  const len = Math.max(3, size);
  const halfW = Math.max(2, size * (ARROW_HEAD_W / ARROW_HEAD_LEN) * 0.5);

  const back = { x: tip.x - len * Math.cos(angle), y: tip.y - len * Math.sin(angle) };
  const perp = { x: -Math.sin(angle), y: Math.cos(angle) };

  const left = { x: back.x + perp.x * halfW, y: back.y + perp.y * halfW };
  const right = { x: back.x - perp.x * halfW, y: back.y - perp.y * halfW };

  if (typeof doc.setLineDashPattern === "function") doc.setLineDashPattern([], 0);

  if (type === ARROWHEAD.ARROW) {
    // Open barb: two strokes, no fill.
    doc.setDrawColor(...hexToRgb(color));
    doc.setLineWidth(Math.max(0.4, lineWidth));
    doc.line(tip.x, tip.y, left.x, left.y);
    doc.line(tip.x, tip.y, right.x, right.y);
    return;
  }

  if (type === ARROWHEAD.TRIANGLE_OUTLINE) {
    doc.setDrawColor(...hexToRgb(color));
    doc.setLineWidth(Math.max(0.4, lineWidth));
    doc.triangle(tip.x, tip.y, left.x, left.y, right.x, right.y, "S");
    return;
  }

  doc.setFillColor(...hexToRgb(color));
  doc.triangle(tip.x, tip.y, left.x, left.y, right.x, right.y, "F");
}

function angleBetween(from, to) {
  return Math.atan2(to.y - from.y, to.x - from.x);
}

// Works out the arrow's route in CANVAS coordinates, mirroring what
// Connections.jsx draws, and hands back the point list. Routing here rather
// than in page coordinates matters: the elbow router's stub length and corner
// radius are fixed pixel values, so routing a shrunk-down copy of the diagram
// would give stubs that are proportionally too long for the page.
function routeConnection(conn, fromNode, toNode) {
  const style = resolveArrowStyle(conn);

  if (style.arrowType === ARROW_TYPE.ELBOW) {
    return getElbowPoints(conn, fromNode, toNode);
  }

  const anchors = getConnectionAnchors(conn);
  const start = anchors.from
    ? anchorPoint(fromNode, anchors.from)
    : getEdgePoint(fromNode, getNodeCenter(toNode));
  const end = anchors.to
    ? anchorPoint(toNode, anchors.to)
    : getEdgePoint(toNode, getNodeCenter(fromNode));

  if (style.arrowType === ARROW_TYPE.STRAIGHT) return [start, end];

  const cp = conn.controlPoint || {
    x: (start.x + end.x) / 2,
    y: (start.y + end.y) / 2,
  };

  return sampleQuadratic(start, cp, end, 24);
}

function drawConnection(doc, conn, fromNode, toNode, ctx) {
  const { fitScale, toPage } = ctx;
  const style = resolveArrowStyle(conn);

  const hasStart = style.startArrowhead !== ARROWHEAD.NONE;
  const hasEnd = style.endArrowhead !== ARROWHEAD.NONE;

  const canvasPoints = trimForArrow(routeConnection(conn, fromNode, toNode), {
    start: hasStart,
    end: hasEnd,
  });
  if (canvasPoints.length < 2) return;

  const isElbow = style.arrowType === ARROW_TYPE.ELBOW;
  // The radius is decided by the SAME helper the canvas uses, from this
  // arrow's own cornerStyle — not by a number typed in over here. At 0 this
  // is a no-op and the elbow keeps its exact right angles.
  const shaped = isElbow
    ? roundPolylineCorners(canvasPoints, cornerRadiusFor(style, style.arrowType))
    : canvasPoints;
  const pts = shaped.map(toPage);

  const color = resolveInk(style.stroke);
  const lineWidth = Math.max(0.4, style.strokeWidth * fitScale);

  doc.setDrawColor(...hexToRgb(color));
  doc.setLineWidth(lineWidth);
  if (typeof doc.setLineJoin === "function") doc.setLineJoin("round");
  if (typeof doc.setLineCap === "function") doc.setLineCap("round");
  setDash(doc, style.strokeStyle, lineWidth);

  for (let i = 1; i < pts.length; i++) {
    doc.line(pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y);
  }

  if (typeof doc.setLineDashPattern === "function") doc.setLineDashPattern([], 0);

  // Heads are sized off the line weight, exactly as they are on screen, so a
  // heavy arrow doesn't end in a pinhead.
  const headSize = ARROW_HEAD_LEN * (style.strokeWidth / CONNECTION_WIDTH) * fitScale;

  if (hasEnd) {
    const tip = pts[pts.length - 1];
    drawArrowHead(doc, tip, angleBetween(pts[pts.length - 2], tip), style.endArrowhead, color, headSize, lineWidth);
  }

  if (hasStart) {
    const tip = pts[0];
    drawArrowHead(doc, tip, angleBetween(pts[1], tip), style.startArrowhead, color, headSize, lineWidth);
  }

  if (conn.label) {
    const mid = polylineMidpoint(pts);
    const fontSize = Math.max(6, 8 * fitScale);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(fontSize);

    const labelLines = splitSafeText(doc, conn.label, 60);
    const textW = Math.max(...labelLines.map((l) => doc.getTextWidth(l)));
    const lineH = fontSize * 1.25;
    const boxW = textW + 6;
    const boxH = labelLines.length * lineH + 2;

    // Knock the line out behind the text, the way the canvas draws an opaque
    // pill under a connection label. Without it the arrow runs straight
    // through the lettering.
    doc.setFillColor(255, 255, 255);
    doc.rect(mid.x - boxW / 2, mid.y - boxH / 2, boxW, boxH, "F");

    doc.setTextColor(85, 85, 85);
    doc.text(labelLines, mid.x, mid.y - boxH / 2 + lineH * 0.8, { align: "center" });
  }
}

// ─── node shapes ────────────────────────────────────────────────────────────

function drawPlaceholderBox(doc, node) {
  doc.setDrawColor(150, 150, 150);
  doc.setLineWidth(0.6);
  doc.rect(node.x, node.y, node.w, node.h, "S");
}

// `prepared` is the re-encoded copy produced by loadImageAsDataUrl.
//
// Handing jsPDF the data URL stored on the node does NOT reliably work: its
// built-in PNG decoder rejects plenty of perfectly valid files ("Error while
// decompressing the data"), and that failure is what left a blank bordered
// box where the picture should have been. Round-tripping through a canvas
// first — the same thing the logo already did — produces an encoding jsPDF
// always accepts.
function drawImageNode(doc, node, prepared) {
  if (!node.src || !prepared?.dataUrl) {
    drawPlaceholderBox(doc, node);
    return;
  }

  // Letterbox inside the node's box, matching the canvas's object-fit:
  // contain. Stretching to the box would distort a photo whose node has been
  // resized by hand.
  let drawW = node.w;
  let drawH = node.h;

  if (prepared.width && prepared.height) {
    const ratio = prepared.width / prepared.height;
    if (node.w / node.h > ratio) {
      drawH = node.h;
      drawW = node.h * ratio;
    } else {
      drawW = node.w;
      drawH = node.w / ratio;
    }
  }

  const dx = node.x + (node.w - drawW) / 2;
  const dy = node.y + (node.h - drawH) / 2;

  try {
    doc.addImage(prepared.dataUrl, prepared.format || "JPEG", dx, dy, drawW, drawH);
  } catch (e) {
    // One unreadable picture shouldn't take the whole export down.
    drawPlaceholderBox(doc, node);
  }
}

function drawNodeShape(doc, node, scale = 1, images) {
  const { x, y, w, h, shape, fillColor, strokeColor } = node;

  // Plain text labels (no shape) should never get a box drawn around
  // them — only actual shape nodes get a border/fill.
  if (shape === "text") return;

  if (shape === "image") {
    drawImageNode(doc, node, images?.get(node.id));
    return;
  }

  const cx = x + w / 2;
  const cy = y + h / 2;

  const filled = hasBackground(fillColor);
  const stroke = resolveInk(strokeColor);

  if (filled) doc.setFillColor(...hexToRgb(fillColor));
  doc.setDrawColor(...hexToRgb(stroke));
  doc.setLineWidth(Math.max(0.6, 1.4 * scale));
  if (typeof doc.setLineJoin === "function") doc.setLineJoin("round");

  // Outline only when the shape is see-through. Painting a white background
  // instead looks the same on an empty page and hides everything underneath
  // on a busy one.
  const style = filled ? "FD" : "S";

  // A free-drawn line carries its own endpoints and is not a box at all.
  if (shape === "line") {
    if (typeof doc.setLineCap === "function") doc.setLineCap("round");
    const x1 = typeof node.x1 === "number" ? node.x1 : x;
    const y1 = typeof node.y1 === "number" ? node.y1 : y;
    const x2 = typeof node.x2 === "number" ? node.x2 : x + w;
    const y2 = typeof node.y2 === "number" ? node.y2 : y + h;
    doc.line(x1, y1, x2, y2);
    return;
  }

  if (shape === "rounded") {
    // The radius has to be capped against the box, or a short wide shape
    // comes out as a lozenge instead of a rounded rectangle.
    const r = Math.min(10 * scale, w / 4, h / 4);
    doc.roundedRect(x, y, w, h, r, r, style);
  } else if (shape === "diamond") {
    drawPolyline(doc, [
      { x: cx, y },
      { x: x + w, y: cy },
      { x: cx, y: y + h },
      { x, y: cy },
    ], style);
  } else if (shape === "circle" || shape === "oval" || shape === "ellipse") {
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
    // The cylinder is assembled from a body, a bottom curve and a top
    // ellipse, and the body's own top edge has to be hidden by that ellipse.
    // That only works against an opaque fill, so an unfilled cylinder still
    // gets a white body — it is a small shape and almost never a container,
    // so it can't swallow a diagram the way a frame can.
    const bodyStyle = "FD";
    if (!filled) doc.setFillColor(255, 255, 255);

    const ry = h * 0.15;
    doc.rect(x, y + ry, w, h - ry * 2, bodyStyle);

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
      bodyStyle
    );

    doc.ellipse(cx, y + ry, w / 2, ry, bodyStyle);
  } else {
    // 'rect', 'rectangle', 'process' and anything unrecognised.
    doc.rect(x, y, w, h, style);
  }
}

// ─── shared label layout calculator ─────────────────────────────────────────
// Figures out the font size, wrapped lines, and the box height actually
// needed to show the full label without truncation. Used both to decide
// how much a node needs to grow, and to render the final text.

function computeNodeLabelLayout(doc, node, scale = 1) {
  const { w, h, label } = node;
  const maxTextW = Math.max(w - 16, 20);

  const baseFontSize = 10 * scale;
  // Floor is a fixed *legible* minimum, not scale-dependent — we no longer
  // rely on shrinking text into oblivion to make it "fit"; instead the box
  // grows around it.
  const legibleFontSize = Math.max(6, 7 * scale);

  let fontSize = Math.max(baseFontSize, legibleFontSize);
  let lines = [];
  let lineH = 0;

  do {
    doc.setFontSize(fontSize);
    lines = splitSafeText(doc, label || "", maxTextW);
    lineH = fontSize * 1.25;
    const neededH = lines.length * lineH + 6;

    if (neededH <= h || fontSize <= legibleFontSize) break;
    fontSize -= 0.5;
  } while (fontSize >= legibleFontSize);

  const neededH = lines.length * lineH + 6;
  const finalH = Math.max(h, neededH);

  return { fontSize, lines, lineH, finalH };
}

// ─── node label (renders from a precomputed layout) ─────────────────────────

function drawNodeLabel(doc, node, layout) {
  const { x, y, w, h, shape, strokeColor } = node;
  const { fontSize, lines, lineH } = layout;

  // A picture has no caption to draw, and a free-drawn line has nowhere
  // sensible to put one.
  if (shape === "image" || shape === "line") return;

  const cx = x + w / 2;
  const cy = y + h / 2;

  // On the canvas a shape's text takes the shape's own stroke colour (see
  // --node-stroke in Node.module.css). Forcing it to black here is what made
  // a red box come out with black lettering in the PDF.
  const textColor = resolveInk(strokeColor);

  doc.setTextColor(...hexToRgb(textColor));
  doc.setFont("helvetica", "normal");
  doc.setFontSize(fontSize);

  const totalH = lines.length * lineH;
  let ty = cy - totalH / 2 + lineH * 0.75;

  lines.forEach((line) => {
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
    // ratio) instead of stretching it to the box's exact width/height.
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

  // Pictures have to be decoded and re-encoded before the drawing pass can
  // start, since drawing is synchronous and decoding an image is not. One
  // failure is skipped rather than rejecting the whole export.
  const images = new Map();
  await Promise.all(
    nodes
      .filter((n) => n.shape === "image" && n.src)
      .map(async (n) => {
        try {
          const prepared = await loadImageAsDataUrl(n.src);
          if (prepared) images.set(n.id, prepared);
        } catch (e) {
          // Leave it unset; drawImageNode falls back to a placeholder box.
        }
      })
  );

  const availW = pageW - margin * 2;
  const availH = pageH - contentTop - margin;

  // Fit to the page, but never render larger than "true" px->pt size.
  const rawFit = Math.min(availW / cropW, availH / cropH);
  const fitScale = Math.min(rawFit, PX_TO_PT);

  const drawW = cropW * fitScale;
  const drawH = cropH * fitScale;
  const offsetX = margin + (availW - drawW) / 2 - minX * fitScale;
  const offsetY = contentTop + (availH - drawH) / 2 - minY * fitScale;

  // The two directions between diagram space and page space. Connections are
  // routed in diagram space and then brought forward with toPage; see
  // routeConnection for why that way round.
  const toPage = (p) => ({ x: p.x * fitScale + offsetX, y: p.y * fitScale + offsetY });
  const toDiagram = (n) => ({
    ...n,
    x: (n.x - offsetX) / fitScale,
    y: (n.y - offsetY) / fitScale,
    w: n.w / fitScale,
    h: n.h / fitScale,
  });

  const transformed = nodes.map((n) => {
    const next = {
      ...n,
      x: n.x * fitScale + offsetX,
      y: n.y * fitScale + offsetY,
      w: n.w * fitScale,
      h: n.h * fitScale,
    };

    // A free-drawn line's stroke comes from its own endpoints, not its box,
    // so those have to be carried through the same transform or the line
    // stays behind where the box used to be.
    if (n.shape === "line" && typeof n.x1 === "number") {
      next.x1 = n.x1 * fitScale + offsetX;
      next.y1 = n.y1 * fitScale + offsetY;
      next.x2 = n.x2 * fitScale + offsetX;
      next.y2 = n.y2 * fitScale + offsetY;
    }

    return next;
  });

  // Measure each label first, then grow any node whose box is too small
  // to hold its full text at a legible size — keeping it vertically
  // centered on its original position so layout doesn't shift sideways.
  const layouts = new Map();
  const grown = transformed.map((n) => {
    const layout = computeNodeLabelLayout(doc, n, fitScale);
    layouts.set(n.id, layout);

    if (layout.finalH > n.h) {
      const diff = layout.finalH - n.h;
      return { ...n, y: n.y - diff / 2, h: layout.finalH };
    }
    return n;
  });

  // Routing reads these, so they have to reflect any growth above —
  // otherwise an arrow would meet a box where it used to be, not where it
  // is now being drawn.
  const diagramNodes = Object.fromEntries(grown.map((n) => [n.id, toDiagram(n)]));

  // A shape that encloses others is a background — a swimlane frame, a
  // grouping box — and backgrounds belong UNDER the arrows. The canvas
  // already works this way (see computeNodeStacking in Canvas.jsx); drawing
  // every node after every connection is what let a filled frame paint over
  // a whole flowchart's worth of arrows.
  const isContainer = (node) => grown.some((other) => nodeContains(node, other));
  const containers = grown.filter(isContainer);
  const contents = grown.filter((node) => !isContainer(node));

  containers.forEach((node) => drawNodeShape(doc, node, fitScale, images));

  connections.forEach((conn) => {
    const from = diagramNodes[conn.from];
    const to = diagramNodes[conn.to];
    if (!from || !to) return;

    drawConnection(doc, conn, from, to, { fitScale, toPage });
  });

  contents.forEach((node) => drawNodeShape(doc, node, fitScale, images));

  // Labels last, so a caption is never clipped by the shape next to it.
  grown.forEach((node) => drawNodeLabel(doc, node, layouts.get(node.id)));
  return doc;
}