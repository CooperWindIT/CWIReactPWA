import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import '../../Config/Loader.css';
import Base1 from '../../Config/Base1';
import { fetchWithAuth } from "../../../utils/api";
import Swal from 'sweetalert2';
import { useLocation } from "react-router-dom";
import { Dropdown, Menu, Tooltip, Select, Input, Skeleton, message, Modal, Button } from 'antd';
import { getKPIsByPeriod, getPerformancePeriods, getReviewCyclesByUser, SaveAssessments, getCyclesScoreByUserId, getFeedBacks, getIsSelfBtnEnable } from '../services/kpiServices';

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
    const [selectedQuarter, setSelectedQuarter] = useState([]);
    const [reviewStatus, setReviewStatus] = useState("Pending");
    const [totalWeightedScore, setTotalWeightedScore] = useState(0);
    const [reviewData, setReviewData] = useState([]);
    const [reviewCycleMessage, setReviewCycleMessage] = useState("");
    const [expandedCards, setExpandedCards] = useState(new Set());
    const [feedbackData, setFeedbackData] = useState([]);
    const [feedbackModal, setFeedbackModal] = useState(false);
    const [selectedFeedback, setSelectedFeedback] = useState(null);
    const [feedback, setFeedback] = useState("");
    const [selfEnable, setSelfEnable] = useState({});
    const toggleCard = (id) => {
        setExpandedCards((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

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

    const fetchIsSelfBtnEnable = async () => {
        try {
            const response = await getIsSelfBtnEnable({
                orgId: sessionUserData?.OrgId,
            });

            const data = response?.data?.[0];
            setSelfEnable(data);
        } catch (error) {
            console.error(error);
        }
    };

    const fetchFeedBacks = async () => {
        try {

            const response = await getFeedBacks({
                orgId: sessionUserData?.OrgId,
                id: selectedFeedback?.Id,
            });

            setFeedbackData(response?.data || []);

        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        if (selectedFeedback?.Id && sessionUserData?.OrgId) {
            fetchFeedBacks();
        }
    }, [selectedFeedback, sessionUserData?.OrgId]);

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
            fetchIsSelfBtnEnable();
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


    const handleRequestReview = async () => {

        const payload = {
            OrgId: sessionUserData?.OrgId,
            UserId: sessionUserData?.Id,
            Action: "UNDER_REVIEW",
            JsonData: {
                Assessments: reviewData.map(item => ({
                    Id: item.Id,
                    CycleId: selectedQuarter?.Id
                }))
            }
        };

        try {

            setLoading(true);

            const response = await SaveAssessments(payload);

            if (response?.success) {
                message.success("Review request submitted successfully.");
                fetchCyclesScoreByUserId();
            } else {
                message.error(response?.message || "Failed to submit review request.");
            }

        } catch (error) {
            console.error(error);
            message.error("Something went wrong.");
        } finally {
            setLoading(false);
        }

    };

    // const fetchCyclesScoreByUserId = async () => {
    //     try {
    //         setLoading(true);

    //         const response = await getCyclesScoreByUserId({
    //             orgId: sessionUserData?.OrgId,
    //             cycleId: selectedQuarter?.Id,
    //             employeeId: sessionUserData?.Id,
    //             periodId: selectedPeriod,
    //         });

    //         const data = response?.data || [];

    //         setReviewData(data || [0]);
    //         setReviewStatus(data[0]?.Status || "Pending");

    //         // Calculate Total Weighted Score
    //         const total = data.reduce(
    //             (sum, item) => sum + Number(item.WeightedScore || 0),
    //             0
    //         );

    //         setTotalWeightedScore(Number(total.toFixed(2)));

    //     } catch (error) {
    //         console.error(error);
    //     } finally {
    //         setLoading(false);
    //     }
    // };

    const fetchCyclesScoreByUserId = async () => {
        try {
            setLoading(true);
    
            // Clear previous message
            setReviewCycleMessage("");
    
            const response = await getCyclesScoreByUserId({
                orgId: sessionUserData?.OrgId,
                cycleId: selectedQuarter?.Id,
                employeeId: sessionUserData?.Id,
                periodId: selectedPeriod,
            });
    
            console.log("Cycles Score Response:", response);
    
            // Handle 409 response
            if (
                response?.code === 409 ||
                response?.data?.[0]?.ResponseCode === 409
            ) {
                setReviewData([]);
                setReviewStatus("Pending");
                setTotalWeightedScore(0);
    
                setReviewCycleMessage(
                    response?.data?.[0]?.Message ||
                    response?.message ||
                    "Employee is not participating in this Review Cycle."
                );
    
                return;
            }
    
            // Normal response
            const data = Array.isArray(response?.data)
                ? response.data
                : [];
    
            setReviewData(data);
            setReviewStatus(data?.[0]?.Status || "Pending");
    
            // Calculate Total Weighted Score
            const total = data.reduce(
                (sum, item) =>
                    sum + Number(item?.WeightedScore || 0),
                0
            );
    
            setTotalWeightedScore(
                Number(total.toFixed(2))
            );
    
        } catch (error) {
            console.error(error);
    
            setReviewData([]);
            setReviewStatus("Pending");
            setTotalWeightedScore(0);
    
            setReviewCycleMessage(
                "Unable to fetch KPI review details."
            );
    
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (selectedQuarter && sessionUserData?.OrgId && selectedPeriod) {
            fetchCyclesScoreByUserId();
        }
    }, [selectedQuarter, sessionUserData?.OrgId, selectedPeriod]);

    useEffect(() => {
        if (reviewCycleData?.length > 0) {
            setSelectedQuarter(reviewCycleData[0]);
        }
    }, [reviewCycleData]);

    const handleSaveReview = async () => {
        // Validation
        for (const item of reviewData) {
            if (
                item.Score1 === null ||
                item.Score1 === "" ||
                item.Score1 === undefined
            ) {
                message.warning(`${item.KPIName}: Please enter Self Score.`);
                return;
            }
            if (!item.Remarks1?.trim()) {
                message.warning(`${item.KPIName}: Please enter Self Remarks.`);
                return;
            }
        }

        const payload = {
            OrgId: sessionUserData.OrgId,
            UserId: sessionUserData.Id,
            Action: "SELF",
            JsonData: {
                Assessments: reviewData.map(item => ({
                    Id: item.Id || 0,
                    EmployeeKPIId: item.EmployeeKPIId,
                    ReviewCycleId: selectedQuarter?.Id,
                    Score1: Number(item.Score1),
                    Remarks1: item.Remarks1 || ""
                }))
            }
        };
        try {
            setLoading(true);
            const response = await SaveAssessments(payload);
            if (
                response?.success &&
                response?.data?.result?.[0]?.ResponseCode === 200
            ) {
                message.success(
                    response.data.result[0].Message
                );
                fetchCyclesScoreByUserId();
            } else {
                message.error(
                    response?.data?.result?.[0]?.Message ||
                    "Failed to save review."
                );
            }
        } catch (error) {
            console.error(error);
            message.error("Something went wrong.");
        } finally {
            setLoading(false);
        }

    };

    const handleInputChange = (index, field, value) => {
        const updated = [...reviewData];
        updated[index][field] = value;
        setReviewData(updated);
    };

    const getStatusClass = (status) => {
        switch (status?.toUpperCase()) {
            case "OPEN":
                return {
                    badge: "bg-light-success text-success",
                    icon: "text-success",
                };
            case "DRAFT":
                return {
                    badge: "bg-light-warning text-warning",
                    icon: "text-warning",
                };
            case "SUBMITTED":
                return {
                    badge: "bg-light-info text-info",
                    icon: "text-info",
                };
            case "COMPLETED":
            case "CLOSED":
                return {
                    badge: "bg-light-primary text-primary",
                    icon: "text-primary",
                };
            default:
                return {
                    badge: "bg-light-danger text-danger",
                    icon: "text-danger",
                };
        }
    };

    const selfDisabledMessage =
        reviewStatus === "REVIEWED"
            ? "Self assessment has already been reviewed."
            : reviewStatus === "SUBMITTED"
                ? "Self assessment has already been submitted."
                : selfEnable?.IsSelfBtnEnable !== 1
                    ? selfEnable?.Message || "Self score submission is locked."
                    : "";
    const isSelfDisabled =
        reviewStatus === "REVIEWED" ||
        reviewStatus === "SUBMITTED" ||
        selectedQuarter?.Status === "CLOSED" ||
        selfEnable?.IsSelfBtnEnable !== 1;

    const managerEnabled = reviewStatus === "SUBMITTED";
    const iconColors = ['#FF6B35', '#00B8D9', '#36B37E', '#FFAB00', '#6554C0', '#FF5630'];
    const colors = ["#2563eb", "#16a34a", "#f59e0b", "#dc2626"];
    const statusStyle = getStatusClass(selectedQuarter.Status);



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

                        <div className='row my-5'>
                            {/* Review Cycles */}
                            {(selectedPeriod && selectedEmployee) && (
                                <div className="card border-0 shadow-sm rounded-4 mb-4">
                                    <div className="card-header bg-white border-0 px-4 py-3">
                                        <div className="d-flex justify-content-between align-items-center">
                                            <div>
                                                <h5 className="fw-bold mb-1">
                                                    <i className="bi bi-calendar2-week text-primary me-2"></i>
                                                    Review Cycles
                                                </h5>
                                                <small className="text-muted">
                                                    Select a quarter to continue
                                                </small>
                                            </div>
                                            <span className="badge bg-light-primary text-primary px-3 py-2 rounded-pill">
                                                {reviewCycleData.length} Cycles
                                            </span>
                                        </div>
                                    </div>

                                    <div className="card-body pt-3">
                                        <div className="row g-3">
                                            {reviewCycleData.map((quarter, index) => (
                                                <div className="col-lg-3 col-md-6 col-12" key={quarter.Id}>
                                                    <div
                                                        className={`review-quarter-card
                                                            ${selectedQuarter?.Id === quarter.Id ? "active-quarter" : ""}
                                                            ${quarter.Status === "DRAFT" ? "quarter-disabled" : ""}
                                                        `}
                                                        onClick={() => {
                                                            if (quarter.Status === "DRAFT") return;
                                                            setSelectedQuarter(quarter);
                                                        }}
                                                    >
                                                        <div className="d-flex justify-content-between align-items-start">
                                                            <div className="d-flex">
                                                                <div className="quarter-icon">
                                                                    <i className="bi bi-calendar2-week fs-5"></i>
                                                                </div>
                                                                <div className="ms-3">
                                                                    <div className="fw-bold fs-5">
                                                                        {quarter.CycleName}
                                                                    </div>
                                                                    <small className="text-muted d-block">
                                                                        {new Date(quarter.StartDate).toLocaleDateString("en-GB")}
                                                                        {" - "}
                                                                        {new Date(quarter.EndDate).toLocaleDateString("en-GB")}
                                                                    </small>
                                                                </div>
                                                            </div>
                                                            <Tooltip title={quarter.Comments || "No comments available"}>
                                                                <i
                                                                    className="bi bi-chat-square-text-fill text-secondary fs-5"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    style={{ cursor: "pointer" }}
                                                                />
                                                            </Tooltip>
                                                        </div>
                                                        <div className="d-flex justify-content-between align-items-center mt-3">
                                                            <span className={`badge ${getStatusClass(quarter.Status).badge}`}>
                                                                <i className={`bi bi-circle-fill me-2 ${getStatusClass(quarter.Status).icon}`}
                                                                    style={{ fontSize: 7 }}
                                                                />
                                                                {quarter.Status}
                                                            </span>
                                                            <div className="fw-bold text-success">
                                                                <i className="bi bi-award-fill me-1"></i>
                                                                {Number(quarter.CycleScore ?? 0).toFixed(2)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

{selectedQuarter && (
    <div className='col-12'>
        <div className="card border-0 shadow-sm rounded-4">

            <div className="card-header border-0 py-3 px-4">
                <div className="d-flex align-items-center justify-content-between w-100">
                    <div>
                        <h5 className="fw-bold mb-0">
                            <i className="bi bi-bullseye text-primary me-2"></i>
                            KPI Details
                        </h5>

                        <small className="text-muted">
                            Review and manage KPI targets & weightage
                        </small>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="p-4">
                    <Skeleton
                        active
                        paragraph={{ rows: 8 }}
                        title
                    />
                </div>

            ) : reviewCycleMessage ? (

                <div className="card-body">
                    <div className="text-center py-5">

                        <i
                            className="bi bi-person-x-fill text-warning"
                            style={{ fontSize: "45px" }}
                        />

                        <h5 className="fw-bold mt-3 mb-2">
                            You are Not Participating
                        </h5>

                        <p className="text-muted mb-0">
                            {reviewCycleMessage}
                        </p>

                    </div>
                </div>

            ) : (
                <div className='card-body'>

                    <div
                        className="table-responsive review-table-container custom-scrollbar mb-4"
                        style={{
                            maxHeight: "500px",
                            overflowY: "auto"
                        }}
                    >

                        {reviewData?.map((item, index) => {
                                                        const cardId = item.Id ?? index;
                                                        const isExpanded = expandedCards.has(cardId);

                                                        return (
                                                            <div className="card shadow-sm border-0 rounded-4 mb-4 mx-2" key={cardId}>
                                                                <div className="card-body p-3">
                                                                    <div
                                                                        className="d-flex justify-content-between align-items-center"
                                                                        style={{ cursor: "pointer" }}
                                                                        onClick={() => toggleCard(cardId)}
                                                                    >
                                                                        <div className="d-flex align-items-center">
                                                                            <i className={`bi ${isExpanded ? "bi-chevron-down" : "bi-chevron-right"} text-muted me-3`}></i>

                                                                            <div
                                                                                className="rounded-circle bg-light-success text-success fw-bold d-flex align-items-center justify-content-center shadow-sm"
                                                                                style={{
                                                                                    width: 34,
                                                                                    height: 34,
                                                                                    fontSize: 13
                                                                                }}
                                                                            >
                                                                                {String(index + 1).padStart(2, "0")}
                                                                            </div>

                                                                            <div className="ms-3">
                                                                                <div className="d-flex align-items-center">
                                                                                    <h5 className="fw-bold mb-0">{item.KPIName}</h5>
                                                                                </div>
                                                                                <span className="badge bg-light-primary text-primary mt-1 me-2">
                                                                                    <i className="bi bi-rulers me-1 text-primary"></i>
                                                                                    {item.UOMName || 'N/A'}
                                                                                </span>
                                                                                <span className="badge bg-light-success text-success mt-1">
                                                                                    <i className="bi bi-check-circle me-1 text-success"></i>
                                                                                    {item.Status || 'Pending'}
                                                                                </span>
                                                                            </div>
                                                                        </div>

                                                                        <div className="text-end me-2">
                                                                            <small className="text-muted">
                                                                                <i className="bi bi-award me-1"></i>
                                                                                Final Score
                                                                            </small>

                                                                            <h3 className="fw-bold text-primary mb-0">
                                                                                {Number(item.WeightedScore ?? 0).toFixed(2)}
                                                                            </h3>
                                                                        </div>
                                                                    </div>

                                                                    {isExpanded && (
                                                                        <>
                                                                            <hr />

                                                                            <div className="d-flex gap-2 mb-3 flex-wrap">
                                                                                <div className="flex-fill" style={{ minWidth: "180px" }}>
                                                                                    <div className="metric-box">
                                                                                        <div className="metric-icon bg-light-primary">
                                                                                            <i className="bi bi-bullseye text-primary"></i>
                                                                                        </div>
                                                                                        <div className="metric-content">
                                                                                            <span>Target</span>
                                                                                            <h6>{item.Target ?? "-"}</h6>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                                <div className="flex-fill" style={{ minWidth: "180px" }}>
                                                                                    <div className="metric-box">
                                                                                        <div className="metric-icon bg-light-info">
                                                                                            <i className="bi bi-percent text-info"></i>
                                                                                        </div>
                                                                                        <div className="metric-content">
                                                                                            <span>Weight</span>
                                                                                            <h6>{item.Weightage ?? 0}%</h6>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                                <div className="flex-fill" style={{ minWidth: "180px" }}>
                                                                                    <div className="metric-box">
                                                                                        <div className="metric-icon bg-light-success">
                                                                                            <i className="bi bi-calculator-fill text-success"></i>
                                                                                        </div>
                                                                                        <div className="metric-content">
                                                                                            <span>Calculated Score</span>
                                                                                            <h6>{item.CalculatedScore ?? "-"}</h6>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                                <div className="flex-fill" style={{ minWidth: "180px" }}>
                                                                                    <div className="metric-box">
                                                                                        <div className="metric-icon bg-light-danger">
                                                                                            <i className="bi bi-bar-chart-line-fill text-danger"></i>
                                                                                        </div>
                                                                                        <div className="metric-content">
                                                                                            <span>Weighted Score</span>
                                                                                            <h6>{item.WeightedScore ?? "-"}</h6>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                            <div className="row g-3 mt-1">

                                                                                {/* Objectives */}
                                                                                <div className="col-12 col-md-6">

                                                                                    <div className="border rounded-3 p-3 h-100 bg-light">

                                                                                        <div className="d-flex align-items-center gap-2 mb-2">

                                                                                            <div
                                                                                                className="d-flex align-items-center justify-content-center rounded-circle bg-primary-subtle"
                                                                                                style={{
                                                                                                    width: "32px",
                                                                                                    height: "32px",
                                                                                                }}
                                                                                            >
                                                                                                <i className="bi bi-bullseye text-primary"></i>
                                                                                            </div>

                                                                                            <span className="fw-semibold text-dark">
                                                                                                Objectives
                                                                                            </span>

                                                                                        </div>

                                                                                        <div
                                                                                            className="text-muted small"
                                                                                            dangerouslySetInnerHTML={{
                                                                                                __html: item.Objectives || "-"
                                                                                            }}
                                                                                        />

                                                                                    </div>

                                                                                </div>


                                                                                {/* Measurables */}
                                                                                <div className="col-12 col-md-6">

                                                                                    <div className="border rounded-3 p-3 h-100 bg-light">

                                                                                        <div className="d-flex align-items-center gap-2 mb-2">

                                                                                            <div
                                                                                                className="d-flex align-items-center justify-content-center rounded-circle bg-success-subtle"
                                                                                                style={{
                                                                                                    width: "32px",
                                                                                                    height: "32px",
                                                                                                }}
                                                                                            >
                                                                                                <i className="bi bi-bar-chart-line-fill text-success"></i>
                                                                                            </div>

                                                                                            <span className="fw-semibold text-dark">
                                                                                                Measurables
                                                                                            </span>

                                                                                        </div>

                                                                                        <div className="text-muted small">
                                                                                            {item.Measurables ?? "-"}
                                                                                        </div>

                                                                                    </div>

                                                                                </div>

                                                                            </div>
                                                                            <div className="row g-4">
                                                                                <div className="col-lg-6">
                                                                                    <div className="card border shadow-sm h-100">
                                                                                        <div className="card-body">
                                                                                            <div className="d-flex align-items-center border-bottom pb-2 mb-3">
                                                                                                <i className="bi bi-person-fill text-primary me-2 fs-5"></i>
                                                                                                <h6 className="mb-0 fw-bold">Self Review</h6>
                                                                                            </div>

                                                                                            <div className="mb-3">
                                                                                                <label className="small fw-semibold mb-1">
                                                                                                    <i className="bi bi-star-fill text-warning me-1"></i>
                                                                                                    Self Score
                                                                                                </label>

                                                                                                <Tooltip
                                                                                                    title={isSelfDisabled ? selfDisabledMessage : ""}
                                                                                                >
                                                                                                    <span className="d-block">
                                                                                                        <Input
                                                                                                            size="large"
                                                                                                            type="number"
                                                                                                            style={{ height: 40 }}
                                                                                                            value={item.Score1 ?? ""}
                                                                                                            disabled={isSelfDisabled}
                                                                                                            onChange={(e) =>
                                                                                                                handleInputChange(
                                                                                                                    index,
                                                                                                                    "Score1",
                                                                                                                    e.target.value
                                                                                                                )
                                                                                                            }
                                                                                                            onWheel={(e) => e.target.blur()}
                                                                                                        />
                                                                                                    </span>
                                                                                                </Tooltip>
                                                                                            </div>

                                                                                            <div>
                                                                                                <label className="small fw-semibold mb-1">
                                                                                                    <i className="bi bi-chat-left-text text-primary me-1"></i>
                                                                                                    Self Feedback
                                                                                                </label>

                                                                                                <Tooltip
                                                                                                    title={isSelfDisabled ? selfDisabledMessage : ""}
                                                                                                >
                                                                                                    <span className="d-block">
                                                                                                        <Input.TextArea
                                                                                                            rows={4}
                                                                                                            value={item.Remarks1 ?? ""}
                                                                                                            disabled={isSelfDisabled}
                                                                                                            onChange={(e) =>
                                                                                                                handleInputChange(
                                                                                                                    index,
                                                                                                                    "Remarks1",
                                                                                                                    e.target.value
                                                                                                                )
                                                                                                            }
                                                                                                        />
                                                                                                    </span>
                                                                                                </Tooltip>
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>

                                                                                <div className="col-lg-6">
                                                                                    <div className="card border shadow-sm h-100">
                                                                                        <div className="card-body">
                                                                                            <div className="d-flex align-items-center border-bottom pb-2 mb-3">
                                                                                                <i className="bi bi-person-workspace text-success me-2 fs-5"></i>
                                                                                                <h6 className="mb-0 fw-bold">Manager Review</h6>
                                                                                            </div>

                                                                                            <div className="mb-3">
                                                                                                <label className="small fw-semibold mb-1">
                                                                                                    <i className="bi bi-star-fill text-warning me-1"></i>
                                                                                                    Manager Score
                                                                                                </label>

                                                                                                <Input
                                                                                                    size="large"
                                                                                                    type="number"
                                                                                                    style={{ height: 40 }}
                                                                                                    value={item.Score2 ?? ""}
                                                                                                    disabled
                                                                                                />
                                                                                            </div>

                                                                                            <div>
                                                                                                <label className="small fw-semibold mb-1">
                                                                                                    <i className="bi bi-chat-left-text-fill text-success me-1"></i>
                                                                                                    Manager Feedback
                                                                                                </label>

                                                                                                <Input.TextArea
                                                                                                    rows={4}
                                                                                                    value={item.Remarks2 ?? ""}
                                                                                                    disabled
                                                                                                />
                                                                                            </div>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            </div>

                                                                            <div className="d-flex justify-content-end mt-3">
                                                                                <Button
                                                                                    type="default"
                                                                                    className="btn-premium-outline-info"
                                                                                    icon={<i className="bi bi-chat-square-text-fill"></i>}
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        setSelectedFeedback(item);
                                                                                        setFeedbackModal(true);
                                                                                    }}
                                                                                >
                                                                                    Any Time Feedback
                                                                                </Button>
                                                                            </div>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )
                                                    })}
                                                </div>

                                                <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 border-top pt-4 mt-4">
                                                    <div className="d-flex align-items-center">
                                                        <div
                                                            className="rounded-circle bg-light-success d-flex align-items-center justify-content-center me-3"
                                                            style={{
                                                                width: 52,
                                                                height: 52
                                                            }}
                                                        >
                                                            <i className="bi bi-award-fill text-success fs-3"></i>
                                                        </div>
                                                        <div>
                                                            <div className="fw-bold fs-5">
                                                                Final Evaluation Score
                                                            </div>

                                                            <small className="text-muted">
                                                                Based on manager evaluation
                                                            </small>
                                                        </div>
                                                        <div
                                                            className="ms-4 px-4 py-2 rounded-3"
                                                            style={{
                                                                background: "#ecfdf3",
                                                                border: "1px solid #d1fae5"
                                                            }}
                                                        >
                                                            <span
                                                                className="fw-bold text-success"
                                                                style={{ fontSize: 22 }}
                                                            >
                                                                {Number(totalWeightedScore ?? 0).toFixed(2)}
                                                            </span>
                                                            <span className="text-muted ms-1">
                                                                /100
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="d-flex align-items-center gap-3">
                                                        <Tooltip
                                                            title={
                                                                reviewStatus !== "DRAFT"
                                                                    ? "You can request a review only when the evaluation is in Draft status."
                                                                    : ""
                                                            }
                                                        >
                                                            <span>
                                                                <button
                                                                    className="btn btn-warning px-4 fw-bold"
                                                                    disabled={reviewStatus !== "DRAFT" || loading}
                                                                    onClick={handleRequestReview}
                                                                >
                                                                    <i className="bi bi-send-check-fill me-2"></i>
                                                                    Request for Review
                                                                </button>
                                                            </span>
                                                        </Tooltip>

                                                        <Tooltip
                                                            title={
                                                                reviewStatus === "REVIEWED" ||
                                                                    reviewStatus === "SUBMITTED" ||
                                                                    reviewStatus === "UNDER_REVIEW"
                                                                    ? `Evaluation cannot be edited while status is "${reviewStatus}".`
                                                                    : ""
                                                            }
                                                        >
                                                            <span>
                                                                <button
                                                                    className="btn btn-primary px-4 fw-bold"
                                                                    disabled={
                                                                        reviewStatus === "FEEDBACK_REVIEWED" ||
                                                                        reviewStatus === "HR_REVIEWED" ||
                                                                        reviewStatus === "CLOSED" ||
                                                                        loading
                                                                    }
                                                                    onClick={handleSaveReview}
                                                                >
                                                                    <i className="bi bi-cloud-arrow-up-fill me-2"></i>
                                                                    Save Evaluation
                                                                </button>
                                                            </span>
                                                        </Tooltip>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Any tiem feedback Model */}
            <Modal
                open={feedbackModal}
                footer={null}
                centered
                width={900}
                destroyOnClose
                onCancel={() => {
                    setFeedbackModal(false);
                    setFeedback("");
                }}
            >
                <div className="feedback-modal">
                    <div className="feedback-header mb-3">
                        <div className="feedback-icon">
                            <i className="bi bi-chat-heart-fill text-white"></i>
                        </div>
                        <div className="flex-grow-1 ms-3">
                            <h5 className="fw-bold mb-0">
                                Performance Feedback
                            </h5>
                            <small className="text-muted">
                                Employee KPI Review
                            </small>
                        </div>
                        <span className="badge bg-light-primary text-primary px-3 py-2">
                            Score {Number(selectedFeedback?.WeightedScore ?? 0).toFixed(2)}
                        </span>
                    </div>

                    <div className="feedback-kpi-card mb-4">
                        <div className="fw-bold fs-5">
                            {selectedFeedback?.KPIName}
                        </div>
                    </div>

                    <div className="mb-4">
                        <div className="d-flex align-items-center justify-content-between mb-3">
                            <h6 className="fw-bold mb-0">
                                <i className="bi bi-clock-history text-primary me-2"></i>
                                Previous Feedback
                            </h6>

                            <span className="badge bg-light-secondary text-dark">
                                {feedbackData?.length || 0} Records
                            </span>
                        </div>

                        <div className="feedback-history">
                            {feedbackData?.length > 0 ? (
                                feedbackData.map((item, index) => (
                                    <div
                                        className="feedback-item"
                                        key={`${item.tablePrimaryId}-${index}`}
                                    >
                                        <div className="feedback-avatar bg-light-success">
                                            <i className="bi bi-person-check-fill text-success"></i>
                                        </div>
                                        <div className="feedback-content">
                                            <div className="d-flex justify-content-between align-items-center">
                                                <strong>
                                                    Feedback #{feedbackData.length - index}
                                                </strong>

                                                <small className="text-info fw-bold">
                                                    {item.CommentedOn
                                                        ? new Date(item.CommentedOn).toLocaleString(
                                                            "en-IN",
                                                            {
                                                                day: "2-digit",
                                                                month: "short",
                                                                year: "numeric",
                                                                hour: "2-digit",
                                                                minute: "2-digit"
                                                            }
                                                        )
                                                        : "-"}
                                                </small>
                                            </div>
                                            <div className="text-muted mt-1">
                                                {item.CommentText}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center text-muted py-4">
                                    <i className="bi bi-chat-left-text fs-2 d-block mb-2"></i>
                                    No previous feedback available.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </Modal>

            <style>
                {`
                .feedback-header{
                        display:flex;
                        align-items:center;
                    }

                    .feedback-icon{
                        width:46px;
                        height:46px;
                        border-radius:12px;
                        background:linear-gradient(135deg,#009ef7,#7239ea);
                        display:flex;
                        justify-content:center;
                        align-items:center;
                        font-size:20px;
                    }

                    .feedback-kpi-card{
                        padding:14px 18px;
                        border:1px solid #edf2f7;
                        border-radius:12px;
                        background:#fafcff;
                    }

                    .feedback-history{
                        max-height:250px;
                        overflow:auto;
                        padding-right:6px;
                    }

                    .feedback-item{
                        display:flex;
                        gap:12px;
                        padding:14px;
                        border:1px solid #edf2f7;
                        border-radius:12px;
                        margin-bottom:12px;
                        transition:.25s;
                    }

                    .feedback-item:hover{
                        border-color:#009ef7;
                        box-shadow:0 5px 15px rgba(0,0,0,.05);
                    }

                    .feedback-avatar{
                        width:42px;
                        height:42px;
                        border-radius:50%;
                        display:flex;
                        align-items:center;
                        justify-content:center;
                        flex-shrink:0;
                    }

                    .feedback-content{
                        flex:1;
                    }
                    .btn-premium-outline-info{
                        background:#fff !important;
                        color:#0dcaf0 !important;
                        border:1px solid #0dcaf0 !important;
                        border-radius:10px;
                        font-weight:600;
                    }

                    .btn-premium-outline-info:hover{
                        background:#0dcaf0 !important;
                        color:#fff !important;
                        border-color:#0dcaf0 !important;
                    }
                                    .feedback-header{
                    display:flex;
                    align-items:center;
                    margin-bottom:24px;
                    }

                 
                    .feedback-kpi-card{
                    margin-top:20px;
                    padding:18px;
                    border-radius:14px;
                    background:#f8fbff;
                    border:1px solid #e5eefc;
                    }

                    .feedback-modal textarea{
                    border-radius:12px;
                    }
                 .metric-box{
                        height:72px;
                        border:1px solid #edf1f7;
                        border-radius:12px;
                        display:flex;
                        align-items:center;
                        padding:12px 14px;
                        background:#fff;
                        transition:.25s;
                    }

                    .metric-box:hover{
                        transform:translateY(-2px);
                        box-shadow:0 8px 18px rgba(0,0,0,.08);
                        border-color:#009ef7;
                    }

                    .metric-icon{
                        width:42px;
                        height:42px;
                        border-radius:10px;
                        display:flex;
                        align-items:center;
                        justify-content:center;
                        flex-shrink:0;
                        margin-right:12px;
                    }

                    .metric-icon i{
                        font-size:18px;
                    }

                    .metric-content{
                        display:flex;
                        flex-direction:column;
                        justify-content:center;
                        overflow:hidden;
                    }

                    .metric-content span{
                        font-size:12px;
                        color:#7e8299;
                        line-height:1;
                        margin-bottom:5px;
                    }

                    .metric-content h6{
                        margin:0;
                        font-size:18px;
                        font-weight:700;
                        color:#181c32;
                    }

                    .review-card{
                    transition:.3s;
                    border-radius:16px;
                    }

                    .review-card:hover{
                    transform:translateY(-4px);
                    box-shadow:0 12px 28px rgba(0,0,0,.08);
                    }

                    .ant-input,
                    .ant-input-number{
                    border-radius:10px;
                    }

                    .ant-input:focus,
                    .ant-input-number:focus-within{
                    box-shadow:0 0 0 3px rgba(0,158,247,.15);
                    }
                 .manager-disabled{
                        opacity:.45;
                        filter:blur(5px);
                        pointer-events:none;
                    }

                    .manager-lock-overlay{
                        position:absolute;
                        top:0;
                        right:0;
                        bottom:0;
                        left:80%;
                        display:flex;
                        align-items:center;
                        justify-content:center;
                        background:rgba(255,255,255,.75);
                        backdrop-filter:blur(5px);
                        z-index:20;
                        border-radius:12px;
                    }
                .score-display-circle {
                        width: 44px;
                        height: 44px;
                        border-radius: 12px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-weight: 700;
                        font-size: 14px;
                        margin: auto;
                    }
                    .score-display-circle.weighted { background: #f5f3ff; color: #6d28d9; border: 1px solid #ede9fe; }
                    .score-display-circle.calculated { background: #ecfeff; color: #0369a1; border: 1px solid #cffafe; }
                .cycle-tile{
                    background:#fff;
                    border-radius:14px;
                    padding:6px 20px;
                    border:1px solid #eef1f5;
                    cursor:pointer;
                    transition:.25s;
                }
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
                        width:54px;
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
                        .review-quarter-card{
                    background:#fff;
                    border:1px solid #e9ecef;
                    border-radius:12px;
                    padding:16px;
                    transition:.25s;
                    cursor:pointer;
                    position:relative;
                }

                .review-quarter-card:hover:not(.quarter-disabled){
                    transform:translateY(-2px);
                    box-shadow:0 8px 18px rgba(0,0,0,.08);
                    border-color:#d6dbe3;
                }

                .active-quarter{
                    border:2px solid #0d6efd;
                    background:#eef5ff;
                    box-shadow:0 0 0 3px rgba(13,110,253,.15);
                }

                .active-quarter::before{
                    content:"";
                    position:absolute;
                    left:0;
                    top:0;
                    bottom:0;
                    width:5px;
                    background:#0d6efd;
                    border-radius:12px 0 0 12px;
                }

                .quarter-disabled{
                    background:#f8f9fa;
                    opacity:.65;
                    cursor:not-allowed;
                    filter:grayscale(.2);
                }

                .quarter-disabled:hover{
                    transform:none;
                    box-shadow:none;
                }

                .quarter-icon{
                    width:42px;
                    height:42px;
                    border-radius:10px;
                    background:#f1f3f5;
                    color:#6c757d;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                }

                .active-quarter .quarter-icon{
                    background:#dbeafe;
                    color:#0d6efd;
                }
                `}
            </style>

        </Base1>
    )
}