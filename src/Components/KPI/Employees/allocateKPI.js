import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../Config/Loader.css';
import Base1 from '../../Config/Base1';
import { fetchWithAuth } from "../../../utils/api";
import Swal from 'sweetalert2';
import { useLocation, Link } from "react-router-dom";
import { Dropdown, Menu, Select, message, Tooltip, Popconfirm } from 'antd';
import { getDeptKPIs, getKPIs, getUsersByMngrId, saveEmployeeKPIs, getIsKPIsAvailable } from '../services/kpiServices';
import { BASE_IMAGE_API_GET } from '../../Config/Config';

const { Option } = Select;

export default function AllocateKPI() {

    const navigate = useNavigate();
    const location = useLocation();
    const [sessionUserData, setsessionUserData] = useState({});
    const [sessionActionIds, setSessionActionIds] = useState([]);
    const [modules, setModules] = useState([]);
    const [menuData, setMenuData] = useState([]);
    const [employeesData, setEmployeesData] = useState([]);
    const [orgKPIs, setOrgKPIs] = useState([]);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [employeeCards, setEmployeeCards] = useState([]);
    const [loading, setLoading] = useState(false);
    const [deptKPIs, setDeptKPIs] = useState([]);

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
            const response = await getUsersByMngrId({
                orgId: sessionUserData?.OrgId,
                managerId: sessionUserData?.Id
            });

            setEmployeesData(response?.data || []);

        } catch (error) {
            console.error(error);
        }
    };

    const fetchDeptKPIs = async () => {
        try {
            setLoading(true);
            const response = await getDeptKPIs({
                orgId: sessionUserData?.OrgId,
                periodId: sessionUserData?.PeriodId,
                deptId: sessionUserData?.DeptId,
                employeeId: sessionUserData?.Id,
            });

            setDeptKPIs(response?.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchKPIList = async () => {
        try {
            const response = await getKPIs({
                orgId: sessionUserData?.OrgId,
                deptId: 0,
                kpiLevel: 1,
                userId: sessionUserData?.Id,
            });

            setOrgKPIs(response?.data || []);
        } catch (error) {
            console.error(error);
        }
    };

    const fetchIsKPIAvail = async (empId) => {
        try {
            setLoading(true);

            const response = await getIsKPIsAvailable({
                orgId: sessionUserData?.OrgId,
                periodId: sessionUserData?.PeriodId,
                employeeId: empId,
            });

            return {
                isAvailable: response?.data[0]?.ResponseCode === 200,
                message: response?.data[0]?.Message
            };

        } catch (error) {
            console.error(error);

            return {
                isAvailable: false,
                message: "Unable to verify KPI allocation."
            };

        } finally {
            setLoading(false);
        }
    };

    const addEmployeeCard = async () => {

        if (!selectedEmployee) {
            message.warning("Please select an employee.");
            return;
        }

        const result = await fetchIsKPIAvail(selectedEmployee.Id);

        if (!result.isAvailable) {
            message.error(result.message);
            return;
        }

        const emp = employeesData.find(
            x => x.Id === selectedEmployee.Id
        );

        if (!emp) return;

        if (employeeCards.some(x => x.employeeId === emp.Id)) {
            message.warning("Employee already added.");
            return;
        }

        setEmployeeCards(prev => [
            ...prev,
            {
                employeeId: emp.Id,
                employeeName: emp.Name,
                roleName: emp.RoleName,
                email: emp.Email,
                imageUrl: emp.ImageURL,
                designation: emp.DesignationName || "",
                kpis: [],
                totalPercentage: 0,
                totalWeightage: 0
            }
        ]);

        setSelectedEmployee(undefined);
    };

    const handleSubmit = async () => {

        if (employeeCards.length === 0) {
            message.warning("Please add at least one employee.");
            return;
        }

        // Validate
        for (const employee of employeeCards) {
            if (employee.kpis.length === 0) {
                message.warning(
                    `${employee.employeeName} has no KPI selected.`
                );
                return;
            }

            if (employee.totalWeightage !== 100) {
                message.warning(
                    `${employee.employeeName}'s Weightage total must be exactly 100%.`
                );
                return;
            }
        }

        const mappings = [];

        employeeCards.forEach(employee => {
            employee.kpis.forEach(kpi => {
                mappings.push({
                    PeriodId: sessionUserData?.PeriodId,
                    KPIId: kpi.kpiId,
                    EmployeeId: employee.employeeId,
                    TargetValue: Number(kpi.target),
                    Weightage: Number(kpi.weightage) // Assuming target % is the weightage
                });
            });
        });

        const payload = {
            OrgId: sessionUserData.OrgId,
            UserId: sessionUserData.Id,
            Type: "ADD",
            JsonData: {
                Mappings: mappings
            }
        };

        try {
            setLoading(true);
            const response = await saveEmployeeKPIs(payload);

            if (
                response?.success &&
                response?.data?.result?.[0]?.Status === 200
            ) {
                message.success(response.data.result[0].Message);
                setEmployeeCards([]);
            } else {
                message.error(
                    response?.data?.result?.[0]?.Message ||
                    "Failed to save KPI allocation."
                );
            }
        } catch (error) {
            console.error(error);
            message.error("Something went wrong.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (sessionUserData?.OrgId) {
            fetchMenuData();
            fetchUsersByMngrId();
            fetchKPIList();
            fetchDeptKPIs();
        }
    }, [sessionUserData]);

    const handleKPISelectionDropdown = (employeeId, selectedIds) => {
        setEmployeeCards(prev =>
            prev.map(emp => {
                if (emp.employeeId !== employeeId)
                    return emp;

                const newKPIs = selectedIds.map(id => {
                    const existing = emp.kpis.find(x => x.kpiId === id);
                    return existing || {
                        kpiId: id,
                        target: 0
                    };

                });

                return {
                    ...emp,
                    kpis: newKPIs
                };

            })
        );

    };

    const updateKPIField = (
        employeeId,
        kpiId,
        field,
        value
    ) => {
        const newValue = Number(value) || 0;

        setEmployeeCards(prev =>
            (prev || []).map(emp => {

                if (emp.employeeId !== employeeId)
                    return emp;

                if (field === "weightage") {
                    const currentTotal = (emp.kpis || []).reduce(
                        (sum, item) => {
                            if (item.kpiId === kpiId)
                                return sum;

                            return sum + Number(item.weightage || 0);
                        },
                        0
                    );

                    if (currentTotal + newValue > 100) {
                        message.warning(
                            "Total Weightage cannot exceed 100%."
                        );
                        return emp;
                    }
                }

                const kpis = (emp.kpis || []).map(item =>
                    item.kpiId === kpiId
                        ? {
                            ...item,
                            [field]: newValue
                        }
                        : item
                );

                return {
                    ...emp,
                    kpis,

                    totalPercentage: kpis.reduce(
                        (sum, item) =>
                            sum + Number(item.target || 0),
                        0
                    ),

                    totalWeightage: kpis.reduce(
                        (sum, item) =>
                            sum + Number(item.weightage || 0),
                        0
                    )
                };
            })
        );
    };

    const removeKPI = (employeeId, kpiId) => {
        setEmployeeCards(prev =>
            (prev || []).map(emp => {

                if (emp.employeeId !== employeeId) {
                    return emp;
                }

                // Remove selected KPI
                const updatedKpis = (emp.kpis || []).filter(
                    item => item.kpiId !== kpiId
                );

                // Recalculate Target
                const totalPercentage = updatedKpis.reduce(
                    (sum, item) =>
                        sum + Number(item.target || 0),
                    0
                );

                // Recalculate Weightage
                const totalWeightage = updatedKpis.reduce(
                    (sum, item) =>
                        sum + Number(item.weightage || 0),
                    0
                );

                return {
                    ...emp,
                    kpis: updatedKpis,
                    totalPercentage,
                    totalWeightage
                };
            })
        );
    };

    const removeEmployeeCard = (employeeId) => {
        setEmployeeCards(prev =>
            prev.filter(emp => emp.employeeId !== employeeId)
        );
    };

    const kpiList =
        employeesData?.[0]?.RoleId === 5
            ? orgKPIs
            : deptKPIs;

    const iconColors = ['#FF6B35', '#00B8D9', '#36B37E', '#FFAB00', '#6554C0', '#FF5630'];
    const showOrgTab = sessionActionIds?.includes(37);
    const showDeptTab = sessionActionIds?.includes(38);

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
                        {/* =========================================================
    KPI NAVIGATION
========================================================= */}
                        <div
                            className="kpi-navigation bg-white rounded-pill shadow-sm mb-3"
                            style={{ border: "1px solid #e9ecef" }}
                        >
                            <div className="d-flex align-items-center flex-wrap gap-2">

                                {showOrgTab && (
                                    <Link
                                        to="/kpi/master"
                                        className="btn rounded-pill fw-semibold btn-light-primary kpi-nav-btn btn-sm"
                                    >
                                        <i className="fa-solid fa-building me-2"></i>
                                        Organization KPI
                                    </Link>
                                )}

                                {showDeptTab && (
                                    <Link
                                        to="/kpi/master"
                                        className="btn rounded-pill fw-semibold btn-light-primary kpi-nav-btn btn-sm"
                                    >
                                        <i className="fa-solid fa-users-gear me-2"></i>
                                        Department KPI
                                    </Link>
                                )}

                                <Link
                                    to="/kpi/allocate-kpi"
                                    className="btn rounded-pill btn-primary fw-semibold kpi-nav-btn btn-sm"
                                >
                                    <i className="bi bi-bullseye me-2"></i>
                                    Allocate KPI
                                </Link>

                            </div>
                        </div>


                        {/* =========================================================
    EMPLOYEE KPI ALLOCATION
========================================================= */}
                        <div className="card border-0 shadow-sm rounded-4 mb-5 employee-allocation-card">

                            {/* =====================================================
        DESKTOP HEADER
    ===================================================== */}
                            <div className="d-none d-md-block">

                                <div className="card-header bg-white border-0 pt-4 px-4">

                                    <div className="d-flex align-items-center w-100">

                                        <div className="flex-grow-1">

                                            <h3 className="fw-bold mb-1 d-flex align-items-center">
                                                <i className="bi bi-person-workspace text-primary me-2 fs-3"></i>
                                                Employee KPI Allocation
                                            </h3>

                                            <small className="text-muted">
                                                Select employees and assign KPIs individually
                                            </small>

                                        </div>

                                        <div className="ms-auto d-flex align-items-center gap-3">

                                            <span className="premium-badge period-badge">
                                                <i className="bi bi-calendar3 me-2 text-success"></i>
                                                {sessionUserData?.PeriodName}
                                            </span>

                                            <span className="premium-badge employee-badge">
                                                <i className="bi bi-people-fill me-2 text-white"></i>
                                                {employeeCards.length} Employee
                                                {employeeCards.length !== 1 ? "s" : ""}
                                            </span>

                                        </div>

                                    </div>

                                </div>

                            </div>


                            {/* =====================================================
        MOBILE HEADER
    ===================================================== */}
                            <div className="d-block d-md-none">

                                <div className="card-body p-3">

                                    {/* Title */}
                                    <div className="mobile-allocation-title">

                                        <div className="d-flex align-items-center">

                                            <div className="mobile-title-icon">
                                                <i className="bi bi-person-workspace"></i>
                                            </div>

                                            <div className="ms-2">

                                                <h5 className="fw-bold mb-0">
                                                    Employee KPI Allocation
                                                </h5>

                                                <small className="text-muted">
                                                    Select employees and assign KPIs individually
                                                </small>

                                            </div>

                                        </div>

                                    </div>


                                    {/* Period + Employee */}
                                    <div className="row g-2 mt-3">
                                        <div className="col-6">
                                            <div className="mobile-info-badge period">
                                                <i className="bi bi-calendar3"></i>
                                                <span>
                                                    {sessionUserData?.PeriodName}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="col-6">
                                            <div className="mobile-info-badge employees">
                                                <i className="bi bi-people-fill"></i>
                                                <span>
                                                    {employeeCards.length} Employee
                                                    {employeeCards.length !== 1
                                                        ? "s"
                                                        : ""}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Employee Selection */}
                                    <div className="mt-4">
                                        <label className="form-label fw-semibold mb-2">
                                            Employee
                                        </label>
                                        <Select
                                            showSearch
                                            size="large"
                                            style={{ width: "100%" }}
                                            placeholder="Search Employee"
                                            value={
                                                selectedEmployee
                                                    ? {
                                                        value: selectedEmployee.Id,
                                                        label: `${selectedEmployee.Name} (${selectedEmployee.Email})`,
                                                    }
                                                    : undefined
                                            }
                                            labelInValue
                                            optionFilterProp="label"
                                            filterOption={(input, option) =>
                                                option?.label
                                                    ?.toLowerCase()
                                                    .includes(input.toLowerCase())
                                            }
                                            onChange={(option) => {

                                                const employee =
                                                    employeesData.find(
                                                        (e) =>
                                                            Number(e.Id) ===
                                                            Number(option.value)
                                                    );

                                                setSelectedEmployee(employee);

                                            }}
                                            options={employeesData
                                                ?.filter(
                                                    (emp) =>
                                                        Number(emp.Id) !==
                                                        Number(sessionUserData?.Id)
                                                )
                                                .map((emp) => ({
                                                    value: emp.Id,
                                                    label: `${emp.Name} (${emp.Email})`,
                                                }))}
                                        />
                                    </div>

                                    <button
                                        type="button"
                                        className="btn btn-primary w-100 mt-2 mobile-add-btn"
                                        onClick={addEmployeeCard}
                                    >
                                        <i className="bi bi-plus-circle me-2"></i>
                                        Add
                                    </button>
                                </div>
                            </div>

                            <div className="card-body d-none d-md-block px-4">
                                <div className="row align-items-end g-4">
                                    <div className="col-md-4">
                                        <label className="form-label fw-semibold">
                                            Employee
                                        </label>
                                        <Select
                                            showSearch
                                            size="large"
                                            style={{ width: "100%" }}
                                            placeholder="Search Employee"
                                            value={
                                                selectedEmployee
                                                    ? {
                                                        value: selectedEmployee.Id,
                                                        label: `${selectedEmployee.Name} (${selectedEmployee.Email})`,
                                                    }
                                                    : undefined
                                            }
                                            labelInValue
                                            optionFilterProp="label"
                                            filterOption={(input, option) =>
                                                option?.label
                                                    ?.toLowerCase()
                                                    .includes(input.toLowerCase())
                                            }
                                            onChange={(option) => {

                                                const employee =
                                                    employeesData.find(
                                                        (e) =>
                                                            Number(e.Id) ===
                                                            Number(option.value)
                                                    );

                                                setSelectedEmployee(employee);

                                            }}
                                            options={employeesData
                                                ?.filter(
                                                    (emp) =>
                                                        Number(emp.Id) !==
                                                        Number(sessionUserData?.Id)
                                                )
                                                .map((emp) => ({
                                                    value: emp.Id,
                                                    label: `${emp.Name} (${emp.Email})`,
                                                }))}
                                        />
                                    </div>
                                    <div className="col-md-2">
                                        <button
                                            className="btn btn-primary w-100"
                                            style={{
                                                height: 40,
                                                borderRadius: 10
                                            }}
                                            onClick={addEmployeeCard}
                                        >
                                            <i className="bi bi-plus-circle me-2"></i>
                                            Add
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="row">
                            {employeeCards.map((employee, index) => (
                                <div
                                    className="col-md-6 mb-4"
                                    key={employee.employeeId}
                                >
                                    <div className="card employee-kpi-card">
                                        <div className="card-header employee-card-header border-0 mt-3">

                                            {/* ================= DESKTOP ================= */}
                                            <div className="d-none d-md-flex align-items-center w-100">

                                                <div className="d-flex align-items-center flex-grow-1">

                                                    <div className="employee-avatar">
                                                        {employee.imageUrl ? (
                                                            <img
                                                                src={`${BASE_IMAGE_API_GET}${employee.imageUrl}`}
                                                                alt={employee.employeeName}
                                                                onError={(e) => {
                                                                    e.target.style.display = "none";
                                                                    e.target.nextSibling.style.display = "flex";
                                                                }}
                                                            />
                                                        ) : null}

                                                        <div
                                                            className="employee-avatar-fallback"
                                                            style={{
                                                                display: employee.imageUrl
                                                                    ? "none"
                                                                    : "flex"
                                                            }}
                                                        >
                                                            {employee.employeeName
                                                                ?.charAt(0)
                                                                .toUpperCase()}
                                                        </div>
                                                    </div>

                                                    <div className="ms-3">

                                                        <div className="d-flex align-items-center gap-3">

                                                            <h5 className="mb-0 fw-bold">
                                                                {employee.employeeName}
                                                            </h5>

                                                            <span className="badge bg-light-primary text-primary">
                                                                {employee.roleName}
                                                            </span>

                                                        </div>

                                                        <div className="mt-1">

                                                            <small className="text-muted d-flex align-items-center">

                                                                <i className="bi bi-envelope me-2 text-primary"></i>

                                                                {employee.email || "No Email"}

                                                            </small>

                                                        </div>

                                                    </div>

                                                </div>


                                                {/* Desktop Actions */}
                                                <div className="d-flex align-items-center gap-3">

                                                    <div className="kpi-summary-card">

                                                        <small>Weight</small>

                                                        <h6
                                                            className={
                                                                employee.totalWeightage === 100
                                                                    ? "text-success"
                                                                    : "text-warning"
                                                            }
                                                        >
                                                            {employee.totalWeightage}%
                                                        </h6>

                                                    </div>


                                                    <Popconfirm
                                                        title="Remove Employee?"
                                                        description="All KPI allocations for this employee will be removed."
                                                        okText="Remove"
                                                        cancelText="Cancel"
                                                        okButtonProps={{ danger: true }}
                                                        onConfirm={() =>
                                                            removeEmployeeCard(
                                                                employee.employeeId
                                                            )
                                                        }
                                                    >
                                                        <Tooltip title="Remove Employee">

                                                            <button
                                                                type="button"
                                                                className="remove-employee-btn"
                                                            >
                                                                <i className="bi bi-trash3-fill"></i>
                                                            </button>

                                                        </Tooltip>
                                                    </Popconfirm>

                                                </div>

                                            </div>


                                            {/* ================= MOBILE ================= */}
                                            <div className="d-block d-md-none">

                                                {/* Top Row */}
                                                <div className="d-flex align-items-center">

                                                    {/* Avatar */}
                                                    <div className="employee-avatar flex-shrink-0">

                                                        {employee.imageUrl ? (
                                                            <img
                                                                src={`${BASE_IMAGE_API_GET}${employee.imageUrl}`}
                                                                alt={employee.employeeName}
                                                                onError={(e) => {
                                                                    e.target.style.display = "none";
                                                                    e.target.nextSibling.style.display = "flex";
                                                                }}
                                                            />
                                                        ) : null}

                                                        <div
                                                            className="employee-avatar-fallback"
                                                            style={{
                                                                display: employee.imageUrl
                                                                    ? "none"
                                                                    : "flex"
                                                            }}
                                                        >
                                                            {employee.employeeName
                                                                ?.charAt(0)
                                                                .toUpperCase()}
                                                        </div>

                                                    </div>


                                                    {/* Employee Info */}
                                                    <div className="ms-3 flex-grow-1 min-w-0">

                                                        <div className="d-flex align-items-center flex-wrap gap-1">

                                                            <h6 className="mb-0 fw-bold text-gray-800 employee-mobile-name">
                                                                {employee.employeeName}
                                                            </h6>

                                                            <span className="badge bg-light-primary text-primary employee-mobile-role">
                                                                {employee.roleName}
                                                            </span>

                                                        </div>

                                                        <div className="mt-1">

                                                            <small className="text-muted d-flex align-items-center employee-mobile-email">

                                                                <i className="bi bi-envelope me-1 text-primary flex-shrink-0"></i>

                                                                <span className="text-truncate">
                                                                    {employee.email || "No Email"}
                                                                </span>

                                                            </small>

                                                        </div>

                                                    </div>


                                                    {/* Delete */}
                                                    <div className="flex-shrink-0 ms-2">

                                                        <Popconfirm
                                                            title="Remove Employee?"
                                                            description="All KPI allocations for this employee will be removed."
                                                            okText="Remove"
                                                            cancelText="Cancel"
                                                            okButtonProps={{ danger: true }}
                                                            onConfirm={() =>
                                                                removeEmployeeCard(
                                                                    employee.employeeId
                                                                )
                                                            }
                                                        >
                                                            <Tooltip title="Remove Employee">

                                                                <button
                                                                    type="button"
                                                                    className="remove-employee-btn"
                                                                >
                                                                    <i className="bi bi-trash3-fill"></i>
                                                                </button>

                                                            </Tooltip>
                                                        </Popconfirm>

                                                    </div>

                                                </div>


                                                {/* Weight */}
                                                <div className="mobile-weight-wrapper">

                                                    <div className="mobile-weight-card">

                                                        <div className="d-flex align-items-center">

                                                            <div className="mobile-weight-icon">
                                                                <i className="bi bi-bar-chart-fill"></i>
                                                            </div>

                                                            <div>

                                                                <small className="text-muted d-block">
                                                                    Total Weight
                                                                </small>

                                                                <h6
                                                                    className={`mb-0 fw-bold ${employee.totalWeightage === 100
                                                                            ? "text-success"
                                                                            : "text-warning"
                                                                        }`}
                                                                >
                                                                    {employee.totalWeightage}%
                                                                </h6>

                                                            </div>

                                                        </div>

                                                    </div>

                                                </div>

                                            </div>

                                        </div>

                                        <div className="card-body">
                                            <div className="mb-4">
                                                <label className="form-label fw-bold d-flex align-items-center">
                                                    Select KPI(s)
                                                    <Tooltip
                                                        placement="right"
                                                        title={
                                                            <div style={{ maxWidth: 650 }}>
                                                                <div className="fw-semibold mb-2">
                                                                    KPI Allocation Guide
                                                                </div>
                                                                <div>
                                                                    • If you assign only one KPI, set its weight to <strong>100%</strong>.
                                                                </div>
                                                                <div className="mt-2">
                                                                    • If you assign multiple KPIs, distribute the total weightage across all selected KPIs so that the combined allocation equals <strong>100%</strong>.
                                                                </div>
                                                                <div className="mt-2 text-warning">
                                                                    <strong>Example:</strong> 40% + 30% + 30% = 100%
                                                                </div>
                                                            </div>
                                                        }
                                                    >
                                                        <i
                                                            className="bi bi-info-circle-fill text-primary ms-2"
                                                            style={{ cursor: "pointer" }}
                                                        />
                                                    </Tooltip>
                                                </label>

                                                <Select
                                                    mode="multiple"
                                                    allowClear
                                                    showSearch
                                                    size="large"
                                                    style={{ width: "100%" }}
                                                    placeholder="Search and select KPI(s)"
                                                    optionFilterProp="label"
                                                    value={employee.kpis.map(x => x.kpiId)}
                                                    onChange={(selectedIds) =>
                                                        handleKPISelectionDropdown(
                                                            employee.employeeId,
                                                            selectedIds
                                                        )
                                                    }
                                                    maxTagCount={0}
                                                    maxTagPlaceholder={(omittedValues) => (
                                                        <span className="fw-semibold text-primary">
                                                            {omittedValues.length} KPI{omittedValues.length > 1 ? "s" : ""} Selected
                                                        </span>
                                                    )}
                                                    options={kpiList.map(kpi => ({
                                                        value: kpi.Id,
                                                        label: kpi.KPIName
                                                    }))}
                                                />
                                            </div>
                                            <div className="table-responsive"
                                                style={{
                                                    maxHeight: "300px",
                                                    overflowY: "auto",
                                                    overflowX: "auto",
                                                }}
                                            >
                                                <table className="table table-hover align-middle">
                                                    <thead className="table-light fw-bold sticky-top">
                                                        <tr>
                                                            <th width="55" className='text-center'>#</th>
                                                            <th>KPI</th>
                                                            <th>UoM</th>
                                                            <th width="110" className="text-center">
                                                                Target
                                                            </th>
                                                            <th width="110" className="text-center">
                                                                Weight
                                                            </th>
                                                            <th width="70" className="text-center">
                                                                Action
                                                            </th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {employee.kpis.map((selected, index) => {
                                                            const kpi = kpiList.find(x => x.Id === selected.kpiId);
                                                            if (!kpi) return null;
                                                            return (
                                                                <tr key={kpi.Id}>
                                                                    <td className="text-center">
                                                                        <span className="badge bg-light-secondary">
                                                                            {index + 1}
                                                                        </span>
                                                                    </td>
                                                                    <td>
                                                                        <div className="d-flex align-items-center">

                                                                            <Tooltip
                                                                                title={kpi.KPIName}
                                                                                placement="topLeft"
                                                                            >
                                                                                <span
                                                                                    className="fw-semibold text-truncate"
                                                                                    style={{
                                                                                        maxWidth: "220px",
                                                                                        display: "inline-block",
                                                                                        cursor: "pointer"
                                                                                    }}
                                                                                >
                                                                                    {kpi.KPIName?.length > 28
                                                                                        ? `${kpi.KPIName.substring(0, 28)}...`
                                                                                        : kpi.KPIName}
                                                                                </span>
                                                                            </Tooltip>

                                                                            {kpi.Objectives && (
                                                                                <Tooltip
                                                                                    title={
                                                                                        <div
                                                                                            className="quill-tooltip-content"
                                                                                            dangerouslySetInnerHTML={{
                                                                                                __html: kpi.Objectives
                                                                                            }}
                                                                                        />
                                                                                    }
                                                                                    placement="top"
                                                                                >
                                                                                    <i
                                                                                        className="bi bi-info-circle-fill text-primary ms-2 fa-fade"
                                                                                        style={{
                                                                                            cursor: "pointer",
                                                                                            fontSize: 12,
                                                                                            flexShrink: 0
                                                                                        }}
                                                                                    />
                                                                                </Tooltip>
                                                                            )}

                                                                        </div>
                                                                    </td>
                                                                    <td><span>{kpi.UOMName}</span></td>
                                                                    <td>
                                                                        <input
                                                                            type="number"
                                                                            min="0"
                                                                            className="form-control form-control-sm text-center"
                                                                            value={selected.target || ""}
                                                                            onChange={(e) =>
                                                                                updateKPIField(
                                                                                    employee.employeeId,
                                                                                    kpi.Id,
                                                                                    "target",
                                                                                    e.target.value
                                                                                )
                                                                            }
                                                                            onWheel={(e) => e.target.blur()}
                                                                            placeholder="0"
                                                                        />
                                                                    </td>
                                                                    <td>
                                                                        <input
                                                                            type="number"
                                                                            min="0"
                                                                            max="100"
                                                                            className="form-control form-control-sm text-center"
                                                                            value={selected.weightage || ""}
                                                                            onChange={(e) =>
                                                                                updateKPIField(
                                                                                    employee.employeeId,
                                                                                    kpi.Id,
                                                                                    "weightage",
                                                                                    e.target.value
                                                                                )
                                                                            }
                                                                            onWheel={(e) => e.target.blur()}
                                                                            placeholder='0'
                                                                        />
                                                                    </td>
                                                                    <td className="text-center">
                                                                        <Tooltip title="Remove KPI">
                                                                            <button
                                                                                className="btn btn-light-danger btn-sm rounded-circle"
                                                                                onClick={() =>
                                                                                    removeKPI(
                                                                                        employee.employeeId,
                                                                                        kpi.Id
                                                                                    )
                                                                                }
                                                                            >
                                                                                <i className="bi bi-trash"></i>
                                                                            </button>
                                                                        </Tooltip>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>

                                            <div className="mt-3">
                                                <div className="d-flex justify-content-between">
                                                    <strong>
                                                        Total Allocation
                                                    </strong>
                                                    <strong
                                                        className={
                                                            employee.totalWeightage === 100
                                                                ? "text-success" :
                                                                employee.totalWeightage > 100
                                                                    ? "text-danger" :
                                                                    "text-warning"
                                                        }
                                                    >
                                                        {employee.totalWeightage}%
                                                    </strong>
                                                </div>

                                                <div
                                                    className="progress mt-2"
                                                    style={{
                                                        height: 10,
                                                        borderRadius: 20
                                                    }}
                                                >
                                                    <div
                                                        className={`progress-bar ${employee.totalWeightage > 100
                                                            ? "bg-danger" :
                                                            employee.totalWeightage === 100
                                                                ? "bg-success" :
                                                                "bg-warning"
                                                            }`}
                                                        style={{
                                                            width: `${Math.min(employee.totalWeightage, 100)}%`
                                                        }}
                                                    />
                                                </div>

                                                <small
                                                    className="text-muted"
                                                >
                                                    Remaining :
                                                    {100 - employee.totalWeightage > 0
                                                        ? 100 - employee.totalWeightage
                                                        : 0}
                                                    %
                                                </small>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {employeeCards.length > 0 && (
                            <div className="sticky-submit-bar">
                                <div className="d-flex justify-content-end align-items-center h-100">
                                    <button
                                        className="btn btn-primary btn-lg px-5"
                                        onClick={handleSubmit}
                                        disabled={loading}
                                    >
                                        {loading ? (
                                            <>
                                                <span className="spinner-border spinner-border-sm me-2"></span>
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                <i className="bi bi-check-circle-fill me-2"></i>
                                                Submit
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <style>
                {`
                /* ==========================================
   MOBILE EMPLOYEE HEADER
========================================== */

.mobile-weight-wrapper {
    margin-top: 12px;
}

.mobile-weight-card {
    width: 100%;
    min-height: 48px;

    padding: 7px 12px;

    background: #f8faff;
    border: 1px solid #e8edf5;
    border-radius: 10px;

    display: flex;
    align-items: center;
}

.mobile-weight-icon {
    width: 32px;
    height: 32px;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 8px;

    background: #eef4ff;
    color: #287ff0;

    margin-right: 10px;
}

.employee-mobile-name {
    font-size: 14px;
    line-height: 1.2;
}

.employee-mobile-role {
    font-size: 9px;
    padding: 3px 7px;
}

.employee-mobile-email {
    font-size: 10px;
    max-width: 180px;
}


/* ==========================================
   MOBILE
========================================== */

@media (max-width: 767.98px) {

    .employee-card-header {
        padding: 12px !important;
        margin-top: 10px !important;
    }

    .employee-card-header .employee-avatar {
        width: 42px;
        height: 42px;
        min-width: 42px;
    }

    .employee-card-header .remove-employee-btn {
        width: 36px;
        height: 36px;
        min-width: 36px;
    }

}
                /* ==========================================
   KPI NAVIGATION
========================================== */

.kpi-navigation {
    padding: 8px;
}

.kpi-nav-btn {
    padding: 9px 16px;
    white-space: nowrap;
}


/* ==========================================
   MOBILE EMPLOYEE KPI ALLOCATION
========================================== */

.mobile-title-icon {
    width: 34px;
    height: 34px;
    min-width: 34px;

    display: flex;
    align-items: center;
    justify-content: center;

    background: #eef5ff;
    color: #1d7df2;

    border-radius: 8px;

    font-size: 17px;
}

.mobile-allocation-title h5 {
    font-size: 16px;
    line-height: 1.2;
}

.mobile-allocation-title small {
    display: block;
    font-size: 10px;
    margin-top: 3px;
}


/* ==========================================
   PERIOD / EMPLOYEE BADGES
========================================== */

.mobile-info-badge {
    height: 42px;

    width: 100%;

    display: flex;
    align-items: center;
    justify-content: center;

    gap: 7px;

    border-radius: 12px;

    font-size: 13px;
    font-weight: 600;

    white-space: nowrap;
}

.mobile-info-badge.period {
    background: #effdf5;
    border: 1px solid #b8f0d0;
    color: #16a34a;
}

.mobile-info-badge.employees {
    background: #3949e8;
    color: #fff;

    box-shadow: 0 5px 14px rgba(57, 73, 232, 0.20);
}


/* ==========================================
   MOBILE ADD BUTTON
========================================== */

.mobile-add-btn {
    height: 40px;
    border-radius: 10px;
    font-weight: 600;
}


/* ==========================================
   MOBILE
========================================== */

@media (max-width: 767.98px) {

    .kpi-navigation {
        border-radius: 25px !important;
        padding: 10px 12px;
    }

    .kpi-navigation > div {
        justify-content: center;
    }

    .kpi-nav-btn {
        font-size: 11px;
        padding: 8px 11px;
        margin: 0 !important;
    }

    .kpi-nav-btn i {
        margin-right: 5px !important;
    }

    .employee-allocation-card {
        border-radius: 14px !important;
    }

    .employee-allocation-card .card-body {
        padding: 14px !important;
    }

}
                    .premium-badge{
                        display:flex;
                        align-items:center;
                        justify-content:center;
                        min-width:180px;
                        padding:10px 18px;
                        border-radius:14px;
                        font-size:14px;
                        font-weight:600;
                        transition:.3s ease;
                        cursor:default;
                    }

                    .employee-badge{
                        background:linear-gradient(135deg,#2563eb,#4f46e5);
                        color:#fff;
                        box-shadow:0 10px 24px rgba(37,99,235,.25);
                    }

                    .employee-badge:hover{
                        transform:translateY(-2px);
                        box-shadow:0 16px 32px rgba(37,99,235,.35);
                    }

                    .period-badge{
                        background:#ecfdf3;
                        color:#16a34a;
                        border:1px solid #bbf7d0;
                        position:relative;
                        animation:pulsePeriod 2s infinite;
                    }

                    .period-badge i{
                        font-size:15px;
                    }

                    @keyframes pulsePeriod{

                        0%{
                            transform:scale(1);
                            box-shadow:0 0 0 0 rgba(22,163,74,.35);
                        }

                        70%{
                            transform:scale(1.03);
                            box-shadow:0 0 0 12px rgba(22,163,74,0);
                        }

                        100%{
                            transform:scale(1);
                            box-shadow:0 0 0 0 rgba(22,163,74,0);
                        }

                    }
                    .employee-kpi-card {
                        border: none;
                        border-radius: 18px;
                        box-shadow: 0 10px 30px rgba(0, 0, 0, .06);
                        transition: .3s;
                    }

                    .employee-kpi-card:hover {
                        transform: translateY(-4px);
                        box-shadow: 0 20px 40px rgba(0, 0, 0, .12);
                    }

                    .total-badge {
                        background: #eef2ff;
                        color: #2563eb;
                        font-size: 20px;
                        font-weight: 700;
                        padding: 8px 18px;
                        border-radius: 30px;
                        display: inline-block;
                    }
                    .employee-avatar {
                        width: 56px;
                        height: 56px;
                        border-radius: 16px;
                        overflow: hidden;
                        position: relative;
                        flex-shrink: 0;
                        background: linear-gradient(135deg, #2563eb, #4f46e5);
                        box-shadow: 0 10px 20px rgba(37, 99, 235, 0.25);
                    }

                    .employee-avatar img {
                        width: 100%;
                        height: 100%;
                        object-fit: cover;
                        display: block;
                    }

                    .employee-avatar-fallback {
                        position: absolute;
                        inset: 0;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 24px;
                        font-weight: 700;
                        color: #fff;
                        background: linear-gradient(135deg, #2563eb, #4f46e5);
                    }

                    .allocation-pill{
                        background:#eef2ff;
                        color:#2563eb;
                        padding:8px 18px;
                        border-radius:50px;
                        font-size:22px;
                        font-weight:700;
                        min-width:85px;
                        text-align:center;
                    }

                    .card-header{
                        border-radius:18px 18px 0 0;
                    }

                    .remove-employee-btn{
                        width:42px;
                        height:42px;
                        min-width:42px;
                        min-height:42px;
                        max-width:42px;
                        max-height:42px;

                        padding:0;

                        display:flex;
                        align-items:center;
                        justify-content:center;

                        border-radius:50%;

                        background:#fff5f5;
                        border:1px solid #ffd6d6;

                        transition:all .25s ease;
                    }

                    .remove-employee-btn i{
                        color:#ef4444;
                        font-size:16px;
                    }

                    .remove-employee-btn:hover{
                        background:#ef4444;
                        border-color:#ef4444;
                        transform:translateY(-2px);
                        box-shadow:0 10px 20px rgba(239,68,68,.25);
                    }

                    .remove-employee-btn:hover i{
                        color:#fff;
                    }
                    .employee-card-header{
                        background:linear-gradient(135deg,#ffffff,#f8fbff);
                        padding:22px 28px;
                        border-bottom:1px solid #eef2f7;
                    }

                    .employee-avatar{
                        width:64px;
                        height:64px;
                        border-radius:18px;
                        overflow:hidden;
                        background:#eef4ff;
                        box-shadow:0 10px 24px rgba(37,99,235,.15);
                        flex-shrink:0;
                    }

                    .employee-avatar img{
                        width:100%;
                        height:100%;
                        object-fit:cover;
                    }

                    .employee-avatar-fallback{
                        width:100%;
                        height:100%;
                        display:flex;
                        align-items:center;
                        justify-content:center;
                        background:linear-gradient(135deg,#2563eb,#4f46e5);
                        color:#fff;
                        font-size:26px;
                        font-weight:700;
                    }

                    .kpi-summary-card{
                        min-width:90px;
                        background:#fff;
                        border:1px solid #edf2f7;
                        border-radius:14px;
                        padding:10px 18px;
                        text-align:center;
                        box-shadow:0 8px 18px rgba(0,0,0,.04);
                    }

                    .kpi-summary-card small{
                        display:block;
                        color:#94a3b8;
                        font-size:12px;
                        margin-bottom:2px;
                    }

                    .kpi-summary-card h6{
                        margin:0;
                        font-size:20px;
                        font-weight:700;
                    }

                    .remove-employee-btn{
                        width:44px;
                        height:44px;
                        border:none;
                        border-radius:50%;
                        display:flex;
                        align-items:center;
                        justify-content:center;
                        background:#fff1f2;
                        color:#ef4444;
                        transition:.25s;
                    }

                    .remove-employee-btn:hover{
                        background:#ef4444;
                        color:#fff;
                        transform:translateY(-2px);
                        box-shadow:0 10px 24px rgba(239,68,68,.25);
                    }
                    .sticky-submit-bar{
                        position:sticky;
                        bottom:0;
                        z-index:999;
                        margin-top:24px;
                        padding:18px 24px;
                        background:rgba(255,255,255,.96);
                        backdrop-filter:blur(12px);
                        border-top:1px solid #e5e7eb;
                        border-radius:18px 18px 0 0;
                        box-shadow:0 -8px 30px rgba(15,23,42,.08);
                        min-height:82px;
                    }

                    .sticky-submit-bar .btn{
                        min-width:180px;
                        height:48px;
                        border-radius:12px;
                        font-weight:600;
                        box-shadow:0 8px 20px rgba(37,99,235,.25);
                    }

                    .sticky-submit-bar .btn:hover:not(:disabled){
                        transform:translateY(-2px);
                    }
                    .quill-tooltip-content {
                        max-width: 400px;
                        max-height: 250px;
                        overflow-y: auto;
                    }

                    .quill-tooltip-content p {
                        margin-bottom: 6px;
                    }

                    .quill-tooltip-content h1,
                    .quill-tooltip-content h2,
                    .quill-tooltip-content h3 {
                        margin-bottom: 8px;
                        color: white;
                    }

                    .quill-tooltip-content ul,
                    .quill-tooltip-content ol {
                        padding-left: 20px;
                        margin-bottom: 6px;
                    }

                    .quill-tooltip-content li {
                        margin-bottom: 3px;
                    }
                `}
            </style>

        </Base1>
    )
}