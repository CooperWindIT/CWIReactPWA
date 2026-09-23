import React, { useEffect, useMemo, useRef, useState } from "react";
import { Modal, Select, Button, Spin, Empty } from "antd";
import JSZip from "jszip";
import QRCode from "qrcode";
// ASSUMPTION: same Config exports the rest of your admin screens use.
import { BASE_API, BASE_IMAGE_API_GET } from "../Config/Config";

// The three group marks ship with the build rather than being fetched: they
// are always these same three files, and a logo served from another origin
// without CORS headers taints the canvas — which would break the PNG export
// for every card in the batch. Paths are relative to Components/Auth/.
import cwiLogo from "../Assests/Images/cwilogo.png";
import andisoLogo from "../Assests/Images/andisologo.png";
import svintechLogo from "../Assests/Images/svintechlogo.png";

// npm install antd jszip qrcode
//
// Bulk employee ID card generator for HR: pick one employee, a few, a whole
// department, or everyone, and get print-ready cards — front (photo, name,
// role) and back (contact details + organization address).
//
// Cards are drawn on a canvas rather than composed in HTML, so each one
// exports as a single high-resolution PNG (960x1521px) with no screenshot
// library, and prints crisply at real badge size.

const FONT = "'Poppins', 'Segoe UI', Arial, sans-serif";

// CR80 portrait (54 x 85.6mm) — standard badge stock, so printed cards fit
// off-the-shelf holders and lanyards.
const SCALE = 3;
const CARD_W = 320;
const CARD_H = 507;
const CANVAS_W = CARD_W * SCALE;
const CANVAS_H = CARD_H * SCALE;

const CARD_RADIUS = 16;
const PAD_X = 24;

// Lanyard slot punched through the top of the card.
const SLOT_W = 46;
const SLOT_H = 13;
const SLOT_TOP = 20;

const INK = "#1b1b1b";
const MUTED = "#6b7280";

// The logo blue. Everything on the card — the turbines, the back's header
// band, the tints behind them — is derived from this one value, so changing
// it re-themes both sides.
const DEFAULT_ACCENT = "#0271ae";

// The line printed above the QR on the back, inviting the scan. Override
// with the `tagline` prop if a screen needs different wording.
const DEFAULT_TAGLINE = "I'd like to connect — scan and save my contact details.";

// The office address printed on the back of every card. Line breaks are
// deliberate — they're where the address reads best on a badge. Override with
// the `orgAddress` prop if a screen needs a different one.
const DEFAULT_ORG_ADDRESS =
    "GB250-B, Greenbase Industrial & Logistics Park,\n" +
    "Vadakkupattu Village, Oragadam,\n" +
    "Kancheepuram - 603 204, Tamil Nadu, India.";

// Puts a number into E.164 form with India's country code, so a scanned
// contact dials correctly from abroad and lands in the phone book properly
// rather than as a bare local string.
//
// A number that already carries a "+" is left alone — an employee with an
// overseas number must not be rewritten as Indian.
function toIndianE164(raw) {
    const value = String(raw || "").trim();
    if (!value) return "";

    if (value.startsWith("+")) return value.replace(/[^\d+]/g, "");

    const digits = value.replace(/\D/g, "");
    if (!digits) return "";

    // Already carries 91, e.g. "91 89398 94969"
    if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;

    // Trunk-prefixed local number, e.g. "08939894969" or "044 2345 6789"
    if (digits.length > 10 && digits.startsWith("0")) return `+91${digits.slice(1)}`;

    // Plain ten-digit mobile
    if (digits.length === 10) return `+91${digits}`;

    // Anything else (short codes, landlines without an STD prefix) still gets
    // the country code — this is an Indian org — but the digits are passed
    // through untouched rather than guessed at.
    return `+91${digits}`;
}

// Employees who represent all of the group companies. Both sides of their
// card carry all three marks, and their QR carries all three company names
// so a scan saves the full picture.
//
// Spelled exactly as on the contact-QR card, so a scan of either one saves
// the same three names.
const MULTI_ORG_USER_IDS = [2, 10];

// One record per company: the mark printed at the top, the name written into
// the vCard, and the registered office printed in the footer of the group
// card. Keeping them together means the column under each logo is always
// that company's office — the order here is the order on the card.
const GROUP_ORG_MARKS = [
    {
        name: "CWI",
        logo: cwiLogo,
        tax: "GST : 33AAICC5110E1ZA",
        address:
            "GB250-B, Greenbase Industrial & Logistics Park, " +
            "Vadakkupattu Village, Oragadam, " +
            "Kancheepuram - 603 204, Tamil Nadu, India.",
    },
    {
        name: "Andiso",
        logo: andisoLogo,
        tax: "GST : 33ABCCA5730F1Z4",
        address:
            "S.F.No. 269/1E, Thiruneermalai Main Road, " +
            "Thirumudivakkam, Chennai - 600 044, Tamil Nadu, India.",
    },
    {
        name: "SVIN Tech",
        // `heading` is what tops this company's column in the footer, for
        // when the registered entity is named differently from the short
        // name used on the QR and under the logos. Without it the name would
        // be printed twice — once as the heading and again at the head of
        // the address.
        heading: "SVIN Tech GmbH",
        logo: svintechLogo,
        // Two registrations for the German entity, so both print.
        tax: "TAX : 307/5909/4451\nVAT : DE462994436",
        address: "Dunkerstr. 41, 46325 Borken, Germany.",
    },
];

// One source of truth: the names in the vCard are the names under the marks.
const GROUP_ORGS = GROUP_ORG_MARKS.map((org) => org.name);

// What prints under the name and goes into the vCard's TITLE. Designation is
// the real job title from the API; RoleName is only the portal permission
// level, so it's a fallback rather than the first choice.
function designationOf(user) {
    return user?.Designation || user?.RoleName || "";
}

// ---------------------------------------------------------------
// Canvas helpers
// ---------------------------------------------------------------

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

function wrapText(ctx, text, maxWidth, maxLines) {
    const paragraphs = String(text || "").split("\n");
    const lines = [];

    for (const paragraph of paragraphs) {
        const words = paragraph.split(/\s+/).filter(Boolean);
        let current = "";

        for (const word of words) {
            const test = current ? `${current} ${word}` : word;
            if (current && ctx.measureText(test).width > maxWidth) {
                lines.push(current);
                current = word;
            } else {
                current = test;
            }
        }

        if (current) lines.push(current);
        if (lines.length >= maxLines) break;
    }

    return lines.slice(0, maxLines);
}

function fitFontSize(ctx, text, maxWidth, startSize, minSize, weight) {
    let size = startSize;
    while (size > minSize) {
        ctx.font = `${weight} ${size}px ${FONT}`;
        if (ctx.measureText(text).width <= maxWidth) break;
        size -= 0.5;
    }
    return size;
}

// Lays one or more organisation marks across a band, each scaled into its own
// slot and vertically centred — the same arrangement as the contact-QR card's
// header. A mark with no image falls back to its name set in text, so a
// missing file never leaves a blank space.
function drawOrgMarks(ctx, marks, x, y, w, h, options = {}) {
    const {
        fallbackColor = INK,
        fallbackMaxSize = 16,
        dividerColor = "rgba(15,23,42,0.12)",
    } = options;

    const slotW = w / marks.length;
    const multi = marks.length > 1;

    marks.forEach((mark, i) => {
        const slotCX = x + slotW * i + slotW / 2;
        const innerW = multi ? slotW - 16 : slotW;
        const img = mark.img;

        if (img && img.naturalWidth) {
            let drawH = h;
            let drawW = (img.naturalWidth / img.naturalHeight) * h;

            if (drawW > innerW) {
                drawW = innerW;
                drawH = (img.naturalHeight / img.naturalWidth) * innerW;
            }

            ctx.save();
            try {
                // The mark's colour is nudged up so it holds its own against
                // the turbines behind it.
                ctx.filter = "saturate(1.18) contrast(1.06)";
            } catch (error) {
                // Older browsers without ctx.filter get the logo as-is.
            }
            ctx.drawImage(img, slotCX - drawW / 2, y + (h - drawH) / 2, drawW, drawH);
            ctx.restore();
        } else {
            const label = String(mark.label || "").toUpperCase();
            const size = fitFontSize(ctx, label, innerW, fallbackMaxSize, 7, "800");

            ctx.save();
            ctx.font = `800 ${size}px ${FONT}`;
            ctx.fillStyle = fallbackColor;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(label, slotCX, y + h / 2);
            ctx.restore();
        }

        // Hairline between companies
        if (multi && i < marks.length - 1) {
            const dividerX = x + slotW * (i + 1);
            ctx.save();
            ctx.strokeStyle = dividerColor;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(dividerX, y + 3);
            ctx.lineTo(dividerX, y + h - 3);
            ctx.stroke();
            ctx.restore();
        }
    });
}

