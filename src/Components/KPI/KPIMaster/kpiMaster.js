import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import '../../Config/Loader.css';
import Base1 from '../../Config/Base1';
import { fetchWithAuth } from "../../../utils/api";
import Swal from 'sweetalert2';
import { useLocation } from "react-router-dom";
import { Dropdown, Menu, message, Modal, Tooltip, Select } from 'antd';
import KpiModal from './kpiModel';
import { getKPIs, getManagerKPIs, manageKPI, getChildKPIs } from '../services/kpiServices';
import KpiEditModal from './KpiEditModal';

export default function KPIMaster() {

    const navigate = useNavigate();
    const location = useLocation();
    const [sessionUserData, setsessionUserData] = useState({});
    const [sessionActionIds, setSessionActionIds] = useState([]);
    const [modules, setModules] = useState([]);
    const [menuData, setMenuData] = useState([]);
    const [activeTab, setActiveTab] = useState("");
    const [openCreateKPI, setOpenCreateKPI] = useState(false);
    const [organizationKPIData, setOrganizationKPIData] = useState([]);
    const [managerKpis, setManagerKpis] = useState([]);
    const [departmentKPIData, setDepartmentKPIData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [openEditModal, setOpenEditModal] = useState(false);
    const [uomTypes, setUOMTypes] = useState([]);
    const [sessionModuleId, setSessionModuleId] = useState(null);
    const [selectedKPI, setSelectedKPI] = useState(null);
    const [departments, setDepartments] = useState([]);
    const [childKpisMap, setChildKpisMap] = useState({});
    const [selectedDeptId, setSelectedDeptId] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [deleteKPI, setDeleteKPI] = useState(null);
    const [saving, setSaving] = useState(false);
    const [selectedParentKPIId, setSelectedParentKPIId] = useState(null);
    const [openChildTab, setOpenChildTab] = useState(false);
    const [selectedParentUOMId, setSelectedParentUOMId] = useState(null);
    const [recordsPerPage, setRecordsPerPage] = useState(8);
    const [currentPage, setCurrentPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState("");
    const [showCurrentPeriodOnly, setShowCurrentPeriodOnly] = useState(true);
    const [expandedRows, setExpandedRows] = useState(new Set());
    // Search
    const [parentKpiSearch, setParentKpiSearch] = useState("");

    // Pagination
    const [parentKpiPage, setParentKpiPage] = useState(1);
    const parentKpiRecordsPerPage = 5;

    useEffect(() => {
        const userDataString = sessionStorage.getItem("userData");
        if (userDataString) {
            const userData = JSON.parse(userDataString);
            setsessionUserData(userData);

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
            setSelectedDeptId(sessionUserData?.DeptId);
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
            const sessionDDL = sessionStorage.getItem("ddlKPIMasterData");

            if (sessionDDL) {
                const parsed = JSON.parse(sessionDDL);

                setDepartments(parsed.depts || []);
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

            const deptsFilteredData = data.ResultData.filter(
                (item) => item.DDLName === "Departments"
            );

            setDepartments(deptsFilteredData || []);

            sessionStorage.setItem(
                "ddlKPIMasterData",
                JSON.stringify({
                    depts: deptsFilteredData,
                })
            );

        } catch (error) {
            console.error("Failed to fetch DDL data:", error);
            setDepartments([]);
        }
    };

    const fetchKPIList = async () => {
        try {
            setLoading(true);
            const response = await getKPIs({
                orgId: sessionUserData?.OrgId,
                deptId: activeTab === "department" ? selectedDeptId : 0,
                kpiLevel: activeTab === "organization" ? 1 : 2
            });

            if (activeTab === "organization") {
                setOrganizationKPIData(response?.data || []);
            } else {
                setDepartmentKPIData(response?.data || []);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab && sessionUserData?.OrgId) {
            fetchKPIList();
        }
    }, [activeTab, sessionUserData?.OrgId]);

    const fetchManagerKPIs = async () => {
        try {
            setLoading(true);
            const response = await getManagerKPIs({
                orgId: sessionUserData?.OrgId,
                employeeId: sessionUserData?.Id,
                periodId: showCurrentPeriodOnly ? sessionUserData?.PeriodId : 0,
            });

            setManagerKpis(response?.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchChildKPIs = async (parentId) => {
        try {
            setLoading(true);

            const response = await getChildKPIs({
                orgId: sessionUserData?.OrgId,
                deptId: sessionUserData?.DeptId,
                parentId,
            });

            setChildKpisMap(prev => ({
                ...prev,
                [parentId]: response?.data || [],
            }));
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const toggleRow = (parentId) => {
        const newExpanded = new Set(expandedRows);

        if (newExpanded.has(parentId)) {
            newExpanded.delete(parentId);
        } else {
            newExpanded.add(parentId);

            if (!childKpisMap[parentId]) {
                fetchChildKPIs(parentId);
            }
        }

        setExpandedRows(newExpanded);
    };

    useEffect(() => {
        if (activeTab && sessionUserData?.OrgId) {
            fetchKPIList();
        }
    }, [activeTab, sessionUserData?.OrgId]);

    useEffect(() => {
        if (sessionUserData?.OrgId) {
            fetchManagerKPIs();
        }
    }, [sessionUserData, showCurrentPeriodOnly]);

    useEffect(() => {
        if (selectedDeptId) {
            fetchKPIList();
        }
    }, [selectedDeptId]);

    const fetchMasterTypes = async () => {
        try {
            const response = await fetchWithAuth(
                `Portal/GetMasterTypes?OrgId=${sessionUserData?.OrgId}&DeptId=0&ModuleId=${sessionModuleId}&TypeCategory=4`,
                {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                }
            );

            if (!response.ok) throw new Error("Network response was not ok");

            const data = await response.json();
            setUOMTypes(data.ResultData || []);

        } catch (error) {
            console.error("Failed to fetch types data:", error);
            setUOMTypes([]);
        }
    };

    useEffect(() => {
        if (sessionUserData.OrgId) {
            fetchMasterTypes();
            fetchDDLData();
        }
    }, [sessionUserData]);

    const filteredParentKpis = Array.isArray(organizationKPIData)
        ? organizationKPIData
            // .filter((item) => {
            //     if (!showCurrentPeriodOnly) return true;
            //     return item.PeriodId === sessionUserData?.PeriodId;
            // })
            .filter((item) =>
                item.KPIName?.toLowerCase().includes(parentKpiSearch.toLowerCase())
            )
        : [];

    const parentKpiLastIndex = parentKpiPage * parentKpiRecordsPerPage;
    const parentKpiFirstIndex = parentKpiLastIndex - parentKpiRecordsPerPage;

    const parentKpiRecords = filteredParentKpis.slice(
        parentKpiFirstIndex,
        parentKpiLastIndex
    );

    const parentKpiTotalPages = Math.ceil(
        filteredParentKpis.length / parentKpiRecordsPerPage
    );

    const handleParentKpiPageChange = (page) => {
        setParentKpiPage(page);
    };

    const getParentKpiPageNumbers = () => {
        const pages = [];

        if (parentKpiTotalPages <= 7) {
            for (let i = 1; i <= parentKpiTotalPages; i++) {
                pages.push(i);
            }
        } else {
            if (parentKpiPage <= 4) {
                for (let i = 1; i <= 5; i++) pages.push(i);
                pages.push("...");
                pages.push(parentKpiTotalPages);
            } else if (parentKpiPage > parentKpiTotalPages - 4) {
                pages.push(1);
                pages.push("...");
                for (let i = parentKpiTotalPages - 4; i <= parentKpiTotalPages; i++) {
                    pages.push(i);
                }
            } else {
                pages.push(1);
                pages.push("...");
                for (let i = parentKpiPage - 1; i <= parentKpiPage + 1; i++) {
                    pages.push(i);
                }
                pages.push("...");
                pages.push(parentKpiTotalPages);
            }
        }

        return pages;
    };

    const filteredKpis = Array.isArray(managerKpis)
        ? managerKpis
            .filter((item) => {
                if (!showCurrentPeriodOnly) return true;

                return item.PeriodId === sessionUserData?.PeriodId;
            })
            .filter((item) => {
                const query = searchQuery.toLowerCase();

                return (
                    item.KPIName?.toLowerCase().includes(query)
                    // item.Objectives?.toLowerCase().includes(query)
                );
            })
        : [];

    // Update your pagination variables to use filteredKpis
    const indexOfLastRecord = currentPage * recordsPerPage;
    const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
    const currentRecords = filteredKpis.slice(indexOfFirstRecord, indexOfLastRecord);
    const totalPages = Math.ceil(filteredKpis.length / recordsPerPage);

    const handlePageChange = (pageNumber) => {
        setCurrentPage(pageNumber);
    };

    const getPageNumbers = () => {
        const pageNumbers = [];
        const threshold = 2; // How many pages to show around the current page

        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pageNumbers.push(i);
        } else {
            if (currentPage <= 4) {
                // Near the start: 1 2 3 4 5 ... 50
                for (let i = 1; i <= 5; i++) pageNumbers.push(i);
                pageNumbers.push('...');
                pageNumbers.push(totalPages);
            } else if (currentPage > totalPages - 4) {
                // Near the end: 1 ... 46 47 48 49 50
                pageNumbers.push(1);
                pageNumbers.push('...');
                for (let i = totalPages - 4; i <= totalPages; i++) pageNumbers.push(i);
            } else {
                // In the middle: 1 ... 14 15 16 ... 50
                pageNumbers.push(1);
                pageNumbers.push('...');
                for (let i = currentPage - 1; i <= currentPage + 1; i++) pageNumbers.push(i);
                pageNumbers.push('...');
                pageNumbers.push(totalPages);
            }
        }
        return pageNumbers;
    };

    const handleSaveKPI = async (data) => {
        setSaving(true);
        try {
            const payload = {
                Type: "ADD",
                OrgId: sessionUserData?.OrgId,
                UserId: sessionUserData?.Id,
                JsonData: data.map(item => ({
                    KPILevel: activeTab === "organization" ? 1 : 2,
                    RefId: activeTab === "organization"
                        ? null
                        : sessionUserData?.DeptId,
                    UOMId: item.uom,
                    KPIName: item.KPIName,
                    Objectives: item.objective,
                    ParentId: activeTab === "organization"
                        ? null
                        : item.parentId,
                    PeriodId: sessionUserData?.PeriodId,
                    Measurables: item.Measurables,
                }))
            };

            const response = await manageKPI(payload);
            const result = response?.data?.result?.[0];

            if (result?.ResponseCode === 200) {
                message.success(
                    result?.Message || "KPI Created Successfully"
                );

                setOpenCreateKPI(false);
                fetchChildKPIs(selectedParentKPIId);
                fetchKPIList();

            } else if (result?.ResponseCode === 409) {
                message.warning(
                    result?.Message || "KPI already exists."
                );
            } else {
                message.error(
                    result?.Message || "Failed to save KPI"
                );
            }
        } catch (error) {
            console.error(error);
            message.error("Something went wrong");
        } finally {
            setSaving(false);
        }
    };

    const handleUpdateKPI = async (data) => {
        try {
            const payload = {
                Type: "EDIT",
                OrgId: sessionUserData?.OrgId,
                UserId: sessionUserData?.Id,
                JsonData: [
                    {
                        Id: data.Id,
                        KPILevel: activeTab === "organization" ? 1 : 2,
                        UOMId: data.UOM,
                        RefId: activeTab === "organization"
                            ? null
                            : data.DeptId,
                        KPIName: data.KPIName,
                        Objectives: data.Objectives,
                        Measurables: data.Measurables,
                        PeriodId: sessionUserData?.PeriodId,
                        ParentId: activeTab === "organization"
                            ? null
                            : data.ParentId,
                    }
                ]
            };

            const response = await manageKPI(payload);
            const result = response?.data?.result?.[0];

            if (result?.ResponseCode === 200) {
                message.success(
                    result?.Message || "KPI Created Successfully"
                );

                setOpenEditModal(false);
                fetchKPIList();
                fetchChildKPIs(data.ParentId);

            } else if (result?.ResponseCode === 409) {

                message.warning(
                    result?.Message || "KPI already exists."
                );

            } else {

                message.error(
                    result?.Message || "Failed to save KPI"
                );
            }
        } catch (error) {
            console.error(error);
            message.error("Something went wrong");
        }
    };

    const handleDeleteKPI = async () => {
        if (!deleteKPI) return;

        setDeleteLoading(true);

        const payload = {
            Type: "INACTIVE",
            OrgId: sessionUserData.OrgId,
            UserId: sessionUserData.Id,
            JsonData: [
                {
                    Id: deleteKPI.Id,
                },
            ],
        };

        try {
            const response = await manageKPI(payload);

            if (
                response?.success &&
                response?.data?.result?.[0]?.ResponseCode === 200
            ) {
                message.success(response.data.result[0].Message);

                setDeleteKPI(null);
                fetchKPIList();
                fetchChildKPIs(deleteKPI.ParentId);
            } else {
                message.error(
                    response?.data?.result?.[0]?.Message || "Unable to delete KPI."
                );
            }
        } catch (err) {
            console.error(err);
            message.error("Something went wrong.");
        } finally {
            setDeleteLoading(false);
        }
    };

    const iconColors = ['#FF6B35', '#00B8D9', '#36B37E', '#FFAB00', '#6554C0', '#FF5630'];
    const showOrgTab = sessionActionIds?.includes(37);
    const showDeptTab = sessionActionIds?.includes(38);
    const showAdd = sessionActionIds?.includes(1);
    const showEdit = sessionActionIds?.includes(3);
    const showDelete = sessionActionIds?.includes(11);

    useEffect(() => {
        if (showOrgTab) {
            setActiveTab("organization");
        } else if (showDeptTab) {
            setActiveTab("department");
        }
    }, [sessionActionIds]);

    const stripHtml = (html) => {
        const div = document.createElement("div");
        div.innerHTML = html || "";
        return div.textContent || div.innerText || "";
    };

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

                <div id="kt_app_content" className="app-content flex-column-fluid" style={{ marginTop: '-30px' }}>
                    <div id="kt_app_content_container" className="app-container container-xxl">
                        <div
                            className="d-flex align-items-center p-2 bg-white rounded-pill shadow-sm mb-4 w-100"
                            style={{ border: "1px solid #e9ecef" }}
                        >
                            {showOrgTab && (
                                <button
                                    className={`btn rounded-pill px-4 py-2 fw-semibold ${activeTab === "organization"
                                        ? "btn-primary shadow-sm"
                                        : "btn-light border-0"
                                        }`}
                                    onClick={() => setActiveTab("organization")}
                                >
                                    <i className="fa-solid fa-building me-2"></i>
                                    Organization KPI
                                </button>
                            )}

                            {showDeptTab && (
                                <button
                                    className={`btn rounded-pill px-4 py-2 fw-semibold ms-2 ${activeTab === "department"
                                        ? "btn-primary shadow-sm"
                                        : "btn-light border-0"
                                        }`}
                                    onClick={() => setActiveTab("department")}
                                >
                                    <i className="fa-solid fa-users-gear me-2"></i>
                                    Department KPI
                                </button>
                            )}

                            <Link
                                to="/kpi/allocate-kpi"
                                className={`btn rounded-pill px-4 py-2 fw-semibold btn-light-primary ms-2`}
                            >
                                <i className="bi bi-bullseye me-2"></i>
                                Allocate KPI
                            </Link>

                            <div className="ms-auto">
                                {showAdd && (
                                    <button
                                        className="premium-btn-primary btn-sm"
                                        onClick={() => setOpenCreateKPI(true)}
                                        title={activeTab === "department" ? "Coming soon..!" : ""}
                                        disabled={activeTab === "department"}
                                    >
                                        <span className="premium-btn-icon">
                                            <i className="bi bi-plus-lg"></i>
                                        </span>
                                        <span>Create KPI</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        {activeTab === "organization" && (
                            <div className="card shadow-sm border-0">
                                <div className="card-body">
                                    <div className="card border-0 shadow-sm mb-4">
                                        <div className="card-body py-3">
                                            <div className="d-flex justify-content-between align-items-center">
                                                <h3 className="mb-0">Organization KPI Management</h3>
                                                <div style={{ minWidth: "280px" }}>
                                                    <div className="input-group input-group-sm">
                                                        <span className="input-group-text bg-light border-end-0">
                                                            <i className="fa fa-search text-muted"></i>
                                                        </span>
                                                        <input
                                                            type="text"
                                                            className="form-control border-start-0"
                                                            placeholder="Search KPI Name..."
                                                            value={parentKpiSearch}
                                                            onChange={(e) => {
                                                                setParentKpiSearch(e.target.value);
                                                                setParentKpiPage(1);
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="table-responsive">
                                        <table className="table align-middle table-hover gs-7 gy-4 mb-0 fs-6">
                                            <thead className="bg-light-primary">
                                                <tr className="text-start text-muted fw-bold fs-7 text-uppercase border-bottom-2 border-primary">
                                                    <th>#</th>
                                                    <th>KPI Name</th>
                                                    <th>Registered During</th>
                                                    <th>Objective</th>
                                                    <th>UoM</th>
                                                    <th width="80">Actions</th>
                                                </tr>
                                            </thead>

                                            <tbody className="fw-semibold text-gray-700">
                                                {parentKpiRecords.map((item, index) => (
                                                    <tr key={item.Id}>
                                                        <td>{index + 1}</td>
                                                        <td>{item.KPIName}</td>
                                                        <td>{item.Registered_During || '---'}</td>
                                                        <td style={{ maxWidth: "320px" }}>
                                                            <Tooltip
                                                                title={stripHtml(item.Objectives) || "-"}
                                                                placement="topLeft"
                                                                overlayStyle={{ maxWidth: 350 }}
                                                            >
                                                                <span style={{ cursor: "pointer" }}>
                                                                    {(() => {
                                                                        const text = stripHtml(item.Objectives);
                                                                        return text
                                                                            ? text.length > 90
                                                                                ? `${text.substring(0, 90)}...`
                                                                                : text
                                                                            : "-";
                                                                    })()}
                                                                </span>
                                                            </Tooltip>
                                                        </td>
                                                        <td>{item.UOMName || '---'}</td>
                                                        <td>
                                                            <Dropdown
                                                                trigger={["hover"]}
                                                                placement="bottomRight"
                                                                overlayClassName="premium-dropdown"
                                                                menu={{
                                                                    items: [
                                                                        {
                                                                            key: "tree",
                                                                            disabled: true,
                                                                            label: (
                                                                                <Tooltip
                                                                                    title="Coming Soon"
                                                                                    placement="left"
                                                                                >
                                                                                    <div className="dropdown-item-premium opacity-50">
                                                                                        <i className="bi bi-diagram-3-fill text-secondary"></i>
                                                                                        <span>Tree View</span>

                                                                                        <span className="badge bg-warning text-dark ms-auto">
                                                                                            Soon
                                                                                        </span>
                                                                                    </div>
                                                                                </Tooltip>
                                                                            ),
                                                                        },
                                                                        {
                                                                            key: "edit",
                                                                            label: (
                                                                                <Tooltip
                                                                                    title={
                                                                                        !showEdit
                                                                                            ? "You don't have access to edit this KPI."
                                                                                            : item.Status === "RELEASED"
                                                                                                ? "Released KPIs cannot be edited."
                                                                                                : "Edit KPI"
                                                                                    }
                                                                                >
                                                                                    <div
                                                                                        className={`dropdown-item-premium ${!showEdit || item.Status === "RELEASED"
                                                                                            ? "opacity-50"
                                                                                            : ""
                                                                                            }`}
                                                                                        onClick={(e) => {
                                                                                            if (!showEdit || item.Status === "RELEASED") {
                                                                                                e.stopPropagation();
                                                                                                return;
                                                                                            }

                                                                                            setSelectedKPI(item);
                                                                                            setOpenEditModal(true);
                                                                                        }}
                                                                                    >
                                                                                        <i className="bi bi-pencil-square text-warning"></i>
                                                                                        <span>Edit KPI</span>
                                                                                    </div>
                                                                                </Tooltip>
                                                                            ),
                                                                        },
                                                                        {
                                                                            type: "divider",
                                                                        },
                                                                        {
                                                                            key: "delete",
                                                                            danger: true,
                                                                            disabled: !showDelete,
                                                                            label: (
                                                                                <Tooltip
                                                                                    title={
                                                                                        !showDelete
                                                                                            ? "You don't have access to delete this KPI."
                                                                                            : ""
                                                                                    }
                                                                                    placement="left"
                                                                                >
                                                                                    <div className="dropdown-item-premium">
                                                                                        <i className="bi bi-trash3 text-danger"></i>
                                                                                        <span>Delete KPI</span>
                                                                                    </div>
                                                                                </Tooltip>
                                                                            ),
                                                                            onClick: () => {
                                                                                if (!showDelete) return;

                                                                                setDeleteKPI(item);
                                                                            },
                                                                        },
                                                                    ],
                                                                }}
                                                            >
                                                                <button className="action-menu-btn">
                                                                    <i className="bi bi-three-dots-vertical"></i>
                                                                </button>
                                                            </Dropdown>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        <div className="d-flex justify-content-between align-items-center flex-wrap pt-10">
                                            <div className="d-flex align-items-center gap-4 flex-wrap">
                                                <div className="fs-6 fw-bold text-gray-700">
                                                    Showing {filteredParentKpis.length > 0 ? parentKpiFirstIndex + 1 : 0}
                                                    to {Math.min(parentKpiLastIndex, filteredParentKpis.length)}
                                                    of {filteredParentKpis.length} entries
                                                    {parentKpiSearch &&
                                                        ` (filtered from ${managerKpis.length} total entries)`}
                                                </div>
                                            </div>

                                            <ul className="pagination">
                                                <li className={`page-item previous ${parentKpiPage === 1 ? 'disabled' : ''}`}>
                                                    <button className="page-link cursor-pointer" onClick={() => handleParentKpiPageChange(parentKpiPage - 1)}>
                                                        <i className="ki-outline ki-left fs-2"></i>
                                                    </button>
                                                </li>
                                                {getParentKpiPageNumbers().map((pageNum, i) => (
                                                    <li
                                                        key={i}
                                                        className={`page-item ${parentKpiPage === pageNum ? 'active' : ''} ${pageNum === '...' ? 'disabled' : ''}`}
                                                    >
                                                        {pageNum === '...' ? (
                                                            <span className="page-link">...</span>
                                                        ) : (
                                                            <button className="page-link cursor-pointer" onClick={() => handleParentKpiPageChange(pageNum)}>
                                                                {pageNum}
                                                            </button>
                                                        )}
                                                    </li>
                                                ))}
                                                <li className={`page-item next ${parentKpiPage === totalPages ? 'disabled' : ''}`}>
                                                    <button className="page-link cursor-pointer" onClick={() => handleParentKpiPageChange(parentKpiPage + 1)}>
                                                        <i className="ki-outline ki-right fs-2"></i>
                                                    </button>
                                                </li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === "department" && (
                            <div className="card shadow-sm border-0">
                                <div className="card-body">
                                    <div className="card border-0 shadow-sm mb-4">
                                        <div className="card-body py-3">
                                            <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
                                                <div className="d-flex justify-content-between align-items-center">

                                                    <div>
                                                        <h6 className="fw-bold mb-1 text-dark">
                                                            {openChildTab ? "Child KPI Management" : "Department KPI Management"}
                                                        </h6>
                                                        <small className="text-muted">
                                                            {openChildTab
                                                                ? "Manage child KPIs assigned to the selected parent KPI."
                                                                : "Manage department-level KPIs."}
                                                        </small>
                                                        {openChildTab && (
                                                            <nav className="mt-2">
                                                                <span
                                                                    className="text-primary fw-semibold"
                                                                    style={{ cursor: "pointer" }}
                                                                    onClick={() => setOpenChildTab(false)}
                                                                >
                                                                    Parent KPIs
                                                                </span>

                                                                <i className="bi bi-chevron-right mx-2 text-muted"></i>

                                                                <span className="text-dark fw-bold">
                                                                    Child KPIs
                                                                </span>
                                                            </nav>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">

                                                    {/* Right Side */}
                                                    <div style={{ width: "320px" }}>
                                                        <div className="input-group">
                                                            <span
                                                                className="input-group-text bg-light border-end-0"
                                                                style={{
                                                                    borderRadius: "10px 0 0 10px",
                                                                }}
                                                            >
                                                                <i className="fa fa-search text-muted"></i>
                                                            </span>

                                                            <input
                                                                type="text"
                                                                className="form-control border-start-0 border-end-0"
                                                                placeholder="Search KPI by name or objective..."
                                                                value={searchQuery}
                                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                                style={{
                                                                    boxShadow: "none",
                                                                }}
                                                            />

                                                            {searchQuery && (
                                                                <span
                                                                    className="input-group-text bg-white border-start-0"
                                                                    style={{
                                                                        cursor: "pointer",
                                                                        borderRadius: "0 10px 10px 0",
                                                                    }}
                                                                    onClick={() => setSearchQuery("")}
                                                                >
                                                                    <i className="bi bi-x-circle-fill text-muted"></i>
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Allocated kpis */}
                                    {!openChildTab && (
                                        <div className="table-responsive">
                                            <div className="d-flex align-items-center gap-3 bg-light p-2 mb-2">
                                                <span className="text-muted fw-bold">Show</span>
                                                <Select
                                                    style={{ width: 80 }}
                                                    size="small"
                                                    value={recordsPerPage}
                                                    onChange={(value) => {
                                                        setRecordsPerPage(value);
                                                        setCurrentPage(1);
                                                    }}
                                                    options={[
                                                        { value: 10, label: "10" },
                                                        { value: 50, label: "50" },
                                                        { value: 100, label: "100" }
                                                    ]}
                                                />
                                                <span className="text-muted fw-bold">entries</span>
                                            </div>

                                            <table
                                                className="table align-middle table-hover gs-7 gy-4 mb-0 fs-6 parent-kpi-table"
                                                style={{ tableLayout: "fixed", width: "100%" }}
                                            >
                                                <thead className="bg-light">
                                                    <tr className="text-start text-muted fw-bold fs-7 text-uppercase">
                                                        <th width="40" className="border-0"></th>
                                                        <th width="60" className="border-0">#</th>
                                                        <th className="border-0">KPI Name</th>
                                                        <th className="border-0" width="170">Registered During</th>
                                                        <th className="border-0" width="200">Measurables</th>
                                                        <th className="border-0">Objective</th>
                                                        <th className="border-0" width="140">UOM</th>
                                                        <th width="90" className="border-0 text-center">Actions</th>
                                                    </tr>
                                                </thead>

                                                <tbody className="fw-semibold text-gray-700">
                                                    {currentRecords?.length > 0 ? (
                                                        currentRecords.map((item, index) => {
                                                            const isExpanded = expandedRows.has(item.ParentId);
                                                            const children = childKpisMap[item.ParentId] || [];
                                                            const accent = ["accent-primary", "accent-success", "accent-info"][index % 3];
                                                            return (
                                                                <React.Fragment key={item.Id}>
                                                                    <tr
                                                                        style={{ cursor: "pointer" }}
                                                                        className={`kpi-row ${accent} ${isExpanded ? "bg-light" : ""}`}
                                                                        onClick={() => toggleRow(item.ParentId)}
                                                                    >
                                                                        <td className="text-center border-0">
                                                                            <span className="chevron-btn d-inline-flex align-items-center justify-content-center rounded-3 bg-light-primary">
                                                                                <i
                                                                                    className={`bi ${isExpanded ? "bi-chevron-down" : "bi-chevron-right"} text-primary`}
                                                                                ></i>
                                                                            </span>
                                                                        </td>
                                                                        <td className="border-0">
                                                                            <span className="avatar-square d-inline-flex align-items-center justify-content-center rounded-3 bg-primary text-white fw-bold">
                                                                                {index + 1}
                                                                            </span>
                                                                        </td>
                                                                        <td className="border-0">
                                                                            <div className="d-flex align-items-center gap-2">
                                                                                <span className="avatar-circle d-inline-flex align-items-center justify-content-center rounded-circle bg-light-primary">
                                                                                    <i className="bi bi-bullseye text-primary"></i>
                                                                                </span>
                                                                                <div>
                                                                                    <div className="fw-bold text-gray-800">{item.KPIName}</div>
                                                                                    {children.length > 0 && (
                                                                                        <span className="badge badge-light-secondary rounded-pill fw-normal">
                                                                                            {children.length} Child KPI{children.length > 1 ? "s" : ""}
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        </td>
                                                                        <td className="border-0">
                                                                            <i className="bi bi-calendar3 text-muted me-1"></i>
                                                                            {item.Registered_During || '---'}
                                                                        </td>
                                                                        <td className="border-0">
                                                                            {item.Measurables || '---'}
                                                                        </td>
                                                                        <td className="border-0" style={{ maxWidth: "320px" }}>
                                                                            <Tooltip
                                                                                title={stripHtml(item.Objectives) || "-"}
                                                                                placement="topLeft"
                                                                                overlayStyle={{ maxWidth: 350 }}
                                                                            >
                                                                                <span style={{ cursor: "pointer" }}>
                                                                                    {(() => {
                                                                                        const text = stripHtml(item.Objectives);
                                                                                        return text
                                                                                            ? text.length > 90
                                                                                                ? `${text.substring(0, 90)}...`
                                                                                                : text
                                                                                            : "-";
                                                                                    })()}
                                                                                </span>
                                                                            </Tooltip>
                                                                        </td>
                                                                        <td className="border-0">
                                                                            <span className="badge badge-light-info rounded-pill">{item.UOMName || "---"}</span>
                                                                        </td>
                                                                        <td className="border-0 text-center" onClick={(e) => e.stopPropagation()}>
                                                                            <Dropdown
                                                                                trigger={["hover"]}
                                                                                placement="bottomRight"
                                                                                overlayClassName="premium-dropdown"
                                                                                menu={{
                                                                                    items: [
                                                                                        {
                                                                                            key: "addKpi",
                                                                                            label: (
                                                                                                <div
                                                                                                    className="dropdown-item-premium"
                                                                                                    onClick={() => {
                                                                                                        if (!showAdd) return;
                                                                                                        setOpenCreateKPI(true);
                                                                                                        setSelectedParentKPIId(item.ParentId);
                                                                                                        setSelectedParentUOMId(item.UOMId);
                                                                                                    }}
                                                                                                >
                                                                                                    <i className="bi bi-node-plus-fill text-success"></i>
                                                                                                    <span>Create Child KPI</span>
                                                                                                </div>
                                                                                            ),
                                                                                        },
                                                                                    ],
                                                                                }}
                                                                            >
                                                                                <button className="action-menu-btn">
                                                                                    <i className="bi bi-three-dots-vertical"></i>
                                                                                </button>
                                                                            </Dropdown>
                                                                        </td>
                                                                    </tr>

                                                                    {isExpanded && (
                                                                        <tr>
                                                                            <td colSpan="7" className="p-0 border-0">
                                                                                <div className="child-kpi-wrapper">
                                                                                    <div className="child-header">
                                                                                        <i className="bi bi-diagram-3-fill me-2 text-primary"></i>

                                                                                        Child KPIs of
                                                                                        <span className="ms-1 text-primary">
                                                                                            "{item.KPIName}"
                                                                                        </span>

                                                                                        <span className="badge bg-light-primary text-primary ms-3 rounded-pill">
                                                                                            {children.length}
                                                                                        </span>
                                                                                    </div>

                                                                                    <table
                                                                                        className="table align-middle table-hover gs-7 gy-4 mb-0 fs-6 parent-kpi-table"
                                                                                        style={{ tableLayout: "fixed", width: "100%" }}
                                                                                    >
                                                                                        <thead className="bg-light">
                                                                                            <tr className="text-start text-muted fw-bold fs-7 text-uppercase">
                                                                                                <th width="40" className="border-0">#</th>
                                                                                                <th width="274" className="border-0">KPI Name</th>
                                                                                                <th width="170" className="border-0">Registered During</th>
                                                                                                <th width="150" className="border-0">Measurables</th>
                                                                                                <th width="300" className="border-0">Objective</th>
                                                                                                <th width="90" className="border-0 text-center">Actions</th>
                                                                                            </tr>
                                                                                        </thead>

                                                                                        <tbody>
                                                                                            {children.map((child, index) => (
                                                                                                <tr key={child.Id}>
                                                                                                    <td>{index + 1}</td>
                                                                                                    <td>
                                                                                                        <div className="fw-bold">
                                                                                                            {child.KPIName}
                                                                                                        </div>
                                                                                                        <div className="text-muted small">Child KPI</div>
                                                                                                    </td>
                                                                                                    <td>
                                                                                                        <span className="badge bg-light-info text-info rounded-pill">
                                                                                                            {child.Registered_During}
                                                                                                        </span>
                                                                                                    </td>
                                                                                                    <td>
                                                                                                        <span className="badge bg-light-info text-info rounded-pill">
                                                                                                            {child.Measurables || '---'}
                                                                                                        </span>
                                                                                                    </td>
                                                                                                    <td>
                                                                                                        {(() => {
                                                                                                            const tempDiv = document.createElement("div");
                                                                                                            tempDiv.innerHTML = child.Objectives || "";
                                                                                                            const plainText = tempDiv.textContent || tempDiv.innerText || "";

                                                                                                            return (
                                                                                                                <Tooltip
                                                                                                                    title={
                                                                                                                        <div
                                                                                                                            className="quill-tooltip-content"
                                                                                                                            dangerouslySetInnerHTML={{
                                                                                                                                __html: child.Objectives || "",
                                                                                                                            }}
                                                                                                                        />
                                                                                                                    }
                                                                                                                >
                                                                                                                    <span>
                                                                                                                        {plainText.length > 60
                                                                                                                            ? `${plainText.substring(0, 60)}...`
                                                                                                                            : plainText}
                                                                                                                    </span>
                                                                                                                </Tooltip>
                                                                                                            );
                                                                                                        })()}
                                                                                                    </td>
                                                                                                    <td className="text-center">
                                                                                                        <Dropdown
                                                                                                            trigger={["hover"]}
                                                                                                            placement="bottomRight"
                                                                                                            overlayClassName="premium-dropdown"
                                                                                                            menu={{
                                                                                                                items: [
                                                                                                                    {
                                                                                                                        key: "edit",
                                                                                                                        label: (
                                                                                                                            <Tooltip
                                                                                                                                title={
                                                                                                                                    !showEdit
                                                                                                                                        ? "You don't have access to edit this KPI."
                                                                                                                                        : child.Status === "RELEASED"
                                                                                                                                            ? "Released KPIs cannot be edited."
                                                                                                                                            : "Edit KPI"
                                                                                                                                }
                                                                                                                            >
                                                                                                                                <div
                                                                                                                                    className={`dropdown-item-premium ${!showEdit || child.Status === "RELEASED" ? "opacity-50" : ""}`}
                                                                                                                                    onClick={(e) => {
                                                                                                                                        if (!showEdit || child.Status === "RELEASED") {
                                                                                                                                            e.stopPropagation();
                                                                                                                                            return;
                                                                                                                                        }

                                                                                                                                        setSelectedKPI(child);
                                                                                                                                        setOpenEditModal(true);
                                                                                                                                    }}
                                                                                                                                >
                                                                                                                                    <i className="bi bi-pencil-square text-warning"></i>
                                                                                                                                    <span>Edit KPI</span>
                                                                                                                                </div>
                                                                                                                            </Tooltip>
                                                                                                                        ),
                                                                                                                    },
                                                                                                                    { type: "divider" },
                                                                                                                    {
                                                                                                                        key: "delete",
                                                                                                                        danger: true,
                                                                                                                        disabled: !showDelete,
                                                                                                                        label: (
                                                                                                                            <div className="dropdown-item-premium">
                                                                                                                                <i className="bi bi-trash3 text-danger"></i>
                                                                                                                                <span>Delete KPI</span>
                                                                                                                            </div>
                                                                                                                        ),
                                                                                                                        onClick: () => {
                                                                                                                            if (!showDelete) return;
                                                                                                                            setDeleteKPI(child);
                                                                                                                        },
                                                                                                                    },
                                                                                                                ],
                                                                                                            }}
                                                                                                        >
                                                                                                            <button className="action-menu-btn">
                                                                                                                <i className="bi bi-three-dots-vertical"></i>
                                                                                                            </button>
                                                                                                        </Dropdown>
                                                                                                    </td>
                                                                                                </tr>
                                                                                            ))}
                                                                                        </tbody>
                                                                                    </table>
                                                                                </div>
                                                                            </td>
                                                                        </tr>
                                                                    )}
                                                                </React.Fragment>
                                                            );
                                                        })
                                                    ) : (
                                                        <tr>
                                                            <td colSpan="7" className="text-center py-5 text-muted">
                                                                No Department KPIs Found
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>

                                            <div className="d-flex justify-content-between align-items-center flex-wrap pt-10">
                                                <div className="d-flex align-items-center gap-4 flex-wrap">
                                                    <div className="fs-6 fw-bold text-gray-700">
                                                        Showing {filteredKpis.length > 0 ? indexOfFirstRecord + 1 : 0} to {Math.min(indexOfLastRecord, filteredKpis.length)} of {filteredKpis.length} entries
                                                        {searchQuery && ` (filtered from ${managerKpis?.length} total entries)`}
                                                    </div>
                                                </div>

                                                <ul className="pagination">
                                                    <li className={`page-item previous ${currentPage === 1 ? 'disabled' : ''}`}>
                                                        <button className="page-link cursor-pointer" onClick={() => handlePageChange(currentPage - 1)}>
                                                            <i className="ki-outline ki-left fs-2"></i>
                                                        </button>
                                                    </li>
                                                    {getPageNumbers().map((pageNum, i) => (
                                                        <li
                                                            key={i}
                                                            className={`page-item ${currentPage === pageNum ? 'active' : ''} ${pageNum === '...' ? 'disabled' : ''}`}
                                                        >
                                                            {pageNum === '...' ? (
                                                                <span className="page-link">...</span>
                                                            ) : (
                                                                <button className="page-link cursor-pointer" onClick={() => handlePageChange(pageNum)}>
                                                                    {pageNum}
                                                                </button>
                                                            )}
                                                        </li>
                                                    ))}
                                                    <li className={`page-item next ${currentPage === totalPages ? 'disabled' : ''}`}>
                                                        <button className="page-link cursor-pointer" onClick={() => handlePageChange(currentPage + 1)}>
                                                            <i className="ki-outline ki-right fs-2"></i>
                                                        </button>
                                                    </li>
                                                </ul>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>


            {/* Inactive KPI Modal */}
            <Modal
                open={!!deleteKPI}
                centered
                width={420}
                footer={null}
                onCancel={() => setDeleteKPI(null)}
            >
                <div className="text-center">
                    <div
                        style={{
                            width: 70,
                            height: 70,
                            margin: "0 auto",
                            borderRadius: "50%",
                            background: "#fef2f2",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <i
                            className="bi bi-trash3-fill"
                            style={{
                                color: "#dc2626",
                                fontSize: 28,
                            }}
                        />
                    </div>

                    <h4 className="mt-4 fw-bold">
                        Delete KPI
                    </h4>

                    <p className="text-muted">
                        Are you sure you want to delete
                        <br />
                        <strong>{deleteKPI?.KPIName}</strong>?
                    </p>

                    <div className="d-flex gap-3 mt-4">
                        <button
                            className="btn btn-light flex-fill btn-sm"
                            onClick={() => setDeleteKPI(null)}
                            disabled={deleteLoading}
                        >
                            Cancel
                        </button>
                        <button
                            className="btn btn-danger flex-fill btn-sm"
                            onClick={handleDeleteKPI}
                            disabled={deleteLoading}
                        >
                            {deleteLoading ? (
                                <>
                                    <span className="spinner-border spinner-border-sm me-2"></span>
                                    Deleting...
                                </>
                            ) : (
                                <>
                                    <i className="bi bi-trash3 me-2"></i>
                                    Delete
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </Modal>

            <style>
                {`
                    .quill-tooltip-content {
                        max-width: 400px;
                        max-height: 250px;
                        overflow-y: auto;
                    }

                    .quill-tooltip-content p {
                        margin-bottom: 5px;
                    }

                    .quill-tooltip-content ul,
                    .quill-tooltip-content ol {
                        padding-left: 20px;
                        margin-bottom: 5px;
                    }
                    .kpi-row { border-left: 4px solid transparent; }
                        .kpi-row.accent-primary { border-left-color: var(--bs-primary); }
                        .kpi-row.accent-success { border-left-color: var(--bs-success); }
                        .kpi-row.accent-info    { border-left-color: var(--bs-info); }
                        .kpi-row td { vertical-align: middle; }

                        .avatar-square { width: 32px; height: 32px; font-size: .85rem; }
                        .avatar-circle { width: 32px; height: 32px; }
                        .chevron-btn   { width: 32px; height: 32px; }

                        .child-kpi-wrapper{
                            background:#fff;
                            border:1px solid #e9edf5;
                            border-radius:12px;
                            padding:18px;
                            margin: 8px;
                            box-shadow: 0 2px 6px rgba(0,0,0,0.04);
                        }

                        .child-header{
                            display:flex;
                            align-items:center;
                            font-weight:700;
                            color:#0d6efd;
                            margin-bottom:15px;
                            font-size:15px;
                        }

                        .child-kpi-wrapper thead{
                            background:#f8faff;
                        }

                        .child-kpi-wrapper thead th{
                            font-size:12px;
                            color:#7b8794;
                            text-transform:uppercase;
                            border-bottom:1px solid #edf2f7;
                        }

                        .child-kpi-wrapper tbody tr{
                            border-bottom:1px solid #f3f4f6;
                        }

                        .child-kpi-wrapper tbody tr:last-child{
                            border-bottom:none;
                        }
                    .premium-btn-primary{
                        display:inline-flex;
                        align-items:center;
                        gap:10px;
                        padding:10px 18px;
                        border:none;
                        border-radius:14px;
                        background:linear-gradient(135deg,#2563eb 0%,#4f46e5 100%);
                        color:#fff;
                        font-size:14px;
                        font-weight:600;
                        letter-spacing:.3px;
                        box-shadow:0 10px 20px rgba(37,99,235,.25);
                        transition:all .25s ease;
                    }

                    .premium-btn-primary:hover{
                        transform:translateY(-2px);
                        box-shadow:0 14px 28px rgba(37,99,235,.35);
                        background:linear-gradient(135deg,#1d4ed8 0%,#4338ca 100%);
                        color:#fff;
                    }

                    .premium-btn-primary:active{
                        transform:scale(.98);
                    }

                    .premium-btn-primary:focus{
                        outline:none;
                        box-shadow:0 0 0 .2rem rgba(79,70,229,.2);
                    }

                    .premium-btn-icon{
                        width:28px;
                        height:28px;
                        border-radius:8px;
                        background:rgba(255,255,255,.18);
                        display:flex;
                        align-items:center;
                        justify-content:center;
                        font-size:14px;
                    }

                    .premium-btn-primary i{
                        color:#fff;
                    }

                    .action-menu-btn{
                        width:38px;
                        height:38px;
                        border:none;
                        border-radius:12px;
                        background:#f8fafc;
                        color:#64748b;
                        transition:.25s;
                    }

                    .action-menu-btn:hover{
                        background:#2563eb;
                        color:#fff;
                        transform:translateY(-2px);
                        box-shadow:0 8px 20px rgba(37,99,235,.25);
                    }

                    .premium-dropdown .ant-dropdown-menu{
                        border-radius:14px;
                        padding:8px;
                        box-shadow:0 10px 35px rgba(15,23,42,.15);
                    }

                    .dropdown-item-premium{
                        display:flex;
                        align-items:center;
                        gap:12px;
                        min-width:130px;
                        font-weight:500;
                    }

                    .dropdown-item-premium i{
                        width:18px;
                        font-size:16px;
                    }
                `}
            </style>

            <KpiModal
                open={openCreateKPI}
                onCancel={() => setOpenCreateKPI(false)}
                onSave={handleSaveKPI}
                activeTab={activeTab}
                departments={departments}
                uomTypes={uomTypes}
                managerKpis={managerKpis}
                selectedParentId={selectedParentKPIId}
                selectedParentUOMId={selectedParentUOMId}
                loading={loading}
                title={
                    activeTab === "organization"
                        ? "Create Organization KPI"
                        : "Create Department KPI"
                }
            />

            <KpiEditModal
                open={openEditModal}
                onCancel={() => setOpenEditModal(false)}
                onSave={handleUpdateKPI}
                kpiData={selectedKPI}
                activeTab={activeTab}
                departments={departments}
                uomTypes={uomTypes}
                managerKpis={managerKpis}
                loading={saving}
                title={
                    activeTab === "organization"
                        ? "Edit Organization KPI"
                        : "Edit Department KPI"
                }
            />
        </Base1>
    )
}