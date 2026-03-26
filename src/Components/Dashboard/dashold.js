import React, {useState, useEffect} from 'react';
// import { Chart } from "react-google-charts";
import PassCheckIn from '../Visitings/PassCheckIn';
import { useNavigate } from 'react-router-dom';
import ViewVisit from '../Visitings/View';
import Base1 from '../Config/Base1';
// import Face from './facescan';
import Swal from "sweetalert2";
import { fetchWithAuth } from "../../utils/api";
import AddVisit from '../Visitings/Add';

export default function Dashboard () {

    const navigate = useNavigate();
    const [sessionUserData, setsessionUserData] = useState({});
    const [dashData, setDashData] = useState({});
    const [checkedInData, setCheckedInData] = useState({});
    const [checkedOutData, setCheckedOutData] = useState({});
    const [checkedInLbrData, setCheckedInLbrData] = useState({});
    const [dataLoading, setDataLoading] = useState(false);
    const [viewDataId, setViewDataId] = useState(null);
    const [visitorsData, setVistorsData] = useState([]);
    const [sessionActionIds, setSessionActionIds] = useState([]);

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
                    (item) => item.MenuName === "Dashboard"
                );
    
                if (ticketsMenu) {
                    const actionIdArray = ticketsMenu.ActionsIds?.split(",").map(Number);
                    setSessionActionIds(actionIdArray);
                }
            } catch (err) {
                console.error("Error parsing menuData:", err);
            }
        }, []);
    

    const fetchData = async () => {
        if (sessionUserData.OrgId) {
        // setDataLoading(true);
            try {
                const response = await fetchWithAuth(`visitor/VMSDashboard?OrgId=${sessionUserData.OrgId}`, {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                });
                if (response.ok) {
                    const data = await response.json();
                    setDashData(data);
                    // console.log(data);
                } else {
                    console.error('Failed to fetch attendance data:', response.statusText);
                }
            } catch (error) {
                console.error('Error fetching attendance data:', error.message);
            }
        }
    };

    useEffect(() => {
        if (sessionUserData) {
            fetchData();
            fetchActiveCheckIns();
            fetchLabourActiveCheckIns();
            fetchTodayVisiotrs();
        }
    }, [sessionUserData]);

    const fetchActiveCheckIns = async () => {
        setDataLoading(true);
    
        if (sessionUserData?.OrgId) {
            try {
                const [checkInRes, checkOutRes] = await Promise.allSettled([
                    fetchWithAuth(`visitor/ActiveVisitorCheckIns?OrgId=${sessionUserData.OrgId}`, {
                        method: "GET",
                    headers: { "Content-Type": "application/json" },
                    }),
                    fetchWithAuth(`visitor/ActiveVisitorCheckOuts?OrgId=${sessionUserData.OrgId}`, {
                        method: "GET",
                    headers: { "Content-Type": "application/json" },
                    })
                ]);
    
                if (checkInRes.status === 'fulfilled' && checkInRes.value.ok) {
                    const data = await checkInRes.value.json();
                    setCheckedInData(data?.ResultData || []);
                } else {
                    console.error("Failed to fetch check-ins:", checkInRes.reason || checkInRes.value?.statusText);
                    setCheckedInData([]);
                }
    
                if (checkOutRes.status === 'fulfilled' && checkOutRes.value.ok) {
                    const dataout = await checkOutRes.value.json();
                    setCheckedOutData(dataout?.ResultData || []);
                } else {
                    console.error("Failed to fetch check-outs:", checkOutRes.reason || checkOutRes.value?.statusText);
                    setCheckedOutData([]);
                }
    
            } catch (error) {
                console.error('Unexpected error during fetch:', error.message);
            } finally {
                setDataLoading(false);
            }
        }
    };    

    const fetchLabourActiveCheckIns = async () => {
        setDataLoading(true);
        try {
            if (sessionUserData && sessionUserData.OrgId) {
                const response = await fetchWithAuth(`contractor/getAadharCheckIns?OrgId=${sessionUserData.OrgId}`, {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                });
                if (response.ok) {
                    const data = await response.json();
                    if (data.ResultData.length > 0) {
                        setCheckedInLbrData(data.ResultData);
                    } else {
                        setCheckedInLbrData([]);
                    }
                } else {
                    console.error('Failed to fetch attendees data:', response.statusText);
                }
            }
        } catch (error) {
            console.error('Error fetching attendees data:', error.message);
        } finally {
            setDataLoading(false);
        }
    };
      
    const fetchTodayVisiotrs = async () => {
        try {
            if (sessionUserData && sessionUserData.OrgId) {
                const response = await fetchWithAuth(`visitor/TodayVisits?OrgId=${sessionUserData.OrgId}`, {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                });
                if (response.ok) {
                    const data = await response.json();
                    if (data.ResultData.length > 0) {
                        setVistorsData(data.ResultData);
                    } else {
                        setVistorsData([]);
                    }
                } else {
                    console.error('Failed to fetch attendees data:', response.statusText);
                }
            }
        } catch (error) {
            console.error('Error fetching attendees data:', error.message);
        } finally {
            setDataLoading(false);
        }
    };

    const monthColors = {
        January: "color: #ff5733",
        February: "color: #33ff57",
        March: "color: #3357ff",
        April: "color: #33d6ff",
        May: "color: #ff33f6",
        June: "color: #33fff5",
        July: "color: #f033ff",
        August: "color: #ff8c33",
        September: "color: #338aff",
        October: "color: #a3ff33",
        November: "color: #d633ff",
        December: "color: #33d6ff",
    };

    // const chartData = [
    //     ["Element", "Density", { role: "style" }], // Header row
    //     ...(dashData?.MonthWiseVisitorsCount
    //         ? dashData.MonthWiseVisitorsCount.map((item) => [
    //               item.MonthName.slice(0, 3), // Use the first 3 letters of the month
    //               item.VisitorCount || 0,    // Use 0 if VisitorCount is null or undefined
    //               monthColors[item.MonthName] || "color: #000000", // Default to black if no color found
    //         ])
    //         : []), // Fallback to an empty array if MonthWiseVisitorsCount is undefined
    // ];

    const chartData1 = [
        ["Element", "Density", { role: "style" }],
        ...(Array.isArray(dashData?.MonthWiseCLsCount)
          ? dashData.MonthWiseCLsCount
              .filter(item => item?.MonthName) // filter out undefined/null names
              .map((item) => [
                item.MonthName.slice(0, 3),
                item.CLsCount || 0,
                monthColors[item.MonthName] || "color: #000000",
              ])
          : []),
      ];
      
    // var settings = {
    //     dots: true,
    //     infinite: true,
    //     speed: 500,
    //     slidesToShow: 1,
    //     slidesToScroll: 1,
    //     autoplay: true,    
    //     autoplaySpeed: 2000,     
    // };

    const handleView = (item) => {
        setViewDataId(item);
    };

    const formatDateCheckin = (dateString) => {
        const date = new Date(dateString);
    
        // Extract UTC date components
        const day = String(date.getUTCDate()).padStart(2, '0');
        const month = String(date.getUTCMonth() + 1).padStart(2, '0'); // Months are 0-based
        const year = date.getUTCFullYear();
    
        // Extract UTC time components
        const hours = String(date.getUTCHours()).padStart(2, '0');
        const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    
        return `${day}-${month}-${year} ${hours}:${minutes}`;
    };

    const getDateRange = () => {
        const now = new Date();
        const startOfYear = new Date(now.getFullYear(), 0, 1);
    
        const formatDate = (date) =>
            date.toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
            });
    
        return `${formatDate(startOfYear)} - ${formatDate(now)}`;
    };


    const handleSendVisitorPass = async (item) => {
        Swal.fire({
          title: "Send Visitor Pass?",
          text: "Are you sure you want to send the visitor pass?",
          icon: "question",
          showCancelButton: true,
          confirmButtonText: "Yes, send it!",
          cancelButtonText: "No, cancel",
        }).then(async (result) => {
          if (result.isConfirmed) {
            try {
              // Build query string
              const params = new URLSearchParams({
                RequestId: item.RequestId,
                OrgId: sessionUserData.OrgId,
                UserId: sessionUserData.Id,
                VisitorId: item.VisitorId,
              });
      
              const response = await fetchWithAuth(
                `visitor/SendVisitorsPass?${params.toString()}`,
                { method: "GET" }
              );
      
              const data = await response.json();
              console.log(data);
      
              if (data.Status) {
                Swal.fire("Sent!", "The visitor pass has been sent.", "success");
              } else {
                Swal.fire("Error!", data.Message || "Failed to send visitor pass", "error");
              }
            } catch (error) {
              Swal.fire("Error!", "Something went wrong while sending.", "error");
              console.error(error);
            }
          }
        });
    };      

    const showAddBtn = sessionActionIds?.includes(1);
    const showVistCheckInOutBtn = sessionActionIds?.includes(14);

    return (
        <Base1>
            <div className="d-flex flex-column flex-column-fluid">
                <div id="kt_app_toolbar" className="app-toolbar py-3 py-lg-6">
                    <div id="kt_app_toolbar_container" className="app-container container-xxl d-flex flex-stack">
                        <div className="page-title ">
                            <ul className="breadcrumb breadcrumb-separatorless fw-semibold fs-7 my-0 pt-1">
                                <li className="breadcrumb-item text-muted">Dashboard</li>
                            </ul>
                        </div>
                        <div className="d-flex justify-content-between">
                            {showAddBtn &&
                                <div className="me-2">
                                    <a className={`btn btn-sm fw-bold btn-light-primary border border-primary ${showAddBtn ? 'd-block' : 'd-none'}`}
                                        data-bs-toggle="offcanvas" 
                                        data-bs-target="#offcanvasRightAdd" 
                                        aria-controls="offcanvasRightAdd"><i className="fa-solid fa-ticket me-0"></i>Create Request</a>
                                </div>
                            }
                            <div className="me-2">
                                <a className={`btn btn-sm fw-bold btn-light-info border border-info ${showVistCheckInOutBtn ? 'd-block' : 'd-none'}`}
                                    data-bs-toggle="offcanvas" 
                                    data-bs-target="#offcanvasRightPassCheckIn" 
                                    aria-controls="offcanvasRightPassCheckIn"><i className="fa-solid fa-qrcode me-0"></i>Scan Pass</a>
                            </div>
                            {/* <div className="">
                                <Link to='/contractors' className={`btn btn-sm fw-bold btn-info ${sessionUserData.RoleId === 2 ||  sessionUserData.RoleId === 1 ? 'd-block' : 'd-none'}`}>CL Chekin/Checkout</Link>
                            </div> */}
                            {/* <div className="ms-2">
                                <button data-bs-toggle="offcanvas" 
                                    data-bs-target="#offcanvasRightFaceScan" 
                                    aria-controls="offcanvasRightFaceScan" className={`btn btn-sm fw-bold btn-info ${sessionUserData.RoleId === 4 ||  sessionUserData.RoleId === 1 ? 'd-block' : 'd-none'}`}>Chekin/Checkout</button>
                            </div> */}
                        </div>
                    </div>
                </div>
                <div id="kt_app_content" className="app-content flex-column-fluid">
                    <div id="kt_app_content_container" className="app-container container-xxl">
                        <h6>Today Statistics</h6>
                        <div className="row g-5 gx-xl-10 mb-5 mb-xl-10">
                            <div className="" 
                                data-bs-toggle="offcanvas" 
                                data-bs-target="#offcanvasRightTodayLabrCI" 
                                aria-controls="offcanvasRightTodayLabrCI">
                                <div className="row g- gx-xl-10">
                                    {/* <div className="col-md-3">
                                        <div className="card card-flush h-xl-100 cursor-pointer" style={{ backgroundColor: '#F6E5CA' }}>
                                            <div className="card-header flex-nowrap">
                                                <h3 className="card-title align-items-start flex-column">
                                                    <span className="card-label fw-bold fs-4 text-gray-800">Labor Summary</span>
                                                    <span className="mt-1 fw-semibold fs-7">{dashData?.TodayCLSCounts?.[0]?.TotalDoneCheckIns || 0}</span>
                                                </h3>
                                                <div className="card-toolbar">
                                                    <button className="btn btn-icon justify-content-end" data-kt-menu-trigger="click"
                                                        data-kt-menu-placement="bottom-end" data-kt-menu-overflow="true"
                                                        >
                                                        <i className="fa-solid fa-arrow-right-to-bracket fs-1"></i>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div> */}
                                    <div className="col-md-3"
                                        data-bs-toggle="offcanvas" 
                                        data-bs-target="#offcanvasRightTodayVisitsCIOut" 
                                        aria-controls="offcanvasRightTodayVisitsCIOut"
                                    >
                                        <div className="card card-flush h-xl-100 cursor-pointer" style={{ backgroundColor: '#F3D6EF' }}>
                                            {/* <Link to='/contractors'> */}
                                                <div className="card-header flex-nowrap">
                                                    <h3 className="card-title align-items-start flex-column">
                                                        <span className="card-label fw-bold fs-4 text-gray-800">Checked-out Visitors</span>
                                                        <span className="mt-1 fw-semibold fs-7" >{dashData?.TodayActiveVisitorsCheckOuts?.[0]?.TodayActiveVisitorsCheckins || 0}</span>
                                                    </h3>
                                                    <div className="card-toolbar">
                                                        <button className="btn btn-icon justify-content-end" data-kt-menu-trigger="click"
                                                            data-kt-menu-placement="bottom-end" data-kt-menu-overflow="true"
                                                            >
                                                            <i className="fa-solid fa-helmet-safety fs-2"></i>                                                        
                                                        </button>
                                                    </div>
                                                </div>
                                            {/* </Link> */}
                                        </div>
                                    </div>
                                    <div className="col-md-3" 
                                        data-bs-toggle="offcanvas" 
                                        data-bs-target="#offcanvasRightTodayVisitsCI" 
                                        aria-controls="offcanvasRightTodayVisitsCI"
                                    >
                                        <div className="card card-flush h-xl-100 cursor-pointer" style={{ backgroundColor: '#BFDDE3' }}>
                                            <div className="card-header flex-nowrap">
                                                <h3 className="card-title align-items-start flex-column">
                                                    <span className="card-label fw-bold fs-4 text-gray-800">Checked-in Visitors</span>
                                                    <span className="mt-1 fw-semibold fs-7" >{dashData?.TodayActiveVisitorsCheckIns?.[0]?.TodayActiveVisitorsCheckins || 0}</span>
                                                </h3>
                                                <div className="card-toolbar">
                                                    <button className="btn btn-icon justify-content-end" data-kt-menu-trigger="click"
                                                        data-kt-menu-placement="bottom-end" data-kt-menu-overflow="true"
                                                        >
                                                        <i className="fa-solid fa-handshake fs-2"></i>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-md-3"
                                        data-bs-toggle="offcanvas" 
                                        data-bs-target="#offcanvasRightTodayVisits" 
                                        aria-controls="offcanvasRightTodayVisits"
                                    >
                                        <div className="card card-flush h-xl-100 cursor-pointer" style={{ backgroundColor: '#BFDDE3' }}>
                                            <div className="card-header flex-nowrap">
                                                <h3 className="card-title align-items-start flex-column">
                                                    <span className="card-label fw-bold fs-4 text-gray-800">Visits</span>
                                                    <span className="mt-1 fw-semibold fs-7" >{dashData?.TodayVisitorsCounts?.[0]?.TodayVisitorsCountQUery || 0}</span>
                                                </h3>
                                                <div className="card-toolbar">
                                                    <button className="btn btn-icon justify-content-end" data-kt-menu-trigger="click"
                                                        data-kt-menu-placement="bottom-end" data-kt-menu-overflow="true"
                                                        >
                                                        {/* <i className="ki-duotone ki-dots-square fs-1">
                                                            <span className="path1"></span>
                                                            <span className="path2"></span>
                                                            <span className="path3"></span>
                                                            <span className="path4"></span>
                                                        </i> */}
                                                        <i className="fa-solid fa-user-tie fs-2"></i>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="row g-5 g-xl-10 mb-5 mb-xl-10">
                            <div className="">
                                <div className="card card-flush overflow-hidden h-xl-100">
                                    <div className="card-header pt-7 mb-2">
                                        <h3 className="card-title text-gray-800 fw-bold">Visit History
                                        </h3>
                                        <div className="card-toolbar">
                                            <div data-kt-daterangepicker="true" data-kt-daterangepicker-opens="left"
                                                className="btn btn-sm btn-light d-flex align-items-center px-4" data-kt-initialized="1">
                                                <div className="text-gray-600 fw-bold">{getDateRange()}</div>
                                                <i className="ki-duotone ki-calendar-8 text-gray-500 lh-0 fs-2 ms-2 me-0">
                                                    <span className="path1"></span>
                                                    <span className="path2"></span>
                                                    <span className="path3"></span>
                                                    <span className="path4"></span>
                                                    <span className="path5"></span>
                                                    <span className="path6"></span>
                                                </i>
                                            </div>
                                        </div>
                                    </div>
                                    {/* <div className="card-body d-flex justify-content-between flex-column pt-0 pb-1 px-0">
                                        <Chart chartType="ColumnChart" width="100%" height="100%" data={chartData} />
                                    </div> */}
                                    
                                </div>
                            </div>
                            {/* <div className="">
                                <div className="card card-flush overflow-hidden h-xl-100">
                                    <div className="card-header pt-7 mb-2">
                                        <h3 className="card-title text-gray-800 fw-bold">Labours History
                                        </h3>
                                        <div className="card-toolbar">
                                            <div data-kt-daterangepicker="true" data-kt-daterangepicker-opens="left"
                                                className="btn btn-sm btn-light d-flex align-items-center px-4" data-kt-initialized="1">
                                                <div className="text-gray-600 fw-bold">{getDateRange()}</div>
                                                <i className="ki-duotone ki-calendar-8 text-gray-500 lh-0 fs-2 ms-2 me-0">
                                                    <span className="path1"></span>
                                                    <span className="path2"></span>
                                                    <span className="path3"></span>
                                                    <span className="path4"></span>
                                                    <span className="path5"></span>
                                                    <span className="path6"></span>
                                                </i>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="card-body d-flex justify-content-between flex-column pt-0 pb-1 px-0">
                                        <Chart chartType="ColumnChart" width="100%" height="100%" data={chartData1} />
                                    </div>
                                </div>
                            </div> */}
                        </div>
                        
                    </div>
                </div>
            </div>

            {/* Today Labour Checkin's */}
            <div
                className="offcanvas offcanvas-end"
                tabIndex="-1"
                id="offcanvasRightTodayLabrCI"
                aria-labelledby="offcanvasRightLabel"
                style={{ width: '85%' }}
            >
                <style>
                    {`
                        #offcanvasRightTodayLabrCI {
                            width: 80%; /* Default for mobile devices */
                        }

                        @media (min-width: 768px) {  
                            #offcanvasRightTodayLabrCI {
                                width: 50% !important; /* Medium screens and up */
                            }
                        }

                        @media (min-width: 1200px) {  
                            #offcanvasRightTodayLabrCI {
                                width: 45% !important; /* Even narrower for large desktops if needed */
                            }
                        }
                    `}
                </style>
                <div className="offcanvas-header d-flex justify-content-between align-items-center">
                    <h5 id="offcanvasRightLabel" className="mb-0">Today Active Labor Checkin's</h5>
                    <div className="d-flex align-items-center">
                        <button
                            type="button"
                            className="btn-close"
                            data-bs-dismiss="offcanvas"
                            aria-label="Close"
                        ></button>
                    </div>
                </div>
                <div className="offcanvas-body" style={{ marginTop: "-2rem", maxHeight: "42rem", overflowY: "auto" }}>
                    <div className="table-reponsive d-none d-md-block">
                        <table className='table'>
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Agency</th>
                                    <th>Aadhar</th>
                                    <th>Shift</th>
                                    <th>Checkin</th>
                                    <th>Checkout</th>
                                </tr>
                            </thead>
                            <tbody>
                                {dataLoading ? (
                                    <tr>
                                        <td colSpan="8" className="text-center">
                                            <div className="container"></div>
                                        </td>
                                    </tr>
                                ) : checkedInLbrData && checkedInLbrData?.length > 0 ? (
                                    checkedInLbrData?.map((item, index) => (
                                    <tr key={index}>
                                        <td>{index + 1}</td>
                                        <td className="fw-bold text-info">{item.ContractorName}</td>
                                        {/* <td className="fw-semibold">{item.AadharNo}</td> */}
                                        <td className="fw-semibold">
                                            {item.AadharNo?.replace(/(\d{4})(\d{4})(\d{4})/, "$1 $2 $3")}
                                        </td>
                                        <td className="fw-semibold">{item.ShiftName}</td>
                                        <td className={item?.CheckIn ? "text-success" : "text-warning"}>
                                          {item?.CheckIn ? formatDateCheckin(item.CheckIn) : "Not checked in"}
                                        </td>
                                      
                                        <td className={item?.CheckOut ? "text-danger" : "text-warning"}>
                                          {item?.CheckOut ? formatDateCheckin(item.CheckOut) : "Not checked out yet"}
                                        </td>
                                    </tr>    
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="8" className="text-center">
                                        <p>No Data Available</p>
                                    </td>
                                </tr>
                            )}
                            </tbody>
                        </table>
                    </div>

                    <div className="d-block d-md-none">
                        {dataLoading ? (
                            <div className="container"></div>
                        ) : checkedInLbrData && checkedInLbrData?.length > 0 ? (
                            checkedInLbrData?.map((item, index) => (
                                <div key={item.Id} className="card mb-2 shadow-sm rounded">
                                    <div className="card-body">
                                        <div className="mb-2">
                                            <div className="d-flex justify-content-between">
                                                <span className="text-muted">Agency:</span>
                                                <span className="fw-semibold">{item.ContractorName}</span>
                                            </div>
                                            <div className="d-flex justify-content-between">
                                                <span className="text-muted">Aadhar No:</span>
                                                <span className="fw-semibold">{item.AadharNo?.replace(/(\d{4})(\d{4})(\d{4})/, "$1 $2 $3")}</span>
                                            </div>
                                            <div className="d-flex justify-content-between">
                                                <span className="text-muted">Shift:</span>
                                                <span className="fw-semibold">{item.ShiftName || 'N/A'}</span>
                                            </div>
                                            <div className="d-flex justify-content-between">
                                                <span className="text-muted">CheckIn:</span>
                                                <span className={item?.CheckIn ? "text-success" : "text-warning"}>
                                                    {item?.CheckIn ? formatDateCheckin(item.CheckIn) : "Not checked out yet"}
                                                </span>
                                            </div>
                                            <div className="d-flex justify-content-between">
                                                <span className="text-muted">CheckOut:</span>
                                                <span className={item?.CheckOut ? "text-success" : "text-warning"}>
                                                    {item?.CheckOut ? formatDateCheckin(item.CheckOut) : "Not checked out yet"}
                                                </span>
                                            </div>
                                        </div>
                                        {/* <div className="d-flex justify-content-between gap-2">
                                            <span
                                                className="badge badge-light-primary w-100 d-flex justify-content-center align-items-center"
                                                data-bs-toggle="offcanvas"
                                                data-bs-target="#offcanvasRightView"
                                                aria-controls="offcanvasRightView"
                                                onClick={() => handleView(item)}
                                            >
                                                View more details
                                            </span>
                                        </div> */}
                                    </div>
                                </div>
                            ))

                        ) : (
                            <p className="text-center mt-5">No Data Available</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Checked In Visits */}
            <div
                className="offcanvas offcanvas-end"
                tabIndex="-1"
                id="offcanvasRightTodayVisitsCI"
                aria-labelledby="offcanvasRightLabel"
                style={{ width: "90%" }}
            >
                <style>
                {`
                    #offcanvasRightTodayVisitsCI {
                    width: 90%; /* Default for mobile devices */
                    }

                    @media (min-width: 768px) {  
                    #offcanvasRightTodayVisitsCI {
                        width: 80% !important; /* Medium screens and up */
                    }
                    }

                    @media (min-width: 1200px) {  
                    #offcanvasRightTodayVisitsCI {
                        width: 45% !important; /* Even narrower for large desktops if needed */
                    }
                    }
                `}
            </style>
                <div className="offcanvas-header d-flex justify-content-between align-items-center">
                    <h5 id="offcanvasRightLabel" className="mb-0">Today Checked In Visits</h5>
                    <div className="d-flex align-items-center">
                        <button
                            type="button"
                            className="btn-close"
                            data-bs-dismiss="offcanvas"
                            aria-label="Close"
                        ></button>
                    </div>
                </div>
                <div className="offcanvas-body" style={{ marginTop: "-2rem", maxHeight: "42rem", overflowY: "auto" }}>
                    <div className="table-reponsive d-none d-md-block">
                        <table className='table'>
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Req No</th>
                                    <th>Visitor</th>
                                    <th>Mobile</th>
                                    <th>Check In</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {dataLoading ? (
                                    <tr>
                                        <td colSpan="8" className="text-center">
                                            <div className="container"></div>
                                        </td>
                                    </tr>
                                ) : checkedInData && checkedInData?.length > 0 ? (
                                    checkedInData?.map((item, index) => (
                                    <tr key={index}>
                                        <td>{index + 1}</td>
                                        <td className='text-info'>{item.AutoIncNo}</td>
                                        <td>{item.Name}</td>
                                        <td>{item.Mobile || 'N/A'}</td>
                                        <td className='text-success'>{formatDateCheckin(item.CheckInTime)}</td>
                                        <td
                                            data-bs-toggle="offcanvas"
                                            data-bs-target="#offcanvasRightView"
                                            aria-controls="offcanvasRightView"
                                            onClick={() => handleView(item)}
                                        ><i className="fa-regular fa-eye me-2" style={{ cursor: 'pointer' }}></i></td>
                                    </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="8" className="text-center">
                                            <p>No Data Available</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="d-block d-md-none">
                        {dataLoading ? (
                            <div className="container"></div>
                        ) : checkedInData && checkedInData?.length > 0 ? (
                            checkedInData?.map((item, index) => (
                                <div key={item.Id} className="card mb-2 shadow-sm rounded">
                                    <div className="card-body">
                                        <div className="mb-2">
                                            <div className="d-flex justify-content-between">
                                                <span className="text-muted">Request Id:</span>
                                                <span className="fw-semibold">{item.AutoIncNo}</span>
                                            </div>
                                            <div className="d-flex justify-content-between">
                                                <span className="text-muted">Visitor:</span>
                                                <span className="fw-semibold">{item.Name}</span>
                                            </div>
                                            <div className="d-flex justify-content-between">
                                                <span className="text-muted">Mobile:</span>
                                                <span className="fw-semibold">{item.Mobile || 'N/A'}</span>
                                            </div>
                                            <div className="d-flex justify-content-between">
                                                <span className="text-muted">CheckIn:</span>
                                                <span className={item?.CheckInTime ? "text-success" : "text-warning"}>
                                                    {item?.CheckInTime ? formatDateCheckin(item.CheckInTime) : "Not checked out yet"}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="d-flex justify-content-between gap-2">
                                            <span
                                                className="badge badge-light-primary w-100 d-flex justify-content-center align-items-center"
                                                data-bs-toggle="offcanvas"
                                                data-bs-target="#offcanvasRightView"
                                                aria-controls="offcanvasRightView"
                                                onClick={() => handleView(item)}
                                            >
                                                View more details
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))

                        ) : (
                            <p className="text-center mt-5">No Data Available</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Checked Out Visits */}
            <div
                className="offcanvas offcanvas-end"
                tabIndex="-1"
                id="offcanvasRightTodayVisitsCIOut"
                aria-labelledby="offcanvasRightLabel"
                style={{ width: "90%" }}
            >
                <style>
                    {`
                        #offcanvasRightTodayVisitsCIOut {
                            width: 90%; /* Default for mobile devices */
                        }

                        @media (min-width: 768px) {  
                            #offcanvasRightTodayVisitsCIOut {
                                width: 80% !important; /* Medium screens and up */
                            }
                        }

                        @media (min-width: 1200px) {  
                            #offcanvasRightTodayVisitsCIOut {
                                width: 45% !important; /* Even narrower for large desktops if needed */
                            }
                        }
                    `}
                </style>
                <div className="offcanvas-header d-flex justify-content-between align-items-center">
                    <h5 id="offcanvasRightLabel" className="mb-0">Today Checked Out Visits</h5>
                    <div className="d-flex align-items-center">
                        <button
                            type="button"
                            className="btn-close"
                            data-bs-dismiss="offcanvas"
                            aria-label="Close"
                        ></button>
                    </div>
                </div>
                <div className="offcanvas-body" style={{ marginTop: "-2rem", maxHeight: "42rem", overflowY: "auto" }}>
                    <div className="table-reponsive d-none d-md-block">
                        <table className='table'>
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Id</th>
                                    <th>Visitor</th>
                                    <th>Mobile</th>
                                    <th>Check Out</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {dataLoading ? (
                                    <tr>
                                        <td colSpan="8" className="text-center">
                                            <div className="container"></div>
                                        </td>
                                    </tr>
                                ) : checkedOutData && checkedOutData?.length > 0 ? (
                                    checkedOutData?.map((item, index) => (
                                    <tr key={index}>
                                        <td>{index + 1}</td>
                                        <td className='text-info'>{item.AutoIncNo}</td>
                                        <td>{item.Name}</td>
                                        <td>{item.Mobile || 'N/A'}</td>
                                        <td className='text-danger'>{formatDateCheckin(item.CheckoutTime)}</td>
                                        <td
                                            data-bs-toggle="offcanvas"
                                            data-bs-target="#offcanvasRightView"
                                            aria-controls="offcanvasRightView"
                                            onClick={() => handleView(item)}
                                        ><i className="fa-regular fa-eye me-2" style={{ cursor: 'pointer' }}></i></td>
                                    </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="8" className="text-center">
                                            <p>No Data Available</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    
                    {/* Mobile view */}
                    <div className="d-block d-md-none">
                        {dataLoading ? (
                            <div className="container"></div>
                        ) : checkedOutData && checkedOutData?.length > 0 ? (
                            checkedOutData?.map((item, index) => (
                                <div key={item.Id} className="card mb-2 shadow-sm rounded">
                                    <div className="card-body">
                                        <div className="mb-2">
                                            <div className="d-flex justify-content-between">
                                                <span className="text-muted">Request Id:</span>
                                                <span className="fw-semibold">{item.AutoIncNo}</span>
                                            </div>
                                            <div className="d-flex justify-content-between">
                                                <span className="text-muted">Visitor:</span>
                                                <span className="fw-semibold">{item.Name}</span>
                                            </div>
                                            <div className="d-flex justify-content-between">
                                                <span className="text-muted">Mobile:</span>
                                                <span className="fw-semibold">{item.Mobile || 'N/A'}</span>
                                            </div>
                                            <div className="d-flex justify-content-between">
                                                <span className="text-muted">CheckOut:</span>
                                                <span className="text-danger">
                                                    {formatDateCheckin(item.CheckoutTime)}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="d-flex justify-content-between gap-2">
                                            <span
                                                className="badge badge-light-primary w-100 d-flex justify-content-center align-items-center"
                                                data-bs-toggle="offcanvas"
                                                data-bs-target="#offcanvasRightView"
                                                aria-controls="offcanvasRightView"
                                                onClick={() => handleView(item)}
                                            >
                                                View more details
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))

                        ) : (
                            <p className="text-center mt-5">No Data Available</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Today visits */}
            <div
                className="offcanvas offcanvas-end"
                tabIndex="-1"
                id="offcanvasRightTodayVisits"
                aria-labelledby="offcanvasRightLabel"
                style={{ width: "90%" }}
            >
                <style>
                    {`
                        #offcanvasRightTodayVisits {
                            width: 80%; /* Default for mobile devices */
                        }

                        @media (min-width: 768px) {  
                            #offcanvasRightTodayVisits {
                                width: 50% !important; /* Medium screens and up */
                            }
                        }

                        @media (min-width: 1200px) {  
                            #offcanvasRightTodayVisits {
                                width: 45% !important; /* Even narrower for large desktops if needed */
                            }
                        }
                    `}
                </style>
                <div className="offcanvas-header d-flex justify-content-between align-items-center">
                    <h5 id="offcanvasRightLabel" className="mb-0">Today Visits</h5>
                    <div className="d-flex align-items-center">
                        <button
                            type="button"
                            className="btn-close"
                            data-bs-dismiss="offcanvas"
                            aria-label="Close"
                        ></button>
                    </div>
                </div>
                <div className="offcanvas-body" style={{ marginTop: "-2rem", maxHeight: "42rem", overflowY: "auto" }}>
                    <div className="table-reponsive d-none d-md-block">
                        <table className='table'>
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Request Id</th>
                                    <th>Visitor</th>
                                    <th>Chekin</th>
                                    <th>Checkout</th>
                                    <th>Status</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {dataLoading ? (
                                    <tr>
                                        <td colSpan="8" className="text-center">
                                            <div className="container"></div>
                                        </td>
                                    </tr>
                                ) : visitorsData && visitorsData?.length > 0 ? (
                                    visitorsData?.map((item, index) => (
                                    <tr key={index}>
                                        <td>{index + 1}</td>
                                        <td className='text-info'>{item.AutoIncNo}</td>
                                        <td>{item.Name}</td>
                                        <td className={item?.CheckInTime ? "text-success" : "text-warning"}>
                                          {item?.CheckInTime ? formatDateCheckin(item.CheckInTime) : "Not checked in"}
                                        </td>
                                        <td className={item?.CheckOutTime ? "text-danger" : "text-warning"}>
                                          {item?.CheckOutTime ? formatDateCheckin(item.CheckOutTime) : "Not checked out yet"}
                                        </td>
                                        <td>
                                            <div
                                                className={
                                                    item.Status === "DRAFT"
                                                        ? "badge badge-light-dark"
                                                        : item.Status === "APPROVED"
                                                        ? "badge badge-light-info"
                                                        : item.Status === "REJECTED"
                                                        ? "badge badge-light-warning"
                                                        : item.Status === "CHECKEDOUT"
                                                        ? "badge badge-light-secondary"
                                                        : item.Status === "CANCELED"
                                                        ? "badge badge-light-danger"
                                                        : item.Status === "COMPLETED"
                                                        ? "badge badge-light-success"
                                                        : "badge badge-light"
                                                }
                                            >
                                                {item.Status}
                                            </div>
                                        </td>
                                        <td>
                                            <i 
                                                className="fa-regular fa-eye me-2 cursor-pointer text-primary" 
                                                title='View Details'
                                                data-bs-toggle="offcanvas"
                                                data-bs-target="#offcanvasRightView"
                                                aria-controls="offcanvasRightView"
                                                onClick={() => handleView(item)}
                                            ></i>
                                            <i 
                                                className="fa-solid fa-envelope-circle-check cursor-pointer ms-4 text-info"
                                                title='Send Email to visitor'
                                                onClick={() => handleSendVisitorPass(item)}>
                                            </i>
                                        </td>
                                    </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="8" className="text-center">
                                            <p>No Data Available</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                        
                    {/* Mobile view */}
                    <div className="d-block d-md-none">
                        {dataLoading ? (
                            <div className="container"></div>
                        ) : visitorsData && visitorsData?.length > 0 ? (
                            visitorsData?.map((item, index) => (
                                <div key={item.Id} className="card mb-2 shadow-sm rounded">
                                    <div className="card-body">
                                        <div className="mb-2">
                                            <div className="d-flex justify-content-between">
                                                <span className="text-muted">Request Id:</span>
                                                <span className="fw-semibold">{item.AutoIncNo}</span>
                                            </div>
                                            <div className="d-flex justify-content-between">
                                                <span className="text-muted">Visitor:</span>
                                                <span className="fw-semibold">{item.Name}</span>
                                            </div>
                                            <div className="d-flex justify-content-between">
                                                <span className="text-muted">CheckIn:</span>
                                                <span className={item?.CheckInTime ? "text-danger" : "text-warning"}>
                                                    {item?.CheckInTime ? formatDateCheckin(item.CheckInTime) : "Not checked out yet"}
                                                </span>
                                            </div>
                                            <div className="d-flex justify-content-between">
                                                <span className="text-muted">CheckOut:</span>
                                                <span className={item?.CheckOutTime ? "text-danger" : "text-warning"}>
                                                    {item?.CheckOutTime ? formatDateCheckin(item.CheckOutTime) : "Not checked out yet"}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="d-flex justify-content-between gap-2">
                                            <span
                                                className="badge badge-light-primary w-100 d-flex justify-content-center align-items-center"
                                                data-bs-toggle="offcanvas"
                                                data-bs-target="#offcanvasRightView"
                                                aria-controls="offcanvasRightView"
                                                onClick={() => handleView(item)}
                                            >
                                                <i className="fa-regular fa-eye me-1"></i>View Visit
                                            </span>

                                            <span
                                                className="badge badge-light-info w-100 d-flex justify-content-center align-items-center"
                                                title="Send Email to visitor"
                                                onClick={() => handleSendVisitorPass(item)}
                                            >
                                                <i className="fa-solid fa-envelope-circle-check me-1"></i>Send Email
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))

                        ) : (
                            <p className="text-center mt-5">No Data Available</p>
                        )}
                    </div>
                </div>
            </div>

            <PassCheckIn />
            <ViewVisit viewObj={viewDataId} />     
            <AddVisit />
            {/* <Face />     */}
        </Base1>
    )
}