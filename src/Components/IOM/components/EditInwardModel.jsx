import React, { useEffect, useMemo, useRef, useState } from "react";
import Swal from "sweetalert2";
import {
    DeleteOutlined,
    CheckOutlined,
    PaperClipOutlined,
    CloseOutlined,
    UndoOutlined
} from "@ant-design/icons";

import { manageInwards, getInwardRecordDetails, getItems } from "../services/services";
import ItemPicker from "./ItemPicker";
import { formatVehicle, compactVehicle, isValidVehicle, vehicleHint, VEHICLE_PLACEHOLDER } from "./vehicleNumber";

// yyyy-mm-dd for today + `addDays`
const getTodayDate = (addDays = 0) => {
    const date = new Date();
    date.setDate(date.getDate() + addDays);
    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0")
    ].join("-");
};

const MAX_FUTURE_DAYS = 30;
const toInputDate = (v) => (v ? String(v).slice(0, 10) : "");

// Same popup edits Inwards (isOutward = false) and Outwards (isOutward = true)
const TEXT = {
    inward: {
        title: "Edit Inward",
        subtitle: "Change arrival details or items. Removed items are kept as inactive.",
        section: "Arrival Details",
        date: "Arrival Date",
        itemsHint: "Change quantities, add items, or remove items that did not arrive.",
        qty: "Declared Quantity",
        totalQty: "Total Declared Qty",
        success: "Inward updated",
        fail: "Unable to update inward record",
        loading: "Loading inward…",
        keepOne: "Keep at least one item in the inward",
        removedNote: "Will be removed from this inward"
    },
    outward: {
        title: "Edit Outward",
        subtitle: "Change dispatch details or items. Removed items are kept as inactive.",
        section: "Outward Details",
        date: "Outward Date",
        itemsHint: "Change quantities, add items, or remove items that are not going out.",
        qty: "Outward Quantity",
        totalQty: "Total Outward Qty",
        success: "Outward updated",
        fail: "Unable to update outward record",
        loading: "Loading outward…",
        keepOne: "Keep at least one item in the outward",
        removedNote: "Will be removed from this outward"
    }
};

/**
 * Edit inward / outward. Outward NEW = full edit; outward after NEW (until DISPATCH_CONFIRMED) = add new items only – POST file_upload/ManageInwards (FormData)
 *
 *   OrgId, Action = "EDIT_INWARD",
 *   InwardRecordJson = { Id, ArrivalDate, VehicleNumber, DocFile, DeleteFile, UserId, IsOutward: 0 | 1, NotifyId: 0, Remarks (outward) }
 *     DocFile = existing path when not changed · DeleteFile = old path when a new file is attached, else null
 *   ItemsJson = [
 *       { RecordItemId, ItemId, DeclaredQuantity, IsActive: 1 },   // kept item
 *       { RecordItemId, ItemId, DeclaredQuantity, IsActive: 0 },   // removed item
 *       { ItemId, DeclaredQuantity, IsActive: 1 }                  // newly added item
 *   ]
 *   UnitsJson = "null", DocFile = new file (or "")
 *
 * <EditInwardModel show record={row} orgId userId onClose onSuccess />           // inward
 * <EditInwardModel show isOutward record={row} orgId userId onClose onSuccess /> // outward
 */
