// =============================================================
// View Feedback Request — the form, the team's comments and the reply
//
// Path: src/Components/CFM/pages/ViewFeedbackRequest.jsx
// Route: /cfm/feedback-request/view/:publicCode
//
// Opened by the View (eye) action on the Feedback Requests list.
//
//   Wide screens (≥ 1200px) — split view:
//     left   the form exactly as the customer sees it, with their answers
//     right  a panel that stays in view while the form scrolls, with two
//            tabs: Comments | Email customer
//
//   Smaller screens — the same three things as tabs:
//     Form | Comments | Email customer
//
// The panels stay mounted when you switch tabs, so a half-written comment
// or reply isn't lost.
//
// Route state (all optional — the screen loads from the URL on its own):
//   { publicCode, request, customer, openTab: "form" | "comments" | "reply" }
// =============================================================

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Button, Segmented, Spin, Tag, Tooltip } from "antd";

import Base1 from "../../Config/Base1";
import { BASE_IMAGE_API_GET } from "../../Config/Config";

import {
    getPublicFeedbackForm,
    getMasterTypes,
    getCustomers,
    normalizeStatus,
    isLockedStatus,
    REQUEST_STATUS,
    readRows,
    readObject,
    readResult,
    orgBrandingOf,
} from "../Services/cfmServices";

import FeedbackFormPreview, { kindResolver, hasAnswer, starValue } from "./FeedbackFormPreview";
import FeedbackComments, { useFeedbackComments } from "./FeedbackComments";
import FeedbackReplyEmail, { hasCustomerFeedback } from "./FeedbackReplyEmail";

const LIST_ROUTE = "/cfm/feedback-request";
const EDIT_ROUTE = "/cfm/feedback-request/edit";

// At this width and up the form and the panel sit side by side.
const WIDE_QUERY = "(min-width: 1200px)";

const STATUS_META = {
    DRAFT: { label: "Draft", tone: "draft", icon: "bi-pencil-square" },
    EMAIL_SENT: { label: "Email Sent", tone: "sent", icon: "bi-envelope-check" },
    FEEDBACK_RECEIVED: { label: "Feedback Received", tone: "received", icon: "bi-patch-check" },
    OPEN: { label: "Open", tone: "open", icon: "bi-send-check" },
    CLOSED: { label: "Closed", tone: "closed", icon: "bi-archive" },
    SUBMITTED: { label: "Submitted", tone: "open", icon: "bi-check2-circle" },
    EXPIRED: { label: "Expired", tone: "closed", icon: "bi-hourglass-bottom" },
};

const statusMeta = (status) =>
    STATUS_META[normalizeStatus(status)] || {
        label: status || "Unknown",
        tone: "neutral",
        icon: "bi-dot",
    };

const initialsOf = (name) =>
    String(name || "?")
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((word) => word[0])
        .join("")
        .toUpperCase();

// "October 2026" -> { monthName: "October", year: "2026" }
const splitPeriod = (period) => {
    const text = String(period || "").trim();
    return {
        monthName: (text.match(/^([A-Za-z]+)/) || [])[1] || "—",
        year: (text.match(/(\d{4})/) || [])[1] || "—",
    };
};

