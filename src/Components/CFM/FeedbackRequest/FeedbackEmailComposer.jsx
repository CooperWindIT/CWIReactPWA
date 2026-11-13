// =============================================================
// Send email — the last step of the request setup
//
// Path: src/Components/CFM/pages/FeedbackEmailComposer.jsx
//
// Compose on the left, the email exactly as the customer will receive it on
// the right. Sending always goes through a final preview, and posts
// CFM/SendFeedbackEmail as form data (ToEmail, CC, Subject, Html, FromEmail,
// Attachments).
// =============================================================

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button, Input, Modal, Select, Upload, message } from "antd";

import {
    sendFeedbackEmail,
    publicFormUrl,
    readResult,
    EMAIL_INLINE_IMAGES,
} from "../Services/cfmServices";

import {
    buildFeedbackEmailHtml,
    defaultEmailSubject,
    defaultEmailMessage,
} from "./feedbackEmailTemplate";

const MAX_FILE_MB = 10;
const MAX_TOTAL_MB = 20;

const EMAIL_PATTERN = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]{2,}$/;

const splitEmails = (text) =>
    String(text || "")
        .split(/[,;\s]+/)
        .map((item) => item.trim())
        .filter(Boolean);

const isEmail = (value) => EMAIL_PATTERN.test(String(value).trim());

const formatSize = (bytes) =>
    bytes >= 1024 * 1024
        ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
        : `${Math.max(1, Math.round(bytes / 1024))} KB`;

const fileIcon = (name = "") => {
    const ext = name.split(".").pop().toLowerCase();
    if (["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg"].includes(ext)) return "bi-file-earmark-image";
    if (ext === "pdf") return "bi-file-earmark-pdf";
    if (["xls", "xlsx", "csv"].includes(ext)) return "bi-file-earmark-spreadsheet";
    if (["doc", "docx"].includes(ext)) return "bi-file-earmark-word";
    if (["zip", "rar", "7z"].includes(ext)) return "bi-file-earmark-zip";
    return "bi-file-earmark";
};

// The email in a frame, grown to its full height so it reads like a mailbox
// rather than a box with its own scrollbar.
function EmailFrame({ html, title }) {
    const frameRef = useRef(null);
    const [height, setHeight] = useState(640);

    const measure = () => {
        const doc = frameRef.current?.contentDocument;
        if (!doc?.documentElement) return;
        setHeight(Math.max(420, doc.documentElement.scrollHeight));
    };

    const handleLoad = () => {
        measure();

        // Logos arrive after the first layout and push the content down.
        const doc = frameRef.current?.contentDocument;
        doc?.querySelectorAll("img").forEach((img) => {
            if (!img.complete) img.addEventListener("load", measure, { once: true });
        });
    };

    return (
        <iframe
            ref={frameRef}
            title={title}
            className="fem-frame"
            srcDoc={html}
            sandbox="allow-same-origin allow-popups"
            style={{ height }}
            onLoad={handleLoad}
        />
    );
}

