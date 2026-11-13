import React, { useEffect, useRef, useState } from "react";
import Swal from "sweetalert2";
import {
    DeleteOutlined,
    CheckOutlined,
    PaperClipOutlined,
    CloseOutlined
} from "@ant-design/icons";

import { manageInwards } from "../services/services";
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

// Arrival date: today up to 30 days ahead (no past dates)
const MAX_FUTURE_DAYS = 30;

// Same form is used for Inwards (isOutward = false) and Outwards (isOutward = true)
const TEXT = {
    inward: {
        title: "Register Inward Record",
        subtitle: "Enter arrival details and add received items.",
        section: "Arrival Details",
        date: "Arrival Date",
        itemsHint: "Tick all the items received (search and move between pages), then enter the declared quantity for each.",
        qty: "Declared Quantity",
        totalQty: "Total Declared Qty",
        submit: "Register Inward",
        success: "Inward Registered Successfully",
        successText: "New inward record has been created.",
        fail: "Unable to register inward record"
    },
    outward: {
        title: "Register Outward Record",
        subtitle: "Enter dispatch details and add the items going out.",
        section: "Outward Details",
        date: "Outward Date",
        itemsHint: "Tick the items to dispatch (search and move between pages), then enter the outward quantity for each.",
        qty: "Outward Quantity",
        totalQty: "Total Outward Qty",
        submit: "Register Outward",
        success: "Outward Registered Successfully",
        successText: "New outward record has been created.",
        fail: "Unable to register outward record"
    }
};

