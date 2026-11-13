// =============================================================
// Feedback Comments — the team's thread on one feedback request
//
// Path: src/Components/CFM/pages/FeedbackComments.jsx
//
// Used by the View screen (ViewFeedbackRequest) in its "Comments" tab.
// Other people's comments sit on the left, yours on the right, with a box
// at the bottom for a new one.
//
// Tagging: type "@" (or use the "@ Tag" button) and pick a manager. Their
// emails go in ToEmails, comma separated, so they're notified.
//
// SERVICES (RequestId / TablePrimaryId = the feedback request id)
//   List      CFM/GetComments          { OrgId, JsonData: { RequestId } }
//   Add       Portal/AddNewComments    { OrgId, Priority, UserId, CommentType,
//                                        JsonData: { CommentText, TablePrimaryId,
//                                                    ToEmails, CommentId: 0 } }
//   Managers  AdminRoutes/getManagers?OrgId=   -> ResultData [{ Id, Name, Email }]
// =============================================================

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Dropdown, Mentions, Spin, Tooltip, message } from "antd";

import { fetchWithAuth } from "../../../utils/api";
import { readRows } from "../Services/cfmServices";
import { BASE_API } from "../../Config/Config";

export const COMMENT_TYPE = "FeedbackTool";
const ADD_COMMENT_ENDPOINT = "Portal/AddNewComments";
const COMMENTS_LIST_ENDPOINT = "CFM/GetComments";

const MAX_COMMENT = 1000;

// -------------------------------------------------------------
// Helpers
// -------------------------------------------------------------

const escapeRegExp = (text) => String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// "@Name" in the text, not followed by more of a word ("@Manager1" must not
// match inside "@Manager12"). A full stop or comma after the name is fine.
const mentionPattern = (name) => new RegExp(`@${escapeRegExp(name)}(?![\\w-])`, "i");

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

const asDate = (at) => {
    const date = new Date(at);
    return Number.isNaN(date.getTime()) ? null : date;
};

const timeOf = (at) =>
    asDate(at)?.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }) || "";

const dayOf = (at) => {
    const date = asDate(at);
    if (!date) return "";

    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
    return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

// Who "me" is, so my comments line up on the right.
export const meOf = (sessionUserData = {}) => ({
    id: sessionUserData?.Id ?? sessionUserData?.UserId ?? "me",
    name:
        sessionUserData?.Name ||
        sessionUserData?.UserName ||
        [sessionUserData?.FirstName, sessionUserData?.LastName].filter(Boolean).join(" ") ||
        "You",
    email: sessionUserData?.Email || sessionUserData?.EmailId || "",
});

// The database sends its own local time with a "Z" on the end, the comment
// shows 5½ hours late (IST). If that happens, set this to true and the time
// is read as it is written, without the UTC shift.
const SERVER_TIME_IS_LOCAL = false;

const readServerTime = (value) => {
    if (!value) return null;
    return SERVER_TIME_IS_LOCAL ? String(value).replace(/Z$/i, "") : value;
};

// One row from CFM/GetComments, in the shape the thread draws:
//   { Id, CommentText, CommentedOn, CommentedBy, CommentedUser, CommentedByEmail }
// Who was tagged isn't in the response — it's read from the "@Name"s in the
// text, matched against the manager list.
const toComment = (row, index) => ({
    id: row.Id ?? row.CommentId ?? `row-${index}`,
    authorId: row.CommentedBy ?? row.UserId ?? "",
    author: row.CommentedUser || row.UserName || "Team member",
    email: row.CommentedByEmail || "",
    text: row.CommentText ?? "",
    at: readServerTime(row.CommentedOn ?? row.CreatedOn),
});

// -------------------------------------------------------------
// Services
// -------------------------------------------------------------

export const getFeedbackComments = async ({ orgId, requestId }) => {
    const response = await fetchWithAuth(COMMENTS_LIST_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            OrgId: orgId,
            JsonData: { RequestId: Number(requestId) },
        }),
    });
    const result = await response.json();

    if (!response.ok) {
        throw new Error(result?.message || result?.Message || `GetComments failed (${response.status})`);
    }

    return readRows(result).map(toComment).sort(
        (a, b) => (asDate(a.at)?.getTime() || 0) - (asDate(b.at)?.getTime() || 0)
    );
};

// Managers who can be tagged. Fetched once per organisation and kept.
const managerCache = new Map();

