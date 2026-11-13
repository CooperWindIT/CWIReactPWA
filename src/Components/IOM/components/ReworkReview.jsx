import React, { useCallback, useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import ItemPicker from "./ItemPicker";
import ImagePreviewModal from "./ImagePreviewModal";
import ReasonText from "./ReasonText";
import { getReworkUnits } from "../services/services";
import { BASE_IMAGE_API_GET } from "../../Config/Config";
import "../items/ItemView.css";

// ==========================================
// HELPERS
// ==========================================

const formatDate = (value) => {
    if (!value) return "—";
    const d = new Date(value);
    if (isNaN(d)) return value;
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const statusLabel = (s) =>
    s ? String(s).toLowerCase().replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) : "—";

const STATUS_CLS = {
    REWORK_REQUIRED: "iim-unit-rework",
    FAILED: "iim-unit-failed",
    PASSED: "iim-unit-passed",
    PENDING_INSPECTION: "iim-unit-pending",
    READY_TO_DISPATCH: "iim-unit-ready",
    READYTO_DISPATCH: "iim-unit-ready",
    DISPATCHED: "iim-unit-dispatched"
};

const imageUrl = (img) =>
    img ? (/^https?:\/\//i.test(img) ? img : `${BASE_IMAGE_API_GET}${img}`) : null;

const formatDateTime = (value) => {
    if (!value) return null;
    const d = new Date(value);
    if (isNaN(d)) return value;
    return d.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

// ==========================================
// HISTORY DRAWER
// Built from the unit's own fields (no separate history service yet)
// ==========================================

const HistoryDrawer = ({ unit, fallbackItemName, onClose }) => {
    const [zoom, setZoom] = useState(false);

    useEffect(() => {
        const onKey = (e) => {
            if (e.key !== "Escape") return;
            if (zoom) setZoom(false);
            else onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [zoom, onClose]);

    if (!unit) return null;

    const key = (unit.UnitStatus || "").toUpperCase();
    const img = imageUrl(unit.ReworkImage);
    const itemName = unit.ItemName || fallbackItemName || "—";
    const failed = Number(unit.FailedCount) || 0;

    // Timeline – only events we have dates for
    const events = [
        unit.CreatedOn && {
            icon: "fa-solid fa-barcode", tone: "blue",
            title: "Barcode generated",
            date: formatDateTime(unit.CreatedOn)
        },
        unit.InspectedOn && {
            icon: "fa-solid fa-xmark", tone: "red",
            title: failed > 1 ? `Inspection failed (${failed}×)` : "Inspection failed",
            date: formatDateTime(unit.InspectedOn),
            note: unit.ReworkReason
        },
        {
            icon: "fa-solid fa-screwdriver-wrench", tone: key === "REWORK_REQUIRED" ? "amber" : "green",
            title: `Current status: ${statusLabel(unit.UnitStatus)}`,
            date: formatDateTime(unit.UpdatedOn),
            current: true
        }
    ].filter(Boolean);

    return (
        <div className="rw-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <aside className="rw-drawer" role="dialog" aria-modal="true" aria-label="Unit history">

                {/* Header */}
                <div className="rw-head">
                    <div className="rw-head-top">
                        <span className="rw-head-icon"><i className="fa-solid fa-clock-rotate-left" /></span>
                        <div style={{ minWidth: 0, flex: 1 }}>
                            <div className="rw-eyebrow">Unit history</div>
                            <div className="rw-barcode">{unit.Barcode || "—"}</div>
                        </div>
                        <button type="button" className="rw-close" onClick={onClose} title="Close (Esc)">
                            <i className="fa-solid fa-xmark" />
                        </button>
                    </div>
                    <div className="rw-head-sub">
                        <span className={`iim-unit-badge ${STATUS_CLS[key] || "iim-unit-default"}`}>{statusLabel(unit.UnitStatus)}</span>
                        <span className="rw-item">{itemName}</span>
                    </div>
                </div>

                <div className="rw-body">

                    {/* Facts */}
                    <div className="rw-facts">
                        <div><small>Inward</small><b>{unit.InwardRecordNo || "—"}</b></div>
                        <div><small>Inspected on</small><b>{formatDate(unit.InspectedOn)}</b></div>
                        <div><small>Times failed</small><b className={failed > 1 ? "rw-danger" : ""}>{failed || (unit.InspectedOn ? 1 : "—")}</b></div>
                        <div><small>Last updated</small><b>{formatDate(unit.UpdatedOn)}</b></div>
                    </div>

                    {/* Reason */}
                    <div className="rw-section-title">Rework reason</div>
                    <div className={`rw-reason ${unit.ReworkReason ? "" : "empty"}`}>
                        <i className="fa-solid fa-quote-left" />
                        <span>{unit.ReworkReason || "No reason recorded."}</span>
                    </div>

                    {/* Photo */}
                    <div className="rw-section-title">Defect photo</div>
                    {img ? (
                        <button type="button" className="rw-photo" onClick={() => setZoom(true)} title="View full size">
                            <img src={img} alt="Defect" onError={(e) => { e.currentTarget.closest(".rw-photo").classList.add("broken"); }} />
                            <span className="rw-photo-zoom"><i className="fa-solid fa-magnifying-glass-plus" /> View</span>
                            <span className="rw-photo-broken"><i className="fa-regular fa-image" /> Image not available</span>
                        </button>
                    ) : (
                        <div className="rw-photo-empty"><i className="fa-regular fa-image" /> No photo uploaded</div>
                    )}

                    {/* Timeline */}
                    <div className="rw-section-title">Timeline</div>
                    <ol className="rw-timeline">
                        {events.map((ev, i) => (
                            <li key={i} className={`rw-event ${ev.current ? "current" : ""}`}>
                                <span className={`rw-dot ${ev.tone}`}><i className={ev.icon} /></span>
                                <div>
                                    <div className="rw-event-title">{ev.title}</div>
                                    {ev.date && <div className="rw-event-date">{ev.date}</div>}
                                    {ev.note && <div className="rw-event-note">{ev.note}</div>}
                                </div>
                            </li>
                        ))}
                    </ol>
                </div>

                <div className="rw-foot">
                    <button type="button" className="ir-btn-ghost" onClick={onClose}>Close</button>
                </div>
            </aside>

            {/* Full-size photo */}
            {zoom && img && (
                <div className="rw-lightbox" onMouseDown={() => setZoom(false)}>
                    <img src={img} alt="Defect full size" />
                    <button type="button" className="rw-close light" title="Close"><i className="fa-solid fa-xmark" /></button>
                </div>
            )}
        </div>
    );
};

// ==========================================
// REWORK TAB
// GET IIM/GetItemsDDL?OrgId=&ItemId=  (ItemId 0 = all items) – rework units
// ==========================================

const ReworkReview = ({ orgId: orgIdProp }) => {

    const orgId = orgIdProp || JSON.parse(sessionStorage.getItem("userData") || "{}")?.OrgId;

    const [selectedItem, setSelectedItem] = useState(null);   // null = all items
    const [units, setUnits] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [preview, setPreview] = useState(null);
    const closePreview = useCallback(() => setPreview(null), []);
    const [historyUnit, setHistoryUnit] = useState(null);
    const closeHistory = useCallback(() => setHistoryUnit(null), []);

    const fetchUnits = useCallback(async () => {
        if (!orgId) return;

        setLoading(true);
        try {
            const res = await getReworkUnits({ orgId, itemId: selectedItem?.ItemId || 0 });
            const result = String(res?.result || "").toLowerCase();

            if (res?.status === 200 && result === "success") {
                setUnits(Array.isArray(res?.data) ? res.data : []);
            } else if (res?.status === 200 && result === "not found") {
                setUnits([]);   // no data -> empty state, no popup
            } else {
                setUnits([]);
                Swal.fire("Error", res?.message || res?.response || "Unable to fetch rework units", "error");
            }
        } catch (err) {
            console.error("GetItemsDDL (rework) Error:", err);
            setUnits([]);
            Swal.fire("Error", "Failed to load rework units", "error");
        } finally {
            setLoading(false);
        }
    }, [orgId, selectedItem?.ItemId]);

    useEffect(() => {
        fetchUnits();
    }, [fetchUnits]);

    const rows = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return units;
        return units.filter(u =>
            [u.Barcode, u.ItemName, u.InwardRecordNo, u.ReworkReason]
                .some(v => String(v || "").toLowerCase().includes(term))
        );
    }, [units, search]);

    return (
        // overflow visible so the item dropdown is not cut off by the card
        <div className="ir-card" style={{ overflow: "visible" }}>

            {/* FILTERS */}
            <div className="ir-toolbar">
                <div className="it-filters rw-filters">
                    <div className="rw-picker" style={{ width: 380, maxWidth: "100%" }}>
                        <ItemPicker
                            orgId={orgId}
                            value={selectedItem}
                            onChange={(item) => setSelectedItem(item)}
                            placeholder="All items"
                        />
                    </div>

                    <div className="ir-search it-search">
                        <i className="fa-solid fa-magnifying-glass" />
                        <input
                            type="text"
                            placeholder="Search barcode, inward or reason"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <button type="button" className="ir-btn-ghost" onClick={fetchUnits} disabled={loading}>
                        <i className="fa-solid fa-rotate-right" /> Refresh
                    </button>
                </div>

                <span className="ir-sub">{rows.length} unit(s)</span>
            </div>

            {/* TABLE */}
            <div className="table-responsive iv-scroll rw-scroll">
                <table className="ir-table it-table rw-table">
                    <thead>
                        <tr>
                            <th>Barcode</th>
                            <th>Item</th>
                            <th>Inward</th>
                            <th>Status</th>
                            <th>Rework Reason</th>
                            <th>Rework Image</th>
                            <th>Inspected On</th>
                            <th className="text-end">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            Array.from({ length: 5 }).map((_, r) => (
                                <tr key={r}>{Array.from({ length: 8 }).map((__, c) => (
                                    <td key={c}><div className="ir-skel" style={{ width: "60%" }} /></td>
                                ))}</tr>
                            ))
                        ) : rows.length ? (
                            rows.map((u, i) => {
                                const img = imageUrl(u.ReworkImage);
                                const key = (u.UnitStatus || "").toUpperCase();
                                return (
                                    <tr key={u.UnitId ?? `${u.Barcode}-${i}`}>
                                        <td className="rw-c-code">
                                            {u.Barcode
                                                ? <span className="it-code">{u.Barcode}</span>
                                                : <span className="text-muted">—</span>}
                                        </td>
                                        <td className="it-name rw-c-item">{u.ItemName || selectedItem?.ItemName || "—"}</td>
                                        <td className="it-part rw-c-inward">{u.InwardRecordNo || "—"}</td>
                                        <td className="rw-c-status">
                                            <span className={`iim-unit-badge ${STATUS_CLS[key] || "iim-unit-default"}`}>
                                                {statusLabel(u.UnitStatus)}
                                            </span>
                                        </td>
                                        <td className="it-desc rw-c-reason" data-label="Rework reason">
                                            <ReasonText text={u.ReworkReason} max={15} />
                                        </td>
                                        <td className={`rw-c-img ${img ? "" : "rw-empty"}`}>
                                            {img ? (
                                                <button
                                                    type="button"
                                                    className="iv-thumb"
                                                    title="View rework image"
                                                    onClick={() => setPreview({
                                                        url: img,
                                                        title: u.Barcode || "Rework image",
                                                        subtitle: [u.ItemName || selectedItem?.ItemName, u.InwardRecordNo].filter(Boolean).join(" · "),
                                                        note: u.ReworkReason
                                                    })}
                                                >
                                                    <img src={img} alt="Rework" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                                                    <i className="fa-regular fa-image" />
                                                </button>
                                            ) : (
                                                <span className="text-muted">—</span>
                                            )}
                                        </td>
                                        <td className="rw-c-insp" data-label="Inspected">{formatDate(u.InspectedOn)}</td>
                                        <td className="rw-c-act">
                                            <div className="ir-actions">
                                                <button type="button" className="ir-btn-view it-btn" onClick={() => setHistoryUnit(u)}>
                                                    <i className="fa-solid fa-clock-rotate-left" /> History
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan="8">
                                    <div className="ir-empty">
                                        <div className="ir-empty-icon"><i className="fa-solid fa-screwdriver-wrench" /></div>
                                        <div className="ir-empty-title">No units in rework</div>
                                        <div className="ir-sub">
                                            {selectedItem ? `Nothing found for ${selectedItem.ItemName}.` : "Nothing found for any item."}
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <ImagePreviewModal image={preview} onClose={closePreview} />

            {historyUnit && (
                <HistoryDrawer unit={historyUnit} fallbackItemName={selectedItem?.ItemName} onClose={closeHistory} />
            )}
        </div>
    );
};

export default ReworkReview;