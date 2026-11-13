import React, { useCallback, useEffect, useState } from "react";
import { EyeOutlined } from "@ant-design/icons";
import { getInwards, getInwardRecordDetails } from "../services/services";

// ==========================================
// HELPERS
// ==========================================

const toInputDate = (d) => {
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const daysFromToday = (n) => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return toInputDate(d);
};

const formatDate = (value) => {
    if (!value) return "-";
    const d = new Date(value);
    if (isNaN(d)) return value;
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const STATUS_META = {
    NEW: { label: "New", cls: "ir-pill-amber" },
    PENDING_REVIEW: { label: "Pending Review", cls: "ir-pill-blue" },
    REVIEWED: { label: "Reviewed", cls: "ir-pill-violet" },
    INVENTORY_UPDATED: { label: "Inventory Updated", cls: "ir-pill-green" },
    APPROVED: { label: "Inventory Updated", cls: "ir-pill-green" }
};

const getStatusMeta = (status) => {
    const key = (status || "").toUpperCase();
    return STATUS_META[key] || { label: key ? key.replaceAll("_", " ") : "-", cls: "ir-pill-amber" };
};

const renderDiff = (item) => {
    const verified = item.VerifiedQuantity;
    if (verified === null || verified === undefined || verified === "") {
        return <span className="ir-pill" style={{ background: "#f2f4f7", color: "#667085" }}>Not counted</span>;
    }
    const diff = Number(verified) - (Number(item.DeclaredQuantity) || 0);
    if (diff === 0) return <span className="ir-pill ir-pill-green"><span className="ir-dot" />Matched</span>;
    if (diff < 0) return <span className="ir-pill" style={{ background: "#fef3f2", color: "#c4320a" }}><span className="ir-dot" />Short {Math.abs(diff)}</span>;
    return <span className="ir-pill ir-pill-amber"><span className="ir-dot" />Excess {diff}</span>;
};

const PAGE_SIZE = 10;

// This tab lists only inwards whose stock is already added (barcodes exist)
const TAB_STATUS = "INVENTORY_UPDATED";

// ==========================================
// INWARDS TAB (accordion per inward, items loaded on open)
// ==========================================

const InwardsTab = ({ orgId, canViewItem, onViewItem, onCountChange }) => {

    const [fromDate, setFromDate] = useState(() => daysFromToday(-30));
    const [toDate, setToDate] = useState(() => daysFromToday(1));
    const [vehicle, setVehicle] = useState("");

    const [page, setPage] = useState(1);
    const [rows, setRows] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);

    const [openId, setOpenId] = useState(null);
    const [details, setDetails] = useState({});   // { [inwardId]: { loading, items, error } }

    const fetchRows = useCallback(async (pageNumber = 1) => {
        if (!orgId) return;

        setLoading(true);
        try {
            const res = await getInwards({
                orgId,
                pageNumber,
                pageSize: PAGE_SIZE,
                fromDate,
                toDate,
                vehicleNumber: vehicle.trim(),
                status: TAB_STATUS
            });

            const list = res?.data?.result || [];
            const count = Number(res?.data?.output?.TotalCount || 0);

            setRows(list);
            setTotal(count);
            setPage(pageNumber);
            setOpenId(null);
            onCountChange?.(count);
        } catch (err) {
            console.error("GetInwards Error:", err);
            setRows([]);
            setTotal(0);
            onCountChange?.(0);
        } finally {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orgId, fromDate, toDate, vehicle]);

    useEffect(() => {
        fetchRows(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orgId]);

    // Load items of an inward the first time its row is opened
    const loadDetails = async (inwardId) => {
        setDetails(prev => ({ ...prev, [inwardId]: { loading: true, items: [] } }));
        try {
            const res = await getInwardRecordDetails(orgId, inwardId);
            const ok = res?.status === 200 && String(res?.result).toLowerCase() === "success";
            setDetails(prev => ({
                ...prev,
                [inwardId]: {
                    loading: false,
                    items: ok ? (res?.data?.InwardRecordItems || []) : [],
                    error: ok ? null : (res?.message || res?.response || "Unable to load items")
                }
            }));
        } catch (err) {
            console.error("GetInwardRecordDetails Error:", err);
            setDetails(prev => ({ ...prev, [inwardId]: { loading: false, items: [], error: "Failed to load items" } }));
        }
    };

    const toggleRow = (inwardId) => {
        if (openId === inwardId) {
            setOpenId(null);
            return;
        }
        setOpenId(inwardId);
        if (!details[inwardId] || details[inwardId].error) loadDetails(inwardId);
    };

    const handleReset = () => {
        setFromDate(daysFromToday(-30));
        setToDate(daysFromToday(1));
        setVehicle("");
        setDetails({});
        setTimeout(() => fetchRows(1), 0);
    };

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    return (
        <div className="ir-card">

            {/* FILTERS */}
            <div className="ir-toolbar">
                <div className="it-filters">
                    <div className="ir-range">
                        <i className="fa-regular fa-calendar" />
                        <input type="date" value={fromDate} max={toDate} onChange={(e) => setFromDate(e.target.value)} />
                        <span className="text-muted">to</span>
                        <input type="date" value={toDate} min={fromDate} onChange={(e) => setToDate(e.target.value)} />
                    </div>

                    <div className="ir-search it-search">
                        <i className="fa-solid fa-truck" />
                        <input
                            type="text"
                            placeholder="Vehicle number"
                            value={vehicle}
                            onChange={(e) => setVehicle(e.target.value.toUpperCase())}
                            onKeyDown={(e) => e.key === "Enter" && fetchRows(1)}
                        />
                    </div>

                    <span className="iv-select" title="Only inwards with inventory updated are listed here">
                        <span className="iv-select-label">Status</span>
                        <span className="ir-pill ir-pill-green" style={{ margin: "0 10px" }}><span className="ir-dot" />Inventory Updated</span>
                    </span>

                    <button type="button" className="ir-btn-soft" onClick={() => fetchRows(1)} disabled={loading}>
                        <i className="fa-solid fa-magnifying-glass" /> Search
                    </button>

                    <button type="button" className="ir-btn-ghost" onClick={handleReset} disabled={loading}>
                        <i className="fa-solid fa-rotate-left" /> Reset
                    </button>
                </div>
            </div>

            {/* LIST */}
            <div className="ia-head-labels">
                <span />
                <span>Inward Record</span>
                <span>Arrival Date</span>
                <span>Vehicle</span>
                <span className="ia-hide-sm">Items</span>
                <span className="ia-hide-sm">Verified Qty</span>
                <span className="ia-hide-sm">Status</span>
            </div>

            {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="ia-head" style={{ cursor: "default" }}>
                        {[10, 60, 50, 50, 30, 30, 50].map((w, c) => (
                            <div key={c} className="ir-skel" style={{ width: `${w}%` }} />
                        ))}
                    </div>
                ))
            ) : rows.length === 0 ? (
                <div className="ir-empty">
                    <div className="ir-empty-icon"><i className="fa-solid fa-truck-ramp-box" /></div>
                    <div className="ir-empty-title">No inventory-updated inwards found</div>
                    <div className="ir-sub">Try a different date range or vehicle number.</div>
                </div>
            ) : (
                rows.map(r => {
                    const isOpen = openId === r.Id;
                    const meta = getStatusMeta(r.Status);
                    const d = details[r.Id];

                    return (
                        <div key={r.Id} className={`ia-row ${isOpen ? "open" : ""}`}>
                            <button type="button" className="ia-head" onClick={() => toggleRow(r.Id)} aria-expanded={isOpen}>
                                <i className="fa-solid fa-chevron-right ia-chevron" />
                                <span className="ir-record">
                                    <span className="ir-record-icon"><i className="fa-solid fa-box" /></span>
                                    <span className="ia-rec-text">
                                        <span className="ir-record-no">{r.InwardRecordNo}</span>
                                        {/* phones: date · items · qty under the number */}
                                        <small className="ia-sub-sm">
                                            {formatDate(r.ArrivalDate)} · {r.TotalItems ?? 0} item{Number(r.TotalItems) === 1 ? "" : "s"} · {r.TotalVerifiedQuantity ?? r.TotalDeclaredQuantity ?? 0} qty
                                        </small>
                                    </span>
                                </span>
                                <span>{formatDate(r.ArrivalDate)}</span>
                                <span><span className="ir-plate">{r.VehicleNumber || "-"}</span></span>
                                <span className="ir-num ia-hide-sm">{r.TotalItems ?? "-"}</span>
                                <span className="ir-num ia-hide-sm">{r.TotalVerifiedQuantity ?? r.TotalDeclaredQuantity ?? "-"}</span>
                                <span className="ia-hide-sm">
                                    <span className={`ir-pill ${meta.cls}`}><span className="ir-dot" />{meta.label}</span>
                                </span>
                            </button>

                            {isOpen && (
                                <div className="ia-body">
                                    {!d || d.loading ? (
                                        <div className="ir-sub py-4">
                                            <span className="spinner-border spinner-border-sm me-2" />Loading items…
                                        </div>
                                    ) : d.error ? (
                                        <div className="ir-sub py-4 text-danger">
                                            {d.error}{" "}
                                            <button type="button" className="iv-reset-link" onClick={() => loadDetails(r.Id)}>Retry</button>
                                        </div>
                                    ) : d.items.length === 0 ? (
                                        <div className="ir-sub py-4">No items in this inward.</div>
                                    ) : (
                                        <div className="table-responsive ia-items-wrap">
                                            <table className="ir-table it-table mb-0 ia-items-table">
                                                <thead>
                                                    <tr>
                                                        <th>Item</th>
                                                        <th>Part Number</th>
                                                        <th>Declared</th>
                                                        <th>Verified</th>
                                                        <th>Result</th>
                                                        <th className="text-end">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {d.items.map(it => (
                                                        <tr key={it.RecordItemId}>
                                                            <td className="ia-c-item">
                                                                <div className="it-name">{it.ItemName || "-"}</div>
                                                                <span className="it-code">{it.ItemCode || "-"}</span>
                                                            </td>
                                                            <td className="it-part ia-c-part" data-label="Part no.">{it.PartNo || "-"}</td>
                                                            <td className="ir-num ia-c-dec" data-label="Declared">{it.DeclaredQuantity ?? "-"}</td>
                                                            <td className="ir-num ia-c-ver" data-label="Verified">{it.VerifiedQuantity ?? "—"}</td>
                                                            <td className="ia-c-res" data-label="Result">{renderDiff(it)}</td>
                                                            <td className="ia-c-act">
                                                                <div className="ir-actions">
                                                                    {canViewItem ? (
                                                                        <button
                                                                            type="button"
                                                                            className="ir-btn-view it-btn"
                                                                            onClick={() => onViewItem(it, r)}
                                                                        >
                                                                            <EyeOutlined /> View
                                                                        </button>
                                                                    ) : (
                                                                        <span className="text-muted">—</span>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })
            )}

            {/* FOOTER */}
            {!loading && total > 0 && (
                <div className="ir-footer">
                    <div className="ir-footer-info">
                        Showing <b>{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)}</b> of <b>{total}</b> inwards
                    </div>
                    <div className="ir-pager">
                        <button type="button" className="ir-page-btn" disabled={page <= 1} onClick={() => fetchRows(page - 1)}>
                            <i className="fa-solid fa-chevron-left" />
                        </button>
                        <span className="ir-sub fw-semibold mx-2">{page} / {totalPages}</span>
                        <button type="button" className="ir-page-btn" disabled={page >= totalPages} onClick={() => fetchRows(page + 1)}>
                            <i className="fa-solid fa-chevron-right" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InwardsTab;