export const getManagers = async (orgId) => {
    const key = String(orgId);
    if (managerCache.has(key)) return managerCache.get(key);

    const request = fetch(`${BASE_API}AdminRoutes/getManagers?OrgId=${orgId}`)
        .then(async (response) => {
            if (!response.ok) throw new Error(response.statusText || `HTTP ${response.status}`);
            const data = await response.json();

            return (Array.isArray(data?.ResultData) ? data.ResultData : readRows(data))
                .filter((row) => row && row.IsActive !== false && row.Name)
                .map((row) => ({
                    id: row.Id,
                    name: String(row.Name).trim(),
                    email: String(row.Email || "").trim(),
                    empNo: row.EmpNo || "",
                }));
        })
        .catch((error) => {
            console.error("getManagers failed:", error.message);
            managerCache.delete(key);
            return [];
        });

    managerCache.set(key, request);
    return request;
};

export const addFeedbackComment = async ({ sessionUserData, requestId, text, toEmails = [] }) => {
    const payload = {
        OrgId: sessionUserData.OrgId,
        Priority: 1,
        UserId: sessionUserData.Id,
        CommentType: COMMENT_TYPE,
        JsonData: {
            CommentText: text,
            TablePrimaryId: Number(requestId),
            ToEmails: toEmails.join(","),
            CommentId: 0,
        },
    };

    const response = await fetchWithAuth(ADD_COMMENT_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });

    const result = await response.json().catch(() => ({}));

    return {
        ok: Boolean(response.ok && result?.success),
        message: result?.message || result?.Message || "",
        result,
    };
};

// -------------------------------------------------------------
// Hook — the thread for one request, shared by the tab label (count) and
// the panel itself.
// -------------------------------------------------------------

// Lines like "You emailed …" after a reply goes out. They aren't comments,
// so they're kept per request for this session and merged into the list.
const sessionNotes = new Map();

const byTime = (a, b) => (asDate(a.at)?.getTime() || 0) - (asDate(b.at)?.getTime() || 0);

