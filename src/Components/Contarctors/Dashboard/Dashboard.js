import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Base1 from '../../Config/Base1';
import { fetchWithAuth } from "../../../utils/api";
import Swal from 'sweetalert2';
import dayjs from "dayjs"; // for date formatting
import { Select } from "antd";

export default function ContractorDashboard() {

    const navigate = useNavigate();
    const location = useLocation();
    const [sessionUserData, setsessionUserData] = useState({});
    const [sessionActionIds, setSessionActionIds] = useState([]);
    const [laborSummaryLoading, setLaborSummaryLoading] = useState(false);
    const [dashboardCountData, setDashboardCountData] = useState({});
    const [todayCheckOuts, setTodayCheckOuts] = useState([]);
    const [todayCheckIns, setTodayCheckIns] = useState([]);
    const [missedCheckOutsSlice, setMissedCheckOutsSlice] = useState([]);
    const [missedCheckOutsAll, setMissedCheckOutsAll] = useState([]);
    const [cumulativeHrs, setCumulativeHrs] = useState([]);
    const [laborSummaries, setLaborSummaries] = useState([]);
    const [cachedData, setCachedData] = useState({ today: null, yesterday: null });
    const [modules, setModules] = useState([]);
    const [selectedDate, setSelectedDate] = useState(
        new Date().toISOString().split("T")[0] // default today
    );
    const currentYear = dayjs().year();
    const currentMonth = dayjs().format("YYYY-MM-01");

    // State for Year and Month
    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [selectedMonth, setSelectedMonth] = useState(currentMonth);

    // Generate Years: Current + Last 2 Years
    const years = Array.from({ length: 3 }, (_, i) => ({
        label: (currentYear - i).toString(),
        value: currentYear - i,
    }));

    // Generate Months (Always returns YYYY-MM-01 based on selectedYear)
    const months = Array.from({ length: 12 }, (_, i) => {
        const date = dayjs().year(selectedYear).month(i).date(1);
        const isFutureMonth = date.isAfter(dayjs(), 'month'); // Checks if the month is in the future

        return {
            label: date.format("MMMM"),
            value: date.format("YYYY-MM-01"),
            disabled: isFutureMonth, // This property is recognized by Ant Design Select
        };
    });

    useEffect(() => {
        const userDataString = sessionStorage.getItem("userData");
        if (userDataString) {
            const userData = JSON.parse(userDataString);
            setsessionUserData(userData);
        } else {
            navigate("/");
        }
    }, [navigate]);

    useEffect(() => {
        const sessionMenuData = sessionStorage.getItem("menuData");
        try {
            const parsedMenu = JSON.parse(sessionMenuData);

            const ticketsMenu = parsedMenu.find(
                (item) => item.MenuName === "Visitors"
            );

            if (ticketsMenu) {
                const actionIdArray = ticketsMenu.ActionsIds?.split(",").map(Number);
                setSessionActionIds(actionIdArray);
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

    useEffect(() => {
        const fetchData = async () => {
            try {
                const today = new Date().toISOString().split("T")[0];

                const response = await fetchWithAuth(`contractor/CMSDashboard`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        OrgId: sessionUserData?.OrgId,
                        CheckInDate: today,
                        Type: 2,
                    }),
                });

                const result = await response.json();

                const results = result?.data?.result || [];

                // const cumulativeHrsData = results.filter((item) => item.Title === "CumulativeHrs");
                const missedCheckoutsList = results.filter((item) => item.Title === "MissedCheckOuts");

                setMissedCheckOutsSlice(missedCheckoutsList.slice(0, 3) || []);
                setMissedCheckOutsAll(missedCheckoutsList || []);
                // setCumulativeHrs(cumulativeHrsData.slice(0, 5) || []);

            } catch (error) {
                console.error("Error fetching CMS Dashboard data:", error);
            }
        };
        if (sessionUserData?.OrgId) {
            fetchData();
        }
    }, [sessionUserData]);

    useEffect(() => {
        if (sessionUserData && selectedMonth) {
            const fetchCumullativeHrs = async () => {
                try {
                    const today = new Date().toISOString().split("T")[0];

                    const response = await fetchWithAuth(`contractor/CMSDashboard`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            OrgId: sessionUserData?.OrgId,
                            CheckInDate: selectedMonth,
                            Type: 2,
                        }),
                    });

                    const result = await response.json();

                    const results = result?.data?.result || [];

                    const cumulativeHrsData = results.filter((item) => item.Title === "CumulativeHrs");

                    setCumulativeHrs(cumulativeHrsData.slice(0, 5) || []);

                } catch (error) {
                    console.error("Error fetching CMS Dashboard data:", error);
                }
            };
            if (sessionUserData?.OrgId) {
                fetchCumullativeHrs();
            }
        }
    }, [sessionUserData, selectedMonth]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const today = new Date().toISOString().split("T")[0];

                const response = await fetchWithAuth(`contractor/CMSDashboard`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        OrgId: sessionUserData?.OrgId,
                        CheckInDate: today,
                        Type: 1,
                    }),
                });

                const result = await response.json();

                const results = result?.data?.result || [];

                const formatted = results.reduce((acc, item) => {
                    acc[item.Title] = item;
                    return acc;
                }, {});

                setDashboardCountData(formatted);

            } catch (error) {
                console.error("Error fetching CMS Dashboard data:", error);
            }
        };

        if (sessionUserData?.OrgId) {
            fetchData();
        }
    }, [sessionUserData]);

    const fetchData = async (date) => {
        setLaborSummaryLoading(true);
        try {
            const response = await fetchWithAuth(`contractor/CMSDashboard`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    OrgId: sessionUserData?.OrgId,
                    CheckInDate: date,
                    Type: 1,
                }),
            });

            const result = await response.json();
            const results = result?.data?.result || [];
            const summaries = results.filter((item) => item.Title === "LabourSummary");

            // cache by date string
            setCachedData((prev) => ({ ...prev, [date]: summaries }));
            setLaborSummaries(summaries);
        } catch (error) {
            console.error("Error fetching CMS Dashboard data:", error);
        } finally {
            setLaborSummaryLoading(false);
        }
    };

    const fetchCheckOutsData = async () => {
        try {
            const today = new Date().toISOString().split("T")[0];
            const response = await fetchWithAuth(`contractor/CMSDashboard`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    OrgId: sessionUserData?.OrgId,
                    CheckInDate: today,
                    Type: 4,
                }),
            });

            const result = await response.json();

            const results = result?.data?.result || [];
            setTodayCheckOuts(results);
        } catch (error) {
            console.error("Error fetching CMS Dashboard data:", error);
        }
    };

    const fetchCheckInsData = async () => {
        try {
            const today = new Date().toISOString().split("T")[0];
            const response = await fetchWithAuth(`contractor/CMSDashboard`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    OrgId: sessionUserData?.OrgId,
                    CheckInDate: today,
                    Type: 3,
                }),
            });

            const result = await response.json();

            const results = result?.data?.result || [];
            setTodayCheckIns(results);
        } catch (error) {
            console.error("Error fetching CMS Dashboard data:", error);
        }
    };

    useEffect(() => {
        if (sessionUserData?.OrgId && selectedDate) {
            if (cachedData[selectedDate]) {
                // use cached data
                setLaborSummaries(cachedData[selectedDate]);
            } else {
                fetchData(selectedDate);
            }

            fetchCheckOutsData();
            fetchCheckInsData();
        }
    }, [sessionUserData, selectedDate]);

    const parseLabourSummary = (col1String) => {
        const shifts = {};

        col1String.split("|").forEach((shiftStr) => {
            const [shiftName, details] = shiftStr.trim().split(":");
            const [clCount, checkIns, checkOuts] = details
                .match(/CLCount\((\d+)\), CheckIns\((\d+)\), CheckOuts\((\d+)\)/)
                .slice(1)
                .map(Number);

            shifts[shiftName.trim()] = { clCount, checkIns, checkOuts };
        });

        return shifts;
    };

    const shifts = ["General Shift", "First Shift", "Second Shift", "Third Shift"];

    const formatAadhar = (num) => {
        if (!num) return "";  // handles null, undefined, "", 0 (if 0 is invalid)

        return num
            .toString()
            .replace(/\D/g, "")
            .replace(/(.{4})(?=.)/g, "$1 ");
    };

    const sumTimeStrings = (...times) => {
        let totalMinutes = 0;

        times.forEach(time => {
            if (!time || typeof time !== 'string' || !time.includes(':')) return;

            const [hours, minutes] = time.split(':').map(Number);
            totalMinutes += (hours * 60) + minutes;
        });

        const h = Math.floor(totalMinutes / 60);
        const m = totalMinutes % 60;

        // Returns format HH:MM, padding minutes with a leading zero if needed
        return `${h}:${String(m).padStart(2, '0')}`;
    };

    const iconColors = ['#FF6B35', '#00B8D9', '#36B37E', '#FFAB00', '#6554C0', '#FF5630'];

    return (
        <Base1>
            <div className="d-flex flex-column flex-column-fluid mb-10">
                <div id="kt_app_toolbar" className="app-toolbar py-3 py-lg-3">
                    <div
                        id="kt_app_toolbar_container"
                        className="app-container container-xxl d-flex justify-content-between align-items-center"
                    >
                        <div className="page-title d-md-block d-none mt-4">
                            <div className="dropdown d-inline-block">
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

                            <span className="menu-link bg-white shadow-sm me-2 cursor-pointer active" style={{ position: "relative", zIndex: 10 }}>
                                <span className="menu-title"><i className="fa-solid fa-border-all"></i> Dashboard</span>
                                <span className="menu-arrow"></span>
                            </span>
                        </div>

                        <div className="page-title d-md-none d-block mt-4">
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
                            <span className="menu-link bg-white shadow-sm me-2 cursor-pointer active" style={{ position: "relative", zIndex: 10 }}>
                                <span className="menu-title"><i className="fa-solid fa-border-all"></i></span>
                                <span className="menu-arrow"></span>
                            </span>
                        </div>

                        {/* <div>
                            <span className="aler alert-warnin p-3 mb-0 badge bg-blue text-white fw-bold fs-4">
                                <i className="fa-regular fa-calendar-days me-2 fa-beat-fade"></i> Current Month Total Working Days <span className='fw-bold text-white ms-2'>{dashboardCountData.MonthData?.Col2 || 0}</span>, Completed Days <span className='fw-bold text-white ms-2'>{dashboardCountData.MonthData?.Col3 || 0}</span>
                            </span>
                        </div> */}
                    </div>
                </div>

                <div id="kt_app_content" className="app-content flex-column-fluid" style={{ marginTop: '-20px' }}>
                    <div id="kt_app_content_container" className="app-container container-xxl">
                        <div className="row">
                            <div className="col-lg-3 col-sm-6">
                                <div className="card-box bg-blue rounded">
                                    <div className="inner">
                                        <h3>{dashboardCountData.MonthData?.Col2 || 0}</h3>
                                        <p className='fw-bold fs-2'>Working Days</p>
                                    </div>
                                    <div className="icon">
                                        <i className="fa-solid fa-calendar-days"></i>
                                    </div>
                                    <a className="card-box-footer fw-bold fs-5">This Month Completed - <span className='text-dark'>{dashboardCountData.MonthData?.Col3 || 0}</span></a>
                                </div>
                            </div>

                            <div className="col-lg-3 col-sm-6">
                                <Link to='/cms/contractors'>
                                    <div className="card-box bg-orange rounded">
                                        <div className="inner">
                                            <h3>{dashboardCountData.ContractorsCount?.Col1 || 0}</h3>
                                            <p className='fw-bold fs-2'>Contractors</p>
                                        </div>
                                        <div className="icon">
                                            <i className="fa-solid fa-helmet-safety"></i>
                                        </div>
                                        <a className="card-box-footer fw-bold fs-4">Active</a>
                                    </div>
                                </Link>
                            </div>

                            <div className="col-lg-3 col-sm-6">
                                <div className="card-box bg-green rounded cursor-pointer"
                                    data-bs-toggle="offcanvas"
                                    data-bs-target="#offcanvasRightCheckIns"
                                    aria-controls="offcanvasRightCheckIns"
                                >
                                    <div className="inner">
                                        <h3>{dashboardCountData.TodayCLCheckIns?.Col1 || 0}</h3>
                                        <p className='fw-bold fs-2'>CheckIn's</p>
                                    </div>
                                    <div className="icon">
                                        <i className="fa-solid fa-user-check"></i>
                                    </div>
                                    <a className="card-box-footer fw-bold fs-4">Today</a>
                                </div>
                            </div>

                            <div className="col-lg-3 col-sm-6"
                                data-bs-toggle="offcanvas"
                                data-bs-target="#offcanvasRightCheckOuts"
                                aria-controls="offcanvasRightCheckOuts"
                            >
                                <div className="card-box bg-red rounded cursor-pointer">
                                    <div className="inner">
                                        <h3>{dashboardCountData.TodayCLCheckOuts?.Col1 || 0}</h3>
                                        <p className='fw-bold fs-2'>Checkouts</p>
                                    </div>
                                    <div className="icon">
                                        <i className="fa-solid fa-user-clock"></i>
                                    </div>
                                    <a className="card-box-footer fw-bold fs-4">Today</a>
                                </div>
                            </div>
                        </div>

                        <div className="row g-5 g-xl-10 mt-0 mb-4">
                            <div className="col-12">
                                <div className="card card-flush overflow-hidden h-xl-100">
                                    <div className="card-header pt-7 mb-2 d-flex justify-content-between align-items-center">
                                        <h3 className="card-title text-gray-800 fw-bold mb-0">Labor Summary</h3>
                                        <div className="d-flex gap-2">
                                            <div className="mb-">
                                                <input
                                                    type="date"
                                                    className="form-control"
                                                    value={selectedDate}
                                                    onChange={(e) => {
                                                        const newDate = e.target.value;
                                                        
                                                        // If the user clears the date, newDate becomes an empty string. 
                                                        // We stop the logic here.
                                                        if (!newDate) return; 
                                                    
                                                        setSelectedDate(newDate);
                                                        if (cachedData[newDate]) {
                                                            setLaborSummaries(cachedData[newDate]);
                                                        } else {
                                                            fetchData(newDate);
                                                        }
                                                    }}
                                                    style={{ height: '2.5rem' }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="card-body">
                                        {laborSummaryLoading ? (
                                            <div className="text-center my-5">
                                                <div className="spinner-border text-primary" role="status"></div>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="d-none d-md-block table-responsive">
                                                    <table className="table table-bordered table-sm table-striped border-dark-top-left">
                                                        <thead>
                                                            <tr>
                                                                <th rowSpan="2" className="align-middle">#</th>
                                                                <th rowSpan="2" className="align-middle">Contractor</th>
                                                                {shifts?.map((shift, i) => (
                                                                    <th
                                                                        key={shift}
                                                                        colSpan="3"
                                                                        className="text-center shift-grou-header"
                                                                    >
                                                                        {shift}
                                                                    </th>
                                                                ))}
                                                            </tr>
                                                            <tr>
                                                                {shifts?.map((shift, i) => (
                                                                    <React.Fragment key={shift}>
                                                                        <th className="text-center border-start-dark">CL Count</th>
                                                                        <th className="text-center">Checkin</th>
                                                                        <th className="text-center">Checkout</th>
                                                                    </React.Fragment>
                                                                ))}
                                                            </tr>
                                                        </thead>

                                                        <tbody>
                                                            {laborSummaries.map((summary, index) => {
                                                                const shiftsData = summary.Col1 ? parseLabourSummary(summary.Col1) : {};
                                                                return (
                                                                    <tr key={index}>
                                                                        <td>{index + 1}</td>
                                                                        <td className="fs-5">{summary.ContractorName}</td>
                                                                        {shifts?.map((shift, i) => {
                                                                            const s = shiftsData[shift] || {
                                                                                clCount: 0,
                                                                                checkIns: 0,
                                                                                checkOuts: 0,
                                                                            };
                                                                            return (
                                                                                <React.Fragment key={shift}>
                                                                                    <td className="text-primary text-center fw-bold fs-5 border-start-dark">
                                                                                        {s.clCount}
                                                                                    </td>
                                                                                    <td className="text-success text-center fw-bold fs-5">
                                                                                        {s.checkIns}
                                                                                    </td>
                                                                                    <td className="text-danger text-center fw-bold fs-5">
                                                                                        {s.checkOuts}
                                                                                    </td>
                                                                                </React.Fragment>
                                                                            );
                                                                        })}
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>


                                                <div className="d-md-none">
                                                    {laborSummaries.map((summary, index) => {
                                                        const shiftsData = summary.Col1 ? parseLabourSummary(summary.Col1) : {};

                                                        const totalCL = Object.values(shiftsData).reduce(
                                                            (sum, s) => sum + (s.clCount || 0),
                                                            0
                                                        );

                                                        return (
                                                            <div key={index} className="card mb-3 shadow-sm border">
                                                                <div className="card-body p-2">
                                                                    <h6 className="fw-bold mb-2">
                                                                        #{index + 1} - {summary.ContractorName}
                                                                    </h6>

                                                                    <p className="mb-2">
                                                                        <strong>Total CL's:</strong>{" "}
                                                                        <span className="text-primary">{totalCL}</span>
                                                                    </p>

                                                                    <div className="table-responsive">
                                                                        <table className="table table-sm mb-0">
                                                                            <thead>
                                                                                <tr>
                                                                                    <th>Shift</th>
                                                                                    <th className="text-primary">CL Count</th>
                                                                                    <th className="text-success">IN</th>
                                                                                    <th className="text-danger">OUT</th>
                                                                                </tr>
                                                                            </thead>
                                                                            <tbody>
                                                                                {shifts?.map((shift) => {
                                                                                    const s = shiftsData[shift] || { clCount: 0, checkIns: 0, checkOuts: 0 };
                                                                                    return (
                                                                                        <tr key={shift}>
                                                                                            <td><strong>{shift}</strong></td>
                                                                                            <td className="text-primary fw-bold">{s.clCount}</td>
                                                                                            <td className="text-success fw-bold">{s.checkIns}</td>
                                                                                            <td className="text-danger fw-bold">{s.checkOuts}</td>
                                                                                        </tr>
                                                                                    );
                                                                                })}
                                                                            </tbody>
                                                                        </table>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="row g-5 g-xl-10 mb-4">
                            <div className="col-md-6">
                                <div className="card card-flush overflow-hidden h-xl-100">
                                    <div className="card-header d-flex justify-content-between align-items-center">
                                        <h3 className="card-title text-gray-800 fw-bold mb-0">Missed Checkout's</h3>
                                        <span className={`${missedCheckOutsAll.length > 0 ? 'd-block' : 'd-none'} badge badge-light-primary h-xl-25 p-1 d-flex align-items-center cursor-pointer`}
                                            data-bs-toggle="offcanvas"
                                            data-bs-target="#offcanvasRightMissedCheckOuts"
                                            aria-controls="offcanvasRightMissedCheckOuts"
                                        >
                                            View More <i className="fa fa-arrow-circle-right ms-2 mt-1"></i>
                                        </span>
                                    </div>
                                    <div className="card-body">
                                        {/* Desktop View */}
                                        <div className="d-none d-md-block table-responsive">
                                            {/* {missedCheckOutsSlice && missedCheckOutsSlice.length > 0 ? (
                                                <table className="table table-bordered table-sm table-striped">
                                                    <thead>
                                                        <tr>
                                                            <th>#</th>
                                                            <th>Contractor</th>
                                                            <th>Aadhar</th>
                                                            <th>CheckIn</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {missedCheckOutsSlice.map((item, index) => (
                                                            <tr key={index}>
                                                                <td>{index + 1}</td>
                                                                <td>{item.ContractorName}</td>
                                                                <td className="fw-bold text-primary">{formatAadhar(item.Col1) || 'N/A'}</td>
                                                                <td className="text-success fw-bold">{item.Col3}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            ) : (
                                                <p className="text-center text-muted my-3">No data available</p>
                                            )} */}
                                            <div className="d-flex flex-column gap-5">
                                                {missedCheckOutsSlice && missedCheckOutsSlice.length > 0 ? (
                                                    missedCheckOutsSlice.map((item, index) => (
                                                        <div key={index} className="d-flex align-items-center bg-light-danger rounded p-4 border border-dashed border-danger">
                                                            {/* 1. Icon/Avatar Wrapper */}
                                                            <div className="symbol symbol-40px me-4">
                                                                <div className="symbol-label bg-white">
                                                                    <i className="bi bi-person-exclamation text-danger fs-2"></i>
                                                                </div>
                                                            </div>

                                                            {/* 2. Content */}
                                                            <div className="flex-grow-1">
                                                                <div className="d-flex justify-content-between align-items-start">
                                                                    <div>
                                                                        <span className="text-gray-800 text-hover-primary fw-bold fs-6">
                                                                            {item.ContractorName}
                                                                        </span>
                                                                        <span className="text-muted d-block fw-semibold small">
                                                                            Aadhar: <span className="text-primary">{formatAadhar(item.Col1) || 'N/A'}</span>
                                                                        </span>
                                                                    </div>
                                                                    <div className="text-end">
                                                                        <span className="badge badge-light-danger fw-bold">Missed Check-out</span>
                                                                        <div className="text-muted fs-8 mt-1">Checked in at: {item.Col3}</div>
                                                                    </div>
                                                                </div>
                                                            </div>


                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="text-center py-10 bg-light rounded border border-dashed">
                                                        <i className="bi bi-shield-check text-success fs-3x mb-3 d-block"></i>
                                                        <span className="text-muted fw-bold">All contractors checked out correctly!</span>
                                                    </div>
                                                )}
                                            </div>

                                        </div>

                                        {/* Mobile View as Cards */}
                                        <div className="d-md-none">
                                            {missedCheckOutsSlice && missedCheckOutsSlice.length > 0 ? (
                                                missedCheckOutsSlice.map((item, index) => (
                                                    <div key={index} className="card border-0 border-start border-3 border-danger shadow-sm mb-4 bg-white">
                                                        <div className="card-body p-4">
                                                            <div className="d-flex align-items-center mb-3">
                                                                {/* Symbol/Icon */}
                                                                <div className="symbol symbol-35px me-3">
                                                                    <span className="symbol-label bg-light-danger">
                                                                        <i className="bi bi-person-exclamation text-danger fs-4"></i>
                                                                    </span>
                                                                </div>

                                                                {/* Title & Badge */}
                                                                <div className="d-flex justify-content-between align-items-center w-100">
                                                                    <span className="text-gray-800 fw-bold fs-6">{item.ContractorName}</span>
                                                                    <span className="badge badge-light-danger fw-bold px-2 py-1" style={{ fontSize: '0.65rem' }}>
                                                                        MISSED
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            {/* Details Section */}
                                                            <div className="bg-light-secondary rounded p-3">
                                                                <div className="d-flex justify-content-between mb-1">
                                                                    <span className="text-muted small fw-semibold">Aadhar:</span>
                                                                    <span className="text-primary small fw-bold">{formatAadhar(item.Col1) || "N/A"}</span>
                                                                </div>
                                                                <div className="d-flex justify-content-between">
                                                                    <span className="text-muted small fw-semibold">Checked In:</span>
                                                                    <span className="text-success small fw-bold">{item.Col3}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="text-center py-10 bg-light rounded border border-dashed">
                                                    <div className="mb-2">
                                                        <i className="bi bi-check2-circle text-success fs-1"></i>
                                                    </div>
                                                    <span className="text-muted fw-bold">No missed check-outs today</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="col-md-6">
                                <div className="card card-flush overflow-hidden h-xl-100">
                                    <div className="card-header d-flex justify-content-between align-items-center flex-wrap gap-2">
                                        <h3 className="card-title text-gray-800 fw-bold mb-0">
                                            Cumulative Hours By Week (Hrs)
                                        </h3>

                                        <div className="d-flex align-items-center gap-2">
                                            <div style={{ minWidth: "100px" }}>
                                                <Select
                                                    placeholder="Year"
                                                    style={{ width: "100%" }}
                                                    value={selectedYear}
                                                    onChange={(year) => {
                                                        setSelectedYear(year);
                                                        let newDate = dayjs(selectedMonth).year(year);
                                                        if (year === currentYear && newDate.isAfter(dayjs(), 'month')) {
                                                            newDate = dayjs().date(1);
                                                        }
                                                        setSelectedMonth(newDate.format("YYYY-MM-01"));
                                                    }}
                                                    options={years}
                                                    // Highlight the current year
                                                    optionRender={(option) => (
                                                        <div className="d-flex justify-content-between align-items-center">
                                                            <span>{option.label}</span>
                                                            {Number(option.value) === dayjs().year() && (
                                                                <span
                                                                    className="badge badge-circle bg-primary w-8px h-8px"
                                                                    title="Current Year"
                                                                ></span>
                                                            )}
                                                        </div>
                                                    )}
                                                />
                                            </div>
                                            <div style={{ minWidth: "150px" }}>
                                                <Select
                                                    showSearch
                                                    placeholder="Select month"
                                                    optionFilterProp="label"
                                                    style={{ width: "100%" }}
                                                    value={selectedMonth}
                                                    onChange={(value) => setSelectedMonth(value)}
                                                    options={months}
                                                    filterOption={(input, option) =>
                                                        (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
                                                    }
                                                    // Highlight the current month
                                                    optionRender={(option) => (
                                                        <div className="d-flex justify-content-between align-items-center">
                                                            <span className={option.disabled ? 'text-muted' : ''}>
                                                                {option.label}
                                                            </span>
                                                            {option.value === dayjs().format("YYYY-MM-01") && (
                                                                <span
                                                                    className="badge badge-circle bg-primary w-8px h-8px"
                                                                    title="Current Month"
                                                                ></span>
                                                            )}
                                                        </div>
                                                    )}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Body */}
                                    <div className="card-body">
                                        {/* Desktop / Tablet View */}
                                        {/* <div className="d-none d-md-block">
                                            <table className="table table-bordered table-sm table-striped">
                                                <thead>
                                                    <tr>
                                                        <th>#</th>
                                                        <th>Contractor</th>
                                                        <th className="text-center" style={{ width: "70px" }}>First</th>
                                                        <th className="text-center" style={{ width: "70px" }}>Second</th>
                                                        <th className="text-center" style={{ width: "70px" }}>Third</th>
                                                        <th className="text-center" style={{ width: "70px" }}>Fourth</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {cumulativeHrs?.map((item, index) => (
                                                        <tr key={index}>
                                                            <td>{index + 1}</td>
                                                            <td>{item.ContractorName}</td>
                                                            <td className="fw-bold text-center">{item.Col1}</td>
                                                            <td className="text-primary text-center fw-bold">{item.Col2}</td>
                                                            <td className="text-info text-center fw-bold">{item.Col3}</td>
                                                            <td className="text-danger text-center fw-bold">{item.Col4}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div> */}
                                        <div className="d-none d-md-block table-responsive" style={{ marginTop: '-18px' }}>
                                            <table className="table align-middle table-row-dashed fs-6 gy-4">
                                                <thead>
                                                    <tr className="text-start text-muted fw-bold fs-7 text-uppercase gs-0">
                                                        <th className="w-50px">#</th>
                                                        <th className="min-w-200px">Contractor</th>
                                                        <th className="text-center">Week 1</th>
                                                        <th className="text-center">Week 2</th>
                                                        <th className="text-center">Week 3</th>
                                                        <th className="text-center">Week 4</th>
                                                        <th className="text-center">Total (MTD)</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="text-gray-600 fw-semibold">
                                                    {cumulativeHrs?.map((item, index) => {
                                                        const rowTotal = sumTimeStrings(item.Col1, item.Col2, item.Col3, item.Col4);

                                                        return (
                                                            <tr key={index}>
                                                                <td>
                                                                    <span className="text-muted fw-bold">{index + 1}</span>
                                                                </td>
                                                                <td>
                                                                    <div className="d-flex align-items-center">
                                                                        {/* <div className="symbol symbol-35px symbol-circle me-3">
                                    <span className="symbol-label bg-light-primary text-primary fw-bold">
                                        {item.ContractorName?.charAt(0)}
                                    </span>
                                </div> */}
                                                                        <span className="text-gray-800 text-hover-primary fw-bold">
                                                                            {item.ContractorName}
                                                                        </span>
                                                                    </div>
                                                                </td>
                                                                <td className="text-center">
                                                                    <span className="badge badge-light-dark fw-bold">{item.Col1}h</span>
                                                                </td>
                                                                <td className="text-center">
                                                                    <span className="badge badge-light-primary fw-bold">{item.Col2}h</span>
                                                                </td>
                                                                <td className="text-center">
                                                                    <span className="badge badge-light-info fw-bold">{item.Col3}h</span>
                                                                </td>
                                                                <td className="text-center">
                                                                    <span className="badge badge-light-danger fw-bold">{item.Col4}h</span>
                                                                </td>
                                                                <td className="text-center">
                                                                    <span className="text-dark fw-bolder fs-7">{rowTotal}h</span>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Mobile View */}
                                        <div className="d-block d-md-none">
                                            {cumulativeHrs?.map((item, index) => (
                                                <div key={index} className="card mb-2 shadow-sm border">
                                                    <div className="card-body p-2">
                                                        <h6 className="fw-bold mb-2">
                                                            {index + 1}. {item.ContractorName}
                                                        </h6>
                                                        <div className="d-flex justify-content-between">
                                                            <span>First:</span>
                                                            <span className="fw-bold">{item.Col1}</span>
                                                        </div>
                                                        <div className="d-flex justify-content-between text-primary">
                                                            <span>Second:</span>
                                                            <span className="fw-bold">{item.Col2}</span>
                                                        </div>
                                                        <div className="d-flex justify-content-between text-info">
                                                            <span>Third:</span>
                                                            <span className="fw-bold">{item.Col3}</span>
                                                        </div>
                                                        <div className="d-flex justify-content-between text-danger">
                                                            <span>Fourth:</span>
                                                            <span className="fw-bold">{item.Col4}</span>
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
            </div>



            {/* Offcanvas Start */}
            {/* All Missed Checkouts */}
            <div
                className="offcanvas offcanvas-end"
                tabIndex="-1"
                id="offcanvasRightMissedCheckOuts"
                aria-labelledby="offcanvasRightLabel"
                style={{ width: "90%" }}
            >
                <style>
                    {`
                    @media (min-width: 768px) { /* Medium devices and up (md) */
                        #offcanvasRightMissedCheckOuts {
                            width: 45% !important;
                        }
                    }
                `}
                </style>
                <div className="offcanvas-header d-flex justify-content-between align-items-center mb-3">
                    <h5 id="offcanvasRightLabel" className="mb-0">Missed Checkouts</h5>
                    <div className="d-flex align-items-center">
                        <button
                            type="button"
                            className="btn-close"
                            data-bs-dismiss="offcanvas"
                            aria-label="Close"
                        ></button>
                    </div>
                </div>
                <div className="offcanvas-body"
                    style={{
                        marginTop: "-2rem",
                        maxHeight: "calc(100vh - 4rem)",  // take full height minus top offset
                        overflowY: "auto"
                    }}
                >
                    <div className="d-none d-md-block table-responsive">
                        <table className="table table-bordered table-sm table-striped">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Contractor</th>
                                    <th>Aadhar</th>
                                    <th>CheckIn</th>
                                </tr>
                            </thead>
                            <tbody>
                                {missedCheckOutsAll?.map((item, index) => (
                                    <tr key={index}>
                                        <td>{index + 1}</td>
                                        <td>{item.ContractorName}</td>
                                        <td className="fw-bold text-primary">{formatAadhar(item.Col1) || 'N/A'}</td>
                                        <td className="text-success fw-bold">{item.Col3}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile View as Cards */}
                    <div className="d-md-none">
                        {missedCheckOutsAll?.map((item, index) => (
                            <div key={index} className="card mb-2 shadow-sm border">
                                <div className="card-body p-2">
                                    <p className="mb-1"><strong>#{index + 1}</strong></p>
                                    <p className="mb-1"><strong>Contractor:</strong> {item.Col1}</p>
                                    <p className="mb-1">
                                        <strong>Aadhar:</strong> <span className="fw-bold text-primary">{formatAadhar(item.Col2) || 'N/A'}</span>
                                    </p>
                                    <p className="mb-0">
                                        <strong>CheckIn:</strong> <span className="text-success fw-bold">{item.Col4}</span>
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>

                </div>
            </div>

            {/* Today Checkins */}
            <div
                className="offcanvas offcanvas-end"
                tabIndex="-1"
                id="offcanvasRightCheckIns"
                aria-labelledby="offcanvasRightLabel"
                style={{ width: "90%" }}
            >
                <style>
                    {`
                    @media (min-width: 768px) { /* Medium devices and up (md) */
                        #offcanvasRightCheckIns {
                            width: 50% !important;
                        }
                    }
                `}
                </style>
                <div className="offcanvas-header d-flex justify-content-between align-items-center mb-3">
                    <h5 id="offcanvasRightLabel" className="mb-2">Today Check-in's</h5>
                    <div className="d-flex align-items-center">
                        <button
                            type="button"
                            className="btn-close"
                            data-bs-dismiss="offcanvas"
                            aria-label="Close"
                        ></button>
                    </div>
                </div>
                <div className="offcanvas-body"
                    style={{
                        marginTop: "-2rem",
                        maxHeight: "calc(100vh - 4rem)",  // take full height minus top offset
                        overflowY: "auto"
                    }}
                >
                    {todayCheckIns && todayCheckIns.length > 0 ? (
                        <>
                            <div className="d-none d-md-block table-responsive">
                                <table className="table table-bordered table-sm table-striped">
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>Contractor</th>
                                            <th>CL Name</th>
                                            <th>Aadhar</th>
                                            <th>CheckIn</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {todayCheckIns?.map((item, index) => (
                                            <tr key={index}>
                                                <td>{index + 1}</td>
                                                <td>{item.ContractorName}</td>
                                                <td>{item.Col1}</td>
                                                <td className="text-primary fw-bold">{formatAadhar(item.Col2) || "N/A"}</td>
                                                <td className="text-success">{item.Col3}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="d-md-none">
                                {todayCheckIns?.map((item, index) => (
                                    <div key={index} className="card mb-2 shadow-sm border">
                                        <div className="card-body p-2">
                                            <p className="mb-1"><strong>#{index + 1}</strong></p>
                                            <p className="mb-1"><strong>Contractor:</strong> {item.ContractorName}</p>
                                            <p className="mb-1"><strong>CL Name:</strong> {item.Col1}</p>
                                            <p className="mb-1">
                                                <strong>Aadhar:</strong>{" "}
                                                <span className="fw-bold text-primary">{formatAadhar(item.Col2) || "N/A"}</span>
                                            </p>
                                            <p className="mb-0">
                                                <strong>CheckIn:</strong>{" "}
                                                <span className="text-success fw-bold">{item.Col3}</span>
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="text-center text-muted py-3">
                            <i className="fa-solid fa-circle-info me-2"></i> No data available
                        </div>
                    )}
                </div>
            </div>

            {/* Today Checkouts */}
            <div
                className="offcanvas offcanvas-end"
                tabIndex="-1"
                id="offcanvasRightCheckOuts"
                aria-labelledby="offcanvasRightLabel"
                style={{ width: "90%" }}
            >
                <style>
                    {`
                    @media (min-width: 768px) { /* Medium devices and up (md) */
                        #offcanvasRightCheckOuts {
                            width: 50% !important;
                        }
                    }
                `}
                </style>
                <div className="offcanvas-header d-flex justify-content-between align-items-center mb-3">
                    <h5 id="offcanvasRightLabel" className="mb-0">Today Check-out's</h5>
                    <div className="d-flex align-items-center">
                        <button
                            type="button"
                            className="btn-close"
                            data-bs-dismiss="offcanvas"
                            aria-label="Close"
                        ></button>
                    </div>
                </div>
                <div className="offcanvas-body"
                    style={{
                        marginTop: "-2rem",
                        maxHeight: "calc(100vh - 4rem)",  // take full height minus top offset
                        overflowY: "auto"
                    }}
                >
                    {todayCheckOuts && todayCheckOuts.length > 0 ? (
                        <>
                            {/* Desktop view */}
                            <div className="d-none d-md-block table-responsive">
                                <table className="table table-bordered table-sm table-striped">
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>Contractor</th>
                                            <th>CL Name</th>
                                            <th>Aadhar</th>
                                            <th>CheckIn</th>
                                            <th>CheckOut</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {todayCheckOuts.map((item, index) => (
                                            <tr key={index}>
                                                <td>{index + 1}</td>
                                                <td>{item.ContractorName}</td>
                                                <td>{item.Col1}</td>
                                                <td className="text-primary fw-bold">{formatAadhar(item.Col2) || "N/A"}</td>
                                                <td className="text-success">{item.Col3}</td>
                                                <td className="text-danger">{item.Col4}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile view */}
                            <div className="d-md-none">
                                {todayCheckOuts.map((item, index) => (
                                    <div key={index} className="card mb-2 shadow-sm border">
                                        <div className="card-body p-2">
                                            <p className="mb-1"><strong>#{index + 1}</strong></p>
                                            <p className="mb-1"><strong>Contractor:</strong> {item.ContractorName}</p>
                                            <p className="mb-1"><strong>CL Name:</strong> {item.Col1}</p>
                                            <p className="mb-1">
                                                <strong>Aadhar:</strong>{" "}
                                                <span className="fw-bold text-primary">{formatAadhar(item.Col2) || "N/A"}</span>
                                            </p>
                                            <p className="mb-0">
                                                <strong>CheckIn:</strong>{" "}
                                                <span className="text-success fw-bold">{item.Col3}</span>
                                            </p>
                                            <p className="mb-0">
                                                <strong>CheckOut:</strong>{" "}
                                                <span className="text-danger fw-bold">{item.Col4}</span>
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="text-center text-muted py-3">
                            <i className="fa-solid fa-circle-info me-2"></i> No data available
                        </div>
                    )}

                </div>
            </div>
            {/* Offcanvas End */}

            <style>
                {`
                 .active-module .dropdown-item {
                    background-color: rgba(13, 110, 253, 0.1);
                    font-weight: 600;
                    border-radius: 4px;
                    transition: all 0.3s ease;
                    }

                    .active-module .dropdown-item span {
                    color: #0d6efd;
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
                        /* base style for each shift group */
                            /* Style for the top header cells (Shift Names) */
                        .shift-grou-header {
                            border-left: 2px solid #212529 !important;
                            font-weight: bold;
                        }

                        /* Style for the first column in every shift group (CL Count) */
                        .border-start-dark {
                            border-left: 2px solid #212529 !important;
                        }

                        /* Vertical alignment for headers with rowSpan */
                        .table thead th {
                            vertical-align: middle;
                        }
                    .card-box {
                        position: relative;
                        color: #fff;
                        padding: 20px 10px 30px;
                        margin: 20px 0px;
                    }
                    .card-box:hover {
                        text-decoration: none;
                        color: #f1f1f1;
                    }
                    .card-box:hover .icon i {
                        font-size: 100px;
                        transition: 1s;
                        -webkit-transition: 1s;
                    }
                    .card-box .inner {
                        padding: 5px 10px 0 10px;
                    }
                    .card-box h3 {
                        font-size: 27px;
                        font-weight: bold;
                        margin: 0 0 8px 0;
                        white-space: nowrap;
                        padding: 0;
                        text-align: left;
                    }
                    .card-box p {
                        font-size: 15px;
                    }
                    .card-box .icon {
                        position: absolute;
                        top: auto;
                        bottom: 5px;
                        right: 5px;
                        z-index: 0;
                        font-size: 72px;
                        color: rgba(0, 0, 0, 0.15);
                    }
                    .card-box .card-box-footer {
                        position: absolute;
                        left: 0px;
                        bottom: 0px;
                        text-align: center;
                        padding: 3px 0;
                        color: rgba(255, 255, 255, 0.8);
                        background: rgba(0, 0, 0, 0.1);
                        width: 100%;
                        text-decoration: none;
                    }
                    .card-box:hover .card-box-footer {
                        background: rgba(0, 0, 0, 0.3);
                    }
                    .bg-blue {
                        background-color: #00c0ef !important;
                    }
                    .bg-green {
                        background-color: #00a65a !important;
                    }
                    .bg-orange {
                        background-color: #f39c12 !important;
                    }
                    .bg-red {
                        background-color: #d9534f !important;
                    }
                    `}
            </style>

            {/* <AadhaarScanner conObj={checkOutCL} /> */}
        </Base1>
    )
}