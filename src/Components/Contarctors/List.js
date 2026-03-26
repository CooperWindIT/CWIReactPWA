import React, { useState, useEffect } from "react";
import Base1 from "../Config/Base1";
import { Popover } from 'antd';
import '../Config/Pagination.css';
import AddContactor from "./Add";
// import ViewPassCheckInOut from "./PassCheckInOut";
import Swal from 'sweetalert2';
import EditContactor from "./Edit";
import '../Config/Loader.css';
import { Link, useNavigate } from "react-router-dom";
import AddContactorCL from "./AddCL";
// import EditContactorCL from "./EditCL";
// import CheckInContactorCL from "./CheckIn";
// import CheckOutContactorCL from "./CheckOut";
// import Screen from "../Visitings/Screen";
import AadhaarScanner from "../Dashboard/adar1";
// import ManageCLS from "./CLS/ManageCLS";
import ManageCLAadhar from "./CLS/CLAadhar";
import { fetchWithAuth } from "../../utils/api";

export default function ContactorsList() {

    const navigate = useNavigate();
    const [sessionUserData, setSessionUserData] = useState([]);
    const [contractorsData, setContactorsData] = useState([]);
    const [dataLoading, setDataLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [addConCL, setAddConCL] = useState([]);
    const [checkOutCL, setCheckOutCL] = useState([]);
    const [eitDataId, setEditDataId] = useState([]);
    const [sessionActionIds, setSessionActionIds] = useState([]);
    const [conObj, setConObj] = useState({});
    const [checkType, setCheckType] = useState(null);
    // const [viewDataId, setViewDataId] = useState([]);
    // const [editConCL, setEditConCL] = useState([]);
    // const [checkInConCL, setCheckInConCL] = useState([]);
    // const [checkOutConCL, setCheckOutConCL] = useState([]);
    // const [selectedShiftType, setSelectedShiftType] = useState(null);
    // const [shiftsData, setShiftsData] = useState([]);

    const [navigationPath, setNavigationPath] = useState("");

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

    useEffect(() => {
        const sessionMenuData = sessionStorage.getItem("menuData");
        try {
            const parsedMenu = JSON.parse(sessionMenuData);

            const ticketsMenu = parsedMenu.find(
                (item) => item.MenuName === "Contractors"
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
        setDataLoading(true);
        try {
            const response = await fetchWithAuth(`contractor/getContractors?OrgId=${sessionUserData.OrgId}&ShiftTypeId=0`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });
            if (response.ok) {
                const data = await response.json();
                setContactorsData(data.ResultData);
                // console.log(data.ResultData);
            } else {
                console.error('Failed to fetch attendance data:', response.statusText);
            }
        } catch (error) {
            console.error('Error fetching attendance data:', error.message);
        } finally {
            setDataLoading(false);
        }
    };

    // const fetchFilterData = async () => {
    //     setDataLoading(true);
    //     try {
    //         const response = await fetch(`${VMS_URL_CONTRACTOR}getContractors?OrgId=${sessionUserData.OrgId}&ShiftTypeId=${selectedShiftType}`);
    //         if (response.ok) {
    //             const data = await response.json();
    //             setContactorsData(data.ResultData);
    //         } else {
    //             console.error('Failed to fetch attendance data:', response.statusText);
    //         }
    //     } catch (error) {
    //         console.error('Error fetching attendance data:', error.message);
    //     } finally {
    //         setDataLoading(false);
    //     }
    // };

    // const fetchShiftsData = async () => {
    //     try {
    //         const response = await fetch(`${VMS_URL_CONTRACTOR}getShiftTimings?OrgId=${sessionUserData.OrgId}`);
    //         if (response.ok) {
    //             const data = await response.json();
    //             setShiftsData(data.ResultData);
    //         } else {
    //             console.error('Failed to fetch shifts data:', response.statusText);
    //         }
    //     } catch (error) {
    //         console.error('Error fetching shifts data:', error.message);
    //     }
    // };

    // useEffect(() => {
    //     if (sessionUserData.OrgId) {
    //         fetchShiftsData();
    //     }
    // }, [sessionUserData]);

    // useEffect(() => {
    //     if (selectedShiftType) {
    //         fetchFilterData();
    //     }
    // }, [selectedShiftType]);

    useEffect(() => {
        if (sessionUserData.OrgId) {
            fetchData();
        }
    }, [sessionUserData]);

    const filteredData = contractorsData && contractorsData.filter((item) => {
        const contractorName = item?.ContractorName?.toLowerCase() || '';
        const shiftname = item?.ShiftName?.toLowerCase() || '';

        const query = searchQuery.toLowerCase();

        return contractorName.includes(query) || shiftname.includes(query); // pavan
    });


    const handleEdit = (item) => {
        setEditDataId(item);
    };

    const handleAddConCL = (item) => {
        setAddConCL(item);
    };

    const handleAddConCLAadhar = (item) => {
        setConObj(item);
    };

    const handleCheckOutCL = (item, cType) => {
        console.log(cType)
        setCheckOutCL(item);
        setCheckType(cType);
    };

    const [currentPage, setCurrentPage] = useState(1);
    const recordsPerPage = 5;
    const totalPages = Math.ceil((filteredData?.length || 0) / recordsPerPage);

    // Get current records to display
    const indexOfLastRecord = currentPage * recordsPerPage;
    const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
    const currentRecords = (filteredData || []).slice(indexOfFirstRecord, indexOfLastRecord);

    const getPaginationNumbers = () => {
        const visiblePages = [];
        if (totalPages <= 6) {
            for (let i = 1; i <= totalPages; i++) visiblePages.push(i);
        } else {
            if (currentPage <= 3) {
                visiblePages.push(1, 2, 3, "...", totalPages - 2, totalPages - 1, totalPages);
            }
            else if (currentPage > 3 && currentPage < totalPages - 2) {
                visiblePages.push(1, 2, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages - 1, totalPages);
            }
            else {
                visiblePages.push(1, 2, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
            }
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

    // const handleGeneratePass = (item, action) => {
    //     const confirmButtonText = 'Yes, generate it!';

    //     Swal.fire({
    //         title: `Are you sure?`,
    //         text: `Do you want to generate pass?`,
    //         icon: 'warning',
    //         showCancelButton: true,
    //         confirmButtonColor: '#3085d6',
    //         cancelButtonColor: '#d33',
    //         confirmButtonText: confirmButtonText
    //     }).then((result) => {
    //         if (result.isConfirmed) {
    //             // setAcceptFormData(item);
    //             handleActionSubmit(item, action);
    //         }
    //     });
    // };

    // const handleActionSubmit = async (item, action) => {
    //     const currentDate = new Date();
    //     const payload = {
    //         "orgid": sessionUserData.OrgId,
    //         "userid": sessionUserData.Id,
    //         "Time": currentDate.toLocaleTimeString(),
    //         "Date": currentDate.toISOString().split('T')[0],
    //         "QRCode": `QR-000${item.Id}`,
    //         "ContractorId": item.Id
    //     };

    //     console.log(payload, 'payloadpayload')

    //     try {
    //         const response = await fetch(`${VMS_URL_CONTRACTOR}ManageLaborQRPass`, {
    //             method: 'POST',
    //             headers: {
    //                 'Content-Type': 'application/json'
    //             },
    //             body: JSON.stringify(payload)
    //         });

    //         const result = await response.json();
    //         console.log(result)

    //         if (response.ok) {
    //             if (result.Status) {
    //                 fetchData();
    //             }
    //             throw new Error("Request failed with status " + response.status);
    //         }
    //         console.log("Request successful:", await response.json());
    //     } catch (error) {
    //         console.error("Error submitting action:", error);
    //     }
    // };

    // const handleCheckInLabour = async (item) => {
    //     Swal.fire({
    //         title: "Are you sure?",
    //         text: "Do you want to check in this labours?",
    //         icon: "warning",
    //         showCancelButton: true,
    //         confirmButtonColor: "#3085d6",
    //         cancelButtonColor: "#d33",
    //         confirmButtonText: "Yes, check in!"
    //     }).then(async (result) => {
    //         if (result.isConfirmed) {
    //             try {
    //                 const now = new Date();
    //                 const currentTime = `${now.getFullYear()}-${String(
    //                     now.getMonth() + 1
    //                 ).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(
    //                     now.getHours()
    //                 ).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(
    //                     now.getSeconds()
    //                 ).padStart(2, "0")}.000`;

    //                 const payload = {
    //                     CheckIn: currentTime,
    //                     UpdatedBy: sessionUserData.Id,
    //                     ContractorId: item.Id
    //                 };

    //                 // console.log(payload, item)

    //                 const response = await fetch(`${VMS_URL}LaborCheckIn`, {
    //                     method: "POST",
    //                     headers: {
    //                         "Content-Type": "application/json",
    //                     },
    //                     body: JSON.stringify(payload),
    //                 });
    //                 const result = await response.json();
    //                 // console.log(result)
    //                 if (result.ResultData[0].Status === 'Success') {
    //                     fetchData();
    //                     Swal.fire("Success!", "Labours has been checked in.", "success");
    //                 } else {
    //                     const errorData = await response.json();
    //                     Swal.fire("Error!", errorData.message || "Failed to check in labours.", "error");
    //                 }
    //             } catch (error) {
    //                 console.error("Error during check-in:", error.message);
    //                 Swal.fire("Error!", "An unexpected error occurred.", "error");
    //             }
    //         }
    //     });
    // };

    // const handleCheckOutLabour = async (item) => {
    //     Swal.fire({
    //         title: "Are you sure?",
    //         text: "Do you want to check out this labours?",
    //         icon: "warning",
    //         showCancelButton: true,
    //         confirmButtonColor: "#3085d6",
    //         cancelButtonColor: "#d33",
    //         confirmButtonText: "Yes, check out!"
    //     }).then(async (result) => {
    //         if (result.isConfirmed) {
    //             try {
    //                 const now = new Date();
    //                 const currentTime = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}.000`;

    //                 const payload = {
    //                     CheckOut: currentTime,
    //                     UpdatedBy: sessionUserData.Id,
    //                     ContractorId: item.Id
    //                 };

    //                 console.log("Payload:", payload);

    //                 const response = await fetch(`${VMS_URL}LaborCheckOut`, {
    //                     method: "POST",
    //                     headers: {
    //                         "Content-Type": "application/json",
    //                     },
    //                     body: JSON.stringify(payload),
    //                 });

    //                 // Log HTTP status code for debugging
    //                 console.log("HTTP Status:", response.status);

    //                 const resultData = await response.json();
    //                 console.log("API Response:", resultData);

    //                 if (response.ok && resultData.ResultData && resultData.ResultData[0].Status === 'Success') {
    //                     fetchData();
    //                     Swal.fire("Success!", "Labours has been checked out.", "success");
    //                 } else {
    //                     // If API returns an error message in the response, use it
    //                     const errorMessage = resultData.message || "Failed to check out labours.";
    //                     Swal.fire("Error!", errorMessage, "error");
    //                 }
    //             } catch (error) {
    //                 console.error("Error during check-out:", error);
    //                 Swal.fire("Error!", error.message || "An unexpected error occurred.", "error");
    //             }
    //         }
    //     });
    // };

    const handleDeleteContractor = async (item) => {
        const actionText = item.IsActive ? "deactivate" : "activate";
        // const pastTense = item.IsActive ? "deactivated" : "activated";

        Swal.fire({
            title: "Are you sure?",
            text: `Do you want to ${actionText} this contractor?`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#3085d6",
            cancelButtonColor: "#d33",
            confirmButtonText: `<i class="bi bi-check-all text-white"></i> Yes, ${actionText} it!`,
            cancelButtonText: `<i class="bi bi-x-lg text-white"></i> Cancel!`
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const payload = {
                        UpdatedBy: sessionUserData.Id,
                        Id: item.Id,
                        IsActive: item.IsActive ? 0 : 1
                    };

                    const response = await fetchWithAuth(`contractor/InactiveContractors`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify(payload),
                    });

                    const result = await response.json();

                    if (result.ResultData?.Status === 'Success') {
                        fetchData();
                        // Swal.fire("Success!", `Contractor has been ${pastTense}.`, "success");
                    } else {
                        Swal.fire("Error!", result.ResultData?.ResultMessage || `Failed to ${actionText} contractor.`, "error");
                    }
                } catch (error) {
                    console.error("Error during contractor toggle:", error.message);
                    Swal.fire("Error!", "An unexpected error occurred.", "error");
                }
            }
        });
    };

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery]);

    const showAddBtn = sessionActionIds?.includes(1);
    const showEditBtn = sessionActionIds?.includes(3);
    const showDeleteBtn = sessionActionIds?.includes(11);
    const showCLCheckInOutBtn = sessionActionIds?.includes(15);
    const showCLCountBtn = sessionActionIds?.includes(16);
    const showAddAadharBtn = sessionActionIds?.includes(17);

    return (
        <Base1>
            <div className="d-flex flex-column flex-column-fluid">
                <div id="kt_app_toolbar" className="app-toolbar py-3 py-lg-6">
                    <div id="kt_app_toolbar_container" className="app-container container-xxl d-flex flex-stack">
                        <div className="page-title d-flex flex-column justify-content-center flex-wrap me-3">
                            <h1 className="page-heading d-flex text-gray-900 fw-bold fs-3 flex-column justify-content-center my-0">Contractors List</h1>
                            <ul className="breadcrumb breadcrumb-separatorless fw-semibold fs-7 my-0 pt-1">
                                <li className="breadcrumb-item text-muted">
                                    <a href={navigationPath} className="text-muted text-hover-primary">Home</a>
                                </li>
                                <li className="breadcrumb-item">
                                    <span className="bullet bg-gray-500 w-5px h-2px"></span>
                                </li>
                                <li className="breadcrumb-item text-muted">Contractors</li>
                            </ul>
                        </div>
                        {showAddBtn &&
                            <div className="d-flex align-items-center gap-2 gap-lg-3">
                                <a
                                    className={`btn btn-primary btn-sm d-none d-md-block`}
                                    style={{ height: "3rem" }}
                                    data-bs-toggle="offcanvas"
                                    data-bs-target="#offcanvasRightAdd"
                                    aria-controls="offcanvasRightAdd"><i className="bi bi-person-badge fs-4"></i>Request Contracting Agency
                                </a>
                                <a
                                    className={`btn btn-light-primary btn-sm d-block d-md-none`}
                                    data-bs-toggle="offcanvas"
                                    data-bs-target="#offcanvasRightAdd"
                                    aria-controls="offcanvasRightAdd"><i className="fa-solid fa-plus fs-2"></i>
                                </a>
                            </div>
                        }
                    </div>
                </div>

                <div id="kt_app_content" className="app-content flex-column-fluid">
                    <div id="kt_app_content_container" className="app-container container-xxl">
                        <div className="card d-none d-md-block">
                            <div className="card-heade border-0 pt-6 ms-2">
                                <div className="card-title">
                                    <div className="d-flex align-items-center position-relative my-1">
                                        <i className="ki-duotone ki-magnifier fs-3 position-absolute ms-5">
                                            <span className="path1"></span>
                                            <span className="path2"></span>
                                        </i>
                                        <input
                                            type="text"
                                            data-kt-customer-table-filter="search"
                                            className="form-control form-control-solid w-250px ps-13"
                                            placeholder="Search Contractors"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="rounded pt-0 mx-2">
                                <div className="table-responsive">
                                    <table className="table align-middle table-hover gs-7 gy-3 mb-0 fs-6 rounded">
                                        <thead className="bg-light-primary">
                                            <tr className="text-start text-muted fw-bold fs-8 text-uppercase gs-0 border-bottom-2 border-primary py-3">
                                                <th className="min-w-50px">S.No</th>
                                                <th className="min-w-150px">Agency Name</th>
                                                <th className="min-w-150px">Agency Email</th>
                                                <th className="min-w-125px">Agency Mobile</th>
                                                <th className="min-w-100px text-center">Status</th>
                                                <th className="min-w-50px text-end pe-7">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {dataLoading ? (
                                                <tr>
                                                <td colSpan="12" className="text-center">
                                                    <div className="container"></div>
                                                </td>
                                            </tr>
                                            ) : currentRecords && currentRecords.length > 0 ? (
                                                currentRecords.map((item, index) => (
                                                    <tr key={item.ItemId} className="border-bottom-1">
                                                        <td className="py-2">
                                                            <span className="text-gray-600 fw-bold">
                                                                {(currentPage - 1) * recordsPerPage + index + 1}
                                                            </span>
                                                        </td>
                                                        <td className="py-2">
                                                            <div className="d-flex flex-column">
                                                                <span
                                                                    className="fw-bold text-gray-800 text-hover-primary fs-7 mb-0 text-truncate"
                                                                    title={item.ContractorName}
                                                                    style={{ maxWidth: "180px", lineHeight: "1.2" }}
                                                                >
                                                                    {item.ContractorName}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="py-2">
                                                            <a href={`mailto:${item.Email}`} className="text-gray-600 text-hover-primary fs-7">
                                                                {item.Email.length > 25 ? item.Email.slice(0, 25) + "..." : item.Email}
                                                            </a>
                                                        </td>
                                                        <td className="py-2">
                                                            <span className="text-gray-600 fs-7">{item.PhoneNumber || 'N/A'}</span>
                                                        </td>
                                                        <td className="py-2 text-center">
                                                            <span className={`badge px-3 py-2 fs-8 fw-bold ${item.IsActive ? 'badge-light-success' : 'badge-light-danger'}`}>
                                                                {item.IsActive ? 'Active' : 'Inactive'}
                                                            </span>
                                                        </td>
                                                        <td className="py-2 text-end pe-7">
                                                            <Popover
                                                                placement="bottom"
                                                                trigger="hover"
                                                                content={
                                                                    <div style={{ width: '12rem' }}>
                                                                        <p
                                                                            className={`text-hover-warning cursor-pointer`}
                                                                            style={{
                                                                                cursor: showEditBtn && item.IsActive ? 'pointer' : 'not-allowed',
                                                                                opacity: showEditBtn && item.IsActive ? 1 : 0.5,
                                                                                pointerEvents: showEditBtn && item.IsActive ? 'auto' : 'none',
                                                                                filter: showEditBtn && item.IsActive ? 'none' : 'blur(1px)',
                                                                            }}
                                                                            data-bs-toggle={showEditBtn && item.IsActive ? "offcanvas" : undefined}
                                                                            data-bs-target={showEditBtn && item.IsActive ? "#offcanvasRightEdit" : undefined}
                                                                            aria-controls="offcanvasRightEdit"
                                                                            onClick={() => showEditBtn && item.IsActive && handleEdit(item)}
                                                                        >
                                                                            <i className={`fa-regular fa-pen-to-square me-2`}></i>
                                                                            Edit
                                                                        </p>
                                                                        <p
                                                                            className={`text-hover-warning cursor-pointer`}
                                                                            style={{
                                                                                cursor: showAddAadharBtn && item.IsActive ? 'pointer' : 'not-allowed',
                                                                                opacity: showAddAadharBtn && item.IsActive ? 1 : 0.5,
                                                                                pointerEvents: showAddAadharBtn && item.IsActive ? 'auto' : 'none',
                                                                                filter: showAddAadharBtn && item.IsActive ? 'none' : 'blur(1px)',
                                                                            }}
                                                                            data-bs-toggle={showAddAadharBtn && item.IsActive ? "offcanvas" : undefined}
                                                                            data-bs-target={showAddAadharBtn && item.IsActive ? "#offcanvasRightManageCLS" : undefined}
                                                                            aria-controls="offcanvasRightManageCLS"
                                                                            onClick={() => showAddAadharBtn && item.IsActive && handleAddConCLAadhar(item)}
                                                                        >
                                                                            <i className={`fa-solid fa-helmet-safety text-primary me-2`}></i>
                                                                            Manage CL
                                                                        </p>
                                                                        <p
                                                                            className={`text-hover-warning cursor-pointer`}
                                                                            style={{
                                                                                cursor: showCLCountBtn && item.IsActive ? 'pointer' : 'not-allowed',
                                                                                opacity: showCLCountBtn && item.IsActive ? 1 : 0.5,
                                                                                pointerEvents: showCLCountBtn && item.IsActive ? 'auto' : 'none',
                                                                                filter: showCLCountBtn && item.IsActive ? 'none' : 'blur(1px)',
                                                                            }}
                                                                            data-bs-toggle={showCLCountBtn && item.IsActive ? "offcanvas" : undefined}
                                                                            data-bs-target={showCLCountBtn && item.IsActive ? "#offcanvasRightAddCL" : undefined}
                                                                            aria-controls="offcanvasRightAddCL"
                                                                            onClick={() => showCLCountBtn && item.IsActive && handleAddConCL(item)}
                                                                        >
                                                                            <i className="fa-solid fa-person-circle-check text-info me-2"></i>
                                                                            Add CL Count
                                                                        </p>
                                                                        <p
                                                                            className={`text-hover-warning cursor-pointer`}
                                                                            style={{
                                                                                cursor: showCLCheckInOutBtn && item.IsActive ? 'pointer' : 'not-allowed',
                                                                                opacity: showCLCheckInOutBtn && item.IsActive ? 1 : 0.5,
                                                                                pointerEvents: showCLCheckInOutBtn && item.IsActive ? 'auto' : 'none',
                                                                                filter: showCLCheckInOutBtn && item.IsActive ? 'none' : 'blur(1px)',
                                                                            }}
                                                                            data-bs-toggle={showCLCheckInOutBtn && item.IsActive ? "offcanvas" : undefined}
                                                                            data-bs-target={showCLCheckInOutBtn && item.IsActive ? "#offcanvasRightChekOutCLScan" : undefined}
                                                                            aria-controls="offcanvasRightChekOutCLScan"
                                                                            onClick={() => showCLCheckInOutBtn && item.IsActive && handleCheckOutCL(item, "CHECKIN")}
                                                                        >
                                                                            <i class="fa-solid fa-arrow-right me-2 text-success"></i>
                                                                            Check-In
                                                                        </p>
                                                                        <p
                                                                            className={`text-hover-warning cursor-pointer`}
                                                                            style={{
                                                                                cursor: showCLCheckInOutBtn && item.IsActive ? 'pointer' : 'not-allowed',
                                                                                opacity: showCLCheckInOutBtn && item.IsActive ? 1 : 0.5,
                                                                                pointerEvents: showCLCheckInOutBtn && item.IsActive ? 'auto' : 'none',
                                                                                filter: showCLCheckInOutBtn && item.IsActive ? 'none' : 'blur(1px)',
                                                                            }}
                                                                            data-bs-toggle={showCLCheckInOutBtn && item.IsActive ? "offcanvas" : undefined}
                                                                            data-bs-target={showCLCheckInOutBtn && item.IsActive ? "#offcanvasRightChekOutCLScan" : undefined}
                                                                            aria-controls="offcanvasRightChekOutCLScan"
                                                                            onClick={() => showCLCheckInOutBtn && item.IsActive && handleCheckOutCL(item, "CHECKOUT")}
                                                                        >
                                                                            <i class="fa-solid fa-arrow-left me-2 text-danger"></i>
                                                                            Check-Out
                                                                        </p>
                                                                        <p
                                                                            style={{
                                                                                cursor: showDeleteBtn ? 'pointer' : 'not-allowed',
                                                                                opacity: showDeleteBtn ? 1 : 0.5,
                                                                                pointerEvents: showDeleteBtn ? 'auto' : 'none',
                                                                                filter: showDeleteBtn ? 'none' : 'blur(1px)',
                                                                            }}
                                                                            className="text-hover-warning"
                                                                            onClick={() => showDeleteBtn && handleDeleteContractor(item)}
                                                                        >
                                                                            <i className={`fa-solid fa-toggle-${item.IsActive ? 'off' : 'on'} me-2 text-${item.IsActive ? 'danger' : 'success'}`}></i>
                                                                            {showDeleteBtn ? 'Inactive' : 'Active'}
                                                                        </p>
                                                                    </div>
                                                                }
                                                            >
                                                                <button className="btn">
                                                                    <i className="fa-solid fa-ellipsis-vertical"></i>
                                                                </button>
                                                            </Popover>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan="6" className="text-center py-10">
                                                        <p className="text-gray-400 fw-bold">No Data Available</p>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                    <div className="d-flex flex-stack flex-wrap pt-10">
                                        {/* Left Side: Record Info */}
                                        <div className="fs-6 fw-bold text-gray-700">
                                            Showing {((currentPage - 1) * recordsPerPage) + 1} to {Math.min(currentPage * recordsPerPage, filteredData?.length)} of {filteredData?.length} records
                                        </div>

                                        {/* Right Side: Pagination Buttons */}
                                        <div className="dt-paging paging_simple_numbers">
                                            <nav aria-label="pagination">
                                                <ul className="pagination">
                                                    <li className={`dt-paging-button page-item ${currentPage === 1 ? "disabled" : ""}`}>
                                                        <button
                                                            className="page-link previous"
                                                            type="button"
                                                            onClick={handlePrevious}
                                                            aria-label="Previous"
                                                        >
                                                            <i className="fa-solid fa-chevron-left fs-8"></i>
                                                        </button>
                                                    </li>

                                                    {getPaginationNumbers().map((page, index) => (
                                                        <li
                                                            key={index}
                                                            className={`dt-paging-button page-item ${page === currentPage ? "active" : ""} ${page === "..." ? "disabled" : ""}`}
                                                        >
                                                            <button
                                                                className="page-link"
                                                                type="button"
                                                                onClick={() => page !== "..." && handlePageClick(page)}
                                                            >
                                                                {page}
                                                            </button>
                                                        </li>
                                                    ))}

                                                    <li className={`dt-paging-button page-item ${currentPage === totalPages ? "disabled" : ""}`}>
                                                        <button
                                                            className="page-link next"
                                                            type="button"
                                                            onClick={handleNext}
                                                            aria-label="Next"
                                                        >
                                                            <i className="fa-solid fa-chevron-right fs-8"></i>
                                                        </button>
                                                    </li>
                                                </ul>
                                            </nav>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Mobile View 2 */}
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
                                    placeholder="Search Contractors"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            {dataLoading ? (
                                <div className="container"></div>
                            ) : filteredData && filteredData.length > 0 ? (
                                filteredData.map((item, index) => (
                                    <div key={item.Id} className="card mb-2 shadow-sm rounded">
                                        <div className="card-body">
                                            <div className="d-flex justify-content-between align-items-start">
                                                <span>
                                                    <div className={`badge ${item.IsActive ? 'badge-light-success' : 'badge-light-danger'}`}>
                                                        {item.IsActive ? 'Active' : 'Inactive'}
                                                    </div>
                                                </span>
                                                <div>
                                                    <i
                                                        className={`fa-regular fa-pen-to-square me-3 ${item.IsActive && showEditBtn ? 'text-info cursor-pointer' : 'text-muted'}`}
                                                        data-bs-toggle={item.IsActive && showEditBtn ? "offcanvas" : undefined}
                                                        data-bs-target={item.IsActive && showEditBtn ? "#offcanvasRightEdit" : undefined}
                                                        onClick={() => item.IsActive && showEditBtn && handleEdit(item)}
                                                        style={!item.IsActive && showEditBtn ? { pointerEvents: 'none', opacity: 0.6 } : {}}
                                                        title={!item.IsActive && showEditBtn ? "Cannot edit inactive contractor" : "Edit"}
                                                    ></i>

                                                    <i
                                                        className={`fa-solid fa-toggle-${item.IsActive ? 'on' : 'off'} me-2 text-${item.IsActive ? 'success' : 'danger'} cursor-pointer`}
                                                        onClick={() => showDeleteBtn && handleDeleteContractor(item)}
                                                        title={item.IsActive ? "Deactivate" : "Activate"}
                                                    ></i>

                                                </div>
                                            </div>

                                            <div className="mb-2">
                                                <div className="d-flex justify-content-between">
                                                    <span className="text-muted">Contractor Name:</span>
                                                    <span className="fw-semibold">{item.ContractorName.length > 20 ? item.ContractorName.slice(0, 20) + '...' : item.ContractorName}</span>
                                                </div>
                                                <div className="d-flex justify-content-between">
                                                    <span className="text-muted">Mobile:</span>
                                                    <span className="fw-semibold">{item.PhoneNumber}</span>
                                                </div>
                                                <div className="d-flex justify-content-between">
                                                    <span className="text-muted">Email:</span>
                                                    <span className="fw-semibold">{item.Email.length > 20 ? item.Email.slice(0, 20) + '...' : item.Email}</span>
                                                </div>
                                            </div>

                                            <div className="d-flex flex-wrap align-items-center mt-2">
                                                <span
                                                    className={`badge ${item.IsActive && showAddAadharBtn ? 'badge-light-primary border border-primary' : 'badge-light-secondary text-muted'} cursor-pointer`}
                                                    data-bs-toggle={item.IsActive && showAddAadharBtn ? "offcanvas" : undefined}
                                                    data-bs-target={item.IsActive && showAddAadharBtn ? "#offcanvasRightManageCLS" : undefined}
                                                    onClick={() => item.IsActive && showAddAadharBtn && handleAddConCLAadhar(item)}
                                                    style={!item.IsActive && showAddAadharBtn ? { pointerEvents: 'none', opacity: 0.6 } : {}}
                                                    title={!item.IsActive && showAddAadharBtn ? "Contractor is inactive" : ""}
                                                >
                                                    <i className={`fa-solid fa-helmet-safety me-1 ${item.IsActive && showAddAadharBtn ? 'text-primary' : 'text-muted'}`}></i>
                                                    Manage CL
                                                </span>
                                                <span
                                                    className={`badge ${item.IsActive && showCLCountBtn ? 'badge-light-info border border-info' : 'badge-light-secondary text-muted'} cursor-pointer`}
                                                    data-bs-toggle={item.IsActive && showCLCountBtn ? "offcanvas" : undefined}
                                                    data-bs-target={item.IsActive && showCLCountBtn ? "#offcanvasRightAddCL" : undefined}
                                                    onClick={() => item.IsActive && showCLCountBtn && handleAddConCL(item)}
                                                    style={!item.IsActive && showCLCountBtn ? { pointerEvents: 'none', opacity: 0.6 } : {}}
                                                    title={!item.IsActive && showCLCountBtn ? "Contractor is inactive" : ""}
                                                >
                                                    <i className={`fa-solid fa-person-circle-check me-1 ${item.IsActive && showCLCountBtn ? 'text-info' : 'text-muted'}`}></i>
                                                    CL Count
                                                </span>
                                                <span
                                                    className={`badge ${item.IsActive && showCLCheckInOutBtn ? 'badge-light-success border border-success' : 'badge-light-secondary text-muted'} cursor-pointer`}
                                                    data-bs-toggle={item.IsActive && showCLCheckInOutBtn ? "offcanvas" : undefined}
                                                    data-bs-target={item.IsActive && showCLCheckInOutBtn ? "#offcanvasRightChekOutCLScan" : undefined}
                                                    onClick={() => {
                                                        if (item.IsActive && showCLCheckInOutBtn) {
                                                            handleCheckOutCL(item, "CHECKIN");
                                                        }
                                                    }}
                                                    style={!item.IsActive && showCLCheckInOutBtn ? { pointerEvents: 'none', opacity: 0.6 } : {}}
                                                    title={!item.IsActive && showCLCheckInOutBtn ? "Contractor is inactive" : ""}
                                                >
                                                    <i className={`fa-solid fa-arrow-right me-1 ${item.IsActive && showCLCheckInOutBtn ? 'text-success' : 'text-muted'}`}></i>
                                                    Check-In
                                                </span>
                                                <span
                                                    className={`badge ${item.IsActive && showCLCheckInOutBtn ? 'badge-light-warning border border-warning' : 'badge-light-secondary text-muted'} cursor-pointer`}
                                                    data-bs-toggle={item.IsActive && showCLCheckInOutBtn ? "offcanvas" : undefined}
                                                    data-bs-target={item.IsActive && showCLCheckInOutBtn ? "#offcanvasRightChekOutCLScan" : undefined}
                                                    onClick={() => {
                                                        if (item.IsActive && showCLCheckInOutBtn) {
                                                            handleCheckOutCL(item, "CHECKOUT");
                                                        }
                                                    }}
                                                    style={!item.IsActive && showCLCheckInOutBtn ? { pointerEvents: 'none', opacity: 0.6 } : {}}
                                                    title={!item.IsActive && showCLCheckInOutBtn ? "Contractor is inactive" : ""}
                                                >
                                                    <i className={`fa-solid fa-arrow-left me-1 ${item.IsActive && showCLCheckInOutBtn ? 'text-danger' : 'text-muted'}`}></i>
                                                    Check-Out
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
            </div>

            <AddContactor />
            <EditContactor editObj={eitDataId} />
            <AddContactorCL conObj={addConCL} />
            <AadhaarScanner checkType={checkType} conObj={checkOutCL} />
            <ManageCLAadhar conObj={conObj} />
            {/* <ViewPassCheckInOut viewId={viewDataId} /> */}
            {/* <EditContactorCL conObj={editConCL} /> */}
            {/* <CheckInContactorCL conObj={checkInConCL} />
            <CheckOutContactorCL conObj={checkOutConCL} /> */}
        </Base1>
    )
}