export function useFeedbackComments({ requestId, sessionUserData = {} }) {
    const me = useMemo(
        () => meOf(sessionUserData),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [sessionUserData?.Id, sessionUserData?.UserId, sessionUserData?.Name]
    );

    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const orgId = sessionUserData?.OrgId;
    const notesOf = () => sessionNotes.get(String(requestId)) || [];

    const reload = useCallback(async () => {
        if (!requestId || !orgId) return;

        try {
            setLoading(true);
            setError("");
            const list = await getFeedbackComments({ orgId, requestId });
            setComments([...list, ...notesOf()].sort(byTime));
        } catch (err) {
            console.error("GetComments failed:", err);
            setError("Couldn't load the comments.");
        } finally {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [requestId, orgId]);

    useEffect(() => {
        reload();
    }, [reload]);

    const post = async (text, toEmails = []) => {
        const res = await addFeedbackComment({ sessionUserData, requestId, text, toEmails });
        if (res.ok) await reload();
        return res;
    };

    // A line in the thread about something that happened (e.g. reply emailed).
    // Shown on this screen only; it isn't saved as a comment.
    const note = (entry) => {
        const line = {
            id: `sys-${Date.now()}`,
            system: true,
            authorId: me.id,
            author: me.name,
            at: Date.now(),
            ...entry,
        };
        sessionNotes.set(String(requestId), [...notesOf(), line]);
        setComments((prev) => [...prev, line]);
    };

    const count = comments.filter((comment) => !comment.system).length;

    return { me, orgId, comments, count, loading, error, reload, post, note };
}

// =============================================================
// PANEL
// =============================================================

export default function FeedbackComments({ thread, active = true, requestId }) {
    const { me, orgId, comments, loading, error, reload, post } = thread;

    const [draft, setDraft] = useState("");
    const [posting, setPosting] = useState(false);
    const [managers, setManagers] = useState([]);
    const threadRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        if (!orgId) return undefined;
        let alive = true;
        getManagers(orgId).then((list) => alive && setManagers(list));
        return () => {
            alive = false;
        };
    }, [orgId]);

    // Newest at the bottom, in view.
    useEffect(() => {
        if (!active) return;
        const el = threadRef.current;
        if (el) requestAnimationFrame(() => (el.scrollTop = el.scrollHeight));
    }, [comments.length, active]);

    // Anyone but me can be tagged.
    const taggable = useMemo(
        () => managers.filter((m) => String(m.id) !== String(me.id)),
        [managers, me.id]
    );

    // Who is tagged = whose "@Name" is still in the text. Deleting the name
    // from the comment un-tags them.
    const tagged = useMemo(
        () => taggable.filter((m) => mentionPattern(m.name).test(draft)),
        [taggable, draft]
    );

    const mentionOptions = taggable.map((m) => ({
        key: String(m.id),
        value: m.name,
        label: (
            <div className="fcp-option">
                <span className="fcp-option-avatar" style={{ background: toneOf(m.name) }}>
                    {initialsOf(m.name)}
                </span>
                <span className="fcp-option-text">
                    <b>{m.name}</b>
                    <small>{m.email || "No email"}</small>
                </span>
            </div>
        ),
    }));

    const filterOption = (input, option) => {
        const text = String(input || "").toLowerCase();
        const m = taggable.find((item) => item.name === option.value);
        return (
            String(option.value).toLowerCase().includes(text) ||
            Boolean(m && (m.email.toLowerCase().includes(text) || String(m.empNo).toLowerCase().includes(text)))
        );
    };

    // "@ Tag" button: adds "@Name " at the end of the comment.
    const insertTag = (name) => {
        setDraft((prev) => {
            if (mentionPattern(name).test(prev)) return prev;
            const gap = prev && !/\s$/.test(prev) ? " " : "";
            return `${prev}${gap}@${name} `;
        });
        setTimeout(() => inputRef.current?.focus?.(), 0);
    };

    const removeTag = (name) =>
        setDraft((prev) =>
            prev
                .replace(new RegExp(`@${escapeRegExp(name)}(?![\\w-])\\s?`, "gi"), "")
                .replace(/ {2,}/g, " ")
        );

    const handleSubmit = async () => {
        const plainTextContent = draft.trim();

        if (!plainTextContent) {
            message.warning("Please write a comment first.");
            return;
        }
        if (!requestId) {
            message.error("This request has no id yet — the comment can't be saved.");
            return;
        }

        const mentionedEmails = [...new Set(tagged.map((m) => m.email).filter(Boolean))];

        try {
            setPosting(true);

            const res = await post(plainTextContent, mentionedEmails);

            if (res.ok) {
                message.success("Comment submitted successfully!");
                setDraft("");
            } else {
                message.error(res.message || "Failed to submit comment. Please try again.");
            }
        } catch (err) {
            console.error("AddNewComments failed:", err);
            message.error("Something went wrong while submitting the comment.");
        } finally {
            setPosting(false);
        }
    };

    // Managers named with "@Name" in a comment = the people it tagged.
    // In the order they appear in the text.
    const tagsOf = (comment) =>
        comment.text.includes("@")
            ? managers
                  .map((m) => ({ ...m, at: comment.text.search(mentionPattern(m.name)) }))
                  .filter((m) => m.at >= 0)
                  .sort((a, b) => a.at - b.at)
            : [];

    // Longest first, so "@Ravi Kumar" wins over "@Ravi".
    const managerNames = useMemo(
        () =>
            [...new Set(managers.map((m) => m.name).filter(Boolean))].sort(
                (a, b) => b.length - a.length
            ),
        [managers]
    );

    // The comment text with each "@Name" picked out. Known managers match
    // their full name (spaces included); any other "@word" is still marked.
    // An "@" inside an email address is left alone.
    const renderText = (comment) => {
        if (!comment.text.includes("@")) return comment.text;

        const known = managerNames.length
            ? `@(?:${managerNames.map(escapeRegExp).join("|")})(?![\\w-])|`
            : "";
        const pattern = new RegExp(`(?<![\\w.])(${known}@[\\w-]+(?:\\.[\\w-]+)*)`, "gi");

        return comment.text.split(pattern).map((part, i) =>
            i % 2 === 1 ? (
                <span key={i} className="fcp-mention">
                    {part}
                </span>
            ) : (
                part
            )
        );
    };

    let lastDay = "";

    return (
        <div className="fcp">
            <div className="fcp-thread" ref={threadRef}>
                {loading && !comments.length ? (
                    <div className="fcp-empty">
                        <Spin />
                    </div>
                ) : error ? (
                    <div className="fcp-empty">
                        <span className="fcp-empty-icon red">
                            <i className="bi bi-exclamation-octagon"></i>
                        </span>
                        <h5>{error}</h5>
                        <Button size="small" onClick={reload}>
                            Try again
                        </Button>
                    </div>
                ) : comments.length === 0 ? (
                    <div className="fcp-empty">
                        <span className="fcp-empty-icon">
                            <i className="bi bi-chat-square-dots"></i>
                        </span>
                        <h5>No comments yet</h5>
                        <p>
                            Start the conversation about this request — type @ to tag a manager.
                        </p>
                    </div>
                ) : (
                    comments.map((comment) => {
                        const day = dayOf(comment.at);
                        const showDay = day && day !== lastDay;
                        if (day) lastDay = day;

                        const mine = !comment.system && String(comment.authorId) === String(me.id);

                        return (
                            <React.Fragment key={comment.id}>
                                {showDay && (
                                    <div className="fcp-day">
                                        <span>{day}</span>
                                    </div>
                                )}

                                {comment.system ? (
                                    <div className="fcp-system">
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
                                    <div className={`fcp-msg ${mine ? "mine" : "theirs"}`}>
                                        {!mine && (
                                            <span
                                                className="fcp-avatar"
                                                style={{ background: toneOf(comment.author) }}
                                            >
                                                {initialsOf(comment.author)}
                                            </span>
                                        )}

                                        <div className="fcp-bubble-wrap">
                                            <div className="fcp-meta">
                                                <Tooltip title={comment.email || ""}>
                                                    <strong>{mine ? "You" : comment.author}</strong>
                                                </Tooltip>
                                                {!mine && comment.role && <span>{comment.role}</span>}
                                                <em>{timeOf(comment.at)}</em>
                                            </div>
                                            <div className="fcp-bubble">{renderText(comment)}</div>
                                            {tagsOf(comment).length > 0 && (
                                                <div className="fcp-tagged">
                                                    <i className="bi bi-at"></i>
                                                    {tagsOf(comment).map((tag) => (
                                                        <Tooltip key={tag.id} title={tag.email}>
                                                            <span className="fcp-tagged-chip">{tag.name}</span>
                                                        </Tooltip>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {mine && (
                                            <span className="fcp-avatar me">{initialsOf(me.name)}</span>
                                        )}
                                    </div>
                                )}
                            </React.Fragment>
                        );
                    })
                )}
            </div>

            <div className="fcp-composer">
                {tagged.length > 0 && (
                    <div className="fcp-tagging">
                        <span className="fcp-tagging-label">
                            <i className="bi bi-bell me-1"></i>
                            Notifying
                        </span>
                        {tagged.map((m) => (
                            <Tooltip key={m.id} title={m.email || "No email — won't be notified"}>
                                <span className={`fcp-tag ${m.email ? "" : "no-email"}`}>
                                    @{m.name}
                                    <button
                                        type="button"
                                        aria-label={`Remove ${m.name}`}
                                        onClick={() => removeTag(m.name)}
                                    >
                                        <i className="bi bi-x"></i>
                                    </button>
                                </span>
                            </Tooltip>
                        ))}
                    </div>
                )}

                <Mentions
                    ref={inputRef}
                    className="fcp-mentions"
                    value={draft}
                    onChange={setDraft}
                    prefix="@"
                    placement="top"
                    options={mentionOptions}
                    filterOption={filterOption}
                    notFoundContent={managers.length ? "No manager matches" : "Loading managers…"}
                    onKeyDown={(event) => {
                        if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
                            event.preventDefault();
                            handleSubmit();
                        }
                    }}
                    autoSize={{ minRows: 2, maxRows: 5 }}
                    maxLength={MAX_COMMENT}
                    placeholder="Write a comment… type @ to tag a manager"
                    disabled={posting}
                    popupClassName="fcp-mentions-popup"
                />

                <div className="fcp-composer-foot">
                    <Dropdown
                        trigger={["click"]}
                        placement="topLeft"
                        disabled={!taggable.length || posting}
                        overlayClassName="fcp-tag-menu"
                        menu={{
                            items: taggable.map((m) => ({
                                key: String(m.id),
                                label: (
                                    <div className="fcp-option">
                                        <span
                                            className="fcp-option-avatar"
                                            style={{ background: toneOf(m.name) }}
                                        >
                                            {initialsOf(m.name)}
                                        </span>
                                        <span className="fcp-option-text">
                                            <b>{m.name}</b>
                                            <small>{m.email || "No email"}</small>
                                        </span>
                                        {tagged.some((t) => t.id === m.id) && (
                                            <i className="bi bi-check-lg fcp-option-check"></i>
                                        )}
                                    </div>
                                ),
                            })),
                            onClick: ({ key }) => {
                                const m = taggable.find((item) => String(item.id) === key);
                                if (m) insertTag(m.name);
                            },
                        }}
                    >
                        <button type="button" className={`fcp-tag-btn ${tagged.length ? "on" : ""}`}>
                            <i className="bi bi-at"></i>
                            Tag
                            {tagged.length > 0 && <b>{tagged.length}</b>}
                        </button>
                    </Dropdown>

                    <small className="fcp-hint">Ctrl + Enter to post</small>

                    <Button
                        type="primary"
                        className="fcp-btn-primary"
                        loading={posting}
                        disabled={!draft.trim()}
                        onClick={handleSubmit}
                    >
                        {!posting && <i className="bi bi-send-fill me-2 text-white"></i>}
                        Post
                    </Button>
                </div>
            </div>

            <style>{styles}</style>
        </div>
    );
}

// =============================================================
// STYLES
// =============================================================

const styles = `
    .fcp { height: 100%; min-height: 0; display: flex; flex-direction: column; background: #f6f9fc; }

    .fcp-thread {
        flex: 1 1 auto; min-height: 0; overflow-y: auto; overscroll-behavior: contain;
        padding: 10px 16px 14px;
    }
    .fcp-thread::-webkit-scrollbar { width: 6px; }
    .fcp-thread::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }

    .fcp-day { display: flex; justify-content: center; margin: 10px 0 14px; }
    .fcp-day span {
        padding: 3px 12px; border-radius: 999px; background: #e7edf4;
        font-size: 11.5px; font-weight: 700; color: #64748b;
    }

    .fcp-msg { display: flex; align-items: flex-end; gap: 9px; margin-bottom: 14px; }
    .fcp-msg.mine { justify-content: flex-end; }
    .fcp-avatar {
        width: 30px; height: 30px; flex: none; border-radius: 50%;
        display: grid; place-items: center; color: #ffffff; font-size: 11.5px; font-weight: 800;
    }
    .fcp-avatar.me { background: #0271ae; }
    .fcp-bubble-wrap { max-width: 80%; min-width: 0; display: flex; flex-direction: column; }
    .fcp-msg.mine .fcp-bubble-wrap { align-items: flex-end; }
    .fcp-meta { display: flex; align-items: baseline; gap: 7px; margin: 0 4px 4px; font-size: 12px; }
    .fcp-meta strong { color: #12263f; }
    .fcp-meta span { color: #8190a0; }
    .fcp-meta em { font-style: normal; color: #a3afbd; font-size: 11px; }
    .fcp-bubble {
        padding: 9px 13px; font-size: 13.5px; line-height: 1.55; white-space: pre-wrap;
        word-break: break-word; border-radius: 16px 16px 16px 4px;
        background: #ffffff; color: #1e293b; border: 1px solid #e6edf5;
        box-shadow: 0 2px 6px rgba(15, 23, 42, .04);
    }
    /* Mine: the same card, just a light blue tint and the tail on the right. */
    .fcp-msg.mine .fcp-bubble {
        border-radius: 16px 16px 4px 16px;
        background: #eef6fd; border-color: #d4e8f7;
    }
    .fcp-mention { font-weight: 700; color: #0271ae; background: #e8f4fc; border-radius: 5px; padding: 0 3px; }

    .fcp-tagged {
        display: flex; flex-wrap: wrap; align-items: center; gap: 4px; margin: 5px 4px 0;
        font-size: 11px; color: #8190a0;
    }
    .fcp-msg.mine .fcp-tagged { justify-content: flex-end; }
    .fcp-tagged-chip {
        padding: 1px 7px; border-radius: 999px; background: #eef2f7; color: #46566a; font-weight: 600;
    }

    .fcp-system {
        display: flex; align-items: flex-start; gap: 8px;
        margin: 0 auto 14px; max-width: 92%; padding: 8px 14px; border-radius: 12px;
        background: #ecfdf5; color: #047857; font-size: 12.5px; line-height: 1.5;
    }
    .fcp-system i { flex: none; margin-top: 2px; }
    .fcp-system span { flex: 1 1 auto; min-width: 0; word-break: break-word; }
    .fcp-system em { flex: none; margin-top: 1px; }
    .fcp-system em { font-style: normal; color: #6aa88f; font-size: 11px; white-space: nowrap; }

    .fcp-composer { flex: none; padding: 12px 16px 14px; background: #ffffff; border-top: 1px solid #e8eef5; }
    .fcp-composer textarea { border-radius: 12px; font-size: 13.5px; }
    .fcp-mentions { border-radius: 12px; font-size: 13.5px; }
    .fcp-mentions textarea { font-size: 13.5px; }

    .fcp-tagging { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-bottom: 8px; }
    .fcp-tagging-label { font-size: 11.5px; font-weight: 600; color: #8190a0; }
    .fcp-tag {
        display: inline-flex; align-items: center; gap: 2px; padding: 2px 4px 2px 9px; border-radius: 999px;
        background: #e8f4fc; color: #0271ae; font-size: 12px; font-weight: 700;
    }
    .fcp-tag.no-email { background: #fff4e5; color: #b45309; }
    .fcp-tag button {
        display: inline-grid; place-items: center; width: 18px; height: 18px; padding: 0;
        border: 0; border-radius: 50%; background: transparent; color: inherit; cursor: pointer;
    }
    .fcp-tag button:hover { background: rgba(2, 113, 174, .14); }

    .fcp-composer-foot { display: flex; align-items: center; gap: 10px; margin-top: 10px; }
    .fcp-hint { margin-left: auto; color: #9aa6b4; font-size: 11.5px; }

    .fcp-tag-btn {
        display: inline-flex; align-items: center; gap: 5px; height: 32px; padding: 0 11px;
        border-radius: 9px; border: 1px solid #e3e9f1; background: #ffffff;
        font-size: 12.5px; font-weight: 600; color: #46566a; cursor: pointer; transition: all .15s ease;
    }
    .fcp-tag-btn .bi { font-size: 15px; }
    .fcp-tag-btn:hover, .fcp-tag-btn.on { border-color: #0271ae; color: #0271ae; background: #f1f8fd; }
    .fcp-tag-btn b {
        min-width: 18px; height: 18px; padding: 0 5px; border-radius: 999px;
        display: inline-grid; place-items: center; background: #0271ae; color: #ffffff; font-size: 10.5px;
    }

    .fcp-option { display: flex; align-items: center; gap: 9px; min-width: 220px; }
    .fcp-option-avatar {
        width: 28px; height: 28px; flex: none; border-radius: 50%;
        display: grid; place-items: center; color: #ffffff; font-size: 11px; font-weight: 800;
    }
    .fcp-option-text { display: flex; flex-direction: column; min-width: 0; line-height: 1.25; }
    .fcp-option-text b { font-size: 13px; color: #12263f; font-weight: 600; }
    .fcp-option-text small { font-size: 11.5px; color: #8190a0; overflow: hidden; text-overflow: ellipsis; }
    .fcp-option-check { margin-left: auto; color: #0271ae; }
    .fcp-tag-menu .ant-dropdown-menu, .fcp-mentions-popup .ant-mentions-dropdown-menu {
        max-height: 280px; overflow-y: auto;
    }

    .fcp-btn-primary {
        height: 34px; border: 0; font-weight: 600; border-radius: 10px;
        background: linear-gradient(135deg, #0271ae, #0a94d6) !important;
        box-shadow: 0 8px 18px -8px rgba(2, 113, 174, .6);
    }
    .fcp-btn-primary:disabled { background: #e6edf5 !important; color: #9aa6b4 !important; box-shadow: none; }
    .fcp-btn-primary:disabled .bi { color: #9aa6b4 !important; }

    .fcp-empty { text-align: center; padding: 48px 20px; color: #6b7a8d; }
    .fcp-empty h5 { margin: 0 0 6px; font-weight: 700; color: #12263f; font-size: 15px; }
    .fcp-empty p { max-width: 320px; margin: 0 auto; font-size: 13px; }
    .fcp-empty-icon {
        display: inline-grid; place-items: center; width: 54px; height: 54px; border-radius: 16px;
        margin-bottom: 12px; font-size: 22px; background: #e8f4fc; color: #0271ae;
    }
    .fcp-empty-icon.red { background: #fff1f2; color: #e11d48; }

    @media (max-width: 575.98px) {
        .fcp-thread { padding: 10px 12px 12px; }
        .fcp-composer { padding: 10px 12px 12px; }
        .fcp-hint { display: none; }
        .fcp-composer-foot .fcp-btn-primary { margin-left: auto; }
        .fcp-bubble-wrap { max-width: 84%; }
    }
`;