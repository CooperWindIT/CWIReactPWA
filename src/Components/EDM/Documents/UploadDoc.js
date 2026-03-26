import React, { useEffect, useState, useRef, useCallback } from "react";
import Swal from 'sweetalert2';
import { Select } from "antd";
import { fetchWithAuth } from "../../../utils/api";
import { Upload } from "antd";
import { InboxOutlined } from "@ant-design/icons";
import { Tooltip, Switch } from "antd";


export default function UplaodDocument() {

    const [sessionUserData, setsessionUserData] = useState({});
    const [departmentsData, setDepartmentsData] = useState([]);
    const [unitsData, setUnitsData] = useState([]);
    const [typesData, setTypesData] = useState([]);
    const [addSubmitLoading, setAddSubmitLoading] = useState(false);
    const [selectedDeptId, setSelectedDeptId] = useState(null);
    const [selectedUnitId, setSelectedUnitId] = useState(null);
    const [selectedContentType, setSelectedContentType] = useState(null);
    const [selectedTypeId, setSelectedTypeId] = useState(null);
    const [uploadLoading, setUploadLoading] = useState(false);
    const [sessionActionIds, setSessionActionIds] = useState([]);
    const [sessionModuleId, setSessionModuleId] = useState(null);
    const [alertTypesData, setAlertTypesData] = useState([]);
    const [isExpiry, setIsExpiry] = useState(null);
    const [fileList, setFileList] = useState([]);

    const { Option } = Select;
    const { Dragger } = Upload;

    const [formDataDocUpload, setFormDataDocUpload] = useState({
        DocName: "",
        Description: "",
        FilePath: "",
        Comments: "",
    });

    useEffect(() => {
        const userDataString = sessionStorage.getItem("userData");
        if (userDataString) {
            const userData = JSON.parse(userDataString);
            setsessionUserData(userData);
            setFormDataDocUpload((prev) => ({
                ...prev,
                CreatedBy: userData.Id,
                OrgIdd: userData.OrgId,
            }));
            setSelectedDeptId(userData.DeptId);
        }

        const storedModule = JSON.parse(localStorage.getItem("ModuleData"));
        const moduleId = storedModule?.Id?.toString();
        setSessionModuleId(moduleId);
    }, []);

    useEffect(() => {
        const sessionMenuData = sessionStorage.getItem("menuData");
        try {
            const parsedMenu = JSON.parse(sessionMenuData);

            const ticketsMenu = parsedMenu.find(
                (item) => item.MenuName === "Documents"
            );

            if (ticketsMenu) {
                const actionIdArray = ticketsMenu.ActionsIds?.split(",").map(Number);
                setSessionActionIds(actionIdArray);
            }
        } catch (err) {
            console.error("Error parsing menuData:", err);
        }
    }, []);

    const fetchDDLData = async () => {
        try {
            const sessionDDL = sessionStorage.getItem("ddlDocAddData");

            if (sessionDDL) {
                const parsed = JSON.parse(sessionDDL);

                setUnitsData(parsed.units || []);
                setDepartmentsData(parsed.depts || []);
                if (parsed.units.length > 0) {
                    setSelectedUnitId(parsed.units[0].ItemId);
                }
                return;
            }

            const response = await fetchWithAuth(
                `ADMINRoutes/CWIGetDDLItems?OrgId=${sessionUserData?.OrgId}&UserId=0`,
                {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                }
            );

            if (!response.ok) throw new Error("Network response was not ok");

            const data = await response.json();

            const deptsFilteredData = data.ResultData.filter(
                (item) => item.DDLName === "Departments"
            );
            const unitsFilteredData = data.ResultData.filter(
                (item) => item.DDLName === "UnitLocations"
            );

            setUnitsData(unitsFilteredData || []);
            setDepartmentsData(deptsFilteredData || []);
            const defaultUnitId = unitsFilteredData.length > 0 ? unitsFilteredData[0].ItemId : null;
            if (defaultUnitId) {
                setSelectedUnitId(defaultUnitId);
            }

            sessionStorage.setItem(
                "ddlDocAddData",
                JSON.stringify({
                    depts: deptsFilteredData,
                    units: unitsFilteredData,
                })
            );

        } catch (error) {
            console.error("Failed to fetch DDL data:", error);
            setDepartmentsData([]);
        }
    };

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
            fetchDDLData();
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

    const handleUploadDocInputChange = (eOrValue, nameFromSelect = null) => {
        if (nameFromSelect) {
            setFormDataDocUpload((prev) => ({
                ...prev,
                [nameFromSelect]: eOrValue || "",
            }));
            return;
        }

        const { name, value } = eOrValue.target;
        let formattedValue = value;

        if (name === 'DocName') {
            // Disallow leading space or dot
            if (/^[ .]/.test(formattedValue)) return;

            // Capitalize first letters after space or dot
            formattedValue = formattedValue.replace(/\b\w/g, (char, index, str) => {
                if (
                    index === 0 ||
                    str[index - 1] === ' ' ||
                    str[index - 1] === '.'
                ) {
                    return char.toUpperCase();
                }
                return char;
            });
        }

        setFormDataDocUpload((prevState) => ({
            ...prevState,
            [name]: formattedValue,
        }));
    };

    const handleDocUploadSubmit = async (status) => {
        setAddSubmitLoading(true);

        const missingFields = [];
        if (!selectedUnitId) missingFields.push("Unit");
        if (!selectedContentType) missingFields.push("Document Type");
        if (!formDataDocUpload?.DocName) missingFields.push("Document Name");
        if (isExpiry && !formDataDocUpload?.ExpiryDate) missingFields.push("Expiry Date");
        if (!formDataDocUpload?.Description) missingFields.push("Description");
        if (!formDataDocUpload?.Comments) missingFields.push("Comments");
        if (!selectedDeptId) missingFields.push("Department");

        const selectedFile = fileList.length > 0 ? fileList[0] : null;
        if (!selectedFile) missingFields.push("File Attachment");

        const docNameInput = formDataDocUpload?.DocName?.trim().toLowerCase();

        // 2. Get the uploaded file name (removing the extension like .pdf or .docx)
        const uploadedFileName = fileList[0]?.name?.split('.').slice(0, -1).join('.').toLowerCase();

        // 3. Compare them
        if (docNameInput && uploadedFileName && docNameInput !== uploadedFileName) {
            Swal.fire({
                title: "Name Mismatch",
                text: `The Document Name "${formDataDocUpload.DocName}" does not match the uploaded file name "${fileList[0].name}". Please rename one of them to match.`,
                icon: "error",
                confirmButtonColor: "#009ef7",
            });
            setAddSubmitLoading(false);
            return;
        }

        if (missingFields.length > 0) {
            Swal.fire({
                title: "Mandatory Fields Missing",
                html: `Please provide: <b class="text-danger">${missingFields.join(", ")}</b>`,
                icon: "warning",
                confirmButtonColor: "#009ef7",
            });
            setAddSubmitLoading(false);
            return;
        }

        // Prepare JSON data strings
        const jsonData = {
            UnitId: selectedUnitId,
            ContentTypeId: selectedContentType.MasterTypeId,
            DocName: formDataDocUpload?.DocName,
            Description: formDataDocUpload?.Description,
            Comments: formDataDocUpload?.Comments,
            VersionNumber: "1.00",
            Status: status,
            DeptId: selectedDeptId,
            ExpiryDate: isExpiry ? formDataDocUpload?.ExpiryDate : null,
            DocId: 0
        };

        // Prepare AlertsJson logic
        const alertsJson = isExpiry ? {
            Alert: {
                AlertTypeId: selectedTypeId,
                TableId: 0,
                ModuleId: sessionModuleId, // Document Management Module ID
                AlertTitle: "Document Expiry Alert",
                Message: `Your document ${formDataDocUpload.DocName} is expiring on ${formDataDocUpload.ExpiryDate}.`,
                OcurrenceType: 1, // Once
                ToUsers: sessionUserData?.Email,
                StartDate: formDataDocUpload.ExpiryDate,
                EndDate: formDataDocUpload.ExpiryDate
            },
            ScheduledAlerts: [{ ScheduledDate: formDataDocUpload.ExpiryDate }]
        } : null;

        // Create FormData Object
        const formData = new FormData();
        formData.append("OrgId", sessionUserData?.OrgId);
        formData.append("UserId", sessionUserData?.Id);
        formData.append("Type", "ADDVERSION");
        formData.append("Priority", 1);
        formData.append("JsonData", JSON.stringify(jsonData));
        formData.append("AlertsJson", alertsJson ? JSON.stringify(alertsJson) : "");

        // Append the actual file
        formData.append("ImageUrl", selectedFile);

        try {
            const response = await fetchWithAuth(`file_upload/DocRegCycle`, {
                method: "POST",
                body: formData,
            });

            const result = await response.json();

            if (result.data.result[0].ResponseCode === 2001) {
                Swal.fire({
                    title: "Success",
                    text: "Document saved successfully.",
                    icon: "success",
                }).then(() => window.location.reload());
            } else {
                Swal.fire({ title: "Error", text: result.message || "Submission failed", icon: "error" });
            }
        } catch (error) {
            console.error("Submission error:", error);
            Swal.fire({ title: "Error", text: "An unexpected error occurred.", icon: "error" });
        } finally {
            setAddSubmitLoading(false);
        }
    };

    const offcanvasRef = useRef(null);

    const fetchContentTypes = useCallback(async () => {
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

            setTypesData(data.ResultData || []);

        } catch (error) {
            console.error("Failed to fetch data:", error);
            setTypesData([]);
        }
    }, [sessionUserData]); // Dependencies

    useEffect(() => {
        const offcanvasEl = offcanvasRef.current;
        if (!offcanvasEl) return;

        const handleOpen = () => {
            fetchContentTypes();
        };

        offcanvasEl.addEventListener("show.bs.offcanvas", handleOpen);

        return () => {
            offcanvasEl.removeEventListener("show.bs.offcanvas", handleOpen);
        };
    }, [fetchContentTypes]); // Very important: add these as dependencies

    const showDeptDwn = sessionActionIds?.includes(25);
    const minDate = new Date(Date.now() + 86400000).toISOString().split("T")[0];

    return (
        <div
            ref={offcanvasRef}
            className="offcanvas offcanvas-end"
            tabIndex="-1"
            id="offcanvasRightUploadDoc"
            aria-labelledby="offcanvasRightLabel"
            style={{ width: "90%" }}
        >
            <style>
                {`
                    @media (min-width: 768px) { /* Medium devices and up (md) */
                        #offcanvasRightUploadDoc {
                            width: 45% !important;
                        }

                    }
                `}
            </style>
            <div>
                <div className="offcanvas-header d-flex justify-content-between align-items-center mb-3">
                    <h5 id="offcanvasRightLabel" className="mb-0">Register Document</h5>
                    <div className="d-flex align-items-center">
                        <button className="btn btn-warning btn-sm me-2"
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDocUploadSubmit("DRAFT");
                            }}
                            disabled={addSubmitLoading}
                        >
                            <i className="bi bi-bookmark-check"></i>{addSubmitLoading ? "Submitting..." : "Save as Draft"}
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
                    <div>
                        <div className="alert alert-warning p-3 mb-3 shadow-sm" role="alert" style={{ borderRadius: '10px', borderLeft: '5px solid #ffc107' }}>
                            <div className="d-flex align-items-center mb-2">
                                <i className="fa-solid fa-triangle-exclamation text-danger fa-beat me-2 fs-5"></i>
                                <span className="fw-bold text-dark">Upload Requirements:</span>
                            </div>
                            <ul className="mb-0 ps-3 fw-medium" style={{ fontSize: '0.95rem', lineHeight: '1.5' }}>
                                <li>Only one file allowed per submission.</li>
                                <li>File size must be <span className="text-danger">less than 5MB</span>.</li>
                                <li><span className="text-primary">Important:</span> The uploaded file name must match the <strong>Document Name</strong> field.</li>
                            </ul>
                        </div>
                        <div className="row">
                            <div className="col-12 mb-2">
                                <label className="form-label">Document Type<span className="text-danger">*</span></label>
                                <Select
                                    showSearch
                                    placeholder="Select document type"
                                    className="w-100"
                                    value={selectedContentType?.MasterTypeId || undefined}
                                    style={{ height: '2.8rem' }}
                                    onChange={(id) => {
                                        const fullObject = typesData.find(item => item.MasterTypeId === id);
                                        setSelectedContentType(fullObject);
                                    }}
                                    optionFilterProp="children"
                                    filterOption={(input, option) =>
                                        option.children.toLowerCase().includes(input.toLowerCase())
                                    }
                                >
                                    {typesData?.map((docTyp) => (
                                        <Option key={docTyp.Id} value={docTyp.MasterTypeId}>
                                            {docTyp.TypeName}
                                        </Option>
                                    ))}
                                </Select>
                            </div>

                            <div className="col-12 col-md-6 mb-2">
                                <label className="form-label">Unit<span className="text-danger">*</span></label>
                                <Select
                                    showSearch
                                    placeholder="Select unit"
                                    className="w-100"
                                    value={selectedUnitId || undefined}
                                    style={{ height: '2.8rem' }}
                                    onChange={(value) => setSelectedUnitId(value)}
                                    optionFilterProp="children"
                                    filterOption={(input, option) =>
                                        option.children.toLowerCase().includes(input.toLowerCase())
                                    }
                                    disabled={!showDeptDwn}
                                >
                                    {unitsData?.map((dep) => (
                                        <Option key={dep.ItemId} value={dep.ItemId}>
                                            {dep.ItemValue}
                                        </Option>
                                    ))}
                                </Select>
                            </div>

                            <div className="col-12 col-md-6 mb-2">
                                <label className="form-label">Department<span className="text-danger">*</span></label>
                                <Select
                                    showSearch
                                    placeholder="Select department"
                                    className="w-100"
                                    value={selectedDeptId || undefined}
                                    style={{ height: '2.8rem' }}
                                    onChange={(value) => setSelectedDeptId(value)}
                                    optionFilterProp="children"
                                    filterOption={(input, option) =>
                                        option.children.toLowerCase().includes(input.toLowerCase())
                                    }
                                    disabled={!showDeptDwn}
                                >
                                    {departmentsData?.map((dep) => {
                                        // Check if this department matches the logged-in user's department
                                        const isUserDept = dep.ItemId === sessionUserData?.DeptId;

                                        return (
                                            <Option key={dep.ItemId} value={dep.ItemId}>
                                                <div className="d-flex justify-content-between align-items-center w-100">
                                                    <span className={isUserDept ? "fw-bolder text-primary" : ""}>
                                                        {dep.ItemValue}
                                                    </span>
                                                    {isUserDept && (
                                                        <span
                                                            className="badge badge-light-primary fw-bold"
                                                            style={{ fontSize: '10px', padding: '2px 6px' }}
                                                        >
                                                            MY DEPT
                                                        </span>
                                                    )}
                                                </div>
                                            </Option>
                                        );
                                    })}
                                </Select>
                            </div>

                            <div className="col-12 mb-2">
                                <label className="form-label">Document Name<span className="text-danger">*</span></label>
                                <input
                                    type="text"
                                    name="DocName"
                                    className="form-control"
                                    placeholder="Enter document name"
                                    style={{ height: '2.8rem' }}
                                    value={formDataDocUpload.DocName}
                                    onChange={handleUploadDocInputChange}
                                    autoComplete="off"
                                    maxLength={100}
                                    required
                                />
                            </div>

                            <div className="position-relative">
                                <div
                                    style={{
                                        filter: (selectedContentType && !selectedContentType.CanWrite) ? 'blur(4px)' : 'none',
                                        pointerEvents: (selectedContentType && !selectedContentType.CanWrite) ? 'none' : 'auto',
                                        userSelect: 'none',
                                        transition: 'all 0.3s ease'
                                    }}
                                >
                                    <div className="d-flex align-items-center justify-content-between my-3 w-100 shadow-sm p-3 rounded-4 border border-gray-200">
                                        <h5 className="mb-0">
                                            New Version: <span className="text-primary">1.00</span>
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
                                                            value={formDataDocUpload.ExpiryDate}
                                                            onChange={handleUploadDocInputChange}
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
                                                                    {" "}{formDataDocUpload.DocName || "..."}{" "}
                                                                </span>
                                                                expires on
                                                                <span className="text-danger fw-semibold">
                                                                    {" "}{formDataDocUpload.ExpiryDate || "unselected"}
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

                                    <div className="col-12 mb-2">
                                        <label className="form-label">
                                            Document Upload:<span className="text-danger">*</span>
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

                                    <div className="col-12 mb-2" style={{ marginTop: '1rem' }}>
                                        <label className="form-label">Description<span className="text-danger">*</span></label>
                                        <div className="input-group">
                                            <textarea
                                                className="form-control"
                                                name="Description"
                                                rows={2}
                                                placeholder="Enter description..."
                                                value={formDataDocUpload.Description}
                                                onChange={handleUploadDocInputChange}
                                            ></textarea>
                                        </div>
                                    </div>

                                    <div className="col-12 mb-2">
                                        <label className="form-label">Comment<span className="text-danger">*</span></label>
                                        <div className="input-group">
                                            <textarea
                                                className="form-control"
                                                name="Comments"
                                                rows={2}
                                                placeholder="Enter comment..."
                                                value={formDataDocUpload.Comments}
                                                onChange={handleUploadDocInputChange}
                                            ></textarea>
                                        </div>
                                    </div>
                                </div>

                                {(selectedContentType && !selectedContentType?.CanWrite) && (
                                    <div className="position-absolute top-0 start-0 w-100 h-100 d-flex flex-column align-items-center justify-content-center bg-white bg-opacity-25"
                                        style={{ zIndex: 10 }}>
                                        <div className="bg-white p-6 shadow-lg rounded-4 text-center border border-gray-200">
                                            <div className="symbol symbol-50px mb-3">
                                                <div className="symbol-label bg-light-danger">
                                                    <i className="fa-solid fa-lock text-danger fs-2"></i>
                                                </div>
                                            </div>
                                            <h4 className="text-gray-900 fw-bolder mb-1">Access Restricted</h4>
                                            <p className="text-gray-600 fs-7 fw-semibold px-4 mb-5">
                                                You don't have access to <span className="text-dark fw-bolder">Register Documents</span> for this specific document type.
                                                <br /><br />
                                                Please contact your <span className="text-primary fw-bold">System Administrator</span> to request the necessary rights.
                                            </p>
                                            <button
                                                className="btn btn-sm btn-light-primary fw-bold mt-2"
                                                onClick={() => window.location.reload()}
                                            >
                                                Request Access
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
