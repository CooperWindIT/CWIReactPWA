import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Popover } from 'antd';
import { useNavigate } from 'react-router-dom';
import { BASE_IMAGE_API_GET } from './Config';
import { useWeather } from '../../utils/useWeather';
import WeatherDetails from './../../utils/WeatherDetails';
import FAQButton from './FAQBtn';
// import LogoImg from '../Assests/Images/cwilogo.png';

const Base1 = ({ children }) => {

    const weather = useWeather();
    // console.log(weather)
    const [sessionUserData, setSessionUserData] = useState([]);
    const [menuItems, setMenuItems] = useState([]);
    const [moduleData, setModuleData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [activeDropdown, setActiveDropdown] = useState(null);
    const [dateTime, setDateTime] = useState("");
    const [currentWeek, setCurrentWeek] = useState("");

    const navigate = useNavigate();
    const currentPath = window.location.pathname;
    const location = useLocation();
    const shouldHideSidebar = ["/vms/", "/alert/", "/edm/", "/faq"].some(path => location.pathname.includes(path));
    const shouldDocComponents = location.pathname.includes("/pmms/");
    const searchParams = new URLSearchParams(location.search);
    const reportId = searchParams.get("reportId");

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
        localStorage.clear();
        navigate('/');
        setLoading(false);
    };

    const content = (
        <div className="text-dark">
            <div className="menu-item px-3">
                <div className="menu-content d-flex align-items-center px-3">
                    <div className="symbol symbol-50px me-5">
                        {/* <img alt="Logo" src="assets/media/avatars/300-3.jpg" /> */}
                        <div
                            style={{
                                width: "40px",
                                height: "40px",
                                borderRadius: "50%",
                                backgroundColor: "skyblue",
                                color: "#333",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "18px",
                                fontWeight: "bold",
                                textTransform: "uppercase",
                            }}
                        >
                            {/* {sessionUserData?.Name?.charAt(0)} */}
                            <i className="fa-regular fa-user text-white"></i>
                        </div>
                    </div>
                    <div className="d-flex flex-column">
                        <div className="fw-bold d-flex align-items-center fs-5">{sessionUserData.Name}
                            <span className="badge badge-light-success fw-bold fs-8 px-2 py-1 ms-2">{setSessionUserData.RoleName}</span></div>
                        <a href="#" className="fw-semibold text-muted text-hover-primary fs-7">{sessionUserData.Email}</a>
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
                    to="/organization-chart"
                    className="menu-link px-5 text-dark text-hover-warning"
                >
                    <i className="bi bi-diagram-3-fill text-primary me-2"></i>
                    Organization Chart
                </Link>
            </div>

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
                        navigate('/user-modules');
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
    useEffect(() => {
        if (!menuItems) return;

        menuItems.forEach((item, index) => {
            if (item.SubItems?.some((sub) => `/${sub.MenuPath}` === currentSubPath)) {
                setActiveDropdown(index);
            }
        });
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

    return (
        <div className="d-flex flex-column flex-root app-root" id="kt_app_root" >
            {loading && (
                <div style={overlayStyle}>
                    <div style={spinnerStyle}></div>
                </div>
            )}

            <div className="app-page flex-column flex-column-fluid" id="kt_app_page">
                {/* <div id="kt_app_header" className="app-header text-white shadow-sm fixed-top" data-kt-sticky="true" style={{ backgroundColor: '#90e0ef' }} */}
                <div id="kt_app_header" className="app-header text-white shadow-sm fixed-top" data-kt-sticky="true" style={{ backgroundColor: moduleData?.UITheme2 }}
                    data-kt-sticky-activate="{default: true, lg: true}" data-kt-sticky-name="app-header-minimize" data-kt-sticky-offset="{default: '200px', lg: '0'}" data-kt-sticky-animation="false">
                    <div className="app-container container-fluid d-flex align-items-stretch justify-content-between" id="kt_app_header_container">
                        <div className="d-flex align-items-center d-lg-none ms-n3 me-1 me-md-2" title="Show sidebar menu">
                            <div className="btn btn-icon btn-active-color-primary w-35px h-35px" id="kt_app_sidebar_mobile_toggle"
                                style={{
                                    pointerEvents: (shouldHideSidebar || reportId === '3') ? 'none' : 'auto',
                                    opacity: (shouldHideSidebar || reportId === '3') ? 0.3 : 1
                                }}
                            >
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
                            <img alt="Logo" src={`${BASE_IMAGE_API_GET}${sessionUserData?.ImageUrl}`} className="h-30px" />
                        </div>
                        <div className="d-flex align-items-stretch justify-content-between flex-lg-grow-1" id="kt_app_header_wrapper">
                            <div className="app-header-menu app-header-mobile-drawer align-items-stretch" data-kt-drawer="true" data-kt-drawer-name="app-header-menu" data-kt-drawer-activate="{default: true, lg: false}" data-kt-drawer-overlay="true" data-kt-drawer-width="250px" data-kt-drawer-direction="end" data-kt-drawer-toggle="#kt_app_header_menu_toggle" data-kt-swapper="true" data-kt-swapper-mode="{default: 'append', lg: 'prepend'}" data-kt-swapper-parent="{default: '#kt_app_body', lg: '#kt_app_header_wrapper'}">
                                <div className="menu menu-rounded menu-column menu-lg-row my-5 my-lg-0 align-items-stretch fw-semibold px-2 px-lg-0" id="kt_app_header_menu" data-kt-menu="true">
                                    <img alt="Logo" src={`${BASE_IMAGE_API_GET}${sessionUserData?.ImageUrl}`} className="h-55px app-sidebar-logo-default mt-2" style={{ marginLeft: '-20px' }} />
                                    <img alt="Logo" src={`${BASE_IMAGE_API_GET}${sessionUserData?.ImageUrl}`} className="h-20px app-sidebar-logo-minimize" />
                                </div>
                            </div>

                            {/* Heading */}
                            <div className="module-header shadow-sm p-3 mb-3 rounded d-flex align-items-center mt-3  d-none d-md-block">
                                <div className="flex-grow-1">
                                    <h2 className="module-title mb-1"><i className={`fas fa-${moduleData?.ImageIcon} fs-5`}></i> {moduleData?.Description}</h2>
                                    {/* <h2 className="module-title mb-0 d-flex align-items-center justify-content-center gap-2 d-block d-md-none text-center me-8">
                                        {moduleData?.ModuleName}
                                    </h2> */}
                                </div>
                            </div>

                            {/* Heading */}
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
                                                        height: "32px", // Slightly shorter to accommodate text below
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
                                            {/* <i className="fa-regular fa-user text-white"></i> */}
                                            {sessionUserData?.Name?.charAt(0)}
                                        </div>
                                    </Popover>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="app-wrapper flex-row flex-row-fluid pt-20" id="kt_app_wrapper">
                    {!(shouldHideSidebar || reportId === '3' || reportId === '19' || reportId === '21') && (
                        <div id="kt_app_sidebar" className="app-sidebar flex-column" data-kt-drawer="true" style={{ width: '205px' }}>
                            <div className="app-sidebar-menu overflow-hidden flex-column-fluid bg-white shadow-sm">
                                <div id="kt_app_sidebar_menu_wrapper" className="app-sidebar-wrapper">
                                    <div id="kt_app_sidebar_menu_scroll" style={{ minHeight: '90vh' }} className="scroll-y my-5 mx-3" data-kt-scroll="true" data-kt-scroll-activate="true"
                                        data-kt-scroll-height="auto" data-kt-scroll-dependencies="#kt_app_sidebar_logo, #kt_app_sidebar_footer" data-kt-scroll-wrappers="#kt_app_sidebar_menu" data-kt-scroll-offset="5px" data-kt-scroll-save-state="true">
                                        <div className="menu menu-column menu-rounded menu-sub-indention fw-semibold fs-4" id="#kt_app_sidebar_menu" data-kt-menu="true" data-kt-menu-expand="false">
                                            <div data-kt-menu-trigger="click" className="menu-item menu-accordion">
                                                <div className="sidebar-menu">
                                                    {menuItems &&
                                                        menuItems?.map((item, index) => (
                                                            <div key={index} className="menu-item">
                                                                <a
                                                                    href={item.MenuPath}
                                                                    // to={item.MenuPath}
                                                                    className={`menu-link d-flex align-items-center p-2 ${activeDropdown === index ? "active" : ""
                                                                        }  ${item.MenuPath === currentPath ? "text-highligh fw-bold border border-primary border-2" : "text-dark"} hover-effect`}
                                                                    onClick={(e) => {
                                                                        if (item.SubItems?.length) {
                                                                            e.preventDefault();
                                                                            toggleDropdown(index);
                                                                        }
                                                                    }}
                                                                >
                                                                    <i className={`me-2 fs-5 ${item.IconName}`}></i>
                                                                    <span className="menu-title">{item.MenuName}</span>
                                                                    {item.SubItems?.length > 0 && (
                                                                        <i
                                                                            className={`ms-auto fa-solid ${activeDropdown === index ? "fa-chevron-up" : "fa-chevron-down"
                                                                                }`}
                                                                        ></i>
                                                                    )}
                                                                </a>

                                                                {item.SubItems?.length > 0 && (
                                                                    <ul
                                                                        className={`submenu list-unstyled ps-4 ${activeDropdown === index ? "d-block" : "d-none"
                                                                            }`}
                                                                    >
                                                                        {item.SubItems.map((subItem, subIndex) => (
                                                                            <li key={subIndex}>
                                                                                <Link
                                                                                    to={`/${subItem.MenuPath}`}
                                                                                    className={`submenu-link d-block py-1 px-2 ${`/${subItem.MenuPath}` === currentSubPath ? "fw-bold text-primary" : "text-dark"
                                                                                        }`}
                                                                                    onClick={() => window.location.href = `/${subItem.MenuPath}`}
                                                                                >
                                                                                    <i className="fa-solid fa-arrow-right me-2"></i>
                                                                                    {subItem.MenuName}
                                                                                </Link>
                                                                            </li>
                                                                        ))}
                                                                    </ul>
                                                                )}
                                                            </div>
                                                        ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                {/* {shouldDocComponents && 
                                    <div className="app-sidebar-footer flex-column-auto pt-2 pb-6 px-6 sticky-bottom" id="kt_app_sidebar_footer">
                                        <a href="https://services.cooperwind.online/uploads/CWIDocs/1758281305350-PMMS%20User%20Guide%20(1).pdf" target='_blank' className="btn btn-flex flex-center btn-custom btn-primary overflow-hidden text-nowrap px-0 h-40px w-100" data-bs-toggle="tooltip" data-bs-trigger="hover" data-bs-dismiss-="click" data-bs-original-title="200+ in-house components and 3rd-party plugins" data-kt-initialized="1">
                                            <span className="btn-label">Docs &amp; Components</span>
                                            <i className="ki-duotone ki-document btn-icon fs-2 m-0">
                                                <span className="path1"></span>
                                                <span className="path2"></span>
                                            </i>
                                        </a>
                                    </div>
                                } */}
                            </div>
                        </div>
                    )}
                    <div className="app-main flex-column flex-row-fluid mb-11" id="kt_app_main">

                        {children}

                        <div id="kt_app_footer" className="app-footer bg-white shadow-sm fixed-bottom row">
                            {shouldDocComponents &&
                                <div className='col-2 d-none d-md-block'>
                                    <a href="https://services.cooperwind.online/uploads/CWIDocs/1758281305350-PMMS%20User%20Guide%20(1).pdf" target='_blank'
                                        className="btn btn-flex flex-center btn-custom btn-primary overflow-hidden text-nowrap px-0 h-40px w-100 ms-2"
                                        data-bs-toggle="tooltip" data-bs-trigger="hover" data-bs-dismiss-="click"
                                        data-bs-original-title="200+ in-house components and 3rd-party plugins"
                                        data-kt-initialized="1">
                                        <span className="btn-label">User Manual</span>
                                        <i className="ki-duotone ki-document btn-icon fs-2 ">
                                            <span className="path1"></span>
                                            <span className="path2"></span>
                                        </i>
                                    </a>
                                </div>
                            }
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

            {/* Sidebar for mobiel offcanvas */}
            <div
                className="offcanvas offcanvas-end custom-offcanvas"
                tabIndex="-1"
                id="offcanvasLeftNav"
                aria-labelledby="offcanvasLeftLabel"
            >
                {/* Header */}
                <div className="offcanvas-header border-bottom px-4 py-3">
                    <h5 className="mb-0">Menu</h5>
                    <button
                        type="button"
                        className="btn-close"
                        data-bs-dismiss="offcanvas"
                        aria-label="Close"
                    ></button>
                </div>

                {/* Scrollable body */}
                <div className="offcanvas-body p-4 custom-scrollbar">
                    {menuItems &&
                        menuItems.map((item, index) => (
                            <div key={index} className="menu-item mb-3">
                                <a
                                    href={item.MenuPath}
                                    className={`menu-link d-flex align-items-center justify-content-between ${item.SubItems?.length ? "has-submenu" : ""
                                        } ${item.MenuPath === currentPath ? "active" : ""}`}
                                    onClick={(e) => {
                                        if (item.SubItems?.length) {
                                            e.preventDefault();
                                            toggleDropdown(index);
                                        }
                                    }}
                                >
                                    <div className="d-flex align-items-center">
                                        <i className={`me-3 fs-5 ${item.IconName}`}></i>
                                        <span className="fs-6">{item.MenuName}</span>
                                    </div>
                                    {item.SubItems?.length > 0 && (
                                        <i
                                            className={`fa fa-chevron-${activeDropdown === index ? "up" : "down"
                                                }`}
                                        ></i>
                                    )}
                                </a>

                                {item.SubItems?.length > 0 && (
                                    <ul
                                        className={`submenu list-unstyled ps-4 mt-2 ${activeDropdown === index ? "show" : ""
                                            }`}
                                    >
                                        {item.SubItems.map((subItem, subIndex) => (
                                            <li key={subIndex}>
                                                <Link
                                                    to={`/${subItem.MenuPath}`}
                                                    className={`submenu-link d-block py-1 px-2 ${`/${subItem.MenuPath}` === currentSubPath
                                                        ? "fw-bold text-primary"
                                                        : "text-dark"
                                                        }`}
                                                    onClick={() =>
                                                        (window.location.href = `/${subItem.MenuPath}`)
                                                    }
                                                >
                                                    <i className="fa-solid fa-arrow-right me-2"></i>
                                                    {subItem.MenuName}
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        ))}
                </div>

                {shouldDocComponents && (
                    <div className="offcanvas-footer border-top p-3 mt-auto">
                        <a
                            href="https://services.cooperwind.online/uploads/CWIDocs/1758281305350-PMMS%20User%20Guide%20(1).pdf"
                            target="_blank"
                            className="btn btn-flex flex-center btn-custom btn-primary w-100"
                        >
                            <span className="btn-label">Docs &amp; Components</span>
                            <i className="ki-duotone ki-document btn-icon fs-2 ms-2">
                                <span className="path1"></span>
                                <span className="path2"></span>
                            </i>
                        </a>
                    </div>
                )}
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
                        width: 90% !important;   /* Mobile view */
                    }

                    @media (min-width: 768px) { /* Tablet and up */
                        #offcanvasRightViewProfile {
                            width: 40% !important;
                        }
                    }
                        
                    .text-highlight {
                            color: #0dcaf0 !important; /* Same as Bootstrap's text-info */
                        }
                        .menu-link.hover-effect {
                            transition: all 0.2s ease-in-out;
                        }

                        .menu-link.hover-effect:hover {
                            // color: #0dcaf0 !important; 
                            transform: translateX(4px);
                            text-decoration: none;
                        }
                   
              
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
               
                `}
            </style>

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
                                    className="avatar bg-light-primary text-dark rounded-circle d-flex align-items-center justify-content-center me-3"
                                    style={{ width: "50px", height: "50px", fontSize: "20px" }}
                                >
                                    {sessionUserData?.Name?.charAt(0).toUpperCase() || "?"}
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
                                    <span><i className="fa-solid fa-id-badge icon-animate text-primary me-2"></i> Org ID</span>
                                    <span className="fw-bold">{sessionUserData?.OrgId}</span>
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
                                    <span><i className="fa-solid fa-calendar icon-animate text-primary me-2"></i> Created On</span>
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
                                                        {/* Last 30 Days (0-30) - RED */}
                                                        <div
                                                            className="progress-bar progress-bar-animated-smooth bg-danger"
                                                            role="progressbar"
                                                            style={{ width: `${(segments.last30 / 90) * 100}%`, borderRight: '1px solid #fff' }}
                                                        ></div>

                                                        {/* Mid 30 Days (31-60) - BLUE */}
                                                        <div
                                                            className="progress-bar progress-bar-animated-smooth bg-warning"
                                                            role="progressbar"
                                                            style={{ width: `${(segments.mid30 / 90) * 100}%`, borderRight: '1px solid #fff' }}
                                                        ></div>

                                                        {/* First 30 Days (61-90) - RED */}
                                                        <div
                                                            className="progress-bar progress-bar-animated-smooth bg-success"
                                                            role="progressbar"
                                                            style={{ width: `${(segments.first30 / 90) * 100}%` }}
                                                        ></div>
                                                    </div>

                                                    {/* Markers for 30/60 days */}
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
                    </div>
                </div>
            </div>

            <FAQButton />

            <style>
                {`
                .progress-bar-animated-smooth {
                    transition: width 1.2s ease-in-out;
                }

                /* Optional: Add a subtle glow to the active segment */
                .progress-bar {
                    box-shadow: inset 0 -1px 0 rgba(0,0,0,0.15);
                }
                
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
                {/* Heading */}

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

                /* Scrollbar styling */
                .custom-scrollbar::-webkit-scrollbar {
                width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                background-color: #ccc;
                border-radius: 10px;
                }

                /* Menu links */
                .menu-link {
                padding: 0.75rem 1rem;
                border-radius: 0.5rem;
                background-color:rgb(236, 240, 244);
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
                /* Active states with light sky blue */
                .menu-link.active,
                .submenu-link.active-sub {
                background-color: #d1ecff; /* Light sky blue */
                color: #0d6efd !important; /* Bootstrap primary for text */
                font-weight: 600
;
                }


                .submenu-link {
                padding-left: 1rem;
                color: #495057;
                transition: 0.2s ease;
                }

                .submenu-link:hover {
                color: #0d6efd;
                }

                /* Arrow icons for dropdowns */
                .menu-link.has-submenu i.fa-chevron-down,
                .menu-link.has-submenu i.fa-chevron-up {
                font-size: 0.9rem;
                color: #6c757d;
                margin-left: auto;
                }

                /* Submenu visibility */
                .submenu {
                display: none;
                transition: all 0.3s ease;
                }
                .submenu.show {
                display: block;
                }
                .icon-animate {
                    animation: pulseIcon 2s infinite ease-in-out;
                }

                @keyframes pulseIcon {
                    0% { transform: scale(1); opacity: 0.9; }
                    50% { transform: scale(1.18); opacity: 1; }
                    100% { transform: scale(1); opacity: 0.9; }
                }
                `}
            </style>
        </div>
    )
};

export default Base1;