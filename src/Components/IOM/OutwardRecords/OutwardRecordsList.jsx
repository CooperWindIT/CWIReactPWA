import React, { useCallback, useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { PlusOutlined, EyeOutlined, CameraOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

import Base1 from "../../Config/Base1";
import IIMToolbar from "../components/IIMToolbar";
import RegisterInwardModel from "../components/RegisterInwardModel";
import ContainerPhotoModal from "../components/ContainerPhotoModal";
import EditInwardModel from "../components/EditInwardModel";
import BarcodeTraceModal from "../components/BarcodeTraceModal";
import { getStatusMeta } from "./outwardStatus";
import { getInwards } from "../services/services";
import "../InwardRecords/InwardRecordsPremium.css";
import "../items/ItemView.css";
import "./OutwardRecordsList.css";

// ==========================================
// PERMISSIONS (menu "Outwards")
// TODO: confirm the Outwards action ids with the backend team
// ==========================================
const ACTION_REGISTER_OUTWARD = 1;
const ACTION_VIEW_OUTWARD = 40;     // (View is shown to everyone who is not Security for now)
const ACTION_SECURITY = 39;         // Security -> "Verify" (vehicle photo upload)
const ACTION_EDIT_OUTWARD = 3;      // Edit outward
// Edit allowed until dispatch is confirmed (NEW = full edit, later statuses = add items only)
const LOCKED_STATUSES = ["DISPATCH_CONFIRMED", "DISPATCH_COMPLETED", "DISPATCHED", "CANCELLED"];
const OUTWARD_MENU_NAMES = ["Outwards", "Outward"];
const OUTWARD_MENU_PATHS = ["/iom/outwards-list", "/iim/outwards-list"];

const getOutwardActionIds = () => {
    try {
        const list = JSON.parse(sessionStorage.getItem("menuData") || "[]");
        const path = (window.location.pathname || "").toLowerCase();
        const menu =
            list.find(m => (m.MenuPath || "").toLowerCase() === path) ||
            list.find(m => OUTWARD_MENU_PATHS.includes((m.MenuPath || "").toLowerCase())) ||
            list.find(m => OUTWARD_MENU_NAMES.includes(m.MenuName));
        return menu?.ActionsIds ? String(menu.ActionsIds).split(",").map(Number) : [];
    } catch {
        return [];
    }
};

// ==========================================
// STATUS
// ==========================================
// Status badges shown above the table
const STATUS_TABS = [
    { key: "ALL", label: "All", icon: "fa-solid fa-layer-group", tone: "ir-tone-blue" },
    { key: "NEW", label: "New", icon: "fa-solid fa-file-circle-plus", tone: "ir-tone-amber" },
    { key: "PENDING_LOADING", label: "Pending loading", icon: "fa-solid fa-hourglass-half", tone: "ir-tone-amber" },
    { key: "PARTIALLY_LOADED", label: "Partially loaded", icon: "fa-solid fa-truck-ramp-box", tone: "ir-tone-amber" },
    { key: "LOADING_COMPLETED", label: "Loading completed", icon: "fa-solid fa-clipboard-check", tone: "ir-tone-blue" },
    { key: "DISPATCH_CONFIRMED", label: "Dispatch confirmed", icon: "fa-solid fa-circle-check", tone: "ir-tone-green" }
];

// ==========================================
// HELPERS
// ==========================================
const toInputDate = (d) => {
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const daysFromToday = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return toInputDate(d); };

const formatDate = (value) => {
    if (!value) return "-";
    const d = new Date(value);
    if (isNaN(d)) return value;
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const num = (v) => (v === null || v === undefined || v === "" ? null : Number(v));

// total quantity of an outward (field name may differ, use the first one present)
const getTotalQty = (r) =>
    num(r.TotalOutwardQuantity) ?? num(r.TotalQuantity) ?? num(r.TotalDeclaredQuantity) ?? num(r.TotalVerifiedQuantity);

// loaded so far – GetInwards (IsOutward 1) sends LoadedQty
const getLoadedQty = (r) => num(r.LoadedQty) ?? num(r.LoadedQuantity) ?? num(r.TotalLoadedQuantity);

// ==========================================
// PAGE
// ==========================================
const PAGE_SIZE_OPTIONS = [10, 20, 50];

const OutwardRecordsList = () => {

    const sessionUserData = JSON.parse(sessionStorage.getItem("userData") || "{}");
    const orgId = sessionUserData?.OrgId;

    const [menuData, setMenuData] = useState([]);
    const [actionIds] = useState(getOutwardActionIds);
    const canRegister = actionIds.includes(ACTION_REGISTER_OUTWARD);
    // eslint-disable-next-line no-unused-vars
    const canView = actionIds.includes(ACTION_VIEW_OUTWARD);
    const isSecurity = actionIds.includes(ACTION_SECURITY);
    const canEdit = actionIds.includes(ACTION_EDIT_OUTWARD);
    const isEditable = (r) => canEdit && !!r?.Status && !LOCKED_STATUSES.includes(String(r.Status).toUpperCase());

    const [fromDate, setFromDate] = useState(() => daysFromToday(-30));
    const [toDate, setToDate] = useState(() => daysFromToday(30));
    const [search, setSearch] = useState("");
    const [activeTab, setActiveTab] = useState("ALL");

    const [rows, setRows] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [loading, setLoading] = useState(false);

    const [showRegister, setShowRegister] = useState(false);
    const navigate = useNavigate();
    const [showTrace, setShowTrace] = useState(false);   // Trace barcode popup (all users)
    // Trace barcode -> open the unit's outward (same as Dashboard)
    const openTracedOutward = (o) => {
        const record = { Id: o.OutwardId, InwardRecordNo: o.OutwardNo, ArrivalDate: o.OutwardDate || o.RegisteredOn, VehicleNumber: o.VehicleNumber, Status: o.Status || o.OutwardStatus };
        try { sessionStorage.setItem(`iomOutward_${o.OutwardId}`, JSON.stringify(record)); } catch { /* ignore */ }
        navigate(`/iom/outward-view/${o.OutwardId}`, { state: { record } });
    };

    // View = separate screen /iom/outward-view/:id (row kept for its header)
    const openView = (r) => {
        try { sessionStorage.setItem(`iomOutward_${r.Id}`, JSON.stringify(r)); } catch { /* ignore */ }
        navigate(`/iom/outward-view/${r.Id}`, { state: { record: r } });
    };
    const [verifyRecord, setVerifyRecord] = useState(null);
    const [editRecord, setEditRecord] = useState(null);       // outward being edited   // Security photo modal

    useEffect(() => {
        try { setMenuData(JSON.parse(sessionStorage.getItem("menuData") || "[]")); } catch { /* ignore */ }
    }, []);

    // GET IIM/GetInwards with IsOutward = 1
    const fetchRows = useCallback(async (pageNumber = 1, size = pageSize) => {
        if (!orgId) return;
        setLoading(true);
        try {
            const res = await getInwards({
                orgId,
                pageNumber,
                pageSize: size,
                fromDate,
                toDate,
                vehicleNumber: search.trim(),
                // Security only verifies outwards that finished loading
                status: isSecurity ? "LOADING_COMPLETED" : "ALL",
                isOutward: 1
            });
            setRows(res?.data?.result || []);
            setTotal(Number(res?.data?.output?.TotalCount || 0));
            setPage(pageNumber);
        } catch (err) {
            console.error("GetInwards (outwards) Error:", err);
            setRows([]);
            setTotal(0);
            Swal.fire("Error", "Failed to load outward records", "error");
        } finally {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orgId, fromDate, toDate, search, pageSize, isSecurity]);

    useEffect(() => {
        fetchRows(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orgId]);

    const handleReset = () => {
        setFromDate(daysFromToday(-30));
        setToDate(daysFromToday(30));
        setSearch("");
        setActiveTab("ALL");
        setTimeout(() => fetchRows(1), 0);
    };

    // counts per status (records on this page)
    const counts = useMemo(() => {
        const c = { ALL: rows.length };
        rows.forEach(r => {
            const k = String(r.Status || "").toUpperCase();
            c[k] = (c[k] || 0) + 1;
        });
        return c;
    }, [rows]);

    const visibleRows = activeTab === "ALL"
        ? rows
        : rows.filter(r => String(r.Status || "").toUpperCase() === activeTab);

    const waitingReview = rows.filter(r => String(r.Status || "").toUpperCase() === "LOADING_COMPLETED");
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    return (
        <Base1>
            <IIMToolbar menuData={menuData} />

            <div id="kt_app_content" className="app-content flex-column-fluid pt-0 mb-5">
                <div id="kt_app_content_container" className="app-container container-xxl ir-page ow-theme">

                    {/* HEADER */}
                    <div className="ir-header">
                        <div className="ir-header-left">
                            <div className="ir-header-icon"><i className="fa-solid fa-truck-fast" /></div>
                            <div>
                                <h2 className="ir-title">Outward Records</h2>
                                <div className="ir-subtitle">
                                    Every outward record from registration to dispatch.
                                </div>
                            </div>
                        </div>

                        <div className="ir-header-actions">
                            <button type="button" className="ir-btn-trace" onClick={() => setShowTrace(true)} title="Trace barcode">
                                <i className="fa-solid fa-barcode" /> Trace Barcode
                            </button>
                            {canRegister && (
                                <button type="button" className="ir-btn-primary" onClick={() => setShowRegister(true)}>
                                    <PlusOutlined /> Register Outward Record
                                </button>
                            )}
                        </div>
                    </div>

                    {/* REVIEW BANNER */}
                    {waitingReview.length > 0 && (
                        <div className="ow-banner">
                            <span className="ow-banner-icon"><i className="fa-solid fa-clipboard-check" /></span>
                            <span>
                                <b>{waitingReview.length} outward{waitingReview.length === 1 ? "" : "s"} finished loading</b>
                                {" "}and {waitingReview.length === 1 ? "is" : "are"} waiting for your review:{" "}
                                {waitingReview.slice(0, 3).map(r => r.InwardRecordNo).join(", ")}
                                {waitingReview.length > 3 ? "…" : ""}
                            </span>
                            <button type="button" className="ir-btn-soft" onClick={() => setActiveTab("LOADING_COMPLETED")}>
                                Review now
                            </button>
                        </div>
                    )}

                    {/* STATUS BADGES */}
                    <div className="ir-kpis">
                        {STATUS_TABS.map(t => (
                            <button
                                key={t.key}
                                type="button"
                                className={`ir-kpi ${activeTab === t.key ? "active" : ""}`}
                                onClick={() => setActiveTab(t.key)}
                            >
                                <span className={`ir-kpi-icon ${t.tone}`}><i className={t.icon} /></span>
                                <span>
                                    <div className="ir-kpi-label">{t.label}</div>
                                    <div className="ir-kpi-value">{counts[t.key] || 0}</div>
                                </span>
                            </button>
                        ))}
                    </div>

                    <div className="ir-card">

                        {/* TOOLBAR */}
                        <div className="ir-toolbar">
                            <div className="ir-toolbar-title">
                                {activeTab === "ALL" ? "All records" : STATUS_TABS.find(t => t.key === activeTab)?.label}
                                <small>{visibleRows.length} shown</small>
                            </div>

                            <div className="ir-filters">
                                <div className="ir-range">
                                    <i className="fa-regular fa-calendar" />
                                    <input type="date" value={fromDate} max={toDate} onChange={(e) => setFromDate(e.target.value)} />
                                    <span className="text-muted">→</span>
                                    <input type="date" value={toDate} min={fromDate} onChange={(e) => setToDate(e.target.value)} />
                                </div>

                                <div className="ir-search">
                                    <i className="fa-solid fa-magnifying-glass" />
                                    <input
                                        type="text"
                                        placeholder="Search vehicle no."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value.toUpperCase())}
                                        onKeyDown={(e) => e.key === "Enter" && fetchRows(1)}
                                    />
                                </div>

                                <button type="button" className="ir-btn-soft" onClick={() => fetchRows(1)} disabled={loading}>
                                    Search
                                </button>
                                <button type="button" className="ir-btn-ghost" onClick={handleReset} disabled={loading}>
                                    <i className="fa-solid fa-rotate-left" /> Reset
                                </button>
                            </div>
                        </div>

                        {/* TABLE */}
                        <div className="table-responsive">
                            <table className="ir-table ir-stack">
                                <thead>
                                    <tr>
                                        <th>Outward No.</th>
                                        <th>Date</th>
                                        <th>Vehicle</th>
                                        <th className="text-center">Items</th>
                                        <th className="text-center">Qty</th>
                                        <th>Loading Progress</th>
                                        <th>Status</th>
                                        <th className="text-end">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        Array.from({ length: 4 }).map((_, r) => (
                                            <tr key={r}>{Array.from({ length: 8 }).map((__, c) => (
                                                <td key={c}><div className="ir-skel" style={{ width: c === 0 ? "70%" : "55%" }} /></td>
                                            ))}</tr>
                                        ))
                                    ) : visibleRows.length ? (
                                        visibleRows.map(r => {
                                            const meta = getStatusMeta(r.Status);
                                            const qty = getTotalQty(r);
                                            const loaded = getLoadedQty(r);
                                            const pct = qty && loaded !== null ? Math.min(100, Math.round((loaded / qty) * 100)) : 0;

                                            return (
                                                <tr key={r.Id}>
                                                    <td className="ir-stack-head">
                                                        <div className="ir-record">
                                                            <span className="ir-record-icon ow-record-icon"><i className="fa-solid fa-truck-fast" /></span>
                                                            <span className="ir-record-no">{r.InwardRecordNo}</span>
                                                        </div>
                                                    </td>
                                                    <td data-label="Date"><div className="ir-num">{formatDate(r.ArrivalDate)}</div></td>
                                                    <td data-label="Vehicle"><span className="ir-plate">{r.VehicleNumber || "-"}</span></td>
                                                    <td data-label="Items" className="text-center ir-num">{r.TotalItems ?? "-"}</td>
                                                    <td data-label="Qty" className="text-center ir-num">{qty ?? "-"}</td>
                                                    <td data-label="Loading">
                                                        {qty && loaded !== null ? (
                                                            <div className="ow-progress">
                                                                <div className="ow-progress-bar">
                                                                    <span className={pct >= 100 ? "done" : ""} style={{ width: `${pct}%` }} />
                                                                </div>
                                                                <span className="ow-progress-text">{loaded} / {qty}</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-muted">—</span>
                                                        )}
                                                    </td>
                                                    <td data-label="Status">
                                                        <span className={`ow-badge ${meta.cls}`}><span className="ow-dot" />{meta.label}</span>
                                                    </td>
                                                    <td className="ir-stack-actions">
                                                        <div className="ir-actions">
                                                            {isSecurity ? (
                                                                r.ImageUrl ? (
                                                                    <span className="ir-pill ir-pill-green">
                                                                        <span className="ir-dot" />Photo added
                                                                    </span>
                                                                ) : (
                                                                    <button type="button" className="ir-btn-upload" onClick={() => setVerifyRecord(r)}>
                                                                        <CameraOutlined /> Verify
                                                                    </button>
                                                                )
                                                            ) : (
                                                                <>
                                                                    {isEditable(r) && (
                                                                        <button type="button" className="ir-btn-view" onClick={() => setEditRecord(r)}>
                                                                            <i className="fa-regular fa-pen-to-square" /> Edit
                                                                        </button>
                                                                    )}
                                                                    <button type="button" className="ir-btn-view" onClick={() => openView(r)}>
                                                                        <EyeOutlined /> View
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan={8}>
                                                <div className="ir-empty">
                                                    <div className="ir-empty-icon"><i className="fa-solid fa-truck-fast" /></div>
                                                    <div className="ir-empty-title">No outward records found</div>
                                                    <div className="ir-sub">Try a different date range or clear the search.</div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* FOOTER */}
                        {!loading && total > 0 && (
                            <div className="ir-footer">
                                <div className="ir-footer-info">
                                    Showing <b>{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)}</b> of <b>{total}</b> records
                                </div>
                                <div className="ir-pager">
                                    <select
                                        value={pageSize}
                                        onChange={(e) => { const s = Number(e.target.value); setPageSize(s); fetchRows(1, s); }}
                                    >
                                        {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n} / page</option>)}
                                    </select>
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
                </div>
            </div>

            {/* REGISTER OUTWARD (same form as inward, IsOutward = 1) */}
            <RegisterInwardModel
                show={showRegister && canRegister}
                isOutward
                onClose={() => setShowRegister(false)}
                userId={sessionUserData?.Id}
                onSuccess={async () => {
                    setShowRegister(false);
                    await fetchRows(1);
                }}
            />


            {/* EDIT OUTWARD (action 3, until DISPATCH_CONFIRMED; NEW = full edit, else add items only) – same service as inward edit, IsOutward 1 */}
            <EditInwardModel
                show={!!editRecord && canEdit}
                isOutward
                record={editRecord}
                orgId={orgId}
                userId={sessionUserData?.Id}
                onClose={() => setEditRecord(null)}
                onSuccess={() => fetchRows(page)}
            />

            {/* SECURITY – VERIFY (vehicle photo, same service as inward: UPDATE_IMAGE, IsOutward 1) */}
            {isSecurity && (
                <ContainerPhotoModal
                    record={verifyRecord}
                    isOutward
                    orgId={orgId}
                    userId={sessionUserData?.Id}
                    title="Verify outward"
                    subtitle={verifyRecord ? `${verifyRecord.InwardRecordNo} · ${verifyRecord.VehicleNumber || "-"} · take a photo of the loaded vehicle` : ""}
                    onClose={() => setVerifyRecord(null)}
                    onUploaded={() => fetchRows(page)}
                />
            )}
            {/* TRACE BARCODE (all users) */}
            <BarcodeTraceModal
                show={showTrace}
                orgId={orgId}
                onClose={() => setShowTrace(false)}
                onOpenInward={(inwardId) => { setShowTrace(false); navigate(`/iom/inward-view/${inwardId}`); }}
                onOpenOutward={(o) => { setShowTrace(false); openTracedOutward(o); }}
            />

        </Base1>
    );
};

export default OutwardRecordsList;