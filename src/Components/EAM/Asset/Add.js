import React, { useEffect, useState, useRef, useCallback } from "react";
import Swal from 'sweetalert2';
import { BASE_IMAGE_API_GET, BASE_IMG_DOC_DELETE, BASE_IMG_UPLOAD } from "../../Config/Config";
import { Select } from "antd";
import { fetchWithAuth } from "../../../utils/api";
import { CaretRightOutlined } from "@ant-design/icons";
import { Collapse } from "antd";

export default function RegisterAsset() {

    const [sessionUserData, setsessionUserData] = useState({});
    const [departmentsData, setDepartmentsData] = useState([]);
    const [suppliersData, setSuppliersData] = useState([]);
    const [assetTypesData, setAssetTypesData] = useState([]);
    const [unitsData, setUnitsData] = useState([]);
    const [addSubmitLoading, setAddSubmitLoading] = useState(false);
    const [selectedSectionId, setSelectedSectionId] = useState(null);
    const [selectedSupplierId, setSelectedSupplierId] = useState(null);
    const [selectedDeptId, setSelectedDeptId] = useState(null);
    const [selectedAssetTypeId, setSelectedAssetTypeId] = useState(null);
    const [selectedUnitId, setSelectedUnitId] = useState(null);
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [previewImage, setPreviewImage] = useState(null);
    const [images, setImages] = useState([]);
    const [selectedFile, setSelectedFile] = useState(null);
    const [alertDates, setAlertDates] = useState([]); // holds generated alert dates
    const [usersData, setUsersData] = useState([]);
    const [returnAssetId, setReturnAssetId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [sessionActionIds, setSessionActionIds] = useState([]);
    const [showSupplierModal, setShowSupplierModal] = useState(false);
    // const [purchaseFileUrl, setPurchaseFileUrl] = useState("");
    // const [invoiceFileUrl, setInvoiceFileUrl] = useState("");
    // const [purchaseFile, setPurchaseFile] = useState(null);
    // const [invoiceFile, setInvoiceFile] = useState(null);
    // const [isPurchaseUploaded, setIsPurchaseUploaded] = useState(false);
    const { Option } = Select;
    const { Panel } = Collapse;
    const offcanvasRef = useRef(null);

    const [formAssetData, setFormAssetData] = useState({
        OrgIdd: "",
        MachineName: "",
        MachineCode: "",
        MachineMake: "",
        AssetTypeId: "",
        UnitId: "",
        Model: "",
        PurchaseDate: "",
        InstallationDate: "",
        UpcomingMaintenanceDate: "",
        DeptId: "",
        InvoiceNumber: "",
        PONumber: "",
        SectionId: "",
        SupplierId: "",
        Status: "",
        CreatedBy: "",
        POfileUrl: "",
        InvoicefileUrl: "",
        Images: [],
    });

    const [formData, setFormData] = useState({
        SupplierId: '',
        OrgId: "",
        SupplierName: "",
        Phone: "",
        Email: "",
        Address: "",
        GSTNumber: "",
        PANNumber: "",
        IsActive: "true",
        UpdatedBy: "",
    });

    useEffect(() => {
        const userDataString = sessionStorage.getItem("userData");
        if (userDataString) {
            const userData = JSON.parse(userDataString);
            setsessionUserData(userData);
            setFormAssetData((prev) => ({
                ...prev,
                CreatedBy: userData.Id,
                OrgIdd: userData.OrgId,
            }));
        }
    }, []);

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

    const fetchDDLData = async () => {
        try {
            const sessionDDL = sessionStorage.getItem("ddlAssetAddData");

            if (sessionDDL) {
                const parsed = JSON.parse(sessionDDL);

                setUnitsData(parsed.units || []);
                setUsersData(parsed.users || []);
                setDepartmentsData(parsed.depts || []);
                setSuppliersData(parsed.suppliers || []);
                if (parsed.selectedUnitId) {
                    setSelectedUnitId(parsed.selectedUnitId);
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

            const unitsFilteredData = data.ResultData.filter(
                (item) => item.DDLName === "UnitLocations"
            );

            const usersFilteredData = data.ResultData.filter(
                (item) => item.DDLName === "Users"
            );

            const deptsFilteredData = data.ResultData.filter(
                (item) => item.DDLName === "Departments"
            );
            const supplierssFilteredData = data.ResultData.filter(
                (item) => item.DDLName === "Suppliers"
            );

            setUnitsData(unitsFilteredData || []);
            setUsersData(usersFilteredData || []);
            setDepartmentsData(deptsFilteredData || []);
            setSuppliersData(supplierssFilteredData || []);

            const defaultUnitId = unitsFilteredData.length > 0 ? unitsFilteredData[0].ItemId : null;
            if (defaultUnitId) {
                setSelectedUnitId(defaultUnitId);
            }

            sessionStorage.setItem(
                "ddlAssetAddData",
                JSON.stringify({
                    units: unitsFilteredData,
                    users: usersFilteredData,
                    depts: deptsFilteredData,
                    suppliers: supplierssFilteredData,
                    selectedUnitId: defaultUnitId,
                })
            );

        } catch (error) {
            console.error("Failed to fetch DDL data:", error);
            setUnitsData([]);
            setUsersData([]);
            setDepartmentsData([]);
            setSuppliersData([]);
        }
    };

    useEffect(() => {
        if (sessionUserData.OrgId && selectedDeptId) {
            fetchAssetTypes();
        }
    }, [sessionUserData, selectedDeptId]);

    const fetchAssetTypes = useCallback(async () => {
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
    }, [selectedDeptId, sessionUserData]);

    useEffect(() => {
        const offcanvasEl = offcanvasRef.current;
        if (!offcanvasEl) return;

        const handleOpen = () => {
            fetchAssetTypes();
        };

        offcanvasEl.addEventListener("show.bs.offcanvas", handleOpen);

        return () => {
            offcanvasEl.removeEventListener("show.bs.offcanvas", handleOpen);
        };
    }, [fetchAssetTypes]);

    useEffect(() => {
        if (sessionUserData.OrgId) {
            fetchDDLData();
            setSelectedDeptId(sessionUserData?.DeptId);
        }
    }, [sessionUserData]);

    const handleInputChange = (eOrValue, nameFromSelect = null) => {
        if (nameFromSelect) {
            setFormAssetData((prev) => ({
                ...prev,
                [nameFromSelect]: eOrValue || "",
            }));
            return;
        }

        const { name, value } = eOrValue.target;
        let formattedValue = value;

        if (name === 'MachineName' || name === 'Model' || name === 'MachineCode') {
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

        setFormAssetData((prevState) => ({
            ...prevState,
            [name]: formattedValue,
        }));
    };

    const handleFileChange = (e) => {
        setSelectedFile(e.target.files[0]);
    };

    const Toast = Swal.mixin({
        toast: true,
        position: "top-end",
        showConfirmButton: true,
        timer: 3000,
        timerProgressBar: true,
    });

    const fileInputRef = useRef(null);

    const handleImageUpload = async () => {
        if (!selectedFile) {
            Toast.fire({
                icon: "error",
                title: "Please select a file first",
            });
            return;
        }

        const maxSizeInBytes = 2 * 1024 * 1024; 
    if (selectedFile.size > maxSizeInBytes) {
        Toast.fire({
            icon: "error",
            title: "File too large",
            text: "Image size must be less than or equal to 2MB.",
        });
        return;
    }

        if (images.length >= 4) {
            Toast.fire({
                icon: "warning",
                title: "Limit reached",
                text: "You can only upload a maximum of 4 images.",
            });
            return;
        }

        const confirm = await Swal.fire({
            title: "Are you sure?",
            text: "Do you want to upload this image?",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Yes, upload",
            cancelButtonText: "Cancel",
        });

        if (!confirm.isConfirmed) return;

        try {
            const uploadData = new FormData();
            uploadData.append("ImageUrl", selectedFile);

            const res = await fetch(BASE_IMG_UPLOAD, {
                method: "POST",
                body: uploadData,
            });

            const result = await res.json();

            if (!res.ok) {
                throw new Error(result.message || "Upload failed");
            }

            const filename = result.data.filename;

            setImages((prev) => [...prev, filename]);

            // ✅ clear input & state
            fileInputRef.current.value = "";
            setSelectedFile(null);

            // ✅ toast only
            Toast.fire({
                icon: "success",
                title: "Image uploaded successfully",
            });

        } catch (error) {
            Toast.fire({
                icon: "error",
                title: "Upload failed",
            });
        }
    };

    const handleAddSupplier = async (e) => {
        if (e) e.preventDefault(); // Prevent form reload
        setLoading(true);

        const payload = {
            ...formData,
            OrgId: sessionUserData?.OrgId,
            UpdatedBy: sessionUserData?.Id,
            // Ensure IsActive is boolean or 1/0 based on your API needs
            IsActive: formData.IsActive === "true" || formData.IsActive === true ? 1 : 0
        };

        try {
            const response = await fetchWithAuth(`ADMINRoutes/CreateSupplier`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const result = await response.json();

            if (response.ok && result.status === "success") {
                Swal.fire("Success", "Supplier created successfully!", "success");
                sessionStorage.removeItem("ddlAssetAddData");
                await fetchDDLData();

                // ✅ CLOSE MODAL USING STATE (Metronic style)
                setShowSupplierModal(false);

                // Optional: Reset form data
                setFormData({ SupplierName: "", Phone: "", Email: "", Address: "", GSTNumber: "", PANNumber: "", IsActive: "", });
            } else {
                Swal.fire("Error", result.message || "Failed to create supplier", "error");
            }
        } catch (error) {
            console.error("Submission error:", error);
            Swal.fire("Error", "An unexpected error occurred", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleAssetSubmit = async (status) => {
        setAddSubmitLoading(true);

        const showWarning = (msg) => {
            Swal.fire({
                title: "Warning",
                text: msg,
                icon: "warning",
            });
            setAddSubmitLoading(false);
        };
        if (!selectedAssetTypeId) return showWarning("Asset Type is mandatory.");
        if (!formAssetData?.MachineName?.trim()) return showWarning("Asset Name is mandatory.");
        if (!selectedUnitId) return showWarning("Unit is mandatory.");
        if (!selectedDeptId) return showWarning("Department is mandatory.");
        // if (!formAssetData?.MachineCode?.trim()) return showWarning("Asset Code is mandatory.");
        if (!formAssetData?.Model?.trim()) return showWarning("Model is mandatory.");
        if (!formAssetData?.MachineMake?.trim()) return showWarning("Asset Make (Asset Make) is mandatory.");
        if (!formAssetData?.PurchaseDate) return showWarning("Purchase Date is mandatory.");
        if (!formAssetData?.InstallationDate) return showWarning("Installation Date is mandatory.");
        if (!selectedSupplierId) return showWarning("Supplier is mandatory.");
        
        // Check for at least 1 image
        if (!images || images.length <= 0) {
            return showWarning("Please upload at least 1 machine image.");
        }

        const payload = {
            OrgId: sessionUserData?.OrgId,
            UserId: sessionUserData?.Id,
            Type: "ADD",
            Priority: 1,
            JsonData: {
                // MachineCode: formAssetData?.MachineCode,
                MachineName: formAssetData?.MachineName,
                Model: formAssetData?.Model,
                DeptId: selectedDeptId,
                SectionId: selectedSectionId,
                SupplierId: selectedSupplierId,
                InstallationDate: formAssetData?.InstallationDate,
                UpcomingMaintenanceDate: formAssetData?.UpcomingMaintenanceDate,
                ImageUrls: images.join(","),
                OperatorId: selectedUserId,
                PurchaseDate: formAssetData?.PurchaseDate,
                POfileUrl: null,
                InvoicefileUrl: null,
                MachineMake: formAssetData?.MachineMake,
                InvoiceNumber: formAssetData?.InvoiceNumber,
                PONumber: formAssetData?.PONumber,
                AssetTypeId: selectedAssetTypeId,
                UnitId: selectedUnitId,
                Status: status,
            }
        }

        try {
            const response = await fetchWithAuth(`PMMS/AssetRegCycle`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload),
            });

            const result = await response.json();
            setReturnAssetId(result.data.result[0].MachineId)

            if (result.data.result[0].ResponseCode === 2001) {
                Swal.fire({
                    title: "Success",
                    text: "Asset has been saved successfully.",
                    icon: "success",
                }).then(() => window.location.reload())
            }
            else if (result.data.result[0].ResponseCode === 2003) {
                Swal.fire({
                    title: "Success",
                    text: "Asset has been sent for approval successfully.",
                    icon: "success",
                });
            } else if (result.data.result[0].ResponseCode === 4000) {
                Swal.fire({
                    title: "Warning",
                    text: result.data.result[0].Message || "An asset code already in use.",
                    icon: "warning",
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
        } finally {
            setAddSubmitLoading(false);
        }
    };

    const handleRemoveImage = async (filename) => {

        const confirm = await Swal.fire({
            title: "Are you sure?",
            text: "Do you want to delete this image?",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Yes, delete",
            cancelButtonText: "Cancel"
        });

        if (!confirm.isConfirmed) return;

        try {
            const res = await fetch(
                `${BASE_IMG_DOC_DELETE}`,
                {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        type: "image",
                        filename: filename
                    })
                }
            );

            const result = await res.json();

            if (res.ok) {
                // Remove from state
                setImages((prev) => prev.filter((img) => img !== filename));

                // Swal.fire("Deleted!", "Image has been removed.", "success");
                Toast.fire({
                    icon: "success",
                    title: "Image removed successfully",
                });
            } else {
                Swal.fire("Error", result.message || "Could not delete.", "error");
            }

        } catch (error) {
            Swal.fire("Error", "Something went wrong!", "error");
        }
    };

    const handleViewImage = (image) => {
        const url = `${BASE_IMAGE_API_GET}${image}`;
        setPreviewImage(url);
    };

    const handleClosePreview = () => {
        setPreviewImage(null);
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

    useEffect(() => {
        if (!formAssetData.OcurrenceType) return;

        const { OcurrenceType, StartDate, EndDate, ScheduledDate, DaysOfWeek, DayOfMonth } = formAssetData;
        let generatedDates = [];

        if (OcurrenceType === "1" && ScheduledDate) {
            // Once
            generatedDates = [{ AlertDate: ScheduledDate, Day: getDayName(ScheduledDate) }];
        }

        else if (OcurrenceType === "2" && StartDate && EndDate && DaysOfWeek) {
            // Weekly
            const start = new Date(StartDate);
            const end = new Date(EndDate);
            const selectedDays = DaysOfWeek.split(",").map(Number); // e.g., [2, 4] => Mon, Wed

            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                const dayIndex = d.getDay() + 1; // 1=Sunday
                if (selectedDays.includes(dayIndex)) {
                    generatedDates.push({ AlertDate: d.toISOString().split("T")[0], Day: getDayName(d) });
                }
            }
        }

        else if (OcurrenceType === "3" && StartDate && EndDate && DayOfMonth) {
            // Monthly
            const start = new Date(StartDate);
            const end = new Date(EndDate);
            const day = Number(DayOfMonth.split(",")[0]); // only one day

            for (let d = new Date(start); d <= end; d = addMonths(d, 1)) {
                const target = new Date(d.getFullYear(), d.getMonth(), day);
                if (target >= start && target <= end) {
                    generatedDates.push({ AlertDate: target.toISOString().split("T")[0], Day: getDayName(target) });
                }
            }
        }
        else if (OcurrenceType === "6" && StartDate && EndDate && ScheduledDate) {
            const start = new Date(StartDate);
            const end = new Date(EndDate);

            const schedDate = new Date(ScheduledDate);
            const schedDay = schedDate.getDate();
            const schedMonth = schedDate.getMonth(); // 0-indexed

            let year = start.getFullYear();

            while (year <= end.getFullYear()) {
                // Construct alert date with year from loop and day/month from ScheduledDate
                let alertDate = new Date(year, schedMonth, schedDay);

                if (alertDate >= start && alertDate <= end) {
                    const alertDateStr = `${alertDate.getFullYear()}-${String(alertDate.getMonth() + 1).padStart(2, '0')}-${String(alertDate.getDate()).padStart(2, '0')}`;
                    generatedDates.push({
                        AlertDate: alertDateStr,
                        Day: getDayName(alertDate),
                    });
                }

                year += 1; // next year
            }
        }

        else if (["4", "5"].includes(OcurrenceType) && StartDate && EndDate) {
            // Yearly, Quarterly, Half-Yearly
            const start = new Date(StartDate);
            const end = new Date(EndDate);

            const incrementMonths = OcurrenceType === "4" ? 3 : OcurrenceType === "5" ? 6 : 12;

            for (let d = new Date(start); d <= end; d = addMonths(d, incrementMonths)) {
                generatedDates.push({ AlertDate: d.toISOString().split("T")[0], Day: getDayName(d) });
            }
        }
        setAlertDates(generatedDates);
    }, [formAssetData]);

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
            formAssetData?.OcurrenceType === "3" &&
            formAssetData?.StartDate &&
            formAssetData?.EndDate &&
            formAssetData?.DayOfMonth
        ) {
            const day = Number(formAssetData.DayOfMonth.split(",")[0]);
            const dates = generateMonthlyAlertDates(formAssetData.StartDate, formAssetData.EndDate, day);
            setAlertDates(dates);
        }
    }, [formAssetData.StartDate, formAssetData.EndDate, formAssetData.DayOfMonth]);

    useEffect(() => {
        setAlertDates([]);
    }, [formAssetData.OcurrenceType]);

    const getNextDate = (dateStr) => {
        if (!dateStr) return "";
        const date = new Date(dateStr);
        date.setDate(date.getDate() + 1);
        return date.toISOString().split("T")[0];
    };

    const showDeptDwn = sessionActionIds?.includes(25);

    return (
        <>
            <div
                ref={offcanvasRef}
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
                                width: 50% !important;
                            }
                        }
                    `}
                </style>
                <div>
                    <div className="offcanvas-header d-flex justify-content-between align-items-center mb-3">
                        <h5 id="offcanvasRightLabel" className="mb-0">Register Asset</h5>
                        <div className="d-flex align-items-center">
                            <button className="btn btn-warning btn-sm me-2"
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleAssetSubmit("DRAFT");
                                }}
                                disabled={addSubmitLoading || returnAssetId}
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
                        {/* <Collapse
                            accordion
                            defaultActiveKey={["1"]}
                            expandIconPosition="start"
                            expandIcon={({ isActive }) => (
                                <CaretRightOutlined rotate={isActive ? 90 : 0} />
                            )}
                            style={{ background: "white" }}
                            motion={null}
                        >
                            <Panel
                                header="Register Asset"
                                key="1"
                                extra={
                                    <span
                                        className="btn btn-warning btn-sm"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleAssetSubmit("DRAFT");
                                        }}
                                        disabled={addSubmitLoading || returnAssetId}
                                    >
                                        <i className="bi bi-bookmark-check"></i>{addSubmitLoading ? "Submitting..." : "Save as Draft"}
                                    </span>
                                }
                            > */}
                                <div className="alert alert-warning p-2 mb-2">
                                    ⚠️ Max 4 images allowed. Each image must be less than 2MB.
                                </div>
                                <div className="row">
                                    <div className="col-6 col-md-6 mb-2">
                                        <label className="form-label">
                                            Unit <span className="text-danger">*</span>
                                        </label>
                                        <Select
                                            showSearch
                                            // allowClear
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
                                            {unitsData?.map((unt) => (
                                                <Option key={unt.ItemId} value={unt.ItemId}>
                                                    {unt.DisplayValue}
                                                </Option>
                                            ))}
                                        </Select>
                                    </div>
                                    <div className="col-6 col-md-6 mb-2">
                                        <label className="form-label">
                                            Department <span className="text-danger">*</span>
                                        </label>
                                        <Select
                                            showSearch
                                            // allowClear
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
                                    <div className="col-12 col-md-6 mb-2">
                                        <label className="form-label">
                                            Asset Type <span className="text-danger">*</span>
                                        </label>
                                        <Select
                                            showSearch
                                            placeholder="Select asset type"
                                            className="w-100"
                                            value={selectedAssetTypeId || undefined}
                                            style={{ height: '2.8rem' }}
                                            onChange={(value) => setSelectedAssetTypeId(value)}
                                            optionFilterProp="children"
                                            filterOption={(input, option) =>
                                                option.children.toLowerCase().includes(input.toLowerCase())
                                            }
                                        >
                                            {assetTypesData?.map((assTyp) => (
                                                <Option key={assTyp.Id} value={assTyp.Id}>
                                                    {assTyp.TypeName}
                                                </Option>
                                            ))}
                                        </Select>
                                    </div>
                                    <div className="col-12 col-md-6 mb-2">
                                        <label className="form-label">Asset Name<span className="text-danger">*</span></label>
                                        <input
                                            type="text"
                                            name="MachineName"
                                            className="form-control"
                                            placeholder="Enter asset name"
                                            style={{ height: '2.8rem' }}
                                            value={formAssetData.MachineName}
                                            onChange={handleInputChange}
                                            autoComplete="off"
                                            maxLength={50}
                                            required
                                        />
                                    </div>
                                    <div className="col-12 col-md-6 mb-2">
                                        <label className="form-label">Serial No<span className="text-danger">*</span></label>
                                        <input
                                            type="text"
                                            name="MachineCode"
                                            className="form-control"
                                            placeholder="Enter serial no"
                                            style={{ height: '2.8rem' }}
                                            value={formAssetData.MachineCode}
                                            onChange={handleInputChange}
                                            autoComplete="off"
                                            maxLength={20}
                                            disabled
                                            required
                                        />
                                    </div>
                                    <div className="col-12 col-md-6 mb-2">
                                        <label className="form-label">Asset Model<span className="text-danger">*</span></label>
                                        <input
                                            type="text"
                                            name="Model"
                                            className="form-control"
                                            placeholder="Enter asset model"
                                            style={{ height: '2.8rem' }}
                                            value={formAssetData.Model}
                                            onChange={handleInputChange}
                                            autoComplete="off"
                                            onKeyDown={(e) => {
                                                if (e.key === ' ') {
                                                    e.preventDefault();
                                                }
                                            }}
                                            maxLength={15}
                                            required
                                        />
                                    </div>
                                    <div className="col-12 col-md-6 mb-2">
                                        <label className="form-label">Asset Make<span className="text-danger">*</span></label>
                                        <input
                                            type="text"
                                            name="MachineMake"
                                            className="form-control"
                                            placeholder="Enter asset make"
                                            style={{ height: '2.8rem' }}
                                            value={formAssetData.MachineMake}
                                            onChange={handleInputChange}
                                            autoComplete="off"
                                            maxLength={20}
                                            required
                                        />
                                    </div>
                                    <div className="col-6 mb-2">
                                        <label className="form-label">Purchase Date<span className="text-danger">*</span></label>
                                        <input
                                            type="date"
                                            name="PurchaseDate"
                                            className="form-control"
                                            style={{ height: '2.8rem' }}
                                            value={formAssetData.PurchaseDate}
                                            onKeyDown={(e) => e.preventDefault()}
                                            onChange={handleInputChange}
                                            max={new Date().toISOString().split('T')[0]}
                                            required
                                        />
                                    </div>
                                    <div className="col-6 mb-2">
                                        <label className="form-label">Installation Date<span className="text-danger">*</span></label>
                                        <input
                                            type="date"
                                            name="InstallationDate"
                                            className="form-control"
                                            style={{ height: '2.8rem' }}
                                            value={formAssetData.InstallationDate}
                                            onChange={handleInputChange}
                                            min={formAssetData.PurchaseDate}
                                            // max={new Date().toISOString().split("T")[0]}
                                            disabled={!formAssetData.PurchaseDate}
                                            onKeyDown={(e) => e.preventDefault()}
                                            required
                                        />
                                    </div>
                                    <div className="col-6 mb-2">
                                        <label className="form-label">Upcoming Maint.<span className="text-danger">*</span></label>
                                        <input
                                            type="date"
                                            name="UpcomingMaintenanceDate"
                                            className="form-control"
                                            style={{ height: '2.8rem' }}
                                            value={formAssetData.UpcomingMaintenanceDate}
                                            onChange={handleInputChange}
                                            // disabled={!formAssetData.PurchaseDate || !formAssetData.InstallationDate}
                                            min={getNextDate(formAssetData.InstallationDate)}
                                            onKeyDown={(e) => e.preventDefault()}
                                            required
                                            disabled={true}
                                        />
                                    </div>
                                    <div className="col-12 col-md-6 mb-2">
                                        <label className="form-label">PO Number<span className="text-danger">*</span></label>
                                        <input
                                            type="text"
                                            name="PONumber"
                                            className="form-control"
                                            style={{ height: '2.8rem' }}
                                            placeholder="Enter purchase order number"
                                            value={formAssetData.PONumber}
                                            onChange={handleInputChange}
                                            autoComplete="off"
                                            maxLength={20}
                                            required
                                        />
                                    </div>
                                    <div className="col-12 col-md-6 mb-2">
                                        <label className="form-label">Invoice Number<span className="text-danger">*</span></label>
                                        <input
                                            type="text"
                                            name="InvoiceNumber"
                                            className="form-control"
                                            placeholder="Enter invoice number"
                                            style={{ height: '2.8rem' }}
                                            value={formAssetData.InvoiceNumber}
                                            onChange={handleInputChange}
                                            autoComplete="off"
                                            maxLength={20}
                                            required
                                        />
                                    </div>
                                    <div className="col-12 col-md-6 mb-2 d-flex flex-column">
                                        <label className="form-label">Supplier<span className="text-danger">*</span></label>
                                        <div className="input-group">
                                            <Select
                                                placeholder="Select supplier"
                                                showSearch
                                                filterOption={(input, option) =>
                                                    option?.children?.toLowerCase().includes(input.toLowerCase())
                                                }
                                                value={selectedSupplierId || undefined}
                                                onChange={(value) => setSelectedSupplierId(value)}
                                                style={{ flex: 1, height: '2.8rem' }}
                                            >
                                                {suppliersData?.map((item) => (
                                                    <Option key={item.ItemId} value={item.ItemId}>
                                                        {item.ItemValue}
                                                    </Option>
                                                ))}
                                            </Select>
                                            <button
                                                className="btn btn-secondary"
                                                type="button"
                                                style={{ height: '2.8rem' }}
                                                onClick={() => setShowSupplierModal(true)}
                                            >
                                                <i className="fa-solid fa-plus text-dark fs-4 mb-1"></i>
                                            </button>
                                        </div>
                                    </div>
                                    <div className="col-12 col-md-6 mb-2 d-flex flex-column">
                                        <label className="form-label">Operator</label>
                                        <Select
                                            placeholder="Select user"
                                            showSearch
                                            allowClear
                                            filterOption={(input, option) =>
                                                option?.children?.toLowerCase().includes(input.toLowerCase())
                                            }
                                            value={selectedUserId || undefined}
                                            onChange={(value) => setSelectedUserId(value)}
                                            style={{ height: '2.8rem' }}
                                        >
                                            {usersData?.map((item) => (
                                                <Option key={item.ItemId} value={item.ItemId}>
                                                    {item.ItemValue}
                                                </Option>
                                            ))}
                                        </Select>
                                    </div>
                                    <div className="col-12 col-md-6 mb-2">
                                        <label className="form-label">Asset Images<span className="text-danger">*</span></label>
                                        <div className="input-group">
                                            <input
                                                ref={fileInputRef}
                                                className="form-control"
                                                type="file"
                                                name="Images"
                                                accept=".jpg,.jpeg,.png"
                                                onChange={handleFileChange}
                                                style={{ height: '2.8rem' }}
                                            />
                                            <span
                                                className={`input-group-text`}
                                                style={{ cursor: 'pointer' }}
                                                onClick={handleImageUpload}
                                            >
                                                <i className="fa-solid fa-cloud-arrow-up" style={{ color: '#63E6BE' }}></i>
                                            </span>
                                        </div>
                                    </div>

                                    {/* Purchase File Upload */}
                                    {/* <div className="col-12 col-md-6 mb-2">
                                <label className="form-label">Purchase File Upload</label>
                                <div className="input-group">
                                    <input
                                        className="form-control"
                                        type="file"
                                        // disabled={isPurchaseUploaded}
                                        disabled={true}
                                        style={{ height: '2.8rem' }}
                                        onChange={(e) => {
                                            const file = e.target.files[0];
                                            if (file && file.size / (1024 * 1024) > MAX_FILE_SIZE_MB) {
                                                Swal.fire("File Too Large", "Please choose a file smaller than 2MB.", "warning");
                                                e.target.value = ""; // reset input
                                                return;
                                            }
                                            setPurchaseFile(file);
                                            setIsPurchaseUploaded(false); // reset upload flag if they reselect
                                        }}                                    
                                    />
                                    <span
                                        className={`input-group-text ${isPurchaseUploaded ? 'bg-secondary' : ''}`}
                                        style={{ cursor: isPurchaseUploaded ? 'not-allowed' : 'pointer' }}
                                        onClick={() => {
                                            if (!isPurchaseUploaded) handlePurchaseUpload();
                                        }}
                                    >
                                        <i className="fa-solid fa-cloud-arrow-up" style={{ color: '#63E6BE' }}></i>
                                    </span>
                                </div>
                            </div> */}
                                    {/* Invoice File Upload */}
                                    {/* <div className="col-12 col-md-6 mb-2">
                                <label className="form-label">Invoice File Upload</label>
                                <div className="input-group">
                                    <input
                                        className="form-control"
                                        type="file"
                                        disabled={true}
                                        // disabled={isInvoiceUploaded}
                                        style={{ height: '2.8rem' }}
                                        onChange={(e) => {
                                            const file = e.target.files[0];
                                            if (file && file.size / (1024 * 1024) > MAX_FILE_SIZE_MB) {
                                                Swal.fire("File Too Large", "Please choose a file smaller than 2MB.", "warning");
                                                e.target.value = ""; // reset input
                                                return;
                                            }
                                            setInvoiceFile(file);
                                            setIsInvoiceUploaded(false); // reset upload flag if they reselect
                                        }}                                    
                                    />
                                    <span
                                        className={`input-group-text ${isInvoiceUploaded ? 'bg-secondary' : ''}`}
                                        style={{ cursor: isInvoiceUploaded ? 'not-allowed' : 'pointer' }}
                                        onClick={() => {
                                            if (!isInvoiceUploaded) handleInvoiceUpload();
                                        }}
                                    >
                                        <i className="fa-solid fa-cloud-arrow-up" style={{ color: '#63E6BE' }}></i>
                                    </span>
                                </div>
                            </div> */}
                                </div>
                                <div className="d-flex flex-wrap mt-2 gap-2">
                                    {images.map((image, index) => (
                                        <div
                                            key={index}
                                            className="position-relative shadow-sm rounded"
                                            style={{ width: 100, height: 100, overflow: 'hidden' }}
                                        >
                                            <img
                                                src={`${BASE_IMAGE_API_GET}${(image)}`}
                                                alt="preview"
                                                className="img-fluid rounded"
                                                style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                                            />
                                            <span
                                                onClick={() => handleRemoveImage(image)}
                                                className="position-absolute top-0 end-0 bg-danger text-white rounded-circle"
                                                style={{ cursor: 'pointer', padding: '0.2rem 0.4rem', fontSize: '0.8rem' }}
                                            >
                                                ✖
                                            </span>
                                            <span
                                                onClick={() => handleViewImage(image)}
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
                                        className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center bg-dark bg-opacity-50"
                                        style={{ zIndex: 1050 }}
                                        onClick={handleClosePreview}
                                    >
                                        <img
                                            src={previewImage}
                                            alt="Full preview"
                                            style={{ maxWidth: '90%', maxHeight: '90%', borderRadius: '10px' }}
                                        />
                                    </div>
                                )}
                            {/* </Panel>
                        </Collapse> */}
                    </div>
                </div>
            </div>

            {/* Supplier model */}
            {showSupplierModal && <div className="modal-backdrop fade show"></div>}
            <div
                className={`modal fade ${showSupplierModal ? "show d-block" : "d-none"}`}
                tabIndex="-1"
                role="dialog"
            >
                <div className="modal-dialog modal-lg modal-dialog-centered">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h5 className="modal-title fw-bold">Add New Supplier</h5>
                            <button type="button" className="btn-close" onClick={() => setShowSupplierModal(false)}></button>
                        </div>
                        <form onSubmit={handleAddSupplier}>
                            <div className="modal-body">
                                <div className="row g-3">
                                    <div className="col-md-6">
                                        <label className="form-label fw-semibold">Supplier Name <span className="text-danger">*</span></label>
                                        <input
                                            type="text"
                                            name="SupplierName"
                                            className="form-control"
                                            required
                                            value={formData.SupplierName}
                                            onChange={(e) => setFormData({ ...formData, SupplierName: e.target.value })}
                                            placeholder="Enter supplier name"
                                        />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label fw-semibold">Phone <span className="text-danger">*</span></label>
                                        <input
                                            type="text"
                                            name="Phone"
                                            className="form-control"
                                            value={formData.Phone}
                                            onChange={(e) => setFormData({ ...formData, Phone: e.target.value })}
                                            placeholder="Enter phone number"
                                        />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label fw-semibold">Email Address <span className="text-danger">*</span></label>
                                        <input
                                            type="email"
                                            name="Email"
                                            className="form-control"
                                            value={formData.Email === true ? "" : formData.Email} // Handling your default 'true' state
                                            onChange={(e) => setFormData({ ...formData, Email: e.target.value })}
                                            placeholder="Enter email address"
                                        />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label fw-semibold">GST Number</label>
                                        <input
                                            type="text"
                                            name="GSTNumber"
                                            className="form-control"
                                            value={formData.GSTNumber}
                                            onChange={(e) => setFormData({ ...formData, GSTNumber: e.target.value.toUpperCase() })}
                                            placeholder="Enter GST number"
                                        />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label fw-semibold">PAN Number</label>
                                        <input
                                            type="text"
                                            name="PANNumber"
                                            className="form-control"
                                            value={formData.PANNumber}
                                            onChange={(e) => setFormData({ ...formData, PANNumber: e.target.value.toUpperCase() })}
                                            placeholder="Enter PAN number"
                                        />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label fw-semibold">Status <span className="text-danger">*</span></label>
                                        <select
                                            className="form-select"
                                            name="IsActive"
                                            value={formData.IsActive}
                                            onChange={(e) => setFormData({ ...formData, IsActive: e.target.value })}
                                        >
                                            <option value="true">Active</option>
                                            <option value="false">Inactive</option>
                                        </select>
                                    </div>
                                    <div className="col-12">
                                        <label className="form-label fw-semibold">Address</label>
                                        <textarea
                                            className="form-control"
                                            name="Address"
                                            rows="2"
                                            value={formData.Address || ''}
                                            onChange={(e) => setFormData({ ...formData, Address: e.target.value })}
                                            placeholder="Enter address..."
                                        ></textarea>
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer bg-light">
                                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowSupplierModal(false)}><i class="bi bi-x-lg mb-1 text-dark"></i>Close</button>
                                <button
                                    type="submit"
                                    className="btn btn-primary btn-sm px-4"
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm me-2"></span>
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <i className="bi bi-bookmark-check fs-4"></i>
                                            Save Supplier
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </>
    );
}
