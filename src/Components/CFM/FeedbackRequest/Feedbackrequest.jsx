// =============================================================
// Feedback Requests — type picker, party picker, status counts, request list
//
// Path: src/Components/CFM/pages/FeedbackRequest.jsx
//
// The header carries a static "Feedback from" dropdown:
//
//   Customers  — live: choose a customer, their requests load straight away
//   Suppliers  — coming soon
//   Employees  — coming soon
//   Visitors   — coming soon
//
// Every heading, label and message on the screen reads from the chosen type,
// so when Suppliers / Employees go live only their `ready` flag (and their
// APIs) need adding.
//
// View Form opens the request's form in a pop-up, drawn by the same
// FeedbackFormPreview the setup screen's "Review form" step uses — so it is
// exactly what the customer sees, with any answers they have given.
//
// Wired to the live APIs:
//   CFM/GetCustomers            { OrgId }
//   CFM/GetRequests             { OrgId, JsonData: { CustomerId } }
//   CFM/GetAvailablePeriods     { OrgId, JsonData: { CustomerId, Year } }
//   CFM/GetPublicFeedbackForm   { OrgId, JsonData: { PublicCode } }
//   Portal/GetMasterTypes       (question types, to pick stars / yes-no / text)
//
// Comments (the chat icon on each row) opens FeedbackCommentsModal: the
// team's comment thread, plus "Reply to customer" once feedback is in.
// =============================================================

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Select, Button, Table, Tag, Tooltip, Empty, Modal, Spin, message } from "antd";

import Base1 from "../../Config/Base1";
import { BASE_IMAGE_API_GET } from "../../Config/Config";
import "../../Config/Pagination.css";
import "../../Config/Loader.css";

import {
    getCustomers,
    getFeedbackRequests,
    getAvailablePeriods,
    getPublicFeedbackForm,
    getMasterTypes,
    REQUEST_STATUS,
    REQUEST_STATUS_FLOW,
    normalizeStatus,
    isLockedStatus,
    readRows,
    readObject,
    readResult,
    orgBrandingOf,
} from "../Services/cfmServices";

import FeedbackFormPreview, { kindResolver, hasAnswer } from "./FeedbackFormPreview";
import FeedbackCommentsModal, {
    commentCountOf,
    hasCustomerFeedback,
    meOf,
} from "./FeedbackCommentsModal";

// Who the feedback is collected from. Only `ready` types are wired to APIs;
// the rest show a "Coming soon" panel. Flip `ready` when one goes live.
const FEEDBACK_TYPES = [
    { value: "customers", label: "Customers", singular: "Customer", icon: "bi-buildings", ready: true },
    { value: "suppliers", label: "Suppliers", singular: "Supplier", icon: "bi-truck", ready: false },
    { value: "employees", label: "Employees", singular: "Employee", icon: "bi-people", ready: false },
    { value: "visitors", label: "Visitors", singular: "Visitor", icon: "bi-person-badge", ready: false },
];

const DEFAULT_TYPE = "customers";

// How each status is shown. Anything the API returns that isn't listed here
// still gets a badge and a tag — it just uses the neutral styling, so a new
// status on the server can't make rows disappear from the counts.
// The flow is DRAFT -> EMAIL_SENT -> FEEDBACK_RECEIVED. The older names stay
// so rows saved before the change still read properly.
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

// The years on offer in both halves of the screen: the two behind, this one,
// and the one ahead for anything planned early.
const thisYear = new Date().getFullYear();
const YEARS = [thisYear - 2, thisYear - 1, thisYear, thisYear + 1];

const ALL_MONTHS = 0;

// The edit screen's route, without the trailing :publicCode. Must match the
// <Route> registered for EditFeedbackRequest.
const EDIT_ROUTE = "/cfm/feedback-request/edit";

// The create screen — same layout as edit, registered as its own route.
const CREATE_ROUTE = "/cfm/feedback-request/create";

// "October 2026" -> { month: "oct", year: 2026 }, tolerant of "Oct 2026" and
// any extra words, so the month filter doesn't depend on the exact wording
// the API happens to use.
const parsePeriod = (period) => {
    const text = String(period || "").trim();
    const year = Number((text.match(/(\d{4})/) || [])[1] || 0);
    const month = (text.match(/^([A-Za-z]+)/) || [])[1] || "";

    return { month: month.slice(0, 3).toLowerCase(), year };
};

const initialsOf = (name) =>
    String(name || "?")
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((word) => word[0])
        .join("")
        .toUpperCase();

// One item off GetPublicFeedbackForm, in the shape FeedbackFormPreview draws.
// Tolerant of the few names the text and type have gone by.
const toPreviewRow = (item, index) => ({
    key: item.RequestItemId ?? item.Id ?? `item-${index}`,
    ContentText: item.ContentText ?? item.Content ?? item.Question ?? "",
    TypeId: item.TypeId ?? item.ContentTypeId,
    TypeName: item.TypeName || "",
    IsRequired: Boolean(Number(item.IsRequired)),
    DisplayOrder: Number(item.DisplayOrder) || index + 1,
    Answer: item.Answer ?? null,
});

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

// "2026-10-03T00:21:02.937Z" -> "03-10-2026"
const formatDate = (raw) => {
    if (!raw) return "—";

    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return raw;

    const dd = String(parsed.getDate()).padStart(2, "0");
    const mm = String(parsed.getMonth() + 1).padStart(2, "0");
    return `${dd}-${mm}-${parsed.getFullYear()}`;
};

