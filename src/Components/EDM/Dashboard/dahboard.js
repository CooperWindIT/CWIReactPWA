import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../Config/Loader.css';
import Base1 from '../../Config/Base1';
import { fetchWithAuth } from "../../../utils/api";
import Swal from 'sweetalert2';
import { Select } from 'antd';
import { useLocation } from "react-router-dom";
import { formatDateyyyymmddToddmmYYYY } from '../../../utils/dateFunc';
import ViewMoreAlerts from './ViewMoreAlerts';
import { Dropdown, Menu } from 'antd';

export default function EDMDashboard() {

    const navigate = useNavigate();
    const location = useLocation();
    const [sessionUserData, setsessionUserData] = useState({});
    const [sessionActionIds, setSessionActionIds] = useState([]);
    const [dashLoading, setDashLoading] = useState(false);
    const [modules, setModules] = useState([]);
    const [menuData, setMenuData] = useState([]);
    const [departmentsData, setDepartmentsData] = useState([]);
    const [selectedDeptId, setSelectedDeptId] = useState(null);
    const [unitsData, setUnitsData] = useState([]);
    const [selectedUnitId, setSelectedUnitId] = useState(null);
    const [statusWiseCounts, setStatusWiseCounts] = useState([]);
    const [recentLogs, setRecentLogs] = useState([]);
    const [recentDocs, setRecentDocs] = useState([]);
    const [alertsCount, setAlertsCount] = useState([]);
    const [alertType, setAlertType] = useState(null);
    const [activeTab, setActiveTab] = useState("uploads");
    const { Option } = Select;

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

    const fetchDDLData = async () => {
        try {
            const sessionDDL = sessionStorage.getItem("ddlEDMDashData");

            if (sessionDDL) {
                const parsed = JSON.parse(sessionDDL);
                setDepartmentsData(parsed.depts || []);
                const units = parsed.units || [];
                setUnitsData(units);

                if (units.length > 0) {
                    setSelectedUnitId(units[0].ItemId);
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

            const departmentsFilteredData = data.ResultData.filter(
                (item) => item.DDLName === "Departments"
            );

            const unitsFilteredData = data.ResultData.filter(
                (item) => item.DDLName === "UnitLocations"
            );

            setDepartmentsData(departmentsFilteredData || []);
            setUnitsData(unitsFilteredData || []);

            if (unitsFilteredData.length > 0) {
                setSelectedUnitId(unitsFilteredData[0].ItemId);
            }

            sessionStorage.setItem(
                "ddlEDMDashData",
                JSON.stringify({
                    depts: departmentsFilteredData,
                    units: unitsFilteredData,
                })
            );

        } catch (error) {
            console.error("Failed to fetch DDL data:", error);
            setUnitsData([]);
            setDepartmentsData([]);
        }
    };

    useEffect(() => {
        if (sessionUserData.OrgId) {
            fetchDDLData();
            setSelectedDeptId(sessionUserData?.DeptId);
        }
    }, [sessionUserData]);

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

    const fetchDashData = async () => {
        setDashLoading(true);
        try {
            const response = await fetchWithAuth(`EDM/EDMDashboard?Id=${sessionUserData?.OrgId}&Typeno=1&DepartmentId=${selectedDeptId}&DocUnitId=${selectedUnitId}`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });
            if (response.ok) {
                const data = await response.json();
                const resultData = data.ResultData;
                const statusCounts = resultData.filter(item => item.Title === 'StatusWiseDocs');
                const recentLogs = resultData.filter(item => item.Title === 'RecentLogs');
                const alerts = resultData.filter(item => item.Title === 'Alerts');
                const recDocs = resultData.filter(item => item.Title === 'RecentDocs');
                setStatusWiseCounts(statusCounts);
                setRecentLogs(recentLogs);
                setAlertsCount(alerts);
                setRecentDocs(recDocs);

            } else {
                console.error('Failed to fetch mcn tickets data:', response.statusText);
            }
        } catch (error) {
            console.error('Error fetching mcn tickets data:', error.message);
        } finally {
            setDashLoading(false);
        }
    };

    useEffect(() => {
        if (selectedDeptId && sessionUserData.OrgId && selectedUnitId) {
            fetchDashData();
        }
    }, [sessionUserData, selectedDeptId, selectedUnitId]);

    const showDeptDwn = sessionActionIds?.includes(25);

    const iconColors = ['#FF6B35', '#00B8D9', '#36B37E', '#FFAB00', '#6554C0', '#FF5630'];

    return (
        <Base1>
            <div className={`d-flex flex-column flex-column-fluid mb-7 mt-3 ${dashLoading ? 'blurre' : ''}`}>
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
                                <a href='/edm/edm-dashboard' style={{ position: "relative", zIndex: 10 }}>
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

                <div id="kt_app_content" className="app-content flex-column-fluid" style={{ marginTop: '-30px' }}>
                    <div id="kt_app_content_container" className="app-container container-xxl">
                        <div className="row g-4">
                            <div className="mt-8 mt-md-0">
                                <div className="row g-2">
                                    <div className="col-6 col-md-2">
                                        <Select
                                            showSearch
                                            placeholder="Choose Unit"
                                            suffixIcon={<i className="fa-solid fa-location-dot text-primary fa-beat-fade"></i>}
                                            style={{ width: "100%", height: "2.5rem" }}
                                            optionFilterProp="children"
                                            value={selectedUnitId}
                                            onChange={(value) => { setSelectedUnitId(value); }}
                                            disabled={!showDeptDwn}
                                        >
                                            {unitsData.map((unit) => (
                                                <Option key={unit.ItemId} value={unit.ItemId}>
                                                    {unit.ItemValue}
                                                </Option>
                                            ))}
                                        </Select>
                                    </div>

                                    <div className="col-6 col-md-2">
                                        <Select
                                            showSearch
                                            placeholder="Choose Department"
                                            suffixIcon={<i className="fa-solid fa-building text-primary fa-beat-fade"></i>}
                                            style={{ width: "100%", height: "2.5rem" }}
                                            optionFilterProp="children"
                                            value={selectedDeptId}
                                            onChange={(value) => { setSelectedDeptId(value); }}
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
                                </div>
                            </div>

                            <div className="row g-3">
                                <div className="col-md-4 col-6 col-xl-2">
                                    <div className={`card shadow-sm border-0 dashboard-card`}>
                                        <div className="card-body d-flex align-items-center justify-content-between">
                                            <div>
                                                <div className="text-muted small card-label">Total Documents</div>
                                                <div className="fs-4 fw-bold">{statusWiseCounts?.find(item => item.Label === 'TotalDocuments')?.Count ?? 0}</div>
                                            </div>
                                            <i className={`fa-solid fa-folder-open fs-2 text-primary`}></i>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-md-4 col-6 col-xl-2">
                                    <div className={`card shadow-sm border-0 dashboard-card`}>
                                        <div className="card-body d-flex align-items-center justify-content-between">
                                            <div>
                                                <div className="text-muted small card-label">Draft</div>
                                                <div className="fs-4 fw-bold">{statusWiseCounts?.find(item => item.Label === 'DRAFT')?.Count ?? 0}</div>
                                            </div>
                                            <i className={`fa-solid fa-pen-to-square fs-2 text-warning`}></i>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-md-4 col-6 col-xl-2">
                                    <div className={`card shadow-sm border-0 dashboard-card`}>
                                        <div className="card-body d-flex align-items-center justify-content-between">
                                            <div>
                                                <div className="text-muted small card-label">Pending Approval</div>
                                                <div className="fs-4 fw-bold">{statusWiseCounts?.find(item => item.Label === 'PENDING APPROVAL')?.Count ?? 0}</div>
                                            </div>
                                            <i className={`fa-solid fa-clock fs-2 text-info`}></i>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-md-4 col-6 col-xl-2">
                                    <div className={`card shadow-sm border-0 dashboard-card`}>
                                        <div className="card-body d-flex align-items-center justify-content-between">
                                            <div>
                                                <div className="text-muted small card-label">Approved</div>
                                                <div className="fs-4 fw-bold">{statusWiseCounts?.find(item => item.Label === 'APPROVED')?.Count ?? 0}</div>
                                            </div>
                                            <i className={`fa-solid fa-circle-check fs-2 text-success`}></i>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-md-4 col-6 col-xl-2">
                                    <div className={`card shadow-sm border-0 dashboard-card`}>
                                        <div className="card-body d-flex align-items-center justify-content-between">
                                            <div>
                                                <div className="text-muted small card-label">Rejected</div>
                                                <div className="fs-4 fw-bold">{statusWiseCounts?.find(item => item.Label === 'REJECTED')?.Count ?? 0}</div>
                                            </div>
                                            <i className={`fa-solid fa-circle-xmark fs-2 text-danger`}></i>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-md-4 col-6 col-xl-2">
                                    <div className={`card shadow-sm border-0 dashboard-card`}>
                                        <div className="card-body d-flex align-items-center justify-content-between">
                                            <div>
                                                <div className="text-muted small card-label">Published</div>
                                                <div className="fs-4 fw-bold">{statusWiseCounts?.find(item => item.Label === 'PUBLISHED')?.Count ?? 0}</div>
                                            </div>
                                            <i className={`fa-solid fa-upload fs-2 text-dark`}></i>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="row g-3 align-items-stretch mb-10">
                                <div className="col-12 col-md-2 d-flex">
                                    <div className="card shadow-sm w-100 h-100">
                                        <h6 className="ms-5 my-2">Alerts Summary</h6>
                                        <div className="card-body" style={{ overflowY: "auto" }}>
                                            <div className="row g-2">
                                                <div className="col-12"
                                                    onClick={() => setAlertType(3)}
                                                    data-bs-toggle="offcanvas"
                                                    data-bs-target="#offcanvasRightViewAlertsData"
                                                    aria-controls="offcanvasRightViewAlertsData"
                                                >
                                                    <div className={`alert-card card border-start border-2 border-primary h-100 shadow-sm`}>
                                                        <div className="card-body py-3 d-flex align-items-center gap-3">
                                                            <i className={`fa-solid fa-calendar text-primary fs-3`}></i>
                                                            <div>
                                                                <div className="text-muted fw-medium mb-0" style={{ fontSize: '1rem' }}>
                                                                    Month
                                                                </div>
                                                                <div className={`fw-bold text-primary fs-4 lh-1`}>
                                                                    {alertsCount?.find(item => item.Label === 'CurrentMonthCount')?.Count ?? 0}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="col-12"
                                                    onClick={() => setAlertType(2)}
                                                    data-bs-toggle="offcanvas"
                                                    data-bs-target="#offcanvasRightViewAlertsData"
                                                    aria-controls="offcanvasRightViewAlertsData"
                                                >
                                                    <div className={`alert-card card border-start border-2 border-info h-100 shadow-sm`}>
                                                        <div className="card-body py-3 d-flex align-items-center gap-3">
                                                            <i className={`fa-solid fa-calendar-week text-info fs-3`}></i>
                                                            <div>
                                                                <div className="text-muted fw-medium mb-0" style={{ fontSize: '1rem' }}>
                                                                    Week
                                                                </div>
                                                                <div className={`fw-bold text-info fs-4 lh-1`}>
                                                                    {alertsCount?.find(item => item.Label === 'CurrentWeekCount')?.Count ?? 0}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="col-12"
                                                    onClick={() => setAlertType(4)}
                                                    data-bs-toggle="offcanvas"
                                                    data-bs-target="#offcanvasRightViewAlertsData"
                                                    aria-controls="offcanvasRightViewAlertsData"
                                                >
                                                    <div className={`alert-card card border-start border-2 border-warning h-100 shadow-sm`}>
                                                        <div className="card-body py-3 d-flex align-items-center gap-3">
                                                            <i className={`fa-solid fa-hourglass-half text-warning fs-3`}></i>
                                                            <div>
                                                                <div className="text-muted fw-medium mb-0" style={{ fontSize: '1rem' }}>
                                                                    Pending
                                                                </div>
                                                                <div className={`fw-bold text-warning fs-4 lh-1`}>
                                                                    {alertsCount?.find(item => item.Label === 'CurrentMonthPendingCount')?.Count ?? 0}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="col-12"
                                                    onClick={() => setAlertType(5)}
                                                    data-bs-toggle="offcanvas"
                                                    data-bs-target="#offcanvasRightViewAlertsData"
                                                    aria-controls="offcanvasRightViewAlertsData"
                                                >
                                                    <div className={`alert-card card border-start border-2 border-success h-100 shadow-sm`}>
                                                        <div className="card-body py-3 d-flex align-items-center gap-3">
                                                            <i className={`fa-solid fa-circle-check text-success fs-3`}></i>
                                                            <div>
                                                                <div className="text-muted fw-medium mb-0" style={{ fontSize: '1rem' }}>
                                                                    Closed
                                                                </div>
                                                                <div className={`fw-bold text-success fs-4 lh-1`}>
                                                                    {alertsCount?.find(item => item.Label === 'CurrentMonthClosedCount')?.Count ?? 0}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="col-12 col-md-10">
                                    <div className="card shadow-sm border-0" style={{ borderRadius: '12px', overflow: 'hidden' }}>
                                        <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
                                            <div className="d-flex align-items-center justify-content-between bg-white border rounded-pill p-1 shadow-sm w-auto">
                                                <div className="nav nav-pills gap-1">
                                                    <button
                                                        className={`nav-link btn btn-sm rounded-pill px-4 d-flex align-items-center transition-all ${activeTab === "uploads"
                                                            ? "active btn-primary shadow"
                                                            : "text-gray-600 btn-active-light-primary border-0"
                                                            }`}
                                                        onClick={() => setActiveTab("uploads")}
                                                    >
                                                        <i className={`fa-solid fa-upload me-2 ${activeTab === 'uploads' ? 'text-white' : 'text-success'}`}></i>
                                                        <span className="fw-bold me-2">Recent Uploads</span>
                                                        <span className={`badge rounded-pill ${activeTab === 'uploads' ? 'bg-white text-primary' : 'bg-light-primary text-primary'}`}>
                                                            {recentDocs?.length ?? 0}
                                                        </span>
                                                    </button>
                                                    <button
                                                        className={`nav-link btn btn-sm rounded-pill px-4 d-flex align-items-center transition-all ${activeTab === "logs"
                                                            ? "active btn-primary shadow"
                                                            : "text-gray-600 btn-active-light-primary border-0"
                                                            }`}
                                                        onClick={() => setActiveTab("logs")}
                                                    >
                                                        <i className={`fa-solid fa-clock-rotate-left me-2 ${activeTab === 'logs' ? 'text-white' : 'text-primary'}`}></i>
                                                        <span className="fw-bold me-2">Recent Logs</span>
                                                        <span className={`badge rounded-pill ${activeTab === 'logs' ? 'bg-white text-primary' : 'bg-light-primary text-primary'}`}>
                                                            {recentLogs?.length ?? 0}
                                                        </span>
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="d-flex align-items-center gap-2">
                                                <button
                                                    className="btn btn-sm btn-icon btn-light-primary rounded-circle"
                                                    title="Reload Data"
                                                    onClick={fetchDashData}
                                                    disabled={dashLoading}
                                                >
                                                    <i className={`fa-solid fa-rotate fs-6 ${dashLoading ? "rotate-spin" : ""}`}></i>
                                                </button>
                                            </div>
                                        </div>

                                        {activeTab === 'uploads' && (
                                            <div className="card-body activity-timeline"
                                                style={{
                                                    maxHeight: "350px",
                                                    overflowY: "auto",
                                                    position: "relative",
                                                    minHeight: "200px",
                                                    padding: "1rem",
                                                }}
                                            >
                                                {dashLoading ? (
                                                    <div className="d-flex flex-column justify-content-center align-items-center h-100 py-5">
                                                        <div className="spinner-border text-primary mb-2" role="status">
                                                            <span className="visually-hidden">Loading...</span>
                                                        </div>
                                                        <span className="text-muted fw-medium">Syncing Uploaded Documents...</span>
                                                    </div>
                                                ) : recentDocs && recentDocs.length > 0 ? (
                                                    recentDocs.map((log, i) => {
                                                        const statusColor =
                                                            log.Col6 === "DRAFT" ? "warning" :
                                                                log.Col6 === "PENDING APPROVAL" ? "info" :
                                                                    log.Col6 === "APPROVED" ? "primary" :
                                                                        log.Col6 === "REJECTED" ? "danger" :
                                                                            log.Col6 === "UPDATED" ? "warning" :
                                                                                log.Col6 === "ALERT CREATED" ? "dark" :
                                                                                    log.Col6 === "PUBLISHED" ? "success" : "secondary";

                                                        return (
                                                            <div key={i} className="timeline-item py-3 d-flex gap-3 w-100">
                                                                <div className={`status-indicator status-${statusColor} flex-shrink-0`} style={{ width: '6px' }}></div>

                                                                <div className="recent-doc-card flex-grow-1 w-100">
                                                                    <div className="recent-doc-header">
                                                                        <div className="doc-title">
                                                                            <i className="fa-solid fa-file-lines"></i>
                                                                            <span title={log.Col2}>{log.Col2 || "Untitled Document"}</span>
                                                                            -<span className="text-primary">{log.Col10}</span>
                                                                        </div>

                                                                        <span className={`doc-status status-${statusColor}`}>
                                                                            {log.Col6}
                                                                        </span>
                                                                    </div>
                                                                    <div className="recent-doc-meta">
                                                                        <div>
                                                                            <span className="meta-label">Created By</span>
                                                                            <span className="meta-value">
                                                                                <i className="fa-solid fa-user"></i>
                                                                                {log.Col5 || "N/A"}
                                                                            </span>
                                                                        </div>

                                                                        <div>
                                                                            <span className="meta-label">Uploaded On</span>
                                                                            <span className="meta-value">
                                                                                <i className="fa-solid fa-calendar-day"></i>
                                                                                {log.Col7 ? formatDateyyyymmddToddmmYYYY(log.Col7) : "N/A"}
                                                                            </span>
                                                                        </div>
                                                                        <div>
                                                                            <span className="meta-label">Document Type</span>
                                                                            <span className="meta-value">
                                                                                <i className="fa-solid fa-calendar-day"></i>
                                                                                {log.Col4 || "N/A"}
                                                                            </span>
                                                                        </div>
                                                                        <div>
                                                                            <span className="meta-label">Current Version</span>
                                                                            <span className="meta-value">
                                                                                <i className="bi bi-git"></i>
                                                                                {log.Col3 || "N/A"}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                    <div className="row g-2 w-100">
                                                                        {log.Col8 && (
                                                                            <div className="col-6">
                                                                                <div className="recent-doc-note d-flex align-items-center h-100 p-2 bg-light ">
                                                                                    <i className="bi bi-clipboard-check me-2 text-primary"></i>
                                                                                    <span title={log.Col8} className="text-truncate fs-8 fw-semibold">
                                                                                        {log.Col8}
                                                                                    </span>
                                                                                </div>
                                                                            </div>
                                                                        )}

                                                                        {log.Col9 && (
                                                                            <div className="col-6">
                                                                                <div className="recent-doc-note d-flex align-items-center h-100 p-2 bg-light ">
                                                                                    <i className="bi bi-chat-left-dots me-2 text-info"></i>
                                                                                    <span title={log.Col9} className="text-truncate fs-8 fw-semibold">
                                                                                        {log.Col9}
                                                                                    </span>
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                            </div>
                                                        );
                                                    })
                                                ) : (
                                                    <div className="d-flex flex-column justify-content-center align-items-center h-100 py-5 opacity-75">
                                                        <i className="fa-solid fa-folder-open fa-3x text-muted mb-3"></i>
                                                        <h5 className="text-muted fw-bold">No Activity Logs Found</h5>
                                                        <p className="text-muted small">New activities will appear here once document actions are performed.</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {activeTab === 'logs' && (
                                            <div className="card-body activity-timeline w-100"
                                                style={{
                                                    maxHeight: "350px",
                                                    overflowY: "auto",
                                                    position: "relative",
                                                    minHeight: "200px",
                                                    padding: "1rem",
                                                }}
                                            >
                                                {dashLoading ? (
                                                    <div className="d-flex flex-column justify-content-center align-items-center h-100 py-5">
                                                        <div className="spinner-border text-primary mb-2" role="status">
                                                            <span className="visually-hidden">Loading...</span>
                                                        </div>
                                                        <span className="text-muted fw-medium">Syncing Document Logs...</span>
                                                    </div>
                                                ) : recentLogs && recentLogs.length > 0 ? (
                                                    recentLogs.map((log, i) => {
                                                        const statusColor =
                                                            log.Label === "DRAFT" ? "warning" :
                                                                log.Label === "PENDING APPROVAL" ? "info" :
                                                                    log.Label === "APPROVED" ? "primary" :
                                                                        log.Label === "REJECTED" ? "danger" :
                                                                            log.Label === "UPDATED" ? "warning" :
                                                                                log.Label === "ALERT CREATED" ? "purple" :
                                                                                    log.Label === "PUBLISHED" ? "success" : "secondary";

                                                        return (
                                                            <div key={i} className="timeline-item py-3 d-flex gap-3">
                                                                <div className={`status-indicator status-${statusColor} flex-shrink-0`} style={{ width: '6px' }}></div>
                                                                <div className="w-100">
                                                                    <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-3 gap-2">
                                                                        <span className="fw-bold text-primary fs-6 fs-md-5">{log.Col1}</span>
                                                                        <span className={`status-badge status-${statusColor} text-${statusColor} border border-${statusColor} text-uppercase px-3 py-2`} style={{ fontSize: '0.8rem', letterSpacing: '0.5px' }}>
                                                                            {log.Label}
                                                                        </span>
                                                                    </div>
                                                                    <div className="d-flex align-items-center gap-4 flex-wrap flex-md-nowrap">
                                                                        <div style={{ flex: 2, minWidth: 0 }}>
                                                                            <span className="grid-label">Document Name</span>
                                                                            <span className="grid-value d-flex align-items-center text-truncate">
                                                                                <i className="fa-solid fa-file-lines me-2 text-muted"></i>
                                                                                <span className="text-truncate" title={log.Col3}>
                                                                                    {log.Col3 || "N/A"}
                                                                                </span>
                                                                            </span>
                                                                        </div>
                                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                                            <span className="grid-label">Created User</span>
                                                                            <span className="grid-value d-flex align-items-center text-truncate">
                                                                                <i className="fa-solid fa-circle-user me-2 text-muted"></i>
                                                                                <span className="text-truncate">
                                                                                    {log.Col4 || "N/A"}
                                                                                </span>
                                                                            </span>
                                                                        </div>
                                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                                            <span className="grid-label">Registered Date</span>
                                                                            <span className="grid-value d-flex align-items-center">
                                                                                <i className="fa-solid fa-calendar-day me-2 text-muted"></i>
                                                                                {log.Col2 ? formatDateyyyymmddToddmmYYYY(log.Col2) : "N/A"}
                                                                            </span>
                                                                        </div>

                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })
                                                ) : (
                                                    <div className="d-flex flex-column justify-content-center align-items-center h-100 py-5 opacity-75">
                                                        <i className="fa-solid fa-folder-open fa-3x text-muted mb-3"></i>
                                                        <h5 className="text-muted fw-bold">No Activity Logs Found</h5>
                                                        <p className="text-muted small">New activities will appear here once document actions are performed.</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <ViewMoreAlerts alertType={alertType} deptId={selectedDeptId} unitId={selectedUnitId} />
            </div>

            <style>
                {`
                .rotate-spin {
                    animation: spin 0.9s linear infinite;
                }
                .recent-doc-note {
                    background-color: #f8f9fa; /* Light subtle gray */
                    padding: 2px 8px;
                    border-radius: 4px;
                    font-size: 0.85rem;
                    color: #495057;
                    border: 1px solid #e9ecef;
                    white-space: nowrap;
                }
                @keyframes spin {
                    from {
                        transform: rotate(0deg);
                    }
                    to {
                        transform: rotate(360deg);
                    }
                }
                    .recent-doc-card {
                    background: #ffffff;
                    border-radius: 14px;
                    padding: 16px 18px;
                    box-shadow: 0 6px 20px rgba(0,0,0,0.06);
                    transition: transform 0.25s ease, box-shadow 0.25s ease;
                }

                .recent-doc-card:hover {
                    transform: translateY(-3px);
                    box-shadow: 0 12px 28px rgba(0,0,0,0.1);
                }

                /* Header */
                .recent-doc-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 12px;
                }

                .doc-title {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    font-weight: 700;
                    color: #2d3436;
                    max-width: 70%;
                }

                .doc-title span {
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .doc-title i {
                    color: #0d6efd;
                }

                /* Status badge (reuse your status-* system) */
                .doc-status {
                    padding: 6px 14px;
                    border-radius: 999px;
                    font-size: 0.7rem;
                    font-weight: 700;
                    text-transform: uppercase;
                }

                /* Meta info */
                .recent-doc-meta {
                    display: flex;
                    gap: 100px;
                    margin-bottom: 12px;
                    flex-wrap: wrap;
                }

                .meta-label {
                    display: block;
                    font-size: 0.65rem;
                    text-transform: uppercase;
                    color: #6c757d;
                    font-weight: 600;
                }

                .meta-value {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-weight: 600;
                    color: #495057;
                    font-size: 0.9rem;
                }

                .meta-value i {
                    color: #adb5bd;
                }

                /* Note section */
                .recent-doc-note {
                    display: flex;
                    gap: 10px;
                    background: #f8f9fa;
                    border-radius: 10px;
                    padding: 10px 12px;
                    font-size: 0.85rem;
                    color: #495057;
                }

                .recent-doc-note i {
                    color: #0d6efd;
                    opacity: 0.6;
                }

                /* Clamp note to 2 lines */
                .recent-doc-note span {
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }

                                    .alert-card {
                        transition:
                            transform 0.25s ease,
                            box-shadow 0.25s ease,
                            background-color 0.25s ease;
                        cursor: pointer;
                    }

                    .alert-card:hover {
                        transform: translateY(-4px);
                        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.12);
                    }

                    /* Icon animation */
                    .alert-card i {
                        transition: transform 0.3s ease, opacity 0.3s ease;
                    }

                    .alert-card:hover i {
                        transform: scale(1.15);
                        opacity: 0.9;
                    }

                    /* Label highlight */
                    .alert-card .text-muted {
                        transition: color 0.25s ease, letter-spacing 0.25s ease;
                    }

                    .alert-card:hover .text-muted {
                        color: #212529;
                        letter-spacing: 0.3px;
                    }

                    /* Count emphasis */
                    .alert-card:hover .fw-bold {
                        transform: scale(1.05);
                    }

                                .dashboard-card {
                        position: relative;
                        transition: 
                            transform 0.25s ease,
                            box-shadow 0.25s ease,
                            background-color 0.25s ease;
                        cursor: pointer;
                    }

                    .dashboard-card:hover {
                        transform: translateY(-6px);
                        box-shadow: 0 12px 30px rgba(0, 0, 0, 0.12);
                    }

                    /* Icon animation */
                    .dashboard-card i {
                        transition: 
                            transform 0.3s ease,
                            opacity 0.3s ease;
                    }

                    .dashboard-card:hover i {
                        transform: scale(1.15) rotate(-4deg);
                        opacity: 0.9;
                    }

                    /* Optional subtle glow strip */
                    .dashboard-card::before {
                        content: "";
                        position: absolute;
                        inset: 0;
                        border-radius: 0.5rem;
                        background: linear-gradient(
                            135deg,
                            rgba(13, 110, 253, 0.08),
                            rgba(13, 202, 240, 0.08)
                        );
                        opacity: 0;
                        transition: opacity 0.3s ease;
                        pointer-events: none;
                    }

                    .dashboard-card:hover::before {
                        opacity: 1;
                    }
                    .card-label {
                        transition: 
                            color 0.25s ease,
                            letter-spacing 0.25s ease,
                            transform 0.25s ease;
                    }

                    /* Highlight only when card is hovered */
                    .dashboard-card:hover .card-label {
                        color: #0d6efd;               /* primary */
                        letter-spacing: 0.4px;
                        transform: translateX(2px);
                    }

                .grid-label {
                    font-size: 0.7rem;
                    color: #6c757d;
                    text-transform: uppercase;
                }

                .grid-value {
                    font-size: 0.95rem;
                    font-weight: 600;
                    color: #2d3436;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                /* Active Menu Link Styling */
                .menu-link.active {
                    background-color: #f1faff !important; /* Light blue tint */
                    border-bottom: 2px solid #0095ff !important;
                }

                .menu-link {
                    display: inline-flex;
                    align-items: center;
                    padding: 0.75rem 1.25rem;
                    border-radius: 10px;
                    transition: all 0.2s ease;
                    border: 1px solid transparent;
                }

                .menu-link:hover {
                    background-color: #f9fafb !important;
                    transform: translateY(-1px);
                }

                /* Ant Design Dropdown Customization */
                .ant-dropdown-menu {
                    min-width: 180px !important;
                    padding: 8px !important;
                }

                .ant-dropdown-menu-item:hover {
                    background-color: #f1faff !important;
                    border-radius: 6px;
                }
                @keyframes floating {
                    0% { transform: translateY(0px); }
                    50% { transform: translateY(-5px); }
                    100% { transform: translateY(0px); }
                    }

                    @keyframes gradientShift {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                    }

                    .welcome-animation {
                    animation: floating 3s ease-in-out infinite;
                    display: inline-block;
                    }

                    .animated-gradient-text {
                    background: linear-gradient(-45deg, #0d6efd, #6610f2, #0dcaf0, #0d6efd);
                    background-size: 300%;
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    animation: gradientShift 5s ease infinite;
                    font-weight: 800;
                    }
                    .activity-timeline {
                        transition: opacity 0.25s ease;
                    }
                    .transition-all {
                        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    }

                    .nav-pills .nav-link.active {
                        background-color: #0095E8; /* Your primary blue */
                    }

                    .timeline-item {
                        display: flex;
                        padding: 16px 20px;
                        border-bottom: 1px solid #f0f0f0;
                        transition: all 0.2s ease;
                    }

                    .timeline-item:hover {
                        background-color: #fcfcfc;
                    }

                    .status-indicator {
                        width: 6px;
                        border-radius: 10px;
                        margin-right: 20px;
                        flex-shrink: 0;
                    }

                    .log-grid {
                        display: grid;
                        grid-template-columns: 2fr 1fr 1fr; /* Distributes space: Doc Name gets more, User and Date get less */
                        gap: 15px;
                        width: 100%;
                        margin-top: 8px;
                    }

                    .grid-label {
                        font-size: 0.7rem;
                        text-transform: uppercase;
                        color: #a0a0a0;
                        font-weight: 700;
                        margin-bottom: 2px;
                        display: block;
                    }

                    .grid-value {
                        font-size: 0.85rem;
                        color: #434343;
                        display: block;
                        word-break: break-word;
                    }

                    .blurred {
                        filter: blur(2px);
                        pointer-events: none;
                    }
                    /* Hover only applies when screen > 768px */
                        @media (hover: hover) and (pointer: fine) {
                        .card-hover {
                            transition: transform 0.2s ease, box-shadow 0.2s ease;
                        }
                        .card-hover:hover {
                            transform: scale(1.05);
                            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
                            cursor: pointer;
                        }
                        }

                        .card-hover:active {
                        transform: scale(0.97);
                        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
                        }
                        .card-hover {
                            transition: transform 0.2s ease, box-shadow 0.2s ease;
                        }
                        .card-hover:hover {
                            transform: scale(1.03);
                            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
                            cursor: pointer;
                        }
                        .icon-hover {
                            transition: transform 0.3s ease;
                        }
                        .card-hover:hover .icon-hover {
                            transform: scale(1.2) rotate(5deg);
                        }

                       
                        button[data-bs-toggle="offcanvas"] {
                            position: relative;
                            z-index: 10; /* bring it above overlays */
                        }

                        .active-module .dropdown-item {
                            background-color: rgba(13, 110, 253, 0.1);
                            font-weight: 600;
                            border-radius: 4px;
                            transition: all 0.3s ease;
                        }

                        .active-module .dropdown-item span {
                            color: #0d6efd;
                        }
                        
                        .dropdown:hover .dropdown-menu {
                            display: block;
                        }
                        .module-item {
                            transition: background-color 0.3s ease, transform 0.2s ease;
                            border-radius: 6px;
                            padding: 8px 12px;
                        }

                        /* Hover animation */
                        .module-item:hover {
                            background-color: #f1f5f9; /* soft gray */
                            transform: scale(1.03);   /* subtle zoom instead of shift */
                            color: #0d6efd;           /* highlight text */
                        }

                        /* Make icon animate separately */
                        .module-item i {
                            transition: transform 0.3s ease;
                        }

                        .module-item:hover i {
                            transform: rotate(10deg) scale(1.2); /* playful hover effect */
                        }
                        .status-badge {
                            display: inline-block;
                            padding: 6px 14px;
                            font-size: 0.75rem;
                            font-weight: 700;
                            letter-spacing: 0.6px;
                            text-transform: uppercase;
                            border-radius: 999px;
                            border: 1px solid transparent;
                            white-space: nowrap;
                            transition: transform 0.2s ease, box-shadow 0.2s ease;
                        }
                            .status-badge:hover {
                            transform: translateY(-1px);
                            box-shadow: 0 4px 10px rgba(0,0,0,0.08);
                        }
                        .status-warning {
                            background-color: #fff3cd;
                            color: #856404;
                            border-color: #ffeeba;
                        }

                        .status-info {
                            background-color: #e7f3ff;
                            color: #0d6efd;
                            border-color: #b6d4fe;
                        }

                        .status-primary {
                            background-color: #e7f1ff;
                            color: #0a58ca;
                            border-color: #cfe2ff;
                        }

                        .status-success {
                            background-color: #e6f4ea;
                            color: #198754;
                            border-color: #badbcc;
                        }

                        .status-danger {
                            background-color: #fdecea;
                            color: #dc3545;
                            border-color: #f5c2c7;
                        }

                        .status-secondary {
                            background-color: #f1f3f5;
                            color: #495057;
                            border-color: #dee2e6;
                        }

                        /* Custom Purple */
                        .status-purple {
                            background-color: #f3e9ff;
                            color: #6f42c1;
                            border-color: #d6c1ff;
                        }

    `}
            </style>

        </Base1>
    )
}