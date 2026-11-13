import React, { useCallback, useEffect, useRef, useState } from "react";
import { getBarcodeTraceability } from "../services/services";
import { BASE_IMAGE_API_GET } from "../../Config/Config";
import "./BarcodeTraceModal.css";

/**
 * Trace a barcode – type, scanner gun, or camera (html5-qrcode), then see the unit's journey.
 * GET IIM/GetBarcodeTraceabilityDetails?OrgId&Barcode
 *
 * <BarcodeTraceModal show orgId onClose
 *     onOpenInward={(inwardId) => ...}          // optional "Open INW-xxxx" button
 *     onOpenOutward={(outwardData) => ...} />   // optional "Open OUT-xxxx" button
 */

const RECENT_KEY = "iomRecentTraces";

// ==========================================
// CAMERA SCAN (html5-qrcode – npm install html5-qrcode)
// Loaded only when the camera button is used.
// Live camera needs HTTPS or localhost; otherwise "take a photo" is offered.
// ==========================================
const loadScanner = () => import("html5-qrcode");
const scanFormats = (F) => [F.CODE_128, F.CODE_39, F.EAN_13, F.QR_CODE];

const CameraScan = ({ onCode, onCancel }) => {
    const readerId = useRef(`btCam${Math.random().toString(36).slice(2, 9)}`).current;
    const fileId = `${readerId}File`;
    const photoRef = useRef(null);
    const doneRef = useRef(false);
    const codeRef = useRef(onCode);
    codeRef.current = onCode;
    const [msg, setMsg] = useState("Starting camera…");
    const [fallback, setFallback] = useState(
        !window.isSecureContext || !navigator.mediaDevices?.getUserMedia
            ? "Live camera works only on HTTPS. Take a photo of the barcode instead."
            : null
    );

    // camera reads the same label many times – take the first one
    const found = (text) => {
        if (doneRef.current) return;
        const v = String(text || "").trim();
        if (!v) return;
        doneRef.current = true;
        if (navigator.vibrate) navigator.vibrate(60);
        codeRef.current?.(v);
    };

    useEffect(() => {
        if (fallback) return;
        let scanner = null;
        let cancelled = false;
        (async () => {
            try {
                const { Html5Qrcode, Html5QrcodeSupportedFormats: F } = await loadScanner();
                if (cancelled) return;
                scanner = new Html5Qrcode(readerId, {
                    formatsToSupport: scanFormats(F),
                    experimentalFeatures: { useBarCodeDetectorIfSupported: true },
                    verbose: false
                });
                await scanner.start(
                    { facingMode: "environment" },
                    {
                        fps: 12,
                        // wide, short box – suits 1D barcode labels
                        qrbox: (w, h) => ({ width: Math.floor(Math.min(w * 0.9, 420)), height: Math.floor(Math.min(h * 0.5, 160)) })
                    },
                    found,
                    () => { /* keep scanning */ }
                );
                if (cancelled) { await scanner.stop().catch(() => {}); try { scanner.clear(); } catch { /* ignore */ } return; }
                setMsg("Hold the barcode inside the box, about 15–20 cm from the camera.");
            } catch (err) {
                console.error("Camera error:", err);
                if (!cancelled) setFallback("Could not open the camera (permission denied or no camera found). Take a photo of the barcode instead.");
            }
        })();
        return () => {
            cancelled = true;
            const sc = scanner;
            if (sc) {
                Promise.resolve()
                    .then(() => (sc.isScanning ? sc.stop() : null))
                    .catch(() => {})
                    .finally(() => { try { sc.clear(); } catch { /* ignore */ } });
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fallback, readerId]);

    const onPhoto = async (e) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file) return;
        setFallback("Reading barcode…");
        try {
            const { Html5Qrcode, Html5QrcodeSupportedFormats: F } = await loadScanner();
            const reader = new Html5Qrcode(fileId, { formatsToSupport: scanFormats(F), verbose: false });
            const text = await reader.scanFile(file, false);
            try { reader.clear(); } catch { /* ignore */ }
            found(text);
        } catch (err) {
            console.error("Photo decode error:", err);
            setFallback("No barcode found. Fill the photo with the barcode, keep it straight and well lit, then try again.");
        }
    };

    return (
        <div className="bt-cam">
            {!fallback ? (
                <>
                    <div id={readerId} className="bt-cam-view" />
                    <div className="bt-cam-hint"><i className="fa-solid fa-camera" /> {msg}</div>
                </>
            ) : (
                <div className="bt-cam-fallback">
                    <i className="fa-solid fa-mobile-screen" />
                    <span>{fallback}</span>
                    <button type="button" className="bt-go" onClick={() => photoRef.current?.click()}>
                        <i className="fa-solid fa-camera" /> Take photo of barcode
                    </button>
                    <input ref={photoRef} type="file" accept="image/*" capture="environment" hidden onChange={onPhoto} />
                </div>
            )}
            <div id={fileId} style={{ display: "none" }} />
            <button type="button" className="bt-cam-cancel" onClick={onCancel}>
                <i className="fa-solid fa-xmark" /> Cancel camera
            </button>
        </div>
    );
};

