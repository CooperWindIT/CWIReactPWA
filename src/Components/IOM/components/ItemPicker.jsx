import React, { useEffect, useRef, useState } from "react";
import {
    SearchOutlined,
    DownOutlined,
    CloseOutlined,
    LeftOutlined,
    RightOutlined,
    ReloadOutlined
} from "@ant-design/icons";
import { getItems } from "../services/services";

const PAGE_SIZE = 10;

const SEARCH_FIELDS = [
    { key: "itemName", label: "Name" },
    { key: "itemCode", label: "Code" },
    { key: "partNo", label: "Part No" }
];

// ==========================================
// PAGE CACHE (shared by every ItemPicker on the screen)
// key = orgId|field|searchText|page  ->  { items, total }
// ==========================================
const pageCache = new Map();

const makeKey = (orgId, field, text, page) =>
    [orgId, field, text.toLowerCase(), page].join("|");

// Call this if items are added/edited and the list must be reloaded
export const clearItemPickerCache = () => pageCache.clear();

/**
 * Searchable, server-paginated item selector.
 *
 * Single mode (default):  pick one item -> onChange(item | null)
 * Multiple mode (multiple): tick many   -> onToggle(item) per click,
 *                           selectedIds marks ticked items, "Done" closes.
 */
const ItemPicker = ({
    orgId,
    value = null,
    onChange,
    disabledIds = [],
    disabled = false,
    multiple = false,
    selectedIds = [],
    onToggle,
    placeholder,
    showReadyCount = false     // Outwards: show "Ready n" and block items with 0 ready to dispatch
}) => {

    const wrapperRef = useRef(null);
    const searchRef = useRef(null);

    const [open, setOpen] = useState(false);
    const [searchField, setSearchField] = useState("itemName");
    const [searchText, setSearchText] = useState("");
    const [debouncedText, setDebouncedText] = useState("");
    const [page, setPage] = useState(1);

    const [items, setItems] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    // ------------------------------------------
    // Close when clicking outside
    // ------------------------------------------
    useEffect(() => {
        if (!open) return;

        const handleClick = (e) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
                setOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [open]);

    // ------------------------------------------
    // Debounce search text (400 ms). Only reset to page 1
    // when the text actually changed.
    // ------------------------------------------
    useEffect(() => {
        const t = setTimeout(() => {
            const next = searchText.trim();
            setDebouncedText(prev => {
                if (prev !== next) setPage(1);
                return next;
            });
        }, 400);

        return () => clearTimeout(t);
    }, [searchText]);

    // ------------------------------------------
    // Load a page: cache first, API only if not cached
    // ------------------------------------------
    const loadPage = async (force = false) => {
        if (!orgId) return;

        const key = makeKey(orgId, searchField, debouncedText, page);

        if (!force && pageCache.has(key)) {
            const cached = pageCache.get(key);
            setItems(cached.items);
            setTotal(cached.total);
            setError("");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const response = await getItems({
                orgId,
                pageNumber: page,
                pageSize: PAGE_SIZE,
                itemName: searchField === "itemName" ? debouncedText : "",
                itemCode: searchField === "itemCode" ? debouncedText : "",
                partNo: searchField === "partNo" ? debouncedText : ""
            });

            const list = response?.data?.result || [];
            const count = Number(
                response?.data?.output?.TotalCount ??
                response?.data?.TotalCount ??
                list.length
            ) || 0;

            pageCache.set(key, { items: list, total: count });

            setItems(list);
            setTotal(count);
        } catch (err) {
            console.error("ItemPicker GetItems Error:", err);
            setItems([]);
            setTotal(0);
            setError("Failed to load items.");
        } finally {
            setLoading(false);
        }
    };

    // Runs only when the panel is open AND page / search changes.
    // Re-opening on the same page is served from cache (no API call).
    useEffect(() => {
        if (open) loadPage();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, page, searchField, debouncedText, orgId]);

    // Focus search when opened
    useEffect(() => {
        if (open) setTimeout(() => searchRef.current?.focus(), 0);
    }, [open]);

    // ------------------------------------------
    // Selection
    // ------------------------------------------
    const toPicked = (item) => ({
        ItemId: item.ItemId,
        ItemCode: item.ItemCode,
        ItemName: item.ItemName,
        PartNo: item.PartNo,
        ReadyToDispatchCount: item.ReadyToDispatchCount
    });

    const handleSelect = (item) => {
        if (multiple) {
            if (typeof onToggle === "function") onToggle(toPicked(item));
            return; // keep panel open for more picks
        }

        if (typeof onChange === "function") onChange(toPicked(item));
        setOpen(false);
    };

    const usedIds = disabledIds.map(String);
    const tickedIds = selectedIds.map(String);
    const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
    const to = Math.min(page * PAGE_SIZE, total);
    const fieldLabel = SEARCH_FIELDS.find(f => f.key === searchField)?.label || "";

    return (
        <div ref={wrapperRef} style={{ position: "relative" }}>

            {/* ================= TRIGGER ================= */}
            <div
                role="button"
                tabIndex={0}
                className={`form-select d-flex align-items-center justify-content-between ${disabled ? "bg-light" : ""}`}
                style={{
                    cursor: disabled ? "not-allowed" : "pointer",
                    backgroundImage: "none",
                    minHeight: 42
                }}
                onClick={() => !disabled && setOpen(o => !o)}
                onKeyDown={(e) => {
                    if (!disabled && (e.key === "Enter" || e.key === " ")) {
                        e.preventDefault();
                        setOpen(o => !o);
                    }
                }}
            >
                {multiple ? (
                    <span className={tickedIds.length ? "fw-semibold text-gray-800" : "text-muted"}>
                        <SearchOutlined className="me-2" />
                        {tickedIds.length
                            ? `${tickedIds.length} item(s) selected — click to add more`
                            : (placeholder || "Search and select items")}
                    </span>
                ) : value?.ItemId ? (
                    <span className="text-truncate">
                        <span className="fw-bold">{value.ItemCode}</span>
                        {" - "}
                        {value.ItemName}
                        {value.PartNo ? <span className="text-muted"> ({value.PartNo})</span> : null}
                    </span>
                ) : (
                    <span className="text-muted">{placeholder || "Select item"}</span>
                )}

                <span className="d-flex align-items-center gap-2 ms-2 text-muted">
                    {!multiple && value?.ItemId && !disabled && (
                        <CloseOutlined
                            title="Clear"
                            onClick={(e) => {
                                e.stopPropagation();
                                if (typeof onChange === "function") onChange(null);
                            }}
                        />
                    )}
                    <DownOutlined style={{ fontSize: 11 }} />
                </span>
            </div>

            {/* ================= PANEL ================= */}
            {open && (
                <div
                    className="bg-white border rounded shadow"
                    style={{
                        position: "absolute",
                        top: "calc(100% + 4px)",
                        left: 0,
                        right: 0,
                        minWidth: 360,
                        zIndex: 1070
                    }}
                >

                    {/* Search */}
                    <div className="p-3 border-bottom d-flex gap-2">
                        <select
                            className="form-select form-select-sm"
                            style={{ width: 110 }}
                            value={searchField}
                            onChange={(e) => {
                                setSearchField(e.target.value);
                                setPage(1);
                            }}
                        >
                            {SEARCH_FIELDS.map(f => (
                                <option key={f.key} value={f.key}>{f.label}</option>
                            ))}
                        </select>

                        <div className="input-group input-group-sm">
                            <span className="input-group-text bg-white"><SearchOutlined /></span>
                            <input
                                ref={searchRef}
                                type="text"
                                className="form-control"
                                placeholder={`Search by item ${fieldLabel.toLowerCase()}`}
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                                onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
                            />
                        </div>

                        <button
                            type="button"
                            className="btn btn-sm btn-icon btn-light"
                            title="Reload this page"
                            disabled={loading}
                            onClick={() => loadPage(true)}
                        >
                            <ReloadOutlined />
                        </button>
                    </div>

                    {/* List */}
                    <div style={{ maxHeight: 280, overflowY: "auto" }}>
                        {loading ? (
                            <div className="text-center py-6">
                                <span className="spinner-border spinner-border-sm text-primary" />
                                <span className="text-muted ms-2 fs-7">Loading items...</span>
                            </div>
                        ) : error ? (
                            <div className="text-center py-6 text-danger fs-7">
                                {error}{" "}
                                <button type="button" className="btn btn-link btn-sm p-0" onClick={() => loadPage(true)}>
                                    Retry
                                </button>
                            </div>
                        ) : items.length === 0 ? (
                            <div className="text-center py-6 text-muted fs-7">
                                No items found{debouncedText ? ` for "${debouncedText}"` : ""}
                            </div>
                        ) : (
                            items.map(item => {
                                const id = String(item.ItemId);
                                const isSelected = multiple
                                    ? tickedIds.includes(id)
                                    : String(value?.ItemId) === id;
                                const ready = Number(item.ReadyToDispatchCount) || 0;
                                const noStock = showReadyCount && !isSelected && ready <= 0;
                                const isUsed = (!isSelected && usedIds.includes(id)) || noStock;

                                return (
                                    <div
                                        key={item.ItemId}
                                        role="option"
                                        aria-selected={isSelected}
                                        className="px-4 py-3 border-bottom d-flex align-items-center"
                                        style={{
                                            cursor: isUsed ? "not-allowed" : "pointer",
                                            opacity: isUsed ? 0.5 : 1,
                                            background: isSelected ? "#eef3ff" : undefined,
                                            userSelect: "none"
                                        }}
                                        onClick={() => !isUsed && handleSelect(item)}
                                    >
                                        {multiple && (
                                            <input
                                                type="checkbox"
                                                className="form-check-input me-3 flex-shrink-0"
                                                checked={isSelected}
                                                disabled={isUsed}
                                                readOnly
                                                tabIndex={-1}
                                                style={{ pointerEvents: "none" }}
                                            />
                                        )}

                                        <div className="flex-grow-1" style={{ minWidth: 0 }}>
                                            <div className="fw-semibold text-gray-800 text-truncate">
                                                {item.ItemName || "-"}
                                            </div>
                                            <div className="text-muted fs-8">
                                                {item.ItemCode || "-"}
                                                {item.PartNo ? ` · Part No: ${item.PartNo}` : ""}
                                            </div>
                                        </div>

                                        {!multiple && isSelected && (
                                            <span className="badge badge-light-primary ms-2">Selected</span>
                                        )}
                                        {showReadyCount && (
                                            <span
                                                className={`badge ms-2 ${ready > 0 ? "badge-light-success" : "badge-light"}`}
                                                title="Units ready to dispatch"
                                            >
                                                {ready > 0 ? `Ready ${ready}` : "None ready"}
                                            </span>
                                        )}
                                        {isUsed && !noStock && (
                                            <span className="badge badge-light ms-2">Already added</span>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Footer: count + pagination (+ Done in multi mode) */}
                    <div className="px-3 py-2 border-top d-flex justify-content-between align-items-center bg-light gap-2">
                        <span className="text-muted fs-8">
                            {total > 0 ? `Showing ${from}-${to} of ${total} items` : "0 items"}
                        </span>

                        <div className="d-flex align-items-center gap-2">
                            <button
                                type="button"
                                className="btn btn-sm btn-icon btn-light"
                                disabled={loading || page <= 1}
                                onClick={() => setPage(p => p - 1)}
                                title="Previous page"
                            >
                                <LeftOutlined />
                            </button>

                            <span className="fs-8 fw-bold">{page} / {totalPages}</span>

                            <button
                                type="button"
                                className="btn btn-sm btn-icon btn-light"
                                disabled={loading || page >= totalPages}
                                onClick={() => setPage(p => p + 1)}
                                title="Next page"
                            >
                                <RightOutlined />
                            </button>

                            {multiple && (
                                <button
                                    type="button"
                                    className="btn btn-sm btn-primary py-1 ms-2"
                                    onClick={() => setOpen(false)}
                                >
                                    Done ({tickedIds.length})
                                </button>
                            )}
                        </div>
                    </div>

                </div>
            )}
        </div>
    );
};

export default ItemPicker;