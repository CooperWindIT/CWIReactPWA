import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import '../../Config/Loader.css';
import Base1 from '../../Config/Base1';
import { fetchWithAuth } from "../../../utils/api";
import Swal from 'sweetalert2';
import { Dropdown, Menu, Select, Tooltip, message, Input } from 'antd';
import { getKPIsByPeriod, getPerformancePeriods, getUsersByMngrId, getReviewCyclesByUser, saveEmployeeKPIs, saveAnnualScore } from '../services/kpiServices';

export default function EmployeeKpi() {

    const navigate = useNavigate();
    const location = useLocation();
    const [sessionUserData, setsessionUserData] = useState({});
    const [sessionActionIds, setSessionActionIds] = useState([]);
    const [loading, setLoading] = useState(false);
    const [employeesData, setEmployeesData] = useState([]);
    const [kpiPeriodsData, setKPIPeriodsData] = useState([]);
    const [empKPIData, setEmpKPIData] = useState([]);
    const [modules, setModules] = useState([]);
    const [menuData, setMenuData] = useState([]);
    const [reviewCycleData, setReviewCycleData] = useState([]);
    const [selectedEmployeeName, setSelectedEmployeeName] = useState("");
    const [sessionModuleId, setSessionModuleId] = useState(null);
    const [openAllocationEdit, setOpenAllocationEdit] = useState(false);
    const [selectedAllocation, setSelectedAllocation] = useState(null);
    const [saving, setSaving] = useState(false);
    const [editableKPIs, setEditableKPIs] = useState([]);

    const SESSION_KEY = "kpi_review_filters";
    const savedFilters = JSON.parse(
        sessionStorage.getItem(SESSION_KEY) || "{}"
    );

    const [selectedEmployee, setSelectedEmployee] = useState(
        savedFilters.employeeId || ""
    );

    const [selectedPeriod, setSelectedPeriod] = useState(
        savedFilters.periodId || sessionUserData?.PeriodId
    );

    useEffect(() => {
        const userDataString = sessionStorage.getItem("userData");
        if (userDataString) {
            const userData = JSON.parse(userDataString);
            setsessionUserData(userData);
            setSelectedPeriod(userData?.PeriodId);

            const storedModule = JSON.parse(localStorage.getItem("ModuleData"));
            const moduleId = storedModule?.Id?.toString();
            setSessionModuleId(moduleId);
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
                (item) => item.MenuName === "KPI Master"
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

    const fetchUsersByMngrId = async () => {
        try {
            setLoading(true);

            const sessionKey = `employees_${sessionUserData?.OrgId}_${sessionUserData?.Id}`;

            // Check session storage first
            const storedEmployees = sessionStorage.getItem(sessionKey);

            if (storedEmployees) {
                setEmployeesData(JSON.parse(storedEmployees));
                return;
            }

            // Fetch from API if not available
            const response = await getUsersByMngrId({
                orgId: sessionUserData?.OrgId,
                managerId: sessionUserData?.Id
            });

            const employees = response?.data || [];

            // Save to session storage
            sessionStorage.setItem(sessionKey, JSON.stringify(employees));

            // Update state
            setEmployeesData(employees);

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
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
            setEditableKPIs(response?.data);

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
                employeeId: selectedEmployee,
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
            fetchUsersByMngrId();
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
                employeeId: selectedEmployee,
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

    useEffect(() => {
        if (!selectedEmployee || employeesData.length === 0) return;

        const employee = employeesData.find(
            emp => emp.Id === selectedEmployee
        );

        setSelectedEmployeeName(employee?.Name || "");

    }, [selectedEmployee, employeesData]);

    const updateField = (index, field, value) => {

        const newValue = Number(value) || 0;

        setEditableKPIs(prev => {

            const updated = [...prev];

            // Target Validation (Individual)
            if (field === "Target") {

                if (newValue > 100) {
                    message.warning("Target cannot be greater than 100.");
                    return prev;
                }

                updated[index].Target = newValue;
            }

            // Weightage Validation (Total)
            if (field === "Weightage") {

                const totalWeightage = updated.reduce((sum, item, i) => {
                    if (item.IsActive === 0) return sum;

                    return sum + (i === index ? newValue : Number(item.Weightage || 0));
                }, 0);

                if (totalWeightage > 100) {
                    message.warning("Total Weightage cannot exceed 100%.");
                    return prev;
                }

                updated[index].Weightage = newValue;
            }

            return updated;
        });

    };

    const removeKPI = (index) => {

        setEditableKPIs(prev =>
            prev.map((item, i) =>
                i === index
                    ? {
                        ...item,
                        IsActive: 0
                    }
                    : item
            )
        );

    };

    const handleAnnualScore = async () => {

        const payload = {
            OrgId: sessionUserData.OrgId,
            UserId: sessionUserData.Id,
            PeriodId: Number(selectedPeriod),
            AnnualScore: 90.75,
            ReviewCount: 4,
            FinalRating: "Excellent",
            CreatedBy: sessionUserData.Id,
            UpdatedBy: sessionUserData.Id
        };

        try {
            setLoading(true);
            const response = await saveAnnualScore(payload);
            if (response?.success) {
                message.success("Annual score generated successfully.");
            } else {
                message.error(response?.message || "Failed to generate annual score.");
            }

        } catch (error) {
            console.error(error);
            message.error("Something went wrong.");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateAll = async () => {

        const activeKPIs = editableKPIs.filter(item => item.IsActive === 1);

        // Individual Target Validation
        for (const item of activeKPIs) {

            if (Number(item.Target) > 100) {
                message.warning(
                    `${item.KPIName}: Target cannot be greater than 100.`
                );
                return;
            }

        }

        // Total Weightage Validation
        const totalWeightage = activeKPIs.reduce(
            (sum, item) => sum + Number(item.Weightage || 0),
            0
        );

        if (totalWeightage !== 100) {
            message.warning(
                `Total Weightage should be exactly 100%. Current: ${totalWeightage}%`
            );
            return;
        }

        const payload = {
            OrgId: sessionUserData.OrgId,
            UserId: sessionUserData.Id,
            Type: "EDIT",
            JsonData: {
                Mappings: editableKPIs.map(item => ({
                    Id: item.Id,
                    TargetValue: Number(item.Target),
                    Weightage: Number(item.Weightage),
                    IsActive: item.IsActive
                }))
            }
        };

        try {

            setSaving(true);

            const response = await saveEmployeeKPIs(payload);

            if (response?.success) {
                message.success("KPIs updated successfully.");
                fetchKPIsByPeriod();
            } else {
                message.error(response?.message);
            }

        } finally {
            setSaving(false);
        }
    };

    const showEdit = sessionActionIds?.includes(3);
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
                        {/* Employee Selection */}
                        <div className="card border-0 shadow-sm rounded-4 mb-5">
                            <div className="card-header bg-white border-0 pt-4 pb-2">
                                <div className="row align-items-center w-100">
                                    <div className="col-lg-8">
                                        <h3 className="fw-bold mb-1 d-flex align-items-center">
                                            <i className="bi bi-people-fill text-primary me-2 fs-3"></i>
                                            Employee KPI Management
                                        </h3>
                                        <p className="text-muted mb-0">
                                            Select an employee and performance period to view or manage KPI allocations.
                                        </p>
                                    </div>
                                    <div className="col-lg-4 text-lg-end mt-3 mt-lg-0">
                                        <Link
                                            to="/kpi/allocate-kpi"
                                            className="btn btn-primary btn-lg allocate-btn btn-sm"
                                        >
                                            <i className="bi bi-plus-circle-fill me-2"></i>
                                            Allocate KPI
                                        </Link>
                                    </div>
                                </div>
                            </div>

                            <div className="card-body pt-3">
                                <div className="row g-4">
                                    <div className="col-lg-5">
                                        <label className="form-label fw-bold">
                                            <i className="bi bi-person-workspace text-primary me-2"></i>
                                            Employee
                                        </label>
                                        <Select
                                            showSearch
                                            size="large"
                                            placeholder="Select Employee"
                                            value={selectedEmployee || undefined}
                                            style={{ width: "100%" }}
                                            optionFilterProp="children"
                                            onChange={(value) => setSelectedEmployee(value)}
                                        >
                                            {employeesData?.map(emp => (
                                                <Select.Option
                                                    key={emp.Id}
                                                    value={emp.Id}
                                                >
                                                    {emp.Name}
                                                </Select.Option>
                                            ))}
                                        </Select>
                                    </div>
                                    <div className="col-lg-5">
                                        <label className="form-label fw-bold">
                                            <i className="bi bi-calendar3 text-success me-2"></i>
                                            Performance Period
                                        </label>
                                        <Select
                                            showSearch
                                            size="large"
                                            placeholder="Select Performance Period"
                                            value={selectedPeriod || undefined}
                                            style={{ width: "100%" }}
                                            optionFilterProp="children"
                                            onChange={(value) => setSelectedPeriod(value)}
                                        >
                                            {kpiPeriodsData?.map(period => (
                                                <Select.Option
                                                    key={period.Id}
                                                    value={period.Id}
                                                >
                                                    {period.PeriodName}
                                                </Select.Option>
                                            ))}
                                        </Select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Assigned KPIs */}
                        {/* {selectedEmployee && selectedPeriod && (
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
                                                    <th width="60" className='text-center'>#</th>
                                                    <th style={{ width: "28%" }}>KPI Name</th>
                                                    <th width="110">UoM</th>
                                                    <th width="110" className="text-center">Objective</th>
                                                    <th width="110" className="text-center">Target</th>
                                                    <th width="130" className="text-center">Weightage</th>
                                                    <th width="100" className="text-center">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {loading ? (
                                                    <tr>
                                                        <td colSpan={9} className="text-center py-5">
                                                            Loading...
                                                        </td>
                                                    </tr>
                                                ) : editableKPIs.length > 0 ? (
                                                    <>
                                                        {editableKPIs.map((item, index) => (
                                                            <tr
                                                                key={item.Id}
                                                                className={item.IsActive === 0 ? "table-danger opacity-50" : ""}
                                                            >
                                                                <td className="text-center fw-bold">{index + 1}</td>
                                                                <td>
                                                                    <div className="d-flex align-items-center">
                                                                        <div className="symbol symbol-40px me-3">
                                                                            <div className="symbol-label bg-light-primary">
                                                                                <i className="fa fa-bullseye text-primary"></i>
                                                                            </div>
                                                                        </div>
                                                                        <div>
                                                                            <div className="fw-bold">{item.KPIName}</div>
                                                                            <small className="text-muted">KPI ID : {item.KPIId}</small>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td>
                                                                    <div className="d-inline-flex align-items-center px-3 py-2 rounded-3 bg-light">
                                                                        <i className="bi bi-speedometer2 text-primary me-2"></i>
                                                                        <span className="fw-semibold text-dark">{item.UOMName}</span>
                                                                    </div>
                                                                </td>
                                                                <td style={{ maxWidth: "230px" }}>
                                                                    <Tooltip
                                                                        title={item.Objectives || "No Objective"}
                                                                        placement="topLeft"
                                                                        overlayStyle={{ maxWidth: 350 }}
                                                                    >
                                                                        <span
                                                                            className="text-muted"
                                                                            style={{
                                                                                cursor: "pointer",
                                                                                display: "inline-block",
                                                                                whiteSpace: "nowrap",
                                                                                overflow: "hidden",
                                                                                textOverflow: "ellipsis",
                                                                                maxWidth: "200px"
                                                                            }}
                                                                        >
                                                                            {item.Objectives
                                                                                ? item.Objectives.length > 26
                                                                                    ? `${item.Objectives.substring(0, 26)}...`
                                                                                    : item.Objectives
                                                                                : "-"}
                                                                        </span>
                                                                    </Tooltip>
                                                                </td>
                                                                <td className="text-center">
                                                                    <Input
                                                                        type="number"
                                                                        size="small"
                                                                        value={item.Target}
                                                                        onChange={(e) => updateField(index, "Target", e.target.value)}
                                                                    />
                                                                </td>
                                                                <td className="text-center">
                                                                    <Input
                                                                        type="number"
                                                                        size="small"
                                                                        value={item.Weightage}
                                                                        onChange={(e) => updateField(index, "Weightage", e.target.value)}
                                                                    />
                                                                </td>
                                                                <td className="text-center">
                                                                    <button
                                                                        className="btn btn-icon btn-light-danger btn-sm rounded-circle"
                                                                        onClick={() => removeKPI(index)}
                                                                    >
                                                                        <i className="fa fa-trash"></i>
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}

                                                        <tr>
                                                            <td colSpan={9} className="text-end pt-4">
                                                                <button
                                                                    className="btn btn-primary px-5"
                                                                    onClick={handleUpdateAll}
                                                                    disabled={saving}
                                                                >
                                                                    {saving ? (
                                                                        <>
                                                                            <span className="spinner-border spinner-border-sm me-2"></span>
                                                                            Updating...
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <i className="bi bi-check2-circle me-2"></i>
                                                                            Update KPI Allocation
                                                                        </>
                                                                    )}
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    </>
                                                ) : (
                                                    <tr>
                                                        <td colSpan={9} className="text-center py-5">
                                                            <img
                                                                src="/media/illustrations/sketchy-1/5.png"
                                                                alt=""
                                                                style={{ width: "120px" }}
                                                            />
                                                            <h5 className="mt-3">No KPIs Found</h5>
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
                        )} */}

                          {/* {(selectedPeriod && selectedEmployee) && (
                                <div className="card border-0 shadow-sm rounded-4 my-5 col-12 col-md-6">
                                    <div className="card-header bg-white border-0 px-5 py-4">
                                        <div className="d-flex justify-content-between align-items-center w-100">
                                            <div>
                                                <h3 className="fw-bold mb-1">
                                                    <i className="bi bi-calendar2-week text-primary me-2"></i>
                                                    Review Cycles
                                                </h3>
                                                <small className="text-muted">
                                                    Click any quarter to view review details
                                                </small>
                                            </div>
                                            <div className="d-flex align-items-center gap-3">
                                                <button
                                                    className="btn btn-warning btn-sm shadow-sm"
                                                    onClick={handleAnnualScore}
                                                >
                                                    <i className="bi bi-stars me-1"></i>
                                                    Get Annual Score
                                                </button>
                                                <span className="badge bg-light-primary text-primary px-4 py-2 rounded-pill">
                                                    {reviewCycleData?.length} Cycle{reviewCycleData?.length !== 1 ? "s" : ""}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="card-body px-5 pb-5">
                                        <div className="row g-4">
                                            {reviewCycleData?.length > 0 ? (
                                                reviewCycleData.map((quarter, index) => {
                                                    const colors = ["#2563eb", "#16a34a", "#f59e0b", "#dc2626"];
                                                    return (
                                                        <div className="col-lg-3 col-md-6 col-12" key={quarter.Id} disabled={quarter?.Status !== "OPEN"}>
                                                            <Tooltip
                                                                title={
                                                                    quarter.Status !== "OPEN"
                                                                        ? "This review cycle is not yet released."
                                                                        : ""
                                                                }
                                                            >
                                                                <div
                                                                    className={`review-cycle-card ${quarter.Status !== "OPEN"
                                                                        ? "review-card-disabled cursor-not-allowed"
                                                                        : ""
                                                                        }`}
                                                                    style={{
                                                                        borderTop: `5px solid ${colors[index % colors.length]}`
                                                                    }}
                                                                    onClick={() => {
                                                                        if (quarter.Status !== "OPEN") return;

                                                                        navigate("/kpi/manager-review", {
                                                                            state: {
                                                                                quarterId: quarter.Id,
                                                                                quarterName: quarter.CycleName,
                                                                                employeeId: selectedEmployee,
                                                                                employeeName: selectedEmployeeName,
                                                                                periodId: selectedPeriod
                                                                            }
                                                                        });
                                                                    }}
                                                                >
                                                                    <div className="d-flex justify-content-between align-items-start">

                                                                        <div
                                                                            className="cycle-icon"
                                                                            style={{
                                                                                background: `${colors[index % colors.length]}15`,
                                                                                color: colors[index % colors.length]
                                                                            }}
                                                                        >
                                                                            <i className="bi bi-calendar-event-fill text-dark"></i>
                                                                        </div>

                                                                        <div className="text-end">
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
                                                                    <div className="mt-4 d-flex justify-content-between align-items-center">
                                                                        <span className="badge bg-light-success text-success px-3 py-2">
                                                                            <i className="bi bi-award-fill me-2 text-success"></i>
                                                                            {Number(quarter.CycleScore ?? 0).toFixed(2)} Score
                                                                        </span>
                                                                        <span className="view-details-btn">
                                                                            View Details
                                                                            <i className="bi bi-arrow-right-short text-primary ms-1"></i>
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
                            )} */}

                        <div className='row'>
                            {/* Review Cycles */}
                            {(selectedPeriod && selectedEmployee) && (
                                <div className="card border-0 shadow-sm rounded-4 my-5 col-12 col-md-6">
                                    <div className="card-header bg-white border-0 px-5 py-4">
                                        <div className="d-flex justify-content-between align-items-center w-100">
                                            <div>
                                                <h3 className="fw-bold mb-1">
                                                    <i className="bi bi-calendar2-week text-primary me-2"></i>
                                                    Review Cycles
                                                </h3>
                                                <small className="text-muted">
                                                    Click any quarter to view review details
                                                </small>
                                            </div>
                                            <div className="d-flex align-items-center gap-3">
                                                <button
                                                    className="btn btn-warning btn-sm shadow-sm"
                                                    onClick={handleAnnualScore}
                                                >
                                                    <i className="bi bi-stars me-1"></i>
                                                    Get Annual Score
                                                </button>
                                                <span className="badge bg-light-primary text-primary px-4 py-2 rounded-pill">
                                                    {reviewCycleData?.length} Cycle{reviewCycleData?.length !== 1 ? "s" : ""}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="card-body px-5 pb-5">
                                        <div className="row g-4">
                                            {reviewCycleData?.length > 0 ? (
                                                reviewCycleData.map((quarter, index) => {
                                                    const colors = ["#2563eb", "#16a34a", "#f59e0b", "#dc2626"];
                                                    return (
                                                        <div className="col-lg-3 col-md-6 col-12" key={quarter.Id} disabled={quarter?.Status !== "OPEN"}>
                                                            <Tooltip
                                                                title={
                                                                    quarter.Status !== "OPEN"
                                                                        ? "This review cycle is not yet released."
                                                                        : ""
                                                                }
                                                            >
                                                                <div
                                                                    className={`review-cycle-card ${quarter.Status !== "OPEN"
                                                                        ? "review-card-disabled cursor-not-allowed"
                                                                        : ""
                                                                        }`}
                                                                    style={{
                                                                        borderTop: `5px solid ${colors[index % colors.length]}`
                                                                    }}
                                                                    onClick={() => {
                                                                        if (quarter.Status !== "OPEN") return;

                                                                        navigate("/kpi/manager-review", {
                                                                            state: {
                                                                                quarterId: quarter.Id,
                                                                                quarterName: quarter.CycleName,
                                                                                employeeId: selectedEmployee,
                                                                                employeeName: selectedEmployeeName,
                                                                                periodId: selectedPeriod
                                                                            }
                                                                        });
                                                                    }}
                                                                >
                                                                    <div className="d-flex justify-content-between align-items-start">

                                                                        <div
                                                                            className="cycle-icon"
                                                                            style={{
                                                                                background: `${colors[index % colors.length]}15`,
                                                                                color: colors[index % colors.length]
                                                                            }}
                                                                        >
                                                                            <i className="bi bi-calendar-event-fill text-dark"></i>
                                                                        </div>

                                                                        <div className="text-end">
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
                                                                    <div className="mt-4 d-flex justify-content-between align-items-center">
                                                                        <span className="badge bg-light-success text-success px-3 py-2">
                                                                            <i className="bi bi-award-fill me-2 text-success"></i>
                                                                            {Number(quarter.CycleScore ?? 0).toFixed(2)} Score
                                                                        </span>
                                                                        <span className="view-details-btn">
                                                                            View Details
                                                                            <i className="bi bi-arrow-right-short text-primary ms-1"></i>
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
            </div>

            <style>
                {`
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
                    .allocate-btn{
                        background:linear-gradient(135deg,#2563eb,#4f46e5);
                        border:none;
                        border-radius:12px;
                        font-weight:600;
                        padding:10px 22px;
                        box-shadow:0 10px 25px rgba(37,99,235,.25);
                        transition:.25s;
                    }

                    .allocate-btn:hover{
                        transform:translateY(-2px);
                        box-shadow:0 16px 35px rgba(37,99,235,.35);
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
                    .sticky-bottom-action{
                        position: sticky;
                        bottom: 0;
                        z-index: 10;
                        display: flex;
                        justify-content: flex-end;
                        padding: 18px 24px;
                        margin-top: 20px;
                        background: rgba(255,255,255,.95);
                        backdrop-filter: blur(12px);
                        border-top: 1px solid #e5e7eb;
                        box-shadow: 0 -8px 24px rgba(15,23,42,.08);
                    }
                `}
            </style>
        </Base1>
    )
}