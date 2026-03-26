
import React, { useState, useEffect, useRef } from "react";
import { BASE_IMAGE_API_GET, BASE_IMAGE_UPLOAD_API, BASE_IMG_DOC_DELETE, BASE_IMG_UPLOAD, MACHINE_INFO_HTML_API } from "../../Config/Config";
import '../../Config/Pagination.css';
import '../../Config/Loader.css';
import { Link, useParams } from "react-router-dom";
import { Button, Upload, Select, Tooltip } from 'antd';
import Swal from 'sweetalert2';
import { fetchWithAuth } from "../../../utils/api";
import { EyeOutlined, UploadOutlined } from "@ant-design/icons";
import QRCode from "qrcode";
import { formatToDDMMYYYY, formatToDDMMYYYY_HHMM } from "../../../utils/dateFunc";
import Base1 from "../../Config/Base1";
import RegisterMasterTypes from "../../Config/MasterTypes";
import { Collapse } from "antd";
import ViewAlert from "../Alerts/View";
import AddAlert from "../../MasterAlerts/Add";
import RegisterTicket from "../Tickets/Add";

export default function AssetDetailsView() {

    const { orgId, machineId } = useParams();
    const { Panel } = Collapse;
    const assetTabKey = `asset_active_tab_${machineId}`;

    const [activeTab, setActiveTab] = useState(() => {
        return sessionStorage.getItem(assetTabKey) || "nav-info";
    });

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1; // 1–12
    const [sessionUserData, setSessionUserData] = useState([]);
    const [departmentsData, setDepartmentsData] = useState([]);
    const [mcnAlertsLoading, setMcnAlertsLoading] = useState(false);
    const [alertsList, setAlertsList] = useState([]);
    const [machineData, setMachineData] = useState([]);
    const [machinePartsData, setMachinePartsData] = useState([]);
    const [dataLoading, setDataLoading] = useState(false);
    const [images, setImages] = useState([]);
    const [sessionActionIds, setSessionActionIds] = useState([]);
    const [partAddLoading, setPartAddLoading] = useState(false);
    const [editedParts, setEditedParts] = useState({});
    const [alertsData, setAlertsData] = useState([]);
    const [previewMCNImage, setPreviewMCNImage] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [usersList, setUsersList] = useState(null);
    const [updateLoading, setUpdateLoading] = useState(false);
    const [previewSpareImage, setPreviewSpareImage] = useState(null);
    const [blinkEye, setBlinkEye] = useState(null);
    const [targetAsset, setTargetAsset] = useState({ id: 0, name: "", deptId: 0 });

    // QR
    const [qrImage, setQrImage] = useState(null);
    const [qrTheme, setQrTheme] = useState("green");
    const [selectedMachine, setSelectedMachine] = useState(null);

    // edit
    const [editSubmitLoading, setEditSubmitLoading] = useState(false);
    const [selectedSectionId, setSelectedSectionId] = useState(null);
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [selectedSupplierId, setSelectedSupplierId] = useState(null);
    const [selectedDeptId, setSelectedDeptId] = useState(null);
    const [previewImage, setPreviewImage] = useState(null);
    const [assetTypesData, setAssetTypesData] = useState([]);
    const [selectedAssetTypeId, setSelectedAssetTypeId] = useState(null);
    const [selectedUnitId, setSelectedUnitId] = useState(null);
    const [removedImages, setRemovedImages] = useState([]);
    const [oldImages, setOldImages] = useState([]);
    const [newImages, setNewImages] = useState([]);
    const [deletedFileNames, setDeletedFileNames] = useState([]);
    const [selectedEditFiles, setSelectedEditFiles] = useState([]);
    const [suppliersData, setSuppliersData] = useState([]);
    const [selectedYear, setSelectedYear] = useState('0');
    const [selectedMonth, setSelectedMonth] = useState('0');
    const [selectedAlert, setSelectedAlert] = useState([]);
    const [logsData, setLogsData] = useState([]);

    // alert
    const initialAlertForm = {
        AlertType: "",
        AlertTitle: "",
        MaintenanceDate: "",
        ToUsers: [],
        PocId: null,
        Message: "",
    };

    const [formEditData, setFormEditData] = useState({
        OrgId: "",
        MachineName: "",
        UnitName: "",
        Model: "",
        UnitId: "",
        AssetTypeId: "",
        MachineCode: "",
        MachineMake: "",
        AssetCode: "",
        PONumber: "",
        InvoiceNumber: "",
        InstallationDate: "",
        UpcomingMaintenanceDate: "",
        DeptId: "",
        PurchaseDate: "",
        OperatorId: "",
        SectionId: "",
        SupplierId: "",
        MachineId: "",
        Status: "",
        UpdatedBy: "",
        ImageUrls: "",
        InvoicefileUrl: "",
        POfileUrl: "",
    });

    const { Option } = Select;
    const fileInputRef = useRef(null);
    const maxSizeMB = 2;
    const maxSizeBytes = maxSizeMB * 1024 * 1024;

    useEffect(() => {
        const sessionMenuData = sessionStorage.getItem("menuData");
        try {
            const parsedMenu = JSON.parse(sessionMenuData);

            const ticketsMenu = parsedMenu.find(
                (item) => item.MenuName === "Assets"
            );

            if (ticketsMenu) {
                const actionIdArray = ticketsMenu.ActionsIds?.split(",").map(Number);
                setSessionActionIds(actionIdArray);
            }
        } catch (err) {
            console.error("Error parsing menuData:", err);
        }
    }, []);

    useEffect(() => {
        if (activeTab) {
            sessionStorage.setItem(assetTabKey, activeTab);
        }
    }, [activeTab, assetTabKey]);

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

    useEffect(() => {
        if (sessionUserData?.OrgId && selectedDeptId) {
            fetchAssetTypes();
        }
    }, [selectedDeptId, sessionUserData]);

    useEffect(() => {
        if (sessionUserData.OrgId) {
            fetchDDLData();
        }
    }, [sessionUserData]);

    const fetchDDLData = async () => {
        try {
            const sessionDDL = sessionStorage.getItem("ddlAssetsViewData");

            if (sessionDDL) {
                const parsed = JSON.parse(sessionDDL);

                setDepartmentsData(parsed.depts || []);
                setUsersList(parsed.users || []);
                setSuppliersData(parsed.suppliers || []);
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

            const usersFilteredData = data.ResultData.filter(
                (item) => item.DDLName === "Users"
            );
            const suppliersFilteredData = data.ResultData.filter(
                (item) => item.DDLName === "Suppliers"
            );

            setDepartmentsData(departmentsFileredData || []);
            setUsersList(usersFilteredData || []);
            setSuppliersData(suppliersFilteredData || []);

            sessionStorage.setItem(
                "ddlAssetsViewData",
                JSON.stringify({
                    depts: departmentsFileredData,
                    users: usersFilteredData,
                    suppliers: suppliersFilteredData,
                })
            );

        } catch (error) {
            console.error("Failed to fetch DDL data:", error);
            setDepartmentsData([]);
            // setUnitsData([]);
        }
    };

    const handleDeleteAlert = async (item) => {
        Swal.fire({
            title: "Are you sure?",
            text: "Do you want to delete alert?",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#3085d6",
            cancelButtonColor: "#d33",
            confirmButtonText: "Yes, delete it!"
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const payload = {
                        AlertId: item.AlertId,
                        UpdatedBy: sessionUserData?.Id,
                    };

                    const response = await fetchWithAuth(`PMMS/InActiveMachineAlerts`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify(payload),
                    });
                    const result = await response.json();

                    if (result.ResultData?.Status === 'Success') {
                        fetchAlertsByAssetId();
                        Swal.fire("Success!", "Alert has been deleted.", "success");
                    } else {
                        const errorData = await response.json();
                        Swal.fire("Error!", errorData.ResultData?.ResultMessage || "Failed to delete alert.", "error");
                    }
                } catch (error) {
                    console.error("Error during user delete:", error.message);
                    Swal.fire("Error!", "An unexpected error occurred.", "error");
                }
            }
        });
    };

    const fetchMachineData = async () => {
        try {
            const res = await fetchWithAuth(`PMMS/GetMachineById?OrgId=${orgId}&MachineId=${machineId}`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });
            const json = await res.json();
            if (res.ok) setMachineData(json?.ResultData?.[0]);
        } catch (err) { console.error("Error fetching machine:", err); }
    };

    // 2. Fetch Parts (Call this after Add/Edit/Delete Part)
    const fetchPartsData = async () => {
        try {
            const res = await fetchWithAuth(`PMMS/GetPartsByMachineId?MachineId=${machineId}`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });
            const json = await res.json();
            if (res.ok) setMachinePartsData(json?.ResultData ?? []);
        } catch (err) { console.error("Error fetching parts:", err); }
    };

    // 3. Fetch Alerts
    const fetchAlertsData = async () => {
        setMcnAlertsLoading(true);
        // Date calculation logic remains the same
        const now = new Date();
        const fromDate = now.toISOString().split('T')[0];
        const next20 = new Date(now);
        next20.setDate(next20.getDate() + 20);
        const toDate = next20.toISOString().split('T')[0];

        try {
            const res = await fetchWithAuth(`public/AlertsByMachineId?MachineId=${machineId}&FromDate=${fromDate}&ToDate=${toDate}`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });
            const json = await res.json();
            if (res.ok) setAlertsData(json?.ResultData?.[0]);
        } catch (err) { console.error("Error fetching alerts:", err); }
        finally { setMcnAlertsLoading(false); }
    };

    // 4. Fetch Logs (Call this after any action to see the new activity)
    const fetchLogsData = async () => {
        const storedModule = JSON.parse(localStorage.getItem("ModuleData"));
        const moduleId = storedModule?.Id?.toString();
        try {
            const res = await fetchWithAuth(`Portal/GetLogsbyEntityId?OrgId=${sessionUserData?.OrgId}&EntityId=${machineId}&ModuleId=${moduleId}&EntityType=MachineReg`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });
            const json = await res.json();
            const normalizedLogs = Array.isArray(json?.ResultData) ? json.ResultData : [];
            setLogsData(normalizedLogs);
        } catch (err) { console.error("Error fetching logs:", err); }
    };

    const fetchAllData = async () => {
        setDataLoading(true);
        try {
            // Run all fetchers in parallel
            await Promise.all([
                fetchMachineData(),
                fetchPartsData(),
                fetchAlertsData(),
                fetchLogsData()
            ]);
        } finally {
            setDataLoading(false);
        }
    };

    useEffect(() => {
        const userDataString = sessionStorage.getItem("userData");
        if (userDataString) {
            const userData = JSON.parse(userDataString);
            setSessionUserData(userData);
        } else {
            console.log('session not avilable..!');
        }
    }, []);

    useEffect(() => {
        if (sessionUserData?.OrgId && machineId) {
            fetchAllData();
        }
    }, [machineId, sessionUserData?.OrgId]);

    const handleApprove = async (machineId) => {
        if (!usersList?.length) {
            Swal.fire("No Users", "No users available for assignment.", "warning");
            return;
        }

        const userOptions = usersList
            .map(
                (u) =>
                    `<option value="${u.ItemId}">${u.ItemValue}</option>`
            )
            .join("");

        const { value: selectedUserId } = await Swal.fire({
            title: "Approve Asset",
            html: `
                <div style="text-align:left">
                    <p className="text-muted mb-2">
                        Select a user to assign this machine after approval.
                    </p>
    
                    <label className="form-label fw-semibold">
                        <i className="fa-solid fa-user-check me-1 text-success"></i>
                        Assign To
                    </label>
    
                    <select 
                        id="assignedUser" 
                        className="swal2-select"
                        style="width:80%; padding:8px; border-radius:6px;"
                    >
                        <option value="">-- Select User --</option>
                        ${userOptions}
                    </select>
                </div>
            `,
            icon: "success",
            showCancelButton: true,
            confirmButtonText: `
                <i className="fa-solid fa-check-double me-1"></i> Approve
            `,
            cancelButtonText: "Cancel",
            focusConfirm: false,
            buttonsStyling: true,
            customClass: {
                confirmButton: "btn btn-success",
                cancelButton: "btn btn-light",
                popup: "shadow-lg rounded-3",
            },
            preConfirm: () => {
                const val = document.getElementById("assignedUser").value;
                if (!val) {
                    Swal.showValidationMessage("Please select a user to continue");
                    return false;
                }
                return val;
            },
        });

        if (!selectedUserId) return;

        const payload = {
            OrgId: sessionUserData?.OrgId,
            UserId: sessionUserData?.Id,
            Type: "APPROVED",
            Priority: 1,
            JsonData: {
                MachineId: machineId,
                AssignedUserId: Number(selectedUserId),
            },
        };

        try {
            Swal.fire({
                title: "Approving...",
                text: "Please wait while we approve the asset",
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                },
            });

            const res = await fetchWithAuth(`PMMS/AssetRegCycle`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const result = await res.json();

            if (result?.data?.result?.[0]?.ResponseCode === 5000) {
                Swal.fire({
                    title: "Approved Successfully",
                    text: "The asset has been approved and assigned.",
                    icon: "success",
                    confirmButtonText: "OK",
                }).then(() => fetchMachineData()); fetchAllData();
            } else {
                throw new Error("Unexpected response");
            }
        } catch (error) {
            Swal.fire({
                title: "Approval Failed",
                text: "Something went wrong. Please try again.",
                icon: "error",
            });
        }
    };

    const handleReject = async (machineId) => {
        const { value: reason } = await Swal.fire({
            title: "Reject Machine",
            input: "textarea",
            inputPlaceholder: "Enter reason for rejection...",
            inputAttributes: { "aria-label": "Type reason here" },
            showCancelButton: true,
            preConfirm: (value) => {
                if (!value) {
                    Swal.showValidationMessage("Please enter a reason");
                }
                return value;
            }
        });

        if (!reason) return;

        const payload = {
            OrgId: sessionUserData?.OrgId,
            UserId: sessionUserData?.Id,
            Type: "REJECTED",
            Priority: 1,
            JsonData: {
                MachineId: machineId,
                Reason: reason
            }
        };

        try {
            const res = await fetchWithAuth(`PMMS/AssetRegCycle`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const result = await res.json();
            if (result.data.result[0].ResponseCode === 2006) {
                Swal.fire({
                    title: "Success",
                    text: "Asset has been rejected successfully.",
                    icon: "success",
                }).then(() => fetchMachineData()); fetchAllData();
            }
            Swal.fire("Rejected", "Asset has been rejected.", "success");

        } catch (error) {
            Swal.fire("Error", "Rejection failed!", "error");
        }
    };

    const handleActive = async (machineId) => {
        const { value: assetCode } = await Swal.fire({
            title: "Create Asset code",
            input: "text",
            inputPlaceholder: "Enter asset code...",
            inputAttributes: { "aria-label": "Type asset code here" },
            showCancelButton: true,
            preConfirm: (value) => {
                if (!value) {
                    Swal.showValidationMessage("Please enter asset code.!");
                }
                return value;
            }
        });

        if (!assetCode) return;

        const payload = {
            OrgId: sessionUserData?.OrgId,
            UserId: sessionUserData?.Id,
            Type: "ACTIVE",
            Priority: 1,
            JsonData: {
                MachineId: machineId,
                AssetCode: assetCode
            }
        };

        try {
            const res = await fetchWithAuth(`PMMS/AssetRegCycle`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const result = await res.json();
            if (result.data.result[0].ResponseCode === 5000) {
                Swal.fire({
                    title: "Success",
                    text: "Asset code has been added successfully.",
                    icon: "success",
                }).then(() => fetchMachineData()); fetchAllData();
            }

        } catch (error) {
            Swal.fire("Error", "Asset code failed!", "error");
        }
    };


    // Part
    const [newPartData, setNewPartData] = useState({
        PartName: "",
        PartCode: "",
        PartModel: "",
        SerialNumber: "",
        InstallationDate: "",
        Status: "Active",
        Remarks: "",
        ImageUrl: null,
    });

    const isPartModified = (partId) => {
        const editedPart = editedParts[partId];
        if (!editedPart) return false;

        const originalPart = machinePartsData.find(p => p.PartId === partId);
        if (!originalPart) return false;

        // Check if any key in the edited object differs from the original
        return Object.keys(editedPart).some(key => {
            // Handle Date string comparison (avoiding T00:00:00 issues)
            if (key === 'InstallationDate' && editedPart[key] && originalPart[key]) {
                return editedPart[key] !== originalPart[key].split("T")[0];
            }
            return editedPart[key] !== originalPart[key];
        });
    };

    const updateEditedPart = (partId, field, value) => {
        setEditedParts((prev) => {
            // Get the base data for this part
            const originalPart = machinePartsData.find(p => p.PartId === partId);

            // Check if we already have edited data, or use original
            const existingData = prev[partId] || {
                ...originalPart,
                // Format the date IMMEDIATELY so the input can read it
                InstallationDate: originalPart?.InstallationDate?.split("T")[0]
            };

            return {
                ...prev,
                [partId]: {
                    ...existingData,
                    [field]: value,
                }
            };
        });
    };

    const handleAddPart = async () => {
        if (machinePartsData?.length >= 10) {
            Swal.fire({
                title: "Limit Reached",
                text: "You cannot add more than 5 parts. Please contact the admin.",
                icon: "warning",
            });
            return;
        }
        setPartAddLoading(true);
        const requiredFields = ["PartName", "PartCode", "PartModel", "InstallationDate", "Status", "ImageUrl"];

        const isValid = requiredFields.every((field) => newPartData[field]);

        if (!isValid) {
            Swal.fire({
                title: "Warning",
                text: "All fields are mandatory.",
                icon: "warning",
            });
            setPartAddLoading(false);
            return;
        }

        const formData = new FormData();
        // formData.append("MachineId", partsObj.MachineId);
        formData.append("PartName", newPartData.PartName);
        formData.append("PartCode", newPartData.PartCode);
        formData.append("PartModel", newPartData.PartModel);
        formData.append("SerialNumber", newPartData.SerialNumber);
        formData.append("InstallationDate", newPartData.InstallationDate);
        formData.append("Status", newPartData.Status);
        formData.append("Remarks", newPartData.Remarks);
        formData.append("CreatedBy", sessionUserData.Id);
        formData.append("MachineId", machineId);

        if (newPartData.ImageUrl) {
            formData.append("ImageUrl", newPartData.ImageUrl);
        }

        try {
            const res = await fetchWithAuth(`file_upload/AddMachineParts`, {
                method: "POST",
                body: formData,
            });

            const result = await res.json();

            if (res.ok && result?.ResultData?.Status === 'Success') {
                setPartAddLoading(false);
                Swal.fire("Success", "Machine part added successfully!", "success");
                setNewPartData({
                    PartName: "",
                    PartCode: "",
                    PartModel: "",
                    SerialNumber: "",
                    InstallationDate: "",
                    Status: "Active",
                    Remarks: "",
                    ImageUrl: null,
                });
                if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                }
                fetchPartsData();
                fetchLogsData();
            } else {
                setPartAddLoading(false);
                Swal.fire("Error", result?.ResultData[0]?.Message || "Failed to add part", "error");
            }
        } catch (error) {
            setPartAddLoading(false);
            console.error("Add part error:", error);
            Swal.fire("Error", "Something went wrong", "error");
        }
    };

    const handleSavePart = async (item) => {
        setUpdateLoading(true);
        const part = editedParts[item.PartId];
        if (!part) return;

        let finalImageUrl = part.ImageUrl;
        let filePathToDelete = "0";

        // Check if image was updated
        const isImageUpdated = part.ImageUrl instanceof File;

        if (isImageUpdated) {
            const file = part.ImageUrl;

            // ✅ Check if file size < 2MB
            const MAX_SIZE_MB = 2;
            if (file.size > MAX_SIZE_MB * 1024 * 1024) {
                Swal.fire("Warning", "Image size must be less than 2MB", "warning");
                return;
            }

            try {
                // ✅ Delete old image
                await fetch(`${BASE_IMG_DOC_DELETE}`, {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ type: "image", filename: item.ImageUrl }),
                });

                // ✅ Upload new image
                const imageForm = new FormData();
                imageForm.append("ImageUrl", file);

                const uploadRes = await fetch(`${BASE_IMG_UPLOAD}`, {
                    method: "POST",
                    body: imageForm,
                });

                const uploadData = await uploadRes.json();

                if (uploadRes.ok && uploadData?.data?.filename) {
                    finalImageUrl = uploadData.data.filename;
                    filePathToDelete = item.ImageUrl;
                } else {
                    Swal.fire("Error", "Image upload failed", "error");
                    return;
                }
            } catch (error) {
                console.error("Image handling error:", error);
                Swal.fire("Error", "Image upload/delete failed", "error");
                return;
            }
        }

        // ✅ Final payload
        const payload = {
            PartId: item.PartId,
            MachineId: part.MachineId,
            PartName: part.PartName,
            PartCode: part.PartCode,
            PartModel: part.PartModel,
            SerialNumber: part.SerialNumber,
            InstallationDate: part.InstallationDate,
            Status: "Active",
            Remarks: part.Remarks,
            UpdatedBy: sessionUserData.Id,
            ImageUrl: finalImageUrl instanceof File ? "" : finalImageUrl || "",
            FilePath: filePathToDelete,
        };

        try {
            const res = await fetchWithAuth(`PMMS/EditParts`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const result = await res.json();
            setUpdateLoading(false);

            if (result.ResultData?.Status === "Success") {
                Swal.fire("Success", "Part updated successfully", "success");

                setUpdateLoading(false);
                fetchPartsData();
                fetchLogsData();
                setEditedParts((prev) => {
                    const updated = { ...prev };
                    delete updated[item.PartId];
                    return updated;
                });
            } else {
                Swal.fire("Error", result?.error || "Update failed", "error");
                setUpdateLoading(false);
            }
        } catch (err) {
            console.error(err);
            Swal.fire("Error", "Something went wrong", "error");
            setUpdateLoading(false);
        }
    };

    const handleDeletePart = async (item) => {
        Swal.fire({
            title: "Are you sure?",
            text: "Do you want to delete part?",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#3085d6",
            cancelButtonColor: "#d33",
            confirmButtonText: "Yes, delete it!"
        }).then(async (result) => {
            if (result.isConfirmed) {
                setDeleteLoading(true);
                try {
                    const payload = {
                        FilePath: item.ImageUrl,
                        CreatedBy: sessionUserData.Id,
                        PartId: item.PartId
                    };

                    const response = await fetchWithAuth(`PMMS/InactiveParts`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify(payload),
                    });
                    const result = await response.json();

                    setDeleteLoading(false);
                    if (result.ResultData?.Status === 'Success') {
                        fetchPartsData();
                        fetchLogsData();
                        Swal.fire("Success!", "Part has been deleted.", "success");
                        setDeleteLoading(false);
                    } else {
                        const errorData = await response.json();
                        Swal.fire("Error!", errorData.ResultData?.ResultMessage || "Failed to delete part.", "error");
                        setDeleteLoading(false);
                    }
                } catch (error) {
                    console.error("Error during part delete:", error.message);
                    Swal.fire("Error!", "An unexpected error occurred.", "error");
                    setDeleteLoading(false);
                }
            }
        });
    };

    const formatPartInput = (value) => {
        // Disallow starting with space or dot
        if (/^[ .]/.test(value)) return "";

        // Capitalize first letter and letters after space or dot
        return value.replace(/\b\w/g, (char, index, str) => {
            if (index === 0 || str[index - 1] === ' ' || str[index - 1] === '.') {
                return char.toUpperCase();
            }
            return char;
        });
    };

    const handleQRDownload = async () => {
        if (!isQRAllowed) {
            Swal.fire({
                icon: "warning",
                title: "Not Allowed",
                text: "QR can be downloaded only after approval.",
            });
            return;
        }

        const storedModule = JSON.parse(localStorage.getItem("ModuleData"));
        const moduleId = storedModule?.Id?.toString();

        try {
            const response = await fetchWithAuth(`Portal/AddLogs`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    TicketId: 0,
                    Status: machineData?.Status,
                    Logs: `QR code downloaded for asset: ${selectedMachine?.MachineName} - ${selectedMachine?.MachineCode}`,
                    LogDate: new Date().toISOString().slice(0, 19).replace("T", " "),
                    ChangedBy: sessionUserData?.Id,
                    ModuleId: moduleId,
                    EntityId: selectedMachine?.MachineId,
                    EntityType: "MachineReg",
                }),
            });

            const result = await response.json();

            if (
                response.ok &&
                result?.ResultData?.Status === "Success"
            ) {
                const link = document.createElement("a");
                link.href = qrImage;
                link.download = `QR_${selectedMachine?.MachineCode}_${qrTheme}.png`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                Swal.fire({
                    icon: "success",
                    title: "Downloaded",
                    text: "QR code downloaded successfully.",
                    timer: 1500,
                    showConfirmButton: false,
                });
                fetchAllData();
            } else {
                throw new Error("Log creation failed");
            }

        } catch (error) {
            Swal.fire({
                icon: "error",
                title: "Download Failed",
                text: "Unable to download QR code. Please contact admin.",
            });
        }
    };



    // Edit
    useEffect(() => {
        if (sessionUserData?.OrgId && machineId) {
            fetchMachineData();
        }
    }, [sessionUserData, machineId]);

    const deleteRemovedEditImages = async () => {
        for (const filename of removedImages) {
            await fetch(`${BASE_IMG_DOC_DELETE}`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type: "image", filename }),
            });
        }
    };

    useEffect(() => {
        if (machineData) {
            setFormEditData({
                OrgId: machineData.OrgId || "",
                UnitName: machineData.UnitName || "",
                MachineName: machineData.MachineName || "",
                AssetCode: machineData.AssetCode || "",
                UnitId: machineData.UnitId || "",
                AssetTypeId: machineData.AssetTypeId || "",
                Model: machineData.Model || "",
                MachineId: machineData.MachineId || "",
                MachineCode: machineData.MachineCode || "",
                InvoiceNumber: machineData.InvoiceNumber || "",
                PONumber: machineData.PONumber || "",
                InvoiceNumber: machineData.InvoiceNumber || "",
                MachineMake: machineData.MachineMake || "",
                InstallationDate: machineData.InstallationDate?.split("T")[0] || "",
                UpcomingMaintenanceDate: machineData.UpcomingMaintenanceDate?.split("T")[0] || "",
                DeptId: machineData.DeptId || "",
                SectionId: machineData.SectionId || "",
                SupplierId: machineData.SupplierId || "",
                PurchaseDate: machineData.PurchaseDate?.split("T")[0] || "",
                POfileUrl: machineData.POfileUrl || "",
                POfileUrl: machineData.POfileUrl || "",
                Status: machineData.Status || "",
                UpdatedBy: machineData.UpdatedBy || "",
                ImageUrls: machineData.ImageUrls, // keep it empty unless you're showing existing image URLs
            });
            setSelectedDeptId(machineData?.DepartmentId);
            setSelectedSectionId(machineData?.SectionId);
            setSelectedSupplierId(machineData?.SupplierId);
            setSelectedUserId(machineData?.OperatorId);
            setSelectedUnitId(machineData?.UnitId);
            setSelectedAssetTypeId(machineData?.AssetTypeId);
            if (machineData?.ImageUrls) {
                const urlArray = machineData.ImageUrls.split(",");
                const fullUrls = urlArray.map(img => `${BASE_IMAGE_API_GET}${img}`);
                setImages(fullUrls); // Set as string URLs for preview

                // const oldImageArr = editObj.ImageUrls.split(",").map(img => img.trim());
                const oldImageArr = machineData.ImageUrls.split(",").map(img => img.trim());
                setOldImages(oldImageArr);
            }
        }
    }, [machineData]);

    const handleEditInputChange = (eOrValue, nameFromSelect = null) => {
        if (nameFromSelect) {
            setFormEditData((prev) => ({
                ...prev,
                [nameFromSelect]: eOrValue || "",
            }));
            return;
        }

        const { name, value } = eOrValue.target;
        let formattedValue = value;

        // Fields to apply title-casing and validation to
        const titleFields = ['MachineName', 'MachineCode', 'Model', 'Name'];

        if (titleFields.includes(name)) {
            // Disallow leading space or dot
            if (/^[ .]/.test(formattedValue)) return;

            // Remove spaces only for "Name" if needed
            if (name === 'Name') {
                formattedValue = formattedValue.replace(/\s+/g, '');
            }

            // Capitalize first letters after space or dot
            formattedValue = formattedValue.replace(/\b\w/g, (char, index, str) => {
                if (index === 0 || str[index - 1] === ' ' || str[index - 1] === '.') {
                    return char.toUpperCase();
                }
                return char;
            });
        }

        setFormEditData((prevState) => ({
            ...prevState,
            [name]: formattedValue,
        }));
    };

    const handleEditImageChange = (e) => {
        const selected = Array.from(e.target.files);
        const MAX_SIZE = 2 * 1024 * 1024;

        // Check total count
        const totalCount = oldImages.length + newImages.length + selected.length;
        if (totalCount > 5) {
            Swal.fire("Limit Exceeded", "You can upload up to 4 images only", "warning");
            return;
        }

        // Filter out large files
        const validFiles = selected.filter(file => {
            if (file.size > MAX_SIZE) {
                Swal.fire("File Too Large", `${file.name} exceeds 2MB`, "warning");
                return false;
            }
            return true;
        });

        setSelectedEditFiles(validFiles);
    };

    const handleRemoveOldEditImage = async (filename) => {
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
                    setDeletedFileNames(prev => [...prev, filename]);
                    setOldImages(prev => prev.filter(img => img !== filename));
                    setFormEditData(prev => ({
                        ...prev,
                        ImageUrls: prev.ImageUrls
                            .split(",")                // make array
                            .filter(img => img !== filename) // remove deleted file
                            .join(",")                 // back to string
                    }));
                    // Swal.fire("Deleted!", "Image has been removed.", "success");
                } else {
                    Swal.fire("Error", "Failed to delete image", "error");
                }
            } catch (error) {
                Swal.fire("Error", error.message, "error");
            }
        }
    };

    const handleRemoveNewEditImage = async (filename) => {
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
                    if (!result.success) {
                        throw new Error(result.message || "Failed to delete image");
                    }
                    setNewImages(prevImages => prevImages.filter(img => img !== filename));
                    // Swal.fire("Deleted!", "Image has been removed.", "success");
                } else {
                    Swal.fire("Error", "Failed to delete image", "error");
                }
            } catch (error) {
                Swal.fire("Error", error.message, "error");
            }
        }
    };

    const handleUploadEditImages = async () => {

        if (!selectedEditFiles.length) {
            Swal.fire("No Files", "Please select images to upload.", "info");
            return;
        }

        if (oldImages.length === 4 || newImages.length === 4 || selectedEditFiles.length + oldImages.length + newImages.length > 4) {
            Swal.fire(
                "Limit Reached",
                "Maximum 4 images allowed. Delete an old image to upload a new one.",
                "warning"
            );
            return;
        }

        const confirmUpload = await Swal.fire({
            title: "Upload Images?",
            text: `You are about to upload ${selectedEditFiles.length} images.`,
            icon: "question",
            showCancelButton: true,
            confirmButtonText: "Yes, upload",
        });

        if (confirmUpload.isConfirmed) {
            try {
                for (let file of selectedEditFiles) {
                    const formEditData = new FormData();
                    formEditData.append("ImageUrl", file);

                    const res = await fetch(`${BASE_IMG_UPLOAD}`, {
                        method: "POST",
                        body: formEditData,
                    });

                    if (res.ok) {
                        const result = await res.json();
                        if (result.success) {
                            // Swal.fire("Success", "Images uploaded successfully!", "success");
                            setNewImages(prev => [
                                ...prev,
                                result.data.filename,

                            ]);
                        } else {
                            Swal.fire("Error", result.message || `Failed to upload ${file.name}`, "error");
                        }
                    } else {
                        Swal.fire("Error", `Failed to upload ${file.name}`, "error");
                    }
                }

                setSelectedEditFiles([]); // clear selected after upload

            } catch (error) {
                Swal.fire("Error", error.message, "error");
            }
        }
    };

    const isFormUnchanged = () => {
        // Helper to treat null/undefined/empty string as the same
        const normalize = (val) => (val === null || val === undefined ? "" : String(val)).trim();

        // 1. Compare basic text/date fields (Normalize both sides)
        const hasFieldChanges =
            normalize(formEditData?.MachineName) !== normalize(machineData?.MachineName) ||
            normalize(formEditData?.Model) !== normalize(machineData?.Model) ||
            normalize(formEditData?.MachineCode) !== normalize(machineData?.MachineCode) ||
            normalize(formEditData?.InstallationDate) !== normalize(machineData?.InstallationDate?.split('T')[0]) ||
            normalize(formEditData?.MachineMake) !== normalize(machineData?.MachineMake) ||
            normalize(formEditData?.InvoiceNumber) !== normalize(machineData?.InvoiceNumber) ||
            normalize(formEditData?.PurchaseDate) !== normalize(machineData?.PurchaseDate);

        // 2. Compare Dropdown selections (Compare against initial state)
        // IMPORTANT: Ensure you compare against the same property name used in useEffect
        const hasDropdownChanges =
            Number(selectedDeptId) !== Number(machineData?.DeptId) && Number(selectedDeptId) !== Number(machineData?.DepartmentId) ||
            Number(selectedSupplierId) !== Number(machineData?.SupplierId) ||
            Number(selectedUnitId) !== Number(machineData?.UnitId) ||
            Number(selectedAssetTypeId) !== Number(machineData?.AssetTypeId);

        // 3. Compare Images
        const hasImageChanges = newImages.length > 0 || deletedFileNames.length > 0;

        return !hasFieldChanges && !hasDropdownChanges && !hasImageChanges;
    };

    const handleEditSubmit = async (status) => {

        const combinedImageUrls = [
            ...(formEditData.ImageUrls ? formEditData.ImageUrls.split(',') : []), // split old images into array
            ...newImages // add new ones
        ];

        if (combinedImageUrls.length > 4) {
            Swal.fire({
                title: "Too Many Images",
                text: `You can only have a maximum of 4 images. You currently have ${combinedImageUrls.length}.`,
                icon: "error",
                confirmButtonColor: "#009ef7"
            });
            setEditSubmitLoading(false);
            return;
        }

        const validations = [
            { value: formEditData?.MachineName, label: "Asset Name" },
            { value: formEditData?.Model, label: "Model Number" },
            { value: formEditData?.MachineCode, label: "Code" },
            { value: selectedDeptId, label: "Department" },
            { value: selectedSupplierId, label: "Supplier" },
            { value: selectedUnitId, label: "Unit/Location" },
            { value: selectedAssetTypeId, label: "Asset Type" },
            // { value: formEditData?.InstallationDate, label: "Installation Date" }
        ];

        // 3. Perform Validation Check
        const missingField = validations.find(field => !field.value || field.value === 0);

        if (missingField) {
            Swal.fire({
                title: "Required Field Missing",
                text: `Please provide the ${missingField.label}.`,
                icon: "warning",
                confirmButtonColor: "#009ef7"
            });
            setEditSubmitLoading(false);
            return;
        }

        // Optional: Validate that at least one image exists
        // if (combinedImageUrls.length === 0) {
        //     Swal.fire({
        //         title: "Images Required",
        //         text: "Please upload at least one image of the asset.",
        //         icon: "warning",
        //     });
        //     setEditSubmitLoading(false);
        //     return;
        // }

        const payload = {
            OrgId: sessionUserData?.OrgId,
            UserId: sessionUserData?.Id,
            Type: "EDIT",
            Priority: 1,
            JsonData: {
                MachineId: formEditData?.MachineId,
                MachineName: formEditData?.MachineName,
                Model: formEditData?.Model,
                DeptId: selectedDeptId,
                InstallationDate: formEditData?.InstallationDate,
                UpcomingMaintenanceDate: formEditData?.UpcomingMaintenanceDate,
                OperatorId: selectedUserId,
                SupplierId: selectedSupplierId,
                ImageUrls: combinedImageUrls.join(','),
                POfileUrl: null,
                InvoicefileUrl: null,
                PurchaseDate: formEditData?.PurchaseDate,
                AssetTypeId: selectedAssetTypeId,
                MachineMake: formEditData?.MachineMake,
                UnitId: selectedUnitId,
                InvoiceNumber: formEditData?.InvoiceNumber,
                Status: status,
            }
        }

        setEditSubmitLoading(true);

        try {

            await deleteRemovedEditImages();

            const response = await fetchWithAuth(`PMMS/AssetRegCycle`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const result = await response.json();

            if (result.data.result[0].ResponseCode === 2002) {
                Swal.fire({
                    title: "Success",
                    text: "Asset has been saved successfully.",
                    icon: "success",
                }).then(() => { fetchLogsData(); fetchMachineData(); setNewImages([]); setDeletedFileNames([]); });
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

    const handleReqApprovalSubmit = async (status) => {
        const confirmResult = await Swal.fire({
            title: "Send for Approval?",
            text: "Are you sure you want to send this asset for approval?",
            icon: "question",
            showCancelButton: true,
            confirmButtonText: "Yes, Send",
            cancelButtonText: "No, Cancel",
            confirmButtonColor: "#198754",
            cancelButtonColor: "#6c757d",
            reverseButtons: true,
        });

        // ❌ User clicked NO
        if (!confirmResult.isConfirmed) return;

        const payload = {
            OrgId: sessionUserData?.OrgId,
            UserId: sessionUserData?.Id,
            Type: status,
            Priority: 1,
            JsonData: {
                MachineId: machineId,
            },
        };

        setEditSubmitLoading(true);

        try {
            const response = await fetchWithAuth(`PMMS/AssetRegCycle`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const result = await response.json();

            if (result?.data?.result?.[0]?.ResponseCode === 5000) {
                await Swal.fire({
                    title: "Success",
                    text: "Asset has been sent for approval.",
                    icon: "success",
                    confirmButtonColor: "#198754",
                }).then(() => { fetchMachineData(); fetchLogsData(); })
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

    const handleViewImage = (image) => {
        if (image instanceof File) {
            const url = URL.createObjectURL(image);
            setPreviewImage(url);
        } else {
            setPreviewImage(image); // It's already a URL
        }
    };

    const handleCloseEditPreview = () => {
        setPreviewImage(null);
    };

    const getStatusBadgeClass = (status) => {
        switch (status?.toLowerCase()) {
            case "draft":
                return "badge-light-primary";
            case "approved":
                return "badge-light-success";
            case "rejected":
                return "badge-light-danger"; // 🌿 softer teal tone
            case "pending approval":
                return "badge-light-info";
            case "active":
                return "badge-light-purple";
            case "component added":
                return "badge-light-pink";
            case "component updated":
                return "badge-light-indigo";
            case "alert created":
                return "badge-light-brown";
            default:
                return "badge-light-gray";
        }
    };

    const generateQRImage = async (theme = "green") => {
        const url = `${MACHINE_INFO_HTML_API}${sessionUserData?.OrgId}/${machineData.MachineId}`;
        const isGreen = theme === "green";

        // 1. Generate QR Data URL
        const qrDataUrl = await QRCode.toDataURL(url, {
            width: 250,
            color: {
                dark: isGreen ? "#ffffff" : "#000000",
                light: isGreen ? "#00a651" : "#ffffff",
            },
            margin: 1,
        });

        const qrImage = new Image();
        qrImage.src = qrDataUrl;
        await new Promise((resolve) => (qrImage.onload = resolve));

        // 2. Setup Dimensions
        const qrSize = 250;
        const leftTextSpace = 50; // Width reserved for vertical text
        const padding = 25;
        const topMargin = 50;
        const lineHeight = 28;
        const spacing = 20;

        // Canvas dimensions
        const canvasWidth = qrSize + padding * 2 + leftTextSpace;

        // Calculate name height
        const tempCanvas = document.createElement("canvas");
        const tempCtx = tempCanvas.getContext("2d");
        tempCtx.font = "bold 22px Arial";

        const wrapText = (ctx, text, maxWidth) => {
            const words = (text || "").split(" ");
            const lines = [];
            let line = "";
            for (let n = 0; n < words.length; n++) {
                let testLine = line + words[n] + " ";
                if (ctx.measureText(testLine).width > maxWidth && n > 0) {
                    lines.push(line.trim());
                    line = words[n] + " ";
                } else { line = testLine; }
            }
            lines.push(line.trim());
            return lines;
        };

        const nameLines = wrapText(tempCtx, machineData.MachineName || "Machine Name", canvasWidth - 40);
        const totalHeight = topMargin + (nameLines.length * lineHeight) + spacing + qrSize + 110;

        const canvas = document.createElement("canvas");
        canvas.width = canvasWidth;
        canvas.height = totalHeight;
        const ctx = canvas.getContext("2d");

        // 3. Draw Background (Safe Rectangle)
        ctx.fillStyle = isGreen ? "#00a651" : "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 4. Draw Machine Name
        ctx.fillStyle = isGreen ? "#ffffff" : "#000000";
        ctx.font = "bold 22px Arial";
        ctx.textAlign = "center";
        nameLines.forEach((line, i) => {
            ctx.fillText(line, canvas.width / 2, topMargin + i * lineHeight);
        });

        // 5. Positions
        const qrY = topMargin + (nameLines.length * lineHeight) + spacing;
        const qrX = padding + leftTextSpace;

        // 6. Draw QR Image
        ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize);

        // 7. DRAW VERTICAL ASSET CODE (Left Side)
        ctx.save();
        // Position the pen to the left of the QR code
        const centerX = padding + (leftTextSpace / 2);
        const centerY = qrY + (qrSize / 2);
        ctx.translate(centerX, centerY);
        ctx.rotate(-Math.PI / 2); // Rotate 90 degrees CCW
        ctx.font = "bold 20px Arial";
        ctx.textAlign = "center";
        ctx.fillStyle = isGreen ? "#ffffff" : "#000000";
        ctx.fillText(machineData.AssetCode || "ASSET-CODE", 0, 0);
        ctx.restore();

        // 8. Draw Corner Brackets around QR
        ctx.strokeStyle = isGreen ? "#ffffff" : "#000000";
        ctx.lineWidth = 4;
        const len = 25;

        const drawBracket = (x1, y1, x2, y2, x3, y3) => {
            ctx.beginPath();
            ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x3, y3);
            ctx.stroke();
        };

        drawBracket(qrX, qrY + len, qrX, qrY, qrX + len, qrY); // Top Left
        drawBracket(qrX + qrSize - len, qrY, qrX + qrSize, qrY, qrX + qrSize, qrY + len); // Top Right
        drawBracket(qrX, qrY + qrSize - len, qrX, qrY + qrSize, qrX + len, qrY + qrSize); // Bottom Left
        drawBracket(qrX + qrSize - len, qrY + qrSize, qrX + qrSize, qrY + qrSize, qrX + qrSize, qrY + qrSize - len); // Bottom Right

        // 9. Bottom Details
        let bottomY = qrY + qrSize + 40;
        ctx.font = "bold 18px Arial";
        ctx.fillText(`Machine Code: ${machineData.MachineCode || "Code"}`, canvas.width / 2, bottomY);

        // bottomY += 25;
        // ctx.font = "16px Arial";
        // ctx.fillText(`Supplier: ${machineData.SupplierName || "N/A"}`, canvas.width / 2, bottomY);

        bottomY += 22;
        const date = machineData.PurchaseDate ? new Date(machineData.PurchaseDate).toLocaleDateString("en-GB") : "N/A";
        ctx.fillText(`Purchase: ${date}`, canvas.width / 2, bottomY);

        return canvas.toDataURL("image/png", 1.0);
    };

    // QR
    // const generateQRImage = async (theme = "green") => {
    //     const url = `${MACHINE_INFO_HTML_API}${sessionUserData?.OrgId}/${machineData.MachineId}`;
    //     const isGreen = theme === "green";

    //     // Generate QR Data URL
    //     const qrDataUrl = await QRCode.toDataURL(url, {
    //         width: 250,
    //         color: {
    //             dark: isGreen ? "#ffffff" : "#000000", // text color
    //             light: isGreen ? "#00a651" : "#ffffff", // background color
    //         },
    //         margin: 1,
    //     });

    //     // Load QR image
    //     const qrImage = new Image();
    //     qrImage.src = qrDataUrl;
    //     await new Promise((resolve) => (qrImage.onload = resolve));

    //     // Canvas setup
    //     const qrSize = 250;
    //     const padding = 25;
    //     const borderRadius = 20;
    //     const topMargin = 40;
    //     const lineHeight = 26;

    //     // Helper to wrap text
    //     function wrapText(ctx, text, maxWidth) {
    //         const words = (text || "").split(" ");
    //         const lines = [];
    //         let line = "";
    //         for (let n = 0; n < words.length; n++) {
    //             const testLine = line + words[n] + " ";
    //             const metrics = ctx.measureText(testLine);
    //             const testWidth = metrics.width;
    //             if (testWidth > maxWidth && n > 0) {
    //                 lines.push(line.trim());
    //                 line = words[n] + " ";
    //             } else {
    //                 line = testLine;
    //             }
    //         }
    //         lines.push(line.trim());
    //         return lines;
    //     }

    //     const tempCanvas = document.createElement("canvas");
    //     const tempCtx = tempCanvas.getContext("2d");
    //     tempCtx.font = "bold 22px Arial";
    //     const maxTextWidth = qrSize + padding * 2 - padding * 2;
    //     const nameLines = wrapText(tempCtx, machineData.MachineName || "Machine Name", maxTextWidth);

    //     const spacing = 20;
    //     const bottomTextLines = 3;
    //     const totalHeight =
    //         topMargin + nameLines.length * lineHeight + spacing + qrSize + bottomTextLines * 25 + 40;

    //     const canvas = document.createElement("canvas");
    //     canvas.width = qrSize + padding * 2;
    //     canvas.height = totalHeight;
    //     const ctx = canvas.getContext("2d");

    //     // Background
    //     ctx.fillStyle = isGreen ? "#00a651" : "#ffffff";
    //     ctx.beginPath();
    //     ctx.moveTo(borderRadius, 0);
    //     ctx.lineTo(canvas.width - borderRadius, 0);
    //     ctx.quadraticCurveTo(canvas.width, 0, canvas.width, borderRadius);
    //     ctx.lineTo(canvas.width, canvas.height - borderRadius);
    //     ctx.quadraticCurveTo(canvas.width, canvas.height, canvas.width - borderRadius, canvas.height);
    //     ctx.lineTo(borderRadius, canvas.height);
    //     ctx.quadraticCurveTo(0, canvas.height, 0, canvas.height - borderRadius);
    //     ctx.lineTo(0, borderRadius);
    //     ctx.quadraticCurveTo(0, 0, borderRadius, 0);
    //     ctx.closePath();
    //     ctx.fill();

    //     // Text color
    //     ctx.fillStyle = isGreen ? "#ffffff" : "#000000";
    //     ctx.font = "bold 22px Arial";
    //     ctx.textAlign = "center";

    //     nameLines.forEach((line, i) => {
    //         ctx.fillText(line, canvas.width / 2, topMargin + i * lineHeight);
    //     });

    //     // QR image
    //     const qrY = topMargin + nameLines.length * lineHeight + spacing;
    //     const qrX = padding;
    //     ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize);

    //     // White or Black borders
    //     ctx.strokeStyle = isGreen ? "#ffffff" : "#000000";
    //     const lineLength = 25;
    //     const lineWidth = 4;
    //     ctx.lineWidth = lineWidth;

    //     const drawCorner = (x1, y1, x2, y2, x3, y3) => {
    //         ctx.beginPath();
    //         ctx.moveTo(x1, y1);
    //         ctx.lineTo(x2, y2);
    //         ctx.lineTo(x3, y3);
    //         ctx.stroke();
    //     };

    //     drawCorner(qrX, qrY + lineLength, qrX, qrY, qrX + lineLength, qrY);
    //     drawCorner(qrX + qrSize - lineLength, qrY, qrX + qrSize, qrY, qrX + qrSize, qrY + lineLength);
    //     drawCorner(qrX, qrY + qrSize - lineLength, qrX, qrY + qrSize, qrX + lineLength, qrY + qrSize);
    //     drawCorner(
    //         qrX + qrSize - lineLength,
    //         qrY + qrSize,
    //         qrX + qrSize,
    //         qrY + qrSize,
    //         qrX + qrSize,
    //         qrY + qrSize - lineLength
    //     );

    //     let bottomY = qrY + qrSize + 30;
    //     ctx.font = "18px Arial";
    //     ctx.fillText(`Machie Code: ${machineData.MachineCode || "Code"}`, canvas.width / 2, bottomY);

    //     bottomY += 25;
    //     ctx.font = "16px Arial";
    //     ctx.fillText(`Supplier: ${machineData.SupplierName || "N/A"}`, canvas.width / 2, bottomY);

    //     bottomY += 22;
    //     const formattedDate = machineData.PurchaseDate
    //         ? new Date(machineData.PurchaseDate).toLocaleDateString("en-GB")
    //         : "N/A";
    //     ctx.fillText(`Purchase: ${formattedDate}`, canvas.width / 2, bottomY);

    //     return canvas.toDataURL("image/png", 1.0);

    // };

    const generateQR = async (machineData, theme = "green") => {
        return await generateQRImage(theme);
    };

    useEffect(() => {
        if (!machineData) return;

        const loadQR = async () => {
            setSelectedMachine(machineData);

            const img = await generateQR(machineData, "green");
            setQrImage(img);
            setQrTheme("green");
        };

        loadQR();
    }, [machineId, machineData]);

    const getNextDate = (dateStr) => {
        if (!dateStr) return "";
        const date = new Date(dateStr);
        date.setDate(date.getDate() + 1);
        return date.toISOString().split("T")[0];
    };

    const isFutureDate = (dateString) => {
        if (!dateString) return false;

        const today = new Date();
        today.setHours(0, 0, 0, 0); // normalize

        const targetDate = new Date(dateString);
        targetDate.setHours(0, 0, 0, 0);

        return targetDate > today;
    };

    const handlePreviewSpareImage = (imgSrc, partId) => {
        setPreviewSpareImage(imgSrc);
        setBlinkEye(partId);

        // remove blink after animation
        setTimeout(() => setBlinkEye(null), 1200);

        // open bootstrap modal
        const modal = new window.bootstrap.Modal(
            document.getElementById("imagePreviewSpareModal")
        );
        modal.show();
    };

    const fetchAlertsByAssetId = async () => {
        const storedModule = JSON.parse(localStorage.getItem("ModuleData"));
        const moduleId = storedModule?.Id?.toString();
        try {
            const response = await fetchWithAuth(`Portal/AlertsByMonth?OrgId=${sessionUserData?.OrgId}&ModuleId=${moduleId}&TableId=${machineId}&month=${selectedMonth}&year=${selectedYear}`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });
            if (!response.ok) throw new Error("Network response was not ok");

            const data = await response.json();

            const normalizedAlerts = Array.isArray(data?.ResultData)
                ? data.ResultData
                : [];

            setAlertsList(normalizedAlerts);
        } catch (error) {
            console.error("Failed to fetch alerts:", error);
            setAlertsList([]);
        }
    };

    useEffect(() => {
        if (sessionUserData?.OrgId && machineId && selectedYear && selectedMonth) {
            fetchAlertsByAssetId();
        }
    }, [sessionUserData, machineId, selectedYear, selectedMonth]);

    const handleDeactivate = async () => {
        const { value: reason } = await Swal.fire({
            title: "Deactivate Asset",
            text: "Are you sure you want to mark this asset as Inactive?",
            icon: "warning",
            input: "textarea",
            inputPlaceholder: "Enter reason for deactivation (Required)...",
            inputAttributes: { "aria-label": "Type reason here" },
            showCancelButton: true,
            confirmButtonColor: "#f1416c", // Standard danger/red color
            confirmButtonText: `<i class="bi bi-check2 text-white"></i> Yes, Deactivate`,
            cancelButtonText: `<i class="bi bi-x-lg text-white"></i> No, keep active`,
            preConfirm: (value) => {
                if (!value || value.trim().length < 5) {
                    Swal.showValidationMessage("Please provide a detailed reason (min 5 chars)");
                }
                return value;
            }
        });
    
        if (!reason) return;
        const cleanReason = reason.replace(/[\r\n]+/gm, " ").trim();

        const payload = {
            OrgId: sessionUserData?.OrgId,
            UserId: sessionUserData?.Id,
            Type: "INACTIVE",
            Priority: 1,
            JsonData: {
                MachineId: machineId,
                Reason: cleanReason,
            }
        };

        try {
            const res = await fetchWithAuth(`PMMS/AssetRegCycle`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const result = await res.json();
            if (result.data.result[0].ResponseCode === 5000) {
                Swal.fire({
                    title: "Success",
                    text: "Asset has been deactivated successfully.",
                    icon: "success",
                }).then(() => fetchMachineData()); fetchAllData();
            }

        } catch (error) {
            Swal.fire("Error", "Rejection failed!", "error");
        }
    };

    const handleAlertClick = (alert) => {
        setSelectedAlert(alert);
        const offcanvasEl = document.getElementById("offcanvasRightViewEAMAlert");
        if (offcanvasEl) {
            const bsOffcanvas = new window.bootstrap.Offcanvas(offcanvasEl);
            bsOffcanvas.show();
        }
    };

    const years = Array.from(
        { length: 5 },
        (_, i) => (currentYear - 2) + i
    );

    const months = [
        { value: '0', label: "All" },
        { value: 2, label: "February" },
        { value: 3, label: "March" },
        { value: 4, label: "April" },
        { value: 5, label: "May" },
        { value: 6, label: "June" },
        { value: 7, label: "July" },
        { value: 8, label: "August" },
        { value: 9, label: "September" },
        { value: 10, label: "October" },
        { value: 11, label: "November" },
        { value: 12, label: "December" },
    ];

    const STEPS = [
        { key: "DRAFT", label: "DRAFT" },
        { key: "PENDING APPROVAL", label: "PENDING APPROVAL" },
        { key: "APPROVED", label: "APPROVED/REJECTED" },
        { key: "ASSET_CODE", label: "ASSET CODE" },
        { key: "ACTIVE", label: "ACTIVE" },
    ];

    const status = machineData?.Status;

    // Special handling
    let activeStepIndex = -1;

    if (status === "REJECTED") {
        activeStepIndex = STEPS.findIndex(s => s.key === "APPROVED");
    }
    else if (status === "ACTIVE" || status === "OUTOFSERVICE") {
        activeStepIndex = STEPS.findIndex(s => s.key === "ACTIVE");
    }
    else {
        activeStepIndex = STEPS.findIndex(s => s.key === status);
    }
    const isAssetCodeFilled =
        status === "ACTIVE" || status === "OUTOFSERVICE";

    const showEditBtn = sessionActionIds?.includes(3);
    const showApproveBtn = sessionActionIds?.includes(4);
    const ShowRejectBtn = sessionActionIds?.includes(5);
    const showDownQRBtn = sessionActionIds?.includes(9);
    // const showDeleteBtn = sessionActionIds?.includes(11);
    const showReqApproval = sessionActionIds?.includes(23);
    const showActivebtn = sessionActionIds?.includes(23);
    const showDeptEdit = sessionActionIds?.includes(30);

    const isQRAllowed = ["APPROVED", "ACTIVE", "OUTOFSERVICE"].includes(machineData?.Status) && showDownQRBtn
    const isApprove = ["PENDING APPROVAL"].includes(machineData?.Status) && showApproveBtn;
    const isRejected = machineData?.Status === "PENDING APPROVAL" && ShowRejectBtn;
    const isActive = machineData?.Status === "APPROVED" && showActivebtn;
    const isRequestApproval = ["DRAFT", "REJECTED"].includes(machineData?.Status) && !!machineData?.UpcomingMaintenanceDate && showReqApproval;

    return (
        <>
            <Base1>
                <div id="kt_app_toolbar" className="app-toolbar pt-3 pt-lg-6">
                    <div
                        id="kt_app_toolbar_container"
                        className="app-container container-xxl d-flex flex-column flex-lg-row gap-3"
                    >
                        <nav className="w-100 order-1 order-lg-1" >
                            <div className="d-flex flex-wrap gap-2">
                                <div className="d-flex gap-2 flex-wrap">
                                    <button
                                        className={`icon-tab-btn primary ${activeTab === "nav-info" ? "active-expand" : ""}`}
                                        onClick={() => setActiveTab("nav-info")}
                                    >
                                        <i className="fa-solid fa-circle-info"></i>
                                        <span className="icon-tab-label">Asset Info</span>
                                    </button>
                                    <button
                                        className={`icon-tab-btn info ${activeTab === "nav-edit" ? "active-expand" : ""}`}
                                        onClick={() => setActiveTab("nav-edit")}
                                        disabled={!showEditBtn}
                                    >
                                        <i className="fa-regular fa-pen-to-square"></i>
                                        <span className="icon-tab-label">Edit Asset</span>
                                    </button>
                                    <button
                                        className={`icon-tab-btn danger ${activeTab === "nav-alerts" ? "active-expand" : ""}`}
                                        onClick={() => setActiveTab("nav-alerts")}
                                    >
                                        <i className="fa-solid fa-bullhorn"></i>
                                        <span className="icon-tab-label">Alerts</span>
                                    </button>
                                    <button
                                        className={`icon-tab-btn dark ${activeTab === "nav-logs" ? "active-expand" : ""}`}
                                        onClick={() => setActiveTab("nav-logs")}
                                    >
                                        <i className="fa-solid fa-list-check"></i>
                                        <span className="icon-tab-label">Asset Logs</span>
                                    </button>
                                </div>
                            </div>
                        </nav>
                        <div className="d-flex align-items-center justify-content-end order-2 order-lg-2 gap-2">
                            <button
                                type="button"
                                className="btn btn-sm d-flex align-items-center text-white border-0 position-relative overflow-hidden text-nowrap"
                                style={{
                                    background: "linear-gradient(135deg, #6a11cb 0%, #2575fc 100%)",
                                    boxShadow: "0 4px 15px rgba(37, 117, 252, 0.3)",
                                    borderRadius: "8px",
                                    padding: "8px 16px",
                                    transition: "all 0.3s ease",
                                    height: "38px" // Fixed height helps keep it perfectly aligned
                                }}
                                data-bs-toggle="offcanvas"
                                data-bs-target="#offcanvasRightAdd"
                                aria-controls="offcanvasRightAdd"
                                onClick={() => setTargetAsset({ id: machineId, name: machineData?.MachineName, deptId: machineData?.DepartmentId })}
                            >
                                <i className="bi bi-ticket-perforated fs-5 me-2 text-white"></i>
                                <span className="d-none d-md-inline fw-bold text-uppercase" style={{ fontSize: '11px', letterSpacing: '0.5px' }}>
                                    Raise Ticket
                                </span>
                                <span className="pulse-white"></span>
                            </button>
                            <Link
                                to="/eam/assets"
                                className="btn btn-light-dark btn-sm border border-dark d-flex align-items-center shadow"
                                style={{ width: 'auto', padding: '8px 12px' }}>
                                <i className="fa-solid fa-arrow-left me-md-1"></i>
                                <span className="d-none d-md-inline">Back</span>
                            </Link>
                        </div>
                    </div>
                </div>

                <div id="kt_app_content" className={`app-content flex-column-fluid mb-10 ${dataLoading ? 'blurred' : ''}`}>

                    {dataLoading && (
                        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center bg-white bg-opacity-75"
                            style={{ zIndex: 9999 }}>
                            <div className="text-center">
                                <div className="spinner-border text-primary" role="status" style={{ width: "3rem", height: "3rem" }}>
                                    <span className="visually-hidden">Loading...</span>
                                </div>
                                {/* Optional: Add a small text under the spinner */}
                                <div className="mt-2 fw-bold text-primary">Loading...</div>
                            </div>
                        </div>
                    )}
                    <div id="kt_app_content_container" className="app-container container-xxl">
                        <div className="step-container d-flex align-items-center w-100 pt-2">
                            {STEPS.map((step, index) => {
                                const isActive = index === activeStepIndex;
                                let isFilled = false;

                                if (index < activeStepIndex) isFilled = true;
                                if (index === activeStepIndex) isFilled = true;

                                if (step.key === "ASSET_CODE") {
                                    isFilled = isAssetCodeFilled;
                                }

                                if (status === "REJECTED" && step.key === "ACTIVE") {
                                    isFilled = false;
                                }

                                return (
                                    <div key={step.key} className="text-center flex-fill position-relative">
                                        <div
                                            className={`step-circle-horizontal mx-auto
                                                ${isFilled ? "filled" : ""}
                                                ${isActive ? "active" : ""}
                                            `}
                                        >
                                            {index + 1}
                                        </div>

                                        {index !== STEPS.length - 1 && (
                                            <div
                                                className={`step-line-horizontal ${index < activeStepIndex ? "filled" : ""
                                                    }`}
                                            />
                                        )}

                                        <div className="step-label mt-2 fw-semibold">
                                            {step.label}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="card">
                            <div className="tab-content" id="nav-tabContent">
                                {activeTab === "nav-info" && (
                                    <div className="tab-pane fade show active"
                                        id="nav-info"
                                        role="tabpanel"
                                        aria-labelledby="nav-info-tab"
                                    >
                                        <div className="card-body px-2 px-sm-3">
                                            <div className="row g-4">
                                                <div className="col-lg-8 col-md-7">
                                                    <div className="card shadow-sm h-100">
                                                        <div className="card-body px-2 px-sm-3">
                                                            <div className="d-flex flex-column flex-md-row justify-content-md-between align-items-md-center gap-3 mb-3">
                                                                <div className="d-flex flex-column gap-2">
                                                                    <h5 className="text-dark fw-bold m-0">Asset Details</h5>

                                                                    {status === "OUTOFSERVICE" && (
                                                                        <div className="alert alert-warning d-flex align-items-center gap-2 py-1 px-3 mb-0">
                                                                            <i className="bi bi-exclamation-triangle-fill fs-6 text-danger"></i>
                                                                            <span className="fw-semibold small">
                                                                                Asset is currently Out of Service
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="d-flex flex-wrap gap-2">
                                                                    <button
                                                                        className="btn btn-light-success btn-sm px-3 flex-fill flex-md-grow-0"
                                                                        onClick={() => handleApprove(machineId)}
                                                                        disabled={!isApprove}
                                                                    >
                                                                        <i className="bi bi-patch-check fs-5 me-1"></i>Approve
                                                                    </button>

                                                                    <button
                                                                        className="btn btn-light-warning btn-sm px-3 flex-fill flex-md-grow-0"
                                                                        onClick={() => handleReject(machineId)}
                                                                        disabled={!isRejected}
                                                                    >
                                                                        <i className="bi bi-x-circle fs-5 me-1"></i>Reject
                                                                    </button>

                                                                    <button
                                                                        className="btn btn-light-info btn-sm px-3 flex-fill flex-md-grow-0"
                                                                        onClick={() => handleActive(machineId)}
                                                                        disabled={!isActive}
                                                                    >
                                                                        <i className="bi bi-building-check fs-5 me-1"></i>Active
                                                                    </button>

                                                                    <button
                                                                        className="btn btn-light-primary btn-sm px-3 flex-fill flex-md-grow-0"
                                                                        type="button"
                                                                        onClick={() => handleReqApprovalSubmit("PENDING APPROVAL")}
                                                                        disabled={!isRequestApproval || editSubmitLoading}
                                                                    >
                                                                        <i className="bi bi-send-exclamation fs-5 me-1"></i>Request for Approval
                                                                    </button>
                                                                    <button
                                                                        className="btn btn-light-danger btn-sm px-3 flex-fill flex-md-grow-0"
                                                                        type="button"
                                                                        onClick={handleDeactivate}
                                                                        disabled={(status === "ACTIVE" || status === "OUTOFSERVICE") ? false : true}
                                                                    >
                                                                        <i className="bi bi-send-exclamation fs-5 me-1"></i>Inactive
                                                                    </button>
                                                                </div>
                                                            </div>
                                                            {images?.length > 0 && (
                                                                <div className="row g-3 mb-2 mobile-scroll-container">
                                                                    {images?.map((img, i) => {
                                                                        const src = img instanceof File ? URL.createObjectURL(img) : img;
                                                                        return (
                                                                            <div className="col-6 col-md-4 col-lg-3" key={i}>
                                                                                <div
                                                                                    className="position-relative border rounded shadow-sm overflow-hidden"
                                                                                    style={{ height: "140px", cursor: "pointer" }}
                                                                                >
                                                                                    <span
                                                                                        className="position-absolute top-0 end-0 m-2 bg-dark bg-opacity-50 text-white rounded-circle p-1"
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation(); // Prevent trigger image click
                                                                                            setPreviewMCNImage(src);
                                                                                        }}
                                                                                        data-bs-toggle="modal"
                                                                                        data-bs-target="#imagePreviewModal"
                                                                                        style={{ zIndex: 10, cursor: "pointer" }}
                                                                                        title="Preview image"
                                                                                    >
                                                                                        <i className="fa-solid fa-eye fa-beat" style={{ fontSize: '12px' }}></i>
                                                                                    </span>
                                                                                    <img
                                                                                        src={src}
                                                                                        alt={`Machine Image ${i + 1}`}
                                                                                        style={{
                                                                                            width: "100%",
                                                                                            height: "100%",
                                                                                            objectFit: "cover",
                                                                                        }}
                                                                                        onClick={() => setPreviewMCNImage(src)}
                                                                                        data-bs-toggle="modal"
                                                                                        data-bs-target="#imagePreviewModal"
                                                                                    />
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            )}
                                                            <div className="card shadow-sm rounded-3">
                                                                <div className="card-body">
                                                                    <div className="row g-3">
                                                                        {[
                                                                            {
                                                                                icon: "bi bi-gear",
                                                                                label: "Asset Name",
                                                                                value: machineData?.MachineName || "-",
                                                                            },
                                                                            {
                                                                                icon: "bi bi-upc-scan",
                                                                                label: "Code",
                                                                                value: machineData?.MachineCode || "-",
                                                                            },
                                                                            {
                                                                                icon: "bi bi-upc-scan",
                                                                                label: "Asset Code",
                                                                                value: machineData?.AssetCode || "-",
                                                                            },
                                                                            {
                                                                                icon: "bi bi-cpu",
                                                                                label: "Model",
                                                                                value: machineData?.Model || "-",
                                                                            },
                                                                            {
                                                                                icon: "bi bi-building-gear",
                                                                                label: "Make",
                                                                                value: machineData?.MachineMake || "-",
                                                                            },
                                                                            {
                                                                                icon: "bi bi-diagram-3",
                                                                                label: "Department",
                                                                                value: machineData?.DeptName || "-",
                                                                            },
                                                                            {
                                                                                icon: "bi bi-layers",
                                                                                label: "Asset Type",
                                                                                value: machineData?.TypeName || "-",
                                                                            },
                                                                            {
                                                                                icon: "bi bi-truck",
                                                                                label: "Supplier",
                                                                                value: machineData?.SupplierName || "-",
                                                                            },
                                                                            {
                                                                                icon: "bi bi-calendar-check",
                                                                                label: "Purchase Date",
                                                                                value: formatToDDMMYYYY(machineData?.PurchaseDate),
                                                                            },
                                                                            {
                                                                                icon: "bi bi-calendar-plus",
                                                                                label: "Installation Date",
                                                                                value: formatToDDMMYYYY(machineData?.InstallationDate),
                                                                            },
                                                                            {
                                                                                icon: "bi bi-bell",
                                                                                label: "Next Due",
                                                                                value: machineData?.UpcomingMaintenanceDate
                                                                                    ? formatToDDMMYYYY(machineData.UpcomingMaintenanceDate)
                                                                                    : "N/A"
                                                                            },
                                                                            {
                                                                                icon: "bi bi-info-circle",
                                                                                label: "Status",
                                                                                value: (
                                                                                    <span
                                                                                        className="badge"
                                                                                        style={{
                                                                                            backgroundColor:
                                                                                                machineData?.Status === "ACTIVE"
                                                                                                    ? "#198754"
                                                                                                    : "red",
                                                                                            color: "#fff",
                                                                                        }}
                                                                                    >
                                                                                        {machineData?.Status || "-"}
                                                                                    </span>
                                                                                ),
                                                                            },
                                                                        ].map((detail, i) => (
                                                                            <div className="col-md-6 col-12" key={i}>
                                                                                <div className="d-flex align-items-start p-2 border rounded h-100">

                                                                                    {/* Icon */}
                                                                                    <i
                                                                                        className={`${detail.icon}`}
                                                                                        style={{
                                                                                            fontSize: "1.1rem",
                                                                                            color: "#4b49ac",
                                                                                            marginRight: "12px",
                                                                                            marginTop: "2px",
                                                                                            flexShrink: 0,
                                                                                        }}
                                                                                    />

                                                                                    {/* Text */}
                                                                                    <div>
                                                                                        <div
                                                                                            style={{
                                                                                                fontSize: "0.75rem",
                                                                                                color: "#6c757d",
                                                                                                fontWeight: 600,
                                                                                            }}
                                                                                        >
                                                                                            {detail.label}
                                                                                        </div>
                                                                                        <div
                                                                                            style={{
                                                                                                fontWeight: 500,
                                                                                                color: "#212529",
                                                                                                wordBreak: "break-word",
                                                                                            }}
                                                                                        >
                                                                                            {detail.value}
                                                                                        </div>
                                                                                    </div>

                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>

                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="col-lg-4 col-md-5">
                                                    {/* Removed h-100 to let the card height wrap the content naturally */}
                                                    <div className="card shadow-sm position-relative mb-4">
                                                        {/* Theme Switcher Header */}
                                                        <div className="position-absolute top-0 end-0 mx-3 mt-5 d-flex gap-2" style={{ zIndex: 10 }}>
                                                            <span
                                                                className={`badge cursor-pointer px-2 py-1 fs-8 ${qrTheme === "green" ? "bg-light-success border border-success text-success" : "bg-light text-muted"}`}
                                                                onClick={async () => {
                                                                    setQrTheme("green");
                                                                    setQrImage(await generateQR(selectedMachine, "green"));
                                                                }}
                                                            >
                                                                🟢 Green
                                                            </span>
                                                            <span
                                                                className={`badge cursor-pointer px-2 py-1 fs-8 ${qrTheme === "bw" ? "bg-light-dark border border-dark text-dark" : "bg-light text-muted"}`}
                                                                onClick={async () => {
                                                                    setQrTheme("bw");
                                                                    setQrImage(await generateQR(selectedMachine, "bw"));
                                                                }}
                                                            >
                                                                ⚫ B/W
                                                            </span>
                                                        </div>

                                                        <div className="card-body text-center d-flex flex-column align-items-center py-5">
                                                            <div id="printable-qr">
                                                                <h4 className="fw-bold mb-4 text-decoration-underline mt-14">Asset QR Code</h4>

                                                                <div className="mb-4 position-relative w-100" style={{ maxWidth: "320px" }}>
                                                                    <img
                                                                        src={qrImage}
                                                                        alt="QR Code"
                                                                        className="img-fluid rounded shadow-sm w-100 h-auto"
                                                                        style={{
                                                                            filter: isQRAllowed ? "none" : "blur(8px)",
                                                                            pointerEvents: isQRAllowed ? "auto" : "none",
                                                                            transition: "filter 0.3s ease",
                                                                            backgroundColor: "#fff"
                                                                        }}
                                                                    />

                                                                    {!isQRAllowed && showDownQRBtn && (
                                                                        <div className="position-absolute top-50 start-50 translate-middle w-75 text-center p-3 rounded"
                                                                            style={{ background: "rgba(0,0,0,0.7)", color: "#fff", zIndex: 2 }}>
                                                                            <i className="bi bi-shield-lock fs-2 d-block mb-2"></i>
                                                                            <span className="fw-bold">QR restricted</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <div className="d-flex justify-content-center gap-2 mt-2 w-100 px-3">
                                                                <Tooltip title="Coming Soon">
                                                                    <button
                                                                        className="btn btn-primary d-flex align-items-center justify-content-center flex-grow-1 opacity-50 cursor-help"
                                                                        // disabled={!isQRAllowed}
                                                                    >
                                                                        <i className="fa-solid fa-download fs-4 me-2"></i> Download
                                                                    </button>
                                                                </Tooltip>

                                                                <Tooltip title="Coming Soon">
                                                                    <button
                                                                        className="btn btn-primary d-flex align-items-center justify-content-center flex-grow-1 opacity-50 cursor-help"
                                                                        // disabled={!isQRAllowed}
                                                                    >
                                                                        <i className="fa-solid fa-print fs-4 me-2"></i> Print
                                                                    </button>
                                                                </Tooltip>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Asset images popup */}
                                        <div
                                            className="modal fade"
                                            id="imagePreviewModal"
                                            tabIndex="-1"
                                            aria-labelledby="imagePreviewLabel"
                                            aria-hidden="true"
                                        >
                                            <div className="modal-dialog modal-dialog-centered modal-lg">
                                                <div className="modal-content border-0">
                                                    <div className="modal-header bg-light">
                                                        <h5 className="modal-title" id="imagePreviewLabel">Image Preview</h5>
                                                        <button
                                                            type="button"
                                                            className="btn-close"
                                                            data-bs-dismiss="modal"
                                                            aria-label="Close"
                                                        ></button>
                                                    </div>

                                                    <div className="modal-body text-center">
                                                        {previewMCNImage ? (
                                                            <img
                                                                src={previewMCNImage}
                                                                alt="Preview"
                                                                className="img-fluid rounded shadow"
                                                                style={{
                                                                    maxHeight: "80vh",
                                                                    objectFit: "contain",
                                                                }}
                                                            />
                                                        ) : (
                                                            <p className="text-muted">No image selected</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Spare parts */}
                                        <div className="p-3">
                                            <div className="d-flex justify-content-between align-items-center px-3 mb-2">
                                                <h6 className="text-dark fw-bold m-0">Components</h6>
                                                <button
                                                    className="btn btn-primary btn-sm d-flex align-items-center"
                                                    data-bs-toggle="modal"
                                                    data-bs-target="#partAddModal">
                                                    <i className="bi bi-plus-square"></i>Add
                                                </button>
                                            </div>
                                            <div className="row g-4 my-3">
                                                {dataLoading ? (
                                                    <div className="text-center my-3 w-100">
                                                        <div className="spinner-border text-primary" />
                                                        <div className="mt-2">Loading asset components...</div>
                                                    </div>
                                                ) : Array.isArray(machinePartsData) && machinePartsData.length > 0 ? (
                                                    machinePartsData.map((item, index) => (
                                                        <div className="col-lg-6 col-md-12" key={item.PartId || index}>

                                                            <div className="accordion" id={`machinePartsAccordion-${item.PartId}`}>
                                                                <div className="accordion-item shadow-sm">
                                                                    <h2 className="accordion-header" id={`heading-${item.PartId}`}>
                                                                        <button
                                                                            className="accordion-button collapsed"
                                                                            type="button"
                                                                            data-bs-toggle="collapse"
                                                                            data-bs-target={`#collapse-${item.PartId}`}
                                                                            aria-expanded="false"
                                                                            aria-controls={`collapse-${item.PartId}`}
                                                                        >
                                                                            <div className="d-flex justify-content-between w-100 pe-3">
                                                                                <span className="fw-bold">
                                                                                    #{index + 1} — {item.PartName}
                                                                                </span>
                                                                                <span className="badge badge-light-primary">
                                                                                    {item.PartCode}
                                                                                </span>
                                                                            </div>
                                                                        </button>
                                                                    </h2>
                                                                    <div
                                                                        id={`collapse-${item.PartId}`}
                                                                        className="accordion-collapse collapse"
                                                                        aria-labelledby={`heading-${item.PartId}`}
                                                                    >
                                                                        <div className="accordion-body">
                                                                            <div className="row g-3">
                                                                                <div className="col-md-6">
                                                                                    <label>Component Name</label>
                                                                                    <input
                                                                                        className="form-control"
                                                                                        value={editedParts[item.PartId]?.PartName ?? item.PartName}
                                                                                        onChange={(e) =>
                                                                                            updateEditedPart(item.PartId, "PartName", e.target.value)
                                                                                        }
                                                                                        style={{ height: "2.8rem" }}
                                                                                    />
                                                                                </div>
                                                                                <div className="col-md-6">
                                                                                    <label>Component Code</label>
                                                                                    <input
                                                                                        className="form-control"
                                                                                        value={editedParts[item.PartId]?.PartCode ?? item.PartCode}
                                                                                        onChange={(e) =>
                                                                                            updateEditedPart(item.PartId, "PartCode", e.target.value)
                                                                                        }
                                                                                        style={{ height: "2.8rem" }}
                                                                                    />
                                                                                </div>
                                                                                <div className="col-md-6">
                                                                                    <label>Component Model</label>
                                                                                    <input
                                                                                        className="form-control"
                                                                                        value={editedParts[item.PartId]?.PartModel ?? item.PartModel}
                                                                                        onChange={(e) =>
                                                                                            updateEditedPart(item.PartId, "PartModel", e.target.value)
                                                                                        }
                                                                                        style={{ height: "2.8rem" }}
                                                                                    />
                                                                                </div>
                                                                                <div className="col-md-6">
                                                                                    <label>Serial Number</label>
                                                                                    <input
                                                                                        className="form-control"
                                                                                        value={editedParts[item.PartId]?.SerialNumber ?? item.SerialNumber}
                                                                                        onChange={(e) =>
                                                                                            updateEditedPart(item.PartId, "SerialNumber", e.target.value)
                                                                                        }
                                                                                        style={{ height: "2.8rem" }}
                                                                                    />
                                                                                </div>
                                                                                <div className="col-md-6">
                                                                                    <label>Installation Date</label>
                                                                                    <input
                                                                                        type="date"
                                                                                        className="form-control"
                                                                                        value={
                                                                                            editedParts[item.PartId]?.InstallationDate ??
                                                                                            item.InstallationDate?.split("T")[0]
                                                                                        }
                                                                                        onChange={(e) =>
                                                                                            updateEditedPart(item.PartId, "InstallationDate", e.target.value)
                                                                                        }
                                                                                        style={{ height: "2.8rem" }}
                                                                                    />
                                                                                </div>
                                                                                <div className="col-md-6">
                                                                                    <label>Image</label>
                                                                                    <div className="d-flex align-items-center gap-2">
                                                                                        <div
                                                                                            className="position-relative border rounded"
                                                                                            style={{ width: 60, height: 60 }}
                                                                                        >
                                                                                            <img
                                                                                                src={
                                                                                                    editedParts[item.PartId]?.ImageUrl instanceof File
                                                                                                        ? URL.createObjectURL(editedParts[item.PartId].ImageUrl)
                                                                                                        : `${BASE_IMAGE_API_GET}${editedParts[item.PartId]?.ImageUrl || item.ImageUrl}`
                                                                                                }
                                                                                                className="w-100 h-100"
                                                                                                style={{ objectFit: "cover" }}
                                                                                            />
                                                                                            <Button
                                                                                                size="small"
                                                                                                type="text"
                                                                                                icon={<EyeOutlined />}
                                                                                                className={`position-absolute top-0 end-0 eye-btn ${blinkEye === item.PartId ? "eye-blink" : ""}`}
                                                                                                onClick={() =>
                                                                                                    handlePreviewSpareImage(
                                                                                                        editedParts[item.PartId]?.ImageUrl instanceof File
                                                                                                            ? URL.createObjectURL(editedParts[item.PartId].ImageUrl)
                                                                                                            : `${BASE_IMAGE_API_GET}${editedParts[item.PartId]?.ImageUrl || item.ImageUrl}`,
                                                                                                        item.PartId
                                                                                                    )
                                                                                                }
                                                                                            />
                                                                                        </div>
                                                                                        <Upload
                                                                                            accept="image/*"
                                                                                            showUploadList={false}
                                                                                            beforeUpload={(file) => {
                                                                                                if (file.size > maxSizeBytes) {
                                                                                                    Swal.fire(
                                                                                                        "File Too Large",
                                                                                                        `Image must be less than ${maxSizeMB} MB.`,
                                                                                                        "error"
                                                                                                    );
                                                                                                    return Upload.LIST_IGNORE;
                                                                                                }
                                                                                                updateEditedPart(item.PartId, "ImageUrl", file);
                                                                                                return false;
                                                                                            }}
                                                                                        >
                                                                                            <Button size="small" icon={<UploadOutlined />}>
                                                                                                Upload
                                                                                            </Button>
                                                                                        </Upload>
                                                                                    </div>
                                                                                </div>
                                                                                <div className="col-12">
                                                                                    <label>Remarks</label>
                                                                                    <textarea
                                                                                        className="form-control"
                                                                                        value={editedParts[item.PartId]?.Remarks ?? item.Remarks}
                                                                                        onChange={(e) =>
                                                                                            updateEditedPart(item.PartId, "Remarks", e.target.value)
                                                                                        }
                                                                                    />
                                                                                </div>
                                                                            </div>
                                                                            <div className="d-flex justify-content-end gap-2 mt-4">
                                                                                <button
                                                                                    className="btn btn-light-danger btn-sm"
                                                                                    onClick={() => handleDeletePart(item)}
                                                                                    disabled={updateLoading || deleteLoading}
                                                                                >
                                                                                    <i className="bi bi-trash3"></i>{deleteLoading ? "Deleting..." : "Delete"}
                                                                                </button>

                                                                                <button
                                                                                    className="btn btn-light-success btn-sm"
                                                                                    onClick={() => handleSavePart(item)}
                                                                                    // disabled={updateLoading || deleteLoading}
                                                                                    disabled={updateLoading || deleteLoading || !isPartModified(item.PartId)}
                                                                                >
                                                                                    <i className="bi bi-bookmark-check"></i>{updateLoading ? "Saving..." : "Save"}
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="text-muted text-center w-100">
                                                        No asset components available.
                                                    </div>
                                                )}
                                                <div
                                                    className="modal fade"
                                                    id="imagePreviewSpareModal"
                                                    tabIndex="-1"
                                                    aria-hidden="true"
                                                >
                                                    <div className="modal-dialog modal-dialog-centered modal-lg">
                                                        <div className="modal-content border-0 shadow">
                                                            <div className="modal-header">
                                                                <h6 className="modal-title fw-bold">Image Preview</h6>
                                                                <button
                                                                    type="button"
                                                                    className="btn-close"
                                                                    data-bs-dismiss="modal"
                                                                />
                                                            </div>

                                                            <div className="modal-body text-center">
                                                                {previewSpareImage && (
                                                                    <img
                                                                        src={previewSpareImage}
                                                                        className="img-fluid rounded"
                                                                        style={{ maxHeight: "75vh", objectFit: "contain" }}
                                                                        alt="full-preview"
                                                                    />
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Add spare part */}
                                            <div className="modal fade"
                                                id="partAddModal"
                                                tabIndex="-1"
                                                aria-labelledby="partAddLabel"
                                                aria-hidden="true"
                                                style={{ background: "rgba(0,0,0,0.5)" }}>
                                                <div className="modal-dialog modal-lg">
                                                    <div className="modal-content">
                                                        <div className="modal-header">
                                                            <h5 className="modal-title">Add Asset Component</h5>
                                                            <button
                                                                type="button"
                                                                className="btn-close"
                                                                data-bs-dismiss="modal"
                                                                aria-label="Close"
                                                            ></button>
                                                        </div>
                                                        <div className="modal-body">
                                                            <div className="alert alert-warning p-2 mb-2">
                                                                ⚠️ Image must be less than 2MB.
                                                            </div>
                                                            <div className="row g-3">
                                                                {[
                                                                    ["PartName", "Component Name"],
                                                                    ["PartCode", "Component Code"],
                                                                    ["PartModel", "Component Model"],
                                                                    ["SerialNumber", "Serial Number"],
                                                                ].map(([key, label]) => (
                                                                    <div className="col-md-6" key={key}>
                                                                        <label className="form-label">{label}<span className="text-danger">*</span></label>
                                                                        <input
                                                                            type="text"
                                                                            className="form-control"
                                                                            value={newPartData[key]}
                                                                            onChange={(e) => {
                                                                                const formatted = formatPartInput(e.target.value);
                                                                                setNewPartData({ ...newPartData, [key]: formatted });
                                                                            }}
                                                                            placeholder={`Enter ${label}`}
                                                                        />
                                                                    </div>
                                                                ))}
                                                                <div className="col-md-6">
                                                                    <label className="form-label">
                                                                        Installation Date<span className="text-danger">*</span>
                                                                    </label>
                                                                    <input
                                                                        type="date"
                                                                        className="form-control"
                                                                        min={machineData?.InstallationDate ? machineData.InstallationDate.split('T')[0] : ""}
                                                                        value={newPartData.InstallationDate}
                                                                        onChange={(e) => {
                                                                            const selectedDate = e.target.value;
                                                                            if (!machineData?.InstallationDate || selectedDate >= machineData.InstallationDate.split('T')[0]) {
                                                                                setNewPartData({ ...newPartData, InstallationDate: selectedDate });
                                                                            }
                                                                        }}
                                                                        onKeyDown={(e) => { e.preventDefault(); }}
                                                                    />
                                                                    {machineData?.InstallationDate && (
                                                                        <div className="form-text text-muted" style={{ fontSize: '0.8rem' }}>
                                                                            Must be on or after machine installation: {formatToDDMMYYYY(machineData.InstallationDate)}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="col-12">
                                                                    <label className="form-label">Remarks</label>
                                                                    <textarea
                                                                        className="form-control"
                                                                        value={newPartData.Remarks}
                                                                        onChange={(e) => setNewPartData({ ...newPartData, Remarks: e.target.value })}
                                                                        placeholder="Enter remarks"
                                                                    ></textarea>
                                                                </div>
                                                                <div className="col-12">
                                                                    <label className="form-label">
                                                                        Image<span className="text-danger">*</span>
                                                                    </label>
                                                                    <input
                                                                        ref={fileInputRef}
                                                                        type="file"
                                                                        className="form-control"
                                                                        accept=".jpg,.jpeg,.png"
                                                                        onChange={(e) => {
                                                                            const file = e.target.files[0];
                                                                            if (file) {
                                                                                const maxSizeMB = 2;
                                                                                const maxSizeBytes = maxSizeMB * 1024 * 1024;

                                                                                if (file.size > maxSizeBytes) {
                                                                                    Swal.fire({
                                                                                        icon: 'error',
                                                                                        title: 'File Too Large',
                                                                                        text: `Image must be less than ${maxSizeMB} MB.`,
                                                                                    });
                                                                                    e.target.value = '';
                                                                                    return;
                                                                                }
                                                                                setNewPartData({ ...newPartData, ImageUrl: file });
                                                                            }
                                                                        }}
                                                                    />
                                                                </div>

                                                            </div>
                                                        </div>
                                                        <div className="modal-footer">
                                                            <button
                                                                className="btn btn-secondary"
                                                                type="button"
                                                                data-bs-dismiss="modal"
                                                                aria-label="Close"
                                                                disabled={partAddLoading}
                                                            ><i className="bi bi-x-lg"></i>Cancel</button>
                                                            <button
                                                                className="btn btn-success"
                                                                onClick={handleAddPart}
                                                                disabled={partAddLoading}
                                                            >
                                                                <i className="bi bi-bookmark-check fs-4"></i>{partAddLoading ? 'Submitting...' : 'Submit'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === "nav-edit" && (
                                    <div className="tab-pane fade show active"
                                        id="nav-edit"
                                        role="tabpanel"
                                        aria-labelledby="nav-edit-tab"
                                    >
                                        <div className="row px-5">
                                            <div className="d-flex justify-content-between align-items-center mb-3 p-0">
                                                <div className="card-header bg-light w-100">
                                                    <div className="d-flex align-items-center justify-content-between w-100">
                                                        <h4 className="mb-0 fw-bold text-dark">
                                                            <i className="bi bi-pencil-square me-2 text-primary fs-5"></i>
                                                            Edit asset
                                                        </h4>

                                                        <button
                                                            className="btn btn-warning btn-sm"
                                                            type="button"
                                                            onClick={() => handleEditSubmit(machineData?.Status)}
                                                            disabled={editSubmitLoading || isFormUnchanged()}
                                                        >
                                                            <i className="bi bi-bookmark-check me-1"></i>
                                                            {editSubmitLoading ? "Submitting..." : "Save"}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="col-6 col-md-4 mb-2">
                                                <label className="form-label">Unit<span className="text-danger">*</span></label>
                                                <input
                                                    type="text"
                                                    className="form-control cursor-not-allowed"
                                                    placeholder="Enter asset name"
                                                    style={{ height: '2.8rem' }}
                                                    value={formEditData.UnitName}
                                                    onChange={handleEditInputChange}
                                                    autoComplete="off"
                                                    required
                                                    disabled={true}
                                                />
                                            </div>
                                            <div className="col-6 col-md-4 mb-2">
                                                <label className="form-label">
                                                    Department <span className="text-danger">*</span>
                                                </label>
                                                <Select
                                                    showSearch
                                                    // allowClear
                                                    placeholder="Select Department"
                                                    className="w-100"
                                                    value={selectedDeptId || undefined}
                                                    style={{ height: '2.8rem' }}
                                                    onChange={(value) => setSelectedDeptId(value)}
                                                    optionFilterProp="children"
                                                    filterOption={(input, option) =>
                                                        option.children.toLowerCase().includes(input.toLowerCase())
                                                    }
                                                    disabled={!showDeptEdit}
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
                                            <div className="col-12 col-md-4 mb-2">
                                                <label className="form-label">
                                                    Asset Type <span className="text-danger">*</span>
                                                </label>
                                                <Select
                                                    showSearch
                                                    placeholder="Select Asset Type"
                                                    className="w-100"
                                                    value={selectedAssetTypeId || undefined}
                                                    style={{ height: '2.8rem' }}
                                                    onChange={(value) => setSelectedAssetTypeId(value)}
                                                    optionFilterProp="children"
                                                    filterOption={(input, option) =>
                                                        option.children.toLowerCase().includes(input.toLowerCase())
                                                    }
                                                    disabled={!showDeptEdit}
                                                >
                                                    {assetTypesData?.map((assTyp) => (
                                                        <Option key={assTyp.Id} value={assTyp.Id}>
                                                            {assTyp.TypeName}
                                                        </Option>
                                                    ))}
                                                </Select>
                                            </div>
                                            <div className="col-12 col-md-4 mb-2">
                                                <label className="form-label">Asset Name<span className="text-danger">*</span></label>
                                                <input
                                                    type="text"
                                                    name="MachineName"
                                                    className="form-control"
                                                    placeholder="Enter asset name"
                                                    style={{ height: '2.8rem' }}
                                                    value={formEditData.MachineName}
                                                    onChange={handleEditInputChange}
                                                    autoComplete="off"
                                                    max={50}
                                                    min={3}
                                                    required
                                                />
                                            </div>
                                            <div className="col-12 col-md-4 mb-2">
                                                <label className="form-label">Asset Model<span className="text-danger">*</span></label>
                                                <input
                                                    type="text"
                                                    name="Model"
                                                    className="form-control"
                                                    placeholder="Enter asset model"
                                                    value={formEditData.Model}
                                                    onChange={handleEditInputChange}
                                                    style={{ height: '2.8rem' }}
                                                    autoComplete="off"
                                                    max={30}
                                                    min={3}
                                                    required
                                                />
                                            </div>
                                            <div className="col-12 col-md-4 mb-2">
                                                <label className="form-label">Code<span className="text-danger">*</span></label>
                                                <input
                                                    type="text"
                                                    name="MachineCode"
                                                    className="form-control"
                                                    placeholder="Enter code"
                                                    value={formEditData.MachineCode}
                                                    onChange={handleEditInputChange}
                                                    style={{ height: '2.8rem' }}
                                                    autoComplete="off"
                                                    max={20}
                                                    min={3}
                                                    onKeyDown={(e) => {
                                                        if (e.key === ' ') {
                                                            e.preventDefault();
                                                        }
                                                    }}
                                                    required
                                                    disabled
                                                />
                                            </div>
                                            <div className="col-12 col-md-4 mb-2">
                                                <label className="form-label">Asset Code<span className="text-danger">*</span></label>
                                                <input
                                                    type="text"
                                                    name="AssetCode"
                                                    className="form-control"
                                                    placeholder="Enter asset code"
                                                    value={formEditData.AssetCode}
                                                    onChange={handleEditInputChange}
                                                    style={{ height: '2.8rem' }}
                                                    autoComplete="off"
                                                    max={20}
                                                    min={3}
                                                    onKeyDown={(e) => {
                                                        if (e.key === ' ') {
                                                            e.preventDefault();
                                                        }
                                                    }}
                                                    disabled={formEditData?.Status !== "APPROVED"}
                                                />
                                            </div>
                                            <div className="col-12 col-md-4 mb-2">
                                                <label className="form-label">Asset Make</label>
                                                <input
                                                    type="text"
                                                    name="MachineMake"
                                                    className="form-control"
                                                    placeholder="Enter asset make"
                                                    style={{ height: '2.8rem' }}
                                                    value={formEditData.MachineMake}
                                                    onChange={handleEditInputChange}
                                                    autoComplete="off"
                                                    max={20}
                                                    min={3}
                                                    required
                                                />
                                            </div>
                                            <div className="col-6 col-md-4 mb-2">
                                                <label className="form-label">Purchase Date<span className="text-danger">*</span></label>
                                                <input
                                                    type="date"
                                                    name="PurchaseDate"
                                                    className="form-control"
                                                    value={formEditData.PurchaseDate}
                                                    style={{ height: '2.8rem' }}
                                                    onKeyDown={(e) => e.preventDefault()}
                                                    onChange={handleEditInputChange}
                                                    max={new Date().toISOString().split('T')[0]}
                                                    required
                                                />
                                            </div>
                                            <div className="col-6 col-md-4 mb-2">
                                                <label className="form-label">Installation Date</label>
                                                <input
                                                    type="date"
                                                    name="InstallationDate"
                                                    className="form-control"
                                                    style={{ height: '2.8rem' }}
                                                    value={formEditData.InstallationDate}
                                                    onChange={handleEditInputChange}
                                                    min={formEditData.PurchaseDate}
                                                    disabled={!formEditData.PurchaseDate}
                                                    onKeyDown={(e) => e.preventDefault()}
                                                    required
                                                />
                                            </div>
                                            <div className="col-12 col-md-4 mb-2">
                                                <label className="form-label">PO Number</label>
                                                <input
                                                    type="text"
                                                    name="PONumber"
                                                    className="form-control"
                                                    placeholder="Enter purchase order number"
                                                    style={{ height: '2.8rem' }}
                                                    value={formEditData.PONumber}
                                                    onChange={handleEditInputChange}
                                                    autoComplete="off"
                                                    maxLength={20}
                                                    required
                                                />
                                            </div>
                                            <div className="col-12 col-md-4 mb-2">
                                                <label className="form-label">Invocie Number</label>
                                                <input
                                                    type="text"
                                                    name="InvoiceNumber"
                                                    className="form-control"
                                                    placeholder="Enter invoice number"
                                                    style={{ height: '2.8rem' }}
                                                    value={formEditData.InvoiceNumber}
                                                    onChange={handleEditInputChange}
                                                    autoComplete="off"
                                                    maxLength={20}
                                                    required
                                                />
                                            </div>
                                            <div className="col-12 col-md-4 mb-2 d-flex flex-column">
                                                <label className="form-label">Supplier<span className="text-danger">*</span></label>
                                                <Select
                                                    placeholder="Select Supplier"
                                                    showSearch
                                                    // allowClear
                                                    filterOption={(input, option) =>
                                                        option?.children?.toLowerCase().includes(input.toLowerCase())
                                                    }
                                                    value={selectedSupplierId || undefined}
                                                    onChange={(value) => setSelectedSupplierId(value)}
                                                    style={{ height: '2.8rem' }}
                                                >
                                                    {suppliersData && suppliersData?.map((item) => (
                                                        <Option key={item.ItemId} value={item.ItemId}>
                                                            {item.DisplayValue}
                                                        </Option>
                                                    ))}
                                                </Select>
                                            </div>
                                            <div className="col-12 col-md-4 mb-2 d-flex flex-column">
                                                <label className="form-label">Operator<span className="text-danger">*</span></label>
                                                <Select
                                                    placeholder="Select Operator"
                                                    showSearch
                                                    optionFilterProp="label"
                                                    value={selectedUserId || undefined}
                                                    onChange={(value) => setSelectedUserId(value)}
                                                    style={{ height: "2.8rem" }}
                                                    options={usersList?.map((item) => ({
                                                        value: item.ItemId,
                                                        label: `${item.ItemValue} ${item.DisplayValue}`, // searchable text
                                                        display: `${item.ItemValue} - ${item.DisplayValue}` // visible text
                                                    }))}
                                                    optionRender={(option) => (
                                                        <span>
                                                            {option.data.display}
                                                        </span>
                                                    )}
                                                />
                                            </div>

                                            <div className="col-12 col-md-4 mb-2">
                                                <label className="form-label">Images</label>
                                                <div className="input-group">
                                                    <input
                                                        className="form-control"
                                                        type="file"
                                                        name="Images"
                                                        accept=".jpg,.jpeg,.png"
                                                        style={{ height: '2.8rem' }}
                                                        onChange={handleEditImageChange}
                                                    />
                                                    <span
                                                        className={`input-group-text`}
                                                        style={{ cursor: 'pointer' }}
                                                        onClick={handleUploadEditImages}
                                                    >
                                                        <i className="fa-solid fa-cloud-arrow-up" style={{ color: '#63E6BE' }}></i>
                                                    </span>
                                                </div>
                                            </div>
                                            {/* <div className="col-12 col-md-4 mb-2">
                                                <label className="form-label">Purchase File</label>
                                                <div className="input-group">
                                                    <input
                                                        className="form-control cursor-not-allowed"
                                                        type="file"
                                                        name="Images"
                                                        accept=".jpg,.jpeg,.png"
                                                        disabled={true}
                                                        style={{ height: '2.8rem' }}
                                                    />
                                                    <span
                                                        className={`input-group-text`}
                                                    // style={{ cursor: isPurchaseUploaded ? 'not-allowed' : 'pointer' }}
                                                    // onClick={() => {
                                                    //     if (!isPurchaseUploaded) handlePurchaseUpload();
                                                    // }}
                                                    >
                                                        <i className="fa-solid fa-cloud-arrow-up" style={{ color: '#63E6BE' }}></i>
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="col-12 col-md-4 mb-2">
                                                <label className="form-label">Invoice File</label>
                                                <div className="input-group">
                                                    <input
                                                        className="form-control cursor-not-allowed"
                                                        type="file"
                                                        name="Images"
                                                        accept=".jpg,.jpeg,.png"
                                                        disabled={true}
                                                        style={{ height: '2.8rem' }}
                                                    />
                                                    <span
                                                        className={`input-group-text`}
                                                    // style={{ cursor: isPurchaseUploaded ? 'not-allowed' : 'pointer' }}
                                                    // onClick={() => {
                                                    //     if (!isPurchaseUploaded) handlePurchaseUpload();
                                                    // }}
                                                    >
                                                        <i className="fa-solid fa-cloud-arrow-up" style={{ color: '#63E6BE' }}></i>
                                                    </span>
                                                </div>
                                            </div> */}
                                        </div>

                                        <h6 className="mt-3 p-3"><i className="fa-regular fa-images"></i> Existing Images</h6>
                                        <div className="d-flex gap-2 flex-wrap mt-2 p-3">
                                            {oldImages?.map((img, i) => (
                                                <div key={`old-${i}`} className="position-relative" style={{ width: 80, height: 80 }}>
                                                    <img
                                                        src={`${BASE_IMAGE_API_GET}${img}`}
                                                        className="img-thumbnail"
                                                        style={{ objectFit: "cover", width: "100%", height: "100%" }}
                                                        alt="existing"
                                                    />
                                                    <span
                                                        onClick={() => handleRemoveOldEditImage(img)}
                                                        className="position-absolute top-0 end-0 bg-danger text-white rounded-circle"
                                                        style={{ padding: "0.25rem", cursor: "pointer", fontSize: "0.75rem" }}
                                                    >✖</span>
                                                    <span
                                                        onClick={() => handleViewImage(img)}
                                                        className="position-absolute bottom-0 end-0 bg-primary text-white rounded-circle"
                                                        style={{ cursor: 'pointer', padding: '0.2rem 0.4rem', fontSize: '0.8rem' }}
                                                    >
                                                        <i className="fa-regular fa-eye fa-beat-fade"></i>
                                                    </span>
                                                </div>
                                            ))}
                                        </div>

                                        {newImages.length > 0 && <h6 className="mt-5"><i className="fa-regular fa-images"></i> New Images</h6>}
                                        <div className="d-flex gap-2 flex-wrap mt-2">
                                            {newImages?.map((file, i) => (
                                                <div key={`new-${i}`} className="position-relative" style={{ width: 80, height: 80 }}>
                                                    <img
                                                        src={`${BASE_IMAGE_API_GET}${file}`}
                                                        className="img-thumbnail"
                                                        style={{ objectFit: "cover", width: "100%", height: "100%" }}
                                                        alt="new"
                                                    />
                                                    <span
                                                        onClick={() => handleRemoveNewEditImage(file)}
                                                        className="position-absolute top-0 end-0 bg-danger text-white rounded-circle"
                                                        style={{ padding: "0.25rem", cursor: "pointer", fontSize: "0.75rem" }}
                                                    >✖</span>
                                                    <span
                                                        onClick={() => handleViewImage(file)}
                                                        className="position-absolute bottom-0 end-0 bg-primary text-white rounded-circle"
                                                        style={{ cursor: 'pointer', padding: '0.2rem 0.4rem', fontSize: '0.8rem' }}
                                                    >
                                                        <i className="fa-regular fa-eye fa-beat-fade"></i>
                                                    </span>
                                                </div>
                                            ))}
                                        </div>

                                        {previewImage && (
                                            <div
                                                className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center bg-dark bg-opacity-75"
                                                style={{ zIndex: 1050 }}
                                                onClick={handleCloseEditPreview}
                                            >
                                                <img
                                                    src={`${BASE_IMAGE_API_GET}${previewImage}`}
                                                    alt="Full preview"
                                                    style={{ maxWidth: '90%', maxHeight: '90%', borderRadius: '10px' }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}

                                {activeTab === "nav-alerts" && (
                                    <div className="tab-pane fade show active" id="nav-alerts" role="tabpanel">
                                        <div className="card shadow-sm border-0">
                                            <div className="card-header bg-light d-flex align-items-center">
                                                <h4 className="mb-0 fw-bold text-dark">
                                                    <i className="bi bi-bell me-2 text-primary fs-5"></i>
                                                    Alerts
                                                </h4>
                                            </div>
                                            <div className="row align-items-center m-3">
                                                <div className="col-12 col-md-auto">
                                                    <div className="d-flex gap-2">
                                                        <Select
                                                            value={selectedYear}
                                                            onChange={setSelectedYear}
                                                            className="flex-grow-1"
                                                            style={{ minWidth: 120 }}
                                                        >
                                                            <Option value={'0'}>All</Option>
                                                            {years.map(y => (
                                                                <Option key={y} value={y}>
                                                                    <div className="d-flex justify-content-between align-items-center w-100">
                                                                        <span>{y}</span>
                                                                        {y === currentYear && (
                                                                            <span className="badge bg-primary-subtle text-primary rounded-pill fs-9 px-2">
                                                                                Current
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </Option>
                                                            ))}
                                                        </Select>

                                                        <Select
                                                            value={selectedMonth}
                                                            onChange={setSelectedMonth}
                                                            className="flex-grow-1"
                                                            style={{ minWidth: 140 }}
                                                        >
                                                            {months.map(m => (
                                                                <Option key={m.value} value={m.value}>
                                                                    <div className="d-flex justify-content-between align-items-center w-100">
                                                                        <span>{m.label}</span>
                                                                        {m.value === (new Date().getMonth() + 1) && (
                                                                            <span className="badge bg-primary-subtle text-primary rounded-pill fs-9 px-2">
                                                                                Current
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </Option>
                                                            ))}
                                                        </Select>
                                                    </div>
                                                </div>

                                                <div className="col-12 col-md text-md-end">
                                                    <div className="d-flex gap-2 justify-content-md-end">
                                                        <button className="btn btn-primary btn-sm flex-fill flex-md-grow-0" data-bs-toggle="offcanvas" data-bs-target="#offcanvasRightAlertAdd">
                                                            <i className="bi bi-plus-circle"></i> Register Alert
                                                        </button>
                                                        <button className="btn btn-info btn-sm flex-fill flex-md-grow-0" data-bs-toggle="offcanvas" data-bs-target="#offcanvasRightAddMasterTypes">
                                                            <i className="bi bi-gear"></i> Types
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="alert-list-container px-1 mt-4 overflow-hidden" style={{ maxHeight: "30rem", overflowY: "auto" }}>
                                                <div className="row g-2 m-0">
                                                    {Array.isArray(alertsList) && alertsList.length > 0 ? (
                                                        alertsList.map((item, index) => {
                                                            const severity = item.Severity || "LOW";
                                                            const severityMeta = {
                                                                HIGH: { color: "#dc3545", bg: "#fff5f5", icon: "bi-exclamation-octagon-fill" },
                                                                MEDIUM: { color: "#fd7e14", bg: "#fffaf0", icon: "bi-exclamation-triangle-fill" },
                                                                LOW: { color: "#198754", bg: "#f0fff4", icon: "bi-info-circle-fill" },
                                                            }[severity];

                                                            return (
                                                                <div className="col-12 col-md-6 d-flex" key={index}>
                                                                    <div className="modern-alert-card shadow-sm border rounded-3 overflow-hidden bg-white w-100">
                                                                        <div className="d-flex flex-column flex-md-row h-100">
                                                                            <div style={{ width: '6px', backgroundColor: severityMeta.color }} className="d-none d-md-block" />
                                                                            <div style={{ height: '4px', backgroundColor: severityMeta.color }} className="d-md-none" />

                                                                            <div className="p-3 flex-grow-1 d-flex flex-column justify-content-between">
                                                                                <div>
                                                                                    <div className="d-flex justify-content-between align-items-start mb-2">
                                                                                        <div className="d-flex align-items-center gap-2 flex-wrap">
                                                                                            <i className={`bi ${severityMeta.icon} fs-5`} style={{ color: severityMeta.color }} />
                                                                                            <span className="fw-bold fs-6 text-dark text-truncate" title={item.AlertTitle} style={{ maxWidth: '200px' }}>
                                                                                                {item.AlertTitle}
                                                                                            </span>
                                                                                            <span className="badge border border-success-subtle text-success fs-8 px-2 rounded-pill" style={{ backgroundColor: '#f0fff4', fontFamily: 'monospace' }}>
                                                                                                #{item.AutoIncNo || "N/A"}
                                                                                            </span>
                                                                                            <span className="badge bg-info-subtle text-info-emphasis border border-info fs-9 capitalize">
                                                                                                <i className="bi bi-arrow-repeat me-1"></i>
                                                                                                {item.OcurrenceTypeNames || "N/A"}
                                                                                            </span>
                                                                                        </div>

                                                                                        <div className="d-flex gap-1 ms-2">
                                                                                            <button className="btn btn-icon btn-light-primary btn-sm" onClick={() => handleAlertClick(item)} title="View">
                                                                                                <i className="bi bi-eye"></i>
                                                                                            </button>
                                                                                            <button className="btn btn-icon btn-light-danger btn-sm" disabled={deleteLoading || item.IsTriggered} onClick={() => !item.IsTriggered && handleDeleteAlert(item)} title="Delete">
                                                                                                <i className="bi bi-trash3"></i>
                                                                                            </button>
                                                                                        </div>
                                                                                    </div>

                                                                                    <div className="text-gray-600 fs-7 lh-base border-top pt-2 mt-1">
                                                                                        <i className="bi bi-chat-dots text-primary me-1"></i> {item.Message || "No description available"}
                                                                                    </div>
                                                                                </div>

                                                                                <div className="d-flex align-items-center gap-2 mt-3 pt-2 border-top border-dashed text-muted fs-8">
                                                                                    <div className="d-flex align-items-center text-truncate ms-1">
                                                                                        <i className="bi bi-person-circle me-1 text-primary"></i>
                                                                                        <span className="text-truncate">By: <span className="text-dark fw-medium">{item.Name || "System"}</span></span>
                                                                                    </div>
                                                                                    <div className="vr" style={{ height: '12px' }}></div>
                                                                                    <div className="d-flex align-items-center">
                                                                                        <i className="bi bi-calendar-event me-1 text-primary"></i>
                                                                                        <span>{formatToDDMMYYYY(item.CreatedOn) || "N/A"}</span>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })
                                                    ) : (
                                                        /* Empty State */
                                                        <div className="col-12">
                                                            <div className="text-center bg-white rounded-3 py-10 shadow-sm border w-100">
                                                                <i className="bi bi-bell-slash fs-1 text-gray-300 d-block mb-3"></i>
                                                                <h5 className="text-gray-500">No active alerts found</h5>
                                                                <p className="text-gray-400 fs-7">Try adjusting your filters or add a new alert.</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === "nav-logs" && (
                                    <div className="tab-pane fade show active" id="nav-logs" role="tabpanel">
                                        <div className="card shadow-sm border-0">
                                            {/* Card Header */}
                                            <div className="card-header bg-light d-flex align-items-center py-3">
                                                <h4 className="mb-0 fw-bold text-dark">
                                                    <i className="bi bi-clock-history me-2 text-primary fs-5"></i>
                                                    Activity Logs
                                                </h4>
                                            </div>

                                            <div className="card-body p-0">
                                                {Array.isArray(logsData) && logsData?.length > 0 ? (
                                                    <>
                                                        {/* --- MOBILE VIEW: Timeline Cards (Visible on < 768px) --- */}
                                                        <div className="d-block d-md-none p-3 bg-light-subtle">
                                                            {logsData.map((item, indx) => {
                                                                // Dynamic color logic for the left border
                                                                const statusColor =
                                                                    item.Status === "ACTIVE" || item.Status === "APPROVED" ? "#198754" :
                                                                        item.Status === "PENDING APPROVAL" ? "#0dcaf0" :
                                                                            item.Status === "REJECTED" ? "#dc3545" : "#6c757d";

                                                                return (
                                                                    <div
                                                                        key={indx}
                                                                        className="mb-3 bg-white rounded shadow-sm overflow-hidden"
                                                                        style={{
                                                                            borderLeft: `5px solid ${statusColor}`,
                                                                            transition: 'transform 0.2s ease'
                                                                        }}
                                                                    >
                                                                        <div className="p-3">
                                                                            {/* Top Row: Date and Status */}
                                                                            <div className="d-flex justify-content-between align-items-center mb-2">
                                                                                <div className="small text-muted fw-medium">
                                                                                    <i className="bi bi-calendar3 me-1"></i>
                                                                                    {formatToDDMMYYYY_HHMM(item.ChangedOn)}
                                                                                </div>
                                                                                <span className={`badge rounded-pill ${getStatusBadgeClass(item.Status)}`} style={{ fontSize: '0.7rem' }}>
                                                                                    {item.Status}
                                                                                </span>
                                                                            </div>

                                                                            {/* Middle: The Action Log */}
                                                                            <div className="fw-bold text-dark mb-2" style={{ fontSize: '0.9rem', lineHeight: '1.4' }}>
                                                                                {item.Logs || "No action description available"}
                                                                            </div>

                                                                            {/* Bottom Row: User Info */}
                                                                            <div className="d-flex align-items-center mt-2 pt-2 border-top">
                                                                                <div className="text-info small fw-bold">
                                                                                    <i className="bi bi-person-circle me-1"></i>
                                                                                    {item.LoggedUser || "System"}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>

                                                        {/* --- DESKTOP VIEW: Original Table (Visible on > 768px) --- */}
                                                        <div className="d-none d-md-block table-responsive ps-3" style={{ maxHeight: "30rem", overflowY: "auto" }}>
                                                            <table className="table table-hover align-middle mb-0">
                                                                <thead className="table-light sticky-top">
                                                                    <tr className="text-uppercase text-muted fs-7">
                                                                        <th className="ps-4" style={{ minWidth: "160px" }}>When</th>
                                                                        <th style={{ minWidth: "260px" }}>Action Description</th>
                                                                        <th style={{ minWidth: "140px" }}>Status</th>
                                                                        <th style={{ minWidth: "180px" }}>Performed By</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {logsData.map((item, indx) => (
                                                                        <tr key={indx}>
                                                                            <td className="ps-4 fw-medium text-gray-700">
                                                                                <span className="text-nowrap">{formatToDDMMYYYY_HHMM(item.ChangedOn)}</span>
                                                                            </td>
                                                                            <td className="fw-semibold text-dark">{item.Logs || "N/A"}</td>
                                                                            <td>
                                                                                <span className={`badge rounded-pill px-3 py-2 ${getStatusBadgeClass(item.Status)}`}>
                                                                                    {item.Status}
                                                                                </span>
                                                                            </td>
                                                                            <td className="fw-semibold text-info">
                                                                                <i className="bi bi-person-circle me-2"></i>
                                                                                {item.LoggedUser || "N/A"}
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </>
                                                ) : (
                                                    /* Empty State */
                                                    <div className="text-center py-5">
                                                        <i className="bi bi-clipboard-x text-muted mb-3" style={{ fontSize: "3rem" }}></i>
                                                        <p className="text-muted fw-medium">No activity logs found for this asset.</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
                <style>
                    {`
                    .pulse-white {
            position: absolute;
            width: 100%;
            height: 100%;
            background: rgba(255, 255, 255, 0.2);
            left: 0;
            top: 0;
            border-radius: 8px;
            animation: pulse-border 2s infinite;
        }

        @keyframes pulse-border {
            0% { transform: scale(1); opacity: 1; }
            100% { transform: scale(1.15); opacity: 0; }
        }
                 .blurred {
  filter: blur(2px);
  pointer-events: none;
  user-select: none;
  transition: all 0.2s ease-in-out;
}
  @media print {
    /* Hide the entire UI */
    body * {
        visibility: hidden;
    }
    /* Show only the QR container and its children */
    #printable-qr, #printable-qr * {
        visibility: visible;
    }
    /* Position the QR code at the top left of the printed page */
    #printable-qr {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        text-align: center;
    }
}
  @media (max-width: 767.98px) {
  .mobile-scroll-container {
    display: flex !important;
    flex-wrap: nowrap !important;
    overflow-x: auto !important;
    padding-bottom: 10px;
    scroll-snap-type: x mandatory;
    gap: 12px; /* Controls spacing between items */
  }

  .mobile-scroll-container > div {
    flex: 0 0 auto !important;
    width: 160px; /* Set a fixed width for the image cards on mobile */
    scroll-snap-align: start;
  }

  /* Hide scrollbar for a cleaner look (optional) */
  .mobile-scroll-container::-webkit-scrollbar {
    height: 4px;
  }
  .mobile-scroll-container::-webkit-scrollbar-thumb {
    background: #ccc;
    border-radius: 10px;
  }
}
  .eye-btn {
    background: rgba(255, 255, 255, 0.7);
    border-radius: 50%;
}

.eye-blink {
    animation: eyeBlink 1.2s ease-in-out;
}

@keyframes eyeBlink {
    0% {
        transform: scale(1);
        opacity: 1;
    }
    25% {
        transform: scale(1.2);
        opacity: 0.5;
    }
    50% {
        transform: scale(0.9);
        opacity: 1;
    }
    75% {
        transform: scale(1.15);
        opacity: 0.7;
    }
    100% {
        transform: scale(1);
        opacity: 1;
    }
}

  .badge:hover {
    transform: translateY(-1px);
    transition: all 0.2s ease;
}
.icon-tab-btn {
    position: relative;
    display: flex;
    align-items: center;
    gap: 8px;

    height: 40px;
    width: 40px; /* Icon-only default */
    padding: 0 12px;

    border-radius: 50px;
    border: 1px solid transparent;

    background: #f1f1f1;
    color: #333;

    overflow: hidden;
    transition: all 0.25s ease-in-out;

    cursor: pointer;
    white-space: nowrap;
}

/* Hover Expand Effect */
.icon-tab-btn:hover {
    width: 160px; /* Button expands */
    background: #e7f1ff;
    border-color: #c8ddff;
}

/* Hide label initially */
.icon-tab-label {
    opacity: 0;
    font-size: 14px;
    transition: opacity 0.2s ease-in-out;
}

/* Reveal label on hover */
.icon-tab-btn:hover .icon-tab-label {
    opacity: 1;
}

/* Icon styling */
.icon-tab-btn i {
    font-size: 18px;
}

/* Color Variants */
.icon-tab-btn.primary     { background: #eef4ff; color: #3066ff; }
.icon-tab-btn.primary:hover { background: #dce7ff; }

.icon-tab-btn.warning     { background: #fff8e5; color: #d19a00; }
.icon-tab-btn.warning:hover { background: #ffefc2; }

.icon-tab-btn.info        { background: #e9faff; color: #17a2b8; }
.icon-tab-btn.info:hover { background: #d9f4ff; }

.icon-tab-btn.danger      { background: #ffecec; color: #d9534f; }
.icon-tab-btn.danger:hover { background: #ffd4d4; }
.icon-tab-btn.dark {
    background: #f0f0f0;   /* Light gray background */
    color: #3a3a3a;        /* Dark gray text */
}

.icon-tab-btn.dark:hover {
    background: #d9d9d9;   /* Slightly darker gray */
}

.icon-tab-btn.success {
    background: #e8f7ee;   /* Light green */
    color: #0f9b4a;        /* Success green */
}

.icon-tab-btn.success:hover {
    background: #d4f0df;   /* Slightly darker green */
}


/* Default icon-only button */
.icon-tab-btn {
    display: flex;
    align-items: center;
    gap: 8px;

    height: 40px;
    width: 40px; /* icon size */
    padding: 0 12px;

    border-radius: 50px;
    background: #f1f1f1;
    color: #333;
    border: 1px solid transparent;

    overflow: hidden;
    white-space: nowrap;

    cursor: pointer;
    transition: all 0.25s ease-in-out;
}

/* Hide label initially */
.icon-tab-label {
    opacity: 0;
    transition: opacity 0.2s ease-in-out;
}

/* 🔥 ACTIVE TAB EXPANDS */
.icon-tab-btn.active-expand {
    width: 170px;       /* expand horizontally */
    background: #e8f0ff;
    border-color: #3066ff;
    color: #3066ff;
}

/* Show the label when active */
.icon-tab-btn.active-expand .icon-tab-label {
    opacity: 1;
}

/* Active icon color */
.icon-tab-btn.active-expand i {
    color: #3066ff;
}
    .badge-light-purple {
    background-color: #d6c1ff;
    color: #4b0082;
}
    .badge-light-pink {
    background-color: #f8bbd0;
    color: #880e4f;
}

.badge-light-brown {
    background-color: #d7ccc8;
    color: #3e2723;
}
.badge-light-indigo {
    background-color: #c5cae9;
    color: #283593;
}
    .step-circle-horizontal {
    background-color: #ffc107;
    border-color: #ffc107;
    color: #000;
}

.step-container {
    display: flex;
    justify-content: space-between;
    align-items: center;
    position: relative;
    overflow-x: auto;
    scrollbar-width: thin;
    scrollbar-color: #bbb transparent;
    scroll-snap-type: x mandatory;
    padding-bottom: 10px;
  }
  
  .step-container::-webkit-scrollbar {
    height: 6px;
  }
  
  .step-container::-webkit-scrollbar-thumb {
    background: #bbb;
    border-radius: 10px;
  }
  
  .step-container > div {
    scroll-snap-align: center;
    flex: 0 0 auto;
    min-width: 90px; /* ensures circles + text fit well */
  }
  .step-circle-horizontal {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    border: 2px solid #ccc;
    background-color: #fff;
    color: #777;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    position: relative;
    z-index: 2;
    transition: all 0.4s ease;
  }
  
  .step-circle-horizontal.filled {
    background-color: #4b49ac;
    border-color: #4b49ac;
    color: #fff;
    transform: scale(1.1);
  }
  
  /* 🟣 Add a subtle pulsing animation for active step */
  .step-circle-horizontal.active {
    animation: pulseActive 1.5s infinite ease-in-out;
    box-shadow: 0 0 0 0 rgba(75, 73, 172, 0.5);
  }
  
  @keyframes pulseActive {
    0% {
      transform: scale(1);
      box-shadow: 0 0 0 0 rgba(75, 73, 172, 0.5);
    }
    70% {
      transform: scale(1.15);
      box-shadow: 0 0 0 12px rgba(75, 73, 172, 0);
    }
    100% {
      transform: scale(1);
      box-shadow: 0 0 0 0 rgba(75, 73, 172, 0);
    }
  }
    .step-line-horizontal {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translateY(-50%);
    width: 100%; /* Full stretch to next circle */
    height: 4px;
    background-color: #ccc;
    z-index: 1;
    border-radius: 2px;
    transition: all 0.4s ease;
  }
  
  .step-line-horizontal.filled {
    background: linear-gradient(90deg, #4b49ac, #8c87ff, #4b49ac);
    background-size: 200% 100%;
    animation: gradientMove 2s linear infinite;
  }
  
  @keyframes gradientMove {
    0% {
      background-position: 200% 0;
    }
    100% {
      background-position: -200% 0;
    }
  }
  
  .alert-feed {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.alert-card {
    display: flex;
    background: #ffffff;
    border-radius: 10px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
    overflow: hidden;
    transition: all 0.25s ease;
}

.alert-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
}

.severity-bar {
    width: 6px;
}

.alert-content {
    flex: 1;
    padding: 12px 14px;
}

.alert-message {
    font-size: 0.85rem;
    color: #6c757d;
    margin-top: 6px;
    line-height: 1.4;
}

/* Optional subtle background tint */
.alert-card.severity-high {
    background: linear-gradient(90deg, #fff5f5, #ffffff);
}

.alert-card.severity-medium {
    background: linear-gradient(90deg, #fff9ed, #ffffff);
}

.alert-card.severity-low {
    background: linear-gradient(90deg, #f3fff8, #ffffff);
}

  @keyframes fillLine {
      from { width: 0; }
      to { width: 100%; }
    }
    
    .step-label {
      font-size: 0.85rem;
      color: #444;
      white-space: nowrap;
    }
    
    /* ✅ Mobile adjustments */
    @media (max-width: 768px) {
      .step-container {
        justify-content: flex-start;
      }
    
      .step-container::after {
        /* subtle gradient hint that more steps exist */
        content: "";
        position: absolute;
        right: 0;
        top: 0;
        height: 100%;
        width: 40px;
        background: linear-gradient(to left, #fff, transparent);
        pointer-events: none;
      }
    
      .step-label {
        font-size: 0.75rem;
      }
    }
                `}
                </style>

                <RegisterTicket
                    assetID={targetAsset.id}
                    assetName={targetAsset.name}
                    deptId={targetAsset.deptId}
                />
                <RegisterMasterTypes typeCategory={3} />
                <ViewAlert alertObj={selectedAlert} />
                <AddAlert machineId={machineId} versionId={0} deptId={machineData?.DepartmentId} entityType="MachineReg" />
                {/* <AddAlert machineId={machineId} deptId={machineData?.DepartmentId} /> */}
            </Base1>
        </>
    )
}