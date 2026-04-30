
import React, { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import Base1 from "../../Config/Base1";
import { Select, Popover, Tooltip } from "antd";
import { fetchWithAuth } from "../../../utils/api";
import Pagination from "../../Pagination/Pagination";
import UplaodDocument from "./UploadDoc";
import { formatToDDMMYYYY } from './../../../utils/dateFunc';
import EditDocument from "./Edit";
import RegisterMasterTypes from "../../Config/MasterTypes";
import Swal from "sweetalert2";
import DocumentPreview from "./DocumentPreview";
import { Dropdown, Menu } from 'antd';
import InactiveDocuments from "./InactiveDocs";

export default function DocumentList() {

    const navigate = useNavigate();
    const location = useLocation();
    const [modules, setModules] = useState([]);
    const [sessionUserData, setSessionUserData] = useState([]);
    const [sessionActionIds, setSessionActionIds] = useState([]);
    const [documentsCache, setDocumentsCache] = useState({});
    const [contentTypesData, setContentTypesData] = useState([]);
    const [unitsData, setUnitsData] = useState([]);
    const [departmentsData, setDepartmentsData] = useState([]);
    const [dataLoading, setDataLoading] = useState(false);
    const [totalRecords, setTotalRecords] = useState({});
    const [docListData, setDocListData] = useState([]);
    const [menuData, setMenuData] = useState([]);
    const [editData, setEditData] = useState([]);
    const [docsData, setDocsData] = useState([]);
    const [selectedDocId, setSelectedDocId] = useState(0);
    const [activeCategory, setActiveCategory] = useState(null);
    const { Option } = Select;
    const savedState = JSON.parse(
        sessionStorage.getItem("docListState") || "{}"
    );

    const [pageSize, setPageSize] = useState(
        savedState.pageSize || 10
    );

    const [filters, setFilters] = useState(
        savedState.filters || {
            OrgId: sessionUserData?.OrgId,
            UnitId: null,
            VersionStatus: "ALL",
            ContentTypeId: 0,
            DeptId: 0,
            DocumentCode: "",
        }
    );

    const [currentPage, setCurrentPage] = useState(
        savedState.currentPage || 1
    );

    // const recordsPerPage = 10;
    const totalPages = Math.ceil(totalRecords / pageSize);

    const [previewModal, setPreviewModal] = useState({
        show: false,
        item: null
    });

    const handleOpenPreview = (item) => {
        setPreviewModal({ show: true, item: item });
    };

    useEffect(() => {
        const userDataString = sessionStorage.getItem("userData");
        const navigationString = sessionStorage.getItem("navigationPath");
        if (userDataString) {
            const userData = JSON.parse(userDataString);
            setSessionUserData(userData);
            // setNavigationPath(navigationString);
        } else {
            navigate("/");
        }
    }, [navigate]);

    useEffect(() => {
        const sessionMenuData = sessionStorage.getItem("menuData");
        try {
            const parsedMenu = JSON.parse(sessionMenuData);
            setMenuData(parsedMenu)

            const ticketsMenu = parsedMenu.find(
                (item) => item.MenuName === "Documents"
            );

            if (ticketsMenu) {
                const actionIdArray = ticketsMenu.ActionsIds?.split(",").map(Number);
                setSessionActionIds(actionIdArray);
            }
        } catch (err) {
            console.error("Error parsing menuData:", err);
        }
    }, []);

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

    const fetchContentTypes = async () => {
        try {
            const response = await fetchWithAuth(
                `EDM/GetUserDocTypePermissions?OrgId=${sessionUserData?.OrgId}&UserId=${sessionUserData?.Id}&MasterTypeId=0&Type=DocTypes`,
                {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                }
            );

            if (!response.ok) throw new Error("Network response was not ok");

            const data = await response.json();

            setContentTypesData(data.ResultData || []);

        } catch (error) {
            console.error("Failed to fetch DDL data:", error);
            setContentTypesData([]);
        }
    };

    const fetchDocsByType = async () => {
        if (!filters.ContentTypeId) return;
        try {
            const response = await fetchWithAuth(`/EDM/getDocByType?OrgId=${sessionUserData?.OrgId}&ContentTypeId=${filters.ContentTypeId}&UserId=${sessionUserData?.Id}`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });
            if (response.ok) {
                const data = await response.json();
                setDocsData(data.ResultData || []);
            } else {
                console.error('Failed to fetch suppliers data:', response.statusText);
            }
        } catch (error) {
            console.error('Error fetching suppliers data:', error.message);
        }
    };

    useEffect(() => {
        if (sessionUserData.OrgId) {
            fetchContentTypes();
        }
    }, [sessionUserData]);

    useEffect(() => {
        if (sessionUserData.OrgId) {
            fetchDDLData();
        }
    }, [sessionUserData?.OrgId]);

    useEffect(() => {
        if (sessionUserData.OrgId && filters.ContentTypeId) {
            fetchDocsByType();
        }
    }, [sessionUserData?.OrgId, filters.ContentTypeId]);

    const fetchDDLData = async () => {
        try {
            const sessionDDL = sessionStorage.getItem("ddlDocListData");
            let units = [];
            let depts = [];

            if (sessionDDL) {
                const parsed = JSON.parse(sessionDDL);
                units = parsed.units || [];
                depts = parsed.depts || [];

                setUnitsData(units);
                setDepartmentsData(depts);
            } else {
                const response = await fetchWithAuth(
                    `ADMINRoutes/CWIGetDDLItems?OrgId=${sessionUserData?.OrgId}&UserId=0`,
                    {
                        method: "GET",
                        headers: { "Content-Type": "application/json" },
                    }
                );

                if (!response.ok) throw new Error("Network response was not ok");

                const data = await response.json();

                units = data.ResultData.filter((item) => item.DDLName === "UnitLocations");
                depts = data.ResultData.filter((item) => item.DDLName === "Departments");

                setUnitsData(units);
                setDepartmentsData(depts);

                sessionStorage.setItem(
                    "ddlDocListData",
                    JSON.stringify({ units: units, depts: depts })
                );
            }

            const savedState = sessionStorage.getItem("docListState");

            let parsed = null;
            if (savedState) parsed = JSON.parse(savedState);

            // ✅ Apply default only if UnitId missing
            if (
                !parsed ||
                !parsed.filters?.UnitId ||
                !parsed.filters?.DeptId
            ) {
                setFilters(prev => ({
                    ...prev,
                    UnitId: units.length > 0 ? Number(units[0].ItemId) : null,
                    DeptId: sessionUserData?.DeptId ? Number(sessionUserData.DeptId) : null,
                }));
            }

        } catch (error) {
            console.error("Failed to fetch DDL data:", error);
            setUnitsData([]);
            setDepartmentsData([]);
        }
    };

    useEffect(() => {
        sessionStorage.setItem(
            "docListState",
            JSON.stringify({
                filters,
                currentPage,
                pageSize
            })
        );
    }, [filters, currentPage, pageSize]);

    useEffect(() => {
        if (!sessionUserData?.OrgId) return;

        const saved = JSON.parse(
            sessionStorage.getItem("docListState") || "{}"
        );

        if (saved.filters?.UnitId) {
            fetchDocuments(saved.currentPage || 1, true);
        }
    }, [sessionUserData?.OrgId]);

    const fetchDocuments = async (
        page = 1,
        force = false,
        overridePageSize = null   // ⭐ add this
    ) => {

        const finalPageSize = overridePageSize ?? pageSize;

        if (!sessionUserData?.OrgId) {
            console.log("OrgId not ready yet");
            return;
        }

        if (!filters.UnitId) {
            Swal.fire({
                icon: "warning",
                title: "Missing Filters",
                text: "Unit are mandatory",
            });
            setDataLoading(false);
            return;
        }

        const cacheKey = [
            filters.UnitId || 0,
            filters.ContentTypeId || 0,
            page,
            finalPageSize
        ].join("-");

        // ✅ Serve from cache
        if (!force && documentsCache[cacheKey]) {
            setDocListData(documentsCache[cacheKey].data);
            setTotalRecords(documentsCache[cacheKey].total);
            setCurrentPage(page);
            return;
        }

        setDataLoading(true);

        const payload = {
            ServiceName: "GETDocumentDetails",
            PageNumber: page,
            PageSize: finalPageSize,
            Params: {
                OrgId: sessionUserData?.OrgId,
                UserId: sessionUserData?.Id,
                UnitId: filters.UnitId,
                VersionStatus: filters.VersionStatus,
                DocId: selectedDocId || 0,
                DeptId: filters.DeptId || 0,
                ContentTypeId: filters.ContentTypeId || 0,
                DocumentCode: filters.DocumentCode || "ALL",
            },
        };

        try {
            const res = await fetchWithAuth(`EDM/GETDocumentDetails`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) throw new Error("Failed to fetch documents");

            const result = await res.json();

            const pageData = result?.data?.result || [];
            const total = result?.data?.output?.TotalCount || 0;

            setDataLoading(false);

            setDocumentsCache(prev => ({
                ...prev,
                [cacheKey]: {
                    data: pageData,
                    total
                }
            }));

            setDocListData(pageData);
            setTotalRecords(total);
            setCurrentPage(page);

        } catch (error) {
            setDataLoading(false);
            console.error(error);
            Swal.fire("Error", "Failed to fetch documents", "error");
        }
    };

    const handleFilterSubmit = () => {
        setDocumentsCache({});
        setCurrentPage(1);

        fetchDocuments(1, true);
    };

    useEffect(() => {
        sessionStorage.setItem("docListFilters", JSON.stringify(filters));
    }, [filters]);

    const handleEdit = (item) => {
        setEditData(item);
    };

    const handleDeleteDoc = async (item) => {
        Swal.fire({
            title: "Are you sure?",
            html: `
            <div>
                <div><strong>Document Name:</strong> ${item?.DocName || "-"}</div>
                <div><strong>Document No:</strong> ${item?.DocumentCode || "-"}</div>
                <div class="mt-2 text-danger">Do you want to delete this document?</div>
            </div>
        `,
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#3085d6",
            cancelButtonColor: "#d33",
            confirmButtonText: '<i class="fa-solid fa-trash me-2"></i> Yes, delete it!',
            cancelButtonText: '<i class="fa-solid fa-xmark me-2"></i> Cancel',
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const payload = {
                        UpdatedBy: sessionUserData.Id,
                        DocId: item.Id,
                        OrgId: sessionUserData.OrgId,
                        VersionId: item.VersionId,
                    };

                    const response = await fetchWithAuth(`EDM/InactiveDoc`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify(payload),
                    });
                    const result = await response.json();

                    if (result.ResultData?.Status === 'Success') {
                        fetchDocuments();
                        Swal.fire("Success!", "Version has been deleted.", "success");
                    } else {
                        const errorData = await response.json();
                        Swal.fire("Error!", errorData.ResultData?.ResultMessage || "Failed to delete Version.", "error");
                    }
                } catch (error) {
                    console.error("Error during Version delete:", error.message);
                    Swal.fire("Error!", "An unexpected error occurred.", "error");
                }
            }
        });
    };

    const getStatusBadgeClass = (status) => {
        switch (status?.toLowerCase()) {
            case "draft":
                return "badge-light-warning";
            case "pending approval":
                return "badge-light-info";
            case "approved":
                return "badge-light-primary";
            case "rejected":
                return "badge-light-danger";
            case "published":
                return "badge-light-success";
            default:
                return "badge-light";
        }
    };

    const showAddBtn = sessionActionIds?.includes(1);
    // const showEditBtn = sessionActionIds?.includes(3);
    const showDelete = sessionActionIds?.includes(11);
    const showTypeBtn = sessionActionIds?.includes(18);
    const showDeptDwn = sessionActionIds?.includes(25);

    const iconColors = ['#FF6B35', '#00B8D9', '#36B37E', '#FFAB00', '#6554C0', '#FF5630'];

    return (
        <Base1>
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
                            <a href='/edm/edm-dashboard' style={{ position: "relative", zIndex: 10 }}>
                                <span className="menu-link bg-white shadow-sm me-2">
                                    <span className="menu-title"><i className="bi bi-columns-gap text-primary fs-4"></i></span>
                                    <span className="menu-arrow"></span>
                                </span>
                            </a>
                            <a href='/edm/documents' style={{ position: "relative", zIndex: 10 }}>
                                <span className="menu-link bg-white shadow-sm me-2 active">
                                    <span className="menu-title"><i className="fa-solid fa-file-invoice fs-4"></i></span>
                                    <span className="menu-arrow"></span>
                                </span>
                            </a>
                        </div>
                    </div>

                    <div className="bg-white p-2 rounded-3 shadow-sm border d-flex flex-wrap align-items-center gap-2">
                        {showTypeBtn && (
                            <Link to="/edm/inactive-docs"
                                className="btn btn-light-danger btn-sm border border-danger d-flex align-items-center gap-2 px-3 shadow-sm custom-btn"
                                ><i className="bi bi-building-add fs-5"></i><span className="d-none d-md-inline">Inactive Docs</span>
                            </Link>
                        )}
                        {showTypeBtn && (
                            <a
                                className="btn btn-warning btn-sm d-flex align-items-center gap-2 px-3 shadow-sm custom-btn"
                                data-bs-toggle="offcanvas"
                                data-bs-target="#offcanvasRightAddMasterTypes"
                                aria-controls="offcanvasRightAddMasterTypes"
                                onClick={() => setActiveCategory(3)}><i className="bi bi-building-add fs-5"></i><span className="d-none d-md-inline">Create Alert Types</span>
                            </a>
                        )}
                        {showTypeBtn && (
                            <a
                                className="btn btn-info btn-sm d-flex align-items-center gap-2 px-3 shadow-sm custom-btn"
                                data-bs-toggle="offcanvas"
                                data-bs-target="#offcanvasRightAddMasterTypes"
                                aria-controls="offcanvasRightAddMasterTypes"
                                onClick={() => setActiveCategory(2)}><i className="bi bi-building-add fs-5"></i><span className="d-none d-md-inline">Create Doc Types</span>
                            </a>
                        )}
                        {showAddBtn && (
                            <button
                                className="btn btn-primary btn-sm d-flex align-items-center gap-2 px-3 shadow-sm custom-btn"
                                data-bs-toggle="offcanvas"
                                data-bs-target="#offcanvasRightUploadDoc"
                                aria-controls="offcanvasRightUploadDoc"><i className="bi bi-file-earmark-plus fs-5"></i><span className="d-none d-md-inline">Register Doc</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div id="kt_app_content" className="app-content flex-column-fluid pt-2 mb-10">
                <div id="kt_app_content_container" className="app-container container-xxl">
                    <div className="card shadow-sm mb-3">
                        <div className="p-2">
                            <div className="d-flex justify-content-between align-items-center flex-wrap mb-4 border-bottom pb-3">
                                <div className="d-flex align-items-center">
                                    <i className="bi bi-filter-right fs-2 text-primary me-2"></i>
                                    <h5 className="text-gray-800 fw-bolder mb-0">
                                        Filter Parameters
                                    </h5>
                                </div>

                                <div className="d-flex align-items-center gap-2 mt-3 mt-md-0">
                                    <span className="text-muted fw-semibold">Show</span>
                                    <Select
                                        value={pageSize}
                                        style={{ width: 80 }}
                                        size="small"
                                        onChange={(value) => {
                                            setPageSize(value);
                                            setCurrentPage(1);
                                            setDocumentsCache({});

                                            fetchDocuments(1, true, value);
                                        }}

                                        options={[
                                            { value: 10, label: "10" },
                                            { value: 50, label: "50" },
                                            { value: 100, label: "100" }
                                        ]}
                                    />
                                    <span className="text-muted fw-semibold">
                                        entries
                                    </span>
                                </div>
                            </div>
                            <div className="row d-flex justify-content-start align-items-end mb-2">
                                <div className="col-12 col-md-2 my-1 my-md-0">
                                    <label className="form-label fw-bold fs-8 text-gray-700">
                                        Unit<span className="text-danger">*</span>
                                    </label>
                                    <Select
                                        showSearch
                                        placeholder="Select unit"
                                        className="w-100"
                                        style={{ height: '2.6rem' }}
                                        value={filters.UnitId}
                                        onChange={(value) =>
                                            setFilters((prev) => ({ ...prev, UnitId: value }))
                                        }
                                        optionFilterProp="children"
                                        filterOption={(input, option) =>
                                            option.children.toLowerCase().includes(input.toLowerCase())
                                        }
                                        disabled={!showDeptDwn}
                                    >
                                        <Option value="0">ALL</Option>
                                        {unitsData?.map((dep) => (
                                            <Option key={dep.ItemId} value={dep.ItemId}>
                                                {dep.ItemValue}
                                            </Option>
                                        ))}
                                    </Select>
                                </div>
                                <div className="col-12 col-md-2 my-1 my-md-0">
                                    <label className="form-label fw-bold fs-8 text-gray-700">
                                        Department<span className="text-danger">*</span>
                                    </label>
                                    <Select
                                        showSearch
                                        placeholder="Select department"
                                        className="w-100"
                                        style={{ height: '2.6rem' }}
                                        value={filters.DeptId}
                                        onChange={(value) =>
                                            setFilters((prev) => ({ ...prev, DeptId: value }))
                                        }
                                        optionFilterProp="children"
                                        filterOption={(input, option) =>
                                            option.children.toLowerCase().includes(input.toLowerCase())
                                        }
                                        disabled={!showDeptDwn}
                                    >
                                        <Option value="0">ALL</Option>
                                        {departmentsData?.map((dep) => {
                                            // Check if this department matches the logged-in user's department
                                            const isUserDept = dep.ItemId === sessionUserData?.DeptId;

                                            return (
                                                <Option key={dep.ItemId} value={dep.ItemId}>
                                                    <div className="d-flex justify-content-between align-items-center w-100">
                                                        <span className={isUserDept ? "fw-bolder text-primary" : ""}>
                                                            {dep.ItemValue}
                                                        </span>
                                                        {isUserDept && (
                                                            <span
                                                                className="badge badge-light-primary fw-bold"
                                                                style={{ fontSize: '10px', padding: '2px 6px' }}
                                                            >
                                                                MY DEPT
                                                            </span>
                                                        )}
                                                    </div>
                                                </Option>
                                            );
                                        })}
                                    </Select>
                                </div>
                                <div className="col-12 col-md-3 my-1 my-md-0">
                                    <label className="form-label fw-bold fs-8 text-gray-700">
                                        Document Type
                                    </label>
                                    <Select
                                        showSearch
                                        allowClear
                                        placeholder="Select document type"
                                        className="w-100"
                                        style={{ height: '2.6rem' }}
                                        value={filters.ContentTypeId}
                                        onChange={(value) => {
                                            setFilters((prev) => ({
                                                ...prev,
                                                ContentTypeId: value,
                                            }));
                                            setSelectedDocId(null); // ✅ reset document
                                        }}
                                        optionFilterProp="children"
                                        filterOption={(input, option) =>
                                            option.children.toLowerCase().includes(input.toLowerCase())
                                        }
                                    >
                                        <Option value={0}>ALL</Option>
                                        {(contentTypesData || []).map((cnTyp) => (
                                            <Option key={cnTyp.MasterTypeId} value={cnTyp.MasterTypeId}>
                                                {cnTyp.TypeName}
                                            </Option>
                                        ))}
                                    </Select>
                                </div>
                                <div className="col-12 col-md-4 mb-md-0 mb-3">
                                    <label className="form-label fw-bold fs-8 text-gray-700">
                                        Document Name
                                    </label>
                                    <Select
                                        showSearch
                                        allowClear
                                        placeholder="Select Document"
                                        className="w-100"
                                        value={selectedDocId || undefined}
                                        style={{ height: "2.6rem" }}
                                        onChange={(value) => setSelectedDocId(value)}
                                        filterOption={(input, option) => {
                                            const text = `${option?.children}`.toLowerCase();
                                            return text.includes(input.toLowerCase());
                                        }}
                                    >
                                        {/* <Option value={0}>ALL</Option> */}
                                        {Array.isArray(docsData) &&
                                            docsData.map((doc) => (
                                                <Option key={doc.DocId} value={doc.DocId}>
                                                    {doc.DocName}
                                                </Option>
                                            ))}
                                    </Select>
                                </div>
                                <div className="col-6 col-md-2 mb-md-0 my-3">
                                    <label className="form-label fw-bold fs-8 text-gray-700">
                                        Status
                                    </label>
                                    <Select
                                        showSearch
                                        placeholder="Select Status"
                                        className="w-100"
                                        style={{ height: '2.6rem' }}
                                        value={filters.VersionStatus}
                                        onChange={(value) =>
                                            setFilters((prev) => ({ ...prev, VersionStatus: value }))
                                        }
                                        optionFilterProp="children"
                                    >
                                        <Option value="ALL">All</Option>
                                        <Option value="DRAFT">
                                            <span className="badge badge-dot bg-warning me-2"></span> Draft
                                        </Option>
                                        <Option value="PENDING APPROVAL">
                                            <span className="badge badge-dot bg-info me-2"></span> Pending Approval
                                        </Option>
                                        <Option value="APPROVED">
                                            <span className="badge badge-dot bg-primary me-2"></span> Approved
                                        </Option>
                                        <Option value="PUBLISHED">
                                            <span className="badge badge-dot bg-success me-2"></span> Published
                                        </Option>
                                        <Option value="REJECTED">
                                            <span className="badge badge-dot bg-danger me-2"></span> Rejected
                                        </Option>
                                    </Select>
                                </div>
                                <div className="col-6 col-md-2 mb-md-0 my-3">
                                    <label className="form-label fw-bold fs-8 text-gray-700">
                                        Document Code
                                    </label>
                                    <div className="position-relative">
                                        <input
                                            type="text"
                                            className="form-control form-control-sm pe-10"
                                            placeholder="Enter document code"
                                            value={filters.DocumentCode}
                                            onChange={(e) => setFilters((prev) => ({ ...prev, DocumentCode: e.target.value }))}
                                        />

                                        {filters.DocumentCode && (
                                            <span
                                                className="position-absolute top-50 end-0 translate-middle-y me-3 cursor-pointer text-gray-400 text-hover-primary"
                                                onClick={() => setFilters((prev) => ({ ...prev, DocumentCode: '' }))}
                                                style={{ transition: 'color 0.2s' }}
                                            >
                                                <i className="fa-solid fa-circle-xmark fs-7"></i>
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="col-12 col-md-1 d-flex my-5 mb-0">
                                    <button
                                        className="btn btn-light-primary btn-sm border border-primary w-100 w-md-auto d-flex align-items-center justify-content-center"
                                        type="button"
                                        style={{ height: "2.6rem", fontSize: "0.9rem" }}
                                        onClick={handleFilterSubmit}
                                        disabled={dataLoading || !filters.UnitId}
                                    >
                                        {dataLoading ? (
                                            <>
                                                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                                Submitting...
                                            </>
                                        ) : (
                                            <>
                                                <i className="bi bi-funnel"></i>
                                                <span>Submit</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* docz list */}
                    <div className="card d-md-block d-none shadow-sm">
                        <div className="table-responsive" style={{ overflowX: "hidden" }}>
                            <table className="table align-middle table-hover gs-7 gy-5 mb-0 fs-6">
                                <thead className="bg-light-primary">
                                    <tr className="text-start text-muted fw-bold fs-7 text-uppercase gs-0 border-bottom-2 border-primary">
                                        <th className="min-w-40px" title="Serial Number">S.No</th>
                                        <th className="min-w-100px cursor-pointer group-hover" onClick={() => {/* handleSort('Code') */ }}>
                                            <div className="d-flex align-items-center">
                                                <span>Code</span>
                                                <Tooltip title="Coming Soon" color="#108ee9">
                                                    <span className="ms-2 sort-icon-container">
                                                        <i className="fa-solid fa-sort fs-9"></i>
                                                    </span>
                                                </Tooltip>
                                            </div>
                                        </th>
                                        <th className="min-w-150px cursor-pointer group-hover" onClick={() => {/* handleSort('Name') */ }}>
                                            <div className="d-flex align-items-center">
                                                <span>Name</span>
                                                <Tooltip title="Coming Soon" color="#108ee9">
                                                    <span className="ms-2 sort-icon-container" style={{ cursor: 'help' }}>
                                                        <i className="fa-solid fa-sort fs-9 text-primary opacity-50"></i>
                                                    </span>
                                                </Tooltip>
                                            </div>
                                        </th>
                                        <th className="min-w-150px cursor-pointer group-hover" onClick={() => {/* handleSort('DocType') */ }}>
                                            <div className="d-flex align-items-center">
                                                <span>Document Type</span>
                                                {/* <Tooltip title="Coming Soon" color="#108ee9">
                                                    <span className="ms-2 sort-icon-container">
                                                        <i className="fa-solid fa-sort fs-9"></i>
                                                    </span>
                                                </Tooltip> */}
                                            </div>
                                        </th>
                                        <th className="text-center min-w-90px" title="Current Active Version">Version</th>
                                        <th className="min-w-100px" title="User who uploaded the current version of this document">Ver.Author</th>
                                        <th className="min-w-125px text-center" title="Date of last version upload">Uploaded Date</th>
                                        <th className="min-w-125px text-center" title="Date of last version upload">Expiry Date</th>
                                        <th className="min-w-120px" title="Current status of the document">Status</th>
                                        <th className="text-center min-w-50px" title="View Document Description">Desc.</th>
                                        <th className="text-center min-w-50px" title="Available Actions">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="fw-semibold text-gray-700">
                                    {dataLoading ? (
                                        <tr>
                                            <td colSpan="12" className="text-center">
                                                <div className="container"></div>
                                            </td>
                                        </tr>
                                    )
                                        : docListData && docListData.length > 0 ? (
                                            docListData?.map((item, i) => {
                                                return (
                                                    <tr key={item.id}
                                                        className="shadow-sm rounded-3"
                                                        style={{
                                                            transition: "all 0.2s ease-in-out",
                                                        }}
                                                    >
                                                        <td>{(currentPage - 1) * pageSize + i + 1}</td>
                                                        <td>
                                                            <span className="badge badge-light-primary fw-bold px-3 py-2">{item.DocumentCode}</span>
                                                        </td>
                                                        <td className="fw-bold">
                                                            {item.DocName && item.DocName.length > 5 ? (
                                                                <Tooltip title={item.DocName} placement="topLeft" color="blue">
                                                                    <span
                                                                        className="cursor-pointer"
                                                                        style={{
                                                                            display: 'inline-block',
                                                                            maxWidth: '200px', // Adjust this width to fit your column
                                                                            whiteSpace: 'nowrap',
                                                                            overflow: 'hidden',
                                                                            textOverflow: 'ellipsis',
                                                                            verticalAlign: 'middle'
                                                                        }}
                                                                    >
                                                                        {item.DocName}
                                                                    </span>
                                                                </Tooltip>
                                                            ) : (
                                                                <span>{item.DocName}</span>
                                                            )}
                                                        </td>
                                                        <td>
                                                            <Tooltip title={item.TypeName} placement="topLeft" color="blue">
                                                                <span
                                                                    className="cursor-pointer"
                                                                    style={{
                                                                        display: 'inline-block',
                                                                        maxWidth: '180px', // Adjust this width to fit your column
                                                                        whiteSpace: 'nowrap',
                                                                        overflow: 'hidden',
                                                                        textOverflow: 'ellipsis',
                                                                        verticalAlign: 'middle'
                                                                    }}
                                                                >
                                                                    {item.TypeName}
                                                                </span>
                                                            </Tooltip>
                                                        </td>
                                                        <td className="text-info fw-bold text-center">{item.VersionNumber}</td>
                                                        <td>{item.VersionCreatedBy}</td>
                                                        <td className="text-center">{formatToDDMMYYYY(item.VersionCreated)}</td>
                                                        <td className="text-center text-danger">{formatToDDMMYYYY(item.ExpiryDate) || 'N/A'}</td>
                                                        <td>
                                                            <span className={`rounded-pill px-3 py-2 badge ${getStatusBadgeClass(item.VersionStatus)}`}>
                                                                {item.VersionStatus}
                                                            </span>
                                                        </td>
                                                        <td className="text-center">
                                                            {item.Description ? (
                                                                <Popover
                                                                    content={
                                                                        <div style={{ maxWidth: '250px', wordWrap: 'break-word' }}>
                                                                            {item.Description}
                                                                        </div>
                                                                    }
                                                                    title="Description"
                                                                    trigger="hover"
                                                                    placement="top"
                                                                >
                                                                    <span className="cursor-pointer">
                                                                        <i className="fa-solid fa-file-lines text-primary fs-5 me-1"></i>
                                                                    </span>
                                                                </Popover>
                                                            ) : (
                                                                <span className="text-gray-400 fs-7 italic">No description</span>
                                                            )}
                                                        </td>
                                                        <td className="">
                                                            <Popover
                                                                placement="bottom"
                                                                trigger="hover"
                                                                content={
                                                                    <div className="d-flex flex-column gap-1" style={{ width: '9rem' }}>
                                                                        {/* Edit Action */}
                                                                        <div
                                                                            className={`action-item  cursor-pointer ${!item.CanWrite ? 'disabled' : ''}`}
                                                                            {...(item.CanWrite && {
                                                                                "data-bs-toggle": "offcanvas",
                                                                                "data-bs-target": "#offcanvasRightEdit",
                                                                                onClick: () => handleEdit(item)
                                                                            })}
                                                                        >
                                                                            <i className="fa-regular fa-pen-to-square text-info"></i>
                                                                            <span>Edit Details</span>
                                                                        </div>

                                                                        {/* Versions Action */}
                                                                        <Link to={`/edm/doc-version/${item.Id}`} className="action-item">
                                                                            <i className="fa-solid fa-code-branch text-primary"></i>
                                                                            <span>History</span>
                                                                        </Link>

                                                                        {/* Preview Action */}
                                                                        <div className="action-item  cursor-pointer" onClick={() => handleOpenPreview(item)}>
                                                                        <i className="bi bi-eye"></i>
                                                                            <span>Quick View</span>
                                                                        </div>

                                                                        {/* Delete Action */}
                                                                        <div
                                                                            className={`action-item cursor-pointer ${!(showDelete && item.VersionStatus !== 'PUBLISHED') ? 'disabled' : ''}`}
                                                                            onClick={() => showDelete && item.VersionStatus !== 'PUBLISHED' && handleDeleteDoc(item)}
                                                                        >
                                                                            <i className="bi bi-trash3 text-danger"></i>
                                                                            <span>Remove</span>
                                                                        </div>
                                                                    </div>
                                                                }
                                                            >
                                                                <button
                                                                    className="btn"
                                                                >
                                                                    <i className="fa-solid fa-ellipsis-vertical"></i>
                                                                </button>
                                                            </Popover>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        ) : (
                                            <tr>
                                                <td colSpan="12" className="text-center p-10">
                                                    <div className="d-flex flex-column align-items-center">
                                                        <i className="fa-regular fa-folder-open fs-1 text-gray-300 mb-3"></i>
                                                        <span className="text-gray-500 fw-bold">No documents available</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                </tbody>
                            </table>
                            <div className="mx-3">
                                <Pagination
                                    currentPage={currentPage}
                                    totalPages={totalPages}
                                    totalRecords={totalRecords || 0} // Or the total count from your API meta-data
                                    recordsPerPage={pageSize} // This MUST match the 'limit' you use in your API call
                                    onPageChange={(page) => fetchDocuments(page)}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="d-md-none">
                        {dataLoading ? (
                            <div className="text-center py-4">Loading...</div>
                        ) : docListData && docListData.length > 0 ? (
                            Array.isArray(docListData) &&
                            docListData.map((item, i) => {
                                const hasActionPermission = sessionActionIds?.includes(3);
                                const isOwnerOrManager = Number(sessionUserData?.Id) === Number(item?.CreatedBy) ||
                                    Number(sessionUserData?.RoleId) === 5;

                                const canEditRecord = hasActionPermission && isOwnerOrManager;
                                return (
                                    <div
                                        key={item.Id}
                                        className="card mb-3 shadow-sm  border border-primary"
                                        style={{
                                            background: "linear-gradient(135deg, #f8f9ff, #eef2ff)",
                                            borderRadius: "12px",
                                            transition: "all 0.2s ease-in-out",
                                        }}
                                    >
                                        <div className="card-body p-3">
                                            <div className="d-flex justify-content-between align-items-start mb-2">
                                                <div style={{ maxWidth: '70%' }}>
                                                    <h6 className="fw-bold mb-1 text-primary text-truncate">
                                                        {item.DocName}
                                                    </h6>
                                                    <div className="d-flex flex-wrap gap-2">
                                                        <span className="small fw-bold text-muted">{item.DocumentCode}</span>
                                                        <span className="badge bg-light-info text-info border border-info-subtle">
                                                            V{item.VersionNumber}
                                                        </span>
                                                    </div>
                                                </div>
                                                <span className={`badge rounded-pill px-3 py-2 ${getStatusBadgeClass(item.VersionStatus)}`}>
                                                    {item.VersionStatus}
                                                </span>
                                            </div>
                                            <div className="d-flex flex-wrap gap-3 mb-3 small">
                                                <span>
                                                    <i className="fa-solid fa-layer-group me-1 text-muted"></i>
                                                    <span className="fw-semibold">{item.TypeName}</span>
                                                </span>
                                                {item.ExpiryDate && (
                                                    <span className="text-danger">
                                                        <i className="fa-solid fa-calendar-xmark me-1"></i>
                                                        Exp: {formatToDDMMYYYY(item.ExpiryDate)}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="bg-white bg-opacity-50 rounded p-2 mb-3">
                                                {item.Description ? (
                                                    <p className="text-muted mb-0 small" style={{ display: '-webkit-box', WebkitLineClamp: '2', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                        <i className="fa-solid fa-file-lines me-2 text-primary opacity-75"></i>
                                                        {item.Description}
                                                    </p>
                                                ) : (
                                                    <span className="text-gray-400 small italic">No description available</span>
                                                )}
                                            </div>
                                            <div className="d-flex justify-content-between align-items-center text-muted small mb-3 border-top pt-2">
                                                <span>
                                                    <i className="fa-solid fa-circle-user me-1"></i>
                                                    {item.VersionCreatedBy || item.CreatedUser}
                                                </span>
                                                <span>
                                                    <i className="fa-solid fa-clock me-1"></i>
                                                    {formatToDDMMYYYY(item.VersionCreated || item.CreatedOn)}
                                                </span>
                                            </div>

                                            <div className="d-flex gap-2">
                                                {item.CanWrite && (
                                                    <>
                                                        <button
                                                            className="btn btn-sm btn-light-primary border border-primary flex-grow-1 d-flex align-items-center justify-content-center gap-1"
                                                            data-bs-toggle="offcanvas"
                                                            data-bs-target="#offcanvasRightEdit"
                                                            onClick={() => handleEdit(item)}
                                                        >
                                                            <i className="fa-regular fa-pen-to-square"></i> Edit
                                                        </button>
                                                    </>
                                                )}
                                                <Link
                                                    to={`/edm/doc-version/${item.Id}`}
                                                    className="btn btn-sm btn-light-info border border-info flex-grow-1 d-flex align-items-center justify-content-center gap-1"
                                                >
                                                    <i className="fa-solid fa-code-branch"></i> Version
                                                </Link>
                                                <button
                                                    className="btn btn-sm btn-light-warning border border-warning flex-grow-1 d-flex align-items-center justify-content-center gap-1"
                                                    onClick={() => handleOpenPreview(item)}
                                                >
                                                    <i className="fa-solid fa-expand"></i> Preview
                                                </button>
                                                {item.VersionStatus !== 'PUBLISHED' && (
                                                    <button
                                                        className="btn btn-sm btn-light-danger border border-danger flex-grow-1 d-flex align-items-center justify-content-center gap-1"
                                                        onClick={() => showDelete && item.VersionStatus !== 'PUBLISHED' && handleDeleteDoc(item)}
                                                    >
                                                        <i className="bi bi-trash3"></i> Delete
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            /* Empty State */
                            <tr>
                                <td colSpan="12" className="text-center p-10">
                                    <div className="d-flex flex-column align-items-center">
                                        <i className="fa-regular fa-folder-open fs-1 text-gray-300 mb-3"></i>
                                        <span className="text-gray-500 fw-bold">No documents available</span>
                                    </div>
                                </td>
                            </tr>
                        )}

                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            totalRecords={totalRecords || 0} // Or the total count from your API meta-data
                            recordsPerPage={pageSize} // This MUST match the 'limit' you use in your API call
                            onPageChange={(page) => fetchDocuments(page)}
                        />
                    </div>


                </div>

                <style>
                    {`
                    /* Add this to your CSS file */
.action-item {
    display: flex;
    align-items: center;
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 500;
    transition: all 0.2s ease-in-out;
    color: #444;
    text-decoration: none !important;
}

.action-item:hover:not(.disabled) {
    background-color: rgba(0, 123, 255, 0.08);
    color: #007bff;
    transform: translateX(3px);
}

.action-item.disabled {
    opacity: 0.4;
    cursor: not-allowed;
    filter: grayscale(1);
}

.action-item i {
    width: 20px;
    font-size: 1.1rem;
}
                    .custom-btn {
                    transition: all 0.2s ease-in-out;
                    border-radius: 8px;
                }

                .custom-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 14px rgba(0, 0, 0, 0.12);
                }
                    .table tbody tr:hover {
                        background-color: #f8faff !important;
                        transform: scale(1.01);
                        transition: 0.2s ease-in-out;
                    }
                    /* Active Menu Link Styling */
                    .menu-link.active {
                        background-color: #f1faff !important; /* Light blue tint */
                        border-bottom: 2px solid #0095ff !important;
                    }

                    .menu-link {
                        display: inline-flex;
                        align-items: center;
                        padding: 0.75rem 1.25rem;
                        border-radius: 10px;
                        transition: all 0.2s ease;
                        border: 1px solid transparent;
                    }

                    .menu-link:hover {
                        background-color: #f9fafb !important;
                        transform: translateY(-1px);
                    }

                    /* Ant Design Dropdown Customization */
                    .ant-dropdown-menu {
                        min-width: 180px !important;
                        padding: 8px !important;
                    }

                    .ant-dropdown-menu-item:hover {
                        background-color: #f1faff !important;
                        border-radius: 6px;
                    }
                    #kt_customers_table tbody td {
                            padding-top: 8px !important;
                            padding-bottom: 8px !important;
                            line-height: 1.2;
                        }
                                            /* This covers the whole screen and darkens the background */
                        .preview-modal-backdrop {
                            position: fixed;
                            top: 0;
                            left: 0;
                            width: 100vw;
                            height: 100vh;
                            background-color: rgba(0, 0, 0, 0.7);
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            z-index: 9999; /* Ensure this is higher than your table/header */
                        }

                        /* This is the actual modal box */
                        .preview-modal {
                            background: white;
                            width: 80%;
                            height: 90%;
                            max-width: 1000px;
                            border-radius: 8px;
                            display: flex;
                            flex-direction: column;
                            overflow: hidden;
                            position: relative;
                            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                        }

                        .preview-container {
                            flex: 1;
                            width: 100%;
                            height: 100%;
                            background: #f8f9fa;
                        }

                        /* Simple entry animation */
                        .animate-scale-in {
                            animation: scaleIn 0.2s ease-out;
                        }

                        @keyframes scaleIn {
                            from { transform: scale(0.95); opacity: 0; }
                            to { transform: scale(1); opacity: 1; }
                        }
                        .mobileMarginTop {
                            width: 100%;
                            margin-top: 25px;
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
                        }
`}
                </style>

            </div>
            <UplaodDocument />
            <EditDocument editObj={editData} />
            <RegisterMasterTypes typeCategory={activeCategory} />
            <DocumentPreview
                isOpen={previewModal.show}
                onClose={() => setPreviewModal({ show: false, item: null })}
                filePath={previewModal.item?.FilePath}
                docName={previewModal.item?.DocName}
                itemData={previewModal.item} // For logging
                sessionUserData={sessionUserData} // From your auth context
            />
            <InactiveDocuments />
        </Base1>
    )
}