// "2026-10-03T00:21:02.937Z" -> "03 Oct 2026"
const formatDate = (raw) => {
    if (!raw) return "";
    const date = new Date(raw);
    return Number.isNaN(date.getTime())
        ? String(raw)
        : date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

// Items normally arrive as an array; a JSON string is unpacked too.
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

// One item off GetPublicFeedbackForm, in the shape FeedbackFormPreview draws.
const toPreviewRow = (item, index) => ({
    key: item.RequestItemId ?? item.Id ?? `item-${index}`,
    ContentText: item.ContentText ?? item.Content ?? item.Question ?? "",
    TypeId: item.TypeId ?? item.ContentTypeId,
    TypeName: item.TypeName || "",
    IsRequired: Boolean(Number(item.IsRequired)),
    DisplayOrder: Number(item.DisplayOrder) || index + 1,
    Answer: item.Answer ?? null,
});

// true while the screen is at least `query` wide.
const useMedia = (query) => {
    const read = () =>
        typeof window !== "undefined" && window.matchMedia ? window.matchMedia(query).matches : true;

    const [matches, setMatches] = useState(read);

    useEffect(() => {
        if (!window.matchMedia) return undefined;

        const list = window.matchMedia(query);
        const update = () => setMatches(list.matches);
        update();

        if (list.addEventListener) list.addEventListener("change", update);
        else list.addListener(update);

        return () => {
            if (list.removeEventListener) list.removeEventListener("change", update);
            else list.removeListener(update);
        };
    }, [query]);

    return matches;
};

// -------------------------------------------------------------
// Keeps the side panel in view while the form scrolls.
//
// CSS "position: sticky" stops working when any wrapper of the page has
// overflow set (common in the app layout), so this does the same thing in
// script: it finds whatever is actually scrolling — the window or an inner
// container — and slides the panel down with it, never past the end of
// the form. The panel is sized to the visible height, so the comment box
// is always on screen — no scrolling to the bottom to write a comment.
// -------------------------------------------------------------

// Gap kept below the app's top bar, and the fallback bar height if it can't
// be measured.
const STICKY_GAP = 12;
const APP_HEADER_FALLBACK = 74;
const PANEL_MIN_HEIGHT = 480;

const scrollParentOf = (el) => {
    let node = el?.parentElement;

    while (node && node !== document.body && node !== document.documentElement) {
        const { overflowY } = window.getComputedStyle(node);
        if (/(auto|scroll|overlay)/.test(overflowY) && node.scrollHeight > node.clientHeight + 1) {
            return node;
        }
        node = node.parentElement;
    }
    return window;
};

// Bottom edge of the app's fixed top bar, so the panel sits under it.
const appHeaderBottom = () => {
    const header =
        document.getElementById("kt_app_header") ||
        document.querySelector(".app-header, header");

    if (header) {
        const { position } = window.getComputedStyle(header);
        if (position === "fixed" || position === "sticky") {
            return header.getBoundingClientRect().bottom;
        }
        return 0;
    }
    return APP_HEADER_FALLBACK;
};

const useStickyPanel = (enabled, splitRef, panelRef, mainRef) => {
    useEffect(() => {
        const panel = panelRef.current;
        const split = splitRef.current;

        if (!enabled || !panel || !split) {
            if (panel) {
                panel.style.transform = "";
                panel.style.height = "";
            }
            return undefined;
        }

        let frame = 0;

        const update = () => {
            frame = 0;

            const scroller = scrollParentOf(split);
            const box =
                scroller === window
                    ? { top: 0, bottom: window.innerHeight }
                    : scroller.getBoundingClientRect();

            const top = Math.max(box.top, appHeaderBottom()) + STICKY_GAP;
            const bottom = Math.min(box.bottom, window.innerHeight) - STICKY_GAP;

            // Before it sticks, the panel only takes the space left below the
            // page header, so the comment box is on screen from the start.
            const splitRect = split.getBoundingClientRect();
            const visibleTop = Math.max(top, splitRect.top);
            // At the end of the form it stops at the form's last line instead
            // of sliding up under the top bar.
            const visibleBottom = Math.min(bottom, splitRect.bottom);
            const height = Math.max(PANEL_MIN_HEIGHT, visibleBottom - visibleTop);

            panel.style.height = `${height}px`;

            const room = Math.max(0, splitRect.height - height);
            const shift = Math.min(room, Math.max(0, top - splitRect.top));

            panel.style.transform = shift ? `translateY(${Math.round(shift)}px)` : "";
        };

        const schedule = () => {
            if (!frame) frame = window.requestAnimationFrame(update);
        };

        update();

        // Capture catches scrolling on the window and on any inner container.
        document.addEventListener("scroll", schedule, true);
        window.addEventListener("resize", schedule);

        // The form grows when it loads or a tab changes.
        const observer =
            typeof ResizeObserver !== "undefined" ? new ResizeObserver(schedule) : null;
        if (observer && mainRef.current) observer.observe(mainRef.current);

        return () => {
            document.removeEventListener("scroll", schedule, true);
            window.removeEventListener("resize", schedule);
            observer?.disconnect();
            if (frame) window.cancelAnimationFrame(frame);
            panel.style.transform = "";
            panel.style.height = "";
        };
    }, [enabled, splitRef, panelRef, mainRef]);
};

export default function ViewFeedbackRequest() {
    const navigate = useNavigate();
    const location = useLocation();
    const { publicCode: codeFromUrl } = useParams();

    const publicCode = codeFromUrl || location.state?.publicCode;
    const fromList = location.state?.request || null;

    const isWide = useMedia(WIDE_QUERY);

    const splitRef = useRef(null);
    const sideRef = useRef(null);
    const mainRef = useRef(null);

    const [sessionUserData, setSessionUserData] = useState({});
    const [sessionActionIds, setSessionActionIds] = useState([]);

    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState(null);
    const [rows, setRows] = useState([]);
    const [formError, setFormError] = useState("");

    const [customer, setCustomer] = useState(location.state?.customer || null);
    const [logoBroken, setLogoBroken] = useState(false);

    // "form" | "comments" | "reply". On a wide screen the form is always
    // showing, so "form" there just means the panel is on Comments.
    const [tab, setTab] = useState(location.state?.openTab || "form");
    const sideTab = tab === "reply" ? "reply" : "comments";

    useEffect(() => {
        const userDataString = sessionStorage.getItem("userData");

        if (userDataString) {
            setSessionUserData(JSON.parse(userDataString));
        } else {
            navigate("/");
        }
    }, [navigate]);

     useEffect(() => {
                const sessionMenuData = sessionStorage.getItem("menuData");
                try {
                    const parsedMenu = JSON.parse(sessionMenuData);
                    // Find Dashboard and Visitors menus
                    const dashboardMenu = parsedMenu.find(
                        (item) => item.MenuName === "Feedback Request"
                    );
        
                    let actionIds = [];
                    if (dashboardMenu?.ActionsIds) {
                        actionIds = actionIds.concat(
                            dashboardMenu.ActionsIds.split(",").map(Number)
                        );
                    }
        
                    if (actionIds.length > 0) {
                        // Remove duplicates just in case
                        const uniqueActionIds = [...new Set(actionIds)];
                        setSessionActionIds(uniqueActionIds);
                    }
                } catch (err) {
                    console.error("Error parsing menuData:", err);
                }
            }, []);

    // -------------------------------------------------------------
    // LOAD
    // -------------------------------------------------------------

    const load = async () => {
        if (!publicCode) {
            setFormError("No request code was given.");
            setLoading(false);
            return;
        }

        setLoading(true);
        setFormError("");

        const orgId = sessionUserData.OrgId;

        const [formResponse, typeResponse, customerResponse] = await Promise.all([
            getPublicFeedbackForm({ orgId, publicCode }).catch((error) => {
                console.error("GetPublicFeedbackForm failed:", error);
                return null;
            }),
            getMasterTypes({ orgId }).catch(() => null),
            customer ? null : getCustomers({ orgId }).catch(() => null),
        ]);

        const data = readObject(formResponse);
        const items = itemsOf(data);
        const found = Boolean(data && (data.RequestId || items.length));

        const { kindOf } = kindResolver(readRows(typeResponse));

        setRows(
            items
                .map(toPreviewRow)
                .sort((a, b) => a.DisplayOrder - b.DisplayOrder)
                .map((row) => ({ ...row, kind: kindOf(row.TypeId, row.TypeName) }))
        );

        if (found) {
            setForm(data);
        } else {
            setForm(null);

            const result = readResult(formResponse);
            const isDraft = normalizeStatus(fromList?.Status) === REQUEST_STATUS.DRAFT;

            // A draft with nothing on it yet makes the server fail (it can't
            // parse an empty item list) — say what that means instead.
            setFormError(
                isDraft
                    ? "This draft has no questions on its form yet. Add them in Edit setup, then view it here."
                    : (!result.ok && result.message) ||
                          `Couldn't open the form for code ${publicCode}. Please try again.`
            );
        }

        if (!customer && customerResponse) {
            const customerId = data?.CustomerId ?? fromList?.CustomerId;
            setCustomer(
                readRows(customerResponse).find((item) => Number(item.Id) === Number(customerId)) ||
                    null
            );
        }

        setLoading(false);
    };

    useEffect(() => {
        if (sessionUserData?.OrgId) load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sessionUserData?.OrgId, publicCode]);

    // -------------------------------------------------------------
    // WHAT'S ON SCREEN
    // -------------------------------------------------------------

    // The list row and the form, the form winning where both have a value.
    const info = useMemo(() => {
        const merged = { ...(fromList || {}) };
        Object.entries(form || {}).forEach(([key, value]) => {
            if (value !== null && value !== undefined && value !== "") merged[key] = value;
        });
        return merged;
    }, [fromList, form]);

    const requestId = info.RequestId ?? fromList?.Id ?? null;
    const periodText = info.Period || "";
    const { monthName, year } = splitPeriod(periodText);

    const statusKey = normalizeStatus(info.Status);
    const meta = statusMeta(statusKey);

    const customerName = info.CustomerName || customer?.CustomerName || "Customer";

    const logoSrc =
        customer?.LogoImgURL && !logoBroken
            ? `${BASE_IMAGE_API_GET}${encodeURI(customer.LogoImgURL)}`
            : null;

    const answered = rows.filter(hasAnswer).length;

    const ratings = useMemo(
        () =>
            rows
                .filter((row) => row.kind === "rating" && starValue(row.Answer))
                .map((row) => ({ text: row.ContentText, value: starValue(row.Answer) })),
        [rows]
    );

    const avgRating = ratings.length
        ? (ratings.reduce((sum, row) => sum + row.value, 0) / ratings.length).toFixed(1)
        : null;

    const feedbackIn = hasCustomerFeedback(info) || answered > 0;

    // Once anything is answered, or the request is no longer open, the form
    // is a record of what was sent — nothing on it can be typed into.
    const locked = answered > 0 || isLockedStatus(statusKey) || statusKey === "SUBMITTED";

    const canEdit = statusKey === REQUEST_STATUS.DRAFT;

    const org = orgBrandingOf(sessionUserData, BASE_IMAGE_API_GET);

    const respondentName = info.RespondentName || "";
    const toEmail = String(info.RespondentEmail || customer?.Email || "").trim();

    const thread = useFeedbackComments({ requestId, sessionUserData });

    // The split only exists once there's something to show.
    const showsScreen = Boolean(form || fromList);
    useStickyPanel(isWide && showsScreen, splitRef, sideRef, mainRef);

    // -------------------------------------------------------------
    // NAVIGATION
    // -------------------------------------------------------------

    const goBack = () => {
        navigate(LIST_ROUTE, {
            state: { reloadCustomerId: info.CustomerId || customer?.Id || null },
        });
    };

    const goEdit = () => {
        navigate(`${EDIT_ROUTE}/${encodeURIComponent(publicCode)}`, {
            state: { publicCode, request: fromList || info, customer },
        });
    };

    // -------------------------------------------------------------
    // RENDER — nothing to show at all
    // -------------------------------------------------------------

    if (loading && !form && !fromList) {
        return (
            <Base1>
                <div className="app-container container-xxl">
                    <div className="vfr-state">
                        <Spin size="large" />
                        <p>Opening the feedback form…</p>
                    </div>
                </div>
                <style>{styles}</style>
            </Base1>
        );
    }

    if (!loading && !form && !fromList) {
        return (
            <Base1>
                <div className="app-container container-xxl">
                    <div className="vfr-state">
                        <span className="vfr-state-icon">
                            <i className="bi bi-exclamation-octagon"></i>
                        </span>
                        <h4>Couldn't open this request</h4>
                        <p>{formError || "No request code was given."}</p>

                        <div className="d-flex gap-2 justify-content-center">
                            <Button size="large" className="vfr-btn-ghost" onClick={goBack}>
                                Back to requests
                            </Button>
                            {publicCode && (
                                <Button
                                    size="large"
                                    type="primary"
                                    className="vfr-btn-primary"
                                    onClick={load}
                                >
                                    Try again
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
                <style>{styles}</style>
            </Base1>
        );
    }

    // -------------------------------------------------------------
    // RENDER — pieces
    // -------------------------------------------------------------

    const formPane = loading ? (
        <div className="vfr-pane-state">
            <Spin size="large" />
            <p>Opening the {periodText} form…</p>
        </div>
    ) : formError ? (
        <div className="vfr-pane-state">
            <span className="vfr-state-icon">
                <i className="bi bi-file-earmark-x"></i>
            </span>
            <h4>Form not available</h4>
            <p>{formError}</p>
            <div className="d-flex gap-2 justify-content-center">
                <Button className="vfr-btn-ghost" onClick={load}>
                    Try again
                </Button>
                {canEdit && (
                    <Button type="primary" className="vfr-btn-primary" onClick={goEdit}>
                        <i className="bi bi-sliders me-2 text-white"></i>
                        Edit setup
                    </Button>
                )}
            </div>
        </div>
    ) : (
        <FeedbackFormPreview
            key={publicCode}
            customerName={customerName}
            logoSrc={logoSrc}
            onLogoError={() => setLogoBroken(true)}
            periodText={periodText}
            rows={rows}
            badge={
                <span className={`vfr-hero-status ${meta.tone}`}>
                    <i className={`bi ${meta.icon} me-1`}></i>
                    {meta.label}
                </span>
            }
            meta={[
                { key: "code", icon: "bi-hash", text: `Code ${publicCode}` },
                {
                    key: "count",
                    icon: "bi-list-check",
                    text: `${rows.length} question${rows.length === 1 ? "" : "s"}`,
                },
                ...(answered
                    ? [{ key: "answered", icon: "bi-check2-all", text: `${answered} answered` }]
                    : []),
            ]}
            foot={
                answered
                    ? "Read-only — these are the answers the customer submitted."
                    : locked
                    ? `Read-only — this request is ${meta.label.toLowerCase()} and was not answered.`
                    : "This is the form the customer sees. Nothing typed here is saved."
            }
            emptyText="No questions on this form yet — add them in Edit setup."
            readOnly={locked}
        />
    );

    const commentsPane = (
        <FeedbackComments
            thread={thread}
            requestId={requestId}
            active={isWide ? sideTab === "comments" : tab === "comments"}
        />
    );

    const replyPane = (
        <FeedbackReplyEmail
            key={requestId || publicCode}
            canReply={feedbackIn}
            statusLabel={meta.label}
            requestId={requestId}
            publicCode={publicCode}
            periodText={periodText}
            customerName={customerName}
            customerLogoUrl={logoSrc || ""}
            greetingDefault={respondentName || customer?.ContactPerson || customerName}
            toEmail={toEmail}
            respondentName={respondentName}
            submittedText={formatDate(info.SubmittedOn)}
            ratings={ratings}
            ratingsReady={!loading}
            org={org}
            sessionUserData={sessionUserData}
            senderName={thread.me.name !== "You" ? thread.me.name : ""}
            onSent={({ toEmail: to, cc, subject }) =>
                thread.note({
                    text: `emailed ${to}${cc.length ? ` (cc ${cc.join(", ")})` : ""} — “${subject}”`,
                })
            }
        />
    );

    const commentsLabel = (
        <span className="vfr-tab-label">
            <i className="bi bi-chat-dots"></i>
            Comments
            {thread.count > 0 && <b className="vfr-count">{thread.count}</b>}
        </span>
    );

    const replyLabel = (
        <span className="vfr-tab-label">
            <i className={`bi ${feedbackIn ? "bi-reply" : "bi-lock"}`}></i>
            Email customer
        </span>
    );

    const showAddBtn = sessionActionIds?.includes(1);
    // const showEditBtn = sessionActionIds?.includes(3);

    // -------------------------------------------------------------
    // RENDER — the screen
    // -------------------------------------------------------------

    return (
        <Base1>
            <div className="app-container container-xxl vfr-page">

                {/* ================= HEADER ================= */}

                <div className="vfr-header">
                    <div className="vfr-header-top">
                        <button type="button" className="vfr-back" onClick={goBack}>
                            <i className="bi bi-arrow-left"></i>
                        </button>

                        <div className="flex-grow-1 min-w-0">
                            <div className="vfr-eyebrow">
                                Feedback Request{requestId ? ` #${requestId}` : ""}
                            </div>
                            <h1 className="vfr-title">
                                {feedbackIn ? "Customer Feedback" : "View Form"}
                            </h1>
                        </div>

                        <div className="vfr-header-actions">
                            {canEdit && (
                                <Button size="large" className="vfr-btn-ghost" onClick={goEdit}>
                                    <i className="bi bi-sliders me-2"></i>
                                    Edit setup
                                </Button>
                            )}
                            {feedbackIn && (
                                <Button
                                    size="large"
                                    type="primary"
                                    className="vfr-btn-primary"
                                    onClick={() => setTab("reply")}
                                >
                                    <i className="bi bi-reply me-2 text-white"></i>
                                    Reply to customer
                                </Button>
                            )}
                        </div>
                    </div>

                    <div className="vfr-context">
                        <div className="vfr-customer">
                            <span className="vfr-logo">
                                {logoSrc ? (
                                    <img
                                        src={logoSrc}
                                        alt={customerName}
                                        onError={() => setLogoBroken(true)}
                                    />
                                ) : (
                                    <span>{initialsOf(customerName)}</span>
                                )}
                            </span>

                            <div className="min-w-0">
                                <div className="vfr-context-label">Customer</div>
                                <div className="vfr-customer-name">{customerName}</div>
                            </div>
                        </div>

                        <div className="vfr-context-item">
                            <div className="vfr-context-label">Year</div>
                            <div className="vfr-context-value">{year}</div>
                        </div>

                        <div className="vfr-context-item">
                            <div className="vfr-context-label">Month</div>
                            <div className="vfr-context-value">{monthName}</div>
                        </div>

                        <div className="vfr-context-item">
                            <div className="vfr-context-label">Status</div>
                            <Tag className={`vfr-status ${meta.tone}`}>
                                <i className={`bi ${meta.icon} me-1`}></i>
                                {meta.label}
                            </Tag>
                        </div>

                        <div className="vfr-context-item">
                            <div className="vfr-context-label">Answered</div>
                            <div className="vfr-context-value">
                                {answered}
                                <span className="vfr-context-of"> / {rows.length}</span>
                            </div>
                        </div>

                        {avgRating && (
                            <div className="vfr-context-item">
                                <div className="vfr-context-label">Avg rating</div>
                                <div className="vfr-context-value">
                                    <i className="bi bi-star-fill vfr-star"></i>
                                    {avgRating}
                                    <span className="vfr-context-of"> / 5</span>
                                </div>
                            </div>
                        )}

                        {(respondentName || info.RespondentEmail) && (
                            <div className="vfr-context-item vfr-respondent">
                                <div className="vfr-context-label">Submitted by</div>
                                <Tooltip title={info.RespondentEmail || ""}>
                                    <div className="vfr-context-value text-truncate">
                                        {respondentName || info.RespondentEmail}
                                    </div>
                                </Tooltip>
                                {info.SubmittedOn && (
                                    <div className="vfr-context-sub">{formatDate(info.SubmittedOn)}</div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* ================= TABS (smaller screens) ================= */}

                {!isWide && (
                    <div className="vfr-tabs">
                        <Segmented
                            block
                            value={tab}
                            onChange={setTab}
                            options={[
                                {
                                    value: "form",
                                    label: (
                                        <span className="vfr-tab-label">
                                            <i className="bi bi-ui-checks"></i>
                                            Form
                                        </span>
                                    ),
                                },
                                { value: "comments", label: commentsLabel },
                                {
                                    value: "reply",
                                    label: (
                                        <span className="vfr-tab-label">
                                            <i className={`bi ${feedbackIn ? "bi-reply" : "bi-lock"}`}></i>
                                            Email
                                        </span>
                                    ),
                                },
                            ]}
                        />
                    </div>
                )}

                {/* ================= BODY ================= */}

                <div ref={splitRef} className={`vfr-split ${isWide ? "is-wide" : "is-narrow"}`}>
                    <div ref={mainRef} className={`vfr-main ${!isWide && tab !== "form" ? "is-hidden" : ""}`}>
                        {formPane}
                    </div>

                    <aside ref={sideRef} className={`vfr-side ${!isWide && tab === "form" ? "is-hidden" : ""}`}>
                        {isWide && (
                            <div className="vfr-side-tabs" role="tablist">
                                <button
                                    type="button"
                                    role="tab"
                                    aria-selected={sideTab === "comments"}
                                    className={`vfr-side-tab ${sideTab === "comments" ? "active" : ""}`}
                                    onClick={() => setTab("comments")}
                                >
                                    {commentsLabel}
                                </button>

                                {showAddBtn && (
                                    <Tooltip
                                        title={
                                            feedbackIn
                                                ? ""
                                                : "Available once the customer submits their feedback"
                                        }
                                    >
                                        <button
                                            type="button"
                                            role="tab"
                                            aria-selected={sideTab === "reply"}
                                            className={`vfr-side-tab ${sideTab === "reply" ? "active" : ""}`}
                                            onClick={() => setTab("reply")}
                                        >
                                            {replyLabel}
                                        </button>
                                    </Tooltip>
                                )}
                            </div>
                        )}

                        <div className={`vfr-side-pane ${sideTab === "comments" ? "" : "is-hidden"}`}>
                            {commentsPane}
                        </div>
                        <div className={`vfr-side-pane ${sideTab === "reply" ? "" : "is-hidden"}`}>
                            {replyPane}
                        </div>
                    </aside>
                </div>
            </div>

            <style>{styles}</style>
        </Base1>
    );
}

// =============================================================
// STYLES
// =============================================================

const styles = `
    .vfr-page { padding-top: 18px; padding-bottom: 60px; }


    /* ----- States ----- */

    .vfr-state {
        margin: 60px auto; max-width: 460px; padding: 40px 28px; text-align: center;
        background: #ffffff; border: 1px solid #e8eef5; border-radius: 20px;
        box-shadow: 0 10px 30px rgba(22, 50, 80, .06);
    }
    .vfr-state p, .vfr-pane-state p { margin: 12px 0 18px; color: #8190a0; font-size: 13.5px; }
    .vfr-state h4, .vfr-pane-state h4 { margin: 0; font-size: 17px; font-weight: 700; color: #12263f; }
    .vfr-state-icon {
        display: inline-flex; align-items: center; justify-content: center;
        width: 58px; height: 58px; border-radius: 18px; margin-bottom: 12px;
        background: #fff1f2; color: #e11d48; font-size: 24px;
    }
    .vfr-pane-state {
        padding: 70px 24px; text-align: center; background: #ffffff;
        border: 1px solid #e8eef5; border-radius: 22px;
    }


    /* ----- Buttons ----- */

    .vfr-btn-primary {
        height: 44px; padding: 0 20px; border: none; border-radius: 11px; font-weight: 600;
        background: linear-gradient(135deg, #0271ae, #0a94d6) !important;
        box-shadow: 0 10px 22px rgba(2, 113, 174, .28);
    }
    .vfr-btn-primary:hover:not(:disabled) { filter: brightness(1.06); }
    .vfr-btn-ghost {
        height: 44px; padding: 0 18px; border-radius: 11px; font-weight: 600;
        border-color: #dfe6ef; color: #46566a;
    }
    .vfr-pane-state .vfr-btn-primary, .vfr-pane-state .vfr-btn-ghost { height: 38px; }


    /* ----- Header ----- */

    .vfr-header {
        margin-bottom: 18px; padding: 20px 22px; background: #ffffff;
        border: 1px solid #e8eef5; border-radius: 20px; box-shadow: 0 10px 30px rgba(22, 50, 80, .06);
    }
    .vfr-header-top { display: flex; align-items: center; gap: 14px; }
    .vfr-header-actions { display: flex; align-items: center; gap: 10px; flex: none; }

    .vfr-back {
        width: 42px; height: 42px; flex: none; border-radius: 12px; border: 1px solid #e6edf5;
        background: #ffffff; color: #46566a; font-size: 16px; cursor: pointer; transition: all .18s ease;
    }
    .vfr-back:hover { border-color: #0271ae; color: #0271ae; }

    .vfr-eyebrow {
        font-size: 11px; font-weight: 700; letter-spacing: .09em; text-transform: uppercase; color: #9aa6b4;
    }
    .vfr-title { margin: 2px 0 0; font-size: 22px; font-weight: 800; color: #12263f; letter-spacing: -.01em; }

    .vfr-context { display: flex; align-items: stretch; gap: 10px; flex-wrap: wrap; margin-top: 18px; }

    .vfr-customer, .vfr-context-item {
        display: flex; align-items: center; gap: 12px; padding: 10px 16px;
        border-radius: 14px; background: #f6f9fc; border: 1px solid #edf2f7;
    }
    .vfr-context-item { flex-direction: column; align-items: flex-start; justify-content: center; gap: 2px; }
    .vfr-customer { flex: 1 1 260px; min-width: 0; }
    .vfr-respondent { max-width: 240px; min-width: 0; }

    .vfr-logo {
        width: 46px; height: 46px; flex: none; border-radius: 13px; overflow: hidden;
        display: flex; align-items: center; justify-content: center;
        background: #ffffff; border: 1px solid #e6edf5; color: #0271ae; font-weight: 800; font-size: 15px;
    }
    .vfr-logo img { width: 100%; height: 100%; object-fit: contain; padding: 4px; }

    .vfr-context-label {
        font-size: 10.5px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: #9aa6b4;
    }
    .vfr-customer-name {
        font-size: 15px; font-weight: 700; color: #12263f;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .vfr-context-value { font-size: 15px; font-weight: 700; color: #12263f; max-width: 100%; }
    .vfr-context-of { font-size: 12.5px; font-weight: 600; color: #9aa6b4; }
    .vfr-context-sub { font-size: 11.5px; color: #8190a0; }
    .vfr-star { color: #f59e0b; font-size: 13px; margin-right: 5px; }

    .vfr-status {
        margin: 0; border: none; border-radius: 8px; padding: 3px 10px;
        font-size: 11.5px; font-weight: 700;
    }
    .vfr-status.draft    { background: #eef4ff; color: #3b5bdb; }
    .vfr-status.open     { background: #ecfdf5; color: #059669; }
    .vfr-status.sent     { background: #e8f4fc; color: #0271ae; }
    .vfr-status.received { background: #ecfdf5; color: #059669; }
    .vfr-status.closed   { background: #f1f5f9; color: #64748b; }
    .vfr-status.neutral  { background: #fff7e6; color: #b45309; }

    /* The status pill on the dark form header. */
    .vfr-hero-status {
        display: inline-flex; align-items: center; padding: 5px 11px; border-radius: 999px;
        font-size: 12px; font-weight: 700; backdrop-filter: blur(4px);
    }
    .vfr-hero-status.draft    { background: rgba(168, 85, 247, .25); color: #e9d5ff; }
    .vfr-hero-status.open     { background: rgba(16, 185, 129, .22); color: #a7f3d0; }
    .vfr-hero-status.sent     { background: rgba(56, 189, 248, .22); color: #bae6fd; }
    .vfr-hero-status.received { background: rgba(16, 185, 129, .22); color: #a7f3d0; }
    .vfr-hero-status.closed   { background: rgba(249, 115, 22, .22); color: #fed7aa; }
    .vfr-hero-status.neutral  { background: rgba(236, 72, 153, .22); color: #fbcfe8; }


    /* ----- Tabs ----- */

    .vfr-tab-label { display: inline-flex; align-items: center; gap: 7px; font-weight: 600; }
    .vfr-count {
        min-width: 20px; height: 20px; padding: 0 6px; border-radius: 999px;
        display: inline-flex; align-items: center; justify-content: center;
        font-size: 11px; line-height: 1; background: #0271ae; color: #ffffff;
    }

    .vfr-tabs {
        margin-bottom: 14px; padding: 6px; border-radius: 14px; background: #ffffff;
        border: 1px solid #e8eef5; box-shadow: 0 6px 18px rgba(22, 50, 80, .05);
    }
    .vfr-tabs .ant-segmented { width: 100%; background: #f1f5f9; }
    .vfr-tabs .ant-segmented-item-label { padding: 6px 4px; }


    /* ----- Split ----- */

    .vfr-split.is-wide {
        display: grid;
        grid-template-columns: minmax(0, 7fr) minmax(400px, 5fr);
        gap: 20px;
        align-items: start;
    }

    .vfr-main { min-width: 0; }

    .vfr-side {
        min-width: 0; display: flex; flex-direction: column; overflow: hidden;
        background: #ffffff; border: 1px solid #e8eef5; border-radius: 20px;
        box-shadow: 0 10px 30px rgba(22, 50, 80, .06);
    }

    /* Height and position are set by useStickyPanel; this is the start. */
    .vfr-split.is-wide .vfr-side {
        position: relative;
        height: calc(100vh - 110px);
        min-height: 480px;
        will-change: transform;
    }

    .vfr-split.is-narrow .vfr-side { height: calc(100vh - 150px); min-height: 520px; }

    .vfr-side-tabs {
        flex: none; display: flex; gap: 4px; padding: 0 12px;
        border-bottom: 1px solid #eef3f8; background: #ffffff;
    }
    .vfr-side-tab {
        position: relative; padding: 15px 12px 13px; border: 0; background: none;
        color: #6b7a8d; cursor: pointer; transition: color .15s ease;
    }
    .vfr-side-tab::after {
        content: ""; position: absolute; left: 10px; right: 10px; bottom: -1px; height: 3px;
        border-radius: 3px 3px 0 0; background: transparent; transition: background .15s ease;
    }
    .vfr-side-tab:hover { color: #12263f; }
    .vfr-side-tab.active { color: #0271ae; }
    .vfr-side-tab.active::after { background: #0271ae; }

    .vfr-side-pane { flex: 1 1 auto; min-height: 0; }

    .is-hidden { display: none !important; }


    /* ----- Smaller screens ----- */

    @media (max-width: 767.98px) {
        .vfr-header { padding: 16px; }
        .vfr-header-top { flex-wrap: wrap; }
        .vfr-header-actions { width: 100%; }
        .vfr-header-actions .ant-btn { flex: 1 1 0; }
        .vfr-title { font-size: 19px; }
        .vfr-context-item { flex: 1 1 calc(50% - 5px); }
        .vfr-respondent { max-width: none; }
        .vfr-tab-label { gap: 5px; font-size: 12.5px; }
        .vfr-split.is-narrow .vfr-side { height: calc(100vh - 120px); }
    }
`;