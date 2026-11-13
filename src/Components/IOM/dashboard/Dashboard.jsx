import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import Base1 from "../../Config/Base1";
import IIMToolbar from "../components/IIMToolbar";
import BarcodeTraceModal from "../components/BarcodeTraceModal";
import { getDashboardSummary } from "../services/services";
import { getStatusMeta as getOutwardStatus } from "../OutwardRecords/outwardStatus";
import "./Dashboard.css";

/**
 * IOM Dashboard – /iom/dashboard
 * POST IIM/GetDashboardSummary { OrgId }
 * Trace barcode -> GET IIM/GetBarcodeTraceabilityDetails (BarcodeTraceModal)
 * Page scrolls normally; the Recent lists scroll inside their cards when they have more rows.
 */

// ---------- helpers ----------
const fmtNum = (n) => (n === null || n === undefined || n === "" ? "—" : Number(n).toLocaleString("en-IN"));
const formatDate = (value) => {
    if (!value) return "-";
    const d = new Date(value);
    if (isNaN(d)) return value;
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};
const formatNow = (d) =>
    `${d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}, ${d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
const titleCase = (s) => String(s || "").toLowerCase().replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

// ---------- status pills ----------
const INWARD_STATUS = {
    NEW: { label: "New", tone: "amber" },
    PENDING_REVIEW: { label: "Pending Review", tone: "yellow" },
    REVIEWED: { label: "Reviewed", tone: "violet" },
    INVENTORY_UPDATED: { label: "Inventory Updated", tone: "green" },
    APPROVED: { label: "Inventory Updated", tone: "green" }
};
const getInwardStatus = (s) => INWARD_STATUS[String(s || "").toUpperCase()] || { label: titleCase(s) || "-", tone: "gray" };

const OUTWARD_TONE = {
    NEW: "amber",
    PARTIALLY_LOADED: "orange",
    LOADING_COMPLETED: "blue",
    DISPATCH_CONFIRMED: "green",
    DISPATCH_COMPLETED: "green",
    DISPATCHED: "green",
    CANCELLED: "red"
};
const outwardPill = (s) => {
    const k = String(s || "").toUpperCase();
    return { label: getOutwardStatus(s)?.label || titleCase(s) || "-", tone: OUTWARD_TONE[k] || "gray" };
};

const Pill = ({ label, tone }) => <span className={`dbx-pill ${tone}`}><i />{label}</span>;

// ---------- status summary (inward / outward) ----------
const INWARD_ACTIONS = {
    NEW: { title: "New", hint: "Security registration / review submission pending", tone: "blue" },
    PENDING_REVIEW: { title: "Pending Review", hint: "Employee quantity verification pending", tone: "amber" },
    REVIEWED: { title: "Reviewed", hint: "Inventory update pending", tone: "green" }
};
const OUTWARD_ACTIONS = {
    NEW: { title: "New", hint: "Loading yet to start", tone: "blue" },
    PARTIALLY_LOADED: { title: "Partially Loaded", hint: "Loading in progress", tone: "amber" },
    LOADING_COMPLETED: { title: "Loading Completed", hint: "Dispatch confirmation pending", tone: "green" }
};

// ---------- inventory stages (validated palette, always labelled) ----------
const STAGES = [
    { key: "AwaitingBarcodeGeneration", label: "Awaiting Barcode Generation", icon: "fa-solid fa-barcode", color: "#2a78d6" },
    { key: "PendingInspection", label: "Pending Inspection", icon: "fa-solid fa-magnifying-glass", color: "#eda100" },
    { key: "ReadyToDispatch", label: "Ready to Dispatch", icon: "fa-regular fa-circle-check", color: "#1baf7a" },
    { key: "OnOutward", label: "On Outward", icon: "fa-solid fa-truck", color: "#6250d6" },
    { key: "ReworkRequired", label: "Rework Required", icon: "fa-solid fa-rotate", color: "#e34948" }
];

// ---------- KPI cards ----------
// Trend chip shows only when the service sends "<Key>Change" in Summary (percent, e.g. TotalItemsChange: 3.4)
const KPIS = [
    { key: "TotalItems", label: "Total Items", icon: "fa-solid fa-cube", tone: "blue", caption: "Registered items", to: "/iom/items-list" },
    { key: "TotalInwards", label: "Total Inwards", icon: "fa-solid fa-download", tone: "green", caption: "Goods received", to: "/iom/inwards-list" },
    { key: "TotalOutwards", label: "Total Outwards", icon: "fa-solid fa-upload", tone: "orange", caption: "Vehicles loaded", to: "/iom/outwards-list" },
    { key: "TotalInventoryUnits", label: "Total Inventory Units", icon: "fa-solid fa-layer-group", tone: "featured", caption: "Units in stock", mark: "fa-solid fa-warehouse" },
    { key: "TotalDispatched", label: "Total Dispatched", icon: "fa-solid fa-truck-fast", tone: "violet", caption: "Units shipped" }
];

const Skel = ({ w = "60%", h = 12, style }) => <span className="dbx-skel" style={{ width: w, height: h, ...style }} />;

// ==========================================
// CARD HEAD
// ==========================================
const CardHead = ({ icon, tone = "blue", title, sub, right }) => (
    <div className="dbx-card-head">
        <span className={`dbx-head-icon ${tone}`}><i className={icon} /></span>
        <div className="dbx-head-text">
            <h3>{title}</h3>
            {sub && <p>{sub}</p>}
        </div>
        {right && <div className="dbx-head-right">{right}</div>}
    </div>
);

// ==========================================
// INVENTORY OVERVIEW
// ==========================================
const InventoryOverview = ({ overview, loading }) => {
    const segs = STAGES.map(s => ({ ...s, value: Number(overview?.[s.key]) || 0 }));
    const total = segs.reduce((t, s) => t + s.value, 0);
    const pctOf = (v) => (total ? (v / total) * 100 : 0);
    const pctText = (v) => {
        const p = pctOf(v);
        return p > 0 && p < 0.1 ? "<0.1%" : `${p.toFixed(1)}%`;
    };

    return (
        <section className="dbx-card dbx-inventory">
            <CardHead
                icon="fa-solid fa-layer-group"
                title="Inventory Overview"
                sub="Current inventory position across all statuses"
                right={<span className="dbx-total-pill">Total Units: {loading ? <Skel w={56} h={18} /> : <b>{fmtNum(total)}</b>}</span>}
            />
            <div className="dbx-stages">
                {segs.map((s, i) => (
                    <div key={s.key} className={`dbx-stage ${s.value ? "" : "zero"}`} style={{ "--c": s.color, "--i": i }}
                        title={`${s.label}: ${fmtNum(s.value)} (${pctText(s.value)})`}>
                        <div className="dbx-stage-top">
                            <span className="dbx-stage-icon"><i className={s.icon} /></span>
                            <span className="dbx-stage-label">{s.label}</span>
                        </div>
                        <div className="dbx-stage-bottom">
                            {loading ? <Skel w={70} h={24} /> : <b className="dbx-stage-value">{fmtNum(s.value)}</b>}
                        </div>
                        <div className="dbx-stage-bar">
                            <span className="dbx-mini"><i style={{ width: `${loading ? 0 : Math.max(pctOf(s.value), s.value ? 2 : 0)}%` }} /></span>
                            <small>{loading ? "" : pctText(s.value)}</small>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
};

// ==========================================
// STATUS SUMMARY CARD (current record count in each status)
// ==========================================
const PendingCard = ({ title, icon, rows, meta, loading, onOpen }) => {
    const list = (rows || []).map(r => {
        const key = String(r.Status || "").toUpperCase();
        return { ...r, key, ...(meta[key] || { title: titleCase(r.Status), hint: "", tone: "blue" }) };
    });
    const total = list.reduce((t, r) => t + (Number(r.PendingCount) || 0), 0);

    return (
        <section className="dbx-card dbx-pending">
            <CardHead
                icon={icon}
                title={title}
                sub="Current records in each status"
                right={<span className="dbx-total-pill sm">Total Records: {loading ? <Skel w={20} h={16} /> : <b>{fmtNum(total)}</b>}</span>}
            />
            <div className="dbx-steps">
                {loading ? (
                    [0, 1, 2].map(i => <div key={i} className="dbx-step"><Skel w="70%" /><Skel w={30} h={22} style={{ marginTop: 8 }} /></div>)
                ) : list.length ? (
                    list.map(r => {
                        const n = Number(r.PendingCount) || 0;
                        return (
                            <button key={r.key} type="button" className={`dbx-step ${r.tone} ${n ? "" : "zero"}`} onClick={onOpen} title={r.hint}>
                                <span className="dbx-step-label"><i />{r.title}</span>
                                <b>{fmtNum(n)}</b>
                            </button>
                        );
                    })
                ) : (
                    <div className="dbx-empty">No records</div>
                )}
            </div>
        </section>
    );
};

// ==========================================
// PAGE
// ==========================================
const Dashboard = () => {
    const navigate = useNavigate();
    const sessionUserData = JSON.parse(sessionStorage.getItem("userData") || "{}");
    const orgId = sessionUserData?.OrgId;

    const [menuData, setMenuData] = useState([]);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [now, setNow] = useState(() => new Date());
    const [showTrace, setShowTrace] = useState(false);

    useEffect(() => {
        try { setMenuData(JSON.parse(sessionStorage.getItem("menuData") || "[]")); } catch { /* ignore */ }
    }, []);

    // live clock
    useEffect(() => {
        const t = setInterval(() => setNow(new Date()), 30000);
        return () => clearInterval(t);
    }, []);

    const load = useCallback(async () => {
        if (!orgId) { setLoading(false); setError("Organisation not found. Please sign in again."); return; }
        setLoading(true);
        setError("");
        try {
            const res = await getDashboardSummary(orgId);
            if (res?.status === 200 && String(res?.result).toLowerCase() === "success" && res?.data) {
                setData(res.data);
                setNow(new Date());
            } else {
                setError(res?.response || res?.message || "Unable to load dashboard");
            }
        } catch (err) {
            console.error("GetDashboardSummary Error:", err);
            setError("Unable to load dashboard");
        } finally {
            setLoading(false);
        }
    }, [orgId]);

    useEffect(() => { load(); }, [load]);

    const openOutward = (r) => {
        // Outward View reads the row for its header (same shape as the outward list)
        const record = { Id: r.OutwardId, InwardRecordNo: r.OutwardNo, ArrivalDate: r.OutwardDate || r.RegisteredOn, VehicleNumber: r.VehicleNumber, Status: r.Status || r.OutwardStatus };
        try { sessionStorage.setItem(`iomOutward_${r.OutwardId}`, JSON.stringify(record)); } catch { /* ignore */ }
        navigate(`/iom/outward-view/${r.OutwardId}`, { state: { record } });
    };

    const openInward = (r) => {
        // the service can list an outward among recent inwards – send it to the right screen
        if (/^OUT-/i.test(r.InwardNo || "")) {
            openOutward({ OutwardId: r.InwardId, OutwardNo: r.InwardNo, OutwardDate: r.ArrivalDate, VehicleNumber: r.VehicleNumber, Status: r.Status });
            return;
        }
        navigate(`/iom/inward-view/${r.InwardId}`);
    };

    const summary = data?.Summary || {};
    const skelRows = (cols) => [0, 1, 2, 3].map(i => (
        <tr key={i}>{Array.from({ length: cols }).map((_, c) => <td key={c}><Skel w={c ? "55%" : "75%"} /></td>)}</tr>
    ));
    const recentInwards = data?.RecentInwards || [];
    const recentOutwards = data?.RecentOutwards || [];

    return (
        <Base1>
            <IIMToolbar menuData={menuData} />

            <div id="kt_app_content" className="app-content flex-column-fluid pt-0 mb-5">
                <div id="kt_app_content_container" className="app-container container-xxl dbx-page">
                    {/* HEADER */}
                    <div className="dbx-header">
                        <span className="dbx-header-icon"><i className="fa-solid fa-warehouse" /></span>
                        <div className="dbx-header-text">
                            <h1>Operations Overview</h1>
                            <nav className="dbx-crumbs" aria-label="breadcrumb">
                                <span>Home</span><i className="fa-solid fa-chevron-right" /><span>Dashboard</span>
                            </nav>
                        </div>
                        <div className="dbx-header-actions">
                            <span className="dbx-date"><i className="fa-regular fa-calendar" /> {formatNow(now)}</span>
                            <button type="button" className="dbx-btn primary" onClick={() => setShowTrace(true)}>
                                <i className="fa-solid fa-barcode" /> Trace Barcode
                            </button>
                            <button type="button" className="dbx-btn" onClick={load} disabled={loading}>
                                <i className={`fa-solid fa-rotate-right ${loading ? "fa-spin" : ""}`} /> Refresh
                            </button>
                        </div>
                    </div>

                    {error && !loading && (
                        <div className="dbx-error">
                            <i className="fa-solid fa-circle-exclamation" />
                            <span>{error}</span>
                            <button type="button" className="dbx-btn sm" onClick={load}>Try again</button>
                        </div>
                    )}

                    {/* KPI CARDS */}
                    <div className="dbx-kpis">
                        {KPIS.map((k, i) => {
                            const Tag = k.to ? "button" : "div";
                            const rawChange = summary[`${k.key}Change`];
                            const change = Number(rawChange);
                            const hasChange = rawChange !== undefined && rawChange !== null && rawChange !== "" && !isNaN(change);
                            return (
                                <Tag
                                    key={k.key}
                                    type={k.to ? "button" : undefined}
                                    className={`dbx-kpi ${k.tone} ${k.to ? "link" : ""}`}
                                    style={{ "--i": i }}
                                    onClick={k.to ? () => navigate(k.to) : undefined}
                                >
                                    <span className="dbx-kpi-icon"><i className={k.icon} /></span>
                                    <div className="dbx-kpi-text">
                                        <span className="dbx-kpi-label">{k.label}</span>
                                        {loading ? <Skel w={90} h={28} style={{ margin: "6px 0" }} /> : <b className="dbx-kpi-value">{fmtNum(summary[k.key])}</b>}
                                        {hasChange ? (
                                            <span className="dbx-kpi-foot">
                                                <span className={`dbx-trend ${change < 0 ? "down" : ""}`}>
                                                    <i className={`fa-solid ${change < 0 ? "fa-arrow-down" : "fa-arrow-up"}`} /> {change > 0 ? "+" : ""}{change}%
                                                </span>
                                                <small>vs. last 7 days</small>
                                            </span>
                                        ) : (
                                            <span className="dbx-kpi-foot"><small>{k.caption}</small></span>
                                        )}
                                    </div>
                                    <i className={`${k.mark || k.icon} dbx-kpi-mark`} aria-hidden="true" />
                                </Tag>
                            );
                        })}
                    </div>

                    {/* INVENTORY */}
                    <InventoryOverview overview={data?.InventoryOverview} loading={loading} />

                    {/* STATUS SUMMARY */}
                    <div className="dbx-two">
                        <PendingCard
                            title="Inward Status Summary"
                            icon="fa-solid fa-download"
                            rows={data?.InwardPendingActions}
                            meta={INWARD_ACTIONS}
                            loading={loading}
                            onOpen={() => navigate("/iom/inwards-list")}
                        />
                        <PendingCard
                            title="Outward Status Summary"
                            icon="fa-solid fa-upload"
                            rows={data?.OutwardPendingActions}
                            meta={OUTWARD_ACTIONS}
                            loading={loading}
                            onOpen={() => navigate("/iom/outwards-list")}
                        />
                    </div>

                    {/* RECENT */}
                    <div className="dbx-two dbx-recent">
                        <section className="dbx-card dbx-table-card">
                            <CardHead
                                icon="fa-solid fa-download"
                                title="Recent Inwards"
                                sub={`Latest ${recentInwards.length || 5} goods received`}
                                right={
                                    <button type="button" className="dbx-btn sm" onClick={() => navigate("/iom/inwards-list")}>
                                        View All <i className="fa-solid fa-arrow-right" />
                                    </button>
                                }
                            />
                            <div className="dbx-table-scroll">
                                <table className="dbx-table">
                                    <thead>
                                        <tr>
                                            <th>Inward No.</th>
                                            <th>Arrival Date</th>
                                            <th>Vehicle No.</th>
                                            <th className="c">Items</th>
                                            <th className="c">Qty</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading ? skelRows(6) : recentInwards.length ? (
                                            recentInwards.map(r => {
                                                const st = getInwardStatus(r.Status);
                                                return (
                                                    <tr key={r.InwardId} onClick={() => openInward(r)} title="Open">
                                                        <td data-label="Inward No.">
                                                            <span className="dbx-rec">
                                                                <i className="fa-solid fa-cube dbx-rec-icon" />
                                                                <b>{r.InwardNo}</b>
                                                            </span>
                                                        </td>
                                                        <td data-label="Arrival">{formatDate(r.ArrivalDate)}</td>
                                                        <td data-label="Vehicle">{r.VehicleNumber || "-"}</td>
                                                        <td data-label="Items" className="c">{fmtNum(r.TotalItems)}</td>
                                                        <td data-label="Quantity" className="c">{fmtNum(r.TotalQuantity)}</td>
                                                        <td data-label="Status"><Pill {...st} /></td>
                                                    </tr>
                                                );
                                            })
                                        ) : (
                                            <tr className="empty"><td colSpan={6}><div className="dbx-empty">No inwards yet</div></td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        <section className="dbx-card dbx-table-card">
                            <CardHead
                                icon="fa-solid fa-truck-fast"
                                tone="orange"
                                title="Recent Outwards"
                                sub={`Latest ${recentOutwards.length || 5} vehicles loaded and dispatched`}
                                right={
                                    <button type="button" className="dbx-btn sm" onClick={() => navigate("/iom/outwards-list")}>
                                        View All <i className="fa-solid fa-arrow-right" />
                                    </button>
                                }
                            />
                            <div className="dbx-table-scroll">
                                <table className="dbx-table">
                                    <thead>
                                        <tr>
                                            <th>Outward No.</th>
                                            <th>Date</th>
                                            <th>Vehicle No.</th>
                                            <th className="c">Items</th>
                                            <th>Loaded</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading ? skelRows(6) : recentOutwards.length ? (
                                            recentOutwards.map(r => {
                                                const st = outwardPill(r.Status);
                                                const req = Number(r.RequiredQuantity) || 0;
                                                const loaded = Number(r.LoadedQuantity) || 0;
                                                const pct = req ? Math.min(100, Math.round((loaded / req) * 100)) : 0;
                                                return (
                                                    <tr key={r.OutwardId} onClick={() => openOutward(r)} title="Open">
                                                        <td data-label="Outward No.">
                                                            <span className="dbx-rec out">
                                                                <i className="fa-solid fa-truck dbx-rec-icon" />
                                                                <b>{r.OutwardNo}</b>
                                                            </span>
                                                        </td>
                                                        <td data-label="Date">{formatDate(r.OutwardDate)}</td>
                                                        <td data-label="Vehicle">{r.VehicleNumber || "-"}</td>
                                                        <td data-label="Items" className="c">{fmtNum(r.TotalItems)}</td>
                                                        <td data-label="Loaded">
                                                            <span className="dbx-load">
                                                                <span className="dbx-load-bar"><i style={{ width: `${pct}%` }} /></span>
                                                                <small>{loaded} / {req}</small>
                                                            </span>
                                                        </td>
                                                        <td data-label="Status"><Pill {...st} /></td>
                                                    </tr>
                                                );
                                            })
                                        ) : (
                                            <tr className="empty"><td colSpan={6}><div className="dbx-empty">No outwards yet</div></td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    </div>
                </div>
            </div>

            <BarcodeTraceModal
                show={showTrace}
                orgId={orgId}
                onClose={() => setShowTrace(false)}
                onOpenInward={(inwardId) => { setShowTrace(false); navigate(`/iom/inward-view/${inwardId}`); }}
                onOpenOutward={(o) => { setShowTrace(false); openOutward(o); }}
            />
        </Base1>
    );
};

export default Dashboard;