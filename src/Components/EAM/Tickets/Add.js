import React, { useEffect, useState } from "react";
import Swal from 'sweetalert2';
import { Select } from "antd";
import { fetchWithAuth } from "../../../utils/api";
import PropTypes from "prop-types";
import { Upload } from "antd";

export default function RegisterTicket({ assetID, assetName, deptId }) {

    const { Dragger } = Upload;
    const [sessionUserData, setSessionUserData] = useState({});
    const [sessionModuleId, setSessionModuleId] = useState(null);
    const [addSubmitLoading, setAddSubmitLoading] = useState(false);
    const [assetsDDL, setAssetsDDL] = useState([]);
    const [machineStatusCheck, setMachineStatusCheck] = useState(false);
    const [showAddModuleModal, setShowAddModuleModal] = useState(false);
    const [typeName, setTypeName] = useState("");
    const [editTicketId, setEditTicketId] = useState(null);
    const [ticketCode, setTicketCode] = useState('');
    const [selectedDeptId, setSelectedDeptId] = useState(null);
    const [departmentsData, setDepartmentsData] = useState([]);
    const [sessionActionIds, setSessionActionIds] = useState([]);
    const [assetTypesData, setAssetTypesData] = useState([]);
    const [assetModuleTypesData, setAssetModuleTypesData] = useState([]);
    const [selectedAssetTypeId, setSelectedAssetTypeId] = useState(null);
    const { Option } = Select;

    const [formData, setFormData] = useState({
        MachineId: "",
        IssueType: "",
        Description: "",
        Priority: "",
        DueDate: "",
        MachineStatus: "",
        ModuleType: "",
        ImageUrl: null,
    });
    const [imagePreview, setImagePreview] = useState(null);

    useEffect(() => {
        if (formData.MachineId) {
            fetchMachineCheck();
        }
    }, [formData.MachineId]);

    const fetchMachineCheck = async () => {
        try {
            const response = await fetchWithAuth(`PMMS/CheckActiveTickets?MachineId=${formData.MachineId}`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });
            if (response.ok) {
                const data = await response.json();
                if (data?.ResultData[0]?.Status === 'true') {
                    setMachineStatusCheck(true);
                    setTicketCode(data.ResultData[0]?.TicketCode || '');
                    setEditTicketId(data.ResultData[0]?.TicketId || null);
                } else {
                    setMachineStatusCheck(false);
                    setTicketCode('');
                    setEditTicketId(null);
                }
            } else {
                console.error('Failed to fetch attendance data:', response.statusText);
            }
        } catch (error) {
            console.error('Error fetching attendance data:', error.message);
        }
    };

    useEffect(() => {
        const sessionMenuData = sessionStorage.getItem("menuData");
        try {
            const parsedMenu = JSON.parse(sessionMenuData);

            const ticketsMenu = parsedMenu.find(
                (item) => item.MenuName === "Tickets"
            );

            if (ticketsMenu) {
                const actionIdArray = ticketsMenu.ActionsIds?.split(",").map(Number);
                setSessionActionIds(actionIdArray);
            }
        } catch (err) {
            console.error("Error parsing menuData:", err);
        }
    }, []);

    const fetchAssetTypes = async () => {
        try {
            const storedModule = JSON.parse(localStorage.getItem("ModuleData"));
            const moduleId = storedModule?.Id?.toString();
            const response = await fetchWithAuth(
                `Portal/GetMasterTypes?OrgId=${sessionUserData?.OrgId}&DeptId=${selectedDeptId}&ModuleId=${moduleId}&TypeCategory=1`,
                {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                }
            );

            if (!response.ok) throw new Error("Network response was not ok");

            const data = await response.json();

            setAssetTypesData(data.ResultData || []);

        } catch (error) {
            console.error("Failed to fetch types data:", error);
            setAssetTypesData([]);
        }
    };

    const fetchAssetModuleTypes = async () => {
        try {
    
            if (!sessionUserData?.OrgId) {
                return;
            }
    
            const response = await fetchWithAuth(
                `Portal/GetMasterTypes?OrgId=${sessionUserData.OrgId}&DeptId=0&ModuleId=14&TypeCategory=4`,
                {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                }
            );
    
            if (!response.ok) throw new Error("Network response was not ok");
    
            const data = await response.json();
            setAssetModuleTypesData(data.ResultData || []);
        } catch (error) {
            console.error("Failed to fetch types data:", error);
            setAssetModuleTypesData([]);
        }
    };
    
    useEffect(() => {
        if (sessionUserData.OrgId && selectedDeptId) {
            fetchAssetTypes();
        }
    }, [sessionUserData, selectedDeptId]);
    
    useEffect(() => {
        if (sessionUserData?.OrgId) {
            fetchDDLData();
            setSelectedDeptId(sessionUserData?.DeptId);
            fetchAssetModuleTypes();
        }
    }, [sessionUserData?.OrgId]);    

    useEffect(() => {
        const userDataString = sessionStorage.getItem("userData");
        const storedModule = JSON.parse(localStorage.getItem("ModuleData"));
        if (userDataString) {
            const userData = JSON.parse(userDataString);
            const moduleId = storedModule?.Id?.toString();
            setSessionUserData(userData);
            setFormData((prev) => ({
                ...prev,
                CreatedBy: userData.Id,
                OrgId: userData.OrgId,
            }));
            setSessionModuleId(moduleId);
        }
    }, []);

    useEffect(() => {
        if (assetID > 0) {
            setFormData((prev) => ({
                ...prev,
                MachineId: assetID,
            }));
        }
    }, [assetID]);

    const fetchDDLData = async () => {
        try {
            const sessionDDL = sessionStorage.getItem("ddlTicketsAddData");

            if (sessionDDL) {
                const parsed = JSON.parse(sessionDDL);

                setDepartmentsData(parsed.depts || []);
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

            const departmentsFileredData = data.ResultData.filter(
                (item) => item.DDLName === "Departments"
            );

            setDepartmentsData(departmentsFileredData || []);

            sessionStorage.setItem(
                "ddlTicketsAddData",
                JSON.stringify({
                    depts: departmentsFileredData,
                })
            );

        } catch (error) {
            console.error("Failed to fetch DDL data:", error);
            setDepartmentsData([]);
        }
    };

    const fetchAssetsByType = async () => {
        try {
            const response = await fetchWithAuth(`PMMS/getAssetsByType?OrgId=${sessionUserData?.OrgId}&AssetTypeId=${selectedAssetTypeId}`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });
            if (response.ok) {
                const data = await response.json();
                setAssetsDDL(data.ResultData || []);
            } else {
                console.error('Failed to fetch attendance data:', response.statusText);
            }
        } catch (error) {
            console.error('Error fetching attendance data:', error.message);
        }
    };

    useEffect(() => {
        if (sessionUserData?.OrgId && selectedAssetTypeId) {
            fetchAssetsByType();
        }
    }, [sessionUserData, selectedAssetTypeId]);

    const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

    const handleInputChange = (eOrValue, name) => {
        if (eOrValue?.target) {
            const { name, value, files } = eOrValue.target;

            // 📁 File input validation
            if (name === "ImageUrl" && files?.length > 0) {
                const file = files[0];

                // ❌ size check
                if (file.size > MAX_FILE_SIZE) {
                    Swal.fire({
                        icon: "warning",
                        title: "File too large",
                        text: "Image size must be less than or equal to 2 MB.",
                    });

                    // reset file input
                    eOrValue.target.value = "";
                    return;
                }

                // ✅ valid file
                setFormData((prev) => ({ ...prev, [name]: file }));
                setImagePreview(URL.createObjectURL(file));
                return;
            }

            let formattedValue = value;

            if (name === "IssueType") {
                if (/^[^a-zA-Z]/.test(formattedValue)) return;

                formattedValue =
                    formattedValue.charAt(0).toUpperCase() + formattedValue.slice(1);
            }

            setFormData((prev) => ({ ...prev, [name]: formattedValue }));
        } else if (name) {
            setFormData((prev) => ({ ...prev, [name]: eOrValue }));
        }
    };

    const handleImageUploadChange = (info) => {
        const file = info?.fileList?.[0]?.originFileObj || info?.file?.originFileObj;

        if (!file) return;

        if (file.size > MAX_FILE_SIZE) {
            Swal.fire({
                icon: "warning",
                title: "File too large",
                text: "Image size must be less than or equal to 2 MB.",
            });
            return;
        }

        setFormData((prev) => ({ ...prev, ImageUrl: file }));
        setImagePreview(URL.createObjectURL(file));
    };

    const handlePriorityChange = (priority) => {
        let status = "ACTIVE";

        if (priority === "1") {
            status = "OUTOFSERVICE";
        }

        setFormData((prev) => ({
            ...prev,
            Priority: priority,
            MachineStatus: status, // 🔥 auto-set
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setAddSubmitLoading(true);

        if (!formData.MachineId || !formData.Priority) {
            Swal.fire({
                title: "warning",
                text: "Something went wrong try after some time..!",
                icon: "error",
            });
            setAddSubmitLoading(false);
            return;
        }

        if (!formData.MachineId) {
            Swal.fire({
                icon: "warning",
                title: "Incomplete Details",
                text: "Assset is mandatory.",
                showClass: {
                    popup: "animate__animated animate__shakeX",
                },
            });
            setAddSubmitLoading(false);

            return;
        }

        const currentDate = new Date();
        let daysToAdd = 0;

        switch (formData.Priority) {
            case 1: // Low
                daysToAdd = 7;
                break;
            case 2: // Medium
                daysToAdd = 5;
                break;
            case 3: // High
                daysToAdd = 3;
                break;
            default:
                daysToAdd = 7;
                break;
        }

        const dueDate = new Date(currentDate);
        dueDate.setDate(currentDate.getDate() + daysToAdd);

        // Format to YYYY-MM-DD
        const formattedDueDate = dueDate.toISOString().split("T")[0];
        formData.DueDate = formattedDueDate;

        const formDataPayload = new FormData();

        formDataPayload.append("OrgId", sessionUserData.OrgId);
        formDataPayload.append("Priority", formData.Priority);
        formDataPayload.append("TicketStatus", "NEW");
        formDataPayload.append("UserId", sessionUserData.Id);

        // Append file if present
        if (formData?.ImageUrl instanceof File) {
            formDataPayload.append("ImageUrl", formData.ImageUrl);
        }

        // Append the nested JSON as string
        const jsonData = {
            MachineId: formData.MachineId,
            IssueType: formData.IssueType,
            Description: formData.Description.replace(/\n/g, " ").trim(),
            MachineStatus: formData.MachineStatus,
            DueDate: formData.DueDate,
            ModuleType: formData.ModuleType,
            DeptId: assetName.length > 1 ? deptId : 0,
        };

        formDataPayload.append("JsonData", JSON.stringify(jsonData));

        try {
            const response = await fetchWithAuth(`file_upload/TicketsWorkFlow`, {
                method: "POST",
                body: formDataPayload,
            });

            const result = await response.json();

            if (result?.success) {
                if (result.data.result[0].ResponseCode === 2001) {
                    Swal.fire({
                        title: "Success",
                        text: result.data.result[0].Logs || "Ticket has been raised successfully.",
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

    const handleAddTypeSubmit = async () => {
        if (typeName.trim() === "") {
            Swal.fire({
                title: "Warning",
                text: "Module name field is mandatory.",
                icon: "warning",
            });
            return;
        }

        const payload = {
            TypeCategory: 4,
            TypeName: typeName,
            OrgId: sessionUserData?.OrgId,
            CreatedBy: sessionUserData?.Id,
            DeptId: 0,
            ModuleId: sessionModuleId,
            DirectAssign: 0,
        };

        try {
            Swal.fire({
                title: "Saving...",
                text: "Please wait",
                allowOutsideClick: false,
                allowEscapeKey: false,
                didOpen: () => {
                    Swal.showLoading();
                },
            });

            const response = await fetchWithAuth(`Portal/AddMasterTypes`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            const result = await response.json();

            if (result?.ResultData?.Status === "Success") {
                setTypeName("");
                setShowAddModuleModal(false);
                fetchAssetModuleTypes();

                Swal.fire({
                    title: "Success",
                    text: "Module has been saved successfully.",
                    icon: "success",
                });
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
        }
    };

    const priorityOptions = [
        { label: "Low", value: "3" },
        { label: "Medium", value: "2" },
        { label: "High", value: "1" },
    ];

    const showDeptDwn = sessionActionIds?.includes(25);

    return (
        <div
            className="offcanvas offcanvas-end"
            tabIndex="-1"
            id="offcanvasRightAdd"
            aria-labelledby="offcanvasRightLabel"
            style={{ width: "90%" }}
        >
            <style>
                {`
                @media (min-width: 768px) { /* Medium devices and up (md) */
                        #offcanvasRightAdd {
                            width: 44% !important;
                        }
                    }
                    .premium-upload-note {
                        display: flex;
                        align-items: flex-start;
                        gap: 14px;
                        padding: 14px 16px;
                        margin-bottom: 14px;
                        border-radius: 16px;
                        background:
                            radial-gradient(circle at top right, rgba(245, 158, 11, 0.12), transparent 30%),
                            linear-gradient(145deg, #fffaf0, #fff4db);
                        border: 1px solid rgba(245, 158, 11, 0.18);
                        box-shadow: 0 10px 24px rgba(245, 158, 11, 0.08);
                    }

                    .premium-upload-note-icon {
                        width: 42px;
                        height: 42px;
                        min-width: 42px;
                        border-radius: 14px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        background: linear-gradient(145deg, #f59e0b, #d97706);
                        color: #fff;
                        font-size: 16px;
                        box-shadow: 0 10px 20px rgba(217, 119, 6, 0.18);
                    }

                    .premium-upload-note-title {
                        font-size: 14px;
                        font-weight: 800;
                        color: #92400e;
                        margin-bottom: 2px;
                    }

                    .premium-upload-note-text {
                        font-size: 13px;
                        color: #a16207;
                        line-height: 1.5;
                    }

                       .premium-ticket-warning {
    display: flex;
    gap: 16px;
    align-items: flex-start;
    padding: 18px 18px 16px;
    margin-bottom: 14px;
    border-radius: 18px;
    background:
        radial-gradient(circle at top right, rgba(59, 130, 246, 0.14), transparent 28%),
        linear-gradient(145deg, #f3f9ff, #e0f2fe);
    border: 1px solid rgba(59, 130, 246, 0.18);
    box-shadow: 0 14px 30px rgba(59, 130, 246, 0.10);
}

.premium-ticket-warning-icon {
    width: 46px;
    height: 46px;
    min-width: 46px;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(145deg, #3b82f6, #0ea5e9);
    color: #fff;
    font-size: 18px;
    box-shadow: 0 12px 24px rgba(59, 130, 246, 0.22);
}

.premium-ticket-warning-title {
    font-size: 17px;
    font-weight: 800;
    color: #1d4ed8;
    margin-bottom: 4px;
}

.premium-ticket-warning-text {
    font-size: 14px;
    color: #1e40af;
    line-height: 1.55;
    margin-bottom: 12px;
}

.premium-ticket-code-wrap {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
    margin-bottom: 14px;
}

.premium-ticket-code-label {
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #2563eb;
}

.premium-ticket-code-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 8px 14px;
    border-radius: 999px;
    background: linear-gradient(145deg, #ffffff, #dbeafe);
    border: 1px solid rgba(59, 130, 246, 0.18);
    color: #1d4ed8;
    font-size: 13px;
    font-weight: 800;
    box-shadow: 0 8px 20px rgba(59, 130, 246, 0.10);
    animation: ticketPulse 1.9s ease-in-out infinite;
}

.premium-ticket-warning-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
}

.premium-confirm-btn {
    border: none !important;
    color: #fff !important;
    background: linear-gradient(145deg, #2563eb, #0ea5e9) !important;
    border-radius: 12px !important;
    padding: 8px 14px !important;
    font-weight: 700 !important;
    box-shadow: 0 12px 22px rgba(37, 99, 235, 0.18);
}

.premium-cancel-btn {
    border-radius: 12px !important;
    padding: 8px 14px !important;
    font-weight: 700 !important;
    background: #fff !important;
    color: #1e40af !important;
    border: 1px solid rgba(30, 64, 175, 0.14) !important;
}

.premium-confirm-btn:hover,
.premium-cancel-btn:hover {
    transform: translateY(-1px);
}

@keyframes ticketPulse {
    0% {
        transform: scale(1);
        box-shadow: 0 8px 20px rgba(59, 130, 246, 0.10);
    }
    50% {
        transform: scale(1.03);
        box-shadow: 0 12px 26px rgba(59, 130, 246, 0.18);
    }
    100% {
        transform: scale(1);
        box-shadow: 0 8px 20px rgba(59, 130, 246, 0.10);
    }
}

.premium-ticket-info-strip {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 10px;
    padding: 12px 16px;
    margin-bottom: 14px;
    border-radius: 16px;
    background: linear-gradient(145deg, #eff6ff, #dbeafe);
    border: 1px solid rgba(59, 130, 246, 0.18);
    box-shadow: 0 10px 24px rgba(59, 130, 246, 0.10);
}

.premium-ticket-info-label {
    font-size: 13px;
    font-weight: 700;
    color: #1d4ed8;
    text-transform: uppercase;
    letter-spacing: 0.04em;
}

.premium-ticket-info-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 8px 14px;
    border-radius: 999px;
    background: linear-gradient(145deg, #ffffff, #e0f2fe);
    border: 1px solid rgba(59, 130, 246, 0.16);
    color: #0369a1;
    font-size: 13px;
    font-weight: 800;
    box-shadow: 0 8px 18px rgba(3, 105, 161, 0.10);
}

                `}
            </style>

            <form autoComplete="off" onSubmit={handleSubmit}>
                {/* {ticketCode && (
                    <button
                        type="button"
                        className="btn btn-light-warning btn-sm d-flex align-items-center shadow-sm"
                        onClick={() => setIsModalOpen(true)}
                    >
                        <i className="fa-solid fa-pen-to-square me-1"></i>
                        Edit Ticket
                    </button>
                )} */}
                <div className="offcanvas-header border-bottom bg-white px-4 py-3 shadow-sm">
                    <div className="d-flex justify-content-between align-items-center w-100 gap-3">
                        <div className="d-flex align-items-center gap-3">
                            <div className="rounded-3 d-flex align-items-center justify-content-center bg-primary bg-opacity-10 border border-primary-subtle shadow-sm"
                                style={{ width: "46px", height: "46px" }}>
                                <i className="fa-solid fa-ticket text-primary fs-5"></i>
                            </div>

                            <div>
                                <h5 id="offcanvasRightLabel" className="mb-0 fw-bold text-dark">
                                    Register Ticket
                                </h5>
                                <div className="small text-muted">
                                    Create and manage a new asset issue ticket
                                </div>
                            </div>
                        </div>

                        <div className="d-flex align-items-center gap-2">
                            <button
                                className="btn btn-primary btn-sm px-3 d-flex align-items-center rounded-3 shadow-sm"
                                type="submit"
                                disabled={addSubmitLoading || machineStatusCheck}
                            >
                                <i className="bi bi-bookmark-check me-2"></i>
                                {addSubmitLoading ? "Submitting..." : "Submit"}
                            </button>

                            <button
                                type="button"
                                className="btn btn-light btn-sm rounded-3 border shadow-sm d-flex align-items-center justify-content-center"
                                data-bs-dismiss="offcanvas"
                                aria-label="Close"
                                onClick={() => fetchMachineCheck()}
                                style={{ width: "38px", height: "38px" }}
                            >
                                <i className="fa-solid fa-xmark text-muted"></i>
                            </button>
                        </div>
                    </div>
                </div>

                <div className="offcanvas-body" style={{ marginTop: "-1rem", maxHeight: "calc(100vh - 4rem)", overflowY: "auto" }}>
                    <div className="premium-upload-note">
                        <div className="premium-upload-note-icon">
                            <i className="fa-solid fa-image"></i>
                        </div>

                        <div className="premium-upload-note-content">
                            <div className="premium-upload-note-title">
                                Upload Note
                            </div>
                            <div className="premium-upload-note-text">
                                Image size must be less than <strong>2MB</strong>.
                            </div>
                        </div>
                    </div>

                    {machineStatusCheck ? (
                        <div className="premium-ticket-warning">
                            <div className="premium-ticket-warning-icon">
                                <i className="fa-solid fa-triangle-exclamation"></i>
                            </div>

                            <div className="premium-ticket-warning-content">
                                <div className="premium-ticket-warning-title">
                                    Ticket Already Open
                                </div>

                                <div className="premium-ticket-warning-text">
                                    A ticket is already open for this asset. If you still want to raise another ticket, please confirm.
                                </div>

                                <div className="premium-ticket-code-wrap">
                                    <span className="premium-ticket-code-label">
                                        <i className="fa-solid fa-ticket me-2"></i>
                                        Existing Ticket
                                    </span>

                                    <span className="premium-ticket-code-badge">
                                        {ticketCode}
                                    </span>
                                </div>

                                <div className="premium-ticket-warning-actions">
                                    <button
                                        type="button"
                                        className="btn premium-confirm-btn btn-sm"
                                        onClick={() => setMachineStatusCheck(false)}
                                    >
                                        <i className="fa-solid fa-circle-check me-2"></i>
                                        Yes, Continue
                                    </button>

                                    <button
                                        type="button"
                                        className="btn premium-cancel-btn btn-sm"
                                        data-bs-dismiss="offcanvas"
                                    >
                                        <i className="fa-solid fa-ban me-2"></i>
                                        No, Keep Existing
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : ticketCode ? (
                        <div className="premium-ticket-info-strip">
                            <div className="premium-ticket-info-label">
                                <i className="fa-solid fa-ticket me-2"></i>
                                Existing Ticket Code
                            </div>

                            <div className="premium-ticket-info-badge">
                                {ticketCode}
                            </div>
                        </div>
                    ) : null}


                    <br />
                    <div className="row">
                        {showDeptDwn && assetID === 0 && (
                            <div className="col-12 col-md-6 mb-2 d-flex flex-column">
                                <label className="form-label">
                                    Department<span className="text-danger">*</span>
                                </label>
                                <Select
                                    showSearch
                                    placeholder="Select Department"
                                    className="w-100"
                                    value={selectedDeptId || undefined}
                                    style={{ height: "2.8rem" }}
                                    onChange={(value) => { setSelectedDeptId(value); setSelectedAssetTypeId(null) }}
                                    optionFilterProp="children"
                                    filterOption={(input, option) =>
                                        option.children.toLowerCase().includes(input.toLowerCase())
                                    }
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
                        )}
                        {assetID === 0 && (
                            <div className="col-12 col-md-6 mb-2 d-flex flex-column">
                                <label className="form-label">
                                    Asset Type<span className="text-danger">*</span>
                                </label>
                                <Select
                                    showSearch
                                    placeholder="Select Asset Type"
                                    className="w-100"
                                    value={selectedAssetTypeId || undefined}
                                    style={{ height: "2.8rem" }}
                                    onChange={(value) => setSelectedAssetTypeId(value)}
                                    filterOption={(input, option) => {
                                        const text = `${option?.children}`.toLowerCase();
                                        return text.includes(input.toLowerCase());
                                    }}
                                >
                                    {Array.isArray(assetTypesData) && assetTypesData.map((assTyp) => (
                                        <Option key={assTyp.Id} value={assTyp.Id}>
                                            {assTyp.TypeName}
                                        </Option>
                                    ))}
                                </Select>
                            </div>
                        )}
                        {assetID === 0 && (
                            <div className="col-12 mb-2">
                                <label className="form-label">
                                    Asset <span className="text-danger">*</span>
                                </label>
                                <Select
                                    showSearch
                                    placeholder="Select Asset"
                                    className="w-100"
                                    value={formData.MachineId || undefined}
                                    style={{ height: '2.8rem' }}
                                    onChange={(value) => handleInputChange(value, "MachineId")}

                                    /* Change 1: Add this custom filter logic */
                                    filterOption={(input, option) => {
                                        // This targets the data attributes we'll add to the Option
                                        const name = option.dataName?.toLowerCase() || "";
                                        const code = option.dataCode?.toLowerCase() || "";
                                        const search = input.toLowerCase();
                                        return name.includes(search) || code.includes(search);
                                    }}

                                    disabled={assetID > 0}
                                >
                                    {assetsDDL?.map((mcn, indx) => (
                                        /* Change 2: Pass search metadata as custom props to the Option */
                                        <Option
                                            key={indx}
                                            value={mcn.AssetId}
                                            dataName={mcn.AssetName} // Helper for search
                                            dataCode={mcn.Code}      // Helper for search
                                        >
                                            {mcn.AssetName} : <span className="text-primary fw-bold">{mcn.Code}</span>
                                        </Option>
                                    ))}
                                </Select>
                            </div>
                        )}
                        {assetID !== 0 && (
                            <div className="col-12 mb-2">
                                <label className="form-label">
                                    Asset <span className="text-danger">*</span>
                                </label>
                                <input
                                    className="form-control"
                                    type="text"
                                    value={assetName}
                                    readOnly
                                />
                            </div>
                        )}
                        <div className="col-12 col-md-6 mb-2">
                            <label className="form-label">Issue Type<span className="text-danger">*</span></label>
                            <input
                                type="text"
                                name="IssueType"
                                className={`form-control ${machineStatusCheck ? 'cursor-not-allowed' : ''}`}
                                placeholder="Enter issue type"
                                style={{ width: "100%", height: "2.8rem" }}
                                value={formData.IssueType}
                                onChange={handleInputChange}
                                autoComplete="off"
                                max={30}
                                required
                                disabled={machineStatusCheck}
                            />
                        </div>
                        <div className="col-12 col-md-6 mb-2 d-flex flex-column">
                            <label className="form-label">Module</label>

                            <div className="d-flex align-items-center gap-2">
                                <Select
                                    showSearch
                                    placeholder="Select Module"
                                    className="w-100"
                                    style={{ height: "2.8rem" }}
                                    value={formData.ModuleType}
                                    onChange={(value) =>
                                        setFormData((prev) => ({
                                            ...prev,
                                            ModuleType: value,
                                        }))
                                    }
                                    optionFilterProp="children"
                                    filterOption={(input, option) =>
                                        option.children.toLowerCase().includes(input.toLowerCase())
                                    }
                                >
                                    {Array.isArray(assetModuleTypesData) && assetModuleTypesData.map((assTyp) => (
                                        <Option key={assTyp.Id} value={assTyp.Id}>
                                            {assTyp.TypeName}
                                        </Option>
                                    ))}
                                </Select>

                                <button
                                    type="button"
                                    className="btn btn-light-primary btn-sm d-flex align-items-center justify-content-center"
                                    style={{ width: "38px", height: "38px" }}
                                    onClick={() => setShowAddModuleModal(true)}
                                    title="Add Module"
                                >
                                    <i className="bi bi-plus-lg"></i>
                                </button>
                            </div>
                        </div>

                        <div className="col-12 col-md-6 mb-2">
                            <label className="form-label">
                                Priority <span className="text-danger">*</span>
                            </label>

                            <Select
                                showSearch
                                placeholder="Choose Priority"
                                optionFilterProp="label"
                                style={{ width: "100%", height: "2.8rem" }}
                                value={formData.Priority || undefined}
                                onChange={(value) => handlePriorityChange(value)}
                                options={priorityOptions}
                                disabled={machineStatusCheck}
                            />
                        </div>
                        <div className="col-12 col-md-6 mb-2">
                            <label className="form-label">
                                Status <span className="text-danger">*</span>
                            </label>

                            <input
                                type="text"
                                className="form-control cursor-not-allowed"
                                value={
                                    formData.MachineStatus === "OUTOFSERVICE"
                                        ? "Out of Service"
                                        : "Active"
                                }
                                style={{ width: "100%", height: "2.8rem" }}
                                disabled
                                readOnly
                            />
                        </div>

                        <div>
                            <label className="form-label">Description<span className="text-danger">*</span></label>
                            <textarea
                                type="text"
                                name="Description"
                                className={`form-control ${machineStatusCheck ? 'cursor-not-allowed' : ''}`}
                                placeholder="Enter description"
                                value={formData.Description}
                                onChange={handleInputChange}
                                autoComplete="off"
                                rows={4}
                                disabled={machineStatusCheck}
                                required
                            />
                        </div>
                        <div className="col-12 mb-4 mt-2">
                            <label className="form-label">Image</label>
                            <div className="border rounded-3 bg-light p-1">
                                <Dragger
                                    name="ImageUrl"
                                    accept=".jpg,.jpeg,.png"
                                    multiple={false}
                                    maxCount={1}
                                    disabled={machineStatusCheck}
                                    showUploadList={false}
                                    beforeUpload={() => false}
                                    onChange={handleImageUploadChange}
                                    className={machineStatusCheck ? "cursor-not-allowed" : ""}
                                    style={{ padding: "0.15rem" }}
                                >
                                    <div className="py-2">
                                        <p className="mb-1">
                                            <i className="bi bi-cloud-arrow-up fs-4 text-primary"></i>
                                        </p>
                                        <p className="mb-1 fw-bold text-dark small">
                                            Drag and drop image here
                                        </p>
                                        <p className="mb-0 text-muted small">
                                            Click to browse | Max 2 MB
                                        </p>
                                    </div>
                                </Dragger>
                            </div>
                        </div>

                        {imagePreview && (
                            <div className="mt-3">
                                <img
                                    src={imagePreview}
                                    alt="Selected Preview"
                                    className="img-thumbnail"
                                    style={{ maxHeight: "200px", objectFit: "contain" }}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </form>

            {showAddModuleModal && (
                <div
                    className="modal fade show"
                    style={{ display: "block", background: "rgba(15, 23, 42, 0.45)" }}
                    tabIndex="-1"
                >
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 shadow">
                            <div className="modal-header">
                                <h5 className="modal-title fw-bold">
                                    <i className="bi bi-plus-circle me-2 text-primary"></i>
                                    Add Module
                                </h5>
                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={() => setShowAddModuleModal(false)}
                                ></button>
                            </div>

                            <div className="modal-body">
                                <div>
                                    <label className="form-label fw-semibold">
                                        Module Name <span className="text-danger">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Enter module name"
                                        value={typeName}
                                        onChange={(e) => setTypeName(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => setShowAddModuleModal(false)}
                                >
                                    <i class="bi bi-x-lg"></i>Cancel
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-primary btn-sm"
                                    onClick={handleAddTypeSubmit}
                                >
                                    <i class="bi bi-bookmark-check"></i>Submit
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}

RegisterTicket.propTypes = {
    assetID: PropTypes.number.isRequired,
    assetName: PropTypes.string,
    deptId: PropTypes.number,
};