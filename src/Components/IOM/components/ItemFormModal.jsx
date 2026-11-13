import React, { useEffect, useMemo, useRef, useState } from "react";
import Swal from "sweetalert2";
import { manageItems } from "../services/services";
import { BASE_IMAGE_API_GET } from "../../Config/Config";
import "./ItemFormModal.css";

// "hydraulic pump" -> "Hydraulic pump" (first non-space letter upper case)
const capFirst = (v) => String(v ?? "").replace(/^(\s*)(\S)/, (m, sp, c) => sp + c.toUpperCase());

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;   // 5 MB

const imageUrl = (img) =>
    img ? (/^https?:\/\//i.test(img) ? img : `${BASE_IMAGE_API_GET}${img}`) : "";

const toForm = (item) => ({
    ItemCode: item?.ItemCode || "",
    ItemName: item?.ItemName || "",
    Description: item?.Description || "",
    PartNO: item?.PartNo ?? item?.PartNO ?? ""
});

/**
 * Add / Edit item – POST file_upload/ManageItems (FormData)
 *
 * ADD : OrgId, UserId, Action "ADD",
 *       ItemsJson { ItemCode, ItemName, Description, PartNO, ItemImage: "", IsActive: true },
 *       ItemImage (file, optional)
 * EDIT: same + ItemsJson.ItemId; ItemsJson.ItemImage keeps the current image when unchanged.
 *       New image -> ItemImage (file) + DeleteFile (previous image).
 *       Image removed -> DeleteFile (previous image), ItemsJson.ItemImage "".
 *
 * <ItemFormModal show item={row | null} orgId userId onClose onSaved />
 *   item = null -> Add, item = row from GetItems -> Edit
 */
const ItemFormModal = ({ show, item, orgId, userId, onClose, onSaved }) => {
    const isEdit = !!item?.ItemId;
    const fileRef = useRef(null);

    const [form, setForm] = useState(toForm(null));
    const [newImage, setNewImage] = useState(null);       // File
    const [removeImage, setRemoveImage] = useState(false);
    const [previewUrl, setPreviewUrl] = useState("");
    const [saving, setSaving] = useState(false);
    const [touched, setTouched] = useState(false);
    const [imgFailed, setImgFailed] = useState(false);

    // reset every time it opens
    useEffect(() => {
        if (!show) return;
        setForm(toForm(item));
        setNewImage(null);
        setRemoveImage(false);
        setSaving(false);
        setTouched(false);
        setImgFailed(false);
    }, [show, item]);

    // preview of the newly chosen file
    useEffect(() => {
        if (!newImage) { setPreviewUrl(""); return; }
        const url = URL.createObjectURL(newImage);
        setPreviewUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [newImage]);

    // Esc closes
    useEffect(() => {
        if (!show) return;
        const onKey = (e) => { if (e.key === "Escape" && !saving) onClose?.(); };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [show, saving, onClose]);

    const original = useMemo(() => toForm(item), [item]);
    const oldImage = item?.ItemImage || "";
    const imageChanged = !!newImage || (removeImage && !!oldImage);
    const changed =
        imageChanged ||
        Object.keys(form).some(k => String(form[k]).trim() !== String(original[k]).trim());

    const errors = {
        ItemCode: !form.ItemCode.trim() ? "Item code is required" : "",
        ItemName: !form.ItemName.trim() ? "Item name is required" : ""
    };
    const hasErrors = Object.values(errors).some(Boolean);

    if (!show) return null;

    const set = (key) => (e) => {
        let v = e.target.value;
        if (key === "ItemCode" || key === "PartNO") v = v.toUpperCase();
        // Item name / Description: first letter capital by default (rest as typed)
        if (key === "ItemName" || key === "Description") v = capFirst(v);
        setForm(f => ({ ...f, [key]: v }));
    };

    const pickImage = (e) => {
        const f = e.target.files?.[0];
        e.target.value = "";
        if (!f) return;
        if (!f.type.startsWith("image/")) {
            Swal.fire("Warning", "Please choose an image file", "warning");
            return;
        }
        if (f.size > MAX_IMAGE_SIZE) {
            Swal.fire("Warning", "Image must be 5 MB or smaller", "warning");
            return;
        }
        setNewImage(f);
        setRemoveImage(false);
    };

    const clearImage = () => {
        if (newImage) { setNewImage(null); return; }   // undo the new pick first
        setRemoveImage(true);
    };

    const shownImage = previewUrl || (!removeImage && oldImage ? imageUrl(oldImage) : "");
    const showBroken = !previewUrl && imgFailed && !!shownImage;

    const handleSave = async () => {
        setTouched(true);
        if (hasErrors || saving) return;
        if (isEdit && !changed) { onClose?.(); return; }

        const itemsJson = {
            ...(isEdit ? { ItemId: Number(item.ItemId) } : {}),
            ItemCode: form.ItemCode.trim(),
            ItemName: capFirst(form.ItemName.trim()),
            Description: capFirst(form.Description.trim()),
            PartNO: form.PartNO.trim(),
            // keep the current image name when it is not replaced / removed
            ItemImage: isEdit && !imageChanged ? oldImage : "",
            IsActive: item?.IsActive ?? true
        };

        const fd = new FormData();
        fd.append("OrgId", orgId);
        fd.append("UserId", userId);
        fd.append("Action", isEdit ? "EDIT" : "ADD");
        fd.append("ItemsJson", JSON.stringify(itemsJson));
        if (newImage) fd.append("ItemImage", newImage);
        if (isEdit && imageChanged && oldImage) fd.append("DeleteFile", oldImage);

        setSaving(true);
        try {
            const res = await manageItems(fd);
            const ok =
                (res?.status === 200 && String(res?.result).toLowerCase() === "success") ||
                res?.success === true;

            // some services return the message inside data.result[0]
            const inner = Array.isArray(res?.data?.result) ? res.data.result[0] : null;
            const message = res?.response || inner?.Message || res?.message;

            if (ok) {
                Swal.fire({
                    icon: "success",
                    title: isEdit ? "Item updated" : "Item added",
                    text: message || `${itemsJson.ItemName} saved.`,
                    timer: 1800,
                    showConfirmButton: false
                });
                onClose?.();
                await onSaved?.();
            } else {
                Swal.fire("Error", message || "Unable to save item", "error");
            }
        } catch (err) {
            console.error("ManageItems Error:", err);
            Swal.fire("Error", err?.message || "Failed to save item", "error");
        } finally {
            setSaving(false);
        }
    };

    const fieldClass = (key) => `if-input ${touched && errors[key] ? "invalid" : ""}`;

    return (
        <div className="ir-page if-root">
            <div className="ir-modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget && !saving) onClose?.(); }}>
                <div className="ir-modal if-modal" role="dialog" aria-modal="true" aria-label={isEdit ? "Edit item" : "Add item"}>
                    <div className="ir-modal-head">
                        <div>
                            <div className="ir-modal-title">{isEdit ? "Edit item" : "Add item"}</div>
                            <div className="ir-modal-sub">
                                {isEdit ? `${item.ItemCode} · ${item.ItemName}` : "Enter the item details. Image is optional."}
                            </div>
                        </div>
                        <button type="button" className="ir-modal-close" disabled={saving} onClick={onClose} title="Close">
                            <i className="fa-solid fa-xmark" />
                        </button>
                    </div>

                    <div className="ir-modal-body">
                        <div className="if-grid">
                            {/* IMAGE */}
                            <div className="if-image-col">
                                <span className="if-label">Image</span>
                                <input ref={fileRef} type="file" accept="image/*" hidden onChange={pickImage} />
                                <button type="button" className="if-image" disabled={saving} onClick={() => fileRef.current?.click()} title="Choose image">
                                    {showBroken ? (
                                        <span className="if-image-empty">
                                            <i className="fa-regular fa-image" />
                                            <small>Image not available</small>
                                        </span>
                                    ) : shownImage ? (
                                        <img src={shownImage} alt="" onError={() => setImgFailed(true)} />
                                    ) : (
                                        <span className="if-image-empty">
                                            <i className="fa-regular fa-image" />
                                            <small>Add image</small>
                                        </span>
                                    )}
                                </button>
                                <div className="if-image-actions">
                                    <button type="button" className="if-link" disabled={saving} onClick={() => fileRef.current?.click()}>
                                        {shownImage ? "Change" : "Choose"}
                                    </button>
                                    {shownImage && (
                                        <button type="button" className="if-link danger" disabled={saving} onClick={clearImage}>
                                            {newImage && oldImage && !removeImage ? "Undo" : "Remove"}
                                        </button>
                                    )}
                                </div>
                                {isEdit && newImage && <small className="if-note">Replaces the current image</small>}
                                {isEdit && removeImage && !newImage && oldImage && <small className="if-note">Image will be removed</small>}
                            </div>

                            {/* FIELDS */}
                            <div className="if-fields">
                                <div className="if-row">
                                    <label className="if-field">
                                        <span className="if-label">Item code <em>*</em></span>
                                        <input className={fieldClass("ItemCode")} value={form.ItemCode} onChange={set("ItemCode")} disabled={saving} placeholder="e.g. CWIOTS0018" maxLength={50} />
                                        {touched && errors.ItemCode && <small className="if-error">{errors.ItemCode}</small>}
                                    </label>
                                    <label className="if-field">
                                        <span className="if-label">Part no.</span>
                                        <input className="if-input" value={form.PartNO} onChange={set("PartNO")} disabled={saving} placeholder="e.g. BUS-0014" maxLength={50} />
                                    </label>
                                </div>

                                <label className="if-field">
                                    <span className="if-label">Item name <em>*</em></span>
                                    <input className={fieldClass("ItemName")} value={form.ItemName} onChange={set("ItemName")} autoCapitalize="sentences" disabled={saving} placeholder="e.g. Hydraulic Pump" maxLength={150} />
                                    {touched && errors.ItemName && <small className="if-error">{errors.ItemName}</small>}
                                </label>

                                <label className="if-field">
                                    <span className="if-label">Description</span>
                                    <textarea className="if-input" rows={3} value={form.Description} onChange={set("Description")} autoCapitalize="sentences" disabled={saving} placeholder="Short description" maxLength={500} />
                                </label>
                            </div>
                        </div>
                    </div>

                    <div className="ir-modal-foot">
                        <button type="button" className="ir-btn-ghost" disabled={saving} onClick={onClose}>Cancel</button>
                        <button
                            type="button"
                            className="ir-btn-soft if-submit"
                            disabled={saving || (isEdit && !changed)}
                            onClick={handleSave}
                            title={isEdit && !changed ? "Nothing changed" : ""}
                        >
                            {saving
                                ? <><span className="spinner-border spinner-border-sm" /> Saving…</>
                                : <><i className="fa-solid fa-check" /> {isEdit ? "Save changes" : "Add item"}</>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ItemFormModal;