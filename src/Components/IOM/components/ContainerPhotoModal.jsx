import React, { useEffect, useRef, useState } from "react";
import Swal from "sweetalert2";
import CameraCapture from "./CameraCapture";
import { manageInwards } from "../services/services";

// Max photo size (10 MB)
const MAX_PHOTO_SIZE = 10 * 1024 * 1024;

/**
 * Security – container / vehicle photo (same flow as Inward security upload).
 * POST file_upload/ManageInwards (FormData)
 *   OrgId, Action = "UPDATE_IMAGE",
 *   InwardRecordJson = { Id, UserId, IsOutward }, ItemsJson = "null", UnitsJson = "null", DocFile
 *
 * <ContainerPhotoModal
 *     record={row}            // { Id, InwardRecordNo, VehicleNumber }  – null = closed
 *     isOutward               // 1 for outwards, 0 for inwards
 *     orgId={...} userId={...}
 *     title="Verify outward"
 *     onClose={() => ...}
 *     onUploaded={() => ...}  // refresh the list
 * />
 */
const ContainerPhotoModal = ({ record, isOutward = false, orgId, userId, title, subtitle, onClose, onUploaded }) => {
    const fileInputRef = useRef(null);
    const cameraInputRef = useRef(null);   // phone camera fallback (<input capture>)

    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState("");
    const [cameraOn, setCameraOn] = useState(false);
    const [uploading, setUploading] = useState(false);

    // reset when a new record opens
    useEffect(() => {
        setSelectedFile(null);
        setCameraOn(false);
        setUploading(false);
    }, [record?.Id]);

    // preview URL for the chosen photo
    useEffect(() => {
        if (!selectedFile) { setPreviewUrl(""); return; }
        const url = URL.createObjectURL(selectedFile);
        setPreviewUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [selectedFile]);

    const close = () => {
        if (uploading) return;
        setCameraOn(false);
        setSelectedFile(null);
        onClose?.();
    };

    // Esc closes
    useEffect(() => {
        if (!record) return;
        const onKey = (e) => { if (e.key === "Escape") close(); };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    });

    // Live camera not available (http / permission) -> phone camera via <input capture>
    const handleCameraUnavailable = (message) => {
        setCameraOn(false);
        Swal.fire({
            toast: true, position: "top", icon: "info", title: message,
            timer: 2500, showConfirmButton: false
        });
        setTimeout(() => cameraInputRef.current?.click(), 150);
    };

    // one photo (image only, max 10 MB)
    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file) return;
        if (!file.type.startsWith("image/")) {
            Swal.fire("Warning", "Please choose an image file", "warning");
            return;
        }
        if (file.size > MAX_PHOTO_SIZE) {
            Swal.fire("Warning", "Photo must be 10 MB or smaller", "warning");
            return;
        }
        setSelectedFile(file);
    };

    const handleSubmit = async () => {
        if (!record?.Id) return;
        if (!selectedFile) {
            Swal.fire("Warning", "Please choose a photo", "warning");
            return;
        }

        const formData = new FormData();
        formData.append("OrgId", orgId);
        formData.append("Action", "UPDATE_IMAGE");
        formData.append("InwardRecordJson", JSON.stringify({
            Id: Number(record.Id),
            UserId: Number(userId),
            IsOutward: isOutward ? 1 : 0,
            NotifyId: 0
        }));
        formData.append("ItemsJson", "null");
        formData.append("UnitsJson", "null");
        formData.append("DocFile", selectedFile);

        setUploading(true);
        try {
            const response = await manageInwards(formData);
            const success =
                (response?.status === 200 && String(response?.result).toLowerCase() === "success") ||
                response?.success === true;

            if (success) {
                Swal.fire({
                    icon: "success",
                    title: isOutward ? "Outward verified" : "Photo uploaded",
                    text: response?.response || response?.message || `Photo uploaded for ${record.InwardRecordNo}.`,
                    timer: 2000,
                    showConfirmButton: false
                });
                setSelectedFile(null);
                setUploading(false);
                onClose?.();
                await onUploaded?.();
            } else {
                Swal.fire("Error", response?.response || response?.message || "Unable to upload photo", "error");
            }
        } catch (error) {
            console.error("Upload Photo Error:", error);
            Swal.fire("Error", error?.serverMessage || "Failed to upload photo", "error");
        } finally {
            setUploading(false);
        }
    };

    if (!record) return null;

    return (
        <div className={`ir-modal-overlay ${isOutward ? "ow-theme" : ""}`} onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}>
            <div className="ir-modal" role="dialog" aria-modal="true">
                <div className="ir-modal-head">
                    <div>
                        <div className="ir-modal-title">{title || "Upload container photo"}</div>
                        <div className="ir-modal-sub">
                            {subtitle || `${record.InwardRecordNo || ""} · ${record.VehicleNumber || "-"}`}
                        </div>
                    </div>
                    <button type="button" className="ir-modal-close" disabled={uploading} onClick={close} title="Close">
                        <i className="fa-solid fa-xmark" />
                    </button>
                </div>

                <div className="ir-modal-body">
                    {/* gallery / files */}
                    <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleFileChange} />
                    {/* phone camera (fallback when live camera can't open) */}
                    <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" hidden onChange={handleFileChange} />

                    {cameraOn ? (
                        <CameraCapture
                            onCapture={(file) => { setSelectedFile(file); setCameraOn(false); }}
                            onCancel={() => setCameraOn(false)}
                            onUnavailable={handleCameraUnavailable}
                        />
                    ) : selectedFile ? (
                        <div className="ir-preview-big">
                            {previewUrl && <img src={previewUrl} alt={selectedFile.name} />}
                            <div className="ir-preview-meta">
                                <div style={{ minWidth: 0 }}>
                                    <div className="ir-preview-name" title={selectedFile.name}>{selectedFile.name}</div>
                                    <div className="ir-preview-size">
                                        {selectedFile.size >= 1048576
                                            ? `${(selectedFile.size / 1048576).toFixed(1)} MB`
                                            : `${Math.max(1, Math.round(selectedFile.size / 1024))} KB`}
                                    </div>
                                </div>
                                <div className="d-flex gap-2">
                                    <button type="button" className="ir-btn-ghost ir-btn-sm" disabled={uploading} onClick={() => setCameraOn(true)}>
                                        <i className="fa-solid fa-camera" /> Retake
                                    </button>
                                    <button type="button" className="ir-btn-ghost ir-btn-sm" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
                                        <i className="fa-regular fa-image" /> Change
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="ir-photo-options">
                            <button type="button" className="ir-photo-option primary" onClick={() => setCameraOn(true)}>
                                <span className="ir-photo-option-icon"><i className="fa-solid fa-camera" /></span>
                                <b>Open camera</b>
                                <small>Capture the {isOutward ? "loaded vehicle" : "container / vehicle"} now</small>
                            </button>
                            <button type="button" className="ir-photo-option" onClick={() => fileInputRef.current?.click()}>
                                <span className="ir-photo-option-icon"><i className="fa-regular fa-image" /></span>
                                <b>Choose photo</b>
                                <small>From gallery or files · up to 10 MB</small>
                            </button>
                        </div>
                    )}
                </div>

                <div className="ir-modal-foot">
                    <button type="button" className="ir-btn-ghost" disabled={uploading} onClick={close}>
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="ir-btn-soft"
                        disabled={uploading || !selectedFile || cameraOn}
                        onClick={handleSubmit}
                    >
                        {uploading
                            ? <><span className="spinner-border spinner-border-sm" /> Uploading...</>
                            : <><i className="fa-solid fa-cloud-arrow-up" /> Submit</>}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ContainerPhotoModal;