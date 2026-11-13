import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import {
    ArrowLeftOutlined,
    BarcodeOutlined,
    CloseOutlined,
    ReloadOutlined
} from "@ant-design/icons";

import Base1 from "../../Config/Base1";
import { BASE_IMAGE_API_GET } from "../../Config/Config";
import IIMToolbar from "../components/IIMToolbar";
import ImagePreviewModal from "../components/ImagePreviewModal";
import { UnitJourneyModal } from "../OutwardRecords/OutwardView";
import ReasonText from "../components/ReasonText";
import { getItemsActionIds } from "../components/menuActions";
import {
    getInventoryUnits,
    getInwardsByItem
} from "../services/services";
import "./ItemView.css";
import "./ItemsList.css";
import "../InwardRecords/InwardRecordsPremium.css";

// Action id that allows viewing item barcodes
const ACTION_VIEW_ITEM = 41;

// ==========================================
// UNIT STATUS CONFIG
// ==========================================

// Unit statuses from the backend (Ready to Dispatch key is READYTO_DISPATCH)
const UNIT_STATUSES = [
    { key: "PENDING_INSPECTION", label: "Pending Inspection", cls: "iim-unit-pending" },
    { key: "READYTO_DISPATCH", label: "Ready to Dispatch", cls: "iim-unit-ready" },
    { key: "REWORK_REQUIRED", label: "Rework Required", cls: "iim-unit-rework" }
];

// Treat the old spelling READY_TO_DISPATCH the same as READYTO_DISPATCH
const normalizeStatus = (status) => {
    const key = String(status || "").toUpperCase();
    return key === "READY_TO_DISPATCH" ? "READYTO_DISPATCH" : key;
};

const getStatusMeta = (status) => {
    const key = normalizeStatus(status);
    return (
        UNIT_STATUSES.find(s => s.key === key) || {
            key,
            label: key
                ? key.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())
                : "-",
            cls: "iim-unit-default"
        }
    );
};

// Barcode generation filter (server-side: GenerationFilter)
const GENERATION_TABS = [
    { key: "ALL", label: "All barcodes" },
    { key: "GENERATED", label: "Generated" },
    { key: "NOT_GENERATED", label: "Not generated" }
];

// ==========================================
// HELPERS
// ==========================================

// 07-Oct-2026
const formatDate = (value) => {
    if (!value) return "-";
    const d = new Date(value);
    if (isNaN(d)) return value;
    return d
        .toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
        .replace(/ /g, "-");
};

const getInitials = (name = "") =>
    name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map(w => w[0].toUpperCase())
        .join("") || "IT";

const getSelectedItem = (location) => {
    if (location.state?.item) return location.state.item;
    try {
        return JSON.parse(sessionStorage.getItem("selectedIIMItem") || "null");
    } catch {
        return null;
    }
};

const num = (v) => Number(v) || 0;
// ==========================================
// PAGE
// ==========================================

