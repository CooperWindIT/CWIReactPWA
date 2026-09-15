import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import QRCode from "qrcode";
import Swal from "sweetalert2";
// ASSUMPTION: named to match what you typed ("$BASE_IMAGE_API_GET}imageurl")
// — a Config export used to turn a stored ImageUrl into a full image URL,
// the same pattern as BASE_API. Adjust the import path/name if it lives
// somewhere else in your project.
import { BASE_IMAGE_API_GET } from "../Config/Config";

// npm install qrcode
//
// A print-ready, branded QR poster for the "raise a ticket" helpdesk flow —
// employees scan it to file a complaint, report a lost/damaged asset, or
// leave feedback. Layout follows the "Minimal & Professional" reference
// exactly: rounded corner accents top-left and bottom-left, a logo header
// with a tagline, a full category list (icon + label) on the left, the QR
// in its own "SCAN HERE" column on the right, a 4-step process strip, and
// a branded footer with a values line.
//
// Pulls the organization (id, name, logo) straight from session (same
// pattern as AddUser/EditUser/UsersList) so it needs zero required props:
// drop <QRCodeCard /> anywhere and it targets the signed-in user's org.
// Opens as a centered modal (via a portal), so it never disturbs whatever
// toolbar/row it's dropped into.
//
// Renders at high resolution (1440x2820px, a clean print at ~300dpi) so it
// stays sharp on paper, not just on screen. The QR itself uses
// errorCorrectionLevel "H" (the highest tier) so it still scans after
// months on a wall — scuffed corners, tape, a bit of sun-fade.
//
// Usage (typical — reads org from session automatically):
//   <QRCodeCard />
//
// Usage (an admin generating a poster for a different org than their own):
//   <QRCodeCard orgId={someOrg.Id} orgName={someOrg.Name} logoUrl={someOrg.ImageUrl} />

const SCALE = 3; // render at 3x the logical layout for print sharpness
const LOGICAL_W = 480;
const LOGICAL_H = 940;
const CANVAS_W = LOGICAL_W * SCALE;
const CANVAS_H = LOGICAL_H * SCALE;

const TILE_SIZE = 150;
const TILE_PAD = 16;
const QR_DRAW_SIZE = TILE_SIZE - TILE_PAD * 2;

// ASSUMPTION: this is the fixed public portal domain every organization's QR
// points into (only the trailing OrgId changes per org), based on the
// example URL you gave (https://portal-andiso.cooperwind.online/8523).
// Move this into Config.js alongside BASE_API if you'd rather manage it
// there — I kept it local so this file has no new import surface.
const PORTAL_BASE_URL = "https://portal-andiso.cooperwind.online/";

const DEFAULT_ACCENT = "#059669";
const INK = "#0f172a";
const MUTED = "#64748b";
const STEP_BG = "rgba(15,23,42,0.07)";

// A handful of tasteful presets, plus a custom picker (below in the modal
// UI) so a client can genuinely pick "whatever color they need."
const COLOR_PRESETS = ["#059669", "#0d6efd", "#7c3aed", "#e11d48", "#d97706", "#334155"];

// What the code is actually for — one icon + label per row, left column.
const DEFAULT_CATEGORIES = [
    { label: "HR & Employee Services", icon: "people" },
    { label: "Finance & Expenses", icon: "finance" },
    { label: "Administration & Facilities", icon: "building" },
    { label: "IT & Applications", icon: "laptop" },
    { label: "EHS & Safety", icon: "safety" },
    { label: "Security", icon: "security" },
    { label: "Transport & Canteen", icon: "transport" },
    { label: "Complaints & Feedback", icon: "feedback" },
];

// The 4-step lifecycle strip under the QR panel.
const DEFAULT_STEPS = [
    { label: "Scan", icon: "scan" },
    { label: "Raise", icon: "raise" },
    { label: "Track", icon: "track" },
    { label: "Resolve", icon: "resolve" },
];

function roundRectPath(ctx, x, y, w, h, r) {
    const radius = typeof r === "number" ? { tl: r, tr: r, br: r, bl: r } : r;
    ctx.beginPath();
    ctx.moveTo(x + radius.tl, y);
    ctx.lineTo(x + w - radius.tr, y);
    ctx.arcTo(x + w, y, x + w, y + radius.tr, radius.tr);
    ctx.lineTo(x + w, y + h - radius.br);
    ctx.arcTo(x + w, y + h, x + w - radius.br, y + h, radius.br);
    ctx.lineTo(x + radius.bl, y + h);
    ctx.arcTo(x, y + h, x, y + h - radius.bl, radius.bl);
    ctx.lineTo(x, y + radius.tl);
    ctx.arcTo(x, y, x + radius.tl, y, radius.tl);
    ctx.closePath();
}

// Small L-shaped corner brackets around the QR tile, like a camera
// viewfinder — a common "scan me" visual cue that reads as tech/premium
// without touching the QR's own quiet zone.
function drawScanBracket(ctx, x, y, len, thickness, cornerColor, flipX, flipY) {
    ctx.save();
    ctx.strokeStyle = cornerColor;
    ctx.lineWidth = thickness;
    ctx.lineCap = "round";
    const dx = flipX ? -1 : 1;
    const dy = flipY ? -1 : 1;
    ctx.beginPath();
    ctx.moveTo(x, y + len * dy);
    ctx.lineTo(x, y);
    ctx.lineTo(x + len * dx, y);
    ctx.stroke();
    ctx.restore();
}

