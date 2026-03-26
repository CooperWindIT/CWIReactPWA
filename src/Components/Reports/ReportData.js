import React, { useState, useEffect, useRef } from "react";
import Base1 from "../Config/Base1";
import { useNavigate, useLocation } from "react-router-dom";
import * as XLSX from "xlsx";
import '../Config/Loader.css';
import Swal from "sweetalert2";
import { Select } from "antd";
import { fetchWithAuth } from "../../utils/api";
import { Dropdown, Menu, Tooltip } from 'antd';

export default function ReportData() {

    const location = useLocation();

    // Use URLSearchParams to get the query parameter
    const queryParams = new URLSearchParams(location.search);
    const ReportId = queryParams.get('reportId');
    const today = new Date();
    const { Option } = Select;

    // const { ReportId } = useParams();
    const navigate = useNavigate();
    const [sessionUserData, setSessionUserData] = useState({});
    const [isFetching, setIsFetching] = useState(false);
    const [sessionActionIds, setSessionActionIds] = useState([]);
    const [error, setError] = useState([]);
    const [menuData, setMenuData] = useState([]);
    const [headerloading, setHeaderLoading] = useState(false);
    const [loading, setLoading] = useState(false);
    const [shiftsData, setShiftsData] = useState([]);
    const [contactorsData, setContactorsData] = useState([]);
    const [machinesData, setMachinesData] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [createUsers, setCreateUsers] = useState([]);
    const [selectedShiftId, setSelectedShiftId] = useState(0);
    const [selectedContCLId, setSelectedContCLId] = useState(0);
    const [selectedContId, setSelectedContId] = useState(0);
    const [selectedDepId, setSelectedDepId] = useState('0');
    const [selectedCreatedUserId, setSelectedCreatedUserId] = useState(null);
    const [selectedMCNId, setSelectedMCNId] = useState(null);
    const [selectedYear, setSelectedYear] = useState(today.getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
    const [selectedMCStatus, setSelectedMCStatus] = useState('ALL');
    const [selectedTICStatus, setSelectedTICStatus] = useState('ALL');
    const [selectedVersnStatus, setSelectedVersnStatus] = useState('ALL');
    const [reportHead, setReportHead] = useState("");
    const [unitsData, setUnitsData] = useState([]);
    const [selectedUnitId, setSelectedUnitId] = useState('0');
    const [selectedTypeId, setSelectedTypeId] = useState(0);
    const [contCls, setContCls] = useState([]);
    const [modules, setModules] = useState([]);
    const [headers, setHeaders] = useState([]);
    const [pageCache, setPageCache] = useState({});
    const [navigationPath, setNavigationPath] = useState("");
    const [sessionModuleId, setSessionModuleId] = useState("");
    const [assetTypesData, setAssetTypesData] = useState([]);
    const [docTypesData, setDocTypesData] = useState([]);

    const shouldHideSidebar = location.pathname.includes("=21");
    const searchParams = new URLSearchParams(location.search);
    const reportId = searchParams.get("reportId");

    useEffect(() => {
        const userDataString = sessionStorage.getItem("userData");
        const navigationString = sessionStorage.getItem("navigationPath");
        const storedModule = JSON.parse(localStorage.getItem("ModuleData"));
        const moduleId = storedModule?.Id?.toString();
        if (userDataString) {
            const userData = JSON.parse(userDataString);
            setSessionUserData(userData);
            setNavigationPath(navigationString);
            setSessionModuleId(moduleId);
        } else {
            navigate("/");
        }
    }, [navigate]);

    useEffect(() => {
        const sessionMenuData = sessionStorage.getItem("menuData");
        if (!sessionMenuData) return;

        try {
            const parsedMenu = JSON.parse(sessionMenuData);

            if (ReportId) {
                const reportsMenu = parsedMenu.find(item => item.MenuName === "Reports");

                if (reportsMenu && reportsMenu.SubItems) {
                    const activeReport = reportsMenu.SubItems.find(
                        sub => Number(sub.ReportId) == ReportId
                    );

                    if (activeReport) {
                        const actionIdArray = activeReport.ActionsIds?.split(",").map(Number);
                        setSessionActionIds(actionIdArray);
                    }
                }
            } else {
                console.log("No reportId in URL, checking for module-based menu...");
            }
        } catch (err) {
            console.error("Error parsing menuData:", err);
        }
    }, [location.search]);

    useEffect(() => {
        const sessionMenuData = sessionStorage.getItem("menuData");
        try {
            const parsedMenu = JSON.parse(sessionMenuData);
            setMenuData(parsedMenu)

        } catch (err) {
            console.error("Error parsing menuData:", err);
        }
    }, []);

    const reportFilters = reportHead?.ReportFilter?.split(",") || [];

    const fetchMenuData = async () => {
        try {
            if (!sessionUserData?.Id) return;

            // 1️⃣ Check session storage
            const sessionMenu = sessionStorage.getItem("ModulesDataReport");

            if (sessionMenu) {
                const parsed = JSON.parse(sessionMenu);
                setModules(parsed || []);
                return; // ✅ skip API
            }

            // 2️⃣ Fetch from API
            const response = await fetchWithAuth("auth/getModules", {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });

            if (!response.ok) {
                throw new Error(response.statusText);
            }

            const data = await response.json();
            const allModules = data.ResultData || [];

            // 3️⃣ Get user access
            const userData = JSON.parse(sessionStorage.getItem("userData") || "{}");
            const accessIds = userData?.AccessToModules
                ? userData.AccessToModules.split(",").map(Number)
                : [];

            // 4️⃣ Filter modules
            const filteredModules = allModules.filter((mod) =>
                accessIds.includes(mod.Id)
            );

            // 5️⃣ Set state
            setModules(filteredModules);

            // 6️⃣ Store in session
            sessionStorage.setItem(
                "ModulesDataReport",
                JSON.stringify(filteredModules)
            );
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
        fetchMenuData();
    }, []);

    const fetchReportHead = async () => {
        try {
            setHeaderLoading(true);
            if (sessionUserData && sessionUserData.Id && sessionUserData.OrgId) {
                const response = await fetchWithAuth(`Report/getreporthead?OrgId=${sessionUserData.OrgId}&UserId=${sessionUserData.Id}&ReportId=${ReportId}`, {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                });
                if (response.ok) {
                    const data = await response.json();
                    setReportHead(data.ResultData[0]);
                    setHeaderLoading(false);
                } else {
                    setHeaderLoading(false);
                    console.error('Failed to fetch report header data:', response.statusText);
                }
            }
        } catch (error) {
            setHeaderLoading(false);
            console.error('Error fetching report header data:', error.message);
        }
    };

    const fetchDDLData = async () => {
        try {
            // 1️⃣ Check session storage first
            const sessionDDL = sessionStorage.getItem("DDLReportsData");

            if (sessionDDL) {
                const parsed = JSON.parse(sessionDDL);

                setUnitsData(parsed.units || []);
                setDepartments(parsed.departments || []);
                setCreateUsers(parsed.users || []);

                if (parsed.units?.length > 0) {
                    setSelectedUnitId(parsed.units[0].ItemId);
                }

                return; // ✅ stop API call
            }

            // 2️⃣ Fetch from API if session not available
            const response = await fetchWithAuth(
                `ADMINRoutes/CWIGetDDLItems?OrgId=${sessionUserData?.OrgId}&UserId=0`,
                {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                }
            );

            if (!response.ok) throw new Error("Network response was not ok");

            const data = await response.json();

            const units = data.ResultData.filter(
                (item) => item.DDLName === "UnitLocations"
            );
            const departments = data.ResultData.filter(
                (item) => item.DDLName === "Departments"
            );
            const users = data.ResultData.filter(
                (item) => item.DDLName === "Users"
            );

            // 3️⃣ Set state
            setUnitsData(units);
            setDepartments(departments);
            setCreateUsers(users);

            if (units.length > 0) {
                setSelectedUnitId(units[0].ItemId);
            }

            // 4️⃣ Store in sessionStorage
            sessionStorage.setItem(
                "DDLReportsData",
                JSON.stringify({
                    units,
                    departments,
                    users,
                })
            );
        } catch (error) {
            console.error("Failed to fetch DDL data:", error);
        }
    };

    const fetchAssetsByDeptAndUnit = async () => {
        if (sessionUserData.OrgId && selectedDepId && selectedUnitId) {
            if (sessionUserData.OrgId) {
                try {
                    const response = await fetchWithAuth(
                        `PMMS/getMachinesByStatus?Status=ALL&OrgId=${sessionUserData.OrgId}&DeptId=${selectedDepId}&UnitId=${selectedUnitId}`
                        , {
                            method: "GET",
                            headers: { "Content-Type": "application/json" },
                        });
                    if (response.ok) {
                        const data = await response.json();
                        setMachinesData(data.ResultData);
                    } else {
                        setMachinesData([]);
                        console.error("Failed to fetch machines data:", response.statusText);
                    }
                } catch (error) {
                    setMachinesData([]);
                    console.error("Error fetching machines data:", error.message);
                }
            }
        }
    };

    useEffect(() => {
        if (sessionUserData.OrgId && selectedDepId && selectedUnitId) {
            fetchAssetsByDeptAndUnit();
        }
    }, [sessionUserData, selectedDepId, selectedUnitId]);

    const fetchMasterTypes = async () => {
        if (isFetching) return;
        try {
            setIsFetching(true);
            const storedModule = JSON.parse(localStorage.getItem("ModuleData"));
            const moduleId = storedModule?.Id?.toString();

            let catTypeId = null;

            if (reportFilters.includes("AssetTypeId")) {
                catTypeId = 1; // if asset
            } else if (reportFilters.includes("ContentTypeId")) {
                catTypeId = 2; // if content type
            } else if (reportFilters.includes("AlertTypeId")) {
                catTypeId = 3; // if alert
            }

            if (catTypeId === null) return;

            // const response = await fetchWithAuth(
            //     `Portal/GetMasterTypes?OrgId=${sessionUserData?.OrgId}&DeptId=${selectedDepId}&ModuleId=${moduleId}&TypeCategory=${catTypeId}`,
            //     {
            //         method: "GET",
            //         headers: { "Content-Type": "application/json" },
            //     }
            // );

            const response = await fetchWithAuth(
                `Portal/GetMasterTypes?OrgId=${sessionUserData?.OrgId}&DeptId=${(catTypeId === 2 || (catTypeId === 3 && sessionModuleId == 15)) ? 0 : selectedDepId}&ModuleId=${sessionModuleId}&TypeCategory=${catTypeId}`,
                {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                }
            );

            if (!response.ok) throw new Error("Network response was not ok");

            const data = await response.json();
            setAssetTypesData(data.ResultData || []);

        } catch (error) {
            console.error("Failed to fetch types data:", error);
            setAssetTypesData([]);
        } finally {
            setIsFetching(false);
        }
    };
    
    const filterTrigger = reportFilters
        .filter(rf => ["AssetTypeId", "ContentTypeId", "AlertTypeId"].includes(rf))
        .join(",");

    useEffect(() => {
        if (sessionUserData?.OrgId && selectedDepId && filterTrigger) {
            fetchMasterTypes();
        }
    }, [sessionUserData?.OrgId, selectedDepId, filterTrigger]);

    const fetchShiftsData = async () => {
        try {
            if (!sessionUserData?.OrgId) return;

            // 1️⃣ Check session storage
            const sessionShifts = sessionStorage.getItem("ShiftTimingsReportData");

            if (sessionShifts) {
                const parsed = JSON.parse(sessionShifts);
                setShiftsData(parsed || []);
                return; // ✅ stop API call
            }

            // 2️⃣ Fetch from API
            const response = await fetchWithAuth(
                `contractor/getShiftTimings?OrgId=${sessionUserData.OrgId}`,
                {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                }
            );

            if (!response.ok) {
                throw new Error(response.statusText);
            }

            const data = await response.json();
            const shifts = data.ResultData || [];

            // 3️⃣ Set state
            setShiftsData(shifts);

            // 4️⃣ Store in session
            sessionStorage.setItem(
                "ShiftTimingsReportData",
                JSON.stringify(shifts)
            );
        } catch (error) {
            console.error("Error fetching shifts data:", error.message);
        }
    };

    const fetchContractorsData = async () => {
        try {
            if (!sessionUserData?.OrgId) return;

            // 1️⃣ Check session storage first
            const sessionContractors = sessionStorage.getItem("ContractorsReportData");

            if (sessionContractors) {
                const parsed = JSON.parse(sessionContractors);
                setContactorsData(parsed || []);
                return; // ✅ skip API
            }

            // 2️⃣ Fetch from API
            const response = await fetchWithAuth(
                `contractor/getContractors?OrgId=${sessionUserData.OrgId}&ShiftTypeId=0`,
                {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                }
            );

            if (!response.ok) {
                throw new Error(response.statusText);
            }

            const data = await response.json();
            const contractors = data.ResultData || [];

            // 3️⃣ Set state
            setContactorsData(contractors);

            // 4️⃣ Store in session
            sessionStorage.setItem(
                "ContractorsReportData",
                JSON.stringify(contractors)
            );
        } catch (error) {
            console.error("Error fetching contractors data:", error.message);
        }
    };

    const fetchContractorCLs = async () => {
        if (sessionUserData.OrgId) {
            try {
                const response = await fetchWithAuth(`contractor/getCLS?OrgId=${sessionUserData?.OrgId}&ContractorId=${selectedContId}`, {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                });
                if (response.ok) {
                    const data = await response.json();
                    setContCls(data.ResultData || []);
                } else {
                    console.error('Failed to fetch attendance data:', response.statusText);
                }
            } catch (error) {
                setContCls([]);
                console.error('Error fetching attendance data:', error.message);
            }
        }
    };

    const fetchDocTypes = async () => {
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

            setDocTypesData(data.ResultData || []);

        } catch (error) {
            console.error("Failed to fetch DDL data:", error);
            setDocTypesData([]);
        }
    };

    useEffect(() => {
        if (sessionUserData.OrgId) {
            fetchDocTypes();
        }
    }, [sessionUserData]);

    useEffect(() => {
        if (sessionUserData.OrgId && selectedContId) {
            fetchContractorCLs();
        }
    }, [sessionUserData, selectedContId]);

    useEffect(() => {
        if (sessionUserData.OrgId) {
            fetchReportHead();
            fetchShiftsData();
            fetchContractorsData();
            fetchDDLData();
        }
        if (sessionUserData?.DeptId) {
            setSelectedDepId(sessionUserData.DeptId);
        }

    }, [sessionUserData]);

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const formatDate = (date) => {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    };

    const [selectedFromDt, setSelectedFromDt] = useState(formatDate(startOfMonth));
    const [selectedEndDt, setSelectedEndDt] = useState(formatDate(today));

    const [reportData, setReportData] = useState([]);
    const [totalRecords, setTotalRecords] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const recordsPerPage = 10;

    useEffect(() => {
        setPageCache({}); // clear cache
    }, [selectedFromDt, selectedEndDt, selectedShiftId, selectedDepId, selectedContId, selectedContCLId, selectedMCStatus, selectedTICStatus, selectedMCNId, selectedMonth, selectedYear, selectedUnitId, selectedTypeId, selectedVersnStatus, selectedCreatedUserId]);

    const fetchReport = async (page = 1) => {
        if (pageCache[page]) {
            setReportData(pageCache[page]);
            setLoading(false);
            return;
        }

        if (selectedEndDt < selectedFromDt) {
            Swal.fire({
                icon: "warning",
                title: "Invalid Date Range",
                text: "To Date should be greater than or equal to From Date",
            });
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        const payload = {
            OrgId: sessionUserData.OrgId,
            UserId: sessionUserData.Id,
            ReportId: ReportId,
            Export: 0, // only page data
            ReportCriteria: {
                FromDate: selectedFromDt,
                ToDate: selectedEndDt,
                ShiftTypeId: selectedShiftId || 0,
                DeptId: selectedDepId || 0,
                ContractorId: selectedContId || 0,
                CLId: selectedContCLId || 0,
                MCStatus: selectedMCStatus || "LIVE",
                TICStatus: selectedTICStatus || "ALL",
                MachineId: selectedMCNId || 0,
                Month: selectedMonth || 0,
                Year: selectedYear || 0,
                OrgId: sessionUserData?.OrgId,
                UnitId: selectedUnitId || 0,
                AssetTypeId: selectedTypeId || 0,
                AlertTypeId: 0,
                ContentTypeId: 0,
                CreatedBy: selectedCreatedUserId || 0,
                VersionStatus: selectedVersnStatus || "ALL",
            },
            PageNumber: page,
            PageSize: recordsPerPage,
        };

        try {
            const response = await fetchWithAuth(`Report/getreport`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) throw new Error("Failed to fetch the report");

            const data = await response.json();
            setPageCache((prev) => ({
                ...prev,
                [page]: data.data || [],
            }));

            setReportData(data.data || []);
            setHeaders(data.headers || []);
            setTotalRecords(data.ResultCOunt?.[0]?.ResultCount || 0);
            setLoading(false);

        } catch (error) {
            setError(error.message);
            setReportData([]);
            setLoading(false);
        } finally {
            setLoading(false);
        }
    };

    const totalPages = Math.ceil(totalRecords / recordsPerPage);

    const handlePageClick = (page) => {
        if (page !== "...") {
            setCurrentPage(page);
            fetchReport(page); // 🔥 fetch new page from API
        }
    };

    const handlePrevious = () => {
        if (currentPage > 1) {
            const prev = currentPage - 1;
            setCurrentPage(prev);
            fetchReport(prev);
        }
    };

    const handleNext = () => {
        if (currentPage < totalPages) {
            const next = currentPage + 1;
            setCurrentPage(next);
            fetchReport(next);
        }
    };

    const getPaginationNumbers = () => {
        const totalNumbers = 7; // max buttons visible
        const visiblePages = [];

        if (totalPages <= totalNumbers) {
            // Show all
            for (let i = 1; i <= totalPages; i++) visiblePages.push(i);
        } else {
            const left = Math.max(2, currentPage - 1);
            const right = Math.min(totalPages - 1, currentPage + 1);

            visiblePages.push(1); // always first page

            if (left > 2) visiblePages.push("...");

            for (let i = left; i <= right; i++) {
                visiblePages.push(i);
            }

            if (right < totalPages - 1) visiblePages.push("...");

            visiblePages.push(totalPages); // always last page
        }

        return visiblePages;
    };

    const exportReportToExcel = async () => {
        try {
            const payload = {
                OrgId: sessionUserData.OrgId,
                UserId: sessionUserData.Id,
                ReportId: ReportId,
                Export: 1, // ✅ all rows
                ReportCriteria: {
                    FromDate: selectedFromDt,
                    ToDate: selectedEndDt,
                    ShiftTypeId: selectedShiftId || 0,
                    DeptId: selectedDepId || 0,
                    ContractorId: selectedContId || 0,
                    CLId: selectedContCLId || 0,
                    MCStatus: selectedMCStatus || "LIVE",
                    TICStatus: selectedTICStatus || "ALL",
                    MachineId: selectedMCNId || 0,
                    Month: selectedMonth || 0,
                    Year: selectedYear || 0,
                    OrgId: sessionUserData?.OrgId,
                    UnitId: selectedUnitId || 0,
                    AssetTypeId: selectedTypeId || 0,
                    AlertTypeId: 0,
                    ContentTypeId: 0,
                    CreatedBy: selectedCreatedUserId || 0,
                    VersionStatus: selectedVersnStatus || "ALL",
                },
                PageNumber: 0,
                PageSize: 0,
            };

            const response = await fetchWithAuth(`Report/getreport`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) throw new Error("Failed to fetch export data");

            const data = await response.json();

            // ✅ Format for Excel: Trim whitespace and replace underscores with spaces
            const headers = data.headers?.map((h) => h.replace(/_/g, ' ').trim()) || [];

            const originalKeys = data.headers || [];

            // 2. Create pretty labels for the Excel display (e.g., "DEPT NAME")
            const displayHeaders = originalKeys.map((h) => h.replace(/_/g, ' ').trim().toUpperCase());

            const wsData = [
                [reportHead.ReportTitle || "ReportData"],
                ["Exported: " + new Date().toLocaleString()],
                [],
                displayHeaders, // Use the pretty labels here for the header row
                ...(data.data || []).map((item) =>
                    originalKeys.map((key) => { // Use originalKeys here to map correctly to the object
                        const value = item[key];
                        return value !== null && value !== undefined ? value.toString() : "";
                    })
                ),
            ];

            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.aoa_to_sheet(wsData);
            XLSX.utils.book_append_sheet(wb, ws, "ReportData");
            XLSX.writeFile(wb, `${reportHead.ReportTitle || "ReportData"}.xlsx`);
        } catch (error) {
            console.error("Excel export failed:", error.message);
        }
    };

    const ticStatusOptions = [
        { value: "ALL", label: "ALL" },
        { value: "NEW", label: "NEW" },
        // { value: "MODIFIED", label: "MODIFIED" },
        { value: "APPROVED", label: "APPROVED" },
        { value: "REJECTED", label: "REJECTED" },
        { value: "ASSIGNED", label: "ASSIGNED" },
        // { value: "REQ APPROVAL", label: "REQ APPROVAL" },
        // { value: "REQ APPROVED", label: "REQ APPROVED" },
        // { value: "FILESUPLOAD", label: "FILESUPLOAD" },
        { value: "RESOLVED", label: "RESOLVED" },
        { value: "CLOSED", label: "CLOSED" },
    ];

    const versionStatusOptions = [
        { value: "ALL", label: "ALL" },
        { value: "DRAFT", label: "DRAFT" },
        { value: "PENDING APPROVAL", label: "PENDING APPROVAL" },
        { value: "APPROVED", label: "APPROVED" },
        { value: "REJECTED", label: "REJECTED" },
        { value: "PUBLISHED", label: "PUBLISHED" },
    ];

    const scrollTableRef = useRef(null);

    const scroll = (direction, e) => {
        if (e && e.currentTarget) {
            e.currentTarget.blur();
        }

        const container = scrollTableRef.current; // Target the single ref
        if (container) {
            // Dynamic scroll: scrolls 50% of the visible table width
            const scrollAmount = container.offsetWidth * 0.5;

            container.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    const iconColors = ['#FF6B35', '#00B8D9', '#36B37E', '#FFAB00', '#6554C0', '#FF5630'];
    const showExportBtn = sessionActionIds?.includes(32);

    return (
        <Base1>
            <div className={`d-flex flex-column flex-column-fluid ${headerloading ? 'blurred' : ''}`}>
                <div id="kt_app_toolbar" className="app-toolbar py-3 py-lg-6">
                    <div id="kt_app_toolbar_container" className="app-container container-xxl d-flex flex-stack">
                        <div className={`page-title d-none ${(shouldHideSidebar || reportId === '3') ? 'd-md-block' : 'd-none'}`}>
                            <a href='/vms/vms-dashboard'>
                                <span className="menu-link bg-white shadow-sm me-2 cursor-pointer">
                                    <span className="menu-title"><i className="fa-solid fa-person-walking"></i> Visitors</span>
                                    <span className="menu-arrow"></span>
                                </span>
                            </a>
                            <a href='/report?reportId=3'>
                                <span className="menu-link bg-white shadow-sm me-2 cursor-pointer active">
                                    <span className="menu-title"><i className="fa-solid fa-chart-simple"></i> Report</span>
                                    <span className="menu-arrow"></span>
                                </span>
                            </a>
                        </div>

                        {sessionModuleId === '15' && (
                            <div className="d-flex flex-column w-100">
                                <div className="d-flex align-items-center mb-4">
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
                                <div className="d-flex align-items-center justify-content-between">

                                    <div className={`page-title d-flex flex-column justify-content-center flex-wrap me-3 ${(shouldHideSidebar || reportId === '3') ? 'd-none' : 'd-block'}`}>
                                        <h1 className="page-heading d-flex text-gray-900 fw-bold fs-3 flex-column justify-content-center my-0">
                                            {reportHead && reportHead?.ReportTitle}
                                        </h1>
                                        <ul className="breadcrumb breadcrumb-separatorless fw-semibold fs-7 my-0 pt-1">
                                            <li className="breadcrumb-item text-muted">
                                                <a href={navigationPath} className="text-muted text-hover-primary">Home</a>
                                            </li>
                                            <li className="breadcrumb-item">
                                                <span className="bullet bg-gray-500 w-5px h-2px"></span>
                                            </li>
                                            <li className="breadcrumb-item text-muted">Report</li>
                                        </ul>
                                    </div>

                                    <div className="col-auto d-flex justify-content-end align-items-center">
                                        <Tooltip
                                            title={!showExportBtn ? "You do not have permission to export" : (reportData.length === 0 ? "No data available to export" : "")}
                                        >
                                            {/* The span catches the hover event even when the button is disabled */}
                                            <span className="d-inline-block">
                                                <button
                                                    className={`btn custom-export-btn btn-sm d-flex align-items-center border border-success 
                ${(reportData.length === 0 || !showExportBtn) ? "btn-blur opacity-50" : "btn-glass-shine"}`}
                                                    type="button"
                                                    onClick={exportReportToExcel}
                                                    disabled={reportData.length === 0 || !showExportBtn}
                                                    // pointerEvents: none ensures the button doesn't block the span's events
                                                    style={(!showExportBtn || reportData.length === 0) ? { pointerEvents: 'none' } : {}}
                                                >
                                                    <div className="icon-wrapper">
                                                        <i className={`bi bi-file-earmark-arrow-down fs-2 ${!showExportBtn ? 'text-muted' : 'text-success'}`}></i>
                                                    </div>
                                                    <div className="text-wrapper text-start ms-3">
                                                        <span className="d-block btn-label fw-bold">Export Report</span>
                                                        <small className="d-block btn-subtitle text-uppercase opacity-75">
                                                            {!showExportBtn ? "Access Restricted" : `Excel Format (${totalRecords} rows)`}
                                                        </small>
                                                    </div>
                                                </button>
                                            </span>
                                        </Tooltip>
                                    </div>

                                </div>
                            </div>
                        )}

                        <div className={`page-title mt-4 d-md-none ${(shouldHideSidebar || reportId === '3') ? 'd-block' : 'd-none'}`}>
                            <div className="dropdown d-inline-block">
                                <span
                                    className="menu-link bg-white shadow-sm me-2 dropdown-toggle"
                                    role="button"
                                    data-bs-toggle="dropdown"
                                    aria-expanded="false"
                                >
                                    <span className="menu-title">
                                        <i className="fa-solid fa-grip me-1"></i>
                                    </span>
                                </span>

                                <ul className="dropdown-menu shadow">
                                    {modules.map((mod, index) => (
                                        <li key={index} className="mb-1">
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
                                    ))}
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
                                </ul>
                            </div>

                            <a href='/vms/vms-dashboard'>
                                <span className="menu-link bg-white shadow-sm me-2">
                                    <span className="menu-title"><i className="fa-solid fa-person-walking"></i></span>
                                    <span className="menu-arrow"></span>
                                </span>
                            </a>
                            <a href='/report?reportId=3'>
                                <span className="menu-link bg-white shadow-sm me-2 active">
                                    <span className="menu-title"><i className="fa-solid fa-chart-simple"></i></span>
                                    <span className="menu-arrow"></span>
                                </span>
                            </a>
                        </div>

                        {sessionModuleId !== '15' && (
                            <>
                                <div className={`page-title d-flex flex-column justify-content-center flex-wrap me-3 ${(shouldHideSidebar || reportId === '3') ? 'd-none' : 'd-block'}`}>
                                    <h1 className="page-heading d-flex text-gray-900 fw-bold fs-3 flex-column justify-content-center my-0">{reportHead && reportHead?.ReportTitle}</h1>
                                    <ul className="breadcrumb breadcrumb-separatorless fw-semibold fs-7 my-0 pt-1">
                                        <li className="breadcrumb-item text-muted">
                                            <a href={navigationPath} className="text-muted text-hover-primary">Home</a>
                                        </li>
                                        <li className="breadcrumb-item">
                                            <span className="bullet bg-gray-500 w-5px h-2px"></span>
                                        </li>
                                        <li className="breadcrumb-item text-muted">Report</li>
                                    </ul>
                                </div>

                                <div className="col-auto d-flex justify-content-end align-items-center">
                                    <Tooltip
                                        title={!showExportBtn ? "You do not have permission to export" : (reportData.length === 0 ? "No data available to export" : "")}
                                    >
                                        {/* The span catches the hover event even when the button is disabled */}
                                        <span className="d-inline-block">
                                            <button
                                                className={`btn custom-export-btn btn-sm d-flex align-items-center border border-success 
                ${(reportData.length === 0 || !showExportBtn) ? "btn-blur opacity-50" : "btn-glass-shine"}`}
                                                type="button"
                                                onClick={exportReportToExcel}
                                                disabled={reportData.length === 0 || !showExportBtn}
                                                // pointerEvents: none ensures the button doesn't block the span's events
                                                style={(!showExportBtn || reportData.length === 0) ? { pointerEvents: 'none' } : {}}
                                            >
                                                <div className="icon-wrapper">
                                                    <i className={`bi bi-file-earmark-arrow-down fs-2 ${!showExportBtn ? 'text-muted' : 'text-success'}`}></i>
                                                </div>
                                                <div className="text-wrapper text-start ms-3">
                                                    <span className="d-block btn-label fw-bold">Export Report</span>
                                                    <small className="d-block btn-subtitle text-uppercase opacity-75">
                                                        {!showExportBtn ? "Access Restricted" : `Excel Format (${totalRecords} rows)`}
                                                    </small>
                                                </div>
                                            </button>
                                        </span>
                                    </Tooltip>
                                </div>
                            </>
                        )}
                    </div>
                </div>
                <div id="kt_app_content" className="app-content flex-column-fluid pt-1">
                    <div id="kt_app_content_container" className="app-container container-xxl">
                        <div className="card shadow-sm border-0 rounded-4 mb-5">
                            <div className="card-body p-4 p-md-5 bg-light rounded-4">
                                {/* Header */}
                                <div className="d-flex align-items-center mb-4 border-bottom pb-">
                                    <i className="bi bi-filter-right fs-2 text-primary me-2"></i>
                                    <h5 className="text-gray-800 fw-bolder mb-0">Report Parameters
                                        {/* <span className="text-muted fs-9 fw-normal">(All fields required)</span> */}
                                    </h5>
                                </div>

                                <div className="row g-4 align-items-end">
                                    {/* DATE RANGE SECTION */}
                                    {reportFilters.includes("FromDate") && (
                                        <div className="col-6 col-md-2">
                                            <label className="form-label fw-bold fs-8 text-uppercase">From Date <span className="text-danger">*</span></label>
                                            <input type="date" className="form-control shadow-sm" value={selectedFromDt} style={{ height: "3rem" }} onChange={(e) => setSelectedFromDt(e.target.value)}
                                                onKeyDown={(e) => e.preventDefault()}     // ⛔ blocks typing
                                                onPaste={(e) => e.preventDefault()}
                                            />
                                        </div>
                                    )}

                                    {reportFilters.includes("ToDate") && (
                                        <div className="col-6 col-md-2">
                                            <label className="form-label fw-bold fs-8 text-uppercase">To Date <span className="text-danger">*</span></label>
                                            <input type="date" className="form-control shadow-sm" value={selectedEndDt} min={selectedFromDt} style={{ height: "3rem" }} onChange={(e) => setSelectedEndDt(e.target.value)}
                                                onKeyDown={(e) => e.preventDefault()}     // ⛔ blocks typing
                                                onPaste={(e) => e.preventDefault()} />
                                        </div>
                                    )}

                                    {/* ORGANIZATION SECTION */}
                                    {reportFilters.includes("UnitId") && (
                                        <div className="col-6 col-md-2">
                                            <label className="form-label fw-bold fs-8 text-uppercase">Unit <span className="text-danger">*</span></label>
                                            <Select placeholder="Unit" showSearch value={selectedUnitId || undefined} onChange={(value) => setSelectedUnitId(value)} style={{ width: "100%", height: "3rem" }}>
                                                <Option key="all-units" value={'0'} className="fw-bold text-primary">
                                                    All Units
                                                </Option>
                                                {unitsData?.map((item) => <Option key={item.ItemId} value={item.ItemId}>{item.DisplayValue}</Option>)}
                                            </Select>
                                        </div>
                                    )}

                                    {reportFilters.includes("DeptId") && (
                                        <div className="col-6 col-md-2">
                                            <label className="form-label fw-bold fs-8 text-uppercase">Department<span className="text-danger">*</span></label>
                                            <Select
                                                placeholder="Dept"
                                                showSearch
                                                value={selectedDepId || undefined}
                                                onChange={(value) => {
                                                    setSelectedDepId(value);
                                                    setSelectedCreatedUserId(null);
                                                    setSelectedTypeId(0);
                                                }}
                                                style={{ width: "100%", height: "3rem" }}
                                                optionFilterProp="children"
                                                filterOption={(input, option) =>
                                                    option?.children
                                                        ?.toLowerCase()
                                                        .includes(input.toLowerCase())
                                                }
                                            >
                                                <Option key="all-depts" value={'0'} className="fw-bold text-primary">
                                                    All
                                                </Option>
                                                {departments?.map((dep) => {
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
                                    )}



                                    {reportFilters.some(rf => ["AssetTypeId", "AlertTypeId"].includes(rf)) && (
                                        <div className="col-6 col-md-3">
                                            <label className="form-label fw-bold fs-8 text-uppercase">
                                                {reportFilters.includes("AssetTypeId")
                                                    ? "Asset Type"
                                                    : reportFilters.includes("ContentTypeId")
                                                        ? "Document Type"
                                                        : "Alert Type"}
                                            </label>

                                            <Select
                                                showSearch
                                                allowClear
                                                placeholder="Select Type"
                                                value={selectedTypeId ?? undefined}
                                                style={{ width: "100%", height: "3rem" }}
                                                onChange={(value) => setSelectedTypeId(value)}
                                                optionFilterProp="children"
                                            >
                                                {/* ✅ All Option */}
                                                <Option value={0}>All</Option>

                                                {assetTypesData?.map((assTyp) => (
                                                    <Option key={assTyp.Id} value={assTyp.Id}>
                                                        {assTyp.TypeName}
                                                    </Option>
                                                ))}
                                            </Select>
                                        </div>
                                    )}
                                    {reportFilters.includes("ContentTypeId") && (
                                        <div className="col-6 col-md-3">
                                            <label className="form-label fw-bold fs-8 text-uppercase">
                                                Document Type
                                            </label>

                                            <Select
                                                showSearch
                                                allowClear
                                                placeholder="Select Type"
                                                value={selectedTypeId ?? undefined}
                                                style={{ width: "100%", height: "3rem" }}
                                                onChange={(value) => setSelectedTypeId(value)}
                                                optionFilterProp="children"
                                            >
                                                <Option value={0}>All</Option>
                                                {docTypesData?.map((docTyp) => (
                                                    <Option key={docTyp.MasterTypeId} value={docTyp.MasterTypeId}>
                                                        {docTyp.TypeName}
                                                    </Option>
                                                ))}
                                            </Select>
                                        </div>
                                    )}

                                    {/* ASSET SEARCH */}
                                    {reportFilters.includes("MachineId") && (
                                        <div className="col-12 col-md-3">
                                            <label className="form-label fw-bold fs-8 text-uppercase">Asset</label>
                                            <Select showSearch allowClear placeholder="Select Asset" value={selectedMCNId} style={{ width: "100%", height: "3rem" }} onChange={(value) => setSelectedMCNId(value)} optionFilterProp="label">
                                                {machinesData?.map((mcn, idx) => (
                                                    <Option key={idx} value={mcn.AssetId} label={`${mcn.AssetName} ${mcn.AssetCode}`}>
                                                        {mcn.AssetName} : <span className="text-primary fw-bold">{mcn.AssetCode}</span>
                                                    </Option>
                                                ))}
                                            </Select>
                                        </div>
                                    )}

                                    {/* STATUS DROPDOWNS */}
                                    {reportFilters.includes("MCStatus") && (
                                        <div className="col-6 col-md-2">
                                            <label className="form-label fw-bold fs-8 text-uppercase">
                                                Status <span className="text-danger">*</span>
                                            </label>
                                            <Select
                                                placeholder="Select Status"
                                                // Use ?? to allow "" (All) to be a valid value without falling back to undefined
                                                value={selectedMCStatus ?? undefined}
                                                onChange={(value) => setSelectedMCStatus(value)}
                                                style={{ width: "100%", height: "3rem" }}
                                                showSearch
                                                optionFilterProp="children"
                                            >
                                                {/* The "All" Option */}
                                                <Option key="ALL" value="ALL" className="fw-bold text-primary">
                                                    All Statuses
                                                </Option>

                                                {/* Status Options */}
                                                {["OUTOFSERVICE", "DRAFT", "PENDING APPROVAL", "APPROVED", "REJECTED", "ACTIVE"].map(s => (
                                                    <Option key={s} value={s}>
                                                        {/* Converts "PENDING APPROVAL" to "Pending Approval" for better UI */}
                                                        {s.toLowerCase().replace(/\b\w/g, char => char.toUpperCase())}
                                                    </Option>
                                                ))}
                                            </Select>
                                        </div>
                                    )}

                                    {reportFilters.includes("TICStatus") && (
                                        <div className="col-6 col-md-2">
                                            <label className="form-label fw-bold fs-8 text-uppercase">Ticket Status <span className="text-danger">*</span></label>
                                            <Select showSearch placeholder="Ticket Status" value={selectedTICStatus} onChange={(value) => setSelectedTICStatus(value)} options={ticStatusOptions} style={{ width: "100%", height: "3rem" }} />
                                        </div>
                                    )}

                                    {reportFilters.includes("VersionStatus") && (
                                        <div className="col-6 col-md-2">
                                            <label className="form-label fw-bold fs-8 text-uppercase">Version Status <span className="text-danger">*</span></label>
                                            <Select showSearch placeholder="Ver Status" value={selectedVersnStatus} onChange={(value) => setSelectedVersnStatus(value)} options={versionStatusOptions} style={{ width: "100%", height: "3rem" }} />
                                        </div>
                                    )}
                                    {reportFilters.includes("CreatedBy") && (
                                        <div className="col-12 col-md-3">
                                            <label className="form-label fw-bold fs-8 text-uppercase">
                                                Created By
                                            </label>

                                            <Select
                                                showSearch
                                                allowClear
                                                placeholder="Select User"
                                                value={selectedCreatedUserId || undefined}
                                                style={{ width: "100%", height: "3rem" }}
                                                onChange={(value) => setSelectedCreatedUserId(value)}

                                                // ✅ Display both values after selection
                                                optionLabelProp="label"

                                                // ✅ Search by both ItemValue + DisplayValue
                                                filterOption={(input, option) => {
                                                    const label = option?.label?.toLowerCase() || "";
                                                    return label.includes(input.toLowerCase());
                                                }}
                                            >
                                                {createUsers
                                                    ?.filter((u) => String(u.ConditionalId1) === String(selectedDepId))
                                                    .map((item) => (
                                                        <Option
                                                            key={item.ItemId}
                                                            value={item.ItemId}

                                                            // ✅ This is what will show in selected box
                                                            label={`${item.ItemValue} - ${item.DisplayValue}`}
                                                        >
                                                            {/* Dropdown UI */}
                                                            <div className="d-flex flex-column">
                                                                <span className="fw-bold fs-7">{item.ItemValue}</span>
                                                                <span className="text-muted fs-9">{item.DisplayValue}</span>
                                                            </div>
                                                        </Option>
                                                    ))}
                                            </Select>
                                        </div>
                                    )}
                                    {reportFilters.includes("Year") && (
                                        <div className="col-6 col-md-1">
                                            <label className="form-label fw-bold fs-8 text-uppercase">
                                                Year <span className="text-danger">*</span>
                                            </label>

                                            <Select
                                                showSearch
                                                value={selectedYear}
                                                style={{ width: "100%", height: "3rem" }}
                                                placeholder="Select Year"
                                                onChange={(value) => setSelectedYear(value)}
                                                optionFilterProp="label"
                                                options={[
                                                    { label: new Date().getFullYear() - 1, value: new Date().getFullYear() - 1 },
                                                    { label: new Date().getFullYear(), value: new Date().getFullYear() },
                                                    { label: new Date().getFullYear() + 1, value: new Date().getFullYear() + 1 }
                                                ]}
                                            />
                                        </div>
                                    )}

                                    {reportFilters.includes("Month") && (
                                        <div className="col-6 col-md-2">
                                            <label className="form-label fw-bold fs-8 text-uppercase">
                                                Month <span className="text-danger">*</span>
                                            </label>

                                            <Select
                                                showSearch
                                                value={selectedMonth}
                                                placeholder="Select Month"
                                                style={{ width: "100%", height: "3rem" }}
                                                optionFilterProp="label"
                                                onChange={(value) => setSelectedMonth(value)}
                                                options={[
                                                    { label: "January", value: 1 },
                                                    { label: "February", value: 2 },
                                                    { label: "March", value: 3 },
                                                    { label: "April", value: 4 },
                                                    { label: "May", value: 5 },
                                                    { label: "June", value: 6 },
                                                    { label: "July", value: 7 },
                                                    { label: "August", value: 8 },
                                                    { label: "September", value: 9 },
                                                    { label: "October", value: 10 },
                                                    { label: "November", value: 11 },
                                                    { label: "December", value: 12 },
                                                ]}
                                            />
                                        </div>
                                    )}

                                    {reportFilters.includes("ContractorId") && (
                                        <div className="col-6 col-md-2">
                                            <label className="form-label fw-bold fs-8 text-uppercase">
                                                Contractor
                                            </label>

                                            <Select
                                                showSearch
                                                allowClear
                                                value={selectedContId}
                                                placeholder="Select Contractor"
                                                style={{ width: "100%", height: "3rem" }}
                                                optionFilterProp="label"
                                                onChange={(value) => setSelectedContId(value)}
                                                options={[
                                                    { label: "All", value: 0 },   // 👈 All option
                                                    ...(contactorsData?.map(item => ({
                                                        label: item.ContractorName,
                                                        value: item.Id
                                                    })) || [])
                                                ]}
                                            />
                                        </div>
                                    )}

                                    {reportFilters.includes("CLId") && (
                                        <div className="col-12 col-md-3">
                                            <label className="form-label fw-bold fs-8 text-uppercase">CL </label>
                                            <Select placeholder="Select CL" showSearch allowClear value={selectedContCLId || undefined}
                                                onChange={(value) => setSelectedContCLId(value)}
                                                style={{ width: "100%", height: "3rem" }} optionFilterProp="label">
                                                {contCls?.map((item) => (
                                                    <Option key={item.Id} value={item.Id} label={`${item.Name} ${item.AadharNo}`}>
                                                        <div className="d-flex justify-content-between">
                                                            <span className="fw-bold">{item.Name}</span>
                                                            <span className="text-muted fs-9">{item.AadharNo}</span>
                                                        </div>
                                                    </Option>
                                                ))}
                                            </Select>
                                        </div>
                                    )}

                                    {/* SHIFT */}
                                    {reportFilters.includes("ShiftTypeId") && (
                                        <div className="col-6 col-md-2">
                                            <label className="form-label fw-bold fs-8 text-uppercase">Shift </label>
                                            <Select
                                                showSearch
                                                allowClear
                                                value={selectedShiftId ?? undefined}
                                                placeholder="Select Shift"
                                                style={{ width: "100%", height: "3rem" }}
                                                optionFilterProp="label"
                                                onChange={(value) => setSelectedShiftId(value)}
                                                options={[
                                                    { label: "All", value: 0 },   // 👈 All shifts
                                                    ...(shiftsData?.map(item => ({
                                                        label: item.ShiftName,
                                                        value: item.Id
                                                    })) || [])
                                                ]}
                                            />
                                        </div>
                                    )}

                                    <div className="col-12 col-md-auto ms-auto pt-2">
                                        <button
                                            className="btn btn-primary w-100 shadow-sm d-flex align-items-center justify-content-center px-10"
                                            type="button"
                                            disabled={loading}
                                            style={{ height: "3.2rem", minWidth: "150px" }}
                                            onClick={() => fetchReport()}
                                        >
                                            {loading ? <span className="spinner-border spinner-border-sm me-2"></span> : <i className="bi bi-file-earmark-bar-graph me-2"></i>}
                                            Get Report
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="card mt-5 mb-8 shadow-sm border-0 rounded-4 overflow-hidden">

                            <div className="d-flex align-items-center justify-content-between p-2">
                                {/* Left Side: Summary Stats */}
                                <div className="d-flex align-items-center">
                                    <div className="symbol symbol-40px me-3">
                                        <div className="symbol-label bg-light-primary">
                                            <i className="bi bi-list-check text-primary fs-2"></i>
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-gray-800 fw-bolder fs-6 d-block">Report Records</span>
                                        <span className="text-muted fw-bold fs-7">
                                            Total: <span className="text-primary">{totalRecords || 0}</span> entries
                                        </span>
                                    </div>
                                </div>

                                {/* Right Side: Navigation Buttons */}
                                <div className="d-flex gap-2">
                                    <button
                                        type="button"
                                        className="btn btn-icon btn-sm btn-light-primary rounded-circle shadow-sm hover-elevate-up"
                                        onClick={(e) => scroll('left', e)}
                                    >
                                        <i className="fa fa-chevron-left fs-9"></i>
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-icon btn-sm btn-light-primary rounded-circle shadow-sm hover-elevate-up"
                                        onClick={(e) => scroll('right', e)}
                                    >
                                        <i className="fa fa-chevron-right fs-9"></i>
                                    </button>
                                </div>
                            </div>

                            <div className="table-responsive d-none d-md-block"
                                ref={scrollTableRef} // Direct reference
                                style={{ overflowX: 'auto', scrollBehavior: 'smooth' }}
                            >
                                <table className="table align-middle table-hover gs-7 gy-5 mb-0">
                                    <thead className="bg-light-primary">
                                        <tr className="text-start text-muted fw-bold fs-7 text-uppercase gs-0 border-bottom-2 border-primary">
                                            {headers && headers?.map((header, index) => (
                                                <th
                                                    key={index}
                                                    className="ps-4 text-dark"
                                                    style={{
                                                        minWidth: "130px",
                                                        whiteSpace: "nowrap", // Prevents headers from wrapping to 2 lines
                                                        letterSpacing: "0.5px",
                                                        position: index === 0 ? "sticky" : "static",
                                                        left: index === 0 ? 0 : "auto",
                                                        zIndex: index === 0 ? 10 : 1,
                                                        backgroundColor: index === 0 ? "#e9f3ff" : "inherit",
                                                    }}
                                                >
                                                    {header.replace(/_/g, ' ').trim()}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>

                                    <tbody className="fw-semibold text-gray-700">
                                        {reportData.length > 0 ? (
                                            reportData.map((row, rowIndex) => (
                                                <tr key={rowIndex} className="border-bottom border-gray-200 transition-all">
                                                    {headers.map((header, colIndex) => {
                                                        const cellValue = row[header];
                                                        const isLongText = cellValue?.toString().length > 10;
                                                        return (
                                                            <td
                                                                key={colIndex}
                                                                className="ps-4 py-5"
                                                                style={{
                                                                    position: colIndex === 0 ? "sticky" : "static",
                                                                    left: colIndex === 0 ? 0 : "auto",
                                                                    zIndex: colIndex === 0 ? 5 : 1,
                                                                    backgroundColor: colIndex === 0 ? "#fff" : "transparent",
                                                                    boxShadow: colIndex === 0 ? "inset -1px 0 0 #eff2f5" : "none"
                                                                }}
                                                            >
                                                                {cellValue !== undefined && cellValue !== "" ? (
                                                                    isLongText ? (
                                                                        <Tooltip title={cellValue.toString()} color="#009ef7">
                                                                            <span
                                                                                className="text-gray-800 d-inline-block cursor-pointer"
                                                                                style={{
                                                                                    maxWidth: "150px",
                                                                                    whiteSpace: "nowrap",
                                                                                    overflow: "hidden",
                                                                                    textOverflow: "ellipsis"
                                                                                }}
                                                                            >
                                                                                {cellValue}
                                                                            </span>
                                                                        </Tooltip>
                                                                    ) : (
                                                                        <span className="text-gray-800">{cellValue}</span>
                                                                    )
                                                                ) : (
                                                                    <span className="badge badge-light-secondary text-muted fw-normal">N/A</span>
                                                                )}
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            ))
                                        ) : (
                                            <tr className="w-100">
                                                <td colSpan={headers?.length || 12} className="w-100">
                                                    <div className="d-flex flex-column align-items-center">
                                                        <i className="bi bi-inbox fs-3x text-gray-300 mb-3"></i>
                                                        <span className="text-gray-500 fs-5">No matching records found</span>
                                                        <span className="text-muted fs-7">Try adjusting your mandatory filters above</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Card View */}
                            <div className="d-block d-md-none">
                                {reportData.length > 0 ? (
                                    reportData.map((row, rowIndex) => (
                                        <div
                                            key={rowIndex}
                                            className="border rounded p-3 mb-3 shadow-sm bg-white"
                                        >
                                            {headers?.map((header, colIndex) => (
                                                <div
                                                    key={colIndex}
                                                    className="d-flex justify-content-between align-items-center mb-2"
                                                >
                                                    <strong className="text-muted">{header.trim()}</strong>
                                                    <span className="text-dark">{row[header.trim()] || "N/A"}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center p-3">No records found</div>
                                )}
                            </div>

                            {/* Pagination */}
                            <div className="dt-paging paging_simple_numbers mt-3">
                                <nav aria-label="pagination">
                                    <ul className="pagination justify-content-center">
                                        <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
                                            <button className="page-link" onClick={handlePrevious}>&laquo;</button>
                                        </li>

                                        {getPaginationNumbers().map((page, index) => (
                                            <li key={index} className={`page-item ${page === currentPage ? "active" : ""}`}>
                                                <button
                                                    className="page-link"
                                                    onClick={() => handlePageClick(page)}
                                                    disabled={page === "..."}
                                                >
                                                    {page}
                                                </button>
                                            </li>
                                        ))}

                                        <li className={`page-item ${currentPage === totalPages ? "disabled" : ""}`}>
                                            <button className="page-link" onClick={handleNext}>&raquo;</button>
                                        </li>
                                    </ul>
                                </nav>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style>
                {`
                .table {
                    border-collapse: collapse !important;
                }

                .table th,
                .table td {
                    border: 1px solid #dee2e6 !important;
                }
                .btn-glass-shine {
                    position: relative;
                    overflow: hidden;
                    background: linear-gradient(135deg, #ffffff, #f0fff4);
                    transition: all 0.3s ease;
                }

                .btn-glass-shine::before {
                    content: "";
                    position: absolute;
                    top: 0;
                    left: -75%;
                    width: 50%;
                    height: 100%;
                    background: linear-gradient(
                        120deg,
                        rgba(255,255,255,0.2),
                        rgba(255,255,255,0.6),
                        rgba(255,255,255,0.2)
                    );
                    transform: skewX(-20deg);
                    animation: shineMove 2.5s infinite;
                }

                @keyframes shineMove {
                    0% {
                        left: -75%;
                    }
                    100% {
                        left: 125%;
                    }
                }
                    .btn-blur {
                    opacity: 0.5;
                    filter: blur(0.4px);
                    pointer-events: none;
                    transition: all 0.2s ease;
                }

                .hide-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .hide-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }

                /* Button styling for arrows */
                .btn-icon {
                    width: 28px;
                    height: 28px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s ease;
                }

                .btn-icon:hover {
                    background-color: #0095e8 !important;
                    color: white !important;
                }

                /* Ensure table doesn't collapse */
                
                /* Container Button Styling */
                    .custom-export-btn {
                        background: #ffffff;
                        border: 1px solid #e1e1e1;
                        border-radius: 12px;
                        padding: 8px 18px;
                        transition: all 0.3s ease;
                        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
                        position: relative;
                        overflow: hidden;
                    }

                    /* Label Styling */
                    .custom-export-btn .btn-label {
                        font-weight: 700;
                        color: #2c3e50;
                        font-size: 0.95rem;
                        line-height: 1.2;
                    }

                    .custom-export-btn .btn-subtitle {
                        font-size: 0.65rem;
                        color: #27ae60; /* Success Green */
                        letter-spacing: 1px;
                    }

                    /* Icon Section */
                    .custom-export-btn .icon-wrapper {
                        color: #27ae60;
                        transition: transform 0.3s ease;
                    }

                    /* Hover Effects */
                    .custom-export-btn:hover:not(:disabled) {
                        background: #f8fff9;
                        border-color: #27ae60;
                        transform: translateY(-2px);
                        box-shadow: 0 6px 12px rgba(39, 174, 96, 0.15);
                    }

                    .custom-export-btn:hover:not(:disabled) .icon-wrapper {
                        transform: scale(1.1);
                        animation: excelPulse 0.8s infinite alternate ease-in-out;
                    }

                    /* Disabled State */
                    .custom-export-btn:disabled {
                        opacity: 0.6;
                        cursor: not-allowed;
                        filter: grayscale(1);
                    }

                    /* Pulse Animation */
                    @keyframes excelPulse {
                        0% { transform: translateY(0); }
                        100% { transform: translateY(-3px); }
                    }
                .transition-all { transition: all 0.2s ease; }
                    .table-hover tbody tr:hover {
                        background-color: rgba(0, 158, 247, 0.03) !important;
                        transform: scale(1.001);
                    }
                    .bg-light-primary { background-color: #f1faff; }
                    .border-bottom-2 { border-bottom-width: 2px !important; }
                    .blurred {
                        filter: blur(2px);
                        pointer-events: none;
                    }
                        .excel-download-btn:hover i {
                        animation: excelPulse 0.8s ease-in-out;
                    }

                    @keyframes excelPulse {
                        0% {
                            transform: scale(1);
                        }
                        50% {
                            transform: scale(1.15);
                        }
                        100% {
                            transform: scale(1);
                        }
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
        </Base1>
    )
}