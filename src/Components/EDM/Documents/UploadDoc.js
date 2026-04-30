import React, { useEffect, useState, useRef, useCallback } from "react";
import Swal from 'sweetalert2';
import { Select, Collapse, Tooltip } from "antd";
import { fetchWithAuth } from "../../../utils/api";
import { Upload } from "antd";
import { InboxOutlined } from "@ant-design/icons";


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
    const [isExpiry, setIsExpiry] = useState(true);
    const [fileList, setFileList] = useState([]);
    const [activeAlertKey, setActiveAlertKey] = useState(["0"]);
    const [alertDates, setAlertDates] = useState([]); // holds generated alert dates
    const [alertsData, setAlertsData] = useState([]);

    const { Option } = Select;
    const { Dragger } = Upload;

    const [formDataDocUpload, setFormDataDocUpload] = useState({
        DocName: "",
        Description: "",
        FilePath: "",
        Comments: "",
    });

    const [formData, setFormData] = useState({
        OrgId: "",
        AlertTypeId: null,
        TableId: null,
        PocId: null,
        AlertTitle: null,
        Message: null,
        OcurrenceType: null,
        ScheduledDate: null,
        DaysOfWeek: null,
        DayOfMonth: null,
        ToUsers: null,
        StartDate: null,
        EndDate: null,
        CreatedBy: "",
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
        const cleanEmail = sessionUserData?.Email?.match(
            /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
        )?.[0];

        const directAssignAlertTypeId = alertTypesData?.find(
            (item) => item.DirectAssign === true
        )?.Id;

        const alertsJson = isExpiry
            ? {
                Alerts: [
                    {
                        AlertTypeId: directAssignAlertTypeId,
                        TableId: 0,
                        ModuleId: parseInt(sessionModuleId),
                        AlertTitle: "Document Expiry Alert",
                        Message: `Your document ${formDataDocUpload.DocName} is expiring on ${formDataDocUpload.ExpiryDate}.`,
                        OcurrenceType: 1,
                        ToUsers: cleanEmail,
                        StartDate: formDataDocUpload.ExpiryDate,
                        EndDate: formDataDocUpload.ExpiryDate,
                        IsMaintenance: 1,
                        ScheduledAlerts: [
                            {
                                ScheduledDate: formDataDocUpload.ExpiryDate
                            }
                        ]
                    },

                    ...alertsData
                ]
            }
            : {
                Alerts: [...alertsData]
            };


        // Create FormData Object
        const appendSafe = (fd, key, value) => {
            fd.append(key, value != null ? String(value).trim() : "");
        };
        const formData = new FormData();
        appendSafe(formData, "OrgId", sessionUserData?.OrgId);
        appendSafe(formData, "UserId", sessionUserData?.Id);
        appendSafe(formData, "Type", "ADDVERSION");
        appendSafe(formData, "Priority", 1);
        appendSafe(formData, "JsonData", JSON.stringify(jsonData));
        appendSafe(
            formData,
            "AlertsJson",
            alertsJson ? JSON.stringify(alertsJson) : ""
        );

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

    const getFirstReminderDate = (dateString) => {
        if (!dateString) return "unselected";

        // 1. Create a Date object from YYYY-MM-DD
        const date = new Date(dateString);

        // 2. Subtract 15 days
        date.setDate(date.getDate() - 15);

        // 3. Format as DD-MM-YYYY
        const d = String(date.getDate()).padStart(2, '0');
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const y = date.getFullYear();

        return `${d}-${m}-${y}`;
    };

    const showDeptDwn = sessionActionIds?.includes(25);
    const minDate = new Date(Date.now() + 86400000).toISOString().split("T")[0];

    const [showAlertModal, setShowAlertModal] = useState(false);
    const [extraAlerts, setExtraAlerts] = useState([
        {
            AlertTitle: "",
            AlertTypeId: null,
            Message: "",
            OcurrenceType: "",
            StartDate: "",
            EndDate: "",
        },
    ]);

    const handleAddMoreAlert = () => {
        setExtraAlerts((prev) => {
            const updated = [
                ...prev,
                {
                    AlertTitle: "",
                    AlertTypeId: null,
                    Message: "",
                    OcurrenceType: "",
                    StartDate: "",
                    EndDate: "",
                },
            ];

            setActiveAlertKey([String(updated.length - 1)]);
            return updated;
        });
    };

    const handleRemoveAlert = (removeIndex) => {
        setExtraAlerts((prev) => {
            const updated = prev.filter((_, index) => index !== removeIndex);

            if (updated.length === 0) {
                setActiveAlertKey([]);
            } else {
                const nextOpenIndex =
                    removeIndex > 0 ? removeIndex - 1 : 0;
                setActiveAlertKey([String(nextOpenIndex)]);
            }

            return updated;
        });
    };


    const handleExtraAlertChange = (index, field, value) => {
        setExtraAlerts((prev) =>
            prev.map((item, i) =>
                i === index ? { ...item, [field]: value } : item
            )
        );
    };

    // Get day name (e.g., Monday)
    const getDayName = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString("en-US", { weekday: "long" });
    };

    // Add months helper
    const addMonths = (date, months) => {
        const result = new Date(date);
        result.setMonth(result.getMonth() + months);
        return result;
    };

    const generateScheduledAlerts = (alert) => {
        const {
            OcurrenceType,
            StartDate,
            EndDate,
            ScheduledDate,
            DaysOfWeek,
            DayOfMonth
        } = alert;

        let generatedDates = [];

        if (OcurrenceType === "1" && ScheduledDate) {
            generatedDates = [{ ScheduledDate }];
        }

        else if (OcurrenceType === "2" && StartDate && EndDate && DaysOfWeek) {
            const start = new Date(StartDate);
            const end = new Date(EndDate);
            const selectedDays = DaysOfWeek.split(",").map(Number);

            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                const dayIndex = d.getDay() + 1;
                if (selectedDays.includes(dayIndex)) {
                    generatedDates.push({
                        ScheduledDate: d.toISOString().split("T")[0]
                    });
                }
            }
        }

        else if (OcurrenceType === "3" && StartDate && EndDate && DayOfMonth) {
            const start = new Date(StartDate);
            const end = new Date(EndDate);
            const day = Number(DayOfMonth.split(",")[0]);

            for (let d = new Date(start); d <= end; d.setMonth(d.getMonth() + 1)) {
                const target = new Date(d.getFullYear(), d.getMonth(), day);
                if (target >= start && target <= end) {
                    generatedDates.push({
                        ScheduledDate: target.toISOString().split("T")[0]
                    });
                }
            }
        }

        else if (["4", "5"].includes(OcurrenceType) && StartDate && EndDate) {
            const start = new Date(StartDate);
            const end = new Date(EndDate);
            const incrementMonths = OcurrenceType === "4" ? 3 : 6;

            for (let d = new Date(start); d <= end; d.setMonth(d.getMonth() + incrementMonths)) {
                generatedDates.push({
                    ScheduledDate: d.toISOString().split("T")[0]
                });
            }
        }

        else if (OcurrenceType === "6" && StartDate && EndDate && ScheduledDate) {
            const start = new Date(StartDate);
            const end = new Date(EndDate);

            const sched = new Date(ScheduledDate);
            let year = start.getFullYear();

            while (year <= end.getFullYear()) {
                const d = new Date(year, sched.getMonth(), sched.getDate());

                if (d >= start && d <= end) {
                    generatedDates.push({
                        ScheduledDate: d.toISOString().split("T")[0]
                    });
                }

                year++;
            }
        }

        return generatedDates;
    };

    const handleSaveAlerts = () => {
        const formattedAlerts = extraAlerts.map((alert) => ({
            AlertTypeId: alert.AlertTypeId,
            TableId: 0,
            ModuleId: sessionModuleId,
            AlertTitle: alert.AlertTitle,
            Message: alert.Message,
            OcurrenceType: Number(alert.OcurrenceType) || 0,
            ToUsers: alert.ToUsers || "",
            StartDate: alert.StartDate || "",
            EndDate: alert.EndDate || "",
            IsMaintenance: 0,
            ScheduledAlerts: generateScheduledAlerts(alert)
        }));

        setAlertsData(formattedAlerts);   // ✅ store globally
        setShowAlertModal(false);         // ✅ close modal

        console.log("Saved Alerts:", formattedAlerts);
    };

    function formatDateLocal(date) {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    }

    function generateMonthlyAlertDates(startDate, endDate, dayOfMonth) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const alerts = [];

        const year = start.getFullYear();
        const startMonth = start.getMonth();
        const endMonth = end.getMonth() + (end.getFullYear() - year) * 12;

        for (let i = startMonth; i <= endMonth; i++) {
            const currentYear = year + Math.floor(i / 12);
            const currentMonth = i % 12;

            const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
            const validDay = Math.min(dayOfMonth, lastDayOfMonth);

            const alertDate = new Date(currentYear, currentMonth, validDay);

            if (alertDate >= start && alertDate <= end) {
                alerts.push({
                    AlertDate: formatDateLocal(alertDate), // ✅ use local date
                    Day: alertDate.toLocaleDateString("en-US", { weekday: "long" }),
                });
            }
        }

        return alerts;
    }

    useEffect(() => {
        if (
            formData?.OcurrenceType === "3" &&
            formData?.StartDate &&
            formData?.EndDate &&
            formData?.DayOfMonth
        ) {
            const day = Number(formData.DayOfMonth.split(",")[0]);
            const dates = generateMonthlyAlertDates(formData.StartDate, formData.EndDate, day);
            setAlertDates(dates);
        }
    }, [formData.StartDate, formData.EndDate, formData.DayOfMonth]);

    useEffect(() => {
        setAlertDates([]);
    }, [formData.OcurrenceType]);


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
                    @keyframes spin-slow {
                        from { transform: rotate(0deg); }
                        to { transform: rotate(360deg); }
                    }

                    .animate-spin-slow {
                        animation: spin-slow 8s linear infinite;
                        display: inline-block;
                    }
                        .premium-alert-collapse .ant-collapse-item {
                        border: 1px solid #e9edf5 !important;
                        border-radius: 12px !important;
                        margin-bottom: 14px;
                        overflow: hidden;
                        background: #fff;
                        box-shadow: 0 4px 18px rgba(15, 23, 42, 0.04);
                    }

                    .premium-alert-collapse .ant-collapse-header {
                        align-items: center !important;
                        padding: 16px 18px !important;
                    }

                    .premium-alert-collapse .ant-collapse-content-box {
                        padding-top: 4px !important;
                    }

                    .premium-alert-collapse .ant-collapse-item-active {
                        border-color: rgba(13, 110, 253, 0.35) !important;
                        box-shadow: 0 8px 24px rgba(13, 110, 253, 0.08);
                    }

                                            .premium-add-alert-btn {
                        border: none !important;
                        border-radius: 14px !important;
                        padding: 10px 16px !important;
                        font-weight: 700 !important;
                        color: #fff !important;
                        background: linear-gradient(135deg, #0d6efd, #38bdf8) !important;
                        box-shadow: 0 12px 26px rgba(13, 110, 253, 0.22);
                    }

                    .premium-add-alert-btn:hover {
                        transform: translateY(-1px);
                    }

                    .premium-alert-modal {
                        border: 0 !important;
                        border-radius: 22px !important;
                        overflow: hidden;
                        box-shadow: 0 24px 60px rgba(15, 23, 42, 0.18);
                    }

                    .premium-alert-block {
                        background: linear-gradient(145deg, #ffffff, #f8fbff);
                        border: 1px solid rgba(13, 110, 253, 0.10);
                        border-radius: 18px;
                        padding: 16px;
                        box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
                    }

                    .premium-alert-block-title {
                        font-size: 15px;
                        font-weight: 800;
                        color: #1e3a8a;
                    }

                    .premium-add-more-inline-btn {
                        border-radius: 12px !important;
                        font-weight: 700 !important;
                        color: #0d6efd !important;
                        background: #eef6ff !important;
                        border: 1px solid #bfdbfe !important;
                    }
                `}
            </style>
            <div>
                <div className="offcanvas-header d-flex justify-content-between align-items-center mb-3">
                    <h5 id="offcanvasRightLabel" className="mb-0">Register Document</h5>
                    <div className="d-flex align-items-center">
                        <button className="btn btn-warning btn-sm me-2 shadow-sm"
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
                                    </div>

                                    {isExpiry && (
                                        <div className="my-3 animate__animated animate__fadeIn">
                                            <div className="card border-1 shadow-sm p-2 border border-success">
                                                <div className="d-flex align-items-center gap-2 mb-3">
                                                    <div className="bg-success bg-opacity-10 text-success rounded p-2 d-flex align-items-center justify-content-center">
                                                        <i className="bi bi-clock-history animate-spin-slow"></i>
                                                    </div>

                                                    <div>
                                                        <div className="fw-semibold">Alerts & Notification</div>
                                                        <Tooltip title="If you give an expiry date, the expiry alert for this document will be created automatically.">
                                                            <small className="text-muted d-inline-flex align-items-center gap-1 cursor-pointer">
                                                                Configure expiry alert
                                                                <i className="bi bi-info-circle text-primary fs-7"></i>
                                                            </small>
                                                        </Tooltip>
                                                    </div>

                                                    <div className="ms-auto">
                                                        <Tooltip title="Add additional custom alerts for this document" placement="top">
                                                            <button
                                                                type="button"
                                                                className="btn btn-success d-flex align-items-center btn-sm shadow-sm"
                                                                onClick={() => setShowAlertModal(true)}
                                                            >
                                                                <i className="bi bi-bell-fill me-2"></i>
                                                                Add More Alerts
                                                            </button>
                                                        </Tooltip>
                                                    </div>
                                                </div>
                                                <div className="row mb-3">
                                                    <div className="col-md-6 col-12">
                                                        <label className="form-label small fw-semibold">
                                                            Expiry Date <span className="text-danger">*</span>
                                                        </label>
                                                        <div className="input-group">
                                                            <span className="input-group-text bg-white">
                                                                <i className="bi bi-calendar-event text-success"></i>
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
                                                                <span className="text-success fw-semibold">
                                                                    {" "}
                                                                    {formDataDocUpload.ExpiryDate
                                                                        ? formDataDocUpload.ExpiryDate.split('-').reverse().join('-')
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
                                                <div className="text-success fw-bold mt-1" style={{ fontSize: "11px" }}>
                                                    <i className="fa-solid fa-bell fa-shake me-1"></i>
                                                    The first reminder is scheduled for {getFirstReminderDate(formDataDocUpload.ExpiryDate)}
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
                                        <label className="form-label">Description</label>
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
                                        <label className="form-label">Comment</label>
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

            {showAlertModal && (
                <div
                    className="modal fade show"
                    style={{ display: "block", background: "rgba(15, 23, 42, 0.45)" }}
                    tabIndex="-1"
                >
                    <div className="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
                        <div className="modal-content premium-alert-modal">
                            <div className="modal-header border-0 pb-2">
                                <div className="d-flex align-items-start gap-3">
                                    <div className="bg-primary bg-opacity-10 text-primary rounded-circle d-flex align-items-center justify-content-center"
                                        style={{ width: "42px", height: "42px" }}>
                                        <i className="bi bi-bell-fill fs-5"></i>
                                    </div>

                                    <div>
                                        <h5 className="mb-1 fw-bold text-dark">
                                            Additional Alerts
                                        </h5>
                                        <div className="text-muted small">
                                            Configure one or more custom document alerts
                                        </div>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={() => setShowAlertModal(false)}
                                ></button>
                            </div>

                            <div className="modal-body pt-2">
                                <Collapse
                                    accordion
                                    activeKey={activeAlertKey}
                                    onChange={(key) => setActiveAlertKey(key ? [key] : [])}
                                    className="premium-alert-collapse"
                                    expandIconPosition="end"
                                    items={extraAlerts.map((alert, index) => ({
                                        key: String(index),
                                        label: (
                                            <div className="d-flex justify-content-between align-items-center w-100 pe-3">
                                                <div className="fw-bold text-dark">
                                                    <i className="bi bi-bell-fill me-2 text-primary"></i>
                                                    Alert {index + 1}
                                                </div>

                                                <button
                                                    type="button"
                                                    className="btn btn-sm btn-light-danger"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleRemoveAlert(index);
                                                    }}
                                                >
                                                    <i className="bi bi-trash"></i>
                                                    Remove
                                                </button>
                                            </div>
                                        ),
                                        children: (
                                            <div className="row g-3 pt-2">
                                                <div className="col-md-6 col-12">
                                                    <label className="form-label small fw-semibold">
                                                        Alert Title<span className="text-danger">*</span>
                                                    </label>
                                                    <input
                                                        type="text"
                                                        className="form-control form-control-sm"
                                                        placeholder="Enter alert title"
                                                        value={alert.AlertTitle}
                                                        onChange={(e) =>
                                                            handleExtraAlertChange(index, "AlertTitle", e.target.value)
                                                        }
                                                    />
                                                </div>

                                                <div className="col-md-6 col-12">
                                                    <label className="form-label small fw-semibold">
                                                        Alert Type<span className="text-danger">*</span>
                                                    </label>
                                                    <Select
                                                        showSearch
                                                        placeholder="Choose alert type"
                                                        value={alert.AlertTypeId ?? undefined}
                                                        style={{ width: "100%", height: "2.7rem" }}
                                                        onChange={(value) =>
                                                            handleExtraAlertChange(index, "AlertTypeId", value)
                                                        }
                                                        optionFilterProp="children"
                                                        filterOption={(input, option) =>
                                                            (option?.children ?? "")
                                                                .toLowerCase()
                                                                .includes(input.toLowerCase())
                                                        }
                                                    >
                                                        {alertTypesData
                                                            ?.filter((item) => item.DirectAssign === false)
                                                            .map((item) => (
                                                                <Option key={item.Id} value={item.Id}>
                                                                    {item.TypeName}
                                                                </Option>
                                                            ))}
                                                    </Select>
                                                </div>

                                                <div className="col-12">
                                                    <label className="form-label small fw-semibold">
                                                        Message<span className="text-danger">*</span>
                                                    </label>
                                                    <textarea
                                                        rows={3}
                                                        className="form-control form-control-sm"
                                                        placeholder="Enter alert message"
                                                        value={alert.Message}
                                                        onChange={(e) =>
                                                            handleExtraAlertChange(index, "Message", e.target.value)
                                                        }
                                                    />
                                                </div>

                                                <div className="col-md-4 col-12">
                                                    <label className="form-label small fw-semibold">
                                                        Occurrence Type<span className="text-danger">*</span>
                                                    </label>
                                                    <Select
                                                        placeholder="Select occurrence"
                                                        value={alert.OcurrenceType || undefined}
                                                        style={{ width: "100%", height: "2.7rem" }}
                                                        onChange={(value) =>
                                                            handleExtraAlertChange(index, "OcurrenceType", value)
                                                        }
                                                        options={[
                                                            { label: "Once", value: "1" },
                                                            { label: "Weekly", value: "2" },
                                                            { label: "Monthly", value: "3" },
                                                            { label: "Quarterly", value: "4" },
                                                            { label: "Half-Yearly", value: "5" },
                                                            { label: "Yearly", value: "6" }
                                                        ]}
                                                    />
                                                </div>

                                                {/* Start Date */}
                                                {alert?.OcurrenceType && alert?.OcurrenceType !== "1" && (
                                                    <div className="col-md-4 col-12">
                                                        <label className="form-label small fw-semibold">
                                                            Start Date<span className="text-danger">*</span>
                                                        </label>
                                                        <input
                                                            type="date"
                                                            className="form-control form-control-sm"
                                                            value={alert.StartDate}
                                                            min={new Date().toISOString().split("T")[0]}
                                                            onChange={(e) =>
                                                                handleExtraAlertChange(index, "StartDate", e.target.value)
                                                            }
                                                        />
                                                    </div>
                                                )}

                                                {/* End Date */}
                                                {alert?.OcurrenceType && alert?.OcurrenceType !== "1" && (
                                                    <div className="col-md-4 col-12">
                                                        <label className="form-label small fw-semibold">
                                                            End Date<span className="text-danger">*</span>
                                                        </label>
                                                        <input
                                                            type="date"
                                                            className="form-control form-control-sm"
                                                            value={alert.EndDate}
                                                            min={alert.StartDate}
                                                            max={
                                                                alert.StartDate && alert.OcurrenceType === "2"
                                                                    ? new Date(addMonths(new Date(alert.StartDate), 2)).toISOString().split("T")[0]
                                                                    : alert.StartDate && alert.OcurrenceType === "3"
                                                                        ? new Date(addMonths(new Date(alert.StartDate), 3)).toISOString().split("T")[0]
                                                                        : alert.StartDate && ["4", "5", "6", "7"].includes(alert.OcurrenceType)
                                                                            ? new Date(addMonths(new Date(alert.StartDate), 24)).toISOString().split("T")[0]
                                                                            : undefined
                                                            }
                                                            onChange={(e) =>
                                                                handleExtraAlertChange(index, "EndDate", e.target.value)
                                                            }
                                                        />
                                                    </div>
                                                )}

                                                {alert?.OcurrenceType === "2" && (
                                                    <div className="col-md-4 col-12">
                                                        <label className="form-label small fw-semibold">
                                                            Days Of Week<span className="text-danger">*</span>
                                                        </label>

                                                        <Select
                                                            mode="multiple"
                                                            maxTagCount={2}
                                                            value={
                                                                alert.DaysOfWeek
                                                                    ? alert.DaysOfWeek.split(",").map(Number)
                                                                    : []
                                                            }
                                                            onChange={(value) => {
                                                                if (value.length > 2) value = value.slice(-2);
                                                                handleExtraAlertChange(index, "DaysOfWeek", value.join(","));
                                                            }}
                                                            style={{ width: "100%", height: "2.7rem" }}
                                                        >
                                                            {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
                                                                .map((day, i) => (
                                                                    <Option key={i + 1} value={i + 1}>{day}</Option>
                                                                ))}
                                                        </Select>
                                                    </div>
                                                )}
                                                {alert?.OcurrenceType === "3" && (
                                                    <div className="col-md-4 col-12">
                                                        <label className="form-label small fw-semibold">
                                                            Day Of Month<span className="text-danger">*</span>
                                                        </label>

                                                        <Select
                                                            mode="multiple"
                                                            maxTagCount={1}
                                                            value={alert.DayOfMonth ? alert.DayOfMonth.split(",") : []}
                                                            onChange={(value) => {
                                                                if (value.length > 1) value = [value[value.length - 1]];
                                                                handleExtraAlertChange(index, "DayOfMonth", value.join(","));
                                                            }}
                                                            style={{ width: "100%", height: "2.7rem" }}
                                                        >
                                                            {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                                                                <Option key={day} value={String(day)}>
                                                                    {day}
                                                                </Option>
                                                            ))}
                                                        </Select>
                                                    </div>
                                                )}
                                                {["1", "6"].includes(alert?.OcurrenceType) && (
                                                    <div className="col-md-4 col-12">
                                                        <label className="form-label small fw-semibold">
                                                            Schedule Date<span className="text-danger">*</span>
                                                        </label>
                                                        <input
                                                            type="date"
                                                            className="form-control form-control-sm"
                                                            value={alert.ScheduledDate}
                                                            min={new Date().toISOString().split("T")[0]}
                                                            onChange={(e) =>
                                                                handleExtraAlertChange(index, "ScheduledDate", e.target.value)
                                                            }
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        ),
                                    }))}
                                />

                                <div className="d-flex justify-content-between align-items-center mt-4 flex-wrap gap-3 sticky-bottom bg-white py-5">
                                    <button
                                        type="button"
                                        className="btn premium-add-more-inline-btn btn-sm shadow-sm"
                                        onClick={handleAddMoreAlert}
                                    >
                                        <i className="bi bi-plus-circle-fill text-primary"></i>
                                        Add More
                                    </button>

                                    <div className="d-flex gap-2">
                                        <button
                                            type="button"
                                            className="btn btn-light border btn-sm"
                                            onClick={() => setShowAlertModal(false)}
                                        >
                                            <i class="bi bi-x-lg"></i> Cancel
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-primary btn-sm"
                                            onClick={handleSaveAlerts}
                                        >
                                            <i class="bi bi-alarm"></i> Save Alerts
                                        </button>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
