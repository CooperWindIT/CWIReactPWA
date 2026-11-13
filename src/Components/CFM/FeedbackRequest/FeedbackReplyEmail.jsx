// =============================================================
// Reply to customer — the "Email customer" tab on the View screen
//
// Path: src/Components/CFM/pages/FeedbackReplyEmail.jsx
//
// Once the customer has submitted the form, the team can email them back:
//   • a thank-you when the ratings are good, or
//   • a follow-up that names the low-rated areas (1★ / 2★).
//
// Two modes inside the panel:
//   Write    — reply type, From (fixed), To (fixed), CC, subject, greeting,
//              message and attachments
//   Preview  — the email exactly as the customer will receive it, with the
//              Send button
//
// Sends through CFM/CustomerResponseEmail as form-data, with RequestId
// = the feedback request id. REPLY_EMAIL_LIVE = false only simulates it.
// =============================================================

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button, Input, Select, Upload, Segmented, Tooltip, Modal, message } from "antd";

import { fetchWithAuth } from "../../../utils/api";
import { normalizeStatus, REQUEST_STATUS, readResult } from "../Services/cfmServices";

export const REPLY_EMAIL_LIVE = true;
const REPLY_EMAIL_ENDPOINT = "CFM/CustomerResponseEmail";

const MAX_FILE_MB = 10;
const MAX_TOTAL_MB = 20;
export const LOW_RATING = 2; // 1★ and 2★ count as "not good"
const PLACEHOLDER_ACTION = "[Describe the action you are taking]";

// -------------------------------------------------------------
// Helpers
// -------------------------------------------------------------

const EMAIL_PATTERN = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]{2,}$/;
export const isEmail = (value) => EMAIL_PATTERN.test(String(value).trim());

const formatSize = (bytes) =>
    bytes >= 1024 * 1024
        ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
        : `${Math.max(1, Math.round(bytes / 1024))} KB`;

const initialsOf = (name) =>
    String(name || "?")
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((word) => word[0])
        .join("")
        .toUpperCase();

const timeOf = (at) =>
    new Date(at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });

// The customer has answered once the status says so — or, because some rows
// still read EMAIL_SENT after a submission, once a respondent is on record.
export const hasCustomerFeedback = (record) =>
    normalizeStatus(record?.Status) === REQUEST_STATUS.FEEDBACK_RECEIVED ||
    normalizeStatus(record?.Status) === "SUBMITTED" ||
    Boolean(record?.RespondentName || record?.RespondentEmail || record?.SubmittedOn);

// -------------------------------------------------------------
// Templates
// -------------------------------------------------------------

const replyTemplate = ({ tone, orgName, periodText, low }) => {
    const period = periodText ? ` for ${periodText}` : "";

    if (tone === "concern") {
        const list = low.length
            ? `\n${low.map((row) => `• ${row.text} — rated ${row.value}/5`).join("\n")}`
            : "";

        return {
            subject: [`Regarding your feedback${period}`, orgName].filter(Boolean).join(" | "),
            body: [
                `Thank you for your honest feedback${period}. We're sorry that we fell short of your expectations${
                    low.length ? " in these areas:" : "."
                }${list}`,
                `We have shared your comments with the teams concerned and are looking into what went wrong. Here is what we are doing about it:\n• ${PLACEHOLDER_ACTION}`,
                "We'll keep you posted on our progress. If it would help, we'd be glad to arrange a call to talk it through.",
                "Thank you for helping us improve.",
            ].join("\n\n"),
        };
    }

    return {
        subject: [`Thank you for your feedback${period}`, orgName].filter(Boolean).join(" | "),
        body: [
            `Thank you for taking the time to share your feedback${period}. We're delighted that our products and service met your expectations.`,
            `Your kind words mean a great deal to the whole ${orgName ? `${orgName} ` : ""}team, and we'll keep working hard to deliver the same standard every time.`,
            "If there's anything more we can do for you, simply reply to this email.",
        ].join("\n\n"),
    };
};

const esc = (value) =>
    String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

