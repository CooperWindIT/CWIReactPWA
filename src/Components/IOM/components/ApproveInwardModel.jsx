import React, { useEffect, useMemo, useRef, useState } from "react";
import Swal from "sweetalert2";
import JsBarcode from "jsbarcode";
import { CloseOutlined, CheckOutlined } from "@ant-design/icons";

import { approveInward } from "../services/services";
import "./ApproveInwardModel.css";

const CARDS_PER_STEP = 24;

// "INW-1007" -> "1007"
const getInwardNumber = (inwardRecordNo = "") => {
    const digits = String(inwardRecordNo).match(/\d+/g);
    return digits ? digits.join("") : String(inwardRecordNo).replace(/[^A-Za-z0-9]/g, "");
};

// First 4 letters of the item name, upper-case ("Bushing" -> "BUSH", "Ø20 ALU Weld Nut M6" -> "ALUW")
export const getItemPrefix = (itemName = "") => {
    const letters = String(itemName).toUpperCase().replace(/[^A-Z]/g, "");
    return (letters || "ITEM").slice(0, 4).padEnd(4, "X");
};

// INW{inwardNumber}{4 letters of item}{serial 3 digits}  ->  INW1005BUSH001
export const buildBarcode = (serial, inwardNumber, itemName) =>
    `INW${inwardNumber}${getItemPrefix(itemName)}${String(serial).padStart(3, "0")}`;

/**
 * Generate barcodes for every verified unit.
 * Each item continues from its own LastSequenceNo (from GetInwardRecordDetails):
 *   gatewall LastSequenceNo 0  -> INW1039GATE001..050
 *   SWING    LastSequenceNo 12 -> INW1039SWIN013..102
 * Safety: if two items of the same inward share the same 4-letter prefix,
 * the later one starts after the highest serial already used for that prefix
 * (so barcodes never repeat).
 */
export const generateBarcodes = (record, items) => {
    const inwardNumber = getInwardNumber(record?.InwardRecordNo);
    const lastByPrefix = {};   // { "GATE": 50, "SWIN": 102 }

    return items.map(item => {
        const qty = Math.max(0, parseInt(item.VerifiedQuantity, 10) || 0);
        const prefix = getItemPrefix(item.ItemName);
        const lastSeq = Math.max(0, parseInt(item.LastSequenceNo, 10) || 0);
        let serial = Math.max(lastSeq, lastByPrefix[prefix] || 0);   // first unit = LastSequenceNo + 1

        const units = Array.from({ length: qty }, () => {
            serial += 1;
            lastByPrefix[prefix] = serial;
            return {
                SerialNo: serial,
                Barcode: buildBarcode(serial, inwardNumber, item.ItemName),
                RecordItemId: item.RecordItemId,
                ItemId: item.ItemId,
                ItemCode: item.ItemCode,
                ItemName: item.ItemName,
                PartNo: item.PartNo
            };
        });

        return { item, units };
    });
};

// ==========================================
// Barcode SVG (Code 128)
// ==========================================

const drawBarcode = (svgEl, value, height = 44) => {
    try {
        JsBarcode(svgEl, value, {
            format: "CODE128",
            displayValue: false,
            height,
            width: 1.6,
            margin: 0,
            background: "transparent",
            lineColor: "#101828"
        });
    } catch (err) {
        console.error("Barcode render failed:", value, err);
    }
};

const BarcodeSvg = ({ value }) => {
    const ref = useRef(null);

    useEffect(() => {
        if (ref.current) drawBarcode(ref.current, value);
    }, [value]);

    return <svg ref={ref} className="ap-barcode" preserveAspectRatio="none" />;
};

// ==========================================
// MODAL
// ==========================================

/**
 * mode = "approve" -> preview + "Update Inventory" button
 * mode = "view"    -> inventory already updated, just show barcodes
 */