function drawLetterSpacedText(ctx, text, centerX, y, spacing, align = "center") {
    const widths = [...text].map((ch) => ctx.measureText(ch).width);
    const totalWidth = widths.reduce((a, b) => a + b, 0) + spacing * (text.length - 1);
    let x = align === "right" ? centerX - totalWidth : align === "left" ? centerX : centerX - totalWidth / 2;
    const prevAlign = ctx.textAlign;
    ctx.textAlign = "left";
    [...text].forEach((ch, i) => {
        ctx.fillText(ch, x, y);
        x += widths[i] + spacing;
    });
    ctx.textAlign = prevAlign;
}

// Greedy word-wrap, capped at 2 lines (a couple of the category labels —
// "Administration & Facilities" — need it; everything else fits on one).
function wrapText(ctx, text, maxWidth) {
    const words = text.split(" ");
    const lines = [];
    let current = "";
    for (const w of words) {
        const test = current ? `${current} ${w}` : w;
        if (current && ctx.measureText(test).width > maxWidth) {
            lines.push(current);
            current = w;
        } else {
            current = test;
        }
    }
    if (current) lines.push(current);
    return lines.slice(0, 2);
}

// ---- Color helpers: derive a deep shade (for the footer blob) from
// whatever single accent color the user picks, so "pick your own color"
// still produces a coordinated, premium palette rather than one flat hue. ----
function hexToRgb(hex) {
    const clean = hex.replace("#", "");
    const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
    const num = parseInt(full, 16);
    return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}
function hexToRgba(hex, alpha) {
    const { r, g, b } = hexToRgb(hex);
    return `rgba(${r},${g},${b},${alpha})`;
}
function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s;
    const l = (max + min) / 2;
    if (max === min) { h = s = 0; }
    else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            default: h = (r - g) / d + 4;
        }
        h /= 6;
    }
    return { h: h * 360, s: s * 100, l: l * 100 };
}
function hslToHex(h, s, l) {
    s /= 100; l /= 100;
    const k = (n) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    const toHex = (n) => Math.round(255 * n).toString(16).padStart(2, "0");
    return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}
function deriveDeepShade(hex) {
    const { r, g, b } = hexToRgb(hex);
    const { h, s, l } = rgbToHsl(r, g, b);
    return hslToHex(h, Math.min(100, s + 6), Math.max(14, l - 28));
}

