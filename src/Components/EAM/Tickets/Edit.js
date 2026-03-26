import React, { useEffect, useState } from "react";
import Swal from 'sweetalert2';
import { BASE_IMAGE_API_GET, BASE_IMAGE_UPLOAD_API } from "../../Config/Config";
import PropTypes from 'prop-types'
import { fetchWithAuth } from "../../../utils/api";

export default function EditTicket({ editObj }) {

    const [sessionUserData, setsessionUserData] = useState({});
    const [addSubmitLoading, setAddSubmitLoading] = useState(false);
    const [issues, setIssues] = useState([]);
    const [previewImage, setPreviewImage] = useState(null);

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
        if (editObj) {
            setFormData({
                TicketId: editObj.Id,
                MachineId: editObj.MachineId || "",
                TicketCode: editObj.TicketCode || "",
                IssueType: editObj.IssueType || "",
                Priority: editObj.Priority,
                UpdatedBy: sessionUserData.Id,
                MachineStatus: editObj?.MachineStatus,
                ImageUrl: editObj?.ImageUrl,
                DueDate: editObj?.DueDate,
            });
        }
    }, [editObj, sessionUserData.Id]);

    useEffect(() => {
        if (editObj?.Description) {
            const parts = editObj.Description.split("||").map(i => i.trim()).filter(Boolean);
            setFormData(prev => ({
                ...prev,
                Description: parts[0] || "", // main issue
            }));
            setIssues(parts.slice(1)); // additional issues only
        }
    }, [editObj]);


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
        // formDataPayload.append("CurrentStatus", editObj?.Status);

        const combinedDescription = [
            formData.Description, // main description
            ...issues.filter(Boolean) // extra ones
        ].join(" || ");

        const jsonData = {
            MachineId: formData.MachineId,
            IssueType: formData.IssueType,
            MachineStatus: formData.MachineStatus,
            ImageUrl: formData.ImageUrl,
            DueDate: formData.DueDate,
            Description: combinedDescription,
            CurrentStatus: editObj?.Status,
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
                const res = await fetch(`${BASE_IMAGE_UPLOAD_API}Fileupload/delete`, {
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

            const res = await fetch(`${BASE_IMAGE_UPLOAD_API}Fileupload/image`, {
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
        <div
            className="offcanvas offcanvas-end"
            tabIndex="-1"
            id="offcanvasRightEdit"
            aria-labelledby="offcanvasRightLabel"
            style={{ width: "90%" }}
        >
            <style>
                {`
                    @media (min-width: 768px) { /* Medium devices and up (md) */
                        #offcanvasRightEdit {
                            width: 50% !important;
                        }import { PropTypes } from 'prop-types';

                    }
                `}
            </style>
            <form autoComplete="off" onSubmit={handleSubmit}>
                <div className="offcanvas-header d-flex justify-content-between align-items-center">
                    <h5 id="offcanvasRightLabel" className="mb-0">Edit Ticket <span className="text-bold text-primary">({editObj?.TicketCode})</span></h5>
                    <div className="d-flex align-items-center">
                        <button className="btn btn-primary btn-sm me-2" type="submit" disabled={addSubmitLoading}>
                        <i className="bi bi-bookmark-check"></i>{addSubmitLoading ? "Submitting..." : "Submit"}
                        </button>
                        <button
                            type="button"
                            className="btn-close"
                            data-bs-dismiss="offcanvas"
                            aria-label="Close"
                        ></button>
                    </div>
                </div>
                <div className="offcanvas-body" style={{ marginTop: "-2rem", maxHeight: "calc(100vh - 4rem)", overflowY: "auto" }}>
                    <div className="row">
                        <div className="col-12 col-md-6 mb-2">
                            <label className="form-label">Asset Name</label>
                            <input
                                type="text"
                                name="MachineName"
                                className="form-control cursor-not-allowed"
                                placeholder="Enter asset name"
                                value={editObj?.MachineName}
                                onChange={handleInputChange}
                                autoComplete="off"
                                readOnly
                                required
                            />
                        </div>
                        <div className="col-12 col-md-6 mb-2">
                            <label className="form-label">Issue Type<span className="text-danger">*</span></label>
                            <input
                                type="text"
                                name="IssueType"
                                className="form-control"
                                value={formData.IssueType}
                                onChange={handleInputChange}
                                placeholder="Issue Type"
                                autoComplete="off"
                                reaquired
                            />
                        </div>
                        <div className="col-6 mb-2">
                            <label className="form-label">Due Date<span className="text-danger">*</span></label>
                            <input
                                type="date"
                                className="form-control"
                                value={formData.DueDate ? formData.DueDate.split("T")[0] : ""}
                                onChange={handleInputChange}
                                readOnly
                            />
                        </div>
                        <div className="col-6 mb-2">
                            <label className="form-label">Priority<span className="text-danger">*</span></label>
                            <select
                                className="form-select"
                                name="Priority"
                                value={formData.Priority}
                                onChange={handleInputChange}
                                required
                                disabled={true}
                            >
                                <option>Choose Priority</option>
                                <option value="3">Low</option>
                                <option value="2">Medium</option>
                                <option value="1">High</option>
                            </select>
                        </div>
                        <div className="col-6 mb-2">
                            <label className="form-label">Status<span className="text-danger">*</span></label>
                            <select
                                className="form-select"
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
                        <div className="col-6 mb-2">
                            <label className="form-label cursor-pointer">
                                Upload Image <span className="text-danger">*</span>
                                {/* <span className="text-info ms-1" title="Please delete the existing image before uploading a new one.">
                                    <i className="fa-solid fa-circle-info fa-bounce"></i>
                                </span> */}
                            </label>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                className="form-control"
                            />
                        </div>
                        <div>
                            <label className="form-label">
                                Description <span className="text-danger">*</span>
                            </label>
                            <textarea
                                type="text"
                                name="Description"
                                className="form-control"
                                placeholder="Enter description"
                                value={
                                    [formData.Description, ...issues.map((issue, i) => `Issue ${i + 1}: ${issue}`)]
                                        .join('\n')
                                }
                                onChange={handleInputChange}
                                autoComplete="off"
                                rows={5}
                                readOnly
                            />
                        </div>
                        <hr className="text-primary my-4"/>
                        <div className="col-12 mb-2">
                            <div className="d-flex justify-content-between align-items-center mb-2">
                                <label className="form-label mb-0">Additional Issues</label>
                                <button
                                    type="button"
                                    className="btn btn-light-info btn-sm border border-info"
                                    onClick={() => setIssues([...issues, ""])}
                                >
                                    + Add Another Issue
                                </button>
                            </div>

                            {issues?.map((issue, index) => (
                                <div key={index} className="d-flex align-items-center mb-2">
                                    <input
                                        type="text"
                                        className="form-control me-2"
                                        value={issue}
                                        placeholder={`Issue ${index + 1}`}
                                        style={{ height: '2.8rem' }}
                                        onChange={(e) => {
                                            const newIssues = [...issues];
                                            newIssues[index] = e.target.value;
                                            setIssues(newIssues);
                                        }}
                                    />
                                    <button
                                        type="button"
                                        className="btn btn-danger btn-sm"
                                        onClick={() => setIssues(issues.filter((_, i) => i !== index))}
                                    >
                                        <i className="fa-regular fa-trash-can ms-2"></i>
                                    </button>
                                </div>
                            ))}
                        </div>
                        {formData?.ImageUrl && (
                            <div className="col-12 mt-3 text-center d-flex flex-column align-items-center">
                                <label className="form-label">Uploaded Images</label>

                                <div className="d-flex flex-wrap justify-content-center gap-3 mt-2">
                                    {formData.ImageUrl.split(",").map((url, index) => (
                                        <div
                                            key={index}
                                            className="position-relative"
                                            style={{
                                                width: "120px",
                                                height: "120px",
                                                borderRadius: "8px",
                                                overflow: "hidden",
                                                boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
                                            }}
                                        >
                                            <img
                                                src={`${BASE_IMAGE_API_GET}${url.trim()}`}
                                                alt={`Uploaded ${index + 1}`}
                                                className="img-fluid"
                                                style={{
                                                    width: "100%",
                                                    height: "100%",
                                                    objectFit: "cover",
                                                }}
                                            />

                                            {/* View (Eye) Icon */}
                                            {/* 👁 Preview (Eye) Icon */}
                                            <button
                                                type="button"
                                                className="btn btn-sm btn-light-primary border border-primary position-absolute top-0 end-0 m-1 rounded-circle d-flex justify-content-center align-items-center"
                                                style={{ width: "28px", height: "28px", padding: 0 }}
                                                onClick={() => setPreviewImage(`${BASE_IMAGE_API_GET}${url.trim()}`)}
                                            >
                                                <i className="fa fa-eye text-primary ms-2"></i>
                                            </button>

                                            {/* ❌ Delete (X) Icon */}
                                            <button
                                                type="button"
                                                className="btn btn-sm btn-light-danger border border-danger position-absolute top-0 start-0 m-1 rounded-circle d-flex justify-content-center align-items-center"
                                                style={{ width: "28px", height: "28px", padding: 0 }}
                                                onClick={() => handleRemoveOldImage(url.trim())}
                                            >
                                                <i className="fa fa-times text-danger ms-2"></i>
                                            </button>

                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </form>
            {/* Image Preview Modal */}
            {previewImage && (
                <div
                    className="modal fade show"
                    style={{
                        display: "block",
                        backgroundColor: "rgba(0,0,0,0.6)",
                    }}
                    onClick={() => setPreviewImage(null)}
                >
                    <div
                        className="modal-dialog modal-dialog-centered"
                        onClick={(e) => e.stopPropagation()}
                    >
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
                                <button
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => setPreviewImage(null)}
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

EditTicket.propTypes = {
    editObj: PropTypes.object.isRequired,
};