// The group card's footer: one column per company — name, tax registration
// and registered office — separated by the same hairline as the marks along
// the top.
//
// The type size is fitted, not fixed. Three columns inside 272 logical units
// leaves about 84 each, so a fixed size would either overflow the card or
// waste half the space depending on how long the addresses are. This starts
// at the size used elsewhere on the back and steps down only as far as it
// must for every column to fit the height it has been given.
function drawOfficeColumns(ctx, offices, x, y, w, maxH, accent) {
    const GUTTER = 10;

    // Equal columns would leave the longest address running seven lines deep
    // while the shortest stops after three. Width is handed out in proportion
    // to how much there is to set, clamped so no column can collapse or hog
    // the row — which keeps the three blocks roughly level with each other.
    const weights = offices.map(
        (office) =>
            String(office.address || "").length +
            String(office.tax || "").length +
            String(office.heading || office.name || "").length
    );
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0) || 1;

    const usable = w - GUTTER * (offices.length - 1);
    const equalShare = usable / offices.length;

    const rawWidths = weights.map((weight) =>
        Math.min(
            equalShare * 1.35,
            Math.max(equalShare * 0.75, (usable * weight) / totalWeight)
        )
    );

    const rawTotal = rawWidths.reduce((sum, width) => sum + width, 0);
    const colWidths = rawWidths.map((width) => (width * usable) / rawTotal);

    const colXs = [];
    let nextX = x;
    colWidths.forEach((width) => {
        colXs.push(nextX);
        nextX += width + GUTTER;
    });

    const layoutAt = (size) => {
        const lineH = size * 1.3;

        return offices.map((office, i) => {
            const colW = colWidths[i];

            // A registration number is a single token — broken over two
            // lines it stops being readable as a number at all, so these are
            // never wrapped. Each one is shrunk to fit its column instead.
            const taxLines = office.tax ? String(office.tax).split("\n") : [];

            ctx.font = `500 ${size}px ${FONT}`;
            // The stored line breaks are tuned for a full-width address; in a
            // narrow column they would strand single words, so the address is
            // re-flowed as one paragraph.
            const addressLines = wrapText(
                ctx,
                String(office.address || "").replace(/\n/g, " "),
                colW,
                9
            );

            return {
                taxLines,
                addressLines,
                lineH,
                height: lineH * (1 + taxLines.length + addressLines.length) + 4,
            };
        });
    };

    let size = 8;
    let columns = layoutAt(size);

    while (size > 5.5 && Math.max(...columns.map((c) => c.height)) > maxH) {
        size -= 0.25;
        columns = layoutAt(size);
    }

    const tallest = Math.min(maxH, Math.max(...columns.map((c) => c.height)));

    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";

    offices.forEach((office, i) => {
        const colX = colXs[i];
        const colW = colWidths[i];
        const { taxLines, addressLines, lineH } = columns[i];

        let cursor = y + size;

        const heading = office.heading || office.name;
        const headingSize = fitFontSize(ctx, heading, colW, size + 0.5, 5.5, "800");

        ctx.font = `800 ${headingSize}px ${FONT}`;
        ctx.fillStyle = shadeHex(accent, -0.18);
        ctx.fillText(heading, colX, cursor);
        cursor += lineH + 1;

        ctx.fillStyle = MUTED;
        taxLines.forEach((line) => {
            const taxSize = fitFontSize(ctx, line, colW, size, 5, "600");
            ctx.font = `600 ${taxSize}px ${FONT}`;
            ctx.fillText(line, colX, cursor);
            cursor += lineH;
        });

        ctx.font = `500 ${size}px ${FONT}`;
        ctx.fillStyle = "#374151";
        addressLines.forEach((line) => {
            ctx.fillText(line, colX, cursor);
            cursor += lineH;
        });

        if (i < offices.length - 1) {
            ctx.save();
            ctx.strokeStyle = "rgba(15,23,42,0.12)";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(colX + colW + GUTTER / 2, y);
            ctx.lineTo(colX + colW + GUTTER / 2, y + tallest);
            ctx.stroke();
            ctx.restore();
        }
    });
}

