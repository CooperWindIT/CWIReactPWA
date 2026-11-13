import React, { useCallback, useEffect, useRef, useState } from "react";
import { getComments, addComment } from "../services/services";
import "./CommentsModal.css";

/**
 * Comments / chat popup for an outward (or any IOM record).
 * GET  IIM/GetIOMcomments?Id=<recordId>&OrgId=<orgId>
 * POST Portal/AddNewComments    { OrgId, Priority, UserId, CommentType: "IOM", JsonData: { CommentText, TablePrimaryId, ToEmails, CommentId: 0 } }
 *
 * My comments (CommentedBy === logged-in user Id) on the right, others on the left.
 *
 * <CommentsModal show recordId={outwardId} title="OUT-1009" orgId userId onClose onCountChange />   // popup
 * <CommentsModal inline recordId={outwardId} title="OUT-1009" orgId userId onCountChange />           // panel on the page
 */

const initialsOf = (name) => String(name || "?").split(/\s+/).filter(Boolean).map(w => w[0]).join("").slice(0, 2).toUpperCase();

const dayLabel = (d) => {
    const today = new Date();
    const y = new Date(); y.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return "Today";
    if (d.toDateString() === y.toDateString()) return "Yesterday";
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};
const timeLabel = (d) => d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

// avatar colour per user (stable)
const COLORS = ["#2f5bea", "#e8590c", "#12805c", "#7c3aed", "#0e7490", "#be185d"];
const colorOf = (id) => COLORS[Math.abs(Number(id) || 0) % COLORS.length];

const MAX_LEN = 1000;

