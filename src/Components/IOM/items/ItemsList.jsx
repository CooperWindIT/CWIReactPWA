import React, { useState, useEffect, useCallback } from "react";
import Base1 from "./../../Config/Base1";
import { useNavigate, useLocation } from "react-router-dom";
import { fetchWithAuth } from "../../../utils/api";
import { getItems } from "../services/services";
import { Dropdown, Menu, Tooltip } from 'antd';
import Swal from "sweetalert2";
import "./../../Config/Pagination.css";
import "./../../Config/Loader.css";
import "../InwardRecords/InwardRecordsPremium.css";
import "./ItemsList.css";
import { EditOutlined, EyeOutlined } from "@ant-design/icons";
import InwardsTab from "./InwardsTab";
import ReworkReview from "../components/ReworkReview";
import ItemsExcelUploadModal from "../components/ItemsExcelUploadModal";
import ItemFormModal from "../components/ItemFormModal";
import ImagePreviewModal from "../components/ImagePreviewModal";
import { getItemsActionIds, findItemsMenu } from "../components/menuActions";
import "./ItemView.css";
import { BASE_IMAGE_API_GET } from "../../Config/Config";

// Action ids that allow the "View" (barcodes) button on Items: 41 or 2
const ACTION_VIEW_ITEM = 41;
const ACTION_VIEW_ITEM_ALT = 2;

// Action id that allows the "Edit" button on Items
const ACTION_EDIT_ITEM = 3;

// Action id that allows "Upload Excel" (bulk add items)
const ACTION_UPLOAD_ITEMS = 1;

// Read action ids synchronously so buttons render correctly on first paint
// (menu is "Inspection" now – see components/menuActions.js)
const getMenuActionIds = getItemsActionIds;

// Top tabs of this screen
const TAB_KEY = "iimItemsListTab";
// Each tab is shown only when the user's menu ActionsIds contain its action id
const ACTION_TAB_ITEMS = 42;
const ACTION_TAB_INWARDS = 43;
const ACTION_TAB_REWORK = 44;
const TABS = [
    { key: "items", label: "Items", icon: "fa-solid fa-cubes", action: ACTION_TAB_ITEMS },
    { key: "inwards", label: "Inwards", icon: "fa-solid fa-truck-ramp-box", action: ACTION_TAB_INWARDS },
    { key: "rework", label: "Rework", icon: "fa-solid fa-screwdriver-wrench", action: ACTION_TAB_REWORK }
];

const STORAGE_KEY = "iimItemsListState";
const iconColors = ['#FF6B35', '#00B8D9', '#36B37E', '#FFAB00', '#6554C0', '#FF5630'];

const getSavedState = () => {
    try {
        return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "{}");
    } catch {
        return {};
    }
};

