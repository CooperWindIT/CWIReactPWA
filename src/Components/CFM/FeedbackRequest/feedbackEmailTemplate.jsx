// =============================================================
// Feedback request email — the HTML the customer receives
//
// Path: src/Components/CFM/pages/feedbackEmailTemplate.js
//
// Built for mail clients, not browsers: tables for layout, inline styles,
// a solid colour behind every gradient (Outlook ignores gradients) and
// absolute image URLs (a mailbox can't see localhost or relative paths).
//
// No company is written in here: the sender's name and email come from the
// logged-in organisation (OrgName, OrgEmail), so every client gets their own
// branding. The sender is shown by name only; the one picture is the
// customer's own logo.
// =============================================================

export const defaultEmailMessage = (orgName) =>
    [
        `Thank you for choosing ${orgName || "us"}. Your opinion helps us improve our products and the service behind them.`,
        "We'd be grateful if you could spare a couple of minutes to tell us how we did this period.",
    ].join("\n\n");

export const defaultEmailSubject = ({ orgName, periodText }) =>
    [["Customer Feedback Request", periodText].filter(Boolean).join(" · "), orgName]
        .filter(Boolean)
        .join(" | ");

const esc = (value) =>
    String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

// Blank lines start a new paragraph; single line breaks stay as <br>.
const paragraphs = (text) =>
    String(text || "")
        .trim()
        .split(/\n\s*\n/)
        .filter((block) => block.trim())
        .map(
            (block) =>
                `<p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#3b4a5c;">${esc(
                    block.trim()
                ).replace(/\n/g, "<br>")}</p>`
        )
        .join("");

// Roughly 20 seconds a question, never less than 2 minutes.
const minutesFor = (count) => Math.max(2, Math.ceil((Number(count) || 0) / 3));