const CommentsModal = ({ show: showProp, inline = false, recordId, title, orgId, userId, onClose, onCountChange, theme = "ow" }) => {
    const show = inline || showProp;
    const [list, setList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [text, setText] = useState("");
    const [sending, setSending] = useState(false);
    const [sendError, setSendError] = useState("");
    const bodyRef = useRef(null);
    const inputRef = useRef(null);

    const scrollDown = () => setTimeout(() => {
        if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }, 30);

    const load = useCallback(async () => {
        if (!orgId || !recordId) return;
        setLoading(true);
        setError("");
        try {
            const res = await getComments({ orgId, requestId: recordId });
            const result = String(res?.result || "").toLowerCase();
            if (res?.status === 200 && (result === "success" || result === "not found")) {
                const data = Array.isArray(res?.data) ? res.data : [];
                data.sort((a, b) => new Date(a.CommentedOn) - new Date(b.CommentedOn));
                setList(data);
                onCountChange?.(data.length);
                scrollDown();
            } else {
                setError(res?.response || res?.message || "Unable to load comments");
            }
        } catch (err) {
            console.error("GetIOMcomments Error:", err);
            setError("Unable to load comments");
        } finally {
            setLoading(false);
        }
    }, [orgId, recordId, onCountChange]);

    useEffect(() => {
        if (!show) return;
        setText("");
        setSendError("");
        load();
        if (!inline) setTimeout(() => inputRef.current?.focus(), 80);   // panel: don't steal focus on page load
    }, [show, load, inline]);

    useEffect(() => {
        if (!show || inline) return;
        const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [show, onClose, inline]);

    const send = async () => {
        const msg = text.trim();
        if (!msg || sending) return;
        setSending(true);
        setSendError("");
        try {
            const res = await addComment({ orgId, userId, tablePrimaryId: recordId, text: msg });
            const ok = (res?.status === 200 && String(res?.result).toLowerCase() === "success") || res?.success === true;
            if (!ok) {
                setSendError(res?.response || res?.message || "Comment not sent. Please try again.");
                return;
            }
            setText("");
            await load();
            inputRef.current?.focus();
        } catch (err) {
            console.error("AddNewComments Error:", err);
            setSendError("Comment not sent. Please try again.");
        } finally {
            setSending(false);
        }
    };

    if (!show) return null;

    // group by day
    let lastDay = "";

    const panel = (
            <div className={`cm-modal cm-${theme} ${inline ? "cm-inline" : ""}`} role={inline ? "region" : "dialog"} aria-modal={inline ? undefined : "true"} aria-label="Comments">
                {/* HEAD */}
                <div className="cm-head">
                    <span className="cm-head-icon"><i className="fa-regular fa-comments" /></span>
                    <div className="cm-head-text">
                        <h4>Comments</h4>
                        <p>{title}{!loading && ` · ${list.length} comment${list.length === 1 ? "" : "s"}`}</p>
                    </div>
                    <button type="button" className="cm-icon-btn" onClick={load} disabled={loading} title="Refresh">
                        <i className={`fa-solid fa-rotate-right ${loading ? "fa-spin" : ""}`} />
                    </button>
                    {!inline && (
                        <button type="button" className="cm-icon-btn" onClick={onClose} title="Close (Esc)">
                            <i className="fa-solid fa-xmark" />
                        </button>
                    )}
                </div>

                {/* MESSAGES */}
                <div className="cm-body" ref={bodyRef}>
                    {loading && !list.length ? (
                        <div className="cm-skel-wrap">
                            {[0, 1, 2].map(i => <div key={i} className={`cm-skel ${i % 2 ? "me" : ""}`} />)}
                        </div>
                    ) : error ? (
                        <div className="cm-error">
                            <i className="fa-solid fa-circle-exclamation" />
                            <span>{error}</span>
                            <button type="button" onClick={load}>Try again</button>
                        </div>
                    ) : !list.length ? (
                        <div className="cm-empty">
                            <span><i className="fa-regular fa-comment-dots" /></span>
                            <b>No comments yet</b>
                            <small>Start the conversation about {title}.</small>
                        </div>
                    ) : list.map(c => {
                        const mine = String(c.CommentedBy) === String(userId);
                        const d = new Date(c.CommentedOn);
                        const valid = !isNaN(d);
                        const day = valid ? dayLabel(d) : "";
                        const showDay = day && day !== lastDay;
                        lastDay = day || lastDay;
                        return (
                            <React.Fragment key={c.Id}>
                                {showDay && <div className="cm-day"><span>{day}</span></div>}
                                <div className={`cm-row ${mine ? "me" : "them"}`}>
                                    {!mine && (
                                        <span className="cm-avatar" style={{ background: colorOf(c.CommentedBy) }} title={c.CommentedByEmail || ""}>
                                            {initialsOf(c.CommentedUser)}
                                        </span>
                                    )}
                                    <div className="cm-bubble">
                                        {!mine && <b className="cm-name">{c.CommentedUser || "User"}</b>}
                                        <div className="cm-text">{c.CommentText}</div>
                                        <small className="cm-time">{valid ? timeLabel(d) : ""}{mine && <i className="fa-solid fa-check-double" />}</small>
                                    </div>
                                </div>
                            </React.Fragment>
                        );
                    })}
                </div>

                {/* COMPOSER */}
                <div className="cm-foot">
                    {sendError && <div className="cm-send-error"><i className="fa-solid fa-triangle-exclamation" /> {sendError}</div>}
                    <div className="cm-compose">
                        <textarea
                            ref={inputRef}
                            rows={1}
                            value={text}
                            maxLength={MAX_LEN}
                            placeholder="Write a comment…"
                            onChange={(e) => setText(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
                            }}
                        />
                        <button type="button" className="cm-send" onClick={send} disabled={!text.trim() || sending} title="Send (Enter)">
                            {sending ? <span className="spinner-border spinner-border-sm" /> : <i className="fa-solid fa-paper-plane" />}
                        </button>
                    </div>
                    <small className="cm-hint">Enter to send · Shift + Enter for a new line</small>
                </div>
            </div>
    );

    if (inline) return panel;

    return (
        <div className="cm-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
            {panel}
        </div>
    );
};

export default CommentsModal;