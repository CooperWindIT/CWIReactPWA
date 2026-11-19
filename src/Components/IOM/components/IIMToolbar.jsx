import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Dropdown, Menu } from "antd";
import Swal from "sweetalert2";
import { fetchWithAuth } from "../../../utils/api";
import "./IIMToolbar.css";

const iconColors = ['#FF6B35', '#00B8D9', '#36B37E', '#FFAB00', '#6554C0', '#FF5630'];

// Shared top toolbar (Portal dropdown + module menus) for IIM pages.
const IIMToolbar = ({ menuData = [] }) => {

    const navigate = useNavigate();
    const location = useLocation();
    const [modules, setModules] = useState([]);

    const sessionUserData = JSON.parse(sessionStorage.getItem("userData") || "{}");

    const unavailable = () => Swal.fire({
        icon: "warning",
        title: "Module unavailable",
        text: "You don’t have access to this module yet. Please contact your administrator for help.",
        confirmButtonText: "OK"
    });

    const handleModuleClick = async (mod) => {
        localStorage.setItem("ModuleData", JSON.stringify(mod));
        try {
            const response = await fetchWithAuth(
                `auth/getmenu?OrgId=${sessionUserData.OrgId}&RoleId=${sessionUserData.RoleId}&ModuleId=${mod.Id}&UserId=${sessionUserData.Id}`,
                { method: "GET", headers: { "Content-Type": "application/json" } }
            );

            if (!response.ok) return unavailable();

            const data = await response.json();
            const menuList = data.ResultData || [];

            if (menuList.length > 0 && menuList[0].MenuPath) {
                sessionStorage.setItem("menuData", JSON.stringify(menuList));
                sessionStorage.setItem("navigationPath", menuList[0].MenuPath);
                navigate(menuList[0].MenuPath);
            } else {
                unavailable();
            }
        } catch (error) {
            console.error("Menu fetch error:", error);
        }
    };

    useEffect(() => {
        const loadModules = async () => {
            try {
                const cached = sessionStorage.getItem("accessModules");
                if (cached) {
                    setModules(JSON.parse(cached));
                    return;
                }

                const response = await fetchWithAuth("auth/getModules", {
                    method: "GET",
                    headers: { "Content-Type": "application/json" }
                });

                if (response.ok) {
                    const data = await response.json();
                    const accessIds = sessionUserData?.AccessToModules
                        ? sessionUserData.AccessToModules.split(",").map(Number)
                        : [];
                    const filtered = (data.ResultData || []).filter(m => accessIds.includes(m.Id));
                    setModules(filtered);
                    sessionStorage.setItem("accessModules", JSON.stringify(filtered));
                }
            } catch (error) {
                console.error("Error fetching modules:", error.message);
            }
        };

        if (sessionUserData?.OrgId) loadModules();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const moduleList = (
        <ul className="dropdown-menu shadow">
            {modules.map((mod, index) => {
                const isActive = location.pathname.toLowerCase().includes(mod.ModuleName.toLowerCase());
                return (
                    <li key={index} className={`mb-1 ${isActive ? "active-module" : ""}`}>
                        <a
                            className="dropdown-item d-flex align-items-center gap-2 module-item"
                            onClick={() => handleModuleClick(mod)}
                            style={{ cursor: "pointer" }}
                        >
                            <i
                                className={`fas fa-${mod.ImageIcon}`}
                                style={{ color: iconColors[index % iconColors.length], textShadow: "1px 1px 3px rgba(0,0,0,0.5)" }}
                            ></i>
                            <span>{mod.ModuleName}</span>
                        </a>
                    </li>
                );
            })}
            {sessionUserData?.RoleId === 1 && (
                <a href="https://betasuperportal.cooperwind.online/" target="_blank" rel="noreferrer">
                    <li className="dropdown-item d-flex align-items-center gap-2 module-item">
                        <i className="fa-solid fa-user-tie" style={{ color: "#c8e6c9", textShadow: "1px 1px 3px rgba(0,0,0,0.5)" }}></i>
                        <span>Super Portal</span>
                    </li>
                </a>
            )}
            <li
                className="dropdown-item d-flex align-items-center gap-2 module-item"
                onClick={() => navigate("/user-modules")}
                style={{ cursor: "pointer" }}
            >
                <i className="fa-solid fa-arrow-left" style={{ color: "#ffccbc", textShadow: "1px 1px 3px rgba(0,0,0,0.5)" }}></i>
                <span>Go Back to Portal</span>
            </li>
        </ul>
    );

    return (
        <div id="kt_app_toolbar" className="app-toolbar iim-nav py-3 py-lg-4">
            <div id="kt_app_toolbar_container" className="app-container container-xxl d-flex flex-stack">

                {/* Desktop */}
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
                            {moduleList}
                        </div>

                        <div className="d-flex align-items-center">
                            {menuData?.map((menu) => {
                                if (menu.SubItems && menu.SubItems.length > 0) {
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
                                        <span className={`menu-link bg-white shadow-sm me-2 cursor-pointer ${location.pathname === menu.MenuPath ? 'active border-primary' : ''}`}>
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

                {/* Mobile */}
                <div className="page-title d-md-none d-block">
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
                        {moduleList}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default IIMToolbar;