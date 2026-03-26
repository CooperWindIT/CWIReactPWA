import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Popover } from 'antd';
import { useNavigate } from 'react-router-dom';
import LogoImg from '../Assests/Images/cwilogo.png';
import { fetchWithAuth } from "../../utils/api";

const Base1 = ({ children }) => {

    const [sessionUserData, setSessionUserData] = useState([]);
    const [menuItems, setMenuItems] = useState([]);
    const [moduleData, setModuleData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [activeDropdown, setActiveDropdown] = useState(null);
    const [showPassword, setShowPassword] = useState(false);

    const navigate = useNavigate();
    const currentPath = window.location.pathname;
    const location = useLocation();
    const shouldHideSidebar = location.pathname.includes("/vms/");
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
        setLoading(true);
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

    // const iconColors = [
    //     "#0d6efd", // blue
    //     "#20c997", // teal
    //     "#ffc107", // yellow
    //     "#fd7e14", // orange
    //     "#6f42c1", // purple
    //     "#198754", // green
    // ];

    const currentSubPath = location.pathname + location.search;
    useEffect(() => {
        if (!menuItems) return;

        menuItems.forEach((item, index) => {
            if (item.SubItems?.some((sub) => `/${sub.MenuPath}` === currentSubPath)) {
                setActiveDropdown(index);
            }
        });
    }, [currentSubPath, menuItems]);

    return (
        <div className="d-flex flex-column flex-root app-root" id="kt_app_root">
            {loading && (
                <div style={overlayStyle}>
                    <div style={spinnerStyle}></div>
                </div>
            )}

            <div className="app-page flex-column flex-column-fluid" id="kt_app_page">
                {/* <div id="kt_app_header" className="app-header text-white" data-kt-sticky="true" style={{ backgroundColor: moduleData?.UIThemeColor }} */}
                <div id="kt_app_header" className="app-header text-white shadow-sm" data-kt-sticky="true" style={{ backgroundColor: '#90e0ef' }}
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
                            <img alt="Logo" src={LogoImg} className="h-30px" />
                        </div>
                        <div className="d-flex align-items-stretch justify-content-between flex-lg-grow-1" id="kt_app_header_wrapper">
                            <div className="app-header-menu app-header-mobile-drawer align-items-stretch" data-kt-drawer="true" data-kt-drawer-name="app-header-menu" data-kt-drawer-activate="{default: true, lg: false}" data-kt-drawer-overlay="true" data-kt-drawer-width="250px" data-kt-drawer-direction="end" data-kt-drawer-toggle="#kt_app_header_menu_toggle" data-kt-swapper="true" data-kt-swapper-mode="{default: 'append', lg: 'prepend'}" data-kt-swapper-parent="{default: '#kt_app_body', lg: '#kt_app_header_wrapper'}">
                                <div className="menu menu-rounded menu-column menu-lg-row my-5 my-lg-0 align-items-stretch fw-semibold px-2 px-lg-0" id="kt_app_header_menu" data-kt-menu="true">
                                    <img alt="Logo" src={LogoImg} className="h-55px app-sidebar-logo-default" />
                                    <img alt="Logo" src={LogoImg} className="h-20px app-sidebar-logo-minimize" />
                                </div>
                            </div>

                            {/* Heading */}
                            <div className="module-header shadow-sm p-3 mb-3 rounded d-flex align-items-center mt-3">
                                <div className="flex-grow-1">
                                    <h2 className="module-title mb-1 d-none d-md-block"><i className={`fas fa-${moduleData.ImageIcon} fs-5`}></i> {moduleData.Description}</h2>
                                    <h2 className="module-title mb-0 d-flex align-items-center justify-content-center gap-2 d-block d-md-none text-center me-8">
                                        {moduleData.ModuleName}
                                    </h2>
                                </div>
                            </div>
                            
                            {/* Heading */}

                            <div className="app-navbar flex-shrink-0">
                                <div className="app-navbar-item ms-1 ms-md-4 ">

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

                <div className="app-wrapper flex-row flex-row-fluid" id="kt_app_wrapper">
                    {!(shouldHideSidebar || reportId === '3') && (
                        <div id="kt_app_sidebar" className="app-sidebar flex-column" data-kt-drawer="true" style={{ width: '250px' }}>
                            {/* Sidebar */}
                            {/* <div className="app-sidebar-menu overflow-hidden flex-column-fluid" style={{ backgroundColor: moduleData?.UITheme2 }}> */}
                            <div className="app-sidebar-menu overflow-hidden flex-column-fluid bg-white shadow-sm">
                                <div id="kt_app_sidebar_menu_wrapper" className="app-sidebar-wrapper">
                                    <div id="kt_app_sidebar_menu_scroll" style={{ minHeight: '90vh' }} className="scroll-y my-5 mx-3" data-kt-scroll="true" data-kt-scroll-activate="true"
                                        data-kt-scroll-height="auto" data-kt-scroll-dependencies="#kt_app_sidebar_logo, #kt_app_sidebar_footer" data-kt-scroll-wrappers="#kt_app_sidebar_menu" data-kt-scroll-offset="5px" data-kt-scroll-save-state="true">
                                        <div className="menu menu-column menu-rounded menu-sub-indention fw-semibold fs-4" id="#kt_app_sidebar_menu" data-kt-menu="true" data-kt-menu-expand="false">
                                            <div data-kt-menu-trigger="click" className="menu-item menu-accordion">
                                                <div className="sidebar-menu">
                                                    {menuItems &&
                                                        menuItems.map((item, index) => (
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
                                <div class="app-sidebar-footer flex-column-auto pt-2 pb-6 px-6" id="kt_app_sidebar_footer">
                                    <a href="https://preview.keenthemes.com/html/metronic/docs" class="btn btn-flex flex-center btn-custom btn-primary overflow-hidden text-nowrap px-0 h-40px w-100" data-bs-toggle="tooltip" data-bs-trigger="hover" data-bs-dismiss-="click" data-bs-original-title="200+ in-house components and 3rd-party plugins" data-kt-initialized="1">
                                        <span class="btn-label">Docs &amp; Components</span>
                                        <i class="ki-duotone ki-document btn-icon fs-2 m-0">
                                            <span class="path1"></span>
                                            <span class="path2"></span>
                                        </i>
                                    </a>
                                </div>
                            </div>
                        </div>
                    )}
                    <div className="app-main flex-column flex-row-fluid" id="kt_app_main">

                        {children}

                        <div id="kt_app_footer" className="app-footer sticky-bottom bg-white shadow-sm">
                            <div className="app-container container-fluid d-flex flex-column flex-md-row flex-center flex-md-stack py-3">
                                <div className="text-gray-900 order-2 order-md-1">
                                    <span className="text-muted fw-semibold me-1">2025&copy;</span>
                                    <a className="text-gray-800 text-hover-primary">Cooper Wind India</a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

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

                <div className="offcanvas-body p-4 custom-scrollbar">
                    {menuItems &&
                        menuItems.map((item, index) => (
                            <div key={index} className="menu-item mb-3">
                                <a
                                    // to={`${item.MenuPath}`}
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
                                        <i
                                            className={`me-3 fs-5 ${item.IconName}`}
                                        // style={{ color: iconColors[index % iconColors.length] }}
                                        ></i>
                                        <span className="fs-6">{item.MenuName}</span>
                                    </div>
                                    {item.SubItems?.length > 0 && (
                                        <i className={`fa fa-chevron-${activeDropdown === index ? "up" : "down"}`}></i>
                                    )}
                                </a>

                                {item.SubItems?.length > 0 && (
                                    <ul className={`submenu list-unstyled ps-4 mt-2 ${activeDropdown === index ? "show" : ""}`}>
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

            <style>
                {`
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
                                <div className="avatar bg-light-primary text-dark rounded-circle d-flex align-items-center justify-content-center me-3" style={{ width: "50px", height: "50px", fontSize: "20px" }}>
                                    QA
                                </div>
                                <div>
                                    <h6 className="mb-0">{sessionUserData?.Name}</h6>
                                    <small className="text-muted">{sessionUserData?.RoleName}</small>
                                </div>
                            </div>

                            <ul className="list-group list-group-flush">
                                <li className="list-group-item d-flex justify-content-between">
                                    <span><i className="fa-solid fa-id-badge text-primary me-2"></i> Org ID</span>
                                    <span className="fw-bold">{sessionUserData?.OrgId}</span>
                                </li>
                                <li className="list-group-item d-flex justify-content-between">
                                    <span><i className="fa-solid fa-envelope text-primary me-2"></i> Email</span>
                                    <span className="fw-bold">{sessionUserData?.Email}</span>
                                </li>
                                <li className="list-group-item d-flex justify-content-between">
                                    <span><i className="fa-solid fa-phone text-primary me-2"></i> Mobile</span>
                                    <span className="fw-bold">{sessionUserData?.Mobile || '--'}</span>
                                </li>
                                <li className="list-group-item d-flex justify-content-between">
                                    <span><i className="fa-solid fa-venus-mars text-primary me-2"></i> Gender</span>
                                    <span className="fw-bold">{sessionUserData?.Gender === 1 ? 'Male' : 'Female'}</span>
                                </li>
                                <li className="list-group-item d-flex justify-content-between">
                                    <span><i className="fa-solid fa-calendar text-primary me-2"></i> Created On</span>
                                    <span className="fw-bold">{new Date(sessionUserData?.CreatedOn).toLocaleString("en-GB", {
                                        day: "2-digit",
                                        month: "2-digit",
                                        year: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    })}</span>
                                </li>
                                <li className="list-group-item d-flex justify-content-between">
                                    <span><i className="fa-solid fa-lock text-primary me-2"></i> Password</span>
                                    <span className="fw-bold text-muted d-flex align-items-center">
                                        {showPassword ? sessionUserData?.Password : "••••••••"}
                                        <i
                                            className={`fa-regular ${showPassword ? "fa-eye" : "fa-eye-slash"} ms-2`}
                                            style={{ cursor: "pointer" }}
                                            onClick={() => setShowPassword(!showPassword)}
                                        ></i>
                                    </span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            <style>
                {`
                {/* Heading */}
               

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
                `}
            </style>
        </div>
    )
};

export default Base1;
