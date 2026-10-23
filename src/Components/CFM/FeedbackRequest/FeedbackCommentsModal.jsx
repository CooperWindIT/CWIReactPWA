// =============================================================
// Feedback Comments & Reply — one pop-up per feedback request
//
// Path: src/Components/CFM/pages/FeedbackCommentsModal.jsx
//
// Two tabs:
//
//   Comments           — the team's private thread about this request.
//                        Other people's comments sit on the left, yours on
//                        the right, with a box at the bottom for a new one.
//
//   Reply to customer  — once the customer has submitted the form, email
//                        them back: a thank-you when the ratings are good,
//                        or a follow-up that names the low-rated areas
//                        (1★ / 2★). To is fixed to the person who answered,
//                        CC / subject / greeting / message / attachments are
//                        editable, with a live preview and a final check
//                        before sending.
//
// STATIC FOR NOW
//   COMMENTS_STATIC   comments live in memory (sample thread + anything
//                     posted) until a comments API exists.
//   REPLY_EMAIL_LIVE  false = the Send button only simulates sending.
//                     Set true once REPLY_EMAIL_ENDPOINT is built — it takes
//                     the same FormData as CFM/SendFeedbackEmail.
// =============================================================

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Modal, Button, Input, Select, Upload, Segmented, Tooltip, Spin, message } from "antd";

import { fetchWithAuth } from "../../../utils/api";

import {
    getPublicFeedbackForm,
    getMasterTypes,
    normalizeStatus,
    REQUEST_STATUS,
    readObject,
    readRows,
    readResult,
} from "../Services/cfmServices";

import { kindResolver } from "./FeedbackFormPreview";

export const COMMENTS_STATIC = true;
export const REPLY_EMAIL_LIVE = false;
const REPLY_EMAIL_ENDPOINT = "CFM/SendFeedbackReplyEmail";

const MAX_COMMENT = 1000;
const MAX_FILE_MB = 10;
const MAX_TOTAL_MB = 20;
const LOW_RATING = 2; // 1★ and 2★ count as "not good"
const PLACEHOLDER_ACTION = "[Describe the action you are taking]";

// -------------------------------------------------------------
// Small helpers
// -------------------------------------------------------------

const EMAIL_PATTERN = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]{2,}$/;
const isEmail = (value) => EMAIL_PATTERN.test(String(value).trim());

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

const AVATAR_TONES = ["#7c3aed", "#0d9488", "#ea580c", "#2563eb", "#db2777", "#0891b2"];
const toneOf = (name) =>
    AVATAR_TONES[[...String(name)].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % AVATAR_TONES.length];

const timeOf = (at) =>
    new Date(at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });

