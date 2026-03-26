
import React, { useState, useEffect } from "react";
import { Popover, Tooltip } from 'antd';
// import '../../Config/Pagination.css';
import Swal from 'sweetalert2';
// import '../../Config/Loader.css';
import { useNavigate } from "react-router-dom";
import { Select } from "antd";
import Pagination from "../Pagination/Pagination";
import { MessageOutlined } from "@ant-design/icons"; // you can choose any icon you like
import { fetchWithAuth } from "../../utils/api";
import Base1 from "../Config/Base1";
import { useLocation } from "react-router-dom";
import { BASE_API } from "../Config/Config";
import AddAlert from "./AddAlert";
import ViewAlert from "./ViewAlert";

export default function AlertsList() {

    const navigate = useNavigate();
    const location = useLocation();
    const [sessionUserData, setSessionUserData] = useState([]);
    const [departmentsData, setDepartmentsData] = useState([]);
    const [modules, setModules] = useState([]);
    const [alertsData, setAlertsData] = useState([]);
    const [alertsCache, setAlertsCache] = useState({}); // { 1: [...], 2: [...], ... }
    const [alertTypesData, setAlertTypesData] = useState([]);
    const [modulesData, setModulesData] = useState([]);
    const [dataLoading, setDataLoading] = useState(false);
    const [addAlertTypeLoading, setAddAlertTypeLoading] = useState(false);
    const [usersData, setUsersData] = useState([]);
    const [selectedAlertTypeId, setSelectedAlertTypeId] = useState(null);
    const [selectedOccurenceId, setSelectedOccurenceId] = useState(null);
    const [selectedCreatedBy, setSelectedCreatedBy] = useState(null);
    const [selectedDeptId, setSelectedDeptId] = useState(null);
    const [selectedFromDt, setSelectedFromDt] = useState(() => {
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        return firstDay.toLocaleDateString('en-CA'); // 'YYYY-MM-DD' in local time
    });

    const [selectedToDt, setSelectedToDt] = useState(() => {
        const now = new Date();
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return lastDay.toISOString().split("T")[0];
    });

    const { Option } = Select;
    const [navigationPath, setNavigationPath] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [alertTypeAddModuleId, setAlertTypeAddModuleId] = useState("");
    const [alertTypeAddDeptId, setAlertTypeAddDeptId] = useState("");
    const [sessionActionIds, setSessionActionIds] = useState([]);
    const [selectedModuleId, setSelectedModuleId] = useState("");
    const [typeName, setTypeName] = useState("");
    const [totalRecords, setTotalRecords] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [viewData, setViewData] = useState([]);
    const recordsPerPage = 10;

    useEffect(() => {
        const userDataString = sessionStorage.getItem("userData");
        const navigationString = sessionStorage.getItem("navigationPath");
        if (userDataString) {
            const userData = JSON.parse(userDataString);
            setSessionUserData(userData);
            setNavigationPath(navigationString);
        } else {
            navigate("/");
        }
    }, [navigate]);

    useEffect(() => {
        if (sessionUserData) {
            // If RoleId is NOT 1 → auto-assign dept ID
            if (sessionUserData.RoleId !== 1) {
                setSelectedDeptId(sessionUserData.DeptId || null);
            } else {
                setSelectedDeptId(null);  // Role 1 → don't auto-assign
            }
        }

        const storedModule = JSON.parse(localStorage.getItem("ModuleData"));
        const moduleId = storedModule?.Id;

        setAlertTypeAddModuleId(moduleId);
        setSelectedModuleId(moduleId);
        setAlertTypeAddDeptId(sessionUserData?.DeptId);
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

    useEffect(() => {
        const sessionMenuData = sessionStorage.getItem("menuData");
        try {
            const parsedMenu = JSON.parse(sessionMenuData);

            const ticketsMenu = parsedMenu.find(
                (item) => item.MenuName === "Alerts"
            );

            if (ticketsMenu) {
                const actionIdArray = ticketsMenu.ActionsIds?.split(",").map(Number);
                setSessionActionIds(actionIdArray);
            }
        } catch (err) {
            console.error("Error parsing menuData:", err);
        }
    }, []);

    const fetchAlertTypes = async () => {
        try {
            const response = await fetchWithAuth(`ADMINRoutes/CWIGetDDLItems?OrgId=${sessionUserData?.OrgId}&UserId=0`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });
            if (!response.ok) throw new Error("Network response was not ok");

            const data = await response.json();

            const storedModule = JSON.parse(localStorage.getItem("ModuleData"));
            const moduleId = storedModule?.Id?.toString(); // ensure it's a string for comparison

            const alertTypesFilteredData = data.ResultData.filter(
                (item) => item.DDLName === "AlertTypes" && item.ConditionalId1 == moduleId
            );

            const modFilteredData = data.ResultData.filter(
                (item) => item.DDLName === "Modules"
            );

            const usersFilteredData = data.ResultData.filter(
                (item) => item.DDLName === "Users"
            );

            setAlertTypesData(alertTypesFilteredData || []);
            setModulesData(modFilteredData || []);
            setUsersData(usersFilteredData || []);
        } catch (error) {
            console.error("Failed to fetch UnitLocations:", error);
            setAlertTypesData([]);
            setModulesData([]);
            setUsersData([]);}
    };

    const fetchDepartments = async (orgId) => {
        try {
            const response = await fetch(`${BASE_API}ADMINRoutes/getDepts?OrgId=${orgId}`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                }
            });
    
            if (!response.ok) {
                throw new Error("Failed to fetch departments");
            }
    
            const result = await response.json();
            setDepartmentsData(result.ResultData || []);
            
        } catch (error) {
            console.error("Error fetching departments:", error);
            throw error;
        }
    };

    useEffect(() => {
        if (sessionUserData && sessionUserData?.OrgId) {
            fetchAlertTypes();
            fetchDepartments(sessionUserData?.OrgId);
        }
    }, [sessionUserData]);

    const fetchAlerts = async (page = 1, force = false) => {

        if (!force && alertsCache[page]) {
            setAlertsData(alertsCache[page]);
            setCurrentPage(page);
            return;
        }

        const storedModule = JSON.parse(localStorage.getItem("ModuleData"));
        const moduleId = storedModule?.Id;

        if (!selectedDeptId) {
            Swal.fire({
                icon: "warning",
                title: "Department Required",
                text: "Please select a department before submitting.",
            });
            return; // stop further execution
        }        

        setDataLoading(true);

        const payload = {
            ServiceName: "GetDeptAlertsByFilters",
            PageNumber: page,
            PageSize: recordsPerPage,
            Params: {
                OrgId: sessionUserData?.OrgId,
                AlertTypeId: selectedAlertTypeId || 0,
                OccuranceType: selectedOccurenceId || 0,
                CreatedBy: selectedCreatedBy || 0,
                ModuleId: moduleId,
                FromDate: selectedFromDt,
                ToDate: selectedToDt,
                DeptId: selectedDeptId,
            }
        };

        try {
            const response = await fetchWithAuth(`portal/GetDeptAlertsByFilters`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!response.ok) throw new Error("Failed to fetch alerts");

            const data = await response.json();
            const pageData = data.data.result || [];
            const total = data.data.output.TotalCount || 0;

            setAlertsCache(prev => ({
                ...prev,
                [page]: pageData, // ✅ Save data for this page
            }));

            setAlertsData(pageData);
            setTotalRecords(total);
            setCurrentPage(page);

        } catch (error) {
            console.error("Error fetching alerts:", error.message);
            setAlertsData([]);
        } finally {
            setDataLoading(false);
        }
    };

    const handleFilterSubmit = () => {
        setAlertsCache({});
        fetchAlerts(1, true); // force fresh fetch
    };

    const totalPages = Math.ceil(totalRecords / recordsPerPage);

    const handleDeleteAlert = async (item) => {
        Swal.fire({
            title: "Are you sure?",
            text: "Do you want to delete alert?",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#3085d6",
            cancelButtonColor: "#d33",
            confirmButtonText: "Yes, delete it!"
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const payload = {
                        AlertId: item.AlertId,
                        UpdatedBy: sessionUserData?.Id,
                    };

                    const response = await fetchWithAuth(`PMMS/InActiveMachineAlerts`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify(payload),
                    });
                    const result = await response.json();

                    if (result.ResultData?.Status === 'Success') {
                        setAlertsCache({});
                        fetchAlerts(1, true);
                        Swal.fire("Success!", "Alert has been deleted.", "success");
                    } else {
                        const errorData = await response.json();
                        Swal.fire("Error!", errorData.ResultData?.ResultMessage || "Failed to delete alert.", "error");
                    }
                } catch (error) {
                    console.error("Error during user delete:", error.message);
                    Swal.fire("Error!", "An unexpected error occurred.", "error");
                }
            }
        });
    };

    const handleDeleteAlertType = async (item) => {
        Swal.fire({
            title: "Are you sure?",
            text: "Do you want to delete alert type?",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#3085d6",
            cancelButtonColor: "#d33",
            confirmButtonText: "Yes, delete it!"
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const payload = {
                        Id: item.ItemId,
                        UpdatedBy: sessionUserData?.Id,
                    };

                    const response = await fetchWithAuth(`PMMS/InActiveAlertTypes`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify(payload),
                    });
                    const result = await response.json();

                    if (result.ResultData?.Status === 'Success') {
                        fetchAlertTypes();
                        Swal.fire("Success!", "Alert type has been deleted.", "success");
                    } else {
                        const errorData = await response.json();
                        Swal.fire("Error!", errorData.ResultData?.ResultMessage || "Failed to delete alert type.", "error");
                    }
                } catch (error) {
                    console.error("Error during alert type delete:", error.message);
                    Swal.fire("Error!", "An unexpected error occurred.", "error");
                }
            }
        });
    };

    const handleAddAlertTypeSubmit = async (e) => {
        e.preventDefault();
        setAddAlertTypeLoading(true);

        if (!alertTypeAddModuleId || !typeName.trim()) {
            Swal.fire("Warning", "Please fill in all fields.", "warning");
            setAddAlertTypeLoading(false);
            return;
        }

        const payload = {
            ModuleId: parseInt(alertTypeAddModuleId),
            TypeName: typeName.trim(),
            CreatedBy: sessionUserData?.Id,
            OrgId: sessionUserData?.OrgId,
            DeptId: alertTypeAddDeptId || 0,
        };

        try {
            const response = await fetchWithAuth(`PMMS/AddAlertTypes`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (response.ok) {
                if (data?.ResultData?.Status === "Success") {
                    setAddAlertTypeLoading(false);
                    Swal.fire("Success", "Alert type added successfully!", "success").then(() => {
                        fetchAlertTypes();
                        setAlertTypeAddModuleId("");
                        setTypeName("");
                        setAlertTypeAddDeptId(null);
                        setShowModal(false);
                    })
                }
            } else {
                Swal.fire("Error", data?.message || "Something went wrong!", "error");
                setAddAlertTypeLoading(false);
            }
        } catch (error) {
            Swal.fire("Error", "Failed to submit data.", "error");
            setAddAlertTypeLoading(false);
            console.error("Error:", error);
        }
    };

    const handleClear = () => {
        setAlertTypeAddModuleId("");
        setTypeName("");
        setAddAlertTypeLoading(true);
    };

    const handleViewAlert = (item) => {
        setViewData(item);
    };

    const showAddBtn = sessionActionIds?.includes(1);
    const showViewBtn = sessionActionIds?.includes(2);
    const showDeleteBtn = sessionActionIds?.includes(11);
    const showAlertTypeBtn = sessionActionIds?.includes(18);
    const showSubmitBtn = sessionActionIds?.includes(19);

    const iconColors = ['#FF6B35', '#00B8D9', '#36B37E', '#FFAB00', '#6554C0', '#FF5630'];

    return (
        <Base1>
            <div id="kt_app_toolbar" className="app-toolbar py-3 py-lg-6">
                <div id="kt_app_toolbar_container" className="app-container container-xxl d-flex flex-stack">
                    <div className="page-title d-flex flex-column justify-content-center flex-wrap me-3">
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
                    </div>
                    <div className="d-flex align-items-center gap-2 gap-lg-3">
                        {showSubmitBtn &&
                            <a
                                className="btn btn-warning btn-sm"
                                href="close-alerts"
                            ><i className="fa-solid fa-envelope-circle-check"></i>Close Alerts
                            </a>
                        }
                        {showAlertTypeBtn &&
                            <a
                                className="btn btn-info btn-sm"
                                data-bs-toggle="offcanvas"
                                data-bs-target="#offcanvasRightAddType"
                                aria-controls="offcanvasRightAddType"><i className="fa-solid fa-bell"></i> Alert Type
                            </a>
                        }
                        {showAddBtn &&
                            <a
                                className={`btn btn-primary btn-sm`}
                                data-bs-toggle="offcanvas"
                                data-bs-target="#offcanvasRightAlertAdd"
                                aria-controls="offcanvasRightAlertAdd"><i className="fa-solid fa-bullhorn"></i> Create Alert
                            </a>
                        }
                    </div>
                </div>
            </div>
            
            <div id="kt_app_content" className="app-content flex-column-fluid pt-2">
                <div id="kt_app_content_container" className="app-container container-xxl">
                    <div className="card-toolbar border-0 pt-1 mb-3">
                        <div className="row g-3 align-items-end">
                            <div className="col-6 col-md-1">
                                <label className="form-label">From</label>
                                <input
                                    type="date"
                                    className="form-control form-control-sm"
                                    value={selectedFromDt}
                                    onChange={(e) => setSelectedFromDt(e.target.value)}
                                    style={{ height: '2.8rem' }}
                                />
                            </div>
                            <div className="col-6 col-md-1">
                                <label className="form-label">To</label>
                                <input
                                    type="date"
                                    className="form-control form-control-sm"
                                    value={selectedToDt}
                                    onChange={(e) => setSelectedToDt(e.target.value)}
                                    style={{ height: '2.8rem' }}
                                />
                            </div>
                            <div className="col-12 col-md-3">
                                <label className="form-label">Alert Type</label>
                                <Select
                                    placeholder="Select Alert Type"
                                    showSearch
                                    allowClear
                                    filterOption={(input, option) =>
                                        option?.children?.toLowerCase().includes(input.toLowerCase())
                                    }
                                    className="w-100"
                                    style={{ height: '2.8rem' }}
                                    value={selectedAlertTypeId || undefined}
                                    onChange={(value) => setSelectedAlertTypeId(value)}
                                >
                                    {alertTypesData?.map((item) => (
                                        <Option key={item.ItemId} value={item.ItemId}>
                                            {item.ItemValue}
                                        </Option>
                                    ))}
                                </Select>
                            </div>
                            <div className="col-12 col-md-2">
                                <label className="form-label">Occurence Type</label>
                                <Select
                                    placeholder="Select Occurence Type"
                                    showSearch
                                    allowClear
                                    filterOption={(input, option) =>
                                        option?.children?.toLowerCase().includes(input.toLowerCase())
                                    }
                                    className="w-100"
                                    style={{ height: '2.8rem' }}
                                    value={selectedOccurenceId || undefined}
                                    onChange={(value) => setSelectedOccurenceId(value)}
                                >
                                    <Option value="1">Once</Option>
                                    <Option value="2">Weekly</Option>
                                    <Option value="3">Monthly</Option>
                                    <Option value="4">Quarterly</Option>
                                    <Option value="5">Half-Yearly</Option>
                                    <Option value="6">Yearly</Option>
                                </Select>
                            </div>
                            <div className="col-12 col-md-2">
                                <label className="form-label">Created By</label>
                                <Select
                                    placeholder="Select User"
                                    showSearch
                                    allowClear
                                    filterOption={(input, option) =>
                                        option?.children?.toLowerCase().includes(input.toLowerCase())
                                    }
                                    className="w-100"
                                    style={{ height: '2.8rem' }}
                                    value={selectedCreatedBy || undefined}
                                    onChange={(value) => setSelectedCreatedBy(value)}
                                >
                                    {usersData?.map((item) => (
                                        <Option key={item.ItemId} value={item.ItemId}>
                                            {item.ItemValue}
                                        </Option>
                                    ))}
                                </Select>
                            </div>
                            {sessionUserData?.RoleId === 1 && (
                                <div className="col-12 col-md-2">
                                    <label className="form-label">Department</label>
                                    <Select
                                        placeholder="Select Department"
                                        showSearch
                                        allowClear
                                        filterOption={(input, option) =>
                                            option?.children?.toLowerCase().includes(input.toLowerCase())
                                        }
                                        style={{ height: '2.8rem', width: '100%' }}
                                        value={selectedDeptId || undefined}
                                        onChange={(value) => setSelectedDeptId(value)}
                                        disabled={addAlertTypeLoading}
                                    >
                                        {departmentsData?.map((item) => (
                                            <Option key={item.Id} value={item.Id}>
                                                {item.DeptName}
                                            </Option>
                                        ))}
                                    </Select>
                                </div>
                            )}
                            <div className="col-12 col-md-1 d-flex">
                                <button
                                    className="btn btn-light-primary btn-sm border border-primary w-100"
                                    type="button"
                                    style={{ height: '2.6rem', fontSize: '0.9rem' }}
                                    onClick={handleFilterSubmit}
                                    disabled={dataLoading}
                                >
                                    {dataLoading ? 'Submitting...' : 'Submit'}
                                </button>
                            </div>
                        </div>

                    </div>

                    <div className="card d-md-block d-none">
                        <div className="card-body pt-0">
                            <div className="table-responsive">
                                <table className="table align-middle table-row-dashed fs-6 gy-5" id="kt_customers_table">
                                    <thead className="text-start text-gray-500 fw-bold fs-7 text-uppercase gs-0">
                                        <tr>
                                            <th>S.No</th>
                                            <th>Code</th>
                                            <th>Title</th>
                                            <th>Type</th>
                                            <th>Occurrence</th>
                                            <th className="text-center">Message</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="fw-semibold text-gray-600">
                                        {dataLoading ? (
                                            <tr>
                                                <td colSpan="12" className="text-center">
                                                    <div className="container"></div>
                                                </td>
                                            </tr>
                                        ) : alertsData && alertsData?.length > 0 ? (
                                            alertsData?.map((item, index) => {
                                                const canDelete = showDeleteBtn
                                                const canView = showViewBtn;
                                                return (
                                                    <tr>
                                                        <td>{(currentPage - 1) * recordsPerPage + index + 1}</td>
                                                        <td className="text-primary">{item.AutoIncNo}</td>
                                                        <td>{item.AlertTitle}</td>
                                                        <td>{item.TypeName}</td>
                                                        <td>{item.OcurrenceTypeNames}</td>
                                                        <td className="text-center">
                                                            {item.Message ? (
                                                                <Popover
                                                                    content={
                                                                        <div style={{ maxWidth: 250, whiteSpace: "pre-wrap" }}>
                                                                            {item.Message}
                                                                        </div>
                                                                    }
                                                                    title="Message"
                                                                    trigger="hover"
                                                                >
                                                                    <Tooltip >
                                                                        <MessageOutlined style={{ fontSize: 18, color: "#1890ff", cursor: "pointer" }} />
                                                                    </Tooltip>
                                                                </Popover>
                                                            ) : (
                                                                "-"
                                                            )}
                                                        </td>
                                                        <td className="">
                                                            <Popover
                                                                placement="bottom"
                                                                content={
                                                                    <div style={{ width: '8rem' }}>
                                                                        <p
                                                                            style={{
                                                                                cursor: canView ? 'pointer' : 'not-allowed',
                                                                                opacity: canView ? 1 : 0.5,
                                                                                pointerEvents: canView ? 'auto' : 'none',
                                                                                filter: canView ? 'none' : 'blur(1px)',
                                                                            }}
                                                                            data-bs-toggle="offcanvas"
                                                                            data-bs-target="#offcanvasRightViewAlert"
                                                                            aria-controls="offcanvasRightViewAlert"
                                                                            className="text-hover-primary"
                                                                            onClick={() => canView && handleViewAlert(item)}
                                                                        >
                                                                            <i className="fa-regular fa-eye me-2"></i>
                                                                            View
                                                                        </p>
                                                                        <p
                                                                            style={{
                                                                                cursor: canDelete ? 'pointer' : 'not-allowed',
                                                                                opacity: canDelete ? 1 : 0.5,
                                                                                pointerEvents: canDelete ? 'auto' : 'none',
                                                                                filter: canDelete ? 'none' : 'blur(1px)',
                                                                            }}
                                                                            className="text-hover-primary"
                                                                            onClick={() => canDelete && handleDeleteAlert(item)}
                                                                        >
                                                                            <i className="fa-regular fa-trash-can text-danger me-2"></i>
                                                                            Delete
                                                                        </p>
                                                                    </div>
                                                                }
                                                                trigger="hover"
                                                            >
                                                                <button
                                                                    className="btn"
                                                                >
                                                                    <i className="fa-solid fa-ellipsis-vertical"></i>
                                                                </button>
                                                            </Popover>
                                                        </td>
                                                    </tr>
                                                )
                                            })
                                        ) : (
                                            <tr>
                                                <td colSpan="8" className="text-center">
                                                    <p>No Data Available</p>
                                                </td>
                                            </tr>
                                        )
                                        }
                                    </tbody>
                                </table>
                                <Pagination
                                    currentPage={currentPage}
                                    totalPages={totalPages}
                                    onPageChange={(page) => fetchAlerts(page)}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="d-block d-md-none">
                        {dataLoading ? (
                            <div className="container"></div>
                        ) : alertsData && alertsData?.length > 0 ? (
                            alertsData?.map((item, index) => (
                                <div key={index} className="card mb-2 shadow-sm rounded">
                                    <div className="card-body">
                                        <div className="d-flex justify-content-end align-items-end mb-2">
                                            <span
                                                className={`me-2 badge ${showViewBtn ? 'badge-light-primary border border-primary' : 'badge-light-secondary text-muted'} cursor-pointer`}
                                                data-bs-toggle={showViewBtn ? "offcanvas" : undefined}
                                                data-bs-target={showViewBtn ? "#offcanvasRightViewAlert" : undefined}
                                                aria-controls="offcanvasRightViewAlert"
                                                onClick={() => showViewBtn && handleViewAlert(item)}
                                            >
                                                <i className={`fa-regular fa-eye me-1 ${showViewBtn ? 'text-primary' : 'text-muted'}`}></i>
                                                View
                                            </span>
                                            <span
                                                className={`badge ${showDeleteBtn ? 'badge-light-danger border border-danger' : 'badge-light-secondary text-muted'} cursor-pointer`}
                                                onClick={() => showDeleteBtn && handleDeleteAlert(item)}
                                            >
                                                <i className={`fa-regular fa-trash-can me-1 ${showDeleteBtn ? 'text-danger' : 'text-muted'}`}></i>
                                                Delete
                                            </span>
                                        </div>
                                        <div className="mb-2">
                                            <div className="d-flex justify-content-between">
                                                <span className="text-muted">Title:</span>
                                                <span className="fw-semibold">{item.AlertTitle}</span>
                                            </div>
                                            <div className="d-flex justify-content-between">
                                                <span className="text-muted">Type:</span>
                                                <span className="fw-semibold">{item.TypeName}</span>
                                            </div>
                                            <div className="d-flex justify-content-between">
                                                <span className="text-muted">Occurrence Type:</span>
                                                <span className="fw-semibold">{item.OccurrenceTypeNames}</span>
                                            </div>
                                        </div>
                                        
                                    </div>
                                </div>
                            ))

                        ) : (
                            <p className="text-center mt-5">No Data Available</p>
                        )}
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={(page) => fetchAlerts(page)}
                        />
                    </div>
                </div>
            </div>

            {/* Alert Types Offcanvas */}
            <div className="offcanvas offcanvas-end"
                tabIndex="-1"
                id="offcanvasRightAddType"
                aria-labelledby="offcanvasRightLabel"
                style={{ width: "90%" }}
            >
                <style>
                    {`
                        @media (min-width: 768px) { /* Medium devices and up (md) */
                            #offcanvasRightAddType {
                                width: 40% !important;
                            }

                        }
                    `}
                </style>
                <form autoComplete="off">
                    <div className="offcanvas-header d-flex justify-content-between align-items-center">
                        <h5 id="offcanvasRightLabel" className="mb-0">Alert Types</h5>
                        <div className="d-flex align-items-center">
                            {/* <button className="btn btn-primary btn-sm me-2" type="button" onClick={() => setShowModal(true)}>
                                Add
                            </button> */}
                            <button
                                type="button"
                                className="btn-close"
                                data-bs-dismiss="offcanvas"
                                aria-label="Close"
                            ></button>
                        </div>
                    </div>
                    <div className="offcanvas-body" style={{ marginTop: "-2rem", maxHeight: "42rem", overflowY: "auto" }}>
                        <div>
                            <div className="row mb-3">
                                {/* <div className="col-12 col-md-4">
                                    <label className="form-label">Module</label>
                                    <Select
                                        placeholder="Select Module"
                                        showSearch
                                        allowClear
                                        filterOption={(input, option) =>
                                            option?.children?.toLowerCase().includes(input.toLowerCase())
                                        }
                                        style={{ height: '2.8rem', width: '100%' }}
                                        value={alertTypeAddModuleId || undefined}
                                        onChange={(value) => setAlertTypeAddModuleId(value)}
                                        disabled={addAlertTypeLoading}
                                    >
                                        {modulesData?.map((item) => (
                                            <Option key={item.ItemId} value={item.ItemId}>
                                                {item.ItemValue}
                                            </Option>
                                        ))}
                                    </Select>
                                </div> */}
                                <div className="col-12 col-md-4">
                                    <label className="form-label">Department</label>
                                    <Select
                                        placeholder="Select Department"
                                        showSearch
                                        allowClear
                                        filterOption={(input, option) =>
                                            option?.children?.toLowerCase().includes(input.toLowerCase())
                                        }
                                        style={{ height: '2.8rem', width: '100%' }}
                                        value={alertTypeAddDeptId || undefined}
                                        onChange={(value) => setAlertTypeAddDeptId(value)}
                                        // disabled={addAlertTypeLoading}
                                        disabled={true}
                                    >
                                        <Option value={0}>None</Option>
                                        {departmentsData?.map((item) => (
                                            <Option key={item.Id} value={item.Id}>
                                                {item.DeptName}
                                            </Option>
                                        ))}
                                    </Select>
                                </div>
                                <div className="col-12 col-md-4">
                                    <label className="form-label">Alert Type Name</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Enter alert type name"
                                        style={{ height: '2.8rem', width: '100%' }}
                                        value={typeName}
                                        onChange={(e) => setTypeName(e.target.value)}
                                        disabled={addAlertTypeLoading}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn btn-secondary btn-sm me-2"
                                    onClick={handleClear}
                                    disabled={addAlertTypeLoading}
                                >
                                    Clear
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-primary btn-sm"
                                    onClick={handleAddAlertTypeSubmit}
                                    disabled={addAlertTypeLoading}
                                >
                                    {addAlertTypeLoading ? 'Submitting...' : 'Submit'}
                                </button>
                            </div>
                        </div>

                        <hr className="text-primary" />

                        {/* <div style={{ width: '250px' }}>
                            <label className="form-label">Module</label>
                            <Select
                                placeholder="Select Module"
                                showSearch
                                allowClear
                                filterOption={(input, option) =>
                                    option?.children?.toLowerCase().includes(input.toLowerCase())
                                }
                                style={{ height: '2.8rem', width: '100%' }}
                                value={selectedModuleId || undefined}
                                onChange={(value) => setSelectedModuleId(value)}
                                disabled={true}
                            >
                                {modulesData?.map((item) => (
                                    <Option key={item.ItemId} value={item.ItemId}>
                                        {item.ItemValue}
                                    </Option>
                                ))}
                            </Select>
                        </div> */}
                        <div className="table-responsive mt-5">
                            <table className="table table-bordered table-hover table-sm">
                                <thead>
                                    <tr>
                                        <th style={{ width: '40px' }}>S.No</th>
                                        <th>Title</th>
                                        <th style={{ width: '50px' }} className="text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="fs-5">
                                    {alertTypesData && alertTypesData?.length > 0 ? (
                                        alertTypesData
                                            .filter(item => item.ConditionalId1 == selectedModuleId)
                                            .map((item, index) => (
                                                <tr key={index}>
                                                    <th>{index + 1}</th>
                                                    <td>{item.ItemValue}</td>
                                                    <td
                                                        className="text-center"
                                                        style={{ cursor: 'pointer' }}
                                                        onClick={() => !addAlertTypeLoading && handleDeleteAlertType(item)}
                                                    >
                                                        <i className="fa-regular fa-trash-can text-danger"></i>
                                                    </td>
                                                </tr>
                                            ))
                                    ) : (
                                        <tr>
                                            <td colSpan="3" className="text-center">No alert types found.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </form>
            </div>

            <style>
                {`
                .active-module .dropdown-item {
                            background-color: rgba(13, 110, 253, 0.1);
                            font-weight: 600;
                            border-radius: 4px;
                            transition: all 0.3s ease;
                        }

                        .active-module .dropdown-item span {
                            color: #0d6efd;
                        }
                        @media (min-width: 768px) { /* Medium devices and up (md) */
                            #offcanvasRightMOM {
                                width: 45% !important;
                            }
                            .mobileMarginTop {
                                width: 23%
                            }
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
                        }`}
            </style>

            <AddAlert />
            <ViewAlert alertObj={viewData} />
        </Base1>
    )
}