const RegisterInwardModel = ({
    show,
    onClose,
    onSuccess,
    userId,
    isOutward = false
}) => {

    const T = isOutward ? TEXT.outward : TEXT.inward;
    const [remarks, setRemarks] = useState("");

    const fileInputRef = useRef(null);

    const [registerLoading, setRegisterLoading] = useState(false);

    const [arrivalDate, setArrivalDate] = useState(getTodayDate());
    const [vehicleNumber, setVehicleNumber] = useState("");
    const [docFile, setDocFile] = useState(null);

    // Rows: [{ Item: { ItemId, ItemCode, ItemName, PartNo }, DeclaredQuantity }]
    const [selectedItems, setSelectedItems] = useState([]);

    const sessionUserData = JSON.parse(
        sessionStorage.getItem("userData") || "{}"
    );

    const orgId = sessionUserData?.OrgId;

    // ==========================================
    // RESET FORM
    // ==========================================

    const resetForm = () => {
        setArrivalDate(getTodayDate());
        setVehicleNumber("");
        setRemarks("");
        setDocFile(null);
        setSelectedItems([]);

        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    useEffect(() => {
        if (show) {
            resetForm();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [show]);

    // ==========================================
    // ITEM ROWS
    // ==========================================

    // Tick -> add row, untick -> remove row
    const handleToggleItem = (item) => {
        setSelectedItems(prev => {
            const exists = prev.some(
                row => String(row.Item.ItemId) === String(item.ItemId)
            );

            return exists
                ? prev.filter(row => String(row.Item.ItemId) !== String(item.ItemId))
                : [...prev, {
                    Item: item,
                    // Outwards: start with all units ready to dispatch (user can reduce)
                    DeclaredQuantity: isOutward ? String(Number(item.ReadyToDispatchCount) || "") : ""
                }];
        });
    };

    const handleRemoveItem = (itemId) => {
        setSelectedItems(prev =>
            prev.filter(row => String(row.Item.ItemId) !== String(itemId))
        );
    };

    const handleQuantityChange = (itemId, value) => {
        setSelectedItems(prev =>
            prev.map(row =>
                String(row.Item.ItemId) === String(itemId)
                    ? { ...row, DeclaredQuantity: value }
                    : row
            )
        );
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

    const clearFile = () => {
        setDocFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    // ==========================================
    // SUBMIT INWARD
    // ==========================================

    const handleSubmit = async () => {

        if (!arrivalDate) {
            Swal.fire("Warning", `Please select ${T.date.toLowerCase()}`, "warning");
            return;
        }

        if (arrivalDate < getTodayDate() || arrivalDate > getTodayDate(MAX_FUTURE_DAYS)) {
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

        if (!selectedItems.length) {
            Swal.fire("Warning", "Please select at least one item", "warning");
            return;
        }

        const invalidRow = selectedItems.find(row =>
            !Number.isInteger(Number(row.DeclaredQuantity)) ||
            Number(row.DeclaredQuantity) <= 0
        );

        if (invalidRow) {
            Swal.fire(
                "Warning",
                `Please enter a valid quantity for ${invalidRow.Item.ItemCode} - ${invalidRow.Item.ItemName}`,
                "warning"
            );
            return;
        }

        // Outwards: cannot send more than is ready to dispatch
        if (isOutward) {
            const overRow = selectedItems.find(row =>
                Number(row.DeclaredQuantity) > (Number(row.Item.ReadyToDispatchCount) || 0)
            );
            if (overRow) {
                Swal.fire(
                    "Warning",
                    `${overRow.Item.ItemName}: only ${Number(overRow.Item.ReadyToDispatchCount) || 0} unit(s) are ready to dispatch.`,
                    "warning"
                );
                return;
            }
        }

        // Multiple items -> ItemsJson array
        // Inward:  { ItemId, DeclaredQuantity }            (verified later in Review & Count)
        // Outward: { ItemId, DeclaredQuantity: 0, VerifiedQuantity }
        const itemsPayload = selectedItems.map(row => (
            isOutward
                ? { ItemId: Number(row.Item.ItemId), DeclaredQuantity: 0, VerifiedQuantity: Number(row.DeclaredQuantity) }
                : { ItemId: Number(row.Item.ItemId), DeclaredQuantity: Number(row.DeclaredQuantity) }
        ));

        const inwardPayload = {
            ArrivalDate: arrivalDate,
            VehicleNumber: compactVehicle(vehicleNumber),          // sent without spaces: DL01AB0123
            DocFile: null,
            UserId: userId,
            IsOutward: isOutward ? 1 : 0,          // 0 = inward, 1 = outward
            NotifyId: 0,
            ...(isOutward && remarks.trim() ? { Remarks: remarks.trim() } : {})
        };

        const formData = new FormData();

        formData.append("OrgId", orgId);
        formData.append("Action", "NEW_INWARD");
        formData.append("InwardRecordJson", JSON.stringify(inwardPayload));
        formData.append("ItemsJson", JSON.stringify(itemsPayload));
        formData.append("UnitsJson", "null");
        formData.append("DocFile", docFile || "");

        setRegisterLoading(true);

        try {

            const response = await manageInwards(formData);

            const success =
                (response?.status === 200 && response?.result === "success") ||
                response?.success === true;

            if (success) {

                resetForm();
                onClose?.();
                await onSuccess?.();

                Swal.fire({
                    icon: "success",
                    title: T.success,
                    text:
                        response?.response ||
                        response?.message ||
                        T.successText,
                    confirmButtonText: "OK"
                });

            } else {

                Swal.fire(
                    "Error",
                    response?.response ||
                        response?.message ||
                        T.fail,
                    "error"
                );

            }

        } catch (error) {

            console.error("ManageInwards Error:", error);

            Swal.fire(
                "Error",
                error?.serverMessage || T.fail,
                "error"
            );

        } finally {
            setRegisterLoading(false);
        }
    };

    if (!show) return null;

    // ==========================================
    // TOTAL SUMMARY
    // ==========================================

    const totalItems = selectedItems.length;

    const totalQuantity = selectedItems.reduce(
        (total, row) => total + (Number(row.DeclaredQuantity) || 0),
        0
    );

    const selectedIds = selectedItems.map(row => row.Item.ItemId);

    return (

        <div
            className="modal d-block"
            tabIndex="-1"
            style={{
                backgroundColor: "rgba(0,0,0,0.5)",
                zIndex: 1055,
                overflowY: "auto"
            }}
        >

            <div className="modal-dialog modal-xl modal-fullscreen-sm-down">

                <div className={`modal-content ${isOutward ? "ow-modal" : ""}`}>

                    {/* HEADER */}

                    <div className="modal-header">

                        <div>
                            <h3 className="modal-title fw-bold">
                                {T.title}
                            </h3>
                            <div className="text-muted fs-7 mt-1">
                                {T.subtitle}
                            </div>
                        </div>

                        <button
                            type="button"
                            className="btn btn-sm btn-icon btn-light"
                            disabled={registerLoading}
                            onClick={onClose}
                        >
                            <i className="fa-solid fa-xmark fs-4" />
                        </button>

                    </div>

                    {/* BODY */}

                    <div className="modal-body">

                        {/* ARRIVAL DETAILS */}

                        <h5 className="fw-bold mb-3">
                            {T.section}
                        </h5>

                        <div className="row g-3">

                            <div className="col-md-4">
                                <label className="form-label required fw-semibold fs-7 mb-1">
                                    {T.date}
                                </label>
                                <input
                                    type="date"
                                    className="form-control form-control-sm"
                                    value={arrivalDate}
                                    min={getTodayDate()}
                                    max={getTodayDate(MAX_FUTURE_DAYS)}
                                    disabled={registerLoading}
                                    onChange={e => setArrivalDate(e.target.value)}
                                />
                            </div>

                            <div className="col-md-4">
                                <label className="form-label required fw-semibold fs-7 mb-1">
                                    Vehicle Number
                                </label>
                                <input
                                    type="text"
                                    className={`form-control form-control-sm text-uppercase ${vehicleNumber && !isValidVehicle(vehicleNumber) ? "is-invalid" : ""}`}
                                    placeholder={VEHICLE_PLACEHOLDER}
                                    value={vehicleNumber}
                                    disabled={registerLoading}
                                    maxLength={13}
                                    autoComplete="off"
                                    spellCheck={false}
                                    style={{ fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace", letterSpacing: ".5px" }}
                                    onChange={e => setVehicleNumber(formatVehicle(e.target.value))}
                                />
                                {vehicleNumber && !isValidVehicle(vehicleNumber) && (
                                    <div className="invalid-feedback d-block fs-9">{vehicleHint(vehicleNumber) || "Format: AA 00 AA 0000"}</div>
                                )}
                            </div>

                            <div className="col-md-4">
                                <label className="form-label fw-semibold fs-7 mb-1">
                                    Document <span className="text-muted fs-8">(optional)</span>
                                </label>

                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    hidden
                                    onChange={handleFileChange}
                                />

                                {docFile ? (
                                    <div className="form-control form-control-sm d-flex align-items-center justify-content-between">
                                        <span className="text-truncate">
                                            <PaperClipOutlined className="me-2" />
                                            {docFile.name}
                                        </span>
                                        <CloseOutlined
                                            className="ms-2 text-muted"
                                            style={{ cursor: "pointer" }}
                                            onClick={clearFile}
                                        />
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        className="btn btn-sm btn-light border w-100 text-start"
                                        disabled={registerLoading}
                                        onClick={() => fileInputRef.current?.click()}
                                    >
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
                                    disabled={registerLoading}
                                    onChange={e => setRemarks(e.target.value)}
                                />
                            </div>
                        )}

                        <div className="separator my-5" />

                        {/* ITEMS */}

                        <div className="d-flex justify-content-between align-items-start flex-wrap gap-3 mb-3">

                            <div>
                                <h5 className="fw-bold mb-1">
                                    Item Details
                                </h5>
                                <span className="text-muted fs-7">
                                    {T.itemsHint}
                                </span>
                            </div>

                            {/* TOTALS (right side of heading) */}
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
                                showReadyCount={isOutward}
                                disabled={registerLoading}
                                placeholder="Click to search and select items"
                            />
                        </div>

                        <div
                            className="border rounded"
                            style={{ maxHeight: 320, overflowY: "auto", overflowX: "auto" }}
                        >
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

                                {selectedItems.length === 0 ? (

                                    <tr>
                                        <td colSpan="4" className="text-center text-muted py-6">
                                            No items selected yet. Use the box above to add items.
                                        </td>
                                    </tr>

                                ) : (

                                    selectedItems.map((row, index) => (

                                        <tr key={row.Item.ItemId}>

                                            <td className="ps-3 text-muted">
                                                {index + 1}
                                            </td>

                                            <td>
                                                <div className="fw-semibold text-gray-800">
                                                    {row.Item.ItemName}
                                                </div>
                                                <div className="text-muted fs-9">
                                                    {row.Item.ItemCode}
                                                    {row.Item.PartNo ? ` · Part No: ${row.Item.PartNo}` : ""}
                                                </div>
                                                {isOutward && (
                                                    <div className="fs-9 fw-semibold mt-1" style={{ color: "#12805c" }}>
                                                        Ready to dispatch: {Number(row.Item.ReadyToDispatchCount) || 0}
                                                    </div>
                                                )}
                                            </td>

                                            <td>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max={isOutward ? (Number(row.Item.ReadyToDispatchCount) || 0) : undefined}
                                                    step="1"
                                                    className={`form-control form-control-sm ${
                                                        isOutward && Number(row.DeclaredQuantity) > (Number(row.Item.ReadyToDispatchCount) || 0)
                                                            ? "is-invalid" : ""
                                                    }`}
                                                    style={{ maxWidth: 160 }}
                                                    placeholder="Enter quantity"
                                                    value={row.DeclaredQuantity}
                                                    disabled={registerLoading}
                                                    onChange={e =>
                                                        handleQuantityChange(row.Item.ItemId, e.target.value)
                                                    }
                                                />
                                                {isOutward && Number(row.DeclaredQuantity) > (Number(row.Item.ReadyToDispatchCount) || 0) && (
                                                    <div className="text-danger fs-9 mt-1">
                                                        Max {Number(row.Item.ReadyToDispatchCount) || 0}
                                                    </div>
                                                )}
                                            </td>

                                            <td className="text-center">
                                                <button
                                                    type="button"
                                                    className="btn btn-sm btn-icon btn-light-danger w-30px h-30px"
                                                    disabled={registerLoading}
                                                    onClick={() => handleRemoveItem(row.Item.ItemId)}
                                                >
                                                    <DeleteOutlined />
                                                </button>
                                            </td>

                                        </tr>

                                    ))

                                )}

                            </tbody>

                        </table>
                        </div>

                    </div>

                    {/* FOOTER */}

                    <div className="modal-footer">

                        <button
                            type="button"
                            className="btn btn-sm btn-light"
                            disabled={registerLoading}
                            onClick={onClose}
                        >
                            Cancel
                        </button>

                        <button
                            type="button"
                            className="btn btn-sm btn-primary"
                            disabled={registerLoading || selectedItems.length === 0}
                            onClick={handleSubmit}
                        >
                            {registerLoading ? (
                                <>
                                    <span className="spinner-border spinner-border-sm me-2" />
                                    Registering...
                                </>
                            ) : (
                                <>
                                    <CheckOutlined className="me-2" />
                                    {T.submit}
                                </>
                            )}
                        </button>

                    </div>

                </div>

            </div>

        </div>

    );
};

export default RegisterInwardModel;