const ItemView = () => {

    const navigate = useNavigate();
    const location = useLocation();
    const { itemId } = useParams();

    const sessionUserData = JSON.parse(sessionStorage.getItem("userData") || "{}");
    const orgId = sessionUserData?.OrgId;
    const userId = sessionUserData?.Id;

    const [item] = useState(() => getSelectedItem(location));
    const [menuData, setMenuData] = useState([]);
    const [sessionActionIds] = useState(getItemsActionIds);

    // Inward to open first (passed from Items list -> Inwards tab)
    const preferredInwardId = location.state?.inwardRecordId ? String(location.state.inwardRecordId) : "";

    // ---------- Inwards (for the Inward dropdown) ----------
    const [inwards, setInwards] = useState([]);
    const [inwardsLoading, setInwardsLoading] = useState(false);

    // ---------- Barcodes ----------
    const [selectedInwardId, setSelectedInwardId] = useState("");
    const [units, setUnits] = useState([]);
    const [unitsLoading, setUnitsLoading] = useState(false);
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [generationFilter, setGenerationFilter] = useState("ALL");
    const [search, setSearch] = useState("");
    const [preview, setPreview] = useState(null);
    const closePreview = useCallback(() => setPreview(null), []);

    // click a barcode -> unit journey (GetBarcodeTraceabilityDetails)
    const [journeyUnit, setJourneyUnit] = useState(null);
    const closeJourney = useCallback(() => setJourneyUnit(null), []);

    const resolvedItemId = itemId || item?.ItemId;

    // ==========================================
    // MENU / ACTION IDS
    // ==========================================

    useEffect(() => {
        try {
            setMenuData(JSON.parse(sessionStorage.getItem("menuData") || "[]"));
        } catch (err) {
            console.error("Error parsing menuData:", err);
        }
    }, []);

    const canView = sessionActionIds?.includes(ACTION_VIEW_ITEM);

    useEffect(() => {
        if (!orgId) navigate("/");
    }, [orgId, navigate]);

    // ==========================================
    // INWARDS  (GET IIM/GetInwardsbyItem)
    // ==========================================

    const fetchInwards = useCallback(async () => {
        if (!orgId || !resolvedItemId) return;

        setInwardsLoading(true);

        try {
            const res = await getInwardsByItem(orgId, resolvedItemId);
            const list =
                res?.status === 200 && res?.result === "success" && Array.isArray(res?.data)
                    ? res.data
                    : [];

            setInwards(list);

            const has = (v) => v && list.some(i => String(i.InwardRecordId) === String(v));

            setSelectedInwardId(prev =>
                has(prev)
                    ? prev
                    : has(preferredInwardId)
                        ? preferredInwardId
                        : list.length ? String(list[0].InwardRecordId) : ""
            );
        } catch (err) {
            console.error("GetInwardsbyItem Error:", err);
            setInwards([]);
            Swal.fire("Error", "Failed to load inwards for this item", "error");
        } finally {
            setInwardsLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orgId, resolvedItemId]);

    useEffect(() => {
        if (canView) fetchInwards();
    }, [canView, fetchInwards]);

    const findInward = (id) => inwards.find(i => String(i.InwardRecordId) === String(id));

    // ==========================================
    // BARCODES  (GET IIM/GetInventoryUnits)
    // ==========================================

    const fetchUnits = useCallback(async () => {
        if (!selectedInwardId) {
            setUnits([]);
            return;
        }

        setUnitsLoading(true);

        try {
            const response = await getInventoryUnits({
                unitStatus: "ALL",
                inwardRecordId: Number(selectedInwardId),
                generationFilter,
                itemId: resolvedItemId
            });

            const result = String(response?.result || "").toLowerCase();

            if (response?.status === 200 && result === "success") {
                setUnits(Array.isArray(response?.data) ? response.data : []);
            } else if (response?.status === 200 && result === "not found") {
                // No records -> just show the empty state, no popup
                setUnits([]);
            } else {
                setUnits([]);
                Swal.fire("Error", response?.message || response?.response || "Unable to fetch barcodes", "error");
            }
        } catch (error) {
            console.error("GetInventoryUnits Error:", error);
            setUnits([]);
            Swal.fire("Error", "Failed to load barcodes", "error");
        } finally {
            setUnitsLoading(false);
        }
    }, [selectedInwardId, generationFilter, resolvedItemId]);

    useEffect(() => {
        if (canView) fetchUnits();
    }, [canView, fetchUnits]);

    const selectedInward = findInward(selectedInwardId);

    const statusCounts = useMemo(() => {
        const c = { ALL: units.length };
        UNIT_STATUSES.forEach(s => { c[s.key] = 0; });
        units.forEach(u => {
            const k = normalizeStatus(u.UnitStatus);
            c[k] = (c[k] || 0) + 1;
        });
        return c;
    }, [units]);

    const generatedCount = units.filter(u =>
        u.IsGenerated === true || u.IsGenerated === 1 || String(u.IsGenerated).toLowerCase() === "true" || String(u.IsGenerated) === "1"
    ).length;

    const filteredUnits = useMemo(() => {
        const term = search.trim().toLowerCase();
        return units.filter(u =>
            (statusFilter === "ALL" || normalizeStatus(u.UnitStatus) === statusFilter) &&
            (!term ||
                (u.Barcode || "").toLowerCase().includes(term) ||
                String(u.UnitId ?? "").includes(term))
        );
    }, [units, statusFilter, search]);



    // ==========================================
    // RENDER
    // ==========================================

    return (
        <Base1>
            <IIMToolbar menuData={menuData} />

            <div id="kt_app_content" className="app-content flex-column-fluid pt-0 mb-5">
                <div id="kt_app_content_container" className="app-container container-xxl">

                    <button type="button" className="iim-back-link" onClick={() => navigate("/iom/items-list")}>
                        <ArrowLeftOutlined /> Back
                    </button>

                    {!canView ? (
                        <div className="alert alert-warning">
                            You don't have permission to view item barcodes.
                        </div>
                    ) : !item ? (
                        <div className="alert alert-warning">
                            Item details not found (Item ID: {itemId}). Please open it again from the Items list.
                        </div>
                    ) : (
                        <>
                            {/* HEADING – one compact row: item on the left, quick facts on the right */}
                            <div className="iim-strip iv-strip">
                                <div className="iim-strip-item">
                                    <div className="iim-strip-avatar">
                                        {item.ItemImage ? (
                                            <img
                                                src={`${BASE_IMAGE_API_GET}${item.ItemImage}`}
                                                alt={item.ItemName || "Item"}
                                                onError={(e) => { e.currentTarget.style.display = "none"; }}
                                            />
                                        ) : (
                                            getInitials(item.ItemName)
                                        )}
                                    </div>
                                    <div style={{ minWidth: 0 }}>
                                        <div className="iim-strip-name">
                                            <h2>{item.ItemName || "-"}</h2>
                                            <span className="it-code">{item.ItemCode || "-"}</span>
                                            {item.PartNo && <span className="iim-strip-part">Part No: {item.PartNo}</span>}
                                        </div>
                                        <div className="iim-strip-desc" title={item.Description || ""}>
                                            {item.Description || "Barcodes of this item, by inward record."}
                                        </div>
                                    </div>
                                </div>

                                <div className="iim-strip-facts">
                                    <div>
                                        <small>Inwards</small>
                                        <b>{inwards.length}</b>
                                    </div>
                                    <div>
                                        <small>Units{selectedInward ? ` · ${selectedInward.InwardRecordNo}` : ""}</small>
                                        <b>{units.length}</b>
                                    </div>
                                    <div>
                                        <small>Barcodes generated</small>
                                        <b className="ok">{generatedCount}</b>
                                    </div>
                                    <div>
                                        <small>In rework</small>
                                        <b className={statusCounts.REWORK_REQUIRED ? "bad" : ""}>{statusCounts.REWORK_REQUIRED || 0}</b>
                                    </div>
                                </div>
                            </div>

                        <div className="ir-page">
                            <div className="ir-card">

                                {/* TOOLBAR */}
                                <div className="ir-toolbar">
                                    <div className="ir-filters" style={{ flex: 1 }}>
                                        {/* Dropdown: Inward record */}
                                        <label className={`iv-dd ${inwardsLoading || inwards.length === 0 ? "disabled" : ""}`} title="Choose an inward record">
                                            <span className="iv-dd-icon"><i className="fa-solid fa-truck-ramp-box" /></span>
                                            <span className="iv-dd-label">Inward record</span>
                                            <span className="iv-dd-caret"><i className="fa-solid fa-chevron-down" /></span>
                                            <select
                                                value={selectedInwardId}
                                                disabled={inwardsLoading || inwards.length === 0}
                                                onChange={(e) => setSelectedInwardId(e.target.value)}
                                            >
                                                {inwards.length === 0 ? (
                                                    <option value="">No inward records</option>
                                                ) : (
                                                    inwards.map(i => (
                                                        <option key={i.InwardRecordId} value={i.InwardRecordId}>
                                                            {i.InwardRecordNo}
                                                        </option>
                                                    ))
                                                )}
                                            </select>
                                        </label>

                                        {/* Dropdown: Barcode generation */}
                                        <label className={`iv-dd ${unitsLoading ? "disabled" : ""}`} title="Filter by barcode generation">
                                            <span className="iv-dd-icon"><i className="fa-solid fa-barcode" /></span>
                                            <span className="iv-dd-label">Barcodes</span>
                                            <span className="iv-dd-caret"><i className="fa-solid fa-chevron-down" /></span>
                                            <select
                                                value={generationFilter}
                                                disabled={unitsLoading}
                                                onChange={(e) => setGenerationFilter(e.target.value)}
                                            >
                                                {GENERATION_TABS.map(t => (
                                                    <option key={t.key} value={t.key}>{t.label}</option>
                                                ))}
                                            </select>
                                        </label>


                                        <div className="ir-search">
                                            <i className="fa-solid fa-magnifying-glass" />
                                            <input
                                                type="text"
                                                placeholder="Search barcode"
                                                value={search}
                                                onChange={(e) => setSearch(e.target.value)}
                                            />
                                            {search && (
                                                <button type="button" className="iv-clear" onClick={() => setSearch("")} title="Clear">
                                                    <CloseOutlined />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="d-flex gap-2 iv-refresh-wrap">
                                        <button type="button" className="ir-btn-ghost" onClick={fetchUnits} disabled={unitsLoading || !selectedInwardId}>
                                            <ReloadOutlined /> Refresh
                                        </button>
                                    </div>
                                </div>

                                {/* STATUS BADGES */}
                                <div className="iv-pills" role="tablist">
                                    {[{ key: "ALL", label: "All units", cls: "all" }, ...UNIT_STATUSES.map(st => ({
                                        key: st.key,
                                        label: st.label,
                                        cls: st.key === "PENDING_INSPECTION" ? "pending" : st.key === "REWORK_REQUIRED" ? "rework" : "ready"
                                    }))].map(st => (
                                        <button
                                            key={st.key}
                                            type="button"
                                            role="tab"
                                            aria-selected={statusFilter === st.key}
                                            className={`iv-pill ${st.cls} ${statusFilter === st.key ? "active" : ""}`}
                                            disabled={unitsLoading}
                                            onClick={() => setStatusFilter(st.key)}
                                        >
                                            <span className="iv-pill-dot" />
                                            {st.label}
                                            <span className="iv-pill-count">{statusCounts[st.key] || 0}</span>
                                        </button>
                                    ))}
                                </div>

                                <div className="iv-result-line">
                                    Showing <b>{filteredUnits.length}</b> of <b>{units.length}</b> unit(s)
                                    {(statusFilter !== "ALL" || generationFilter !== "ALL" || search) && (
                                        <button
                                            type="button"
                                            className="iv-reset-link"
                                            onClick={() => { setStatusFilter("ALL"); setGenerationFilter("ALL"); setSearch(""); }}
                                        >
                                            Clear filters
                                        </button>
                                    )}
                                </div>

                                <div className="table-responsive iv-scroll">
                                    <table className="ir-table it-table iv-dense iv-units-table">
                                        <thead>
                                            <tr>
                                                <th style={{ width: 56 }}>#</th>
                                                <th>Barcode</th>
                                                <th>Inward</th>
                                                <th>Status</th>
                                                <th>Inspected On</th>
                                                <th>Rework Reason</th>
                                                <th>Rework Image</th>
                                                <th>Updated</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {unitsLoading ? (
                                                Array.from({ length: 5 }).map((_, r) => (
                                                    <tr key={r}>{Array.from({ length: 8 }).map((__, c) => (
                                                        <td key={c}><div className="ir-skel" style={{ width: "60%" }} /></td>
                                                    ))}</tr>
                                                ))
                                            ) : filteredUnits.length ? (
                                                filteredUnits.map((u, index) => {
                                                    const meta = getStatusMeta(u.UnitStatus);
                                                    const imgUrl = u.ReworkImage
                                                        ? (/^https?:\/\//i.test(u.ReworkImage) ? u.ReworkImage : `${BASE_IMAGE_API_GET}${u.ReworkImage}`)
                                                        : null;

                                                    return (
                                                        <tr key={u.UnitId}>
                                                            <td className="it-sno iv-c-sno">{index + 1}</td>
                                                            <td className="iv-c-code">
                                                                {u.Barcode ? (
                                                                    <button
                                                                        type="button"
                                                                        className="it-code iv-barcode-btn"
                                                                        title="View unit journey"
                                                                        onClick={() => setJourneyUnit({
                                                                            Barcode: u.Barcode,
                                                                            UnitStatus: u.UnitStatus,
                                                                            ItemName: item?.ItemName,
                                                                            ItemCode: item?.ItemCode
                                                                        })}
                                                                    >
                                                                        {u.Barcode} <i className="fa-solid fa-route" />
                                                                    </button>
                                                                ) : <span className="text-muted">Not generated</span>}
                                                            </td>
                                                            <td className="it-part iv-c-inward" data-label="Inward">{selectedInward?.InwardRecordNo || "-"}</td>
                                                            <td className="iv-c-status"><span className={`iim-unit-badge ${meta.cls}`}>{meta.label}</span></td>
                                                            <td className="iv-c-insp" data-label="Inspected">{u.InspectedOn ? formatDate(u.InspectedOn) : <span className="text-muted">—</span>}</td>
                                                            <td className={`it-desc iv-c-reason ${u.ReworkReason ? "" : "iv-empty"}`} data-label="Rework reason">
                                                                <ReasonText text={u.ReworkReason} max={15} emptyText="N/A" />
                                                            </td>
                                                            <td className={`iv-c-img ${imgUrl ? "" : "iv-empty"}`} data-label="Rework image">
                                                                {imgUrl ? (
                                                                    <button
                                                                        type="button"
                                                                        className="iv-thumb"
                                                                        title="View rework image"
                                                                        onClick={() => setPreview({
                                                                            url: imgUrl,
                                                                            title: u.Barcode || "Rework image",
                                                                            subtitle: [item?.ItemName, selectedInward?.InwardRecordNo].filter(Boolean).join(" · "),
                                                                            note: u.ReworkReason
                                                                        })}
                                                                    >
                                                                        <img src={imgUrl} alt="Rework" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                                                                        <i className="fa-regular fa-image" />
                                                                    </button>
                                                                ) : (
                                                                    <span className="text-muted">N/A</span>
                                                                )}
                                                            </td>
                                                            <td className="iv-c-upd" data-label="Updated">{formatDate(u.UpdatedOn || u.CreatedOn)}</td>
                                                        </tr>
                                                    );
                                                })
                                            ) : (
                                                <tr>
                                                    <td colSpan="8">
                                                        <div className="ir-empty">
                                                            <div className="ir-empty-icon"><BarcodeOutlined /></div>
                                                            <div className="ir-empty-title">
                                                                {units.length > 0
                                                                    ? "No units match these filters"
                                                                    : generationFilter === "NOT_GENERATED"
                                                                        ? "All units already have barcodes"
                                                                        : generationFilter === "GENERATED"
                                                                            ? "No barcodes generated yet"
                                                                            : "No barcodes found"}
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                        </>
                    )}
                </div>
            </div>
            <ImagePreviewModal image={preview} onClose={closePreview} />
            <UnitJourneyModal unit={journeyUnit} orgId={orgId} onClose={closeJourney} />
        </Base1>
    );
};

export default ItemView;