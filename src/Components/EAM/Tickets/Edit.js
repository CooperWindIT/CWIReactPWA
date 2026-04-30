import React, { useEffect, useState } from "react";
import Swal from 'sweetalert2';
import { BASE_IMAGE_API_GET, BASE_IMG_DOC_DELETE, BASE_IMG_UPLOAD } from "../../Config/Config";
import PropTypes from 'prop-types'
import { fetchWithAuth } from "../../../utils/api";

export default function EditTicket({ editTicketId, onClose }) {

    const [sessionUserData, setsessionUserData] = useState({});
    const [addSubmitLoading, setAddSubmitLoading] = useState(false);
    const [issues, setIssues] = useState([]);
    const [previewImage, setPreviewImage] = useState(null);
    const [ticketDetails, setTicketDetails] = useState({});

    const [formData, setFormData] = useState({
        OrgId: "",
        TicketId: "",
        IssueType: "",
        TicketCode: "",
        Status: "MODIFIED",
        Priority: "",
        UpdatedBy: "",
        Description: "",
        ImageUrl: "",
        DueDate: "",
    });

    useEffect(() => {
        const userDataString = sessionStorage.getItem("userData");
        if (userDataString) {
            const userData = JSON.parse(userDataString);
            setsessionUserData(userData);
            setFormData((prev) => ({
                ...prev,
                UpdatedBy: userData.Id,
                OrgId: userData.OrgId,
            }));
        }
    }, []);

    useEffect(() => {
        if (ticketDetails) {
            setFormData({
                TicketId: ticketDetails.Id,
                MachineId: ticketDetails.MachineId || "",
                TicketCode: ticketDetails.TicketCode || "",
                IssueType: ticketDetails.IssueType || "",
                Priority: ticketDetails.Priority,
                UpdatedBy: sessionUserData.Id,
                MachineStatus: ticketDetails?.MachineStatus,
                ImageUrl: ticketDetails?.ImageUrl,
                DueDate: ticketDetails?.DueDate,
            });
        }
    }, [ticketDetails, sessionUserData.Id]);

    useEffect(() => {
        if (ticketDetails?.Description) {
            const parts = ticketDetails.Description.split("||").map(i => i.trim()).filter(Boolean);
            setFormData(prev => ({
                ...prev,
                Description: parts[0] || "", // main issue
            }));
            setIssues(parts.slice(1)); // additional issues only
        }
    }, [ticketDetails]);

    const fetchticketDetails = async () => {
        try {
            const response = await fetchWithAuth(`PMMS/GetTicketsBYId?TicketId=${editTicketId}&OrgId=${sessionUserData?.OrgId}`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });
            if (response.ok) {
                const data = await response.json();
                setTicketDetails(data.ResultData[0]);
            } else {
                setTicketDetails([]);
                console.error('Failed to fetch mcn tickets data:', response.statusText);
            }
        } catch (error) {
            setTicketDetails([]);
            console.error('Error fetching mcn tickets data:', error.message);
        }
    };

    useEffect(() => {
        if (editTicketId && sessionUserData?.OrgId) {
            fetchticketDetails();
        }
    }, [editTicketId, sessionUserData?.OrgId]);

    const handleInputChange = (eOrValue, nameFromSelect = null) => {
        if (nameFromSelect) {
            setFormData((prev) => ({
                ...prev,
                [nameFromSelect]: eOrValue || "",
            }));
            return;
        }

        const { name, value } = eOrValue.target;
        let formattedValue = value;

        // Custom logic for Description
        if (name === 'Description') {
            // Block leading space or special character
            if (/^[^a-zA-Z0-9]/.test(formattedValue)) return;

            // Capitalize only the first letter and after any dot
            formattedValue = capitalizeFirstAndAfterDot(formattedValue);
        }

        setFormData((prevState) => ({
            ...prevState,
            [name]: formattedValue,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setAddSubmitLoading(true);

        if (!formData.Priority) {
            Swal.fire({
                title: "warning",
                text: "All fileds are mandatory to raise an ticket.",
                icon: "warning",
            });
            setAddSubmitLoading(false);
            return;
        }

        const formDataPayload = new FormData();

        formDataPayload.append("OrgId", sessionUserData.OrgId);
        formDataPayload.append("Priority", formData.Priority);
        formDataPayload.append("TicketStatus", "MODIFIED");
        formDataPayload.append("UserId", sessionUserData.Id);
        formDataPayload.append("TicketId", formData.TicketId);
        formDataPayload.append("ImageUrl", formData.ImageUrl);
        // formDataPayload.append("CurrentStatus", ticketDetails?.Status);

        // const combinedDescription = [
        //     formData.Description, // main description
        //     ...issues.filter(Boolean) // extra ones
        // ].join(" || ");

        const jsonData = {
            MachineId: formData.MachineId,
            IssueType: formData.IssueType,
            MachineStatus: formData.MachineStatus,
            ImageUrl: formData.ImageUrl,
            DueDate: formData.DueDate,
            Description: formData.Description,
            CurrentStatus: ticketDetails?.Status,
        };

        formDataPayload.append("JsonData", JSON.stringify(jsonData));

        try {
            const response = await fetchWithAuth(`file_upload/TicketsWorkFlow`, {
                method: "POST",
                body: formDataPayload,
            });

            const result = await response.json();

            if (result?.success) {
                if (result.data.result[0].ResponseCode === 2002) {
                    Swal.fire({
                        title: "Success",
                        text: result.data.result[0].Logs || "Ticket has been updated successfully.",
                        icon: "success",
                    }).then(() => window.location.reload());
                }
            } else {
                Swal.fire({
                    title: "Error",
                    text: result?.ResultData?.ResultMessage || "Something went wrong.",
                    icon: "error",
                });
            }
        } catch (error) {
            console.error("Error during submission:", error.message);
            Swal.fire({
                title: "Error",
                text: "An unexpected error occurred.",
                icon: "error",
            });
        } finally {
            setAddSubmitLoading(false);
        }
    };

    const capitalizeFirstAndAfterDot = (str) => {
        return str.replace(/(^\w|(?<=\.\s*)\w)/g, (char) => char.toUpperCase());
    };

    const handleRemoveOldImage = async (filename) => {
        const confirmDelete = await Swal.fire({
            title: "Are you sure?",
            text: "This image will be permanently deleted.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Yes, delete it!",
        });

        if (confirmDelete.isConfirmed) {
            try {
                const res = await fetch(`${BASE_IMG_DOC_DELETE}`, {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ type: "image", filename }),
                });

                if (res.ok) {
                    const result = await res.json();
                    if (!result.success) throw new Error(result.message || "Failed to delete image");

                    // ✅ Remove only this filename from comma-separated list
                    setFormData((prev) => {
                        const updatedImages = prev.ImageUrl
                            .split(",")
                            .map((i) => i.trim())
                            .filter((i) => i !== filename);
                        return { ...prev, ImageUrl: updatedImages.length ? updatedImages.join(",") : null };
                    });

                    Swal.fire("Deleted!", "Image has been removed.", "success");
                } else {
                    Swal.fire("Error", "Failed to delete image", "error");
                }
            } catch (error) {
                Swal.fire("Error", error.message, "error");
            }
        }
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const confirmUpload = await Swal.fire({
            title: "Confirm Upload?",
            text: `Do you want to upload "${file.name}"?`,
            icon: "question",
            showCancelButton: true,
            confirmButtonText: "Yes, upload it!",
        });

        if (!confirmUpload.isConfirmed) return;

        try {
            const uploadData = new FormData();
            uploadData.append("ImageUrl", file);

            const res = await fetch(`${BASE_IMG_UPLOAD}`, {
                method: "POST",
                body: uploadData,
            });

            if (res.ok) {
                const result = await res.json();
                if (result.success) {
                    setFormData((prev) => {
                        const existing = prev.ImageUrl ? prev.ImageUrl.split(",").map(i => i.trim()) : [];
                        const updated = [...existing, result.data.filename];
                        return { ...prev, ImageUrl: updated.join(",") };
                    });

                    Swal.fire("Uploaded!", "Image uploaded successfully.", "success");
                } else {
                    Swal.fire("Error", "Failed to upload image", "error");
                }
            }
        } catch (err) {
            Swal.fire("Error", err.message, "error");
        }
    };

    return (
        <>
            {onClose && (
                <div
                    className="modal fade show"
                    style={{ display: "block", background: "rgba(0,0,0,0.5)" }}
                    tabIndex="-1"
                >
                    <div className="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
                        <div className="modal-content premium-ticket-modal">
                            <form autoComplete="off" onSubmit={handleSubmit} className="d-flex flex-column h-100">
                                <div className="modal-header premium-ticket-modal-header border-0">
                                    <div className="d-flex align-items-center gap-3">
                                        <div className="premium-ticket-modal-icon">
                                            <i className="fa-solid fa-pen-to-square"></i>
                                        </div>

                                        <div>
                                            <h5 id="editTicketModalLabel" className="mb-0 fw-bold text-dark">
                                                Edit Ticket
                                            </h5>
                                            <div className="small text-muted mt-1">
                                                Ticket Code:
                                                <span className="premium-ticket-code-mini ms-2">
                                                    {ticketDetails?.TicketCode}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="d-flex align-items-center">
                                        <button className="btn premium-submit-btn btn-sm me-2" type="submit" disabled={addSubmitLoading}>
                                            <i className="bi bi-bookmark-check me-1"></i>
                                            {addSubmitLoading ? "Submitting..." : "Submit"}
                                        </button>

                                        <button
                                            type="button"
                                            className="btn-close"
                                            data-bs-dismiss="modal"
                                            aria-label="Close"
                                            onClick={onClose}
                                            disabled={addSubmitLoading}
                                        ></button>
                                    </div>
                                </div>

                                <div
                                    className="modal-body premium-ticket-modal-body"
                                    style={{
                                        maxHeight: "75vh",
                                        overflowY: "auto",
                                        overflowX: "hidden",
                                    }}
                                >
                                    <div className="premium-form-card">
                                        <div className="premium-form-section-title">Ticket Information</div>

                                        <div className="row">
                                            <div className="col-12 col-md-6 mb-3">
                                                <label className="form-label">Asset Name</label>
                                                <input
                                                    type="text"
                                                    name="MachineName"
                                                    className="form-control form-control-sm premium-input cursor-not-allowed"
                                                    value={ticketDetails?.MachineName}
                                                    onChange={handleInputChange}
                                                    autoComplete="off"
                                                    readOnly
                                                    required
                                                />
                                            </div>

                                            <div className="col-12 col-md-6 mb-3">
                                                <label className="form-label">Issue Type<span className="text-danger">*</span></label>
                                                <input
                                                    type="text"
                                                    name="IssueType"
                                                    className="form-control form-control-sm premium-input"
                                                    value={formData.IssueType}
                                                    onChange={handleInputChange}
                                                    placeholder="Issue Type"
                                                    autoComplete="off"
                                                />
                                            </div>

                                            <div className="col-12 col-md-6 mb-3">
                                                <label className="form-label">Due Date<span className="text-danger">*</span></label>
                                                <input
                                                    type="date"
                                                    className="form-control form-control-sm premium-input"
                                                    value={formData.DueDate ? formData.DueDate.split("T")[0] : ""}
                                                    onChange={handleInputChange}
                                                    readOnly
                                                />
                                            </div>

                                            <div className="col-12 col-md-6 mb-3">
                                                <label className="form-label">Priority<span className="text-danger">*</span></label>
                                                <select
                                                    className="form-select form-select-sm premium-input"
                                                    name="Priority"
                                                    value={formData.Priority}
                                                    onChange={handleInputChange}
                                                    required
                                                    disabled
                                                >
                                                    <option>Choose Priority</option>
                                                    <option value="3">Low</option>
                                                    <option value="2">Medium</option>
                                                    <option value="1">High</option>
                                                </select>
                                            </div>

                                            <div className="col-12 col-md-6 mb-3">
                                                <label className="form-label">Status<span className="text-danger">*</span></label>
                                                <select
                                                    className="form-select form-select-sm premium-input"
                                                    name="MachineStatus"
                                                    value={formData.MachineStatus}
                                                    onChange={handleInputChange}
                                                    disabled
                                                    required
                                                >
                                                    <option>Choose Status</option>
                                                    <option value="OUTOFSERVICE">Out of service</option>
                                                    <option value="ACTIVE">ACTIVE</option>
                                                </select>
                                            </div>

                                            <div className="col-12 col-md-6 mb-3">
                                                <label className="form-label">Upload Image</label>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleFileChange}
                                                    className="form-control form-control-sm premium-input"
                                                />
                                            </div>

                                            <div className="col-12 mb-3">
                                                <label className="form-label">
                                                    Description <span className="text-danger">*</span>
                                                </label>
                                                <textarea
                                                    name="Description"
                                                    className="form-control form-control-sm premium-input"
                                                    placeholder="Enter description"
                                                    value={formData.Description}
                                                    onChange={handleInputChange}
                                                    autoComplete="off"
                                                    rows={5}
                                                // readOnly
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {formData?.ImageUrl && (
                                        <div className="premium-form-card mt-4">
                                            <div className="premium-form-section-title">Uploaded Images</div>

                                            <div className="d-flex flex-wrap gap-3 mt-3">
                                                {formData.ImageUrl.split(",").map((url, index) => (
                                                    <div
                                                        key={index}
                                                        className="premium-image-tile position-relative"
                                                    >
                                                        <img
                                                            src={`${BASE_IMAGE_API_GET}${url.trim()}`}
                                                            alt={`Uploaded ${index + 1}`}
                                                            className="img-fluid"
                                                        />

                                                        <button
                                                            type="button"
                                                            className="btn btn-sm premium-image-btn premium-image-btn-view position-absolute top-0 end-0 m-2 rounded-circle"
                                                            onClick={() => setPreviewImage(`${BASE_IMAGE_API_GET}${url.trim()}`)}
                                                        >
                                                            <i className="fa fa-eye"></i>
                                                        </button>

                                                        <button
                                                            type="button"
                                                            className="btn btn-sm premium-image-btn premium-image-btn-delete position-absolute top-0 start-0 m-2 rounded-circle"
                                                            onClick={() => handleRemoveOldImage(url.trim())}
                                                        >
                                                            <i className="fa fa-times"></i>
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </form>
                        </div>
                    </div>

                </div>
            )}

            {previewImage && (
                <div
                    className="modal fade show"
                    style={{ display: "block", backgroundColor: "rgba(0,0,0,0.6)" }}
                    onClick={() => setPreviewImage(null)}
                >
                    <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-content">
                            <div className="modal-body text-center">
                                <img
                                    src={previewImage}
                                    alt="Preview"
                                    className="img-fluid rounded"
                                    style={{ maxHeight: "80vh" }}
                                />
                            </div>
                            <div className="modal-footer justify-content-center">
                                <button className="btn btn-secondary btn-sm" onClick={() => setPreviewImage(null)}>
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style>
                {`
                    .premium-ticket-modal {
    border: 0;
    border-radius: 24px;
    overflow: hidden;
    background: linear-gradient(180deg, #ffffff, #f9fbff);
    box-shadow: 0 30px 70px rgba(15, 23, 42, 0.16);
}

.premium-ticket-modal-header {
    padding: 20px 24px;
    background:
        radial-gradient(circle at top right, rgba(59, 130, 246, 0.10), transparent 28%),
        linear-gradient(145deg, #ffffff, #f6faff);
    border-bottom: 1px solid rgba(15, 23, 42, 0.06);
}

.premium-ticket-modal-icon {
    width: 46px;
    height: 46px;
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(145deg, #2563eb, #0f766e);
    color: #fff;
    font-size: 18px;
    box-shadow: 0 14px 28px rgba(37, 99, 235, 0.20);
}

.premium-ticket-code-mini {
    display: inline-flex;
    align-items: center;
    padding: 5px 10px;
    border-radius: 999px;
    background: linear-gradient(145deg, #eef4ff, #dbeafe);
    color: #1d4ed8;
    font-size: 12px;
    font-weight: 800;
}

.premium-submit-btn {
    border: none !important;
    border-radius: 12px !important;
    background: linear-gradient(145deg, #2563eb, #0f766e) !important;
    color: #fff !important;
    padding: 8px 14px !important;
    font-weight: 700 !important;
    box-shadow: 0 12px 24px rgba(37, 99, 235, 0.16);
}

.premium-ticket-modal-body {
    padding: 22px 24px 24px;
    background: linear-gradient(180deg, #f9fbff 0%, #f4f8fd 100%);
}

.premium-form-card {
    background: rgba(255, 255, 255, 0.88);
    border: 1px solid rgba(15, 23, 42, 0.06);
    border-radius: 20px;
    padding: 18px;
    box-shadow: 0 14px 34px rgba(15, 23, 42, 0.06);
}

.premium-form-section-title {
    font-size: 14px;
    font-weight: 800;
    letter-spacing: 0.03em;
    text-transform: uppercase;
    color: #334155;
    margin-bottom: 16px;
}

.premium-input {
    border-radius: 12px !important;
    border: 1px solid #dbe4f0 !important;
    background: #fdfefe !important;
    min-height: 40px;
    box-shadow: none !important;
}

.premium-input:focus {
    border-color: #93c5fd !important;
    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.10) !important;
}

.premium-image-tile {
    width: 130px;
    height: 130px;
    border-radius: 16px;
    overflow: hidden;
    background: #fff;
    border: 1px solid rgba(15, 23, 42, 0.08);
    box-shadow: 0 12px 26px rgba(15, 23, 42, 0.10);
}

.premium-image-tile img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.premium-image-btn {
    width: 30px;
    height: 30px;
    padding: 0 !important;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none !important;
}

.premium-image-btn-view {
    background: #eff6ff !important;
    color: #2563eb !important;
}

.premium-image-btn-delete {
    background: #fff1f2 !important;
    color: #dc2626 !important;
}

                `}
            </style>
        </>
    );

}

EditTicket.propTypes = {
    editTicketId: PropTypes.number.isRequired,
    onClose: PropTypes.func.isRequired,
};