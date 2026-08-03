import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import '../../Config/Loader.css';
import Base1 from '../../Config/Base1';
import { fetchWithAuth } from "../../../utils/api";
import Swal from 'sweetalert2';
import { useLocation } from "react-router-dom";
import { Dropdown, Menu, Tooltip, Select } from 'antd';
import { getKPIsByPeriod, getPerformancePeriods, getReviewCycles, getReviewCyclesByUser } from '../services/kpiServices';

const { Option } = Select;

export default function MyKPIs() {

    const navigate = useNavigate();
    const location = useLocation();
    const [sessionUserData, setsessionUserData] = useState({});
    const [sessionActionIds, setSessionActionIds] = useState([]);
    const [loading, setLoading] = useState(false);
    const [kpiPeriodsData, setKPIPeriodsData] = useState([]);
    const [empKPIData, setEmpKPIData] = useState([]);
    const [modules, setModules] = useState([]);
    const [menuData, setMenuData] = useState([]);
    const [reviewCycleData, setReviewCycleData] = useState([]);

    useEffect(() => {
        const userDataString = sessionStorage.getItem("userData");
        if (userDataString) {
            const userData = JSON.parse(userDataString);
            setsessionUserData(userData);
            setSelectedEmployee(userData?.Id || null);
            setSelectedPeriod(userData?.PeriodId);
        } else {
            navigate("/");
        }
    }, [navigate]);

    const SESSION_KEY = "kpi_emp_review_filters";
    const savedFilters = JSON.parse(
        sessionStorage.getItem(SESSION_KEY) || "{}"
    );

    const [selectedEmployee, setSelectedEmployee] = useState(sessionUserData?.Id);

    const [selectedPeriod, setSelectedPeriod] = useState(
        savedFilters.periodId || sessionUserData?.PeriodId
    );

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

    const fetchPerformancePeriods = async () => {
        try {
            setLoading(true);
    
            const sessionKey = `performancePeriods_${sessionUserData?.OrgId}`;
    
            // Check session storage first
            const storedPeriods = sessionStorage.getItem(sessionKey);
    
            if (storedPeriods) {
                setKPIPeriodsData(JSON.parse(storedPeriods));
                return;
            }
    
            // Fetch from API if not available
            const response = await getPerformancePeriods({
                orgId: sessionUserData?.OrgId,
            });
    
            const periods = response?.data || [];
    
            // Save to session storage
            sessionStorage.setItem(sessionKey, JSON.stringify(periods));
    
            // Update state
            setKPIPeriodsData(periods);
    
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchKPIsByPeriod = async () => {
        try {
            setLoading(true);

            const response = await getKPIsByPeriod({
                orgId: sessionUserData?.OrgId,
                employeeId: selectedEmployee,
                periodId: selectedPeriod,
            });

            setEmpKPIData(response?.data || []);

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchReviewCycles = async () => {
        try {
            setLoading(true);

            const response = await getReviewCyclesByUser({
                orgId: sessionUserData?.OrgId,
                periodId: selectedPeriod,
                employeeId: sessionUserData?.Id
            });

            setReviewCycleData(response?.data || []);

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (sessionUserData?.OrgId) {
            fetchPerformancePeriods();
        }
    }, [sessionUserData?.OrgId]);

    useEffect(() => {
        if (selectedEmployee && selectedPeriod && sessionUserData?.OrgId) {
            fetchKPIsByPeriod();
        } else {
            setEmpKPIData([]);
        }

        sessionStorage.setItem(
            SESSION_KEY,
            JSON.stringify({
                employeeId: sessionUserData?.Id,
                periodId: selectedPeriod
            })
        );
    }, [selectedEmployee, selectedPeriod, sessionUserData?.OrgId]);

    useEffect(() => {
        if (selectedPeriod && sessionUserData?.OrgId) {
            fetchReviewCycles();
        } else {
            setReviewCycleData([]);
        }
    }, [selectedPeriod, sessionUserData?.OrgId]);


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
                        <div className="mb-5">
                            <div className="d-flex justify-content-between align-items-center flex-wrap">
                                <div className="d-flex align-items-center">
                                    <div
                                        className="rounded-circle bg-light-primary d-flex align-items-center justify-content-center me-3"
                                        style={{
                                            width: 58,
                                            height: 58
                                        }}
                                    >
                                        <i className="bi bi-clipboard2-check-fill text-primary fs-2"></i>
                                    </div>
                                    <div>
                                        <h2 className="fw-bold mb-1">
                                            My KPI Review Dashboard
                                        </h2>
                                    </div>
                                </div>

                                <div className="d-flex align-items-center gap-2 mt-3 mt-md-0">
                                    <span className="badge bg-light-primary text-primary px-4 py-2 rounded-pill">
                                        <i className="bi bi-bullseye text-primary me-1"></i>
                                        Assigned KPIs
                                    </span>
                                    <span className="badge bg-light-success text-success px-4 py-2 rounded-pill">
                                        <i className="bi bi-calendar3 text-success me-1"></i>
                                        Review Cycles
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="card border-0 shadow-sm rounded-4 mb-5">
                            <div className="card-body p-4">
                                <div className="d-flex justify-content-between align-items-center mb-4">
                                    <div>
                                        <h4 className="fw-bold mb-1">
                                            <i className="bi bi-funnel-fill text-primary me-2"></i>
                                            Review Filters
                                        </h4>
                                        <span className="text-muted">
                                            Select a performance period to view your assigned KPIs and review cycles.
                                        </span>
                                    </div>
                                    {selectedPeriod && (
                                        <span className="badge bg-light-success text-success px-4 py-2 rounded-pill">
                                            <i className="bi bi-calendar-check me-1 text-success"></i>
                                            Active Period
                                        </span>
                                    )}
                                </div>
                                <div className="row align-items-end">
                                    <div className="col-lg-5">
                                        <label className="form-label fw-bold mb-2">
                                            Performance Period
                                        </label>
                                        <Select
                                            size="large"
                                            showSearch
                                            allowClear
                                            placeholder="Select Performance Period"
                                            value={selectedPeriod || undefined}
                                            style={{ width: "100%" }}
                                            optionFilterProp="children"
                                            onChange={(value) => setSelectedPeriod(value || "")}
                                        >
                                            {kpiPeriodsData?.map((period) => (
                                                <Option
                                                    key={period.Id}
                                                    value={period.Id}
                                                >
                                                    📅 {period.PeriodName}
                                                </Option>
                                            ))}
                                        </Select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Assigned KPIs */}
                        {selectedPeriod && (
                            <div className="card border-0 shadow-sm mt-5">
                                <div className="card-header border-0 pt-5">
                                    <div className="d-flex align-items-center w-100">
                                        <div>
                                            <h3 className="fw-bold mb-1">
                                                Assigned KPIs
                                            </h3>
                                            <span className="text-muted fs-7">
                                                KPIs allocated for the selected employee and performance period
                                            </span>
                                        </div>

                                        <div className="ms-auto">
                                            <div className="card bg-light-primary border-0 px-4 py-3">
                                                <div className="text-muted fs-8">
                                                    Total KPIs
                                                </div>

                                                <div className="fs-2 fw-bold text-primary">
                                                    {empKPIData.length}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="card-body">
                                    <div className="table-responsive">
                                        <table className="table table-row-bordered table-hover align-middle gs-0 gy-4">
                                            <thead className="bg-light-primary">
                                                <tr className="fw-bold text-gray-700">
                                                    <th width="60">#</th>
                                                    <th>KPI Name</th>
                                                    <th>Target</th>
                                                    <th>Weightage</th>
                                                    <th width="100">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {loading ? (
                                                    <tr>
                                                        <td colSpan={5} className="text-center py-5">
                                                            Loading...
                                                        </td>
                                                    </tr>

                                                ) : empKPIData.length > 0 ? (
                                                    empKPIData.map((item, index) => (
                                                        <tr key={item.Id}>
                                                            <td>{index + 1}</td>
                                                            <td>
                                                                <div className="d-flex align-items-center">
                                                                    <div
                                                                        className="symbol symbol-40px me-3"
                                                                    >
                                                                        <div className="symbol-label bg-light-primary">
                                                                            <i className="fa fa-bullseye text-primary"></i>
                                                                        </div>
                                                                    </div>
                                                                    <div>
                                                                        <div className="fw-bold">
                                                                            {item.KPIName}
                                                                        </div>

                                                                        <small className="text-muted">
                                                                            KPI ID : {item.KPIId}
                                                                        </small>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td>
                                                                <span className="badge badge-light-info">
                                                                    {item.Target}
                                                                </span>
                                                            </td>
                                                            <td>
                                                                <span className="badge badge-light-success">
                                                                    {item.Weightage}%
                                                                </span>
                                                            </td>
                                                            <td>

                                                                <button className="btn btn-icon btn-light-primary btn-sm">
                                                                    <i className="fa fa-eye"></i>
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))

                                                ) : (
                                                    <tr>
                                                        <td colSpan={5} className="text-center py-5">
                                                            <img
                                                                src="/media/illustrations/sketchy-1/5.png"
                                                                alt=""
                                                                style={{
                                                                    width: "120px"
                                                                }}
                                                            />

                                                            <h5 className="mt-3">
                                                                No KPIs Found
                                                            </h5>
                                                            <span className="text-muted">
                                                                No KPI has been allocated for the selected employee.
                                                            </span>
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Review Cycles */}
                        {selectedPeriod && (
                            <div className="card border-0 shadow-sm rounded-4 my-5">
                                <div className="card-header bg-white border-0 px-5 py-4 d-flex justify-content-between align-items-center">
                                    <div>
                                        <h3 className="fw-bold mb-1">
                                            <i className="bi bi-calendar2-week text-primary me-2"></i>
                                            Review Cycles
                                        </h3>
                                        <small className="text-muted">
                                            Click any quarter to view review details
                                        </small>
                                    </div>
                                    <span className="badge bg-light-primary text-primary px-4 py-2 rounded-pill">
                                        {reviewCycleData?.length} Cycles
                                    </span>
                                </div>

                                <div className="card-body px-5 pb-5">
                                    <div className="row g-4">
                                        {reviewCycleData?.length > 0 ? (
                                            reviewCycleData.map((quarter, index) => {
                                                const colors = ["#2563eb", "#16a34a", "#f59e0b", "#dc2626"];

                                                return (
                                                    <div className="col-lg-3 col-md-6" key={quarter.Id} disabled={quarter?.Status !== "OPEN"}>
                                                        <Tooltip
                                                            title={
                                                                quarter.Status !== "OPEN"
                                                                    ? "This review cycle is not yet released."
                                                                    : ""
                                                            }
                                                        >
                                                            <div
                                                                className={`review-cycle-card ${quarter.Status !== "OPEN" ? "review-card-disabled cursor-not-allowed" : ""
                                                                    }`}
                                                                onClick={() => {
                                                                    if (quarter.Status !== "OPEN") return;

                                                                    navigate("/kpi/employee-review", {
                                                                        state: {
                                                                            quarterId: quarter.Id,
                                                                            quarterName: quarter.CycleName,
                                                                            employeeId: selectedEmployee,
                                                                            periodId: selectedPeriod
                                                                        }
                                                                    });
                                                                }}
                                                            >
                                                                <div className="d-flex justify-content-between align-items-start">
                                                                    <div
                                                                        className="cycle-icon"
                                                                        style={{
                                                                            background: `${colors[index]}15`,
                                                                            color: colors[index]
                                                                        }}
                                                                    >
                                                                        <i className="bi bi-calendar-event-fill text-dark"></i>
                                                                    </div>
                                                                    <span
                                                                        className={`review-status ${quarter.Status === "OPEN"
                                                                            ? "review-status-released"
                                                                            : "review-status-draft"
                                                                            }`}
                                                                    >
                                                                        <span className="status-dot"></span>
                                                                        {quarter.Status}
                                                                    </span>
                                                                </div>
                                                                <h3 className="fw-bold mt-4 mb-2">
                                                                    {quarter.CycleName}
                                                                </h3>
                                                                <div className="text-muted small mb-3">
                                                                    Quarterly Performance Review
                                                                </div>
                                                                <div className="cycle-info">
                                                                    <div>
                                                                        <i className="bi bi-calendar-range me-2 text-primary"></i>
                                                                        {new Date(quarter.StartDate).toLocaleDateString("en-GB")}
                                                                        {" - "}
                                                                        {new Date(quarter.EndDate).toLocaleDateString("en-GB")}
                                                                    </div>

                                                                    <Tooltip
                                                                        title={quarter.Comments || "No Comments"}
                                                                        placement="topLeft"
                                                                    >
                                                                        <div className="review-comment-box mt-3">
                                                                            <i className="bi bi-chat-left-quote-fill text-warning me-2"></i>

                                                                            <span>
                                                                                {quarter.Comments
                                                                                    ? quarter.Comments.length > 45
                                                                                        ? `${quarter.Comments.substring(0, 45)}...`
                                                                                        : quarter.Comments
                                                                                    : "No Comments"}
                                                                            </span>
                                                                        </div>
                                                                    </Tooltip>
                                                                </div>
                                                                <div className="mt-4 text-end">
                                                                    <span className="view-details-btn">
                                                                        View Details
                                                                        <i className="bi bi-arrow-right-short text-primary"></i>
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </Tooltip>
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <div className="col-12">
                                                <div className="card border-0 shadow-sm rounded-4">
                                                    <div className="card-body d-flex flex-column justify-content-center align-items-center py-5">
                                                        <div className="empty-review-icon mb-4">
                                                            <i className="bi bi-calendar2-x"></i>
                                                        </div>

                                                        <h3 className="fw-bold mb-2">
                                                            No Review Cycles Available
                                                        </h3>

                                                        <p
                                                            className="text-muted text-center mb-4"
                                                            style={{ maxWidth: 500 }}
                                                        >
                                                            No review cycles have been created or released for the selected performance period.
                                                        </p>

                                                        <span className="badge bg-light-primary text-primary px-4 py-2 rounded-pill">
                                                            <i className="bi bi-info-circle me-2"></i>
                                                            Waiting for Review Cycle
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <style>
                {`
                .ant-select-selector{
                    border-radius:12px !important;
                    min-height:48px !important;
                    border:1px solid #dbe4f0 !important;
                    box-shadow:0 2px 10px rgba(0,0,0,.04);
                    transition:.25s;
                }

                .ant-select-focused .ant-select-selector{
                    border-color:#2563eb !important;
                    box-shadow:0 0 0 4px rgba(37,99,235,.12) !important;
                }

                .ant-select-selection-placeholder{
                    color:#94a3b8 !important;
                }

                .ant-select-selection-item{
                    font-weight:600;
                }

                .ant-select-arrow{
                    color:#2563eb !important;
                }
                .review-comment-box{
                    display:flex;
                    align-items:flex-start;
                    gap:8px;
                    background:#fffbeb;
                    border:1px solid #fde68a;
                    border-left:4px solid #f59e0b;
                    border-radius:10px;
                    padding:10px 12px;
                    font-size:13px;
                    color:#78350f;
                    cursor:pointer;
                    transition:.25s;
                    line-height:1.4;
                }

                .review-comment-box:hover{
                    background:#fef3c7;
                    transform:translateX(2px);
                    box-shadow:0 8px 18px rgba(245,158,11,.15);
                }

                .review-comment-box i{
                    margin-top:2px;
                    flex-shrink:0;
                    font-size:15px;
                }
                    .review-cycle-card{
                        background:#fff;
                        border-radius:18px;
                        padding:24px;
                        cursor:pointer;
                        transition:.3s;
                        box-shadow:0 10px 25px rgba(15,23,42,.05);
                        height:100%;
                    }

                    .review-cycle-card:hover{
                        transform:translateY(-6px);
                        box-shadow:0 20px 45px rgba(15,23,42,.12);
                    }

                    .cycle-icon{
                        width:55px;
                        height:55px;
                        border-radius:16px;
                        display:flex;
                        align-items:center;
                        justify-content:center;
                        font-size:24px;
                    }
                        .review-card-disabled{
                        opacity:.65;
                        filter:grayscale(.2);
                        pointer-events:auto;
                    }

                    .review-card-disabled:hover{
                        transform:none !important;
                        box-shadow:none !important;
                    }

                    .cycle-info{
                        font-size:13px;
                        color:#64748b;
                        line-height:1.8;
                    }

                    .view-details-btn{
                        font-weight:600;
                        color:#2563eb;
                    }

                    .view-details-btn i{
                        transition:.25s;
                    }

                    .review-cycle-card:hover .view-details-btn i{
                        transform:translateX(5px);
                    }
                    
                    .review-status{
                        display:inline-flex;
                        align-items:center;
                        justify-content:center;
                        gap:8px;
                        min-width:110px;
                        height:34px;
                        padding:0 14px;
                        border-radius:50px;
                        font-size:12px;
                        font-weight:700;
                        letter-spacing:.4px;
                        transition:.25s;
                    }

                    .review-status-released{
                        background:#ecfdf3;
                        color:#15803d;
                        border:1px solid #bbf7d0;
                    }

                    .review-status-draft{
                        background:#fff7ed;
                        color:#c2410c;
                        border:1px solid #fed7aa;
                    }

                    .status-dot{
                        width:8px;
                        height:8px;
                        border-radius:50%;
                    }

                    .review-status-released .status-dot{
                        background:#22c55e;
                        box-shadow:0 0 8px rgba(34,197,94,.6);
                    }

                    .review-status-draft .status-dot{
                        background:#f59e0b;
                        box-shadow:0 0 8px rgba(245,158,11,.6);
                    }

                    .review-cycle-card:hover .review-status{
                        transform:scale(1.05);
                    }
                `}
            </style>

            {/* <MyReviewCycleModal
                open={reviewModalOpen}
                onCancel={() => setReviewModalOpen(false)}
                quarter={selectedQuarter}
                userId={selectedEmployee}
                periodId={selectedPeriod}
                sessionUserData={sessionUserData}
            /> */}
        </Base1>
    )
}