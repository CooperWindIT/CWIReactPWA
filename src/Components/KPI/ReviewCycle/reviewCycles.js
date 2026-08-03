import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../Config/Loader.css';
import Base1 from '../../Config/Base1';
import { fetchWithAuth } from "../../../utils/api";
import Swal from 'sweetalert2';
import { useLocation } from "react-router-dom";
import { Dropdown, Menu, message, Tooltip, Modal, Select } from 'antd';
import { getReviewCycles, getPerformancePeriods, saveReviewCycles, updatePeriod, getIsCreateCyclesBtn, getPendingCycleScores } from '../services/kpiServices';
import AddReviewCycle from './addReviewCycle';
import EditReviewCycle from './editReviewCycle';

export default function ReviewCycles() {

    const navigate = useNavigate();
    const location = useLocation();
    const [sessionUserData, setsessionUserData] = useState({});
    const [sessionActionIds, setSessionActionIds] = useState([]);
    const [loading, setLoading] = useState(false);
    const [kpiPeriodsData, setKPIPeriodsData] = useState([]);
    const [pendingScores, setPendingScores] = useState([]);
    const [reviewCycleData, setReviewCycleData] = useState([]);
    const [modules, setModules] = useState([]);
    const [menuData, setMenuData] = useState([]);
    const [selectedPeriod, setSelectedPeriod] = useState(null);
    const [isCycleBtn, setIsCycleBtn] = useState(false);
    const [editData, setEditData] = useState({});
    const [releaseData, setReleaseData] = useState({
        Id: "",
        Comments: "",
    });

    const [releaseLoading, setReleaseLoading] = useState(false);
    const [openPeriodModal, setOpenPeriodModal] = useState(false);
    const [selectedPeriodId, setSelectedPeriodId] = useState();
    const [saving, setSaving] = useState(false);
    const [closeData, setCloseData] = useState({
        Id: 0,
    });

    const [closeLoading, setCloseLoading] = useState(false);

    useEffect(() => {
        const current = kpiPeriodsData.find(x => x.IsCurrent);
        if (current) {
            setSelectedPeriodId(current.Id);
        }
    }, [kpiPeriodsData]);

    useEffect(() => {
        const userDataString = sessionStorage.getItem("userData");
        if (userDataString) {
            const userData = JSON.parse(userDataString);
            setsessionUserData(userData);
            setSelectedPeriod(userData?.PeriodId);
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

    const fetchPerformancePeriods = async () => {
        try {
            setLoading(true);

            const response = await getPerformancePeriods({
                orgId: sessionUserData?.OrgId,
            });

            setKPIPeriodsData(response?.data || []);

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchPendingCycleScores = async () => {
        try {
            setLoading(true);

            const response = await getPendingCycleScores({
                orgId: sessionUserData?.OrgId,
            });

            setPendingScores(response?.data || []);

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchIsCreateCyclesBtn = async () => {
        try {
            setLoading(true);

            const response = await getIsCreateCyclesBtn({
                orgId: sessionUserData?.OrgId,
            });

            setIsCycleBtn(response?.data[0]?.ShowCreateCycles || false);

        } catch (error) {
            console.error(error);
        }
    };

    const fetchReviewCycles = async () => {
        try {
            setLoading(true);

            const response = await getReviewCycles({
                orgId: sessionUserData?.OrgId,
                periodId: selectedPeriod,
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
            fetchIsCreateCyclesBtn();
        }
    }, [sessionUserData?.OrgId]);

    useEffect(() => {
        if (selectedPeriod) {
            fetchReviewCycles();
        } else {
            setReviewCycleData([]);
        }
    }, [selectedPeriod]);

    const handleRelease = async () => {

        if (!releaseData.Comments.trim()) {
            message.warning("Please enter release comments.");
            return;
        }

        setReleaseLoading(true);

        const payload = {
            Type: "OPEN",
            OrgId: sessionUserData.OrgId,
            UserId: sessionUserData.Id,
            JsonData: {
                Id: releaseData.Id,
                Comments: releaseData.Comments,
            },
        };

        try {
            const response = await saveReviewCycles(payload);

            if (
                response?.success &&
                response?.data?.result?.[0]?.ResponseCode === 2000
            ) {
                message.success(response.data.result[0].Message || "Released successfully..!");

                document
                    .getElementById("releaseReviewCycleModal")
                    ?.querySelector(".btn-close")
                    ?.click();

                fetchReviewCycles();
            } else {
                message.error(
                    response?.data?.result?.[0]?.Message || "Release failed."
                );
            }
        } catch (err) {
            console.error(err);
            message.error("Something went wrong.");
        } finally {
            setReleaseLoading(false);
        }
    };

    const handleCloseClick = async (item) => {
        setCloseData({ Id: item.Id });

        try {
            const response = await fetchWithAuth("KPI/MasterAPI", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    OrgId: sessionUserData.OrgId,
                    Action: "PendingCycleScores",
                    JsonData: {
                        Id: item.Id,
                    },
                }),
            });

            const data = await response.json();
            const pendingUsers = data?.data || [];
            let html = "";

            if (pendingUsers.length > 0) {
                html = `
                    <div style="text-align:left">
                        <p style="margin-bottom:10px;">
                            The following employees have <b>pending cycle scores</b>:
                        </p>
    
                        <div style="
                            max-height:220px;
                            overflow-y:auto;
                            border:1px solid #e5e7eb;
                            border-radius:6px;
                            padding:8px;
                            background:#fafafa;
                        ">
                            <table style="width:100%;border-collapse:collapse;">
                                <thead>
                                    <tr style="background:#f5f5f5;">
                                        <th style="padding:8px;text-align:left;">#</th>
                                        <th style="padding:8px;text-align:left;">Employee</th>
                                        <th style="padding:8px;text-align:left;" class="text-end">Cycle Scroe</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${pendingUsers
                        .map(
                            (x, i) => `
                                                <tr>
                                                    <td style="padding:6px;">${i + 1}</td>
                                                    <td style="padding:6px;">${x.Name}</td>
                                                    <td style="padding:6px;" class="text-end">${x.CycleScore || 'N/A'}</td>
                                                </tr>
                                            `
                        )
                        .join("")}
                                </tbody>
                            </table>
                        </div>
    
                        <p style="margin-top:15px;color:#dc3545;font-weight:600;">
                            Do you still want to close this review cycle?
                        </p>
                    </div>
                `;
            } else {
                html =
                    "<p>No pending scores found.<br/>Do you want to close this review cycle?</p>";
            }

            const result = await Swal.fire({
                title: "Close Review Cycle",
                html,
                icon: "warning",
                width: 650,
            
                showCancelButton: true,
                showDenyButton: true,
            
                confirmButtonText:
                    '<i class="fa-solid fa-check me-2"></i> Continue',
            
                denyButtonText:
                    '<i class="fa-solid fa-bell me-2"></i> Send Reminder',
            
                cancelButtonText:
                    '<i class="fa-solid fa-xmark me-2"></i> Cancel',
            
                confirmButtonColor: "#198754",
                denyButtonColor: "#f59e0b",
                cancelButtonColor: "#6c757d",
            });

            if (!result.isConfirmed) return;
            handleCloseReviewCycle(item.Id);
        } catch (err) {
            console.error(err);
            message.error("Unable to verify pending cycle scores.");
        }
    };

    const handleCloseReviewCycle = async (id) => {
        setCloseLoading(true);
        try {
            const payload = {
                Type: "CLOSED",
                OrgId: sessionUserData.OrgId,
                UserId: sessionUserData.Id,
                JsonData: {
                    Id: id,
                },
            };

            const response = await saveReviewCycles(payload);

            if (
                response?.success &&
                response?.data?.result?.[0]?.ResponseCode === 200
            ) {

                Swal.fire({
                    icon: "success",
                    title: "Closed",
                    text:
                        response.data.result[0].Message ||
                        "Review cycle closed successfully.",
                });
                fetchReviewCycles();
            } else {
                message.error(
                    response?.data?.result?.[0]?.Message ||
                    "Unable to close review cycle."
                );
            }
        } catch (err) {
            console.error(err);
            message.error("Something went wrong.");
        } finally {
            setCloseLoading(false);
        }
    };

    const handleUpdatePeriod = async () => {

        if (!selectedPeriodId) {
            return message.warning("Please select a performance period.");
        }

        const payload = {
            Id: selectedPeriodId,
            UserId: sessionUserData.Id,
        };

        try {

            setSaving(true);

            const response = await updatePeriod(payload);

            if (response?.ResultData?.Status === "Success") {
                message.success(
                    response?.ResultData?.ResultMessage ||
                    "Performance period updated successfully."
                );
                setOpenPeriodModal(false);
                fetchPerformancePeriods();
            } else {
                message.error(
                    response?.ResultData?.ResultMessage ||
                    "Failed to update performance period."
                );
            }

        } catch (error) {
            console.error(error);
            message.error("Something went wrong.");
        } finally {
            setSaving(false);
        }
    };

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
                        <div className="card border-0 shadow-sm mb-5">
                            <div className="card-body py-4">
                                <div className="row align-items-end g-3">
                                    <div className="col-lg-4 col-md-5">
                                        <label className="form-label fw-bold text-gray-700 mb-2">
                                            <i className="bi bi-calendar3 text-primary me-2"></i>
                                            KPI Period
                                        </label>
                                        <select
                                            className="form-select"
                                            value={selectedPeriod}
                                            onChange={(e) => setSelectedPeriod(e.target.value)}
                                        >
                                            <option value="">Select KPI Period</option>

                                            {kpiPeriodsData?.map((period) => (
                                                <option key={period.Id} value={period.Id}>
                                                    {period.PeriodName}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="col-lg-8 col-md-7">
                                        <div className="d-flex justify-content-end align-items-center gap-3 flex-wrap">
                                            <button
                                                className="btn btn-light-primary d-flex align-items-center px-4 btn-sm"
                                                onClick={() => setOpenPeriodModal(true)}
                                            >
                                                <i className="bi bi-arrow-repeat me-2"></i>
                                                Change Current Period
                                            </button>
                                            <Tooltip
                                                title={
                                                    !isCycleBtn
                                                        ? "Review cycles have already been created for this performance period."
                                                        : "Create Review Cycles"
                                                }
                                            >
                                                <span>
                                                    <button
                                                        className="btn btn-primary d-flex align-items-center px-4 btn-sm"
                                                        data-bs-toggle="offcanvas"
                                                        data-bs-target="#offcanvasRightAddReviewCycle"
                                                        disabled={!isCycleBtn}
                                                    >
                                                        <i className="bi bi-calendar-plus-fill me-2"></i>
                                                        Create Review Cycle
                                                    </button>
                                                </span>
                                            </Tooltip>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="card border-0 shadow-lg rounded-4 overflow-hidden">
                            <div
                                className="card-header border-0 py-3 d-flex justify-content-between align-items-center w-100"
                                style={{
                                    background: "linear-gradient(90deg,#2563eb,#4f46e5)",
                                    color: "#fff"
                                }}
                            >
                                <div>
                                    <h5 className="mb-0 fw-bold text-white">
                                        <i className="bi bi-calendar2-week me-2 text-white"></i>
                                        Review Cycles
                                    </h5>
                                    <small className="opacity-75">
                                        Performance Review Cycle Configuration
                                    </small>
                                </div>

                                <span className="badge bg-light text-dark rounded-pill px-3 py-2">
                                    {reviewCycleData?.length ?? 0} Records
                                </span>
                            </div>

                            <div className="table-responsive">
                                <table className="table align-middle table-hover gs-7 gy-5 mb-0 fs-6">
                                    <thead className="bg-light-primary">
                                        <tr className="text-start text-muted fw-bold fs-7 text-uppercase gs-0 border-bottom-2 border-primary">
                                            <th>#</th>
                                            <th>Cycle</th>
                                            <th>Start Date</th>
                                            <th>End Date</th>
                                            <th>Comments</th>
                                            <th className='text-center'>Status</th>
                                            <th className="text-center">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="fw-semibold text-gray-700">
                                        {loading ? (
                                            <tr>
                                                <td colSpan="7" className="py-5">
                                                    <div
                                                        className="d-flex flex-column justify-content-center align-items-center w-100"
                                                        style={{ minHeight: "320px" }}
                                                    >
                                                        <div className="review-loader mb-3">
                                                            <div className="spinner-border text-primary" role="status">
                                                                <span className="visually-hidden">
                                                                    Loading...
                                                                </span>
                                                            </div>
                                                        </div>

                                                        <h5 className="fw-bold text-primary mb-2">
                                                            Loading Review Cycles...
                                                        </h5>

                                                        <p className="text-muted mb-0">
                                                            Please wait while we fetch the data.
                                                        </p>
                                                    </div>
                                                </td>
                                            </tr>

                                        ) : reviewCycleData?.length === 0 ? (
                                            <tr>
                                                <td colSpan="7" className="py-5">
                                                    <div
                                                        className="d-flex flex-column justify-content-center align-items-center w-100"
                                                        style={{ minHeight: "320px" }}
                                                    >
                                                        <div className="empty-state-icon mb-3">
                                                            <i className="bi bi-calendar2-x"></i>
                                                        </div>

                                                        <h5 className="fw-bold mb-2">
                                                            No Review Cycles Found
                                                        </h5>

                                                        <p className="text-muted mb-0">
                                                            No review cycles are available for the selected performance period.
                                                        </p>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            reviewCycleData.map((item, index) => {
                                                const statusClass = {
                                                    DRAFT: "status-draft",
                                                    RELEASED: "status-released",
                                                    OPEN: "status-open",
                                                    CLOSED: "status-closed",
                                                }[item.Status?.trim().toUpperCase()] || "status-draft";
                                                return (
                                                    <tr key={item.Id}>
                                                        <td>{index + 1}</td>
                                                        <td>
                                                            <span
                                                                className="badge rounded-pill px-3 py-2"
                                                                style={{
                                                                    background: "#eef2ff",
                                                                    color: "#4f46e5"
                                                                }}
                                                            >
                                                                {item.CycleName}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            {item.StartDate === "1900-01-01T00:00:00.000Z"
                                                                ? "-"
                                                                : new Date(item.StartDate).toLocaleDateString("en-GB")}
                                                        </td>
                                                        <td>
                                                            {item.EndDate === "1900-01-01T00:00:00.000Z"
                                                                ? "-"
                                                                : new Date(item.EndDate).toLocaleDateString("en-GB")}
                                                        </td>
                                                        <td style={{ maxWidth: "250px" }}>
                                                            <Tooltip
                                                                title={item.Comments || "No Comments"}
                                                                placement="topLeft"
                                                                overlayInnerStyle={{
                                                                    borderRadius: "10px",
                                                                    fontSize: "13px",
                                                                    maxWidth: "350px"
                                                                }}
                                                            >
                                                                <div
                                                                    className="px-2 py-1 rounded-3"
                                                                    style={{
                                                                        background: "#f8fafc",
                                                                        color: "#475569",
                                                                        cursor: "pointer",
                                                                        whiteSpace: "nowrap",
                                                                        overflow: "hidden",
                                                                        textOverflow: "ellipsis",
                                                                        border: "1px solid #e2e8f0"
                                                                    }}
                                                                >
                                                                    {item.Comments
                                                                        ? item.Comments.length > 55
                                                                            ? `${item.Comments.substring(0, 55)}...`
                                                                            : item.Comments
                                                                        : "-"}
                                                                </div>
                                                            </Tooltip>
                                                        </td>
                                                        <td className="text-center">
                                                            <span className={`status-pill ${statusClass}`}>
                                                                <span className="status-dot"></span>
                                                                {item.Status}
                                                            </span>
                                                        </td>
                                                        <td className="text-center">
                                                            <div className="d-flex justify-content-center align-items-center gap-2">
                                                                <Tooltip
                                                                    title={
                                                                        item.Status === "OPEN"
                                                                            ? "Already Released"
                                                                            : "Release Review Cycle"
                                                                    }
                                                                >
                                                                    <button
                                                                        className="action-btn action-btn-release text-hover-white"
                                                                        data-bs-toggle="modal"
                                                                        data-bs-target="#releaseReviewCycleModal"
                                                                        onClick={() =>
                                                                            setReleaseData({
                                                                                Id: item.Id,
                                                                                Comments: "",
                                                                            })
                                                                        }
                                                                        disabled={item.Status === "OPEN"}
                                                                    >
                                                                        <i className="bi bi-rocket-takeoff text-success"></i>
                                                                    </button>
                                                                </Tooltip>
                                                                <Tooltip
                                                                    title={
                                                                        item.Status === "OPEN"
                                                                            ? "Close Review Cycle"
                                                                            : "Only open review cycles can be closed"
                                                                    }
                                                                >
                                                                    <button
                                                                        className="action-btn action-btn-close text-hover-danger"
                                                                        onClick={() => handleCloseClick(item)}
                                                                        disabled={item.Status !== "OPEN"}
                                                                    >
                                                                        <i className="bi bi-lock-fill text-danger"></i>
                                                                    </button>
                                                                </Tooltip>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>


            {/* release model */}
            <div
                className="modal fade"
                id="releaseReviewCycleModal"
                tabIndex="-1"
            >
                <div className="modal-dialog modal-dialog-centered">
                    <div className="modal-content border-0 shadow-lg rounded-4">
                        <div
                            className="modal-header border-0"
                            style={{
                                background:
                                    "linear-gradient(90deg,#16a34a,#22c55e)",
                                color: "#fff"
                            }}
                        >
                            <div>
                                <h5 className="mb-0 fw-bold">
                                    <i className="bi bi-rocket-takeoff me-2 text-white"></i>
                                    Release Review Cycle
                                </h5>
                                <small>
                                    Release this review cycle to employees
                                </small>
                            </div>
                            <button
                                className="btn-close btn-close-white"
                                data-bs-dismiss="modal"
                            ></button>
                        </div>

                        <div className="modal-body p-4">
                            <label className="form-label fw-semibold">
                                Release Comments
                                <span className="text-danger">*</span>
                            </label>
                            <textarea
                                rows="4"
                                className="form-control"
                                placeholder="Enter release comments..."
                                value={releaseData.Comments}
                                onChange={(e) =>
                                    setReleaseData({
                                        ...releaseData,
                                        Comments: e.target.value,
                                    })
                                }
                            />
                        </div>

                        <div className="modal-footer border-0">
                            <button
                                className="btn btn-dark btn-sm"
                                data-bs-dismiss="modal"
                                disabled={releaseLoading}
                            >
                                Cancel
                            </button>

                            <button
                                className="btn btn-success px-4 btn-sm"
                                onClick={handleRelease}
                                disabled={releaseLoading}
                            >
                                {releaseLoading ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm me-2"></span>
                                        Releasing...
                                    </>
                                ) : (
                                    <>
                                        <i className="bi bi-check-circle me-2"></i>
                                        Release
                                    </>
                                )}
                            </button>

                        </div>

                    </div>
                </div>
            </div>

            {/* Update performance period */}
            <Modal
                open={openPeriodModal}
                onCancel={() => setOpenPeriodModal(false)}
                width={650}
                centered
                footer={[
                    <button
                        key="cancel"
                        className="btn btn-light me-2 btn-sm"
                        disabled={saving}
                        onClick={() => setOpenPeriodModal(false)}
                    >
                        Cancel
                    </button>,
                    <button
                        key="save"
                        className="btn btn-primary btn-sm"
                        disabled={saving}
                        onClick={handleUpdatePeriod}
                    >
                        {saving ? (
                            <>
                                <span className="spinner-border spinner-border-sm me-2"></span>
                                Updating...
                            </>
                        ) : (
                            <>
                                <i className="bi bi-check2-circle me-2"></i>
                                Update Current Period
                            </>
                        )}
                    </button>
                ]}
                title={
                    <div className="d-flex align-items-center">
                        <div
                            className="rounded-circle bg-light-primary d-flex align-items-center justify-content-center me-3"
                            style={{
                                width: 52,
                                height: 52
                            }}
                        >
                            <i className="bi bi-calendar2-check-fill text-primary fs-3"></i>
                        </div>

                        <div>
                            <h4 className="fw-bold mb-0">
                                Change Current Performance Period
                            </h4>

                            <small className="text-muted">
                                Only one performance period can remain active.
                            </small>
                        </div>
                    </div>
                }
            >

                <div className="alert alert-warning d-flex align-items-start">
                    <i className="bi bi-exclamation-triangle-fill fs-4 me-3 text-warning"></i>

                    <div>
                        <strong>Important</strong>

                        <div className="mt-1">
                            Updating the current period will make the selected period active throughout the KPI module.
                        </div>
                    </div>
                </div>

                <label className="form-label fw-bold mt-4">
                    Select Performance Period
                </label>

                <Select
                    size="large"
                    style={{ width: "100%" }}
                    placeholder="Select Performance Period"
                    value={selectedPeriodId}
                    onChange={setSelectedPeriodId}
                    options={kpiPeriodsData.map(item => ({
                        value: item.Id,
                        label: (
                            <div className="d-flex justify-content-between align-items-center">
                                <span>{item.PeriodName}</span>

                                {item.IsCurrent && (
                                    <span className="badge bg-success ms-2">
                                        Current
                                    </span>
                                )}
                            </div>
                        )
                    }))}
                />

            </Modal>


            <style>
                {`
                    .premium-create-btn{
                        background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%);
                        color: #fff;
                        border: none;
                        border-radius: 12px;
                        padding: 10px 22px;
                        font-size: 14px;
                        font-weight: 600;
                        letter-spacing: .3px;
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        gap: 6px;
                        box-shadow: 0 10px 20px rgba(37, 99, 235, .25);
                        transition: all .25s ease;
                    }

                    .premium-create-btn:hover{
                        background: linear-gradient(135deg, #1d4ed8 0%, #4338ca 100%);
                        color: #fff;
                        transform: translateY(-2px);
                        box-shadow: 0 14px 28px rgba(37, 99, 235, .35);
                    }

                    .premium-create-btn:active{
                        transform: scale(.98);
                    }

                    .premium-create-btn:focus{
                        color: #fff;
                        box-shadow: 0 0 0 .25rem rgba(79,70,229,.2);
                    }

                    .premium-create-btn i{
                        font-size: 16px;
                    }
                    .status-pill {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 120px;
    height: 34px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.4px;
    transition: all .25s ease;
}

.status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
}

/* Draft - Orange */
.status-draft {
    background: #fff7ed;
    color: #c2410c;
    border: 1px solid #fdba74;
}

.status-draft .status-dot {
    background: #f97316;
}

/* Released - Blue */
.status-released {
    background: #eff6ff;
    color: #1d4ed8;
    border: 1px solid #93c5fd;
}

.status-released .status-dot {
    background: #3b82f6;
}

/* Open - Green */
.status-open {
    background: #ecfdf3;
    color: #15803d;
    border: 1px solid #bbf7d0;
}

.status-open .status-dot {
    background: #22c55e;
}

/* Closed - Red */
.status-closed {
    background: #fef2f2;
    color: #b91c1c;
    border: 1px solid #fecaca;
}

.status-closed .status-dot {
    background: #ef4444;
}

.status-pill:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, .08);
}
                    .action-btn{
                        width:40px;
                        height:40px;
                        border:none;
                        border-radius:12px;
                        display:flex;
                        align-items:center;
                        justify-content:center;
                        font-size:17px;
                        transition:all .25s ease;
                        cursor:pointer;
                    }

                    .action-btn i{
                        transition:.25s;
                    }

                    .action-btn:hover:not(:disabled){
                        transform:translateY(-2px);
                        box-shadow:0 8px 18px rgba(0,0,0,.12);
                    }

                    .action-btn:disabled{
                        opacity:.45;
                        cursor:not-allowed;
                        box-shadow:none;
                    }

                    .action-btn-edit{
                        background:#eef4ff;
                        color:#2563eb;
                    }

                    .action-btn-edit:hover:not(:disabled){
                        background:#2563eb;
                        color:#fff;
                    }

                    .action-btn-release{
                        background:#ecfdf3;
                        color:#16a34a;
                    }

                    .action-btn-release:hover:not(:disabled){
                        background:#16a34a;
                        color:#fff;
                    }
                    .review-loader .spinner-border{
                        width:3.2rem;
                        height:3.2rem;
                        border-width:4px;
                    }

                    .empty-state-icon{
                        width:80px;
                        height:80px;
                        border-radius:50%;
                        background:#eef2ff;
                        display:flex;
                        align-items:center;
                        justify-content:center;
                        color:#4f46e5;
                        font-size:34px;
                        box-shadow:0 12px 30px rgba(79,70,229,.12);
                    }

                    .empty-state-icon i{
                        animation:floatIcon 2s ease-in-out infinite;
                    }

                    @keyframes floatIcon{

                        0%{
                            transform:translateY(0);
                        }

                        50%{
                            transform:translateY(-6px);
                        }

                        100%{
                            transform:translateY(0);
                        }

                    }
                `}
            </style>

            <AddReviewCycle kpiPeriodsData={kpiPeriodsData} />
            <EditReviewCycle editReviewCycleData={editData} />
        </Base1>
    )
}