// Compact numbered pagination (premium style)
const Pagination = ({
    currentPage,
    totalPages,
    totalRecords,
    recordsPerPage,
    onPageChange,
    onPageSizeChange
}) => {

    const getPaginationNumbers = () => {
        if (totalPages <= 7) {
            return Array.from({ length: totalPages }, (_, i) => i + 1);
        }
        if (currentPage <= 4) {
            return [1, 2, 3, 4, 5, "...", totalPages];
        }
        if (currentPage >= totalPages - 3) {
            return [1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
        }
        return [1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages];
    };

    if (totalPages === 0) return null;

    const from = totalRecords === 0 ? 0 : (currentPage - 1) * recordsPerPage + 1;
    const to = Math.min(currentPage * recordsPerPage, totalRecords);

    return (
        <div className="ir-footer">
            <div className="ir-footer-info">
                Showing <b>{from}–{to}</b> of <b>{totalRecords}</b> items
            </div>

            <div className="ir-pager">
                <select value={recordsPerPage} onChange={onPageSizeChange} title="Rows per page">
                    <option value={5}>5 / page</option>
                    <option value={10}>10 / page</option>
                    <option value={20}>20 / page</option>
                    <option value={50}>50 / page</option>
                    <option value={100}>100 / page</option>
                </select>

                <button
                    type="button"
                    className="ir-page-btn"
                    disabled={currentPage === 1}
                    onClick={() => onPageChange(currentPage - 1)}
                    title="Previous"
                >
                    <i className="fa-solid fa-chevron-left" />
                </button>

                {getPaginationNumbers().map((page, index) =>
                    page === "..." ? (
                        <span key={`dots-${index}`} className="it-page-dots">…</span>
                    ) : (
                        <button
                            key={page}
                            type="button"
                            className={`ir-page-btn ${page === currentPage ? "it-page-active" : ""}`}
                            onClick={() => onPageChange(page)}
                        >
                            {page}
                        </button>
                    )
                )}

                <button
                    type="button"
                    className="ir-page-btn"
                    disabled={currentPage === totalPages}
                    onClick={() => onPageChange(currentPage + 1)}
                    title="Next"
                >
                    <i className="fa-solid fa-chevron-right" />
                </button>
            </div>
        </div>
    );
};

export default function ItemsList() {

    const location = useLocation();
    const navigate = useNavigate();

    const savedState = getSavedState();

    const [sessionUserData] = useState(() => {
        try {
            return JSON.parse(sessionStorage.getItem("userData") || "{}");
        } catch {
            return {};
        }
    });

    const [filters, setFilters] = useState(
        savedState.filters || {
            PartNo: "",
            ItemName: "",
            ItemCode: ""
        }
    );

    const [pageSize, setPageSize] = useState(
        savedState.pageSize || 10
    );

    const [currentPage, setCurrentPage] = useState(
        savedState.currentPage || 1
    );

    const [itemListData, setItemListData] = useState([]);
    const [totalRecords, setTotalRecords] = useState(0);
    const [sessionActionIds, setSessionActionIds] = useState(getMenuActionIds);
    const [dataLoading, setDataLoading] = useState(false);
    const [menuData, setMenuData] = useState([]);
    const [modules, setModules] = useState([]);
    const [itemsCache, setItemsCache] = useState({});

    // View (opens /iom/item-view/:ItemId) – allowed with action 41 OR action 2
    const canViewItem = !!(sessionActionIds?.includes(ACTION_VIEW_ITEM) || sessionActionIds?.includes(ACTION_VIEW_ITEM_ALT));
    const canUploadItems = sessionActionIds?.includes(ACTION_UPLOAD_ITEMS);
    const [showUpload, setShowUpload] = useState(false);
    // Add / Edit item modal: null = closed, { item: null } = add, { item } = edit
    const [itemForm, setItemForm] = useState(null);
    // big image preview: { url, title, subtitle } or null
    const [imagePreview, setImagePreview] = useState(null);
    const closeImagePreview = useCallback(() => setImagePreview(null), []);

    // tabs allowed for this user (action ids 42 / 43 / 44)
    const visibleTabs = TABS.filter(t => sessionActionIds?.includes(t.action));
    const canSeeItemsTab = visibleTabs.some(t => t.key === "items");

    const [activeTab, setActiveTab] = useState(() => {
        const allowed = TABS.filter(t => getMenuActionIds()?.includes(t.action));
        const saved = sessionStorage.getItem(TAB_KEY);
        return allowed.some(t => t.key === saved) ? saved : (allowed[0]?.key || "");
    });

    // keep the active tab valid when permissions load / change
    useEffect(() => {
        if (!visibleTabs.some(t => t.key === activeTab)) {
            setActiveTab(visibleTabs[0]?.key || "");
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sessionActionIds]);
    const [inwardsCount, setInwardsCount] = useState(null);

    const changeTab = (key) => {
        setActiveTab(key);
        sessionStorage.setItem(TAB_KEY, key);
    };

    // Inwards tab -> View on an inward item: open item view with that inward selected
    const handleViewInwardItem = (it, inward) => {
        const viewItem = {
            ItemId: it.ItemId,
            ItemName: it.ItemName,
            ItemCode: it.ItemCode,
            PartNo: it.PartNo,
            Description: it.Description,
            ItemImage: it.ItemImage
        };
        sessionStorage.setItem("selectedIIMItem", JSON.stringify(viewItem));
        navigate(`/iom/item-view/${it.ItemId}`, { state: { item: viewItem, inwardRecordId: inward?.Id } });
    };
    const canEditItem = sessionActionIds?.includes(ACTION_EDIT_ITEM);

    const handleViewItem = (item) => {
        sessionStorage.setItem("selectedIIMItem", JSON.stringify(item));
        navigate(`/iom/item-view/${item.ItemId}`, { state: { item } });
    };

    // Redirect when user session is unavailable
    useEffect(() => {
        if (!sessionUserData?.OrgId) {
            navigate("/");
        }
    }, [sessionUserData, navigate]);

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
        const sessionMenuData = sessionStorage.getItem("menuData");
        try {
            const parsedMenu = JSON.parse(sessionMenuData);
            setMenuData(parsedMenu)

            const ticketsMenu = findItemsMenu(parsedMenu);

            if (ticketsMenu) {
                const actionIdArray = ticketsMenu.ActionsIds?.split(",").map(Number);
                setSessionActionIds(actionIdArray);
            }
        } catch (err) {
            console.error("Error parsing menuData:", err);
        }
    }, []);

    useEffect(() => {
        if (sessionUserData?.OrgId) {
            fetchMenuData();
        }
    }, [sessionUserData]);

    // Persist filters and pagination
    useEffect(() => {
        sessionStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({
                filters,
                currentPage,
                pageSize
            })
        );
    }, [filters, currentPage, pageSize]);

    // Fetch Items
    const fetchItems = useCallback(async (
        page = 1,
        force = false,
        overridePageSize = null
    ) => {

        if (!sessionUserData?.OrgId) return;

        const finalPageSize = overridePageSize ?? pageSize;

        const cacheKey = [
            sessionUserData.OrgId,
            filters.PartNo.trim(),
            filters.ItemName.trim(),
            filters.ItemCode.trim(),
            page,
            finalPageSize
        ].join("-");

        // Serve from cache
        if (!force && itemsCache[cacheKey]) {

            setItemListData(itemsCache[cacheKey].data);
            setTotalRecords(itemsCache[cacheKey].total);
            setCurrentPage(page);
            setDataLoading(false);

            return;
        }

        setDataLoading(true);

        try {

            const response = await getItems({
                orgId: sessionUserData.OrgId,
                pageNumber: page,
                pageSize: finalPageSize,
                partNo: filters.PartNo.trim(),
                itemName: filters.ItemName.trim(),
                itemCode: filters.ItemCode.trim()
            });

            const pageData = response?.data?.result || [];

            // Adjust this path if your API uses another metadata property.
            const total =
                response?.data?.output?.TotalCount ??
                response?.data?.TotalCount ??
                response?.TotalCount ??
                0;

            setItemsCache(prev => ({
                ...prev,
                [cacheKey]: {
                    data: pageData,
                    total
                }
            }));

            setItemListData(pageData);
            setTotalRecords(Number(total));
            setCurrentPage(page);

        } catch (error) {

            console.error("Error fetching items:", error);

            setItemListData([]);
            setTotalRecords(0);

            Swal.fire(
                "Error",
                "Failed to fetch items. Please try again.",
                "error"
            );

        } finally {
            setDataLoading(false);
        }

    }, [sessionUserData, filters, pageSize, itemsCache]);

    // Initial API call / restore saved page
    useEffect(() => {
        if (sessionUserData?.OrgId && canSeeItemsTab) {
            fetchItems(currentPage);
        }
        // Initial fetch when organization becomes available / Items tab allowed (action 42).
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sessionUserData?.OrgId, canSeeItemsTab]);

    // Handle filter changes
    const handleFilterChange = (e) => {
        const { name, value } = e.target;

        setFilters(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Search
    const handleSearch = () => {
        setItemsCache({});
        setCurrentPage(1);
        fetchItems(1, true);
    };

    // Reset filters and reload page 1 with empty filters
    const handleReset = () => {
        const emptyFilters = { PartNo: "", ItemName: "", ItemCode: "" };

        setFilters(emptyFilters);
        setItemsCache({});
        setCurrentPage(1);
        setDataLoading(true);

        getItems({
            orgId: sessionUserData.OrgId,
            pageNumber: 1,
            pageSize,
            partNo: "",
            itemName: "",
            itemCode: ""
        })
            .then(response => {
                const data = response?.data?.result || [];
                const total =
                    response?.data?.output?.TotalCount ??
                    response?.data?.TotalCount ??
                    response?.TotalCount ??
                    0;

                setItemListData(data);
                setTotalRecords(Number(total));
            })
            .catch(error => {
                console.error(error);
                Swal.fire("Error", "Failed to fetch items", "error");
            })
            .finally(() => setDataLoading(false));
    };

    // Change page size
    const handlePageSizeChange = (e) => {

        const newPageSize = Number(e.target.value);

        setPageSize(newPageSize);
        setCurrentPage(1);
        setItemsCache({});

        fetchItems(1, true, newPageSize);
    };

    // Change page
    const handlePageChange = (page) => {
        if (page < 1) return;

        const totalPages = Math.ceil(totalRecords / pageSize);

        if (page > totalPages) return;

        fetchItems(page);
    };

    const totalPages = Math.ceil(totalRecords / pageSize);

    return (
        <Base1>

            {/* Toolbar */}
            <div id="kt_app_toolbar" className="app-toolbar iim-nav py-3 py-lg-4">
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
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div id="kt_app_content" className="app-content flex-column-fluid pt-0 mb-5">
                <div id="kt_app_content_container" className="app-container container-xxl ir-page">

                    {/* HEADER */}
                    <div className="ir-header">
                        <div className="ir-header-left">
                            <div className="ir-header-icon">
                                <i className="fa-solid fa-cubes" />
                            </div>
                            <div>
                                <h2 className="ir-title">Inspection</h2>
                                <div className="ir-subtitle">
                                    {activeTab === "items"
                                        ? "Item master for inventory. Search items and open View to see their barcodes."
                                        : activeTab === "inwards"
                                            ? "Inward records. Open a row to see its items, then View an item's barcodes."
                                            : activeTab === "rework"
                                                ? "Units that failed inspection and need rework."
                                                : "Items, inwards and rework units."}
                                </div>
                            </div>
                        </div>

                        <div className="d-flex align-items-center gap-2 flex-wrap">
                            {(activeTab === "items" || activeTab === "inwards") && (
                                <span className="ir-today-chip it-count-chip">
                                    <i className="fa-solid fa-layer-group" />
                                    <b>{activeTab === "items" ? totalRecords : (inwardsCount ?? 0)}</b>
                                    {activeTab === "items" ? (totalRecords === 1 ? "item" : "items") : (inwardsCount === 1 ? "inward" : "inwards")}
                                </span>
                            )}

                            {/* Add one item / bulk add from Excel (action 1) */}
                            {activeTab === "items" && canUploadItems && (
                                <>
                                    <button type="button" className="ir-btn-ghost it-upload-btn" onClick={() => setShowUpload(true)}>
                                        <i className="fa-solid fa-file-excel" style={{ color: "#12805c" }} /> Upload Excel
                                    </button>
                                    <button type="button" className="ir-btn-primary it-upload-btn" onClick={() => setItemForm({ item: null })}>
                                        <i className="fa-solid fa-plus" /> Add Item
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* TABS */}
                    {visibleTabs.length === 0 && (
                        <div className="ir-card">
                            <div className="ir-empty">
                                <div className="ir-empty-icon"><i className="fa-solid fa-lock" /></div>
                                <div className="ir-empty-title">No access</div>
                                <div className="ir-sub">You don't have access to Items, Inwards or Rework. Please contact your administrator.</div>
                            </div>
                        </div>
                    )}

                    {visibleTabs.length > 0 && (
                    <div className="it-tabs" role="tablist">
                        {visibleTabs.map(t => (
                            <button
                                key={t.key}
                                type="button"
                                role="tab"
                                aria-selected={activeTab === t.key}
                                className={`it-tab ${activeTab === t.key ? "active" : ""}`}
                                onClick={() => changeTab(t.key)}
                            >
                                <i className={t.icon} /> {t.label}
                                {t.key === "items" && <span className="it-tab-count">{totalRecords}</span>}
                                {t.key === "inwards" && inwardsCount !== null && <span className="it-tab-count">{inwardsCount}</span>}
                            </button>
                        ))}
                    </div>
                    )}

                    {activeTab === "inwards" && (
                        <InwardsTab
                            orgId={sessionUserData?.OrgId}
                            canViewItem={canViewItem}
                            onViewItem={handleViewInwardItem}
                            onCountChange={setInwardsCount}
                        />
                    )}

                    {activeTab === "rework" && <ReworkReview orgId={sessionUserData?.OrgId} />}

                    {activeTab === "items" && (
                    <div className="ir-card">

                        {/* FILTERS */}
                        <div className="ir-toolbar">
                            <div className="it-filters">
                                <div className="ir-search it-search">
                                    <i className="fa-solid fa-barcode" />
                                    <input
                                        type="text"
                                        name="ItemCode"
                                        placeholder="Item code"
                                        value={filters.ItemCode}
                                        onChange={handleFilterChange}
                                        onKeyDown={e => e.key === "Enter" && handleSearch()}
                                    />
                                </div>

                                <div className="ir-search it-search">
                                    <i className="fa-solid fa-tag" />
                                    <input
                                        type="text"
                                        name="ItemName"
                                        placeholder="Item name"
                                        value={filters.ItemName}
                                        onChange={handleFilterChange}
                                        onKeyDown={e => e.key === "Enter" && handleSearch()}
                                    />
                                </div>

                                <div className="ir-search it-search">
                                    <i className="fa-solid fa-hashtag" />
                                    <input
                                        type="text"
                                        name="PartNo"
                                        placeholder="Part number"
                                        value={filters.PartNo}
                                        onChange={handleFilterChange}
                                        onKeyDown={e => e.key === "Enter" && handleSearch()}
                                    />
                                </div>

                                <button type="button" className="ir-btn-soft" onClick={handleSearch} disabled={dataLoading}>
                                    <i className="fa-solid fa-magnifying-glass" /> Search
                                </button>

                                <button type="button" className="ir-btn-ghost" onClick={handleReset} disabled={dataLoading}>
                                    <i className="fa-solid fa-rotate-left" /> Reset
                                </button>
                            </div>
                        </div>

                        {/* TABLE */}
                        <div className="table-responsive">
                            <table className="ir-table it-table ir-stack">
                                <thead>
                                    <tr>
                                        <th style={{ width: 56 }}>#</th>
                                        <th>Item</th>
                                        <th>Item Code</th>
                                        <th>Part Number</th>
                                        <th>Description</th>
                                        <th className="text-center">Ready to Dispatch</th>
                                        <th className="text-end">Actions</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {dataLoading ? (
                                        Array.from({ length: Math.min(pageSize, 6) }).map((_, r) => (
                                            <tr key={`sk-${r}`}>
                                                {[20, 60, 40, 40, 50, 30, 30].map((w, c) => (
                                                    <td key={c}><div className="ir-skel" style={{ width: `${w}%` }} /></td>
                                                ))}
                                            </tr>
                                        ))
                                    ) : itemListData.length > 0 ? (
                                        itemListData.map((item, index) => (
                                            <tr key={item.ItemId}>

                                                <td className="it-sno">
                                                    {(currentPage - 1) * pageSize + index + 1}
                                                </td>

                                                {/* Thumbnail + name */}
                                                <td className="ir-stack-head">
                                                    <div className="it-item">
                                                        {item.ItemImage ? (
                                                            <button
                                                                type="button"
                                                                className="it-thumb it-thumb-btn"
                                                                title="View image"
                                                                onClick={() => setImagePreview({
                                                                    url: /^https?:\/\//i.test(item.ItemImage) ? item.ItemImage : `${BASE_IMAGE_API_GET}${item.ItemImage}`,
                                                                    title: item.ItemName || "Item",
                                                                    subtitle: [item.ItemCode, item.PartNo].filter(Boolean).join(" · ")
                                                                })}
                                                            >
                                                                <img
                                                                    src={`${BASE_IMAGE_API_GET}${item.ItemImage}`}
                                                                    alt={item.ItemName || "Item"}
                                                                    onError={(e) => {
                                                                        e.currentTarget.replaceWith(
                                                                            Object.assign(document.createElement("i"), {
                                                                                className: "fa-regular fa-image"
                                                                            })
                                                                        );
                                                                    }}
                                                                />
                                                                <span className="it-thumb-zoom"><i className="fa-solid fa-magnifying-glass-plus" /></span>
                                                            </button>
                                                        ) : (
                                                            <span className="it-thumb">
                                                                <i className="fa-regular fa-image" />
                                                            </span>
                                                        )}
                                                        <span className="it-name">{item.ItemName || "N/A"}</span>
                                                    </div>
                                                </td>

                                                <td data-label="Item code">
                                                    <span className="it-code">{item.ItemCode || "N/A"}</span>
                                                </td>

                                                <td data-label="Part no" className="it-part">{item.PartNo || "N/A"}</td>

                                                <td data-label="Description" className="it-desc">
                                                    {item.Description ? (
                                                        <Tooltip
                                                            title={item.Description}
                                                            placement="topLeft"
                                                            overlayStyle={{ maxWidth: "350px" }}
                                                        >
                                                            <span>{item.Description}</span>
                                                        </Tooltip>
                                                    ) : (
                                                        <span className="text-muted">—</span>
                                                    )}
                                                </td>

                                                <td data-label="Ready to dispatch" className="text-center">
                                                    {(() => {
                                                        const ready = Number(item.ReadyToDispatchCount) || 0;
                                                        return (
                                                            <span className={`it-ready ${ready ? "" : "zero"}`} title={`${ready} unit${ready === 1 ? "" : "s"} ready to dispatch`}>
                                                                <i className="fa-solid fa-truck-fast" />{ready}
                                                            </span>
                                                        );
                                                    })()}
                                                </td>

                                                <td className="ir-stack-actions">
                                                    <div className="ir-actions">
                                                        {canViewItem && (
                                                            <button
                                                                type="button"
                                                                className="ir-btn-view it-btn"
                                                                onClick={() => handleViewItem(item)}
                                                            >
                                                                <EyeOutlined /> View
                                                            </button>
                                                        )}

                                                        {canEditItem && (
                                                            <button
                                                                type="button"
                                                                className="ir-btn-view it-btn"
                                                                onClick={() => setItemForm({ item })}
                                                            >
                                                                <EditOutlined /> Edit
                                                            </button>
                                                        )}

                                                        {!canViewItem && !canEditItem && (
                                                            <span className="text-muted">—</span>
                                                        )}
                                                    </div>
                                                </td>

                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="7">
                                                <div className="ir-empty">
                                                    <div className="ir-empty-icon"><i className="fa-regular fa-folder-open" /></div>
                                                    <div className="ir-empty-title">No items found</div>
                                                    <div className="ir-sub">Try a different code, name or part number.</div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* PAGINATION */}
                        {!dataLoading && totalRecords > 0 && (
                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                totalRecords={totalRecords}
                                recordsPerPage={pageSize}
                                onPageChange={handlePageChange}
                                onPageSizeChange={handlePageSizeChange}
                            />
                        )}

                    </div>
                    )}
                </div>
            </div>

            <ImagePreviewModal image={imagePreview} onClose={closeImagePreview} />

            <ItemFormModal
                show={!!itemForm}
                item={itemForm?.item || null}
                orgId={sessionUserData?.OrgId}
                userId={sessionUserData?.Id}
                onClose={() => setItemForm(null)}
                onSaved={async () => {
                    // reload the current page (page 1 after adding)
                    const page = itemForm?.item ? currentPage : 1;
                    setItemsCache({});
                    setCurrentPage(page);
                    await fetchItems(page, true);
                }}
            />

            <ItemsExcelUploadModal
                show={showUpload && canUploadItems}
                orgId={sessionUserData?.OrgId}
                userId={sessionUserData?.Id}
                onClose={() => setShowUpload(false)}
                onUploaded={async () => {
                    // reload the items list with the new rows
                    setItemsCache({});
                    setCurrentPage(1);
                    await fetchItems(1, true);
                }}
            />

        </Base1>
    );
}