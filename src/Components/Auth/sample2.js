import React, { useState, useEffect } from "react";
import { fetchWithAuth } from "../../utils/api";
import '../Assests/CSS/samplescreen2.css';
import { useNavigate } from "react-router-dom";
// import WaterMarkLogo from '../Assests/SigninImages/cwilogo.png';
// import CWIImg from '../Assests/SigninImages/cwinew.png';
import Swal from "sweetalert2";
import greytHRLogoVar from "../Assests/Images/greytip_logo.svg";
import { BASE_IMAGE_API_GET } from "../Config/Config";

export default function SampleScreen2() {

    const [sessionUserData, setSessionUserData] = useState([]);
    const [modules, setModules] = useState([]);
    const [showMain, setShowMain] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const userDataString = sessionStorage.getItem("userData");
        if (userDataString) {
            const userData = JSON.parse(userDataString);
            setSessionUserData(userData);
        } else {
            navigate("/");
        }
    }, [navigate]);

    const fetchMenuData = async () => {
        try {
            const cachedModules = sessionStorage.getItem("accessModules");

            if (cachedModules) {
                setModules(JSON.parse(cachedModules));
                return;
            }

            const response = await fetchWithAuth("auth/getModules", {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });

            if (!response.ok) {
                console.error("Failed to fetch menu data:", response.statusText);
                return;
            }

            const data = await response.json();
            const allModules = data.ResultData || [];

            const userData = JSON.parse(sessionStorage.getItem("userData") || "{}");
            const accessIds = userData?.AccessToModules
                ? userData.AccessToModules.split(",").map(Number)
                : [];

            const filteredModules = allModules.filter((mod) =>
                accessIds.includes(mod.Id)
            );

            setModules(filteredModules);
            sessionStorage.setItem("accessModules", JSON.stringify(filteredModules));

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
        fetchMenuData();
        const timer = setTimeout(() => {
            setShowMain(true);
        }, 2000); // 1 second
        return () => clearTimeout(timer);
    }, []);

    // High-luminance pastel palette for dark backgrounds
    const iconColors = [
        '#A5F3FC', // Lite Cyan
        '#FBCFE8', // Lite Pink
        '#BBF7D0', // Lite Emerald
        '#FEF08A', // Lite Yellow
        '#C7D2FE', // Lite Indigo
        '#FECACA', // Lite Rose
        // --- New Colors Added Below ---
        '#E9FF70', // Lite Lime / Electric Lemon
        '#D8B4FE', // Lite Purple / Lavender
        '#FFD8A8', // Lite Apricot / Peach
        '#E0E7FF'  // Lite Periwinkle / Ice Blue
    ];
    // const iconColors = ['#ffffff', '#f1f1f1', '#ffe600', '#b3e5fc', '#c8e6c9'];

    const handleLogout = () => {
        sessionStorage.clear();
        localStorage.clear();
        navigate("/");
    };

    return (
        <>
            <div className="watermark"></div>
            <div
                style={{
                    position: "absolute",
                    top: "20px",
                    right: "30px",
                    zIndex: 1000,
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    background: "rgba(255, 255, 255, 0.8)",
                    backdropFilter: "blur(8px)",
                    padding: "5px 5px 5px 15px",
                    borderRadius: "50px",
                    boxShadow: "0 4px 15px rgba(0,0,0,0.05)",
                    border: "1px solid rgba(0,0,0,0.05)"
                }}
            >
                <span className="fs-7 fw-bold text-gray-700">Sign Out</span>
                <button
                    onClick={handleLogout}
                    className="btn btn-icon btn-sm btn-light-danger rounded-circle"
                    style={{ width: "35px", height: "35px" }}
                    title="Logout"
                >
                    <i className="fa-solid fa-power-off"></i>
                </button>
            </div>

            <div className="body1">
                {/* Initial Splash View */}
                <div className={`initial-view ${showMain ? "fade-out" : "fade-in"}`}>
                    <div className="nexus-logo d-flex" style={{ minWidth: '400px' }}>
                        <img src={`${BASE_IMAGE_API_GET}${sessionUserData?.ImageUrl}`} style={{ maxHeight: '240px' }} alt="Nexus Logo" />
                    </div>
                </div>

                {/* Main Content */}
                {showMain && (
                    <div className="fade-in">
                        <div className="text-center mb-5 header-animate">
                            <div className="d-flex justify-content-center mt-4">
                                <img src={`${BASE_IMAGE_API_GET}${sessionUserData?.ImageUrl}`} style={{ maxHeight: '110px' }} alt="Nexus Logo" />
                            </div>
                        </div>

                        {sessionUserData?.Name && (
                            <div className="d-flex justify-content-center mb-4">
                                <div className="premium-welcome-box text-center px-4 py-3">
                                    <div className="small text-uppercase fw-semibold text-muted mb-1 d-flex align-items-center justify-content-center gap-2">
                                        <i className="bi bi-person-circle text-primary"></i>
                                        Welcome Back
                                    </div>

                                    <div className="fs-4 fw-bold text-dark">
                                        Hello, <span className="animated-username">{sessionUserData.Name}</span>
                                    </div>

                                    <div className="text-muted mt-2 d-flex align-items-center justify-content-center gap-2">
                                        {/* <i className="bi bi-grid-1x2-fill text-primary"></i> */}
                                        <span>Explore the modules available to you below</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="service-grid">
                            {modules?.length > 0 ? (
                                <>
                                    {modules?.map((mod, index) => (
                                        <div
                                            className="service-card"
                                            key={index}
                                            onClick={() => handleModuleClick(mod)}
                                        >
                                            <div className="service-icon">
                                                <i
                                                    className={`fas fa-${mod.ImageIcon}`}
                                                    style={{
                                                        color: iconColors[index % iconColors.length],
                                                        filter: `drop-shadow(0 0 8px ${iconColors[index % iconColors.length]}80)`,
                                                        fontSize: '1.7rem'
                                                    }}
                                                ></i>
                                            </div>
                                            <h3>{mod.ModuleName}</h3>
                                            <p>{mod.Description}</p>
                                        </div>
                                    ))}

                                    <a
                                        href="https://cooperwind-india.greythr.com/"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-decoration-none"
                                    >
                                        <div className="service-card external-brand text-center">
                                            <span className="external-badge">HR Portal</span>
                                            <div className="brand-logo-container">
                                                <img
                                                    src={greytHRLogoVar}
                                                    alt="greytHR Logo"
                                                    className="brand-logo-img"
                                                />
                                            </div>
                                            <h3 style={{ color: '#1e293b' }}>greytHR</h3>
                                            <p>Access Payslips, Leave & Attendance</p>
                                        </div>
                                    </a>

                                    {sessionUserData?.RoleId === 1 && (
                                        <a href={`https://betasuperportal.cooperwind.online/`} target="_blank">
                                            <div className="service-card">
                                                <div className="service-icon">
                                                    <i
                                                        className={`fa-solid fa-user-tie`}
                                                        style={{
                                                            color: '#c8e6c9',
                                                            textShadow: '1px 1px 3px rgba(0, 0, 0, 0.5)',
                                                        }}
                                                    ></i>
                                                </div>
                                                <h3>Super Portal</h3>
                                                <p>Access to all Modules</p>
                                            </div>
                                        </a>
                                    )}
                                </>
                            ) : (
                                <div className="no-modules-message text-center">
                                    <h3>You don’t have access to any modules</h3>
                                    <p>Please contact your HR for further assistance.</p>
                                </div>
                            )}
                        </div>

                        <footer className="app-foote text-center justify-content-center mt-10">
                            <p>Powered by <span>Cooperwind.india</span></p>
                        </footer>
                    </div>
                )}
            </div>

            <style>
                {`
                    .no-modules-message {
                        grid-column: 1 / -1; /* span full grid */
                        padding: 40px;
                        background: #fff3cd;
                        border: 1px solid #ffeeba;
                        border-radius: 12px;
                        box-shadow: 0px 2px 6px rgba(0,0,0,0.1);
                        color: #856404;
                        font-weight: 500;
                    }

                        .premium-welcome-box {
                        min-width: 320px;
                        max-width: 620px;
                        border-radius: 22px;
                        background: linear-gradient(135deg, rgba(255,255,255,0.92), rgba(245,249,255,0.96));
                        border: 1px solid rgba(13, 110, 253, 0.12);
                        box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
                        backdrop-filter: blur(10px);
                    }

                    .premium-welcome-icon {
                        width: 54px;
                        height: 54px;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        background: linear-gradient(135deg, #e7f1ff, #f4f9ff);
                        color: #0d6efd;
                        font-size: 1.35rem;
                        box-shadow: 0 8px 20px rgba(13, 110, 253, 0.12);
                    }

                    .animated-username {
                        background: linear-gradient(270deg, #0d6efd, #36c2ff, #6f42c1, #0d6efd);
                        background-size: 500% 500%;
                        -webkit-background-clip: text;
                        -webkit-text-fill-color: transparent;
                        animation: gradientMove 6s ease infinite;
                        font-weight: 800;
                        display: inline-block;
                    }

                    @keyframes gradientMove {
                        0% {
                            background-position: 0% 50%;
                        }
                        50% {
                            background-position: 100% 50%;
                        }
                        100% {
                            background-position: 0% 50%;
                        }
                    }
                .service-card.external-brand {
                    border: 1px solid rgba(0, 86, 179, 0.1);
                    transition: all 0.3s ease;
                    background: linear-gradient(145deg, #ffffff, #f0f4f8);
                }

                .service-card.external-brand:hover {
                    border-color: #0056b3;
                    transform: translateY(-5px);
                    box-shadow: 0 10px 20px rgba(0, 86, 179, 0.1);
                }

                .brand-logo-container {
                    width: 60px;
                    height: 60px;
                    margin: 0 auto 15px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 12px;
                    background: white;
                    padding: 8px;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.05);
                }

                .brand-logo-img {
                    width: 100%;
                    height: 100%;
                    object-fit: contain;
                }

                .external-badge {
                    font-size: 10px;
                    background: #e1f0ff;
                    color: #0056b3;
                    padding: 2px 8px;
                    border-radius: 10px;
                    text-transform: uppercase;
                    font-weight: 700;
                    margin-bottom: 8px;
                    display: inline-block;
                }
                .watermark {
                        position: absolute;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        background: url(${BASE_IMAGE_API_GET}${sessionUserData?.ImageUrl}) center center no-repeat;
                        background-size: contain;
                        opacity: 0.05;
                        z-index: 0;
                        pointer-events: none;
                    }
                    .app-footer {
                        margin-top: auto; /* push footer down */
                        background: linear-gradient(90deg, #007BFF, #00B8D9);
                        color: white;
                        text-align: center;
                        padding: 12px 0;
                        font-size: 14px;
                        letter-spacing: 0.5px;
                        border-top: 2px solid rgba(255, 255, 255, 0.1);
                        box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.05);
                    }

                    .app-footer span {
                        font-weight: bold;
                        color: #FFD700; /* gold highlight */
                    }    
                            
                    `}
            </style>
        </>
    );
}
