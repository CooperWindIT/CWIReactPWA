import React, { useState, useEffect, useCallback, useRef } from "react";
import Base1 from "./../../Config/Base1";
import { useNavigate, useLocation } from "react-router-dom";
import { CameraOutlined, FileImageOutlined, PlusOutlined } from "@ant-design/icons";
import { getInwards, manageInwards } from "../services/services";
import { Dropdown, Menu } from 'antd';
import { fetchWithAuth } from "../../../utils/api";
import Swal from "sweetalert2";
import RegisterInwardModel from "../components/RegisterInwardModel";
import EditInwardModel from "../components/EditInwardModel";
import CameraCapture from "../components/CameraCapture";
import BarcodeTraceModal from "../components/BarcodeTraceModal";
import "./InwardRecordsPremium.css";

const STORAGE_KEY = "iimInwardsListState";
const iconColors = ['#FF6B35', '#00B8D9', '#36B37E', '#FFAB00', '#6554C0', '#FF5630'];

// Action id that marks the logged-in user as Security
const ACTION_SECURITY = 39;

// Action id that allows the "View" button on inward records
const ACTION_VIEW_INWARD = 40;

// Action id that allows "Register Inward Record"
const ACTION_REGISTER_INWARD = 1;

// Action id that allows "Edit" on inward records (only while status is NEW)
const ACTION_EDIT_INWARD = 3;

// ManageInwards action used when Security uploads the container photo
const UPLOAD_PHOTOS_ACTION = "UPDATE_IMAGE";

// Max photo size (10 MB)
const MAX_PHOTO_SIZE = 10 * 1024 * 1024;

// Menu whose ActionsIds drive this screen
const INWARDS_MENU_NAME = "Inwards";

// Local date (offset in days from today) in YYYY-MM-DD format
const getDateOffset = (offsetDays = 0) => {
    const date = new Date();
    date.setDate(date.getDate() + offsetDays);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
};

const getTodayDate = () => getDateOffset(0);

// Read action ids synchronously so the first API call uses the right dates
const getMenuActionIds = () => {
    try {
        const parsedMenu = JSON.parse(sessionStorage.getItem("menuData") || "[]");
        const menu = parsedMenu.find(m => m.MenuName === INWARDS_MENU_NAME);
        return menu?.ActionsIds ? menu.ActionsIds.split(",").map(Number) : [];
    } catch {
        return [];
    }
};

// Security -> today only; others -> yesterday to tomorrow
const getDefaultDates = (isSecurityUser) =>
    isSecurityUser
        ? { from: getDateOffset(0), to: getDateOffset(0) }
        : { from: getDateOffset(-1), to: getDateOffset(1) };

// "01 Nov 2026"
const formatDisplayDate = (value) => {
    if (!value) return "-";
    const d = new Date(value);
    if (isNaN(d)) return value;
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const STATUS_META = {
    NEW: { label: "New", cls: "ir-pill-amber" },
    PENDING_REVIEW: { label: "Pending Review", cls: "ir-pill-blue" },
    REVIEWED: { label: "Reviewed", cls: "ir-pill-violet" },
    INVENTORY_UPDATED: { label: "Inventory Updated", cls: "ir-pill-green" },
    APPROVED: { label: "Inventory Updated", cls: "ir-pill-green" }
};

// Backend status after approval is INVENTORY_UPDATED (old data may still say APPROVED)
const normalizeStatus = (status) => {
    const key = (status || "").toUpperCase();
    return key === "APPROVED" ? "INVENTORY_UPDATED" : key;
};

const getStatusMeta = (status) => {
    const key = normalizeStatus(status);
    return STATUS_META[key] || {
        label: key ? key.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase()) : "Pending",
        cls: "ir-pill-amber"
    };
};

const getSavedState = () => {
    try {
        return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "{}");
    } catch {
        return {};
    }
};

