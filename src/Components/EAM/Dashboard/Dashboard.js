import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Html5QrcodeScanner } from 'html5-qrcode';
import Base1 from '../../Config/Base1';
import Swal from 'sweetalert2';
import ViewMachinesDataByStatus from './ViewMorewMachines';
import ViewTicketStatusByStatus from './ViewMoreTickets';
import ViewMoreOpenTickets from './ViewMoreOpenTickets';
import ViewMoreMachineFailures from './ViewMoreMachineFailures';
import { fetchWithAuth } from "../../../utils/api";
import ViewMoreAlerts from './ViewMoreAlerts';
import { Select } from 'antd';
import ViewMoreTicketsByMonth from './ViewTicketCountByMonth';

export default function AssetDashboard() {

    const navigate = useNavigate();
    const location = useLocation();
    const { Option } = Select;
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1; // 1–12
    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [selectedMonth, setSelectedMonth] = useState(currentMonth);
    const [sessionUserData, setSessionUserData] = useState({});
    const [sessionActionIds, setSessionActionIds] = useState([]);
    const [machines, setMachines] = useState(null);
    const [machinesBar, setMachinesBar] = useState(null);
    const [tickets, setTickets] = useState(null);
    const [open5Tickets, setOpen5Tickets] = useState([]);
    const [openTickets, setOpenTickets] = useState([]);
    const [pendingApproval, setPendingApproval] = useState(null);
    const [machine5Failures, setMachine5Failures] = useState(null);
    const [machineFailures, setMachineFailures] = useState(null);
    const [machineAlerts, setMachineAlerts] = useState(null);
    const [dashLoading, setDashLoading] = useState(false);
    const [machineStatus, setMachineStatus] = useState("");
    const [ticketStatus, setTicketStatus] = useState("");
    const [alertType, setAlertType] = useState(null);
    const [machineCodeInfo, setMachineCodeInfo] = useState(null);
    const [modules, setModules] = useState([]);
    const [mcnInfoScannerStarted, setMCNInfoScannerStarted] = useState(false);
    const [mCNInfoLoading, setMCNInfoLoading] = useState(false);
    const [unitsData, setUnitsData] = useState([]);
    const [departmentsData, setDepartmentsData] = useState([]);
    const [selectedUnit, setSelectedUnit] = useState(null);
    const [selectedDepartment, setSelectedDepartment] = useState(null);
    const [ticketsCountByMonth, setTicketsCountByMonth] = useState([]);
    

    // const [machineCode, setMachineCode] = useState(null);
    // const [scannerStarted, setScannerStarted] = useState(false);

    const scannerRef = useRef(null);

    useEffect(() => {
        const userDataString = sessionStorage.getItem("userData");
        if (userDataString) {
            const userData = JSON.parse(userDataString);
            setSessionUserData(userData);
        } else {
            navigate("/");
        }
    }, [navigate]);

    useEffect(() => {
        const sessionMenuData = sessionStorage.getItem("menuData");
        try {
            const parsedMenu = JSON.parse(sessionMenuData);

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

    const fetchDDLData = async () => {
        try {
            const sessionDDL = sessionStorage.getItem("ddlEAMDashData");

            if (sessionDDL) {
                const parsed = JSON.parse(sessionDDL);

                setDepartmentsData(parsed.depts || []);
                setUnitsData(parsed.units || []);
                if (parsed.defaultUnitId) {
                    setSelectedUnit(parsed.defaultUnitId); // ✅ restore
                }
                return;
            }

            const response = await fetchWithAuth(
                `ADMINRoutes/CWIGetDDLItems?OrgId=${sessionUserData?.OrgId}&UserId=0`,
                {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                }
            );

            if (!response.ok) throw new Error("Network response was not ok");

            const data = await response.json();

            const departmentsFileredData = data.ResultData.filter(
                (item) => item.DDLName === "Departments"
            );

            const unitsFilteredData = data.ResultData.filter(
                (item) => item.DDLName === "UnitLocations"
            );

            setDepartmentsData(departmentsFileredData || []);
            setUnitsData(unitsFilteredData || []);

            const firstUnitId = unitsFilteredData?.[0]?.ItemId ?? null;
            setSelectedUnit(firstUnitId);

            sessionStorage.setItem(
                "ddlEAMDashData",
                JSON.stringify({
                    depts: departmentsFileredData,
                    units: unitsFilteredData,
                    defaultUnitId: firstUnitId,
                })
            );

        } catch (error) {
            console.error("Failed to fetch DDL data:", error);
            setUnitsData([]);
            setDepartmentsData([]);
        }
    };

    useEffect(() => {
        if (sessionUserData?.UnitId) {
            setSelectedUnit(sessionUserData.UnitId);
        }

        if (sessionUserData?.DeptId) {
            setSelectedDepartment(sessionUserData.DeptId);
        }
    }, [sessionUserData]);

    useEffect(() => {
        if (sessionUserData.OrgId) {
            fetchDDLData();
        }
    }, [sessionUserData])

    const fetchDashData = async () => {
        setDashLoading(true);
        try {
            const response = await fetchWithAuth(`PMMS/PMMSDashboard?Id=${sessionUserData?.OrgId}&Typeno=1&DepartmentId=${selectedDepartment}&UnitLocId=${selectedUnit}`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });
            if (response.ok) {
                const data = await response.json();
                const resultData = data.ResultData;
                const machineRows = resultData.filter(item => item.Title === 'Machines');
                const ticketRows = resultData.filter(item => item.Title === 'Tickets');
                const mcnBarRows = resultData.filter(item => item.Title === 'MachinesBarPercentage');
                const ticketsNewRows = resultData.filter(item => item.Title === 'Open Tickets');
                const mcnFailuerRows = resultData.filter(item => item.Title === 'Machine Failures');
                const mcnAlertsRows = resultData.filter(item => item.Title === 'Alerts');
                setMachines(machineRows);
                setTickets(ticketRows);
                setMachinesBar(mcnBarRows);
                setOpenTickets(ticketsNewRows);
                setMachineFailures(mcnFailuerRows);
                setMachineAlerts(mcnAlertsRows);

                const lastFiveTickets = ticketsNewRows.slice(-5);
                setOpen5Tickets(lastFiveTickets);

                const lastFiveFailures = mcnFailuerRows.slice(-5);
                setMachine5Failures(lastFiveFailures);

                resultData.forEach(item => {
                    switch (item.Title) {
                        case "PendingApprovalTable":
                            setPendingApproval(item);
                            break;
                        default:
                            console.warn("Unhandled dashboard item:", item.Title);
                    }
                });
            } else {
                console.error('Failed to fetch mcn tickets data:', response.statusText);
            }
        } catch (error) {
            console.error('Error fetching mcn tickets data:', error.message);
        } finally {
            setDashLoading(false);
        }
    };

    const fetchTicketsCountByMonth = async () => {
        setDashLoading(true);
        try {
            const response = await fetchWithAuth(`PMMS/GetTicketCountByMonth?OrgId=${sessionUserData?.OrgId}&Year=${selectedYear}&PresentMonth=${selectedMonth}&PreviousMonth=${selectedMonth - 1}`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });
            if (response.ok) {
                const data = await response.json();
                setTicketsCountByMonth(data.ResultData);

            } else {
                console.error('Failed to fetch mcn tickets data:', response.statusText);
            }
        } catch (error) {
            console.error('Error fetching mcn tickets data:', error.message);
        } finally {
            setDashLoading(false);
        }
    };

    useEffect(() => {
        if (sessionUserData?.OrgId && selectedMonth && selectedYear) {
            fetchTicketsCountByMonth();
        }
    }, [sessionUserData, selectedMonth, selectedYear]);

    useEffect(() => {
        if (sessionUserData && sessionUserData?.OrgId && selectedUnit && selectedDepartment) {
            fetchDashData();
        }
    }, [sessionUserData, selectedDepartment, selectedUnit]);

    const getBadgeClass = (status) => {
        switch (status) {
            case "NEW":
                return "badge-light-primary";
            case "APPROVED":
            case "REQ APPROVED":
                return "badge-light-success";
            case "ASSIGNED":
                return "badge-light-info";
            case "REQ APPROVAL":
                return "badge-light-warning";
            case "FILEUPLOAD":
                return "badge-light-dark";
            case "RESOLVED":
                return "badge-light-success";
            case "CLOSED":
                return "badge-light-danger";
            default:
                return "badge-light";
        }
    };

    // const handleStartScan = () => {
    //     setScannerStarted(true); // just set the flag
    // };

    // useEffect(() => {
    //     if (scannerStarted) {
    //         const timeout = setTimeout(() => {
    //             const qrElement = document.getElementById("qr-reader");
    //             if (qrElement) {
    //                 startScanner();
    //             }
    //         }, 100); // delay ensures DOM is rendered

    //         return () => clearTimeout(timeout);
    //     }
    // }, [scannerStarted]);



    // const startScanner = () => {
    //     const scanner = new Html5QrcodeScanner("qr-reader", {
    //         fps: 10,
    //         qrbox: 250
    //     });

    //     scanner.render(
    //         (decodedText) => {
    //             scanner.clear();
    //             setScannerStarted(false);

    //             // Match pattern like https://api.quickwing.live/9333/21
    //             const match = decodedText.match(/https?:\/\/[^\/]+\/(\d+)\/(\d+)/);

    //             if (match) {
    //                 const orgId = Number(match[1]);
    //                 const machineId = Number(match[2]);

    //                 // ✅ Pass both to handler
    //                 handleScanSuccess(machineId, orgId);
    //             } else {
    //                 Swal.fire("Invalid", "Invalid QR Code format", "error");
    //             }
    //         },
    //         (error) => {
    //             console.warn("Scan error:", error);
    //         }
    //     );

    //     scannerRef.current = scanner;
    // };

    // useEffect(() => {
    //     const offcanvasElement = document.getElementById("offcanvasRightScanQRCode");

    //     const handleOffcanvasHidden = () => {
    //         if (scannerRef.current) {
    //             scannerRef.current.clear().catch(err => {
    //                 console.error("Error clearing scanner:", err);
    //             });
    //             setScannerStarted(false); // reset button state
    //         }
    //     };

    //     if (offcanvasElement) {
    //         offcanvasElement.addEventListener("hidden.bs.offcanvas", handleOffcanvasHidden);
    //     }

    //     return () => {
    //         if (offcanvasElement) {
    //             offcanvasElement.removeEventListener("hidden.bs.offcanvas", handleOffcanvasHidden);
    //         }
    //     };
    // }, []);

    // const handleLogInOutManualSubmit = async (e) => {
    //     e.preventDefault();
    //     if (!machineCode) {
    //         Swal.fire({
    //             icon: 'error',
    //             title: 'Machine Code Required',
    //             text: 'Plase enter the machine code to log in or out.'
    //         });
    //         return;
    //     }
    //     try {
    //         const payload = {
    //             MachineId: 0,
    //             OrgId: sessionUserData.OrgId,
    //             userid: sessionUserData.Id,
    //             Code: machineCode,
    //         };

    //         const response = await axios.post(`${BASE_API}PMMS/MachineLogsIN&Out`, payload);

    //         if (response.data?.success) {
    //             const message = response.data?.data?.result?.[0]?.ResultMessage || "Success";
    //             Swal.fire({
    //                 icon: 'success',
    //                 title: 'Machine Status',
    //                 text: message
    //             }).then(() => {
    //                 window.location.reload();
    //             })
    //         } else {
    //             const errorMsg = response.data?.ResultData?.ResultMessage || "Unknown error";
    //             Swal.fire({
    //                 icon: 'error',
    //                 title: 'Failed',
    //                 text: errorMsg
    //             });
    //         }
    //     } catch (err) {
    //         console.error("API error:", err);
    //         Swal.fire({
    //             icon: 'error',
    //             title: 'Error',
    //             text: 'Failed to log machine status.'
    //         });
    //     } finally {
    //         console.log('done');
    //     }
    // };

    const handleMCNInfoStartScan = () => {
        setMCNInfoScannerStarted(true); // just set the flag
    };

    useEffect(() => {
        if (mcnInfoScannerStarted) {
            const qrReaderEl = document.getElementById("qr-reader");
            if (!qrReaderEl) return; // make sure element exists

            const scanner = new Html5QrcodeScanner("qr-reader", {
                fps: 10,
                qrbox: 250,
            });

            scanner.render(
                (decodedText) => {
                    scanner.clear();
                    scannerRef.current = null;
                    setMCNInfoScannerStarted(false);

                    const match = decodedText.match(/\/(\d+)\/(\d+)$/);
                    const orgId = match?.[1];
                    const machineId = match?.[2];

                    if (orgId && machineId) {
                        navigate(`/eam/asset-info/${orgId}/${machineId}`);
                    } else {
                        Swal.fire("Invalid", "QR code format is incorrect", "error");
                    }
                },
                (error) => {
                    console.warn("Scan error:", error);
                }
            );

            scannerRef.current = scanner;
        }
    }, [mcnInfoScannerStarted]);

    useEffect(() => {
        const offcanvasElement = document.getElementById("offcanvasRightScanQRCodeInfo");

        const handleOffcanvasHidden = () => {
            if (scannerRef.current) {
                scannerRef.current.clear().catch(err => {
                    console.error("Error clearing scanner:", err);
                });
                setMCNInfoScannerStarted(false); // reset button state
            }
        };

        if (offcanvasElement) {
            offcanvasElement.addEventListener("hidden.bs.offcanvas", handleOffcanvasHidden);
        }

        return () => {
            if (offcanvasElement) {
                offcanvasElement.removeEventListener("hidden.bs.offcanvas", handleOffcanvasHidden);
            }
        };
    }, []);

    const handleMcnInfoManualSubmit = async (e) => {
        e.preventDefault();
        setMCNInfoLoading(true);
        try {
            const response = await fetchWithAuth(`PMMS/GetInfoByCode?Code=${machineCodeInfo}`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });
            if (response.ok) {
                const data = await response.json();
                window.location.href = `/eam/asset-info/${data.ResultData[0].OrgId}/${data.ResultData[0].MachineId}`;
                setMCNInfoLoading(false);
            } else {
                setMCNInfoLoading(false);
                console.error('Failed to fetch mcn tickets data:', response.statusText);
            }
        } catch (error) {
            setMCNInfoLoading(false);
            console.error('Error fetching mcn tickets data:', error.message);
        }
    };

    const years = Array.from(
        { length: 2 },
        (_, i) => currentYear + i
    );

    const months = [
        { value: 1, label: "January" },
        { value: 2, label: "February" },
        { value: 3, label: "March" },
        { value: 4, label: "April" },
        { value: 5, label: "May" },
        { value: 6, label: "June" },
        { value: 7, label: "July" },
        { value: 8, label: "August" },
        { value: 9, label: "September" },
        { value: 10, label: "October" },
        { value: 11, label: "November" },
        { value: 12, label: "December" },
    ];

    const showDeptDwn = sessionActionIds?.includes(25);
    const iconColors = ['#FF6B35', '#00B8D9', '#36B37E', '#FFAB00', '#6554C0', '#FF5630'];

    return (
        <Base1>
            <div className={`d-flex flex-column flex-column-fluid ${dashLoading ? 'blurred' : ''}`}>
                {dashLoading && (
                    <div className="loading-overlay">
                        <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Loading...</span>
                        </div>
                    </div>
                )}
                <div id="kt_app_toolbar" className="app-toolbar py-3 py-lg-6">
                    <div id="kt_app_toolbar_container" className="app-container container-xxl d-flex flex-stack">
                        <div className="page-title d-md-block d-none">
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
                                    {modules.map((mod, index) => {
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

                            <span className="menu-link bg-white shadow-sm me-2 cursor-pointer active">
                                <span className="menu-title"><i className="fa-solid fa-border-all"></i> Dashboard</span>
                                <span className="menu-arrow"></span>
                            </span>
                        </div>

                        <div className="page-title d-md-none d-block">
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
                                    {modules.map((mod, index) => {
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
                            <span className="menu-link bg-white shadow-sm me-2 cursor-pointer active">
                                <span className="menu-title"><i className="fa-solid fa-border-all"></i></span>
                                <span className="menu-arrow"></span>
                            </span>
                        </div>
                        <div className="d-flex justify-content-between bg-white shadow-sm p-2 rounded-4">
                            <div className="me-2">
                                {/* <button
                                    className="btn btn-sm fw-bold btn-light-secondary cursor-not-allowed"
                                    data-bs-toggle="offcanvas"
                                    data-bs-target="#offcanvasRightScanQRCode"
                                    aria-controls="offcanvasRightScanQRCode"
                                    disabled={true}
                                >
                                    Start / Stop Asset
                                </button> */}
                                <a
                                    className="btn btn-light-warning border border-warning shadow btn-sm d-none d-md-block"
                                    href="my-assets"
                                    type="button"
                                ><i class="bi bi-list-check"></i>My Assets
                                </a>
                            </div>
                            <div>
                                <button
                                    className="btn btn-sm fw-bold btn-light-info border border-info shadow"
                                    data-bs-toggle="offcanvas"
                                    data-bs-target="#offcanvasRightScanQRCodeInfo"
                                    aria-controls="offcanvasRightScanQRCodeInfo"
                                >
                                    <i className="bi bi-info-circle"></i>Asset Info
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div id="kt_app_content" className="app-content flex-column-fluid">
                    <div id="kt_app_content_container" className="app-container container-xxl">
                        <div className="row gx-5 gx-xl-10">
                            <div className="mobileMarginTop" style={{ marginTop: '-1.5rem' }}>
                                <div className="row mb-3">
                                    <div className="col-6 col-md-4 col-lg-2">
                                        <Select
                                            showSearch
                                            placeholder="Choose Unit"
                                            suffixIcon={<i className="fa-solid fa-location-dot text-primary fa-beat-fade"></i>}
                                            style={{ width: "100%", height: "2.5rem" }}
                                            optionFilterProp="children"
                                            value={
                                                selectedUnit
                                                    ? { value: selectedUnit, label: unitsData.find(u => u.ItemId === selectedUnit)?.ItemValue }
                                                    : undefined
                                            }
                                            onChange={(value, option) => {
                                                setSelectedUnit(value);

                                                // optional: full object if needed
                                                // console.log("Unit ID:", value);
                                                // console.log("Unit Name:", option.children);
                                            }}
                                            disabled={!showDeptDwn}
                                        >
                                            {unitsData.map((unit) => (
                                                <Option key={unit.ItemId} value={unit.ItemId}>
                                                    {unit.ItemValue}
                                                </Option>
                                            ))}
                                        </Select>
                                    </div>

                                    <div className="col-6 col-md-4 col-lg-2">
                                        <Select
                                            showSearch
                                            placeholder="Choose Department"
                                            value={selectedDepartment}
                                            suffixIcon={<i className="fa-solid fa-building text-primary fa-beat-fade"></i>}
                                            style={{ width: "100%", height: "2.5rem" }}
                                            optionFilterProp="children"
                                            onChange={(value, option) => {
                                                setSelectedDepartment(value);

                                                console.log("Department ID:", value);
                                                console.log("Department Name:", option.children);
                                            }}
                                            disabled={!showDeptDwn}
                                        >
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
                                </div>
                            </div>
                            {/* Count Cards */}
                            <div className="col-xl-4 mb-10">
                                <div className="card card-flush h-xl-100">
                                    <div className="card-header rounded bgi-no-repeat bgi-size-cover bgi-position-y-top bgi-position-x-center align-items-start h-250px" style={{ backgroundImage: 'url(assets/media/svg/shapes/top-green.png)' }} data-bs-theme="light">
                                        <h3 className="card-title align-items-start flex-column text-dark pt-4">
                                            <span className="fw-bold fs-2x mb-3">Assets</span>
                                        </h3>
                                        <div className="card-toolbar pt-5">
                                            <a href="assets" className="btn btn-sm btn-icon btn-active-color-primary btn-color-primary bg-white bg-opacity-25 bg-hover-opacity-100 bg-hover-white bg-active-opacity-25 w-20px h-20px" data-kt-menu-trigger="click" data-kt-menu-placement="bottom-end" data-kt-menu-overflow="true">
                                                <i className="ki-duotone ki-dots-square fs-3">
                                                    <span className="path1"></span>
                                                    <span className="path2"></span>
                                                    <span className="path3"></span>
                                                    <span className="path4"></span>
                                                </i>
                                            </a>
                                        </div>
                                    </div>
                                    <div className="card-body mt-n20">
                                        <div className="mt-n20 position-relative">
                                            <div className="row g-3 g-lg-6">
                                                <div
                                                    className="col-6"
                                                    style={{ marginTop: '-5.6rem', pointerEvents: 'none', filter: "blur(2px) brightness(0.7)", opacity: "0.6" }}
                                                    onClick={() => setMachineStatus('LIVE')}
                                                    data-bs-toggle="offcanvas"
                                                    data-bs-target="#offcanvasRightViewMachinesData"
                                                    aria-controls="offcanvasRightViewMachinesData"
                                                    disabled={true}
                                                >
                                                    <div className="hover-card bg-gray-100 bg-opacity-70 rounded-2 px-6 py-5">
                                                        <div className="symbol symbol-30px me-5 mb-8">
                                                            <span className="symbol-label">
                                                                <i className="fa-solid fa-bridge-circle-check fs-2 text-success"></i>
                                                            </span>
                                                        </div>
                                                        <div className="m-0" title='LIVE Machines'>
                                                            <span className="text-gray-700 fw-bolder d-block fs-2qx lh-1 ls-n1 mb-1">
                                                                {machines?.find(item => item.Label === 'LIVE')?.Count ?? 0}
                                                            </span>
                                                            <span className="text-gray-700 fw-semibold fs-6 single-line-text">Live</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div
                                                    className="col-6"
                                                    style={{ marginTop: '-5.6rem', pointerEvents: 'none', filter: "blur(2px) brightness(0.7)", opacity: "0.6", }}
                                                    onClick={() => setMachineStatus('IDLE')}
                                                    data-bs-toggle="offcanvas"
                                                    data-bs-target="#offcanvasRightViewMachinesData"
                                                    aria-controls="offcanvasRightViewMachinesData"
                                                    disabled={true}
                                                >
                                                    <div className="hover-card bg-gray-100 bg-opacity-70 rounded-2 px-6 py-5">
                                                        <div className="symbol symbol-30px me-5 mb-8">
                                                            <span className="symbol-label">
                                                                <i className="fa-solid fa-bridge-circle-xmark fs-2 text-warning"></i>
                                                            </span>
                                                        </div>
                                                        <div className="m-0" title='IDLE Machines'>
                                                            <span className="text-gray-700 fw-bolder d-block fs-2qx lh-1 ls-n1 mb-1">
                                                                {machines?.find(item => item.Label === 'IDLE')?.Count ?? 0}
                                                            </span>
                                                            <span className="text-gray-700 fw-semibold fs-6 single-line-text ">Idle-Manual</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div
                                                    className="col-6"
                                                    onClick={() => setMachineStatus('OUTOFSERVICE')}
                                                    data-bs-toggle="offcanvas"
                                                    data-bs-target="#offcanvasRightViewMachinesData"
                                                    aria-controls="offcanvasRightViewMachinesData"
                                                >
                                                    <div className="hover-card bg-gray-100 bg-opacity-70 rounded-2 px-6 py-5">
                                                        <div className="symbol symbol-30px me-5 mb-8">
                                                            <span className="symbol-label">
                                                                <i className="fa-solid fa-bridge-circle-exclamation fs-2 text-danger"></i>
                                                            </span>
                                                        </div>
                                                        <div className="m-0" title='Out of Service Machines'>
                                                            <span className="text-gray-700 fw-bolder d-block fs-2qx lh-1 ls-n1 mb-1">
                                                                {machines?.find(item => item.Label === 'OUTOFSERVICE')?.Count ?? 0}
                                                            </span>
                                                            <span className="text-gray-700 fw-semibold fs-6 single-line-text ">Out of Service</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div
                                                    className="col-6"
                                                    onClick={() => setMachineStatus('ACTIVE')}
                                                    data-bs-toggle="offcanvas"
                                                    data-bs-target="#offcanvasRightViewMachinesData"
                                                    aria-controls="offcanvasRightViewMachinesData"
                                                >
                                                    <div className="hover-card bg-gray-100 bg-opacity-70 rounded-2 px-6 py-5">
                                                        <div className="symbol symbol-30px me-5 mb-8">
                                                            <span className="symbol-label">
                                                                <i className="fa-solid fa-road-bridge fs-2 text-info"></i>
                                                            </span>
                                                        </div>
                                                        <div className="m-0" title='Active Assets'>
                                                            <span className="text-gray-700 fw-bolder d-block fs-2qx lh-1 ls-n1 mb-1">
                                                                {machines?.find(item => item.Label === 'ACTIVE')?.Count ?? 0}
                                                            </span>
                                                            <span className="text-gray-700 fw-semibold fs-6 single-line-text1 ">Active</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="col-xl-4 mb-10">
                                <div className="card card-flush h-xl-100">
                                    <div className="card-header rounded bgi-no-repeat bgi-size-cover bgi-position-y-top bgi-position-x-center align-items-start h-250px" style={{ backgroundImage: 'url(assets/media/svg/shapes/orange.png)' }} data-bs-theme="light">
                                        <h3 className="card-title align-items-start flex-column text-dark pt-4">
                                            <span className="fw-bold fs-2x mb-3">Tickets</span>
                                        </h3>
                                        <div className="card-toolbar pt-5">
                                            <a href="tickets" className="btn btn-sm btn-icon btn-active-color-primary btn-color-primary bg-white bg-opacity-25 bg-hover-opacity-100 bg-hover-white bg-active-opacity-25 w-20px h-20px" data-kt-menu-trigger="click" data-kt-menu-placement="bottom-end" data-kt-menu-overflow="true">
                                                <i className="ki-duotone ki-dots-square fs-3">
                                                    <span className="path1"></span>
                                                    <span className="path2"></span>
                                                    <span className="path3"></span>
                                                    <span className="path4"></span>
                                                </i>
                                            </a>
                                        </div>
                                    </div>
                                    <div className="card-body mt-n20">
                                        <div className="mt-n20 position-relative">
                                            <div className="row g-3 g-lg-6">
                                                <div
                                                    className="col-6"
                                                    style={{ marginTop: '-5.6rem' }}
                                                    onClick={() => setTicketStatus('NEW')}
                                                    data-bs-toggle="offcanvas"
                                                    data-bs-target="#offcanvasRightViewTicketsData"
                                                    aria-controls="offcanvasRightViewTicketsData"
                                                >
                                                    <div className="hover-card bg-gray-100 bg-opacity-70 rounded-2 px-6 py-5">
                                                        <div className="symbol symbol-30px me-5 mb-8">
                                                            <span className="symbol-label">
                                                                <i className="fa-solid fa-circle-plus fs-2 text-success"></i>
                                                            </span>
                                                        </div>
                                                        <div className="m-0" title='New Tickets'>
                                                            <span className="text-gray-700 fw-bolder d-block fs-2qx lh-1 ls-n1 mb-1">
                                                                {tickets?.find(item => item.Label === 'NEW')?.Count ?? 0}
                                                            </span>
                                                            <span className="text-gray-700 fw-semibold fs-6 single-line-text ">New</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div
                                                    className="col-6"
                                                    style={{ marginTop: '-5.6rem' }}
                                                    onClick={() => setTicketStatus('OpenTickets')}
                                                    data-bs-toggle="offcanvas"
                                                    data-bs-target="#offcanvasRightViewTicketsData"
                                                    aria-controls="offcanvasRightViewTicketsData"
                                                >
                                                    <div className="hover-card bg-gray-100 bg-opacity-70 rounded-2 px-6 py-5">
                                                        <div className="symbol symbol-30px me-5 mb-8">
                                                            <span className="symbol-label">
                                                                <i className="fa-solid fa-folder-open fs-2 text-warning"></i>
                                                            </span>
                                                        </div>
                                                        <div className="m-0" title='Open Tickets'>
                                                            <span className="text-gray-700 fw-bolder d-block fs-2qx lh-1 ls-n1 mb-1">
                                                                {tickets?.find(item => item.Label === 'OpenTickets')?.Count ?? 0}
                                                            </span>
                                                            <span className="text-gray-700 fw-semibold fs-6 single-line-text ">Open</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div
                                                    className="col-6"
                                                    onClick={() => setTicketStatus('OverDueTickets')}
                                                    data-bs-toggle="offcanvas"
                                                    data-bs-target="#offcanvasRightViewTicketsData"
                                                    aria-controls="offcanvasRightViewTicketsData"
                                                >
                                                    <div className="hover-card bg-gray-100 bg-opacity-70 rounded-2 px-6 py-5">
                                                        <div className="symbol symbol-30px me-5 mb-8">
                                                            <span className="symbol-label">
                                                                <i className="fa-solid fa-triangle-exclamation fs-2 text-danger"></i>
                                                            </span>
                                                        </div>
                                                        <div className="m-0" title='Overdue Tickets'>
                                                            <span className="text-gray-700 fw-bolder d-block fs-2qx lh-1 lsTickets-n1 mb-1">
                                                                {tickets?.find(item => item.Label === 'OverDueTickets')?.Count ?? 0}
                                                            </span>
                                                            <span className="text-gray-700 fw-semibold fs-6 single-line-text ">Overdue</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div
                                                    className="col-6"
                                                    onClick={() => setTicketStatus('CLOSED')}
                                                    data-bs-toggle="offcanvas"
                                                    data-bs-target="#offcanvasRightViewTicketsData"
                                                    aria-controls="offcanvasRightViewTicketsData"
                                                >
                                                    <div className="hover-card bg-gray-100 bg-opacity-70 rounded-2 px-6 py-5">
                                                        <div className="symbol symbol-30px me-5 mb-8">
                                                            <span className="symbol-label">
                                                                <i className="fa-solid fa-circle-check fs-2 text-info"></i>
                                                            </span>
                                                        </div>
                                                        <div className="m-0" title='Closed Tickets'>
                                                            <span className="text-gray-700 fw-bolder d-block fs-2qx lh-1 ls-n1 mb-1">
                                                                {tickets?.find(item => item.Label === 'CLOSED')?.Count ?? 0}
                                                            </span>
                                                            <span className="text-gray-700 fw-semibold fs-6 single-line-text ">Closed</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="position-relative coming-soon-wrapper col-xl-4 mb-10">
                                <div className="card card-flush h-xl-100">
                                    <div className="card-header rounded bgi-no-repeat bgi-size-cover bgi-position-y-top bgi-position-x-center align-items-start h-250px"
                                        //  style={{ backgroundImage: 'url(assets/media/svg/shapes/blue1.jpeg)' }} 
                                        data-bs-theme="light">
                                        <h3 className="card-title align-items-start flex-column text-dark pt-4">
                                            <span className="fw-bold fs-2x mb-3">Alerts</span>
                                        </h3>
                                        <div className="card-toolbar pt-5">
                                            <a href="alerts" className="btn btn-sm btn-icon btn-active-color-primary btn-color-primary bg-white bg-opacity-25 bg-hover-opacity-100 bg-hover-white bg-active-opacity-25 w-20px h-20px" data-kt-menu-trigger="click" data-kt-menu-placement="bottom-end" data-kt-menu-overflow="true">
                                                <i className="ki-duotone ki-dots-square fs-3">
                                                    <span className="path1"></span>
                                                    <span className="path2"></span>
                                                    <span className="path3"></span>
                                                    <span className="path4"></span>
                                                </i>
                                            </a>
                                        </div>
                                    </div>
                                    <div className="card-body mt-n20">
                                        <div className="mt-n20 position-relative">
                                            <div className="row g-3 g-lg-6">
                                                <div
                                                    className="col-6"
                                                    style={{ marginTop: '-5.6rem' }}
                                                    onClick={() => setAlertType(2)}
                                                    data-bs-toggle="offcanvas"
                                                    data-bs-target="#offcanvasRightViewAlertsData"
                                                    aria-controls="offcanvasRightViewAlertsData"
                                                >
                                                    <div className="hover-card bg-gray-100 bg-opacity-70 rounded-2 px-6 py-5">
                                                        <div className="symbol symbol-30px me-5 mb-8">
                                                            <span className="symbol-label">
                                                                <i className="fa-solid fa-calendar-week fs-2 text-primary"></i>
                                                            </span>
                                                        </div>
                                                        <div className="m-0" title='Current Week Alerts'>
                                                            <span className="text-gray-700 fw-bolder d-block fs-2qx lh-1 ls-n1 mb-1">
                                                                {machineAlerts?.find(item => item.Label === 'CurrentWeekCount')?.Count ?? 0}
                                                            </span>
                                                            <span className="text-gray-700 fw-semibold fs-6 single-line-text ">Current Week</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div
                                                    className="col-6 "
                                                    style={{ marginTop: '-5.6rem' }}
                                                    onClick={() => setAlertType(3)}
                                                    data-bs-toggle="offcanvas"
                                                    data-bs-target="#offcanvasRightViewAlertsData"
                                                    aria-controls="offcanvasRightViewAlertsData"
                                                >
                                                    <div className="hover-card bg-gray-100 bg-opacity-70 rounded-2 px-6 py-5">
                                                        <div className="symbol symbol-30px me-5 mb-8">
                                                            <span className="symbol-label">
                                                                <i className="fa-solid fa-chart-line fs-2 text-warning"></i>
                                                            </span>
                                                        </div>
                                                        <div className="m-0" title='Current Month Alerts'>
                                                            <span className="text-gray-700 fw-bolder d-block fs-2qx lh-1 ls-n1 mb-1">
                                                                {machineAlerts?.find(item => item.Label === 'CurrentMonthCount')?.Count ?? 0}
                                                            </span>
                                                            <span className="text-gray-700 fw-semibold fs-6 single-line-text ">Current Month</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="col-6"
                                                    onClick={() => setAlertType(6)}
                                                    data-bs-toggle="offcanvas"
                                                    data-bs-target="#offcanvasRightViewAlertsData"
                                                    aria-controls="offcanvasRightViewAlertsData"
                                                >
                                                    <div className="hover-card bg-gray-100 bg-opacity-70 rounded-2 px-6 py-5">
                                                        <div className="symbol symbol-30px me-5 mb-8">
                                                            <span className="symbol-label">
                                                                <i class="fa-solid fa-clock-rotate-left text-info fs-2"></i>
                                                            </span>
                                                        </div>
                                                        <div className="m-0" title='Pending to Close Alerts'>
                                                            <span className="text-gray-700 fw-bolder d-block fs-2qx lh-1 ls-n1 mb-1">
                                                                {machineAlerts?.find(item => item.Label === 'CurrentMonthPendingCount')?.Count ?? 0}
                                                            </span>
                                                            <span className="text-gray-700 fw-semibold fs-6 single-line-text ">Pending to Close</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                {/* <div className="col-6"
                                                    onClick={() => setAlertType(5)}
                                                    data-bs-toggle="offcanvas"
                                                    data-bs-target="#offcanvasRightViewAlertsData"
                                                    aria-controls="offcanvasRightViewAlertsData"
                                                >
                                                    <div className="hover-card bg-gray-100 bg-opacity-70 rounded-2 px-6 py-5">
                                                        <div className="symbol symbol-30px me-5 mb-8">
                                                            <span className="symbol-label">
                                                                <i class="fa-solid fa-clock-rotate-left text-info fs-2"></i>
                                                            </span>
                                                        </div>
                                                        <div className="m-0" title='Completed Alerts'>
                                                            <span className="text-gray-700 fw-bolder d-block fs-2qx lh-1 ls-n1 mb-1">
                                                                {machineAlerts?.find(item => item.Label === 'Upcoming90DaysCount')?.Count ?? 0}
                                                            </span>
                                                            <span className="text-gray-700 fw-semibold fs-6 single-line-text ">Quarterly</span>
                                                        </div>
                                                    </div>
                                                </div> */}
                                                <div className="col-6"
                                                    onClick={() => setAlertType(4)}
                                                    data-bs-toggle="offcanvas"
                                                    data-bs-target="#offcanvasRightViewAlertsData"
                                                    aria-controls="offcanvasRightViewAlertsData"
                                                >
                                                    <div className="hover-card bg-gray-100 bg-opacity-70 rounded-2 px-6 py-5">
                                                        <div className="symbol symbol-30px me-5 mb-8">
                                                            <span className="symbol-label">
                                                                <i className="fa-solid fa-hourglass-half fs-2 text-danger"></i>
                                                            </span>
                                                        </div>
                                                        <div className="m-0" title='Closed Alerts'>
                                                            <span className="text-gray-700 fw-bolder d-block fs-2qx lh-1 ls-n1 mb-1">
                                                                {machineAlerts?.find(item => item.Label === 'CurrentMonthClosedCount')?.Count ?? 0}
                                                            </span>
                                                            <span className="text-gray-700 fw-semibold fs-6 single-line-text ">Closed</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Tables Start */}
                            {/* Asset Failures Desktop */}
                            <div className="col-xl-6 mb-10 d-none d-md-block">
                                <div className="card card-flush h-xl-100">
                                    <div className="card-header rounded bgi-no-repeat bgi-size-cover bgi-position-y-top bgi-position-x-center align-items-start h-100px">
                                        <h3 className="card-title align-items-start flex-column text-white pt-4">
                                            <span className="fw-bold fs-1x mb-3 text-dark">Asset Failures</span>
                                        </h3>
                                        <div className="card-toolbar pt-5"
                                            data-bs-toggle="offcanvas"
                                            data-bs-target="#offcanvasRightViewMcnFailsData"
                                            aria-controls="offcanvasRightViewMcnFailsData"
                                        >
                                            <button className="btn btn-sm btn-icon btn-active-color-primary btn-color-primary bg-white bg-opacity-25 bg-hover-opacity-100 bg-hover-white bg-active-opacity-25 w-20px h-20px" data-kt-menu-trigger="click" data-kt-menu-placement="bottom-end" data-kt-menu-overflow="true">
                                                <i className="ki-duotone ki-dots-square fs-3">
                                                    <span className="path1"></span>
                                                    <span className="path2"></span>
                                                    <span className="path3"></span>
                                                    <span className="path4"></span>
                                                </i>
                                            </button>
                                        </div>
                                    </div>
                                    <div className="card-body mt-n20">
                                        <div className='table-responsive'>
                                            <table className='table table-bordered table-hover'>
                                                <thead>
                                                    <tr className='fw-bold'>
                                                        <th>#</th>
                                                        <th>Asset</th>
                                                        <th className='single-line-text1'>No.Of Tickets</th>
                                                        <th>Department</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {Array.isArray(machine5Failures) && machine5Failures.map((item, index) => (
                                                        <tr key={index}>
                                                            <td >{index + 1}</td>
                                                            <td className='single-line-text1'>{item.Col1}</td>
                                                            <td>{item.Count}</td>
                                                            <td className='single-line-text1'>{item.Col2}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {/* Asset Failures Mobile */}
                            <div className="col-12 mb-10 d-block d-md-none">
                                <div className="card card-flush h-xl-100">
                                    <div className="card-header rounded bgi-no-repeat bgi-size-cover bgi-position-y-top bgi-position-x-center align-items-start h-100px">
                                        <h3 className="card-title align-items-start flex-column text-white pt-4">
                                            <span className="fw-bold fs-1x mb-3 text-dark">
                                                {/* {machine5Failures && machine5Failures[0]?.Title} */}
                                                Asset Failures
                                            </span>
                                        </h3>
                                        <div
                                            className="card-toolbar pt-5"
                                            data-bs-toggle="offcanvas"
                                            data-bs-target="#offcanvasRightViewMcnFailsData"
                                            aria-controls="offcanvasRightViewMcnFailsData"
                                        >
                                            <button className="btn btn-sm btn-icon btn-active-color-primary btn-color-primary bg-white bg-opacity-25 bg-hover-opacity-100 bg-hover-white bg-active-opacity-25 w-20px h-20px">
                                                <i className="ki-duotone ki-dots-square fs-3">
                                                    <span className="path1"></span>
                                                    <span className="path2"></span>
                                                    <span className="path3"></span>
                                                    <span className="path4"></span>
                                                </i>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="card-body mt-n20">
                                        {Array.isArray(machine5Failures) &&
                                            machine5Failures.map((item, index) => (
                                                <div
                                                    key={index}
                                                    className="card mb-4 border shadow-sm p-3 bg-light"
                                                >
                                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                                        <h6 className="mb-0 fw-semibold">#{index + 1}</h6>
                                                        <span className="badge bg-light-primary">Tickets: {item.Count}</span>
                                                    </div>

                                                    <div className="mb-1">
                                                        <strong>Machine:</strong> <span>{item.Col1}</span>
                                                    </div>

                                                    <div className="d-flex justify-content-between">
                                                        <div>
                                                            <strong>Department:</strong> <span>{item.Col2}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            </div>

                            {/* Tickets Count by Month Desktop */}
                            <div className="col-xl-6 mb-10 d-none d-md-block">
                                <div className="card card-flush h-xl-100">
                                    <div className="card-header align-items-center">
                                        <h3 className="card-title fw-bold text-dark mb-0">
                                            Tickets Count by Month
                                        </h3>

                                        <div
                                            className="card-toolbar pt-5"
                                            data-bs-toggle="offcanvas"
                                            data-bs-target="#offcanvasRightViewTicketsByMonthData"
                                            aria-controls="offcanvasRightViewTicketsByMonthData"
                                        >
                                            <button className="btn btn-sm btn-icon btn-active-color-primary btn-color-primary bg-white bg-opacity-25 bg-hover-opacity-100 bg-hover-white bg-active-opacity-25 w-20px h-20px">
                                                <i className="ki-duotone ki-dots-square fs-3">
                                                    <span className="path1"></span>
                                                    <span className="path2"></span>
                                                    <span className="path3"></span>
                                                    <span className="path4"></span>
                                                </i>
                                            </button>
                                        </div>
                                    </div>
                                    <div className="px-4 py-2 border-bottom bg-light">
                                        <div className="d-flex gap-2">
                                            <Select
                                                showSearch
                                                value={selectedYear}
                                                style={{ width: 120 }}
                                                placeholder="Year"
                                                optionFilterProp="children"
                                                onChange={setSelectedYear}
                                            >
                                                {years.map((year) => (
                                                    <Option key={year} value={year}>
                                                        {year}
                                                    </Option>
                                                ))}
                                            </Select>

                                            <Select
                                                showSearch
                                                value={selectedMonth}
                                                style={{ width: 160 }}
                                                placeholder="Month"
                                                optionFilterProp="children"
                                                onChange={setSelectedMonth}
                                            >
                                                {months.map((m) => (
                                                    <Option key={m.value} value={m.value}>
                                                        {m.label}
                                                    </Option>
                                                ))}
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="card-body pt-3">
                                        <div className="table-responsive">
                                            <table className="table table-bordered table-hover align-middle">
                                                <thead className="table-light">
                                                    <tr className="fw-bold">
                                                        <th>#</th>
                                                        <th>Department</th>
                                                        <th>Raised</th>
                                                        <th>Open</th>
                                                        <th>Closed</th>
                                                        <th>Previous Open</th>
                                                        <th>Total Open</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {Array.isArray(ticketsCountByMonth) &&
                                                        ticketsCountByMonth?.map((item, index) => (
                                                            <tr key={index}>
                                                                <td className='text-'>{index + 1}</td>
                                                                <td className='text-start'>
                                                                    {item.Department}
                                                                </td>
                                                                <td className='text-center text-primary fw-bold'>{item.SelectedMonthTicketsRaised}</td>
                                                                <td className='text-center text-warning fw-bold'>
                                                                    {item.OpenStatus}
                                                                </td>
                                                                <td className='text-center text-success fw-bold'>
                                                                    {item.ClosedStatus}
                                                                </td>
                                                                <td className='text-center text-warning fw-bold'>
                                                                    {item.PreviousMonthOpen}
                                                                </td>
                                                                <td className='text-center text-danger fw-bold'>
                                                                    {item.TotalOpenTickets}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                </div>
                            </div>

                            {/* Tickets Count by Month Mobile */}
                            <div className="col-xl-6 mb-10 d-block d-md-none">
                                <div className="card card-flush h-xl-100">
                                    <div className="card-header rounded bgi-no-repeat bgi-size-cover bgi-position-y-top bgi-position-x-center align-items-start h-100px">
                                        <h3 className="card-title align-items-start flex-column text-white pt-4">
                                            <span className="fw-bold fs-1x mb-3 text-dark">
                                                Tickets by Month
                                            </span>
                                        </h3>
                                        <div
                                            className="card-toolbar pt-5"
                                            data-bs-toggle="offcanvas"
                                            data-bs-target="#offcanvasRightViewTicketsByMonthData"
                                            aria-controls="offcanvasRightViewTicketsByMonthData"
                                        >
                                            <button className="btn btn-sm btn-icon btn-active-color-primary btn-color-primary bg-white bg-opacity-25 bg-hover-opacity-100 bg-hover-white bg-active-opacity-25 w-20px h-20px">
                                                <i className="ki-duotone ki-dots-square fs-3">
                                                    <span className="path1"></span>
                                                    <span className="path2"></span>
                                                    <span className="path3"></span>
                                                    <span className="path4"></span>
                                                </i>
                                            </button>
                                        </div>
                                    </div>

                                    <div className="card-body mt-n20">
                                        {Array.isArray(ticketsCountByMonth) &&
                                            ticketsCountByMonth?.map((item, index) => (
                                                <div
                                                    key={index}
                                                    className="card mb-3 shadow-sm border-0"
                                                >
                                                    <div className="card-body">

                                                        {/* Header */}
                                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                                            <span className="fw-bold text-primary">
                                                                #{index + 1}
                                                            </span>
                                                            <span className="badge bg-light text-dark">
                                                                {item.Department}
                                                            </span>
                                                        </div>

                                                        {/* Stats */}
                                                        <div className="row text-center g-2">
                                                            <div className="col-4">
                                                                <div className="small text-muted">Raised</div>
                                                                <div className="fw-bold">
                                                                    {item.SelectedMonthTicketsRaised}
                                                                </div>
                                                            </div>

                                                            <div className="col-4">
                                                                <div className="small text-muted">Open</div>
                                                                <div className="fw-bold text-warning">
                                                                    {item.OpenStatus}
                                                                </div>
                                                            </div>

                                                            <div className="col-4">
                                                                <div className="small text-muted">Closed</div>
                                                                <div className="fw-bold text-success">
                                                                    {item.ClosedStatus}
                                                                </div>
                                                            </div>
                                                            <div className="col-4">
                                                                <div className="small text-muted">Previous Open</div>
                                                                <div className="fw-bold text-danger">
                                                                    {item.PreviousMonthOpen}
                                                                </div>
                                                            </div>
                                                            <div className="col-4">
                                                                <div className="small text-muted">Total Open</div>
                                                                <div className="fw-bold text-warning">
                                                                    {item.TotalOpenTickets}
                                                                </div>
                                                            </div>
                                                        </div>

                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            </div>


                        </div>
                    </div>
                </div>
            </div>

            <div
                className="offcanvas offcanvas-end"
                tabIndex="-1"
                id="offcanvasRightScanQRCodeInfo"
                aria-labelledby="offcanvasRightLabel"
            >
                <div className="offcanvas-header">
                    <h5 id="offcanvasRightLabel">Scan Asset QR Code for Info</h5>
                    <button
                        type="button"
                        className="btn-close"
                        data-bs-dismiss="offcanvas"
                        aria-label="Close"
                    ></button>
                </div>
                <div className="offcanvas-body"
                    style={{
                        flex: 1,
                        overflowY: 'auto',
                        paddingBottom: '2rem',
                        maxHeight: 'calc(100vh - 100px)',
                        marginTop: '-2rem'
                    }}>
                    <div>
                        <div>
                            <label className='form-label'>Asset Code</label>
                            <input
                                className="form-control form-control-sm"
                                type="text"
                                placeholder='Enter Asset Code'
                                value={machineCodeInfo}
                                onChange={(e) => setMachineCodeInfo(e.target.value)}
                                disabled={mCNInfoLoading}
                            />
                        </div>

                        {/* Flex container for buttons */}
                        <div className="d-flex justify-content-center gap-3 my-4">
                            <button className='btn btn-primary btn-sm'
                                onClick={handleMcnInfoManualSubmit}
                                disabled={mCNInfoLoading}
                            >
                                {mCNInfoLoading ? 'Submitting...' : 'Submit'}
                            </button>

                            {!mcnInfoScannerStarted ? (
                                <button
                                    className="btn btn-info btn-sm"
                                    onClick={handleMCNInfoStartScan}
                                    disabled={mCNInfoLoading}
                                >
                                    Start Scan <i className="fa-solid fa-qrcode"></i>
                                </button>
                            ) : null}
                        </div>

                        {/* Show scanner when started */}
                        {mcnInfoScannerStarted && (
                            <div id="qr-reader" style={{ width: "100%" }}></div>
                        )}
                    </div>
                </div>
            </div>

            <style>
                {`
               .blurred {
  filter: blur(2px);
  pointer-events: none;
  user-select: none;
  transition: all 0.2s ease-in-out;
}

/* Overlay container */
.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  backdrop-filter: blur(1px);
  background-color: rgba(255, 255, 255, 0.4);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 999;
}

/* Optional spinner animation */
.spinner-border {
  width: 3rem;
  height: 3rem;
  border-width: 4px;
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
                    .hover-card {
                        transition: all 0.3s ease;
                        cursor: pointer;
                        height: 10rem;
                        background: rgba(236, 215, 215, 0.25);
                        backdrop-filter: blur(10px);
                        -webkit-backdrop-filter: blur(10px);
                        border: 1px solid rgba(255, 255, 255, 0.2);
                    }

                        /* Hover state */
                    .hover-card:hover {
                        box-shadow: 0 8px 20px rgba(0, 123, 255, 0.2);
                        transform: translateY(-4px);
                    }

                        /* Make text inside the card black on hover */
                    .hover-card:hover .text-gray-700,
                    .hover-card:hover .text-gray-700 {
                        color: #000 !important;
                    }

                    .single-line-text {
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    font-size: clamp(10px, 1.2vw, 16px);
                    max-width: 100%;
                    display: block;
                }

                .single-line-text1 {
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    max-width: 100%;
                    display: block;
                }
                    .coming-soon-wrapper {
                        position: relative;
                    }

                    .coming-soon-overlay {
                        position: absolute;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        backdrop-filter: blur(2px); /* The actual blur */
                        -webkit-backdrop-filter: blur(5px); /* Safari support */
                        background: rgba(242, 233, 233, 0.2); /* semi-transparent layer */
                        z-index: 10;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        pointer-events: none; /* lets clicks pass through */
                    }

                    .coming-soon-text {
                        font-size: 1.8rem;
                        font-weight: bold;
                        color: #fff;
                        text-shadow: 1px 1px 4px rgba(0, 0, 0, 0.5);
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

            <ViewMachinesDataByStatus statusText={machineStatus} deptId={selectedDepartment} unitId={selectedUnit} />
            <ViewTicketStatusByStatus statusText={ticketStatus} deptId={selectedDepartment} unitId={selectedUnit} />
            <ViewMoreOpenTickets ticketsObj={openTickets} />
            <ViewMoreMachineFailures mcnFailObj={machineFailures} />
            <ViewMoreAlerts alertType={alertType} deptId={selectedDepartment} unitId={selectedUnit} />
            <ViewMoreTicketsByMonth ticketsObj={ticketsCountByMonth} />
        </Base1>
    );
}