const formatDate = (value) => {
    if (!value) return "";
    const d = new Date(value);
    if (isNaN(d)) return value;
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};
const labelOf = (s) => String(s || "").toLowerCase().replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

const UNIT_STATUS = {
    PENDING_INSPECTION: { label: "Pending inspection", cls: "amber" },
    READYTO_DISPATCH: { label: "Passed · Ready to Dispatch", cls: "green" },
    REWORK_REQUIRED: { label: "Rework required", cls: "red" },
    LOADED: { label: "Loaded", cls: "blue" },
    DISPATCHED: { label: "Dispatched", cls: "green" }
};
const unitStatus = (s) => UNIT_STATUS[String(s || "").toUpperCase()] || { label: labelOf(s) || "-", cls: "grey" };

const reworkReasonOf = (rw) => {
    if (!rw) return "";
    const r = Array.isArray(rw) ? rw[rw.length - 1] : rw;
    if (typeof r === "string") return r;
    return r?.ReworkReason || r?.Reason || r?.Remarks || "";
};

// one colour per stage
const STEP_COLORS = {
    barcode: ["#8b5cf6", "#6d28d9"],
    inward: ["#3b82f6", "#1d4ed8"],
    inspection: ["#10b981", "#047857"],
    outward: ["#fb923c", "#c2410c"],
    vehicle: ["#14b8a6", "#0f766e"],
    dispatch: ["#ec4899", "#be185d"]
};

const buildSteps = (t) => {
    const insp = String(t?.InspectionData?.InspectionStatus || "").toUpperCase();
    const passed = ["PASSED", "PASS", "READYTO_DISPATCH"].includes(insp);
    // rework: unit status REWORK_REQUIRED (inspection may still say PENDING) or a failed inspection
    const failed = ["FAILED", "FAIL", "REWORK_REQUIRED", "REWORK"].includes(insp)
        || String(t?.UnitStatus || "").toUpperCase() === "REWORK_REQUIRED";
    const out = t?.OutwardData;
    const dispatched = String(t?.DispatchData?.DispatchStatus || "").toUpperCase() === "DISPATCHED";

    return [
        { key: "barcode", icon: "fa-solid fa-tag", label: "Barcode", value: t.Barcode, sub: t.ItemName, mono: true, state: "done" },
        {
            key: "inward", icon: "fa-solid fa-box-open", label: "Inward",
            value: t?.InwardData?.InwardNo || "-",
            sub: t?.InwardData?.InwardDate ? `Received ${formatDate(t.InwardData.InwardDate)}` : "Received",
            state: t?.InwardData ? "done" : "pending"
        },
        {
            key: "inspection", icon: failed ? "fa-solid fa-xmark" : "fa-solid fa-check", label: "Inspection",
            value: failed ? "Failed · Rework" : passed ? "Passed" : (labelOf(insp) || "Pending"),
            sub: passed ? (formatDate(t?.InspectionData?.PassedOn) || "Ready to dispatch")
                : failed ? (reworkReasonOf(t?.ReworkData) || "Sent for rework") : "Not inspected yet",
            state: failed ? "failed" : passed ? "done" : "pending"
        },
        {
            key: "outward", icon: "fa-solid fa-clipboard-check", label: "Outward",
            value: out?.OutwardNo || "Not loaded",
            sub: out ? labelOf(out.OutwardStatus) : "Not on an outward yet",
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
            sub: t?.DispatchData?.DispatchStage ? labelOf(t.DispatchData.DispatchStage) : "",
            state: dispatched ? "done" : "pending"
        }
    ];
};