// ---- Small line-icon glyphs, drawn as vector paths so they stay crisp at
// any print resolution and always match the chosen accent color. ----
function drawPeopleIcon(ctx, cx, cy, size, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = Math.max(1.4, size * 0.09);
    ctx.beginPath();
    ctx.arc(cx + size * 0.15, cy - size * 0.15, size * 0.13, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx + size * 0.15, cy + size * 0.34, size * 0.24, Math.PI * 1.08, Math.PI * 1.92);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx - size * 0.13, cy - size * 0.19, size * 0.16, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = Math.max(1.6, size * 0.1);
    ctx.beginPath();
    ctx.arc(cx - size * 0.13, cy + size * 0.32, size * 0.27, Math.PI * 1.05, Math.PI * 1.95);
    ctx.stroke();
    ctx.restore();
}
function drawFinanceIcon(ctx, cx, cy, size, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1.4, size * 0.08);
    const rx = size * 0.23, ry = size * 0.09;
    [0.17, 0, -0.17].forEach((dyf) => {
        ctx.beginPath();
        ctx.ellipse(cx, cy + dyf * size, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();
    });
    ctx.restore();
}
function drawBuildingIcon(ctx, cx, cy, size, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = Math.max(1.4, size * 0.08);
    ctx.lineJoin = "round";
    const w = size * 0.56, h = size * 0.62;
    const x = cx - w / 2, y = cy - h / 2 + size * 0.02;
    ctx.strokeRect(x, y, w, h);
    const cols = 2, rows = 3;
    const gx = w / (cols * 2 + 1), gy = h / (rows * 2 + 1);
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            ctx.fillRect(x + gx * (1 + c * 2), y + gy * (1 + r * 2), gx, gy);
        }
    }
    ctx.restore();
}
function drawAssetIcon(ctx, cx, cy, size, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1.4, size * 0.08);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    const scrW = size * 0.68, scrH = size * 0.46;
    const scrX = cx - scrW / 2, scrY = cy - scrH / 2 - size * 0.1;
    roundRectPath(ctx, scrX, scrY, scrW, scrH, size * 0.06);
    ctx.stroke();
    ctx.beginPath();
    const baseY = scrY + scrH + size * 0.1;
    ctx.moveTo(cx - scrW * 0.62, baseY);
    ctx.lineTo(cx + scrW * 0.62, baseY);
    ctx.lineWidth = Math.max(1.6, size * 0.1);
    ctx.stroke();
    ctx.restore();
}
function drawSafetyIcon(ctx, cx, cy, size, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1.4, size * 0.09);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(cx, cy - size * 0.02, size * 0.23, Math.PI, 0);
    ctx.stroke();
    ctx.lineWidth = Math.max(1.8, size * 0.11);
    ctx.beginPath();
    ctx.moveTo(cx - size * 0.31, cy + size * 0.02);
    ctx.lineTo(cx + size * 0.31, cy + size * 0.02);
    ctx.stroke();
    ctx.restore();
}
function drawSecurityIcon(ctx, cx, cy, size, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1.4, size * 0.08);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    const w = size * 0.44, h = size * 0.56;
    ctx.beginPath();
    ctx.moveTo(cx, cy - h / 2);
    ctx.lineTo(cx + w / 2, cy - h / 2 + h * 0.16);
    ctx.lineTo(cx + w / 2, cy + h * 0.06);
    ctx.quadraticCurveTo(cx + w / 2, cy + h * 0.42, cx, cy + h / 2);
    ctx.quadraticCurveTo(cx - w / 2, cy + h * 0.42, cx - w / 2, cy + h * 0.06);
    ctx.lineTo(cx - w / 2, cy - h / 2 + h * 0.16);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.22, cy);
    ctx.lineTo(cx - w * 0.02, cy + h * 0.16);
    ctx.lineTo(cx + w * 0.26, cy - h * 0.14);
    ctx.stroke();
    ctx.restore();
}
function drawTransportIcon(ctx, cx, cy, size, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = Math.max(1.5, size * 0.09);
    ctx.lineJoin = "round";
    const w = size * 0.62, h = size * 0.34;
    const x = cx - w / 2, y = cy - h / 2 - size * 0.09;
    roundRectPath(ctx, x, y, w, h, { tl: size * 0.1, tr: size * 0.1, br: 0, bl: 0 });
    ctx.stroke();
    ctx.strokeRect(x + w * 0.12, y + h * 0.22, w * 0.3, h * 0.42);
    ctx.strokeRect(x + w * 0.58, y + h * 0.22, w * 0.3, h * 0.42);
    const wheelY = y + h;
    ctx.lineWidth = Math.max(1.4, size * 0.08);
    ctx.beginPath(); ctx.moveTo(x - size * 0.04, wheelY); ctx.lineTo(x + w + size * 0.04, wheelY); ctx.stroke();
    ctx.beginPath(); ctx.arc(x + w * 0.2, wheelY + size * 0.02, size * 0.09, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + w * 0.8, wheelY + size * 0.02, size * 0.09, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
}
function drawComplaintIcon(ctx, cx, cy, size, color) {
    const w = size * 0.9, h = size * 0.62;
    const x = cx - w / 2, y = cy - h / 2 - size * 0.06;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1.4, size * 0.08);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    roundRectPath(ctx, x, y, w, h, h * 0.32);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + w * 0.26, y + h - 1);
    ctx.lineTo(x + w * 0.18, y + h + size * 0.14);
    ctx.lineTo(x + w * 0.4, y + h - 1);
    ctx.stroke();
    ctx.fillStyle = color;
    const dotR = size * 0.045;
    const dotY = y + h / 2;
    [-0.17, 0, 0.17].forEach((dxf) => {
        ctx.beginPath();
        ctx.arc(cx + dxf * size, dotY, dotR, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.restore();
}
function drawCategoryIcon(ctx, type, cx, cy, size, color) {
    switch (type) {
        case "people": return drawPeopleIcon(ctx, cx, cy, size, color);
        case "finance": return drawFinanceIcon(ctx, cx, cy, size, color);
        case "building": return drawBuildingIcon(ctx, cx, cy, size, color);
        case "laptop": return drawAssetIcon(ctx, cx, cy, size, color);
        case "safety": return drawSafetyIcon(ctx, cx, cy, size, color);
        case "security": return drawSecurityIcon(ctx, cx, cy, size, color);
        case "transport": return drawTransportIcon(ctx, cx, cy, size, color);
        default: return drawComplaintIcon(ctx, cx, cy, size, color);
    }
}
function drawStepIcon(ctx, type, cx, cy, size, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = Math.max(1.6, size * 0.11);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (type === "scan") {
        const half = size * 0.3, len = size * 0.22;
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([fx, fy]) => {
            ctx.beginPath();
            ctx.moveTo(cx + fx * half, cy + fy * half - fy * len);
            ctx.lineTo(cx + fx * half, cy + fy * half);
            ctx.lineTo(cx + fx * half - fx * len, cy + fy * half);
            ctx.stroke();
        });
    } else if (type === "raise") {
        const len = size * 0.62;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(-Math.PI / 4);
        roundRectPath(ctx, -len / 2, -size * 0.09, len, size * 0.18, size * 0.05);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(len / 2, -size * 0.09);
        ctx.lineTo(len / 2 + size * 0.16, 0);
        ctx.lineTo(len / 2, size * 0.09);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    } else if (type === "track") {
        const r = size * 0.26;
        ctx.beginPath();
        ctx.arc(cx - size * 0.06, cy - size * 0.06, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx - size * 0.06 + r * 0.72, cy - size * 0.06 + r * 0.72);
        ctx.lineTo(cx + size * 0.3, cy + size * 0.3);
        ctx.stroke();
    } else {
        ctx.beginPath();
        ctx.moveTo(cx - size * 0.26, cy);
        ctx.lineTo(cx - size * 0.05, cy + size * 0.22);
        ctx.lineTo(cx + size * 0.28, cy - size * 0.2);
        ctx.stroke();
    }
    ctx.restore();
}
// Tiny decorative factory + leaf silhouette for the footer corner — kept
// as a light neutral gray so it reads as texture, not competing with the
// accent color or the QR/logo.
function drawFactoryGlyph(ctx, x, yBase, size, color) {
    ctx.save();
    ctx.fillStyle = color;
    const w = size, h = size * 0.5;
    ctx.fillRect(x, yBase - h, w, h);
    ctx.fillRect(x + w * 0.1, yBase - h - size * 0.18, size * 0.09, size * 0.18);
    ctx.fillRect(x + w * 0.3, yBase - h - size * 0.3, size * 0.09, size * 0.3);
    ctx.fillRect(x + w * 0.54, yBase - h - size * 0.14, size * 0.09, size * 0.14);
    // simple leaf beside it
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1.2, size * 0.03);
    const lx = x + w + size * 0.22, ly = yBase - h * 0.55;
    ctx.beginPath();
    ctx.moveTo(lx, ly + size * 0.3);
    ctx.quadraticCurveTo(lx + size * 0.28, ly + size * 0.05, lx + size * 0.08, ly - size * 0.28);
    ctx.quadraticCurveTo(lx - size * 0.06, ly + size * 0.02, lx, ly + size * 0.3);
    ctx.stroke();
    ctx.restore();
}

