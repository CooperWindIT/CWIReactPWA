import React, { useState, useEffect } from "react";
import Base1 from "../Config/Base1";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { BASE_API, VMS_URL, VMS_URL_CONTRACTOR, VMS_URL_REPORT } from "../Config/Config";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import PDFEXCELLOGO from '../Assests/Images/cwilogo.png';
import '../Config/Loader.css';
import Swal from "sweetalert2";
import { Select } from "antd";
import { fetchWithAuth } from "../../utils/api";

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
    const [error, setError] = useState([]);
    const [headerloading, setHeaderLoading] = useState(false);
    const [loading, setLoading] = useState(false);
    const [report, setReport] = useState("");
    const [shiftsData, setShiftsData] = useState([]);
    const [contactorsData, setContactorsData] = useState([]);
    const [machinesData, setMachinesData] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [selectedShiftId, setSelectedShiftId] = useState(null);
    const [selectedContCLId, setSelectedContCLId] = useState(null);
    const [selectedContId, setSelectedContId] = useState(null);
    const [selectedDepId, setSelectedDepId] = useState('');
    const [selectedMCNId, setSelectedMCNId] = useState('');
    const [selectedYear, setSelectedYear] = useState(today.getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
    const [selectedMCStatus, setSelectedMCStatus] = useState('');
    const [selectedTICStatus, setSelectedTICStatus] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [reportHead, setReportHead] = useState("");
    const [unitsData, setUnitsData] = useState([]);
    const [selectedUnitId, setSelectedUnitId] = useState(null);
    const [contCls, setContCls] = useState([]);
    const [modules, setModules] = useState([]);

    const { data, headers } = report;

    const [navigationPath, setNavigationPath] = useState("");

    const shouldHideSidebar = location.pathname.includes("/vms/");
    const searchParams = new URLSearchParams(location.search);
    const reportId = searchParams.get("reportId");

    useEffect(() => {
        const userDataString = sessionStorage.getItem("userData");
        const navigationString = sessionStorage.getItem("navigationPath");
        if (userDataString) {
            const userData = JSON.parse(userDataString);
            setSessionUserData(userData);
            setNavigationPath(navigationString);
        } else {
            navigate("/");
        }
    }, [navigate]);

    const fetchMenuData = async () => {
        try {
            const response = await fetchWithAuth("auth/getModules", {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });

            if (response.ok) {
                const data = await response.json();
                const allModules = data.ResultData || [];

                // Get user access from sessionStorage
                const userData = JSON.parse(sessionStorage.getItem("userData") || "{}");
                const accessIds = userData?.AccessToModules
                    ? userData.AccessToModules.split(",").map(Number)
                    : [];

                // Filter modules by access ID
                const filteredModules = allModules.filter((mod) =>
                    accessIds.includes(mod.Id)
                );

                setModules(filteredModules);
            } else {
                console.error("Failed to fetch menu data:", response.statusText);
            }
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

    const fetchDepartmentsData = async () => {
        try {
            if (sessionUserData.OrgId) {
                const response = await fetchWithAuth(`auth/getDepts?OrgId=${sessionUserData.OrgId}`, {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                });
                if (response.ok) {
                    const data = await response.json();
                    setDepartments(data.ResultData);
                } else {
                    console.error('Failed to fetch shifts data:', response.statusText);
                }
            }
        } catch (error) {
            console.error('Error fetching shifts data:', error.message);
        }
    };

    const fetchUnitsData = async () => {
        try {
            const response = await fetchWithAuth(`ADMINRoutes/CWIGetDDLItems?OrgId=${sessionUserData?.OrgId}&UserId=0`, {
                method: "GET",
                    headers: { "Content-Type": "application/json" },
            });
            if (!response.ok) throw new Error("Network response was not ok");
            
            const data = await response.json();
            
            const filteredData = data.ResultData.filter(
                (item) => item.DDLName === "UnitLocations"
            );
            
            setUnitsData(filteredData);
            if (filteredData.length > 0) {
                setSelectedUnitId(filteredData[0].ItemId);
            }
        } catch (error) {
            console.error("Failed to fetch UnitLocations:", error);
        }
    }

    const fetchShiftsData = async () => {
        try {
            if (sessionUserData && sessionUserData.OrgId) {
                const response = await fetchWithAuth(`contractor/getShiftTimings?OrgId=${sessionUserData.OrgId}`, {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                });
                if (response.ok) {
                    const data = await response.json();
                    setShiftsData(data.ResultData);
                } else {
                    console.error('Failed to fetch shifts data:', response.statusText);
                }
            }
        } catch (error) {
            console.error('Error fetching shifts data:', error.message);
        }
    };

    const fetchContractorsData = async () => {
        try {
            if (sessionUserData && sessionUserData.OrgId) {
                const response = await fetchWithAuth(`contractor/getContractors?OrgId=${sessionUserData.OrgId}&ShiftTypeId=0`, {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                });
                if (response.ok) {
                    const data = await response.json();
                    setContactorsData(data.ResultData);
                } else {
                    console.error('Failed to fetch attendance data:', response.statusText);
                }
            }
        } catch (error) {
            console.error('Error fetching attendance data:', error.message);
        } finally {
            // setDataLoading(false);
        }
    };

    const fetchMCNSData = async () => {
        try {
            const response = await fetchWithAuth(`PMMS/GetMachinesByOrgId?OrgId=${sessionUserData.OrgId}`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });
            if (response.ok) {
                const data = await response.json();
                setMachinesData(data.ResultData);
            } else {
                console.error('Failed to fetch machines data:', response.statusText);
            }
        } catch (error) {
            console.error('Error fetching machines data:', error.message);
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

    useEffect(() => {
        if (sessionUserData.OrgId && selectedContId) {
            fetchContractorCLs();
        }
    }, [sessionUserData, selectedContId]);

    useEffect(() => {
        if (sessionUserData.OrgId) {
            fetchReportHead();
            fetchDepartmentsData();
            fetchShiftsData();
            fetchContractorsData();
            fetchMCNSData();
            fetchUnitsData();
        }
    }, [sessionUserData]);

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const formatDate = (date) => {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    };

    const [selectedFromDt, setSelectedFromDt] = useState(formatDate(startOfMonth));
    const [selectedEndDt, setSelectedEndDt] = useState(formatDate(today));

    const recordsPerPage = 10;
    const totalPages = Math.ceil((data?.length || 0) / recordsPerPage);

    // Get current records to display
    const indexOfLastRecord = currentPage * recordsPerPage;
    const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
    const currentRecords = (data || []).slice(indexOfFirstRecord, indexOfLastRecord);

    const getPaginationNumbers = () => {
        const totalNumbers = 7; // how many numbers max to show (including ...)
        const visiblePages = [];
      
        if (totalPages <= totalNumbers) {
          // show all pages if small
          for (let i = 1; i <= totalPages; i++) visiblePages.push(i);
        } else {
          const left = Math.max(2, currentPage - 1);
          const right = Math.min(totalPages - 1, currentPage + 1);
      
          visiblePages.push(1); // always show first page
      
          if (left > 2) visiblePages.push("..."); // gap before current
      
          for (let i = left; i <= right; i++) {
            visiblePages.push(i);
          }
      
          if (right < totalPages - 1) visiblePages.push("..."); // gap after current
      
          visiblePages.push(totalPages); // always show last page
        }
      
        return visiblePages;
      };
      

    const handlePageClick = (page) => {
        if (page !== "...") setCurrentPage(page);
    };

    const handlePrevious = () => {
        if (currentPage > 1) setCurrentPage(currentPage - 1);
    };

    const handleNext = () => {
        if (currentPage < totalPages) setCurrentPage(currentPage + 1);
    };

    const fetchReport = async (e) => {
        // e.preventDefault();

        if (selectedEndDt < selectedFromDt) {
            Swal.fire({
                icon: 'warning',
                title: 'Invalid Date Range',
                text: 'To Date should be greater than or equal to From Date',
            });
            return;
        }

        setLoading(true);
        setError(null);

        const payload = {
            "OrgId": sessionUserData.OrgId,
            "UserId": sessionUserData.Id,
            "ReportId": ReportId,
            "ReportCriteria": {
                "FromDate": selectedFromDt,
                "ToDate": selectedEndDt,
                "ShiftTypeId": selectedShiftId || 0,
                "DeptId": selectedDepId || 0,
                "ContractorId": selectedContId || 0,
                "CLId": selectedContCLId || 0,
                // "AadharNo": 0,
                "MCStatus": selectedMCStatus || "LIVE",
                "TICStatus": selectedTICStatus || "NEW",
                "MachineId": selectedMCNId || 0,
                "Month": selectedMonth || 0,
                "Year": selectedYear || 0,
                "OrgId": sessionUserData?.OrgId,
                "UnitId": selectedUnitId || 0,
            },
        }

        try {
            const response = await fetchWithAuth(`Report/getreport`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                setLoading(false);
                throw new Error("Failed to fetch the report");
            }

            const data = await response.json();
            setLoading(false);
            setReport(data);
        } catch (error) {
            setLoading(false);
            setError(error.message);
            setReport("");
        } finally {
            setLoading(false);
        }
    };

    const reportFilters = reportHead?.ReportFilter?.split(",") || [];

    const generatePDF = () => {
        if (!report?.data || report.data.length === 0) {
            console.warn("No data available for PDF generation.");
            return;
        }

        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();

        doc.setProperties({
            title: reportHead.ReportTitle || "Report Data",
            author: "Your Name",
            creator: "Your Application",
        });

        const imgWidth = 50;
        const imgHeight = 20;
        const imgX = (pageWidth - imgWidth) / 2;

        doc.addImage(PDFEXCELLOGO, "PNG", imgX, 5, imgWidth, imgHeight);

        doc.setFontSize(16);
        doc.text(reportHead.ReportTitle || "Report Data", 10, 30);

        const headers = report.headers.map(header => header.trim());
        const tableData = report.data.map(item =>
            headers.map(header =>
                item[header] !== null && item[header] !== undefined
                    ? item[header].toLocaleString("en-IN")
                    : "0"
            )
        );

        autoTable(doc, {
            startY: 35,
            head: [headers],
            body: tableData,
        });

        doc.save(`${reportHead.ReportTitle || "ReportsData"}.pdf`);
    };

    const generateEXCEL = () => {
        if (!report?.data || report.data.length === 0) {
            console.warn("No data available for Excel generation.");
            return;
        }

        const wb = XLSX.utils.book_new();
        const headers = report.headers.map(header => header.trim());

        const wsData = [
            [reportHead.ReportTitle || "ReportData"],
            ["Logo: Attached in PDF"],
            [],
            headers,
            ...report.data.map((item) =>
                headers.map(header =>
                    item[header] !== null && item[header] !== undefined
                        ? item[header].toLocaleString("en-IN")
                        : "0"
                )
            )
        ];

        const ws = XLSX.utils.aoa_to_sheet(wsData);
        XLSX.utils.book_append_sheet(wb, ws, "ReportData");
        XLSX.writeFile(wb, `${reportHead.ReportTitle || "ReportData"}.xlsx`);
    };

    const formatAadhar = (aadhar) => {
        if (!aadhar) return "";
        return aadhar.toString().replace(/(\d{4})(\d{4})(\d{4})/, "$1 $2 $3");
    };

    const iconColors = ['#FF6B35', '#00B8D9', '#36B37E', '#FFAB00', '#6554C0', '#FF5630'];

    return (
        <Base1>
            <div className={`d-flex flex-column flex-column-fluid ${headerloading ? 'blurred' : ''}`}>
                <div id="kt_app_toolbar" className="app-toolbar py-3 py-lg-6">
                    <div id="kt_app_toolbar_container" className="app-container container-xxl d-flex flex-stack">
                        <div className={`page-title d-none ${(shouldHideSidebar || reportId === '3') ? 'd-md-block' : 'd-none'}`}>
                            <div className="dropdown d-inline-block">
                                <span
                                    className="menu-link bg-white shadow-sm me-2 dropdown-toggle"
                                    role="button"
                                    data-bs-toggle="dropdown"
                                    aria-expanded="false"
                                >
                                    <span className="menu-title">
                                        <i className="fa-solid fa-grip me-1"></i> Portal
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
                        <div className="col-2 d-flex justify-content-end ">
                            <button className={`btn border border-md-none border-danger p-0 me-2 ${currentRecords.length === 0 ? 'd-none' : 'd-block'}`}
                                type="button "
                                onClick={generatePDF}
                                disabled={currentRecords.length === 0}
                            >
                                <i class="fa-regular fa-file-lines text-danger fs-1 p-3"></i>
                            </button>
                            <button className={`btn border border-md-none border-success p-0 me-2 ${currentRecords.length === 0 ? 'd-none' : 'd-block'}`}
                                type="button"
                                onClick={generateEXCEL}
                                disabled={currentRecords.length === 0}
                            >
                                <i class="fa-regular fa-file-excel text-success fs-1 p-3"></i>
                            </button>
                        </div>
                    </div>
                </div>
                <div id="kt_app_content" className="app-content flex-column-fluid pt-1">
                    <div id="kt_app_content_container" className="app-container container-xxl">
                        <div className="d-flex jusitify-content-between align-items-end">
                            <div className="row col-12 col-md-10">
                                {reportFilters.includes("FromDate") && (
                                    <div className="col-6 col-md-2">
                                        <label className="form-label">From Date</label>
                                        <input
                                            type="date"
                                            className="form-control"
                                            value={selectedFromDt}
                                            onChange={(e) => setSelectedFromDt(e.target.value)}
                                        />
                                    </div>
                                )}
                                {reportFilters.includes("ToDate") && (
                                    <div className="col-6 col-md-2">
                                        <label className="form-label">To Date</label>
                                        <input
                                            type="date"
                                            className="form-control"
                                            value={selectedEndDt}
                                            min={selectedFromDt}
                                            onChange={(e) => setSelectedEndDt(e.target.value)}
                                        />
                                    </div>
                                )}
                                {reportFilters.includes("ShiftTypeId") && (
                                    <div className={`col-6 col-md-2`}>
                                        <label className="form-label">Shift</label>
                                        <select
                                            className="form-select"
                                            name="ShiftTypeId"
                                            value={selectedShiftId}
                                            onChange={(e) => setSelectedShiftId(e.target.value)}
                                        >
                                            <option value="">Choose Shift</option>
                                            {shiftsData && shiftsData?.map((item, index) => (
                                                <option key={index} value={item.Id}>
                                                    {item.ShiftName}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                {reportFilters.includes("DeptId") && (
                                    <div className={`col-6 col-md-2`}>
                                        <label className="form-label">Department</label>
                                        <select
                                            className="form-select"
                                            name="DeptId"
                                            value={selectedDepId}
                                            onChange={(e) => setSelectedDepId(e.target.value)}
                                        >
                                            <option value="">Choose department</option>
                                            {departments && departments?.map((item, index) => (
                                                <option key={index} value={item.Id}>
                                                    {item.DeptName}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                {reportFilters.includes("UnitId") && (
                                    <div className={`col-6 col-md-2`}>
                                        <label className="form-label">Unit</label>
                                        <select
                                            className="form-select"
                                            name="DeptId"
                                            value={selectedUnitId}
                                            onChange={(e) => setSelectedUnitId(e.target.value)}
                                        >
                                            <option value="">Choose unit</option>
                                            {unitsData && unitsData?.map((item, index) => (
                                                <option key={index} value={item.ItemId}>
                                                    {item.DisplayValue}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                {reportFilters.includes("MachineId") && (
                                    <div className={`col-6 col-md-2`}>
                                        <label className="form-label">Machines</label>
                                        <select
                                            className="form-select"
                                            name="MachineId"
                                            value={selectedMCNId}
                                            onChange={(e) => setSelectedMCNId(e.target.value)}
                                        >
                                            <option value="">Choose machine</option>
                                            {machinesData && machinesData?.map((item, index) => (
                                                <option key={index} value={item.MachineId}>
                                                    {item.MachineName}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                {reportFilters.includes("MCStatus") && (
                                    <div className={`col-6 col-md-2`}>
                                        <label className="form-label">Status</label>
                                        <select
                                            className="form-select"
                                            name="MCStatus"
                                            value={selectedMCStatus}
                                            onChange={(e) => setSelectedMCStatus(e.target.value)}
                                        >
                                            {/* <option value="">Choose status</option> */}
                                            <option value="LIVE">LIVE</option>
                                            <option value="IDLE">IDLE</option>
                                            <option value="BREAKDOWN">BREAKDOWN</option>
                                            <option value="READYTOOPERATE">READY to OPERATE</option>
                                        </select>
                                    </div>
                                )}
                                {reportFilters.includes("TICStatus") && (
                                    <div className={`col-6 col-md-2`}>
                                        <label className="form-label">Status</label>
                                        <select
                                            className="form-select"
                                            name="TICStatus"
                                            value={selectedTICStatus}
                                            onChange={(e) => setSelectedTICStatus(e.target.value)}
                                        >
                                            <option value="NEW">NEW</option>
                                            <option value="MODIFIED">MODIFIED</option>
                                            <option value="APPROVED">APPROVED</option>
                                            <option value="REJECTED">REJECTED</option>
                                            <option value="ASSIGNED">ASSIGNED</option>
                                            <option value="REQ APPROVAL">REQ APPROVAL</option>
                                            <option value="REQ APPROVED">REQ APPROVED</option>
                                            <option value="REJECTED">REJECTED</option>
                                            <option value="FILESUPLOAD">FILESUPLOAD</option>
                                            <option value="RESOLVED">RESOLVED</option>
                                            <option value="CLOSED">CLOSED</option>
                                        </select>
                                    </div>
                                )}

                                {reportFilters.includes("Year") && (
                                    <div className={`col-6 col-md-2`}>
                                        <label className="form-label">Year <span className="text-danger">*</span></label>
                                        <select
                                            className="form-select"
                                            name="DeptId"
                                            value={selectedYear}
                                            onChange={(e) => setSelectedYear(e.target.value)}
                                        >
                                            <option value="">Choose year</option>
                                            {(() => {
                                                const currentYear = new Date().getFullYear();
                                                const years = [currentYear - 1, currentYear, currentYear + 1];
                                                return years.map((year) => (
                                                    <option key={year} value={year}>
                                                        {year}
                                                    </option>
                                                ));
                                            })()}
                                        </select>
                                    </div>
                                )}
                                {reportFilters.includes("Month") && (
                                    <div className={`col-6 col-md-2`}>
                                        <label className="form-label">Month <span className="text-danger">*</span></label>
                                        <select
                                            className="form-select"
                                            name="DeptId"
                                            value={selectedMonth}
                                            onChange={(e) => setSelectedMonth(e.target.value)}
                                        >
                                            <option value="">Choose month</option>
                                            {[
                                                "January",
                                                "February",
                                                "March",
                                                "April",
                                                "May",
                                                "June",
                                                "July",
                                                "August",
                                                "September",
                                                "October",
                                                "November",
                                                "December",
                                            ].map((month, index) => (
                                                <option key={index + 1} value={index + 1}>
                                                    {month}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                {reportFilters.includes("ContractorId") && (
                                    <div className={`col-6 col-md-3`}>
                                        <label className="form-label">Contractor</label>
                                        <select
                                            className="form-select"
                                            name="DeptId"
                                            value={selectedContId}
                                            // style={{ height: "3rem"}}
                                            onChange={(e) => setSelectedContId(e.target.value)}
                                        >
                                            <option value="">Choose contractor</option>
                                            {contactorsData && contactorsData?.map((item, index) => (
                                                <option key={index} value={item.Id}>
                                                    {item.ContractorName}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                {reportFilters.includes("CLId") && (
                                    <div className={`col-6 col-md-3`}>
                                        <label className="form-label">CL</label>
                                        <Select
                                            placeholder="Select CL"
                                            showSearch
                                            allowClear
                                            value={selectedContCLId || undefined}
                                            onChange={(value) => setSelectedContCLId(value)}
                                            style={{ width: "100%", height: "3rem" }}
                                            filterOption={(input, option) => {
                                                // option.item holds the original data we passed
                                                const { Name, AadharNo } = option.item || {};
                                                return (
                                                    Name.toLowerCase().includes(input.toLowerCase()) ||
                                                    AadharNo.toLowerCase().includes(input.toLowerCase())
                                                );
                                            }}
                                        >
                                            {contCls?.map((item) => (
                                                <Option key={item.Id} value={item.Id} item={item}>
                                                    {item.Name} - {formatAadhar(item.AadharNo)}
                                                </Option>
                                            ))}
                                        </Select>
                                    </div>
                                )}
                                <div className="col-1 d-flex align-items-end">
                                    <button className="btn btn-primary btn-sm" type="button" disabled={loading} onClick={fetchReport}>{loading ? 'Submitting...' : 'Submit'}</button>
                                </div>
                            </div>

                        </div>
                        {/* <div className="card mt-5">
                            <div className="table-responsive">
                                <table className="table align-middle table-row-dashed fs-6 gy-5">
                                    <tr>
                                        {loading && (
                                            <td colSpan="12" className="text-center">
                                                <div className="container"></div>
                                            </td>
                                        )}
                                    </tr>
                                    {!loading && (
                                        <>
                                            <thead>
                                                <tr className="text-start text-gray-800 fw-bold fs-7 text-uppercase gs-0">
                                                    {headers && headers?.map((header, index) => (
                                                        <th key={index} style={{ padding: "8px", textAlign: "start" }}>
                                                            {header.trim()}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="fw-semibold text-gray-600">
                                                {currentRecords.length > 0 ? (
                                                    currentRecords && currentRecords?.map((row, rowIndex) => (
                                                        <tr key={rowIndex}>
                                                            {headers.map((header, colIndex) => (
                                                                <td key={colIndex} style={{ padding: "8px", textAlign: "start" }}>
                                                                    {row[header.trim()] || "N/A"}
                                                                </td>
                                                            ))}
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr>
                                                        <td colSpan={headers && headers?.length} className="text-center">No records found</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </>
                                    )}
                                </table>
                                <div className="dt-paging paging_simple_numbers">
                                    <nav aria-label="pagination">
                                        <ul className="pagination">
                                            <li
                                                className={`dt-paging-button page-item ${currentPage === 1 ? "disabled" : ""}`}
                                            >
                                                <button
                                                    className="page-link previous"
                                                    role="link"
                                                    type="button"
                                                    aria-controls="kt_customers_table"
                                                    aria-disabled={currentPage === 1}
                                                    aria-label="Previous"
                                                    onClick={handlePrevious}
                                                >
                                                    <i className="previous"></i>
                                                </button>
                                            </li>

                                            {getPaginationNumbers().map((page, index) => (
                                                <li
                                                    key={index}
                                                    className={`dt-paging-button page-item ${page === currentPage ? "active" : ""}`}
                                                >
                                                    <button
                                                        className="page-link"
                                                        role="link"
                                                        type="button"
                                                        aria-controls="kt_customers_table"
                                                        aria-current={page === currentPage ? "page" : undefined}
                                                        onClick={() => handlePageClick(page)}
                                                        disabled={page === "..."}
                                                    >
                                                        {page}
                                                    </button>
                                                </li>
                                            ))}

                                            <li
                                                className={`dt-paging-button page-item ${currentPage === totalPages ? "disabled" : ""}`}
                                            >
                                                <button
                                                    className="page-link next"
                                                    role="link"
                                                    type="button"
                                                    aria-controls="kt_customers_table"
                                                    aria-disabled={currentPage === totalPages}
                                                    aria-label="Next"
                                                    onClick={handleNext}
                                                >
                                                    <i className="next"></i>
                                                </button>
                                            </li>
                                        </ul>
                                    </nav>
                                </div>
                            </div>
                        </div> */}
                        <div className="card mt-5">
                            <div className="table-responsive d-none d-md-block">
                                {/* Desktop Table */}
                                <table className="table align-middle table-row-dashed fs-6 gy-5">
                                    <thead>
                                        <tr className="text-start text-gray-800 fw-bold fs-7 text-uppercase gs-0">
                                            {headers && headers?.map((header, index) => (
                                                <th key={index} style={{ padding: "8px", textAlign: "start" }}>
                                                    {header.trim()}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="fw-semibold text-gray-600">
                                        {currentRecords.length > 0 ? (
                                            currentRecords?.map((row, rowIndex) => (
                                                <tr key={rowIndex}>
                                                    {headers?.map((header, colIndex) => (
                                                        <td key={colIndex} style={{ padding: "8px", textAlign: "start" }}>
                                                            {row[header.trim()] || "N/A"}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={headers?.length} className="text-center">No records found</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Card View */}
                            <div className="d-block d-md-none">
                                {currentRecords.length > 0 ? (
                                    currentRecords.map((row, rowIndex) => (
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
                    .blurred {
                        filter: blur(2px);
                        pointer-events: none;
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