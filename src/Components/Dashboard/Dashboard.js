import React, { useState, useEffect } from 'react';
import PassCheckIn from '../Visitings/PassCheckIn';
import { useNavigate } from 'react-router-dom';
import '../Config/Loader.css';
import Base1 from '../Config/Base1';
import { fetchWithAuth } from "../../utils/api";
import AddVisit from '../Visitings/Add';
import { Popover } from 'antd';
import DashboardVisitsData from './DashboardVisitsData';
import Swal from 'sweetalert2';
import { InboxOutlined } from '@ant-design/icons';
import { Upload } from 'antd';
import { Select } from 'antd';
import ViewVisit from '../Visitings/View';
import EditPass from '../Visitings/Edit';
import { useLocation } from "react-router-dom";
import Pagination from '../Pagination/Pagination';

export default function Dashboard() {

    const navigate = useNavigate();
    const location = useLocation();
    const [sessionUserData, setsessionUserData] = useState({});
    const [sessionActionIds, setSessionActionIds] = useState([]);
    const [dashboardCountData, setDashboardCountData] = useState({});
    const [selectedCheckType, setSelectedCheckType] = useState(null);
    const [visitorTypesData, setVisitorTypesData] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [visitorsData, setVisitorsData] = useState([]);
    const [dataLoading, setDataLoading] = useState(false);
    const [loading, setLoading] = useState(false);
    const [momBtnLoading, setMomBtnLoading] = useState(false);
    const [attachmentFile, setAttachmentFile] = useState(null);
    const [viewObjData, setViewObjData] = useState([]);
    const [editData, setEditData] = useState([]);
    const [momContent, setMomContent] = useState('');
    const [requestId, setRequestId] = useState(null);
    const [modules, setModules] = useState([]);
    const [unitsData, setUnitsData] = useState([]);
    const [selectedUnitId, setSelectedUnitId] = useState(null);
    const [visitorsCache, setVisitorsCache] = useState({});
    const [totalRecords, setTotalRecords] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const recordsPerPage = 5;
    const { Dragger } = Upload;
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

            // Find Dashboard and Visitors menus
            const dashboardMenu = parsedMenu.find(
                (item) => item.MenuName === "Dashboard"
            );
            const visitorsMenu = parsedMenu.find(
                (item) => item.MenuName === "Visitors"
            );

            let actionIds = [];
            if (dashboardMenu?.ActionsIds) {
                actionIds = actionIds.concat(
                    dashboardMenu.ActionsIds.split(",").map(Number)
                );
            }
            if (visitorsMenu?.ActionsIds) {
                actionIds = actionIds.concat(
                    visitorsMenu.ActionsIds.split(",").map(Number)
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

    useEffect(() => {
        const fetchData = async () => {
            try {
                const today = new Date().toISOString().split("T")[0];

                const response = await fetchWithAuth(`visitor/newVMSDashboard`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        OrgId: sessionUserData?.OrgId,
                        CheckInDate: today,
                        Type: 1,
                        UnitId: selectedUnitId,
                    }),
                });

                const result = await response.json();
                if (result.success) {
                    const results = result?.data?.result || [];
                    const formatted = results.reduce((acc, item) => {
                        acc[item.Title] = item;
                        return acc;
                    }, {});

                    setDashboardCountData(formatted);
                }

            } catch (error) {
                console.error("Error fetching CMS Dashboard data:", error);
            }
        };

        if (sessionUserData?.OrgId && selectedUnitId) {
            fetchData();
        }
    }, [sessionUserData, selectedUnitId]);

    useEffect(() => {
        const loadUnits = async () => {
            setLoading(true);

            const sessionUnits = sessionStorage.getItem("unit_locations");
            const sessionSelectedId = sessionStorage.getItem("selected_unit_id");

            if (sessionUnits) {
                const parsedUnits = JSON.parse(sessionUnits);
                setUnitsData(parsedUnits);

                if (sessionSelectedId) {
                    setSelectedUnitId(sessionSelectedId);
                } else {
                    const firstId = String(parsedUnits[0]?.ItemId);
                    setSelectedUnitId(firstId);
                    sessionStorage.setItem("selected_unit_id", firstId);
                }

                setLoading(false);
                return;
            }

            // Fetch from API if no session
            try {
                const response = await fetchWithAuth(
                    `ADMINRoutes/CWIGetDDLItems?OrgId=${sessionUserData?.OrgId}&UserId=0`,
                    { method: "GET", headers: { "Content-Type": "application/json" } }
                );
                if (!response.ok) throw new Error("Network response was not ok");

                const data = await response.json();
                const filteredData = data.ResultData.filter(
                    (item) => item.DDLName === "UnitLocations"
                );

                setUnitsData(filteredData);

                if (filteredData.length > 0) {
                    const firstUnitId = String(filteredData[0].ItemId);
                    setSelectedUnitId(firstUnitId);
                    sessionStorage.setItem("unit_locations", JSON.stringify(filteredData));
                    sessionStorage.setItem("selected_unit_id", firstUnitId);
                }
            } catch (error) {
                console.error("Failed to fetch UnitLocations:", error);
            } finally {
                setLoading(false);
            }
        };

        loadUnits();
    }, [sessionUserData]);

    const handleUnitChange = (value) => {
        setSelectedUnitId(value);
        sessionStorage.setItem("selected_unit_id", value);
    };

    const today = new Date();

    // First day of current month (local time, no UTC shift)
    const firstDayDate = new Date(today.getFullYear(), today.getMonth(), 1);
    const firstDay = firstDayDate.toLocaleDateString("en-CA"); // YYYY-MM-DD format

    // Last day of current month
    const next10DaysDate = new Date();
    next10DaysDate.setDate(next10DaysDate.getDate() + 10);
    const lastDay = next10DaysDate.toLocaleDateString("en-CA");    

    const [filters, setFilters] = useState({
        FromDate: firstDay,
        ToDate: lastDay,
        VisitorType: "0",
        Status: 'ALL',
        AutoIncNo: "ALL",
        RoleId: sessionUserData.RoleId,
        UserId: sessionUserData.UserId,
    });

    const fetchVisitorsData = async (page = 1, force = false) => {
        if (!force && visitorsCache[page]) {
            setVisitorsData(visitorsCache[page]);
            setCurrentPage(page);
            return;
        }
        setDataLoading(true);
        const today = new Date();

        // First day of current month (local time, no UTC shift)
        const firstDayDate = new Date(today.getFullYear(), today.getMonth(), 1);
        const firstDay = firstDayDate.toLocaleDateString("en-CA"); // YYYY-MM-DD format

        // Last day of current month
        // const lastDayDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        // const lastDay = lastDayDate.toLocaleDateString("en-CA"); // YYYY-MM-DD format

        const startOfMonth = new Date(firstDay);
        // const endOfMonth = new Date(lastDay);

        // Format date to yyyy-mm-dd
        const formatDate = (date) => {
            return date.toISOString().split("T")[0];
        };

        const payload = {
            ServiceName: "GetVisitsFilters",
            PageNumber: page,
            PageSize: recordsPerPage,
            Params: {
                OrgId: sessionUserData?.OrgId,
                DeptId: 0,
                FromDate: filters.FromDate || formatDate(startOfMonth),
                ToDate: filters.FromDate ? filters.ToDate || getCurrentDate() : (filters.ToDate || undefined),
                UnitId: selectedUnitId,
                RoleId: sessionUserData?.RoleId,
                UserId: sessionUserData?.Id,
                VisitorType: filters.VisitorType || 0,
                Status: filters.Status || "ALL",
                AutoIncNo: "ALL"
            },
        };

        try {
            const response = await fetchWithAuth(`visitor/GetVisitsFilters`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!response.ok) throw new Error("Failed to fetch machines");

            const data = await response.json();
            const pageData = data.data.result || [];
            const total = data.data.output.TotalCount || 0;

            setVisitorsCache((prev) => ({ ...prev, [page]: pageData }));
            setVisitorsData(pageData);
            setTotalRecords(total);
            setCurrentPage(page);

        } catch (error) {
            console.error("Error fetching machines:", error.message);
            setVisitorsData([]);
        } finally {
            setDataLoading(false);
        }
    };

    const handleFilterSubmit = () => {
        setVisitorsCache({});
        fetchVisitorsData(1, true); // force fresh fetch
    };

    const totalPages = Math.ceil(totalRecords / recordsPerPage);

    const fetchTypes = async () => {
        try {
            if (sessionUserData.OrgId) {
                const vTypesResponse = await fetchWithAuth(`visitor/VisitorTypesByOrgId?OrgId=${sessionUserData.OrgId}`, {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                });
                if (vTypesResponse) {
                    const vTypesData = await vTypesResponse.json();
                    setVisitorTypesData(vTypesData.ResultData);
                } else {
                    console.error('Failed to fetch shifts data:');
                }
            }
        } catch (error) {
            console.error('Error fetching shifts data:', error.message);
        }
    };

    useEffect(() => {
        if (sessionUserData.OrgId && selectedUnitId) {
            fetchVisitorsData(1, true);
        }
    }, [sessionUserData, selectedUnitId]);

    useEffect(() => {
        if (sessionUserData.OrgId) {
            fetchTypes();
        }
    }, [sessionUserData]);

    const handleView = (item) => {
        setViewObjData(item);
    };

    const handleEdit = (item) => {
        setEditData(item);
    };

    const getCurrentDate = () => {
        const today = new Date();
        return today.toISOString().split("T")[0];
    };

    const handleActionApprove = (item) => {
        Swal.fire({
            title: `Are you sure?`,
            text: `Do you want to approve this visit?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Approve'
        }).then((result) => {
            if (result.isConfirmed) {
                handleApproveSubmit(item);
            }
        });
    };

    const handleActionReject = (item) => {
        Swal.fire({
            title: `Are you sure?`,
            text: `Do you want to reject this visit?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Reject'
        }).then((result) => {
            if (result.isConfirmed) {
                handleRejectSubmit(item);
            }
        });
    };

    const handleApproveSubmit = async (item) => {

        try {
            const url = `visitor/PassApproval?RequestId=${item.RequestId}&OrgId=${sessionUserData.OrgId}&UserId=${sessionUserData.Id}`;

            const response = await fetchWithAuth(url, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });

            const result = await response.json();

            if (response.ok) {
                if (result.Status) {
                    fetchVisitorsData(currentPage, true);
                } else {
                    console.error("❌ Request failed with server response:", result);
                }
            } else {
                throw new Error(`Request failed with status ${response.status}`);
            }
        } catch (error) {
            console.error("❌ Error submitting action:", error);
        }
    };

    const handleRejectSubmit = async (item) => {
        try {
            const url = `visitor/RejectPass?RequestId=${item.RequestId}&OrgId=${sessionUserData.OrgId}&UpdatedBy=${sessionUserData.Id}`;

            const response = await fetchWithAuth(url, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });

            const result = await response.json();

            if (response.ok) {
                if (result?.Status) {
                    fetchVisitorsData(currentPage, true);
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Request Failed',
                        text: result?.message || 'An unknown error occurred.',
                    });
                }
            } else {
                throw new Error(`Request failed with status ${response.status}`);
            }
        } catch (error) {
            console.error("❌ Error submitting action:", error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.message || 'Something went wrong.',
            });
        }
    };

    const handleActionCancel = (item) => {
        const confirmButtonText = 'Yes Cancel it!';

        Swal.fire({
            title: `Are you sure?`,
            text: `Do you want to cancel this visit?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: confirmButtonText
        }).then((result) => {
            if (result.isConfirmed) {
                handleActionCancelSubmit(item);
            }
        });
    };

    const handleActionCancelSubmit = async (item) => {
        try {
            const payload = {
                OrgId: sessionUserData?.OrgId,
                RequestId: item?.RequestId,
                UpdatedBy: sessionUserData.Id
            };

            if (!payload.OrgId || !payload.RequestId) {
                console.error("Error: OrgId or RequestId is missing");
                return;
            }

            const response = await fetchWithAuth(`visitor/CancelVisit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (response.ok) {
                if (result.Status) {
                    fetchVisitorsData(currentPage, true);
                } else {
                    console.error("Request failed with server response:", result);
                }
            } else {
                throw new Error(`Request failed with status ${response.status}`);
            }
        } catch (error) {
            console.error("Error submitting action:", error);
        }
    };

    const handleMOMSubmit = (item) => {
        setRequestId(item.RequestId);
    };

    const submitMOM = async () => {
        if (!momContent) {
            Swal.fire("Error", "Please fill out MOM content", "error");
            return;
        }

        setMomBtnLoading(true);

        const formData = new FormData();
        formData.append("MOM", momContent);
        formData.append("UpdatedBy", sessionUserData.Id);
        formData.append("RequestId", requestId);
        formData.append("OrgId", sessionUserData?.OrgId);

        if (attachmentFile) {
            formData.append("Attachment", attachmentFile);
        }

        try {
            const response = await fetchWithAuth(`visitor/MOMSubmitWithAttachment`, {
                method: "POST",
                body: formData,
            });

            const data = await response.json();

            if (response.ok && data.Status) {
                setMomBtnLoading(false);
                Swal.fire("Success", data.message, "success").then(() => {
                    window.location.reload();
                });
            } else {
                Swal.fire("Error", data.message, "error");
                setMomBtnLoading(false);
            }
        } catch (error) {
            Swal.fire("Error", "An unexpected error occurred", "error");
            setMomBtnLoading(false);
        }
    };

    const handleInputChange = (eOrValue, nameFromSelect = null) => {
        if (typeof eOrValue === 'object' && eOrValue.target) {
            // Triggered from standard input/select
            const { name, value } = eOrValue.target;
            setFilters((prevState) => ({
                ...prevState,
                [name]: value || "0",
            }));
        } else if (nameFromSelect) {
            // Triggered from AntD Select
            setFilters((prevState) => ({
                ...prevState,
                [nameFromSelect]: eOrValue || "0",
            }));
        }
    };

    const formatDateTime = (dateString, timeString) => {
        const date = new Date(dateString);

        const timeMatch = timeString.match(/T(\d{2}):(\d{2})/);
        const hours = timeMatch ? timeMatch[1] : '00';
        const minutes = timeMatch ? timeMatch[2] : '00';

        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();

        return `${day}-${month}-${year} ${hours}:${minutes}`;
    };

    const draggerProps = {
        name: 'file',
        multiple: false,
        beforeUpload: (file) => {
            setAttachmentFile(file);
            return false;
        },
        onRemove: () => {
            setAttachmentFile(null);
        },
    };

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery]);

    const permissionsByStatus = {
        edit: ["REJECTED", "DRAFT"],
        approve: ["DRAFT"],
        reject: ["DRAFT"],
        cancel: ["APPROVED"],
        mom: ["CHECKEDOUT"],
    };

    const showAddBtn = sessionActionIds?.includes(1);
    const showViewBtn = sessionActionIds?.includes(2);
    const showEditBtn = sessionActionIds?.includes(3);
    const showApproveBtn = sessionActionIds?.includes(4);
    const showRejectBtn = sessionActionIds?.includes(5);
    const showCancelBtn = sessionActionIds?.includes(6);
    const showMomBtn = sessionActionIds?.includes(7);
    const showVistCheckInOutBtn = sessionActionIds?.includes(14);

    const iconColors = ['#FF6B35', '#00B8D9', '#36B37E', '#FFAB00', '#6554C0', '#FF5630'];

    return (
        <Base1>
            <div className={`d-flex flex-column flex-column-fluid mb-7 mt-4 ${loading ? 'blurred' : ''}`}>
                <div id="kt_app_toolbar" className="app-toolbar py-6">
                    <div id="kt_app_toolbar_container" className="app-container container-xxl d-flex flex-stack">
                        <div className="page-title d-md-block d-none">
                            {/* Flex container for Visitors, Report & Select */}
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
                                <a
                                    href="/vms/vms-dashboard"
                                    style={{ position: "relative", zIndex: 10 }}
                                >
                                    <span className="menu-link bg-white shadow-sm me-2 cursor-pointer active">
                                        <span className="menu-title">
                                            <i className="fa-solid fa-person-walking"></i> Visitors
                                        </span>
                                        <span className="menu-arrow"></span>
                                    </span>
                                </a>

                                <a
                                    href="/report?reportId=3"
                                    style={{ position: "relative", zIndex: 10 }}
                                >
                                    <span className="menu-link bg-white shadow-sm me-2 cursor-pointer">
                                        <span className="menu-title">
                                            <i className="fa-solid fa-chart-simple"></i> Report
                                        </span>
                                        <span className="menu-arrow"></span>
                                    </span>
                                </a>
                            </div>
                        </div>

                        <div className="page-title d-md-none d-block">
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
                                <a href='/vms/vms-dashboard' style={{ position: "relative", zIndex: 10 }}>
                                    <span className="menu-link bg-white shadow-sm me-2 active">
                                        <span className="menu-title"><i className="fa-solid fa-person-walking "></i></span>
                                        <span className="menu-arrow"></span>
                                    </span>
                                </a>
                                <a href='/report?reportId=3' style={{ position: "relative", zIndex: 10 }}>
                                    <span className="menu-link bg-white shadow-sm me-2">
                                        <span className="menu-title"><i className="fa-solid fa-chart-simple"></i></span>
                                        <span className="menu-arrow"></span>
                                    </span>
                                </a>
                            </div>
                        </div>

                        <div className="d-flex justify-content-between d-none d-md-block">
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
                <div id="kt_app_content" className="app-content flex-column-fluid" style={{ marginTop: '-25px' }}>
                    <div id="kt_app_content_container" className="app-container container-xxl">
                        <div className="row g-4">
                            <div className="d-flex align-items-center justify-content-between w-100 gap-2">
                                {/* Left Side: Dropdown (col-6 on mobile, flex-grow on desktop) */}
                                <div className="flex-grow-1 flex-md-grow-0 col-6 col-md-3 col-lg-2">
                                    <Select
                                        showSearch
                                        placeholder="Choose Unit"
                                        suffixIcon={<i className="fa-solid fa-location-dot text-primary fa-beat-fade"></i>}
                                        style={{ width: "100%", height: "2.5rem" }}
                                        value={selectedUnitId}
                                        loading={loading}
                                        onChange={handleUnitChange}
                                        optionFilterProp="children"
                                    >
                                        {unitsData.map((unit) => (
                                            <Option key={String(unit.ItemId)} value={String(unit.ItemId)}>
                                                {unit.ItemValue}
                                            </Option>
                                        ))}
                                    </Select>
                                </div>

                                {/* Right Side: Action Buttons */}
                                <div className="d-flex align-items-center gap-2">
                                    {showAddBtn && (
                                        <button
                                            className="btn btn-sm fw-bold btn-light-primary shadow-sm border border-primary d-flex align-items-center justify-content-center"
                                            style={{ height: "2.5rem", minWidth: "40px" }}
                                            data-bs-toggle="offcanvas"
                                            data-bs-target="#offcanvasRightAdd"
                                            type="button"
                                        >
                                            <i className="fa-solid fa-ticket m-0"></i>
                                            <span className="d-none d-md-inline ms-2">Create Request</span>
                                        </button>
                                    )}

                                    {showVistCheckInOutBtn && (
                                        <button
                                            className="btn btn-sm fw-bold btn-light-info shadow-sm border border-info d-flex align-items-center justify-content-center"
                                            style={{ height: "2.5rem", minWidth: "40px" }}
                                            data-bs-toggle="offcanvas"
                                            data-bs-target="#offcanvasRightPassCheckIn"
                                            type="button"
                                        >
                                            <i className="fa-solid fa-qrcode m-0"></i>
                                            <span className="d-none d-md-inline ms-2">Scan Pass</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                            {/* Cards */}
                            <div className="col-12  d-none d-md-block">
                                <div className="row row-cols-1 row-cols-md-5 g-3">
                                    <div className="col-3">
                                        <div className="card card-hover shadow-sm border-0 h-100 bg-primary bg-opacity-20"
                                            data-bs-toggle="offcanvas"
                                            data-bs-target="#offcanvasRightDashVisitsData"
                                            aria-controls="offcanvasRightDashVisitsData"
                                            onClick={() => setSelectedCheckType(2)}
                                        >
                                            <div className="card-body d-flex align-items-center">
                                                <div
                                                    className="rounded-circle bg-primary bg-opacity-10 text-primary d-flex align-items-center justify-content-center me-3 icon-hover"
                                                    style={{ width: "50px", height: "50px" }}
                                                >
                                                    <i className="fa-solid fa-users fs-3"></i>
                                                </div>
                                                <div>
                                                    <p className="text-dark fw-bold fs-5 mb-0">Today Visits</p>
                                                    <h4 className="fw-bold mb-0">{dashboardCountData["Today Visitors"]?.Counts ?? 0}</h4>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="col-3">
                                        <div className="card shadow-sm card-hover border-0 h-100 bg-success bg-opacity-20"
                                            data-bs-toggle="offcanvas"
                                            data-bs-target="#offcanvasRightDashVisitsData"
                                            aria-controls="offcanvasRightDashVisitsData"
                                            onClick={() => setSelectedCheckType(3)}
                                        >
                                            <div className="card-body d-flex align-items-center">
                                                <div
                                                    className="rounded-circle bg-success bg-opacity-10 text-success d-flex align-items-center justify-content-center me-3 icon-hover"
                                                    style={{ width: "50px", height: "50px" }}
                                                >
                                                    <i className="fa-solid fa-door-open fs-3"></i>
                                                </div>
                                                <div>
                                                    <p className="text-dark fw-bold fs-5 mb-0">Checked In</p>
                                                    <h4 className="fw-bold mb-0">{dashboardCountData["Visitor CheckIns"]?.Counts ?? 0}</h4>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="col-3">
                                        <div className="card shadow-sm card-hover border-0 h-100 bg-danger bg-opacity-20"
                                            data-bs-toggle="offcanvas"
                                            data-bs-target="#offcanvasRightDashVisitsData"
                                            aria-controls="offcanvasRightDashVisitsData"
                                            onClick={() => setSelectedCheckType(4)}
                                        >
                                            <div className="card-body d-flex align-items-center">
                                                <div
                                                    className="rounded-circle bg-danger bg-opacity-10 text-danger d-flex align-items-center justify-content-center me-3 icon-hover"
                                                    style={{ width: "50px", height: "50px" }}
                                                >
                                                    <i className="fa-solid fa-door-closed fs-3"></i>
                                                </div>
                                                <div>
                                                    <p className="text-dark fw-bold fs-5 mb-0">Checked Out</p>
                                                    <h4 className="fw-bold mb-0">{dashboardCountData["Visitor CheckOuts"]?.Counts ?? 0}</h4>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="col-3">
                                        <div className="card shadow-sm card-hover border-0 h-100 bg-info bg-opacity-20"
                                            data-bs-toggle="offcanvas"
                                            data-bs-target="#offcanvasRightDashVisitsData"
                                            aria-controls="offcanvasRightDashVisitsData"
                                            onClick={() => setSelectedCheckType(6)}
                                        >
                                            <div className="card-body d-flex align-items-center">
                                                <div
                                                    className="rounded-circle bg-info bg-opacity-10 text-info d-flex align-items-center justify-content-center me-3 icon-hover"
                                                    style={{ width: "50px", height: "50px" }}
                                                >
                                                    <i className="fa-solid fa-user-clock fs-3"></i>
                                                </div>
                                                <div>
                                                    <p className="text-dark fw-bold fs-5 mb-0">Frequent </p>
                                                    <h4 className="fw-bold mb-0">{dashboardCountData["Frequent Visitors"]?.Counts ?? 0}</h4>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="col-3">
                                        <div className="card shadow-sm card-hover border-0 h-100 bg-warning bg-opacity-20"
                                            data-bs-toggle="offcanvas"
                                            data-bs-target="#offcanvasRightDashVisitsData"
                                            aria-controls="offcanvasRightDashVisitsData"
                                            onClick={() => setSelectedCheckType(5)}
                                        >
                                            <div className="card-body d-flex align-items-center">
                                                <div
                                                    className="rounded-circle bg-dark bg-opacity-10 text-warning d-flex align-items-center justify-content-center me-3 icon-hover"
                                                    style={{ width: "50px", height: "50px" }}
                                                >
                                                    <i className="fa-solid fa-check-circle fs-3"></i>
                                                </div>
                                                <div>
                                                    <p className="text-dark fw-bold fs-5 mb-0">Upcoming </p>
                                                    <h4 className="fw-bold mb-0">{dashboardCountData["Upcoming Visitors"]?.Counts ?? 0}</h4>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="d-md-none d-block">
                                <div className="row g-2 mt-3 justify-content-center">
                                    <div className="col-6">
                                        <div className="card card-hover shadow-sm text-center p-3 w-100 bg-primary bg-opacity-20"
                                            data-bs-toggle="offcanvas"
                                            data-bs-target="#offcanvasRightDashVisitsData"
                                            aria-controls="offcanvasRightDashVisitsData"
                                            onClick={() => setSelectedCheckType(2)}
                                        >
                                            <i className="fa-solid fa-users text-primary fs-4 mb-2"></i>
                                            <p className="mb-0 small text-dark fw-bold fs-5">Today</p>
                                            <h5 className="fw-bold mb-0">{dashboardCountData["Today Visitors"]?.Counts ?? 0}</h5>
                                        </div>
                                    </div>
                                    <div className="col-6">
                                        <div className="card shadow-sm text-center p-3 w-100 bg-success bg-opacity-20"
                                            data-bs-toggle="offcanvas"
                                            data-bs-target="#offcanvasRightDashVisitsData"
                                            aria-controls="offcanvasRightDashVisitsData"
                                            onClick={() => setSelectedCheckType(3)}
                                        >
                                            <i className="fa-solid fa-door-open text-success fs-4 mb-2"></i>
                                            <p className="mb-0 small text-dark fw-bold fs-5">Checked In</p>
                                            <h5 className="fw-bold mb-0">{dashboardCountData["Visitor CheckIns"]?.Counts ?? 0}</h5>
                                        </div>
                                    </div>
                                    <div className="col-6">
                                        <div className="card shadow-sm text-center p-3 w-100 bg-danger bg-opacity-20"
                                            data-bs-toggle="offcanvas"
                                            data-bs-target="#offcanvasRightDashVisitsData"
                                            aria-controls="offcanvasRightDashVisitsData"
                                            onClick={() => setSelectedCheckType(4)}
                                        >
                                            <i className="fa-solid fa-door-closed text-danger fs-4 mb-2"></i>
                                            <p className="mb-0 small text-dark fw-bold fs-5">Checked Out</p>
                                            <h5 className="fw-bold mb-0">{dashboardCountData["Visitor CheckOuts"]?.Counts ?? 0}</h5>
                                        </div>
                                    </div>
                                    <div className="col-6">
                                        <div className="card shadow-sm text-center p-3 w-100 bg-info bg-opacity-20"
                                            data-bs-toggle="offcanvas"
                                            data-bs-target="#offcanvasRightDashVisitsData"
                                            aria-controls="offcanvasRightDashVisitsData"
                                            onClick={() => setSelectedCheckType(6)}
                                        >
                                            <i className="fa-solid fa-user-clock text-info fs-4 mb-2"></i>
                                            <p className="mb-0 small text-dark fw-bold fs-5">Frequent Visitors</p>
                                            <h5 className="fw-bold mb-0">{dashboardCountData["Frequent Visitors"]?.Counts ?? 0}</h5>
                                        </div>
                                    </div>
                                    <div className="col-6">
                                        <div className="card shadow-sm text-center p-3 w-100 bg-warning bg-opacity-20"
                                            data-bs-toggle="offcanvas"
                                            data-bs-target="#offcanvasRightDashVisitsData"
                                            aria-controls="offcanvasRightDashVisitsData"
                                            onClick={() => setSelectedCheckType(5)}
                                        >
                                            <i className="fa-solid fa-check-circle text-warning fs-4 mb-2"></i>
                                            <p className="mb-0 small text-warning fw-bold fs-5">Upcoming Visits</p>
                                            <h5 className="fw-bold mb-0">{dashboardCountData["Upcoming Visitors"]?.Counts ?? 0}</h5>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Table */}
                            <h3 className='ps-3 pt-4'>Visitors List</h3>
                            <div className="col-12 col-lg-12">
                                <div className="card shadow-sm">
                                    <div className="card-body">
                                        <form className="row g-3 align-items-end mb-3">
                                            <div className="col-6 col-md-2">
                                                <label className="form-label">From Date</label>
                                                <input
                                                    type="date"
                                                    className="form-control"
                                                    style={{ height: '2.5rem' }}
                                                    name="FromDate"
                                                    value={filters.FromDate}
                                                    onChange={handleInputChange}
                                                />
                                            </div>
                                            <div className="col-6 col-md-2">
                                                <label className="form-label">To Date</label>
                                                <input type="date"
                                                    className="form-control"
                                                    name="ToDate"
                                                    value={filters.ToDate}
                                                    min={filters.FromDate}
                                                    onChange={handleInputChange}
                                                    style={{ height: '2.5rem' }} />
                                            </div>
                                            <div className="col-6 col-md-2">
                                                <label className="form-label">Status</label>

                                                <Select
                                                    size="small"
                                                    showSearch
                                                    placeholder="Choose Status"
                                                    value={filters.Status}
                                                    onChange={(value) => handleInputChange({ target: { name: "Status", value } })}
                                                    style={{ width: "100%", height: '2.5rem' }}
                                                    options={[
                                                        { label: "All", value: "ALL" },
                                                        { label: "Draft", value: "DRAFT" },
                                                        { label: "Approved", value: "APPROVED" },
                                                        { label: "Rejected", value: "REJECTED" },
                                                        { label: "Canceled", value: "CANCELED" },
                                                    ]}
                                                />
                                            </div>
                                            <div className="col-6 col-md-2">
                                                <label className="form-label">Type</label>
                                                <Select
                                                    showSearch
                                                    placeholder="Choose Visitor Type"
                                                    style={{ width: '100%', height: '2.5rem' }}
                                                    value={filters.VisitorType}
                                                    onChange={(value) => handleInputChange(value, 'VisitorType')}
                                                    filterOption={(input, option) =>
                                                        option?.children?.toLowerCase().includes(input.toLowerCase())
                                                    }
                                                >
                                                    <Option value="0">All</Option>
                                                    {Array.isArray(visitorTypesData) &&
                                                        visitorTypesData.map((type) => (
                                                            <Option key={type.Id} value={String(type.Id)}>
                                                                {type.TypeName}
                                                            </Option>
                                                        ))}
                                                </Select>
                                            </div>
                                            <div className="col-12 col-md-2 text-center">
                                                <button className="btn btn-primary btn-sm w-auto"
                                                    onClick={handleFilterSubmit}
                                                    disabled={dataLoading}
                                                    type='button'
                                                >
                                                    <i className="fa-solid fa-filter me-1"></i> {dataLoading ? 'Submitting...' : 'Apply'}
                                                </button>
                                            </div>
                                        </form>

                                        <div className="table-responsive  d-none d-md-block">
                                            <table className="table table-bordered table-hover align-middle">
                                                <thead className="table-light">
                                                    <tr>
                                                        <th className="">#</th>
                                                        <th className="min-w-125px">Id</th>
                                                        <th className="min-w-125px">Manager</th>
                                                        <th className="min-w-125px">Employee</th>
                                                        <th className="min-w-125px">Visitor Type</th>
                                                        <th className="min-w-125px">Scheduled</th>
                                                        <th className="max-w-70px">Status</th>
                                                        <th className="text-center max-w-50px">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {dataLoading ? (
                                                        <tr>
                                                            <td colSpan="12" className="text-center">
                                                                <div className="container"></div>
                                                            </td>
                                                        </tr>
                                                    ) : visitorsData && visitorsData.length > 0 ? (
                                                        visitorsData.map((item, index) => {
                                                            const canView = showViewBtn;
                                                            const canEdit = showEditBtn && permissionsByStatus.edit.includes(item.Status);
                                                            const canApprove = showApproveBtn && permissionsByStatus.approve.includes(item.Status);
                                                            const canReject = showRejectBtn && permissionsByStatus.reject.includes(item.Status);
                                                            const canCancle = showCancelBtn && permissionsByStatus.cancel.includes(item.Status);
                                                            const canMom = showMomBtn && permissionsByStatus.mom.includes(item.Status);
                                                            return (
                                                                <tr key={index}>
                                                                    <td>{(currentPage - 1) * recordsPerPage + index + 1}</td>
                                                                    <td className='text-primary fw-bold'><a
                                                                        className="text-primary cursor-pointer"
                                                                        data-bs-toggle="offcanvas"
                                                                        data-bs-target="#offcanvasRightView"
                                                                        aria-controls="offcanvasRightView"
                                                                        onClick={() => canView && handleView(item)}
                                                                    >{item.AutoIncNo}</a></td>
                                                                    <td>
                                                                        <a className="text-gray-800 text-hover-primary mb-1">{item.ManagerName}</a>
                                                                    </td>
                                                                    <td>
                                                                        <a className="text-gray-800 text-hover-primary mb-1">{item.EmployeeName}</a>
                                                                    </td>
                                                                    <td>
                                                                        {item.VisitorTypeName}
                                                                    </td>
                                                                    <td>
                                                                        <div className="badge badge-light-danger">
                                                                            {formatDateTime(item.MeetingDate, item.MeetingTime)}
                                                                        </div>
                                                                    </td>
                                                                    <td>
                                                                        <div
                                                                            className={
                                                                                item.Status === "DRAFT"
                                                                                    ? "badge badge-light-dark"
                                                                                    : item.Status === "APPROVED"
                                                                                        ? "badge badge-light-info"
                                                                                        : item.Status === "REJECTED"
                                                                                            ? "badge badge-light-warning"
                                                                                            : item.Status === "CHECKEDOUT"
                                                                                                ? "badge badge-light-secondary"
                                                                                                : item.Status === "CANCELED"
                                                                                                    ? "badge badge-light-danger"
                                                                                                    : item.Status === "COMPLETED"
                                                                                                        ? "badge badge-light-success"
                                                                                                        : "badge badge-light"
                                                                            }
                                                                        >
                                                                            {item.Status}
                                                                        </div>
                                                                    </td>
                                                                    <td className="text-center">
                                                                        <Popover
                                                                            placement="bottom"
                                                                            content={
                                                                                <div style={{ width: "8rem" }}>
                                                                                    <p
                                                                                        style={{ cursor: "pointer" }}
                                                                                        className="text-hover-warning"
                                                                                        data-bs-toggle="offcanvas"
                                                                                        data-bs-target="#offcanvasRightView"
                                                                                        aria-controls="offcanvasRightView"
                                                                                        onClick={() => canView && handleView(item)}
                                                                                    >
                                                                                        <i className="fa-regular fa-eye me-2"></i>
                                                                                        View
                                                                                    </p>
                                                                                    <p
                                                                                        className={`text-hover-warning`}
                                                                                        style={{
                                                                                            cursor: canEdit ? 'pointer' : 'not-allowed',
                                                                                            opacity: canEdit ? 1 : 0.5,
                                                                                            pointerEvents: canEdit ? 'auto' : 'none',
                                                                                            filter: canEdit ? 'none' : 'blur(1px)',
                                                                                        }}
                                                                                        data-bs-toggle="offcanvas"
                                                                                        data-bs-target="#offcanvasRightEdit"
                                                                                        aria-controls="offcanvasRightEdit"
                                                                                        onClick={() => handleEdit(item)}
                                                                                    >
                                                                                        <i className="fa-regular fa-pen-to-square me-2 text-info"></i>
                                                                                        Edit
                                                                                    </p>
                                                                                    <p
                                                                                        style={{
                                                                                            cursor: canApprove ? 'pointer' : 'not-allowed',
                                                                                            opacity: canApprove ? 1 : 0.5,
                                                                                            pointerEvents: canApprove ? 'auto' : 'none',
                                                                                            filter: canApprove ? 'none' : 'blur(1px)',
                                                                                        }}
                                                                                        className={`text-hover-warning`}
                                                                                        onClick={() =>
                                                                                            canApprove
                                                                                                ? handleActionApprove(item)
                                                                                                : null
                                                                                        }
                                                                                    >
                                                                                        <i className="fa-solid fa-check me-2 text-success"></i>
                                                                                        Approve
                                                                                    </p>
                                                                                    <p
                                                                                        style={{
                                                                                            cursor: canReject ? 'pointer' : 'not-allowed',
                                                                                            opacity: canReject ? 1 : 0.5,
                                                                                            pointerEvents: canReject ? 'auto' : 'none',
                                                                                            filter: canReject ? 'none' : 'blur(1px)',
                                                                                        }}
                                                                                        className={`text-hover-warning`}
                                                                                        onClick={() =>
                                                                                            canReject
                                                                                                ? handleActionReject(item)
                                                                                                : null
                                                                                        }
                                                                                    >
                                                                                        <i className="fa-solid fa-xmark me-2 text-warning"></i>
                                                                                        Reject
                                                                                    </p>
                                                                                    <p
                                                                                        style={{
                                                                                            cursor: canCancle ? 'pointer' : 'not-allowed',
                                                                                            opacity: canCancle ? 1 : 0.5,
                                                                                            pointerEvents: canCancle ? 'auto' : 'none',
                                                                                            filter: canCancle ? 'none' : 'blur(1px)',
                                                                                        }}
                                                                                        className={`text-hover-warning`}
                                                                                        onClick={() =>
                                                                                            canCancle
                                                                                                ? handleActionCancel(item)
                                                                                                : null
                                                                                        }
                                                                                    >
                                                                                        <i className="fa-solid fa-ban me-2 text-danger"></i>
                                                                                        Cancel
                                                                                    </p>
                                                                                    <p
                                                                                        style={{
                                                                                            cursor: canMom ? 'pointer' : 'not-allowed',
                                                                                            opacity: canMom ? 1 : 0.5,
                                                                                            pointerEvents: canMom ? 'auto' : 'none',
                                                                                            filter: canMom ? 'none' : 'blur(1px)',
                                                                                        }}
                                                                                        className={`text-hover-warning`}
                                                                                        data-bs-toggle="offcanvas"
                                                                                        data-bs-target="#offcanvasRightMOM"
                                                                                        aria-controls="offcanvasRightMOM"
                                                                                        onClick={() => {
                                                                                            canMom && handleMOMSubmit(item);
                                                                                        }}
                                                                                    >
                                                                                        <i className="fa-regular fa-handshake me-2"></i>
                                                                                        MOM
                                                                                    </p>
                                                                                </div>
                                                                            }
                                                                            trigger="hover"
                                                                        >
                                                                            <button className="btn">
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
                                                    )}
                                                </tbody>
                                            </table>
                                            {/* <Pagination
                                                currentPage={currentPage}
                                                totalPages={totalPages}
                                                onPageChange={(page) => fetchVisitorsData(page)}
                                            /> */}
                                            <Pagination
                                                    currentPage={currentPage}
                                                    totalPages={totalPages}
                                                    totalRecords={totalRecords || 0} // Or the total count from your API meta-data
                                                    recordsPerPage={5} // This MUST match the 'limit' you use in your API call
                                                    onPageChange={(page) => fetchVisitorsData(page)}
                                                />
                                        </div>

                                        <div className="d-block d-md-none">
                                            <div className="d-flex align-items-center position-relative my-1">
                                                <i className="ki-duotone ki-magnifier fs-3 position-absolute ms-5">
                                                    <span className="path1"></span>
                                                    <span className="path2"></span>
                                                </i>
                                                <input
                                                    type="text"
                                                    data-kt-customer-table-filter="search"
                                                    className="form-control form-control w-100 ps-13"
                                                    placeholder="Search Visitors"
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                />
                                            </div>
                                            {dataLoading ? (
                                                <div className="container"></div>
                                            ) : visitorsData && visitorsData.length > 0 ? (
                                                visitorsData.map((item, index) => {
                                                    const canView = showViewBtn;
                                                    const canEdit = showEditBtn && permissionsByStatus.edit.includes(item.Status);
                                                    const canApprove = showApproveBtn && permissionsByStatus.approve.includes(item.Status);
                                                    const canReject = showRejectBtn && permissionsByStatus.reject.includes(item.Status);
                                                    const canCancle = showCancelBtn && permissionsByStatus.cancel.includes(item.Status);
                                                    const canMom = showMomBtn && permissionsByStatus.mom.includes(item.Status);
                                                    return (
                                                        <div key={item.Id} className="card mb-2 shadow-sm rounded">
                                                            <div className="card-body">
                                                                <div className="d-flex justify-content-between align-items-start">
                                                                    <span>
                                                                        <div className={
                                                                            item.Status === "DRAFT"
                                                                                ? "badge badge-light-dark"
                                                                                : item.Status === "APPROVED"
                                                                                    ? "badge badge-light-info"
                                                                                    : item.Status === "REJECTED"
                                                                                        ? "badge badge-light-warning"
                                                                                        : item.Status === "CHECKEDOUT"
                                                                                            ? "badge badge-light-secondary"
                                                                                            : item.Status === "CANCELED"
                                                                                                ? "badge badge-light-danger"
                                                                                                : item.Status === "COMPLETED"
                                                                                                    ? "badge badge-light-success"
                                                                                                    : "badge badge-light"
                                                                        }>
                                                                            {item.Status}
                                                                        </div>
                                                                    </span>
                                                                    <div className="d-flex">
                                                                        <i
                                                                            className="fa-regular fa-eye text-primary me-2"
                                                                            data-bs-toggle="offcanvas"
                                                                            data-bs-target="#offcanvasRightView"
                                                                            aria-controls="offcanvasRightView"
                                                                            onClick={() => canView && handleView(item)}
                                                                        ></i>
                                                                        <i
                                                                            className={`fa-regular fa-pen-to-square text-info`}
                                                                            style={{
                                                                                cursor: canEdit ? 'pointer' : 'not-allowed',
                                                                                opacity: canEdit ? 1 : 0.5,
                                                                                pointerEvents: canEdit ? 'auto' : 'none',
                                                                                filter: canEdit ? 'none' : 'blur(1px)',
                                                                            }}
                                                                            data-bs-toggle="offcanvas"
                                                                            data-bs-target="#offcanvasRightEdit"
                                                                            aria-controls="offcanvasRightEdit"
                                                                            onClick={() => handleEdit(item)}
                                                                        ></i>
                                                                    </div>
                                                                </div>

                                                                <div className="mb-2">
                                                                    <div className="d-flex justify-content-between">
                                                                        <span className="text-muted">Request Id:</span>
                                                                        <span className="fw-semibold">{item.AutoIncNo}</span>
                                                                    </div>
                                                                    <div className="d-flex justify-content-between">
                                                                        <span className="text-muted">Manager:</span>
                                                                        <span className="fw-semibold">{item.ManagerName}</span>
                                                                    </div>
                                                                    <div className="d-flex justify-content-between">
                                                                        <span className="text-muted">Employee:</span>
                                                                        <span className="fw-semibold">{item.EmployeeName}</span>
                                                                    </div>
                                                                    <div className="d-flex justify-content-between">
                                                                        <span className="text-muted">Scheduled:</span>
                                                                        <span className="fw-semibold">{formatDateTime(item.MeetingDate, item.MeetingTime)}</span>
                                                                    </div>
                                                                    <div className="d-flex justify-content-between">
                                                                        <span className="text-muted">Visitor Type:</span>
                                                                        <span className="fw-semibold">
                                                                            {item.VisitorType === 1
                                                                                ? 'Supplier'
                                                                                : item.VisitorType === 2
                                                                                    ? 'Customer'
                                                                                    : item.VisitorType === 3
                                                                                        ? 'Frequent Visitor'
                                                                                        : 'N/A'}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                                <div className="d-flex justify-content-between mt-2">
                                                                    <span
                                                                        style={{
                                                                            cursor: canApprove ? 'pointer' : 'not-allowed',
                                                                            opacity: canApprove ? 1 : 0.5,
                                                                            pointerEvents: canApprove ? 'auto' : 'none',
                                                                            filter: canApprove ? 'none' : 'blur(1px)',
                                                                        }}
                                                                        className={`badge badge-light-success`}
                                                                        onClick={() =>
                                                                            canApprove
                                                                                ? handleActionApprove(item)
                                                                                : null
                                                                        }
                                                                    >
                                                                        <i className="fa-solid fa-check me-1"></i>Approve
                                                                    </span>

                                                                    <span
                                                                        style={{
                                                                            cursor: canReject ? 'pointer' : 'not-allowed',
                                                                            opacity: canReject ? 1 : 0.5,
                                                                            pointerEvents: canReject ? 'auto' : 'none',
                                                                            filter: canReject ? 'none' : 'blur(1px)',
                                                                        }}
                                                                        className={`badge badge-light-warning`}
                                                                        onClick={() =>
                                                                            canReject
                                                                                ? handleActionReject(item)
                                                                                : null
                                                                        }
                                                                    >
                                                                        <i className="fa-solid fa-xmark me-1"></i>Reject
                                                                    </span>
                                                                    <span
                                                                        style={{
                                                                            cursor: canCancle ? 'pointer' : 'not-allowed',
                                                                            opacity: canCancle ? 1 : 0.5,
                                                                            pointerEvents: canCancle ? 'auto' : 'none',
                                                                            filter: canCancle ? 'none' : 'blur(1px)',
                                                                        }}
                                                                        className={`badge badge-light-danger`}
                                                                        onClick={() =>
                                                                            canCancle
                                                                                ? handleActionCancel(item)
                                                                                : null
                                                                        }
                                                                    >
                                                                        <i className="fa-solid fa-ban me-1"></i>Cancel
                                                                    </span>
                                                                    <span
                                                                        style={{
                                                                            cursor: canMom ? 'pointer' : 'not-allowed',
                                                                            opacity: canMom ? 1 : 0.5,
                                                                            pointerEvents: canMom ? 'auto' : 'none',
                                                                            filter: canMom ? 'none' : 'blur(1px)',
                                                                        }}
                                                                        className={`badge badge-light-info`}
                                                                        data-bs-toggle="offcanvas"
                                                                        data-bs-target="#offcanvasRightMOM"
                                                                        aria-controls="offcanvasRightMOM"
                                                                        onClick={() => { canMom && handleMOMSubmit(item); }}
                                                                    >
                                                                        <i className="fa-regular fa-handshake me-2"></i>MOM
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )
                                                })
                                            ) : (
                                                <p className="text-center mt-5">No Data Available</p>
                                            )}
                                            <Pagination
                                                currentPage={currentPage}
                                                totalPages={totalPages}
                                                totalRecords={totalRecords || 0} // Or the total count from your API meta-data
                                                recordsPerPage={5} // This MUST match the 'limit' you use in your API call
                                                onPageChange={(page) => fetchVisitorsData(page)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mom Submit Offcanvas */}
            <div
                className="offcanvas offcanvas-end"
                tabIndex="-1"
                id="offcanvasRightMOM"
                aria-labelledby="offcanvasRightLabel"
                style={{ width: '90%' }}
            >
                <style>
                    {`
                    .blurred {
                        filter: blur(2px);
                        pointer-events: none;
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
                    `}
                </style>
                <div className="offcanvas-header d-flex justify-content-between align-items-center">
                    <h5 id="offcanvasRightLabel" className="mb-0">Submit MOM</h5>
                    <div className="d-flex align-items-center">
                        <button
                            type="button"
                            className="btn-close"
                            data-bs-dismiss="offcanvas"
                            aria-label="Close"
                        ></button>
                    </div>
                </div>
                <div className="offcanvas-body" style={{ marginTop: "-2rem", maxHeight: "42rem", overflowY: "auto" }}>
                    <div className="row">
                        <div className="col-12">
                            <Dragger {...draggerProps}>
                                <p className="ant-upload-drag-icon">
                                    <InboxOutlined />
                                </p>
                                <p className="ant-upload-text">Click or drag file to this area to upload</p>
                                <p className="ant-upload-hint">
                                    Support for a single upload. Strictly prohibited from uploading company data or other
                                    banned files.
                                </p>
                            </Dragger>
                        </div>
                        <div className="col-12 mt-13">
                            <label className="form-label">Remarks</label>
                            <textarea
                                value={momContent}
                                className="form-control"
                                onChange={(e) => setMomContent(e.target.value)}
                                rows="5"
                                placeholder="Enter your MOM details here..."
                            />
                        </div>
                    </div>
                    <button
                        className="btn btn-primary btn-sm d-flex m-auto mt-5"
                        onClick={submitMOM}
                        disabled={momBtnLoading}
                    >
                        {momBtnLoading ? 'Submitting...' : 'Submit'}
                    </button>
                </div>
            </div>



            <PassCheckIn />
            <ViewVisit viewObj={viewObjData} />
            <AddVisit />
            <EditPass passObj={editData} />
            <DashboardVisitsData checkType={selectedCheckType} selectedUnit={selectedUnitId} />
        </Base1>
    )
}