const EditInwardModel = ({ show, record, orgId, userId, onClose, onSuccess, isOutward = false }) => {
    const T = isOutward ? TEXT.outward : TEXT.inward;
    // Outward after NEW (pending loading … until dispatch confirmed): only ADD new items.
    // Existing items: quantity locked, no remove.
    const addOnly = isOutward && String(record?.Status || "").toUpperCase() !== "NEW";
    const locked = (row) => addOnly && !!row.RecordItemId;

    // Outward: ReadyToDispatchCount per item (existing rows don't carry it – loaded from GetItems)
    const [readyMap, setReadyMap] = useState({});
    const readyOf = (row) => {
        const v = row?.Item?.ReadyToDispatchCount ?? readyMap[String(row?.Item?.ItemId)];
        return v === undefined || v === null || v === "" ? null : Number(v) || 0;
    };
    // over the ready count? (only rows the user can still change)
    const isOver = (row) => {
        if (!isOutward || locked(row) || row.DeclaredQuantity === "") return false;
        const ready = readyOf(row);
        return ready !== null && Number(row.DeclaredQuantity) > ready;
    };
    const fileInputRef = useRef(null);

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const [arrivalDate, setArrivalDate] = useState("");
    const [vehicleNumber, setVehicleNumber] = useState("");
    const [savedVehicle, setSavedVehicle] = useState("");   // raw value from the server (old records may not match the format)
    const [existingDoc, setExistingDoc] = useState("");   // file name already saved
    const [docFile, setDocFile] = useState(null);         // newly chosen file
    const [remarks, setRemarks] = useState("");           // outward only

    // rows: { RecordItemId (existing only), Item: { ItemId, ItemCode, ItemName, PartNo }, DeclaredQuantity, removed }
    const [rows, setRows] = useState([]);
    const [original, setOriginal] = useState(null);       // for "nothing changed" check

    // ==========================================
    // LOAD THE INWARD
    // ==========================================
    useEffect(() => {
        if (!show || !record?.Id) return;
        let cancelled = false;

        setLoading(true);
        setDocFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";

        getInwardRecordDetails(orgId, record.Id)
            .then(res => {
                if (cancelled) return;
                const ok = res?.status === 200 && String(res?.result).toLowerCase() === "success";
                if (!ok) {
                    Swal.fire("Error", res?.response || `Unable to load the ${isOutward ? "outward" : "inward"} record`, "error");
                    onClose?.();
                    return;
                }
                const head = res?.data?.InwardRecord || {};
                const items = res?.data?.InwardRecordItems || [];

                const date = toInputDate(head.ArrivalDate || record.ArrivalDate);
                const rawVehicle = String(head.VehicleNumber || record.VehicleNumber || "").toUpperCase();
                const vehicle = formatVehicle(rawVehicle);   // shown as DL 01 AB 0123
                const doc = head.DocFile || record.DocFile || "";
                const rmk = head.Remarks ?? record.Remarks ?? "";
                const loadedRows = items.map(it => ({
                    RecordItemId: it.RecordItemId,
                    Item: { ItemId: it.ItemId, ItemCode: it.ItemCode, ItemName: it.ItemName, PartNo: it.PartNo, ReadyToDispatchCount: it.ReadyToDispatchCount },
                    DeclaredQuantity: String((isOutward ? (it.VerifiedQuantity ?? it.DeclaredQuantity) : it.DeclaredQuantity) ?? ""),
                    removed: false
                }));

                setArrivalDate(date);
                setVehicleNumber(vehicle);
                setSavedVehicle(isValidVehicle(rawVehicle) ? "" : rawVehicle);
                setExistingDoc(doc);
                setRemarks(rmk || "");
                setRows(loadedRows);
                setOriginal({ date, vehicle, remarks: rmk || "", rows: JSON.stringify(loadedRows) });
            })
            .catch(err => {
                if (cancelled) return;
                console.error("GetInwardRecordDetails (edit) Error:", err);
                Swal.fire("Error", `Failed to load the ${isOutward ? "outward" : "inward"} record`, "error");
                onClose?.();
            })
            .finally(() => !cancelled && setLoading(false));

        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [show, record?.Id]);

    useEffect(() => {
        if (!show || !isOutward || !orgId) return;
        let cancelled = false;
        setReadyMap({});
        getItems({ orgId, pageNumber: 1, pageSize: 1000 })
            .then(res => {
                if (cancelled) return;
                const list = Array.isArray(res?.data?.result) ? res.data.result : Array.isArray(res?.data) ? res.data : [];
                const map = {};
                list.forEach(it => { map[String(it.ItemId)] = Number(it.ReadyToDispatchCount) || 0; });
                setReadyMap(map);
            })
            .catch(err => console.error("GetItems (ready counts) Error:", err));
        return () => { cancelled = true; };
    }, [show, isOutward, orgId, record?.Id]);

    // ==========================================
    // ITEMS
    // ==========================================
    const activeRows = rows.filter(r => !r.removed);
    const removedRows = rows.filter(r => r.removed && r.RecordItemId);
    const selectedIds = activeRows.map(r => r.Item.ItemId);

    // Tick -> add (or restore a removed one); untick -> remove
    const handleToggleItem = (item) => {
        setRows(prev => {
            const idx = prev.findIndex(r => String(r.Item.ItemId) === String(item.ItemId));
            if (idx === -1) return [...prev, { Item: item, DeclaredQuantity: "", removed: false }];
            const row = prev[idx];
            if (addOnly && row.RecordItemId) return prev;   // existing item stays (add-only mode)
            if (row.removed) return prev.map((r, i) => (i === idx ? { ...r, removed: false } : r));
            // existing item -> mark removed (sent with IsActive 0); new item -> drop it
            return row.RecordItemId
                ? prev.map((r, i) => (i === idx ? { ...r, removed: true } : r))
                : prev.filter((_, i) => i !== idx);
        });
    };

    const removeRow = (itemId) => {
        if (addOnly && rows.some(r => String(r.Item.ItemId) === String(itemId) && r.RecordItemId)) return;
        setRows(prev => prev
            .map(r => (String(r.Item.ItemId) === String(itemId) && r.RecordItemId ? { ...r, removed: true } : r))
            .filter(r => !(String(r.Item.ItemId) === String(itemId) && !r.RecordItemId)));
    };

    const restoreRow = (itemId) => {
        setRows(prev => prev.map(r => (String(r.Item.ItemId) === String(itemId) ? { ...r, removed: false } : r)));
    };

    const setQty = (itemId, value) => {
        setRows(prev => prev.map(r => (String(r.Item.ItemId) === String(itemId) && !locked(r) ? { ...r, DeclaredQuantity: value } : r)));
    };

    // ==========================================
    // DOCUMENT
    // ==========================================
    const handleFileChange = (e) => {
        const file = e.target.files?.[0] || null;
        if (file && file.size > 10 * 1024 * 1024) {
            Swal.fire("Warning", "File size should be less than 10 MB", "warning");
            e.target.value = "";
            return;
        }
        setDocFile(file);
    };

    const clearNewFile = () => {
        setDocFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    // ==========================================
    // CHANGED?
    // ==========================================
    const changed = useMemo(() => {
        if (!original) return false;
        return (
            !!docFile ||
            arrivalDate !== original.date ||
            vehicleNumber !== original.vehicle ||
            (isOutward && remarks.trim() !== String(original.remarks || "").trim()) ||
            JSON.stringify(rows) !== original.rows
        );
    }, [original, docFile, arrivalDate, vehicleNumber, rows, remarks, isOutward]);

    // ==========================================
    // SAVE
    // ==========================================
    const handleSave = async () => {
        const today = getTodayDate();
        const maxDate = getTodayDate(MAX_FUTURE_DAYS);
        const dateOk = arrivalDate && (arrivalDate === original?.date || (arrivalDate >= today && arrivalDate <= maxDate));

        if (!dateOk) {
            Swal.fire("Warning", `${T.date} must be between today and the next ${MAX_FUTURE_DAYS} days`, "warning");
            return;
        }
        if (!vehicleNumber.trim()) {
            Swal.fire("Warning", "Please enter vehicle number", "warning");
            return;
        }
        if (!isValidVehicle(vehicleNumber)) {
            Swal.fire("Warning", "Enter the vehicle number like DL 01 AB 0123 (2 letters, 2 digits, 1–3 letters, 4 digits).", "warning");
            return;
        }
        if (!activeRows.length) {
            Swal.fire("Warning", T.keepOne, "warning");
            return;
        }
        const invalid = activeRows.find(r => !Number.isInteger(Number(r.DeclaredQuantity)) || Number(r.DeclaredQuantity) <= 0);
        if (invalid) {
            Swal.fire("Warning", `Please enter a valid quantity for ${invalid.Item.ItemCode} - ${invalid.Item.ItemName}`, "warning");
            return;
        }

        // Outward: quantity cannot go above the ready-to-dispatch count (same rule as Register)
        // – new items always; existing items while status is NEW (locked rows are skipped)
        if (isOutward) {
            const over = activeRows.find(isOver);
            if (over) {
                Swal.fire("Warning", `${over.Item.ItemName}: only ${readyOf(over)} unit(s) are ready to dispatch.`, "warning");
                return;
            }
        }

        // Outward: quantity goes as VerifiedQuantity · Inward: DeclaredQuantity
        const qtyKey = isOutward ? "VerifiedQuantity" : "DeclaredQuantity";
        // Outward also sends DeclaredQuantity: 0 (same as Register outward)
        const outwardExtra = isOutward ? { DeclaredQuantity: 0 } : {};
        const itemsPayload = [
            ...activeRows.map(r => ({
                ...(r.RecordItemId ? { RecordItemId: Number(r.RecordItemId) } : {}),
                ItemId: Number(r.Item.ItemId),
                ...outwardExtra,
                [qtyKey]: Number(r.DeclaredQuantity),
                IsActive: 1
            })),
            ...removedRows.map(r => ({
                RecordItemId: Number(r.RecordItemId),
                ItemId: Number(r.Item.ItemId),
                ...outwardExtra,
                [qtyKey]: Number(r.DeclaredQuantity) || 0,
                IsActive: 0
            }))
        ];

        const inwardPayload = {
            Id: Number(record.Id),
            ArrivalDate: arrivalDate,
            VehicleNumber: compactVehicle(vehicleNumber),          // sent without spaces: DL01AB0123
            // Document:
            //  - not changed -> DocFile = existing file path, DeleteFile = null
            //  - replaced    -> DocFile = null (new file goes in the "DocFile" form field), DeleteFile = previous file path
            DocFile: docFile ? null : (existingDoc || null),
            DeleteFile: docFile && existingDoc ? existingDoc : null,
            UserId: Number(userId),
            IsOutward: isOutward ? 1 : 0,
            NotifyId: 0,
            ...(isOutward ? { Remarks: remarks.trim() } : {})
        };

        const formData = new FormData();
        formData.append("OrgId", orgId);
        formData.append("Action", "EDIT_INWARD");
        formData.append("InwardRecordJson", JSON.stringify(inwardPayload));
        formData.append("ItemsJson", JSON.stringify(itemsPayload));
        formData.append("UnitsJson", "null");
        formData.append("DocFile", docFile || "");

        setSaving(true);
        try {
            const response = await manageInwards(formData);
            const success =
                (response?.status === 200 && String(response?.result).toLowerCase() === "success") ||
                response?.success === true;

            if (success) {
                onClose?.();
                await onSuccess?.();
                Swal.fire({
                    icon: "success",
                    title: T.success,
                    text: response?.response || response?.message || `${record.InwardRecordNo || ""} has been updated.`,
                    timer: 2000,
                    showConfirmButton: false
                });
            } else {
                Swal.fire("Error", response?.response || response?.message || T.fail, "error");
            }
        } catch (error) {
            console.error("EDIT_INWARD Error:", error);
            Swal.fire("Error", error?.serverMessage || T.fail, "error");
        } finally {
            setSaving(false);
        }
    };

    if (!show) return null;

    const totalItems = activeRows.length;
    const totalQuantity = activeRows.reduce((t, r) => t + (Number(r.DeclaredQuantity) || 0), 0);
    const busy = loading || saving;

    return (
        <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1055, overflowY: "auto" }}>
            <div className="modal-dialog modal-xl modal-fullscreen-sm-down">
                <div className={`modal-content ${isOutward ? "ow-modal" : ""}`}>

                    {/* HEADER */}
                    <div className="modal-header">
                        <div>
                            <h3 className="modal-title fw-bold">
                                {T.title} {record?.InwardRecordNo ? `· ${record.InwardRecordNo}` : ""}
                            </h3>
                            <div className="text-muted fs-7 mt-1">
                                {addOnly ? "Loading has started – you can only add new items." : T.subtitle}
                            </div>
                        </div>
                        <button type="button" className="btn btn-sm btn-icon btn-light" disabled={saving} onClick={onClose}>
                            <i className="fa-solid fa-xmark fs-4" />
                        </button>
                    </div>

                    {/* BODY */}
                    <div className="modal-body">
                        {loading ? (
                            <div className="text-center text-muted py-10">
                                <span className="spinner-border spinner-border-sm me-2" /> {T.loading}
                            </div>
                        ) : (
                            <>
                                <h5 className="fw-bold mb-3">{T.section}</h5>

                                <div className="row g-3">
                                    <div className="col-md-4">
                                        <label className="form-label required fw-semibold fs-7 mb-1">{T.date}</label>
                                        <input
                                            type="date"
                                            className="form-control form-control-sm"
                                            value={arrivalDate}
                                            min={original?.date && original.date < getTodayDate() ? original.date : getTodayDate()}
                                            max={getTodayDate(MAX_FUTURE_DAYS)}
                                            disabled={busy}
                                            onChange={e => setArrivalDate(e.target.value)}
                                        />
                                    </div>

                                    <div className="col-md-4">
                                        <label className="form-label required fw-semibold fs-7 mb-1">Vehicle Number</label>
                                        <input
                                    type="text"
                                    className={`form-control form-control-sm text-uppercase ${vehicleNumber && !isValidVehicle(vehicleNumber) ? "is-invalid" : ""}`}
                                    placeholder={VEHICLE_PLACEHOLDER}
                                    value={vehicleNumber}
                                    disabled={busy}
                                    maxLength={13}
                                    autoComplete="off"
                                    spellCheck={false}
                                    style={{ fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace", letterSpacing: ".5px" }}
                                    onChange={e => setVehicleNumber(formatVehicle(e.target.value))}
                                />
                                {vehicleNumber && !isValidVehicle(vehicleNumber) && (
                                    <div className="invalid-feedback d-block fs-9">{vehicleHint(vehicleNumber) || "Format: AA 00 AA 0000"}</div>
                                )}
                                {savedVehicle && (
                                    <div className="fs-9 mt-1" style={{ color: "#b54708" }}>
                                        Saved as "{savedVehicle}" – please re-enter it as AA 00 AA 0000.
                                    </div>
                                )}
                                    </div>

                                    <div className="col-md-4">
                                        <label className="form-label fw-semibold fs-7 mb-1">
                                            Document <span className="text-muted fs-8">(optional)</span>
                                        </label>
                                        <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" hidden onChange={handleFileChange} />

                                        {docFile ? (
                                            <div className="form-control form-control-sm d-flex align-items-center justify-content-between">
                                                <span className="text-truncate">
                                                    <PaperClipOutlined className="me-2" />{docFile.name}
                                                    <span className="badge badge-light-warning ms-2">New</span>
                                                </span>
                                                <CloseOutlined className="ms-2 text-muted" style={{ cursor: "pointer" }} onClick={clearNewFile} />
                                            </div>
                                        ) : existingDoc ? (
                                            <div className="form-control form-control-sm d-flex align-items-center justify-content-between">
                                                <span className="text-truncate" title={existingDoc}>
                                                    <PaperClipOutlined className="me-2" />{existingDoc}
                                                </span>
                                                <button type="button" className="btn btn-link btn-sm p-0 ms-2 fw-semibold" disabled={busy} onClick={() => fileInputRef.current?.click()}>
                                                    Replace
                                                </button>
                                            </div>
                                        ) : (
                                            <button type="button" className="btn btn-sm btn-light border w-100 text-start" disabled={busy} onClick={() => fileInputRef.current?.click()}>
                                                <PaperClipOutlined className="me-2" />
                                                Attach invoice / DC (PDF, JPG, PNG)
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {isOutward && (
                                    <div className="mt-3">
                                        <label className="form-label fw-semibold fs-7 mb-1">
                                            Remarks <span className="text-muted fs-8">(optional)</span>
                                        </label>
                                        <textarea
                                            className="form-control form-control-sm"
                                            rows={2}
                                            placeholder="e.g. destination or customer reference"
                                            value={remarks}
                                            disabled={busy}
                                            onChange={e => setRemarks(e.target.value)}
                                        />
                                    </div>
                                )}

                                <div className="separator my-5" />

                                {/* ITEMS */}
                                <div className="d-flex justify-content-between align-items-start flex-wrap gap-3 mb-3">
                                    <div>
                                        <h5 className="fw-bold mb-1">Item Details</h5>
                                        <span className="text-muted fs-7">
                                            {addOnly
                                                ? "Status is not New: existing items and quantities cannot be changed. Add new items only."
                                                : T.itemsHint}
                                        </span>
                                    </div>
                                    <div className="d-flex gap-2 flex-shrink-0">
                                        <div className="bg-light-primary rounded px-3 py-2 text-center" style={{ minWidth: 92 }}>
                                            <div className="text-muted fs-8">Total Items</div>
                                            <div className="fw-bold fs-5 text-primary">{totalItems}</div>
                                        </div>
                                        <div className="bg-light-primary rounded px-3 py-2 text-center" style={{ minWidth: 140 }}>
                                            <div className="text-muted fs-8">{T.totalQty}</div>
                                            <div className="fw-bold fs-5 text-primary">{totalQuantity}</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <ItemPicker
                                        multiple
                                        orgId={orgId}
                                        selectedIds={selectedIds}
                                        onToggle={handleToggleItem}
                                        disabled={busy}
                                        placeholder="Click to search and add items"
                                        showReadyCount={isOutward}
                                    />
                                </div>

                                <div className="border rounded" style={{ maxHeight: 340, overflowY: "auto", overflowX: "auto" }}>
                                    <table className="table table-row-bordered align-middle gy-2 fs-7 mb-0">
                                        <thead className="bg-light" style={{ position: "sticky", top: 0, zIndex: 1 }}>
                                            <tr className="fw-bold text-muted fs-8 text-uppercase">
                                                <th className="ps-3" style={{ width: "5%" }}>#</th>
                                                <th style={{ width: "55%" }}>Item</th>
                                                <th style={{ width: "28%" }}>{T.qty}</th>
                                                <th style={{ width: "12%" }} className="text-center">Remove</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {activeRows.length === 0 && removedRows.length === 0 ? (
                                                <tr>
                                                    <td colSpan="4" className="text-center text-muted py-6">
                                                        No items. Use the box above to add items.
                                                    </td>
                                                </tr>
                                            ) : (
                                                <>
                                                    {activeRows.map((row, index) => (
                                                        <tr key={row.Item.ItemId}>
                                                            <td className="ps-3 text-muted">{index + 1}</td>
                                                            <td>
                                                                <div className="fw-semibold text-gray-800">
                                                                    {row.Item.ItemName}
                                                                    {!row.RecordItemId && <span className="badge badge-light-success ms-2">New</span>}
                                                                </div>
                                                                <div className="text-muted fs-9">
                                                                    {row.Item.ItemCode}{row.Item.PartNo ? ` · Part No: ${row.Item.PartNo}` : ""}
                                                                </div>
                                                                {isOutward && !locked(row) && readyOf(row) !== null && (
                                                                    <div className="fs-9 fw-semibold mt-1" style={{ color: "#12805c" }}>
                                                                        Ready to dispatch: {readyOf(row)}
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td>
                                                                {locked(row) ? (
                                                                    <span className="d-inline-flex align-items-center gap-2 fw-semibold text-gray-800" title="Quantity cannot be changed after loading starts">
                                                                        {row.DeclaredQuantity}
                                                                        <i className="fa-solid fa-lock text-muted fs-8" />
                                                                    </span>
                                                                ) : (
                                                                <>
                                                                <input
                                                                    type="number"
                                                                    min="1"
                                                                    max={isOutward && readyOf(row) !== null ? readyOf(row) : undefined}
                                                                    step="1"
                                                                    className={`form-control form-control-sm ${isOver(row) ? "is-invalid" : ""}`}
                                                                    style={{ maxWidth: 160 }}
                                                                    placeholder="Enter quantity"
                                                                    value={row.DeclaredQuantity}
                                                                    disabled={busy}
                                                                    onChange={e => setQty(row.Item.ItemId, e.target.value)}
                                                                />
                                                                {isOver(row) && (
                                                                    <div className="text-danger fs-9 mt-1">Max {readyOf(row)}</div>
                                                                )}
                                                                </>
                                                                )}
                                                            </td>
                                                            <td className="text-center">
                                                                {locked(row) ? (
                                                                    <span className="text-muted">—</span>
                                                                ) : (
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-sm btn-icon btn-light-danger w-30px h-30px"
                                                                    disabled={busy}
                                                                    title="Remove item"
                                                                    onClick={() => removeRow(row.Item.ItemId)}
                                                                >
                                                                    <DeleteOutlined />
                                                                </button>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}

                                                    {/* removed existing items – sent with IsActive 0 */}
                                                    {removedRows.map(row => (
                                                        <tr key={`rm-${row.Item.ItemId}`} style={{ background: "#fef3f2" }}>
                                                            <td className="ps-3 text-muted">—</td>
                                                            <td>
                                                                <div className="fw-semibold text-muted text-decoration-line-through">{row.Item.ItemName}</div>
                                                                <div className="fs-9" style={{ color: "#b42318" }}>{T.removedNote}</div>
                                                            </td>
                                                            <td className="text-muted text-decoration-line-through">{row.DeclaredQuantity}</td>
                                                            <td className="text-center">
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-sm btn-light"
                                                                    disabled={busy}
                                                                    title="Undo remove"
                                                                    onClick={() => restoreRow(row.Item.ItemId)}
                                                                >
                                                                    <UndoOutlined /> Undo
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                    </div>

                    {/* FOOTER */}
                    <div className="modal-footer">
                        <button type="button" className="btn btn-sm btn-light" disabled={saving} onClick={onClose}>
                            Cancel
                        </button>
                        <button
                            type="button"
                            className="btn btn-sm btn-primary"
                            disabled={busy || !changed || activeRows.length === 0 || (isOutward && activeRows.some(isOver))}
                            title={!changed ? "Nothing changed" : ""}
                            onClick={handleSave}
                        >
                            {saving
                                ? <><span className="spinner-border spinner-border-sm me-2" />Saving...</>
                                : <><CheckOutlined className="me-2" />Save Changes</>}
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default EditInwardModel;