const readRecent = () => {
    try { return JSON.parse(sessionStorage.getItem(RECENT_KEY) || "[]"); } catch { return []; }
};

const BarcodeTraceModal = ({ show, orgId, onClose, onOpenInward, onOpenOutward }) => {
    const inputRef = useRef(null);
    const [code, setCode] = useState("");
    const [trace, setTrace] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [recent, setRecent] = useState(readRecent);
    const [camera, setCamera] = useState(false);

    useEffect(() => {
        if (!show) return;
        setCode(""); setTrace(null); setError(""); setRecent(readRecent()); setCamera(false);
        setTimeout(() => inputRef.current?.focus(), 60);
    }, [show]);

    useEffect(() => {
        if (!show) return;
        const onKey = (e) => {
            if (e.key !== "Escape") return;
            if (camera) setCamera(false);      // Esc closes the camera first
            else onClose?.();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [show, onClose, camera]);

    const runTrace = useCallback(async (value) => {
        const barcode = String(value ?? code).trim().toUpperCase();
        if (!barcode) { inputRef.current?.focus(); return; }
        setCode(barcode);
        setCamera(false);
        setLoading(true);
        setError("");
        setTrace(null);
        try {
            const res = await getBarcodeTraceability({ orgId, barcode });
            if (res?.status === 200 && String(res?.result).toLowerCase() === "success" && res?.data) {
                setTrace(res.data);
                const next = [barcode, ...readRecent().filter(b => b !== barcode)].slice(0, 5);
                try { sessionStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch { /* ignore */ }
                setRecent(next);
            } else {
                setError(res?.response || res?.message || `No details found for ${barcode}`);
            }
        } catch (err) {
            console.error("GetBarcodeTraceabilityDetails Error:", err);
            setError("Unable to trace this barcode. Please try again.");
        } finally {
            setLoading(false);
            setTimeout(() => inputRef.current?.select(), 30);
        }
    }, [code, orgId]);

    if (!show) return null;

    const t = trace;
    const st = unitStatus(t?.UnitStatus);
    const steps = t ? buildSteps(t) : [];
    const currentIdx = steps.findIndex(x => x.state !== "done");
    const latestIdx = currentIdx === -1 ? steps.length - 1 : currentIdx - 1;

    return (
        <div className="bt-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
            <div className="bt-modal" role="dialog" aria-modal="true" aria-label="Trace barcode">
                {/* HEAD */}
                <div className="bt-head">
                    <span className="bt-head-icon"><i className="fa-solid fa-route" /></span>
                    <div className="bt-head-text">
                        <h4>Trace barcode</h4>
                        <p>Scan or type a barcode to see where the unit is.</p>
                    </div>
                    <button type="button" className="bt-close" onClick={onClose} title="Close (Esc)">
                        <i className="fa-solid fa-xmark" />
                    </button>
                </div>

                {/* SEARCH */}
                <form className="bt-search" onSubmit={(e) => { e.preventDefault(); runTrace(); }}>
                    <div className="bt-input">
                        <i className="fa-solid fa-barcode" />
                        <input
                            ref={inputRef}
                            value={code}
                            onChange={(e) => setCode(e.target.value.toUpperCase())}
                            placeholder="e.g. INW1022BUSH021"
                            spellCheck={false}
                            autoComplete="off"
                        />
                        {code && (
                            <button type="button" className="bt-clear" onClick={() => { setCode(""); inputRef.current?.focus(); }} title="Clear">
                                <i className="fa-solid fa-xmark" />
                            </button>
                        )}
                    </div>
                    <button
                        type="button"
                        className={`bt-cam-btn ${camera ? "on" : ""}`}
                        onClick={() => setCamera(c => !c)}
                        disabled={loading}
                        title={camera ? "Close camera" : "Scan with camera"}
                        aria-label="Scan with camera"
                    >
                        <i className={`fa-solid ${camera ? "fa-video-slash" : "fa-camera"}`} />
                    </button>
                    <button type="submit" className="bt-go" disabled={loading || !code.trim()}>
                        {loading ? <span className="spinner-border spinner-border-sm" /> : <i className="fa-solid fa-magnifying-glass" />}
                        Trace
                    </button>
                </form>

                {!camera && !t && !loading && !error && recent.length > 0 && (
                    <div className="bt-recent">
                        <small>Recent</small>
                        {recent.map(b => (
                            <button key={b} type="button" onClick={() => runTrace(b)}>{b}</button>
                        ))}
                    </div>
                )}

                {/* BODY */}
                <div className="bt-body">
                    {camera ? (
                        <CameraScan
                            onCode={(text) => runTrace(text)}
                            onCancel={() => { setCamera(false); setTimeout(() => inputRef.current?.focus(), 30); }}
                        />
                    ) : loading ? (
                        <div className="bt-steps">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <div key={i} className="bt-step loading"><span className="bt-dot" /><div className="bt-text"><i /><i /></div></div>
                            ))}
                        </div>
                    ) : error ? (
                        <div className="bt-error"><i className="fa-solid fa-circle-exclamation" /><span>{error}</span></div>
                    ) : t ? (
                        <>
                            <div className="bt-unit">
                                <span className="bt-mono">{t.Barcode}</span>
                                <span className={`bt-badge ${st.cls}`}><span className="bt-badge-dot" />{st.label}</span>
                                <span className="bt-unit-item">{t.ItemName || "-"} · {t.ItemCode || "-"}</span>
                            </div>

                            <div className="bt-steps">
                                {steps.map((s, i) => (
                                    <div
                                        key={s.key}
                                        className={`bt-step ${s.state} ${i === currentIdx ? "current" : ""} ${i === latestIdx ? "latest" : ""}`}
                                        style={{
                                            "--i": i,
                                            "--c1": STEP_COLORS[s.key][0],
                                            "--c2": STEP_COLORS[s.key][1],
                                            "--p": i ? STEP_COLORS[steps[i - 1].key][1] : STEP_COLORS[s.key][1]
                                        }}
                                    >
                                        <span className="bt-dot"><i className={s.icon} /></span>
                                        <div className="bt-text">
                                            <small>{s.label}</small>
                                            <b className={s.mono ? "bt-mono" : ""}>{s.value}</b>
                                            {s.sub && <span>{s.sub}</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* REWORK details (reason + photo) */}
                            {(() => {
                                const rw = Array.isArray(t?.ReworkData) ? t.ReworkData[t.ReworkData.length - 1] : t?.ReworkData;
                                const reason = reworkReasonOf(t?.ReworkData);
                                const img = rw?.ReworkImage ? (/^https?:\/\//i.test(rw.ReworkImage) ? rw.ReworkImage : `${BASE_IMAGE_API_GET}${rw.ReworkImage}`) : null;
                                if (!reason && !img) return null;
                                const now = String(t?.UnitStatus || "").toUpperCase() === "REWORK_REQUIRED";
                                return (
                                    <div className={`bt-rework ${now ? "" : "past"}`}>
                                        <span className="bt-rework-icon"><i className="fa-solid fa-screwdriver-wrench" /></span>
                                        <div className="bt-rework-text">
                                            <small>{now ? "Rework required" : "Earlier rework"}</small>
                                            <b>{reason || "No reason recorded"}</b>
                                        </div>
                                        {img && (
                                            <a className="bt-rework-img" href={img} target="_blank" rel="noreferrer" title="Open defect photo">
                                                <img src={img} alt="Defect" onError={(e) => { e.currentTarget.parentElement.style.display = "none"; }} />
                                            </a>
                                        )}
                                    </div>
                                );
                            })()}

                            {(onOpenInward && t?.InwardData?.InwardId) || (onOpenOutward && t?.OutwardData?.OutwardId) ? (
                                <div className="bt-links">
                                    {onOpenInward && t?.InwardData?.InwardId && (
                                        <button type="button" onClick={() => onOpenInward(t.InwardData.InwardId)}>
                                            Open {t.InwardData.InwardNo} <i className="fa-solid fa-arrow-right" />
                                        </button>
                                    )}
                                    {onOpenOutward && t?.OutwardData?.OutwardId && (
                                        <button type="button" onClick={() => onOpenOutward(t.OutwardData)}>
                                            Open {t.OutwardData.OutwardNo} <i className="fa-solid fa-arrow-right" />
                                        </button>
                                    )}
                                </div>
                            ) : null}
                        </>
                    ) : (
                        <div className="bt-empty">
                            <i className="fa-solid fa-qrcode" />
                            <span>Scan a label with the scanner, type the barcode and press Enter, or tap <i className="fa-solid fa-camera" /> to use the camera.</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BarcodeTraceModal;