export const buildFeedbackEmailHtml = ({
    customerName = "",
    contactPerson = "",
    periodText = "",
    questionCount = 0,
    feedbackUrl = "",
    publicCode = "",
    message,
    orgName = "",
    customerLogoUrl = "",
}) => {
    const body = message ?? defaultEmailMessage(orgName);
    const initialsOf = (text, fallback) =>
        String(text || fallback)
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map((word) => word[0])
            .join("")
            .toUpperCase();
    const greetingName = contactPerson || customerName || "Customer";
    const year = new Date().getFullYear();
    const font =
        "-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif";

    // Mail apps often hold back pictures until the reader allows them, and
    // show the alt text instead — so the alt text is styled to look right on
    // its own: the customer's initials in the badge, the company's name for
    // the sender is shown by name.
    const customerBadge = customerLogoUrl
        ? `<img src="${esc(customerLogoUrl)}" alt="${esc(initialsOf(customerName, "C"))}" width="56" height="56" style="display:block;width:56px;height:56px;object-fit:contain;border:0;font-family:${font};font-size:20px;font-weight:800;line-height:56px;text-align:center;color:#0271ae;">`
        : `<div style="width:56px;height:56px;line-height:56px;text-align:center;font-size:20px;font-weight:800;color:#0271ae;">${esc(
              initialsOf(customerName, "C")
          )}</div>`;

    const orgMark = orgName
        ? `<span style="font-family:${font};font-size:20px;font-weight:800;letter-spacing:.5px;color:#0271ae;">${esc(orgName)}</span>`
        : "";

    const stat = (label, value) => `
        <td width="33.33%" align="center" style="padding:16px 6px;">
            <div style="font-size:11px;letter-spacing:1.2px;text-transform:uppercase;color:#7b8a9c;font-weight:700;">${label}</div>
            <div style="margin-top:6px;font-size:16px;font-weight:800;color:#12263f;">${value}</div>
        </td>`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<title>${esc(defaultEmailSubject({ orgName, periodText }))}</title>
<style>
    @media only screen and (max-width:620px){
        .px{padding-left:22px!important;padding-right:22px!important;}
        .hero-title{font-size:24px!important;}
        .stack{display:block!important;width:100%!important;}
    }
    a{color:#0271ae;}
</style>
</head>
<body style="margin:0;padding:0;background:#eef3f8;font-family:${font};-webkit-font-smoothing:antialiased;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">Tell us how we did${periodText ? ` in ${esc(periodText)}` : ""} — it takes about ${minutesFor(questionCount)} minutes.</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#eef3f8" style="background:#eef3f8;">
<tr><td align="center" style="padding:32px 12px;">

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">

    <!-- Brand row -->
    <tr><td style="padding:0 4px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
            <td align="left" valign="middle">${orgMark}</td>
            <td align="right" valign="middle" style="font-size:12px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:#7b8a9c;">Customer Feedback</td>
        </tr></table>
    </td></tr>

    <!-- Card -->
    <tr><td bgcolor="#ffffff" style="background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 12px 40px rgba(18,38,63,.08);">

        <!-- Accent -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
            <td height="5" bgcolor="#0a94d6" style="height:5px;line-height:5px;font-size:0;background:#0a94d6;background-image:linear-gradient(90deg,#0271ae,#0a94d6,#22c3ee);">&nbsp;</td>
        </tr></table>

        <!-- Hero -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
            <td class="px" bgcolor="#0271ae" style="padding:36px 40px 34px;background:#0271ae;background-image:linear-gradient(135deg,#02568a 0%,#0271ae 45%,#0a94d6 100%);">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
                    <td valign="top">
                        <div style="font-size:12px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase;color:#bfe6fb;">Feedback request${periodText ? ` · ${esc(periodText)}` : ""}</div>
                        <div class="hero-title" style="margin-top:10px;font-size:28px;line-height:1.25;font-weight:800;color:#ffffff;">How did we do${customerName ? `,<br>${esc(customerName)}` : ""}?</div>
                        <div style="margin-top:12px;font-size:20px;letter-spacing:4px;color:#fbbf24;">&#9733;&#9733;&#9733;&#9733;&#9733;</div>
                    </td>
                    <td width="72" valign="top" align="right">
                        <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
                            <td bgcolor="#ffffff" style="background:#ffffff;border-radius:16px;padding:8px;box-shadow:0 8px 20px rgba(0,0,0,.18);">${customerBadge}</td>
                        </tr></table>
                    </td>
                </tr></table>
            </td>
        </tr></table>

        <!-- Body -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
            <td class="px" style="padding:34px 40px 8px;">
                <p style="margin:0 0 16px;font-size:16px;font-weight:700;color:#12263f;">Dear ${esc(greetingName)},</p>
                ${paragraphs(body)}
            </td>
        </tr></table>

        <!-- At a glance -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
            <td class="px" style="padding:8px 40px 6px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f5f9fd" style="background:#f5f9fd;border:1px solid #e1ecf6;border-radius:14px;">
                    <tr>
                        ${stat("Period", esc(periodText || "—"))}
                        ${stat("Questions", Number(questionCount) || "—")}
                        ${stat("Time", `~${minutesFor(questionCount)} min`)}
                    </tr>
                </table>
            </td>
        </tr></table>

        <!-- Button -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
            <td align="center" class="px" style="padding:28px 40px 10px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
                    <td align="center" bgcolor="#0271ae" style="border-radius:12px;background:#0271ae;background-image:linear-gradient(135deg,#0271ae,#0a94d6);box-shadow:0 10px 22px rgba(2,113,174,.3);">
                        <a href="${esc(feedbackUrl)}" target="_blank" style="display:inline-block;padding:16px 38px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:12px;">Share your feedback &nbsp;&rarr;</a>
                    </td>
                </tr></table>
                <div style="margin-top:12px;font-size:12.5px;color:#7b8a9c;">It takes about ${minutesFor(questionCount)} minutes, and your answers are kept confidential.</div>
            </td>
        </tr></table>

        <!-- Fallback link -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
            <td class="px" style="padding:18px 40px 30px;">
                <div style="font-size:12.5px;color:#7b8a9c;margin-bottom:6px;">Button not working? Copy this link into your browser:</div>
                <div style="padding:11px 14px;border-radius:10px;background:#f5f9fd;border:1px dashed #c9dcee;font-family:Consolas,Menlo,monospace;font-size:12.5px;word-break:break-all;"><a href="${esc(feedbackUrl)}" target="_blank" style="color:#0271ae;text-decoration:none;">${esc(feedbackUrl)}</a></div>
                ${publicCode ? `<div style="margin-top:10px;font-size:12px;color:#9aa6b4;">Reference <strong style="color:#46566a;">${esc(publicCode)}</strong></div>` : ""}
            </td>
        </tr></table>

        <!-- Sign-off -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
            <td class="px" style="padding:22px 40px 32px;border-top:1px solid #edf2f7;">
                <p style="margin:0;font-size:14.5px;line-height:1.6;color:#3b4a5c;">Warm regards,<br><strong style="color:#12263f;">${orgName ? `Team ${esc(orgName)}` : "Customer Experience Team"}</strong></p>
            </td>
        </tr></table>
    </td></tr>

    <!-- Footer -->
    <tr><td align="center" style="padding:22px 24px 0;font-size:11.5px;line-height:1.7;color:#8a98a8;">
        This is an automated message from ${orgName ? `${esc(orgName)}&rsquo;s` : "our"} customer feedback portal.<br>
        Your responses are confidential and used only to improve our products and services.<br>
        &copy; ${year}${orgName ? ` ${esc(orgName)}` : ""}
    </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
};