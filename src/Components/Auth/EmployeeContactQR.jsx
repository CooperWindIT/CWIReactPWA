import React, { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Modal, Form, Input, Button, Row, Col } from "antd";
// Used only for the single-organization card, where the logo is whatever
// filename the signed-in user's own organization has stored against it.
import { BASE_IMAGE_API_GET } from "../Config/Config";

// The three group logos ship with the build rather than being fetched from
// the API. Two reasons that matters here: they're always the same three
// files, and — because the card is exported with canvas.toBlob — a logo
// served from another origin without CORS headers taints the canvas and
// makes the download fail outright. A bundled image is same-origin, so it
// can never do that.
//
// Paths are relative to Components/Auth/, where this file lives.
import cwiLogo from "../Assests/Images/cwilogo.png";
import andisoLogo from "../Assests/Images/andisologo.png";
import svintechLogo from "../Assests/Images/svintechlogo.png";

// npm install qrcode antd
//
// A print-ready employee contact card: a tall, solid-color card with the
// organization's logo, the employee's name set large, a short personal
// line, and a big QR that saves the full contact (vCard) straight to a
// phone. The admin types the details into a modal and the finished card
// downloads as a PNG.
//
// Drawn on a canvas rather than composed in HTML, so the whole card
// exports as a single high-resolution image (1080x1620px, ~3x) instead of
// needing a screenshot library.

const FONT = "'Poppins', 'Segoe UI', Arial, sans-serif";

// Portrait card, 2:3 — the proportions of the reference design.
const SCALE = 3;
const LOGICAL_W = 360;
const LOGICAL_H = 540;
const CANVAS_W = LOGICAL_W * SCALE;
const CANVAS_H = LOGICAL_H * SCALE;

const PAD_X = 34;
const CARD_RADIUS = 18;

const COLOR_PRESETS = [
    "#C62231", // the reference red
    "#174F8C", // Cooperwind blue
    "#0F766E",
    "#7C3AED",
    "#B45309",
    "#1F2937",
];
const DEFAULT_COLOR = "#C62231";

const DEFAULT_TAGLINE = "I'd like to connect — scan and save my contact details.";
// const DEFAULT_CAPTION = "Scan to save contact";

// White modules straight on the card color (matches the reference), or
// dark modules inside a white panel (maximum scanner compatibility).
const QR_STYLE_LIGHT = "light";
const QR_STYLE_PANEL = "panel";

// Everyone generates cards branded with their own organization — except the
// users listed here, who represent all three companies. Their card carries
// all three logos and all three company names go into the saved contact.
// Add or remove user Ids here to change who gets the group card.
const SUPER_ADMIN_USER_IDS = [2, 10];

// The three companies the group card represents. `logo` is the imported
// image itself (already a usable URL after the bundler processes it), and
// `name` is what gets written into the vCard's ORG field — so it should be
// the name you want showing up in someone's phone contacts.
const SUPER_ADMIN_ORGS = [
    {
        key: "cooperwind",
        label: "Cooperwind",
        name: "Cooperwind India Private Limited",
        logo: cwiLogo,
    },
    {
        key: "andiso",
        label: "Andiso",
        name: "Andiso",
        logo: andisoLogo,
    },
    {
        key: "svintech",
        label: "SVIN Tech",
        name: "SVIN Tech",
        logo: svintechLogo,
    },
];


// Phone numbers come out of the session/form the way people type them —
// "8939894969", "08939894969", "044 2345 6789", sometimes already with a
// country code. A vCard TEL without a country code saves to the phone as a
// local number, which then fails to dial from abroad or from a roaming SIM.
// This normalises to India's E.164 form (+91…) while leaving a number that
// already carries a "+" alone, so an overseas contact isn't rewritten as
// Indian.
function toIndianE164(raw) {
    const value = String(raw || "").trim();
    if (!value) return "";

    // Already international — keep the country code the user gave.
    if (value.startsWith("+")) return value.replace(/[^\d+]/g, "");

    const digits = value.replace(/\D/g, "");
    if (!digits) return "";

    // "91 89398 94969" — country code typed without the plus.
    if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;

    // "08939894969" / "044 2345 6789" — the trunk prefix drops in E.164.
    if (digits.length > 10 && digits.startsWith("0")) return `+91${digits.slice(1)}`;

    if (digits.length === 10) return `+91${digits}`;

    return `+91${digits}`;
}

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

function drawLetterSpacedText(ctx, text, x, y, spacing) {
    let cursor = x;
    [...text].forEach((ch) => {
        ctx.fillText(ch, cursor, y);
        cursor += ctx.measureText(ch).width + spacing;
    });
}

// measureText ignores the manual letter-spacing we add between glyphs, so
// measure it the same way we draw it.
function letterSpacedWidth(ctx, text, spacing) {
    const glyphs = [...text];
    return (
        glyphs.reduce((sum, ch) => sum + ctx.measureText(ch).width, 0) +
        spacing * Math.max(0, glyphs.length - 1)
    );
}

// Greedy word wrap, capped at maxLines.
function wrapText(ctx, text, maxWidth, maxLines) {
    const words = String(text).split(/\s+/);
    const lines = [];
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
    return lines.slice(0, maxLines);
}

// Shrinks the font until every line fits the available width — so a long
// name doesn't run off the edge of the card.
function fitFontSize(ctx, lines, maxWidth, startSize, minSize, weight) {
    let size = startSize;
    while (size > minSize) {
        ctx.font = `${weight} ${size}px ${FONT}`;
        if (lines.every((line) => ctx.measureText(line).width <= maxWidth)) break;
        size -= 1;
    }
    return size;
}