export default function FeedbackEmailComposer({
    orgId,
    userId,
    requestId,
    publicCode,
    customerName,
    contactPerson,
    customerEmail,
    customerLogoUrl,
    org = {},
    periodText,
    questionCount,
    disabled = false,
    lockedReason = "Closed",
    alreadySent = false,
    onSent,
    onBack,
}) {
    const feedbackUrl = publicFormUrl(publicCode);

    const [to, setTo] = useState(customerEmail || "");
    const toTouched = useRef(false);
    const [cc, setCc] = useState([]);
    // The sender is the logged-in organisation: OrgName and OrgEmail.
    const orgName = org.name || "";
    const fromEmail = org.email || "";
    const orgInitials =
        orgName
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((word) => word[0])
            .join("")
            .toUpperCase() || "@";

    const defaultMessage = defaultEmailMessage(orgName);
    const defaultSubject = defaultEmailSubject({ orgName, periodText });

    const [subject, setSubject] = useState(defaultSubject);
    const [body, setBody] = useState(defaultMessage);
    const subjectTouched = useRef(false);
    const bodyTouched = useRef(false);

    // The greeting ("Dear …,") starts from the contact person and can be
    // changed here for this email.
    const defaultGreeting = contactPerson || customerName || "";
    const [greetingName, setGreetingName] = useState(defaultGreeting);
    const greetingTouched = useRef(false);
    const [files, setFiles] = useState([]);

    const [previewOpen, setPreviewOpen] = useState(false);
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(null);

    // The customer record can land after this mounts — fill To from it unless
    // someone has already typed there.
    useEffect(() => {
        if (!toTouched.current && customerEmail) setTo(customerEmail);
        if (!greetingTouched.current) setGreetingName(defaultGreeting);
            // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [customerEmail, customerName, contactPerson]);

    // Same for the organisation's name in the subject and message.
    useEffect(() => {
        if (!subjectTouched.current) setSubject(defaultSubject);
        if (!bodyTouched.current) setBody(defaultMessage);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orgName, periodText]);

    const templateData = {
        customerName,
        contactPerson: greetingName.trim(),
        periodText,
        questionCount,
        feedbackUrl,
        publicCode,
        message: body,
        orgName,
        orgLogoUrl: org.logoUrl || "",
    };

    // What the screen shows: the customer's logo straight from the image server.
    const html = useMemo(
        () => buildFeedbackEmailHtml({ ...templateData, customerLogoUrl }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [customerName, greetingName, periodText, questionCount, feedbackUrl, publicCode, body, orgName, org.logoUrl, customerLogoUrl]
    );

    // What gets sent. With EMAIL_INLINE_IMAGES on, the customer's logo
    // travels inside the email (a cid: image) instead of being linked, so
    // Outlook and Gmail show it without the reader having to allow "blocked
    // content". The server downloads the Url and attaches it under the Cid.
    const inlineImages = EMAIL_INLINE_IMAGES
        ? [
              customerLogoUrl && { Cid: "customer-logo", Url: customerLogoUrl },
              org.logoUrl && { Cid: "org-logo", Url: org.logoUrl },
          ].filter(Boolean)
        : [];

    const htmlToSend = () =>
        inlineImages.length
            ? buildFeedbackEmailHtml({
                  ...templateData,
                  customerLogoUrl: customerLogoUrl ? "cid:customer-logo" : "",
                  orgLogoUrl: org.logoUrl ? "cid:org-logo" : "",
              })
            : html;

    // The side preview redraws a beat after typing stops, not on every key.
    const [liveHtml, setLiveHtml] = useState(html);
    useEffect(() => {
        const timer = setTimeout(() => setLiveHtml(html), 350);
        return () => clearTimeout(timer);
    }, [html]);

    const toList = splitEmails(to);
    const badTo = toList.filter((item) => !isEmail(item));
    const badCc = cc.filter((item) => !isEmail(item));
    const totalBytes = files.reduce((sum, file) => sum + (file.size || 0), 0);

    const problems = [
        !fromEmail && "Your organisation has no email address set (OrgEmail), so there's nothing to send from.",
        !toList.length && "Add the customer's email address.",
        badTo.length && `Check the To address: ${badTo.join(", ")}`,
        badCc.length && `Check the CC address: ${badCc.join(", ")}`,
        !subject.trim() && "Add a subject.",
        !body.trim() && "Add a message.",
        !feedbackUrl && "This request has no public code yet — save it first.",
    ].filter(Boolean);

    // ---------------------------------------------------------
    // Attachments — kept on the page until Send, never uploaded alone
    // ---------------------------------------------------------

    const beforeUpload = (file) => {
        if (file.size > MAX_FILE_MB * 1024 * 1024) {
            message.warning(`${file.name} is over ${MAX_FILE_MB} MB.`);
            return Upload.LIST_IGNORE;
        }
        return false;
    };

    const handleFilesChange = ({ fileList }) => {
        let running = 0;
        const kept = [];

        fileList.forEach((file) => {
            running += file.size || 0;
            if (running <= MAX_TOTAL_MB * 1024 * 1024) kept.push(file);
        });

        if (kept.length < fileList.length) {
            message.warning(`Attachments can add up to ${MAX_TOTAL_MB} MB in total.`);
        }

        setFiles(kept);
    };

    // ---------------------------------------------------------
    // Send
    // ---------------------------------------------------------

    const openPreview = () => {
        if (problems.length) {
            message.warning(problems[0]);
            return;
        }
        setPreviewOpen(true);
    };

    const handleSend = async () => {
        try {
            setSending(true);

            const response = await sendFeedbackEmail({
                orgId,
                userId,
                requestId,
                toEmail: toList.join(", "),
                cc: cc.join(", "),
                subject: subject.trim(),
                html: htmlToSend(),
                inlineImages,
                fromEmail,
                attachments: files.map((file) => file.originFileObj || file),
            });

            const result = readResult(response);

            if (!result.ok) {
                message.error(result.message || "Couldn't send the email.");
                return;
            }

            message.success(result.message || "Feedback request emailed.");
            setPreviewOpen(false);
            setSent({
                to: toList.join(", "),
                cc: cc.join(", "),
                files: files.length,
                at: new Date(),
            });
            onSent?.();
        } catch (error) {
            console.error("SendFeedbackEmail failed:", error);
            message.error("Couldn't send the email. Please try again.");
        } finally {
            setSending(false);
        }
    };

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(feedbackUrl);
            message.success("Link copied.");
        } catch (error) {
            message.error("Couldn't copy the link.");
        }
    };

    // ---------------------------------------------------------
    // Pieces
    // ---------------------------------------------------------

    const mailView = (frameHtml, frameTitle) => (
        <div className="fem-mail">
            <div className="fem-mail-head">
                <div className="fem-mail-subject">{subject.trim() || "(no subject)"}</div>

                <div className="fem-mail-from">
                    <span className="fem-mail-avatar">{orgInitials}</span>

                    <div className="fem-mail-who">
                        <div>
                            <strong>{orgName || fromEmail || "—"}</strong>{" "}
                            {fromEmail && <span className="fem-muted">&lt;{fromEmail}&gt;</span>}
                        </div>
                        <div className="fem-muted">
                            to {toList.join(", ") || "—"}
                            {cc.length > 0 && <> · cc {cc.join(", ")}</>}
                        </div>
                    </div>

                    <span className="fem-muted fem-mail-time">now</span>
                </div>

                {files.length > 0 && (
                    <div className="fem-mail-atts">
                        {files.map((file) => (
                            <span key={file.uid} className="fem-att">
                                <i className={`bi ${fileIcon(file.name)}`}></i>
                                <span className="fem-att-name">{file.name}</span>
                                <span className="fem-muted">{formatSize(file.size || 0)}</span>
                            </span>
                        ))}
                    </div>
                )}
            </div>

            <EmailFrame html={frameHtml} title={frameTitle} />
        </div>
    );

    // ---------------------------------------------------------
    // Render
    // ---------------------------------------------------------

    if (disabled) {
        return (
            <div className="fem-state">
                <span className="fem-state-icon locked">
                    <i className="bi bi-lock-fill"></i>
                </span>
                <h3>
                    {lockedReason === "Feedback received"
                        ? "Feedback already received"
                        : "This request is closed"}
                </h3>
                <p>
                    {lockedReason === "Feedback received"
                        ? "The customer has already answered, so there's nothing to send."
                        : "This request can't be emailed."}
                </p>
                <style>{styles}</style>
            </div>
        );
    }

    return (
        <>
            {sent && (
                <div className="fem-sent">
                    <span className="fem-state-icon">
                        <i className="bi bi-send-check-fill"></i>
                    </span>

                    <div className="flex-grow-1 min-w-0">
                        <h3>Feedback request sent</h3>
                        <p>
                            Emailed to <strong>{sent.to}</strong>
                            {sent.cc && <> · cc {sent.cc}</>}
                            {sent.files > 0 && (
                                <> · {sent.files} attachment{sent.files === 1 ? "" : "s"}</>
                            )}{" "}
                            at{" "}
                            {sent.at.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.
                        </p>
                    </div>

                    <div className="fem-sent-actions">
                        <Button className="fem-btn-ghost" onClick={() => setSent(null)}>
                            <i className="bi bi-arrow-repeat me-2"></i>
                            Send again
                        </Button>
                        {onBack && (
                            <Button type="primary" className="fem-btn-send fem-btn-sm" onClick={onBack}>
                                <i className="bi bi-list-check me-2"></i>
                                Back to requests
                            </Button>
                        )}
                    </div>
                </div>
            )}

            {!sent && (
                <div className="row g-4">
                    {/* ---------------- Compose ---------------- */}

                    <div className="col-12 col-xl-5">
                        <div className="fem-card">
                            <div className="fem-card-head">
                                <span className="fem-badge">
                                    <i className="bi bi-envelope-paper-fill text-white"></i>
                                </span>
                                <div>
                                    <h3 className="fem-title">Compose email</h3>
                                    <div className="fem-sub">
                                        The feedback link is added to the email for you.
                                    </div>
                                </div>
                            </div>

                            <div className="fem-card-body">
                                {alreadySent && (
                                    <div className="fem-note">
                                        <i className="bi bi-envelope-check-fill"></i>
                                        <span>
                                            This request has already been emailed. Sending again
                                            sends the same link — useful as a reminder.
                                        </span>
                                    </div>
                                )}

                                <div className="fem-field">
                                    <label className="fem-label">From</label>
                                    <div className="fem-static">
                                        <i className="bi bi-shield-check"></i>
                                        {fromEmail || (
                                            <span className="fem-error m-0">
                                                No organisation email set
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="fem-field">
                                    <label className="fem-label">
                                        To <span className="fem-req">*</span>
                                    </label>
                                    <Input
                                        size="large"
                                        prefix={<i className="bi bi-person fem-prefix"></i>}
                                        placeholder="customer@company.com"
                                        value={to}
                                        status={badTo.length ? "error" : ""}
                                        onChange={(event) => {
                                            toTouched.current = true;
                                            setTo(event.target.value);
                                        }}
                                    />
                                    {badTo.length > 0 && (
                                        <div className="fem-error">
                                            Not a valid email: {badTo.join(", ")}
                                        </div>
                                    )}
                                </div>

                                <div className="fem-field">
                                    <label className="fem-label">
                                        CC <span className="fem-optional">optional</span>
                                    </label>
                                    <Select
                                        mode="tags"
                                        size="large"
                                        style={{ width: "100%" }}
                                        placeholder="Type an email and press Enter"
                                        value={cc}
                                        open={false}
                                        suffixIcon={null}
                                        tokenSeparators={[",", ";", " "]}
                                        status={badCc.length ? "error" : ""}
                                        onChange={(values) =>
                                            setCc(
                                                [...new Set(values.map((v) => String(v).trim()))].filter(
                                                    Boolean
                                                )
                                            )
                                        }
                                        tagRender={({ value, closable, onClose }) => (
                                            <span
                                                className={`fem-tag ${isEmail(value) ? "" : "bad"}`}
                                                onMouseDown={(event) => event.preventDefault()}
                                            >
                                                {value}
                                                {closable && (
                                                    <button
                                                        type="button"
                                                        aria-label={`Remove ${value}`}
                                                        onClick={onClose}
                                                    >
                                                        <i className="bi bi-x"></i>
                                                    </button>
                                                )}
                                            </span>
                                        )}
                                    />
                                    {badCc.length > 0 && (
                                        <div className="fem-error">
                                            Not a valid email: {badCc.join(", ")}
                                        </div>
                                    )}
                                </div>

                                <div className="fem-field">
                                    <label className="fem-label">
                                        Subject <span className="fem-req">*</span>
                                    </label>
                                    <Input
                                        size="large"
                                        value={subject}
                                        maxLength={200}
                                        onChange={(event) => {
                                            subjectTouched.current = true;
                                            setSubject(event.target.value);
                                        }}
                                    />
                                </div>

                                <div className="fem-field">
                                    <div className="fem-label-row">
                                        <label className="fem-label">Greeting</label>
                                        {greetingName !== defaultGreeting && (
                                            <button
                                                type="button"
                                                className="fem-link-btn"
                                                onClick={() => {
                                                    greetingTouched.current = false;
                                                    setGreetingName(defaultGreeting);
                                                }}
                                            >
                                                <i className="bi bi-arrow-counterclockwise me-1"></i>
                                                Reset
                                            </button>
                                        )}
                                    </div>
                                    <Input
                                        size="large"
                                        prefix={<span className="fem-prefix-text">Dear</span>}
                                        placeholder="Customer"
                                        value={greetingName}
                                        maxLength={150}
                                        onChange={(event) => {
                                            greetingTouched.current = true;
                                            setGreetingName(event.target.value);
                                        }}
                                    />
                                    <div className="fem-hint">The person the email opens with.</div>
                                </div>

                                <div className="fem-field">
                                    <div className="fem-label-row">
                                        <label className="fem-label">
                                            Message <span className="fem-req">*</span>
                                        </label>
                                        {body !== defaultMessage && (
                                            <button
                                                type="button"
                                                className="fem-link-btn"
                                                onClick={() => {
                                                    bodyTouched.current = false;
                                                    setBody(defaultMessage);
                                                }}
                                            >
                                                <i className="bi bi-arrow-counterclockwise me-1"></i>
                                                Reset
                                            </button>
                                        )}
                                    </div>
                                    <Input.TextArea
                                        value={body}
                                        autoSize={{ minRows: 5, maxRows: 12 }}
                                        maxLength={2000}
                                        onChange={(event) => {
                                            bodyTouched.current = true;
                                            setBody(event.target.value);
                                        }}
                                    />
                                    <div className="fem-hint">
                                        Goes between “Dear {greetingName.trim() || "Customer"},”
                                        and the feedback button. A blank line starts a new paragraph.
                                    </div>
                                </div>

                                <div className="fem-field">
                                    <div className="fem-label-row">
                                        <label className="fem-label">
                                            Attachments <span className="fem-optional">optional</span>
                                        </label>
                                        {files.length > 0 && (
                                            <span className="fem-hint m-0">
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
                                        className="fem-drop"
                                    >
                                        <div className="fem-drop-inner">
                                            <i className="bi bi-paperclip"></i>
                                            <div>
                                                <strong>Drop files or images here</strong>, or click to
                                                browse
                                                <div className="fem-hint m-0">
                                                    Up to {MAX_FILE_MB} MB each
                                                </div>
                                            </div>
                                        </div>
                                    </Upload.Dragger>
                                </div>

                                <div className="fem-linkbox">
                                    <div className="min-w-0">
                                        <div className="fem-label m-0">Feedback link in this email</div>
                                        <code>{feedbackUrl || "—"}</code>
                                    </div>
                                    <div className="d-flex gap-1">
                                        <Button size="small" onClick={copyLink} disabled={!feedbackUrl}>
                                            <i className="bi bi-clipboard"></i>
                                        </Button>
                                        <Button
                                            size="small"
                                            disabled={!feedbackUrl}
                                            onClick={() => window.open(feedbackUrl, "_blank", "noopener")}
                                        >
                                            <i className="bi bi-box-arrow-up-right"></i>
                                        </Button>
                                    </div>
                                </div>

                                <Button
                                    type="primary"
                                    size="large"
                                    block
                                    className="fem-btn-send"
                                    onClick={openPreview}
                                >
                                    <i className="bi bi-eye me-2"></i>
                                    Preview &amp; send
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* ---------------- Live preview ---------------- */}

                    <div className="col-12 col-xl-7">
                        <div className="fem-card fem-sticky">
                            <div className="fem-card-head">
                                <span className="fem-badge violet">
                                    <i className="bi bi-phone text-white"></i>
                                </span>
                                <div className="flex-grow-1">
                                    <h3 className="fem-title">What the customer will receive</h3>
                                    <div className="fem-sub">Updates as you type.</div>
                                </div>
                                <span className="fem-live">
                                    <i></i>Live
                                </span>
                            </div>

                            <div className="fem-card-body fem-preview-body">
                                {mailView(liveHtml, "Email preview")}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ---------------- Final check ---------------- */}

            <Modal
                open={previewOpen}
                onCancel={() => !sending && setPreviewOpen(false)}
                width={780}
                centered
                destroyOnHidden
                className="fem-modal"
                title={
                    <div className="fem-modal-title">
                        <span className="fem-badge">
                            <i className="bi bi-send text-white"></i>
                        </span>
                        <div>
                            <div>Ready to send?</div>
                            <div className="fem-sub">
                                This is exactly what {customerName || "the customer"} will receive.
                            </div>
                        </div>
                    </div>
                }
                footer={
                    <div className="fem-modal-foot">
                        <Button
                            size="large"
                            className="fem-btn-ghost"
                            disabled={sending}
                            onClick={() => setPreviewOpen(false)}
                        >
                            <i className="bi bi-pencil me-2"></i>
                            Back to edit
                        </Button>
                        <Button
                            size="large"
                            type="primary"
                            className="fem-btn-send"
                            loading={sending}
                            onClick={handleSend}
                        >
                            {!sending && <i className="bi bi-send-fill me-2"></i>}
                            {sending ? "Sending…" : "Send email"}
                        </Button>
                    </div>
                }
            >
                <div className="fem-modal-body">{mailView(html, "Email to send")}</div>
            </Modal>

            <style>{styles}</style>
        </>
    );
}

const styles = `
    .fem-card {
        background: #ffffff;
        border: 1px solid #e8eef5;
        border-radius: 18px;
        box-shadow: 0 6px 22px rgba(18, 38, 63, .05);
    }

    .fem-sticky { position: sticky; top: 90px; }

    .fem-card-head {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 18px 22px;
        border-bottom: 1px solid #eef2f7;
    }

    .fem-card-body { padding: 20px 22px 22px; }

    .fem-badge {
        flex: 0 0 auto;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        border-radius: 12px;
        font-size: 17px;
        background: linear-gradient(135deg, #0271ae, #0a94d6);
        box-shadow: 0 8px 18px rgba(2, 113, 174, .25);
    }

    .fem-badge.violet {
        background: linear-gradient(135deg, #7c3aed, #a855f7);
        box-shadow: 0 8px 18px rgba(124, 58, 237, .25);
    }

    .fem-title { margin: 0; font-size: 16px; font-weight: 800; color: #12263f; }

    .fem-sub { font-size: 12.5px; font-weight: 400; color: #7b8a9c; }

    .fem-field { margin-bottom: 16px; }

    .fem-label {
        display: block;
        margin-bottom: 6px;
        font-size: 12.5px;
        font-weight: 700;
        color: #46566a;
    }

    .fem-label-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        margin-bottom: 6px;
    }

    .fem-label-row .fem-label { margin: 0; }

    .fem-req { color: #ef4444; }

    .fem-optional {
        margin-left: 4px;
        padding: 1px 7px;
        border-radius: 20px;
        background: #f1f5f9;
        font-size: 10.5px;
        font-weight: 600;
        color: #7b8a9c;
    }

    .fem-hint { margin-top: 6px; font-size: 11.5px; color: #8a98a8; }

    .fem-error { margin-top: 5px; font-size: 12px; color: #dc2626; }

    .fem-prefix { color: #9aa6b4; }

    .fem-prefix-text {
        padding-right: 8px;
        margin-right: 2px;
        border-right: 1px solid #e3e9f0;
        color: #7b8a9c;
        font-weight: 600;
    }

    .fem-note {
        display: flex;
        gap: 10px;
        margin-bottom: 16px;
        padding: 11px 13px;
        border-radius: 12px;
        background: #e8f4fc;
        border: 1px solid #c9e3f6;
        font-size: 12.5px;
        color: #02568a;
    }

    .fem-note .bi { font-size: 16px; line-height: 1.2; }

    .fem-static {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 13px;
        border-radius: 10px;
        background: #f5f9fd;
        border: 1px solid #e1ecf6;
        font-size: 14px;
        color: #46566a;
    }

    .fem-static .bi { color: #10b981; }

    .fem-tag {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        margin: 2px 4px 2px 0;
        padding: 2px 4px 2px 10px;
        border-radius: 20px;
        background: #e8f4fc;
        border: 1px solid #c9e3f6;
        font-size: 12.5px;
        color: #02568a;
    }

    .fem-tag.bad { background: #fef2f2; border-color: #fecaca; color: #b91c1c; }

    .fem-tag button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 18px;
        height: 18px;
        padding: 0;
        border: none;
        border-radius: 50%;
        background: transparent;
        color: inherit;
        cursor: pointer;
    }

    .fem-tag button:hover { background: rgba(0, 0, 0, .08); }

    .fem-link-btn {
        padding: 0;
        border: none;
        background: none;
        font-size: 12px;
        font-weight: 600;
        color: #0271ae;
        cursor: pointer;
    }

    .fem-drop.ant-upload-wrapper .ant-upload-drag {
        border-radius: 12px;
        border-color: #c9dcee;
        background: #f8fbfe;
        transition: all .18s ease;
    }

    .fem-drop.ant-upload-wrapper .ant-upload-drag:hover { border-color: #0a94d6; background: #f0f8fe; }

    .fem-drop.ant-upload-wrapper .ant-upload-drag .ant-upload-btn { padding: 14px 16px; }

    .fem-drop-inner {
        display: flex;
        align-items: center;
        gap: 12px;
        text-align: left;
        font-size: 13px;
        color: #46566a;
    }

    .fem-drop-inner > .bi {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex: 0 0 auto;
        width: 38px;
        height: 38px;
        border-radius: 10px;
        background: #e8f4fc;
        color: #0271ae;
        font-size: 18px;
    }

    .fem-linkbox {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        margin: 4px 0 18px;
        padding: 11px 13px;
        border-radius: 12px;
        background: #f0fdf7;
        border: 1px solid #c6f0dd;
    }

    .fem-linkbox code {
        display: block;
        margin-top: 2px;
        font-size: 12.5px;
        color: #047857;
        background: none;
        padding: 0;
        word-break: break-all;
    }

    .fem-btn-send {
        height: 46px;
        border: none;
        border-radius: 12px;
        font-weight: 700;
        background: linear-gradient(135deg, #0271ae, #0a94d6) !important;
        box-shadow: 0 12px 24px rgba(2, 113, 174, .28);
    }

    .fem-btn-send:hover:not(:disabled) { filter: brightness(1.07); }

    .fem-btn-ghost {
        height: 42px;
        border-radius: 11px;
        font-weight: 600;
        border-color: #dfe6ef;
        color: #46566a;
    }

    .fem-live {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 10px;
        border-radius: 20px;
        background: #ecfdf5;
        font-size: 11.5px;
        font-weight: 700;
        color: #059669;
    }

    .fem-live i {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: #10b981;
        animation: femPulse 1.6s ease-in-out infinite;
    }

    @keyframes femPulse {
        0%, 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, .5); }
        50%      { box-shadow: 0 0 0 5px rgba(16, 185, 129, 0); }
    }

    .fem-preview-body { padding: 16px; background: #f6f8fb; border-radius: 0 0 18px 18px; }

    /* ---- Mail client chrome ---- */

    .fem-mail {
        overflow: hidden;
        background: #ffffff;
        border: 1px solid #e3e9f0;
        border-radius: 14px;
    }

    .fem-mail-head { padding: 16px 18px 14px; border-bottom: 1px solid #eef2f7; }

    .fem-mail-subject { font-size: 17px; font-weight: 700; color: #12263f; line-height: 1.35; }

    .fem-mail-from { display: flex; align-items: center; gap: 10px; margin-top: 12px; }

    .fem-mail-avatar {
        flex: 0 0 auto;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 38px;
        height: 38px;
        border-radius: 50%;
        background: linear-gradient(135deg, #0271ae, #0a94d6);
        color: #ffffff;
        font-size: 11.5px;
        font-weight: 800;
        letter-spacing: .5px;
    }

    .fem-mail-who { flex: 1 1 auto; min-width: 0; font-size: 13px; color: #12263f; line-height: 1.45; }

    .fem-mail-who > div { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    .fem-muted { color: #8a98a8; font-weight: 400; }

    .fem-mail-time { font-size: 12px; }

    .fem-mail-atts { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }

    .fem-att {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        max-width: 240px;
        padding: 6px 11px;
        border-radius: 10px;
        border: 1px solid #e3e9f0;
        background: #f8fafc;
        font-size: 12px;
    }

    .fem-att .bi { font-size: 15px; color: #0271ae; }

    .fem-att-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #12263f; font-weight: 600; }

    .fem-frame { display: block; width: 100%; border: 0; background: #eef3f8; }

    /* ---- Sent / closed ---- */

    .fem-sent {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 22px 24px;
        background: #ffffff;
        border: 1px solid #a7f3d0;
        border-radius: 18px;
        box-shadow: 0 10px 30px rgba(5, 150, 105, .08);
        animation: femIn .35s ease both;
    }

    .fem-sent-actions { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; }

    .fem-btn-send.fem-btn-sm { height: 42px; border-radius: 11px; }

    .fem-sent h3 { margin: 0; font-size: 17px; font-weight: 800; color: #065f46; }

    .fem-sent p { margin: 3px 0 0; font-size: 13.5px; color: #047857; word-break: break-word; }

    .fem-state {
        padding: 38px 28px;
        text-align: center;
        background: #ffffff;
        border: 1px solid #e8eef5;
        border-radius: 18px;
    }

    .fem-state h3 { margin: 12px 0 4px; font-size: 18px; font-weight: 800; color: #12263f; }

    .fem-state p { margin: 0; font-size: 13.5px; color: #6b7a8d; }

    .fem-state-icon {
        flex: 0 0 auto;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 54px;
        height: 54px;
        border-radius: 50%;
        background: #10b981;
        color: #ffffff;
        font-size: 23px;
        box-shadow: 0 10px 22px rgba(16, 185, 129, .3);
    }

    .fem-state-icon.locked { background: #94a3b8; box-shadow: 0 10px 22px rgba(100, 116, 139, .25); }

    @keyframes femIn {
        from { opacity: 0; transform: translateY(8px); }
        to   { opacity: 1; transform: none; }
    }

    /* ---- Final check modal ---- */

    .fem-modal .ant-modal-container { padding: 0; border-radius: 18px; overflow: hidden; }

    .fem-modal .ant-modal-header { margin: 0; padding: 18px 22px; border-bottom: 1px solid #eef2f7; }

    .fem-modal-title { display: flex; align-items: center; gap: 12px; font-size: 16px; font-weight: 800; color: #12263f; }

    .fem-modal-body { max-height: 66vh; overflow-y: auto; padding: 16px; background: #f6f8fb; }

    .fem-modal .ant-modal-footer { margin: 0; padding: 14px 22px; border-top: 1px solid #eef2f7; }

    .fem-modal-foot { display: flex; justify-content: flex-end; gap: 10px; flex-wrap: wrap; }

    @media (max-width: 1199.98px) {
        .fem-sticky { position: static; }
    }

    @media (max-width: 575.98px) {
        .fem-card-head, .fem-card-body { padding-left: 16px; padding-right: 16px; }
        .fem-preview-body, .fem-modal-body { padding: 8px; }
        .fem-sent { flex-direction: column; text-align: center; }
        .fem-modal-foot .ant-btn { flex: 1 1 auto; }
    }
`;