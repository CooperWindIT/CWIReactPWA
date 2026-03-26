
import React, { useState, useEffect } from "react";
import Base1 from "../Config/Base1";
import { Popover } from 'antd';
import ViewVisit from "./View";
import '../Config/Pagination.css';
import AddVisit from "./Add";
import Swal from 'sweetalert2';
// import QRCode from 'qrcode'; 
// import PrintPass from './PrintPass';
import EditPass from "./Edit";
import PassCheckIn from "./PassCheckIn";
import '../Config/Loader.css';
import { Link, useNavigate } from "react-router-dom";
import { InboxOutlined } from '@ant-design/icons';
import { Upload } from 'antd';
import { Select } from 'antd';
import { fetchWithAuth } from "../../utils/api";
import Pagination from "../Pagination/Pagination";

const { Option } = Select;

const { Dragger } = Upload;

export default function VisitingList() {

    const navigate = useNavigate();
    const [sessionUserData, setSessionUserData] = useState([]);
    const [visitorsData, setVistorsData] = useState([]);
    const [dataLoading, setDataLoading] = useState(false);
    const [viewObjData, setViewObjData] = useState([]);
    const [editData, setEditData] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    // const [qrCodeUrl, setQrCodeUrl] = useState(null);
    // const [printData, setPrintData] = useState([]);
    const [momContent, setMomContent] = useState('');
    const [requestId, setRequestId] = useState(null);
    const [displayFilters, setDisplayFilters] = useState(true);
    const [momBtnLoading, setMomBtnLoading] = useState(false);
    const [attachmentFile, setAttachmentFile] = useState(null);
    const [visitorTypesData, setVisitorTypesData] = useState([]);
    const [sessionActionIds, setSessionActionIds] = useState([]);
    const [visitorsCache, setVisitorsCache] = useState({});
    const [totalRecords, setTotalRecords] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const recordsPerPage = 5;

    // Get first day of current month
    const today = new Date();

    // First day of current month (local time, no UTC shift)
    const firstDayDate = new Date(today.getFullYear(), today.getMonth(), 1);
    const firstDay = firstDayDate.toLocaleDateString("en-CA"); // YYYY-MM-DD format

    // Last day of current month
    const lastDayDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const lastDay = lastDayDate.toLocaleDateString("en-CA"); // YYYY-MM-DD format

    const [filters, setFilters] = useState({
        FromDate: firstDay,
        ToDate: lastDay,
        VisitorType: "0",
        Status: "0",
        AutoIncNo: "0",
        RoleId: sessionUserData.RoleId,
        UserId: sessionUserData.UserId,
    });

    // const printRef = useRef();

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

    const getCurrentDate = () => {
        const today = new Date();
        return today.toISOString().split("T")[0];
    };

    // const fetchVisitorsData = async () => {
    //     setDataLoading(true);
    //     const today = new Date();

    //     // First day of current month (local time, no UTC shift)
    //     const firstDayDate = new Date(today.getFullYear(), today.getMonth(), 1);
    //     const firstDay = firstDayDate.toLocaleDateString("en-CA"); // YYYY-MM-DD format

    //     // Last day of current month
    //     const lastDayDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    //     const lastDay = lastDayDate.toLocaleDateString("en-CA"); // YYYY-MM-DD format
    //     const startOfMonth = new Date(firstDay);
    //     const endOfMonth = new Date(lastDay);

    //     // Format date to yyyy-mm-dd
    //     const formatDate = (date) => {
    //         return date.toISOString().split("T")[0];
    //     };

    //     try {
    //         const payload = {
    //             OrgId: sessionUserData.OrgId,
    //             // FromDate: "0",
    //             // ToDate: "0",
    //             FromDate: formatDate(startOfMonth),
    //             ToDate: formatDate(endOfMonth),
    //             VisitorType: filters.VisitorType || 0,
    //             Status: filters.Status || 0,
    //             AutoIncNo: 0,
    //             RoleId: sessionUserData.RoleId,
    //             UserId: sessionUserData.Id,
    //         };

    //         const response = await fetchWithAuth(`visitor/getReqPasswithFilters`, {
    //             method: "POST",
    //             headers: {
    //                 "Content-Type": "application/json",
    //             },
    //             body: JSON.stringify(payload),
    //         });
    //         if (response.ok) {
    //             const data = await response.json();
    //             setVistorsData(data);
    //         } else {
    //             console.error('Failed to fetch visitors data:', response.statusText);
    //         }
    //     } catch (error) {
    //         console.error('Error fetching visitors data:', error.message);
    //     } finally {
    //         setDataLoading(false);
    //     }
    // };

     const fetchVisitorsData = async (page = 1) => {
                if (visitorsCache[page]) {
                    setVistorsData(visitorsCache[page]);
                    setCurrentPage(page);
                    return;
                }
                setDataLoading(true);
                const today = new Date();

        // First day of current month (local time, no UTC shift)
        const firstDayDate = new Date(today.getFullYear(), today.getMonth(), 1);
        const firstDay = firstDayDate.toLocaleDateString("en-CA"); // YYYY-MM-DD format

        // Last day of current month
        const lastDayDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        const lastDay = lastDayDate.toLocaleDateString("en-CA"); // YYYY-MM-DD format
        const startOfMonth = new Date(firstDay);
        const endOfMonth = new Date(lastDay);

        // Format date to yyyy-mm-dd
        const formatDate = (date) => {
            return date.toISOString().split("T")[0];
        };
        
                const payload = {
                    ServiceName: "GetVisitsFilters",
                    PageNumber: page,
                    PageSize: recordsPerPage,
                   Params: {
                        OrgId: 9333,
                        DeptId: 0,
                        FromDate: "2025-05-01",
                        ToDate: "2025-09-23",
                        UnitId: 1,
                        RoleId: 5,
                        UserId: 0,
                        VisitorType: 0,
                        Status: "ALL",
                        AutoIncNo: "ALL"
                    },
                };
        
                try {
                    const response = await fetchWithAuth(`visitor/GetVisitsFilters`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(payload),
                    });
        
                    if (!response.ok) throw new Error("Failed to fetch machines");
        
                    const data = await response.json();
                    const pageData = data.data.result || [];
                    const total = data.data.output.TotalCount || 0;
        
                    setVisitorsCache((prev) => ({ ...prev, [page]: pageData }));
                    setVistorsData(pageData);
                    setTotalRecords(total);
                    setCurrentPage(page);
        
                } catch (error) {
                    console.error("Error fetching machines:", error.message);
                    setVistorsData([]);
                } finally {
                    setDataLoading(false);
                }
            };
            const totalPages = Math.ceil(totalRecords / recordsPerPage);

    const fetchTypes = async () => {
        try {
            if (sessionUserData.OrgId) {
                const vTypesResponse = await fetchWithAuth(`visitor/VisitorTypesByOrgId?OrgId=${sessionUserData.OrgId}`, {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                });
                if (vTypesResponse) {
                    const vTypesData = await vTypesResponse.json();
                    setVisitorTypesData(vTypesData.ResultData);
                } else {
                    console.error('Failed to fetch shifts data:');
                }
            }
        } catch (error) {
            console.error('Error fetching shifts data:', error.message);
        }
    };

    useEffect(() => {
        if (sessionUserData.OrgId) {
            fetchVisitorsData(1);
            fetchTypes();
        }
    }, [sessionUserData]);

    const handleView = (item) => {
        setViewObjData(item);
    };

    const handleEdit = (item) => {
        setEditData(item);
    };

    // const handlePrintVisit = async (item) => {
    //     // Just open the print window first
    //     setTimeout(async () => {
    //         if (printRef.current) {
    //             const printWindow = window.open('', '_blank');

    //             // Adding a small delay to ensure all content loads properly.
    //             printWindow.document.write(`
    //                 <html>
    //                     <head>
    //                         <title>Print</title>
    //                         <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.0/css/bootstrap.min.css" />
    //                         <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.0/css/all.min.css" />
    //                     </head>
    //                     <body>
    //                         <div>${printRef.current.innerHTML}</div>
    //                     </body>
    //                 </html>
    //             `);

    //             printWindow.document.close();

    //             setTimeout(() => {
    //                 printWindow.focus();  // Ensure the window gets focus
    //                 printWindow.print();
    //                 printWindow.close();
    //             }, 500); // Wait to ensure that the content is fully loaded
    //         } else {
    //             console.error('printRef.current is undefined');
    //         }
    //     }, 100);

    //     // Only update state after printing logic has run
    //     setPrintData(item);

    //     const qrData = `${item.AutoIncNo}`;
    //     try {
    //         const qrCodeDataUrl = await QRCode.toDataURL(qrData);
    //         setQrCodeUrl(qrCodeDataUrl);
    //     } catch (error) {
    //         console.error('Error generating QR code:', error);
    //     }
    //  };

    const handleActionApprove = (item) => {
        Swal.fire({
            title: `Are you sure?`,
            text: `Do you want to approve this visit?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Approve'
        }).then((result) => {
            if (result.isConfirmed) {
                handleApproveSubmit(item);
            }
        });
    };

    const handleActionReject = (item) => {
        Swal.fire({
            title: `Are you sure?`,
            text: `Do you want to reject this visit?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Reject'
        }).then((result) => {
            if (result.isConfirmed) {
                handleRejectSubmit(item);
            }
        });
    };

    const handleApproveSubmit = async (item) => {

        try {
            const url = `visitor/PassApproval?RequestId=${item.RequestId}&OrgId=${sessionUserData.OrgId}&UserId=${sessionUserData.Id}`;

            const response = await fetchWithAuth(url, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });

            const result = await response.json();

            if (response.ok) {
                if (result.Status) {
                    fetchVisitorsData();
                } else {
                    console.error("❌ Request failed with server response:", result);
                }
            } else {
                throw new Error(`Request failed with status ${response.status}`);
            }
        } catch (error) {
            console.error("❌ Error submitting action:", error);
        }
    };

    const handleRejectSubmit = async (item) => {
        try {
            const url = `visitor/RejectPass?RequestId=${item.RequestId}&OrgId=${sessionUserData.OrgId}&UpdatedBy=${sessionUserData.Id}`;

            const response = await fetchWithAuth(url, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });

            const result = await response.json();

            if (response.ok) {
                if (result?.Status) {
                    fetchVisitorsData();
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Request Failed',
                        text: result?.message || 'An unknown error occurred.',
                    });
                }
            } else {
                throw new Error(`Request failed with status ${response.status}`);
            }
        } catch (error) {
            console.error("❌ Error submitting action:", error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.message || 'Something went wrong.',
            });
        }
    };

    const handleActionCancel = (item) => {
        const confirmButtonText = 'Yes Cancel it!';

        Swal.fire({
            title: `Are you sure?`,
            text: `Do you want to cancel this visit?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: confirmButtonText
        }).then((result) => {
            if (result.isConfirmed) {
                handleActionCancelSubmit(item);
            }
        });
    };

    const handleActionCancelSubmit = async (item) => {
        try {
            const payload = {
                OrgId: sessionUserData?.OrgId,
                RequestId: item?.RequestId,
                UpdatedBy: sessionUserData.Id
            };

            if (!payload.OrgId || !payload.RequestId) {
                console.error("Error: OrgId or RequestId is missing");
                return;
            }

            const response = await fetchWithAuth(`visitor/CancelVisit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            // console.log(result);

            if (response.ok) {
                if (result.Status) {
                    fetchVisitorsData();
                } else {
                    console.error("Request failed with server response:", result);
                }
            } else {
                throw new Error(`Request failed with status ${response.status}`);
            }
        } catch (error) {
            console.error("Error submitting action:", error);
        }
    };

    // const handleCheckinVisit = async (item) => {
    //     Swal.fire({
    //         title: "Are you sure?",
    //         text: "Do you want to check in this visitor?",
    //         icon: "warning",
    //         showCancelButton: true,
    //         confirmButtonColor: "#3085d6",
    //         cancelButtonColor: "#d33",
    //         confirmButtonText: "Yes, check in!"
    //     }).then(async (result) => {
    //         if (result.isConfirmed) {
    //             try {
    //                 const currentTime = new Date().toLocaleTimeString("en-GB", { hour12: false });

    //                 const payload = {
    //                     CheckInTime: currentTime,
    //                     UpdatedBy: sessionUserData.Id,
    //                     RequestId: item.RequestId
    //                 };

    //                 // console.log(payload)

    //                 const response = await fetch(`${VMS_VISITORS}PassCheckIn`, {
    //                     method: "POST",
    //                     headers: {
    //                         "Content-Type": "application/json",
    //                     },
    //                     body: JSON.stringify(payload),
    //                 });
    //                 const result = await response.json();

    //                 if (result.ResultData[0].Status === 'Success') {
    //                     fetchVisitorsData();
    //                     Swal.fire("Success!", "Visitor has been checked in.", "success");
    //                 } else {
    //                     const errorData = await response.json();
    //                     Swal.fire("Error!", errorData.message || "Failed to check in visitor.", "error");
    //                 }
    //             } catch (error) {
    //                 console.error("Error during check-in:", error.message);
    //                 Swal.fire("Error!", "An unexpected error occurred.", "error");
    //             }
    //         }
    //     });
    // };

    // const handleCheckoutVisit = async (item) => {
    //     Swal.fire({
    //         title: "Are you sure?",
    //         text: "Do you want to check out this visitor?",
    //         icon: "warning",
    //         showCancelButton: true,
    //         confirmButtonColor: "#3085d6",
    //         cancelButtonColor: "#d33",
    //         confirmButtonText: "Yes, check out!"
    //     }).then(async (result) => {
    //         if (result.isConfirmed) {
    //             try {
    //                 const currentTime = new Date().toLocaleTimeString("en-GB", { hour12: false });

    //                 const payload = {
    //                     checkOutTime: currentTime,
    //                     UpdatedBy: sessionUserData.Id,
    //                     RequestId: item.RequestId
    //                 };

    //                 // console.log(payload)

    //                 const response = await fetch(`${VMS_VISITORS}PassCheckOut`, {
    //                     method: "POST",
    //                     headers: {
    //                         "Content-Type": "application/json",
    //                     },
    //                     body: JSON.stringify(payload),
    //                 });
    //                 const result = await response.json();

    //                 if (result.ResultData[0].Status === 'Success') {
    //                     fetchVisitorsData();
    //                     Swal.fire("Success!", "Visitor has been checked out.", "success");
    //                 } else {
    //                     const errorData = await response.json();
    //                     Swal.fire("Error!", errorData.message || "Failed to checked out visitor.", "error");
    //                 }
    //             } catch (error) {
    //                 console.error("Error during check-out:", error.message);
    //                 Swal.fire("Error!", "An unexpected error occurred.", "error");
    //             }
    //         }
    //     });
    // };

    // const handleMOMSubmit = (item) => {
    //     setRequestId(item.RequestId);
    // };

    const submitMOM = async () => {
        if (!momContent) {
            Swal.fire("Error", "Please fill out MOM content", "error");
            return;
        }

        setMomBtnLoading(true);

        const formData = new FormData();
        formData.append("MOM", momContent);
        formData.append("UpdatedBy", sessionUserData.Id);
        formData.append("RequestId", requestId);
        formData.append("OrgId", sessionUserData?.OrgId);

        if (attachmentFile) {
            formData.append("Attachment", attachmentFile);
        }

        try {
            const response = await fetchWithAuth(`visitor/MOMSubmitWithAttachment`, {
                method: "POST",
                body: formData,
            });

            const data = await response.json();

            if (response.ok && data.Status) {
                setMomBtnLoading(false);
                Swal.fire("Success", data.message, "success").then(() => {
                    window.location.reload();
                });
            } else {
                Swal.fire("Error", data.message, "error");
                setMomBtnLoading(false);
            }
        } catch (error) {
            Swal.fire("Error", "An unexpected error occurred", "error");
            setMomBtnLoading(false);
        }
    };

    const handleInputChange = (eOrValue, nameFromSelect = null) => {
        if (typeof eOrValue === 'object' && eOrValue.target) {
            // Triggered from standard input/select
            const { name, value } = eOrValue.target;
            setFilters((prevState) => ({
                ...prevState,
                [name]: value || "0",
            }));
        } else if (nameFromSelect) {
            // Triggered from AntD Select
            setFilters((prevState) => ({
                ...prevState,
                [nameFromSelect]: eOrValue || "0",
            }));
        }
    };

    const handleFilter = async () => {
        setDataLoading(true);
        const payload = {
            OrgId: sessionUserData.OrgId,
            FromDate: filters.FromDate || "0",
            ToDate: filters.FromDate ? filters.ToDate || getCurrentDate() : (filters.ToDate || undefined),
            VisitorType: filters.VisitorType || 0,
            Status: filters.Status || 0,
            AutoIncNo: 0,
            RoleId: sessionUserData.RoleId,
            UserId: sessionUserData.Id,
        };

        try {
            const response = await fetchWithAuth(`visitor/getReqPasswithFilters`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                setDataLoading(false);
                const data = await response.json();
                console.log(data)
                setVistorsData(data);
            } else {
                setDataLoading(false);
                setVistorsData([]);
                Swal.fire("Error", "Failed to fetch filtered data.", "error");
            }
        } catch (error) {
            setDataLoading(false);
            setVistorsData([]);
            Swal.fire("Error", "An unexpected error occurred.", "error");
            console.error("Filter error:", error);
        }
    };

    // const handleDisplayFilters = () => {
    //     setDisplayFilters(prevState => !prevState);
    // };

    const formatDateTime = (dateString, timeString) => {
        const date = new Date(dateString);

        const timeMatch = timeString.match(/T(\d{2}):(\d{2})/);
        const hours = timeMatch ? timeMatch[1] : '00';
        const minutes = timeMatch ? timeMatch[2] : '00';

        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();

        return `${day}-${month}-${year} ${hours}:${minutes}`;
    };

    const draggerProps = {
        name: 'file',
        multiple: false,
        beforeUpload: (file) => {
            setAttachmentFile(file);
            return false;
        },
        onRemove: () => {
            setAttachmentFile(null);
        },
    };

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery]);

    const showAddBtn = sessionActionIds?.includes(1);
    const showViewBtn = sessionActionIds?.includes(2);
    const showEditBtn = sessionActionIds?.includes(3);
    const showApproveBtn = sessionActionIds?.includes(4);
    const showRejectBtn = sessionActionIds?.includes(5);
    const showCancelBtn = sessionActionIds?.includes(6);
    const showMomBtn = sessionActionIds?.includes(7);

    const permissionsByStatus = {
        edit: ["REJECTED", "DRAFT"],
        approve: ["REJECTED", "DRAFT"],
        reject: ["DRAFT", "APPROVED"],
        cancel: ["APPROVED"],
        mom: ["CHECKEDOUT"],
    };

    return (
        <Base1>
            <div className="d-flex flex-column flex-column-fluid">
                <div id="kt_app_toolbar" className="app-toolbar py-1 py-lg-6">
                    <div id="kt_app_toolbar_container" className="app-container container-xxl d-flex flex-stack">
                        <div className="page-title d-flex flex-column justify-content-center flex-wrap me-3">
                            <h1 className="page-heading d-flex text-gray-900 fw-bold fs-3 flex-column justify-content-center my-0">Visitors List</h1>
                            <ul className="breadcrumb breadcrumb-separatorless fw-semibold fs-7 my-0 pt-1">
                                <li className="breadcrumb-item text-muted">
                                    <Link to='/dashboard' className="text-muted text-hover-primary">Home</Link>
                                </li>
                                <li className="breadcrumb-item">
                                    <span className="bullet bg-gray-500 w-5px h-2px"></span>
                                </li>
                                <li className="breadcrumb-item text-muted">Visitors</li>
                            </ul>
                        </div>
                        {showAddBtn && (
                            <div className="d-flex align-items-center gap-2 gap-lg-3">
                                {/* <div className="m-0">
                                    <a className="btn btn-sm btn-flex btn-secondary fw-bold btn-sm d-md-block d-none" data-kt-menu-trigger="click" data-kt-menu-placement="bottom-end"
                                        onClick={handleDisplayFilters}>
                                        <i className="ki-duotone ki-filter fs-6 text-muted me-1">
                                            <span className="path1"></span>
                                            <span className="path2"></span>
                                        </i>Filter
                                    </a>
                                    <a className="btn btn-sm btn-flex btn-secondary fw-bold btn-sm d-md-none d-block" data-kt-menu-trigger="click" data-kt-menu-placement="bottom-end"
                                        onClick={handleDisplayFilters}>
                                        <i className="ki-duotone ki-filter fs-6 text-muted">
                                            <span className="path1"></span>
                                            <span className="path2"></span>
                                        </i>
                                    </a>
                                </div> */}
                                <a
                                    className={`btn btn-primary btn-sm d-md-block d-none`}
                                    style={{ height: "3rem" }}
                                    data-bs-toggle="offcanvas"
                                    data-bs-target="#offcanvasRightAdd"
                                    aria-controls="offcanvasRightAdd">Create Request
                                </a>
                                <a
                                    className={`btn btn-light-primary btn-sm d-md-none d-block`}
                                    style={{ height: "3rem" }}
                                    data-bs-toggle="offcanvas"
                                    data-bs-target="#offcanvasRightAdd"
                                    aria-controls="offcanvasRightAdd"><i className="fa-solid fa-plus fs-2"></i>
                                </a>
                            </div>
                        )}
                    </div>
                </div>

                <div id="kt_app_content" className="app-content flex-column-fluid pt-0">
                    <div id="kt_app_content_container" className="app-container container-xxl">
                        <div className="d-block d-lg-none">
                            {displayFilters && (
                                <div className="card-toolbar mb-2">
                                    <div
                                        className="d-flex row  justify-content-center align-items-end"
                                        data-kt-customer-table-toolbar="base"
                                    >
                                        {/* Filters Section */}
                                        <div
                                            className={`d-flex flex-column mb-md-0 col-6 mb-2`}
                                        >
                                            <label className="form-label">From Date</label>
                                            <input
                                                type="date"
                                                name="FromDate"
                                                value={filters.FromDate}
                                                className="form-control"
                                                onChange={handleInputChange}
                                            />
                                        </div>
                                        <div
                                            className={`d-flex flex-column mb-md-0 col-6 mb-2`}
                                        >
                                            <label className="form-label">To Date</label>
                                            <input
                                                type="date"
                                                name="ToDate"
                                                value={filters.ToDate}
                                                min={filters.FromDate}
                                                className="form-control"
                                                onChange={handleInputChange}
                                            />
                                        </div>
                                        <div
                                            className={`d-flex flex-column  mb-md-0 col-6  mb-2`}
                                        >
                                            <label className="form-label">Type</label>
                                            <Select
                                                showSearch
                                                allowClear
                                                placeholder="Choose Visitor Type"
                                                style={{ width: '100%', height: '3.4rem' }}
                                                value={filters.VisitorType}
                                                onChange={(value) => handleInputChange(value, 'VisitorType')}
                                                filterOption={(input, option) =>
                                                    option?.children?.toLowerCase().includes(input.toLowerCase())
                                                }
                                            >
                                                <Option value="0">All</Option>
                                                {Array.isArray(visitorTypesData) &&
                                                    visitorTypesData.map((type) => (
                                                        <Option key={type.Id} value={String(type.Id)}>
                                                            {type.TypeName}
                                                        </Option>
                                                    ))}
                                            </Select>
                                        </div>
                                        <div className="d-flex flex-column  mb-md-0 col-6  mb-2">
                                            <label className="form-label">Status</label>
                                            <select
                                                name="Status"
                                                value={filters.Status}
                                                className="form-select"
                                                onChange={handleInputChange}
                                            >
                                                <option disabled>Choose Status</option>
                                                <option value="0">All</option>
                                                <option value="DRAFT">Draft</option>
                                                <option value="APPROVED">Approved</option>
                                                <option value="REJECTED">Rejected</option>
                                                {/* <option value="COMPLETED">Completed</option> */}
                                                <option value="CANCELED">Canceled</option>
                                            </select>
                                        </div>

                                        {/* Buttons Section */}
                                        <button
                                            className="btn btn-info col-4 btn-sm my-2"
                                            onClick={handleFilter}
                                            disabled={dataLoading}
                                            type="button"
                                        >
                                            <i className="fa-solid fa-filter"></i>{dataLoading ? 'Submitting...' : 'Submit'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="d-none d-lg-block">
                            {displayFilters && (
                                <div className="card-toolbar mb-2">
                                    <div
                                        className="d-flex flex-column flex-lg-row justify-content-lg-start justify-content-between align-items-end "
                                        data-kt-customer-table-toolbar="base"
                                    >
                                        {/* Filters Section */}
                                        <div
                                            className={`d-flex flex-column me-3 mb-3 mb-md-0`}
                                        >
                                            <label className="form-label">From Date</label>
                                            <input
                                                type="date"
                                                name="FromDate"
                                                value={filters.FromDate}
                                                className="form-control"
                                                onChange={handleInputChange}
                                            />
                                        </div>
                                        <div
                                            className={`d-flex flex-column me-3 mb-3 mb-md-0`}
                                        >
                                            <label className="form-label">To Date</label>
                                            <input
                                                type="date"
                                                name="ToDate"
                                                value={filters.ToDate}
                                                min={filters.FromDate}
                                                className="form-control"
                                                onChange={handleInputChange}
                                            />
                                        </div>
                                        <div
                                            className={`d-flex flex-column me-3 mb-3 mb-md-0`}
                                        >
                                            <label className="form-label">Type</label>
                                            <Select
                                                showSearch
                                                allowClear
                                                placeholder="Choose Visitor Type"
                                                style={{ width: '14rem', height: '3.4rem' }}
                                                value={filters.VisitorType}
                                                onChange={(value) => handleInputChange(value, 'VisitorType')}
                                                filterOption={(input, option) =>
                                                    option?.children?.toLowerCase().includes(input.toLowerCase())
                                                }
                                            >
                                                <Option value="0">All</Option>
                                                {Array.isArray(visitorTypesData) &&
                                                    visitorTypesData.map((type) => (
                                                        <Option key={type.Id} value={String(type.Id)}>
                                                            {type.TypeName}
                                                        </Option>
                                                    ))}
                                            </Select>
                                        </div>
                                        <div className="d-flex flex-column me-3 mb-3 mb-md-0">
                                            <label className="form-label">Status</label>
                                            <select
                                                name="Status"
                                                value={filters.Status}
                                                className="form-select"
                                                onChange={handleInputChange}
                                            >
                                                <option disabled>Choose Status</option>
                                                <option value="0">All</option>
                                                <option value="DRAFT">Draft</option>
                                                <option value="APPROVED">Approved</option>
                                                <option value="REJECTED">Rejected</option>
                                                {/* <option value="COMPLETED">Completed</option> */}
                                                <option value="CANCELED">Canceled</option>
                                            </select>
                                        </div>

                                        {/* Buttons Section */}
                                        <button
                                            className="btn btn-info btn-sm"
                                            onClick={handleFilter}
                                            disabled={dataLoading}
                                            type="button"
                                        >
                                            <i className="fa-solid fa-filter"></i>{dataLoading ? 'Submitting...' : 'Submit'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="card d-md-block d-none">
                            <div className="card-header border-0 pt-6">
                                <div className="d-flex justify-content-between align-items-center w-100">
                                    <div className="d-flex align-items-center position-relative">
                                        <i className="ki-duotone ki-magnifier fs-3 position-absolute ms-3">
                                            <span className="path1"></span>
                                            <span className="path2"></span>
                                        </i>
                                        <input
                                            type="text"
                                            data-kt-customer-table-filter="search"
                                            className="form-control form-control-solid w-250px ps-10"
                                            placeholder="Search Visitors"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="card-body pt-0">
                                <div className="table-responsive">
                                    <table className="table align-middle table-row-dashed fs-6 gy-5" id="kt_customers_table">
                                        <thead>
                                            <tr className="text-start text-gray-500 fw-bold fs-7 text-uppercase gs-0">
                                                <th className="">S.No</th>
                                                <th className="min-w-125px">Id</th>
                                                <th className="min-w-125px">Manager</th>
                                                <th className="min-w-125px">Employee</th>
                                                <th className="min-w-125px">Visitor Type</th>
                                                <th className="min-w-125px">Scheduled</th>
                                                <th className="min-w-125px">Status</th>
                                                <th className="text-end min-w-70px">Actions</th>

                                            </tr>
                                        </thead>
                                        <tbody className="fw-semibold text-gray-600">
                                            {dataLoading ? (
                                                <tr>
                                                    <td colSpan="12" className="text-center">
                                                        <div className="container"></div>
                                                    </td>
                                                </tr>
                                            ) : visitorsData && visitorsData?.length > 0 ? (
                                                visitorsData?.map((item, index) => {
                                                    const canView = showViewBtn;
                                                    const canEdit = showEditBtn && permissionsByStatus.edit.includes(item.Status);
                                                    const canApprove = showApproveBtn && permissionsByStatus.approve.includes(item.Status);
                                                    const canReject = showRejectBtn && permissionsByStatus.reject.includes(item.Status);
                                                    const canCancle = showCancelBtn && permissionsByStatus.cancel.includes(item.Status);
                                                    const canMom = showMomBtn && permissionsByStatus.mom.includes(item.Status);
                                                    return (
                                                        <tr key={index}>
                                                            <td>{(currentPage - 1) * recordsPerPage + index + 1}</td>
                                                            <td>
                                                                <a
                                                                    className="text-primary cursor-pointer"
                                                                    data-bs-toggle="offcanvas"
                                                                    data-bs-target="#offcanvasRightView"
                                                                    aria-controls="offcanvasRightView"
                                                                    onClick={() => canView && handleView(item)}
                                                                >{item.AutoIncNo}</a>
                                                            </td>
                                                            <td>
                                                                <a className="text-gray-800 text-hover-primary mb-1">{item.ManagerName}</a>
                                                            </td>
                                                            <td>
                                                                <a className="text-gray-800 text-hover-primary mb-1">{item.EmployeeName}</a>
                                                            </td>
                                                            <td>
                                                                {item.VisitorTypeName}
                                                            </td>
                                                            <td>
                                                                <div className="badge badge-light-danger">
                                                                    {formatDateTime(item.MeetingDate, item.MeetingTime)}
                                                                </div>
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
                                                            <td className="text-end">
                                                                <Popover
                                                                    placement="bottom"
                                                                    content={
                                                                        <div style={{ width: "8rem" }}>
                                                                            <p
                                                                                style={{ cursor: "pointer" }}
                                                                                className="text-hover-warning"
                                                                                data-bs-toggle="offcanvas"
                                                                                data-bs-target="#offcanvasRightView"
                                                                                aria-controls="offcanvasRightView"
                                                                                onClick={() => canView && handleView(item)}
                                                                            >
                                                                                <i className="fa-regular fa-eye me-2"></i>
                                                                                View
                                                                            </p>
                                                                            <p
                                                                                className={`text-hover-warning`}
                                                                                style={{
                                                                                    cursor: canEdit ? 'pointer' : 'not-allowed',
                                                                                    opacity: canEdit ? 1 : 0.5,
                                                                                    pointerEvents: canEdit ? 'auto' : 'none',
                                                                                    filter: canEdit ? 'none' : 'blur(1px)',
                                                                                }}
                                                                                data-bs-toggle="offcanvas"
                                                                                data-bs-target="#offcanvasRightEdit"
                                                                                aria-controls="offcanvasRightEdit"
                                                                                onClick={() => handleEdit(item)}
                                                                            >
                                                                                <i className="fa-regular fa-pen-to-square me-2 text-info"></i>
                                                                                Edit
                                                                            </p>
                                                                            <p
                                                                                style={{
                                                                                    cursor: canApprove ? 'pointer' : 'not-allowed',
                                                                                    opacity: canApprove ? 1 : 0.5,
                                                                                    pointerEvents: canApprove ? 'auto' : 'none',
                                                                                    filter: canApprove ? 'none' : 'blur(1px)',
                                                                                }}
                                                                                className={`text-hover-warning`}
                                                                                onClick={() =>
                                                                                    canApprove
                                                                                        ? handleActionApprove(item)
                                                                                        : null
                                                                                }
                                                                            >
                                                                                <i className="fa-solid fa-check me-2 text-success"></i>
                                                                                Approve
                                                                            </p>
                                                                            <p
                                                                                style={{
                                                                                    cursor: canReject ? 'pointer' : 'not-allowed',
                                                                                    opacity: canReject ? 1 : 0.5,
                                                                                    pointerEvents: canReject ? 'auto' : 'none',
                                                                                    filter: canReject ? 'none' : 'blur(1px)',
                                                                                }}
                                                                                className={`text-hover-warning`}
                                                                                onClick={() =>
                                                                                    canReject
                                                                                        ? handleActionReject(item)
                                                                                        : null
                                                                                }
                                                                            >
                                                                                <i className="fa-solid fa-xmark me-2 text-warning"></i>
                                                                                Reject
                                                                            </p>
                                                                            <p
                                                                                style={{
                                                                                    cursor: canCancle ? 'pointer' : 'not-allowed',
                                                                                    opacity: canCancle ? 1 : 0.5,
                                                                                    pointerEvents: canCancle ? 'auto' : 'none',
                                                                                    filter: canCancle ? 'none' : 'blur(1px)',
                                                                                }}
                                                                                className={`text-hover-warning`}
                                                                                onClick={() =>
                                                                                    canCancle
                                                                                        ? handleActionCancel(item)
                                                                                        : null
                                                                                }
                                                                            >
                                                                                <i className="fa-solid fa-ban me-2 text-danger"></i>
                                                                                Cancel
                                                                            </p>
                                                                            {/* <p
                                                                                style={{
                                                                                    cursor: canMom ? 'pointer' : 'not-allowed',
                                                                                    opacity: canMom ? 1 : 0.5,
                                                                                    pointerEvents: canMom ? 'auto' : 'none',
                                                                                    filter: canMom ? 'none' : 'blur(1px)',
                                                                                }}
                                                                                className={`text-hover-warning`}
                                                                                data-bs-toggle="offcanvas"
                                                                                data-bs-target="#offcanvasRightMOM"
                                                                                aria-controls="offcanvasRightMOM"
                                                                                onClick={() => {
                                                                                    canMom && handleMOMSubmit(item);
                                                                                }}
                                                                            >
                                                                                <i className="fa-regular fa-handshake me-2"></i>
                                                                                MOM
                                                                            </p> */}
                                                                        </div>
                                                                    }
                                                                    trigger="hover"
                                                                >
                                                                    <button className="btn">
                                                                        <i className="fa-solid fa-ellipsis-vertical"></i>
                                                                    </button>
                                                                </Popover>
                                                            </td>
                                                        </tr>
                                                    )
                                                })
                                            ) : (
                                                <tr>
                                                    <td colSpan="8" className="text-center">
                                                        <p>No Data Available</p>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                    <Pagination
                                    currentPage={currentPage}
                                    totalPages={totalPages}
                                    onPageChange={(page) => fetchVisitorsData(page)}
                                />
                                </div>
                            </div>
                        </div>

                        {/* Mobile View */}
                        <div className="d-block d-md-none">
                            <div className="d-flex align-items-center position-relative my-1">
                                <i className="ki-duotone ki-magnifier fs-3 position-absolute ms-5">
                                    <span className="path1"></span>
                                    <span className="path2"></span>
                                </i>
                                <input
                                    type="text"
                                    data-kt-customer-table-filter="search"
                                    className="form-control form-control w-100 ps-13"
                                    placeholder="Search Visitors"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            {dataLoading ? (
                                <div className="container"></div>
                            ) : visitorsData && visitorsData?.length > 0 ? (
                                visitorsData?.map((item, index) => {
                                    const canView = showViewBtn;
                                    const canEdit = showEditBtn && permissionsByStatus.edit.includes(item.Status);
                                    const canApprove = showApproveBtn && permissionsByStatus.approve.includes(item.Status);
                                    const canReject = showRejectBtn && permissionsByStatus.reject.includes(item.Status);
                                    const canCancle = showCancelBtn && permissionsByStatus.cancel.includes(item.Status);
                                    const canMom = showMomBtn && permissionsByStatus.mom.includes(item.Status);
                                    return (
                                        <div key={item.Id} className="card mb-2 shadow-sm rounded">
                                            <div className="card-body">
                                                <div className="d-flex justify-content-between align-items-start">
                                                    <span>
                                                        <div className={
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
                                                        }>
                                                            {item.Status}
                                                        </div>
                                                    </span>
                                                    <div className="d-flex">
                                                        <i
                                                            className="fa-regular fa-eye text-primary me-2"
                                                            data-bs-toggle="offcanvas"
                                                            data-bs-target="#offcanvasRightView"
                                                            aria-controls="offcanvasRightView"
                                                            onClick={() => canView && handleView(item)}
                                                        ></i>
                                                        <i
                                                            className={`fa-regular fa-pen-to-square text-info`}
                                                            style={{
                                                                cursor: canEdit ? 'pointer' : 'not-allowed',
                                                                opacity: canEdit ? 1 : 0.5,
                                                                pointerEvents: canEdit ? 'auto' : 'none',
                                                                filter: canEdit ? 'none' : 'blur(1px)',
                                                            }}
                                                            data-bs-toggle="offcanvas"
                                                            data-bs-target="#offcanvasRightEdit"
                                                            aria-controls="offcanvasRightEdit"
                                                            onClick={() => handleEdit(item)}
                                                        ></i>
                                                    </div>
                                                </div>

                                                <div className="mb-2">
                                                    <div className="d-flex justify-content-between">
                                                        <span className="text-muted">Request Id:</span>
                                                        <span className="fw-semibold">{item.AutoIncNo}</span>
                                                    </div>
                                                    <div className="d-flex justify-content-between">
                                                        <span className="text-muted">Manager:</span>
                                                        <span className="fw-semibold">{item.ManagerName}</span>
                                                    </div>
                                                    <div className="d-flex justify-content-between">
                                                        <span className="text-muted">Employee:</span>
                                                        <span className="fw-semibold">{item.EmployeeName}</span>
                                                    </div>
                                                    <div className="d-flex justify-content-between">
                                                        <span className="text-muted">Scheduled:</span>
                                                        <span className="fw-semibold">{formatDateTime(item.MeetingDate, item.MeetingTime)}</span>
                                                    </div>
                                                    <div className="d-flex justify-content-between">
                                                        <span className="text-muted">Visitor Type:</span>
                                                        <span className="fw-semibold">
                                                            {item.VisitorType === 1
                                                                ? 'Supplier'
                                                                : item.VisitorType === 2
                                                                    ? 'Customer'
                                                                    : item.VisitorType === 3
                                                                        ? 'Frequent Visitor'
                                                                        : 'N/A'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="d-flex justify-content-between mt-2">
                                                    <span
                                                        style={{
                                                            cursor: canApprove ? 'pointer' : 'not-allowed',
                                                            opacity: canApprove ? 1 : 0.5,
                                                            pointerEvents: canApprove ? 'auto' : 'none',
                                                            filter: canApprove ? 'none' : 'blur(1px)',
                                                        }}
                                                        className={`badge badge-light-success`}
                                                        onClick={() =>
                                                            canApprove
                                                                ? handleActionApprove(item)
                                                                : null
                                                        }
                                                    >
                                                        <i className="fa-solid fa-check me-1"></i>Approve
                                                    </span>

                                                    <span
                                                        style={{
                                                            cursor: canReject ? 'pointer' : 'not-allowed',
                                                            opacity: canReject ? 1 : 0.5,
                                                            pointerEvents: canReject ? 'auto' : 'none',
                                                            filter: canReject ? 'none' : 'blur(1px)',
                                                        }}
                                                        className={`badge badge-light-warning`}
                                                        onClick={() =>
                                                            canReject
                                                                ? handleActionReject(item)
                                                                : null
                                                        }
                                                    >
                                                        <i className="fa-solid fa-xmark me-1"></i>Reject
                                                    </span>
                                                    <span
                                                        style={{
                                                            cursor: canCancle ? 'pointer' : 'not-allowed',
                                                            opacity: canCancle ? 1 : 0.5,
                                                            pointerEvents: canCancle ? 'auto' : 'none',
                                                            filter: canCancle ? 'none' : 'blur(1px)',
                                                        }}
                                                        className={`badge badge-light-danger`}
                                                        onClick={() =>
                                                            canCancle
                                                                ? handleActionCancel(item)
                                                                : null
                                                        }
                                                    >
                                                        <i className="fa-solid fa-ban me-1"></i>Cancel
                                                    </span>
                                                    {/* <span
                                                        style={{
                                                            cursor: canMom ? 'pointer' : 'not-allowed',
                                                            opacity: canMom ? 1 : 0.5,
                                                            pointerEvents: canMom ? 'auto' : 'none',
                                                            filter: canMom ? 'none' : 'blur(1px)',
                                                        }}
                                                        className={`badge badge-light-info`}
                                                        data-bs-toggle="offcanvas"
                                                        data-bs-target="#offcanvasRightMOM"
                                                        aria-controls="offcanvasRightMOM"
                                                        onClick={() => { canMom && handleMOMSubmit(item); }}
                                                    >
                                                        <i className="fa-regular fa-handshake me-2"></i>MOM
                                                    </span> */}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })
                            ) : (
                                <p className="text-center mt-5">No Data Available</p>
                            )}
                            {/* <div className="dt-paging paging_simple_numbers">
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
                            </div> */}
                        </div>
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={(page) => fetchVisitorsData(page)}
                        />
                    </div>
                </div>
            </div>

            {/* Mom Submit */}
            <style>
                {`
                    @media (min-width: 768px) { /* Medium devices and up (md) */
                        #offcanvasRightMOM {
                            width: 45% !important;
                        }
                    }
                `}
            </style>
            <div
                className="offcanvas offcanvas-end"
                tabIndex="-1"
                id="offcanvasRightMOM"
                aria-labelledby="offcanvasRightLabel"
                style={{ width: '90%' }}
            >
                <div className="offcanvas-header d-flex justify-content-between align-items-center">
                    <h5 id="offcanvasRightLabel" className="mb-0">Submit MOM</h5>
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
                    <div className="row">
                        <div className="col-12">
                            <Dragger {...draggerProps}>
                                <p className="ant-upload-drag-icon">
                                    <InboxOutlined />
                                </p>
                                <p className="ant-upload-text">Click or drag file to this area to upload</p>
                                <p className="ant-upload-hint">
                                    Support for a single upload. Strictly prohibited from uploading company data or other
                                    banned files.
                                </p>
                            </Dragger>
                        </div>
                        <div className="col-12 mt-13">
                            <label className="form-label">Remarks</label>
                            <textarea
                                value={momContent}
                                className="form-control"
                                onChange={(e) => setMomContent(e.target.value)}
                                rows="5"
                                placeholder="Enter your MOM details here..."
                            />
                        </div>
                    </div>
                    <button
                        className="btn btn-primary btn-sm d-flex m-auto mt-5"
                        onClick={submitMOM}
                        disabled={momBtnLoading}
                    >
                        {momBtnLoading ? 'Submitting...' : 'Submit'}
                    </button>
                </div>
            </div>

            <ViewVisit viewObj={viewObjData} />
            <AddVisit />
            <EditPass passObj={editData} />
            <PassCheckIn />

            {/* print */}
            {/* <div className='d-none'>
                {printData ? (
                    <PrintPass ref={printRef} data={printData} qrCodeUrl={qrCodeUrl}/>
                ) : (
                    <p>Loading...</p>
                )}
            </div>                     */}
        </Base1>
    )
}