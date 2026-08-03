import React, { useState, useEffect } from 'react';
import Base1 from "../../Config/Base1";
import { fetchWithAuth } from "../../../utils/api";
import Swal from 'sweetalert2';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Dropdown, Menu, message, Input, Skeleton, Tooltip } from 'antd';
import { SaveAssessments, getCyclesScoreByUserId } from '../services/kpiServices';

export default function EmployeeReviewCycle() {

    const navigate = useNavigate();
    const location = useLocation();

    const {
        quarterId,
        quarterName,
        employeeId,
        periodId
    } = location.state || {};

    const [sessionUserData, setsessionUserData] = useState({});
    const [sessionActionIds, setSessionActionIds] = useState([]);
    const [modules, setModules] = useState([]);
    const [menuData, setMenuData] = useState([]);
    const [reviewData, setReviewData] = useState([]);
    const [reviewStatus, setReviewStatus] = useState("Pending");
    const [loading, setLoading] = useState(false);
    const [totalWeightedScore, setTotalWeightedScore] = useState(0);

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

    const fetchCyclesScoreByUserId = async () => {
        try {
            setLoading(true);

            const response = await getCyclesScoreByUserId({
                orgId: sessionUserData?.OrgId,
                cycleId: quarterId,
                employeeId: employeeId,
                periodId: periodId,
            });

            setReviewData(response?.data || []);
            setReviewStatus(response?.data[0]?.Status || "Pending");

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (quarterId && employeeId && periodId && sessionUserData?.OrgId) {
            fetchCyclesScoreByUserId();
        }
    }, [quarterId, employeeId, periodId, sessionUserData?.OrgId]);

    const handleInputChange = (index, field, value) => {
        const updated = [...reviewData];
        updated[index][field] = value;
        setReviewData(updated);
    };

    const handleSaveReview = async () => {
        for (const item of reviewData) {
            if (
                item.Score1 === null ||
                item.Score1 === "" ||
                item.Score1 === undefined
            ) {
                message.warning(`${item.KPIName}: Please enter Self Score.`);
                return;
            }
            if (!item.Remarks1?.trim()) {
                message.warning(`${item.KPIName}: Please enter Self Remarks.`);
                return;
            }
        }

        const payload = {
            OrgId: sessionUserData.OrgId,
            UserId: sessionUserData.Id,
            Action: "SELF",
            JsonData: {
                Assessments: reviewData.map(item => ({
                    Id: item.Id || 0,
                    EmployeeKPIId: item.EmployeeKPIId,
                    ReviewCycleId: quarterId,
                    Score1: Number(item.Score1),
                    Remarks1: item.Remarks1 || ""
                }))
            }
        };

        try {
            setLoading(true);
            const response = await SaveAssessments(payload);
            if (
                response?.success &&
                response?.data?.result?.[0]?.ResponseCode === 200
            ) {
                message.success(
                    response.data.result[0].Message
                );
                fetchCyclesScoreByUserId();
            } else {
                message.error(
                    response?.data?.result?.[0]?.Message ||
                    "Failed to save review."
                );
            }
        } catch (error) {
            console.error(error);
            message.error("Something went wrong.");
        } finally {
            setLoading(false);
        }

    };

    const getStatusClass = (status) => {
        switch ((status || "").toUpperCase()) {
            case "PENDING":
                return "status-pending";

            case "DRAFT":
                return "status-draft";

            case "REVIEWED":
                return "status-reviewed";

            default:
                return "status-pending";
        }
    };

    const getStatusIcon = (status) => {
        switch ((status || "").toUpperCase()) {
            case "PENDING":
                return "fa-solid fa-hourglass-half";

            case "DRAFT":
                return "fa-solid fa-pen-to-square";

            case "REVIEWED":
                return "fa-solid fa-circle-check";

            default:
                return "fa-solid fa-circle-question";
        }
    };

    const handleRequestReview = async () => {

        const payload = {
            OrgId: sessionUserData?.OrgId,
            UserId: sessionUserData?.Id,
            Action: "UNDER_REVIEW",
            JsonData: {
                Assessments: reviewData.map(item => ({
                    Id: item.Id,
                    CycleId: item.CycleId
                }))
            }
        };

        try {

            setLoading(true);

            const response = await SaveAssessments(payload);

            if (response?.success) {
                message.success("Review request submitted successfully.");
                fetchCyclesScoreByUserId();
            } else {
                message.error(response?.message || "Failed to submit review request.");
            }

        } catch (error) {
            console.error(error);
            message.error("Something went wrong.");
        } finally {
            setLoading(false);
        }

    };

    const managerEnabled = reviewStatus === "SUBMITTED";

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
                                <a href='/edm/dashboard' style={{ position: "relative", zIndex: 10 }}>
                                    <span className="menu-link bg-white shadow-sm me-2 active">
                                        <span className="menu-title"><i className="bi bi-columns-gap text-primary fs-5"></i></span>
                                        <span className="menu-arrow"></span>
                                    </span>
                                </a>
                                <a href='/edm/documents' style={{ position: "relative", zIndex: 10 }}>
                                    <span className="menu-link bg-white shadow-sm me-2">
                                        <span className="menu-title"><i className="fa-solid fa-file-invoice fs-5"></i></span>
                                        <span className="menu-arrow"></span>
                                    </span>
                                </a>
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
                    <div id="kt_app_content_container" className="app-container container-xxl py-5">
                        <span className="badge bg-light-primary text-primary px-3 py-2 rounded-pill mb-2">
                            <i className="bi bi-person-check-fill me-2 text-primary"></i>
                            MY PERFORMANCE REVIEW
                        </span>
                        <div className="review-header mb-5 p-4 position-relative overflow-hidden">
                            <div className="header-glow"></div>
                            <div className="d-flex justify-content-between align-items-center position-relative z-1">
                                <div className="d-flex align-items-center">
                                    <button
                                        type="button"
                                        className="btn review-back-btn me-4"
                                        onClick={() => navigate(-1)}
                                        title="Back"
                                    >
                                        <i className="bi bi-arrow-left-short"></i>
                                    </button>
                                    <div>
                                        <h1 className="text-white fw-extrabold mb-1 d-flex align-items-center tracking-tight">
                                            <i className="bi bi-shield-check me-3"></i>
                                            KPI Performance Matrix
                                        </h1>
                                        <p className="text-white-50 mb-0 fs-6">
                                            {quarterName} Assessment & Milestone Verification
                                        </p>
                                    </div>
                                </div>
                                <div className={`review-cycle-pill shadow-sm ${getStatusClass(reviewStatus)}`}>
                                    <i className={`${getStatusIcon(reviewStatus)} fa-beat-fade me-2`}></i>
                                    {quarterName} Cycle • {reviewStatus}
                                </div>
                            </div>
                        </div>

                        <div className="card border-0 shadow-sm rounded-4 p-4 bg-white position-relative">
                            {loading ? (
                                <div className="p-4">
                                    <Skeleton active paragraph={{ rows: 8 }} title />
                                </div>
                            ) : (
                                <>
                                    <div
                                        className="table-responsive review-table-container custom-scrollbar mb-4 position-relative"
                                        style={{ maxHeight: "500px", overflowY: "auto" }}
                                    >
                                        {!managerEnabled && (
                                            <div className="manager-lock-overlay">
                                                <div className="text-center">
                                                    <i className="bi bi-lock-fill fs-1 text-warning"></i>
                                                    <h5 className="fw-bold mt-3 mb-2">
                                                        Manager Review Locked
                                                    </h5>
                                                    <p className="text-muted mb-0">
                                                        Manager evaluation will be enabled once the employee submits the review.
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                        <table className="table table-borderless align-middle mb-0">
                                            <thead>
                                                <tr className="text-nowrap">
                                                    <th style={{ minWidth: 200, whiteSpace: "nowrap" }} className="ps-4">KPI Metric</th>
                                                    <th className="text-center" style={{ width: 110, whiteSpace: "nowrap" }}>Info</th>
                                                    <th className="text-center" style={{ width: 110, whiteSpace: "nowrap" }}>Target</th>
                                                    <th className="text-center" style={{ width: 110, whiteSpace: "nowrap" }}>Weight</th>
                                                    <th style={{ width: 120, whiteSpace: "nowrap" }}>Self Score</th>
                                                    <th style={{ minWidth: 220, whiteSpace: "nowrap" }}>Self Remarks</th>
                                                    <th
                                                        style={{ width: 130, whiteSpace: "nowrap" }}
                                                        className={!managerEnabled ? "manager-disabled" : ""}
                                                    >
                                                        Manager Score
                                                    </th>

                                                    <th
                                                        style={{ minWidth: 220, whiteSpace: "nowrap" }}
                                                        className={!managerEnabled ? "manager-disabled" : ""}
                                                    >
                                                        Manager Remarks
                                                    </th>

                                                    <th
                                                        className={`text-center pe-4 ${!managerEnabled ? "manager-disabled" : ""}`}
                                                        style={{ width: 140, whiteSpace: "nowrap" }}
                                                    >
                                                        Calculated
                                                    </th>

                                                    <th
                                                        className={`text-center ${!managerEnabled ? "manager-disabled" : ""}`}
                                                        style={{ width: 140, whiteSpace: "nowrap" }}
                                                    >
                                                        Weighted
                                                    </th>
                                                </tr>
                                            </thead>

                                            <tbody>
                                                {reviewData?.map((item, index) => {
                                                    return (
                                                        <tr key={item.Id ?? index} className="review-row-card">
                                                            <td className="ps-4 py-4">
                                                                <Tooltip
                                                                    title={item.KPIName}
                                                                    placement="topLeft"
                                                                >
                                                                    <div
                                                                        className="fw-bold text-slate-800 fs-6 mb-1"
                                                                        style={{
                                                                            maxWidth: "180px",
                                                                            cursor: "pointer"
                                                                        }}
                                                                    >
                                                                        {item.KPIName?.length > 25
                                                                            ? `${item.KPIName.substring(0, 25)}...`
                                                                            : item.KPIName}
                                                                    </div>
                                                                </Tooltip>

                                                                <span className="badge badge-light-info fw-bold">
                                                                    Status: {item.Status ?? "PENDING"}
                                                                </span>
                                                            </td>

                                                            <td className="text-center">
                                                                {item.Objectives ? (
                                                                    <Tooltip
                                                                        title={item.Objectives}
                                                                        placement="top"
                                                                        overlayStyle={{ maxWidth: 350 }}
                                                                        overlayInnerStyle={{
                                                                            borderRadius: "10px",
                                                                            padding: "10px 12px",
                                                                            fontSize: "13px",
                                                                            lineHeight: "20px"
                                                                        }}
                                                                    >
                                                                        <i
                                                                            className="bi bi-info-circle-fill text-primary"
                                                                            style={{
                                                                                cursor: "pointer",
                                                                                fontSize: "18px",
                                                                                transition: "0.2s"
                                                                            }}
                                                                            onMouseEnter={(e) =>
                                                                                (e.currentTarget.style.transform = "scale(1.15)")
                                                                            }
                                                                            onMouseLeave={(e) =>
                                                                                (e.currentTarget.style.transform = "scale(1)")
                                                                            }
                                                                        />
                                                                    </Tooltip>
                                                                ) : (
                                                                    <span className="text-muted">-</span>
                                                                )}
                                                            </td>
                                                            <td className="text-center">
                                                                <span className="metric-badge target-badge">
                                                                    {item.Target}
                                                                </span>
                                                            </td>

                                                            <td className="text-center">
                                                                <span className="metric-badge weight-badge">
                                                                    {item.Weightage}%
                                                                </span>
                                                            </td>

                                                            {/* --- SELF SCORE --- */}
                                                            <td>
                                                                <div className="premium-input-wrapper">
                                                                    <Input
                                                                        type="number"
                                                                        className="premium-field text-center font-monospace fw-bold"
                                                                        min={0}
                                                                        max={100}
                                                                        value={item.Score1 ?? ""}
                                                                        placeholder="0"
                                                                        onChange={(e) => handleInputChange(index, "Score1", e.target.value)}
                                                                        onWheel={(e) => e.target.blur()}
                                                                        disabled={reviewStatus === "REVIEWED" || reviewStatus === "SUBMITTED"}
                                                                    />
                                                                </div>
                                                            </td>

                                                            {/* --- SELF REMARKS --- */}
                                                            <td>
                                                                <Input.TextArea
                                                                    rows={2}
                                                                    className="premium-field-textarea"
                                                                    value={item.Remarks1 ?? ""}
                                                                    placeholder="Add descriptive self notes..."
                                                                    autoSize={{ minRows: 2, maxRows: 3 }}
                                                                    disabled={reviewStatus === "REVIEWED" || reviewStatus === "SUBMITTED"}
                                                                    onChange={(e) => handleInputChange(index, "Remarks1", e.target.value)}
                                                                />
                                                            </td>

                                                            {/* --- MANAGER SCORE --- */}
                                                            <td className={!managerEnabled ? "manager-disabled" : ""}>
                                                                <div className="premium-input-wrapper">
                                                                    <Input
                                                                        type="number"
                                                                        className="premium-field text-center font-monospace fw-bold manager-accent"
                                                                        min={0}
                                                                        max={100}
                                                                        value={item.Score2 ?? ""}
                                                                        placeholder="0"
                                                                        disabled={!managerEnabled}
                                                                        onChange={(e) => handleInputChange(index, "Score2", e.target.value)}
                                                                    />
                                                                </div>
                                                            </td>

                                                            <td className={!managerEnabled ? "manager-disabled" : ""}>
                                                                <Input.TextArea
                                                                    rows={2}
                                                                    className="premium-field-textarea manager-accent"
                                                                    value={item.Remarks2 ?? ""}
                                                                    placeholder="Manager review insight..."
                                                                    autoSize={{ minRows: 2, maxRows: 3 }}
                                                                    disabled={!managerEnabled}
                                                                    onChange={(e) => handleInputChange(index, "Remarks2", e.target.value)}
                                                                />
                                                            </td>

                                                            <td className={`text-center pe-4 ${!managerEnabled ? "manager-disabled" : ""}`}>
                                                                <div className="score-display-circle calculated">
                                                                    {item.CalculatedScore}
                                                                </div>
                                                            </td>

                                                            <td className={`text-center ${!managerEnabled ? "manager-disabled" : ""}`}>
                                                                <div className="score-display-circle weighted">
                                                                    {item.WeightedScore}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                                <tr className="table-primary border-top border-3">
                                                    <td colSpan={9} className="text-end fw-bold fs-4 py-4 pe-4">
                                                        <i className="bi bi-calculator-fill me-2 text-primary"></i>
                                                        Total Weighted Score
                                                    </td>

                                                    <td className="text-center">
                                                        <div
                                                            className="score-display-circle weighted"
                                                            style={{
                                                                width: "75px",
                                                                height: "56px",
                                                                fontSize: "18px",
                                                                fontWeight: "700",
                                                                margin: "0 auto",
                                                                background: "linear-gradient(135deg,#16a34a,#22c55e)",
                                                                color: "#fff",
                                                                border: "3px solid #dcfce7",
                                                                boxShadow: "0 10px 25px rgba(34,197,94,.25)"
                                                            }}
                                                        >
                                                            {totalWeightedScore ?? 0}
                                                        </div>
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="d-flex justify-content-end mt-5 gap-3 border-top pt-4">
                                        <button
                                            className="btn btn-warning px-4 py-2 fw-bold"
                                            disabled={reviewStatus !== "DRAFT" || loading}
                                            onClick={handleRequestReview}
                                        >
                                            {loading ? (
                                                <>
                                                    <span className="spinner-border spinner-border-sm me-2"></span>
                                                    Requesting...
                                                </>
                                            ) : (
                                                <>
                                                    <i className="bi bi-send-check-fill me-2"></i>
                                                    Request for Review
                                                </>
                                            )}
                                        </button>
                                        <button
                                            className="btn btn-premium-primary px-5 py-2.5 shadow-sm"
                                            onClick={handleSaveReview}
                                            disabled={reviewStatus === "REVIEWED" || reviewStatus === "SUBMITTED" || reviewStatus === "UNDER_REVIEW" || loading}
                                        >
                                            {loading ? (
                                                <>
                                                    <span className="spinner-border spinner-border-sm me-2"></span>
                                                    Locking Parameters...
                                                </>
                                            ) : (
                                                <>
                                                    <i className="bi bi-cloud-arrow-up-fill me-2 text-white"></i>
                                                    Save Evaluation
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <style>
                {`
                    .manager-disabled{
                        opacity:.45;
                        filter:blur(1px);
                        pointer-events:none;
                    }

                    .manager-lock-overlay{
                        position:absolute;
                        top:0;
                        right:0;
                        bottom:0;
                        left:59%;
                        display:flex;
                        align-items:center;
                        justify-content:center;
                        background:rgba(255,255,255,.75);
                        backdrop-filter:blur(5px);
                        z-index:20;
                        border-radius:12px;
                    }
                .review-back-btn{
                    width:52px;
                    height:52px;
                    border:none;
                    border-radius:16px;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    background:rgba(255,255,255,.16);
                    backdrop-filter:blur(10px);
                    -webkit-backdrop-filter:blur(10px);
                    color:#fff;
                    transition:all .25s ease;
                    box-shadow:0 8px 24px rgba(0,0,0,.15);
                }

                .review-back-btn i{
                    font-size:30px;
                    line-height:1;
                }

                .review-back-btn:hover{
                    background:#fff;
                    color:#2563eb;
                    transform:translateX(-4px);
                    box-shadow:0 12px 28px rgba(0,0,0,.22);
                }

                .review-back-btn:active{
                    transform:translateX(-2px) scale(.96);
                }
                    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
                    
                    #kt_app_content_container {
                        font-family: 'Plus Jakarta Sans', sans-serif;
                        background-color: #f8fafc;
                    }

                    /* Header UI Block */
                    .review-header {
                        background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%);
                        border-radius: 20px;
                        box-shadow: 0 20px 40px -15px rgba(15, 23, 42, 0.3);
                        border: 1px solid rgba(255, 255, 255, 0.08);
                    }
                    .header-glow {
                        position: absolute;
                        top: -50%;
                        right: -20%;
                        width: 400px;
                        height: 400px;
                        background: radial-gradient(circle, rgba(99,102,241,0.15) 0%, rgba(99,102,241,0) 70%);
                        pointer-events: none;
                    }
                    .text-white-10 { background: rgba(255, 255, 255, 0.07); }
                    .tracking-wider { letter-spacing: 0.05em; }
                    .text-emerald-400 { color: #34d399 !important; }

                    .review-cycle-pill {
                        background: rgba(255, 255, 255, 0.07);
                        backdrop-filter: blur(8px);
                        padding: 10px 24px;
                        border-radius: 100px;
                        color: #fff;
                        font-weight: 700;
                        font-size: 14px;
                        border: 1px solid rgba(255, 255, 255, 0.12);
                        display: flex;
                        align-items: center;
                        gap: 10px;
                    }
                    .pulse-indicator {
                        width: 8px;
                        height: 8px;
                        background-color: #10b981;
                        border-radius: 50%;
                        box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
                        animation: pulse-ring 2s infinite;
                    }
                    .status-pending{
                        background:#fff7ed;
                        color:#ea580c;
                        border:1px solid #fdba74;
                    }

                    .status-draft{
                        background:#eff6ff;
                        color:#2563eb;
                        border:1px solid #93c5fd;
                    }

                    .status-reviewed{
                        background:#ecfdf5;
                        color:#16a34a;
                        border:1px solid #86efac;
                    }

                    .review-cycle-pill{
                        display:flex;
                        align-items:center;
                        gap:8px;
                        padding:10px 18px;
                        border-radius:30px;
                        font-weight:600;
                        font-size:14px;
                    }

                    .review-cycle-pill i{
                        font-size:14px;
                    }

                    /* Matrix Table UI styling */
                    .review-table-container thead th {
                        background: #f1f5f9 !important;
                        padding: 16px 12px;
                        font-size: 11px;
                        font-weight: 800;
                        text-transform: uppercase;
                        letter-spacing: 0.05em;
                        color: #64748b;
                        border-bottom: 2px solid #e2e8f0;
                    }
                    
                    .review-row-card {
                        border-bottom: 1px solid #f1f5f9;
                        transition: all 0.2s ease;
                    }

                    /* Custom Badges */
                    .metric-badge {
                        font-size: 13px;
                        font-weight: 700;
                        padding: 8px 16px;
                        border-radius: 100px;
                        display: inline-block;
                    }
                    .target-badge { background: #eff6ff; color: #1d4ed8; border: 1px solid #dbeafe; }
                    .weight-badge { background: #f0fdf4; color: #15803d; border: 1px solid #dcfce7; }

                    /* Premium Form Fields Customization */
                    .premium-field, .premium-field-textarea {
                        border: 1px solid #cbd5e1 !important;
                        border-radius: 10px !important;
                        padding: 10px 14px !important;
                        color: #334155 !important;
                        font-size: 14px !important;
                        transition: all 0.2s ease-in-out !important;
                        box-shadow: inset 0 1px 2px rgba(0,0,0,0.02) !important;
                    }
                    .premium-field:focus, .premium-field-textarea:focus {
                        border-color: #6366f1 !important;
                        box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.12) !important;
                        background-color: #fff !important;
                    }
                    .manager-accent:focus {
                        border-color: #0ea5e9 !important;
                        box-shadow: 0 0 0 4px rgba(14, 165, 233, 0.12) !important;
                    }

                    /* Dynamic Circles for Computed Rows */
                    .score-display-circle {
                        width: 44px;
                        height: 44px;
                        border-radius: 12px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-weight: 700;
                        font-size: 14px;
                        margin: auto;
                    }
                    .score-display-circle.weighted { background: #f5f3ff; color: #6d28d9; border: 1px solid #ede9fe; }
                    .score-display-circle.calculated { background: #ecfeff; color: #0369a1; border: 1px solid #cffafe; }

                    /* Modern Glass Cards Dashboard */
                    .summary-glass-card {
                        padding: 24px;
                        border-radius: 16px;
                        position: relative;
                        box-shadow: 0 10px 30px -5px rgba(0,0,0,0.03);
                        border: 1px solid rgba(255, 255, 255, 0.7);
                    }
                    .success-gradient { background: linear-gradient(135deg, #f0fdf4 0%, #e6fced 100%); color: #166534; }
                    .primary-gradient { background: linear-gradient(135deg, #eff6ff 0%, #e0f2fe 100%); color: #1e40af; }
                    .warning-gradient { background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%); color: #9a3412; }
                    
                    .card-label { font-size: 13px; font-weight: 700; opacity: 0.85; text-transform: uppercase; letter-spacing: 0.02em; }
                    .card-value { font-size: 32px; font-weight: 800; margin-bottom: 0; letter-spacing: -0.03em; }
                    .card-icon-box { font-size: 20px; opacity: 0.4; }

                    /* Premium Buttons CSS */
                    .btn-premium-primary {
                        background: linear-gradient(135deg, #4f46e5 0%, #4338ca 100%);
                        color: white; border: none; font-weight: 700; font-size: 14px; border-radius: 10px;
                        transition: all 0.2s ease;
                    }
                    .btn-premium-primary:hover {
                        background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
                        transform: translateY(-1px);
                        box-shadow: 0 8px 20px -6px rgba(79, 70, 229, 0.4);
                        color: white;
                    }
                    .btn-premium-secondary {
                        background: #fff; color: #475569; border: 1px solid #cbd5e1; font-weight: 700; font-size: 14px; border-radius: 10px;
                        transition: all 0.2s ease;
                    }
                    .btn-premium-secondary:hover { background: #f8fafc; color: #1e293b; border-color: #94a3b8; }

                    /* Hide Number Spinners HTML5 */
                    .premium-field::-webkit-outer-spin-button, .premium-field::-webkit-inner-spin-button {
                        -webkit-appearance: none; margin: 0;
                    }

                    /* Custom Scrollbar */
                    .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
                    .custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; }
                    .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }

                    @keyframes pulse-ring {
                        0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
                        70% { box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
                        100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
                    }
                    `}
            </style>

        </Base1>
    )
}