export default function FeedbackRequest() {
    const navigate = useNavigate();
    const location = useLocation();

    const [sessionUserData, setSessionUserData] = useState({});
    const [navigationPath, setNavigationPath] = useState("");

    // -------------------------------------------------------------
    // FEEDBACK TYPE (header dropdown)
    // -------------------------------------------------------------

    const [feedbackType, setFeedbackType] = useState(DEFAULT_TYPE);

    const party =
        FEEDBACK_TYPES.find((type) => type.value === feedbackType) || FEEDBACK_TYPES[0];

    // Lower-case words for sentences: "customer", "customers".
    const one = party.singular.toLowerCase();
    const many = party.label.toLowerCase();

    const [customers, setCustomers] = useState([]);
    const [customersLoading, setCustomersLoading] = useState(false);
    const [customerId, setCustomerId] = useState(null);

    // null = nothing chosen yet; "load" shows the counts and the list.
    const [mode, setMode] = useState(null);

    const [requests, setRequests] = useState([]);
    const [requestsLoading, setRequestsLoading] = useState(false);

    // The customer the list on screen actually belongs to. Kept apart from
    // `customerId` so switching the dropdown can't relabel a list that was
    // loaded for someone else.
    const [loadedCustomerId, setLoadedCustomerId] = useState(null);

    // The Load filter's own period.
    const [loadYear, setLoadYear] = useState(thisYear);
    const [loadMonth, setLoadMonth] = useState(ALL_MONTHS);


    const [periods, setPeriods] = useState([]);
    const [periodsLoading, setPeriodsLoading] = useState(false);

    useEffect(() => {
        const userDataString = sessionStorage.getItem("userData");
        const navigationString = sessionStorage.getItem("navigationPath");

        if (userDataString) {
            setSessionUserData(JSON.parse(userDataString));
            setNavigationPath(navigationString);
        } else {
            navigate("/");
        }
    }, [navigate]);

    // -------------------------------------------------------------
    // CUSTOMERS
    // -------------------------------------------------------------

    const fetchCustomers = async () => {
        try {
            setCustomersLoading(true);

            const response = await getCustomers({ orgId: sessionUserData.OrgId });
            setCustomers(readRows(response));
        } catch (error) {
            console.error("GetCustomers failed:", error);
            message.error(`Couldn't load the ${one} list.`);
        } finally {
            setCustomersLoading(false);
        }
    };

    useEffect(() => {
        if (sessionUserData?.OrgId) fetchCustomers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sessionUserData?.OrgId]);

    const customerName =
        customers.find((item) => item.Id === loadedCustomerId)?.CustomerName || "";

    // The customer picked in the dropdown, for the logo beside the buttons.
    // A logo that fails to load is remembered per customer, so it falls back
    // to initials instead of showing a broken image.
    const [brokenLogos, setBrokenLogos] = useState({});

    const selectedCustomer = customers.find(
        (item) => Number(item.Id) === Number(customerId)
    );

    const selectedLogoSrc =
        selectedCustomer?.LogoImgURL && !brokenLogos[selectedCustomer.Id]
            ? `${BASE_IMAGE_API_GET}${encodeURI(selectedCustomer.LogoImgURL)}`
            : null;

    // Back from the edit screen arrives with the customer in route state.
    // Reopen their list, then clear the state so a refresh doesn't replay it.
    const returnCustomerId = location.state?.reloadCustomerId;

    useEffect(() => {
        if (!returnCustomerId || !customers.length || !sessionUserData?.OrgId) return;

        setFeedbackType(DEFAULT_TYPE);
        setCustomerId(returnCustomerId);
        handleLoadRequests(returnCustomerId);

        navigate(location.pathname, { replace: true, state: null });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [returnCustomerId, customers.length, sessionUserData?.OrgId]);

    // -------------------------------------------------------------
    // REQUESTS
    // -------------------------------------------------------------

    const latestLoadRef = useRef(0);

    const handleLoadRequests = async (idOverride) => {
        // Only a real id counts — when this is wired straight to onClick the
        // first argument is the click event, not a customer.
        const id =
            typeof idOverride === "number" || typeof idOverride === "string"
                ? idOverride
                : customerId;

        if (!id) {
            message.warning(`Please choose a ${one} first.`);
            return;
        }

        setMode("load");

        // Switching customers quickly can leave an older call still in
        // flight — only the most recent one is allowed to fill the list.
        const callId = ++latestLoadRef.current;

        try {
            setRequestsLoading(true);

            const response = await getFeedbackRequests({
                orgId: sessionUserData.OrgId,
                customerId: id,
            });

            if (callId !== latestLoadRef.current) return;

            setRequests(readRows(response));
            setLoadedCustomerId(id);
        } catch (error) {
            if (callId !== latestLoadRef.current) return;

            console.error("GetRequests failed:", error);
            message.error(`Couldn't load the requests for this ${one}.`);
            setRequests([]);
        } finally {
            if (callId === latestLoadRef.current) setRequestsLoading(false);
        }
    };

    // -------------------------------------------------------------
    // FILTERING THE LIST
    //
    // GetRequests takes a CustomerId and nothing else, so the period filter
    // is applied here on what came back. If the endpoint ever accepts Year
    // and Month, pass them in handleLoadRequests and drop this memo.
    // -------------------------------------------------------------

    const monthNameOf = (monthNo) =>
        periods.find((period) => period.MonthNo === monthNo)?.MonthName || "";

    const visibleRequests = useMemo(() => {
        const wantedMonth = monthNameOf(loadMonth).slice(0, 3).toLowerCase();

        return requests.filter((request) => {
            const { month: rowMonth, year: rowYear } = parsePeriod(request.Period);

            if (loadYear && rowYear && rowYear !== Number(loadYear)) return false;
            if (loadMonth !== ALL_MONTHS && wantedMonth && rowMonth !== wantedMonth)
                return false;

            return true;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [requests, loadYear, loadMonth, periods]);

    const filterIsOn = requests.length !== visibleRequests.length;

    // Counts built from the rows themselves, in a fixed order with anything
    // unexpected appended, so the badges always add up to the table.
    const statusCounts = useMemo(() => {
        const tally = new Map();

        visibleRequests.forEach((request) => {
            const key = normalizeStatus(request.Status) || "UNKNOWN";
            tally.set(key, (tally.get(key) || 0) + 1);
        });

        const ordered = REQUEST_STATUS_FLOW;
        const rest = [...tally.keys()].filter((key) => !ordered.includes(key));

        return [...ordered, ...rest]
            .filter((key) => tally.has(key) || ordered.includes(key))
            .map((key) => ({
                key,
                count: tally.get(key) || 0,
                ...statusMeta(key),
            }));
    }, [visibleRequests]);

    // -------------------------------------------------------------
    // CREATE
    // -------------------------------------------------------------

    // Create opens its own screen, carrying the chosen customer so it starts
    // on them (and can show their logo straight away).
    const handleCreateRequest = () => {
        if (!customerId) {
            message.warning(`Please choose a ${one} first.`);
            return;
        }

        navigate(CREATE_ROUTE, {
            state: {
                customer: customers.find((item) => Number(item.Id) === Number(customerId)),
            },
        });
    };

    // Only the load filter uses the month list on this screen now.
    const activeYear = loadYear;

    const fetchPeriods = async (forYear = activeYear) => {
        try {
            setPeriodsLoading(true);

            const response = await getAvailablePeriods({
                orgId: sessionUserData.OrgId,
                customerId,
                year: forYear,
            });

            setPeriods(readRows(response));
        } catch (error) {
            console.error("GetAvailablePeriods failed:", error);
            message.error("Couldn't load the months for this year.");
            setPeriods([]);
        } finally {
            setPeriodsLoading(false);
        }
    };

    // The load filter's month list follows the customer and the year.
    useEffect(() => {
        if (mode !== "load" || !customerId || !activeYear) return;

        fetchPeriods(activeYear);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode, customerId, activeYear]);

    // Load: every month the API returned, plus an "all" entry. Nothing is
    // disabled here — a month with no request simply filters to an empty
    // list, which is an answer rather than a dead end.
    const loadMonthOptions = useMemo(
        () => [
            { value: ALL_MONTHS, label: "All months" },
            ...periods.map((period) => ({
                value: period.MonthNo,
                label: period.MonthName,
            })),
        ],
        [periods]
    );

    // -------------------------------------------------------------
    // ROW ACTIONS
    // -------------------------------------------------------------

    // View Form: the request's public form, in a pop-up. `viewing` holds the
    // row clicked plus what came back; master types are fetched once and
    // kept, since every form needs them to tell stars from yes/no from text.
    const [viewing, setViewing] = useState(null);
    const [masterTypes, setMasterTypes] = useState(null);

    const handleViewForm = async (record) => {
        if (!record.PublicCode) {
            message.warning("This request has no public code to open.");
            return;
        }

        const code = String(record.PublicCode);
        setViewing({ code, record, loading: true, form: null, rows: [], error: "" });

        const orgId = sessionUserData.OrgId;

        const [formResponse, typeResponse] = await Promise.all([
            getPublicFeedbackForm({ orgId, publicCode: code }).catch((error) => {
                console.error("GetPublicFeedbackForm failed:", error);
                return null;
            }),
            masterTypes ? null : getMasterTypes({ orgId }).catch(() => null),
        ]);

        const types = masterTypes || readRows(typeResponse);
        if (!masterTypes && typeResponse) setMasterTypes(types);

        const form = readObject(formResponse);
        const items = itemsOf(form);
        const found = Boolean(form && (form.RequestId || items.length));

        const { kindOf } = kindResolver(types);

        const rows = items
            .map(toPreviewRow)
            .sort((a, b) => a.DisplayOrder - b.DisplayOrder)
            .map((row) => ({ ...row, kind: kindOf(row.TypeId, row.TypeName) }));

        let error = "";

        if (!found) {
            const result = readResult(formResponse);
            const isDraft = normalizeStatus(record.Status) === REQUEST_STATUS.DRAFT;

            // A draft with nothing on it yet makes the server fail (it can't
            // parse an empty item list) — say what that means instead of
            // showing the raw error.
            error = isDraft
                ? "This draft has no questions on its form yet. Add them in Edit setup, then view it here."
                : (!result.ok && result.message) ||
                  `Couldn't open the form for code ${code}. Please try again.`;
        }

        // Only land the answer if the pop-up is still showing this request.
        setViewing((prev) =>
            prev && prev.code === code
                ? { ...prev, loading: false, form: found ? form : null, rows, error }
                : prev
        );
    };

    const closeView = () => setViewing(null);

    // -------------------------------------------------------------
    // COMMENTS & REPLY
    // -------------------------------------------------------------

    const [commentsFor, setCommentsFor] = useState(null);
    const [commentsTab, setCommentsTab] = useState("comments");
    // Bumped when a comment is posted, so the counts on the rows refresh.
    const [, setCommentsTick] = useState(0);

    const me = meOf(sessionUserData);
    const org = orgBrandingOf(sessionUserData, BASE_IMAGE_API_GET);

    const openComments = (record, tab = "comments") => {
        setCommentsTab(tab);
        setCommentsFor(record);
    };

    const logoUrlOf = (record) => {
        const owner = customers.find((item) => Number(item.Id) === Number(record?.CustomerId));
        return owner?.LogoImgURL && !brokenLogos[owner.Id]
            ? `${BASE_IMAGE_API_GET}${encodeURI(owner.LogoImgURL)}`
            : "";
    };

    // -------------------------------------------------------------
    // Only a draft's setup can change. Once the email has gone out the form is
    // what the customer has — Edit setup is switched off from then on.
    const canEditSetup = (record) => normalizeStatus(record?.Status) === REQUEST_STATUS.DRAFT;

    // The customer record rides along in route state so the edit screen can
    // show the logo without fetching the whole customer list again.
    const handleEditSetup = (record) => {
        if (!canEditSetup(record)) return;

        if (!record.PublicCode) {
            message.warning("This request has no public code to open.");
            return;
        }

        navigate(`${EDIT_ROUTE}/${encodeURIComponent(record.PublicCode)}`, {
            state: {
                publicCode: record.PublicCode,
                // The row itself, so the edit screen can still open a draft
                // whose saved form the server can't return yet.
                request: record,
                customer: customers.find(
                    (item) => Number(item.Id) === Number(record.CustomerId)
                ),
            },
        });
    };

    // -------------------------------------------------------------
    // TABLE
    // -------------------------------------------------------------

    const columns = [
        {
            title: "#",
            width: 64,
            align: "center",
            render: (_value, _record, index) => (
                <span className="fbr-serial">{index + 1}</span>
            ),
        },
        {
            title: "Period",
            dataIndex: "Period",
            width: 160,
            render: (value) => <span className="fbr-period">{value || "—"}</span>,
        },
        {
            title: "Code",
            dataIndex: "PublicCode",
            width: 170,
            render: (value) =>
                value ? (
                    <span className="fbr-code">{value}</span>
                ) : (
                    <span className="text-muted">—</span>
                ),
        },
        {
            title: "Status",
            dataIndex: "Status",
            width: 160,
            render: (value) => {
                const meta = statusMeta(value);

                return (
                    <Tag className={`fbr-status ${meta.tone}`}>
                        <i className={`bi ${meta.icon} me-1`}></i>
                        {meta.label}
                    </Tag>
                );
            },
        },
        {
            title: "Respondent",
            dataIndex: "RespondentName",
            render: (_value, record) =>
                record.RespondentName || record.RespondentEmail ? (
                    <div className="fbr-respondent">
                        <span className="fbr-respondent-name">
                            {record.RespondentName || "—"}
                        </span>

                        {record.RespondentEmail && (
                            <a
                                href={`mailto:${record.RespondentEmail}`}
                                className="fbr-respondent-mail"
                            >
                                <i className="bi bi-envelope me-1"></i>
                                {record.RespondentEmail}
                            </a>
                        )}
                    </div>
                ) : (
                    <span className="text-muted">Not yet answered</span>
                ),
        },
        {
            title: "Submitted On",
            dataIndex: "SubmittedOn",
            width: 140,
            render: (value) => (
                <span className={value ? "" : "text-muted"}>{formatDate(value)}</span>
            ),
        },
        {
            title: "Actions",
            width: 180,
            align: "center",
            render: (_value, record) => (
                <div className="d-flex align-items-center justify-content-center gap-2">
                    <Tooltip title="View form">
                        <button
                            type="button"
                            className="fbr-icon-btn view"
                            onClick={() => handleViewForm(record)}
                        >
                            <i className="bi bi-eye"></i>
                        </button>
                    </Tooltip>

                    <Tooltip
                        title={
                            canEditSetup(record)
                                ? "Edit setup"
                                : "Only draft requests can be edited"
                        }
                    >
                        {/* The span keeps the tooltip working on a disabled button. */}
                        <span className="d-inline-flex">
                            <button
                                type="button"
                                className="fbr-icon-btn edit"
                                disabled={!canEditSetup(record)}
                                onClick={() => handleEditSetup(record)}
                            >
                                <i className="bi bi-sliders"></i>
                            </button>
                        </span>
                    </Tooltip>

                    <Tooltip
                        title={
                            hasCustomerFeedback(record)
                                ? "Comments & reply to customer"
                                : "Comments"
                        }
                    >
                        <button
                            type="button"
                            className="fbr-icon-btn comments"
                            onClick={() => openComments(record)}
                        >
                            <i className="bi bi-chat-dots"></i>
                            {commentCountOf(record, me) > 0 && (
                                <span className="fbr-icon-count">
                                    {commentCountOf(record, me)}
                                </span>
                            )}
                        </button>
                    </Tooltip>
                </div>
            ),
        },
    ];

    // -------------------------------------------------------------
    // VIEW FORM — pop-up body
    // -------------------------------------------------------------

    const viewModalBody = () => {
        if (viewing.loading) {
            return (
                <div className="fbr-view-state">
                    <Spin size="large" />
                    <div className="fbr-view-state-text">
                        Opening the {viewing.record.Period} form…
                    </div>
                </div>
            );
        }

        if (viewing.error) {
            return (
                <div className="fbr-view-state">
                    <span className="fbr-view-state-icon">
                        <i className="bi bi-file-earmark-x"></i>
                    </span>
                    <h4>Form not available</h4>
                    <p>{viewing.error}</p>
                </div>
            );
        }

        const { form, record, rows } = viewing;

        const owner = customers.find(
            (item) => Number(item.Id) === Number(form.CustomerId ?? record.CustomerId)
        );

        const name = form.CustomerName || owner?.CustomerName || customerName;

        const logoSrc =
            owner?.LogoImgURL && !brokenLogos[owner.Id]
                ? `${BASE_IMAGE_API_GET}${encodeURI(owner.LogoImgURL)}`
                : null;

        const statusKey = normalizeStatus(form.Status || record.Status);
        const meta = statusMeta(statusKey);
        const answered = rows.filter(hasAnswer).length;

        // Once anything is answered, or the request is no longer open, the
        // form is a record of what was sent — nothing on it can be typed into.
        const locked =
            answered > 0 || isLockedStatus(statusKey) || statusKey === "SUBMITTED";

        const respondent = form.RespondentName || record.RespondentName;
        const submittedOn = form.SubmittedOn || record.SubmittedOn;

        return (
            <FeedbackFormPreview
                key={viewing.code}
                customerName={name}
                logoSrc={logoSrc}
                onLogoError={() =>
                    owner && setBrokenLogos((prev) => ({ ...prev, [owner.Id]: true }))
                }
                periodText={form.Period || record.Period}
                rows={rows}
                badge={
                    <span className={`fbr-view-status ${meta.tone}`}>
                        <i className={`bi ${meta.icon} me-1`}></i>
                        {meta.label}
                    </span>
                }
                meta={[
                    { key: "code", icon: "bi-hash", text: `Code ${viewing.code}` },
                    {
                        key: "count",
                        icon: "bi-list-check",
                        text: `${rows.length} question${rows.length === 1 ? "" : "s"}`,
                    },
                    ...(answered
                        ? [{ key: "answered", icon: "bi-check2-all", text: `${answered} answered` }]
                        : []),
                    ...(respondent
                        ? [{ key: "who", icon: "bi-person", text: respondent }]
                        : []),
                    ...(submittedOn
                        ? [{ key: "when", icon: "bi-calendar-check", text: formatDate(submittedOn) }]
                        : []),
                ]}
                foot={
                    answered
                        ? `Read-only — these are the answers the ${one} submitted.`
                        : locked
                        ? `Read-only — this request is ${meta.label.toLowerCase()} and was not answered.`
                        : `This is the form the ${one} sees. Nothing typed here is saved.`
                }
                emptyText="No questions on this form yet — add them in Edit setup."
                readOnly={locked}
            />
        );
    };

    // -------------------------------------------------------------
    // RENDER
    // -------------------------------------------------------------

    return (
        <Base1>

            {/* ================= TOOLBAR ================= */}

            <div id="kt_app_toolbar" className="app-toolbar py-3 py-lg-6">
                <div
                    id="kt_app_toolbar_container"
                    className="app-container container-xxl d-flex flex-stack flex-wrap gap-3"
                >
                    <div className="page-title d-flex flex-column justify-content-center flex-wrap me-3">
                        <h1 className="page-heading d-flex text-gray-900 fw-bold fs-3 flex-column justify-content-center my-0">
                            Feedback Requests
                        </h1>

                        <ul className="breadcrumb breadcrumb-separatorless fw-semibold fs-7 my-0 pt-1">
                            <li className="breadcrumb-item text-muted">
                                <a
                                    href={navigationPath}
                                    className="text-muted text-hover-primary"
                                >
                                    Home
                                </a>
                            </li>
                            <li className="breadcrumb-item">
                                <span className="bullet bg-gray-500 w-5px h-2px"></span>
                            </li>
                            <li className="breadcrumb-item text-muted">
                                Feedback Requests
                            </li>
                            <li className="breadcrumb-item">
                                <span className="bullet bg-gray-500 w-5px h-2px"></span>
                            </li>
                            <li className="breadcrumb-item text-gray-700">
                                {party.label}
                            </li>
                        </ul>
                    </div>

                    {/* ---------- Feedback type ---------- */}
                    <div className="fbr-type">
                        <span className="fbr-type-label">
                            <i className="bi bi-diagram-3 me-1"></i>
                            Feedback from
                        </span>

                        <Select
                            size="large"
                            className="fbr-type-select"
                            popupClassName="fbr-type-popup"
                            value={feedbackType}
                            onChange={setFeedbackType}
                            options={FEEDBACK_TYPES.map((type) => ({
                                value: type.value,
                                label: (
                                    <span className="fbr-type-opt">
                                        <i className={`bi ${type.icon}`}></i>
                                        <span className="fbr-type-opt-text">{type.label}</span>
                                        {!type.ready && (
                                            <span className="fbr-soon-tag">Soon</span>
                                        )}
                                    </span>
                                ),
                            }))}
                        />
                    </div>
                </div>
            </div>

            {/* ================= CONTENT ================= */}

            <div id="kt_app_content" className="app-content flex-column-fluid pt-2">
                <div id="kt_app_content_container" className="app-container container-xxl mb-15">

                    {/* ---------- Suppliers / Employees: coming soon ---------- */}

                    {!party.ready && (
                        <div className="fbr-soon" key={party.value}>
                            <span className="fbr-soon-icon">
                                <i className={`bi ${party.icon}`}></i>
                            </span>

                            <span className="fbr-soon-badge">
                                <span className="fbr-soon-pulse"></span>
                                Coming soon
                            </span>

                            <h3>{party.singular} feedback is on its way</h3>

                            <p>
                                We’re building feedback requests for {many}. Soon you’ll be
                                able to choose a {one}, send them a feedback form and track
                                every response, just like you can for customers today.
                            </p>

                            <div className="fbr-soon-progress">
                                <span></span>
                            </div>

                            <Button
                                size="large"
                                className="fbr-soon-back"
                                onClick={() => setFeedbackType(DEFAULT_TYPE)}
                            >
                                <i className="bi bi-arrow-left me-2"></i>
                                Back to Customers
                            </Button>
                        </div>
                    )}

                    {party.ready && (
                        <>
                            {/* ---------- Party + Create ---------- */}

                            <div className="fbr-card">
                                <div className="fbr-card-head">
                                    <span className="fbr-card-badge">
                                        <i className={`bi ${party.icon} text-white`}></i>
                                    </span>

                                    <div>
                                        <h3 className="fbr-card-title">Choose {party.singular}</h3>
                                        <div className="fbr-card-sub">
                                            Pick a {one} to see the feedback requests already
                                            raised for them, or start a new one.
                                        </div>
                                    </div>
                                </div>

                                <div className="fbr-card-body">
                                    <div className="row g-3 align-items-end">
                                        <div className="col-12 col-lg-5">
                                            <label className="fbr-label">{party.singular}</label>

                                            <Select
                                                showSearch
                                                size="large"
                                                style={{ width: "100%" }}
                                                placeholder={
                                                    customersLoading
                                                        ? `Loading ${many}…`
                                                        : `Select a ${one}`
                                                }
                                                loading={customersLoading}
                                                optionFilterProp="label"
                                                value={customerId}
                                                onChange={(value) => {
                                                    setCustomerId(value);

                                                    // A new customer means the list on
                                                    // screen is stale — clear it rather
                                                    // than leave someone else's rows up.
                                                    setRequests([]);
                                                    setLoadedCustomerId(null);

                                                    // Picking a customer loads their
                                                    // requests straight away.
                                                    if (value) {
                                                        handleLoadRequests(value);
                                                    } else {
                                                        setMode(null);
                                                    }
                                                }}
                                                options={customers.map((item) => ({
                                                    value: item.Id,
                                                    label: item.CustomerName,
                                                }))}
                                            />
                                        </div>

                                        <div className="col-12 col-lg-7">
                                            <div className="fbr-actions-row">
                                                <div className="fbr-actions">
                                                    <Button
                                                        size="large"
                                                        type="primary"
                                                        className="fbr-btn-primary"
                                                        disabled={!customerId}
                                                        onClick={handleCreateRequest}
                                                    >
                                                        <i className="bi bi-plus-lg me-2 text-white"></i>
                                                        Create Request
                                                    </Button>
                                                </div>

                                                {/* The chosen customer, so it's obvious who
                                                    everything below belongs to. */}
                                                {selectedCustomer && (
                                                    <div className="fbr-customer-chip">
                                                        <span className="fbr-customer-logo">
                                                            {selectedLogoSrc ? (
                                                                <img
                                                                    src={selectedLogoSrc}
                                                                    alt={selectedCustomer.CustomerName}
                                                                    onError={() =>
                                                                        setBrokenLogos((prev) => ({
                                                                            ...prev,
                                                                            [selectedCustomer.Id]: true,
                                                                        }))
                                                                    }
                                                                />
                                                            ) : (
                                                                <span>{initialsOf(selectedCustomer.CustomerName)}</span>
                                                            )}
                                                        </span>

                                                        <div className="fbr-customer-text">
                                                            <div className="fbr-customer-name">
                                                                {selectedCustomer.CustomerName}
                                                            </div>
                                                            {selectedCustomer.ContactPerson && (
                                                                <div className="fbr-customer-sub">
                                                                    <i className="bi bi-person me-1"></i>
                                                                    {selectedCustomer.ContactPerson}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* ---------- Nothing chosen yet ---------- */}

                            {!mode && (
                                <div className="fbr-placeholder">
                                    <span className="fbr-placeholder-icon">
                                        <i className="bi bi-clipboard-check"></i>
                                    </span>

                                    <h4>Pick a {one} to begin</h4>
                                    <p>
                                        Their feedback requests load as soon as you choose
                                        them. <strong>Create Request</strong> starts a new one
                                        for a month that is still free.
                                    </p>
                                </div>
                            )}

                            {/* ---------- LOAD ---------- */}

                            {mode === "load" && (
                                <>
                                    {/* Period on the left half, counts on the right */}
                                    <div className="row g-4 fbr-overview">
                                        <div className="col-12 col-lg-6">
                                            {/* Period filter */}
                                            <div className="fbr-card h-100 mb-0">
                                                <div className="fbr-card-head">
                                                    <span className="fbr-card-badge">
                                                        <i className="bi bi-funnel text-white"></i>
                                                    </span>

                                                    <div className="flex-grow-1">
                                                        <h3 className="fbr-card-title">Period</h3>
                                                        <div className="fbr-card-sub">
                                                            Narrow the list to a year, or to one month
                                                            within it.
                                                        </div>
                                                    </div>

                                                    {filterIsOn && (
                                                        <button
                                                            type="button"
                                                            className="fbr-clear-btn"
                                                            onClick={() => {
                                                                setLoadYear(thisYear);
                                                                setLoadMonth(ALL_MONTHS);
                                                            }}
                                                        >
                                                            <i className="bi bi-x-circle me-1"></i>
                                                            Clear filter
                                                        </button>
                                                    )}
                                                </div>

                                                <div className="fbr-card-body">
                                                    <div className="row g-3 align-items-end">
                                                        <div className="col-5">
                                                            <label className="fbr-label">Year</label>

                                                            <Select
                                                                size="large"
                                                                style={{ width: "100%" }}
                                                                value={loadYear}
                                                                onChange={setLoadYear}
                                                                options={YEARS.map((value) => ({
                                                                    value,
                                                                    label: String(value),
                                                                }))}
                                                            />
                                                        </div>

                                                        <div className="col-7">
                                                            <label className="fbr-label">Month</label>

                                                            <Select
                                                                size="large"
                                                                style={{ width: "100%" }}
                                                                value={loadMonth}
                                                                onChange={setLoadMonth}
                                                                loading={periodsLoading}
                                                                options={loadMonthOptions}
                                                                notFoundContent={
                                                                    periodsLoading
                                                                        ? "Loading…"
                                                                        : "No months returned"
                                                                }
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="col-12 col-lg-6">
                                            {/* Counts */}
                                            <div className="fbr-stats">
                                                {statusCounts.map((status) => (
                                                    <div
                                                        className={`fbr-stat ${status.tone}`}
                                                        key={status.key}
                                                    >
                                                        <span className="fbr-stat-icon">
                                                            <i className={`bi ${status.icon} text-white`}></i>
                                                        </span>

                                                        <div className="fbr-stat-text">
                                                            <span className="fbr-stat-count">
                                                                {status.count}
                                                            </span>
                                                            <span className="fbr-stat-label">
                                                                {status.label}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}

                                                <div className="fbr-stat total">
                                                    <span className="fbr-stat-icon">
                                                        <i className="bi bi-collection text-white"></i>
                                                    </span>

                                                    <div className="fbr-stat-text">
                                                        <span className="fbr-stat-count">
                                                            {visibleRequests.length}
                                                        </span>
                                                        <span className="fbr-stat-label">Total</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* List */}
                                    <div className="fbr-card">
                                        <div className="fbr-card-head">
                                            <span className="fbr-card-badge">
                                                <i className="bi bi-list-check text-white"></i>
                                            </span>

                                            <div className="flex-grow-1">
                                                <h3 className="fbr-card-title">
                                                    {party.singular} Feedback Requests
                                                </h3>
                                                <div className="fbr-card-sub">
                                                    {customerName || `This ${one}`} ·{" "}
                                                    {loadMonth === ALL_MONTHS
                                                        ? loadYear
                                                        : `${monthNameOf(loadMonth)} ${loadYear}`}{" "}
                                                    · {visibleRequests.length} request
                                                    {visibleRequests.length === 1 ? "" : "s"}
                                                </div>
                                            </div>

                                            <Tooltip title="Refresh">
                                                <button
                                                    type="button"
                                                    className="fbr-icon-btn refresh"
                                                    onClick={() => handleLoadRequests()}
                                                    disabled={requestsLoading}
                                                >
                                                    <i
                                                        className={`bi bi-arrow-clockwise ${
                                                            requestsLoading ? "fbr-spin" : ""
                                                        }`}
                                                    ></i>
                                                </button>
                                            </Tooltip>
                                        </div>

                                        <div className="fbr-table-wrap">
                                            <Table
                                                rowKey="Id"
                                                columns={columns}
                                                dataSource={visibleRequests}
                                                loading={requestsLoading}
                                                size="middle"
                                                scroll={{ x: 1000 }}
                                                rowClassName={(record) =>
                                                    normalizeStatus(record.Status) ===
                                                    REQUEST_STATUS.DRAFT
                                                        ? "fbr-row-draft"
                                                        : ""
                                                }
                                                pagination={{
                                                    pageSize: 10,
                                                    showSizeChanger: true,
                                                    pageSizeOptions: [10, 20, 50],
                                                    showTotal: (total, range) =>
                                                        `${range[0]}–${range[1]} of ${total}`,
                                                }}
                                                locale={{
                                                    emptyText: (
                                                        <Empty
                                                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                                                            description={
                                                                filterIsOn
                                                                    ? "Nothing raised for that period"
                                                                    : `No feedback requests raised for this ${one} yet`
                                                            }
                                                        />
                                                    ),
                                                }}
                                            />
                                        </div>
                                    </div>
                                </>
                            )}
                        </>
                    )}

                </div>
            </div>

            {/* ================= VIEW FORM ================= */}

            <Modal
                open={Boolean(viewing)}
                onCancel={closeView}
                width={940}
                style={{ top: 28 }}
                destroyOnHidden
                title={null}
                className={`fbr-view-modal ${
                    viewing && !viewing.loading && !viewing.error ? "on-dark" : ""
                }`}
                footer={
                    viewing && !viewing.loading
                        ? [
                              <Button key="close" className="fbr-view-close" onClick={closeView}>
                                  Close
                              </Button>,
                              hasCustomerFeedback(viewing.record) && (
                                  <Button
                                      key="reply"
                                      className="fbr-view-close"
                                      onClick={() => {
                                          const record = viewing.record;
                                          closeView();
                                          openComments(record, "reply");
                                      }}
                                  >
                                      <i className="bi bi-reply me-2"></i>
                                      Reply to {one}
                                  </Button>
                              ),
                              canEditSetup(viewing.record) && (
                                  <Button
                                      key="edit"
                                      type="primary"
                                      className="fbr-btn-primary fbr-view-edit"
                                      onClick={() => {
                                          const record = viewing.record;
                                          closeView();
                                          handleEditSetup(record);
                                      }}
                                  >
                                      <i className="bi bi-sliders me-2"></i>
                                      Edit setup
                                  </Button>
                              ),
                          ]
                        : null
                }
            >
                {viewing && viewModalBody()}
            </Modal>

            {/* ================= COMMENTS & REPLY ================= */}

            <FeedbackCommentsModal
                open={Boolean(commentsFor)}
                record={commentsFor}
                defaultTab={commentsTab}
                customer={customers.find(
                    (item) => Number(item.Id) === Number(commentsFor?.CustomerId ?? loadedCustomerId)
                )}
                customerLogoUrl={logoUrlOf(commentsFor || { CustomerId: loadedCustomerId })}
                sessionUserData={sessionUserData}
                org={org}
                statusLabel={commentsFor ? statusMeta(commentsFor.Status).label : ""}
                onChange={() => setCommentsTick((tick) => tick + 1)}
                onClose={() => setCommentsFor(null)}
            />

            {/* ================= STYLES ================= */}

            <style>{`

                /* ----- Feedback type (header) ----- */

                .fbr-type {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin-left: auto;
                    padding: 6px 6px 6px 14px;
                    border-radius: 14px;
                    background: #ffffff;
                    border: 1px solid #e8eef5;
                    box-shadow: 0 8px 22px rgba(22, 50, 80, .06);
                }

                .fbr-type-label {
                    font-size: 12px;
                    font-weight: 700;
                    letter-spacing: .06em;
                    text-transform: uppercase;
                    color: #8190a0;
                    white-space: nowrap;
                }

                .fbr-type-select { width: 210px; }

                .fbr-type-select .ant-select-selector,
                .fbr-type-select.ant-select-outlined .ant-select-selector {
                    border-radius: 10px !important;
                    background: #f6f9fc !important;
                    border-color: #e6edf5 !important;
                    font-weight: 600;
                }

                .fbr-type-opt {
                    display: flex;
                    align-items: center;
                    gap: 9px;
                    width: 100%;
                }

                .fbr-type-opt > .bi {
                    width: 26px;
                    height: 26px;
                    flex: none;
                    border-radius: 8px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 13px;
                    color: #0271ae;
                    background: #e8f4fc;
                }

                .fbr-type-opt-text { flex: 1 1 auto; color: #12263f; }

                .fbr-soon-tag {
                    flex: none;
                    margin-left: auto;
                    padding: 2px 8px;
                    border-radius: 999px;
                    font-size: 10px;
                    font-weight: 800;
                    letter-spacing: .06em;
                    text-transform: uppercase;
                    color: #b45309;
                    background: #fff4dc;
                }

                .fbr-type-popup .ant-select-item-option { padding: 8px 10px; border-radius: 9px; }


                /* ----- Coming soon (Suppliers / Employees) ----- */

                .fbr-soon {
                    padding: 54px 24px 46px;
                    text-align: center;
                    border-radius: 22px;
                    border: 1px solid #e8eef5;
                    background:
                        radial-gradient(circle at 15% 0%, rgba(10, 148, 214, .08), transparent 45%),
                        radial-gradient(circle at 85% 100%, rgba(124, 58, 237, .07), transparent 45%),
                        #ffffff;
                    box-shadow: 0 10px 30px rgba(22, 50, 80, .06);
                    animation: fbrRise .45s cubic-bezier(.2, .8, .2, 1) backwards;
                }

                .fbr-soon-icon {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    width: 74px;
                    height: 74px;
                    border-radius: 22px;
                    font-size: 30px;
                    color: #ffffff;
                    background: linear-gradient(135deg, #0271ae, #0a94d6);
                    box-shadow: 0 16px 30px -12px rgba(2, 113, 174, .6);
                    animation: fbrFloat 3.2s ease-in-out infinite;
                }

                .fbr-soon-badge {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    width: max-content;
                    margin: 20px auto 12px;
                    padding: 6px 14px;
                    border-radius: 999px;
                    background: #fff4dc;
                    color: #b45309;
                    font-size: 11.5px;
                    font-weight: 800;
                    letter-spacing: .12em;
                    text-transform: uppercase;
                }

                .fbr-soon-pulse {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    background: #f59e0b;
                    animation: fbrPulse 1.6s ease-out infinite;
                }

                .fbr-soon h3 {
                    margin: 0 0 8px;
                    font-size: 22px;
                    font-weight: 800;
                    color: #12263f;
                }

                .fbr-soon p {
                    max-width: 500px;
                    margin: 0 auto 22px;
                    font-size: 14px;
                    line-height: 1.65;
                    color: #6b7a8d;
                }

                .fbr-soon-progress {
                    position: relative;
                    width: min(320px, 100%);
                    height: 7px;
                    margin: 0 auto 24px;
                    border-radius: 99px;
                    background: #eef3f8;
                    overflow: hidden;
                }

                .fbr-soon-progress span {
                    position: absolute;
                    top: 0;
                    bottom: 0;
                    width: 40%;
                    border-radius: 99px;
                    background: linear-gradient(90deg, #0271ae, #0a94d6);
                    animation: fbrSlideBar 1.8s ease-in-out infinite;
                }

                .fbr-soon-back {
                    height: 42px;
                    padding: 0 20px;
                    border-radius: 11px;
                    font-weight: 600;
                    color: #0271ae;
                    border-color: #cfe3f2;
                    background: #f2f9ff;
                }

                .fbr-soon-back:hover {
                    color: #ffffff !important;
                    border-color: #0271ae !important;
                    background: #0271ae !important;
                }

                @keyframes fbrRise {
                    from { opacity: 0; transform: translateY(12px); }
                    to   { opacity: 1; transform: none; }
                }

                @keyframes fbrFloat {
                    0%, 100% { transform: translateY(0); }
                    50%      { transform: translateY(-6px); }
                }

                @keyframes fbrPulse {
                    0%   { box-shadow: 0 0 0 0 rgba(245, 158, 11, .5); }
                    100% { box-shadow: 0 0 0 10px rgba(245, 158, 11, 0); }
                }

                @keyframes fbrSlideBar {
                    0%   { left: -40%; }
                    100% { left: 100%; }
                }


                /* ----- Cards ----- */

                .fbr-card {
                    background: #ffffff;
                    border: 1px solid #e8eef5;
                    border-radius: 18px;
                    box-shadow: 0 10px 30px rgba(22, 50, 80, 0.06);
                    overflow: hidden;
                    margin-bottom: 18px;
                }

                .fbr-card-head {
                    display: flex;
                    align-items: center;
                    gap: 14px;
                    padding: 18px 20px;
                    border-bottom: 1px solid #eef3f8;
                    background: linear-gradient(180deg, #ffffff 0%, #fcfdff 100%);
                }

                .fbr-card-badge {
                    width: 46px;
                    height: 46px;
                    flex: none;
                    border-radius: 14px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #ffffff;
                    font-size: 18px;
                    background: linear-gradient(135deg, #0271ae, #0a94d6);
                    box-shadow: 0 8px 18px rgba(2, 113, 174, 0.28);
                }

                .fbr-card-badge.amber {
                    background: linear-gradient(135deg, #d97706, #f59e0b);
                    box-shadow: 0 8px 18px rgba(217, 119, 6, 0.26);
                }

                .fbr-card-title {
                    margin: 0;
                    font-size: 17px;
                    font-weight: 700;
                    color: #12263f;
                }

                .fbr-card-sub {
                    margin-top: 2px;
                    font-size: 12.5px;
                    color: #8190a0;
                }

                .fbr-card-body { padding: 18px 20px; }

                .fbr-label {
                    display: block;
                    margin-bottom: 6px;
                    font-size: 12.5px;
                    font-weight: 600;
                    color: #46566a;
                }

                .fbr-chip {
                    flex: none;
                    padding: 5px 11px;
                    border-radius: 9px;
                    background: #f1f5fa;
                    color: #46566a;
                    font-size: 12px;
                    font-weight: 700;
                    white-space: nowrap;
                }

                .fbr-note {
                    margin-top: 14px;
                    padding: 11px 14px;
                    border-radius: 11px;
                    background: #fffbeb;
                    border: 1px solid #fde68a;
                    color: #b45309;
                    font-size: 12.5px;
                }


                /* ----- The two buttons ----- */

                .fbr-actions {
                    display: flex;
                    gap: 10px;
                    flex-wrap: wrap;
                }

                .fbr-btn-choice {
                    height: 40px;
                    padding: 0 22px;
                    border-radius: 11px;
                    font-weight: 600;
                    color: #0271ae;
                    border-color: #cfe3f2;
                    background: #f2f9ff;
                }

                .fbr-btn-choice:hover:not(:disabled) {
                    color: #ffffff !important;
                    border-color: #0271ae !important;
                    background: #0271ae !important;
                }

                /* The half currently on screen keeps a ring, so it is obvious
                   which button produced what is below. */
                .fbr-btn-choice.is-on {
                    color: #ffffff !important;
                    border-color: #0271ae !important;
                    background: #0271ae !important;
                    box-shadow: 0 0 0 3px rgba(2, 113, 174, .15);
                }

                .fbr-btn-primary {
                    height: 40px;
                    padding: 0 22px;
                    border: none;
                    border-radius: 11px;
                    font-weight: 600;
                    background: linear-gradient(135deg, #0271ae, #0a94d6);
                    box-shadow: 0 10px 22px rgba(2, 113, 174, 0.28);
                }

                .fbr-btn-primary:hover:not(:disabled) { filter: brightness(1.06); }

                .fbr-btn-primary.is-on { box-shadow: 0 0 0 3px rgba(2, 113, 174, .18); }


                /* ----- Status counts ----- */

                .fbr-stats {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
                    gap: 12px;
                    margin-bottom: 18px;
                }

                .fbr-stat {
                    position: relative;
                    overflow: hidden;
                    display: flex;
                    align-items: center;
                    gap: 13px;
                    padding: 15px 17px;
                    border-radius: 16px;
                    border: 1px solid #e8eef5;
                    background: #ffffff;
                    box-shadow: 0 8px 24px rgba(22, 50, 80, .05);
                    transition: transform .15s ease, box-shadow .15s ease;
                }

                .fbr-stat:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 14px 30px rgba(22, 50, 80, .09);
                }

                .fbr-stat-icon {
                    position: relative;
                    z-index: 1;
                    width: 44px;
                    height: 44px;
                    flex: none;
                    border-radius: 14px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 18px;
                    color: #ffffff;
                }

                .fbr-stat-icon .bi { display: inline-block; }

                .fbr-stat:hover .fbr-stat-icon .bi { animation: fbrWiggle .6s ease; }

                /* A soft bubble of the tile's colour in the corner. */
                .fbr-stat::after {
                    content: "";
                    position: absolute;
                    right: -26px;
                    bottom: -30px;
                    width: 96px;
                    height: 96px;
                    border-radius: 50%;
                    opacity: .12;
                    background: var(--fbr-tone, #0271ae);
                    transition: transform .3s ease;
                }

                .fbr-stat:hover::after { transform: scale(1.15); }

                .fbr-stat-text { position: relative; z-index: 1; }

                .fbr-stat-text { display: flex; flex-direction: column; min-width: 0; }

                .fbr-stat-count {
                    font-size: 22px;
                    font-weight: 800;
                    line-height: 1.1;
                    color: #12263f;
                }

                .fbr-stat-label {
                    font-size: 11.5px;
                    font-weight: 700;
                    letter-spacing: .07em;
                    text-transform: uppercase;
                    color: #8190a0;
                }

                .fbr-stat.draft   { --fbr-tone: #7c3aed; }
                .fbr-stat.open    { --fbr-tone: #10b981; }
                .fbr-stat.sent    { --fbr-tone: #0a94d6; }
                .fbr-stat.received { --fbr-tone: #10b981; }
                .fbr-stat.closed  { --fbr-tone: #f97316; }
                .fbr-stat.neutral { --fbr-tone: #ec4899; }

                .fbr-stat.draft .fbr-stat-icon {
                    background: linear-gradient(135deg, #6366f1, #a855f7);
                    box-shadow: 0 8px 18px rgba(124, 58, 237, .32);
                }

                .fbr-stat.open .fbr-stat-icon {
                    background: linear-gradient(135deg, #10b981, #06b6d4);
                    box-shadow: 0 8px 18px rgba(16, 185, 129, .32);
                }

                .fbr-stat.sent .fbr-stat-icon {
                    background: linear-gradient(135deg, #0271ae, #38bdf8);
                    box-shadow: 0 8px 18px rgba(2, 113, 174, .32);
                }

                .fbr-stat.received .fbr-stat-icon {
                    background: linear-gradient(135deg, #10b981, #84cc16);
                    box-shadow: 0 8px 18px rgba(16, 185, 129, .32);
                }

                .fbr-stat.closed .fbr-stat-icon {
                    background: linear-gradient(135deg, #f59e0b, #f97316);
                    box-shadow: 0 8px 18px rgba(249, 115, 22, .32);
                }

                .fbr-stat.neutral .fbr-stat-icon {
                    background: linear-gradient(135deg, #ec4899, #f43f5e);
                    box-shadow: 0 8px 18px rgba(236, 72, 153, .32);
                }

                .fbr-stat.total {
                    background: linear-gradient(135deg, #0271ae, #0a94d6);
                    border-color: transparent;
                    box-shadow: 0 10px 26px rgba(2, 113, 174, .28);
                }

                .fbr-stat.total { --fbr-tone: #ffffff; }

                .fbr-stat.total::after { opacity: .14; }

                .fbr-stat.total .fbr-stat-icon {
                    background: rgba(255, 255, 255, .2);
                    color: #ffffff;
                    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .25);
                }

                .fbr-stat.total .fbr-stat-count { color: #ffffff; }

                .fbr-stat.total .fbr-stat-label { color: rgba(255, 255, 255, .8); }


                /* ----- Table ----- */

                .fbr-table-wrap { padding: 6px 10px 10px; }

                .fbr-table-wrap .ant-table { background: transparent; font-size: 13.5px; }

                .fbr-table-wrap .ant-table-thead > tr > th {
                    background: #f7fafd;
                    color: #6b7a8d;
                    font-size: 11.5px;
                    font-weight: 700;
                    letter-spacing: .05em;
                    text-transform: uppercase;
                    border-bottom: 1px solid #eef3f8;
                }

                .fbr-table-wrap .ant-table-tbody > tr > td {
                    border-bottom: 1px solid #f2f6fa;
                    padding-top: 12px;
                    padding-bottom: 12px;
                }

                .fbr-table-wrap .ant-table-tbody > tr:hover > td { background: #f8fbff; }

                /* A draft is the only row anyone has to act on. */
                .fbr-table-wrap .fbr-row-draft > td:first-child {
                    box-shadow: inset 3px 0 0 #7c3aed;
                }

                .fbr-table-wrap .fbr-row-draft > td { background: #fbfcff; }

                .fbr-serial {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    min-width: 26px;
                    height: 24px;
                    padding: 0 7px;
                    border-radius: 7px;
                    background: #f1f5fa;
                    color: #7a8795;
                    font-size: 12px;
                    font-weight: 600;
                }

                .fbr-period { font-size: 14px; font-weight: 600; color: #12263f; }

                .fbr-code {
                    display: inline-block;
                    padding: 3px 10px;
                    border-radius: 8px;
                    background: #f4f8fc;
                    border: 1px solid #e6edf5;
                    color: #46566a;
                    font-size: 12.5px;
                    font-weight: 600;
                    letter-spacing: .04em;
                }

                .fbr-status {
                    margin: 0;
                    border: none;
                    border-radius: 8px;
                    padding: 4px 10px;
                    font-size: 11.5px;
                    font-weight: 600;
                }

                .fbr-status.draft   { background: #f3f0ff; color: #6d28d9; }
                .fbr-status.open    { background: #ecfdf5; color: #059669; }
                .fbr-status.sent    { background: #e8f4fc; color: #0271ae; }
                .fbr-status.received { background: #ecfdf5; color: #059669; }
                .fbr-status.closed  { background: #fff7ed; color: #c2410c; }
                .fbr-status.neutral { background: #fdf2f8; color: #be185d; }

                .fbr-respondent { display: flex; flex-direction: column; min-width: 0; }

                .fbr-respondent-name { font-weight: 600; color: #12263f; }

                .fbr-respondent-mail {
                    font-size: 12px;
                    color: #8190a0;
                    text-decoration: none;
                }

                .fbr-respondent-mail:hover { color: #0271ae; }


                /* ----- Icon buttons ----- */

                .fbr-icon-btn {
                    width: 34px;
                    height: 34px;
                    flex: none;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 10px;
                    border: 1px solid #e6edf5;
                    background: #ffffff;
                    font-size: 13px;
                    cursor: pointer;
                    transition: all .18s ease;
                }

                .fbr-icon-btn .bi { display: inline-block; }

                /* Row actions: tinted, pop in with the row, and move on hover —
                   the eye blinks, the sliders slide. */
                .fbr-icon-btn.view,
                .fbr-icon-btn.edit {
                    width: 36px;
                    height: 36px;
                    border-radius: 11px;
                    font-size: 15px;
                    animation: fbrPop .35s cubic-bezier(.34, 1.56, .64, 1) backwards;
                }

                .fbr-icon-btn.view {
                    color: #0284c7;
                    border-color: #bae6fd;
                    background: linear-gradient(135deg, #e0f2fe, #ecfeff);
                }

                .fbr-icon-btn.view:hover {
                    color: #ffffff;
                    border-color: transparent;
                    background: linear-gradient(135deg, #0ea5e9, #06b6d4);
                    transform: translateY(-2px);
                    box-shadow: 0 10px 18px rgba(14, 165, 233, .35);
                }

                .fbr-icon-btn.view:hover .bi { animation: fbrBlink .7s ease; }

                .fbr-icon-btn.edit {
                    color: #7c3aed;
                    border-color: #e9d5ff;
                    background: linear-gradient(135deg, #f3e8ff, #fdf4ff);
                    animation-delay: .06s;
                }

                .fbr-icon-btn.edit:hover:not(:disabled) {
                    color: #ffffff;
                    border-color: transparent;
                    background: linear-gradient(135deg, #8b5cf6, #d946ef);
                    transform: translateY(-2px);
                    box-shadow: 0 10px 18px rgba(139, 92, 246, .35);
                }

                .fbr-icon-btn.edit:hover:not(:disabled) .bi { animation: fbrSlide .7s ease; }

                .fbr-icon-btn:disabled {
                    opacity: 1;
                    color: #c3cad4;
                    border-color: #eef2f7;
                    background: #f8fafc;
                    cursor: not-allowed;
                    animation: none;
                }

                .fbr-icon-btn:active:not(:disabled) { transform: translateY(0) scale(.94); }

                .fbr-icon-btn.comments {
                    position: relative;
                    width: 36px;
                    height: 36px;
                    border-radius: 11px;
                    font-size: 15px;
                    color: #d97706;
                    border-color: #fde68a;
                    background: linear-gradient(135deg, #fffbeb, #fff7ed);
                    animation: fbrPop .35s cubic-bezier(.34, 1.56, .64, 1) .12s backwards;
                }

                .fbr-icon-btn.comments:hover {
                    color: #ffffff;
                    border-color: transparent;
                    background: linear-gradient(135deg, #f59e0b, #f97316);
                    transform: translateY(-2px);
                    box-shadow: 0 10px 18px rgba(245, 158, 11, .35);
                }

                .fbr-icon-count {
                    position: absolute;
                    top: -7px;
                    right: -7px;
                    min-width: 18px;
                    height: 18px;
                    padding: 0 5px;
                    border-radius: 999px;
                    display: grid;
                    place-items: center;
                    font-size: 10.5px;
                    font-weight: 800;
                    color: #ffffff;
                    background: #ef4444;
                    box-shadow: 0 0 0 2px #ffffff;
                }


                /* A draft still needs setting up, so its Edit button glows. */
                .fbr-row-draft .fbr-icon-btn.edit {
                    animation:
                        fbrPop .35s cubic-bezier(.34, 1.56, .64, 1) .06s backwards,
                        fbrGlow 2.4s ease-in-out .5s infinite;
                }

                @keyframes fbrPop {
                    from { opacity: 0; transform: scale(.6); }
                    to   { opacity: 1; transform: scale(1); }
                }

                @keyframes fbrBlink {
                    0%, 100% { transform: scaleY(1); }
                    35%      { transform: scaleY(.1); }
                    55%      { transform: scaleY(1); }
                }

                @keyframes fbrSlide {
                    0%, 100% { transform: translateX(0) rotate(0); }
                    30%      { transform: translateX(-2px) rotate(-12deg); }
                    65%      { transform: translateX(2px) rotate(10deg); }
                }

                @keyframes fbrGlow {
                    0%, 100% { box-shadow: 0 0 0 0 rgba(139, 92, 246, .35); }
                    50%      { box-shadow: 0 0 0 6px rgba(139, 92, 246, 0); }
                }

                @keyframes fbrWiggle {
                    0%, 100% { transform: rotate(0) scale(1); }
                    30%      { transform: rotate(-12deg) scale(1.12); }
                    60%      { transform: rotate(8deg) scale(1.05); }
                }

                @media (prefers-reduced-motion: reduce) {
                    .fbr-icon-btn, .fbr-icon-btn .bi, .fbr-stat-icon .bi,
                    .fbr-soon, .fbr-soon-icon, .fbr-soon-pulse, .fbr-soon-progress span { animation: none !important; }
                }

                .fbr-icon-btn.refresh {
                    width: 44px;
                    height: 44px;
                    border-radius: 11px;
                    color: #46566a;
                    font-size: 15px;
                }

                .fbr-icon-btn.refresh:hover:not(:disabled) {
                    border-color: #b9cbe0;
                    color: #0271ae;
                }

                .fbr-icon-btn:disabled { opacity: .6; cursor: not-allowed; }

                .fbr-spin { display: inline-block; animation: fbrSpin 1s linear infinite; }

                @keyframes fbrSpin { to { transform: rotate(360deg); } }


                /* ----- Buttons + chosen customer ----- */

                /* Buttons sit on the Select's baseline: the row bottom-aligns,
                   so they line up with the dropdown whether or not the
                   customer chip (taller) is showing beside them. */
                .fbr-actions-row {
                    display: flex;
                    align-items: flex-end;
                    justify-content: space-between;
                    gap: 14px;
                    flex-wrap: wrap;
                }

                .fbr-customer-chip {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    min-width: 0;
                    max-width: 100%;
                    margin-left: auto;
                    padding: 7px 16px 7px 7px;
                    border-radius: 16px;
                    background: #f6f9fc;
                    border: 1px solid #e8eef5;
                }

                .fbr-customer-logo {
                    width: 50px;
                    height: 50px;
                    flex: none;
                    border-radius: 13px;
                    overflow: hidden;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: #ffffff;
                    border: 1px solid #e6edf5;
                    color: #0271ae;
                    font-size: 16px;
                    font-weight: 800;
                    box-shadow: 0 6px 14px rgba(22, 50, 80, .06);
                }

                .fbr-customer-logo img {
                    width: 100%;
                    height: 100%;
                    object-fit: contain;
                    padding: 4px;
                }

                .fbr-customer-text { min-width: 0; }

                .fbr-customer-name {
                    font-size: 14.5px;
                    font-weight: 700;
                    color: #12263f;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .fbr-customer-sub {
                    margin-top: 1px;
                    font-size: 12px;
                    color: #8190a0;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }


                /* Same 18px below as between every other card. */
                .fbr-overview { margin-bottom: 18px; }

                /* ----- Counts: a 2 x 2 block the height of the Period card ----- */

                .col-lg-6 > .fbr-stats {
                    height: 100%;
                    margin-bottom: 0;
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                    grid-auto-rows: 1fr;
                }


                /* ----- Period filter ----- */

                .fbr-clear-btn {
                    flex: none;
                    border: 1px solid #e6edf5;
                    background: #ffffff;
                    color: #46566a;
                    font-size: 12.5px;
                    font-weight: 600;
                    padding: 8px 13px;
                    border-radius: 10px;
                    cursor: pointer;
                    transition: all .18s ease;
                }

                .fbr-clear-btn:hover {
                    border-color: #b9cbe0;
                    color: #0271ae;
                }


                /* ----- Month dropdown ----- */

                .fbr-month-option {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 10px;
                }

                .fbr-month-taken {
                    font-size: 10.5px;
                    font-weight: 700;
                    letter-spacing: .04em;
                    text-transform: uppercase;
                    color: #b45309;
                    background: #fff7e6;
                    padding: 2px 7px;
                    border-radius: 6px;
                }


                /* ----- Placeholder ----- */

                .fbr-placeholder {
                    padding: 46px 24px;
                    text-align: center;
                    background: #ffffff;
                    border: 1px dashed #d8e3ef;
                    border-radius: 18px;
                }

                .fbr-placeholder-icon {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    width: 62px;
                    height: 62px;
                    border-radius: 18px;
                    background: #f2f9ff;
                    color: #0271ae;
                    font-size: 26px;
                    margin-bottom: 14px;
                }

                .fbr-placeholder h4 {
                    font-size: 16px;
                    font-weight: 700;
                    color: #12263f;
                    margin: 0 0 6px;
                }

                .fbr-placeholder p {
                    max-width: 470px;
                    margin: 0 auto;
                    font-size: 13px;
                    color: #8190a0;
                }


                /* ----- View form pop-up ----- */

                .fbr-view-modal .ant-modal-content,
                .fbr-view-modal .ant-modal-container {
                    padding: 0;
                    overflow: hidden;
                    border-radius: 22px;
                }

                .fbr-view-modal .ant-modal-body { padding: 0; }

                .fbr-view-modal .efr-preview { border: 0; border-radius: 0; }

                /* Room for the close button beside the status. */
                .fbr-view-modal .efr-preview-hero { padding-right: 150px; }

                .fbr-view-modal .efr-preview-badge { top: 20px; right: 64px; }

                .fbr-view-modal .ant-modal-close {
                    top: 16px;
                    right: 16px;
                    z-index: 5;
                    border-radius: 10px;
                }

                .fbr-view-modal.on-dark .ant-modal-close { color: rgba(255, 255, 255, .8); }

                .fbr-view-modal.on-dark .ant-modal-close:hover {
                    color: #ffffff;
                    background: rgba(255, 255, 255, .14);
                }

                .fbr-view-modal .ant-modal-footer {
                    margin: 0;
                    padding: 14px 20px;
                    border-top: 1px solid #e8eef5;
                    background: #ffffff;
                }

                .fbr-view-close { height: 40px; padding: 0 20px; border-radius: 11px; font-weight: 600; }

                .fbr-view-status {
                    display: inline-flex;
                    align-items: center;
                    padding: 5px 12px;
                    border-radius: 999px;
                    font-size: 12px;
                    font-weight: 700;
                    background: rgba(255, 255, 255, .14);
                    color: #ffffff;
                }

                .fbr-view-status.draft   { background: rgba(168, 85, 247, .25); color: #e9d5ff; }
                .fbr-view-status.open    { background: rgba(16, 185, 129, .22); color: #a7f3d0; }
                .fbr-view-status.sent    { background: rgba(56, 189, 248, .22); color: #bae6fd; }
                .fbr-view-status.received { background: rgba(16, 185, 129, .22); color: #a7f3d0; }
                .fbr-view-status.closed  { background: rgba(249, 115, 22, .22); color: #fed7aa; }
                .fbr-view-status.neutral { background: rgba(236, 72, 153, .22); color: #fbcfe8; }

                .fbr-view-state {
                    padding: 64px 28px 56px;
                    text-align: center;
                }

                .fbr-view-state-text { margin-top: 14px; font-size: 13.5px; color: #8190a0; }

                .fbr-view-state-icon {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    width: 62px;
                    height: 62px;
                    border-radius: 18px;
                    background: linear-gradient(135deg, #fff7ed, #ffedd5);
                    color: #ea580c;
                    font-size: 26px;
                    margin-bottom: 14px;
                }

                .fbr-view-state h4 { margin: 0 0 6px; font-size: 17px; font-weight: 700; color: #12263f; }

                .fbr-view-state p { max-width: 440px; margin: 0 auto; font-size: 13.5px; color: #6b7a8d; }


                /* ----- Phone ----- */

                @media (max-width: 991.98px) {

                    .fbr-actions { width: 100%; }

                    .fbr-actions .ant-btn { flex: 1 1 160px; justify-content: center; }

                }

                @media (max-width: 767.98px) {

                    .fbr-type { width: 100%; }

                    .fbr-type-select { flex: 1 1 auto; width: auto; min-width: 0; }

                    .fbr-soon { padding: 40px 18px 34px; }

                    .fbr-soon h3 { font-size: 19px; }

                    .fbr-card-head { padding: 16px; }
                    .fbr-card-body { padding: 16px; }

                    .fbr-stats { grid-template-columns: repeat(2, 1fr); gap: 10px; }

                    .fbr-stat { padding: 12px 13px; gap: 10px; }

                    .fbr-stat-icon { width: 36px; height: 36px; border-radius: 11px; font-size: 15px; }

                    .fbr-stat-count { font-size: 19px; }

                    .fbr-view-modal .efr-preview-hero { padding-right: 18px; padding-top: 58px; }

                    .fbr-view-modal .efr-preview-badge { right: auto; left: 18px; top: 18px; }

                }

            `}</style>
        </Base1>
    );
}