const dayOf = (at) => {
    const date = new Date(at);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
    return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const formatDate = (raw) => {
    if (!raw) return "";
    const date = new Date(raw);
    return Number.isNaN(date.getTime())
        ? String(raw)
        : date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const itemsOf = (form) => {
    const raw = form?.Items;
    if (Array.isArray(raw)) return raw;
    if (typeof raw === "string" && raw.trim()) {
        try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }
    return [];
};

// The customer has answered once the status says so — or, because some rows
// still read EMAIL_SENT after a submission, once a respondent is on record.
export const hasCustomerFeedback = (record) =>
    normalizeStatus(record?.Status) === REQUEST_STATUS.FEEDBACK_RECEIVED ||
    normalizeStatus(record?.Status) === "SUBMITTED" ||
    Boolean(record?.RespondentName || record?.RespondentEmail || record?.SubmittedOn);

// -------------------------------------------------------------
// Comments store (static: in memory, per request, for this session)
// -------------------------------------------------------------

const commentStore = new Map();

const keyOf = (record) => String(record?.Id ?? record?.PublicCode ?? "");

// Who "me" is — the same shape here and in the list, so "mine" lines up.
export const meOf = (sessionUserData = {}) => ({
    id: sessionUserData?.Id ?? "me",
    name: sessionUserData?.Name || "You",
});

const seedComments = (record, me) => {
    if (!hasCustomerFeedback(record)) return [];

    const now = Date.now();
    const hour = 3600 * 1000;
    const period = record?.Period || "this period";

    return [
        {
            id: "seed-1",
            authorId: "seed-ravi",
            author: "Ravi Kumar",
            role: "Sales",
            text: `Feedback is in for ${period}. Delivery looks lower than usual — can logistics confirm the dispatch dates?`,
            at: now - 26 * hour,
        },
        {
            id: "seed-2",
            authorId: me.id,
            author: me.name,
            text: "Checked with logistics: two consignments were held up by the transporter. I'll reply to the customer and explain.",
            at: now - 23 * hour,
        },
        {
            id: "seed-3",
            authorId: "seed-meena",
            author: "Meena S",
            role: "Quality",
            text: "Please copy me on the reply — I'll add this to the next quality review.",
            at: now - 3 * hour,
        },
    ];
};

export const getComments = (record, me) => {
    const key = keyOf(record);
    if (!commentStore.has(key)) commentStore.set(key, seedComments(record, me));
    return commentStore.get(key);
};

const saveComments = (record, list) => commentStore.set(keyOf(record), list);

export const commentCountOf = (record, me) =>
    getComments(record, me).filter((comment) => !comment.system).length;

// -------------------------------------------------------------
// Reply email — templates and HTML
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
            <td align="left" style="font-size:20px;font-weight:800;letter-spacing:.5px;color:#0271ae;">${esc(orgName)}</td>
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
            className="fcm-frame"
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
// MODAL
// =============================================================

export default function FeedbackCommentsModal({
    open,
    record,
    customer,
    customerLogoUrl = "",
    sessionUserData = {},
    org = {},
    statusLabel = "",
    defaultTab = "comments",
    onClose,
    onChange,
}) {
    const me = useMemo(
        () => meOf(sessionUserData),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [sessionUserData?.Id, sessionUserData?.Name]
    );

    const [tab, setTab] = useState(defaultTab);

    const customerName = customer?.CustomerName || record?.CustomerName || "Customer";
    const periodText = record?.Period || "";
    const canReply = hasCustomerFeedback(record);

    // ---------------------------------------------------------
    // COMMENTS
    // ---------------------------------------------------------

    const [comments, setComments] = useState([]);
    const [draft, setDraft] = useState("");
    const threadRef = useRef(null);

    useEffect(() => {
        if (!open || !record) return;
        setTab(defaultTab);
        setComments([...getComments(record, me)]);
        setDraft("");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, record?.Id, record?.PublicCode]);

    useEffect(() => {
        if (tab !== "comments") return;
        const el = threadRef.current;
        if (el) requestAnimationFrame(() => (el.scrollTop = el.scrollHeight));
    }, [comments.length, tab, open]);

    const addComment = (entry) => {
        const next = [...getComments(record, me), entry];
        saveComments(record, next);
        setComments(next);
        onChange?.();
    };

    const postComment = () => {
        const text = draft.trim();
        if (!text) return;

        addComment({
            id: `c-${Date.now()}`,
            authorId: me.id,
            author: me.name,
            text,
            at: Date.now(),
        });
        setDraft("");
    };

    const realCount = comments.filter((comment) => !comment.system).length;

    // ---------------------------------------------------------
    // REPLY — feedback summary from the submitted form
    // ---------------------------------------------------------

    const [summary, setSummary] = useState({ loading: false, ratings: [], avg: 0, low: [] });
    const [tone, setTone] = useState("thanks");
    const editedRef = useRef(false);

    const toEmail = String(record?.RespondentEmail || customer?.Email || "").trim();
    const [cc, setCc] = useState([]);
    const [subject, setSubject] = useState("");
    const [greeting, setGreeting] = useState("");
    const [body, setBody] = useState("");
    const [files, setFiles] = useState([]);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [sending, setSending] = useState(false);
    const [sentAt, setSentAt] = useState(null);

    const defaultGreeting = record?.RespondentName || customer?.ContactPerson || customerName;

    const applyTemplate = (nextTone, low) => {
        const filled = replyTemplate({ tone: nextTone, orgName: org.name, periodText, low });
        setSubject(filled.subject);
        setBody(filled.body);
        editedRef.current = false;
    };

    // Fresh compose state for every request opened.
    useEffect(() => {
        if (!open || !record) return;

        setCc([]);
        setFiles([]);
        setSentAt(null);
        setPreviewOpen(false);
        setGreeting(defaultGreeting);
        setTone("thanks");
        applyTemplate("thanks", []);
        setSummary({ loading: canReply, ratings: [], avg: 0, low: [] });

        if (!canReply || !record.PublicCode) {
            setSummary({ loading: false, ratings: [], avg: 0, low: [] });
            return;
        }

        let alive = true;
        const orgId = sessionUserData?.OrgId;

        Promise.all([
            getPublicFeedbackForm({ orgId, publicCode: record.PublicCode }).catch(() => null),
            getMasterTypes({ orgId }).catch(() => null),
        ]).then(([formResponse, typeResponse]) => {
            if (!alive) return;

            const { kindOf } = kindResolver(readRows(typeResponse));
            const ratings = itemsOf(readObject(formResponse))
                .filter((item) => kindOf(item.TypeId ?? item.ContentTypeId, item.TypeName) === "rating")
                .map((item) => ({
                    text: item.ContentText ?? item.Content ?? item.Question ?? "",
                    value: Number(String(item.Answer ?? "").match(/\d+(\.\d+)?/)?.[0]),
                }))
                .filter((row) => row.value >= 1 && row.value <= 5);

            const avg = ratings.length
                ? Math.round((ratings.reduce((sum, row) => sum + row.value, 0) / ratings.length) * 10) / 10
                : 0;
            const low = ratings.filter((row) => row.value <= LOW_RATING);

            setSummary({ loading: false, ratings, avg, low });

            // Low marks pick the follow-up template; good ones the thank-you.
            const autoTone = low.length || (avg && avg < 3) ? "concern" : "thanks";
            setTone(autoTone);
            if (!editedRef.current) applyTemplate(autoTone, low);
        });

        return () => {
            alive = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, record?.Id, record?.PublicCode]);

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
                senderName: me.name !== "You" ? me.name : "",
                customerName,
                customerLogoUrl,
                greetingName: greeting.trim(),
                message: body,
                periodText,
                publicCode: record?.PublicCode,
            }),
        [tone, org.name, me.name, customerName, customerLogoUrl, greeting, body, periodText, record?.PublicCode]
    );

    const [liveHtml, setLiveHtml] = useState(html);
    useEffect(() => {
        const timer = setTimeout(() => setLiveHtml(html), 300);
        return () => clearTimeout(timer);
    }, [html]);

    const badCc = cc.filter((item) => !isEmail(item));
    const totalBytes = files.reduce((sum, file) => sum + (file.size || 0), 0);

    const problems = [
        !canReply && "The customer hasn't submitted their feedback yet.",
        !toEmail && "There's no email address for this customer.",
        toEmail && !isEmail(toEmail) && `The customer's email doesn't look right: ${toEmail}`,
        !org.email && "Your organisation has no email address set (OrgEmail).",
        badCc.length && `Check the CC address: ${badCc.join(", ")}`,
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

    const openFinalCheck = () => {
        if (problems.length) {
            message.warning(problems[0]);
            return;
        }
        setPreviewOpen(true);
    };

    const handleSend = async () => {
        try {
            setSending(true);

            if (REPLY_EMAIL_LIVE) {
                const formData = new FormData();
                formData.append("OrgId", sessionUserData?.OrgId);
                formData.append("UserId", sessionUserData?.Id);
                formData.append("RequestId", Number(record?.Id));
                formData.append("ToEmail", toEmail);
                formData.append("CC", cc.join(","));
                formData.append("Subject", subject.trim());
                formData.append("Html", html);
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
            setPreviewOpen(false);

            addComment({
                id: `sys-${when}`,
                system: true,
                authorId: me.id,
                author: me.name,
                text: `emailed ${toEmail}${cc.length ? ` (cc ${cc.join(", ")})` : ""} — “${subject.trim()}”`,
                at: when,
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
    // RENDER
    // ---------------------------------------------------------

    if (!record) return null;

    let lastDay = "";

    const commentsPane = (
        <div className="fcm-chat">
            {COMMENTS_STATIC && (
                <div className="fcm-note">
                    <i className="bi bi-info-circle me-2"></i>
                    Comments are visible to your team only. They're kept for this session until
                    the comments service is connected.
                </div>
            )}

            <div className="fcm-thread" ref={threadRef}>
                {comments.length === 0 ? (
                    <div className="fcm-empty">
                        <span className="fcm-empty-icon">
                            <i className="bi bi-chat-square-dots"></i>
                        </span>
                        <h5>No comments yet</h5>
                        <p>Start the conversation about this request — only your team can see it.</p>
                    </div>
                ) : (
                    comments.map((comment) => {
                        const day = dayOf(comment.at);
                        const showDay = day !== lastDay;
                        lastDay = day;

                        const mine = !comment.system && String(comment.authorId) === String(me.id);

                        return (
                            <React.Fragment key={comment.id}>
                                {showDay && (
                                    <div className="fcm-day">
                                        <span>{day}</span>
                                    </div>
                                )}

                                {comment.system ? (
                                    <div className="fcm-system">
                                        <i className="bi bi-envelope-check-fill"></i>
                                        <span>
                                            {String(comment.authorId) === String(me.id)
                                                ? "You"
                                                : comment.author}{" "}
                                            {comment.text}
                                        </span>
                                        <em>{timeOf(comment.at)}</em>
                                    </div>
                                ) : (
                                    <div className={`fcm-msg ${mine ? "mine" : "theirs"}`}>
                                        {!mine && (
                                            <span
                                                className="fcm-avatar"
                                                style={{ background: toneOf(comment.author) }}
                                            >
                                                {initialsOf(comment.author)}
                                            </span>
                                        )}

                                        <div className="fcm-bubble-wrap">
                                            <div className="fcm-meta">
                                                <strong>{mine ? "You" : comment.author}</strong>
                                                {!mine && comment.role && <span>{comment.role}</span>}
                                                <em>{timeOf(comment.at)}</em>
                                            </div>
                                            <div className="fcm-bubble">{comment.text}</div>
                                        </div>

                                        {mine && (
                                            <span className="fcm-avatar me">{initialsOf(me.name)}</span>
                                        )}
                                    </div>
                                )}
                            </React.Fragment>
                        );
                    })
                )}
            </div>

            <div className="fcm-composer">
                <Input.TextArea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                        if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
                            event.preventDefault();
                            postComment();
                        }
                    }}
                    autoSize={{ minRows: 2, maxRows: 5 }}
                    maxLength={MAX_COMMENT}
                    placeholder="Write a comment for your team…"
                />
                <div className="fcm-composer-foot">
                    <small>
                        <i className="bi bi-lock me-1"></i>
                        Team only · Ctrl + Enter to post
                    </small>
                    <Button
                        type="primary"
                        className="fcm-btn-primary"
                        disabled={!draft.trim()}
                        onClick={postComment}
                    >
                        <i className="bi bi-send-fill me-2"></i>
                        Post comment
                    </Button>
                </div>
            </div>
        </div>
    );

    const replyLocked = (
        <div className="fcm-locked">
            <span className="fcm-empty-icon amber">
                <i className="bi bi-hourglass-split"></i>
            </span>
            <h5>Nothing to reply to yet</h5>
            <p>
                You can email the customer back once they've submitted their feedback.
                {statusLabel ? ` This request is currently “${statusLabel}”.` : ""}
            </p>
        </div>
    );

    const replyPane = (
        <div className="fcm-reply">
            {/* ---------- Compose ---------- */}
            <div className="fcm-pane">
                {!REPLY_EMAIL_LIVE && (
                    <div className="fcm-note amber">
                        <i className="bi bi-cone-striped me-2"></i>
                        Sending isn't connected yet — you can write and preview the reply, but it
                        won't be delivered.
                    </div>
                )}

                {sentAt && (
                    <div className="fcm-sent">
                        <i className="bi bi-check-circle-fill"></i>
                        <div>
                            <strong>Reply {REPLY_EMAIL_LIVE ? "sent" : "previewed"}</strong> at{" "}
                            {timeOf(sentAt)}. It's noted in the comments.
                        </div>
                    </div>
                )}

                {/* Feedback at a glance */}
                <div className={`fcm-summary ${tone}`}>
                    {summary.loading ? (
                        <div className="d-flex align-items-center gap-2">
                            <Spin size="small" /> <span>Reading the customer's ratings…</span>
                        </div>
                    ) : (
                        <>
                            <div className="fcm-summary-top">
                                <div className="fcm-score">
                                    <b>{summary.ratings.length ? summary.avg.toFixed(1) : "—"}</b>
                                    <span>/ 5</span>
                                </div>
                                <div className="min-w-0">
                                    <div className="fcm-summary-title">
                                        {summary.ratings.length
                                            ? summary.low.length
                                                ? `${summary.low.length} area${summary.low.length === 1 ? "" : "s"} rated ${LOW_RATING}★ or below`
                                                : "Good feedback across the board"
                                            : "No star ratings on this form"}
                                    </div>
                                    <div className="fcm-summary-sub">
                                        {[
                                            record.RespondentName && `From ${record.RespondentName}`,
                                            record.SubmittedOn && formatDate(record.SubmittedOn),
                                        ]
                                            .filter(Boolean)
                                            .join(" · ") || customerName}
                                    </div>
                                </div>
                            </div>

                            {summary.low.length > 0 && (
                                <div className="fcm-low-list">
                                    {summary.low.map((row) => (
                                        <span key={row.text} className="fcm-low">
                                            <i className="bi bi-star-fill"></i>
                                            {row.value} · {row.text}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div className="fcm-field">
                    <label className="fcm-label">Reply type</label>
                    <Segmented
                        block
                        value={tone}
                        onChange={switchTone}
                        options={[
                            {
                                value: "thanks",
                                label: (
                                    <span className="fcm-seg">
                                        <i className="bi bi-emoji-smile"></i> Thank you
                                    </span>
                                ),
                            },
                            {
                                value: "concern",
                                label: (
                                    <span className="fcm-seg">
                                        <i className="bi bi-tools"></i> Address concerns
                                    </span>
                                ),
                            },
                        ]}
                    />
                </div>

                <div className="fcm-field">
                    <label className="fcm-label">From</label>
                    <div className="fcm-fixed">
                        <i className="bi bi-building"></i>
                        <span className="text-truncate">
                            {org.name ? `${org.name} ` : ""}
                            <em>&lt;{org.email || "no OrgEmail set"}&gt;</em>
                        </span>
                    </div>
                </div>

                <div className="fcm-field">
                    <label className="fcm-label">To</label>
                    <Tooltip title="Replies go to the person who submitted the feedback.">
                        <div className="fcm-fixed">
                            <i className="bi bi-lock-fill"></i>
                            <span className="text-truncate">{toEmail || "No email on record"}</span>
                        </div>
                    </Tooltip>
                </div>

                <div className="fcm-field">
                    <label className="fcm-label">
                        CC <span className="fcm-optional">optional</span>
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
                        <div className="fcm-error">Not a valid email: {badCc.join(", ")}</div>
                    )}
                </div>

                <div className="fcm-field">
                    <label className="fcm-label">
                        Subject <span className="fcm-req">*</span>
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

                <div className="fcm-field">
                    <label className="fcm-label">Greeting</label>
                    <Input
                        addonBefore="Dear"
                        value={greeting}
                        maxLength={80}
                        onChange={(event) => setGreeting(event.target.value)}
                        suffix={
                            greeting !== defaultGreeting ? (
                                <Tooltip title="Reset">
                                    <i
                                        className="bi bi-arrow-counterclockwise fcm-reset"
                                        onClick={() => setGreeting(defaultGreeting)}
                                    ></i>
                                </Tooltip>
                            ) : (
                                <span />
                            )
                        }
                    />
                </div>

                <div className="fcm-field">
                    <div className="fcm-label-row">
                        <label className="fcm-label">
                            Message <span className="fcm-req">*</span>
                        </label>
                        <button
                            type="button"
                            className="fcm-link"
                            onClick={() => applyTemplate(tone, summary.low)}
                        >
                            <i className="bi bi-arrow-counterclockwise me-1"></i>
                            Reset to template
                        </button>
                    </div>
                    <Input.TextArea
                        value={body}
                        autoSize={{ minRows: 8, maxRows: 16 }}
                        maxLength={4000}
                        onChange={(event) => {
                            editedRef.current = true;
                            setBody(event.target.value);
                        }}
                    />
                    <div className="fcm-hint">
                        A blank line starts a new paragraph. Lines starting with “•” stay as a list.
                    </div>
                </div>

                <div className="fcm-field">
                    <div className="fcm-label-row">
                        <label className="fcm-label">
                            Attachments <span className="fcm-optional">optional</span>
                        </label>
                        {files.length > 0 && (
                            <span className="fcm-hint m-0">
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
                        className="fcm-drop"
                    >
                        <div className="fcm-drop-inner">
                            <i className="bi bi-paperclip"></i>
                            <div>
                                <strong>Drop files here</strong> or click to browse
                                <div className="fcm-hint m-0">Up to {MAX_FILE_MB} MB each</div>
                            </div>
                        </div>
                    </Upload.Dragger>
                </div>

                <Button
                    type="primary"
                    size="large"
                    block
                    className="fcm-btn-primary"
                    onClick={openFinalCheck}
                >
                    <i className="bi bi-eye me-2"></i>
                    Preview &amp; send
                </Button>
            </div>

            {/* ---------- Live preview ---------- */}
            <div className="fcm-pane fcm-preview-pane">
                <div className="fcm-preview-head">
                    <span>
                        <i className="bi bi-display me-2"></i>
                        What the customer will receive
                    </span>
                    <span className="fcm-live">
                        <i></i>Live
                    </span>
                </div>

                <div className="fcm-mail">
                    <div className="fcm-mail-row">
                        <span>From</span>
                        <b>{org.name || "—"}</b>
                    </div>
                    <div className="fcm-mail-row">
                        <span>To</span>
                        <b>{toEmail || "—"}</b>
                    </div>
                    {cc.length > 0 && (
                        <div className="fcm-mail-row">
                            <span>CC</span>
                            <b>{cc.join(", ")}</b>
                        </div>
                    )}
                    <div className="fcm-mail-row">
                        <span>Subject</span>
                        <b>{subject || "—"}</b>
                    </div>
                    {files.length > 0 && (
                        <div className="fcm-mail-files">
                            {files.map((file) => (
                                <span key={file.uid}>
                                    <i className="bi bi-paperclip"></i>
                                    {file.name}
                                </span>
                            ))}
                        </div>
                    )}
                    <EmailFrame html={liveHtml} title="Reply preview" />
                </div>
            </div>
        </div>
    );

    return (
        <>
            <Modal
                open={open}
                onCancel={onClose}
                footer={null}
                width={tab === "reply" ? 1180 : 820}
                centered
                destroyOnHidden
                className="fcm-modal"
                title={null}
            >
                {/* ---------- Header ---------- */}
                <div className="fcm-head">
                    <span className="fcm-logo">
                        {customerLogoUrl ? (
                            <img src={customerLogoUrl} alt={customerName} />
                        ) : (
                            <span>{initialsOf(customerName)}</span>
                        )}
                    </span>

                    <div className="min-w-0 flex-grow-1">
                        <div className="fcm-title text-truncate">{customerName}</div>
                        <div className="fcm-sub">
                            {[periodText, record.PublicCode && `Code ${record.PublicCode}`, statusLabel]
                                .filter(Boolean)
                                .join(" · ")}
                        </div>
                    </div>
                </div>

                <div className="fcm-tabs">
                    <Segmented
                        value={tab}
                        onChange={setTab}
                        options={[
                            {
                                value: "comments",
                                label: (
                                    <span className="fcm-seg">
                                        <i className="bi bi-chat-dots"></i> Comments
                                        {realCount > 0 && <b className="fcm-count">{realCount}</b>}
                                    </span>
                                ),
                            },
                            {
                                value: "reply",
                                label: (
                                    <span className="fcm-seg">
                                        <i className="bi bi-reply"></i> Reply to customer
                                    </span>
                                ),
                            },
                        ]}
                    />
                </div>

                <div className={`fcm-body ${tab}`}>
                    {tab === "comments" ? commentsPane : canReply ? replyPane : replyLocked}
                </div>
            </Modal>

            {/* ---------- Final check ---------- */}
            <Modal
                open={previewOpen}
                onCancel={() => !sending && setPreviewOpen(false)}
                width={760}
                centered
                destroyOnHidden
                className="fcm-check"
                title={
                    <div className="d-flex align-items-center gap-2">
                        <i className="bi bi-send-check text-primary fs-4"></i>
                        <span>Ready to send?</span>
                    </div>
                }
                footer={[
                    <Button key="back" onClick={() => setPreviewOpen(false)} disabled={sending}>
                        Keep editing
                    </Button>,
                    <Button
                        key="send"
                        type="primary"
                        className="fcm-btn-primary"
                        loading={sending}
                        onClick={handleSend}
                    >
                        {!sending && <i className="bi bi-send-fill me-2"></i>}
                        {REPLY_EMAIL_LIVE ? "Send reply" : "Send (preview only)"}
                    </Button>,
                ]}
            >
                <div className="fcm-check-list">
                    <div><span>To</span><b>{toEmail}</b></div>
                    {cc.length > 0 && <div><span>CC</span><b>{cc.join(", ")}</b></div>}
                    <div><span>Subject</span><b>{subject}</b></div>
                    <div>
                        <span>Attachments</span>
                        <b>{files.length ? files.map((file) => file.name).join(", ") : "None"}</b>
                    </div>
                </div>
                <div className="fcm-check-frame">
                    <EmailFrame html={html} title="Final email" />
                </div>
            </Modal>

            <style>{`
                .fcm-modal .ant-modal-content,
                .fcm-modal .ant-modal-container { padding: 0; overflow: hidden; border-radius: 20px; }
                .fcm-modal .ant-modal-body { padding: 0; }
                .fcm-modal .ant-modal-close { top: 18px; right: 18px; color: rgba(255,255,255,.85); }
                .fcm-modal .ant-modal-close:hover { color: #fff; background: rgba(255,255,255,.14); }

                .fcm-head {
                    display: flex; align-items: center; gap: 14px;
                    padding: 20px 64px 18px 22px; color: #fff;
                    background: linear-gradient(135deg, #02568a 0%, #0271ae 45%, #0a94d6 100%);
                }
                .fcm-logo {
                    width: 52px; height: 52px; flex: none; border-radius: 14px; overflow: hidden;
                    display: flex; align-items: center; justify-content: center;
                    background: #fff; color: #0271ae; font-weight: 800; font-size: 17px;
                    box-shadow: 0 8px 20px rgba(0,0,0,.18);
                }
                .fcm-logo img { width: 100%; height: 100%; object-fit: contain; padding: 4px; }
                .fcm-title { font-size: 18px; font-weight: 800; }
                .fcm-sub { margin-top: 2px; font-size: 12.5px; color: rgba(255,255,255,.8); }

                .fcm-tabs { padding: 12px 22px; border-bottom: 1px solid #eef3f8; background: #fbfcfe; }
                .fcm-seg { display: inline-flex; align-items: center; gap: 7px; font-weight: 600; padding: 2px 6px; }
                .fcm-count {
                    min-width: 20px; height: 20px; padding: 0 6px; border-radius: 999px;
                    display: inline-flex; align-items: center; justify-content: center;
                    line-height: 1; font-size: 11px; align-self: center;
                    background: #0271ae; color: #fff;
                }

                .fcm-body {
                    height: min(calc(100vh - 250px), 660px);
                    min-height: 360px;
                    overflow: hidden;
                    background: #f6f9fc;
                }

                .fcm-note {
                    margin: 0 0 12px; padding: 9px 12px; border-radius: 10px;
                    background: #eef6ff; color: #1d5f99; font-size: 12.5px;
                }
                .fcm-note.amber { background: #fff7e6; color: #9a5b00; }

                .fcm-chat { height: 100%; min-height: 0; display: flex; flex-direction: column; padding: 14px 18px 0; }
                .fcm-thread { flex: 1 1 auto; min-height: 0; overflow-y: auto; overscroll-behavior: contain; padding: 4px 4px 14px; }
                .fcm-thread::-webkit-scrollbar { width: 6px; }
                .fcm-thread::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }

                .fcm-day { display: flex; justify-content: center; margin: 10px 0 14px; }
                .fcm-day span {
                    padding: 3px 12px; border-radius: 999px; background: #e7edf4;
                    font-size: 11.5px; font-weight: 700; color: #64748b;
                }

                .fcm-msg { display: flex; align-items: flex-end; gap: 9px; margin-bottom: 14px; }
                .fcm-msg.mine { justify-content: flex-end; }
                .fcm-avatar {
                    width: 32px; height: 32px; flex: none; border-radius: 50%;
                    display: grid; place-items: center; color: #fff; font-size: 12px; font-weight: 800;
                }
                .fcm-avatar.me { background: #0271ae; }
                .fcm-bubble-wrap { max-width: min(72%, 560px); display: flex; flex-direction: column; }
                .fcm-msg.mine .fcm-bubble-wrap { align-items: flex-end; }
                .fcm-meta { display: flex; align-items: baseline; gap: 7px; margin: 0 4px 4px; font-size: 12px; }
                .fcm-meta strong { color: #12263f; }
                .fcm-meta span { color: #8190a0; }
                .fcm-meta em { font-style: normal; color: #a3afbd; font-size: 11px; }
                .fcm-bubble {
                    padding: 10px 14px; font-size: 14px; line-height: 1.55; white-space: pre-wrap;
                    word-break: break-word; border-radius: 16px 16px 16px 4px;
                    background: #fff; color: #1e293b; border: 1px solid #e6edf5;
                    box-shadow: 0 2px 6px rgba(15, 23, 42, .04);
                }
                .fcm-msg.mine .fcm-bubble {
                    border-radius: 16px 16px 4px 16px; border: 0; color: #fff;
                    background: linear-gradient(135deg, #0271ae, #0a94d6);
                    box-shadow: 0 8px 18px -8px rgba(2, 113, 174, .55);
                }

                .fcm-system {
                    display: flex; align-items: center; gap: 8px; justify-content: center; flex-wrap: wrap;
                    margin: 0 auto 14px; max-width: 90%; padding: 7px 14px; border-radius: 12px;
                    background: #ecfdf5; color: #047857; font-size: 12.5px; text-align: center;
                }
                .fcm-system em { font-style: normal; color: #6aa88f; font-size: 11px; }

                .fcm-composer {
                    flex: none; margin: 0 -18px; padding: 12px 18px 16px;
                    background: #fff; border-top: 1px solid #e8eef5;
                }
                .fcm-composer textarea { border-radius: 12px; font-size: 14px; }
                .fcm-composer-foot {
                    display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 10px;
                }
                .fcm-composer-foot small { color: #8190a0; }

                .fcm-btn-primary {
                    border: 0; font-weight: 600; border-radius: 10px;
                    background: linear-gradient(135deg, #0271ae, #0a94d6) !important;
                    box-shadow: 0 8px 18px -8px rgba(2, 113, 174, .6);
                }
                .fcm-btn-primary:disabled { background: #e6edf5 !important; box-shadow: none; }

                .fcm-empty, .fcm-locked { text-align: center; padding: 54px 20px; color: #6b7a8d; }
                .fcm-locked { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; }
                .fcm-empty h5, .fcm-locked h5 { margin: 0 0 6px; font-weight: 700; color: #12263f; }
                .fcm-empty p, .fcm-locked p { max-width: 420px; margin: 0 auto; font-size: 13.5px; }
                .fcm-empty-icon {
                    display: inline-grid; place-items: center; width: 58px; height: 58px; border-radius: 18px;
                    margin-bottom: 12px; font-size: 24px; background: #e8f4fc; color: #0271ae;
                }
                .fcm-empty-icon.amber { background: #fff4dc; color: #b45309; }

                .fcm-reply {
                    height: 100%; display: grid;
                    grid-template-columns: minmax(0, 5fr) minmax(0, 6fr);
                    grid-template-rows: minmax(0, 1fr);
                }
                .fcm-pane { min-height: 0; overflow-y: auto; overscroll-behavior: contain; padding: 16px 18px 20px; }
                .fcm-pane::-webkit-scrollbar { width: 6px; }
                .fcm-pane::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
                .fcm-preview-pane { background: #eef3f8; border-left: 1px solid #e2e9f1; }

                .fcm-sent {
                    display: flex; gap: 10px; align-items: flex-start; margin-bottom: 12px;
                    padding: 10px 12px; border-radius: 10px; background: #ecfdf5; color: #047857; font-size: 13px;
                }
                .fcm-sent i { font-size: 16px; }

                .fcm-summary {
                    margin-bottom: 14px; padding: 12px 14px; border-radius: 14px; background: #fff;
                    border: 1px solid #e6edf5; border-left: 4px solid #10b981;
                }
                .fcm-summary.concern { border-left-color: #f59e0b; }
                .fcm-summary-top { display: flex; align-items: center; gap: 12px; }
                .fcm-score {
                    flex: none; display: flex; align-items: baseline; gap: 2px; padding: 6px 10px;
                    border-radius: 10px; background: #f1f7ff;
                }
                .fcm-score b { font-size: 22px; font-weight: 800; color: #12263f; }
                .fcm-score span { font-size: 12px; color: #8190a0; }
                .fcm-summary-title { font-size: 13.5px; font-weight: 700; color: #12263f; }
                .fcm-summary-sub { font-size: 12px; color: #8190a0; }
                .fcm-low-list { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
                .fcm-low {
                    display: inline-flex; align-items: center; gap: 5px; padding: 3px 9px; border-radius: 8px;
                    background: #fff4e5; color: #b45309; font-size: 12px; font-weight: 600;
                }
                .fcm-low i { font-size: 10px; }

                .fcm-field { margin-bottom: 13px; }
                .fcm-label { display: block; margin-bottom: 5px; font-size: 12.5px; font-weight: 600; color: #46566a; }
                .fcm-label-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
                .fcm-optional { margin-left: 4px; font-size: 11px; font-weight: 500; color: #9aa6b4; }
                .fcm-req { color: #e11d48; }
                .fcm-hint { margin-top: 4px; font-size: 11.5px; color: #9aa6b4; }
                .fcm-error { margin-top: 4px; font-size: 12px; color: #e11d48; }
                .fcm-reset { cursor: pointer; color: #8190a0; }
                .fcm-reset:hover { color: #0271ae; }
                .fcm-link {
                    border: 0; background: none; padding: 0; margin-bottom: 5px;
                    font-size: 12px; font-weight: 600; color: #0271ae; cursor: pointer;
                }
                .fcm-fixed {
                    display: flex; align-items: center; gap: 8px; height: 34px; padding: 0 11px;
                    border-radius: 8px; background: #f1f5f9; border: 1px solid #e6edf5;
                    font-size: 13.5px; color: #12263f; cursor: default;
                }
                .fcm-fixed i { color: #8190a0; }
                .fcm-fixed em { font-style: normal; color: #8190a0; }

                .fcm-drop.ant-upload-wrapper .ant-upload-drag { border-radius: 12px; background: #fff; }
                .fcm-drop-inner {
                    display: flex; align-items: center; gap: 12px; padding: 4px 12px;
                    text-align: left; font-size: 13px; color: #46566a;
                }
                .fcm-drop-inner > i { font-size: 20px; color: #0271ae; }

                .fcm-preview-head {
                    display: flex; align-items: center; justify-content: space-between;
                    margin-bottom: 10px; font-size: 13px; font-weight: 700; color: #46566a;
                }
                .fcm-live {
                    display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px; border-radius: 999px;
                    background: #ecfdf5; color: #047857; font-size: 11px; font-weight: 800; text-transform: uppercase;
                }
                .fcm-live i { width: 7px; height: 7px; border-radius: 50%; background: #10b981; }

                .fcm-mail {
                    border-radius: 14px; overflow: hidden; background: #fff;
                    border: 1px solid #e2e9f1; box-shadow: 0 10px 26px -14px rgba(18, 38, 63, .3);
                }
                .fcm-mail-row {
                    display: flex; gap: 10px; padding: 8px 14px; border-bottom: 1px solid #f0f3f7; font-size: 13px;
                }
                .fcm-mail-row span { width: 58px; flex: none; color: #8190a0; }
                .fcm-mail-row b { font-weight: 600; color: #12263f; min-width: 0; word-break: break-word; }
                .fcm-mail-files {
                    display: flex; flex-wrap: wrap; gap: 6px; padding: 8px 14px; border-bottom: 1px solid #f0f3f7;
                }
                .fcm-mail-files span {
                    display: inline-flex; align-items: center; gap: 5px; padding: 3px 9px; border-radius: 8px;
                    background: #f1f5f9; font-size: 12px; color: #46566a;
                }
                /* The preview is for reading only — letting the mouse pass through
                   means the wheel scrolls the pane instead of getting stuck in the frame. */
                .fcm-frame { display: block; width: 100%; border: 0; background: #eef3f8; pointer-events: none; }

                .fcm-check-list {
                    margin-bottom: 12px; border: 1px solid #e6edf5; border-radius: 12px; overflow: hidden;
                }
                .fcm-check-list > div { display: flex; gap: 12px; padding: 8px 14px; font-size: 13px; border-bottom: 1px solid #f0f3f7; }
                .fcm-check-list > div:last-child { border-bottom: 0; }
                .fcm-check-list span { width: 92px; flex: none; color: #8190a0; }
                .fcm-check-list b { font-weight: 600; color: #12263f; word-break: break-word; }
                .fcm-check-frame { max-height: 56vh; overflow-y: auto; border-radius: 12px; border: 1px solid #e6edf5; }

                @media (max-width: 991.98px) {
                    .fcm-body.reply { height: auto; max-height: calc(100vh - 220px); overflow-y: auto; }
                    .fcm-reply { display: block; height: auto; }
                    .fcm-pane { overflow: visible; }
                    .fcm-preview-pane { border-left: 0; border-top: 1px solid #e2e9f1; }
                }

                @media (max-width: 575.98px) {
                    .fcm-head { padding: 16px 56px 14px 16px; }
                    .fcm-tabs { padding: 10px 12px; overflow-x: auto; }
                    .fcm-chat { padding: 12px 12px 0; }
                    .fcm-composer { margin: 0 -12px; padding: 10px 12px 12px; }
                    .fcm-composer-foot small { display: none; }
                    .fcm-composer-foot { justify-content: flex-end; }
                    .fcm-bubble-wrap { max-width: 82%; }
                    .fcm-pane { padding: 14px 12px 16px; }
                    .fcm-seg { font-size: 12.5px; gap: 5px; padding: 2px 0; }
                }
            `}</style>
        </>
    );
}