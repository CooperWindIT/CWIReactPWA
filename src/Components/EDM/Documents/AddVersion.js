import React, { useEffect, useState } from "react";
import Swal from 'sweetalert2';
import { Select } from "antd";
import PropTypes from "prop-types";
import { fetchWithAuth } from "../../../utils/api";
import { Upload, Tooltip, Switch } from "antd";
import { InboxOutlined } from "@ant-design/icons";

export default function AddDocVersion({ docObj }) {

    const { Dragger } = Upload;
    const [sessionUserData, setsessionUserData] = useState({});
    const [sessionModuleId, setSessionModuleId] = useState(null);
    const [editSubmitLoading, setEditSubmitLoading] = useState(false);
    const [selectedTypeId, setSelectedTypeId] = useState(null);
    const [isExpiry, setIsExpiry] = useState(null);
    const [fileList, setFileList] = useState([]);
    const [alertTypesData, setAlertTypesData] = useState([]);
    const { Option } = Select;

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
        Comments: '',
        FilePath: '',
        ExpiryDate: '',
    });

    const fetchMasterTypes = async () => {
        try {
            const response = await fetchWithAuth(
                `Portal/GetMasterTypes?OrgId=${sessionUserData?.OrgId}&DeptId=0&ModuleId=${sessionModuleId}&TypeCategory=3`,
                {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                }
            );

            if (!response.ok) throw new Error("Network response was not ok");

            const data = await response.json();
            setAlertTypesData(data.ResultData || []);

        } catch (error) {
            console.error("Failed to fetch types data:", error);
            setAlertTypesData([]);
        }
    };

    useEffect(() => {
        if (sessionUserData.OrgId) {
            fetchMasterTypes();
        }
    }, [sessionUserData]);

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

    const handleAddVersionSubmit = async (e) => {
        e.preventDefault();
        setEditSubmitLoading(true);

        const selectedFile = fileList[0];
        if (!selectedFile) {
            Swal.fire({ title: "Warning", text: "Please upload a document.", icon: "warning" });
            setEditSubmitLoading(false);
            return;
        }

        if (!formData?.Comments) {
            Swal.fire({ title: "Warning", text: "Comments are mandatory.", icon: "warning" });
            setEditSubmitLoading(false);
            return;
        }

        if (isExpiry && (!formData.ExpiryDate || !selectedTypeId)) {
            Swal.fire({ title: "Warning", text: "Please select Expiry Date and Alert Type.", icon: "warning" });
            setEditSubmitLoading(false);
            return;
        }

        const originalFile = fileList[0];
        if (!originalFile) {
            Swal.fire({ title: "Warning", text: "Please upload a document.", icon: "warning" });
            setEditSubmitLoading(false);
            return;
        }

        const nextVersion = (parseFloat(docObj?.CurrentVersion) + 1.00).toFixed(2);
        const fileExtension = originalFile.name.split('.').pop(); // e.g., "pdf"

        const newFileName = `${docObj?.DocName}-v${nextVersion}.${fileExtension}`;

        const renamedFile = new File([originalFile], newFileName, {
            type: originalFile.type,
        });

        const jsonData = {
            ContentTypeId: docObj?.ContentTypeId,
            DocName: docObj?.DocName,
            Description: docObj?.Description,
            Comments: formData?.Comments,
            Status: "DRAFT",
            DocId: docObj?.DocId,
            VersionNumber: (parseFloat(docObj?.CurrentVersion) + 1.00).toFixed(2),
            ExpiryDate: isExpiry ? formData?.ExpiryDate : null,
        };

        const alertsJson = isExpiry ? {
            Alert: {
                AlertTypeId: selectedTypeId,
                TableId: 0,
                ModuleId: parseInt(sessionModuleId),
                AlertTitle: `Expiry Alert: ${docObj?.DocName}`,
                Message: `The document ${docObj?.DocName} is scheduled to expire on ${formData.ExpiryDate}.`,
                OcurrenceType: 1, // Once
                ToUsers: sessionUserData?.Email,
                StartDate: formData.ExpiryDate,
                EndDate: formData.ExpiryDate
            },
            ScheduledAlerts: [{ ScheduledDate: formData.ExpiryDate }]
        } : null;

        const formDataPayload = new FormData();
        formDataPayload.append("OrgId", sessionUserData?.OrgId);
        formDataPayload.append("UserId", sessionUserData?.Id);
        formDataPayload.append("Type", "ADDVERSION");
        formDataPayload.append("Priority", 1);
        formDataPayload.append("JsonData", JSON.stringify(jsonData));
        formDataPayload.append("AlertsJson", alertsJson ? JSON.stringify(alertsJson) : "");
        formDataPayload.append("ImageUrl", renamedFile); // The raw file from fileList[0]

        try {
            const response = await fetchWithAuth(`file_upload/DocRegCycle`, {
                method: "POST",
                body: formDataPayload,
            });

            const result = await response.json();

            if (result?.data?.result[0]?.ResponseCode === 2001) {
                Swal.fire({
                    title: "Success",
                    text: "Version has been added successfully.",
                    icon: "success",
                }).then(() => window.location.reload());
            } else {
                Swal.fire({
                    title: "Error",
                    text: result?.data?.result[0]?.ResponseMessage || "Something went wrong.",
                    icon: "error",
                });
            }
        } catch (error) {
            console.error("Error during submission:", error);
            Swal.fire({ title: "Error", text: "An unexpected error occurred.", icon: "error" });
        } finally {
            setEditSubmitLoading(false);
        }
    };

    const minDate = new Date(Date.now() + 86400000).toISOString().split("T")[0];



    return (
        <div
            className="offcanvas offcanvas-end"
            tabIndex="-1"
            id="offcanvasRightAddDocVersion"
            aria-labelledby="offcanvasRightLabel"
            style={{ width: "90%" }}
        >
            <style>
                {`
                    @media (min-width: 768px) { /* Medium devices and up (md) */
                        #offcanvasRightAddDocVersion {
                            width: 50% !important;
                        }
                    }
                `}
            </style>
            <form autoComplete="off" onSubmit={handleAddVersionSubmit}>
                <div className="offcanvas-header d-flex justify-content-between align-items-center">
                    <h5 id="offcanvasRightLabel" className="mb-0">Add new version</h5>
                    <div className="d-flex align-items-center">
                        <button className="btn btn-primary btn-sm me-2" type="submit" disabled={editSubmitLoading}>
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
                        <div className="alert alert-warning p-3 mb-3 shadow-sm border-start border-4 border-warning" role="alert">
                            <div className="d-flex align-items-center mb-2">
                                <i className="fa-solid fa-triangle-exclamation text-danger fa-beat me-2 fs-5"></i>
                                <span className="fw-bold">Upload Requirements</span>
                            </div>
                            <ul className="mb-0 small fw-medium text-dark">
                                <li>Only one file allowed (Max 5MB).</li>
                                <li><strong>Critical:</strong> The file name must match the Document Name: <span className="text-primary">"{docObj?.DocName}"</span></li>
                            </ul>
                        </div>
                        <div className="card-body bg-gray-100 rounded-3 p-5 d-flex align-items-center mb-5">
                            <div className="symbol symbol-50px me-5">
                                <div className="symbol-label bg-white shadow-sm">
                                    <i className="fa-solid fa-file-signature text-primary fs-2"></i>
                                </div>
                            </div>

                            <div className="d-flex flex-column flex-grow-1">
                                <span className="text-gray-900 fs-4 fw-bold">{docObj?.DocName}</span>
                                <span className="text-muted fw-semibold"><span className="text-primary fs-4">•</span> {docObj?.TypeName}</span>
                            </div>

                            <div className="badge badge-light-success border border-success px-3 py-2">
                                Active Version
                            </div>
                        </div>
                        <div className="d-flex align-items-center justify-content-between my-3 w-100 shadow-sm p-3 rounded-4 border border-gray-200">
                            <h5 className="mb-0">
                                New Version: <span className="text-primary">{(parseFloat(docObj?.CurrentVersion) + 1.00).toFixed(2)}</span>
                            </h5>
                            <div className="d-flex align-items-center gap-2">
                                <span className="fw-semibold">Is Expiry</span>
                                <Tooltip
                                    title="Use this option to set an expiry date for the document. Select it only if the document has an expiry date."
                                    placement="top"
                                    overlayStyle={{ maxWidth: '290px' }}
                                >
                                    <i
                                        className="bi bi-info-circle text-primary cursor-help fa-beat-fade"
                                        style={{ fontSize: '1rem' }}
                                    ></i>
                                </Tooltip>
                                <Switch
                                    size="medium"
                                    checkedChildren="YES"
                                    unCheckedChildren="NO"
                                    onChange={(checked) => setIsExpiry(checked)}
                                    checked={isExpiry}
                                />
                            </div>
                        </div>
                        {isExpiry && (
                            <div className="my-3 animate__animated animate__fadeIn">
                                <div className="card border-0 shadow-sm p-2">
                                    <div className="d-flex align-items-center gap-2 mb-3">
                                        <div className="bg-primary bg-opacity-10 text-primary rounded p-2">
                                            <i className="bi bi-clock-history"></i>
                                        </div>

                                        <div>
                                            <div className="fw-semibold">Expiry & Notification</div>
                                            <small className="text-muted">Configure expiry alert</small>
                                        </div>
                                    </div>
                                    <div className="mb-2">
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
                                                onChange={(e) => setFormData((prev) => ({ ...prev, ExpiryDate: e.target.value }))}
                                                min={minDate}
                                            />
                                        </div>
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label small fw-semibold">
                                            Alert Type <span className="text-danger">*</span>
                                        </label>
                                        <Select
                                            showSearch
                                            placeholder="Choose alert type"
                                            value={selectedTypeId ?? undefined}
                                            style={{ width: "100%" }}
                                            onChange={(value) => setSelectedTypeId(value)}
                                        >
                                            {alertTypesData?.map((assTyp) => (
                                                <Option key={assTyp.Id} value={assTyp.Id}>
                                                    {assTyp.TypeName}
                                                </Option>
                                            ))}
                                        </Select>
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
                                                        {" "}{formData.DocName || "..."}{" "}
                                                    </span>
                                                    expires on
                                                    <span className="text-danger fw-semibold">
                                                        {" "}{formData.ExpiryDate || "unselected"}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="border-top mt-2 pt-1 text-muted small">
                                                <i className="bi bi-person-check me-1"></i>
                                                Notify: {sessionUserData?.Email}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-muted mt-1" style={{ fontSize: "11px" }}>
                                        Alert triggers at 08:00 AM on selected date
                                    </div>
                                </div>
                            </div>
                        )}
                        <div>
                            <label className="form-label">Description</label>
                            <textarea
                                className="form-control"
                                value={docObj.Description}
                                readOnly
                            />
                        </div>
                        <div className="my-5">
                            <Dragger
                                {...draggerProps}
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
                        <div className="mt-5" >
                            <label className="form-label">Comment</label>
                            <textarea
                                className="form-control"
                                value={formData.Comments}
                                placeholder="Enter comments..."
                                onChange={(e) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        Comments: e.target.value,
                                    }))
                                }
                            />
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}

AddDocVersion.propTypes = {
    docObj: PropTypes.object.isRequired,
};