export default function QRCodeCard({
    orgId: orgIdProp,
    orgName: orgNameProp,
    logoUrl: logoUrlProp,
    headingText = "REQUEST & SUPPORT",
    helpText = "Need help?",
    introText = "Scan here to get support for:",
    categories = DEFAULT_CATEGORIES,
    scanHereText = "SCAN HERE",
    qrCaptionText = "TO GET SUPPORT",
    steps = DEFAULT_STEPS,
    footerTagline = "Together\nfor a Better\nWorkplace",
    footerKeywords = ["PEOPLE", "SAFETY", "COMPLIANCE", "GROWTH"],
    headerTagline = ["Stronger People", "Safer Workplaces", "Brighter Tomorrow"],
    fileName,
}) {
    const canvasRef = useRef(null);
    const logoImgRef = useRef(null);
    const qrCanvasElRef = useRef(null); // cached QR module canvas, reused on color-only redraws
    const [isGenerated, setIsGenerated] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [sessionUserData, setSessionUserData] = useState({});
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [accentColor, setAccentColor] = useState(DEFAULT_ACCENT);

    useEffect(() => {
        const userDataString = sessionStorage.getItem("userData");
        if (userDataString) {
            setSessionUserData(JSON.parse(userDataString));
        }
    }, []);

    // Modal-only concerns: lock background scroll while open, close on Esc.
    // Everything (card + buttons + color picker) renders through a portal
    // straight onto <body>, positioned fixed/centered, so it can never
    // affect the layout of whatever toolbar this component sits in.
    useEffect(() => {
        if (!isModalOpen) return;
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        const onKeyDown = (e) => {
            if (e.key === "Escape") setIsModalOpen(false);
        };
        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.body.style.overflow = prevOverflow;
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [isModalOpen]);

    // ASSUMPTION: session record carries the org's display name at
    // userData.OrgName and its logo filename at userData.ImageUrl (as you
    // showed: "1770133047323-cwilogo.png") — adjust field names if yours differ.
    const orgId = orgIdProp ?? sessionUserData?.OrgId;
    const orgName = orgNameProp ?? sessionUserData?.OrgName;
    const logoUrl =
        logoUrlProp ?? (sessionUserData?.ImageUrl ? `${BASE_IMAGE_API_GET}${sessionUserData.ImageUrl}` : null);
    const targetUrl = orgId ? `${PORTAL_BASE_URL}${orgId}` : null;

    // Loads (and caches) the org logo as an <img>. Resolves null — never
    // rejects — so a missing/broken/CORS-blocked logo just falls back to
    // the text wordmark instead of breaking generation.
    const preloadLogo = () => {
        return new Promise((resolve) => {
            if (!logoUrl) {
                logoImgRef.current = null;
                resolve(null);
                return;
            }
            if (logoImgRef.current && logoImgRef.current.dataset.src === logoUrl) {
                resolve(logoImgRef.current);
                return;
            }
            const img = new Image();
            img.crossOrigin = "anonymous"; // required so the finished canvas can still be exported/downloaded
            img.dataset.src = logoUrl;
            img.onload = () => {
                logoImgRef.current = img;
                resolve(img);
            };
            img.onerror = () => {
                console.warn(
                    "Org logo failed to load (missing, or the image host needs CORS headers for canvas export). Falling back to text wordmark:",
                    logoUrl
                );
                logoImgRef.current = null;
                resolve(null);
            };
            img.src = logoUrl;
        });
    };

    // Fallback header wordmark when there's no logo: "Cooper Wind
    // Industries" -> "Cooper" / "Wind Industries" (first word, then the
    // rest), echoing the two-line "YOUR / COMPANY LOGO" placeholder.
    const orgWordmarkLines = () => {
        const words = (orgName || "CWI").trim().split(/\s+/);
        return words.length > 1 ? [words[0], words.slice(1).join(" ")] : [words[0]];
    };

    const drawCard = (qrCanvas, accent) => {
        const canvas = canvasRef.current;
        canvas.width = CANVAS_W;
        canvas.height = CANVAS_H;
        const ctx = canvas.getContext("2d");
        ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0); // work in logical (480x940) coordinates
        const deepAccent = deriveDeepShade(accent);
        const PAD_X = 28;
        const cardR = 22;

        // ---- Card background ----
        roundRectPath(ctx, 0, 0, LOGICAL_W, LOGICAL_H, cardR);
        ctx.fillStyle = "#ffffff";
        ctx.fill();

        ctx.save();
        roundRectPath(ctx, 0, 0, LOGICAL_W, LOGICAL_H, cardR);
        ctx.clip();

        // ---- Header: small accent mark + logo (or wordmark) + right note ----
        ctx.fillStyle = accent;
        ctx.fillRect(24, 18, 3, 32);

        const logoImg = logoImgRef.current;
        if (logoImg && logoImg.naturalWidth) {
            const maxH = 36, maxW = 170;
            let drawW = (logoImg.naturalWidth / logoImg.naturalHeight) * maxH;
            let drawH = maxH;
            if (drawW > maxW) {
                drawW = maxW;
                drawH = (logoImg.naturalHeight / logoImg.naturalWidth) * maxW;
            }
            ctx.drawImage(logoImg, 36, 16, drawW, drawH);
        } else {
            ctx.fillStyle = INK;
            ctx.textAlign = "left";
            ctx.textBaseline = "alphabetic";
            ctx.font = "700 14px 'Segoe UI', Arial, sans-serif";
            orgWordmarkLines().forEach((line, i) => {
                ctx.fillText(line.toUpperCase(), 36, 34 + i * 17);
            });
        }
        if (headerTagline && headerTagline.length) {
            ctx.font = "700 9.5px 'Segoe UI', Arial, sans-serif";
            ctx.fillStyle = INK;
            ctx.textAlign = "right";
            headerTagline.slice(0, 3).forEach((line, i) => {
                ctx.fillText(line, LOGICAL_W - PAD_X, 25 + i * 13);
            });
        }

        // ---- Heading block: rounded accent blob + two-tone-free heading ----
        ctx.beginPath();
        ctx.ellipse(0, 146, 42, 70, 0, 0, Math.PI * 2);
        ctx.fillStyle = accent;
        ctx.fill();

        ctx.fillStyle = INK;
        ctx.textAlign = "left";
        ctx.textBaseline = "alphabetic";
        ctx.font = "800 24px 'Segoe UI', Arial, sans-serif";
        ctx.fillText(headingText, 60, 132);

        ctx.fillStyle = accent;
        ctx.fillRect(60, 141, 130, 3);

        ctx.font = "700 17px 'Segoe UI', Arial, sans-serif";
        ctx.fillStyle = INK;
        ctx.fillText(helpText, 60, 167);

        ctx.font = "400 12px 'Segoe UI', Arial, sans-serif";
        ctx.fillStyle = MUTED;
        ctx.fillText(introText, 60, 187);

        // ---- Body: left category list / divider / right "scan" column ----
        const y0 = 214, y1 = 676;
        const leftColX = PAD_X;
        const dividerX = 266;
        const rightColX0 = 284, rightColX1 = LOGICAL_W - PAD_X;
        const rightCenterX = (rightColX0 + rightColX1) / 2;
        const labelMaxW = dividerX - (leftColX + 34) - 6;

        const rowH = (y1 - y0) / categories.length;
        ctx.font = "600 12.5px 'Segoe UI', Arial, sans-serif";
        categories.forEach((cat, i) => {
            const rowCenterY = y0 + rowH / 2 + i * rowH;
            const iconCX = leftColX + 11;
            drawCategoryIcon(ctx, cat.icon, iconCX, rowCenterY, 23, accent);

            ctx.font = "600 12.5px 'Segoe UI', Arial, sans-serif";
            ctx.fillStyle = INK;
            ctx.textAlign = "left";
            ctx.textBaseline = "middle";
            const lines = wrapText(ctx, cat.label, labelMaxW);
            const textX = leftColX + 34;
            if (lines.length === 1) {
                ctx.fillText(lines[0], textX, rowCenterY);
            } else {
                ctx.fillText(lines[0], textX, rowCenterY - 8);
                ctx.fillText(lines[1], textX, rowCenterY + 8);
            }
        });
        ctx.textBaseline = "alphabetic";

        ctx.strokeStyle = "rgba(15,23,42,0.12)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(dividerX, y0 + 8);
        ctx.lineTo(dividerX, y1 - 8);
        ctx.stroke();

        // Right column content is vertically centered alongside the (taller)
        // category list rather than pinned to the top.
        const rightBlockH = 28 + 8 + 7 + 14 + TILE_SIZE + 24 + 16;
        let cursorY = y0 + Math.max(10, (y1 - y0 - rightBlockH) / 2);

        // "SCAN HERE" pill + arrow
        ctx.font = "700 11px 'Segoe UI', Arial, sans-serif";
        const pillLabel = scanHereText.toUpperCase();
        const pillTextW = [...pillLabel].reduce((s, ch) => s + ctx.measureText(ch).width, 0) + 1.5 * (pillLabel.length - 1);
        const pillW = pillTextW + 28, pillH = 28;
        const pillX = rightCenterX - pillW / 2, pillY = cursorY;
        roundRectPath(ctx, pillX, pillY, pillW, pillH, pillH / 2);
        ctx.fillStyle = accent;
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        drawLetterSpacedText(ctx, pillLabel, rightCenterX, pillY + pillH / 2 + 4, 1.5);

        const arrowY = pillY + pillH + 8;
        ctx.beginPath();
        ctx.moveTo(rightCenterX - 5, arrowY);
        ctx.lineTo(rightCenterX + 5, arrowY);
        ctx.lineTo(rightCenterX, arrowY + 7);
        ctx.closePath();
        ctx.fillStyle = accent;
        ctx.fill();

        // ---- QR tile ----
        const tileX = rightCenterX - TILE_SIZE / 2;
        const tileY = arrowY + 14;

        ctx.save();
        ctx.shadowColor = "rgba(15,23,42,0.16)";
        ctx.shadowBlur = 18;
        ctx.shadowOffsetY = 8;
        roundRectPath(ctx, tileX, tileY, TILE_SIZE, TILE_SIZE, 16);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
        ctx.restore();

        roundRectPath(ctx, tileX, tileY, TILE_SIZE, TILE_SIZE, 16);
        ctx.strokeStyle = "rgba(15,23,42,0.08)";
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.drawImage(qrCanvas, tileX + TILE_PAD, tileY + TILE_PAD, QR_DRAW_SIZE, QR_DRAW_SIZE);

        const bLen = 14, bThick = 2.5, bOffset = 8;
        drawScanBracket(ctx, tileX - bOffset, tileY - bOffset, bLen, bThick, accent, false, false);
        drawScanBracket(ctx, tileX + TILE_SIZE + bOffset, tileY - bOffset, bLen, bThick, accent, true, false);
        drawScanBracket(ctx, tileX - bOffset, tileY + TILE_SIZE + bOffset, bLen, bThick, accent, false, true);
        drawScanBracket(ctx, tileX + TILE_SIZE + bOffset, tileY + TILE_SIZE + bOffset, bLen, bThick, accent, true, true);

        ctx.font = "700 11px 'Segoe UI', Arial, sans-serif";
        ctx.fillStyle = accent;
        ctx.textAlign = "center";
        drawLetterSpacedText(ctx, qrCaptionText.toUpperCase(), rightCenterX, tileY + TILE_SIZE + 24, 1.2);

        // ---- Process strip: Scan > Raise > Track > Resolve ----
        const stepY = 730;
        const stepR = 20;
        const marginEdge = 64;
        const span = LOGICAL_W - 2 * marginEdge;
        const stepXs = steps.map((_, i) => marginEdge + (span * i) / (steps.length - 1));

        steps.forEach((step, i) => {
            const cx = stepXs[i];
            const isLast = i === steps.length - 1;
            ctx.beginPath();
            ctx.arc(cx, stepY, stepR, 0, Math.PI * 2);
            ctx.fillStyle = isLast ? accent : STEP_BG;
            ctx.fill();
            drawStepIcon(ctx, step.icon, cx, stepY, 21, isLast ? "#ffffff" : INK);

            ctx.font = "700 10px 'Segoe UI', Arial, sans-serif";
            ctx.fillStyle = INK;
            ctx.textAlign = "center";
            drawLetterSpacedText(ctx, step.label.toUpperCase(), cx, stepY + stepR + 18, 0.8);

            if (i < steps.length - 1) {
                const midX = (cx + stepXs[i + 1]) / 2;
                ctx.strokeStyle = "rgba(15,23,42,0.25)";
                ctx.lineWidth = 1.6;
                ctx.lineCap = "round";
                ctx.beginPath();
                ctx.moveTo(midX - 3, stepY - 4);
                ctx.lineTo(midX + 3, stepY);
                ctx.lineTo(midX - 3, stepY + 4);
                ctx.stroke();
            }
        });

        // ---- Footer: rounded accent blob (bottom-left) + values line ----
        ctx.beginPath();
        ctx.ellipse(0, LOGICAL_H, 190, 150, 0, 0, Math.PI * 2);
        ctx.fillStyle = deepAccent;
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(0, LOGICAL_H, 193, 153, 0, 0, Math.PI * 2);
        ctx.strokeStyle = hexToRgba(accent, 0.7);
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.font = "700 14px 'Segoe UI', Arial, sans-serif";
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "left";
        const taglineLines = footerTagline.split("\n");
        const taglineStartY = LOGICAL_H - 26 - (taglineLines.length - 1) * 19;
        taglineLines.forEach((line, i) => {
            ctx.fillText(line, 26, taglineStartY + i * 19);
        });

        drawFactoryGlyph(ctx, LOGICAL_W - PAD_X - 92, LOGICAL_H - 42, 46, "rgba(15,23,42,0.22)");
        ctx.font = "600 9.5px 'Segoe UI', Arial, sans-serif";
        ctx.fillStyle = MUTED;
        ctx.textAlign = "right";
        ctx.fillText(footerKeywords.join("  |  "), LOGICAL_W - PAD_X, LOGICAL_H - 20);

        ctx.restore(); // end outer-clip save

        // Outer frame for definition when printed edge-to-edge
        roundRectPath(ctx, 1, 1, LOGICAL_W - 2, LOGICAL_H - 2, cardR - 1);
        ctx.strokeStyle = "rgba(15,23,42,0.08)";
        ctx.lineWidth = 1;
        ctx.stroke();
    };

    const handleGenerate = async () => {
        if (!targetUrl) {
            Swal.fire({
                title: "Organization not found",
                text: "Couldn't determine your organization from your session. Please refresh and try again.",
                icon: "warning",
            });
            return;
        }
        setGenerating(true);
        try {
            const qrCanvas = document.createElement("canvas");
            await Promise.all([
                QRCode.toCanvas(qrCanvas, targetUrl, {
                    errorCorrectionLevel: "H",
                    margin: 1,
                    width: QR_DRAW_SIZE * SCALE,
                    color: { dark: INK, light: "#ffffff" },
                }),
                preloadLogo(),
            ]);
            qrCanvasElRef.current = qrCanvas;
            drawCard(qrCanvas, accentColor);
            setIsGenerated(true);
        } catch (error) {
            console.error("Failed to generate QR code:", error);
            Swal.fire({ title: "Error", text: "Could not generate the QR code.", icon: "error" });
        } finally {
            setGenerating(false);
        }
    };

    const handleOpen = () => {
        setIsModalOpen(true);
        // Auto-generate as soon as the modal opens so the user sees the
        // finished card immediately instead of an empty dialog + a second
        // click.
        handleGenerate();
    };

    // Color swatches don't need a fresh QR or a fresh logo fetch — just
    // redraw the cached QR module canvas with the new accent, instantly.
    const handleColorChange = (color) => {
        setAccentColor(color);
        if (isGenerated && qrCanvasElRef.current) {
            drawCard(qrCanvasElRef.current, color);
        }
    };

    const handleDownload = () => {
        const canvas = canvasRef.current;
        if (!canvas || !isGenerated) return;
        try {
            canvas.toBlob((blob) => {
                if (!blob) {
                    Swal.fire({
                        title: "Couldn't export the image",
                        text: "This can happen if your organization's logo is served without CORS headers. Try again without a logo, or ask your backend team to allow this image to be read cross-origin.",
                        icon: "error",
                    });
                    return;
                }
                const blobUrl = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = blobUrl;
                a.download = fileName || `qr-helpdesk-${slugify(orgName || "org")}-${orgId ?? ""}.png`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(blobUrl);
            }, "image/png");
        } catch (error) {
            console.error("Download failed (likely a tainted canvas from a cross-origin logo):", error);
            Swal.fire({
                title: "Couldn't export the image",
                text: "This can happen if your organization's logo is served without CORS headers. Try again without a logo, or ask your backend team to allow this image to be read cross-origin.",
                icon: "error",
            });
        }
    };

    const modal = isModalOpen
        ? createPortal(
              <div className="cwi-qr-backdrop" onClick={() => setIsModalOpen(false)}>
                  <div className="cwi-qr-modal" onClick={(e) => e.stopPropagation()}>
                      <button
                          type="button"
                          className="cwi-qr-modal-close"
                          aria-label="Close"
                          onClick={() => setIsModalOpen(false)}
                      >
                          <i className="fa-solid fa-xmark"></i>
                      </button>

                      <div className="cwi-qr-color-row">
                          <span className="cwi-qr-color-label">Poster Color</span>
                          <div className="cwi-qr-swatches">
                              {COLOR_PRESETS.map((c) => (
                                  <button
                                      key={c}
                                      type="button"
                                      className={`cwi-qr-swatch ${accentColor === c ? "active" : ""}`}
                                      style={{ background: c }}
                                      aria-label={`Use ${c}`}
                                      onClick={() => handleColorChange(c)}
                                  />
                              ))}
                              <label
                                  className={`cwi-qr-swatch cwi-qr-swatch-custom ${
                                      COLOR_PRESETS.includes(accentColor) ? "" : "active"
                                  }`}
                                  style={!COLOR_PRESETS.includes(accentColor) ? { background: accentColor } : {}}
                                  title="Custom color"
                              >
                                  <input
                                      type="color"
                                      value={accentColor}
                                      onChange={(e) => handleColorChange(e.target.value)}
                                  />
                                  {COLOR_PRESETS.includes(accentColor) && <i className="fa-solid fa-eye-dropper"></i>}
                              </label>
                          </div>
                      </div>

                      <div className="cwi-qr-canvas-frame">
                          {generating && !isGenerated && (
                              <div className="cwi-qr-loading">
                                  <div className="spinner-border text-primary" role="status"></div>
                                  <span>Generating your QR code...</span>
                              </div>
                          )}
                          <canvas ref={canvasRef} style={{ display: isGenerated ? "block" : "none" }} />
                      </div>

                      <div className="d-flex gap-2 mt-3">
                          <button
                              type="button"
                              className="btn cwi-qr-btn-generate"
                              onClick={handleGenerate}
                              disabled={generating || !targetUrl}
                          >
                              <i className="fa-solid fa-rotate-right me-2"></i>
                              {generating ? "Generating..." : "Regenerate"}
                          </button>
                          {isGenerated && (
                              <button type="button" className="btn cwi-qr-btn-download" onClick={handleDownload}>
                                  <i className="fa-solid fa-download me-2"></i>
                                  Download QR Code
                              </button>
                          )}
                      </div>
                  </div>
              </div>,
              document.body
          )
        : null;

    return (
        <>
            <style>{`
                .cwi-qr-btn-generate {
                    border: none;
                    border-radius: 0.65rem;
                    font-weight: 600;
                    padding: 0.6rem 1.5rem;
                    background: linear-gradient(135deg, #0d6efd, #6610f2);
                    color: #fff;
                    transition: transform 0.15s ease, box-shadow 0.15s ease, filter 0.15s ease;
                }
                .cwi-qr-btn-generate:hover:not(:disabled) {
                    transform: translateY(-1px);
                    box-shadow: 0 6px 14px rgba(13,110,253,0.3);
                    filter: brightness(1.05);
                }
                .cwi-qr-btn-generate:disabled {
                    opacity: 0.7;
                    cursor: not-allowed;
                }
                .cwi-qr-btn-download {
                    border: 1.5px solid #0d6efd;
                    border-radius: 0.65rem;
                    font-weight: 600;
                    padding: 0.6rem 1.5rem;
                    background: #fff;
                    color: #0d6efd;
                    transition: transform 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease;
                }
                .cwi-qr-btn-download:hover {
                    transform: translateY(-1px);
                    background-color: rgba(13,110,253,0.06);
                    box-shadow: 0 4px 10px rgba(13,110,253,0.15);
                }
                .cwi-qr-backdrop {
                    position: fixed;
                    inset: 0;
                    background: rgba(15,23,42,0.55);
                    backdrop-filter: blur(2px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 2000;
                    padding: 1.5rem;
                    animation: cwiQrFadeIn 0.15s ease;
                }
                .cwi-qr-modal {
                    position: relative;
                    background: #fff;
                    border-radius: 1.5rem;
                    padding: 1.75rem;
                    box-shadow: 0 24px 60px rgba(15,23,42,0.35);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    max-height: 90vh;
                    overflow-y: auto;
                    animation: cwiQrPopIn 0.2s ease;
                }
                .cwi-qr-modal-close {
                    position: absolute;
                    top: 0.9rem;
                    right: 0.9rem;
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    border: none;
                    background: rgba(15,23,42,0.06);
                    color: #4b5566;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: background-color 0.15s ease, transform 0.15s ease;
                }
                .cwi-qr-modal-close:hover {
                    background-color: rgba(15,23,42,0.12);
                    transform: rotate(90deg);
                }
                .cwi-qr-color-row {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 0.5rem;
                    margin-bottom: 1rem;
                }
                .cwi-qr-color-label {
                    font-size: 0.72rem;
                    font-weight: 700;
                    letter-spacing: 0.06em;
                    text-transform: uppercase;
                    color: #8a8fa3;
                }
                .cwi-qr-swatches {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                .cwi-qr-swatch {
                    width: 26px;
                    height: 26px;
                    border-radius: 50%;
                    border: 2px solid #fff;
                    box-shadow: 0 0 0 1px rgba(15,23,42,0.12);
                    cursor: pointer;
                    padding: 0;
                    transition: transform 0.15s ease, box-shadow 0.15s ease;
                    position: relative;
                }
                .cwi-qr-swatch:hover {
                    transform: scale(1.12);
                }
                .cwi-qr-swatch.active {
                    box-shadow: 0 0 0 2px #fff, 0 0 0 4px currentColor;
                }
                .cwi-qr-swatch-custom {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: repeating-conic-gradient(#e5e7eb 0% 25%, #fff 0% 50%) 50% / 10px 10px;
                    color: #4b5566;
                    font-size: 0.7rem;
                    overflow: hidden;
                }
                .cwi-qr-swatch-custom input[type="color"] {
                    position: absolute;
                    inset: 0;
                    width: 100%;
                    height: 100%;
                    opacity: 0;
                    cursor: pointer;
                    border: none;
                    padding: 0;
                }
                .cwi-qr-canvas-frame {
                    border-radius: 1.25rem;
                    box-shadow: 0 12px 30px rgba(15,23,42,0.14);
                    overflow: hidden;
                    line-height: 0;
                    background: #fff;
                    width: 280px;
                    height: 549px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .cwi-qr-canvas-frame canvas {
                    width: 280px;
                    height: 549px;
                    display: block;
                }
                .cwi-qr-loading {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 0.75rem;
                    color: #64748b;
                    font-size: 0.85rem;
                    text-align: center;
                    padding: 0 1rem;
                }
                @keyframes cwiQrFadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes cwiQrPopIn {
                    from { opacity: 0; transform: scale(0.94) translateY(8px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }
            `}</style>

            <button
                type="button"
                className="btn cwi-qr-btn-generate"
                onClick={handleOpen}
                disabled={generating && isModalOpen}
            >
                <i className="fa-solid fa-qrcode me-2"></i>
                Generate QR Code
            </button>

            {modal}
        </>
    );
}

function slugify(str) {
    return String(str).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}