// Closes the Bootstrap offcanvas with the given id and resolves once it has
// finished sliding away — so the modal opens into a clean screen instead of
// fighting the panel over the backdrop and the body scroll lock.
//
// Works whether Bootstrap is exposed on window or imported as a module: it
// uses the real API when it can reach it, and otherwise triggers Bootstrap's
// own delegated [data-bs-dismiss] handler, which is active either way (it
// has to be — the same handlers are what open the panel in the first place).
function closeBootstrapOffcanvas(offcanvasId) {
    return new Promise((resolve) => {
        const el = offcanvasId ? document.getElementById(offcanvasId) : null;

        // Nothing to close: not inside an offcanvas, or it's already shut.
        if (!el || !el.classList.contains("show")) {
            resolve();
            return;
        }

        // Never leave the modal hanging if the event never arrives.
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

const EmployeeContactQR = ({
    orgName: orgNameProp,
    logoUrl: logoUrlProp,
    // Id of the Bootstrap offcanvas this is rendered inside, if any. Given
    // one, the panel is closed before the modal opens.
    closeOffcanvasId,
    // Strips the standalone-page chrome (full-height gradient, card
    // wrapper, heading) so the component sits naturally inside a panel.
    embedded = false,
}) => {
    // =========================================================
    // STATE
    // =========================================================

    const [employee, setEmployee] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [cardColor, setCardColor] = useState(DEFAULT_COLOR);
    const [qrStyle, setQrStyle] = useState(QR_STYLE_LIGHT);
    const [generating, setGenerating] = useState(false);
    const [sessionUserData, setSessionUserData] = useState({});

    const [form] = Form.useForm();

    const canvasRef = useRef(null);
    const logoImgsRef = useRef([]); // one entry per organization (null where the logo is missing)
    const logoCacheKeyRef = useRef(null);
    const qrModulesRef = useRef(null); // cached QR matrix, reused on colour-only redraws
    const pendingDownloadRef = useRef(false);

    useEffect(() => {
        const userDataString = sessionStorage.getItem("userData");
        if (userDataString) {
            setSessionUserData(JSON.parse(userDataString));
        }
    }, []);

    // The super admin represents all three companies, so their card carries
    // all three logos and all three names go into the saved contact.
    // Everyone else gets the single organization from their own session.
    // Nobody picks anything — this is decided purely by who is signed in.
    const isSuperAdmin = SUPER_ADMIN_USER_IDS.includes(Number(sessionUserData?.Id));

    // NOTE: the session record carries two similarly-named image fields —
    // ImageUrl (lower-case "rl") is the ORGANISATION logo, while ImageURL
    // (upper-case) is the signed-in user's own photo. Only the former
    // belongs on the card; falling back to the latter would stamp someone's
    // headshot on it as if it were the company mark.
    const sessionOrgName =
        orgNameProp ?? sessionUserData?.OrgName ?? "Cooperwind India Private Limited";

    const sessionLogoUrl =
        logoUrlProp ??
        (sessionUserData?.ImageUrl
            ? `${BASE_IMAGE_API_GET}${sessionUserData.ImageUrl}`
            : null);

    const orgs = isSuperAdmin
        ? SUPER_ADMIN_ORGS.map((org) => ({
              name: org.name,
              label: org.label,
              // Bundled import — already a URL, nothing to prefix.
              logoUrl: org.logo || null,
          }))
        : [{ name: sessionOrgName, label: sessionOrgName, logoUrl: sessionLogoUrl }];

    // What goes into the vCard's company field. For the super admin that's
    // all three names in one line, so a phone that scans the code shows
    // every company the contact belongs to. They're joined with " | "
    // rather than ";" because a semicolon inside ORG is the separator for
    // organizational *units* (Company;Division;Team) — using it here would
    // make Andiso and SVIN Tech look like departments of Cooperwind.
    const orgLine = orgs.map((org) => org.name).join(" | ");

    // =========================================================
    // VCARD
    // =========================================================

    const escapeVCardValue = (value = "") => {
        return String(value)
            .replace(/\\/g, "\\\\")
            .replace(/\n/g, "\\n")
            .replace(/;/g, "\\;")
            .replace(/,/g, "\\,");
    };

    const generateVCard = (person) => {
        if (!person) return "";

        const fullName = `${person.firstName} ${person.lastName}`.trim();

        const lines = [
            "BEGIN:VCARD",
            "VERSION:3.0",
            `N:${escapeVCardValue(person.lastName)};${escapeVCardValue(
                person.firstName
            )};;;`,
            `FN:${escapeVCardValue(fullName)}`,
            `ORG:${escapeVCardValue(orgLine)}`,
        ];

        if (person.designation) {
            lines.push(`TITLE:${escapeVCardValue(person.designation)}`);
        }

        // With more than one company, also spell them out on their own
        // lines in the note — the company field gets truncated in a lot of
        // contact apps, and this way all three stay readable.
        if (orgs.length > 1) {
            lines.push(
                `NOTE:${escapeVCardValue(orgs.map((org) => org.name).join("\n"))}`
            );
        }

        // Written with the +91 country code already attached, so the saved
        // contact dials correctly from any network.
        const tel = toIndianE164(person.phone);
        if (tel) {
            lines.push(`TEL;TYPE=CELL,VOICE:${escapeVCardValue(tel)}`);
        }

        if (person.email) {
            lines.push(`EMAIL;TYPE=WORK:${escapeVCardValue(person.email)}`);
        }

        if (person.website) {
            lines.push(`URL:${escapeVCardValue(person.website)}`);
        }

        if (person.address) {
            lines.push(`ADR;TYPE=WORK:;;${escapeVCardValue(person.address)};;;;`);
        }

        lines.push("END:VCARD");

        return lines.join("\r\n");
    };

    // =========================================================
    // LOGO
    // =========================================================

    // Resolves null per logo rather than rejecting — a missing or
    // CORS-blocked logo just falls back to that company's name in text,
    // instead of breaking the whole card.
    const loadLogo = (url) =>
        new Promise((resolve) => {
            if (!url) {
                resolve(null);
                return;
            }

            const img = new Image();
            img.crossOrigin = "anonymous"; // so the finished card can still be exported

            img.onload = () => resolve(img);

            img.onerror = () => {
                console.warn(
                    "Organization logo failed to load (missing, or served without CORS headers). Falling back to its name in text:",
                    url
                );
                resolve(null);
            };

            img.src = url;
        });

    // Loads every organization's logo in parallel and caches the result, so
    // colour/style repaints don't refetch them.
    const preloadLogos = async () => {
        const cacheKey = orgs.map((org) => org.logoUrl || "-").join("|");

        if (logoCacheKeyRef.current === cacheKey && logoImgsRef.current.length) {
            return logoImgsRef.current;
        }

        const images = await Promise.all(orgs.map((org) => loadLogo(org.logoUrl)));

        logoImgsRef.current = images;
        logoCacheKeyRef.current = cacheKey;
        return images;
    };

    // =========================================================
    // DRAW THE CARD
    // =========================================================

    const drawCard = (modules, color, person, style) => {
        const canvas = canvasRef.current;
        if (!canvas || !person || !modules) return;

        canvas.width = CANVAS_W;
        canvas.height = CANVAS_H;

        const ctx = canvas.getContext("2d");
        ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0); // work in logical 360x540 units

        // ---- Card background ----
        roundRectPath(ctx, 0, 0, LOGICAL_W, LOGICAL_H, CARD_RADIUS);
        ctx.fillStyle = color;
        ctx.fill();

        ctx.save();
        roundRectPath(ctx, 0, 0, LOGICAL_W, LOGICAL_H, CARD_RADIUS);
        ctx.clip();

        const maxTextW = LOGICAL_W - PAD_X * 2;

        // ---- Organization logo(s) ----
        // Always on a white panel: client logos are usually dark or
        // full-colour and would disappear painted straight onto a saturated
        // card. The super admin's card carries all three companies side by
        // side in one panel; everyone else gets a single mark.
        const images = logoImgsRef.current;
        const multiOrg = orgs.length > 1;

        if (multiOrg) {
            const panelY = 28;
            const panelH = 44;

            roundRectPath(ctx, PAD_X, panelY, maxTextW, panelH, 12);
            ctx.fillStyle = "#ffffff";
            ctx.fill();

            const slotW = maxTextW / orgs.length;

            orgs.forEach((org, i) => {
                const slotCX = PAD_X + slotW * i + slotW / 2;
                const img = images[i];
                const innerW = slotW - 14;

                if (img && img.naturalWidth) {
                    const maxH = 24;
                    let drawW = (img.naturalWidth / img.naturalHeight) * maxH;
                    let drawH = maxH;

                    if (drawW > innerW) {
                        drawW = innerW;
                        drawH = (img.naturalHeight / img.naturalWidth) * innerW;
                    }

                    ctx.drawImage(
                        img,
                        slotCX - drawW / 2,
                        panelY + (panelH - drawH) / 2,
                        drawW,
                        drawH
                    );
                } else {
                    // No logo file for this company yet — set its name in
                    // the slot instead, shrunk to fit.
                    const label = (org.label || org.name).toUpperCase();

                    let size = 11;
                    while (size > 6) {
                        ctx.font = `800 ${size}px ${FONT}`;
                        if (ctx.measureText(label).width <= innerW) break;
                        size -= 0.5;
                    }

                    ctx.font = `800 ${size}px ${FONT}`;
                    ctx.fillStyle = "#12263f";
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    ctx.fillText(label, slotCX, panelY + panelH / 2);
                    ctx.textAlign = "left";
                    ctx.textBaseline = "alphabetic";
                }

                // Hairline between companies
                if (i < orgs.length - 1) {
                    const dividerX = PAD_X + slotW * (i + 1);
                    ctx.strokeStyle = "rgba(15,23,42,0.12)";
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(dividerX, panelY + 9);
                    ctx.lineTo(dividerX, panelY + panelH - 9);
                    ctx.stroke();
                }
            });
        } else {
            const logo = images[0];

            if (logo && logo.naturalWidth) {
                const maxH = 30;
                const maxW = 140;
                const panelPad = 9;

                let drawW = (logo.naturalWidth / logo.naturalHeight) * maxH;
                let drawH = maxH;

                if (drawW > maxW) {
                    drawW = maxW;
                    drawH = (logo.naturalHeight / logo.naturalWidth) * maxW;
                }

                roundRectPath(
                    ctx,
                    PAD_X,
                    30,
                    drawW + panelPad * 2,
                    drawH + panelPad * 2,
                    10
                );
                ctx.fillStyle = "#ffffff";
                ctx.fill();

                ctx.drawImage(logo, PAD_X + panelPad, 30 + panelPad, drawW, drawH);
            } else {
                // No logo to draw, so set the org name as a wordmark instead —
                // shrunk until it fits inside the card's margins, since names
                // like "Cooperwind India Private Limited" would otherwise run
                // straight off the right edge.
                const wordmark = orgs[0].name.toUpperCase();
                const spacing = 1.4;

                let markSize = 15;
                while (markSize > 8) {
                    ctx.font = `800 ${markSize}px ${FONT}`;
                    if (letterSpacedWidth(ctx, wordmark, spacing) <= maxTextW) break;
                    markSize -= 0.5;
                }

                ctx.font = `800 ${markSize}px ${FONT}`;
                ctx.fillStyle = "rgba(255,255,255,0.92)";
                ctx.textAlign = "left";
                ctx.textBaseline = "alphabetic";
                drawLetterSpacedText(ctx, wordmark, PAD_X, 52, spacing);
            }
        }

        // ---- Name ----
        // Kept on one line: stacking first and last reads awkwardly, and
        // looks worst exactly where it's most common — a short surname
        // stranded on its own line ("Soundariya" / "V"). Only a name too
        // long to stay readable on one line gets stacked, so it can never
        // shrink to nothing or run off the edge.
        ctx.textAlign = "left";
        ctx.textBaseline = "alphabetic";

        const SINGLE_LINE_MIN = 19;
        const fullNameLine = [person.firstName, person.lastName]
            .filter(Boolean)
            .join(" ");

        let nameLines = [fullNameLine];
        let nameSize = fitFontSize(ctx, nameLines, maxTextW, 28, SINGLE_LINE_MIN, "800");

        // fitFontSize stops at its floor whether or not the text actually
        // fits, so check — if even the floor is too wide, stack instead.
        ctx.font = `800 ${nameSize}px ${FONT}`;
        if (ctx.measureText(fullNameLine).width > maxTextW) {
            nameLines = [person.firstName, person.lastName].filter(Boolean);
            nameSize = fitFontSize(ctx, nameLines, maxTextW, 28, 15, "800");
        }

        ctx.font = `800 ${nameSize}px ${FONT}`;
        ctx.fillStyle = "#ffffff";

        const nameLineHeight = nameSize * 1.05;
        const nameTop = 140;

        nameLines.forEach((line, i) => {
            ctx.fillText(line, PAD_X, nameTop + i * nameLineHeight);
        });

        let blockBottom = nameTop + (nameLines.length - 1) * nameLineHeight;

        // ---- Tagline ----
        if (person.tagline) {
            ctx.font = `400 14.5px ${FONT}`;
            ctx.fillStyle = "rgba(255,255,255,0.88)";

            const taglineLines = wrapText(ctx, person.tagline, maxTextW, 3);
            const taglineTop = blockBottom + 26;

            taglineLines.forEach((line, i) => {
                ctx.fillText(line, PAD_X, taglineTop + i * 19);
            });

            blockBottom = taglineTop + (taglineLines.length - 1) * 19;
        }

        // ---- QR ----
        // Position flows from the text above (so a long name/tagline can
        // never overlap it) but is clamped so the card keeps the
        // reference's proportions for typical content.
        const captionY = LOGICAL_H - 44;
        const qrMaxBottom = captionY - 28;
        const qrTop = Math.max(blockBottom + 30, 256);
        const qrBox = Math.min(200, qrMaxBottom - qrTop);

        // Modules are painted as rectangles on exact device-pixel
        // boundaries rather than scaling a QR bitmap into place. Scaling a
        // bitmap by a non-integer factor leaves some modules a pixel wider
        // than others, which is enough to make readers fail on a code this
        // dense — so each module gets a whole number of pixels and the grid
        // stays perfectly regular.
        const moduleCount = modules.size;
        const boxDevice = Math.floor(qrBox * SCALE);
        const modulePx = Math.max(1, Math.floor(boxDevice / moduleCount));
        const drawnDevice = modulePx * moduleCount;
        const drawnLogical = drawnDevice / SCALE;
        const qrX = (LOGICAL_W - drawnLogical) / 2;

        if (style === QR_STYLE_PANEL) {
            const panelPad = 16;
            roundRectPath(
                ctx,
                qrX - panelPad,
                qrTop - panelPad,
                drawnLogical + panelPad * 2,
                drawnLogical + panelPad * 2,
                14
            );
            ctx.fillStyle = "#ffffff";
            ctx.fill();
        }

        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0); // paint the grid in raw device pixels

        const originX = Math.round(qrX * SCALE);
        const originY = Math.round(qrTop * SCALE);

        ctx.fillStyle = style === QR_STYLE_PANEL ? "#111827" : "#ffffff";

        for (let row = 0; row < moduleCount; row++) {
            for (let col = 0; col < moduleCount; col++) {
                if (modules.data[row * moduleCount + col]) {
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

        // ---- Caption ----
        if (person.caption) {
            ctx.font = `500 13.5px ${FONT}`;
            ctx.fillStyle = "rgba(255,255,255,0.92)";
            ctx.textAlign = "center";
            ctx.fillText(person.caption, LOGICAL_W / 2, captionY);
        }

        ctx.restore();
    };

    // =========================================================
    // GENERATE + DOWNLOAD
    // =========================================================

    const downloadCard = (person) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        try {
            canvas.toBlob((blob) => {
                if (!blob) {
                    alert(
                        "Couldn't export the card. This can happen if your organization's logo is served without CORS headers."
                    );
                    return;
                }

                const blobUrl = URL.createObjectURL(blob);
                const link = document.createElement("a");

                link.href = blobUrl;
                link.download = `${person.firstName}_${person.lastName}_Contact_QR.png`;

                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                URL.revokeObjectURL(blobUrl);
            }, "image/png");
        } catch (error) {
            console.error("Download failed (likely a cross-origin logo tainting the canvas):", error);
            alert(
                "Couldn't export the card. This can happen if your organization's logo is served without CORS headers."
            );
        }
    };

    // Builds the QR matrix + logo and paints the card whenever the
    // employee changes.
    useEffect(() => {
        if (!employee) return;

        let cancelled = false;
        setGenerating(true);

        (async () => {
            try {
                // "M" (15% recovery), not "H" — a full vCard is a long
                // payload, and "H" pushes this to an 89x89 grid whose modules
                // get too fine to scan reliably at card size. "M" carries the
                // same data in ~65x65, making every module ~40% larger in
                // print.
                const qr = QRCode.create(generateVCard(employee), {
                    errorCorrectionLevel: "M",
                });

                await preloadLogos();

                if (cancelled) return;

                qrModulesRef.current = qr.modules;
                drawCard(qr.modules, cardColor, employee, qrStyle);

                if (pendingDownloadRef.current) {
                    pendingDownloadRef.current = false;
                    downloadCard(employee);
                }
            } catch (error) {
                console.error("Failed to generate the contact QR card:", error);
                alert("Could not generate the QR card.");
            } finally {
                if (!cancelled) setGenerating(false);
            }
        })();

        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [employee]);

    // Colour and QR-style changes don't need a new QR or another logo
    // fetch — just repaint from the cached matrix.
    useEffect(() => {
        if (!employee || !qrModulesRef.current) return;
        drawCard(qrModulesRef.current, cardColor, employee, qrStyle);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cardColor, qrStyle]);

    // Everything the signed-in user's session already knows, so the form
    // opens filled in rather than blank. All of it stays editable — this is
    // a starting point, not a lock.
    //
    // ASSUMPTION: session carries one combined `Name` ("Soundariya V"), so
    // it's split on the first space into first/last. RoleName is used as the
    // designation since the session has no separate job-title field, and
    // Mobile is the phone. Website and address aren't on the session record
    // at all, so they're left for the user to fill in.
    const sessionDefaults = () => {
        const fullName = (sessionUserData?.Name || "").trim();
        const [firstName, ...rest] = fullName ? fullName.split(/\s+/) : [""];

        return {
            firstName: firstName || "",
            lastName: rest.join(" "),
            designation: sessionUserData?.RoleName || "",
            department: sessionUserData?.DeptName || "",
            phone: sessionUserData?.Mobile || "",
            email: sessionUserData?.Email || "",
            website: "",
            address: "",
            tagline: DEFAULT_TAGLINE,
            // caption: DEFAULT_CAPTION,
        };
    };

    const openGenerateModal = async () => {
        // Wait for the panel to finish closing before showing the modal.
        // Opening both at once leaves two backdrops stacked, and Bootstrap's
        // hide cleanup resets the body scroll lock a few hundred ms later —
        // which would unlock scrolling behind the open modal.
        await closeBootstrapOffcanvas(closeOffcanvasId);

        if (employee) {
            form.setFieldsValue(employee);
        } else {
            form.resetFields();
            form.setFieldsValue(sessionDefaults());
        }

        setIsModalOpen(true);
    };

    const closeGenerateModal = () => {
        setIsModalOpen(false);
    };

    const handleGenerateAndDownload = async () => {
        try {
            const values = await form.validateFields();

            const trimmed = (value) => (value ? String(value).trim() : "");

            const newEmployee = {
                firstName: trimmed(values.firstName),
                lastName: trimmed(values.lastName),
                designation: trimmed(values.designation),
                department: trimmed(values.department),
                phone: trimmed(values.phone),
                email: trimmed(values.email),
                website: trimmed(values.website),
                address: trimmed(values.address),
                tagline: trimmed(values.tagline),
                // caption: trimmed(values.caption) || DEFAULT_CAPTION,
            };

            pendingDownloadRef.current = true;
            setEmployee(newEmployee);
            setIsModalOpen(false);
        } catch (error) {
            // Field errors are already shown inline by the form.
        }
    };

    const copyVCard = async () => {
        try {
            await navigator.clipboard.writeText(generateVCard(employee));
            alert("vCard data copied successfully.");
        } catch (error) {
            console.error(error);
            alert("Unable to copy vCard data.");
        }
    };

    const printCard = () => {
        window.print();
    };

    return (
        <>
            <div className={`employee-qr-page ${embedded ? "embedded" : ""}`}>

                {/* ===================================================
                    ADMIN CONTROLS
                ==================================================== */}

                <div className="controls-card no-print">

                    <div className="controls-header">
                        <h4>Employee Contact QR</h4>
                        <p>Generate a branded contact card an employee can share</p>
                    </div>

                    <div className="control-row">

                        <div className="control-field">
                            {!employee && (
                                <p className="control-empty-hint">
                                    No card generated yet. Click "Generate QR Code" to enter
                                    an employee's details.
                                </p>
                            )}
                        </div>

                        <div className="control-actions">

                            <button
                                type="button"
                                className="btn-primary"
                                onClick={openGenerateModal}
                            >
                                Generate QR Code
                            </button>

                            {employee && (
                                <>
                                    <button
                                        type="button"
                                        className="btn-primary"
                                        onClick={() => downloadCard(employee)}
                                        disabled={generating}
                                    >
                                        ↓ Download Card
                                    </button>

                                    <button
                                        type="button"
                                        className="btn-secondary"
                                        onClick={printCard}
                                    >
                                        🖨 Print Card
                                    </button>
                                </>
                            )}

                        </div>

                    </div>

                    {/* Live colour swap — repaints instantly, no regeneration */}
                    {employee && (
                        <div className="color-row">
                            <span className="color-label">Card Colour</span>

                            <div className="swatches">
                                {COLOR_PRESETS.map((preset) => (
                                    <button
                                        key={preset}
                                        type="button"
                                        className={`swatch ${cardColor === preset ? "active" : ""}`}
                                        style={{ background: preset }}
                                        aria-label={`Use ${preset}`}
                                        onClick={() => setCardColor(preset)}
                                    />
                                ))}

                                <label
                                    className={`swatch swatch-custom ${
                                        COLOR_PRESETS.includes(cardColor) ? "" : "active"
                                    }`}
                                    style={
                                        !COLOR_PRESETS.includes(cardColor)
                                            ? { background: cardColor }
                                            : {}
                                    }
                                    title="Custom colour"
                                >
                                    <input
                                        type="color"
                                        value={cardColor}
                                        onChange={(e) => setCardColor(e.target.value)}
                                    />
                                </label>
                            </div>
                        </div>
                    )}
                </div>


                {/* ===================================================
                    MODAL — DETAILS ENTRY
                ==================================================== */}

                <Modal
                    open={isModalOpen}
                    onCancel={closeGenerateModal}
                    forceRender
                    centered
                    className="ecq-modal"
                    // Wide enough for two columns on a desktop, and never
                    // wider than the viewport on a phone.
                    width="min(840px, 94vw)"
                    title={
                        <div className="ecq-head">
                            <div className="ecq-head-badge">
                                <i className="fa-solid fa-address-card"></i>
                            </div>

                            <div>
                                <div className="ecq-head-title">Employee Contact Details</div>
                                <div className="ecq-head-sub">
                                    These details are encoded into the QR and printed on the card
                                </div>
                            </div>
                        </div>
                    }
                    footer={
                        <div className="ecq-footer">
                            <Button
                                size="large"
                                className="ecq-btn-ghost"
                                onClick={closeGenerateModal}
                            >
                                Cancel
                            </Button>

                            <Button
                                size="large"
                                type="primary"
                                className="ecq-btn-primary"
                                onClick={handleGenerateAndDownload}
                            >
                                <i className="fa-solid fa-download"></i>
                                Download QR Card
                            </Button>
                        </div>
                    }
                >
                    <Form form={form} layout="vertical" size="large" requiredMark>

                        {/* ---- Employee ---- */}
                        <div className="ecq-section">
                            <span className="ecq-section-title">Employee</span>
                            <span className="ecq-section-rule" />
                        </div>

                        <Row gutter={[18, 0]}>
                            <Col xs={24} md={12}>
                                <Form.Item
                                    label="First Name"
                                    name="firstName"
                                    rules={[{ required: true, message: "First name is required." }]}
                                >
                                    <Input placeholder="e.g. Sam" />
                                </Form.Item>
                            </Col>

                            <Col xs={24} md={12}>
                                <Form.Item
                                    label="Last Name"
                                    name="lastName"
                                    rules={[{ required: true, message: "Last name is required." }]}
                                >
                                    <Input placeholder="e.g. Williams" />
                                </Form.Item>
                            </Col>

                            <Col xs={24} md={12}>
                                <Form.Item
                                    label="Designation"
                                    name="designation"
                                    rules={[{ required: true, message: "Designation is required." }]}
                                >
                                    <Input placeholder="e.g. Vice President - Operations" />
                                </Form.Item>
                            </Col>

                            <Col xs={24} md={12}>
                                <Form.Item label="Department" name="department">
                                    <Input placeholder="e.g. Operations" />
                                </Form.Item>
                            </Col>
                        </Row>

                        {/* ---- Contact ---- */}
                        <div className="ecq-section">
                            <span className="ecq-section-title">Contact</span>
                            <span className="ecq-section-rule" />
                        </div>

                        <Row gutter={[18, 0]}>
                            <Col xs={24} md={12}>
                                <Form.Item
                                    label="Phone"
                                    name="phone"
                                    rules={[{ required: true, message: "Phone number is required." }]}
                                >
                                    <Input placeholder="e.g. +91 9876543210" />
                                </Form.Item>
                            </Col>

                            <Col xs={24} md={12}>
                                <Form.Item
                                    label="Email"
                                    name="email"
                                    rules={[
                                        { required: true, message: "Email is required." },
                                        { type: "email", message: "Enter a valid email address." },
                                    ]}
                                >
                                    <Input placeholder="e.g. sam@cooperwind.in" />
                                </Form.Item>
                            </Col>

                            <Col xs={24} md={12}>
                                <Form.Item
                                    label="Website"
                                    name="website"
                                    rules={[{ type: "url", message: "Enter a valid URL." }]}
                                >
                                    <Input placeholder="e.g. https://cooperwind.in" />
                                </Form.Item>
                            </Col>

                            <Col xs={24} md={12}>
                                {/* Not required: the session record has no
                                    address, so demanding one would block the
                                    otherwise pre-filled one-click flow. */}
                                <Form.Item label="Address" name="address">
                                    <Input placeholder="e.g. Hyderabad, Telangana, India" />
                                </Form.Item>
                            </Col>
                        </Row>

                        {/* ---- What appears on the card ---- */}
                        <div className="ecq-section">
                            <span className="ecq-section-title">On the card</span>
                            <span className="ecq-section-rule" />
                        </div>

                        <Row gutter={[18, 0]}>
                            <Col xs={24}>
                                <Form.Item label="Tagline" name="tagline">
                                    <Input.TextArea
                                        rows={2}
                                        maxLength={130}
                                        showCount
                                        placeholder="A short line under the name"
                                    />
                                </Form.Item>
                            </Col>

                            {/* <Col xs={24} md={12}>
                                <Form.Item label="Caption under the QR" name="caption">
                                    <Input placeholder={DEFAULT_CAPTION} />
                                </Form.Item>
                            </Col> */}

                            <Col xs={24} md={12}>
                                <Form.Item label="QR Style">
                                    <div className="qr-style-row">
                                        <button
                                            type="button"
                                            className={`qr-style-btn ${qrStyle === QR_STYLE_LIGHT ? "active" : ""}`}
                                            onClick={() => setQrStyle(QR_STYLE_LIGHT)}
                                        >
                                            White on colour
                                        </button>

                                        <button
                                            type="button"
                                            className={`qr-style-btn ${qrStyle === QR_STYLE_PANEL ? "active" : ""}`}
                                            onClick={() => setQrStyle(QR_STYLE_PANEL)}
                                        >
                                            White panel
                                        </button>
                                    </div>
                                </Form.Item>
                            </Col>

                            <Col xs={24}>
                                <Form.Item label="Card Colour">
                                    <div className="swatches">
                                        {COLOR_PRESETS.map((preset) => (
                                            <button
                                                key={preset}
                                                type="button"
                                                className={`swatch ${cardColor === preset ? "active" : ""}`}
                                                style={{ background: preset }}
                                                aria-label={`Use ${preset}`}
                                                onClick={() => setCardColor(preset)}
                                            />
                                        ))}

                                        <label
                                            className={`swatch swatch-custom ${
                                                COLOR_PRESETS.includes(cardColor) ? "" : "active"
                                            }`}
                                            style={
                                                !COLOR_PRESETS.includes(cardColor)
                                                    ? { background: cardColor }
                                                    : {}
                                            }
                                            title="Custom colour"
                                        >
                                            <input
                                                type="color"
                                                value={cardColor}
                                                onChange={(e) => setCardColor(e.target.value)}
                                            />
                                        </label>
                                    </div>
                                </Form.Item>
                            </Col>
                        </Row>

                    </Form>
                </Modal>


                {/* ===================================================
                    THE CARD
                ==================================================== */}

                {employee && (
                    <div className="card-stage">
                        <canvas ref={canvasRef} className="contact-card-canvas" />
                    </div>
                )}


                {/* ===================================================
                    TECHNICAL INFORMATION
                ==================================================== */}

                {employee && (
                    <div className="technical-info no-print">

                        <div className="info-title">QR Contact Information</div>

                        <div className="info-grid">
                            <div>
                                <strong>Name</strong>
                                <span>{employee.firstName} {employee.lastName}</span>
                            </div>

                            <div>
                                <strong>Designation</strong>
                                <span>{employee.designation}</span>
                            </div>

                            <div>
                                <strong>Phone</strong>
                                <span>{employee.phone}</span>
                            </div>

                            <div>
                                <strong>Email</strong>
                                <span>{employee.email}</span>
                            </div>
                        </div>

                        <button type="button" className="copy-button" onClick={copyVCard}>
                            Copy vCard Data
                        </button>

                    </div>
                )}

            </div>


            {/* =====================================================
                CSS
            ====================================================== */}

            <style>{`

                * {
                    box-sizing: border-box;
                }

                .employee-qr-page {
                    min-height: 100vh;
                    padding: 35px 20px 60px;
                    background: linear-gradient(180deg, #f5f8fc 0%, #eef3f9 100%);
                    font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
                }


                /* ===== EMBEDDED (inside an offcanvas / panel) =====
                   Drops the standalone-page framing so the component is just
                   its controls and the card. */

                .employee-qr-page.embedded {
                    min-height: 0;
                    padding: 0;
                    background: transparent;
                }

                .employee-qr-page.embedded .controls-card {
                    max-width: none;
                    margin: 0;
                    padding: 0;
                    border: none;
                    background: transparent;
                    box-shadow: none;
                }

                .employee-qr-page.embedded .controls-header,
                .employee-qr-page.embedded .control-empty-hint,
                .employee-qr-page.embedded .technical-info {
                    display: none;
                }

                .employee-qr-page.embedded .control-row {
                    flex-direction: column;
                    align-items: stretch;
                    gap: 10px;
                }

                .employee-qr-page.embedded .control-actions {
                    width: 100%;
                    flex-wrap: wrap;
                }

                .employee-qr-page.embedded .control-actions button {
                    flex: 1 1 auto;
                }

                .employee-qr-page.embedded .color-row {
                    margin-top: 14px;
                    padding-top: 12px;
                }

                .employee-qr-page.embedded .card-stage {
                    margin-top: 16px;
                }

                .employee-qr-page.embedded .contact-card-canvas {
                    width: 100%;
                    max-width: 320px;
                }


                /* ===== CONTROLS ===== */

                .controls-card {
                    max-width: 850px;
                    margin: 0 auto 30px;
                    background: #ffffff;
                    border: 1px solid #e4eaf1;
                    border-radius: 16px;
                    padding: 22px;
                    box-shadow: 0 8px 30px rgba(22, 50, 80, 0.08);
                }

                .controls-header {
                    margin-bottom: 20px;
                }

                .controls-header h4 {
                    margin: 0 0 5px;
                    font-size: 20px;
                    font-weight: 700;
                    color: #173f69;
                }

                .controls-header p {
                    margin: 0;
                    color: #7a8795;
                    font-size: 14px;
                }

                .control-row {
                    display: flex;
                    align-items: center;
                    gap: 15px;
                }

                .control-field {
                    flex: 1;
                }

                .control-empty-hint {
                    margin: 0;
                    font-size: 13.5px;
                    color: #8190a0;
                }

                .control-actions {
                    display: flex;
                    gap: 10px;
                }

                .control-actions button {
                    height: 44px;
                    border: none;
                    border-radius: 8px;
                    padding: 0 18px;
                    cursor: pointer;
                    font-size: 13px;
                    font-weight: 600;
                    white-space: nowrap;
                }

                .btn-primary {
                    background: #174f8c;
                    color: #ffffff;
                }

                .btn-primary:hover:not(:disabled) {
                    background: #123f70;
                }

                .btn-primary:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }

                .btn-secondary {
                    background: #edf2f7;
                    color: #24435f;
                }

                .btn-secondary:hover {
                    background: #e0e7ef;
                }


                /* ===== COLOUR PICKER ===== */

                .color-row {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-top: 18px;
                    padding-top: 16px;
                    border-top: 1px solid #eef2f7;
                }

                .color-label {
                    font-size: 0.72rem;
                    font-weight: 700;
                    letter-spacing: 0.06em;
                    text-transform: uppercase;
                    color: #8a8fa3;
                }

                .swatches {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .swatch {
                    width: 26px;
                    height: 26px;
                    border-radius: 50%;
                    border: 2px solid #fff;
                    box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.12);
                    cursor: pointer;
                    padding: 0;
                    position: relative;
                    transition: transform 0.15s ease, box-shadow 0.15s ease;
                }

                .swatch:hover {
                    transform: scale(1.12);
                }

                .swatch.active {
                    box-shadow: 0 0 0 2px #fff, 0 0 0 4px #174f8c;
                }

                .swatch-custom {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: repeating-conic-gradient(#e5e7eb 0% 25%, #fff 0% 50%) 50% / 10px 10px;
                    overflow: hidden;
                }

                .swatch-custom input[type="color"] {
                    position: absolute;
                    inset: 0;
                    width: 100%;
                    height: 100%;
                    opacity: 0;
                    cursor: pointer;
                    border: none;
                    padding: 0;
                }


                /* ===== PREMIUM MODAL =====
                   Everything here is scoped under .ecq-modal so it can't
                   leak into any other antd modal in the portal. */

                .ecq-modal .ant-modal-container,
                .ecq-modal .ant-modal-content {
                    border-radius: 20px;
                    padding: 0;
                    overflow: hidden;
                    box-shadow: 0 30px 80px rgba(15, 33, 56, 0.28);
                }

                .ecq-modal .ant-modal-header {
                    margin: 0;
                    /* extra room on the end so the title/subtitle can never
                       crowd the close button */
                    padding: 22px 60px 22px 28px;
                    border-bottom: 1px solid #eef2f7;
                    background: linear-gradient(180deg, #fbfcfe 0%, #ffffff 100%);
                    border-radius: 0;
                }

                .ecq-modal .ant-modal-body {
                    padding: 22px 28px 4px;
                    max-height: 62vh;
                    overflow-y: auto;
                }

                .ecq-modal .ant-modal-footer {
                    margin: 0;
                    padding: 16px 28px;
                    border-top: 1px solid #eef2f7;
                    background: #fbfcfe;
                }

                .ecq-modal .ant-modal-close {
                    top: 24px;
                    inset-inline-end: 22px;
                    border-radius: 10px;
                    color: #97a4b3;
                }


                /* ----- Header ----- */

                .ecq-head {
                    display: flex;
                    align-items: center;
                    gap: 14px;
                }

                .ecq-head-badge {
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

                .ecq-head-title {
                    font-size: 17px;
                    font-weight: 700;
                    color: #12263f;
                    line-height: 1.25;
                }

                .ecq-head-sub {
                    font-size: 12.5px;
                    font-weight: 400;
                    color: #8190a0;
                    margin-top: 2px;
                }


                /* ----- Section dividers ----- */

                .ecq-section {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin: 2px 0 16px;
                }

                .ecq-section + .ant-row + .ecq-section,
                .ecq-modal .ant-row + .ecq-section {
                    margin-top: 8px;
                }

                .ecq-section-title {
                    font-size: 11px;
                    font-weight: 700;
                    letter-spacing: 0.09em;
                    text-transform: uppercase;
                    color: #9aa6b4;
                    white-space: nowrap;
                }

                .ecq-section-rule {
                    flex: 1;
                    height: 1px;
                    background: linear-gradient(90deg, #e8eef5, rgba(232, 238, 245, 0));
                }


                /* ----- Fields ----- */

                .ecq-modal .ant-form-item {
                    margin-bottom: 18px;
                }

                .ecq-modal .ant-form-item-label > label {
                    height: auto;
                    font-size: 12.5px;
                    font-weight: 600;
                    color: #46566a;
                }

                .ecq-modal .ant-input,
                .ecq-modal .ant-input-affix-wrapper,
                .ecq-modal textarea.ant-input {
                    border-radius: 11px;
                    border-color: #dfe6ef;
                    background: #fbfcfe;
                    font-size: 14px;
                }

                .ecq-modal .ant-input:hover,
                .ecq-modal .ant-input-affix-wrapper:hover,
                .ecq-modal textarea.ant-input:hover {
                    border-color: #b9cbe0;
                    background: #ffffff;
                }

                .ecq-modal .ant-input:focus,
                .ecq-modal .ant-input-focused,
                .ecq-modal .ant-input-affix-wrapper-focused,
                .ecq-modal textarea.ant-input:focus {
                    background: #ffffff;
                    border-color: #174f8c;
                    box-shadow: 0 0 0 3px rgba(23, 79, 140, 0.10);
                }


                /* ----- Footer buttons ----- */

                .ecq-footer {
                    display: flex;
                    justify-content: flex-end;
                    gap: 10px;
                }

                .ecq-modal .ecq-btn-ghost {
                    height: 44px;
                    padding: 0 20px;
                    border-radius: 11px;
                    font-weight: 600;
                    border-color: #dfe6ef;
                    color: #46566a;
                }

                .ecq-modal .ecq-btn-ghost:hover {
                    border-color: #b9cbe0;
                    color: #12263f;
                }

                .ecq-modal .ecq-btn-primary {
                    height: 44px;
                    padding: 0 22px;
                    border: none;
                    border-radius: 11px;
                    font-weight: 600;
                    display: inline-flex;
                    align-items: center;
                    gap: 9px;
                    background: linear-gradient(135deg, #174f8c, #2a7ac0);
                    box-shadow: 0 10px 22px rgba(23, 79, 140, 0.30);
                }

                .ecq-modal .ecq-btn-primary:hover {
                    filter: brightness(1.07);
                }


                /* ----- Phone: one field per row, roomier chrome ----- */

                @media (max-width: 767px) {

                    .ecq-modal .ant-modal-container,
                    .ecq-modal .ant-modal-content {
                        border-radius: 18px;
                    }

                    .ecq-modal .ant-modal-header {
                        padding: 18px 46px 18px 18px;
                    }

                    .ecq-modal .ant-modal-body {
                        padding: 18px 18px 2px;
                        max-height: 66vh;
                    }

                    .ecq-modal .ant-modal-footer {
                        padding: 14px 18px;
                    }

                    .ecq-modal .ant-modal-close {
                        top: 18px;
                        inset-inline-end: 14px;
                    }

                    .ecq-head-badge {
                        width: 40px;
                        height: 40px;
                        border-radius: 12px;
                        font-size: 15px;
                    }

                    .ecq-head-title {
                        font-size: 15.5px;
                    }

                    .ecq-head-sub {
                        font-size: 11.5px;
                    }

                    .ecq-footer {
                        flex-direction: column-reverse;
                    }

                    .ecq-footer .ant-btn {
                        width: 100%;
                        justify-content: center;
                    }

                }


                /* ===== QR STYLE TOGGLE (inside the modal) ===== */

                .qr-style-row {
                    display: flex;
                    gap: 8px;
                }

                .qr-style-btn {
                    flex: 1;
                    height: 40px;
                    border: 1px solid #dfe6ef;
                    background: #fbfcfe;
                    border-radius: 11px;
                    cursor: pointer;
                    font-size: 13px;
                    font-weight: 600;
                    color: #46566a;
                    transition: border-color 0.15s ease, background-color 0.15s ease,
                        color 0.15s ease, box-shadow 0.15s ease;
                }

                .qr-style-btn:hover {
                    border-color: #b9cbe0;
                    background: #ffffff;
                }

                .qr-style-btn.active {
                    border-color: #174f8c;
                    background: rgba(23, 79, 140, 0.07);
                    color: #174f8c;
                    box-shadow: 0 0 0 3px rgba(23, 79, 140, 0.09);
                }

                /* Swatch row sits inside a field, so give it the same
                   height as the inputs beside it. */
                .ecq-modal .swatches {
                    min-height: 40px;
                    padding: 0 2px;
                }


                /* ===== THE CARD ===== */

                .card-stage {
                    display: flex;
                    justify-content: center;
                }

                .contact-card-canvas {
                    width: 360px;
                    max-width: 90vw;
                    height: auto;
                    display: block;
                    border-radius: 18px;
                    box-shadow: 0 18px 55px rgba(28, 54, 80, 0.18);
                }


                /* ===== TECHNICAL INFO ===== */

                .technical-info {
                    max-width: 850px;
                    margin: 25px auto 0;
                    padding: 20px;
                    background: #ffffff;
                    border: 1px solid #e3e9f0;
                    border-radius: 14px;
                }

                .info-title {
                    font-size: 15px;
                    font-weight: 700;
                    color: #243e57;
                    margin-bottom: 15px;
                }

                .info-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 12px;
                }

                .info-grid > div {
                    display: flex;
                    flex-direction: column;
                    gap: 3px;
                    padding: 11px 13px;
                    border-radius: 8px;
                    background: #f7f9fc;
                }

                .info-grid strong {
                    font-size: 11px;
                    text-transform: uppercase;
                    letter-spacing: .5px;
                    color: #8190a0;
                }

                .info-grid span {
                    font-size: 13px;
                    color: #34495e;
                    word-break: break-word;
                }

                .copy-button {
                    margin-top: 15px;
                    height: 40px;
                    padding: 0 16px;
                    border: 1px solid #d8e1eb;
                    background: #ffffff;
                    border-radius: 7px;
                    color: #174f8c;
                    cursor: pointer;
                    font-weight: 600;
                }


                /* ===== RESPONSIVE ===== */

                @media (max-width: 700px) {

                    .employee-qr-page {
                        padding: 15px 10px 40px;
                    }

                    .control-row {
                        flex-direction: column;
                        align-items: stretch;
                    }

                    .control-actions {
                        width: 100%;
                    }

                    .control-actions button {
                        flex: 1;
                    }

                    .info-grid {
                        grid-template-columns: 1fr;
                    }

                }


                /* ===== PRINT ===== */

                @media print {

                    .employee-qr-page {
                        padding: 0;
                        background: #ffffff;
                    }

                    .no-print {
                        display: none !important;
                    }

                    .contact-card-canvas {
                        box-shadow: none;
                    }

                }

            `}</style>
        </>
    );
};

export default EmployeeContactQR;