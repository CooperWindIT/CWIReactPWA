import React, { useEffect, useState, useRef, useCallback } from "react";
import Swal from 'sweetalert2';
import { Select, Tooltip } from "antd";
import PropTypes from "prop-types";
import { fetchWithAuth } from "../../../utils/api";

export default function EditDocument({ editObj }) {

    const [sessionUserData, setsessionUserData] = useState({});
    const [contentTypesData, setContentTypesData] = useState([]);
    const [editSubmitLoading, setEditSubmitLoading] = useState(false);
    const offcanvasRef = useRef(null);
    const { Option } = Select;

    useEffect(() => {
        const userDataString = sessionStorage.getItem("userData");
        if (userDataString) {
            const userData = JSON.parse(userDataString);
            setsessionUserData(userData);
        }
    }, []);

    const [formData, setFormData] = useState({
        ContentTypeId: null,
        DocName: "",
        Description: "",
        DocId: null,
    });

    // Memoize the fetch function so it can be used safely in the useEffect
    const fetchContentTypes = useCallback(async () => {
        // Basic check to ensure data is available before calling
        if (!sessionUserData?.OrgId || !sessionUserData?.Id) return;
        console.log("1111")

        try {
            const response = await fetchWithAuth(
                `EDM/GetUserDocTypePermissions?OrgId=${sessionUserData?.OrgId}&UserId=${sessionUserData?.Id}&MasterTypeId=0&Type=DocTypes`,
                {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                }
            );

            if (!response.ok) throw new Error("Network response was not ok");

            const data = await response.json();
            setContentTypesData(data.ResultData || []);

        } catch (error) {
            console.error("Failed to fetch DDL data:", error);
            setContentTypesData([]);
        }
    }, [sessionUserData?.OrgId, sessionUserData?.Id]); // Only changes if User or Org changes

    useEffect(() => {
        const offcanvasEl = offcanvasRef.current;
        if (!offcanvasEl) return;

        // This listener triggers IMMEDIATELY when 'show' starts (before animation)
        const handleOpen = () => {
            fetchContentTypes();
        };

        offcanvasEl.addEventListener("show.bs.offcanvas", handleOpen);

        return () => {
            offcanvasEl.removeEventListener("show.bs.offcanvas", handleOpen);
        };
    }, [fetchContentTypes]); // Runs when the memoized function is created


    useEffect(() => {
        if (editObj) {

            setFormData({
                DocName: editObj?.DocName || "",
                Description: editObj?.Description || "",
                ContentTypeId: editObj?.ContentTypeId || "",
            });

        }
    }, [editObj]);

    // useEffect(() => {
    //     if (sessionUserData.OrgId) {
    //         fetchContentTypes();
    //     }
    // }, [sessionUserData?.OrgId]);

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        setEditSubmitLoading(true);

        const missingFields = [];
        // if (!selectedContTypeId) missingFields.push("Document Type");
        if (!formData?.DocName) missingFields.push("Document Name");
        if (!formData?.Description) missingFields.push("Description");

        // 2. If any are missing, stop and show alert
        if (missingFields.length > 0) {
            Swal.fire({
                title: "Mandatory Fields Missing",
                html: `Please provide: <b class="text-danger">${missingFields.join(", ")}</b>`,
                icon: "warning",
                confirmButtonColor: "#009ef7",
            });
            setEditSubmitLoading(false);
            return;
        }

        const payload = {
            OrgId: sessionUserData?.OrgId,
            UserId: sessionUserData?.Id,
            Type: "EDITDOC",
            JsonData: {
                ContentTypeId: formData?.ContentTypeId,
                DocName: formData?.DocName,
                Description: formData?.Description,
                DocId: editObj?.Id,
                VersionId: editObj?.VersionId,
                Status: editObj?.VersionStatus,
            },
        }

        try {
            const response = await fetchWithAuth(`EDM/DocRegCycle`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload),
            });

            const result = await response.json();

            if (result.data.result[0].ResponseCode === 2002) {
                Swal.fire({
                    title: "Success",
                    text: "Document has been updated successfully.",
                    icon: "success",
                })
            } else {
                Swal.fire({
                    title: "Error",
                    text: "Something went wrong, please try after sometime.",
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
            setEditSubmitLoading(false);
        }
    };

    const isUnchanged =
        formData.DocName === (editObj?.DocName || "") &&
        formData.Description === (editObj?.Description || "") &&
        formData.ContentTypeId === (editObj?.ContentTypeId || "");

    const isInvalid = !formData.DocName || !formData.Description;
    // const showDeptDwn = sessionActionIds?.includes(25);

    return (
        <div
            ref={offcanvasRef}
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
                        }
                    }
                `}
            </style>
            {/* <form autoComplete="off" onSubmit={handleEditSubmit}>
                <div className="offcanvas-header d-flex justify-content-between align-items-center">
                    <h5 id="offcanvasRightLabel" className="mb-0">Edit Document</h5>
                    <div className="d-flex align-items-center">
                        <button
                            className="btn btn-primary btn-sm me-2"
                            type="submit"
                            disabled={editSubmitLoading || isUnchanged || isInvalid}
                        >
                            <i className="bi bi-bookmark-check"></i>{editSubmitLoading ? "Submitting..." : "Submit"}
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
                    <div className="row">
                        <div className="col-12 mb-2">
                            <label className="form-label">
                                Document Name<span className="text-danger">*</span>
                            </label>
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Enter doc name"
                                value={formData?.DocName}
                                style={{ height: '2.8rem' }}
                                onChange={(e) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        DocName: e.target.value,
                                    }))
                                }
                            />
                        </div>
                        <div className="col-12 col-md-6 mb-2">
                            <label className="form-label">
                                Department
                            </label>
                            <input
                                type="text"
                                className="form-control"
                                value={editObj?.DeptName}
                                style={{ height: '2.8rem' }}
                                readOnly
                                disabled={true}
                            />
                        </div>
                        <div className="col-12 col-md-6 mb-2">
                        <label className="form-label d-flex align-items-center">
        Document Type<span className="text-danger ms-1">*</span>
        <Tooltip 
            title="Only document types where you have 'Write' permissions are displayed here."
            placement="top"
        >
            <i className="bi bi-info-circle ms-2 text-primary cursor-help fs-8"></i>
        </Tooltip>
    </label>
                            <Select
                                showSearch
                                placeholder="Select document type"
                                className="w-100"
                                value={formData?.ContentTypeId || undefined}
                                style={{ height: '2.8rem' }}
                                onChange={(value) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        ContentTypeId: value,
                                    }))
                                }
                                optionFilterProp="children"
                                filterOption={(input, option) =>
                                    option.children.toLowerCase().includes(input.toLowerCase())
                                }
                            >
                                {Array.isArray(contentTypesData) &&
                                    contentTypesData
                                        // 1. Filter first: Only show types the user has permission to write to
                                        .filter((docType) => docType.CanWrite === true)
                                        // 2. Map the permitted items
                                        .map((docType) => (
                                            <Option key={docType.MasterTypeId} value={docType.MasterTypeId}>
                                                {docType.TypeName}
                                            </Option>
                                        ))
                                }
                            </Select>
                        </div>

                        <div>
                            <label className="form-label">Description<span className="text-danger">*</span></label>
                            <textarea
                                className="form-control"
                                value={formData.Description}
                                onChange={(e) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        Description: e.target.value,
                                    }))
                                }
                                rows={4}
                            />
                        </div>
                    </div>
                </div>
            </form> */}
            <form autoComplete="off" onSubmit={handleEditSubmit} className="h-100 d-flex flex-column">
    {/* --- Header Section --- */}
    <div className="offcanvas-header bg-white border-bottom py-4 px-6 d-flex justify-content-between align-items-center shadow-sm">
        <div className="d-flex align-items-center">
            <div className="symbol symbol-40px me-3">
                <div className="symbol-label bg-light-primary">
                    <i className="bi bi-pencil-square text-primary fs-3"></i>
                </div>
            </div>
            <div>
                <h5 id="offcanvasRightLabel" className="mb-0 fw-bolder text-dark">Edit Document</h5>
                <small className="text-muted fs-8">Update your document details and permissions</small>
            </div>
        </div>
        
        <button
            type="button"
            className="btn btn-icon btn-sm btn-active-light-primary ms-2"
            data-bs-dismiss="offcanvas"
            aria-label="Close"
        >
            <i className="bi bi-x fs-1"></i>
        </button>
    </div>

    {/* --- Body Section --- */}
    <div className="offcanvas-body bg-light-section px-6 py-8" style={{ flex: 1, overflowY: 'auto' }}>
        <div className="row g-5">
            
            {/* Document Name */}
            <div className="col-12">
                <label className="form-label fw-bold fs-7 text-gray-700 mb-2">
                    Document Name <span className="text-danger">*</span>
                </label>
                <div className="position-relative">
                    <i className="bi bi-file-earmark-text position-absolute top-50 translate-middle-y ms-4 text-muted"></i>
                    <input
                        type="text"
                        className="form-control ps-12 fs-7"
                        placeholder="e.g. Annual Financial Report"
                        value={formData?.DocName}
                        style={{ height: '3.2rem' }}
                        onChange={(e) => setFormData((prev) => ({ ...prev, DocName: e.target.value }))}
                    />
                </div>
            </div>

            {/* Department (Read Only) */}
            <div className="col-12 col-md-6">
                <label className="form-label fw-bold fs-7 text-gray-700 mb-2">Department</label>
                <div className="position-relative">
                    <i className="bi bi-building position-absolute top-50 translate-middle-y ms-4 text-gray-400"></i>
                    <input
                        type="text"
                        className="form-control form-control-transparent ps-12 fs-7 border-dashed border-gray-300 bg-light"
                        value={editObj?.DeptName}
                        style={{ height: '3.2rem' }}
                        readOnly
                        disabled
                    />
                </div>
            </div>

            {/* Document Type */}
            <div className="col-12 col-md-6">
                <label className="form-label fw-bold fs-7 text-gray-700 mb-2 d-flex align-items-center">
                    Document Type <span className="text-danger ms-1">*</span>
                    <Tooltip title="Only types with 'Write' permissions are shown." placement="top">
                        <i className="bi bi-info-circle-fill ms-2 text-primary opacity-75 cursor-help fs-9"></i>
                    </Tooltip>
                </label>
                <Select
                    showSearch
                    placeholder="Select document type"
                    className="form-control-solid w-100 custom-ant-select"
                    value={formData?.ContentTypeId || undefined}
                    style={{ height: '3.2rem' }}
                    onChange={(value) => setFormData((prev) => ({ ...prev, ContentTypeId: value }))}
                    optionFilterProp="children"
                    filterOption={(input, option) => option.children.toLowerCase().includes(input.toLowerCase())}
                >
                    {Array.isArray(contentTypesData) && contentTypesData
                        .filter((docType) => docType.CanWrite === true)
                        .map((docType) => (
                            <Option key={docType.MasterTypeId} value={docType.MasterTypeId}>
                                {docType.TypeName}
                            </Option>
                        ))
                    }
                </Select>
            </div>

            {/* Description */}
            <div className="col-12">
                <label className="form-label fw-bold fs-7 text-gray-700 mb-2">
                    Description <span className="text-danger">*</span>
                </label>
                <textarea
                    className="form-control fs-7 p-4"
                    placeholder="Briefly describe the purpose of this document..."
                    value={formData.Description}
                    onChange={(e) => setFormData((prev) => ({ ...prev, Description: e.target.value }))}
                    rows={5}
                    style={{ borderRadius: '8px' }}
                />
            </div>

        </div>
    </div>

    {/* --- Footer / Sticky Action Button --- */}
    <div className="offcanvas-footer border-top p-6 bg-white shadow-lg-up">
        <div className="d-flex gap-3">
            <button
                type="button"
                className="btn btn-light fw-bold flex-equal"
                data-bs-dismiss="offcanvas"
            >
                Cancel
            </button>
            <button
                className="btn btn-primary fw-bold flex-equal"
                type="submit"
                disabled={editSubmitLoading || isUnchanged || isInvalid}
            >
                {!editSubmitLoading ? (
                    <span className="d-flex align-items-center justify-content-center">
                        <i className="bi bi-check-circle-fill me-2 fs-5"></i> Save Changes
                    </span>
                ) : (
                    <span className="spinner-border spinner-border-sm align-middle ms-2"></span>
                )}
            </button>
        </div>
    </div>
</form>
        </div>
    );
}

EditDocument.propTypes = {
    editObj: PropTypes.object.isRequired,
};