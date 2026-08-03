import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../Config/Loader.css';
import Base1 from '../../Config/Base1';
import { fetchWithAuth } from "../../../utils/api";
import Swal from 'sweetalert2';
import { useLocation } from "react-router-dom";
import { Dropdown, Menu, Select, Table, Progress, Tag, Avatar, Tooltip } from 'antd';
import { getKPIDashboardStats } from '../services/kpiServices';

const { Option } = Select;

export default function KPIDashboard() {

    const navigate = useNavigate();
    const location = useLocation();
    const [sessionUserData, setsessionUserData] = useState({});
    const [sessionActionIds, setSessionActionIds] = useState([]);
    const [modules, setModules] = useState([]);
    const [menuData, setMenuData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [dashData, setDashData] = useState([]);

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

    const fetchKPIDashboardStats = async () => {
        try {
            setLoading(true);

            const response = await getKPIDashboardStats({
                orgId: sessionUserData?.OrgId,
                periodId: sessionUserData?.PeriodId,
            });

            setDashData(response || []);

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (sessionUserData?.OrgId) {
            fetchMenuData();
            fetchKPIDashboardStats();
        }
    }, [sessionUserData]);

    const summary = dashData?.Summary || {};
    const departmentKpis = dashData?.DepartmentKPIs || [];
    const currentCycle = dashData?.CurrentCycle || null;
    const pendingActions = dashData?.PendingActions || [];
    const periodName = sessionUserData?.PeriodName;

    // Derive a max so progress bars are relative to the busiest department
    const maxDeptKpis = Math.max(...departmentKpis.map(d => d.TotalKPIs), 1);

    const summaryCards = [
        {
            title: "Organization KPIs",
            value: summary.OrganizationKPIs ?? 0,
            icon: "bi-bullseye",
            color: "primary",
        },
        {
            title: "KPI Periods",
            value: summary.KpiPeriods ?? 0,
            icon: "bi-calendar-range",
            color: "info",
        },
        {
            title: "Review Cycles",
            value: summary.ReviewCycles ?? 0,
            icon: "bi-arrow-repeat",
            color: "warning",
        },
        {
            title: "Released Cycles",
            value: summary.ReleasedCycles ?? 0,
            icon: "bi-check2-circle",
            color: "success",
        },
    ];

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
                    <div id="kt_app_content_container" className="app-container container-xxl">
                        <div className="row g-5 g-xl-10">
                            {/* Header */}
                            <div className="col-12 mb-2">
                                <div className="card border-0 shadow-sm bg-light-primary p-8">
                                    <div className="d-flex align-items-center justify-content-between flex-wrap gap-4">
                                        <div>
                                            <h3 className="fw-bolder text-gray-900 mb-1 fs-2">Corporate OKR & KPI Center</h3>
                                            <p className="text-gray-600 fw-semibold fs-6 mb-0">
                                                Organization-wide KPI summary across departments and review cycles.
                                            </p>
                                        </div>
                                        <div className="d-flex align-items-center gap-6 bg-white px-6 py-4 rounded-3 shadow-xs">
                                            {currentCycle && (
                                                <>
                                                    <div className="text-center">
                                                        <span className="text-gray-400 fw-bold fs-8 text-uppercase d-block">Active Cycle</span>
                                                        <span className="badge badge-light-primary fw-bold fs-6 mt-1">
                                                            {currentCycle.CycleName}
                                                        </span>
                                                    </div>
                                                    <div className="vr h-30px text-gray-200"></div>
                                                </>
                                            )}
                                            {periodName && (
                                                <>
                                                    <div className="text-center">
                                                        <span className="text-gray-400 fw-bold fs-8 text-uppercase d-block">Period</span>
                                                        <span className="badge badge-light-info fw-bold fs-6 mt-1">
                                                            {periodName}
                                                        </span>
                                                    </div>
                                                    <div className="vr h-30px text-gray-200"></div>
                                                </>
                                            )}
                                            <div className="text-center">
                                                <span className="text-gray-400 fw-bold fs-8 text-uppercase d-block">Departments</span>
                                                <span className="text-gray-900 fw-bolder fs-3">{departmentKpis.length}</span>
                                            </div>
                                            <div className="vr h-30px text-gray-200"></div>
                                            <div className="text-center">
                                                <span className="text-gray-400 fw-bold fs-8 text-uppercase d-block">Cycles Released</span>
                                                <span className="text-gray-900 fw-bolder fs-3">
                                                    {summary.ReleasedCycles ?? 0}/{summary.ReviewCycles ?? 0}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Summary cards from Summary object */}
                            <div className="row g-5 mb-5">
                                {summaryCards.map((item, index) => (
                                    <div key={index} className="col-xl-3 col-lg-6 col-md-6">
                                        <div className={`card border-0 shadow-sm h-100 position-relative overflow-hidden bg-${item.color}-subtle`}>
                                            <div className="card-body p-6">
                                                <div className="d-flex justify-content-between align-items-start">
                                                    <div>
                                                        <span className="text-uppercase fw-bold fs-8 text-gray-600 d-block mb-2">{item.title}</span>
                                                        <h2 className="fw-bolder fs-1 text-dark mb-0">{item.value}</h2>
                                                    </div>
                                                    <div className="symbol symbol-60px">
                                                        <div className={`symbol-label bg-${item.color}`}>
                                                            <i className={`bi ${item.icon} fs-2 text-white`}></i>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="position-absolute top-0 end-0 opacity-10">
                                                <i className={`bi ${item.icon}`} style={{ fontSize: "110px" }}></i>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Department KPI breakdown */}
                            <div className="row">
                                {/* KPIs by Department */}
                                <div className="col-xl-6">
                                    <div className="card card-flush shadow-sm border-0 h-100">
                                        <div className="card-header align-items-center py-5">
                                            <div className="card-title">
                                                <h3 className="fw-bold text-gray-900">
                                                    KPIs by Department
                                                </h3>
                                            </div>
                                        </div>

                                        <div className="card-body pt-0">
                                            {departmentKpis.length === 0 ? (
                                                <div className="text-center text-gray-500 py-10">
                                                    No department KPI data available.
                                                </div>
                                            ) : (
                                                <div className="table-responsive">
                                                    <table className="table align-middle table-row-dashed fs-6 gy-5">
                                                        <thead>
                                                            <tr className="text-start text-gray-400 fw-bold fs-7 text-uppercase gs-0">
                                                                <th>Department</th>
                                                                <th className="text-end">Total KPIs</th>
                                                            </tr>
                                                        </thead>

                                                        <tbody className="fw-semibold text-gray-600">
                                                            {departmentKpis.map((dept, idx) => (
                                                                <tr key={idx}>
                                                                    <td>
                                                                        <div className="d-flex align-items-center">
                                                                            <div className="symbol symbol-35px me-3">
                                                                                <div className="symbol-label bg-light-primary text-primary fw-bold">
                                                                                    {dept.DepartmentName?.charAt(0)}
                                                                                </div>
                                                                            </div>

                                                                            <span className="text-gray-900 fw-bold fs-6">
                                                                                {dept.DepartmentName}
                                                                            </span>
                                                                        </div>
                                                                    </td>

                                                                    <td className="text-end fw-bolder fs-6 text-gray-900">
                                                                        {dept.TotalKPIs}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Pending Actions */}
                                <div className="col-xl-6">
                                    <div className="card card-flush shadow-sm border-0 h-100">
                                        <div className="card-header align-items-center py-5">
                                            <div className="card-title d-flex flex-column">
                                                <h3 className="fw-bold text-gray-900 mb-1">Pending Actions</h3>
                                                <div className="d-flex align-items-center gap-2">
                                                    {currentCycle && (
                                                        <span className="badge badge-light-primary fw-semibold fs-8">
                                                            {currentCycle.CycleName}
                                                        </span>
                                                    )}
                                                    {periodName && (
                                                        <span className="badge badge-light-info fw-semibold fs-8">
                                                            {periodName}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            {pendingActions.length > 0 && (
                                                <div className="card-toolbar">
                                                    <span className="badge badge-light-warning fw-bold">{pendingActions.length}</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="card-body pt-0">
                                            {pendingActions.length === 0 ? (
                                                <div className="text-center text-gray-500 py-10">No pending actions.</div>
                                            ) : (
                                                <div className="d-flex flex-column gap-4">
                                                    {pendingActions.map((action, idx) => (
                                                        <div
                                                            key={idx}
                                                            className="d-flex align-items-center justify-content-between bg-light-warning rounded-3 px-4 py-3"
                                                        >
                                                            <div className="d-flex align-items-center">
                                                                <div className="symbol symbol-35px me-3">
                                                                    <div className="symbol-label bg-warning text-white fw-bold">
                                                                        {action.UserName?.charAt(0)}
                                                                    </div>
                                                                </div>
                                                                <span className="text-gray-900 fw-bold fs-6">{action.UserName}</span>
                                                            </div>
                                                            <span className="badge badge-light-primary fw-semibold fs-8">
                                                                {action.PendingAction}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style>
                {`
                    .dashboard-card{
                        border-radius:16px;
                        transition:all .3s ease;
                    }
                    .dashboard-card:hover{
                        transform:translateY(-6px);
                        box-shadow:0 1rem 3rem rgba(0,0,0,.15)!important;
                    }
                `}
            </style>
        </Base1>
    )
}