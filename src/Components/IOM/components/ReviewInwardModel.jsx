import React, { useEffect, useMemo, useRef, useState } from "react";
import Swal from "sweetalert2";
import { CheckOutlined, CloseOutlined } from "@ant-design/icons";

import { reviewInward } from "../services/services";
import "./ReviewInwardModel.css";

// Result for one row: null (not counted) | number (verified - declared)
const getDifference = (item) => {
    if (item.VerifiedQuantity === "" || item.VerifiedQuantity === null) return null;
    return Number(item.VerifiedQuantity) - item.DeclaredQuantity;
};

const getResult = (diff) => {
    if (diff === null) return { key: "pending", text: "Enter count" };
    if (diff === 0) return { key: "match", text: "Matched" };
    if (diff < 0) return { key: "short", text: `Short ${Math.abs(diff)}` };
    return { key: "excess", text: `Excess ${diff}` };
};

const ReviewInwardModel = ({
    show,
    onClose,
    onSuccess,
    record,
    items = [],
    orgId,
    userId
}) => {
    const [reviewItems, setReviewItems] = useState([]);
    const [remarks, setRemarks] = useState("");
    const [saving, setSaving] = useState(false);

    const inputRefs = useRef([]);

    // ==========================================
    // INIT WHEN OPENED
    // ==========================================

    useEffect(() => {
        if (!show) return;

        setRemarks("");

        setReviewItems(
            items.map(item => ({
                RecordItemId: item.RecordItemId,
                ItemCode: item.ItemCode || "",
                ItemName: item.ItemName || "",
                PartNo: item.PartNo || "",
                DeclaredQuantity: Number(item.DeclaredQuantity) || 0,
                VerifiedQuantity:
                    item.VerifiedQuantity !== null && item.VerifiedQuantity !== undefined
                        ? String(item.VerifiedQuantity)
                        : ""
            }))
        );
    }, [show, items]);

    // Close on Esc
    useEffect(() => {
        if (!show) return;
        const onKey = (e) => e.key === "Escape" && !saving && onClose?.();
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [show, saving, onClose]);

    // ==========================================
    // HANDLERS
    // ==========================================

    const updateQuantity = (index, value) => {
        // allow only whole numbers
        if (value !== "" && !/^\d+$/.test(value)) return;

        setReviewItems(prev =>
            prev.map((item, i) => (i === index ? { ...item, VerifiedQuantity: value } : item))
        );
    };

    // Enter -> jump to next item's count box
    const handleKeyDown = (e, index) => {
        if (e.key === "Enter") {
            e.preventDefault();
            inputRefs.current[index + 1]?.focus();
        }
    };

    // Copy declared quantity into every empty count box
    const fillEmptyWithDeclared = () => {
        setReviewItems(prev =>
            prev.map(item =>
                item.VerifiedQuantity === ""
                    ? { ...item, VerifiedQuantity: String(item.DeclaredQuantity) }
                    : item
            )
        );
    };

    // ==========================================
    // DERIVED
    // ==========================================

    const summary = useMemo(() => {
        let counted = 0;
        let declared = 0;
        let verified = 0;
        let mismatches = 0;

        reviewItems.forEach(item => {
            declared += item.DeclaredQuantity;
            const diff = getDifference(item);
            if (diff !== null) {
                counted += 1;
                verified += Number(item.VerifiedQuantity);
                if (diff !== 0) mismatches += 1;
            }
        });

        return { counted, declared, verified, mismatches };
    }, [reviewItems]);

    const hasDifference = summary.mismatches > 0;

    const allQuantitiesEntered =
        reviewItems.length > 0 &&
        reviewItems.every(item =>
            item.VerifiedQuantity !== "" &&
            Number.isInteger(Number(item.VerifiedQuantity)) &&
            Number(item.VerifiedQuantity) >= 0
        );

    const remarksMissing = hasDifference && !remarks.trim();

    // ==========================================
    // SAVE
    // ==========================================

    const handleSaveReview = async () => {
        if (!orgId) {
            Swal.fire("Error", "Organization ID not found", "error");
            return;
        }

        if (!record?.Id) {
            Swal.fire("Error", "Inward record ID not found", "error");
            return;
        }

        if (!allQuantitiesEntered) {
            Swal.fire("Warning", "Please enter a valid actual quantity for every item.", "warning");
            return;
        }

        if (remarksMissing) {
            Swal.fire("Warning", "Please enter remarks because item quantities differ.", "warning");
            return;
        }

        const payload = {
            OrgId: Number(orgId),
            Action: "REVIEWED",
            InwardRecordJson: {
                Id: Number(record.Id),
                Remarks: remarks.trim(),
                UserId: Number(userId),
                NotifyId: 0
            },
            ItemsJson: reviewItems.map(item => ({
                RecordItemId: Number(item.RecordItemId),
                VerifiedQuantity: Number(item.VerifiedQuantity)
            })),
            UnitsJson: null
        };

        setSaving(true);

        try {
            const response = await reviewInward(payload);

            const success =
                (response?.status === 200 && response?.result === "success") ||
                response?.success === true;

            if (success) {
                await Swal.fire({
                    icon: "success",
                    title: "Review Saved",
                    text: response?.response || response?.message || "Inward record reviewed successfully.",
                    confirmButtonText: "OK"
                });

                onClose?.();
                await onSuccess?.();
            } else {
                Swal.fire(
                    "Error",
                    response?.response || response?.message || "Unable to save inward review.",
                    "error"
                );
            }
        } catch (error) {
            console.error("Review Inward Error:", error);
            Swal.fire("Error", error?.message || "Failed to save inward review.", "error");
        } finally {
            setSaving(false);
        }
    };

    if (!show) return null;

    const progressPct = reviewItems.length
        ? Math.round((summary.counted / reviewItems.length) * 100)
        : 0;

    // ==========================================
    // UI
    // ==========================================

    return (
        <div
            className="rv-overlay"
            role="dialog"
            aria-modal="true"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget && !saving) onClose?.();
            }}
        >
            <div className="rv-dialog">

                {/* HEADER */}
                <div className="rv-head">
                    <div className="rv-head-left">
                        <span className="rv-head-icon">
                            <i className="fa-solid fa-clipboard-check" />
                        </span>
                        <div style={{ minWidth: 0 }}>
                            <h3 className="rv-title">Review {record?.InwardRecordNo || ""}</h3>
                            <div className="rv-subtitle">
                                Count the goods physically and enter the actual quantity for each item.
                            </div>
                        </div>
                    </div>

                    <button
                        type="button"
                        className="rv-close"
                        disabled={saving}
                        onClick={onClose}
                        title="Close (Esc)"
                    >
                        <CloseOutlined />
                    </button>
                </div>

                {/* BODY (scrolls) */}
                <div className="rv-body">

                    {/* Summary chips */}
                    <div className="rv-chips">
                        <span className="rv-chip">
                            <i className="fa-solid fa-boxes-stacked" /> Items <b>{reviewItems.length}</b>
                        </span>
                        <span className="rv-chip">
                            Declared <b>{summary.declared}</b>
                        </span>
                        <span className="rv-chip">
                            Counted <b>{summary.verified}</b>
                        </span>
                        {hasDifference && (
                            <span className="rv-chip" style={{ color: "#c4320a", borderColor: "#fecdca", background: "#fef3f2" }}>
                                <i className="fa-solid fa-triangle-exclamation" /> {summary.mismatches} mismatch
                            </span>
                        )}

                        <button
                            type="button"
                            className="rv-link-btn"
                            disabled={saving || summary.counted === reviewItems.length}
                            onClick={fillEmptyWithDeclared}
                            title="Copy the declared quantity into every empty count box"
                        >
                            <i className="fa-solid fa-wand-magic-sparkles me-1" />
                            Fill empty with declared
                        </button>
                    </div>

                    <div className="rv-hint">
                        <i className="fa-solid fa-circle-info" />
                        Verify the physical quantity of each item before saving. Press Enter to move to the next item.
                    </div>

                    {/* Items */}
                    <div className="rv-table-wrap">
                        <table className="rv-table">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Item</th>
                                    <th className="text-end">Declared</th>
                                    <th className="text-center">Actual count</th>
                                    <th className="text-end">Diff</th>
                                    <th className="text-end">Result</th>
                                </tr>
                            </thead>

                            <tbody>
                                {reviewItems.map((item, index) => {
                                    const diff = getDifference(item);
                                    const result = getResult(diff);

                                    return (
                                        <tr key={item.RecordItemId} className={`rv-row ${result.key}`}>
                                            <td className="rv-idx">{index + 1}</td>

                                            <td>
                                                <div className="rv-item-name">{item.ItemName || "-"}</div>
                                                <div className="rv-item-sub">
                                                    {item.ItemCode}
                                                    {item.PartNo ? ` · Part No: ${item.PartNo}` : ""}
                                                </div>
                                            </td>

                                            <td className="text-end rv-num">{item.DeclaredQuantity}</td>

                                            <td className="text-center">
                                                <input
                                                    ref={el => (inputRefs.current[index] = el)}
                                                    type="text"
                                                    inputMode="numeric"
                                                    className="rv-input"
                                                    value={item.VerifiedQuantity}
                                                    disabled={saving}
                                                    placeholder="Qty"
                                                    onChange={e => updateQuantity(index, e.target.value.trim())}
                                                    onKeyDown={e => handleKeyDown(e, index)}
                                                />
                                            </td>

                                            <td className={`text-end rv-num rv-diff ${result.key}`}>
                                                {diff === null ? <span className="text-muted">—</span> : diff > 0 ? `+${diff}` : diff}
                                            </td>

                                            <td className="text-end">
                                                <span className={`rv-pill ${result.key}`}>{result.text}</span>
                                            </td>
                                        </tr>
                                    );
                                })}

                                {reviewItems.length === 0 && (
                                    <tr>
                                        <td colSpan="6" className="text-center py-8 text-muted">
                                            No items available for review.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Remarks */}
                    <label className="rv-label" htmlFor="rv-remarks">
                        Remark
                        {hasDifference && <span className="rv-required">* required when counts differ</span>}
                    </label>

                    <textarea
                        id="rv-remarks"
                        className={`rv-textarea ${remarksMissing ? "invalid" : ""}`}
                        rows="2"
                        placeholder="e.g. 2 cartons damaged; supplier informed"
                        value={remarks}
                        disabled={saving}
                        onChange={e => setRemarks(e.target.value)}
                    />
                </div>

                {/* FOOTER */}
                <div className="rv-foot">
                    <div className="rv-progress">
                        <div className="rv-progress-bar">
                            <span style={{ width: `${progressPct}%` }} />
                        </div>
                        {summary.counted} of {reviewItems.length} counted
                    </div>

                    <div className="rv-foot-actions">
                        <button
                            type="button"
                            className="rv-btn rv-btn-ghost"
                            disabled={saving}
                            onClick={onClose}
                        >
                            Cancel
                        </button>

                        <button
                            type="button"
                            className="rv-btn rv-btn-primary"
                            disabled={saving || !allQuantitiesEntered || remarksMissing}
                            onClick={handleSaveReview}
                        >
                            {saving ? (
                                <>
                                    <span className="spinner-border spinner-border-sm" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <CheckOutlined />
                                    Save Review
                                </>
                            )}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default ReviewInwardModel;