// Fills the box completely, cropping the overflow. Portraits are anchored to
// the top rather than centred, so a tall photo loses feet, never the face.
function drawCover(ctx, img, x, y, w, h) {
    const imgRatio = img.naturalWidth / img.naturalHeight;
    const boxRatio = w / h;

    let sx = 0;
    let sy = 0;
    let sw = img.naturalWidth;
    let sh = img.naturalHeight;

    if (imgRatio > boxRatio) {
        sw = img.naturalHeight * boxRatio;
        sx = (img.naturalWidth - sw) / 2;
    } else {
        sh = img.naturalWidth / boxRatio;
        sy = 0; // top-anchored: keep the head in frame
    }

    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

// Shifts a hex colour toward white (amount > 0) or black (amount < 0), so the
// foliage can be built from a few tones of one accent instead of hard-coded
// greens — change the accent and the whole cluster follows.
function shadeHex(hex, amount) {
    const clean = hex.replace("#", "");
    const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
    const num = parseInt(full, 16);

    const mix = (channel) =>
        Math.round(
            amount >= 0
                ? channel + (255 - channel) * amount
                : channel * (1 + amount)
        );

    const r = mix((num >> 16) & 255);
    const g = mix((num >> 8) & 255);
    const b = mix(num & 255);

    return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

// A single wind turbine: tapered tower, nacelle, and three swept blades.
// Drawn as vectors rather than placed as a bitmap, so it stays perfectly
// sharp at print resolution and re-tints with the accent colour.
function drawTurbine(ctx, hubX, hubY, rotorR, towerBottomY, color, alpha, bladeAngle) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;

    // Tower — slightly wider at the base, like the real thing
    const topW = rotorR * 0.055;
    const baseW = rotorR * 0.115;
    ctx.beginPath();
    ctx.moveTo(hubX - topW, hubY);
    ctx.lineTo(hubX + topW, hubY);
    ctx.lineTo(hubX + baseW, towerBottomY);
    ctx.lineTo(hubX - baseW, towerBottomY);
    ctx.closePath();
    ctx.fill();

    // Nacelle
    ctx.beginPath();
    ctx.ellipse(hubX, hubY, rotorR * 0.105, rotorR * 0.062, 0, 0, Math.PI * 2);
    ctx.fill();

    // Three blades at 120°
    for (let i = 0; i < 3; i++) {
        ctx.save();
        ctx.translate(hubX, hubY);
        ctx.rotate(bladeAngle + (i * Math.PI * 2) / 3);

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(rotorR * 0.17, -rotorR * 0.46, rotorR * 0.05, -rotorR);
        ctx.quadraticCurveTo(-rotorR * 0.03, -rotorR * 0.52, 0, 0);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }

    // Hub cap over the blade roots
    ctx.beginPath();
    ctx.arc(hubX, hubY, rotorR * 0.05, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

// The wind farm behind the portrait. Turbines are drawn between two ridges:
// the far one gives the sky a horizon, the near one is opaque and covers the
// tower bases, so no tower ends in mid-air the way a floating silhouette
// would.
function drawWindScene(ctx, W, H, accent) {
    const far = shadeHex(accent, 0.62);
    const mid = shadeHex(accent, 0.32);

    const ridge = (topY, curveY, color, alpha) => {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(-10, topY);
        ctx.quadraticCurveTo(W * 0.36, curveY, W + 10, topY - H * 0.02);
        ctx.lineTo(W + 10, H + 10);
        ctx.lineTo(-10, H + 10);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    };

    // Far ridge — sits behind the turbines
    ridge(H * 0.615, H * 0.545, shadeHex(accent, 0.86), 1);

    // Turbines, back to front. Towers run well below the near ridge line so
    // their bases are covered rather than cut off.
    // Hubs sit low and rotors are kept short so no blade tip reaches up into
    // the logo — the header needs clear space above the skyline, not turbines
    // crowding it.
    drawTurbine(ctx, W * 0.205, H * 0.455, 44, H * 0.74, far, 0.95, -0.50);
    drawTurbine(ctx, W * 0.715, H * 0.375, 52, H * 0.72, mid, 0.95, 0.70);
    // The big middle turbine is softened: at full sharpness its tower cut a
    // hard edge straight across the portrait. Blurring pushes it behind the
    // person. It's rendered into its own layer so the blur can't smear what's
    // already painted underneath, at device resolution so the radius is
    // predictable regardless of the canvas transform — and bounded to the
    // turbine's own footprint, since this runs once per card and a batch can
    // be a hundred people.
    const midHubX = W * 0.435;
    const midHubY = H * 0.415;
    const midR = 74;
    const midBottom = H * 0.78;

    const blurPx = 1.6;
    const pad = blurPx * 4; // room for the blur to spread past the shape

    const bx = midHubX - midR - pad;
    const by = midHubY - midR - pad;
    const bw = midR * 2 + pad * 2;
    const bh = midBottom - midHubY + midR + pad * 2;

    const blurLayer = document.createElement("canvas");
    blurLayer.width = Math.ceil(bw * SCALE);
    blurLayer.height = Math.ceil(bh * SCALE);

    const bctx = blurLayer.getContext("2d");
    bctx.setTransform(SCALE, 0, 0, SCALE, -bx * SCALE, -by * SCALE);
    drawTurbine(bctx, midHubX, midHubY, midR, midBottom, accent, 1, 0.25);

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    try {
        ctx.filter = `blur(${blurPx * SCALE}px)`;
    } catch (error) {
        // Older browsers without ctx.filter get it sharp — still correct.
    }
    ctx.drawImage(blurLayer, Math.round(bx * SCALE), Math.round(by * SCALE));
    ctx.restore();

    // Near ridge — opaque, in front of the towers
    ridge(H * 0.680, H * 0.628, shadeHex(accent, 0.93), 1);
}

// Stand-in when an employee has no photo on file: a soft disc with their
// initials. Deliberately quiet — floating letters over the scene read as a
// rendering glitch, a framed monogram reads as a placeholder.
function drawInitialsAvatar(ctx, name, x, y, w, h, accent) {
    const initials = String(name || "?")
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase();

    const r = Math.min(w, h) * 0.30;
    const cx = x + w * 0.52;
    const cy = y + h * 0.36;

    ctx.save();

    ctx.globalAlpha = 0.92;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 0.16;
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 0.85;
    ctx.fillStyle = accent;
    ctx.font = `800 ${Math.round(r * 0.72)}px ${FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(initials, cx, cy + r * 0.04);

    ctx.restore();
}

// ---------------------------------------------------------------
// Image loading
// ---------------------------------------------------------------

// Resolves null instead of rejecting, so a missing or CORS-blocked image
// downgrades that one card gracefully rather than failing the whole batch.
function loadImage(url) {
    return new Promise((resolve) => {
        if (!url) {
            resolve(null);
            return;
        }

        const img = new Image();
        img.crossOrigin = "anonymous"; // required for the canvas to stay exportable

        img.onload = () => resolve(img);
        img.onerror = () => {
            console.warn("ID card image failed to load (missing, or no CORS headers):", url);
            resolve(null);
        };

        img.src = url;
    });
}

// ---------------------------------------------------------------
// Component
// ---------------------------------------------------------------

// Closes the Bootstrap offcanvas with the given id and resolves once it has
// finished sliding away — so the modal opens into a clean screen instead of
// fighting the panel over the backdrop and the body scroll lock.
//
// Works whether Bootstrap is exposed on window or imported as a module: it
// uses the real API when it can reach it, and otherwise triggers Bootstrap's
// own delegated [data-bs-dismiss] handler, which is active either way (it has
// to be — the same handlers are what open the panel in the first place).
function closeBootstrapOffcanvas(offcanvasId) {
    return new Promise((resolve) => {
        const el = offcanvasId ? document.getElementById(offcanvasId) : null;

        if (!el || !el.classList.contains("show")) {
            resolve();
            return;
        }

        const fallback = setTimeout(resolve, 600);

        el.addEventListener(
            "hidden.bs.offcanvas",
            () => {
                clearTimeout(fallback);
                resolve();
            },
            { once: true }
        );

        const OffcanvasApi =
            typeof window !== "undefined" && window.bootstrap && window.bootstrap.Offcanvas;

        const instance =
            OffcanvasApi &&
            (OffcanvasApi.getInstance(el) || OffcanvasApi.getOrCreateInstance(el));

        if (instance) {
            instance.hide();
            return;
        }

        const dismisser = document.createElement("button");
        dismisser.type = "button";
        dismisser.setAttribute("data-bs-dismiss", "offcanvas");
        dismisser.style.display = "none";
        el.appendChild(dismisser);
        dismisser.click();
        dismisser.remove();
    });
}

const EmployeeIdCards = ({
    accent = DEFAULT_ACCENT,
    orgAddress = DEFAULT_ORG_ADDRESS,
    tagline = DEFAULT_TAGLINE,
    // Id of the Bootstrap offcanvas this sits inside, if any. Given one, the
    // panel is closed before the modal opens.
    closeOffcanvasId,
    // Strips the standalone-page chrome so the toolbar sits naturally in a panel.
    embedded = false,
    orgName: orgNameProp,
    logoUrl: logoUrlProp,
}) => {
    const [sessionUserData, setSessionUserData] = useState({});
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [usersData, setUsersData] = useState([]);
    const [dataLoading, setDataLoading] = useState(false);
    const [fetchError, setFetchError] = useState(null);

    const [selectedIds, setSelectedIds] = useState([]);
    const [deptFilter, setDeptFilter] = useState(null);

    const [generating, setGenerating] = useState(false);
    const [progress, setProgress] = useState({ done: 0, total: 0 });
    const [cards, setCards] = useState([]);
    const [step, setStep] = useState("select"); // "select" | "review"
    const [zipping, setZipping] = useState(false);

    const orgMarksRef = useRef(null);

    useEffect(() => {
        const userDataString = sessionStorage.getItem("userData");
        if (userDataString) {
            setSessionUserData(JSON.parse(userDataString));
        }
    }, []);

    // NOTE: ImageUrl (lower-case "rl") on the session is the ORGANISATION
    // logo; ImageURL (upper-case) is the signed-in user's own photo. Only the
    // former belongs on a card.
    const orgName =
        orgNameProp ?? sessionUserData?.OrgName ?? "Cooperwind India Private Limited";

    const logoUrl =
        logoUrlProp ??
        (sessionUserData?.ImageUrl ? `${BASE_IMAGE_API_GET}${sessionUserData.ImageUrl}` : null);

    // =========================================================
    // FETCH EMPLOYEES
    // =========================================================

    const fetchData = async () => {
        if (!sessionUserData?.OrgId) return;

        setDataLoading(true);
        setFetchError(null);

        try {
            const response = await fetch(
                `${BASE_API}AdminRoutes/getUsers?OrgId=${sessionUserData.OrgId}`
            );

            if (response.ok) {
                const data = await response.json();
                setUsersData(Array.isArray(data?.ResultData) ? data.ResultData : []);
            } else {
                console.error("Failed to fetch employees:", response.statusText);
                setFetchError("Couldn't load the employee list. Please try again.");
            }
        } catch (error) {
            console.error("Error fetching employees:", error.message);
            setFetchError("Couldn't load the employee list. Please try again.");
        } finally {
            setDataLoading(false);
        }
    };

    const departments = useMemo(() => {
        const names = new Set();
        usersData.forEach((user) => user?.DeptName && names.add(user.DeptName));
        return [...names].sort();
    }, [usersData]);

    // The list the dropdown shows — narrowed by department when one is picked.
    const visibleUsers = useMemo(
        () => (deptFilter ? usersData.filter((u) => u.DeptName === deptFilter) : usersData),
        [usersData, deptFilter]
    );

    const selectedUsers = useMemo(
        () => usersData.filter((user) => selectedIds.includes(user.Id)),
        [usersData, selectedIds]
    );

    // =========================================================
    // DRAW — FRONT
    // =========================================================

    const drawFront = (ctx, user, photo, marks) => {
        ctx.clearRect(0, 0, CARD_W, CARD_H);

        // Card body (everything outside stays transparent, so the rounded
        // corners and the punched slot read on any background)
        roundRectPath(ctx, 0, 0, CARD_W, CARD_H, CARD_RADIUS);
        ctx.fillStyle = "#ffffff";
        ctx.fill();

        ctx.save();
        roundRectPath(ctx, 0, 0, CARD_W, CARD_H, CARD_RADIUS);
        ctx.clip();

        // ---- Wind farm, behind everything ----
        drawWindScene(ctx, CARD_W, CARD_H, accent);

        // Soft white wash over the top of the card so the foliage dissolves
        // instead of crowding the logo.
        const topWash = ctx.createLinearGradient(0, 0, 0, CARD_H * 0.28);
        topWash.addColorStop(0, "rgba(255,255,255,1)");
        topWash.addColorStop(0.45, "rgba(255,255,255,0.92)");
        topWash.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = topWash;
        ctx.fillRect(0, 0, CARD_W, CARD_H * 0.28);

        // ---- Organisation mark(s), across the top ----
        // One logo normally. A group representative gets all three in the
        // same band, split into equal slots with a hairline between them.
        const multiOrg = marks.length > 1;

        drawOrgMarks(
            ctx,
            marks,
            PAD_X,
            SLOT_TOP + 26,
            CARD_W - PAD_X * 2,
            multiOrg ? 40 : 72,
            {
                fallbackColor: shadeHex(accent, -0.10),
                fallbackMaxSize: multiOrg ? 11 : 22,
            }
        );

        // ---- Employee photo, bottom-right, bleeding off the edges ----
        const photoX = CARD_W * 0.38;
        const photoY = CARD_H * 0.44;
        const photoW = CARD_W - photoX;
        const photoH = CARD_H - photoY;

        ctx.save();

        // Draw the photo into its own layer so the edge fade below only eats
        // the photo, not the card or the foliage underneath it.
        const layer = document.createElement("canvas");
        layer.width = Math.ceil(photoW * SCALE);
        layer.height = Math.ceil(photoH * SCALE);
        const lctx = layer.getContext("2d");
        lctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);

        if (photo && photo.naturalWidth) {
            try {
                // Full colour, lifted slightly — a badge photo should look
                // like the person, and a washed-out one is harder to match
                // to a face at a gate.
                lctx.filter = "saturate(1.06) brightness(1.04) contrast(1.02)";
            } catch (error) {
                // Older browsers without ctx.filter just get the photo as-is.
            }
            drawCover(lctx, photo, 0, 0, photoW, photoH);
            lctx.filter = "none";
        } else {
            drawInitialsAvatar(lctx, user.Name, 0, 0, photoW, photoH, accent);
        }

        // Feather the left and top edges so a rectangular photo melts into
        // the card instead of sitting in it like a pasted box.
        lctx.globalCompositeOperation = "destination-out";

        const fadeX = lctx.createLinearGradient(0, 0, photoW * 0.20, 0);
        fadeX.addColorStop(0, "rgba(0,0,0,1)");
        fadeX.addColorStop(0.55, "rgba(0,0,0,0.35)");
        fadeX.addColorStop(1, "rgba(0,0,0,0)");
        lctx.fillStyle = fadeX;
        lctx.fillRect(0, 0, photoW * 0.20, photoH);

        const fadeY = lctx.createLinearGradient(0, 0, 0, photoH * 0.08);
        fadeY.addColorStop(0, "rgba(0,0,0,1)");
        fadeY.addColorStop(0.6, "rgba(0,0,0,0.3)");
        fadeY.addColorStop(1, "rgba(0,0,0,0)");
        lctx.fillStyle = fadeY;
        lctx.fillRect(0, 0, photoW, photoH * 0.08);

        lctx.globalCompositeOperation = "source-over";

        ctx.drawImage(layer, photoX, photoY, photoW, photoH);
        ctx.restore();

        // ---- Legibility scrim ----
        // The name sits over whatever the photo happens to contain there — a
        // dark shirt, a tree, a shadow. This soft light wash guarantees the
        // contrast instead of hoping every employee photo is light on the
        // left.
        const scrimW = CARD_W * 0.70;
        const scrimTop = CARD_H * 0.62;
        const scrimH = CARD_H - scrimTop;

        const scrim = document.createElement("canvas");
        scrim.width = Math.ceil(scrimW * SCALE);
        scrim.height = Math.ceil(scrimH * SCALE);

        const sctx = scrim.getContext("2d");
        sctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);

        const scrimX = sctx.createLinearGradient(0, 0, scrimW, 0);
        scrimX.addColorStop(0, "rgba(255,255,255,0.97)");
        scrimX.addColorStop(0.45, "rgba(255,255,255,0.90)");
        scrimX.addColorStop(1, "rgba(255,255,255,0)");
        sctx.fillStyle = scrimX;
        sctx.fillRect(0, 0, scrimW, scrimH);

        // Feather the top edge so it's a wash, not a visible box
        sctx.globalCompositeOperation = "destination-out";
        const scrimY = sctx.createLinearGradient(0, 0, 0, scrimH * 0.42);
        scrimY.addColorStop(0, "rgba(0,0,0,1)");
        scrimY.addColorStop(1, "rgba(0,0,0,0)");
        sctx.fillStyle = scrimY;
        sctx.fillRect(0, 0, scrimW, scrimH * 0.42);

        ctx.drawImage(scrim, 0, scrimTop, scrimW, scrimH);

        // ---- Name + role, bottom-left ----
        const textMaxW = CARD_W * 0.56;

        ctx.textAlign = "left";
        ctx.textBaseline = "alphabetic";

        const nameY = CARD_H * 0.76;

        const nameSize = fitFontSize(ctx, user.Name || "", textMaxW, 21, 12, "800");
        ctx.font = `800 ${nameSize}px ${FONT}`;
        ctx.fillStyle = shadeHex(accent, -0.18);
        ctx.fillText(user.Name || "", PAD_X, nameY);

        // Short rule between name and role, as on the artwork
        ctx.fillStyle = accent;
        ctx.fillRect(PAD_X, nameY + 11, 34, 2.5);

        const roleText = designationOf(user);
        const roleSize = fitFontSize(ctx, roleText, textMaxW, 14, 9, "500");
        ctx.font = `500 ${roleSize}px ${FONT}`;
        ctx.fillStyle = "#374151";
        ctx.fillText(roleText, PAD_X, nameY + 32);

        ctx.restore(); // end card clip

        punchLanyardSlot(ctx);
    };

    // =========================================================
    // DRAW — BACK
    // =========================================================

    // Builds the same vCard the contact-QR screen produces, so a scan saves
    // the employee straight into a phone's address book.
    const buildVCard = (user) => {
        const escape = (value = "") =>
            String(value)
                .replace(/\\/g, "\\\\")
                .replace(/\n/g, "\\n")
                .replace(/;/g, "\\;")
                .replace(/,/g, "\\,");

        const fullName = String(user.Name || "").trim();
        const [firstName, ...rest] = fullName ? fullName.split(/\s+/) : [""];

        // Group representatives get every company in the one ORG value.
        // They're joined with " | " rather than ";" because a semicolon inside
        // ORG separates organisational *units* (Company;Division;Team) — using
        // it would make Andiso and SVIN Tech look like departments of CWI.
        const isMultiOrg = MULTI_ORG_USER_IDS.includes(Number(user.Id));
        const orgLine = isMultiOrg ? GROUP_ORGS.join(" | ") : orgName;

        const lines = [
            "BEGIN:VCARD",
            "VERSION:3.0",
            `N:${escape(rest.join(" "))};${escape(firstName)};;;`,
            `FN:${escape(fullName)}`,
            `ORG:${escape(orgLine)}`,
        ];

        const title = designationOf(user);
        if (title) lines.push(`TITLE:${escape(title)}`);

        // Spelled out on their own lines too: the company field gets
        // truncated in a lot of contact apps.
        if (isMultiOrg) {
            lines.push(`NOTE:${escape(GROUP_ORGS.join("\n"))}`);
        }
        const tel = toIndianE164(user.Mobile);
        if (tel) lines.push(`TEL;TYPE=CELL,VOICE:${escape(tel)}`);
        if (user.Email) lines.push(`EMAIL;TYPE=WORK:${escape(user.Email)}`);

        lines.push("END:VCARD");
        return lines.join("\r\n");
    };

    // Paints a QR by filling each module as a rectangle on exact device-pixel
    // boundaries. Scaling a QR bitmap by a non-integer factor leaves some
    // modules a pixel wider than others, which is enough to stop a dense code
    // from scanning at all — this keeps the grid perfectly regular.
    const drawQr = (ctx, text, boxX, boxY, boxSize) => {
        // "M" (15% recovery) rather than "H": a full vCard is a long payload,
        // and "H" would push the grid so fine it stops reading at badge size.
        const qr = QRCode.create(text, { errorCorrectionLevel: "M" });
        const count = qr.modules.size;

        const modulePx = Math.max(1, Math.floor((boxSize * SCALE) / count));
        const drawnPx = modulePx * count;
        const drawnLogical = drawnPx / SCALE;

        const originX = Math.round((boxX + (boxSize - drawnLogical) / 2) * SCALE);
        const originY = Math.round((boxY + (boxSize - drawnLogical) / 2) * SCALE);

        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0); // paint the grid in raw device pixels
        ctx.fillStyle = "#101828";

        for (let row = 0; row < count; row++) {
            for (let col = 0; col < count; col++) {
                if (qr.modules.data[row * count + col]) {
                    ctx.fillRect(
                        originX + col * modulePx,
                        originY + row * modulePx,
                        modulePx,
                        modulePx
                    );
                }
            }
        }

        ctx.restore();
        return drawnLogical;
    };

    const drawBack = (ctx, user, marks) => {
        ctx.clearRect(0, 0, CARD_W, CARD_H);

        roundRectPath(ctx, 0, 0, CARD_W, CARD_H, CARD_RADIUS);
        ctx.fillStyle = "#ffffff";
        ctx.fill();

        ctx.save();
        roundRectPath(ctx, 0, 0, CARD_W, CARD_H, CARD_RADIUS);
        ctx.clip();

        const ghost = shadeHex(accent, 0.88);
        drawTurbine(ctx, CARD_W * 0.90, CARD_H * 0.12, 42, CARD_H, ghost, 1, 0.4);
        drawTurbine(ctx, CARD_W * 0.08, CARD_H * 0.18, 30, CARD_H, ghost, 1, -0.6);

        // ---- Organisation mark(s), across the top ----
        // The same header as the front, in the same colours — the two sides
        // of one badge should read as one card.
        const markBandY = SLOT_TOP + 22;
        const markBandH = 34;

        drawOrgMarks(ctx, marks, PAD_X, markBandY, CARD_W - PAD_X * 2, markBandH, {
            fallbackColor: shadeHex(accent, -0.10),
            fallbackMaxSize: marks.length > 1 ? 10 : 14,
        });

        const headerBottom = markBandY + markBandH;

        // ---- Who the card belongs to ----
        ctx.textAlign = "center";
        ctx.textBaseline = "alphabetic";

        const nameSize = fitFontSize(ctx, user.Name || "", CARD_W - PAD_X * 2, 16, 10, "800");
        ctx.font = `800 ${nameSize}px ${FONT}`;
        ctx.fillStyle = shadeHex(accent, -0.18);
        ctx.fillText(user.Name || "", CARD_W / 2, headerBottom + 22);

        ctx.font = `500 10.5px ${FONT}`;
        ctx.fillStyle = MUTED;
        ctx.fillText(designationOf(user), CARD_W / 2, headerBottom + 38);

        // ---- The invitation to scan ----
        // This sits above the code rather than under it: it's what tells
        // someone why to reach for their phone, so it has to be read first.
        ctx.font = `400 9.5px ${FONT}`;
        ctx.fillStyle = MUTED;

        const taglineLines = wrapText(ctx, tagline, CARD_W - PAD_X * 2 - 10, 2);
        const taglineLineH = 12;
        const taglineTop = headerBottom + 58;

        taglineLines.forEach((line, i) => {
            ctx.fillText(line, CARD_W / 2, taglineTop + i * taglineLineH);
        });

        const taglineBottom = taglineTop + (taglineLines.length - 1) * taglineLineH;

        // ---- QR + footer ----
        // The two variants lay their lower half out differently, because a
        // group representative's card has to carry three registered offices
        // and three columns need the room. So the group card pins the QR at
        // the smallest size that still prints reliably and gives everything
        // below to the offices, while a single-office card measures its
        // address first, anchors it to the foot of the card, and lets the QR
        // take every pixel that's left.
        const isGroup = marks.length > 1;
        const blockTop = taglineBottom + 16;

        const paintQrTile = (tile, tileY) => {
            const tileX = (CARD_W - tile) / 2;

            roundRectPath(ctx, tileX, tileY, tile, tile, 14);
            ctx.fillStyle = "#ffffff";
            ctx.fill();
            ctx.strokeStyle = shadeHex(accent, 0.72);
            ctx.lineWidth = 1;
            ctx.stroke();

            drawQr(ctx, buildVCard(user), tileX + 14, tileY + 14, tile - 28);
        };

        const paintRule = (lineY) => {
            ctx.strokeStyle = shadeHex(accent, 0.68);
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(PAD_X, lineY);
            ctx.lineTo(CARD_W - PAD_X, lineY);
            ctx.stroke();
        };

        if (isGroup) {
            // 176 holds every module just above 0.38mm at CR80 size — about
            // the finest a phone camera reads dependably, so this is the
            // floor rather than a number picked to fit.
            const tile = 176;
            paintQrTile(tile, blockTop);

            const ruleY = blockTop + tile + 20;
            paintRule(ruleY);

            ctx.textAlign = "left";
            ctx.textBaseline = "alphabetic";
            ctx.font = `700 8px ${FONT}`;
            ctx.fillStyle = MUTED;
            ctx.fillText("REGISTERED OFFICES", PAD_X, ruleY + 14);

            const columnsTop = ruleY + 22;

            drawOfficeColumns(
                ctx,
                GROUP_ORG_MARKS,
                PAD_X,
                columnsTop,
                CARD_W - PAD_X * 2,
                CARD_H - 16 - columnsTop,
                accent
            );
        } else {
            ctx.font = `600 9px ${FONT}`;
            const addrLines = wrapText(ctx, orgAddress, CARD_W - PAD_X * 2, 5);

            const addrLineH = 12;
            const addrFirstY = CARD_H - 30 - (addrLines.length - 1) * addrLineH;
            const addrLabelY = addrFirstY - 15;
            const ruleY = addrLabelY - 15;

            const bottomGap = 16;
            const tile = Math.min(224, ruleY - bottomGap - blockTop);
            const tileY =
                blockTop + Math.max(0, (ruleY - bottomGap - blockTop - tile) / 2);

            paintQrTile(tile, tileY);
            paintRule(ruleY);

            ctx.textAlign = "left";
            ctx.textBaseline = "alphabetic";

            // The label lives here and ONLY here. It used to appear twice —
            // once drawn as this label and again as a "Register Office:"
            // prefix baked into the address string itself. The address
            // constant no longer carries that prefix, so keep it out of there
            // if you ever edit it.
            ctx.font = `700 8px ${FONT}`;
            ctx.fillStyle = MUTED;
            ctx.fillText("REGISTERED OFFICE", PAD_X, addrLabelY);

            ctx.font = `600 9px ${FONT}`;
            ctx.fillStyle = "#374151";

            addrLines.forEach((line, i) => {
                ctx.fillText(line, PAD_X, addrFirstY + i * addrLineH);
            });
        }

        // Slim brand bar so the white back still reads as part of the set
        ctx.fillStyle = accent;
        ctx.fillRect(0, CARD_H - 9, CARD_W, 9);

        ctx.restore();

        punchLanyardSlot(ctx);
    };

    // Cuts the lanyard slot clean through every layer, so the hole is
    // genuinely transparent in the exported PNG.
    const punchLanyardSlot = (ctx) => {
        ctx.save();
        ctx.globalCompositeOperation = "destination-out";
        roundRectPath(ctx, CARD_W / 2 - SLOT_W / 2, SLOT_TOP, SLOT_W, SLOT_H, SLOT_H / 2);
        ctx.fillStyle = "#000";
        ctx.fill();
        ctx.restore();
    };

    // =========================================================
    // GENERATE
    // =========================================================

    const renderSide = (drawFn) => {
        const canvas = document.createElement("canvas");
        canvas.width = CANVAS_W;
        canvas.height = CANVAS_H;

        const ctx = canvas.getContext("2d");
        ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);

        drawFn(ctx);

        return canvas.toDataURL("image/png");
    };

    const handleGenerate = async () => {
        if (!selectedUsers.length) return;

        setGenerating(true);
        setProgress({ done: 0, total: selectedUsers.length });
        setCards([]);

        try {
            if (!orgMarksRef.current) {
                // The signed-in organisation's own mark plus the three bundled
                // group marks — both, because one batch can mix a group
                // representative with ordinary employees.
                const [single, ...group] = await Promise.all([
                    loadImage(logoUrl),
                    ...GROUP_ORG_MARKS.map((org) => loadImage(org.logo)),
                ]);

                orgMarksRef.current = {
                    single: [{ img: single, label: orgName }],
                    group: GROUP_ORG_MARKS.map((org, index) => ({
                        img: group[index],
                        label: org.name,
                    })),
                };
            }

            const marksFor = (person) =>
                MULTI_ORG_USER_IDS.includes(Number(person.Id))
                    ? orgMarksRef.current.group
                    : orgMarksRef.current.single;

            const built = [];

            for (let i = 0; i < selectedUsers.length; i++) {
                const user = selectedUsers[i];

                const photo = await loadImage(
                    user.ImageUrl ? `${BASE_IMAGE_API_GET}${user.ImageUrl}` : null
                );

                built.push({
                    user,
                    front: renderSide((ctx) => drawFront(ctx, user, photo, marksFor(user))),
                    back: renderSide((ctx) => drawBack(ctx, user, marksFor(user))),
                });

                setProgress({ done: i + 1, total: selectedUsers.length });
            }

            setCards(built);

            // Stay open and show the finished cards here. The results also
            // render on the page, but when this component lives inside an
            // offcanvas that panel is now closed — so reviewing and
            // downloading has to be possible from the modal itself.
            setStep("review");
        } catch (error) {
            console.error("Failed to generate ID cards:", error);
            alert("Could not generate the ID cards.");
        } finally {
            setGenerating(false);
        }
    };

    // =========================================================
    // EXPORT
    // =========================================================

    const fileSafe = (value) =>
        String(value || "card")
            .trim()
            .replace(/[^a-z0-9]+/gi, "-")
            .replace(/(^-|-$)/g, "");

    const downloadDataUrl = (dataUrl, filename) => {
        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const downloadAllZip = async () => {
        if (!cards.length) return;

        setZipping(true);

        try {
            const zip = new JSZip();
            const folder = zip.folder("id-cards");

            cards.forEach(({ user, front, back }) => {
                const base = `${fileSafe(user.Name)}-${user.Id}`;
                folder.file(`${base}-front.png`, front.split(",")[1], { base64: true });
                folder.file(`${base}-back.png`, back.split(",")[1], { base64: true });
            });

            const blob = await zip.generateAsync({ type: "blob" });
            const url = URL.createObjectURL(blob);

            downloadDataUrl(url, `id-cards-${cards.length}-employees.zip`);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Failed to build the ZIP:", error);
            alert("Could not build the ZIP file.");
        } finally {
            setZipping(false);
        }
    };

    const openModal = async () => {
        // Wait for the panel to finish closing before showing the modal.
        // Opening both at once leaves two backdrops stacked, and Bootstrap's
        // hide cleanup resets the body scroll lock a few hundred ms later,
        // which would unlock scrolling behind the open modal.
        await closeBootstrapOffcanvas(closeOffcanvasId);

        setStep("select");
        setIsModalOpen(true);
        if (!usersData.length) fetchData();
    };

    const allVisibleSelected =
        visibleUsers.length > 0 && visibleUsers.every((u) => selectedIds.includes(u.Id));

    const selectAllVisible = () => {
        const ids = visibleUsers.map((u) => u.Id);
        setSelectedIds((prev) => [...new Set([...prev, ...ids])]);
    };

    const clearSelection = () => setSelectedIds([]);

    return (
        <>
            <div className={`eid-page ${embedded ? "embedded" : ""}`}>

                {/* ===================================================
                    TOOLBAR
                ==================================================== */}

                <div className="eid-toolbar no-print">
                    <div>
                        <h4>Employee ID Cards</h4>
                        <p>
                            {cards.length
                                ? `${cards.length} card${cards.length > 1 ? "s" : ""} ready — download or print below`
                                : "Select employees and generate print-ready ID cards"}
                        </p>
                    </div>

                    <div className="eid-toolbar-actions">
                        <button type="button" className="eid-btn-primary" onClick={openModal}>
                            <i className="fa-solid fa-id-badge"></i>
                            {cards.length ? "Choose Employees" : "Generate ID Cards"}
                        </button>

                        {cards.length > 0 && (
                            <>
                                <button
                                    type="button"
                                    className="eid-btn-primary"
                                    onClick={downloadAllZip}
                                    disabled={zipping}
                                >
                                    <i className="fa-solid fa-file-zipper"></i>
                                    {zipping ? "Preparing…" : "Download All (ZIP)"}
                                </button>

                                <button
                                    type="button"
                                    className="eid-btn-ghost"
                                    onClick={() => window.print()}
                                >
                                    <i className="fa-solid fa-print"></i>
                                    Print Sheet
                                </button>

                                <button
                                    type="button"
                                    className="eid-btn-ghost"
                                    onClick={() => setCards([])}
                                >
                                    Clear
                                </button>
                            </>
                        )}
                    </div>
                </div>


                {/* ===================================================
                    SELECTION MODAL
                ==================================================== */}

                <Modal
                    open={isModalOpen}
                    onCancel={() => !generating && setIsModalOpen(false)}
                    forceRender
                    centered
                    className="eid-modal"
                    width="min(760px, 94vw)"
                    title={
                        <div className="eid-head">
                            <div className="eid-head-badge">
                                <i className="fa-solid fa-id-badge"></i>
                            </div>

                            <div>
                                <div className="eid-head-title">
                                    {step === "review" ? "ID Cards Ready" : "Generate ID Cards"}
                                </div>
                                <div className="eid-head-sub">
                                    {step === "review"
                                        ? `${cards.length} card${cards.length === 1 ? "" : "s"} — download or print`
                                        : "Pick one employee, a department, or everyone"}
                                </div>
                            </div>
                        </div>
                    }
                    footer={
                        step === "review" ? (
                            <div className="eid-footer">
                                <span className="eid-footer-count">
                                    {cards.length} card{cards.length === 1 ? "" : "s"} generated
                                </span>

                                <div className="eid-footer-actions">
                                    <Button
                                        size="large"
                                        className="eid-btn-cancel"
                                        onClick={() => setStep("select")}
                                    >
                                        Back
                                    </Button>

                                    <Button
                                        size="large"
                                        className="eid-btn-cancel"
                                        onClick={() => window.print()}
                                    >
                                        Print Sheet
                                    </Button>

                                    <Button
                                        size="large"
                                        type="primary"
                                        className="eid-btn-generate"
                                        onClick={downloadAllZip}
                                        loading={zipping}
                                    >
                                        {zipping ? "Preparing…" : "Download All (ZIP)"}
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="eid-footer">
                                <span className="eid-footer-count">
                                    {selectedIds.length
                                        ? `${selectedIds.length} employee${selectedIds.length > 1 ? "s" : ""} selected`
                                        : "No employees selected"}
                                </span>

                                <div className="eid-footer-actions">
                                    <Button
                                        size="large"
                                        className="eid-btn-cancel"
                                        onClick={() => setIsModalOpen(false)}
                                        disabled={generating}
                                    >
                                        Cancel
                                    </Button>

                                    <Button
                                        size="large"
                                        type="primary"
                                        className="eid-btn-generate"
                                        onClick={handleGenerate}
                                        disabled={!selectedIds.length || generating}
                                        loading={generating}
                                    >
                                        {generating
                                            ? `Generating ${progress.done}/${progress.total}…`
                                            : `Generate ${selectedIds.length || ""} Card${selectedIds.length === 1 ? "" : "s"}`}
                                    </Button>
                                </div>
                            </div>
                        )
                    }
                >
                    {step === "review" ? (
                        <div className="eid-review">
                            {cards.map(({ user, front, back }) => (
                                <div className="eid-card-tile" key={user.Id}>
                                    <div className="eid-card-faces">
                                        <img src={front} alt={`${user.Name} — front`} />
                                        <img src={back} alt={`${user.Name} — back`} />
                                    </div>

                                    <div className="eid-card-foot">
                                        <span className="eid-card-name">{user.Name}</span>

                                        <span className="eid-card-links">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    downloadDataUrl(
                                                        front,
                                                        `${fileSafe(user.Name)}-${user.Id}-front.png`
                                                    )
                                                }
                                            >
                                                Front
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    downloadDataUrl(
                                                        back,
                                                        `${fileSafe(user.Name)}-${user.Id}-back.png`
                                                    )
                                                }
                                            >
                                                Back
                                            </button>
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : dataLoading ? (
                        <div className="eid-loading">
                            <Spin />
                            <span>Loading employees…</span>
                        </div>
                    ) : fetchError ? (
                        <div className="eid-loading">
                            <span className="eid-error">{fetchError}</span>
                            <Button onClick={fetchData}>Retry</Button>
                        </div>
                    ) : !usersData.length ? (
                        <Empty description="No employees found for this organization." />
                    ) : (
                        <>
                            <div className="eid-section">
                                <span className="eid-section-title">Filter</span>
                                <span className="eid-section-rule" />
                            </div>

                            <div className="eid-filter-row">
                                <Select
                                    size="large"
                                    allowClear
                                    placeholder="All departments"
                                    value={deptFilter}
                                    onChange={setDeptFilter}
                                    className="eid-dept-select"
                                    options={departments.map((d) => ({ label: d, value: d }))}
                                />

                                <Button
                                    size="large"
                                    onClick={selectAllVisible}
                                    disabled={allVisibleSelected}
                                >
                                    {deptFilter ? `Select all in ${deptFilter}` : "Select all"}
                                </Button>

                                <Button
                                    size="large"
                                    onClick={clearSelection}
                                    disabled={!selectedIds.length}
                                >
                                    Clear
                                </Button>
                            </div>

                            <div className="eid-section">
                                <span className="eid-section-title">Employees</span>
                                <span className="eid-section-rule" />
                            </div>

                            <Select
                                mode="multiple"
                                size="large"
                                className="eid-employee-select"
                                placeholder="Search and select employees…"
                                value={selectedIds}
                                onChange={setSelectedIds}
                                maxTagCount="responsive"
                                optionFilterProp="label"
                                options={visibleUsers.map((user) => ({
                                    value: user.Id,
                                    label: `${user.Name} · ${designationOf(user)} · ${user.DeptName || ""}`,
                                    user,
                                }))}
                                optionRender={(option) => {
                                    const user = option.data.user;
                                    return (
                                        <div className="eid-option">
                                            <span className="eid-option-avatar">
                                                {user.ImageUrl ? (
                                                    <img
                                                        src={`${BASE_IMAGE_API_GET}${user.ImageUrl}`}
                                                        alt=""
                                                        onError={(e) => {
                                                            e.currentTarget.style.display = "none";
                                                        }}
                                                    />
                                                ) : null}
                                            </span>

                                            <span className="eid-option-text">
                                                <span className="eid-option-name">{user.Name}</span>
                                                <span className="eid-option-meta">
                                                    {[designationOf(user), user.DeptName]
                                                        .filter(Boolean)
                                                        .join(" · ")}
                                                </span>
                                            </span>
                                        </div>
                                    );
                                }}
                            />

                            <p className="eid-hint">
                                Cards print at standard badge size (54 × 85.6 mm). The back
                                carries a scannable contact QR, date of birth, blood group,
                                emergency contact and the registered office.
                            </p>
                        </>
                    )}
                </Modal>


                {/* ===================================================
                    RESULTS
                ==================================================== */}

                {cards.length > 0 && (
                    <div className="eid-results">
                        {cards.map(({ user, front, back }) => (
                            <div className="eid-card-tile no-print" key={user.Id}>
                                <div className="eid-card-faces">
                                    <img src={front} alt={`${user.Name} — front`} />
                                    <img src={back} alt={`${user.Name} — back`} />
                                </div>

                                <div className="eid-card-foot">
                                    <span className="eid-card-name">{user.Name}</span>

                                    <span className="eid-card-links">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                downloadDataUrl(
                                                    front,
                                                    `${fileSafe(user.Name)}-${user.Id}-front.png`
                                                )
                                            }
                                        >
                                            Front
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                downloadDataUrl(
                                                    back,
                                                    `${fileSafe(user.Name)}-${user.Id}-back.png`
                                                )
                                            }
                                        >
                                            Back
                                        </button>
                                    </span>
                                </div>
                            </div>
                        ))}

                        {/* Print layout: real badge size, fronts then backs so a
                            duplex run lines up. Hidden on screen. */}
                        <div className="eid-print-sheet">
                            {cards.map(({ user, front }) => (
                                <img key={`p-f-${user.Id}`} src={front} alt="" />
                            ))}
                            {cards.map(({ user, back }) => (
                                <img key={`p-b-${user.Id}`} src={back} alt="" />
                            ))}
                        </div>
                    </div>
                )}

            </div>


            {/* =====================================================
                CSS
            ====================================================== */}

            <style>{`

                .eid-page {
                    font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
                }


                /* ===== EMBEDDED (inside an offcanvas / panel) ===== */

                .eid-page.embedded .eid-toolbar {
                    padding: 0;
                    border: none;
                    background: transparent;
                    box-shadow: none;
                }

                .eid-page.embedded .eid-toolbar h4,
                .eid-page.embedded .eid-toolbar p {
                    display: none;
                }

                .eid-page.embedded .eid-toolbar-actions {
                    width: 100%;
                }

                .eid-page.embedded .eid-toolbar-actions button {
                    flex: 1 1 auto;
                    justify-content: center;
                }


                /* ===== REVIEW GRID (inside the modal) ===== */

                .eid-review {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 16px;
                    justify-content: center;
                }

                .eid-review .eid-card-faces img {
                    width: 116px;
                }


                /* ===== TOOLBAR ===== */

                .eid-toolbar {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    flex-wrap: wrap;
                    gap: 16px;
                    padding: 20px 22px;
                    background: #ffffff;
                    border: 1px solid #e4eaf1;
                    border-radius: 16px;
                    box-shadow: 0 8px 30px rgba(22, 50, 80, 0.08);
                }

                .eid-toolbar h4 {
                    margin: 0 0 4px;
                    font-size: 19px;
                    font-weight: 700;
                    color: #173f69;
                }

                .eid-toolbar p {
                    margin: 0;
                    font-size: 13.5px;
                    color: #7a8795;
                }

                .eid-toolbar-actions {
                    display: flex;
                    gap: 10px;
                    flex-wrap: wrap;
                }

                .eid-btn-primary,
                .eid-btn-ghost {
                    display: inline-flex;
                    align-items: center;
                    gap: 9px;
                    height: 44px;
                    padding: 0 20px;
                    border-radius: 11px;
                    font-size: 13px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: filter 0.15s ease, transform 0.15s ease,
                        background-color 0.15s ease, border-color 0.15s ease;
                }

                .eid-btn-primary {
                    border: none;
                    color: #ffffff;
                    background: linear-gradient(135deg, #174f8c, #2a7ac0);
                    box-shadow: 0 10px 22px rgba(23, 79, 140, 0.28);
                }

                .eid-btn-primary:hover:not(:disabled) {
                    filter: brightness(1.07);
                    transform: translateY(-1px);
                }

                .eid-btn-primary:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                    box-shadow: none;
                }

                .eid-btn-ghost {
                    border: 1px solid #dfe6ef;
                    background: #ffffff;
                    color: #46566a;
                }

                .eid-btn-ghost:hover {
                    border-color: #b9cbe0;
                    color: #12263f;
                }


                /* ===== MODAL =====
                   Scoped under .eid-modal so none of this leaks into other
                   antd modals in the app. */

                .eid-modal .ant-modal-container,
                .eid-modal .ant-modal-content {
                    border-radius: 20px;
                    padding: 0;
                    overflow: hidden;
                    box-shadow: 0 30px 80px rgba(15, 33, 56, 0.28);
                }

                .eid-modal .ant-modal-header {
                    margin: 0;
                    padding: 22px 60px 22px 28px;
                    border-bottom: 1px solid #eef2f7;
                    background: linear-gradient(180deg, #fbfcfe 0%, #ffffff 100%);
                    border-radius: 0;
                }

                .eid-modal .ant-modal-body {
                    padding: 22px 28px;
                    max-height: 60vh;
                    overflow-y: auto;
                }

                .eid-modal .ant-modal-footer {
                    margin: 0;
                    padding: 16px 28px;
                    border-top: 1px solid #eef2f7;
                    background: #fbfcfe;
                }

                .eid-modal .ant-modal-close {
                    top: 24px;
                    inset-inline-end: 22px;
                    border-radius: 10px;
                    color: #97a4b3;
                }

                .eid-head {
                    display: flex;
                    align-items: center;
                    gap: 14px;
                }

                .eid-head-badge {
                    width: 44px;
                    height: 44px;
                    flex: none;
                    border-radius: 13px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: linear-gradient(135deg, #174f8c, #2a7ac0);
                    color: #ffffff;
                    font-size: 17px;
                    box-shadow: 0 8px 18px rgba(23, 79, 140, 0.32);
                }

                .eid-head-title {
                    font-size: 17px;
                    font-weight: 700;
                    color: #12263f;
                    line-height: 1.25;
                }

                .eid-head-sub {
                    margin-top: 2px;
                    font-size: 12.5px;
                    font-weight: 400;
                    color: #8190a0;
                }

                .eid-section {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin: 2px 0 14px;
                }

                .eid-section:not(:first-child) {
                    margin-top: 22px;
                }

                .eid-section-title {
                    font-size: 11px;
                    font-weight: 700;
                    letter-spacing: 0.09em;
                    text-transform: uppercase;
                    color: #9aa6b4;
                    white-space: nowrap;
                }

                .eid-section-rule {
                    flex: 1;
                    height: 1px;
                    background: linear-gradient(90deg, #e8eef5, rgba(232, 238, 245, 0));
                }

                .eid-filter-row {
                    display: flex;
                    gap: 10px;
                    flex-wrap: wrap;
                }

                .eid-dept-select {
                    flex: 1 1 220px;
                    min-width: 180px;
                }

                .eid-employee-select {
                    width: 100%;
                }

                .eid-modal .ant-select-selector {
                    border-radius: 11px !important;
                    border-color: #dfe6ef !important;
                    background: #fbfcfe !important;
                }

                .eid-modal .ant-select-focused .ant-select-selector {
                    border-color: #174f8c !important;
                    box-shadow: 0 0 0 3px rgba(23, 79, 140, 0.10) !important;
                    background: #ffffff !important;
                }

                .eid-option {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 2px 0;
                }

                .eid-option-avatar {
                    width: 30px;
                    height: 30px;
                    flex: none;
                    border-radius: 50%;
                    overflow: hidden;
                    background: #eef2f7;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .eid-option-avatar img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }

                .eid-option-text {
                    display: flex;
                    flex-direction: column;
                    line-height: 1.25;
                    min-width: 0;
                }

                .eid-option-name {
                    font-size: 13.5px;
                    font-weight: 600;
                    color: #12263f;
                }

                .eid-option-meta {
                    font-size: 11.5px;
                    color: #8190a0;
                }

                .eid-hint {
                    margin: 14px 0 0;
                    font-size: 12px;
                    color: #8190a0;
                }

                .eid-loading {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 12px;
                    padding: 40px 0;
                    color: #7a8795;
                    font-size: 13.5px;
                }

                .eid-error {
                    color: #c0392b;
                }

                .eid-footer {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 12px;
                    flex-wrap: wrap;
                }

                .eid-footer-count {
                    font-size: 12.5px;
                    font-weight: 600;
                    color: #7a8795;
                }

                .eid-footer-actions {
                    display: flex;
                    gap: 10px;
                }

                .eid-modal .eid-btn-cancel {
                    height: 44px;
                    padding: 0 20px;
                    border-radius: 11px;
                    font-weight: 600;
                    border-color: #dfe6ef;
                    color: #46566a;
                }

                .eid-modal .eid-btn-generate {
                    height: 44px;
                    padding: 0 22px;
                    border: none;
                    border-radius: 11px;
                    font-weight: 600;
                    background: linear-gradient(135deg, #174f8c, #2a7ac0);
                    box-shadow: 0 10px 22px rgba(23, 79, 140, 0.30);
                }


                /* ===== RESULTS ===== */

                .eid-results {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 18px;
                    margin-top: 24px;
                }

                .eid-card-tile {
                    background: #ffffff;
                    border: 1px solid #e4eaf1;
                    border-radius: 16px;
                    padding: 14px;
                    box-shadow: 0 8px 24px rgba(22, 50, 80, 0.07);
                }

                .eid-card-faces {
                    display: flex;
                    gap: 10px;
                }

                .eid-card-faces img {
                    width: 132px;
                    height: auto;
                    display: block;
                    border-radius: 10px;
                    background:
                        linear-gradient(45deg, #f1f4f8 25%, transparent 25%) -6px 0/12px 12px,
                        linear-gradient(-45deg, #f1f4f8 25%, transparent 25%) -6px 0/12px 12px,
                        linear-gradient(45deg, transparent 75%, #f1f4f8 75%) 0 0/12px 12px,
                        linear-gradient(-45deg, transparent 75%, #f1f4f8 75%) 0 0/12px 12px,
                        #ffffff;
                    box-shadow: 0 2px 10px rgba(15, 23, 42, 0.10);
                }

                .eid-card-foot {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 10px;
                    margin-top: 12px;
                }

                .eid-card-name {
                    font-size: 13px;
                    font-weight: 600;
                    color: #12263f;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .eid-card-links {
                    display: flex;
                    gap: 6px;
                    flex: none;
                }

                .eid-card-links button {
                    border: 1px solid #dfe6ef;
                    background: #ffffff;
                    color: #174f8c;
                    border-radius: 8px;
                    padding: 4px 10px;
                    font-size: 11.5px;
                    font-weight: 600;
                    cursor: pointer;
                }

                .eid-card-links button:hover {
                    border-color: #174f8c;
                    background: rgba(23, 79, 140, 0.06);
                }


                /* ===== PRINT =====
                   Cards print at true badge size so they can go straight onto
                   card stock; fronts first, then backs, for a duplex run. */

                .eid-print-sheet {
                    display: none;
                }

                @media print {

                    body * {
                        visibility: hidden;
                    }

                    .eid-print-sheet,
                    .eid-print-sheet * {
                        visibility: visible;
                    }

                    .eid-print-sheet {
                        display: flex;
                        flex-wrap: wrap;
                        gap: 6mm;
                        position: absolute;
                        inset: 0;
                        padding: 8mm;
                    }

                    .eid-print-sheet img {
                        width: 54mm;
                        height: 85.6mm;
                        page-break-inside: avoid;
                        break-inside: avoid;
                    }

                    .no-print {
                        display: none !important;
                    }

                    @page {
                        size: A4;
                        margin: 6mm;
                    }

                }

            `}</style>
        </>
    );
};

export default EmployeeIdCards;