import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../Config/Loader.css';
import Base1 from '../../Config/Base1';
import { fetchWithAuth } from "../../../utils/api";
import Swal from 'sweetalert2';
import { useLocation } from "react-router-dom";
import { Dropdown, Menu, Tooltip, Select } from 'antd';
import { getCyclePendingActions, getIsPublishbtnEnable, SaveAssessments } from '../services/kpiServices';
import ViewEmpReview from './ViewEmpReviewDetails';

export default function KPIHRPublish() {

    const navigate = useNavigate();
    const location = useLocation();
    const [sessionUserData, setsessionUserData] = useState({});
    const [sessionActionIds, setSessionActionIds] = useState([]);
    const [loading, setLoading] = useState(false);
    const [cyclePendingData, setCyclePendingData] = useState([]);
    const [modules, setModules] = useState([]);
    const [menuData, setMenuData] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [publishLoading, setPublishLoading] = useState(false);
    const [publishStatus, setPublishStatus] = useState({
        PendingCount: 0,
        TotalCount: 0,
        ManagerFeedbackCount: 0,
        HRReviewRequiredCount: 0,
        HRReviewedCount: 0,
        PublishedCount: 0,
        IsPublishEnabled: 0,
    });

    const [reviewEmp, setReviewEmp] = useState({});


    const [selectedStatus, setSelectedStatus] = useState("ALL");

    const statusOptions = [
        { value: "ALL", label: "All" },
        { value: "PENDING", label: "Pending" },
        { value: "FEEDBACK_SUBMITTED", label: "Feedback Submitted" },
        { value: "FEEDBACK_REVIEWED", label: "Feedback Reviewed" },
        { value: "HR_REVIEWED", label: "HR Reviewed" },
        { value: "PUBLISHED", label: "Published" },
    ];

    useEffect(() => {
        const userDataString = sessionStorage.getItem("userData");
        if (userDataString) {
            const userData = JSON.parse(userDataString);
            setsessionUserData(userData);
        } else {
            navigate("/");
        }
    }, [navigate]);

    useEffect(() => {
        const sessionMenuData = sessionStorage.getItem("menuData");
        try {
            const parsedMenu = JSON.parse(sessionMenuData);
            setMenuData(parsedMenu)
            // Find Dashboard and Visitors menus
            const dashboardMenu = parsedMenu.find(
                (item) => item.MenuName === "Dashboard"
            );

            let actionIds = [];
            if (dashboardMenu?.ActionsIds) {
                actionIds = actionIds.concat(
                    dashboardMenu.ActionsIds.split(",").map(Number)
                );
            }

            if (actionIds.length > 0) {
                // Remove duplicates just in case
                const uniqueActionIds = [...new Set(actionIds)];
                setSessionActionIds(uniqueActionIds);
            }
        } catch (err) {
            console.error("Error parsing menuData:", err);
        }
    }, []);

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
        if (sessionUserData?.OrgId) {
            fetchMenuData();
        }
    }, [sessionUserData]);

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

    const fetchDDLData = async () => {
        try {
            const sessionDDL = sessionStorage.getItem("ddlKPIReviewCyclesData");

            if (sessionDDL) {
                const parsed = JSON.parse(sessionDDL);

                setEmployees(parsed.users || []);
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

            const usersFilteredData = data.ResultData.filter(
                (item) => item.DDLName === "Users"
            );

            setEmployees(usersFilteredData || []);

            sessionStorage.setItem(
                "ddlKPIReviewCyclesData",
                JSON.stringify({
                    users: usersFilteredData,
                })
            );

        } catch (error) {
            console.error("Failed to fetch DDL data:", error);
            setEmployees([]);
        }
    };

    const fetchIsPublishbtnEnable = async () => {
        try {
            const response = await getIsPublishbtnEnable({
                orgId: sessionUserData?.OrgId,
            });

            const data = response?.data?.[0];

            setPublishStatus({
                PendingCount: data?.PendingCount ?? 0,
                TotalCount: data?.TotalCount ?? 0,
                ManagerFeedbackCount: data?.ManagerFeedbackCount ?? 0,
                HRReviewRequiredCount: data?.HRReviewRequiredCount ?? 0,
                HRReviewedCount: data?.HRReviewedCount ?? 0,
                PublishedCount: data?.PublishedCount ?? 0,
                IsPublishEnabled: data?.IsPublishEnabled ?? 0,
            });

        } catch (error) {
            console.error(error);
        }
    };

    const fetchCycleData = async () => {
        try {
            setLoading(true);

            const response = await getCyclePendingActions({
                orgId: sessionUserData?.OrgId,
                status: selectedStatus || "ALL",
            });

            setCyclePendingData(response?.data || []);

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };


    useEffect(() => {
        if (sessionUserData?.OrgId) {
            fetchDDLData();
        }
    }, [sessionUserData?.OrgId]);

    useEffect(() => {
        if (sessionUserData?.OrgId) {
            fetchIsPublishbtnEnable();
        }
    }, [sessionUserData?.OrgId]);

    useEffect(() => {
        if (sessionUserData?.PeriodId && selectedStatus) {
            fetchCycleData();
        }
    }, [sessionUserData?.PeriodId, selectedStatus]);

    const handleViewReview = async (item) => {
        setReviewEmp(item)
    };

    const handlePublishConfirmation = async () => {
        const result = await Swal.fire({
            title: "Publish Review Cycles?",
            text: "Are you sure you want to publish the review cycles for this performance period?",
            icon: "warning",
            showCancelButton: true,

            confirmButtonText:
                '<i class="bi bi-check-circle-fill me-1 text-white"></i> Yes, Publish',

            cancelButtonText:
                '<i class="bi bi-x-circle-fill me-1 text-white"></i> No',

            confirmButtonColor: "#2563eb",
            cancelButtonColor: "#6b7280",

            reverseButtons: true,
            allowOutsideClick: false,

            buttonsStyling: true,
        });

        if (result.isConfirmed) {
            handleSavePublish();
        }
    };

    const handleSavePublish = async () => {
        const payload = {
            OrgId: sessionUserData.OrgId,
            UserId: sessionUserData.Id,
            Action: "PUBLISHED",
            JsonData: {
                PeriodId: sessionUserData?.PeriodId,
            },
        };

        try {
            setPublishLoading(true);

            const response = await SaveAssessments(payload);

            if (
                response?.success &&
                response?.data?.result?.[0]?.ResponseCode === 200
            ) {
                const successMessage =
                    response.data.result[0].Message ||
                    "Review cycles published successfully.";

                await Swal.fire({
                    icon: "success",
                    title: "Published Successfully",
                    text: successMessage,
                    confirmButtonText: "OK",
                    confirmButtonColor: "#2563eb",
                });

                fetchCycleData();
            } else {
                const errorMessage =
                    response?.data?.result?.[0]?.Message ||
                    "Failed to publish review cycles.";

                Swal.fire({
                    icon: "error",
                    title: "Publish Failed",
                    text: errorMessage,
                    confirmButtonText: "OK",
                    confirmButtonColor: "#dc2626",
                });
            }
        } catch (error) {
            console.error(error);

            Swal.fire({
                icon: "error",
                title: "Something Went Wrong",
                text: "Unable to publish the review cycles. Please try again.",
                confirmButtonText: "OK",
                confirmButtonColor: "#dc2626",
            });
        } finally {
            setPublishLoading(false);
        }
    };

    const iconColors = ['#FF6B35', '#00B8D9', '#36B37E', '#FFAB00', '#6554C0', '#FF5630'];

    return (
        <Base1>
            <div className="d-flex flex-column flex-column-fluid mb-12">
                <div id="kt_app_toolbar" className="app-toolbar py-3 py-lg-6">
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

                        <div className="page-title d-md-none d-block mb-3 mb-md-0">
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

                        <div className="d-flex align-items-center py-3 mb-2 d-none d-md-block">
                            <div className="welcome-animation">
                                <h2 className="mb-0">
                                    <span className="text-dark fw-light">Welcome, </span>
                                    <span className="animated-gradient-text">
                                        {sessionUserData?.Name || "Guest"}
                                    </span>
                                    <span className="ms-2">👋</span>
                                </h2>
                                <div
                                    className="mt-1"
                                    style={{
                                        height: '3px',
                                        width: '60px',
                                        background: '#0d6efd',
                                        borderRadius: '10px',
                                        opacity: '0.6'
                                    }}
                                ></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div id="kt_app_content" className="app-content flex-column-fluid" style={{ marginTop: "-30px" }}>
                    <div id="kt_app_content_container" className="app-container container-xxl">
                        <div className="card border-0 shadow-sm mb-5">
                            <div className="card-body py-3 px-4">
                                <div className="d-flex justify-content-between align-items-center gap-3 flex-wrap">
                                    <div className="d-flex align-items-center">
                                        <div
                                            className="d-flex align-items-center justify-content-center rounded-3 bg-light-primary text-primary me-3"
                                            style={{
                                                width: "46px",
                                                height: "46px",
                                            }}
                                        >
                                            <i className="bi bi-send-check-fill fs-4 text-primary"></i>
                                        </div>

                                        <div>
                                            <h4 className="mb-1 fw-bold text-dark">
                                                HR Publish
                                            </h4>
                                            <div className="text-muted fs-7">
                                                Manage and publish employee review cycles
                                            </div>
                                        </div>
                                    </div>

                                    <div className="d-flex justify-content-end align-items-center gap-3 flex-wrap">
                                        <Tooltip
                                            placement="bottom"
                                            overlayInnerStyle={{
                                                padding: 0,
                                                borderRadius: "10px",
                                                width: "290px",
                                            }}
                                            title={
                                                <div className="review-status-tooltip">
                                                    <div className="d-flex align-items-center px-3 py-2 border-bottom border-secondary">
                                                        <i className="bi bi-info-circle-fill text-primary me-2"></i>

                                                        <span className="fw-semibold text-white">
                                                            Review Cycle Status
                                                        </span>
                                                    </div>

                                                    <div className="px-3 py-2">
                                                        <div className="d-flex justify-content-between align-items-center py-2">
                                                            <span className="text-white-50">
                                                                Pending
                                                            </span>
                                                            <span className="badge bg-warning text-dark rounded-pill px-2">
                                                                {publishStatus.PendingCount}
                                                            </span>
                                                        </div>

                                                        <div className="d-flex justify-content-between align-items-center py-2">
                                                            <span className="text-white-50">
                                                                Manager Feedback
                                                            </span>
                                                            <span className="badge bg-info text-dark rounded-pill px-2">
                                                                {publishStatus.ManagerFeedbackCount}
                                                            </span>
                                                        </div>

                                                        <div className="d-flex justify-content-between align-items-center py-2">
                                                            <span className="text-white-50">
                                                                HR Review Required
                                                            </span>
                                                            <span className="badge bg-danger rounded-pill px-2">
                                                                {publishStatus.HRReviewRequiredCount}
                                                            </span>
                                                        </div>

                                                        <div className="d-flex justify-content-between align-items-center py-2">
                                                            <span className="text-white-50">
                                                                HR Reviewed
                                                            </span>
                                                            <span className="badge bg-success rounded-pill px-2">
                                                                {publishStatus.HRReviewedCount}
                                                            </span>
                                                        </div>

                                                        <div className="d-flex justify-content-between align-items-center py-2">
                                                            <span className="text-white-50">
                                                                Published
                                                            </span>
                                                            <span className="badge bg-primary rounded-pill px-2">
                                                                {publishStatus.PublishedCount}
                                                            </span>
                                                        </div>
                                                        <div className="d-flex justify-content-between align-items-center py-2">
                                                            <span className="text-white-50">
                                                                Total
                                                            </span>
                                                            <span className="badge bg-info rounded-pill px-2">
                                                                {publishStatus.TotalCount}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div
                                                        className={`px-3 py-3 border-top border-secondary d-flex align-items-start ${publishStatus.IsPublishEnabled === 1
                                                            ? "text-success"
                                                            : "text-danger"
                                                            }`}
                                                    >
                                                        <i
                                                            className={`bi ${publishStatus.IsPublishEnabled === 1
                                                                ? "bi-check-circle-fill text-success"
                                                                : "bi-lock-fill text-danger"
                                                                } me-2 mt-1`}
                                                        ></i>
                                                        <span className="text-white">
                                                            {publishStatus.IsPublishEnabled === 1
                                                                ? "Publishing is available for this period."
                                                                : "Publishing is currently unavailable for this period."}
                                                        </span>
                                                    </div>
                                                </div>
                                            }
                                        >
                                            <span>
                                                <button
                                                    type="button"
                                                    className="btn btn-primary d-flex align-items-center px-4 btn-sm"
                                                    disabled={publishStatus.IsPublishEnabled !== 1 || publishLoading}
                                                    onClick={handlePublishConfirmation}
                                                >
                                                    {publishLoading ? (
                                                        <>
                                                            <span className="spinner-border spinner-border-sm me-2"></span>
                                                            Publishing...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <i className="bi bi-calendar-plus-fill me-2"></i>
                                                            Publish Cycles
                                                        </>
                                                    )}
                                                </button>
                                            </span>
                                        </Tooltip>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
                            <div
                                className="card-header border-0 py-3 d-flex justify-content-between align-items-center w-100"
                                style={{
                                    background: "linear-gradient(90deg,#2563eb,#4f46e5)",
                                    color: "#fff",
                                }}
                            >
                                <div>
                                    <h5 className="mb-1 fw-bold text-white">
                                        <i className="bi bi-send-check-fill me-2 text-white"></i>
                                        HR Publish
                                    </h5>
                                    <small className="opacity-75">
                                        Review employee performance cycles and publish completed reviews
                                    </small>
                                </div>

                                <div className="d-flex flex-column align-items-start gap-1 mb-2">
                                    <span className="text-white opacity-75 small fw-semibold">
                                        Status
                                    </span>

                                    <Select
                                        value={selectedStatus}
                                        onChange={(value) => setSelectedStatus(value)}
                                        options={statusOptions}
                                        size="small"
                                        style={{
                                            width: 200,
                                        }}
                                        className="hr-publish-status-select"
                                    />
                                </div>
                            </div>

                            {/* ================= STATUS SUMMARY ================= */}
                            <div className="px-3 py-3 border-bottom bg-white">

                                <div className="row g-2">
                                    <div className="col">
                                        <div className="status-summary-card">
                                            <div className="status-summary-icon bg-warning-subtle text-warning">
                                                <i className="bi bi-clock-fill text-warning"></i>
                                            </div>

                                            <div>
                                                <div className="status-summary-label">
                                                    Pending
                                                </div>

                                                <div className="status-summary-value">
                                                    {publishStatus.PendingCount ?? 0}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="col">
                                        <div className="status-summary-card">
                                            <div className="status-summary-icon bg-info-subtle text-info">
                                                <i className="bi bi-chat-square-text-fill text-info"></i>
                                            </div>

                                            <div>
                                                <div className="status-summary-label">
                                                    Feedback Submitted
                                                </div>

                                                <div className="status-summary-value">
                                                    {publishStatus.ManagerFeedbackCount ?? 0}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="col">
                                        <div className="status-summary-card">
                                            <div className="status-summary-icon bg-primary-subtle text-primary">
                                                <i className="fa-solid fa-comments text-primary"></i>
                                            </div>

                                            <div>
                                                <div className="status-summary-label">
                                                    Feedback Reviewed
                                                </div>

                                                <div className="status-summary-value">
                                                    {publishStatus.HRReviewRequiredCount ?? 0}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="col">
                                        <div className="status-summary-card">
                                            <div className="status-summary-icon bg-success-subtle text-success">
                                                <i className="bi bi-person-check-fill text-success"></i>
                                            </div>

                                            <div>
                                                <div className="status-summary-label">
                                                    HR Reviewed
                                                </div>

                                                <div className="status-summary-value">
                                                    {publishStatus.HRReviewedCount ?? 0}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* <div className="col">
                                        <div className="status-summary-card">
                                            <div className="status-summary-icon bg-primary-subtle text-primary">
                                                <i className="bi bi-send-check-fill text-primary"></i>
                                            </div>

                                            <div>
                                                <div className="status-summary-label">
                                                    Published
                                                </div>

                                                <div className="status-summary-value">
                                                    {publishStatus.PublishedCount ?? 0}
                                                </div>
                                            </div>
                                        </div>
                                    </div> */}

                                    <div className="col">
                                        <div className="status-summary-card">
                                            <div className="status-summary-icon bg-danger-subtle text-secondary">
                                                <i className="bi bi-collection-fill text-danger"></i>
                                            </div>

                                            <div>
                                                <div className="status-summary-label">
                                                    Total
                                                </div>

                                                <div className="status-summary-value">
                                                    {publishStatus.TotalCount ?? 0}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="table-responsive d-none d-md-block"
                                style={{
                                    maxHeight: "500px",
                                    overflowY: "auto",
                                    overflowX: "auto",
                                }}
                            >
                                <table className="table align-middle table-hover gs-7 gy-5 mb-0 fs-6">
                                    <thead
                                        className="bg-light-primary"
                                        style={{
                                            position: "sticky",
                                            top: 0,
                                            zIndex: 5,
                                        }}
                                    >
                                        <tr className="text-start text-muted fw-bold fs-7 text-uppercase gs-0 border-bottom-2 border-primary">
                                            <th width="60">#</th>
                                            <th>Employee</th>
                                            <th>Cycle</th>
                                            <th className="text-center">Cycle Score</th>
                                            <th className="text-center">Employee Status</th>
                                            <th>Manager</th>
                                            <th>Priority</th>
                                            <th className="text-center">Action</th>
                                        </tr>
                                    </thead>

                                    <tbody className="fw-semibold text-gray-700">
                                        {loading ? (
                                            <tr>
                                                <td
                                                    colSpan="11"
                                                    className="py-5"
                                                >
                                                    <div
                                                        className="d-flex flex-column justify-content-center align-items-center w-100"
                                                        style={{
                                                            minHeight: "320px"
                                                        }}
                                                    >
                                                        <div className="review-loader mb-3">
                                                            <div
                                                                className="spinner-border text-primary"
                                                                role="status"
                                                            >
                                                                <span className="visually-hidden">
                                                                    Loading...
                                                                </span>
                                                            </div>
                                                        </div>

                                                        <h5 className="fw-bold text-primary mb-2">
                                                            Loading Review Cycle Scores...
                                                        </h5>

                                                        <p className="text-muted mb-0">
                                                            Please wait while we fetch the data.
                                                        </p>
                                                    </div>
                                                </td>
                                            </tr>

                                        ) : cyclePendingData?.length === 0 ? (
                                            <tr>
                                                <td
                                                    colSpan="11"
                                                    className="py-5"
                                                >
                                                    <div
                                                        className="d-flex flex-column justify-content-center align-items-center w-100"
                                                        style={{
                                                            minHeight: "320px"
                                                        }}
                                                    >
                                                        <div className="empty-state-icon mb-3">
                                                            <i className="bi bi-people"></i>
                                                        </div>

                                                        <h5 className="fw-bold mb-2">
                                                            No Employee Review Data Found
                                                        </h5>

                                                        <p className="text-muted mb-0">
                                                            No employee review cycle data is available.
                                                        </p>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            cyclePendingData.map((item, index) => {

                                                const employeeStatusClass = {
                                                    PENDING: "status-pending",
                                                    FEEDBACK_SUBMITTED: "status-submitted",
                                                    FEEDBACK_REVIEWED: "status-reviewed",
                                                    HR_REVIEWED: "status-hr-reviewed",
                                                    PUBLISHED: "status-published",
                                                }[
                                                    item.UserStatus?.trim().toUpperCase()
                                                ] || "status-pending";

                                                const score =
                                                    item.CycleScore !== null &&
                                                        item.CycleScore !== undefined
                                                        ? Number(item.CycleScore).toFixed(1)
                                                        : "-";

                                                return (

                                                    <tr key={item.CycleScoreId}>
                                                        <td>{index + 1}</td>
                                                        <td>
                                                            <div className="d-flex align-items-center gap-2">
                                                                <div
                                                                    className="d-flex align-items-center justify-content-center rounded-circle bg-light-primary text-primary fw-bold"
                                                                    style={{
                                                                        width: "38px",
                                                                        height: "38px",
                                                                        minWidth: "38px",
                                                                    }}
                                                                >
                                                                    {item.UserName
                                                                        ?.charAt(0)
                                                                        ?.toUpperCase() || "U"}
                                                                </div>

                                                                <div>
                                                                    <div className="fw-bold text-gray-800">
                                                                        {item.UserName || "-"}
                                                                    </div>

                                                                    <div className="text-muted small">
                                                                        Emp No: {item.UserNo || '-'}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <span
                                                                className="badge rounded-pill px-3 py-2"
                                                                style={{
                                                                    background: "#eef2ff",
                                                                    color: "#4f46e5",
                                                                }}
                                                            >
                                                                {item.CycleName || "-"}
                                                            </span>
                                                        </td>

                                                        <td className="text-center">
                                                            {item.CycleScore !== null &&
                                                                item.CycleScore !== undefined ? (
                                                                <span
                                                                    className="badge rounded-pill px-3 py-2"
                                                                    style={{
                                                                        background:
                                                                            "#ecfdf5",
                                                                        color:
                                                                            "#047857",
                                                                        fontSize:
                                                                            "13px",
                                                                    }}
                                                                >
                                                                    {score}%
                                                                </span>
                                                            ) : (
                                                                <span className="text-muted">
                                                                    -
                                                                </span>
                                                            )}
                                                        </td>

                                                        <td className="text-center">
                                                            <span className={`status-pill ${employeeStatusClass}`}>
                                                                <span className="status-dot"></span>
                                                                {item.UserStatus
                                                                    ?.trim()
                                                                    .replaceAll("_", " ") || "-"}
                                                            </span>
                                                        </td>

                                                        <td>
                                                            <div className="d-flex align-items-center gap-2">
                                                                <div
                                                                    className="d-flex align-items-center justify-content-center rounded-circle bg-light-warning text-warning fw-bold"
                                                                    style={{
                                                                        width: "34px",
                                                                        height: "34px",
                                                                        minWidth: "34px",
                                                                    }}
                                                                >
                                                                    <i className="bi bi-person-badge"></i>
                                                                </div>

                                                                <div>
                                                                    <div className="fw-semibold">
                                                                        {item.ManagerName || "---"}
                                                                    </div>
                                                                    <div className="text-muted small">
                                                                        Emp No: {item.ManagerNo ?? "-"}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td>
                                                            {item.IsPriority ? (
                                                                <span className="badge badge-light-success px-3 py-2">
                                                                    ⭐ Priority
                                                                </span>
                                                            ) : (
                                                                <span className="badge badge-light-danger px-3 py-2">
                                                                    Normal
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="text-center">
                                                            <div className="d-flex justify-content-center align-items-center gap-2">
                                                                <Tooltip title="View Review">
                                                                    <button
                                                                        type="button"
                                                                        className="action-btn action-btn-edit text-hover-white"
                                                                        data-bs-toggle="offcanvas"
                                                                        data-bs-target="#offcanvasRightViewReview"
                                                                        onClick={() => handleViewReview(item)}
                                                                        disabled={item.UserStatus !== "FEEDBACK REVIEWED" || item.UserStatus !== "HR_REVIEWED"}
                                                                    >
                                                                        <i className="bi bi-eye text-primary"></i>
                                                                    </button>
                                                                </Tooltip>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* ================= MOBILE CARDS ================= */}
                            <div className="d-block d-md-none">
                                {loading ? (
                                    <div className="text-center py-5">
                                        <div className="spinner-border text-primary mb-3"></div>

                                        <h6 className="fw-bold text-primary mb-1">
                                            Loading Review Cycle Scores...
                                        </h6>

                                        <small className="text-muted">
                                            Please wait while we fetch the data.
                                        </small>
                                    </div>
                                ) : cyclePendingData?.length === 0 ? (
                                    <div className="text-center py-5">
                                        <div className="empty-state-icon mb-3">
                                            <i className="bi bi-people"></i>
                                        </div>

                                        <h6 className="fw-bold mb-2">
                                            No Employee Review Data Found
                                        </h6>

                                        <small className="text-muted">
                                            No employee review cycle data is available.
                                        </small>
                                    </div>
                                ) : (
                                    <div className="employee-review-mobile-list">
                                        {cyclePendingData.map((item, index) => {
                                            const employeeStatusClass = {
                                                PENDING: "status-pending",
                                                FEEDBACK_SUBMITTED: "status-submitted",
                                                FEEDBACK_REVIEWED: "status-reviewed",
                                                HR_REVIEWED: "status-hr-reviewed",
                                                PUBLISHED: "status-published",
                                            }[
                                                item.UserStatus?.trim().toUpperCase()
                                            ] || "status-pending";

                                            const score =
                                                item.CycleScore !== null &&
                                                    item.CycleScore !== undefined
                                                    ? Number(item.CycleScore).toFixed(1)
                                                    : "-";

                                            return (
                                                <div
                                                    className="employee-review-mobile-card"
                                                    key={item.CycleScoreId}
                                                >
                                                    {/* HEADER */}
                                                    <div className="d-flex justify-content-between align-items-start mb-3">

                                                        <div className="d-flex align-items-center gap-2">

                                                            <div className="employee-mobile-avatar">
                                                                {item.UserName
                                                                    ?.charAt(0)
                                                                    ?.toUpperCase() || "U"}
                                                            </div>

                                                            <div>
                                                                <div className="fw-bold text-gray-800">
                                                                    {item.UserName || "-"}
                                                                </div>

                                                                <div className="text-muted small">
                                                                    Emp No: {item.UserNo || "-"}
                                                                </div>
                                                            </div>

                                                        </div>

                                                        <span
                                                            className={`status-pill ${employeeStatusClass}`}
                                                        >
                                                            <span className="status-dot"></span>

                                                            {item.UserStatus
                                                                ?.trim()
                                                                .replaceAll("_", " ") || "-"}
                                                        </span>

                                                    </div>


                                                    {/* CYCLE + SCORE */}
                                                    <div className="row g-2 mb-3">

                                                        <div className="col-7">
                                                            <div className="mobile-review-info">
                                                                <small>
                                                                    <i className="bi bi-calendar2-week me-1"></i>
                                                                    Review Cycle
                                                                </small>

                                                                <span
                                                                    className="badge rounded-pill px-3 py-2"
                                                                    style={{
                                                                        background: "#eef2ff",
                                                                        color: "#4f46e5",
                                                                    }}
                                                                >
                                                                    {item.CycleName || "-"}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        <div className="col-5">
                                                            <div className="mobile-review-info">
                                                                <small>
                                                                    <i className="bi bi-graph-up-arrow me-1"></i>
                                                                    Cycle Score
                                                                </small>

                                                                {item.CycleScore !== null &&
                                                                    item.CycleScore !== undefined ? (
                                                                    <span className="mobile-score-badge">
                                                                        {score}%
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-muted fw-semibold">
                                                                        -
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                    </div>


                                                    {/* MANAGER */}
                                                    <div className="mobile-review-section">
                                                        <div className="mobile-review-section-title">
                                                            Manager
                                                        </div>

                                                        <div className="d-flex align-items-center gap-2">

                                                            <div className="manager-mobile-avatar">
                                                                <i className="bi bi-person-badge"></i>
                                                            </div>

                                                            <div>
                                                                <div className="fw-semibold text-gray-800">
                                                                    {item.ManagerName || "---"}
                                                                </div>

                                                                <div className="text-muted small">
                                                                    No: {item.ManagerNo ?? "-"}
                                                                </div>
                                                            </div>

                                                        </div>
                                                    </div>


                                                    {/* ACTION */}
                                                    <div className="mobile-review-action">

                                                        <button
                                                            type="button"
                                                            className="btn btn-light-primary btn-sm w-100 fw-semibold"
                                                            data-bs-toggle="offcanvas"
                                                            data-bs-target="#offcanvasRightViewReview"
                                                            onClick={() =>
                                                                handleViewReview(item)
                                                            }
                                                        >
                                                            <i className="bi bi-eye me-2"></i>
                                                            View Review
                                                        </button>

                                                    </div>

                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>


            <style>
                {`
                .employee-review-mobile-card {
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 14px;
    padding: 15px;
    margin-bottom: 12px;
    box-shadow: 0 2px 8px rgba(15, 23, 42, 0.05);
}

.employee-review-mobile-card:last-child {
    margin-bottom: 0;
}

.employee-mobile-avatar {
    width: 42px;
    height: 42px;
    min-width: 42px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #eef2ff;
    color: #4f46e5;
    font-size: 16px;
    font-weight: 700;
}

.mobile-review-info {
    min-height: 62px;
    padding: 9px 10px;
    border: 1px solid #eef2f7;
    background: #f8fafc;
    border-radius: 9px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 5px;
}

.mobile-review-info small {
    color: #94a3b8;
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
}

.mobile-review-info small i {
    color: #64748b;
}

.mobile-score-badge {
    display: inline-flex;
    align-items: center;
    width: fit-content;
    padding: 5px 10px;
    border-radius: 20px;
    background: #ecfdf5;
    color: #047857;
    font-size: 13px;
    font-weight: 700;
}

.mobile-review-section {
    padding: 11px 0;
    border-top: 1px solid #eef2f7;
}

.mobile-review-section-title {
    font-size: 10px;
    color: #94a3b8;
    font-weight: 700;
    text-transform: uppercase;
    margin-bottom: 7px;
}

.manager-mobile-avatar {
    width: 32px;
    height: 32px;
    min-width: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #fff7ed;
    color: #f59e0b;
    font-size: 14px;
}

.mobile-review-action {
    border-top: 1px solid #eef2f7;
    padding-top: 12px;
    margin-top: 2px;
}

.mobile-review-action .btn {
    min-height: 36px;
}
                    .status-summary-card {
                        display: flex;
                        align-items: center;
                        gap: 10px;
                        padding: 10px 12px;
                        min-height: 62px;
                        background: #fff;
                        border: 1px solid #e9edf5;
                        border-radius: 10px;
                        transition: all 0.2s ease;
                    }

                    .status-summary-card:hover {
                        transform: translateY(-1px);
                        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
                    }

                    .status-summary-icon {
                        width: 34px;
                        height: 34px;
                        min-width: 34px;
                        border-radius: 8px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 14px;
                    }

                    .status-summary-label {
                        color: #7e8299;
                        font-size: 11px;
                        font-weight: 600;
                        white-space: nowrap;
                    }

                    .status-summary-value {
                        color: #181c32;
                        font-size: 18px;
                        line-height: 1.2;
                        font-weight: 700;
                    }
                    .status-pill {
                        display: inline-flex;
                        align-items: center;
                        gap: 6px;
                        padding: 5px 10px;
                        border-radius: 20px;
                        font-size: 12px;
                        font-weight: 600;
                        white-space: nowrap;
                    }

                    .status-dot {
                        width: 7px;
                        height: 7px;
                        border-radius: 50%;
                        display: inline-block;
                    }

                    /* Pending */
                    .status-pending {
                        background: #fff7ed;
                        color: #c2410c;
                    }

                    .status-pending .status-dot {
                        background: #f97316;
                    }

                    /* Feedback Submitted */
                    .status-submitted {
                        background: #eff6ff;
                        color: #2563eb;
                    }

                    .status-submitted .status-dot {
                        background: #3b82f6;
                    }

                    /* Feedback Reviewed */
                    .status-reviewed {
                        background: #f5f3ff;
                        color: #7c3aed;
                    }

                    .status-reviewed .status-dot {
                        background: #8b5cf6;
                    }

                    /* HR Reviewed */
                    .status-hr-reviewed {
                        background: #ecfdf5;
                        color: #059669;
                    }

                    .status-hr-reviewed .status-dot {
                        background: #10b981;
                    }

                    /* Published */
                    .status-published {
                        background: #ecfdf5;
                        color: #047857;
                    }

                    .status-published .status-dot {
                        background: #059669;
                    }
                                    .hr-publish-status-select .ant-select-selector {
                        border: none !important;
                        border-radius: 8px !important;
                        min-height: 34px !important;
                        height: 34px !important;
                        padding: 0 12px !important;
                        box-shadow: none !important;
                    }

                    .hr-publish-status-select .ant-select-selection-item {
                        font-weight: 500;
                        color: #1f2937;
                    }

                    .hr-publish-status-select:hover .ant-select-selector,
                    .hr-publish-status-select.ant-select-focused .ant-select-selector {
                        box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.2) !important;
                    }
                    .review-status-tooltip {
                        width: 290px;
                        font-size: 13px;
                    }

                    .review-status-tooltip .badge {
                        min-width: 26px;
                        text-align: center;
                        font-size: 11px;
                        font-weight: 600;
                    }

                    .review-status-tooltip .border-secondary {
                        border-color: rgba(255, 255, 255, 0.12) !important;
                    }
                .action-btn{
                        width:40px;
                        height:40px;
                        border:none;
                        border-radius:12px;
                        display:flex;
                        align-items:center;
                        justify-content:center;
                        font-size:17px;
                        transition:all .25s ease;
                        cursor:pointer;
                    }

                    .action-btn i{
                        transition:.25s;
                    }

                    .action-btn:hover:not(:disabled){
                        transform:translateY(-2px);
                        box-shadow:0 8px 18px rgba(0,0,0,.12);
                    }

                    .action-btn:disabled{
                        opacity:.45;
                        cursor:not-allowed;
                        box-shadow:none;
                    }

                    .action-btn-edit{
                        background:#eef4ff;
                        color:#2563eb;
                    }

                    .action-btn-edit:hover:not(:disabled){
                        background:#2563eb;
                        color:#fff;
                    }

                    .action-btn-release {
                        background: #e7f8fc;
                        color: #0dcaf0;
                    }

                    .action-btn-release:hover:not(:disabled) {
                        background: #0dcaf0;
                        color: #fff;
                    }
                `}
            </style>

            <ViewEmpReview empReviewData={reviewEmp} />
        </Base1>
    )
}