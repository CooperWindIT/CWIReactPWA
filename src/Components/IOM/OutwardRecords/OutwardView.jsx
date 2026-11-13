import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import Base1 from "../../Config/Base1";
import IIMToolbar from "../components/IIMToolbar";
import { getOutwardLoadedUnits, getBarcodeTraceability } from "../services/services";
import { getStatusMeta } from "./outwardStatus";
import CommentsModal from "../components/CommentsModal";
import "../InwardRecords/InwardRecordsPremium.css";
import "./OutwardRecordsList.css";
import "./OutwardView.css";

/**
 * Outward View – separate screen  /iom/outward-view/:id
 * GET iim/GetOutwardLoadedUnits?OrgId&OutwardId&ItemId   (ItemId 0 = all items)
 *
 * - Item dropdown lists the items of this outward (from the ItemId=0 call), default "All items".
 * - Choosing an item fetches that item only.
 * - Each item is an accordion with its barcodes; clicking a barcode opens the unit journey.
 */

// "04 Nov 2026"
const formatDate = (value) => {
    if (!value) return "-";
    const d = new Date(value);
    if (isNaN(d)) return value;
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

// INW1017ALUW001 -> "INW-1017"
const inwardOf = (barcode) => {
    const m = String(barcode || "").match(/^INW(\d+)/i);
    return m ? `INW-${m[1]}` : "Other";
};

const isDispatched = (u) => String(u?.UnitStatus || "").toUpperCase() === "DISPATCHED";

// row passed from the list (state) or kept in sessionStorage (page refresh)
const readRecord = (id, state) => {
    if (state?.record && String(state.record.Id) === String(id)) return state.record;
    try { return JSON.parse(sessionStorage.getItem(`iomOutward_${id}`) || "null"); } catch { return null; }
};

// group units by item, then by inward
const groupUnits = (units) => {
    const items = new Map();
    units.forEach(u => {
        const key = String(u.ItemId ?? u.ItemName);
        if (!items.has(key)) items.set(key, { ItemId: u.ItemId, ItemName: u.ItemName, ItemCode: u.ItemCode, units: [] });
        items.get(key).units.push(u);
    });
    return [...items.values()].map(it => {
        const inwards = new Map();
        it.units.forEach(u => {
            const k = inwardOf(u.Barcode);
            if (!inwards.has(k)) inwards.set(k, []);
            inwards.get(k).push(u);
        });
        return {
            ...it,
            dispatched: it.units.filter(isDispatched).length,
            inwards: [...inwards.entries()].map(([no, list]) => ({ no, units: list }))
        };
    });
};

// ==========================================
// BARCODE JOURNEY MODAL
// GET IIM/GetBarcodeTraceabilityDetails?OrgId&Barcode
// ==========================================
const UNIT_STATUS_LABEL = {
    PENDING_INSPECTION: { label: "Pending inspection", cls: "ow-amber" },
    READYTO_DISPATCH: { label: "Passed · Ready to Dispatch", cls: "ow-green" },
    REWORK_REQUIRED: { label: "Rework required", cls: "ow-red" },
    LOADED: { label: "Loaded", cls: "ow-blue" },
    DISPATCHED: { label: "Dispatched", cls: "ow-green" }
};
const labelOf = (s) => String(s || "").toLowerCase().replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
const unitStatusMeta = (s) => UNIT_STATUS_LABEL[String(s || "").toUpperCase()] || { label: labelOf(s) || "-", cls: "ow-grey" };

// rework reason may come as an object, array or text
const reworkReasonOf = (rw) => {
    if (!rw) return "";
    const r = Array.isArray(rw) ? rw[rw.length - 1] : rw;
    if (typeof r === "string") return r;
    return r?.ReworkReason || r?.Reason || r?.Remarks || "";
};

// service data -> 6 steps (state: done | pending | failed)
const buildSteps = (t) => {
    const insp = String(t?.InspectionData?.InspectionStatus || "").toUpperCase();
    const inspPassed = ["PASSED", "PASS", "READYTO_DISPATCH"].includes(insp);
    const inspFailed = ["FAILED", "FAIL", "REWORK_REQUIRED", "REWORK"].includes(insp);
    const reason = reworkReasonOf(t?.ReworkData);

    const out = t?.OutwardData;
    const disp = String(t?.DispatchData?.DispatchStatus || "").toUpperCase();
    const dispatched = disp === "DISPATCHED";

    return [
        { key: "barcode", icon: "fa-solid fa-tag", label: "Barcode", value: t.Barcode, sub: t.ItemName, mono: true, state: "done" },
        {
            key: "inward", icon: "fa-solid fa-box-open", label: "Inward",
            value: t?.InwardData?.InwardNo || "-",
            sub: t?.InwardData?.InwardDate ? `Received ${formatDate(t.InwardData.InwardDate)}` : "Received",
            state: t?.InwardData ? "done" : "pending"
        },
        {
            key: "inspection", icon: inspFailed ? "fa-solid fa-xmark" : "fa-solid fa-check", label: "Inspection",
            value: inspPassed ? "Passed" : inspFailed ? "Failed" : (labelOf(insp) || "Pending"),
            sub: inspPassed
                ? (t?.InspectionData?.PassedOn ? formatDate(t.InspectionData.PassedOn) : "Ready to dispatch")
                : inspFailed ? (reason || "Sent for rework") : "Not inspected yet",
            state: inspPassed ? "done" : inspFailed ? "failed" : "pending"
        },
        {
            key: "outward", icon: "fa-solid fa-clipboard-check", label: "Outward",
            value: out?.OutwardNo || "Not loaded",
            sub: out ? getStatusMeta(out.OutwardStatus).label : "Not on an outward yet",
            state: out ? "done" : "pending"
        },
        {
            key: "vehicle", icon: "fa-solid fa-truck", label: "Vehicle",
            value: out?.VehicleNumber || "-",
            sub: out?.RegisteredOn ? `Registered ${formatDate(out.RegisteredOn)}` : "",
            state: out?.VehicleNumber ? "done" : "pending"
        },
        {
            key: "dispatch", icon: "fa-solid fa-shield-halved", label: "Dispatch",
            value: dispatched ? "Dispatched" : "Not dispatched",
            sub: t?.DispatchData?.DispatchStage ? getStatusMeta(t.DispatchData.DispatchStage).label : "",
            state: dispatched ? "done" : "pending"
        }
    ];
};

// one colour per stage (dot gradient, label and connecting line)
const STEP_COLORS = {
    barcode: ["#8b5cf6", "#6d28d9"],    // violet
    inward: ["#3b82f6", "#1d4ed8"],     // blue
    inspection: ["#10b981", "#047857"], // green
    outward: ["#fb923c", "#c2410c"],    // orange
    vehicle: ["#14b8a6", "#0f766e"],    // teal
    dispatch: ["#ec4899", "#be185d"]    // pink
};

const UnitJourneyModal = ({ unit, orgId, onClose }) => {
    const [trace, setTrace] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const load = useCallback(async () => {
        if (!unit?.Barcode) return;
        setLoading(true);
        setError("");
        setTrace(null);
        try {
            const res = await getBarcodeTraceability({ orgId, barcode: unit.Barcode });
            if (res?.status === 200 && String(res?.result).toLowerCase() === "success" && res?.data) {
                setTrace(res.data);
            } else {
                setError(res?.response || res?.message || "No details found for this barcode");
            }
        } catch (err) {
            console.error("GetBarcodeTraceabilityDetails Error:", err);
            setError("Unable to load barcode details");
        } finally {
            setLoading(false);
        }
    }, [unit?.Barcode, orgId]);

    useEffect(() => { load(); }, [load]);

    useEffect(() => {
        if (!unit) return;
        const onKey = (e) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [unit, onClose]);

    if (!unit) return null;

    const t = trace;
    const st = unitStatusMeta(t?.UnitStatus || unit.UnitStatus);
    const steps = t ? buildSteps(t) : [];
    // "current" = first step that is not done yet (gets the pulsing ring)
    const currentIdx = steps.findIndex(x => x.state !== "done");
    // "latest" = last done step before it (gets the soft glow)
    const latestIdx = currentIdx === -1 ? steps.length - 1 : currentIdx - 1;

    return (
        <div className="ir-modal-overlay ow-theme" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="ir-modal ov-journey" role="dialog" aria-modal="true" aria-label="Unit journey">
                <div className={`ov-journey-head ${String(t?.UnitStatus || unit.UnitStatus || "").toLowerCase()}`}>
                    <span className="ov-journey-icon"><i className="fa-solid fa-route" /></span>
                    <div className="ov-journey-title">
                        <span className="ov-mono">{t?.Barcode || unit.Barcode}</span>
                        {!loading && <span className={`ow-badge ${st.cls}`}><span className="ow-dot" />{st.label}</span>}
                    </div>
                    <div className="ov-journey-item">{t?.ItemName || unit.ItemName || "-"} · {t?.ItemCode || unit.ItemCode || "-"}</div>
                    <button type="button" className="ir-modal-close ov-journey-close" onClick={onClose} title="Close">
                        <i className="fa-solid fa-xmark" />
                    </button>
                </div>

                {loading ? (
                    <div className="ov-steps">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="ov-step loading">
                                <span className="ov-step-dot" />
                                <div className="ov-step-text">
                                    <div className="ir-skel" style={{ width: 60, height: 10 }} />
                                    <div className="ir-skel" style={{ width: 80, height: 14, marginTop: 6 }} />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : error ? (
                    <div className="ov-journey-error">
                        <i className="fa-solid fa-circle-exclamation" />
                        <span>{error}</span>
                        <button type="button" className="ir-btn-ghost ir-btn-sm" onClick={load}>Try again</button>
                    </div>
                ) : (
                    <div className="ov-steps">
                        {steps.map((s, i) => (
                            <div
                                key={s.key}
                                className={`ov-step ${s.state} ${i === currentIdx ? "current" : ""} ${i === latestIdx ? "latest" : ""}`}
                                style={{
                                    "--i": i,
                                    "--c1": STEP_COLORS[s.key][0],
                                    "--c2": STEP_COLORS[s.key][1],
                                    "--p": i ? STEP_COLORS[steps[i - 1].key][1] : STEP_COLORS[s.key][1]
                                }}
                            >
                                <span className="ov-step-dot"><i className={s.icon} /></span>
                                <div className="ov-step-text">
                                    <small>{s.label}</small>
                                    <b className={s.mono ? "ov-mono" : ""}>{s.value}</b>
                                    {s.sub && <span>{s.sub}</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div className="ir-modal-foot">
                    <button type="button" className="ir-btn-ghost" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
};

// ==========================================
// PAGE
// ==========================================
const OutwardView = () => {
    const { id } = useParams();
    const location = useLocation();
    const navigate = useNavigate();

    const sessionUserData = JSON.parse(sessionStorage.getItem("userData") || "{}");
    const orgId = sessionUserData?.OrgId;
    const userId = sessionUserData?.Id;

    const [menuData, setMenuData] = useState([]);
    const [record] = useState(() => readRecord(id, location.state));

    // comments panel on the right (IIM/GetIOMcomments, Portal/AddNewComments)
    const [commentCount, setCommentCount] = useState(null);

    const [itemOptions, setItemOptions] = useState([]);   // items of this outward (from ItemId 0)
    const [itemId, setItemId] = useState(0);              // 0 = all items
    const [units, setUnits] = useState([]);
    const [allCount, setAllCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [open, setOpen] = useState({});                 // { [ItemId]: true }
    const [journeyUnit, setJourneyUnit] = useState(null);
    const closeJourney = useCallback(() => setJourneyUnit(null), []);

    useEffect(() => {
        try { setMenuData(JSON.parse(sessionStorage.getItem("menuData") || "[]")); } catch { /* ignore */ }
    }, []);

    const load = useCallback(async (selectedItemId) => {
        if (!orgId || !id) return;
        setLoading(true);
        setError("");
        try {
            const res = await getOutwardLoadedUnits({ orgId, outwardId: id, itemId: selectedItemId });
            const result = String(res?.result || "").toLowerCase();

            if (res?.status === 200 && (result === "success" || result === "not found")) {
                const list = result === "success" && Array.isArray(res?.data) ? res.data : [];
                const grouped = groupUnits(list);
                setUnits(list);
                if (Number(selectedItemId) === 0) {
                    // dropdown = items of this outward
                    setItemOptions(grouped.map(g => ({ ItemId: g.ItemId, ItemName: g.ItemName, count: g.units.length })));
                    setAllCount(list.length);
                }
                // first item open
                setOpen(grouped[0] ? { [String(grouped[0].ItemId)]: true } : {});
            } else {
                setUnits([]);
                setError(res?.response || res?.message || "Unable to load units");
            }
        } catch (err) {
            console.error("GetOutwardLoadedUnits Error:", err);
            setUnits([]);
            setError("Unable to load units");
        } finally {
            setLoading(false);
        }
    }, [orgId, id]);

    useEffect(() => { load(0); }, [load]);

    const onItemChange = (value) => {
        const v = Number(value) || 0;
        setItemId(v);
        load(v);
    };

    const groups = useMemo(() => groupUnits(units), [units]);
    const meta = getStatusMeta(record?.Status);
    const toggle = (key) => setOpen(o => ({ ...o, [key]: !o[key] }));
    const outwardNo = record?.InwardRecordNo || `#${id}`;

    return (
        <Base1>
            <IIMToolbar menuData={menuData} />

            <div id="kt_app_content" className="app-content flex-column-fluid pt-0 mb-10">
                <div id="kt_app_content_container" className="app-container container-xxl ir-page ow-theme ov-page">

                    <button type="button" className="ov-back" onClick={() => navigate("/iom/outwards-list")}>
                        <i className="fa-solid fa-chevron-left" /> Outward records
                    </button>

                    <div className="ov-layout">
                    {/* LEFT: details */}
                    <div className="ov-main">
                    <div className="ov-title-row">
                        <h2 className="ov-title">Outward {outwardNo}</h2>
                        {/* phones: jump down to the comments */}
                        <button type="button" className="cm-open-btn ov-cm-jump" onClick={() => document.getElementById("ovComments")?.scrollIntoView({ behavior: "smooth", block: "start" })}>
                            <i className="fa-regular fa-comments" /> Comments
                            {commentCount > 0 && <span className="cm-count">{commentCount}</span>}
                        </button>
                    </div>
                    {record?.Remarks && <div className="ov-subtitle">{record.Remarks}</div>}


                    {!loading && !error && allCount > 0 && (
                        <div className="ov-banner">
                            <i className="fa-solid fa-clipboard-check" />
                            <span>
                                {allCount} unit{allCount === 1 ? "" : "s"} loaded across {itemOptions.length} item{itemOptions.length === 1 ? "" : "s"}.
                                {" "}Tap an item to see its barcodes, tap a barcode to see its journey.
                            </span>
                        </div>
                    )}

                    {/* FACTS */}
                    <div className="ov-facts">
                        <div><small>Outward number</small><b className="ov-mono">{outwardNo}</b></div>
                        <div><small>Vehicle</small><b><span className="ir-plate">{record?.VehicleNumber || "-"}</span></b></div>
                        <div><small>Date</small><b>{formatDate(record?.ArrivalDate)}</b></div>
                        <div><small>Status</small><b><span className={`ow-badge ${meta.cls}`}><span className="ow-dot" />{meta.label}</span></b></div>
                    </div>

                    {/* ITEM SUMMARY */}
                    <div className="ir-card ov-card">
                        <div className="ov-card-head">
                            <div className="ov-card-title">
                                Item summary
                                <small>{units.length} unit{units.length === 1 ? "" : "s"} · tap an item for its barcodes</small>
                            </div>
                            <div className="ov-select">
                                <i className="fa-solid fa-cube" />
                                <select value={itemId} onChange={(e) => onItemChange(e.target.value)} disabled={loading}>
                                    <option value={0}>All items{allCount ? ` (${allCount})` : ""}</option>
                                    {itemOptions.map(o => (
                                        <option key={o.ItemId} value={o.ItemId}>{o.ItemName} ({o.count})</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="ov-acc-head">
                            <span />
                            <span>Item</span>
                            <span className="text-center">Loaded</span>
                            <span>Dispatched</span>
                            <span>Status</span>
                            <span />
                        </div>

                        {loading ? (
                            <div className="ov-empty"><span className="spinner-border spinner-border-sm me-2" />Loading units…</div>
                        ) : error ? (
                            <div className="ov-empty text-danger">{error}</div>
                        ) : groups.length === 0 ? (
                            <div className="ov-empty">
                                <i className="fa-solid fa-truck-ramp-box me-2" />
                                No units loaded on this outward yet
                            </div>
                        ) : (
                            groups.map(g => {
                                const key = String(g.ItemId);
                                const isOpen = !!open[key];
                                const pct = g.units.length ? Math.round((g.dispatched / g.units.length) * 100) : 0;
                                const allDone = g.dispatched === g.units.length;
                                return (
                                    <div key={key} className={`ov-acc ${isOpen ? "open" : ""}`}>
                                        <button type="button" className="ov-acc-row" onClick={() => toggle(key)} aria-expanded={isOpen}>
                                            <i className={`fa-solid fa-chevron-down ov-chev ${isOpen ? "open" : ""}`} />
                                            <span className="ov-acc-item">
                                                <b>{g.ItemName || "-"}</b>
                                                <small>{g.ItemCode || "-"}</small>
                                            </span>
                                            <span className="ov-acc-num" data-label="Loaded">{g.units.length}</span>
                                            <span className="ov-acc-progress" data-label="Dispatched">
                                                <span className="ow-progress-bar"><span className={allDone ? "done" : ""} style={{ width: `${pct}%` }} /></span>
                                                <span className="ow-progress-text">{g.dispatched} / {g.units.length}</span>
                                            </span>
                                            <span className="ov-acc-status" data-label="Status">
                                                <span className={`ow-badge ${allDone ? "ow-green" : "ow-blue"}`}>
                                                    <span className="ow-dot" />{allDone ? "Dispatched" : "Loaded"}
                                                </span>
                                            </span>
                                            <span className="ov-acc-toggle">{isOpen ? "Hide" : "Show"}</span>
                                        </button>

                                        {isOpen && (
                                            <div className="ov-acc-body">
                                                {g.inwards.map(inw => (
                                                    <div key={inw.no} className="ov-inw">
                                                        <div className="ov-inw-title">{inw.no} · {inw.units.length} unit{inw.units.length === 1 ? "" : "s"}</div>
                                                        <div className="ov-chips">
                                                            {inw.units.map(u => (
                                                                <button
                                                                    key={u.UnitId ?? u.Barcode}
                                                                    type="button"
                                                                    className={`ov-chip ${isDispatched(u) ? "dispatched" : ""}`}
                                                                    onClick={() => setJourneyUnit(u)}
                                                                    title="View unit journey"
                                                                >
                                                                    {u.Barcode}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                    </div>{/* /ov-main */}

                    {/* RIGHT: comments (below the details on phones / tablets) */}
                    <aside className="ov-side" id="ovComments">
                        <CommentsModal
                            inline
                            recordId={id}
                            title={outwardNo}
                            orgId={orgId}
                            userId={userId}
                            onCountChange={setCommentCount}
                        />
                    </aside>
                    </div>{/* /ov-layout */}
                </div>
            </div>

            <UnitJourneyModal unit={journeyUnit} orgId={orgId} onClose={closeJourney} />
        </Base1>
    );
};

// also used by Item View (click a barcode -> journey)
export { UnitJourneyModal };

export default OutwardView;