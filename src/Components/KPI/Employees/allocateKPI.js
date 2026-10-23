import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import '../../Config/Loader.css';
import Base1 from '../../Config/Base1';
import { fetchWithAuth } from "../../../utils/api";
import Swal from 'sweetalert2';
import { useLocation, Link } from "react-router-dom";
import { Dropdown, Menu, Select, message, Tooltip, Popconfirm } from 'antd';
import { getDeptKPIs, getKPIs, getUsersByMngrId, saveEmployeeKPIs, getIsKPIsAvailable } from '../services/kpiServices';
import { BASE_IMAGE_API_GET } from '../../Config/Config';

// Totals for a card, from its selected KPIs (every department together).
const totalsOf = (kpis) => ({
    totalPercentage: kpis.reduce((sum, item) => sum + Number(item.target || 0), 0),
    totalWeightage: kpis.reduce((sum, item) => sum + Number(item.weightage || 0), 0),
});

export default function AllocateKPI() {

    const { deptId } = useParams();
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
    const [adding, setAdding] = useState(false);
    const [deptKPIs, setDeptKPIs] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [selectedMngDept, setSelectedMngDept] = useState(null);

    const showOrgTab = sessionActionIds?.includes(37);
    const showDeptTab = sessionActionIds?.includes(38);
    const showDept = sessionActionIds?.includes(25);

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

    const fetchDeptsByMngs = async () => {
        try {
            const response = await fetchWithAuth(
                `ADMINRoutes/CWIGetDDLItems?OrgId=${sessionUserData?.OrgId}&UserId=${selectedEmployee?.Id}`,
                {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                }
            );

            if (!response.ok) {
                throw new Error("Network response was not ok");
            }

            const data = await response.json();

            const managerDeptsFilteredData = (data.ResultData || []).filter(
                (item) => item.DDLName === "getdeptsByManager"
            );

            setDepartments(managerDeptsFilteredData);

        } catch (error) {
            console.error("Failed to fetch departments by manager:", error);
            setDepartments([]);
        }
    };

    useEffect(() => {
        if (sessionUserData?.OrgId && selectedEmployee?.Id && showDept) {
            fetchDeptsByMngs();
        }
    }, [sessionUserData?.OrgId, selectedEmployee?.Id, showDept]);

    const fetchDeptsForMng = async () => {
        try {
            const response = await fetchWithAuth(
                `ADMINRoutes/CWIGetDDLItems?OrgId=${sessionUserData?.OrgId}&UserId=${sessionUserData?.Id}`,
                {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                }
            );

            if (!response.ok) {
                throw new Error("Network response was not ok");
            }

            const data = await response.json();

            const managerDeptsFilteredData = (data.ResultData || []).filter(
                (item) => item.DDLName === "getdeptsByManager"
            );

            setDepartments(managerDeptsFilteredData);

        } catch (error) {
            console.error("Failed to fetch departments by manager:", error);
            setDepartments([]);
        }
    };

    useEffect(() => {
        if (sessionUserData?.OrgId && sessionUserData?.Id) {
            fetchDeptsForMng();
        }
    }, [sessionUserData?.OrgId, sessionUserData?.Id]);


    const fetchUsersByMngrId = async () => {
        try {
            const orgId = sessionUserData?.OrgId;
            const managerId = showDept ? 0 : sessionUserData?.Id;
            const deptId = selectedMngDept || sessionUserData?.DeptId;

            if (!orgId) return;

            const response = await getUsersByMngrId({
                orgId,
                managerId,
                deptId
            });

            const users = Array.isArray(response?.data)
                ? response.data
                : [];

            setEmployeesData(users);

        } catch (error) {
            console.error("getUsersByMngrId failed:", error);
            setEmployeesData([]);
        }
    };

    useEffect(() => {
        if (!sessionUserData?.OrgId) return;

        // With showDept the manager list doesn't depend on the department —
        // the department is chosen after the manager.
        fetchUsersByMngrId();
    }, [
        sessionUserData?.OrgId,
        sessionUserData?.Id,
        sessionUserData?.DeptId,
        showDept ? null : selectedMngDept,
        showDept
    ]);

    const fetchDeptKPIs = async () => {
        try {
            setLoading(true);
            const response = await getDeptKPIs({
                orgId: sessionUserData?.OrgId,
                periodId: sessionUserData?.PeriodId,
                deptId: selectedMngDept,
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
                deptId: selectedMngDept || sessionUserData?.DeptId,
                kpiLevel: 1,
                userId: sessionUserData?.Id,
            });

            setOrgKPIs(response?.data || []);
        } catch (error) {
            console.error(error);
        }
    };

    // The KPIs of one department, fetched fresh when Add is pressed — so the
    // card always gets the department that is selected right now, never a
    // list that was still loading for the previous one.
    const loadKPIsForDept = async (forDeptId) => {
        if (showDept) {
            const response = await getKPIs({
                orgId: sessionUserData?.OrgId,
                deptId: forDeptId,
                kpiLevel: 1,
                userId: sessionUserData?.Id,
            });
            const list = Array.isArray(response?.data) ? response.data : [];
            setOrgKPIs(list);
            return list;
        }

        const response = await getDeptKPIs({
            orgId: sessionUserData?.OrgId,
            periodId: sessionUserData?.PeriodId,
            deptId: forDeptId,
            employeeId: sessionUserData?.Id,
        });
        const list = Array.isArray(response?.data) ? response.data : [];
        setDeptKPIs(list);
        return list;
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

    const deptNameOf = (id, kpis = []) =>
        departments.find((dept) => Number(dept.ItemId) === Number(id))?.ItemValue ||
        kpis[0]?.DeptName ||
        "";

    // Add — one card per employee. Adding the same employee again with
    // another department switches that card's dropdown to the new
    // department's KPIs; KPIs already chosen from earlier departments stay in
    // the table below.
    const addEmployeeCard = async () => {
        if (!selectedEmployee) {
            message.warning(`Please select ${showDept ? "a manager" : "an employee"}.`);
            return;
        }

        if (showDept && !selectedMngDept) {
            message.warning("Please select a department.");
            return;
        }

        const emp = employeesData.find(
            item => Number(item.Id) === Number(selectedEmployee.Id)
        );

        if (!emp) {
            message.error("Selected employee not found.");
            return;
        }

        const forDeptId = showDept
            ? selectedMngDept
            : (selectedMngDept || sessionUserData?.DeptId);

        try {
            setAdding(true);

            const existingCard = employeeCards.find(
                card => Number(card.employeeId) === Number(emp.Id)
            );

            // A new card first checks the employee can still be given KPIs.
            if (!existingCard) {
                const result = await fetchIsKPIAvail(emp.Id);

                if (!result.isAvailable) {
                    message.error(
                        result.message || "Unable to allocate KPIs to this employee."
                    );
                    return;
                }
            }

            const departmentKPIs = await loadKPIsForDept(forDeptId);

            if (!departmentKPIs.length) {
                message.warning("No KPIs available for this department.");
                return;
            }

            const deptName = deptNameOf(forDeptId, departmentKPIs);

            if (existingCard) {
                setEmployeeCards(prev =>
                    prev.map(card =>
                        Number(card.employeeId) !== Number(emp.Id)
                            ? card
                            : {
                                ...card,
                                // The dropdown now offers this department only…
                                currentDeptId: forDeptId,
                                currentDeptName: deptName,
                                availableKPIs: [...departmentKPIs],
                                // …and everything chosen before stays as it is.
                                kpis: [...(card.kpis || [])],
                            }
                    )
                );

                message.success(
                    `${deptName || "Department"} KPIs loaded for ${emp.Name}.`
                );
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
                    currentDeptId: forDeptId,
                    currentDeptName: deptName,
                    availableKPIs: [...departmentKPIs],
                    kpis: [],
                    targetDescription: emp.TargetDescription || "",
                    totalPercentage: 0,
                    totalWeightage: 0
                }
            ]);

            message.success("Employee added successfully.");
        } catch (error) {
            console.error(error);
            message.error("Couldn't load the KPIs for this department.");
        } finally {
            setAdding(false);
        }
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
                    Weightage: Number(kpi.weightage), // Assuming target % is the weightage
                    TargetDescription: kpi.TargetDescription,
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
        }
    }, [sessionUserData]);

    useEffect(() => {
        if (sessionUserData?.OrgId && (deptId || selectedMngDept)) {
            if (showDept) {
                fetchKPIList();
            } else {
                fetchDeptKPIs();
            }
        }
    }, [sessionUserData, deptId, selectedMngDept]);


    // The dropdown only shows — and only changes — the current department's
    // KPIs. KPIs picked from earlier departments are kept untouched.
    const handleKPISelectionDropdown = (employeeId, selectedIds) => {
        setEmployeeCards(prev =>
            prev.map(employee => {
                if (Number(employee.employeeId) !== Number(employeeId)) {
                    return employee;
                }

                const available = employee.availableKPIs || [];
                const currentIds = new Set(available.map(kpi => Number(kpi.Id)));
                const previousKPIs = employee.kpis || [];

                // From other departments — not in this dropdown, so kept as is.
                const fromOtherDepts = previousKPIs.filter(
                    item => !currentIds.has(Number(item.kpiId))
                );

                const fromThisDept = selectedIds.map(id => {
                    const existing = previousKPIs.find(
                        item => Number(item.kpiId) === Number(id)
                    );
                    if (existing) return existing;

                    const kpi = available.find(item => Number(item.Id) === Number(id)) || {};

                    // The KPI's details travel with it, so its row still shows
                    // once the dropdown has moved on to another department.
                    return {
                        kpiId: Number(id),
                        kpiName: kpi.KPIName || "",
                        uomName: kpi.UOMName || "",
                        objectives: kpi.Objectives || "",
                        deptId: employee.currentDeptId,
                        deptName: employee.currentDeptName || kpi.DeptName || "",
                        target: 0,
                        weightage: 0,
                        TargetDescription: ""
                    };
                });

                const kpis = [...fromOtherDepts, ...fromThisDept];

                return { ...employee, kpis, ...totalsOf(kpis) };
            })
        );
    };

    const NUMERIC_KPI_FIELDS = ["target", "weightage"];

    const updateKPIField = (employeeId, kpiId, field, value) => {
        const newValue = NUMERIC_KPI_FIELDS.includes(field)
            ? Number(value) || 0
            : value;

        setEmployeeCards(prev =>
            prev.map(card => {
                if (Number(card.employeeId) !== Number(employeeId)) return card;

                if (field === "weightage") {
                    const currentTotal = (card.kpis || []).reduce(
                        (sum, item) =>
                            Number(item.kpiId) === Number(kpiId)
                                ? sum
                                : sum + Number(item.weightage || 0),
                        0
                    );

                    if (currentTotal + newValue > 100) {
                        message.warning(
                            "Total Weightage cannot exceed 100%."
                        );
                        return card;
                    }
                }

                const kpis = (card.kpis || []).map(item =>
                    Number(item.kpiId) === Number(kpiId)
                        ? { ...item, [field]: newValue }
                        : item
                );

                return { ...card, kpis, ...totalsOf(kpis) };
            })
        );
    };

    const removeKPI = (employeeId, kpiId) => {
        setEmployeeCards(prev =>
            prev.map(card => {
                if (Number(card.employeeId) !== Number(employeeId)) return card;

                const kpis = (card.kpis || []).filter(
                    item => Number(item.kpiId) !== Number(kpiId)
                );

                return { ...card, kpis, ...totalsOf(kpis) };
            })
        );
    };

    const removeEmployeeCard = (employeeId) => {
        setEmployeeCards(prev =>
            prev.filter(card => Number(card.employeeId) !== Number(employeeId))
        );
    };

    // A selected KPI's details — stored on the row, with the card's current
    // list as a fallback for rows saved before the details were kept.
    const kpiDetailsOf = (employee, selected) => {
        const fromList = (employee.availableKPIs || []).find(
            x => Number(x.Id) === Number(selected.kpiId)
        );
        return {
            name: selected.kpiName || fromList?.KPIName || "",
            uom: selected.uomName || fromList?.UOMName || "",
            objectives: selected.objectives || fromList?.Objectives || "",
            dept: selected.deptName || fromList?.DeptName || "",
        };
    };

    // What the dropdown shows as selected: only this department's KPIs.
    const currentDeptSelection = employee => {
        const currentIds = new Set(
            (employee.availableKPIs || []).map(kpi => Number(kpi.Id))
        );
        return (employee.kpis || [])
            .map(item => Number(item.kpiId))
            .filter(id => currentIds.has(id));
    };

    const iconColors = ['#FF6B35', '#00B8D9', '#36B37E', '#FFAB00', '#6554C0', '#FF5630'];

    // Picking another manager clears the department — each manager has his own.
    const handleEmployeeChange = (option) => {
        const employee = employeesData.find(
            (e) => Number(e.Id) === Number(option?.value)
        );
        setSelectedEmployee(employee || null);
        if (showDept) setSelectedMngDept(null);
    };

    const employeeOptions = employeesData
        ?.filter((emp) => Number(emp.Id) !== Number(sessionUserData?.Id))
        .map((emp) => ({
            value: emp.Id,
            label: `${emp.Name} (${emp.Email})`,
        }));

    const employeeValue = selectedEmployee
        ? {
            value: selectedEmployee.Id,
            label: `${selectedEmployee.Name} (${selectedEmployee.Email})`,
        }
        : undefined;

    const departmentOptions = departments?.map((dept) => ({
        value: dept.ItemId,
        label: dept.ItemValue,
    }));


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

                        <div className="card border-0 shadow-sm rounded-4 mb-5 employee-allocation-card">
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

                            <div className="card-body d-none d-md-block px-4">
                                <div className="row align-items-end g-4">
                                    {!showDept && (
                                        <div className="col-12 col-md-3">
                                            <label className="form-label fw-semibold mb-2">
                                                Department
                                            </label>
                                            <Select
                                                size="large"
                                                style={{ width: "100%" }}
                                                placeholder="Select Department"
                                                showSearch
                                                optionFilterProp="label"
                                                value={selectedMngDept}
                                                onChange={(value) => setSelectedMngDept(value)}
                                                options={departmentOptions}
                                            />
                                        </div>
                                    )}

                                    <div className="col-md-4">
                                        <label className="form-label fw-semibold mb-2">
                                            {showDept ? "Manager" : "Employee"}
                                        </label>

                                        <Select
                                            showSearch
                                            size="large"
                                            style={{ width: "100%" }}
                                            placeholder={`Search ${showDept ? "Manager" : "Employee"}`}
                                            value={employeeValue}
                                            labelInValue
                                            optionFilterProp="label"
                                            filterOption={(input, option) =>
                                                option?.label?.toLowerCase().includes(input.toLowerCase())
                                            }
                                            onChange={handleEmployeeChange}
                                            options={employeeOptions}
                                        />
                                    </div>

                                    {showDept && (
                                        <div className="col-12 col-md-3">
                                            <label className="form-label fw-semibold mb-2">
                                                Department
                                            </label>

                                            <Select
                                                size="large"
                                                style={{ width: "100%" }}
                                                placeholder={selectedEmployee ? "Select Department" : "Choose a manager first"}
                                                disabled={!selectedEmployee}
                                                showSearch
                                                optionFilterProp="label"
                                                value={selectedMngDept}
                                                onChange={(value) => setSelectedMngDept(value)}
                                                options={departmentOptions}
                                            />
                                        </div>
                                    )}

                                    {/* Add Button */}
                                    <div className="col-md-2">
                                        <button
                                            className="btn btn-primary w-100"
                                            style={{
                                                height: 40,
                                                borderRadius: 10
                                            }}
                                            onClick={addEmployeeCard}
                                            disabled={adding}
                                        >
                                            {adding ? (
                                                <span className="spinner-border spinner-border-sm me-2"></span>
                                            ) : (
                                                <i className="bi bi-plus-circle me-2"></i>
                                            )}
                                            Add
                                        </button>
                                    </div>

                                </div>
                            </div>


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

                                    {/* Department first unless a manager is chosen first */}
                                    {!showDept && (
                                        <div className="mt-4">
                                            <label className="form-label fw-semibold mb-2">
                                                Department
                                            </label>
                                            <Select
                                                size="large"
                                                style={{ width: "100%" }}
                                                placeholder="Select Department"
                                                showSearch
                                                optionFilterProp="label"
                                                value={selectedMngDept}
                                                onChange={(value) => setSelectedMngDept(value)}
                                                options={departmentOptions}
                                            />
                                        </div>
                                    )}

                                    {/* Employee Selection */}
                                    <div className="mt-4">
                                        <label className="form-label fw-semibold mb-2">
                                            {showDept ? 'Manager' : 'Employee'}
                                        </label>
                                        <Select
                                            showSearch
                                            size="large"
                                            style={{ width: "100%" }}
                                            placeholder={`Search ${showDept ? 'Manager' : 'Employee'}`}
                                            value={employeeValue}
                                            labelInValue
                                            optionFilterProp="label"
                                            filterOption={(input, option) =>
                                                option?.label
                                                    ?.toLowerCase()
                                                    .includes(input.toLowerCase())
                                            }
                                            onChange={handleEmployeeChange}
                                            options={employeeOptions}
                                        />
                                    </div>

                                    {showDept && (
                                        <div className="mt-3">
                                            <label className="form-label fw-semibold mb-2">
                                                Department
                                            </label>
                                            <Select
                                                size="large"
                                                style={{ width: "100%" }}
                                                placeholder={selectedEmployee ? "Select Department" : "Choose a manager first"}
                                                disabled={!selectedEmployee}
                                                showSearch
                                                optionFilterProp="label"
                                                value={selectedMngDept}
                                                onChange={(value) => setSelectedMngDept(value)}
                                                options={departmentOptions}
                                            />
                                        </div>
                                    )}

                                    <button
                                        type="button"
                                        className="btn btn-primary w-100 mt-3 mobile-add-btn"
                                        onClick={addEmployeeCard}
                                        disabled={adding}
                                    >
                                        {adding ? (
                                            <span className="spinner-border spinner-border-sm me-2"></span>
                                        ) : (
                                            <i className="bi bi-plus-circle me-2"></i>
                                        )}
                                        Add
                                    </button>
                                </div>
                            </div>

                        </div>

                        <div className="row">
                            {employeeCards.map((employee) => (
                                <div
                                    className="col-md-12 mb-4"
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
                                                <label className="form-label fw-bold d-flex align-items-center flex-wrap gap-2">
                                                    Select KPI(s)
                                                    {employee.currentDeptName && (
                                                        <span className="kpi-dept-chip current">
                                                            <i className="bi bi-diagram-3 me-1"></i>
                                                            {employee.currentDeptName}
                                                        </span>
                                                    )}
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
                                                                <div className="mt-2">
                                                                    • To add KPIs from another department, choose the same {showDept ? "manager" : "employee"} with that department and press <strong>Add</strong>. KPIs already chosen stay in the table.
                                                                </div>
                                                                <div className="mt-2 text-warning">
                                                                    <strong>Example:</strong> 40% + 30% + 30% = 100%
                                                                </div>
                                                            </div>
                                                        }
                                                    >
                                                        <i
                                                            className="bi bi-info-circle-fill text-primary"
                                                            style={{ cursor: "pointer" }}
                                                        />
                                                    </Tooltip>
                                                </label>

                                                {/* Only the current department's KPIs — options and
                                                    selected values alike. */}
                                                <Select
                                                    mode="multiple"
                                                    allowClear
                                                    showSearch
                                                    style={{ width: "100%" }}
                                                    placeholder={`Search and select ${employee.currentDeptName || ""} KPI(s)`}
                                                    optionFilterProp="label"
                                                    value={currentDeptSelection(employee)}
                                                    onChange={selectedIds =>
                                                        handleKPISelectionDropdown(
                                                            employee.employeeId,
                                                            selectedIds
                                                        )
                                                    }
                                                    options={(employee.availableKPIs || []).map(kpi => ({
                                                        value: Number(kpi.Id),
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
                                                            <th width="150">KPI</th>
                                                            <th width="55">UoM</th>
                                                            <th width="110" className="text-center">
                                                                Target
                                                            </th>
                                                            <th width="110" className="text-center">
                                                                Weight
                                                            </th>
                                                            <th width="300" className="text-center">
                                                                Target Description
                                                            </th>
                                                            <th width="70" className="text-center">
                                                                Action
                                                            </th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {employee.kpis.map((selected, index) => {
                                                            const kpi = kpiDetailsOf(employee, selected);
                                                            return (
                                                                <tr key={selected.kpiId}>
                                                                    <td className="text-center">
                                                                        <span className="badge bg-light-secondary">
                                                                            {index + 1}
                                                                        </span>
                                                                    </td>
                                                                    <td>
                                                                        <div className="d-flex align-items-center">

                                                                            <Tooltip
                                                                                title={kpi.name}
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
                                                                                    {kpi.name?.length > 28
                                                                                        ? `${kpi.name.substring(0, 28)}...`
                                                                                        : kpi.name}
                                                                                </span>
                                                                            </Tooltip>

                                                                            {kpi.objectives && (
                                                                                <Tooltip
                                                                                    title={
                                                                                        <div
                                                                                            className="quill-tooltip-content"
                                                                                            dangerouslySetInnerHTML={{
                                                                                                __html: kpi.objectives
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
                                                                        {kpi.dept && (
                                                                            <span className="kpi-dept-chip mt-1">
                                                                                {kpi.dept}
                                                                            </span>
                                                                        )}
                                                                    </td>
                                                                    <td><span>{kpi.uom}</span></td>
                                                                    <td>
                                                                        <input
                                                                            type="number"
                                                                            min="0"
                                                                            className="form-control form-control-sm text-center"
                                                                            value={selected.target || ""}
                                                                            onChange={(e) =>
                                                                                updateKPIField(
                                                                                    employee.employeeId,
                                                                                    selected.kpiId,
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
                                                                                    selected.kpiId,
                                                                                    "weightage",
                                                                                    e.target.value
                                                                                )
                                                                            }
                                                                            onWheel={(e) => e.target.blur()}
                                                                            placeholder='0'
                                                                        />
                                                                    </td>
                                                                    <td>
                                                                        <input
                                                                            type="text"
                                                                            className="form-control form-control-sm"
                                                                            value={selected.TargetDescription || ""}
                                                                            onChange={(e) =>
                                                                                updateKPIField(
                                                                                    employee.employeeId,
                                                                                    selected.kpiId,
                                                                                    "TargetDescription",
                                                                                    e.target.value
                                                                                )
                                                                            }
                                                                            placeholder='Enter target description'
                                                                        />
                                                                    </td>
                                                                    <td className="text-center">
                                                                        <Tooltip title="Remove KPI">
                                                                            <button
                                                                                className="btn btn-light-danger btn-sm rounded-circle"
                                                                                onClick={() =>
                                                                                    removeKPI(
                                                                                        employee.employeeId,
                                                                                        selected.kpiId
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

.kpi-dept-chip {
    display: inline-flex;
    align-items: center;
    padding: 2px 9px;
    border-radius: 20px;
    background: #f1f5f9;
    color: #64748b;
    font-size: 11px;
    font-weight: 600;
}

.kpi-dept-chip.current {
    background: #eef4ff;
    color: #2563eb;
}

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