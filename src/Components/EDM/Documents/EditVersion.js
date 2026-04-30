import React, { useEffect, useState } from "react";
import { BASE_DOC_UPLOAD, BASE_IMG_DOC_DELETE } from "../../Config/Config";
import Swal from 'sweetalert2';
import PropTypes from "prop-types";
import { fetchWithAuth } from "../../../utils/api";
import { Upload, Tooltip } from "antd";
import { formatToDDMMYYYY } from "../../../utils/dateFunc";
import { InboxOutlined } from "@ant-design/icons";


export default function EditDocVersion({ editObj }) {

    const [sessionUserData, setsessionUserData] = useState({});
    const [sessionModuleId, setSessionModuleId] = useState(null);
    const [editSubmitLoading, setEditSubmitLoading] = useState(false);
    const [existingDoc, setExistingDoc] = useState(editObj?.DocUrl || null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploadLoading, setUploadLoading] = useState(false);
    const [fileList, setFileList] = useState([]);
    const [isExpiry, setIsExpiry] = useState(false);
    const [deletedFilePath, setDeletedFilePath] = useState(null);
    const [alertData, setAlertData] = useState([]);
    const { Dragger } = Upload;


    useEffect(() => {
        const userDataString = sessionStorage.getItem("userData");
        if (userDataString) {
            const userData = JSON.parse(userDataString);
            setsessionUserData(userData);
        }
        const storedModule = JSON.parse(localStorage.getItem("ModuleData"));
        const moduleId = storedModule?.Id?.toString();
        setSessionModuleId(moduleId);
    }, []);

    const [formData, setFormData] = useState({
        Comments: null,
        FilePath: "",
        ExpiryDate: "",
    });

    useEffect(() => {
        if (editObj) {
            const formattedDate = editObj?.ExpiryDate
                ? editObj.ExpiryDate.split('T')[0]
                : "";

            setFormData({
                Comments: editObj?.Comments || "",
                ExpiryDate: formattedDate,
            });
            setExistingDoc(editObj?.FilePath);

            if (editObj?.ExpiryDate) {
                setIsExpiry(true);
            }
        }
    }, [editObj]);

    const draggerProps = {
        name: 'file',
        multiple: false, // Set to true if you want more than one file
        fileList: fileList, // Links the UI to your state
        onRemove: (file) => {
            setFileList([]); // Clears the list when user clicks delete
        },
        beforeUpload: (file) => {
            setFileList([file]);
            return false;
        },
    };

    const handleDeleteDocument = async (filename) => {
        const storedModule = JSON.parse(localStorage.getItem("ModuleData"));
        const moduleId = storedModule?.Id?.toString();

        setDeletedFilePath(filename);

        // 1. Confirm with the user
        const confirm = await Swal.fire({
            title: "Delete document?",
            text: "This action cannot be undone",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: `<i class="bi bi-check-lg text-white"></i> Yes, Delete`,
            confirmButtonColor: "#dc3545",
            cancelButtonText: `<i class="bi bi-x-lg text-white"></i> Cancel`,
        });

        if (!confirm.isConfirmed) return;

        try {
            // 2. Fetch the AddLog service first
            const logPayload = {
                TicketId: 0,
                Status: editObj?.VersionStatus, // Or use a status from your item/formData
                Logs: `Document deleted: ${filename}`,
                LogDate: new Date().toISOString().slice(0, 19).replace("T", " "),
                ChangedBy: sessionUserData?.Id,
                ModuleId: moduleId,
                EntityId: editObj?.Id || 0, // Ensure you pass the relevant ID
                EntityType: "Documents",
            };

            const logResponse = await fetchWithAuth(`Portal/AddLogs`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(logPayload),
            });

            const logResult = await logResponse.json();

            // 3. Proceed to Delete Service ONLY if Log was successful
            if (logResponse.ok && logResult?.ResultData?.Status === "Success") {
                const res = await fetch(`${BASE_IMG_DOC_DELETE}`, {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        type: "Docs",
                        filename: filename,
                    }),
                });

                if (!res.ok) throw new Error("File deletion failed");

                // 4. Success UI updates
                Swal.fire("Deleted", "Document and logs updated successfully", "success");
                setExistingDoc(null);
                setSelectedFile(null);
                setFormData(prev => ({ ...prev, FilePath: "" }));
            } else {
                throw new Error("Failed to create audit log. Deletion aborted.");
            }

        } catch (error) {
            console.error("Delete Error:", error);
            Swal.fire("Error", error.message || "Failed to delete document", "error");
        }
    };


    const fetchAlertsData = async () => {
        try {
            const response = await fetchWithAuth(
                `EDM/GetAlertsByExpiry?VersionId=${editObj?.Id}&OrgId=${sessionUserData?.OrgId}`,
                {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                }
            );

            if (!response.ok) throw new Error("Network response was not ok");

            const data = await response.json();

            setAlertData(data.ResultData[0] || []);

        } catch (error) {
            console.error("Failed to fetch DDL data:", error);
            setAlertData([]);
        }
    };

    useEffect(() => {
        if (editObj && editObj?.Id) {
            fetchAlertsData();
        }
    }, [editObj?.Id]);

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        setEditSubmitLoading(true);

        // Validation
        const selectedFile = fileList.length > 0 ? fileList[0] : null;
        // if (!formData?.Comments) {
        //     Swal.fire({ title: "Warning", text: "Comments are mandatory.", icon: "warning" });
        //     setEditSubmitLoading(false);
        //     return;
        // }

        // Prepare JsonData
        const jsonData = {
            Comments: formData?.Comments,
            // FilePath: existingDoc, // Current file path (from state)
            InactiveFile: deletedFilePath || "", // The filename passed from handleDeleteDocument
            Status: editObj?.VersionStatus,
            VersionId: editObj?.Id,
            ExpiryDate: isExpiry ? formData?.ExpiryDate : null,
            ScheduledAlertId: alertData?.ScheduledAlertId,
        };

        const alertsJson = !isExpiry ? {
            Alert: {
                AlertTypeId: null,
                TableId: editObj?.Id || 0,
                ModuleId: sessionModuleId,
                AlertTitle: "Document Expiry Updated",
                Message: `Document ${editObj?.DocName} has a revised expiry: ${formData.ExpiryDate}`,
                OcurrenceType: 1,
                ToUsers: sessionUserData?.Email,
                StartDate: formData.ExpiryDate,
                EndDate: formData.ExpiryDate,
                IsMaintenance: 1,
            },
            ScheduledAlerts: [{ ScheduledDate: formData.ExpiryDate }]
        } : null;

        const formDataPayload = new FormData();
        formDataPayload.append("OrgId", sessionUserData?.OrgId);
        formDataPayload.append("UserId", sessionUserData?.Id);
        formDataPayload.append("Type", "EDITVERSION");
        formDataPayload.append("Priority", 1);
        formDataPayload.append("JsonData", JSON.stringify(jsonData));
        formDataPayload.append("AlertsJson", alertsJson ? JSON.stringify(alertsJson) : "");

        if (selectedFile) {
            formDataPayload.append("FilePath", selectedFile);
        }

        try {
            const response = await fetchWithAuth(`file_upload/DocRegCycle`, {
                method: "POST",
                body: formDataPayload,
            });

            const result = await response.json();

            if (result.data.result[0].ResponseCode === 2003) {
                Swal.fire({
                    title: "Success",
                    text: "Version has been updated successfully.",
                    icon: "success",
                }).then(() => window.location.reload());
            } else {
                Swal.fire({ title: "Error", text: "Update failed.", icon: "error" });
            }
        } catch (error) {
            console.error("Submission error:", error);
            Swal.fire({ title: "Error", text: "An unexpected error occurred.", icon: "error" });
        } finally {
            setEditSubmitLoading(false);
        }
    };

    const getFirstReminderDate = (dateString) => {
        if (!dateString) return "unselected";
        const date = new Date(dateString);
        date.setDate(date.getDate() - 15);
        const d = String(date.getDate()).padStart(2, '0');
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const y = date.getFullYear();

        return `${d}-${m}-${y}`;
    };

    const minDate = new Date(Date.now() + 86400000).toISOString().split("T")[0];

    const isCommentsUnchanged = formData.Comments === (editObj?.Comments || "");
    const isExpiryUnchanged = formData.ExpiryDate === (editObj?.ExpiryDate || "");
    const isFileUnchanged = (existingDoc === editObj?.FilePath) && (!formData.FilePath);
    const isUnchanged = isCommentsUnchanged && isFileUnchanged && isExpiryUnchanged;
    const isFileMissing = !existingDoc && !formData.FilePath;

    return (
        <div
            className="offcanvas offcanvas-end"
            tabIndex="-1"
            id="offcanvasRightEditDocVer"
            aria-labelledby="offcanvasRightLabel"
            style={{ width: "90%" }}
        >
            <style>
                {`
                    @media (min-width: 768px) { /* Medium devices and up (md) */
                        #offcanvasRightEditDocVer {
                            width: 45% !important;
                        }

                    }
                    .alert-warning {
                        border-left: 5px solid #ffc107 !important;
                    }
                `}
            </style>
            <form autoComplete="off" onSubmit={handleEditSubmit}>
                <div className="offcanvas-header d-flex justify-content-between align-items-center">
                    <h5 id="offcanvasRightLabel" className="mb-0">Edit Document Version</h5>
                    <div className="d-flex align-items-center">
                        <button
                            className={`btn btn-sm me-2 ${isUnchanged ? 'btn-secondary' : 'btn-primary'}`}
                            type="submit"
                            disabled={editSubmitLoading || isUnchanged || isFileMissing}
                        >
                            <i className="bi bi-bookmark-check me-1"></i>
                            {editSubmitLoading ? "Submitting..." : "Submit"}
                        </button>
                        <button
                            type="button"
                            className="btn-close"
                            data-bs-dismiss="offcanvas"
                            aria-label="Close"
                        ></button>
                    </div>
                </div>
                <div className="offcanvas-body" style={{
                    flex: 1,
                    overflowY: 'auto',
                    paddingBottom: '2rem',
                    maxHeight: 'calc(100vh - 100px)'
                }}>
                    <div className="row mb-3">
                        <div className="alert alert-warning d-flex align-items-center border-0 shadow-sm mb-4 mx-3" role="alert">
                            <i className="fa-solid fa-triangle-exclamation fa-beat-fade fs-4 me-3 text-danger"></i>
                            <div>
                                <span className="fw-bold d-block">Action Required:</span>
                                If you <span className="text-danger fw-bold">Delete</span> the current document, you must
                                <span className="text-primary fw-bold"> Upload a new one</span> and click the
                                <span className="text-success fw-bold"> Submit</span> button at the top to save your changes.
                            </div>
                        </div>
                        <div className="col-12 col-md-4 mb-2">
                            <div className="p-3 border rounded bg-light h-100">
                                <div className="text-muted small mb-1">
                                    <i className="fa-solid fa-code-branch me-1"></i>
                                    Document Version
                                </div>
                                <div className="fw-bold fs-6">
                                    v{editObj?.VersionNumber}
                                </div>
                            </div>
                        </div>
                        <div className="col-12 col-md-4 mb-2">
                            <div className="p-3 border rounded bg-light h-100">
                                <div className="text-muted small mb-1">
                                    <i className="fa-solid fa-calendar-days me-1"></i>
                                    Created On
                                </div>
                                <div className="fw-semibold">
                                    {formatToDDMMYYYY(editObj?.CreatedOn)}
                                </div>
                            </div>
                        </div>
                        <div className="col-12 col-md-4 mb-2">
                            <div className="p-3 border rounded bg-light h-100">
                                <div className="text-muted small mb-1">
                                    <i className="fa-solid fa-circle-info me-1"></i>
                                    Status
                                </div>
                                <span
                                    className={`badge px-3 py-2 fs-7 ${editObj?.VersionStatus === "APPROVED"
                                        ? "bg-success"
                                        : editObj?.VersionStatus === "REJECTED"
                                            ? "bg-danger"
                                            : editObj?.VersionStatus === "DRAFT"
                                                ? "bg-warning text-dark"
                                                : "bg-info"
                                        }`}
                                >
                                    {editObj?.VersionStatus}
                                </span>
                            </div>
                        </div>
                        <div className="mt-3 col-12 col-md-4">
                            <label className="form-label fw-semibold">
                                <Tooltip title="If you change the expiry date, the alert date will also be updated accordingly.">
                                    <i className="bi bi-info-circle me-1 text-danger" style={{ cursor: 'help', fontSize: '0.85rem' }}></i>
                                </Tooltip>
                                Expiry Date<span className="text-danger">*</span>
                            </label>
                            <input
                                type="date"
                                className="form-control"
                                value={formData.ExpiryDate}
                                onChange={(e) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        ExpiryDate: e.target.value,
                                    }))
                                }
                                min={minDate}
                            />
                        </div>
                        <div className="mt-3">
                            <label className="form-label fw-semibold">
                                Comments
                            </label>
                            <textarea
                                className="form-control"
                                rows={3}
                                placeholder="Add comments (optional)"
                                value={formData.Comments}
                                onChange={(e) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        Comments: e.target.value,
                                    }))
                                }
                            />
                        </div>
                    </div>
                    {existingDoc && (
                        <div className="d-flex align-items-center justify-content-between border rounded p-3 my-3 bg-light">
                            <div className="d-flex align-items-center gap-2">
                                <i className="bi bi-file-earmark-pdf fs-3 text-danger"></i>
                                <span className="fw-semibold text-truncate" style={{ maxWidth: 200 }}>
                                    {existingDoc}
                                </span>
                            </div>

                            <button
                                type="button"
                                className="btn btn-icon btn-light-danger btn-sm rounded-circle border border-danger shadow"
                                onClick={() => handleDeleteDocument(existingDoc)}
                            >
                                <i className="fa-solid fa-trash"></i>
                            </button>
                        </div>
                    )}

                    {!existingDoc && (
                        <div className="border rounded p-3 mb-3 bg-white shadow-sm">
                            <label className="form-label fw-semibold">
                                Upload New Document
                            </label>
                            <Dragger
                                {...draggerProps}
                                disabled={uploadLoading}
                                accept=".pdf, .doc, .docx, .xls, .xlsx"
                                style={{
                                    minHeight: "90px",
                                    padding: "5px",
                                    borderRadius: "10px",
                                    background: "#fafafa",
                                }}
                            >
                                <div style={{ marginTop: "-10px" }}>
                                    <p
                                        className="ant-upload-drag-icon"
                                        style={{ marginBottom: "2px" }}
                                    >
                                        <InboxOutlined style={{ fontSize: "22px" }} />
                                    </p>
                                    <p
                                        className="ant-upload-text"
                                        style={{ marginBottom: "0px", fontSize: "12px", lineHeight: "14px" }}
                                    >
                                        Click or drag file here to upload
                                    </p>
                                    <p
                                        className="ant-upload-hint"
                                        style={{ marginBottom: "0px", fontSize: "11px", lineHeight: "13px" }}
                                    >
                                        Supports Excel, Docx, PDF.
                                    </p>
                                </div>
                            </Dragger>
                        </div>
                    )}

                    <div className="my-4 animate__animated animate__fadeIn shadow-sm">
                        <div className="card border-1 shadow-sm p-2 border border-danger">
                            <div className="d-flex align-items-center gap-2 mb-3">
                                <div className="bg-primary bg-opacity-10 text-primary rounded p-2 d-flex align-items-center justify-content-center">
                                    <i className="bi bi-clock-history animate-spin-slow"></i>
                                </div>
                                <div>
                                    <div className="fw-semibold">Expiry & Notification</div>
                                    <small className="text-muted">Configure expiry alert</small>
                                </div>
                                <span className="badge badge-light-info border border-info fw-bold shadow ms-auto">
                                    {alertData?.AutoIncNo}
                                </span>
                            </div>
                            <div className="row mb-3">
                                <div className="col-md-6 col-12">
                                    <label className="form-label small fw-semibold">
                                        Expiry Date <span className="text-danger">*</span>
                                    </label>
                                    <div className="input-group">
                                        <span className="input-group-text bg-white">
                                            <i className="bi bi-calendar-event text-primary"></i>
                                        </span>
                                        <input
                                            type="date"
                                            name="ExpiryDate"
                                            className="form-control form-control-sm"
                                            value={formData.ExpiryDate}
                                            // onChange={(e) => setFormData({ ...formData, ExpiryDate: e.target.value })}
                                            disabled
                                        />
                                    </div>
                                </div>
                                {/* <div className="col-md-6 col-12">
                                    <label className="form-label small fw-semibold">
                                        Alert Type <span className="text-danger">*</span>
                                    </label>
                                    <input
                                            type="text"
                                            className="form-control form-control-sm"
                                            value={alertData?.TypeName}
                                            disabled
                                        />
                                </div> */}
                            </div>
                            <div className="border rounded p-2 bg-light">
                                <div className="d-flex justify-content-between align-items-center mb-2">
                                    <span className="badge bg-white text-dark border">
                                        <i className="bi bi-megaphone me-1 text-warning"></i>
                                        Preview
                                    </span>
                                    <small className="badge badge-light-primary"><i className="bi bi-arrow-repeat text-primary me-1"></i> Once</small>
                                </div>
                                <div className="bg-white border-start border-3 border-primary rounded p-2 small">
                                    <div className="d-flex gap-2">
                                        <i className="bi bi-info-circle-fill text-primary mt-1"></i>
                                        <div>
                                            Document
                                            <span className="fw-semibold text-primary">
                                                {" "}{editObj.DocName || "..."}{" "}
                                            </span>
                                            expires on
                                            <span className="text-danger fw-semibold">
                                                {" "}
                                                {formData.ExpiryDate
                                                    ? formData.ExpiryDate.split('-').reverse().join('-')
                                                    : "unselected"}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="border-top mt-2 pt-1 text-muted small">
                                        <i className="bi bi-person-check me-1"></i>
                                        Notify: {sessionUserData?.Email}
                                    </div>
                                </div>
                            </div>
                            <div className="text-danger fw-bold mt-1" style={{ fontSize: "11px" }}>
                                <i className="fa-solid fa-bell fa-shake me-1"></i>
                                The first reminder is scheduled for {getFirstReminderDate(formData.ExpiryDate)}
                            </div>
                        </div>
                    </div>
                </div>
            </form>

        </div>
    );
}

EditDocVersion.propTypes = {
    editObj: PropTypes.object.isRequired,
};