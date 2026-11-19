import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Popover } from 'antd';
import { useNavigate } from 'react-router-dom';
import { BASE_IMAGE_API_GET } from './Config';
import { useWeather } from '../../utils/useWeather';
import WeatherDetails from './../../utils/WeatherDetails';
import FAQButton from './FAQBtn';
import Swal from "sweetalert2";
import { fetchWithAuth } from '../../utils/api';
import EmployeeContactQR from './../Auth/EmployeeContactQR';
import EmployeeIdCards from './../Auth/Employeeidcards'


const Base1 = ({ children }) => {

    const weather = useWeather();
    const [sessionUserData, setSessionUserData] = useState([]);
    const [menuItems, setMenuItems] = useState([]);
    const [moduleData, setModuleData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [activeDropdown, setActiveDropdown] = useState(null);
    const [dateTime, setDateTime] = useState("");
    const [currentWeek, setCurrentWeek] = useState("");

    const navigate = useNavigate();
    const location = useLocation();
    const shouldHideSidebar = ["/vms/", "/edm/", "/faq", "/kpi/", "/service-requests", "/iom/"].some(path => location.pathname.includes(path));
    const searchParams = new URLSearchParams(location.search);
    const reportId = searchParams.get("reportId");

    const [profileImageLoading, setProfileImageLoading] = useState(false);
    const [previewImage, setPreviewImage] = useState(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        const userDataString = sessionStorage.getItem('userData');
        const moduleString = localStorage.getItem('ModuleData');

        if (userDataString) {
            const userData = JSON.parse(userDataString);
            const moduledata = JSON.parse(moduleString);
            setSessionUserData(userData);
            setModuleData(moduledata);
        } else {
            console.log('User data not found in sessionStorage');
        }
    }, []);

    const handleLogout = async () => {
        sessionStorage.clear();
        navigate('/');
        setLoading(false);
    };

    const content = (
        <div className="text-dark">
            <div className="menu-item px-3">
                <div className="menu-content d-flex align-items-center px-3">

                    {/* Profile Image */}
                    <div className="symbol symbol-50px me-4">
                        <div
                            style={{
                                width: "44px",
                                height: "44px",
                                borderRadius: "50%",
                                backgroundColor: "#eaf3ff",
                                color: "#333",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                overflow: "hidden",
                                border: "2px solid #e5edff",
                            }}
                        >
                            {sessionUserData?.ImageURL ? (
                                <img
                                    src={`${BASE_IMAGE_API_GET}${sessionUserData.ImageURL}`}
                                    alt={sessionUserData?.Name || "User"}
                                    style={{
                                        width: "100%",
                                        height: "100%",
                                        objectFit: "contain",
                                        objectPosition: "center",
                                        padding: "2px",
                                        borderRadius: "50%",
                                        backgroundColor: "#fff",
                                    }}
                                />
                            ) : (
                                <i className="fa-regular fa-user text-primary fs-3"></i>
                            )}
                        </div>
                    </div>

                    {/* User Details */}
                    <div className="d-flex flex-column flex-grow-1">

                        {/* Name + Role */}
                        <div className="d-flex align-items-center flex-wrap gap-2 mb-1">
                            <span className="fw-bold fs-5">
                                {sessionUserData?.Name || "-"}
                            </span>

                            <span className="badge badge-light-success fw-bold fs-8 px-2 py-1">
                                {sessionUserData?.RoleName || "-"}
                            </span>
                        </div>

                        {/* Employee Number */}
                        <div className="d-flex align-items-center text-muted fs-7 mb-1">
                            <i className="bi bi-person-badge me-2 text-primary"></i>

                            <span className="me-1">Emp No:</span>

                            <span className="fw-semibold text-dark">
                                {sessionUserData?.EmpNo || "-"}
                            </span>
                        </div>

                        {/* Email */}
                        <div className="d-flex align-items-center text-muted fs-7">
                            <i className="bi bi-envelope me-2 text-primary"></i>

                            <span className="text-truncate">
                                {sessionUserData?.Email || "-"}
                            </span>
                        </div>

                    </div>

                </div>
            </div>
            <div className="separator my-2"></div>
            <div className="menu-item px-5">
                <a className="menu-link px-5 text-dark text-hover-warning"
                    data-bs-toggle="offcanvas"
                    data-bs-target="#offcanvasRightViewProfile"
                ><i className="fa-regular fa-user text-info me-2"></i> My Profile</a>
            </div>
            <div className="menu-item px-5">
                <Link
                    to="/kpi/my-kpis"
                    className="menu-link px-5 text-dark text-hover-warning"
                >
                    <i className="bi bi-bullseye text-warning me-2"></i>
                    My KPI's
                </Link>
            </div>
            {(sessionUserData?.Id === 1 || sessionUserData?.Id === 10) && (
                <div className="menu-item px-5">
                    <Link
                        to="/organization-chart"
                        className="menu-link px-5 text-dark text-hover-warning"
                    >
                        <i className="bi bi-diagram-3-fill text-primary me-2"></i>
                        Organization Chart
                    </Link>
                </div>
            )}

            <div className="menu-item px-5">
                <a className="menu-link px-5 text-dark text-hover-warning" onClick={handleLogout}>
                    <i className="fa-solid fa-arrow-right-from-bracket text-danger me-2"></i> Sign Out
                </a>
            </div>
        </div>
    );

    useEffect(() => {
        if (sessionUserData.OrgId) {
            const fetchMenuData = async () => {
                try {
                    const sessionMenuData = sessionStorage.getItem("menuData");

                    if (sessionMenuData) {
                        const parsedMenu = JSON.parse(sessionMenuData);
                        setMenuItems(parsedMenu);
                        if (!sessionStorage.getItem("navigationPath") && parsedMenu.length > 0) {
                            sessionStorage.setItem("navigationPath", parsedMenu[0].MenuPath);
                        }
                    } else {
                        // navigate('/user-modules');
                    }
                } catch (error) {
                    console.error("Error fetching menu data:", error.message);
                }
            };

            fetchMenuData();
        }
    }, [sessionUserData]);

    const toggleDropdown = (index) => {
        setActiveDropdown((prevIndex) => (prevIndex === index ? null : index));
    };

    const overlayStyle = {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(255, 255, 255, 0.7)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
    };

    const spinnerStyle = {
        width: '60px',
        height: '60px',
        border: '6px solid #ccc',
        borderTop: '6px solid #007bff',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
    };

    const currentSubPath = location.pathname + location.search;

    // ---------- Sidebar helpers ----------
    const normalizePath = (p = "") => "/" + String(p).replace(/^\/+/, "");

    const isMenuActive = (item) =>
        normalizePath(item.MenuPath) === location.pathname ||
        !!item.SubItems?.some((sub) => normalizePath(sub.MenuPath) === currentSubPath);

    useEffect(() => {
        if (!menuItems) return;

        menuItems.forEach((item, index) => {
            if (item.SubItems?.some((sub) => normalizePath(sub.MenuPath) === currentSubPath)) {
                setActiveDropdown(index);
            }
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentSubPath, menuItems]);

    useEffect(() => {
        const updateTime = () => {
            const data = getCurrentDateTimeAndWeek();
            setDateTime(data.formattedDateTime);
            setCurrentWeek(data.week);
        };

        updateTime();
        const interval = setInterval(updateTime, 1000);

        return () => clearInterval(interval);
    }, []);

    const getCurrentDateTimeAndWeek = () => {
        const now = new Date();

        const dayNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
        const dayName = dayNames[now.getDay()];

        const day = String(now.getDate()).padStart(2, "0");
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const year = now.getFullYear();

        const hours = String(now.getHours()).padStart(2, "0");
        const minutes = String(now.getMinutes()).padStart(2, "0");
        const seconds = String(now.getSeconds()).padStart(2, "0");

        const tempDate = new Date(Date.UTC(year, now.getMonth(), now.getDate()));
        const dayNum = tempDate.getUTCDay() || 7;
        tempDate.setUTCDate(tempDate.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(tempDate.getUTCFullYear(), 0, 1));
        const weekNo = Math.ceil((((tempDate - yearStart) / 86400000) + 1) / 7);

        return {
            formattedDateTime: `${dayName} ${day}-${month}-${year} ${hours}:${minutes}:${seconds}`,
            week: weekNo
        };
    };

    const getPasswordExpiryInfo = (updatedOn) => {
        const lastUpdate = new Date(updatedOn);
        const expiryDate = new Date(lastUpdate);
        expiryDate.setDate(lastUpdate.getDate() + 90); // Add 90 days

        const today = new Date();
        const diffTime = expiryDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // Convert ms to days

        return {
            daysRemaining: diffDays,
            isExpired: diffDays <= 0,
            isUrgent: diffDays <= 7
        };
    };

    const getSegments = (days) => {
        // Total 90 days logic
        return {
            first30: Math.min(Math.max(days - 60, 0), 30),  // Days 61 to 90
            mid30: Math.min(Math.max(days - 30, 0), 30),    // Days 31 to 60
            last30: Math.min(Math.max(days, 0), 30),        // Days 0 to 30
        };
    };

    const handleProfileImageChange = async (e) => {
        const file = e.target.files?.[0];

        if (!file) return;

        if (!file.type.startsWith("image/")) {
            Swal.fire({
                title: "Invalid File",
                text: "Please select a valid image file.",
                icon: "error",
            });
            return;
        }

        setPreviewImage(URL.createObjectURL(file));
        setProfileImageLoading(true);

        const Toast = Swal.mixin({
            toast: true,
            position: "top-end",
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true,
        });

        try {
            const payload = new FormData();

            payload.append("Id", sessionUserData?.Id || "");
            payload.append("RoleId", sessionUserData?.RoleId || "");
            payload.append("Name", sessionUserData?.Name || "");
            payload.append("Password", sessionUserData?.Password || "");
            payload.append("IsActive", 1);
            payload.append("OrgId", sessionUserData?.OrgId || "");
            payload.append("DeptId", sessionUserData?.DeptId || "");
            payload.append("Mobile", sessionUserData?.Mobile || "");
            payload.append("Email", sessionUserData?.Email || "");
            payload.append("IsMobile", sessionUserData?.IsMobile ? 1 : 0);
            payload.append("Gender", sessionUserData?.Gender ?? "");
            payload.append("ManagerId", sessionUserData?.ManagerId || "");
            payload.append("IsSuperiorId", sessionUserData?.IsSuperiorId || "");
            payload.append("UpdatedBy", sessionUserData?.Id || "");
            payload.append(
                "AccessToModules",
                Array.isArray(sessionUserData?.AccessToModules)
                    ? sessionUserData.AccessToModules.join(",")
                    : sessionUserData?.AccessToModules || ""
            );

            payload.append("ImageUrl", file);

            const response = await fetchWithAuth(`AdminRoutes/UPDTUsers`, {
                method: "POST",
                body: payload,
            });

            const data = await response.json();

            if (response.ok && data.ResultData?.Status === "Success") {
                Toast.fire({
                    icon: "success",
                    title: "Image updated. It will reflect after logout and login.",
                });

                const updatedUserData = {
                    ...sessionUserData,
                    ImageURL: data.ResultData?.ImageURL || sessionUserData?.ImageURL,
                };

                sessionStorage.setItem("userData", JSON.stringify(updatedUserData));
            } else {
                Toast.fire({
                    icon: "error",
                    title: data?.ResultData?.ResultMessage || "Failed to update profile image.",
                });

                setPreviewImage(null);
            }

        } catch (error) {
            console.error("Profile image update failed:", error);

            Toast.fire({
                icon: "error",
                title: "An unexpected error occurred.",
            });

            setPreviewImage(null);
        }
        finally {
            setProfileImageLoading(false);
            e.target.value = "";
        }
    };

    // ---------- Reusable premium menu renderer (desktop + mobile) ----------
    const renderMenu = (isMobile = false) => (
        <nav className="psb-nav">
            {menuItems?.map((item, index) => {
                const hasSub = item.SubItems?.length > 0;
                const isOpen = activeDropdown === index;
                const isActive = isMenuActive(item);

                return (
                    <div key={index} className="psb-item">
                        <a
                            href={item.MenuPath}
                            title={item.MenuName}
                            className={`psb-link ${isActive ? "is-active" : ""} ${isOpen ? "is-open" : ""}`}
                            onClick={(e) => {
                                if (hasSub) {
                                    e.preventDefault();
                                    toggleDropdown(index);
                                }
                            }}
                        >
                            <span className="psb-icon"><i className={item.IconName}></i></span>
                            <span className="psb-title">{item.MenuName}</span>
                            {hasSub && <i className="fa-solid fa-chevron-down psb-chevron"></i>}
                        </a>

                        {hasSub && (
                            <div className={`psb-submenu ${isOpen ? "show" : ""}`}>
                                <ul className="list-unstyled mb-0">
                                    {item.SubItems.map((subItem, subIndex) => {
                                        const subPath = normalizePath(subItem.MenuPath);
                                        return (
                                            <li key={subIndex}>
                                                <Link
                                                    to={subPath}
                                                    className={`psb-sublink ${subPath === currentSubPath ? "is-active" : ""}`}
                                                    onClick={() => {
                                                        if (isMobile) {
                                                            setActiveDropdown(null);
                                                        } else {
                                                            window.location.href = subPath;
                                                        }
                                                    }}
                                                >
                                                    <span className="psb-dot"></span>
                                                    {subItem.MenuName}
                                                </Link>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        )}
                    </div>
                );
            })}
        </nav>
    );


    return (
        <div className="d-flex flex-column flex-root app-root" id="kt_app_root" >
            {loading && (
                <div style={overlayStyle}>
                    <div style={spinnerStyle}></div>
                </div>
            )}

            <div className="app-page flex-column flex-column-fluid" id="kt_app_page">
                <div id="kt_app_header" className="app-header text-white shadow-sm fixed-top" data-kt-sticky="true" style={{ backgroundColor: sessionUserData?.HeaderColor }}
                    data-kt-sticky-activate="{default: true, lg: true}" data-kt-sticky-name="app-header-minimize" data-kt-sticky-offset="{default: '200px', lg: '0'}" data-kt-sticky-animation="false">
                    <div className="app-container container-fluid d-flex align-items-stretch justify-content-between" id="kt_app_header_container">
                        <div className="d-flex align-items-center d-lg-none ms-n3 me-1 me-md-2" title="Show sidebar menu">
                            <div className="btn btn-icon btn-active-color-primary w-35px h-35px" id="kt_app_sidebar_mobile_toggle">
                                <i className="ki-duotone ki-abstract-14 fs-2 fs-md-1 text-white"
                                    data-bs-toggle="offcanvas"
                                    data-bs-target="#offcanvasLeftNav"
                                    aria-controls="offcanvasLeftNav"
                                >
                                    <span className="path1 text-dark"></span>
                                    <span className="path2 text-info"></span>
                                </i>
                            </div>
                        </div>
                        <div className="d-flex align-items-center flex-grow-1 flex-lg-grow-0 d-lg-none">
                            <img alt="Logo" src={`${BASE_IMAGE_API_GET}${sessionUserData?.OrgURL}`} className="h-30px" />
                        </div>
                        <div className="d-flex align-items-stretch justify-content-between flex-lg-grow-1" id="kt_app_header_wrapper">
                            <div className="app-header-menu app-header-mobile-drawer align-items-stretch" data-kt-drawer="true" data-kt-drawer-name="app-header-menu" data-kt-drawer-activate="{default: true, lg: false}" data-kt-drawer-overlay="true" data-kt-drawer-width="250px" data-kt-drawer-direction="end" data-kt-drawer-toggle="#kt_app_header_menu_toggle" data-kt-swapper="true" data-kt-swapper-mode="{default: 'append', lg: 'prepend'}" data-kt-swapper-parent="{default: '#kt_app_body', lg: '#kt_app_header_wrapper'}">
                                <div className="menu menu-rounded menu-column menu-lg-row my-5 my-lg-0 align-items-stretch fw-semibold px-2 px-lg-0" id="kt_app_header_menu" data-kt-menu="true">
                                    <img alt="Logo" src={`${BASE_IMAGE_API_GET}${sessionUserData?.OrgURL}`} className="h-55px app-sidebar-logo-default mt-2" style={{ marginLeft: '-20px' }} />
                                    <img alt="Logo" src={`${BASE_IMAGE_API_GET}${sessionUserData?.OrgURL}`} className="h-20px app-sidebar-logo-minimize" />
                                </div>
                            </div>

                            {/* Heading */}
                            <div className="module-header shadow-sm p-3 mb-3 rounded d-flex align-items-center mt-3  d-none d-md-block">
                                <div className="flex-grow-1">
                                    <h2 className="module-title mb-1"><i className={`fas fa-${moduleData?.ImageIcon} fs-5`}></i> {moduleData?.Description}</h2>
                                </div>
                            </div>

                            {/* Navbar */}
                            <div className="app-navbar flex-shrink-0">
                                <div className="app-navbar-item ms-1 ms-md-4">
                                    {weather && (
                                        <div className="d-flex flex-column align-items-center">
                                            {/* Weather Badge */}
                                            <Popover
                                                content={<WeatherDetails weather={weather} />}
                                                placement="bottomRight"
                                            >
                                                <span
                                                    className="d-inline-flex align-items-center justify-content-center text-white position-relative overflow-hidden mb-1"
                                                    style={{
                                                        background: "rgba(255, 255, 255, 0.15)",
                                                        backdropFilter: "blur(8px)",
                                                        WebkitBackdropFilter: "blur(8px)",
                                                        borderRadius: "20px",
                                                        padding: "2px 12px",
                                                        fontSize: "15px",
                                                        fontWeight: 600,
                                                        height: "32px",
                                                        cursor: "pointer",
                                                        border: "1px solid rgba(255,255,255,0.25)",
                                                        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                                                        transition: "all 0.2s ease",
                                                    }}
                                                >
                                                    <span className="glass-shine"></span>
                                                    <span style={{ fontSize: "16px", marginRight: 6, zIndex: 1 }}>
                                                        {weather.icon}
                                                    </span>
                                                    <span style={{ zIndex: 1 }} className="d-flex align-items-center gap-1">
                                                        <span className="d-none d-md-inline opacity-75 fw-normal">{weather.city}</span>
                                                        {weather.temp}°C
                                                    </span>
                                                </span>
                                            </Popover>

                                            {/* Date and Week Info */}
                                            <div
                                                className="d-flex align-items-center gap-2 text-dark fw-bold opacity-75"
                                                style={{ fontSize: '11px', letterSpacing: '0.5px', textTransform: 'uppercase' }}
                                            >
                                                <span className="fw-bold d-none d-md-block">{dateTime}</span>

                                                <span className="border-start border-primary border-opacity-25 ps-2">
                                                    Week: <span className="text-info fw-bolder">{currentWeek}</span>
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="app-navbar-item ms-1 ms-md-4">
                                    <div className="text-hover-primary btn btn-icon btn-custom btn-icon-muted btn-active-light btn-active-color-primary  btn-active-color-primary w-35px h-35px position-relative" id="kt_drawer_chat_toggle">
                                        <i className="ki-duotone ki-message-text-2 fs-1 text-info">
                                            <span className="path1"></span>
                                            <span className="path2"></span>
                                            <span className="path3"></span>
                                        </i>
                                        <span className="bullet bullet-dot bg-success h-6px w-6px position-absolute translate-middle top-0 start-50 animation-blink"></span>
                                    </div>
                                </div>

                                <div className="app-navbar-item ms-1 ms-md-4">
                                    <Popover placement="bottom" content={content} className='border p-2 rounded border-dark'>
                                        <div className="text-hover-primary text-dark btn btn-icon btn-custom btn-icon-muted btn-active-light btn-active-color-primary  btn-active-color-primary w-35px h-35px position-relative" id="kt_drawer_chat_toggle">
                                            {sessionUserData?.Name?.charAt(0)}
                                        </div>
                                    </Popover>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="app-wrapper flex-row flex-row-fluid pt-20" id="kt_app_wrapper">
                    {!(shouldHideSidebar || ["3", "19", "21", "22"].includes(reportId)) && (
                        <div id="kt_app_sidebar" className="app-sidebar flex-column psb-sidebar" data-kt-drawer="true" style={{ width: "230px" }}>
                            <div className="psb-inner">
                                <div className="psb-section-label">Main Menu</div>

                                {renderMenu(false)}

                                {/* Footer user card */}
                                <div className="psb-footer">
                                    <div className="psb-avatar">
                                        {sessionUserData?.ImageURL ? (
                                            <img src={`${BASE_IMAGE_API_GET}${sessionUserData.ImageURL}`} alt={sessionUserData?.Name || "User"} />
                                        ) : (
                                            sessionUserData?.Name?.charAt(0) || "U"
                                        )}
                                    </div>
                                    <div className="psb-user">
                                        <div className="psb-user-name text-truncate">{sessionUserData?.Name || "-"}</div>
                                        <div className="psb-user-role text-truncate">{sessionUserData?.RoleName || "-"}</div>
                                    </div>
                                    <button type="button" className="psb-logout" title="Sign Out" onClick={handleLogout}>
                                        <i className="fa-solid fa-arrow-right-from-bracket"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                    <div className="app-main flex-column flex-row-fluid mb-11" id="kt_app_main">

                        {children}

                        <div id="kt_app_footer" className="app-footer bg-white shadow-sm fixed-bottom row">
                            <div className="app-container container-fluid d-flex flex-column flex-md-row flex-center flex-md-stack py-3 col-10">
                                <div className="text-gray-900 order-2 order-md-1">
                                    <span className="text-muted fw-semibold me-1">2025&copy;</span>
                                    <a className="text-gray-800 text-hover-primary">Cooper Wind India</a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sidebar for mobile offcanvas */}
            <div
                className="offcanvas offcanvas-end custom-offcanvas"
                tabIndex="-1"
                id="offcanvasLeftNav"
                aria-labelledby="offcanvasLeftLabel"
            >
                <div className="offcanvas-header border-bottom px-4 py-3">
                    <h5 className="mb-0">Menu</h5>
                    <button
                        type="button"
                        className="btn-close"
                        data-bs-dismiss="offcanvas"
                        aria-label="Close"
                    ></button>
                </div>

                <div className="offcanvas-body p-3 custom-scrollbar psb-mobile">
                    {renderMenu(true)}
                </div>
            </div>

            <style>
                {`
                .glass-shine {
                    position: absolute;
                    top: 0;
                    left: -100%;
                    width: 50%;
                    height: 100%;
                    background: linear-gradient(
                        to right,
                        transparent,
                        rgba(255, 255, 255, 0.3),
                        transparent
                    );
                    transform: skewX(-25deg);
                    animation: shine 2s infinite;
                }

                @keyframes shine {
                    0% { left: -100%; }
                    20% { left: 100%; }
                    100% { left: 100%; }
                }

                #offcanvasRightViewProfile {
                    width: 90% !important;
                }

                @media (min-width: 768px) {
                    #offcanvasRightViewProfile {
                        width: 40% !important;
                    }
                }

                .text-highlight {
                    color: #0dcaf0 !important;
                }
                .menu-link.hover-effect {
                    transition: all 0.2s ease-in-out;
                }

                .menu-link.hover-effect:hover {
                    transform: translateX(4px);
                    text-decoration: none;
                }

                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                `}
            </style>


            {/* My Profile */}
            <div
                className="offcanvas offcanvas-end custom-offcanvas"
                tabIndex="-1"
                id="offcanvasRightViewProfile"
                aria-labelledby="offcanvasLeftLabel"
            >
                <div className="offcanvas-header border-bottom px-4 py-3">
                    <h5 id="offcanvasProfileLabel" className="mb-0">
                        <i className="fa-regular fa-user me-2"></i> My Profile
                    </h5>
                    <button
                        type="button"
                        className="btn-close"
                        data-bs-dismiss="offcanvas"
                        aria-label="Close"
                    ></button>
                </div>

                <div className="offcanvas-body">
                    <div className="card border-0 shadow-sm">
                        <div className="card-body">
                            <div className="d-flex align-items-center mb-3">
                                <div
                                    className="profile-avatar-wrap me-3"
                                    onClick={() => !profileImageLoading && fileInputRef.current?.click()}
                                    title="Change profile image"
                                >
                                    <img
                                        src={
                                            previewImage ||
                                            (sessionUserData?.ImageURL
                                                ? `${BASE_IMAGE_API_GET}${sessionUserData.ImageURL}`
                                                : "/assets/media/avatars/blank.png")
                                        }
                                        alt={sessionUserData?.Name || "Profile"}
                                        className="profile-avatar-img"
                                    />

                                    <div className="profile-avatar-overlay">
                                        {profileImageLoading ? (
                                            <span className="spinner-border spinner-border-sm text-white"></span>
                                        ) : (
                                            <>
                                                <i className="fa-solid fa-camera"></i>
                                                <span>Change</span>
                                            </>
                                        )}
                                    </div>

                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        className="d-none"
                                        onChange={handleProfileImageChange}
                                    />
                                </div>


                                <div>
                                    <h6 className="mb-0">{sessionUserData?.Name}</h6>

                                    <small className="badge badge-light-primary mt-1 d-inline-block">
                                        {sessionUserData?.RoleName}
                                    </small>

                                    <div className="mt-1 text-gray-700">
                                        Dept:
                                        <small className='ms-1 text-gray-900 fw-bold'>{sessionUserData?.DeptName || "N/A"}</small>
                                    </div>
                                </div>

                            </div>

                            <ul className="list-group list-group-flush">
                                <li className="list-group-item d-flex justify-content-between">
                                    <span><i className="fa-solid fa-id-card icon-animate text-primary me-2"></i> Emp No</span>
                                    <span className="fw-bold">{sessionUserData?.EmpNo}</span>
                                </li>

                                <li className="list-group-item d-flex justify-content-between">
                                    <span><i className="fa-solid fa-envelope icon-animate text-primary me-2"></i> Email</span>
                                    <span className="fw-bold">{sessionUserData?.Email}</span>
                                </li>

                                <li className="list-group-item d-flex justify-content-between">
                                    <span><i className="fa-solid fa-phone icon-animate text-primary me-2"></i> Mobile</span>
                                    <span className="fw-bold">{sessionUserData?.Mobile || '--'}</span>
                                </li>

                                <li className="list-group-item d-flex justify-content-between">
                                    <span><i className="fa-solid fa-venus-mars icon-animate text-primary me-2"></i> Gender</span>
                                    <span className="fw-bold">{sessionUserData?.Gender === 1 ? 'Male' : 'Female'}</span>
                                </li>

                                <li className="list-group-item d-flex justify-content-between">
                                    <span><i className="fa-solid fa-calendar icon-animate text-primary me-2"></i> Registered On</span>
                                    <span className="fw-bold">
                                        {new Date(sessionUserData?.CreatedOn).toLocaleString("en-GB", {
                                            day: "2-digit",
                                            month: "2-digit",
                                            year: "numeric",
                                            hour: "2-digit",
                                            minute: "2-digit",
                                        })}
                                    </span>
                                </li>
                            </ul>
                        </div>

                        {sessionUserData.PasswordUpdatedOn && (() => {
                            const { daysRemaining, isExpired, isUrgent } = getPasswordExpiryInfo(sessionUserData.PasswordUpdatedOn);

                            return (
                                <div
                                    className={`card border-0 shadow-sm mb-4 security-card-animate m-3 ${isUrgent ? 'bg-light-danger' : 'bg-light-primary'}`}
                                    style={{
                                        borderRadius: '15px',
                                        borderLeft: `5px solid ${isExpired ? '#dc3545' : isUrgent ? '#ffc107' : '#0d6efd'}`,
                                        overflow: 'hidden'
                                    }}
                                >
                                    <div className="card-body p-3">
                                        <div className="d-flex align-items-center justify-content-between">
                                            <div className="d-flex align-items-center">
                                                <div className={`p-2 rounded-circle me-3 ${isUrgent ? 'bg-danger text-white urgent-pulse' : 'bg-primary text-white'}`}>
                                                    <i className={`fa ${isExpired ? 'fa-exclamation-triangle' : 'fa-shield'}`} style={{ fontSize: '1.2rem' }}></i>
                                                </div>
                                                <div>
                                                    <h6 className="mb-0 fw-bold" style={{ fontSize: '0.95rem' }}>Password Security</h6>
                                                    <p className="small text-muted mb-0">
                                                        {isExpired
                                                            ? "Your password has expired. Please update it now."
                                                            : `Your password expires in `}
                                                        {!isExpired && (
                                                            <strong className={isUrgent ? 'text-danger font-bold' : 'text-primary'}>
                                                                {daysRemaining} days
                                                            </strong>
                                                        )}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {!isExpired && (() => {
                                            const segments = getSegments(daysRemaining);
                                            return (
                                                <div className="mt-3">
                                                    <div className="d-flex justify-content-between mb-1">
                                                        <span className="text-muted fw-bold" style={{ fontSize: '0.7rem' }}>Security Lifespan</span>
                                                        <span className="text-muted fw-bold" style={{ fontSize: '0.7rem' }}>{daysRemaining} / 90 Days</span>
                                                    </div>

                                                    <div className="progress" style={{ height: '8px', backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: '10px' }}>
                                                        <div
                                                            className="progress-bar progress-bar-animated-smooth bg-danger"
                                                            role="progressbar"
                                                            style={{ width: `${(segments.last30 / 90) * 100}%`, borderRight: '1px solid #fff' }}
                                                        ></div>

                                                        <div
                                                            className="progress-bar progress-bar-animated-smooth bg-warning"
                                                            role="progressbar"
                                                            style={{ width: `${(segments.mid30 / 90) * 100}%`, borderRight: '1px solid #fff' }}
                                                        ></div>

                                                        <div
                                                            className="progress-bar progress-bar-animated-smooth bg-success"
                                                            role="progressbar"
                                                            style={{ width: `${(segments.first30 / 90) * 100}%` }}
                                                        ></div>
                                                    </div>

                                                    <div className="d-flex justify-content-between mt-1 px-1">
                                                        <span style={{ fontSize: '0.6rem', color: '#ccc' }}>|</span>
                                                        <span style={{ fontSize: '0.6rem', color: '#ccc' }}>|</span>
                                                        <span style={{ fontSize: '0.6rem', color: '#ccc' }}>|</span>
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>
                            );
                        })()}

                        <div className="p-4">
                            <EmployeeContactQR embedded closeOffcanvasId="offcanvasRightViewProfile" />
                        </div>
                        {[2, 10, 3].includes(Number(sessionUserData?.Id)) && (
                            <EmployeeIdCards />
                        )}
                    </div>
                </div>
            </div>

            <FAQButton />

            <style>
                {`
                .profile-avatar-wrap {
                    width: 58px;
                    height: 58px;
                    border-radius: 50%;
                    position: relative;
                    overflow: hidden;
                    flex: 0 0 58px;
                    cursor: pointer;
                    border: 2px solid #e5edff;
                    background: #f8fafc;
                    box-shadow: 0 8px 18px rgba(15, 23, 42, 0.12);
                }

                .profile-avatar-img {
                    width: 100%;
                    height: 100%;
                    object-fit: contain;
                    object-position: center;
                    display: block;
                    padding: 3px;
                    border-radius: 50%;
                    background: #fff;
                    transition: transform 0.25s ease, filter 0.25s ease;
                }

                .profile-avatar-overlay {
                    position: absolute;
                    inset: 0;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 2px;
                    color: #fff;
                    font-size: 10px;
                    font-weight: 800;
                    background: rgba(15, 23, 42, 0.62);
                    opacity: 0;
                    transition: opacity 0.25s ease;
                }

                .profile-avatar-overlay i { font-size: 14px; }

                .profile-avatar-wrap:hover .profile-avatar-img {
                    transform: scale(1.06);
                    filter: brightness(0.82);
                }

                .profile-avatar-wrap:hover .profile-avatar-overlay { opacity: 1; }

                .progress-bar-animated-smooth { transition: width 1.2s ease-in-out; }

                .progress-bar { box-shadow: inset 0 -1px 0 rgba(0,0,0,0.15); }

                .module-title {
                    color: #0d75ae;
                    font-weight: 700;
                    font-size: 1.5rem;
                    line-height: 1.3;
                }

                .module-subtitle {
                    color: #6c757d;
                    font-size: 0.95rem;
                    font-weight: 500;
                    line-height: 1.2;
                }

                .module-icon {
                    background: rgba(13, 117, 174, 0.1);
                    color: #0d75ae;
                }

                /* ===== Original global styles (used by other pages - keep) ===== */
                .menu-item {
                    margin-bottom: 5px;
                }

                .menu-link {
                    text-decoration: none;
                    color: #333;
                    border-radius: 6px;
                    transition: background 0.2s;
                }

                .menu-link:hover {
                    background: #f5f5f5;
                }

                .menu-link.active {
                    background: #eaf3ff;
                    font-weight: bold;
                    border: 1px solid #007bff;
                }

                .submenu {
                    margin-top: 5px;
                }

                .submenu-link {
                    text-decoration: none;
                    color: #555;
                    border-radius: 4px;
                }

                .submenu-link:hover {
                    background: #f1f1f1;
                    color: #007bff;
                }

                .menu-link {
                    padding: 0.75rem 1rem;
                    border-radius: 0.5rem;
                    background-color: rgb(236, 240, 244);
                    transition: all 0.3s;
                    font-weight: 500;
                    color: #212529;
                    text-decoration: none;
                }

                .menu-link:hover {
                    background-color: #e9ecef;
                }

                .menu-link.active:hover,
                .submenu-link.active-sub:hover {
                    background-color: #c3e7fc;
                }

                .menu-link.active,
                .submenu-link.active-sub {
                    background-color: #d1ecff;
                    color: #0d6efd !important;
                    font-weight: 600;
                }

                .submenu-link {
                    padding-left: 1rem;
                    color: #495057;
                    transition: 0.2s ease;
                }

                .submenu-link:hover {
                    color: #0d6efd;
                }

                .menu-link.has-submenu i.fa-chevron-down,
                .menu-link.has-submenu i.fa-chevron-up {
                    font-size: 0.9rem;
                    color: #6c757d;
                    margin-left: auto;
                }

                .submenu {
                    display: none;
                    transition: all 0.3s ease;
                }
                .submenu.show {
                    display: block;
                }

                /* Custom Offcanvas */
                .custom-offcanvas {
                    width: 80% !important;
                    background: #ffffff;
                    border-left: 1px solid #dee2e6;
                    border-radius: 0 0 0.75rem 0.75rem;
                    box-shadow: -5px 0 15px rgba(0, 0, 0, 0.05);
                }

                .custom-scrollbar {
                    max-height: calc(100vh - 100px);
                    overflow-y: auto;
                    scrollbar-width: thin;
                }

                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background-color: #ccc;
                    border-radius: 10px;
                }

                .icon-animate { animation: pulseIcon 2s infinite ease-in-out; }

                @keyframes pulseIcon {
                    0% { transform: scale(1); opacity: 0.9; }
                    50% { transform: scale(1.18); opacity: 1; }
                    100% { transform: scale(1); opacity: 0.9; }
                }

                /* =====================================================
                   PREMIUM SIDEBAR
                   ===================================================== */
                .psb-sidebar {
                    background: linear-gradient(180deg, #ffffff 0%, #f7fafd 100%) !important;
                    border-right: 1px solid #edf1f7;
                    box-shadow: 4px 0 24px rgba(15, 23, 42, 0.04);
                }

                .psb-inner {
                    position: sticky;
                    top: 80px;
                    height: calc(100vh - 80px - 52px); /* header + footer */
                    display: flex;
                    flex-direction: column;
                    padding: 18px 12px 12px;
                }

                .psb-section-label {
                    font-size: 10.5px;
                    font-weight: 700;
                    letter-spacing: 1.4px;
                    text-transform: uppercase;
                    color: #94a3b8;
                    padding: 0 10px 10px;
                }

                .psb-nav {
                    flex: 1 1 auto;
                    overflow-y: auto;
                    overflow-x: hidden;
                    padding-right: 2px;
                    scrollbar-width: thin;
                }
                .psb-nav::-webkit-scrollbar { width: 4px; }
                .psb-nav::-webkit-scrollbar-thumb { background: #dbe3ec; border-radius: 10px; }

                /* Main link */
                .psb-item { margin-bottom: 6px; }

                .psb-link {
                    position: relative;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 8px 10px;
                    border-radius: 12px;
                    color: #334155;
                    font-size: 14px;
                    font-weight: 600;
                    line-height: 1.25;
                    text-decoration: none;
                    background: transparent;
                    transition: background .25s ease, color .25s ease, box-shadow .25s ease, transform .2s ease;
                }
                .psb-link:hover {
                    background: #eef6fb;
                    color: #0d75ae;
                    transform: translateX(3px);
                }

                .psb-icon {
                    flex: 0 0 34px;
                    width: 34px;
                    height: 34px;
                    border-radius: 10px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 14px;
                    color: #0d75ae;
                    background: #ffffff;
                    border: 1px solid #e6edf5;
                    box-shadow: 0 2px 6px rgba(15, 23, 42, 0.05);
                    transition: all .25s ease;
                }
                .psb-icon i { color: inherit !important; }
                .psb-link:hover .psb-icon {
                    border-color: #cfe6f3;
                    box-shadow: 0 4px 10px rgba(13, 117, 174, 0.15);
                }

                .psb-title { flex: 1 1 auto; min-width: 0; }

                .psb-chevron {
                    font-size: 11px;
                    color: #94a3b8;
                    transition: transform .3s ease;
                }
                .psb-link.is-open .psb-chevron { transform: rotate(180deg); }

                /* Active */
                .psb-link.is-active {
                    color: #ffffff !important;
                    background: linear-gradient(135deg, #0d75ae 0%, #00a6c7 100%);
                    box-shadow: 0 8px 20px -6px rgba(13, 117, 174, 0.55);
                    transform: none;
                }
                .psb-link.is-active .psb-icon {
                    color: #ffffff;
                    background: rgba(255, 255, 255, 0.18);
                    border-color: rgba(255, 255, 255, 0.28);
                    box-shadow: none;
                }
                .psb-link.is-active .psb-chevron { color: rgba(255, 255, 255, .85); }
                .psb-link.is-active::before {
                    content: "";
                    position: absolute;
                    left: -12px;
                    top: 10px;
                    bottom: 10px;
                    width: 4px;
                    border-radius: 0 4px 4px 0;
                    background: #0d75ae;
                }

                /* Submenu (smooth expand) */
                .psb-submenu {
                    display: grid;
                    grid-template-rows: 0fr;
                    transition: grid-template-rows .3s ease;
                }
                .psb-submenu.show { grid-template-rows: 1fr; }
                .psb-submenu > ul {
                    overflow: hidden;
                    margin-left: 26px !important;
                    border-left: 1.5px dashed #dbe5ee;
                }
                .psb-submenu.show > ul { padding: 6px 0 2px; }

                .psb-sublink {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin: 2px 0 2px 10px;
                    padding: 7px 10px;
                    border-radius: 8px;
                    font-size: 13px;
                    font-weight: 500;
                    color: #64748b;
                    text-decoration: none;
                    transition: all .2s ease;
                }
                .psb-dot {
                    width: 6px;
                    height: 6px;
                    border-radius: 50%;
                    background: #cbd5e1;
                    flex: 0 0 6px;
                    transition: all .2s ease;
                }
                .psb-sublink:hover { background: #f1f7fb; color: #0d75ae; }
                .psb-sublink:hover .psb-dot { background: #0d75ae; }
                .psb-sublink.is-active {
                    background: #e7f4fb;
                    color: #0d75ae;
                    font-weight: 700;
                }
                .psb-sublink.is-active .psb-dot {
                    background: #0d75ae;
                    box-shadow: 0 0 0 3px rgba(13, 117, 174, 0.18);
                }

                /* Footer user card */
                .psb-footer {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin-top: 12px;
                    padding: 10px;
                    border-radius: 14px;
                    background: linear-gradient(135deg, #f1f8fc 0%, #eaf6fa 100%);
                    border: 1px solid #e1eef6;
                }
                .psb-avatar {
                    flex: 0 0 36px;
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    overflow: hidden;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 700;
                    color: #fff;
                    background: linear-gradient(135deg, #0d75ae, #00a6c7);
                    border: 2px solid #fff;
                    box-shadow: 0 2px 8px rgba(13, 117, 174, .25);
                }
                .psb-avatar img { width: 100%; height: 100%; object-fit: cover; background: #fff; }
                .psb-user { flex: 1 1 auto; min-width: 0; line-height: 1.2; }
                .psb-user-name { font-size: 13px; font-weight: 700; color: #1e293b; }
                .psb-user-role { font-size: 11px; color: #64748b; }
                .psb-logout {
                    flex: 0 0 30px;
                    width: 30px;
                    height: 30px;
                    border: none;
                    border-radius: 8px;
                    background: #fff;
                    color: #ef4444;
                    box-shadow: 0 1px 4px rgba(15, 23, 42, .08);
                    transition: all .2s ease;
                }
                .psb-logout:hover { background: #ef4444; color: #fff; }

                /* Mobile offcanvas */
                .psb-mobile .psb-nav { overflow: visible; }
                .psb-mobile .psb-link.is-active::before { display: none; }
                .psb-mobile .psb-link { font-size: 15px; }
                `}
            </style>
        </div>
    )
};

export default Base1;