const ApproveInwardModel = ({
    show,
    mode = "approve",
    onClose,
    onSuccess,
    record,
    items = [],
    orgId,
    userId
}) => {
    const [saving, setSaving] = useState(false);
    const [approved, setApproved] = useState(false);
    const [search, setSearch] = useState("");
    const [view, setView] = useState("cards"); // cards | table
    const [openGroups, setOpenGroups] = useState({});
    const [visible, setVisible] = useState({});

    const groups = useMemo(() => generateBarcodes(record, items), [record, items]);
    const allUnits = useMemo(() => groups.flatMap(g => g.units), [groups]);

    const inwardNumber = getInwardNumber(record?.InwardRecordNo);
    const itemsWithoutQty = groups.filter(g => g.units.length === 0).length;
    const isDone = mode === "view" || approved;

    // Reset when opened: first group expanded
    useEffect(() => {
        if (!show) return;
        setApproved(false);
        setSearch("");
        setView("cards");
        setVisible({});
        setOpenGroups(groups[0] ? { [groups[0].item.RecordItemId]: true } : {});
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [show]);

    // Esc to close
    useEffect(() => {
        if (!show) return;
        const onKey = (e) => e.key === "Escape" && !saving && handleClose();
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [show, saving, approved]);

    const term = search.trim().toLowerCase();

    const filteredGroups = useMemo(() => {
        if (!term) return groups;
        return groups
            .map(g => ({
                ...g,
                units: g.units.filter(u =>
                    u.Barcode.toLowerCase().includes(term) ||
                    String(u.SerialNo) === term ||
                    (u.ItemName || "").toLowerCase().includes(term) ||
                    (u.ItemCode || "").toLowerCase().includes(term)
                )
            }))
            .filter(g => g.units.length > 0);
    }, [groups, term]);

    const toggleGroup = (id) => setOpenGroups(prev => ({ ...prev, [id]: !prev[id] }));

    const handleClose = async () => {
        onClose?.();
        if (approved) await onSuccess?.();
    };

    // ==========================================
    // APPROVE
    // ==========================================

    const handleApprove = async () => {
        if (!orgId || !record?.Id) {
            Swal.fire("Error", "Inward record details are missing.", "error");
            return;
        }

        if (allUnits.length === 0) {
            Swal.fire("Warning", "No verified quantity found. Nothing to generate.", "warning");
            return;
        }

        const confirm = await Swal.fire({
            icon: "question",
            title: `Update inventory for ${record.InwardRecordNo}?`,
            html: `This will update the inventory with the verified quantities and create <b>${allUnits.length}</b> barcodes.`,
            showCancelButton: true,
            confirmButtonText: "Yes, update inventory",
            cancelButtonText: "Cancel",
            confirmButtonColor: "#12805c"
        });

        if (!confirm.isConfirmed) return;

        // POST IIM/ApproveToInventory
        // Last serial number used, e.g. 14 for "INW1005SPRI014"
        const lastUnit = allUnits[allUnits.length - 1];

        const payload = {
            OrgId: Number(orgId),
            InwardRecordId: Number(record.Id),
            Action: "UPDATE_INVENTORY",
            UserId: Number(userId),
            LastSequenceNo: lastUnit?.SerialNo ?? 0,   // e.g. 14 (from INW1005SPRI014)
            // SequenceNo = serial of the barcode inside its item (last 3 digits)
            UnitsJson: allUnits.map(u => ({
                RecordItemId: Number(u.RecordItemId),
                ItemId: Number(u.ItemId),
                Barcode: u.Barcode,
                SequenceNo: Number(u.SerialNo) || Number(String(u.Barcode || "").slice(-3)) || 0
            }))
        };

        setSaving(true);

        try {
            const response = await approveInward(payload);

            const success =
                (response?.status === 200 && response?.result === "success") ||
                response?.success === true;

            if (success) {
                setApproved(true);
                Swal.fire({
                    icon: "success",
                    title: "Inventory updated",
                    text: `${allUnits.length} barcodes generated.`,
                    timer: 2200,
                    showConfirmButton: false
                });
            } else {
                Swal.fire("Error", response?.response || response?.message || "Unable to update inventory.", "error");
            }
        } catch (error) {
            console.error("Approve Inward Error:", error);
            Swal.fire("Error", error?.message || "Failed to update inventory.", "error");
        } finally {
            setSaving(false);
        }
    };

    const copyCode = (code) => {
        navigator.clipboard?.writeText(code);
        Swal.fire({ toast: true, position: "top-end", icon: "success", title: `${code} copied`, timer: 1200, showConfirmButton: false });
    };

    if (!show) return null;

    const first = allUnits[0]?.Barcode;
    const last = allUnits[allUnits.length - 1]?.Barcode;

    // ==========================================
    // UI
    // ==========================================

    return (
        <div
            className="ap-overlay"
            role="dialog"
            aria-modal="true"
            onMouseDown={(e) => e.target === e.currentTarget && !saving && handleClose()}
        >
            <div className="ap-dialog">

                {/* HEADER */}
                <div className="ap-head">
                    <div className="ap-head-left">
                        <span className={`ap-head-icon ${isDone ? "done" : ""}`}>
                            <i className={isDone ? "fa-solid fa-barcode" : "fa-solid fa-circle-check"} />
                        </span>
                        <div style={{ minWidth: 0 }}>
                            <h3 className="ap-title">
                                {isDone ? "Barcodes" : "Update inventory"} · {record?.InwardRecordNo}
                            </h3>
                            <div className="ap-subtitle">
                                {isDone
                                    ? "Barcodes generated for every verified unit."
                                    : "One barcode is created for every verified unit. Review them, then update the inventory."}
                            </div>
                        </div>
                    </div>

                    <button type="button" className="ap-close" disabled={saving} onClick={handleClose} title="Close (Esc)">
                        <CloseOutlined />
                    </button>
                </div>

                {/* STATS */}
                <div className="ap-stats">
                    <div className="ap-stat">
                        <div className="ap-stat-label">Items</div>
                        <div className="ap-stat-value">{groups.length}</div>
                    </div>
                    <div className="ap-stat">
                        <div className="ap-stat-label">Barcodes</div>
                        <div className="ap-stat-value">{allUnits.length}</div>
                    </div>
                    <div className="ap-stat">
                        <div className="ap-stat-label">Format</div>
                        <div className="ap-stat-value mono">INW{inwardNumber}&#123;ITEM&#125;001</div>
                    </div>
                    <div className="ap-stat">
                        <div className="ap-stat-label">Range</div>
                        <div className="ap-stat-value mono">
                            {first ? `${first} → ${last}` : "—"}
                        </div>
                    </div>
                </div>

                {/* TOOLBAR */}
                <div className="ap-toolbar">
                    <div className="ap-search">
                        <i className="fa-solid fa-magnifying-glass" />
                        <input
                            type="text"
                            placeholder="Search barcode, serial or item"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <div className="d-flex gap-2 align-items-center">
                        <button
                            type="button"
                            className="ap-btn ap-btn-ghost"
                            style={{ height: 34 }}
                            onClick={() => {
                                const anyClosed = filteredGroups.some(g => !openGroups[g.item.RecordItemId]);
                                const next = {};
                                filteredGroups.forEach(g => { next[g.item.RecordItemId] = anyClosed; });
                                setOpenGroups(next);
                            }}
                        >
                            <i className="fa-solid fa-up-down" /> Expand / collapse
                        </button>

                        <div className="ap-seg">
                            <button type="button" className={view === "cards" ? "active" : ""} onClick={() => setView("cards")}>
                                <i className="fa-solid fa-grip" /> Cards
                            </button>
                            <button type="button" className={view === "table" ? "active" : ""} onClick={() => setView("table")}>
                                <i className="fa-solid fa-list" /> List
                            </button>
                        </div>
                    </div>
                </div>

                {/* BODY */}
                <div className="ap-body">

                    {itemsWithoutQty > 0 && !term && (
                        <div className="ap-warn">
                            <i className="fa-solid fa-triangle-exclamation" />
                            {itemsWithoutQty} item(s) have no verified quantity, so no barcodes are generated for them.
                        </div>
                    )}

                    {filteredGroups.length === 0 && (
                        <div className="ap-empty">
                            <i className="fa-solid fa-barcode fs-2 d-block mb-3" />
                            {term ? `No barcodes match "${search}"` : "No barcodes to generate."}
                        </div>
                    )}

                    {filteredGroups.map(({ item, units }) => {
                        const id = item.RecordItemId;
                        const isOpen = !!openGroups[id] || !!term;
                        const limit = visible[id] || CARDS_PER_STEP;
                        const shown = units.slice(0, limit);

                        return (
                            <div key={id} className={`ap-group ${isOpen ? "open" : ""}`}>
                                <button type="button" className="ap-group-head" onClick={() => toggleGroup(id)}>
                                    <span className="ap-group-left">
                                        <i className="fa-solid fa-chevron-right ap-chevron" />
                                        <span style={{ minWidth: 0 }}>
                                            <div className="ap-group-name">{item.ItemName || "-"}</div>
                                            <div className="ap-group-sub">
                                                {item.ItemCode}{item.PartNo ? ` · Part No: ${item.PartNo}` : ""}
                                                {units[0] && ` · Serial ${units[0].SerialNo}–${units[units.length - 1].SerialNo}`}
                                            </div>
                                        </span>
                                    </span>

                                    <span className="d-flex align-items-center gap-2">
                                        <span className={`ap-count ${units.length ? "" : "zero"}`}>
                                            {units.length} barcode{units.length === 1 ? "" : "s"}
                                        </span>
                                    </span>
                                </button>

                                {isOpen && units.length > 0 && (
                                    view === "cards" ? (
                                        <>
                                            <div className="ap-grid">
                                                {shown.map(u => (
                                                    <div key={u.Barcode} className="ap-card">
                                                        <div className="ap-card-top">
                                                            <span className="ap-card-name" title={u.ItemName}>{u.ItemName || "-"}</span>
                                                            <button type="button" className="ap-copy" title="Copy" onClick={() => copyCode(u.Barcode)}>
                                                                <i className="fa-regular fa-copy" />
                                                            </button>
                                                        </div>
                                                        <BarcodeSvg value={u.Barcode} />
                                                        <div className="ap-code">{u.Barcode}</div>
                                                    </div>
                                                ))}
                                            </div>

                                            {units.length > shown.length && (
                                                <button
                                                    type="button"
                                                    className="ap-more"
                                                    onClick={() => setVisible(prev => ({ ...prev, [id]: limit + CARDS_PER_STEP }))}
                                                >
                                                    Show {Math.min(CARDS_PER_STEP, units.length - shown.length)} more
                                                    ({units.length - shown.length} hidden)
                                                </button>
                                            )}
                                        </>
                                    ) : (
                                        <table className="ap-table">
                                            <thead>
                                                <tr>
                                                    <th style={{ width: 90 }}>Serial</th>
                                                    <th>Barcode No</th>
                                                    <th>Item</th>
                                                    <th style={{ width: 60 }}></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {units.map(u => (
                                                    <tr key={u.Barcode}>
                                                        <td>#{u.SerialNo}</td>
                                                        <td className="mono">{u.Barcode}</td>
                                                        <td>{u.ItemName}</td>
                                                        <td className="text-end">
                                                            <button type="button" className="ap-copy" title="Copy" onClick={() => copyCode(u.Barcode)}>
                                                                <i className="fa-regular fa-copy" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* FOOTER */}
                <div className="ap-foot">
                    <div className="ap-foot-note">
                        {isDone ? (
                            <><i className="fa-solid fa-circle-check" style={{ color: "#12805c" }} /> Inventory updated — {allUnits.length} barcodes ready</>
                        ) : (
                            <><i className="fa-solid fa-circle-info" /> Barcodes are saved only after you update the inventory.</>
                        )}
                    </div>

                    <div className="ap-foot-actions">
                        {isDone ? (
                            <button type="button" className="ap-btn ap-btn-primary" onClick={handleClose}>
                                Done
                            </button>
                        ) : (
                            <button
                                type="button"
                                className="ap-btn ap-btn-success"
                                onClick={handleApprove}
                                disabled={saving || !allUnits.length}
                            >
                                {saving ? (
                                    <><span className="spinner-border spinner-border-sm" /> Updating...</>
                                ) : (
                                    <><CheckOutlined /> Update Inventory ({allUnits.length})</>
                                )}
                            </button>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default ApproveInwardModel;