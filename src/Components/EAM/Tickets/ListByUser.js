
import React, { useState, useEffect } from "react";
import Base1 from "../../Config/Base1";
import { Popover } from 'antd';
import '../../Config/Pagination.css';
import Swal from 'sweetalert2';
import '../../Config/Loader.css';
import { Link, useNavigate } from "react-router-dom";
import RegisterTicket from "./Add";
import EditTicket from "./Edit";
import AssignTechnician from "./AssignTech";
import CloseTicket from "./CloseTicket";
import { Select } from "antd";
import { fetchWithAuth } from "../../../utils/api";

export default function TicketsListByUser() {

    const navigate = useNavigate();
    const [sessionUserData, setSessionUserData] = useState([]);
    const [techniciansData, setTechniciansData] = useState([]);
    const [dataLoading, setDataLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [closeData, setCloseData] = useState([]);
    const [editData, setEditData] = useState([]);
    const [ticketData, setTicketData] = useState([]);
    const [openPanelId, setOpenPanelId] = useState(null);
    const [approveSubmitLoading, SetApproveSubmitLoading] = useState(null);
    const [usersData, setUsersData] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [selectedDueDate, setSelectedDueDate] = useState(null);
    const [selectedItemForApproval, setSelectedItemForApproval] = useState(null);
    const [sessionActionIds, setSessionActionIds] = useState([]);

    const { Option } = Select;

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
                (item) => item.MenuName === "Tickets"
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
            const response = await fetchWithAuth(`PMMS/GetTicketsByUserId?UserId=${sessionUserData.Id}&OrgId=${sessionUserData.OrgId}`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });
            if (response.ok) {
                const data = await response.json();
                setTechniciansData(data.ResultData);
            } else {
                console.error('Failed to fetch technicians data:', response.statusText);
            }
        } catch (error) {
            console.error('Error fetching technicians data:', error.message);
        } finally {
            setDataLoading(false);
        }
    };

    useEffect(() => {
        if (sessionUserData.OrgId) {
            fetchData();
        }
    }, [sessionUserData]);

    const fetchUsers = async () => {
        try {
            const response = await fetchWithAuth(`auth/getUsers?OrgId=${sessionUserData.OrgId}`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });
            if (response.ok) {
                const data = await response.json();
                // const filteredUsers = data.ResultData?.filter(user => user.RoleId === 3) || [];
                setUsersData(data.ResultData || []);
            } else {
                console.error('Failed to fetch attendance data:', response.statusText);
            }
        } catch (error) {
            console.error('Error fetching attendance data:', error.message);
        }
    };

    useEffect(() => {
        if (sessionUserData.OrgId) {
            fetchUsers();
        }
    }, [sessionUserData]);

    const filteredData = Array.isArray(techniciansData)
    ? techniciansData.filter((item) => {
        const machineName = item?.MachineName?.toLowerCase() || '';
        const ticketCode = item?.TicketCode?.toLowerCase() || '';
        const technician = item?.Technician?.toLowerCase() || '';
        const status = item?.Status?.toLowerCase() || '';

        const query = searchQuery.toLowerCase();

        return (
            machineName.includes(query) ||
            ticketCode.includes(query) ||
            technician.includes(query) ||
            status.includes(query)
        );
    })
    : []; // Fallback if techniciansData is not an array

    const handleEdit = (item) => {
        setEditData(item);
    };

    const handleCloseTicket = (item) => {
        setCloseData(item);
    };

    const handleAssignTech = (item) => {
        setTicketData(item);
    };

    const [currentPage, setCurrentPage] = useState(1);
    const recordsPerPage = 10;
    // const totalPages = filteredData.length ? Math.ceil(filteredData?.length / recordsPerPage) : 0;
    const totalPages = Math.ceil((filteredData || []).length / recordsPerPage);

    // Get current records to display
    const indexOfLastRecord = currentPage * recordsPerPage;
    const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
    const currentRecords = filteredData?.slice(indexOfFirstRecord, indexOfLastRecord);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery]);

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

    const handleDeleteTicket = async (item) => {
        Swal.fire({
            title: "Are you sure?",
            text: "Do you want to delete ticket?",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#3085d6",
            cancelButtonColor: "#d33",
            confirmButtonText: "Yes, delete it!"
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const payload = {
                        UpdatedBy: sessionUserData.Id,
                        Id: item.Id,
                        OrgId: sessionUserData.OrgId,
                    };

                    const response = await fetchWithAuth(`PMMS/InActiveTechnicians`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify(payload),
                    });
                    const result = await response.json();

                    if (result.ResultData?.Status === 'Success') {
                        fetchData();
                        Swal.fire("Success!", "Technician has been deleted.", "success");
                    } else {
                        const errorData = await response.json();
                        Swal.fire("Error!", errorData.ResultData?.ResultMessage || "Failed to delete technician.", "error");
                    }
                } catch (error) {
                    console.error("Error during technician delete:", error.message);
                    Swal.fire("Error!", "An unexpected error occurred.", "error");
                }
            }
        });
    };

    const handleApproveSubmit = (e) => {
        e.preventDefault(); // prevent default form submit
        SetApproveSubmitLoading(true);

        if (!selectedUser || !selectedDueDate) {
            Swal.fire("Missing Info", "Please select user and due date", "warning");
            SetApproveSubmitLoading(false);
            return;
        }

        const item = selectedItemForApproval;
        if (!item) {
            Swal.fire("Error", "No ticket selected for approval", "error");
            SetApproveSubmitLoading(false);
            return;
        }

        Swal.fire({
            title: 'Are you sure?',
            text: `Do you want to approve ticket: ${item?.Col2 || item?.TicketCode || item?.Id}?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Yes, Approve',
            cancelButtonText: 'No',
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const formPayload = {
                        OrgId: sessionUserData?.OrgId,
                        Priority: item.Priority,
                        MachineId: item.MachineId,
                        TicketStatus: "APPROVED",
                        TicketId: item?.Id,
                        UserId: sessionUserData?.Id,
                        JsonData: {
                            DueDate: selectedDueDate,
                            MachineId: item.MachineId,
                            TicketCode: item.TicketCode,
                            AssignedEmail: selectedUser.Email,
                            AssignedUser: selectedUser.Name,
                        }
                    };

                    const response = await fetchWithAuth(`PMMS/TicketsWorkFlow`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(formPayload),
                    });

                    const resultData = await response.json();
                    SetApproveSubmitLoading(false);

                    if (resultData.success) {
                        SetApproveSubmitLoading(false);
                        if (result.data.result[0].ResponseCode === 2003) {
                            Swal.fire({
                                title: "Success",
                                text: result.data.result[0].Logs || "Ticket has been approved successfully.",
                                icon: "success",
                            }).then(() => window.location.reload());
                        }
                    } else {
                        SetApproveSubmitLoading(false);
                        Swal.fire({
                            title: "Error",
                            text: resultData?.ResultData?.ResultMessage || "Approval failed.",
                            icon: "error",
                        });
                    }

                } catch (error) {
                    SetApproveSubmitLoading(false);
                    console.error("Approval error:", error);
                    Swal.fire({
                        title: "Error",
                        text: "Something went wrong while approving the ticket.",
                        icon: "error",
                    });
                }
            }
        });
    };

    const handleReject = (item) => {
        Swal.fire({
            title: 'Are you sure?',
            text: `Do you want to reject ticket: ${item?.Col2 || item?.TicketCode || item?.Id}?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Yes, Reject',
            cancelButtonText: 'No',
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const formPayload = {
                        OrgId: sessionUserData?.OrgId,
                        Priority: item.Priority,
                        TicketStatus: "REJECTED",
                        TicketId: item?.Id,
                        UserId: sessionUserData?.Id,
                        JsonData: {
                            MachineId: item.MachineId,
                            TicketCode: item.TicketCode,
                        }
                    };

                    const response = await fetchWithAuth(`PMMS/TicketsWorkFlow`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(formPayload),
                    });

                    const resultData = await response.json();

                    if (resultData.success) {
                        if (result.data.result[0].ResponseCode === 2004) {
                            Swal.fire({
                                title: "Success",
                                text: result.data.result[0].Logs || "Ticket has been rejected successfully.",
                                icon: "success",
                            }).then(() => window.location.reload());
                        }
                    } else {
                        Swal.fire({
                            title: "Error",
                            text: resultData?.ResultData?.ResultMessage || "Reject failed.",
                            icon: "error",
                        });
                    }

                } catch (error) {
                    console.error("Reject error:", error);
                    Swal.fire({
                        title: "Error",
                        text: "Something went wrong while rejecting the ticket.",
                        icon: "error",
                    });
                }
            }
        });
    };

    const getStatusBadgeClass = (status) => {
        switch (status?.toLowerCase()) {
            case "new":
                return "badge-light-primary";
            case "assigned":
                return "badge-light-success";
            case "approved":
                return "badge-light-danger";
            case "closed":
                return "badge-light-info";
            case "resolved":
                return "badge-light-info";
            case "req approval":
                return "badge-light-info";
            case "req approved":
                return "badge-light-info";
            case "filesupload":
                return "badge-light-info";
            default:
                return "badge-light";
        }
    };

    const togglePanel = (id) => {
        setOpenPanelId((prevId) => (prevId === id ? null : id));
    };

    const permissionsByStatus = {
        edit: ["NEW", "REJECTED", "MODIFIED"],
        delete: ["NEW", "MODIFIED", "REJECTED"],
        approve: ["NEW", "REJECTED", "MODIFIED"],
        reject: ["NEW", "MODIFIED"],
        assignTech: ["APPROVED"],
        close: ["RESOLVED"],
    };
      
    const showAddBtn = sessionActionIds?.includes(1);
    const showViewBtn = sessionActionIds?.includes(2);
    const showEditBtn = sessionActionIds?.includes(3);
    const showApproveBtn = sessionActionIds?.includes(4);
    const showRejectBtn = sessionActionIds?.includes(5);
    const showAssignTechBtn = sessionActionIds?.includes(8);
    const showCloseBtn = sessionActionIds?.includes(10);
    const showDeleteBtn = sessionActionIds?.includes(11);

    return (
        <Base1>
            <div id="kt_app_toolbar" className="app-toolbar py-3 py-lg-6">
                <div id="kt_app_toolbar_container" className="app-container container-xxl d-flex flex-stack">
                    <div className="page-title d-flex flex-column justify-content-center flex-wrap me-3">
                        <h1 className="page-heading d-flex text-gray-900 fw-bold fs-3 flex-column justify-content-center my-0">Tickets List</h1>
                        <ul className="breadcrumb breadcrumb-separatorless fw-semibold fs-7 my-0 pt-1">
                            <li className="breadcrumb-item text-muted">
                                <Link to='/dashboard' className="text-muted text-hover-primary">Home</Link>
                            </li>
                            <li className="breadcrumb-item">
                                <span className="bullet bg-gray-500 w-5px h-2px"></span>
                            </li>
                            <li className="breadcrumb-item text-muted">Tickets</li>
                        </ul>
                    </div>
                    {showAddBtn && (
                        <div className="d-flex align-items-center gap-2 gap-lg-3">
                            <a
                                className={`btn btn-primary d-none d-md-block btn-sm`}
                                style={{ height: "3rem" }}
                                data-bs-toggle="offcanvas"
                                data-bs-target="#offcanvasRightAdd"
                                aria-controls="offcanvasRightAdd">Add
                            </a>
                            <a
                                className={`btn btn-light-primary btn-sm d-block d-md-none btn-sm`}
                                style={{ height: "3rem" }}
                                data-bs-toggle="offcanvas"
                                data-bs-target="#offcanvasRightAdd"
                                aria-controls="offcanvasRightAdd"><i className="fa-solid fa-plus fs-2"></i>
                            </a>
                        </div>
                    )}
                </div>
            </div>
            <div id="kt_app_content" className="app-content flex-column-fluid">
                <div id="kt_app_content_container" className="app-container container-xxl">
                    <div className="card d-md-block d-none mt-1">
                        <div className="card-header border-0 pt-6">
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
                                        placeholder="Search Technicians"
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
                                            <th className="min-w-125px">Ticket Code</th>
                                            <th className="min-w-125px">Asset</th>
                                            <th className="min-w-125px">Technician</th>
                                            <th className="min-w-100px">Priority</th>
                                            <th className="min-w-100px">Status</th>
                                            <th className="">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="fw-semibold text-gray-600">
                                        {dataLoading ? (
                                            <tr>
                                                <td colSpan="8" className="text-center">
                                                    <div className="container"></div>
                                                </td>
                                            </tr>
                                        ) : currentRecords && currentRecords.length > 0 ? (
                                            currentRecords.map((item, index) => {
                                                const canEdit = showEditBtn && permissionsByStatus.edit.includes(item.Status);
                                                const canDelete = showDeleteBtn && permissionsByStatus.delete.includes(item.Status);
                                                const canApprove = showApproveBtn && permissionsByStatus.approve.includes(item.Status);
                                                const canReject = showRejectBtn && permissionsByStatus.reject.includes(item.Status);
                                                const canAssignTech = showAssignTechBtn && permissionsByStatus.assignTech.includes(item.Status);
                                                const canClose = showCloseBtn && permissionsByStatus.close.includes(item.Status);
                                                const canView = showViewBtn;
                                                return(
                                                    <tr>
                                                        <td>{(currentPage - 1) * recordsPerPage + index + 1}</td>
                                                        <td>
                                                            <a href="#" className="text-gray-600 text-hover-primary mb-1">{item.TicketCode}</a>
                                                        </td>
                                                        <td>
                                                            <a className="text-gray-800 text-hover-primary mb-1" title={item?.MachineName}>{item?.MachineName.length > 28 ? item?.MachineName.slice(0, 28) + '...' : item.MachineName}</a>
                                                        </td>
                                                        <td>{item.Technician || 'N/A'}</td>
                                                        <td>
                                                            {item.Priority === 1 && (
                                                                <span className="badge badge-light-danger">High</span>
                                                            )}
                                                            {item.Priority === 2 && (
                                                                <span className="badge badge-light-warning">Medium</span>
                                                            )}
                                                            {item.Priority === 3 && (
                                                                <span className="badge badge-light-primary">Low</span>
                                                            )}
                                                        </td>
                                                        <td>
                                                            <span className={`badge ${getStatusBadgeClass(item.Status)}`}>
                                                                {item.Status}
                                                            </span>
                                                        </td>
                                                        <td className="">
                                                            <Popover
                                                                placement="bottom"
                                                                content={
                                                                    <div style={{ width: '8rem' }}>
                                                                        <p
                                                                            style={{
                                                                                cursor: canView ? 'pointer' : 'not-allowed',
                                                                                opacity: canView ? 1 : 0.5,
                                                                                pointerEvents: canView ? 'auto' : 'none',
                                                                                filter: canView ? 'none' : 'blur(1px)',
                                                                            }}
                                                                            className="text-hover-warning"
                                                                        >
                                                                            <Link to={`/pmms/ticket-view/${item.OrgId}/${item.Id}`}>
                                                                                <i className="fa-regular fa-eye me-2"></i>
                                                                                View
                                                                            </Link>
                                                                        </p>
                                                                        <p
                                                                            style={{
                                                                                cursor: canEdit ? 'pointer' : 'not-allowed',
                                                                                opacity: canEdit ? 1 : 0.5,
                                                                                pointerEvents: canEdit ? 'auto' : 'none',
                                                                                filter: canEdit ? 'none' : 'blur(1px)',
                                                                            }}
                                                                            className="text-hover-warning"
                                                                            data-bs-toggle="offcanvas"
                                                                            data-bs-target="#offcanvasRightEdit"
                                                                            aria-controls="offcanvasRightEdit"
                                                                            onClick={() => canEdit && handleEdit(item)}
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
                                                                            className="text-hover-warning"
                                                                            data-bs-toggle="offcanvas"
                                                                            data-bs-target="#offcanvasRightApprove"
                                                                            aria-controls="offcanvasRightApprove"
                                                                            onClick={() => canApprove && setSelectedItemForApproval(item)}
                                                                        >
                                                                            <i className="fa-solid fa-check text-success me-2"></i>
                                                                            Approve
                                                                        </p>
                                                                        <p
                                                                            style={{
                                                                                cursor: canReject ? 'pointer' : 'not-allowed',
                                                                                opacity: canReject ? 1 : 0.5,
                                                                                pointerEvents: canReject ? 'auto' : 'none',
                                                                                filter: canReject ? 'none' : 'blur(1px)',
                                                                            }}
                                                                            className="text-hover-warning"
                                                                            onClick={() => canReject && handleReject(item)}
                                                                        >
                                                                            <i className="fa-solid fa-ban me-2 text-danger"></i>
                                                                            Reject
                                                                        </p>
                                                                        <p
                                                                            style={{
                                                                                cursor: canAssignTech ? 'pointer' : 'not-allowed',
                                                                                opacity: canAssignTech ? 1 : 0.5,
                                                                                pointerEvents: canAssignTech ? 'auto' : 'none',
                                                                                filter: canAssignTech ? 'none' : 'blur(1px)',
                                                                            }}
                                                                            className="text-hover-warning"
                                                                            data-bs-toggle="offcanvas"
                                                                            data-bs-target="#offcanvasRightAssignTech"
                                                                            aria-controls="offcanvasRightAssignTech"
                                                                            onClick={() => canAssignTech && handleAssignTech(item)}
                                                                        >
                                                                            <i className="fa-solid fa-user-nurse text-primary me-2"></i>
                                                                            Assign Tech
                                                                        </p>
                                                                        <p
                                                                            style={{
                                                                                cursor: canClose ? 'pointer' : 'not-allowed',
                                                                                opacity: canClose ? 1 : 0.5,
                                                                                pointerEvents: canClose ? 'auto' : 'none',
                                                                                filter: canClose ? 'none' : 'blur(1px)',
                                                                            }}
                                                                            className="text-hover-warning"
                                                                            data-bs-toggle="offcanvas"
                                                                            data-bs-target="#offcanvasRightCloseTic"
                                                                            aria-controls="offcanvasRightCloseTic"
                                                                            onClick={() => canClose && handleCloseTicket(item)}
                                                                        >
                                                                            <i className="fa-solid fa-clipboard-check text-success me-2"></i>
                                                                            Close
                                                                        </p>
                                                                        <p
                                                                            style={{
                                                                                cursor: canDelete ? 'pointer' : 'not-allowed',
                                                                                opacity: canDelete ? 1 : 0.5,
                                                                                pointerEvents: canDelete ? 'auto' : 'none',
                                                                                filter: canDelete ? 'none' : 'blur(1px)',
                                                                            }}
                                                                            className="text-hover-warning"
                                                                            onClick={() => canDelete && handleDeleteTicket(item)}
                                                                        >
                                                                            <i className="fa-regular fa-trash-can text-danger me-2"></i>
                                                                            Delete
                                                                        </p>
                                                                    </div>
                                                                }
                                                                trigger="hover"
                                                            >
                                                                <button
                                                                    className="btn"
                                                                >
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

                                            {/* Page Numbers */}
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

                                            {/* Next Button */}
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
                        </div>
                    </div>

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
                                placeholder="Search Tickets"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        {dataLoading ? (
                            <div className="container"></div>
                        ) : currentRecords && currentRecords.length > 0 ? (
                            currentRecords.map((item, index) => (
                                <div key={item.Id} className="card mb-2 shadow-sm rounded">
                                    <div className="card-body">
                                        <div className="d-flex justify-content-between align-items-center">
                                            <div className={`badge ${getStatusBadgeClass(item.Status)}`}>
                                                {item.Status || 'N/A'}
                                            </div>

                                            <div className="d-flex align-items-center gap-2">
                                                {openPanelId === item.Id && (
                                                    <div className="d-flex align-items-center gap-2 slide-panel">
                                                        <Link to={`/ticket-view/${item.OrgId}/${item.Id}`}>
                                                            <i className="fa-regular fa-eye"></i>
                                                        </Link>
                                                        <i
                                                            className="fa-regular fa-pen-to-square text-info"
                                                            data-bs-toggle="offcanvas"
                                                            data-bs-target="#offcanvasRightEdit"
                                                            aria-controls="offcanvasRightEdit"
                                                            onClick={() => handleEdit(item)}
                                                        ></i>
                                                        {/* <i
                                                            className="fa-solid fa-check"
                                                            data-bs-toggle="offcanvas"
                                                            data-bs-target="#offcanvasRightApprove"
                                                            aria-controls="offcanvasRightApprove"
                                                            onClick={() => setSelectedItemForApproval(item)}
                                                        ></i> */}
                                                        <i
                                                            className="fa-solid fa-ban text-danger"
                                                        // data-bs-toggle="offcanvas"
                                                        // data-bs-target="#offcanvasRightApprove"
                                                        // aria-controls="offcanvasRightApprove"
                                                        // onClick={() => handleApprove(item)}
                                                        ></i>
                                                        {/* <i
                                                            className="fa-solid fa-user-nurse text-primary"
                                                            data-bs-toggle="offcanvas"
                                                            data-bs-target="#offcanvasRightAssignTech"
                                                            aria-controls="offcanvasRightAssignTech"
                                                            onClick={() => handleAssignTech(item)}
                                                        ></i>
                                                        <i
                                                            className="fa-solid fa-clipboard-check text-success"
                                                            data-bs-toggle="offcanvas"
                                                            data-bs-target="#offcanvasRightCloseTic"
                                                            aria-controls="offcanvasRightCloseTic"
                                                            onClick={() => handleCloseTicket(item)}
                                                        ></i>
                                                        <i
                                                            className="fa-regular fa-trash-can text-warning"
                                                            onClick={() => handleDeleteTicket(item)}
                                                            style={{ cursor: "pointer" }}
                                                        ></i> */}
                                                    </div>
                                                )}

                                                <span className="arrow-container text-muted" style={{ fontSize: '1.1rem' }}>
                                                    |
                                                    <i
                                                        className={`fa-solid ${openPanelId === item.Id ? 'fa-arrow-right' : 'fa-arrow-left'} ${openPanelId !== item.Id ? 'bounce-left' : ''}`}
                                                        onClick={() => togglePanel(item.Id)}
                                                        style={{ cursor: "pointer", marginLeft: "8px" }}
                                                    ></i>
                                                </span>
                                            </div>
                                        </div>

                                        <div className="mb-2">
                                            <div className="d-flex justify-content-between">
                                                <span className="text-muted">Ticket code:</span>
                                                <span className="fw-semibold">{item.TicketCode}</span>
                                            </div>
                                            <div className="d-flex justify-content-between">
                                                <span className="text-muted">Asset:</span>
                                                <span className="fw-semibold">{item.MachineName}</span>
                                            </div>
                                            <div className="d-flex justify-content-between">
                                                <span className="text-muted">Technician:</span>
                                                <span className="fw-semibold">{item.Technician || 'N/A'}</span>
                                            </div>
                                            <div className="d-flex justify-content-between">
                                                <span className="text-muted">Priority:</span>
                                                {item.Priority === 1 && (
                                                    <span className="badge badge-light-danger">High</span>
                                                )}
                                                {item.Priority === 2 && (
                                                    <span className="badge badge-light-warning">Medium</span>
                                                )}
                                                {item.Priority === 3 && (
                                                    <span className="badge badge-light-primary">Low</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))

                        ) : (
                            <p className="text-center mt-5">No Data Available</p>
                        )}
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
                </div>

                <div
                    className="offcanvas offcanvas-end"
                    tabIndex="-1"
                    id="offcanvasRightApprove"
                    aria-labelledby="offcanvasRightLabel"
                    style={{ width: "90%" }}
                >
                    <style>
                        {`
                            @media (min-width: 768px) { /* Medium devices and up (md) */
                                #offcanvasRightApprove {
                                    width: 50% !important;
                                }import { PropTypes } from 'prop-types';

                            }
                        `}
                    </style>
                    <form autoComplete="off" onSubmit={handleApproveSubmit}>
                        <div className="offcanvas-header d-flex justify-content-between align-items-center">
                            <h5 id="offcanvasRightLabel" className="mb-0">Approve (Assign Ticket to User)</h5>
                            <div className="d-flex align-items-center">
                                <button className="btn btn-primary btn-sm me-2" type="submit" disabled={approveSubmitLoading}>
                                    {approveSubmitLoading ? "Submitting..." : "Submit"}
                                </button>
                                <button
                                    type="button"
                                    className="btn-close"
                                    data-bs-dismiss="offcanvas"
                                    aria-label="Close"
                                ></button>
                            </div>
                        </div>
                        <div className="offcanvas-body" style={{ marginTop: "-2rem", maxHeight: "calc(100vh - 4rem)", overflowY: "auto" }}>
                            <div className="row">
                                {selectedItemForApproval && (
                                    <div className="mb-3">
                                        <strong>Ticket:</strong> <span className="fs-4 text-primary">{selectedItemForApproval?.TicketCode || selectedItemForApproval?.Col2}</span>
                                    </div>
                                )}
                                <div className="col-6 mb-2">
                                    <label className="form-label">
                                        Operational By <span className="text-danger">*</span>
                                    </label>
                                    <Select
                                        showSearch
                                        allowClear
                                        placeholder="Select Employee"
                                        className="w-100"
                                        value={selectedUser ? selectedUser?.Id : undefined}
                                        style={{ height: '3.2rem' }}
                                        onChange={(id) => {
                                            const user = usersData.find((u) => u.Id === id); // 👈 Get full user object
                                            setSelectedUser(user);
                                        }}
                                        optionFilterProp="children"
                                        filterOption={(input, option) =>
                                            option.children.toLowerCase().includes(input.toLowerCase())
                                        }
                                    >
                                        {usersData?.map((user) => (
                                            <Option key={user.Id} value={user.Id}>
                                                {user.Name}
                                            </Option>
                                        ))}
                                    </Select>
                                </div>
                                <div className="col-6 mb-2">
                                    <label className="form-label">
                                        Due Date <span className="text-danger">*</span>
                                    </label>
                                    <input
                                        className="form-control"
                                        type="date"
                                        value={selectedDueDate}
                                        min={new Date().toISOString().split("T")[0]}
                                        onChange={(e) => setSelectedDueDate(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    </form>
                </div>

                <style>
                    {`
                    .slide-panel {
                        opacity: 0;
                        transform: translateX(20px); /* Start slightly to the right */
                        animation: slideFadeIn 0.3s ease-out forwards;
                    }

                    @keyframes slideFadeIn {
                        from {
                            opacity: 0;
                            transform: translateX(20px);
                        }
                        to {
                            opacity: 1;
                            transform: translateX(0);
                        }
                    }

                    @keyframes bounceLeft {
                        0%, 100% {
                            transform: translateX(0);
                        }
                        50% {
                            transform: translateX(-5px);
                        }
                    }

                    .bounce-left {
                        animation: bounceLeft 1s infinite ease-in-out;
                    }
                `}
                </style>
            </div>
            <RegisterTicket />
            <EditTicket editObj={editData} />
            <AssignTechnician ticketObj={ticketData} />
            <CloseTicket ticketObj={closeData} />
        </Base1>
    )
}