// CFM/CustomerResponseEmail saves the email in a SQL query built as text, so
// a single quote (') ends the string early and the server answers
// "Unclosed quotation mark...". Until the backend passes these as query
// parameters, nothing sent to it may contain a plain apostrophe:
//   Html     ' -> &#39;  (the browser and mail apps show it as ' — safe in
//                         text and inside style="..." attributes)
//   Subject  ' -> ’      (plain text, so the curly apostrophe is used)
export const sqlSafeHtml = (html) => String(html || "").replace(/'/g, "&#39;");
export const sqlSafeText = (text) => String(text || "").replace(/'/g, "\u2019");

// The sending organisation's logo (OrgURL) in the top-left of the email.
// If the mail app holds pictures back, the alt text — the organisation's
// name — shows in the same blue, so it still reads as a brand.
const orgBrand = ({ orgName, orgLogoUrl, font }) =>
    orgLogoUrl
        ? `<img src="${esc(orgLogoUrl)}" alt="${esc(orgName || "Logo")}" height="40" style="display:block;height:40px;width:auto;max-width:200px;border:0;font-family:${font};font-size:20px;font-weight:800;color:#0271ae;">`
        : orgName
        ? `<span style="font-family:${font};font-size:20px;font-weight:800;letter-spacing:.5px;color:#0271ae;">${esc(orgName)}</span>`
        : "";

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

export const buildReplyEmailHtml = ({
    tone = "thanks",
    orgName = "",
    orgLogoUrl = "",
    senderName = "",
    customerName = "",
    customerLogoUrl = "",
    greetingName = "",
    message: body = "",
    periodText = "",
    publicCode = "",
}) => {
    const font =
        "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif";
    const year = new Date().getFullYear();
    const concern = tone === "concern";

    const badge = customerLogoUrl
        ? `<img src="${esc(customerLogoUrl)}" alt="${esc(initialsOf(customerName))}" width="52" height="52" style="display:block;width:52px;height:52px;object-fit:contain;border:0;font-family:${font};font-size:18px;font-weight:800;line-height:52px;text-align:center;color:#0271ae;">`
        : `<div style="width:52px;height:52px;line-height:52px;text-align:center;font-size:18px;font-weight:800;color:#0271ae;">${esc(
              initialsOf(customerName || "C")
          )}</div>`;

    const accent = concern ? "#f59e0b" : "#10b981";
    const kicker = concern ? "We hear you" : "Thank you";
    const title = concern ? "Thank you for telling us — we're on it" : "Thank you for your feedback";
    const preheader = concern
        ? "We've read your feedback and here's what we're doing about it."
        : "Thank you for taking the time to share your feedback.";

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<style>
    @media only screen and (max-width:620px){
        .px{padding-left:22px!important;padding-right:22px!important;}
        .hero-title{font-size:23px!important;}
    }
    a{color:#0271ae;}
</style>
</head>
<body style="margin:0;padding:0;background:#eef3f8;font-family:${font};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#eef3f8" style="background:#eef3f8;">
<tr><td align="center" style="padding:28px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">

    <tr><td style="padding:0 4px 14px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
            <td align="left" valign="middle">${orgBrand({ orgName, orgLogoUrl, font })}</td>
            <td align="right" style="font-size:12px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:#7b8a9c;">Customer Feedback</td>
        </tr></table>
    </td></tr>

    <tr><td bgcolor="#ffffff" style="background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 12px 40px rgba(18,38,63,.08);">

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
            <td height="5" bgcolor="${accent}" style="height:5px;line-height:5px;font-size:0;background:${accent};">&nbsp;</td>
        </tr></table>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
            <td class="px" bgcolor="#0271ae" style="padding:30px 40px;background:#0271ae;background-image:linear-gradient(135deg,#02568a 0%,#0271ae 45%,#0a94d6 100%);">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
                    <td valign="top">
                        <div style="font-size:12px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase;color:#bfe6fb;">${esc(kicker)}${periodText ? ` · ${esc(periodText)}` : ""}</div>
                        <div class="hero-title" style="margin-top:10px;font-size:26px;line-height:1.25;font-weight:800;color:#ffffff;">${esc(title)}</div>
                    </td>
                    <td width="68" valign="top" align="right">
                        <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
                            <td bgcolor="#ffffff" style="background:#ffffff;border-radius:14px;padding:7px;">${badge}</td>
                        </tr></table>
                    </td>
                </tr></table>
            </td>
        </tr></table>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
            <td class="px" style="padding:32px 40px 10px;">
                <p style="margin:0 0 16px;font-size:16px;font-weight:700;color:#12263f;">Dear ${esc(greetingName || customerName || "Customer")},</p>
                ${paragraphs(body)}
            </td>
        </tr></table>

        ${
            publicCode
                ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
            <td class="px" style="padding:0 40px 8px;font-size:12px;color:#9aa6b4;">Feedback reference <strong style="color:#46566a;">${esc(publicCode)}</strong></td>
        </tr></table>`
                : ""
        }

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
            <td class="px" style="padding:20px 40px 30px;border-top:1px solid #edf2f7;">
                <p style="margin:0;font-size:14.5px;line-height:1.6;color:#3b4a5c;">Warm regards,<br>
                ${senderName ? `<strong style="color:#12263f;">${esc(senderName)}</strong><br>` : ""}
                <span style="color:#5b6b7d;">${orgName ? `Team ${esc(orgName)}` : "Customer Experience Team"}</span></p>
            </td>
        </tr></table>
    </td></tr>

    <tr><td align="center" style="padding:20px 24px 0;font-size:11.5px;line-height:1.7;color:#8a98a8;">
        You're receiving this because you shared feedback with ${orgName ? esc(orgName) : "us"}.<br>
        &copy; ${year}${orgName ? ` ${esc(orgName)}` : ""}
    </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
};

// The email in a frame, grown to its content so it reads like a mailbox.
function EmailFrame({ html, title }) {
    const frameRef = useRef(null);
    const [height, setHeight] = useState(520);

    const measure = () => {
        const doc = frameRef.current?.contentDocument;
        if (doc?.documentElement) setHeight(Math.max(420, doc.documentElement.scrollHeight));
    };

    return (
        <iframe
            ref={frameRef}
            title={title}
            className="fre-frame"
            srcDoc={html}
            sandbox="allow-same-origin allow-popups"
            style={{ height }}
            onLoad={() => {
                measure();
                frameRef.current?.contentDocument
                    ?.querySelectorAll("img")
                    .forEach((img) => !img.complete && img.addEventListener("load", measure, { once: true }));
            }}
        />
    );
}

// =============================================================
// PANEL
// =============================================================

export default function FeedbackReplyEmail({
    canReply = false,
    statusLabel = "",
    requestId,
    publicCode = "",
    periodText = "",
    customerName = "",
    customerLogoUrl = "",
    greetingDefault = "",
    toEmail = "",
    respondentName = "",
    submittedText = "",
    ratings = [],
    ratingsReady = true,
    org = {},
    sessionUserData = {},
    senderName = "",
    onSent,
}) {
    const [mode, setMode] = useState("write");
    const [tone, setTone] = useState("thanks");
    const editedRef = useRef(false);

    const [cc, setCc] = useState([]);
    const [subject, setSubject] = useState("");
    const [greeting, setGreeting] = useState(greetingDefault);
    const [body, setBody] = useState("");
    const [files, setFiles] = useState([]);
    const [sending, setSending] = useState(false);
    const [sentAt, setSentAt] = useState(null);

    const bodyRef = useRef(null);

    // Ratings summary — from the answers already on the screen.
    const summary = useMemo(() => {
        const valid = ratings.filter((row) => row.value >= 1 && row.value <= 5);
        const avg = valid.length
            ? Math.round((valid.reduce((sum, row) => sum + row.value, 0) / valid.length) * 10) / 10
            : 0;
        return { ratings: valid, avg, low: valid.filter((row) => row.value <= LOW_RATING) };
    }, [ratings]);

    const autoTone = summary.low.length || (summary.avg && summary.avg < 3) ? "concern" : "thanks";

    const applyTemplate = (nextTone, low) => {
        const filled = replyTemplate({ tone: nextTone, orgName: org.name, periodText, low });
        setSubject(filled.subject);
        setBody(filled.body);
        editedRef.current = false;
    };

    // Low marks pick the follow-up template; good ones the thank-you.
    // Only until the user starts typing — their words are never replaced.
    useEffect(() => {
        if (!ratingsReady || editedRef.current) return;
        setTone(autoTone);
        applyTemplate(autoTone, summary.low);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ratingsReady, autoTone, summary.low.length, org.name, periodText]);

    // The greeting follows the respondent's name as it loads, until edited.
    const greetingTouched = useRef(false);
    useEffect(() => {
        if (!greetingTouched.current) setGreeting(greetingDefault);
    }, [greetingDefault]);

    // Each mode starts at the top.
    useEffect(() => {
        if (bodyRef.current) bodyRef.current.scrollTop = 0;
    }, [mode]);

    const switchTone = (nextTone) => {
        if (nextTone === tone) return;

        const swap = () => {
            setTone(nextTone);
            applyTemplate(nextTone, summary.low);
        };

        if (editedRef.current) {
            Modal.confirm({
                title: "Replace your message?",
                content: "Switching the template replaces the subject and message you've written.",
                okText: "Replace",
                cancelText: "Keep mine",
                centered: true,
                onOk: swap,
            });
        } else {
            swap();
        }
    };

    const html = useMemo(
        () =>
            buildReplyEmailHtml({
                tone,
                orgName: org.name,
                orgLogoUrl: org.logoUrl || "",
                senderName,
                customerName,
                customerLogoUrl,
                greetingName: greeting.trim(),
                message: body,
                periodText,
                publicCode,
            }),
        [tone, org.name, org.logoUrl, senderName, customerName, customerLogoUrl, greeting, body, periodText, publicCode]
    );

    const badCc = cc.filter((item) => !isEmail(item));
    const totalBytes = files.reduce((sum, file) => sum + (file.size || 0), 0);

    const problems = [
        !requestId && "This request has no id yet — reload the page and try again.",
        !toEmail && "There's no email address for this customer.",
        toEmail && !isEmail(toEmail) && `The customer's email doesn't look right: ${toEmail}`,
        !org.email && "Your organisation has no email address set (OrgEmail).",
        badCc.length > 0 && `Check the CC address: ${badCc.join(", ")}`,
        !subject.trim() && "Add a subject.",
        !body.trim() && "Add a message.",
        body.includes(PLACEHOLDER_ACTION) && "Replace “[Describe the action you are taking]” in the message.",
    ].filter(Boolean);

    const beforeUpload = (file) => {
        if (file.size > MAX_FILE_MB * 1024 * 1024) {
            message.warning(`${file.name} is over ${MAX_FILE_MB} MB.`);
            return Upload.LIST_IGNORE;
        }
        return false;
    };

    const handleFilesChange = ({ fileList }) => {
        let running = 0;
        const kept = fileList.filter((file) => {
            running += file.size || 0;
            return running <= MAX_TOTAL_MB * 1024 * 1024;
        });

        if (kept.length < fileList.length) {
            message.warning(`Attachments can add up to ${MAX_TOTAL_MB} MB in total.`);
        }
        setFiles(kept);
    };

    const handleSend = async () => {
        if (problems.length) {
            message.warning(problems[0]);
            return;
        }

        try {
            setSending(true);

            if (REPLY_EMAIL_LIVE) {
                const formData = new FormData();
                formData.append("OrgId", sessionUserData?.OrgId);
                formData.append("UserId", sessionUserData?.Id);
                formData.append("RequestId", Number(requestId));
                formData.append("ToEmail", toEmail);
                formData.append("CC", cc.join(","));
                formData.append("Subject", sqlSafeText(subject.trim()));
                formData.append("Html", sqlSafeHtml(html));
                formData.append("FromEmail", org.email || "");
                files.forEach((file) => formData.append("Attachments", file.originFileObj || file));

                const response = await fetchWithAuth(REPLY_EMAIL_ENDPOINT, {
                    method: "POST",
                    body: formData,
                });
                const result = readResult(await response.json());

                if (!result.ok) {
                    message.error(result.message || "The email couldn't be sent. Please try again.");
                    return;
                }
            } else {
                await new Promise((resolve) => setTimeout(resolve, 800));
            }

            const when = Date.now();
            setSentAt(when);
            setMode("write");

            onSent?.({
                at: when,
                toEmail,
                cc: [...cc],
                subject: subject.trim(),
            });

            message.success(
                REPLY_EMAIL_LIVE
                    ? `Reply sent to ${toEmail}.`
                    : "Preview mode — the reply was not actually sent."
            );
        } catch (error) {
            console.error("Reply email failed:", error);
            message.error("Something went wrong while sending the email.");
        } finally {
            setSending(false);
        }
    };

    // ---------------------------------------------------------
    // Not answered yet
    // ---------------------------------------------------------

    if (!canReply) {
        return (
            <div className="fre-locked">
                <span className="fre-locked-icon">
                    <i className="bi bi-hourglass-split"></i>
                </span>
                <h5>Nothing to reply to yet</h5>
                <p>
                    You can email the customer back once they've submitted their feedback.
                    {statusLabel ? ` This request is currently “${statusLabel}”.` : ""}
                </p>
                <style>{styles}</style>
            </div>
        );
    }

    // ---------------------------------------------------------
    // Write
    // ---------------------------------------------------------

    const writeView = (
        <>
            {!REPLY_EMAIL_LIVE && (
                <div className="fre-note amber">
                    <i className="bi bi-cone-striped me-2"></i>
                    Sending isn't connected yet — you can write and preview the reply, but it won't
                    be delivered.
                </div>
            )}

            {sentAt && (
                <div className="fre-sent">
                    <i className="bi bi-check-circle-fill"></i>
                    <div>
                        <strong>Reply {REPLY_EMAIL_LIVE ? "sent" : "previewed"}</strong> at{" "}
                        {timeOf(sentAt)}. It's noted in the comments.
                    </div>
                </div>
            )}

            {/* Feedback at a glance */}
            <div className={`fre-summary ${tone}`}>
                <div className="fre-summary-top">
                    <div className="fre-score">
                        <b>{summary.ratings.length ? summary.avg.toFixed(1) : "—"}</b>
                        <span>/ 5</span>
                    </div>
                    <div className="min-w-0">
                        <div className="fre-summary-title">
                            {summary.ratings.length
                                ? summary.low.length
                                    ? `${summary.low.length} area${summary.low.length === 1 ? "" : "s"} rated ${LOW_RATING}★ or below`
                                    : "Good feedback across the board"
                                : "No star ratings on this form"}
                        </div>
                        <div className="fre-summary-sub">
                            {[respondentName && `From ${respondentName}`, submittedText]
                                .filter(Boolean)
                                .join(" · ") || customerName}
                        </div>
                    </div>
                </div>

                {summary.low.length > 0 && (
                    <div className="fre-low-list">
                        {summary.low.map((row) => (
                            <span key={row.text} className="fre-low">
                                <i className="bi bi-star-fill"></i>
                                {row.value} · {row.text}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            <div className="fre-field">
                <label className="fre-label">Reply type</label>
                <Segmented
                    block
                    value={tone}
                    onChange={switchTone}
                    options={[
                        {
                            value: "thanks",
                            label: (
                                <span className="fre-seg">
                                    <i className="bi bi-emoji-smile"></i> Thank you
                                </span>
                            ),
                        },
                        {
                            value: "concern",
                            label: (
                                <span className="fre-seg">
                                    <i className="bi bi-tools"></i> Address concerns
                                </span>
                            ),
                        },
                    ]}
                />
            </div>

            <div className="fre-grid">
                <div className="fre-field">
                    <label className="fre-label">From</label>
                    <Tooltip title={org.email || "No OrgEmail set"}>
                        <div className="fre-fixed">
                            <i className="bi bi-building"></i>
                            <span className="text-truncate">{org.name || org.email || "—"}</span>
                        </div>
                    </Tooltip>
                </div>

                <div className="fre-field">
                    <label className="fre-label">To</label>
                    <Tooltip title="Replies go to the person who submitted the feedback.">
                        <div className="fre-fixed">
                            <i className="bi bi-lock-fill"></i>
                            <span className="text-truncate">{toEmail || "No email on record"}</span>
                        </div>
                    </Tooltip>
                </div>
            </div>

            <div className="fre-field">
                <label className="fre-label">
                    CC <span className="fre-optional">optional</span>
                </label>
                <Select
                    mode="tags"
                    style={{ width: "100%" }}
                    placeholder="Type an email and press Enter"
                    value={cc}
                    open={false}
                    suffixIcon={null}
                    tokenSeparators={[",", ";", " "]}
                    status={badCc.length ? "error" : ""}
                    onChange={(values) =>
                        setCc([...new Set(values.map((v) => String(v).trim()))].filter(Boolean))
                    }
                />
                {badCc.length > 0 && (
                    <div className="fre-error">Not a valid email: {badCc.join(", ")}</div>
                )}
            </div>

            <div className="fre-field">
                <label className="fre-label">
                    Subject <span className="fre-req">*</span>
                </label>
                <Input
                    value={subject}
                    maxLength={200}
                    onChange={(event) => {
                        editedRef.current = true;
                        setSubject(event.target.value);
                    }}
                />
            </div>

            <div className="fre-field">
                <label className="fre-label">Greeting</label>
                <Input
                    addonBefore="Dear"
                    value={greeting}
                    maxLength={80}
                    onChange={(event) => {
                        greetingTouched.current = true;
                        setGreeting(event.target.value);
                    }}
                    suffix={
                        greeting !== greetingDefault ? (
                            <Tooltip title="Reset">
                                <i
                                    className="bi bi-arrow-counterclockwise fre-reset"
                                    onClick={() => {
                                        greetingTouched.current = false;
                                        setGreeting(greetingDefault);
                                    }}
                                ></i>
                            </Tooltip>
                        ) : (
                            <span />
                        )
                    }
                />
            </div>

            <div className="fre-field">
                <div className="fre-label-row">
                    <label className="fre-label">
                        Message <span className="fre-req">*</span>
                    </label>
                    <button
                        type="button"
                        className="fre-link"
                        onClick={() => applyTemplate(tone, summary.low)}
                    >
                        <i className="bi bi-arrow-counterclockwise me-1"></i>
                        Reset to template
                    </button>
                </div>
                <Input.TextArea
                    value={body}
                    autoSize={{ minRows: 8, maxRows: 18 }}
                    maxLength={4000}
                    onChange={(event) => {
                        editedRef.current = true;
                        setBody(event.target.value);
                    }}
                />
                <div className="fre-hint">
                    A blank line starts a new paragraph. Lines starting with “•” stay as a list.
                </div>
            </div>

            <div className="fre-field mb-0">
                <div className="fre-label-row">
                    <label className="fre-label">
                        Attachments <span className="fre-optional">optional</span>
                    </label>
                    {files.length > 0 && (
                        <span className="fre-hint m-0">
                            {files.length} file{files.length === 1 ? "" : "s"} ·{" "}
                            {formatSize(totalBytes)} of {MAX_TOTAL_MB} MB
                        </span>
                    )}
                </div>
                <Upload.Dragger
                    multiple
                    listType="picture"
                    fileList={files}
                    beforeUpload={beforeUpload}
                    onChange={handleFilesChange}
                    className="fre-drop"
                >
                    <div className="fre-drop-inner">
                        <i className="bi bi-paperclip"></i>
                        <div>
                            <strong>Drop files here</strong> or click to browse
                            <div className="fre-hint m-0">Up to {MAX_FILE_MB} MB each</div>
                        </div>
                    </div>
                </Upload.Dragger>
            </div>
        </>
    );

    // ---------------------------------------------------------
    // Preview
    // ---------------------------------------------------------

    const previewView = (
        <>
            {problems.length > 0 && (
                <div className="fre-problems">
                    <div className="fre-problems-title">
                        <i className="bi bi-exclamation-triangle-fill me-2"></i>
                        Fix before sending
                    </div>
                    <ul>
                        {problems.map((text) => (
                            <li key={text}>{text}</li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="fre-mail">
                <div className="fre-mail-row">
                    <span>From</span>
                    <b>
                        {org.name || "—"}
                        {org.email && <em> &lt;{org.email}&gt;</em>}
                    </b>
                </div>
                <div className="fre-mail-row">
                    <span>To</span>
                    <b>{toEmail || "—"}</b>
                </div>
                {cc.length > 0 && (
                    <div className="fre-mail-row">
                        <span>CC</span>
                        <b>{cc.join(", ")}</b>
                    </div>
                )}
                <div className="fre-mail-row">
                    <span>Subject</span>
                    <b>{subject || "—"}</b>
                </div>
                {files.length > 0 && (
                    <div className="fre-mail-files">
                        {files.map((file) => (
                            <span key={file.uid}>
                                <i className="bi bi-paperclip"></i>
                                {file.name}
                            </span>
                        ))}
                    </div>
                )}
                <EmailFrame html={html} title="Reply preview" />
            </div>
        </>
    );

    return (
        <div className="fre">
            <div className="fre-modebar">
                <Segmented
                    value={mode}
                    onChange={setMode}
                    options={[
                        {
                            value: "write",
                            label: (
                                <span className="fre-seg">
                                    <i className="bi bi-pencil-square"></i> Write
                                </span>
                            ),
                        },
                        {
                            value: "preview",
                            label: (
                                <span className="fre-seg">
                                    <i className="bi bi-eye"></i> Preview
                                </span>
                            ),
                        },
                    ]}
                />
                <span className="fre-to text-truncate">
                    <i className="bi bi-envelope me-1"></i>
                    {toEmail || "No email on record"}
                </span>
            </div>

            <div className="fre-body" ref={bodyRef}>
                {mode === "write" ? writeView : previewView}
            </div>

            <div className="fre-foot">
                {mode === "write" ? (
                    <>
                        <span className="fre-foot-hint">
                            {problems.length ? (
                                <>
                                    <i className="bi bi-exclamation-circle me-1"></i>
                                    {problems.length} thing{problems.length === 1 ? "" : "s"} to fix
                                </>
                            ) : (
                                <>
                                    <i className="bi bi-check-circle me-1"></i>
                                    Ready to preview
                                </>
                            )}
                        </span>
                        <Button
                            type="primary"
                            className="fre-btn-primary"
                            onClick={() => setMode("preview")}
                        >
                            <i className="bi bi-eye me-2 text-white"></i>
                            Preview email
                        </Button>
                    </>
                ) : (
                    <>
                        <Button className="fre-btn-ghost" onClick={() => setMode("write")} disabled={sending}>
                            <i className="bi bi-arrow-left me-2"></i>
                            Edit
                        </Button>
                        <Tooltip title={problems[0] || ""}>
                            <span className="d-inline-flex">
                                <Button
                                    type="primary"
                                    className="fre-btn-primary"
                                    loading={sending}
                                    disabled={problems.length > 0}
                                    onClick={handleSend}
                                >
                                    {!sending && <i className="bi bi-send-fill me-2 text-white"></i>}
                                    {REPLY_EMAIL_LIVE ? "Send reply" : "Send (preview only)"}
                                </Button>
                            </span>
                        </Tooltip>
                    </>
                )}
            </div>

            <style>{styles}</style>
        </div>
    );
}

// =============================================================
// STYLES
// =============================================================

const styles = `
    .fre { height: 100%; min-height: 0; display: flex; flex-direction: column; }

    .fre-modebar {
        flex: none; display: flex; align-items: center; justify-content: space-between; gap: 10px;
        padding: 12px 18px; border-bottom: 1px solid #eef3f8; background: #ffffff;
    }
    .fre-to { min-width: 0; font-size: 12.5px; color: #8190a0; }

    .fre-body {
        flex: 1 1 auto; min-height: 0; overflow-y: auto; overscroll-behavior: contain;
        padding: 16px 18px 20px; background: #f6f9fc;
    }
    .fre-body::-webkit-scrollbar { width: 6px; }
    .fre-body::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }

    .fre-foot {
        flex: none; display: flex; align-items: center; justify-content: space-between; gap: 10px;
        padding: 12px 18px; background: #ffffff; border-top: 1px solid #e8eef5;
    }
    .fre-foot-hint { font-size: 12.5px; color: #8190a0; }

    .fre-seg { display: inline-flex; align-items: center; gap: 7px; font-weight: 600; padding: 2px 6px; }

    .fre-note {
        margin: 0 0 12px; padding: 9px 12px; border-radius: 10px;
        background: #eef6ff; color: #1d5f99; font-size: 12.5px;
    }
    .fre-note.amber { background: #fff7e6; color: #9a5b00; }

    .fre-sent {
        display: flex; gap: 10px; align-items: flex-start; margin-bottom: 12px;
        padding: 10px 12px; border-radius: 10px; background: #ecfdf5; color: #047857; font-size: 13px;
    }
    .fre-sent i { font-size: 16px; }

    .fre-summary {
        margin-bottom: 14px; padding: 12px 14px; border-radius: 14px; background: #ffffff;
        border: 1px solid #e6edf5; border-left: 4px solid #10b981;
    }
    .fre-summary.concern { border-left-color: #f59e0b; }
    .fre-summary-top { display: flex; align-items: center; gap: 12px; }
    .fre-score {
        flex: none; display: flex; align-items: baseline; gap: 2px; padding: 6px 10px;
        border-radius: 10px; background: #f1f7ff;
    }
    .fre-score b { font-size: 22px; font-weight: 800; color: #12263f; }
    .fre-score span { font-size: 12px; color: #8190a0; }
    .fre-summary-title { font-size: 13.5px; font-weight: 700; color: #12263f; }
    .fre-summary-sub { font-size: 12px; color: #8190a0; }
    .fre-low-list { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
    .fre-low {
        display: inline-flex; align-items: center; gap: 5px; padding: 3px 9px; border-radius: 8px;
        background: #fff4e5; color: #b45309; font-size: 12px; font-weight: 600;
    }
    .fre-low i { font-size: 10px; }

    .fre-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 10px; }

    .fre-field { margin-bottom: 13px; }
    .fre-label { display: block; margin-bottom: 5px; font-size: 12.5px; font-weight: 600; color: #46566a; }
    .fre-label-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    .fre-optional { margin-left: 4px; font-size: 11px; font-weight: 500; color: #9aa6b4; }
    .fre-req { color: #e11d48; }
    .fre-hint { margin-top: 4px; font-size: 11.5px; color: #9aa6b4; }
    .fre-error { margin-top: 4px; font-size: 12px; color: #e11d48; }
    .fre-reset { cursor: pointer; color: #8190a0; }
    .fre-reset:hover { color: #0271ae; }
    .fre-link {
        border: 0; background: none; padding: 0; margin-bottom: 5px;
        font-size: 12px; font-weight: 600; color: #0271ae; cursor: pointer;
    }
    .fre-fixed {
        display: flex; align-items: center; gap: 8px; height: 34px; padding: 0 11px;
        border-radius: 8px; background: #eef2f7; border: 1px solid #e3e9f1;
        font-size: 13.5px; color: #12263f; cursor: default;
    }
    .fre-fixed i { color: #8190a0; }

    .fre-drop.ant-upload-wrapper .ant-upload-drag { border-radius: 12px; background: #ffffff; }
    .fre-drop-inner {
        display: flex; align-items: center; gap: 12px; padding: 4px 12px;
        text-align: left; font-size: 13px; color: #46566a;
    }
    .fre-drop-inner > i { font-size: 20px; color: #0271ae; }

    .fre-problems {
        margin-bottom: 12px; padding: 10px 14px; border-radius: 12px;
        background: #fff7e6; border: 1px solid #fde68a; color: #92400e; font-size: 12.5px;
    }
    .fre-problems-title { font-weight: 700; margin-bottom: 4px; }
    .fre-problems ul { margin: 0; padding-left: 18px; }

    .fre-mail {
        border-radius: 14px; overflow: hidden; background: #ffffff;
        border: 1px solid #e2e9f1; box-shadow: 0 10px 26px -14px rgba(18, 38, 63, .3);
    }
    .fre-mail-row {
        display: flex; gap: 10px; padding: 8px 14px; border-bottom: 1px solid #f0f3f7; font-size: 13px;
    }
    .fre-mail-row span { width: 58px; flex: none; color: #8190a0; }
    .fre-mail-row b { font-weight: 600; color: #12263f; min-width: 0; word-break: break-word; }
    .fre-mail-row em { font-style: normal; font-weight: 500; color: #8190a0; }
    .fre-mail-files {
        display: flex; flex-wrap: wrap; gap: 6px; padding: 8px 14px; border-bottom: 1px solid #f0f3f7;
    }
    .fre-mail-files span {
        display: inline-flex; align-items: center; gap: 5px; padding: 3px 9px; border-radius: 8px;
        background: #f1f5f9; font-size: 12px; color: #46566a;
    }
    /* Read-only: the wheel scrolls the panel instead of getting stuck in the frame. */
    .fre-frame { display: block; width: 100%; border: 0; background: #eef3f8; pointer-events: none; }

    .fre-btn-primary {
        height: 38px; border: 0; font-weight: 600; border-radius: 10px;
        background: linear-gradient(135deg, #0271ae, #0a94d6) !important;
        box-shadow: 0 8px 18px -8px rgba(2, 113, 174, .6);
    }
    .fre-btn-primary:disabled { background: #e6edf5 !important; color: #9aa6b4 !important; box-shadow: none; }
    .fre-btn-primary:disabled .bi { color: #9aa6b4 !important; }
    .fre-btn-ghost { height: 38px; border-radius: 10px; font-weight: 600; color: #46566a; }

    .fre-locked {
        height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center;
        text-align: center; padding: 40px 24px; color: #6b7a8d; background: #f6f9fc;
    }
    .fre-locked h5 { margin: 0 0 6px; font-weight: 700; color: #12263f; }
    .fre-locked p { max-width: 360px; margin: 0 auto; font-size: 13.5px; }
    .fre-locked-icon {
        display: inline-grid; place-items: center; width: 58px; height: 58px; border-radius: 18px;
        margin-bottom: 12px; font-size: 24px; background: #fff4dc; color: #b45309;
    }

    @media (max-width: 575.98px) {
        .fre-modebar, .fre-foot { padding: 10px 12px; }
        .fre-body { padding: 14px 12px 16px; }
        .fre-grid { grid-template-columns: 1fr; gap: 0; }
        .fre-to, .fre-foot-hint { display: none; }
        .fre-foot { justify-content: flex-end; }
        .fre-seg { gap: 5px; padding: 2px 0; }
    }
`;