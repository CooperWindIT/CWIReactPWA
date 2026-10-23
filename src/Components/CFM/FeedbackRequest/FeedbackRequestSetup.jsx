// =============================================================
// Feedback Request Setup — one screen, two modes
//
// Path: src/Components/CFM/pages/FeedbackRequestSetup.jsx
//
// Not routed directly. Two thin wrappers sit on the routes:
//
//   CreateFeedbackRequest.jsx  ->  <FeedbackRequestSetup mode="create" />
//       /cfm/feedback-request/create
//
//   EditFeedbackRequest.jsx    ->  <FeedbackRequestSetup mode="edit" />
//       /cfm/feedback-request/edit/:publicCode
//
// Same layout either way — the sketch for both:
//
//   header   — Customer · Year · Month · Save
//   left     — Default Content
//   right    — Additional Content: Type + Content to add, and the list
//   footer   — Setup / Edit form → Review form → Send email
//
// What differs:
//
//   create — customer, year and month are chosen here (months already raised
//            are greyed out); every default question starts ticked; nothing
//            exists until Save, which then opens the new request in edit mode.
//   edit   — the request already exists; its period is fixed, ticks come from
//            what's on the form, and answered questions are locked.
//
// In both modes each question can be dragged by its ⋮⋮ handle (or moved with
// the arrow keys on it) and marked Required or not. The order on screen —
// Default Content first, then Additional Content — is the order saved as
// DisplayOrder, and the Required ticks are saved as IsRequired.
// =============================================================

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
    Button,
    Checkbox,
    Select,
    Tag,
    Tooltip,
    Empty,
    Spin,
    Modal,
    message,
} from "antd";

import Base1 from "../../Config/Base1";
import { BASE_IMAGE_API_GET } from "../../Config/Config";

import {
    getPublicFeedbackForm,
    getDefaultContentForEdit,
    getAdditionalContentForEdit,
    getMasterTypes,
    getFeedbackContents,
    getCustomers,
    getAvailablePeriods,
    saveRequestSetup,
    readRows,
    readObject,
    readResult,
    REQUEST_STATUS,
    normalizeStatus,
    isLockedStatus,
    orgBrandingOf,
} from "../Services/cfmServices";

import FeedbackEmailComposer from "./FeedbackEmailComposer";

import FeedbackFormPreview, {
    RATING_TYPE_IDS,
    YES_NO_PATTERN,
    hasAnswer,
} from "./FeedbackFormPreview";

// Where Back returns to. It goes there with the customer in route state, so
// the list reopens on the same customer instead of an empty picker.
const LIST_ROUTE = "/cfm/feedback-request";

// The edit route, without :publicCode. A saved new request opens here.
const EDIT_ROUTE = "/cfm/feedback-request/edit";

// The email carries the customer's link, built by publicFormUrl in
// cfmServices:  https://portal-andiso.cooperwind.online/?<PublicCode>

const thisYear = new Date().getFullYear();
const YEARS = [thisYear - 1, thisYear, thisYear + 1];

// Step one is called "Setup form" when creating and "Edit form" when
// editing, as on the two sketches; the rest is shared.
const STEPS = [
    { key: "edit", label: "Edit form", createLabel: "Setup form", icon: "bi-ui-checks" },
    { key: "review", label: "Review form", icon: "bi-eye" },
    { key: "email", label: "Send email", icon: "bi-envelope-paper" },
];

// DRAFT -> EMAIL_SENT -> FEEDBACK_RECEIVED. Older names still read properly.
const STATUS_TONE = {
    DRAFT: "draft",
    EMAIL_SENT: "sent",
    FEEDBACK_RECEIVED: "received",
    OPEN: "open",
    CLOSED: "closed",
};

const STATUS_LABEL = {
    DRAFT: "Draft",
    EMAIL_SENT: "Email Sent",
    FEEDBACK_RECEIVED: "Feedback Received",
};