export default function InwardRecordsList() {

    const location = useLocation();
    const navigate = useNavigate();
    const [showTrace, setShowTrace] = useState(false);   // Trace barcode popup (all users)
    // Trace barcode -> open the unit's outward (same as Dashboard)
    const openTracedOutward = (o) => {
        const record = { Id: o.OutwardId, InwardRecordNo: o.OutwardNo, ArrivalDate: o.OutwardDate || o.RegisteredOn, VehicleNumber: o.VehicleNumber, Status: o.Status || o.OutwardStatus };
        try { sessionStorage.setItem(`iomOutward_${o.OutwardId}`, JSON.stringify(record)); } catch { /* ignore */ }
        navigate(`/iom/outward-view/${o.OutwardId}`, { state: { record } });
    };
    const fileInputRef = useRef(null);
    const cameraInputRef = useRef(null);   // phone camera fallback (<input capture>)

    const savedState = getSavedState();

    const [sessionUserData] = useState(() => {
        try {
            return JSON.parse(sessionStorage.getItem("userData") || "{}");
        } catch {
            return {};
        }
    });

    const [currentPage, setCurrentPage] = useState(
        savedState.currentPage || 1
    );

    const [pageSize, setPageSize] = useState(
        savedState.pageSize || 10
    );

    const [activeTab, setActiveTab] = useState(
        // old saved tab "APPROVED" -> new status key
        (savedState.activeTab === "APPROVED" ? "INVENTORY_UPDATED" : savedState.activeTab) || "needed"
    );

    const [inwardData, setInwardData] = useState([]);
    const [totalRecords, setTotalRecords] = useState(0);
    const [dataLoading, setDataLoading] = useState(false);
    const [sessionActionIds, setSessionActionIds] = useState(getMenuActionIds);
    const [menuData, setMenuData] = useState([]);
    const [modules, setModules] = useState([]);

    const [selectedInward, setSelectedInward] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [cameraOn, setCameraOn] = useState(false);

    const [vehicleSearch, setVehicleSearch] = useState("");

    const [inwardsCache, setInwardsCache] = useState({});
    const [showRegisterModal, setShowRegisterModal] = useState(false);
    const [editRecord, setEditRecord] = useState(null);   // inward being edited

    // Security user (action 39) -> fixed to today's date
    const isSecurity = sessionActionIds?.includes(ACTION_SECURITY);

    // Date filter (others can change it; Security is always today)
    const [fromDate, setFromDate] = useState(
        () => getDefaultDates(getMenuActionIds().includes(ACTION_SECURITY)).from
    );
    const [toDate, setToDate] = useState(
        () => getDefaultDates(getMenuActionIds().includes(ACTION_SECURITY)).to
    );

    const handleModuleClick = async (mod) => {
        localStorage.setItem("ModuleData", JSON.stringify(mod));

        const sessionUserData = JSON.parse(sessionStorage.getItem("userData") || "{}");
        try {
            const response = await fetchWithAuth(`auth/getmenu?OrgId=${sessionUserData.OrgId}&RoleId=${sessionUserData.RoleId}&ModuleId=${mod.Id}&UserId=${sessionUserData.Id}`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            }
            );

            if (response.ok) {
                const data = await response.json();
                const menuList = data.ResultData;

                if (menuList.length > 0 && menuList[0].MenuPath) {
                    sessionStorage.setItem("menuData", JSON.stringify(menuList));
                    sessionStorage.setItem("navigationPath", menuList[0].MenuPath);
                    navigate(menuList[0].MenuPath);
                } else {
                    Swal.fire({
                        icon: 'warning',
                        title: 'Module unavailable',
                        text: 'You don’t have access to this module yet. Please contact your administrator for help.',
                        confirmButtonText: 'OK'
                    });
                    console.warn("No menu path available.");
                }
            } else {
                Swal.fire({
                    icon: 'warning',
                    title: 'Module unavailable',
                    text: 'You don’t have access to this module yet. Please contact your administrator for help.',
                    confirmButtonText: 'OK'
                });
                console.error("Failed to fetch menu data");
            }
        } catch (error) {
            console.error("Menu fetch error:", error);
        }
    };

    const fetchMenuData = async () => {
        try {
            // First check if accessModules already exists in sessionStorage
            const sessionAccessModules = sessionStorage.getItem("accessModules");

            if (sessionAccessModules) {
                // ✅ If already cached, just parse and set directly
                setModules(JSON.parse(sessionAccessModules));
                return; // stop further execution
            }

            // 🚀 Else fetch from API
            const response = await fetchWithAuth("auth/getModules", {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });

            if (response.ok) {
                const data = await response.json();
                const allModules = data.ResultData || [];

                // Get user access IDs
                const userData = JSON.parse(sessionStorage.getItem("userData") || "{}");
                const accessIds = userData?.AccessToModules
                    ? userData.AccessToModules.split(",").map(Number)
                    : [];

                // Filter modules by access
                const filteredModules = allModules.filter((mod) =>
                    accessIds.includes(mod.Id)
                );

                // Save to state
                setModules(filteredModules);

                // 🔥 Cache in sessionStorage for next time
                sessionStorage.setItem("accessModules", JSON.stringify(filteredModules));
            } else {
                console.error("Failed to fetch menu data:", response.statusText);
            }
        } catch (error) {
            console.error("Error fetching menu data:", error.message);
        }
    };

    useEffect(() => {
        const sessionMenuData = sessionStorage.getItem("menuData");
        try {
            const parsedMenu = JSON.parse(sessionMenuData);
            setMenuData(parsedMenu)

            const ticketsMenu = parsedMenu.find(
                (item) => item.MenuName === INWARDS_MENU_NAME
            );

            if (ticketsMenu) {
                const actionIdArray = ticketsMenu.ActionsIds?.split(",").map(Number);
                setSessionActionIds(actionIdArray);
            }
        } catch (err) {
            console.error("Error parsing menuData:", err);
        }
    }, []);

    // Security sees the container-photos screen
    const isUplaodPhoto = isSecurity;

    // View button permission
    const canViewInward = sessionActionIds?.includes(ACTION_VIEW_INWARD);

    // Register button permission
    const canRegisterInward = sessionActionIds?.includes(ACTION_REGISTER_INWARD);

    // Edit only for NEW inwards and users with action 3
    const canEditInward = sessionActionIds?.includes(ACTION_EDIT_INWARD);
    const isEditable = (item) => canEditInward && String(item?.Status || "").toUpperCase() === "NEW";

    const [statusCounts, setStatusCounts] = useState({
        ALL: 0,
        NEW: 0,
        PENDING_REVIEW: 0,
        REVIEWED: 0,
        INVENTORY_UPDATED: 0
    });

    const managerTabs = [
        { key: "ALL", label: "All", icon: "fa-solid fa-layer-group", tone: "ir-tone-blue" },
        { key: "NEW", label: "New", icon: "fa-solid fa-file-circle-plus", tone: "ir-tone-amber" },
        { key: "PENDING_REVIEW", label: "Pending Review", icon: "fa-solid fa-hourglass-half", tone: "ir-tone-amber" },
        { key: "REVIEWED", label: "Reviewed", icon: "fa-solid fa-clipboard-check", tone: "ir-tone-violet" },
        { key: "INVENTORY_UPDATED", label: "Inventory Updated", icon: "fa-solid fa-circle-check", tone: "ir-tone-green" }
    ];

    useEffect(() => {
        if (sessionUserData?.OrgId) {
            fetchMenuData();
        }
    }, [sessionUserData]);

    // Persist pagination and tab state
    useEffect(() => {
        sessionStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({
                currentPage,
                pageSize,
                activeTab
            })
        );
    }, [currentPage, pageSize, activeTab]);

    // Fetch Inward Records
    const fetchInwards = useCallback(async (
        page = 1,
        force = false,
        overridePageSize = null,
        overrideVehicle = null,
        overrideDates = null
    ) => {

        if (!sessionUserData?.OrgId) return;

        const finalPageSize = overridePageSize ?? pageSize;
        const finalVehicle = overrideVehicle ?? vehicleSearch;

        // Security picks ONE date -> sent as both From and To
        const finalFrom = overrideDates?.from ?? fromDate;
        const finalTo = isSecurity ? finalFrom : (overrideDates?.to ?? toDate);

        const cacheKey = [
            sessionUserData.OrgId,
            finalFrom,
            finalTo,
            finalVehicle.trim(),
            page,
            finalPageSize
        ].join("-");

        if (!force && inwardsCache[cacheKey]) {
            setInwardData(inwardsCache[cacheKey].data);
            setTotalRecords(inwardsCache[cacheKey].total);
            setCurrentPage(page);
            return;
        }

        setDataLoading(true);

        try {

            const response = await getInwards({
                orgId: sessionUserData.OrgId,
                pageNumber: page,
                pageSize: finalPageSize,
                fromDate: finalFrom,
                toDate: finalTo,
                vehicleNumber: finalVehicle.trim(),
                status: "ALL"
            });

            const records = response?.data?.result || [];
            const total = response?.data?.output?.TotalCount || 0;

            setInwardData(records);
            setTotalRecords(Number(total));
            setCurrentPage(page);

            setInwardsCache(prev => ({
                ...prev,
                [cacheKey]: {
                    data: records,
                    total: Number(total)
                }
            }));

        } catch (error) {

            console.error("Get Inwards Error:", error);

            setInwardData([]);
            setTotalRecords(0);

            if (window.Swal) {
                window.Swal.fire(
                    "Error",
                    "Failed to fetch inward records",
                    "error"
                );
            }

        } finally {
            setDataLoading(false);
        }

    }, [sessionUserData, pageSize, vehicleSearch, fromDate, toDate, isSecurity, inwardsCache]);

    // Initial API call
    useEffect(() => {
        if (sessionUserData?.OrgId) {
            fetchInwards(currentPage);
        } else {
            navigate("/");
        }
        // Initial fetch only when organization is available
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sessionUserData?.OrgId]);

    // Records with missing photos
    const photosNeeded = inwardData.filter(
        item => !item.ImageUrl
    );

    // Records for selected tab
    const displayedRecords =
        activeTab === "needed"
            ? photosNeeded
            : inwardData;

    // Search by vehicle number + dates
    const handleSearch = () => {
        if (isSecurity && !fromDate) {
            Swal.fire("Warning", "Please select a date", "warning");
            return;
        }

        if (!isSecurity) {
            if (!fromDate || !toDate) {
                Swal.fire("Warning", "Please select From and To dates", "warning");
                return;
            }

            if (fromDate > toDate) {
                Swal.fire("Warning", "From date cannot be after To date", "warning");
                return;
            }
        }

        setInwardsCache({});
        setCurrentPage(1);
        fetchInwards(1, true);
    };

    // Reset search (vehicle + dates back to defaults)
    const handleReset = () => {
        const defaults = getDefaultDates(isSecurity);

        setVehicleSearch("");
        setFromDate(defaults.from);
        setToDate(defaults.to);
        setInwardsCache({});
        setCurrentPage(1);
        fetchInwards(1, true, pageSize, "", defaults);
    };

    // Change page
    const handlePageChange = (page) => {
        const totalPages = Math.ceil(totalRecords / pageSize);

        if (page < 1 || page > totalPages) return;

        fetchInwards(page);
    };

    // Change page size
    const handlePageSizeChange = (e) => {
        const newSize = Number(e.target.value);

        setPageSize(newSize);
        setCurrentPage(1);
        setInwardsCache({});

        fetchInwards(1, true, newSize);
    };

    // Open upload photo modal
    const handleUploadClick = (record) => {
        setSelectedInward(record);
        setSelectedFile(null);
        setCameraOn(false);
    };

    // Live camera not available (http / permission) -> phone camera via <input capture>
    const handleCameraUnavailable = (message) => {
        setCameraOn(false);
        Swal.fire({
            toast: true, position: "top", icon: "info", title: message,
            timer: 2500, showConfirmButton: false
        });
        setTimeout(() => cameraInputRef.current?.click(), 150);
    };

    // Security: change the single date -> reload that day
    const handleSecurityDateChange = (value) => {
        setFromDate(value);
        setToDate(value);
        if (!value) return;
        setInwardsCache({});
        setCurrentPage(1);
        fetchInwards(1, true, pageSize, null, { from: value, to: value });
    };

    // Choose one photo (image only, max 10 MB)
    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        e.target.value = ""; // allow picking the same file again
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            Swal.fire("Warning", "Please choose an image file", "warning");
            return;
        }
        if (file.size > MAX_PHOTO_SIZE) {
            Swal.fire("Warning", "Photo must be 10 MB or smaller", "warning");
            return;
        }

        setSelectedFile(file);
    };

    // Upload container photo -> POST file_upload/ManageInwards (FormData)
    const [uploading, setUploading] = useState(false);

    const closeUploadModal = () => {
        if (uploading) return;
        setCameraOn(false);
        setSelectedInward(null);
        setSelectedFile(null);
    };

    const handleUploadPhoto = async () => {
        if (!selectedInward?.Id) return;

        if (!selectedFile) {
            Swal.fire("Warning", "Please choose a photo", "warning");
            return;
        }

        const formData = new FormData();

        formData.append("OrgId", sessionUserData.OrgId);
        formData.append("Action", UPLOAD_PHOTOS_ACTION);
        formData.append("InwardRecordJson", JSON.stringify({ Id: Number(selectedInward.Id), UserId: sessionUserData?.Id, IsOutward: 0, NotifyId: 0 }));
        formData.append("ItemsJson", "null");
        formData.append("UnitsJson", "null");
        formData.append("DocFile", selectedFile);

        setUploading(true);

        try {
            const response = await manageInwards(formData);

            const success =
                (response?.status === 200 && response?.result === "success") ||
                response?.success === true;

            if (success) {
                Swal.fire({
                    icon: "success",
                    title: "Photo uploaded",
                    text: response?.response || response?.message ||
                        `Photo uploaded for ${selectedInward.InwardRecordNo}.`,
                    timer: 2000,
                    showConfirmButton: false
                });

                setSelectedInward(null);
                setSelectedFile(null);
                setInwardsCache({});
                await fetchInwards(currentPage, true);
            } else {
                Swal.fire("Error", response?.response || response?.message || "Unable to upload photo", "error");
            }
        } catch (error) {
            console.error("Upload Photo Error:", error);
            Swal.fire("Error", error?.message || "Failed to upload photo", "error");
        } finally {
            setUploading(false);
        }
    };

    // Preview URL for the chosen photo
    const [previewUrl, setPreviewUrl] = useState("");

    useEffect(() => {
        if (!selectedFile) { setPreviewUrl(""); return; }
        const url = URL.createObjectURL(selectedFile);
        setPreviewUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [selectedFile]);

    // Esc closes the upload modal
    useEffect(() => {
        if (!selectedInward) return;
        const onKey = (e) => { if (e.key === "Escape") closeUploadModal(); };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    });

    const totalPages = Math.ceil(totalRecords / pageSize);

    // Counts per status (current page)
    const tabCounts = inwardData.reduce(
        (acc, item) => {
            const key = normalizeStatus(item.Status);
            acc.ALL += 1;
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        },
        { ALL: 0 }
    );

    // Manager rows for the selected tab
    const managerRecords = inwardData.filter((item) =>
        activeTab === "ALL" ||
        activeTab === "needed" ||
        normalizeStatus(item.Status) === activeTab
    );

    // ==========================================
    // SHARED UI PIECES
    // ==========================================

    const renderSkeleton = (cols) =>
        Array.from({ length: 4 }).map((_, r) => (
            <tr key={`sk-${r}`}>
                {Array.from({ length: cols }).map((__, c) => (
                    <td key={c}>
                        <div className="ir-skel" style={{ width: c === 0 ? "70%" : "55%" }} />
                    </td>
                ))}
            </tr>
        ));

    const renderEmpty = (cols, title) => (
        <tr>
            <td colSpan={cols}>
                <div className="ir-empty">
                    <div className="ir-empty-icon"><FileImageOutlined /></div>
                    <div className="ir-empty-title">{title}</div>
                    <div className="ir-sub">Try a different date range or clear the search.</div>
                </div>
            </td>
        </tr>
    );

    const renderFooter = () =>
        !dataLoading && totalRecords > 0 && (
            <div className="ir-footer">
                <div className="ir-footer-info">
                    Showing <b>{(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, totalRecords)}</b> of <b>{totalRecords}</b> records
                </div>

                <div className="ir-pager">
                    <select value={pageSize} onChange={handlePageSizeChange} title="Rows per page">
                        <option value={10}>10 / page</option>
                        <option value={20}>20 / page</option>
                        <option value={50}>50 / page</option>
                        <option value={100}>100 / page</option>
                    </select>

                    <button
                        type="button"
                        className="ir-page-btn"
                        disabled={currentPage <= 1}
                        onClick={() => handlePageChange(currentPage - 1)}
                        title="Previous"
                    >
                        <i className="fa-solid fa-chevron-left" />
                    </button>

                    <span className="ir-page-label">{currentPage} / {totalPages || 1}</span>

                    <button
                        type="button"
                        className="ir-page-btn"
                        disabled={currentPage >= totalPages}
                        onClick={() => handlePageChange(currentPage + 1)}
                        title="Next"
                    >
                        <i className="fa-solid fa-chevron-right" />
                    </button>
                </div>
            </div>
        );

    return (
        <Base1>

            {/* Toolbar */}
            <div id="kt_app_toolbar" className="app-toolbar iim-nav py-3 py-lg-4">
                <div id="kt_app_toolbar_container" className="app-container container-xxl d-flex flex-stack">
                    <div className="page-title d-md-block d-none">
                        <div className="d-flex align-items-center gap-2">
                            <div className="dropdown d-inline-block me-2">
                                <span
                                    className="menu-link bg-white shadow-sm me-2 dropdown-toggle"
                                    role="button"
                                    data-bs-toggle="dropdown"
                                    aria-expanded="false"
                                    style={{ position: "relative", zIndex: 10 }}
                                >
                                    <span className="menu-title">
                                        <i className="fa-solid fa-grip me-1"></i> Portal
                                    </span>
                                </span>

                                <ul className="dropdown-menu shadow">
                                    {modules.map((mod, index) => {
                                        const isActive = location.pathname
                                            .toLowerCase()
                                            .includes(mod.ModuleName.toLowerCase());

                                        return (
                                            <li
                                                key={index}
                                                className={`mb-1 ${isActive ? "active-module" : ""}`}
                                            >
                                                <a
                                                    className="dropdown-item d-flex align-items-center gap-2 module-item"
                                                    onClick={() => handleModuleClick(mod)}
                                                    style={{ cursor: "pointer" }}
                                                >
                                                    <i
                                                        className={`fas fa-${mod.ImageIcon}`}
                                                        style={{
                                                            color: iconColors[index % iconColors.length],
                                                            textShadow: "1px 1px 3px rgba(0,0,0,0.5)",
                                                        }}
                                                    ></i>
                                                    <span>{mod.ModuleName}</span>
                                                </a>
                                            </li>
                                        );
                                    })}
                                    {sessionUserData?.RoleId === 1 && (
                                        <a
                                            href={`https://betasuperportal.cooperwind.online/`}
                                            target="_blank"
                                        >
                                            <li className="dropdown-item d-flex align-items-center gap-2 module-item">
                                                <i
                                                    className={`fa-solid fa-user-tie`}
                                                    style={{
                                                        color: "#c8e6c9",
                                                        textShadow: "1px 1px 3px rgba(0, 0, 0, 0.5)",
                                                    }}
                                                ></i>
                                                <span>Super Portal</span>
                                            </li>
                                        </a>
                                    )}
                                    <li
                                        className="dropdown-item d-flex align-items-center gap-2 module-item"
                                        onClick={() => navigate("/user-modules")}
                                        style={{ cursor: "pointer" }}
                                    >
                                        <i
                                            className="fa-solid fa-arrow-left"
                                            style={{
                                                color: "#ffccbc",
                                                textShadow: "1px 1px 3px rgba(0,0,0,0.5)",
                                            }}
                                        ></i>
                                        <span>Go Back to Portal</span>
                                    </li>
                                </ul>
                            </div>
                            <div className="d-flex align-items-center">
                                {menuData?.map((menu) => {
                                    const hasSubItems = menu.SubItems && menu.SubItems.length > 0;

                                    if (hasSubItems) {
                                        const subMenu = (
                                            <Menu className="shadow-sm border-0 rounded-3 mt-2">
                                                {menu.SubItems.map((sub) => (
                                                    <Menu.Item key={sub.AppMenuId} className="p-3">
                                                        <a
                                                            href={sub.MenuPath.startsWith('/') ? sub.MenuPath : `/${sub.MenuPath}`}
                                                            className="text-gray-700 fw-bold text-decoration-none"
                                                        >
                                                            <i className="bi bi-arrow-return-right me-1"></i>
                                                            {sub.MenuName}
                                                        </a>
                                                    </Menu.Item>
                                                ))}
                                            </Menu>
                                        );

                                        return (
                                            <Dropdown overlay={subMenu} trigger={['hover']} key={menu.AppMenuId}>
                                                <span className="menu-link bg-white shadow-sm me-2 cursor-pointer border border-gray-100">
                                                    <span className="menu-title">
                                                        <i className={`${menu.IconName || 'bi bi-grid'} text-primary me-2`}></i>
                                                        {menu.MenuName}
                                                    </span>
                                                    <i className="bi bi-chevron-down ms-2 fs-9"></i>
                                                </span>
                                            </Dropdown>
                                        );
                                    }
                                    return (
                                        <a
                                            key={menu.AppMenuId}
                                            href={menu.MenuPath}
                                            style={{ position: "relative", zIndex: 10, textDecoration: 'none' }}
                                        >
                                            <span className={`menu-link bg-white shadow-sm me-2 cursor-pointer ${window.location.pathname === menu.MenuPath ? 'active border-primary' : ''}`}>
                                                <span className="menu-title text-gray-800">
                                                    <i className={`${menu.IconName} text-primary me-2`}></i>
                                                    {menu.MenuName}
                                                </span>
                                            </span>
                                        </a>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <div className="page-title d-md-none d-block">
                        <div className="d-flex align-items-center gap-2">
                            <div className="dropdown d-inline-block">
                                <span
                                    className="menu-link bg-white shadow-sm me-2 dropdown-toggle"
                                    role="button"
                                    data-bs-toggle="dropdown"
                                    aria-expanded="false"
                                    style={{ position: "relative", zIndex: 10 }}
                                >
                                    <span className="menu-title">
                                        <i className="fa-solid fa-grip me-1"></i>
                                    </span>
                                </span>

                                <ul className="dropdown-menu shadow">
                                    {modules?.map((mod, index) => {
                                        const isActive = location.pathname.toLowerCase().includes(
                                            mod.ModuleName.toLowerCase()
                                        );

                                        return (
                                            <li
                                                key={index}
                                                className={`mb-1 ${isActive ? "active-module" : ""}`}
                                            >
                                                <a
                                                    className="dropdown-item d-flex align-items-center gap-2 module-item"
                                                    onClick={() => handleModuleClick(mod)}
                                                    style={{ cursor: "pointer" }}
                                                >
                                                    <i
                                                        className={`fas fa-${mod.ImageIcon}`}
                                                        style={{
                                                            color: iconColors[index % iconColors.length],
                                                            textShadow: "1px 1px 3px rgba(0,0,0,0.5)",
                                                        }}
                                                    ></i>
                                                    <span>{mod.ModuleName}</span>
                                                </a>
                                            </li>
                                        );
                                    })}
                                    {sessionUserData?.RoleId === 1 && (
                                        <a href={`https://betasuperportal.cooperwind.online/`} target="_blank">
                                            <li className="dropdown-item d-flex align-items-center gap-2 module-item">
                                                <i
                                                    className={`fa-solid fa-user-tie`}
                                                    style={{
                                                        color: '#c8e6c9',
                                                        textShadow: '1px 1px 3px rgba(0, 0, 0, 0.5)',
                                                    }}
                                                ></i>
                                                <span>Super Portal</span>
                                            </li>
                                        </a>
                                    )}
                                    <li className="dropdown-item d-flex align-items-center gap-2 module-item"
                                        onClick={() => navigate("/user-modules")}
                                        style={{ cursor: "pointer" }}
                                    >
                                        <i
                                            className="fa-solid fa-arrow-left"
                                            style={{
                                                color: "#ffccbc",
                                                textShadow: "1px 1px 3px rgba(0,0,0,0.5)",
                                            }}
                                        ></i>
                                        <span>Go Back to Portal</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>


            <div
                id="kt_app_content"
                className="app-content flex-column-fluid pt-0 mb-5"
            >
                <div
                    id="kt_app_content_container"
                    className="app-container container-xxl ir-page"
                >

                    {isUplaodPhoto ? (

                        /* ==========================================
                            SECURITY - CONTAINER PHOTOS
                        ========================================== */

                        <>
                            {/* HEADER */}
                            <div className="ir-header">
                                <div className="ir-header-left">
                                    <div className="ir-header-icon">
                                        <CameraOutlined />
                                    </div>
                                    <div>
                                        <h2 className="ir-title">Container Photos</h2>
                                        <div className="ir-subtitle">
                                            Inward records registered by Stores. Upload a photo of the container or vehicle for each one.
                                        </div>
                                    </div>
                                </div>

                                <div className="ir-header-actions">
                                    <button type="button" className="ir-btn-trace" onClick={() => setShowTrace(true)} title="Trace barcode">
                                        <i className="fa-solid fa-barcode" /> Trace Barcode
                                    </button>
                                </div>
                            </div>

                            {/* KPI TABS */}
                            <div className="ir-kpis ir-kpis-3">
                                <button
                                    type="button"
                                    className={`ir-kpi ${activeTab === "needed" ? "active" : ""}`}
                                    onClick={() => setActiveTab("needed")}
                                >
                                    <span className="ir-kpi-icon ir-tone-amber"><i className="fa-solid fa-camera" /></span>
                                    <span>
                                        <div className="ir-kpi-label">Photos needed</div>
                                        <div className="ir-kpi-value">{photosNeeded.length}</div>
                                    </span>
                                </button>

                                <button
                                    type="button"
                                    className="ir-kpi"
                                    style={{ cursor: "default" }}
                                >
                                    <span className="ir-kpi-icon ir-tone-green"><i className="fa-solid fa-circle-check" /></span>
                                    <span>
                                        <div className="ir-kpi-label">Uploaded</div>
                                        <div className="ir-kpi-value">{inwardData.length - photosNeeded.length}</div>
                                    </span>
                                </button>

                                <button
                                    type="button"
                                    className={`ir-kpi ${activeTab === "all" ? "active" : ""}`}
                                    onClick={() => setActiveTab("all")}
                                >
                                    <span className="ir-kpi-icon ir-tone-blue"><i className="fa-solid fa-truck-ramp-box" /></span>
                                    <span>
                                        <div className="ir-kpi-label">
                                            {fromDate === getTodayDate() ? "Today's arrival" : `Arrival · ${formatDisplayDate(fromDate)}`}
                                        </div>
                                        <div className="ir-kpi-value">{totalRecords}</div>
                                    </span>
                                </button>
                            </div>

                            <div className="ir-card">

                                {/* TOOLBAR */}
                                <div className="ir-toolbar">
                                    <div className="ir-toolbar-title">
                                        {activeTab === "needed" ? "Awaiting photos" : (fromDate === getTodayDate() ? "Today's arrival" : `Arrival · ${formatDisplayDate(fromDate)}`)}
                                        <small>{displayedRecords.length} shown</small>
                                    </div>

                                    <div className="ir-filters">
                                        <div className="ir-range" title="Inward date">
                                            <i className="fa-regular fa-calendar" />
                                            <input
                                                type="date"
                                                value={fromDate}
                                                max={getTodayDate()}
                                                onChange={(e) => handleSecurityDateChange(e.target.value)}
                                            />
                                            {fromDate !== getTodayDate() && (
                                                <button
                                                    type="button"
                                                    className="ir-link-today"
                                                    onClick={() => handleSecurityDateChange(getTodayDate())}
                                                >
                                                    Today
                                                </button>
                                            )}
                                        </div>

                                        <div className="ir-search">
                                            <i className="fa-solid fa-magnifying-glass" />
                                            <input
                                                type="text"
                                                placeholder="Search vehicle number"
                                                value={vehicleSearch}
                                                onChange={(e) => setVehicleSearch(e.target.value.toUpperCase())}
                                                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                                            />
                                        </div>

                                        <button type="button" className="ir-btn-soft" onClick={handleSearch} disabled={dataLoading}>
                                            Search
                                        </button>
                                        <button type="button" className="ir-btn-ghost" onClick={handleReset}>
                                            <i className="fa-solid fa-rotate-left" /> Reset
                                        </button>
                                    </div>
                                </div>

                                {/* TABLE */}
                                <div className="table-responsive">
                                    <table className="ir-table ir-stack">
                                        <thead>
                                            <tr>
                                                <th>Inward Record</th>
                                                <th>Arrival Date</th>
                                                <th>Vehicle</th>
                                                <th>Registered By</th>
                                                <th>Photos</th>
                                                <th className="text-end">Action</th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {dataLoading ? (
                                                renderSkeleton(6)
                                            ) : displayedRecords.length > 0 ? (
                                                displayedRecords.map((item) => {
                                                    const hasPhotos = !!item.ImageUrl;

                                                    return (
                                                        <tr key={item.Id}>
                                                            <td className="ir-stack-head">
                                                                <div className="ir-record">
                                                                    <span className="ir-record-icon"><i className="fa-solid fa-box" /></span>
                                                                    <span className="ir-record-no">{item.InwardRecordNo}</span>
                                                                </div>
                                                            </td>
                                                            <td data-label="Arrival date">
                                                                <div className="ir-num">{formatDisplayDate(item.ArrivalDate)}</div>
                                                            </td>
                                                            <td data-label="Vehicle">
                                                                <span className="ir-plate">{item.VehicleNumber || "-"}</span>
                                                            </td>
                                                            <td data-label="Registered by">{item.RegisteredBy || <span className="text-muted">-</span>}</td>
                                                            <td data-label="Photos">
                                                                {hasPhotos ? (
                                                                    <span className="ir-pill ir-pill-green"><span className="ir-dot" />Uploaded</span>
                                                                ) : (
                                                                    <span className="ir-pill ir-pill-amber"><span className="ir-dot" />Needed</span>
                                                                )}
                                                            </td>
                                                            <td className="ir-stack-actions">
                                                                <div className="ir-actions">
                                                                    <button type="button" className="ir-btn-upload" onClick={() => handleUploadClick(item)}>
                                                                        <CameraOutlined />
                                                                        {hasPhotos ? "Change photo" : "Upload photo"}
                                                                    </button>
                                                                    {canViewInward && (
                                                                        <button
                                                                            type="button"
                                                                            className="ir-btn-view"
                                                                            onClick={() => navigate(`/iom/inward-view/${item.Id}`)}
                                                                        >
                                                                            <i className="fa-regular fa-eye" /> View
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            ) : (
                                                renderEmpty(6, activeTab === "needed" ? "All caught up — no photos pending" : `No inward records on ${formatDisplayDate(fromDate)}`)
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {renderFooter()}
                            </div>

                            {/* UPLOAD PHOTO MODAL */}
                            {selectedInward && (
                                <div className="ir-modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) closeUploadModal(); }}>
                                    <div className="ir-modal" role="dialog" aria-modal="true">
                                        <div className="ir-modal-head">
                                            <div>
                                                <div className="ir-modal-title">Upload container photo</div>
                                                <div className="ir-modal-sub">
                                                    {selectedInward.InwardRecordNo} · {selectedInward.VehicleNumber || "-"}
                                                </div>
                                            </div>
                                            <button type="button" className="ir-modal-close" disabled={uploading} onClick={closeUploadModal} title="Close">
                                                <i className="fa-solid fa-xmark" />
                                            </button>
                                        </div>

                                        <div className="ir-modal-body">
                                            {/* gallery / files */}
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                accept="image/*"
                                                hidden
                                                onChange={handleFileChange}
                                            />
                                            {/* phone camera (fallback when live camera can't open) */}
                                            <input
                                                ref={cameraInputRef}
                                                type="file"
                                                accept="image/*"
                                                capture="environment"
                                                hidden
                                                onChange={handleFileChange}
                                            />

                                            {cameraOn ? (
                                                <CameraCapture
                                                    onCapture={(file) => { setSelectedFile(file); setCameraOn(false); }}
                                                    onCancel={() => setCameraOn(false)}
                                                    onUnavailable={handleCameraUnavailable}
                                                />
                                            ) : selectedFile ? (
                                                <div className="ir-preview-big">
                                                    {previewUrl && <img src={previewUrl} alt={selectedFile.name} />}
                                                    <div className="ir-preview-meta">
                                                        <div style={{ minWidth: 0 }}>
                                                            <div className="ir-preview-name" title={selectedFile.name}>{selectedFile.name}</div>
                                                            <div className="ir-preview-size">{selectedFile.size >= 1048576 ? `${(selectedFile.size / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(selectedFile.size / 1024))} KB`}</div>
                                                        </div>
                                                        <div className="d-flex gap-2">
                                                            <button type="button" className="ir-btn-ghost ir-btn-sm" disabled={uploading} onClick={() => setCameraOn(true)}>
                                                                <i className="fa-solid fa-camera" /> Retake
                                                            </button>
                                                            <button type="button" className="ir-btn-ghost ir-btn-sm" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
                                                                <i className="fa-regular fa-image" /> Change
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="ir-photo-options">
                                                    <button type="button" className="ir-photo-option primary" onClick={() => setCameraOn(true)}>
                                                        <span className="ir-photo-option-icon"><i className="fa-solid fa-camera" /></span>
                                                        <b>Open camera</b>
                                                        <small>Capture the container / vehicle now</small>
                                                    </button>
                                                    <button type="button" className="ir-photo-option" onClick={() => fileInputRef.current?.click()}>
                                                        <span className="ir-photo-option-icon"><i className="fa-regular fa-image" /></span>
                                                        <b>Choose photo</b>
                                                        <small>From gallery or files · up to 10 MB</small>
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        <div className="ir-modal-foot">
                                            <button type="button" className="ir-btn-ghost" disabled={uploading} onClick={closeUploadModal}>
                                                Cancel
                                            </button>
                                            <button
                                                type="button"
                                                className="ir-btn-soft"
                                                disabled={uploading || !selectedFile || cameraOn}
                                                onClick={handleUploadPhoto}
                                            >
                                                {uploading
                                                    ? <><span className="spinner-border spinner-border-sm" /> Uploading...</>
                                                    : <><i className="fa-solid fa-cloud-arrow-up" /> Submit</>}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>

                    ) : (

                        /* ==========================================
                            MANAGER - INWARD RECORDS
                        ========================================== */

                        <>
                            {/* HEADER */}
                            <div className="ir-header">
                                <div className="ir-header-left">
                                    <div className="ir-header-icon">
                                        <i className="fa-solid fa-truck-ramp-box" />
                                    </div>
                                    <div>
                                        <h2 className="ir-title">Inward Records</h2>
                                        <div className="ir-subtitle">
                                            Register goods when they arrive. Count them, then approve the verified quantities into inventory.
                                        </div>
                                    </div>
                                </div>

                                <div className="ir-header-actions">
                                    <button type="button" className="ir-btn-trace" onClick={() => setShowTrace(true)} title="Trace barcode">
                                        <i className="fa-solid fa-barcode" /> Trace Barcode
                                    </button>
                                    {canRegisterInward && (
                                        <button type="button" className="ir-btn-primary" onClick={() => setShowRegisterModal(true)}>
                                            <PlusOutlined /> Register Inward Record
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* KPI TABS */}
                            <div className="ir-kpis">
                                {managerTabs.map((tab) => {
                                    const isActive = activeTab === tab.key || (activeTab === "needed" && tab.key === "ALL");

                                    return (
                                        <button
                                            key={tab.key}
                                            type="button"
                                            className={`ir-kpi ${isActive ? "active" : ""}`}
                                            onClick={() => setActiveTab(tab.key)}
                                        >
                                            <span className={`ir-kpi-icon ${tab.tone}`}><i className={tab.icon} /></span>
                                            <span>
                                                <div className="ir-kpi-label">{tab.label}</div>
                                                <div className="ir-kpi-value">{tabCounts[tab.key] || 0}</div>
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="ir-card">

                                {/* TOOLBAR */}
                                <div className="ir-toolbar">
                                    <div className="ir-toolbar-title">
                                        {managerTabs.find(t => t.key === activeTab)?.label || "All"} records
                                        <small>{managerRecords.length} shown</small>
                                    </div>

                                    <div className="ir-filters">
                                        <div className="ir-range">
                                            <i className="fa-regular fa-calendar" />
                                            <input
                                                type="date"
                                                value={fromDate}
                                                max={toDate || undefined}
                                                onChange={(e) => setFromDate(e.target.value)}
                                                title="From date"
                                            />
                                            <span>→</span>
                                            <input
                                                type="date"
                                                value={toDate}
                                                min={fromDate || undefined}
                                                onChange={(e) => setToDate(e.target.value)}
                                                title="To date"
                                            />
                                        </div>

                                        <div className="ir-search">
                                            <i className="fa-solid fa-magnifying-glass" />
                                            <input
                                                type="text"
                                                placeholder="Search vehicle no."
                                                value={vehicleSearch}
                                                onChange={(e) => setVehicleSearch(e.target.value.toUpperCase())}
                                                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                                            />
                                        </div>

                                        <button type="button" className="ir-btn-soft" onClick={handleSearch} disabled={dataLoading}>
                                            Search
                                        </button>
                                        <button type="button" className="ir-btn-ghost" onClick={handleReset}>
                                            <i className="fa-solid fa-rotate-left" /> Reset
                                        </button>
                                    </div>
                                </div>

                                {/* TABLE */}
                                <div className="table-responsive">
                                    <table className="ir-table ir-stack">
                                        <thead>
                                            <tr>
                                                <th>Inward Record</th>
                                                <th>Arrival Date</th>
                                                <th>Vehicle</th>
                                                <th className="text-center">Items</th>
                                                <th className="text-center">Verified Qty</th>
                                                <th>Container Photos</th>
                                                <th>Status</th>
                                                <th className="text-end">Actions</th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {dataLoading ? (
                                                renderSkeleton(8)
                                            ) : managerRecords.length > 0 ? (
                                                managerRecords.map((item) => {
                                                    const meta = getStatusMeta(item.Status);

                                                    return (
                                                        <tr key={item.Id}>
                                                            <td className="ir-stack-head">
                                                                <div className="ir-record">
                                                                    <span className="ir-record-icon"><i className="fa-solid fa-box" /></span>
                                                                    <div>
                                                                        <div className="ir-record-no">{item.InwardRecordNo}</div>
                                                                        {item.RegisteredBy && (
                                                                            <div className="ir-sub">by {item.RegisteredBy}</div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td data-label="Arrival date">
                                                                <div className="ir-num">{formatDisplayDate(item.ArrivalDate)}</div>
                                                            </td>
                                                            <td data-label="Vehicle">
                                                                <span className="ir-plate">{item.VehicleNumber || "-"}</span>
                                                            </td>
                                                            <td data-label="Items" className="text-center ir-num">{item.TotalItems ?? 0}</td>
                                                            <td data-label="Verified Qty" className="text-center ir-num">{item.TotalVerifiedQuantity ?? item.TotalDeclaredQuantity ?? 0}</td>
                                                            <td data-label="Container photos">
                                                                {item.ImageUrl ? (
                                                                    <span className="ir-pill ir-pill-green"><span className="ir-dot" />Uploaded</span>
                                                                ) : (
                                                                    <span className="ir-pill ir-pill-amber"><span className="ir-dot" />Awaiting security</span>
                                                                )}
                                                            </td>
                                                            <td data-label="Status">
                                                                <span className={`ir-pill ${meta.cls}`}>
                                                                    <span className="ir-dot" />{meta.label}
                                                                </span>
                                                            </td>
                                                            <td className="ir-stack-actions">
                                                                <div className="ir-actions">
                                                                    {isEditable(item) && (
                                                                        <button
                                                                            type="button"
                                                                            className="ir-btn-view"
                                                                            onClick={() => setEditRecord(item)}
                                                                        >
                                                                            <i className="fa-regular fa-pen-to-square" /> Edit
                                                                        </button>
                                                                    )}
                                                                    {canViewInward && (
                                                                        <button
                                                                            type="button"
                                                                            className="ir-btn-view"
                                                                            onClick={() => navigate(`/iom/inward-view/${item.Id}`)}
                                                                        >
                                                                            <i className="fa-regular fa-eye" /> View
                                                                        </button>
                                                                    )}
                                                                    {!canViewInward && !isEditable(item) && (
                                                                        <span className="text-muted">-</span>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            ) : (
                                                renderEmpty(8, "No inward records for the selected dates")
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {renderFooter()}
                            </div>
                        </>
                    )}



                </div>
            </div>

            <RegisterInwardModel
                show={showRegisterModal && canRegisterInward}
                onClose={() => setShowRegisterModal(false)}
                userId={sessionUserData?.Id}
                onSuccess={async () => {
                    setCurrentPage(1);
                    await fetchInwards(1, true);
                }}
            />

            <EditInwardModel
                show={!!editRecord && canEditInward}
                record={editRecord}
                orgId={sessionUserData?.OrgId}
                userId={sessionUserData?.Id}
                onClose={() => setEditRecord(null)}
                onSuccess={async () => {
                    setInwardsCache({});
                    await fetchInwards(currentPage, true);
                }}
            />

            {/* TRACE BARCODE (all users) */}
            <BarcodeTraceModal
                show={showTrace}
                orgId={sessionUserData?.OrgId}
                onClose={() => setShowTrace(false)}
                onOpenInward={(inwardId) => { setShowTrace(false); navigate(`/iom/inward-view/${inwardId}`); }}
                onOpenOutward={(o) => { setShowTrace(false); openTracedOutward(o); }}
            />

        </Base1>
    );
}