// "September 2026" -> { monthName: "September", year: "2026" }
const MONTH_INDEX = {
    jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
    jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

// FeedbackPeriod is a date — the first of the month.
const toFeedbackPeriod = (year, month) =>
    `${Number(year)}-${String(Number(month)).padStart(2, "0")}-01`;

// "September 2026" -> "2026-09-01", for saving a request that already exists.
const periodLabelToDate = (period) => {
    const text = String(period || "").trim();
    const year = (text.match(/(\d{4})/) || [])[1];
    const month = MONTH_INDEX[((text.match(/^([A-Za-z]+)/) || [])[1] || "").slice(0, 3).toLowerCase()];
    return year && month ? toFeedbackPeriod(year, month) : null;
};

const splitPeriod = (period) => {
    const text = String(period || "").trim();
    return {
        monthName: (text.match(/^([A-Za-z]+)/) || [])[1] || "—",
        year: (text.match(/(\d{4})/) || [])[1] || "—",
    };
};

const initials = (name) =>
    String(name || "?")
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((word) => word[0])
        .join("")
        .toUpperCase();

// A content id can appear more than once in the additional list (two request
// items built from the same master question), so rows are keyed on the
// request item when there is one and on the content id only when there isn't.
const rowKey = (row) =>
    row.RequestItemId ? `ri-${row.RequestItemId}` : `c-${row.ContentId}`;

// IsRequired arrives as true/false, 1/0 or "true"/"1".
const isTrue = (value) =>
    value === true || value === 1 || ["1", "true", "yes"].includes(String(value).trim().toLowerCase());

// What a saved form looked like when it opened — the order of its rows and
// which were required — so reordering or a Required tick counts as a change.
const snapshotOf = (defaults, additional) => {
    const rows = [...defaults, ...additional];
    return {
        order: rows.map((row) => row.key).join("|"),
        required: Object.fromEntries(rows.map((row) => [row.key, Boolean(row.IsRequired)])),
    };
};

export default function FeedbackRequestSetup({ mode = "edit" }) {
    const isCreate = mode === "create";

    const navigate = useNavigate();
    const location = useLocation();
    const { publicCode: codeFromUrl } = useParams();

    // The URL is the source of truth, so a refresh lands on the same request.
    const publicCode = codeFromUrl || location.state?.publicCode;

    const [sessionUserData, setSessionUserData] = useState({});

    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");

    const [form, setForm] = useState(null);
    const [customer, setCustomer] = useState(location.state?.customer || null);

    // Each list is kept in the order shown on screen — that order is saved.
    const [defaultRows, setDefaultRows] = useState([]);
    const [additionalRows, setAdditionalRows] = useState([]);

    const [selectedKeys, setSelectedKeys] = useState([]);
    const [initialKeys, setInitialKeys] = useState([]);
    const [initialSnapshot, setInitialSnapshot] = useState(null);

    // The row being dragged, and the handle to put focus back on after a
    // keyboard move (moving a row in the DOM can drop its focus).
    const [dragging, setDragging] = useState(null);
    const refocusKey = useRef(null);

    const [types, setTypes] = useState([]);
    const [contents, setContents] = useState([]);

    const [addTypeId, setAddTypeId] = useState(null);
    const [addContentId, setAddContentId] = useState(null);

    // A request saved from create mode reopens here in edit mode; if Save was
    // pressed on the way to Send email, it lands straight on that step.
    const [step, setStep] = useState(location.state?.openStep || "edit");
    const [saving, setSaving] = useState(false);

    const [logoBroken, setLogoBroken] = useState(false);

    // ---- create mode: the period is chosen here ----
    const [customers, setCustomers] = useState([]);
    const [createCustomerId, setCreateCustomerId] = useState(
        location.state?.customer?.Id ?? null
    );
    const [createYear, setCreateYear] = useState(thisYear);
    const [createMonth, setCreateMonth] = useState(null);
    const [periods, setPeriods] = useState([]);
    const [periodsLoading, setPeriodsLoading] = useState(false);

    useEffect(() => {
        const userDataString = sessionStorage.getItem("userData");

        if (userDataString) {
            setSessionUserData(JSON.parse(userDataString));
        } else {
            navigate("/");
        }
    }, [navigate]);

    // -------------------------------------------------------------
    // LOAD
    // -------------------------------------------------------------

    const normalize = (row, side, answersByItem) => ({
        key: rowKey(row),
        side,
        ContentId: row.ContentId,
        RequestItemId: row.RequestItemId ?? null,
        TypeId: row.TypeId,
        ContentText: row.ContentText,
        IsRequired: isTrue(row.IsRequired),
        DisplayOrder: Number(row.DisplayOrder) || 0,
        LinkStatus: Number(row.LinkStatus) || 0,
        // The default list doesn't carry answers, so they are matched in from
        // the form by request item.
        Answer:
            row.Answer ?? (row.RequestItemId ? answersByItem.get(row.RequestItemId) : null) ?? null,
        isNew: false,
    });

    const load = async () => {
        const orgId = sessionUserData.OrgId;

        try {
            setLoading(true);
            setLoadError("");

            // The other two need the RequestId, which this one returns.
            const formResponse = await getPublicFeedbackForm({ orgId, publicCode }).catch(
                () => null
            );
            let formData = readObject(formResponse);

            // A draft with no questions yet can fail here on the server (an
            // empty item list it can't parse). The list row we came from has
            // everything the header needs, so the screen opens from that
            // instead of refusing a perfectly normal draft.
            const fromList = location.state?.request;

            if (
                !formData?.RequestId &&
                fromList?.Id &&
                String(fromList.PublicCode) === String(publicCode)
            ) {
                console.warn(
                    "GetPublicFeedbackForm returned no form — opening from the list row instead:",
                    readResult(formResponse).message
                );

                formData = {
                    RequestId: fromList.Id,
                    CustomerId: fromList.CustomerId,
                    CustomerName: customer?.CustomerName || fromList.CustomerName || "",
                    Period: fromList.Period,
                    PublicCode: fromList.PublicCode,
                    Status: fromList.Status,
                    Items: [],
                };
            }

            if (!formData?.RequestId) {
                // A "success" envelope with no data still means not found —
                // its message would read "retrieved successfully" on an
                // error screen, so it is only used when the call failed.
                const result = readResult(formResponse);
                setLoadError(
                    !result.ok && result.message
                        ? result.message
                        : `No feedback request was found for code ${publicCode}.`
                );
                return;
            }

            const needCustomer =
                !customer || Number(customer.Id) !== Number(formData.CustomerId);

            const [defaultResponse, additionalResponse, typeResponse, contentResponse, customerResponse] =
                await Promise.all([
                    getDefaultContentForEdit({ orgId, requestId: formData.RequestId }),
                    getAdditionalContentForEdit({ orgId, requestId: formData.RequestId }),
                    // Dropdown data — if either fails the screen still works,
                    // it just can't add new content.
                    getMasterTypes({ orgId }).catch(() => null),
                    getFeedbackContents({ orgId }).catch(() => null),
                    needCustomer ? getCustomers({ orgId }).catch(() => null) : null,
                ]);

            const items = Array.isArray(formData.Items) ? formData.Items : [];

            const answersByItem = new Map(
                items.map((item) => [item.RequestItemId, item.Answer])
            );
            const onForm = new Set(items.map((item) => item.RequestItemId));

            const defaults = readRows(defaultResponse)
                .map((row) => normalize(row, "default", answersByItem))
                .sort((a, b) => a.DisplayOrder - b.DisplayOrder);

            const additional = readRows(additionalResponse)
                .map((row) => normalize(row, "additional", answersByItem))
                .sort((a, b) => a.DisplayOrder - b.DisplayOrder);

            // Ticked = on the form right now. LinkStatus 1 says so directly;
            // the form's own item list is checked too, so the two sources
            // can't disagree on what the customer currently sees.
            const ticked = [...defaults, ...additional]
                .filter(
                    (row) =>
                        row.LinkStatus === 1 ||
                        (row.RequestItemId && onForm.has(row.RequestItemId))
                )
                .map((row) => row.key);

            setForm(formData);
            setDefaultRows(defaults);
            setAdditionalRows(additional);
            setSelectedKeys(ticked);
            setInitialKeys(ticked);
            setInitialSnapshot(snapshotOf(defaults, additional));

            if (typeResponse) setTypes(readRows(typeResponse));
            if (contentResponse) setContents(readRows(contentResponse));

            if (customerResponse) {
                const match = readRows(customerResponse).find(
                    (item) => Number(item.Id) === Number(formData.CustomerId)
                );
                if (match) setCustomer(match);
            }
        } catch (error) {
            console.error("Loading the request failed:", error);
            setLoadError("Couldn't load this request. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    // Nothing exists yet, so the left column is built from the content
    // master — every default question, all ticked — and the right one starts
    // empty.
    const loadCreate = async () => {
        const orgId = sessionUserData.OrgId;

        try {
            setLoading(true);
            setLoadError("");

            const [typeResponse, contentResponse, customerResponse] = await Promise.all([
                getMasterTypes({ orgId }).catch(() => null),
                getFeedbackContents({ orgId }),
                getCustomers({ orgId }),
            ]);

            const master = readRows(contentResponse);

            const defaults = master
                .filter((item) => Number(item.IsDefault) === 1)
                .map((item) => ({
                    key: `c-${item.Id ?? item.ContentId}`,
                    side: "default",
                    ContentId: Number(item.Id ?? item.ContentId),
                    RequestItemId: null,
                    TypeId: item.TypeId,
                    ContentText: item.ContentText,
                    // Starts as the master says; the Required tick can change it.
                    IsRequired: isTrue(item.IsRequired),
                    DisplayOrder: Number(item.DisplayOrder) || 0,
                    LinkStatus: 0,
                    Answer: null,
                    isNew: false,
                }))
                .sort((a, b) => a.DisplayOrder - b.DisplayOrder);

            if (typeResponse) setTypes(readRows(typeResponse));
            setContents(master);
            setCustomers(readRows(customerResponse));

            setDefaultRows(defaults);
            setAdditionalRows([]);
            setSelectedKeys(defaults.map((row) => row.key));
            setInitialKeys([]);
            setInitialSnapshot(null);

            // A stand-in so the shared render has a form to read from.
            setForm({ RequestId: 0, Items: [], Status: "NEW" });
        } catch (error) {
            console.error("Loading the setup data failed:", error);
            setLoadError("Couldn't load the questions to choose from. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!sessionUserData?.OrgId) return;

        if (isCreate) {
            loadCreate();
        } else if (publicCode) {
            load();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sessionUserData?.OrgId, publicCode, isCreate]);

    // The customer shown in create mode follows the dropdown.
    useEffect(() => {
        if (!isCreate) return;

        const match = customers.find(
            (item) => Number(item.Id) === Number(createCustomerId)
        );

        if (match) {
            setCustomer(match);
            setLogoBroken(false);
        }
    }, [isCreate, customers, createCustomerId]);

    // Free months depend on both the customer and the year.
    useEffect(() => {
        if (!isCreate || !sessionUserData?.OrgId || !createCustomerId || !createYear) {
            setPeriods([]);
            return;
        }

        let cancelled = false;
        setCreateMonth(null);
        setPeriodsLoading(true);

        getAvailablePeriods({
            orgId: sessionUserData.OrgId,
            customerId: createCustomerId,
            year: createYear,
        })
            .then((response) => {
                if (!cancelled) setPeriods(readRows(response));
            })
            .catch((error) => {
                console.error("GetAvailablePeriods failed:", error);
                if (!cancelled) setPeriods([]);
            })
            .finally(() => {
                if (!cancelled) setPeriodsLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [isCreate, sessionUserData?.OrgId, createCustomerId, createYear]);

    // -------------------------------------------------------------
    // DERIVED
    // -------------------------------------------------------------

    const createMonthName =
        periods.find((period) => Number(period.MonthNo) === Number(createMonth))
            ?.MonthName || "";

    const periodText = isCreate
        ? createMonthName
            ? `${createMonthName} ${createYear}`
            : ""
        : form?.Period || "";

    const { monthName, year } = splitPeriod(periodText);

    const customerName = isCreate
        ? customer?.CustomerName || ""
        : form?.CustomerName || "";

    const createMonthOptions = periods.map((period) => ({
        value: Number(period.MonthNo),
        disabled: Number(period.IsAvailable) !== 1,
        label: (
            <span className="efr-month-option">
                {period.MonthName}
                {Number(period.IsAvailable) !== 1 && (
                    <span className="efr-month-taken">Already raised</span>
                )}
            </span>
        ),
    }));

    const status = normalizeStatus(form?.Status);

    // Only a draft can be changed. Once the email has gone out the form is
    // what the customer has, so from EMAIL_SENT on it opens read-only.
    const isClosed = !isCreate && status !== REQUEST_STATUS.DRAFT;
    const lockedReason =
        status === REQUEST_STATUS.FEEDBACK_RECEIVED
            ? "Feedback received"
            : status === REQUEST_STATUS.EMAIL_SENT
            ? "Email sent"
            : "Closed";

    const logoSrc =
        customer?.LogoImgURL && !logoBroken
            ? `${BASE_IMAGE_API_GET}${encodeURI(customer.LogoImgURL)}`
            : null;

    const typeNameOf = (typeId) =>
        types.find((type) => Number(type.Id) === Number(typeId))?.TypeName ||
        (RATING_TYPE_IDS.includes(Number(typeId)) ? "Rating" : "Text");

    const isRating = (typeId) =>
        /rat/i.test(typeNameOf(typeId)) || RATING_TYPE_IDS.includes(Number(typeId));

    const isYesNo = (typeId) => !isRating(typeId) && YES_NO_PATTERN.test(typeNameOf(typeId));

    const kindOf = (typeId) =>
        isRating(typeId) ? "rating" : isYesNo(typeId) ? "yesno" : "text";

    // Default Content first, then Additional Content — each in the order the
    // user has arranged it.
    const allRows = useMemo(
        () => [...defaultRows, ...additionalRows],
        [defaultRows, additionalRows]
    );

    // What goes on the form, in that same order (no re-sorting — the order on
    // screen is the order saved).
    const selectedRows = useMemo(
        () => allRows.filter((row) => selectedKeys.includes(row.key)),
        [allRows, selectedKeys]
    );

    // Reordering and Required ticks count as changes to a saved form.
    const orderChanged = useMemo(() => {
        if (isCreate || !initialSnapshot) return false;
        const current = allRows
            .filter((row) => !row.isNew)
            .map((row) => row.key)
            .join("|");
        return current !== initialSnapshot.order;
    }, [isCreate, initialSnapshot, allRows]);

    const requiredChangeCount = useMemo(() => {
        if (isCreate || !initialSnapshot) return 0;
        return allRows.filter(
            (row) =>
                row.key in initialSnapshot.required &&
                initialSnapshot.required[row.key] !== Boolean(row.IsRequired)
        ).length;
    }, [isCreate, initialSnapshot, allRows]);

    // Unsaved = a tick changed, a row was added, the order moved or a
    // Required tick changed.
    const isDirty = useMemo(() => {
        if (isCreate) return true;
        if (additionalRows.some((row) => row.isNew)) return true;
        if (orderChanged || requiredChangeCount > 0) return true;
        if (selectedKeys.length !== initialKeys.length) return true;
        return selectedKeys.some((key) => !initialKeys.includes(key));
    }, [isCreate, selectedKeys, initialKeys, additionalRows, orderChanged, requiredChangeCount]);

    const changeCount = useMemo(() => {
        const added = selectedKeys.filter((key) => !initialKeys.includes(key)).length;
        const removed = initialKeys.filter((key) => !selectedKeys.includes(key)).length;
        return added + removed + requiredChangeCount + (orderChanged ? 1 : 0);
    }, [selectedKeys, initialKeys, requiredChangeCount, orderChanged]);

    // What the Content dropdown offers: the chosen type, not a default (those
    // live on the left), and not already somewhere on this screen.
    // Everything that could still go on the right: active, not a default
    // (those live on the left), and not already on this screen.
    const addableContents = useMemo(() => {
        const onScreen = new Set(allRows.map((row) => Number(row.ContentId)));

        return contents
            .filter((item) => Number(item.IsDefault) !== 1)
            .filter((item) => Number(item.IsActive ?? 1) === 1)
            .filter((item) => !onScreen.has(Number(item.Id ?? item.ContentId)));
    }, [contents, allRows]);

    // The Type dropdown is built from the TypeIds those rows actually carry,
    // not from the type master. If the master's ids don't match the ids on
    // the content (as with seeded TypeId 1 / 2), a master-driven list offers
    // types that can never match anything — every pick comes back empty.
    // This way each type offered has at least one question behind it.
    const addTypeOptions = useMemo(() => {
        const ids = [...new Set(addableContents.map((item) => Number(item.TypeId)))];

        return ids
            .map((id) => ({ value: id, label: typeNameOf(id) }))
            .sort((a, b) => a.label.localeCompare(b.label));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [addableContents, types]);

    const contentOptions = useMemo(() => {
        if (!addTypeId) return [];

        return addableContents
            .filter((item) => Number(item.TypeId) === Number(addTypeId))
            .map((item) => ({
                value: Number(item.Id ?? item.ContentId),
                label: item.ContentText,
            }));
    }, [addableContents, addTypeId]);

    // -------------------------------------------------------------
    // TICKING
    // -------------------------------------------------------------

    const toggle = (row) => {
        if (isClosed) {
            message.info("Feedback has been received, so this form can't be changed.");
            return;
        }

        // A question the customer has already answered stays on the form:
        // unticking it would throw their answer away.
        if (hasAnswer(row) && selectedKeys.includes(row.key)) {
            message.info("This question has already been answered, so it stays on the form.");
            return;
        }

        setSelectedKeys((prev) =>
            prev.includes(row.key)
                ? prev.filter((key) => key !== row.key)
                : [...prev, row.key]
        );
    };

    const toggleAll = (rows, checked) => {
        if (isClosed) return;

        const keys = rows.map((row) => row.key);
        const locked = rows.filter(hasAnswer).map((row) => row.key);

        setSelectedKeys((prev) =>
            checked
                ? [...new Set([...prev, ...keys])]
                : prev.filter((key) => !keys.includes(key) || locked.includes(key))
        );
    };

    // -------------------------------------------------------------
    // REQUIRED
    // -------------------------------------------------------------

    // Starts from the master (or the saved form); the tick turns the Required
    // badge under the question on and off, and is what IsRequired saves as.
    const setRequired = (row, value) => {
        if (isClosed) return;

        const setRows = row.side === "default" ? setDefaultRows : setAdditionalRows;
        setRows((prev) =>
            prev.map((item) => (item.key === row.key ? { ...item, IsRequired: value } : item))
        );
    };

    // -------------------------------------------------------------
    // ORDER — drag the ⋮⋮ handle, or focus it and use ↑ / ↓
    // -------------------------------------------------------------

    const moveRow = (side, key, toIndex) => {
        const setRows = side === "default" ? setDefaultRows : setAdditionalRows;

        setRows((prev) => {
            const from = prev.findIndex((row) => row.key === key);
            if (from < 0) return prev;

            const to = Math.max(0, Math.min(prev.length - 1, toIndex));
            if (from === to) return prev;

            const next = [...prev];
            const [moved] = next.splice(from, 1);
            next.splice(to, 0, moved);
            return next;
        });
    };

    // Pointer events rather than HTML5 drag-and-drop, so it works with a
    // finger too. The row follows the pointer: whenever it passes the middle
    // of a neighbour, the two swap.
    const startDrag = (event, side, key) => {
        if (isClosed) return;
        if (event.pointerType === "mouse" && event.button !== 0) return;

        event.preventDefault();
        event.stopPropagation();

        const listEl = event.currentTarget.closest(".efr-list");
        if (!listEl) return;

        setDragging({ side, key });
        document.body.classList.add("efr-sorting");

        const onMove = (moveEvent) => {
            const others = [...listEl.querySelectorAll(":scope > [data-row-key]")].filter(
                (el) => el.dataset.rowKey !== key
            );

            let to = others.findIndex((el) => {
                const box = el.getBoundingClientRect();
                return moveEvent.clientY < box.top + box.height / 2;
            });
            if (to === -1) to = others.length;

            moveRow(side, key, to);

            // Near the top or bottom of the window, scroll so a long list can
            // be reordered end to end.
            if (moveEvent.clientY < 90) window.scrollBy(0, -14);
            else if (moveEvent.clientY > window.innerHeight - 150) window.scrollBy(0, 14);
        };

        const onUp = () => {
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("pointerup", onUp);
            window.removeEventListener("pointercancel", onUp);
            document.body.classList.remove("efr-sorting");
            setDragging(null);
        };

        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
        window.addEventListener("pointercancel", onUp);
    };

    const handleKeyMove = (event, side, key, index) => {
        if (isClosed) return;

        const delta = event.key === "ArrowUp" ? -1 : event.key === "ArrowDown" ? 1 : 0;
        if (!delta) return;

        event.preventDefault();
        refocusKey.current = key;
        moveRow(side, key, index + delta);
    };

    useEffect(() => {
        if (!refocusKey.current) return;

        const handle = document.querySelector(`[data-handle-key="${refocusKey.current}"]`);
        if (handle && document.activeElement !== handle) handle.focus();
        refocusKey.current = null;
    }, [defaultRows, additionalRows]);

    // -------------------------------------------------------------
    // ADDING
    // -------------------------------------------------------------

    const handleAddContent = () => {
        if (!addTypeId) return message.warning("Choose a type first.");
        if (!addContentId) return message.warning("Choose the content to add.");

        const source = contents.find(
            (item) => Number(item.Id ?? item.ContentId) === Number(addContentId)
        );
        if (!source) return;

        // Added at the end of Additional Content; drag it anywhere from there.
        const row = {
            key: `new-${addContentId}`,
            side: "additional",
            ContentId: Number(addContentId),
            RequestItemId: null,
            TypeId: Number(source.TypeId),
            ContentText: source.ContentText,
            IsRequired: isTrue(source.IsRequired),
            DisplayOrder: 0,
            LinkStatus: 0,
            Answer: null,
            isNew: true,
        };

        setAdditionalRows((prev) => [...prev, row]);
        setSelectedKeys((prev) => [...prev, row.key]);
        setAddContentId(null);
    };

    useEffect(() => {
        if (addTypeId && !addTypeOptions.some((option) => option.value === Number(addTypeId))) {
            setAddTypeId(null);
            setAddContentId(null);
        }
    }, [addTypeOptions, addTypeId]);

    const removeNewRow = (row) => {
        setAdditionalRows((prev) => prev.filter((item) => item.key !== row.key));
        setSelectedKeys((prev) => prev.filter((key) => key !== row.key));
    };

    // -------------------------------------------------------------
    // SUBMIT
    // -------------------------------------------------------------

    // The whole intended set goes up, not a list of changes: the server can
    // diff it against what it has, and a resubmit after a failure can't apply
    // the same change twice.
    //
    // DisplayOrder is 1..n in the order on screen — Default Content as
    // arranged, then Additional Content as arranged — and IsRequired is each
    // row's Required tick.
    //
    // Edit (EditRequestForm) sends booleans, as the API expects:
    //   Id — the request item id, or 0 for a question added now
    //   IsActive false — a question that was on the form and has been
    //                    unticked, so the server knows to take it off
    const buildItems = () => {
        const onForm = selectedRows.map((row, index) => ({
            Id: Number(row.RequestItemId) || 0,
            ContentId: Number(row.ContentId),
            TypeId: Number(row.TypeId),
            ContentText: row.ContentText,
            IsRequired: isCreate ? (row.IsRequired ? 1 : 0) : Boolean(row.IsRequired),
            DisplayOrder: index + 1,
            IsActive: isCreate ? 1 : true,
            Answer: hasAnswer(row) ? String(row.Answer) : null,
        }));

        if (isCreate) return onForm;

        const removed = allRows
            .filter((row) => Number(row.RequestItemId) > 0 && !selectedKeys.includes(row.key))
            .map((row, index) => ({
                Id: Number(row.RequestItemId),
                ContentId: Number(row.ContentId),
                TypeId: Number(row.TypeId),
                ContentText: row.ContentText,
                IsRequired: Boolean(row.IsRequired),
                DisplayOrder: onForm.length + index + 1,
                IsActive: false,
                Answer: hasAnswer(row) ? String(row.Answer) : null,
            }));

        return [...onForm, ...removed];
    };

    // `thenStep` is where to land afterwards — "email" when Save was triggered
    // by trying to reach Send email.
    const handleSubmit = async ({ thenStep } = {}) => {
        if (isClosed) {
            message.warning("Feedback has been received, so this form can't be changed.");
            return false;
        }

        if (isCreate) {
            if (!createCustomerId) return message.warning("Choose a customer."), false;
            if (!createYear) return message.warning("Choose a year."), false;
            if (!createMonth) return message.warning("Choose a month."), false;
        }

        if (selectedRows.length === 0) {
            message.warning("Keep at least one question on the form.");
            return false;
        }

        const items = buildItems();

        const feedbackPeriod = isCreate
            ? toFeedbackPeriod(createYear, createMonth)
            : periodLabelToDate(form.Period);

        const payload = {
            orgId: sessionUserData.OrgId,
            userId: sessionUserData.Id,
            mode: isCreate ? "create" : "edit",
            requestId: isCreate ? 0 : form.RequestId,
            customerId: isCreate ? createCustomerId : form.CustomerId,
            feedbackPeriod,
            items,
        };

        try {
            setSaving(true);

            const response = await saveRequestSetup(payload);
            const result = readResult(response);

            // The server's own result row is the authority. A new RequestId
            // with a PublicCode is a success whatever code accompanies it.
            const saved = result.data || {};
            const createdOk =
                isCreate && Number(saved.RequestId) > 0 && Boolean(saved.PublicCode);

            if (!result.ok && !createdOk) {
                message.error(result.message || "Couldn't save the form setup.");
                return false;
            }

            message.success(
                result.message || (isCreate ? "Feedback request created." : "Form setup saved.")
            );

            if (isCreate) {
                // The new request belongs in edit mode from here on — that's
                // where its link and its saved state live. If the save didn't
                // hand back a code, the list is the next best place.
                const newCode = saved.PublicCode ?? saved.publicCode;

                if (newCode) {
                    navigate(`${EDIT_ROUTE}/${encodeURIComponent(newCode)}`, {
                        replace: true,
                        state: { customer, openStep: thenStep || "edit" },
                    });
                } else {
                    navigate(LIST_ROUTE, { state: { reloadCustomerId: createCustomerId } });
                }

                return true;
            }

            // Reload so new rows pick up the request item ids the server gave
            // them, and the "unsaved" state clears against real data.
            await load();
            if (thenStep) setStep(thenStep);
            return true;
        } catch (error) {
            if (String(error.message).includes("FEEDBACK_REQUEST_ACTIONS")) {
                // Only edit can land here now: create has its action.
                console.info("Edit payload (no edit action configured yet):", {
                    RequestId: payload.requestId,
                    RequestJson: {
                        CustomerId: payload.customerId,
                        FeedbackPeriod: payload.feedbackPeriod,
                    },
                    ItemsJson: items,
                });
                message.warning(
                    "Saving edits isn't switched on yet — the payload is in the console."
                );
            } else {
                console.error("Saving the form setup failed:", error);
                message.error("Something went wrong while saving.");
            }
            return false;
        } finally {
            setSaving(false);
        }
    };

    // -------------------------------------------------------------
    // STEPS
    // -------------------------------------------------------------

    const goToStep = (target) => {
        if (target === step) return;

        if (target !== "edit" && selectedRows.length === 0) {
            message.warning("Keep at least one question on the form.");
            return;
        }

        // The email links to the saved form — anything unsaved on screen
        // would never reach the customer, so it is saved first.
        if (target === "email" && isDirty) {
            Modal.confirm({
                title: isCreate ? "Save the request first?" : "Save your changes first?",
                content: isCreate
                    ? "The request needs saving before it can be emailed. Save it now and the email is the next thing you'll see."
                    : "The email opens the saved form. Submit now so the customer sees these changes.",
                okText: isCreate ? "Save & continue" : "Submit & continue",
                cancelText: "Not yet",
                centered: true,
                onOk: () => handleSubmit({ thenStep: "email" }),
            });
            return;
        }

        setStep(target);
    };

    const goBack = () => {
        navigate(LIST_ROUTE, {
            state: {
                reloadCustomerId:
                    (isCreate ? createCustomerId : form?.CustomerId) || customer?.Id || null,
            },
        });
    };

    // -------------------------------------------------------------
    // PIECES
    // -------------------------------------------------------------

    // Called as a function, not used as a <Component>: a component defined
    // inside render is a new type every render, so React would rebuild every
    // row on each move and the drag would lose its row.
    const renderRow = (row, index, side, count) => {
        const checked = selectedKeys.includes(row.key);
        const locked = (hasAnswer(row) && checked) || isClosed;
        const kind = kindOf(row.TypeId);
        const kindIcon = {
            rating: "bi-star-fill",
            yesno: "bi-toggle-on",
            text: "bi-chat-left-text",
        }[kind];
        const isDragging = dragging?.key === row.key;

        return (
            <div
                key={row.key}
                data-row-key={row.key}
                className={`efr-row ${checked ? "is-on" : ""} ${row.isNew ? "is-new" : ""} ${
                    isClosed ? "is-readonly" : ""
                } ${isDragging ? "is-dragging" : ""}`}
                onClick={() => toggle(row)}
                role="checkbox"
                aria-checked={checked}
            >
                {/* ⋮⋮ — drag to reorder, or focus and use the arrow keys */}
                <button
                    type="button"
                    className="efr-handle"
                    data-handle-key={row.key}
                    disabled={isClosed || count < 2}
                    aria-label={`Move "${row.ContentText}" — position ${index + 1} of ${count}`}
                    title={isClosed ? "" : "Drag to reorder (or use ↑ ↓)"}
                    onPointerDown={(event) => startDrag(event, side, row.key)}
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => handleKeyMove(event, side, row.key, index)}
                >
                    <span className="efr-dots" aria-hidden="true">
                        <i></i><i></i>
                        <i></i><i></i>
                        <i></i><i></i>
                    </span>
                </button>

                <Tooltip
                    title={
                        isClosed
                            ? `${lockedReason} — the form can't be changed`
                            : locked
                            ? "Already answered — it stays on the form"
                            : ""
                    }
                >
                    <span onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                            checked={checked}
                            disabled={locked}
                            onChange={() => toggle(row)}
                        />
                    </span>
                </Tooltip>

                <span className="efr-row-order">{index + 1}</span>

                <div className="efr-row-body">
                    <div className="efr-row-text">{row.ContentText}</div>

                    <div className="efr-row-meta">
                        {row.IsRequired && <span className="efr-pill required">Required *</span>}
                        {hasAnswer(row) && (
                            <span className="efr-pill answered">
                                <i className="bi bi-check2 me-1"></i>
                                Answered
                            </span>
                        )}
                        {row.isNew && <span className="efr-pill new">New</span>}
                    </div>
                </div>

                <div className="efr-row-side">
                    <span className={`efr-type ${kind}`}>
                        <i className={`bi ${kindIcon} me-1`}></i>
                        {typeNameOf(row.TypeId)}
                    </span>

                    {/* Required — the badge under the question follows this tick */}
                    <span
                        className={`efr-req-toggle ${row.IsRequired ? "on" : ""}`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <Checkbox
                            checked={Boolean(row.IsRequired)}
                            disabled={isClosed}
                            onChange={(e) => setRequired(row, e.target.checked)}
                        >
                            Required
                        </Checkbox>
                    </span>
                </div>

                {row.isNew && (
                    <Tooltip title="Remove">
                        <button
                            type="button"
                            className="efr-remove"
                            onClick={(e) => {
                                e.stopPropagation();
                                removeNewRow(row);
                            }}
                        >
                            <i className="bi bi-x-lg"></i>
                        </button>
                    </Tooltip>
                )}
            </div>
        );
    };

    const SelectAll = ({ rows }) => {
        const all = rows.length > 0 && rows.every((row) => selectedKeys.includes(row.key));
        const some = rows.some((row) => selectedKeys.includes(row.key));

        return (
            <Checkbox
                checked={all}
                indeterminate={some && !all}
                disabled={rows.length === 0 || isClosed}
                onChange={(e) => toggleAll(rows, e.target.checked)}
            >
                Select all
            </Checkbox>
        );
    };

    const countOn = (rows) => rows.filter((row) => selectedKeys.includes(row.key)).length;

    const listHead = (rows) => (
        <div className="efr-list-head">
            <span>
                Question
                {!isClosed && rows.length > 1 && (
                    <span className="efr-list-hint">
                        <span className="efr-dots mini" aria-hidden="true">
                            <i></i><i></i>
                            <i></i><i></i>
                            <i></i><i></i>
                        </span>
                        drag to reorder
                    </span>
                )}
            </span>
            <SelectAll rows={rows} />
        </div>
    );

    // -------------------------------------------------------------
    // RENDER — loading / error
    // -------------------------------------------------------------

    if (loading && !form) {
        return (
            <Base1>
                <div className="app-container container-xxl">
                    <div className="efr-state">
                        <Spin size="large" />
                        <p>Loading the form setup…</p>
                    </div>
                </div>
                <style>{baseStyles}</style>
            </Base1>
        );
    }

    if (loadError || !form) {
        return (
            <Base1>
                <div className="app-container container-xxl">
                    <div className="efr-state">
                        <span className="efr-state-icon">
                            <i className="bi bi-exclamation-octagon"></i>
                        </span>
                        <h4>{isCreate ? "Couldn't start a new request" : "Couldn't open this request"}</h4>
                        <p>{loadError || "No request code was given."}</p>

                        <div className="d-flex gap-2 justify-content-center">
                            <Button size="large" className="efr-btn-ghost" onClick={goBack}>
                                Back to requests
                            </Button>
                            {(publicCode || isCreate) && (
                                <Button
                                    size="large"
                                    type="primary"
                                    className="efr-btn-primary"
                                    onClick={isCreate ? loadCreate : load}
                                >
                                    Try again
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
                <style>{baseStyles}</style>
            </Base1>
        );
    }

    // -------------------------------------------------------------
    // RENDER — the screen
    // -------------------------------------------------------------

    const logoBlock = (
        <span className="efr-logo">
            {logoSrc ? (
                <img
                    src={logoSrc}
                    alt={customerName}
                    onError={() => setLogoBroken(true)}
                />
            ) : (
                <span>{customerName ? initials(customerName) : <i className="bi bi-building"></i>}</span>
            )}
        </span>
    );

    return (
        <Base1>
            <div className="app-container container-xxl efr-page">

                {/* ================= HEADER ================= */}

                <div className="efr-header">
                    <div className="efr-header-top">
                        <button type="button" className="efr-back" onClick={goBack}>
                            <i className="bi bi-arrow-left"></i>
                        </button>

                        <div className="flex-grow-1 min-w-0">
                            <div className="efr-eyebrow">
                                {isCreate
                                    ? "New feedback request"
                                    : `Feedback Request #${form.RequestId}`}
                            </div>
                            <h1 className="efr-title">
                                {isCreate ? "Setup Form" : isClosed ? "Form Setup" : "Edit Form Setup"}
                            </h1>
                        </div>

                        <Tooltip
                            title={
                                isClosed
                                    ? `${lockedReason} — only draft requests can be changed`
                                    : isDirty || isCreate
                                    ? ""
                                    : "No changes to save"
                            }
                        >
                            <Button
                                size="large"
                                type="primary"
                                className="efr-btn-primary"
                                loading={saving}
                                disabled={!isDirty || isClosed}
                                onClick={() => handleSubmit()}
                            >
                                <i className={`bi ${isClosed ? "bi-lock-fill" : "bi-cloud-check"} me-2`}></i>
                                {isCreate ? "Save" : isClosed ? "Locked" : "Submit"}
                                {!isCreate && isDirty && changeCount > 0 && (
                                    <span className="efr-change-count">{changeCount}</span>
                                )}
                            </Button>
                        </Tooltip>
                    </div>

                    <div className="efr-context">
                        {isCreate ? (
                            <>
                                <div className="efr-customer picker">
                                    {logoBlock}

                                    <div className="flex-grow-1 min-w-0">
                                        <div className="efr-context-label">Customer</div>
                                        <Select
                                            showSearch
                                            variant="borderless"
                                            className="efr-inline-select"
                                            placeholder="Choose a customer"
                                            optionFilterProp="label"
                                            value={createCustomerId}
                                            onChange={setCreateCustomerId}
                                            options={customers.map((item) => ({
                                                value: item.Id,
                                                label: item.CustomerName,
                                            }))}
                                        />
                                    </div>
                                </div>

                                <div className="efr-context-item picker">
                                    <div className="efr-context-label">Year</div>
                                    <Select
                                        variant="borderless"
                                        className="efr-inline-select"
                                        value={createYear}
                                        onChange={setCreateYear}
                                        options={YEARS.map((value) => ({
                                            value,
                                            label: String(value),
                                        }))}
                                    />
                                </div>

                                <div className="efr-context-item picker wide">
                                    <div className="efr-context-label">Month</div>
                                    <Select
                                        variant="borderless"
                                        className="efr-inline-select"
                                        placeholder={
                                            createCustomerId ? "Choose a month" : "Customer first"
                                        }
                                        disabled={!createCustomerId}
                                        loading={periodsLoading}
                                        value={createMonth}
                                        onChange={setCreateMonth}
                                        options={createMonthOptions}
                                        popupMatchSelectWidth={220}
                                    />
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="efr-customer">
                                    {logoBlock}

                                    <div className="min-w-0">
                                        <div className="efr-context-label">Customer</div>
                                        <div className="efr-customer-name">{customerName}</div>
                                    </div>
                                </div>

                                <div className="efr-context-item">
                                    <div className="efr-context-label">Year</div>
                                    <div className="efr-context-value">{year}</div>
                                </div>

                                <div className="efr-context-item">
                                    <div className="efr-context-label">Month</div>
                                    <div className="efr-context-value">{monthName}</div>
                                </div>
                            </>
                        )}

                        {!isCreate && (
                            <div className="efr-context-item">
                                <div className="efr-context-label">Status</div>
                                <Tag className={`efr-status ${STATUS_TONE[status] || "neutral"}`}>
                                    {STATUS_LABEL[status] || form.Status || "—"}
                                </Tag>
                            </div>
                        )}

                        <div className="efr-context-item">
                            <div className="efr-context-label">On the form</div>
                            <div className="efr-context-value">
                                {selectedRows.length}
                                <span className="efr-context-of"> / {allRows.length}</span>
                            </div>
                        </div>
                    </div>

                    {isClosed && (
                        <div className="efr-warning closed">
                            <i className="bi bi-lock-fill me-2"></i>
                            {status === REQUEST_STATUS.FEEDBACK_RECEIVED ? (
                                <>
                                    <strong>Feedback received</strong> — the form is shown for
                                    reference and can't be changed.
                                </>
                            ) : status === REQUEST_STATUS.EMAIL_SENT ? (
                                <>
                                    <strong>Email sent</strong> — the customer already has this form,
                                    so it can't be changed. Only draft requests can be edited.
                                </>
                            ) : (
                                <>
                                    This request is <strong>closed</strong> — its form is shown for
                                    reference and can't be edited or submitted.
                                </>
                            )}
                        </div>
                    )}

                    {!isCreate && status && status !== "DRAFT" && !isClosed && (
                        <div className="efr-warning">
                            <i className="bi bi-exclamation-triangle-fill me-2"></i>
                            {status === REQUEST_STATUS.EMAIL_SENT ? (
                                <>
                                    <strong>Email sent</strong> — the customer
                                </>
                            ) : (
                                <>
                                    This request is <strong>{form.Status.toLowerCase()}</strong> — the
                                    customer
                                </>
                            )}{" "}
                            may already be answering it. Questions they've answered are locked on
                            the form.
                        </div>
                    )}
                </div>

                {/* ================= STEP 1 — EDIT ================= */}

                {step === "edit" && (
                    <Spin spinning={loading}>
                        <div className="row g-4">

                            {/* ---- Default content ---- */}

                            <div className="col-12 col-xl-5">
                                <div className="efr-card h-100">
                                    <div className="efr-card-head">
                                        <span className="efr-card-badge green">
                                            <i className="bi bi-check2-square text-white"></i>
                                        </span>

                                        <div className="flex-grow-1">
                                            <h3 className="efr-card-title">Default Content</h3>
                                            <div className="efr-card-sub">
                                                The standard questions. Untick any this
                                                customer shouldn't get.
                                            </div>
                                        </div>

                                        <span className="efr-chip green">
                                            {countOn(defaultRows)} / {defaultRows.length}
                                        </span>
                                    </div>

                                    <div className="efr-card-body">
                                        {listHead(defaultRows)}

                                        {defaultRows.length === 0 ? (
                                            <Empty
                                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                                                description="No default content set up"
                                            />
                                        ) : (
                                            <div className={`efr-list ${dragging?.side === "default" ? "is-sorting" : ""}`}>
                                                {defaultRows.map((row, index) =>
                                                    renderRow(row, index, "default", defaultRows.length)
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* ---- Additional content ---- */}

                            <div className="col-12 col-xl-7">
                                <div className="efr-card h-100">
                                    <div className="efr-card-head">
                                        <span className="efr-card-badge amber">
                                            <i className="bi bi-plus-square-dotted text-white"></i>
                                        </span>

                                        <div className="flex-grow-1">
                                            <h3 className="efr-card-title">Additional Content</h3>
                                            <div className="efr-card-sub">
                                                Extra questions for{" "}
                                                {customerName || "this customer"} only.
                                            </div>
                                        </div>

                                        <span className="efr-chip amber">
                                            {countOn(additionalRows)} / {additionalRows.length}
                                        </span>
                                    </div>

                                    <div className="efr-card-body">

                                        {/* Type + Content + Add */}
                                        {!isClosed && (
                                        <div className="efr-adder">
                                            <div className="efr-adder-field">
                                                <label className="efr-label">Type</label>
                                                <Select
                                                    size="medium"
                                                    style={{ width: "100%" }}
                                                    placeholder="Select type"
                                                    value={addTypeId}
                                                    onChange={(value) => {
                                                        setAddTypeId(value);
                                                        setAddContentId(null);
                                                    }}
                                                    options={addTypeOptions}
                                                    notFoundContent="Everything available is already on the form"
                                                />
                                            </div>

                                            <div className="efr-adder-field grow">
                                                <label className="efr-label">Content</label>
                                                <Select
                                                    showSearch
                                                    size="medium"
                                                    style={{ width: "100%" }}
                                                    placeholder={
                                                        addTypeId
                                                            ? "Select content"
                                                            : "Choose a type first"
                                                    }
                                                    disabled={!addTypeId}
                                                    optionFilterProp="label"
                                                    value={addContentId}
                                                    onChange={setAddContentId}
                                                    options={contentOptions}
                                                    notFoundContent={
                                                        addTypeId
                                                            ? "Everything of this type is already here"
                                                            : null
                                                    }
                                                />
                                            </div>

                                            <Button
                                                size="small"
                                                className="efr-btn-add"
                                                onClick={handleAddContent}
                                                disabled={!addContentId}
                                            >
                                                <i className="bi bi-plus-lg text-warning text-hover-dark"></i>
                                                Add
                                            </Button>
                                        </div>
                                        )}

                                        {listHead(additionalRows)}

                                        {additionalRows.length === 0 ? (
                                            <Empty
                                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                                                description={
                                                    isClosed
                                                        ? "No additional questions on this form"
                                                        : "Nothing extra yet — pick a type and content above"
                                                }
                                            />
                                        ) : (
                                            <div className={`efr-list ${dragging?.side === "additional" ? "is-sorting" : ""}`}>
                                                {additionalRows.map((row, index) =>
                                                    renderRow(row, index, "additional", additionalRows.length)
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Spin>
                )}

                {/* ================= STEP 2 — REVIEW ================= */}

                {step === "review" && (
                    <FeedbackFormPreview
                        customerName={customerName}
                        logoSrc={logoSrc}
                        onLogoError={() => setLogoBroken(true)}
                        periodText={periodText}
                        rows={selectedRows.map((row) => ({ ...row, kind: kindOf(row.TypeId) }))}
                        badge={
                            isDirty ? (
                                <span className="efr-preview-unsaved">
                                    <i className="bi bi-dot"></i>Unsaved changes
                                </span>
                            ) : null
                        }
                    />
                )}

                {/* ================= STEP 3 — SEND EMAIL ================= */}

                {step === "email" && (
                    <FeedbackEmailComposer
                        orgId={sessionUserData.OrgId}
                        userId={sessionUserData.Id ?? sessionUserData.UserId}
                        requestId={form.RequestId}
                        publicCode={form.PublicCode}
                        customerName={form.CustomerName || customerName}
                        contactPerson={customer?.ContactPerson}
                        customerEmail={customer?.Email}
                        customerLogoUrl={logoSrc}
                        org={orgBrandingOf(sessionUserData, BASE_IMAGE_API_GET)}
                        periodText={form.Period || periodText}
                        questionCount={selectedRows.length}
                        disabled={isLockedStatus(status)}
                        lockedReason={lockedReason}
                        alreadySent={status === REQUEST_STATUS.EMAIL_SENT}
                        onSent={load}
                        onBack={goBack}
                    />
                )}

                {/* ================= STEP BAR ================= */}

                <div className="efr-stepbar mb-15">
                    {STEPS.map((item, index) => {
                        const currentIndex = STEPS.findIndex((s) => s.key === step);

                        return (
                            <div
                                key={item.key}
                                className={`efr-step ${item.key === step ? "active" : ""} ${
                                    index < currentIndex ? "done" : ""
                                }`}
                            >
                                <button
                                    type="button"
                                    className="efr-step-main"
                                    onClick={() => goToStep(item.key)}
                                >
                                    <span className="efr-step-dot">
                                        {index < currentIndex ? (
                                            <i className="bi bi-check-lg"></i>
                                        ) : (
                                            index + 1
                                        )}
                                    </span>
                                    <span className="efr-step-label">
                                        <i className={`bi ${item.icon} me-2`}></i>
                                        {isCreate && item.createLabel ? item.createLabel : item.label}
                                    </span>
                                </button>

                                {/* "Edit form" under Review, as on the sketch — the
                                    way back from the preview to the ticks. */}
                                {item.key === "review" && step === "review" && (
                                    <button
                                        type="button"
                                        className="efr-step-sub"
                                        onClick={() => setStep("edit")}
                                    >
                                        <i className="bi bi-pencil me-1"></i>
                                        Edit form
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            <style>{baseStyles + screenStyles}</style>
        </Base1>
    );
}

// =============================================================
// STYLES
// =============================================================

const baseStyles = `

    .efr-state {
        margin: 60px auto;
        max-width: 460px;
        padding: 40px 28px;
        text-align: center;
        background: #ffffff;
        border: 1px solid #e8eef5;
        border-radius: 20px;
        box-shadow: 0 10px 30px rgba(22, 50, 80, .06);
    }

    .efr-state p { margin: 12px 0 18px; color: #8190a0; font-size: 13.5px; }

    .efr-state h4 { margin: 0; font-size: 17px; font-weight: 700; color: #12263f; }

    .efr-state-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 58px;
        height: 58px;
        border-radius: 18px;
        background: #fff1f2;
        color: #e11d48;
        font-size: 24px;
        margin-bottom: 12px;
    }

    .efr-btn-primary {
        height: 44px;
        padding: 0 22px;
        border: none;
        border-radius: 11px;
        font-weight: 600;
        background: linear-gradient(135deg, #0271ae, #0a94d6);
        box-shadow: 0 10px 22px rgba(2, 113, 174, .28);
    }

    .efr-btn-primary:hover:not(:disabled) { filter: brightness(1.06); }

    .efr-btn-primary:disabled {
        background: #e8eef5 !important;
        color: #9aa6b4 !important;
        box-shadow: none;
    }

    .efr-btn-ghost {
        height: 44px;
        padding: 0 20px;
        border-radius: 11px;
        font-weight: 600;
        border-color: #dfe6ef;
        color: #46566a;
    }
`;

const screenStyles = `

    .efr-page { padding-top: 18px; padding-bottom: 120px; }


    /* ----- Header ----- */

    .efr-header {
        margin-bottom: 18px;
        padding: 20px 22px;
        background: #ffffff;
        border: 1px solid #e8eef5;
        border-radius: 20px;
        box-shadow: 0 10px 30px rgba(22, 50, 80, .06);
    }

    .efr-header-top { display: flex; align-items: center; gap: 14px; }

    .efr-back {
        width: 42px;
        height: 42px;
        flex: none;
        border-radius: 12px;
        border: 1px solid #e6edf5;
        background: #ffffff;
        color: #46566a;
        font-size: 16px;
        cursor: pointer;
        transition: all .18s ease;
    }

    .efr-back:hover { border-color: #0271ae; color: #0271ae; }

    .efr-eyebrow {
        font-size: 11px;
        font-weight: 700;
        letter-spacing: .09em;
        text-transform: uppercase;
        color: #9aa6b4;
    }

    .efr-title {
        margin: 2px 0 0;
        font-size: 22px;
        font-weight: 800;
        color: #12263f;
        letter-spacing: -.01em;
    }

    .efr-change-count {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 20px;
        height: 20px;
        margin-left: 8px;
        padding: 0 6px;
        border-radius: 10px;
        background: rgba(255, 255, 255, .25);
        font-size: 11.5px;
        font-weight: 700;
    }

    .efr-context {
        display: flex;
        align-items: stretch;
        gap: 10px;
        flex-wrap: wrap;
        margin-top: 18px;
    }

    .efr-customer,
    .efr-context-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 16px;
        border-radius: 14px;
        background: #f6f9fc;
        border: 1px solid #edf2f7;
    }

    .efr-context-item { flex-direction: column; align-items: flex-start; justify-content: center; gap: 2px; }

    .efr-customer { flex: 1 1 260px; min-width: 0; }

    .efr-logo {
        width: 46px;
        height: 46px;
        flex: none;
        border-radius: 13px;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #ffffff;
        border: 1px solid #e6edf5;
        color: #0271ae;
        font-weight: 800;
        font-size: 15px;
    }

    .efr-logo img { width: 100%; height: 100%; object-fit: contain; padding: 4px; }

    .efr-context-label {
        font-size: 10.5px;
        font-weight: 700;
        letter-spacing: .08em;
        text-transform: uppercase;
        color: #9aa6b4;
    }

    .efr-customer-name {
        font-size: 15px;
        font-weight: 700;
        color: #12263f;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .efr-context-value { font-size: 15px; font-weight: 700; color: #12263f; }

    .efr-context-of { font-size: 12.5px; font-weight: 600; color: #9aa6b4; }

    .efr-status {
        margin: 0;
        border: none;
        border-radius: 8px;
        padding: 3px 10px;
        font-size: 11.5px;
        font-weight: 700;
        text-transform: capitalize;
    }

    .efr-status.draft   { background: #eef4ff; color: #3b5bdb; }
    .efr-status.open    { background: #ecfdf5; color: #059669; }
    .efr-status.sent    { background: #e8f4fc; color: #0271ae; }
    .efr-status.received { background: #ecfdf5; color: #059669; }
    .efr-status.closed  { background: #f1f5f9; color: #64748b; }
    .efr-status.neutral { background: #fff7e6; color: #b45309; }

    .efr-warning {
        margin-top: 14px;
        padding: 11px 14px;
        border-radius: 12px;
        background: #fffbeb;
        border: 1px solid #fde68a;
        color: #92400e;
        font-size: 12.5px;
    }

    .efr-warning.closed {
        background: #f1f5f9;
        border-color: #cbd5e1;
        color: #334155;
    }

    /* Closed: the rows can be read, not changed. */
    .efr-row.is-readonly { cursor: default; }

    .efr-row.is-readonly:hover { transform: none; box-shadow: none; }


    /* ----- Cards ----- */

    .efr-card {
        background: #ffffff;
        border: 1px solid #e8eef5;
        border-radius: 18px;
        box-shadow: 0 10px 30px rgba(22, 50, 80, .06);
        overflow: hidden;
    }

    .efr-card-head {
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 18px 20px;
        border-bottom: 1px solid #eef3f8;
        background: linear-gradient(180deg, #ffffff 0%, #fcfdff 100%);
    }

    .efr-card-badge {
        width: 44px;
        height: 44px;
        flex: none;
        border-radius: 13px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #ffffff;
        font-size: 17px;
    }

    .efr-card-badge.green {
        background: linear-gradient(135deg, #059669, #10b981);
        box-shadow: 0 8px 18px rgba(5, 150, 105, .28);
    }

    .efr-card-badge.amber {
        background: linear-gradient(135deg, #d97706, #f59e0b);
        box-shadow: 0 8px 18px rgba(217, 119, 6, .26);
    }

    .efr-card-title { margin: 0; font-size: 16.5px; font-weight: 700; color: #12263f; }

    .efr-card-sub { margin-top: 2px; font-size: 12.5px; color: #8190a0; }

    .efr-card-body { padding: 16px 20px 20px; }

    .efr-chip {
        flex: none;
        padding: 5px 11px;
        border-radius: 9px;
        font-size: 12px;
        font-weight: 700;
        white-space: nowrap;
    }

    .efr-chip.green { background: #ecfdf5; color: #059669; }
    .efr-chip.amber { background: #fffbeb; color: #b45309; }

    .efr-label {
        display: block;
        margin-bottom: 6px;
        font-size: 12.5px;
        font-weight: 600;
        color: #46566a;
    }


    /* ----- Adder ----- */

    .efr-adder {
        display: flex;
        align-items: flex-end;
        gap: 10px;
        flex-wrap: nowrap;
        margin-bottom: 18px;
        padding: 14px;
        border-radius: 14px;
        background: #fffbf2;
        border: 1px dashed #f5d48a;
    }

    /* Type, Content and Add stay on one line: the fields share the width
       and shrink as needed, the button keeps its size. Only a phone
       stacks them (see the media query at the end). */
    .efr-adder-field { flex: 0 1 200px; min-width: 0; }

    .efr-adder-field.grow { flex: 1 1 auto; }

    .efr-adder-field .ant-select { min-width: 0; }

    .efr-btn-add {
        flex: none;
        height: 35px;
        padding: 0 18px;
        border-radius: 10px;
        font-weight: 700;
        color: #b45309;
        border-color: #f5d48a;
        background: #ffffff;
    }

    .efr-btn-add:hover:not(:disabled) {
        color: #000000 !important;
        border-color: #d97706 !important;
        background: #d97706;
    }


    /* ----- Lists ----- */

    .efr-list-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 4px 9px;
        margin-bottom: 10px;
        border-bottom: 1px solid #eef3f8;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: .08em;
        text-transform: uppercase;
        color: #9aa6b4;
    }

    .efr-list-head .ant-checkbox-wrapper {
        font-size: 12px;
        font-weight: 600;
        letter-spacing: 0;
        text-transform: none;
        color: #8190a0;
    }

    .efr-list-hint {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        margin-left: 10px;
        padding: 2px 8px;
        border-radius: 6px;
        background: #f4f7fb;
        font-size: 10.5px;
        font-weight: 600;
        letter-spacing: 0;
        text-transform: none;
        color: #9aa6b4;
    }

    .efr-list { display: flex; flex-direction: column; gap: 8px; }

    .efr-row {
        position: relative;
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 11px 13px 11px 6px;
        border: 1px solid #eef3f8;
        border-radius: 12px;
        background: #fbfcfe;
        cursor: pointer;
        transition: border-color .15s ease, background-color .15s ease, box-shadow .15s ease, transform .15s ease;
    }

    .efr-row:hover { border-color: #cfe0ef; background: #f7fbff; }

    .efr-row.is-on { border-color: #bfe0f5; background: #f2f9ff; }

    .efr-row.is-new { border-style: dashed; border-color: #f5d48a; background: #fffcf4; }

    /* The row being dragged lifts off the list. */
    .efr-row.is-dragging {
        z-index: 2;
        background: #ffffff;
        border-color: #0271ae;
        box-shadow: 0 16px 34px rgba(2, 113, 174, .22);
        transform: scale(1.015);
    }

    .efr-list.is-sorting .efr-row:not(.is-dragging) { opacity: .75; }


    /* ----- Drag handle: 2 x 3 dots ----- */

    .efr-handle {
        flex: none;
        align-self: stretch;
        width: 22px;
        margin: -4px 0;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        border: none;
        border-radius: 7px;
        background: transparent;
        cursor: grab;
        touch-action: none;
        transition: background .15s ease;
    }

    .efr-handle:hover:not(:disabled),
    .efr-handle:focus-visible { background: #e8f2fb; outline: none; }

    .efr-handle:focus-visible { box-shadow: 0 0 0 2px #0271ae; }

    .efr-handle:active:not(:disabled) { cursor: grabbing; }

    .efr-handle:disabled { cursor: default; opacity: .35; }

    .efr-dots {
        display: grid;
        grid-template-columns: repeat(2, 4px);
        grid-auto-rows: 4px;
        gap: 3px;
    }

    .efr-dots i {
        width: 4px;
        height: 4px;
        border-radius: 50%;
        background: #a9b6c6;
        transition: background .15s ease;
    }

    .efr-handle:hover:not(:disabled) .efr-dots i,
    .efr-row.is-dragging .efr-dots i { background: #0271ae; }

    .efr-dots.mini { grid-template-columns: repeat(2, 3px); grid-auto-rows: 3px; gap: 2px; }

    .efr-dots.mini i { width: 3px; height: 3px; }

    body.efr-sorting,
    body.efr-sorting * { cursor: grabbing !important; user-select: none !important; }

    .efr-row-order {
        flex: none;
        min-width: 24px;
        height: 24px;
        border-radius: 7px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: #eef2f7;
        color: #7a8795;
        font-size: 11.5px;
        font-weight: 700;
    }

    .efr-row-body { flex: 1 1 auto; min-width: 0; }

    .efr-row-text { font-size: 13.5px; font-weight: 500; color: #12263f; line-height: 1.45; }

    .efr-row-meta { display: flex; gap: 6px; flex-wrap: wrap; }

    .efr-row-meta:not(:empty) { margin-top: 5px; }

    .efr-pill {
        display: inline-flex;
        align-items: center;
        padding: 1px 8px;
        border-radius: 6px;
        font-size: 10.5px;
        font-weight: 700;
        animation: efrPillIn .2s ease;
    }

    @keyframes efrPillIn { from { opacity: 0; transform: translateY(2px); } to { opacity: 1; transform: none; } }

    .efr-pill.required { background: #fff1f2; color: #e11d48; }
    .efr-pill.answered { background: #ecfdf5; color: #059669; }
    .efr-pill.new      { background: #fff7e6; color: #b45309; }

    /* Type tag on top, Required tick under it. */
    .efr-row-side {
        flex: none;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 6px;
    }

    .efr-type {
        flex: none;
        display: inline-flex;
        align-items: center;
        padding: 4px 10px;
        border-radius: 8px;
        font-size: 11.5px;
        font-weight: 700;
        white-space: nowrap;
    }

    .efr-type.rating { background: #eef4ff; color: #3b5bdb; }
    .efr-type.text   { background: #fff7e6; color: #b45309; }
    .efr-type.yesno  { background: #f3e8ff; color: #7e22ce; }

    .efr-req-toggle {
        display: inline-flex;
        align-items: center;
        padding: 1px 8px 1px 6px;
        border-radius: 7px;
        border: 1px solid #e6edf5;
        background: #ffffff;
        transition: border-color .15s ease, background .15s ease;
    }

    .efr-req-toggle .ant-checkbox-wrapper {
        font-size: 11.5px;
        font-weight: 600;
        color: #7a8795;
    }

    .efr-req-toggle .ant-checkbox-wrapper span:last-child { padding-inline-end: 0; padding-inline-start: 6px; }

    .efr-req-toggle.on { border-color: #fecdd3; background: #fff5f6; }

    .efr-req-toggle.on .ant-checkbox-wrapper { color: #e11d48; }

    .efr-req-toggle.on .ant-checkbox-checked .ant-checkbox-inner {
        background-color: #e11d48;
        border-color: #e11d48;
    }


    /* ----- Create mode: pickers in the context strip ----- */

    .efr-customer.picker,
    .efr-context-item.picker {
        background: #ffffff;
        border-color: #d8e6f3;
        box-shadow: 0 0 0 3px rgba(2, 113, 174, .05);
    }

    /* The customer picker fills its card on its own rather than relying on a
       utility class, so a long name isn't clipped to "Rajesh T…". */
    .efr-customer.picker > div:last-child { flex: 1 1 auto; min-width: 0; }

    .efr-context-item.picker { min-width: 120px; }
    .efr-context-item.picker.wide { min-width: 190px; }

    .efr-inline-select { width: 100%; margin-left: -11px; }

    .efr-inline-select .ant-select-content,
    .efr-inline-select .ant-select-selector,
    .efr-inline-select .ant-select-selection-item,
    .efr-inline-select .ant-select-placeholder {
        font-size: 15px;
        font-weight: 700;
    }

    .efr-inline-select .ant-select-placeholder { font-weight: 600; }

    .efr-month-option {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
    }

    .efr-month-taken {
        font-size: 10px;
        font-weight: 700;
        letter-spacing: .04em;
        text-transform: uppercase;
        color: #b45309;
        background: #fff7e6;
        padding: 2px 7px;
        border-radius: 6px;
    }


    .efr-remove {
        flex: none;
        width: 30px;
        height: 30px;
        border-radius: 9px;
        border: 1px solid #fde2e2;
        background: #ffffff;
        color: #ef4444;
        cursor: pointer;
        transition: all .18s ease;
    }

    .efr-remove:hover { background: #ef4444; border-color: #ef4444; color: #ffffff; }


    /* ----- Step bar ----- */

    .efr-stepbar {
        position: fixed;
        left: 50%;
        bottom: 18px;
        transform: translateX(-50%);
        z-index: 50;
        width: min(860px, calc(100% - 32px));
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        padding: 8px;
        gap: 6px;
        border-radius: 20px;
        background: rgba(255, 255, 255, .96);
        backdrop-filter: blur(12px);
        border: 1px solid #e3eaf2;
        box-shadow: 0 16px 40px rgba(15, 23, 42, .14);
    }

    .efr-step {
        display: flex;
        flex-direction: column;
        border-radius: 14px;
        overflow: hidden;
    }

    .efr-step-main {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        padding: 12px 10px;
        border: none;
        background: transparent;
        color: #7a8795;
        font-size: 13.5px;
        font-weight: 700;
        cursor: pointer;
        transition: all .18s ease;
    }

    .efr-step-main:hover { background: #f4f8fc; color: #12263f; }

    .efr-step-dot {
        width: 26px;
        height: 26px;
        flex: none;
        border-radius: 50%;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: #e3eaf2;
        color: #7a8795;
        font-size: 12px;
        font-weight: 800;
    }

    .efr-step.active .efr-step-main {
        background: linear-gradient(135deg, #0271ae, #0a94d6);
        color: #ffffff;
        box-shadow: 0 8px 18px rgba(2, 113, 174, .28);
    }

    .efr-step.active .efr-step-dot { background: rgba(255, 255, 255, .25); color: #ffffff; }

    .efr-step.done .efr-step-main { color: #059669; }

    .efr-step.done .efr-step-dot { background: #10b981; color: #ffffff; }

    .efr-step-sub {
        margin-top: 4px;
        padding: 5px 8px;
        border: none;
        border-radius: 9px;
        background: #f0f8ff;
        color: #0271ae;
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
    }

    .efr-step-sub:hover { background: #dff0fd; }


    /* ----- Phone ----- */

    @media (max-width: 575.98px) {

        .efr-adder { flex-wrap: wrap; }

        .efr-adder-field, .efr-adder-field.grow { flex: 1 1 100%; }

        .efr-btn-add { width: 100%; }

    }

    @media (max-width: 767.98px) {

        .efr-header { padding: 16px; }

        .efr-header-top { flex-wrap: wrap; }

        .efr-header-top .ant-btn { width: 100%; }

        .efr-title { font-size: 19px; }

        .efr-context-item { flex: 1 1 calc(50% - 10px); }

        .efr-card-head, .efr-card-body { padding-left: 14px; padding-right: 14px; }

        .efr-row { flex-wrap: wrap; }

        .efr-row-side { flex-direction: row; align-items: center; margin-left: 62px; }

        .efr-list-hint { display: none; }

        .efr-step-main { flex-direction: column; gap: 4px; padding: 9px 4px; font-size: 11.5px; }

        .efr-step-label .bi { display: none; }

    }
`;