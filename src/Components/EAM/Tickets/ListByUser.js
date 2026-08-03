
import React, { useState, useEffect } from "react";
import Base1 from "../../Config/Base1";
import { Popover, Select, Tooltip } from 'antd';
import '../../Config/Pagination.css';
import '../../Config/Loader.css';
import { Link, useNavigate, useLocation } from "react-router-dom";
import RegisterTicket from "./Add";
import { fetchWithAuth } from "../../../utils/api";
import { FileTextOutlined } from '@ant-design/icons';

export default function TicketsListByUser() {

    const navigate = useNavigate();
    const location = useLocation();

    const [sessionUserData, setSessionUserData] = useState([]);
    const [userTickets, setUserTickets] = useState([]);
    const [dataLoading, setDataLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
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
                setUserTickets(data.ResultData);
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

    const filteredData = Array.isArray(userTickets)
        ? userTickets.filter((item) => {
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
        : []; // Fallback if userTickets is not an array

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

    const formatDate = (dateString) => {
        if (!dateString) return "N/A";
        const date = new Date(dateString);
        return date.toLocaleDateString("en-GB").replace(/\//g, "-");
    };

    function getAgingStatus(dueDateString, status, updatedOn) {
        if (!dueDateString) return "-";

        const dueDate = new Date(dueDateString);
        const today = new Date();

        // Normalize times to midnight for accuracy
        dueDate.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);

        // Calculate difference in days
        const diffDays = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));

        // 🟢 If ticket is closed
        if (status === "CLOSED" && updatedOn) {
            const closedDate = new Date(updatedOn);
            closedDate.setHours(0, 0, 0, 0);
            const closeDiffDays = Math.floor((closedDate - dueDate) / (1000 * 60 * 60 * 24));

            const closedDateStr = closedDate.toLocaleDateString("en-GB"); // dd/mm/yyyy

            if (closeDiffDays > 0)
                return `Closed on ${closedDateStr} (${closeDiffDays} day${closeDiffDays > 1 ? "s" : ""} late)`;
            else if (closeDiffDays === 0)
                return `Closed on ${closedDateStr} (on time)`;
            else
                return `Closed on ${closedDateStr} (${Math.abs(closeDiffDays)} day${Math.abs(closeDiffDays) > 1 ? "s" : ""} early)`;
        }

        // 🟡 If ticket is open
        if (diffDays < 0)
            return `${Math.abs(diffDays)} day${Math.abs(diffDays) > 1 ? "s" : ""} left`;
        else if (diffDays === 0)
            return "Due Today";
        else
            return `${diffDays} day${diffDays > 1 ? "s" : ""} overdue`;
    };

    const showAddBtn = sessionActionIds?.includes(1);

    return (
        <Base1>
            <div id="kt_app_toolbar" className="app-toolbar py-3 py-lg-6">
                <div id="kt_app_toolbar_container" className="app-container container-xxl d-flex flex-stack">
                    <div className="page-title d-flex flex-column justify-content-center flex-wrap me-3">
                        <h1 className="page-heading d-flex text-gray-900 fw-bold fs-3 flex-column justify-content-center my-0">My Tickets List</h1>
                        <ul className="breadcrumb breadcrumb-separatorless fw-semibold fs-7 my-0 pt-1">
                            <li className="breadcrumb-item text-muted">
                                <Link to='/dashboard' className="text-muted text-hover-primary">Home</Link>
                            </li>
                            <li className="breadcrumb-item">
                                <span className="bullet bg-gray-500 w-5px h-2px"></span>
                            </li>
                            <li className="breadcrumb-item text-muted">My Tickets</li>
                        </ul>
                    </div>
                    {/* {showAddBtn && (
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
                    )} */}
                </div>
            </div>
            <div id="kt_app_content" className="app-content flex-column-fluid">
                <div id="kt_app_content_container" className="app-container container-xxl">
                    <div className="card d-md-block d-none">
                        <div className="card-header border-0">
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
                                        placeholder="Search Tickets"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="card-body pt-0">
                            <div className="table-responsive">
                                <table className="table align-middle table-hover gs-7 gy-5 mb-0 fs-6">
                                    <thead className="bg-light-primary">
                                        <tr className="text-start text-muted fw-bold fs-7 text-uppercase gs-0 border-bottom-2 border-primary">
                                            <th className="">S.No</th>
                                            <th className="min-w-125px">Ticket Code</th>
                                            <th className="min-w-145px">Asset</th>
                                            <th className="min-w-125px">Created On</th>
                                            <th className="min-w-205px">Technician</th>
                                            <th className="min-w-100px text-center">Priority</th>
                                            <th className="min-w-100px text-center">Status</th>
                                            <th className="min-w-100px">Aging</th>
                                            <th className="min-w-50px text-center">Last Log</th>
                                        </tr>
                                    </thead>
                                    <tbody className="fw-semibold text-gray-700">
                                        {dataLoading ? (
                                            <tr>
                                                <td colSpan="12" className="text-center">
                                                    <div className="container"></div>
                                                </td>
                                            </tr>
                                        ) : currentRecords && currentRecords?.length > 0 ? (
                                            currentRecords?.map((item, index) => {

                                                return (
                                                    <tr
                                                        key={index}
                                                        className="shadow-sm rounded-3"
                                                        style={{
                                                            transition: "all 0.2s ease-in-out",
                                                        }}
                                                    >
                                                        <td className="text-muted">
                                                            {(currentPage - 1) * recordsPerPage + index + 1}
                                                        </td>
                                                        <td>
                                                            <Link
                                                                to={`/eam/ticket-view/${item.OrgId}/${item.Id}`}
                                                                state={{
                                                                    from: `${location.pathname}${location.search}`,
                                                                }}
                                                                className="fw-bold text-dark text-hover-primary text-decoration-underline"
                                                            >
                                                                {item.TicketCode}
                                                            </Link>
                                                        </td>
                                                        <td>
                                                            <Tooltip
                                                                title={item.MachineName}
                                                                placement="topLeft"
                                                                color="blue"
                                                            >
                                                                <Link
                                                                    to={`/eam/ticket-view/${item.OrgId}/${item.Id}`}
                                                                    className="fw-bold text-primary"
                                                                    style={{
                                                                        display: "inline-block",
                                                                        maxWidth: "190px",
                                                                        whiteSpace: "nowrap",
                                                                        overflow: "hidden",
                                                                        textOverflow: "ellipsis",
                                                                        verticalAlign: "middle",
                                                                    }}
                                                                >
                                                                    {item.MachineName}
                                                                </Link>
                                                            </Tooltip>
                                                        </td>
                                                        <td>{formatDate(item.CreatedOn) || 'N/A'}</td>
                                                        <td>{item.Technician || 'N/A'}</td>
                                                        <td className="text-center">
                                                            {item.Priority === 1 && (
                                                                <span
                                                                    className="badge badge-light-danger d-inline-flex align-items-center justify-content-center"
                                                                    style={{ width: "80px" }}
                                                                >
                                                                    High
                                                                </span>
                                                            )}
                                                            {item.Priority === 2 && (
                                                                <span
                                                                    className="badge badge-light-warning d-inline-flex align-items-center justify-content-center"
                                                                    style={{ width: "80px" }}
                                                                >
                                                                    Medium
                                                                </span>
                                                            )}
                                                            {item.Priority === 3 && (
                                                                <span
                                                                    className="badge badge-light-primary d-inline-flex align-items-center justify-content-center"
                                                                    style={{ width: "80px" }}
                                                                >
                                                                    Low
                                                                </span>
                                                            )}
                                                        </td>

                                                        <td className="text-center">
                                                            <span
                                                                className={`badge ${getStatusBadgeClass(item.Status)} d-inline-flex align-items-center justify-content-center`}
                                                                style={{ width: "80px" }}
                                                            >
                                                                {item.Status}
                                                            </span>
                                                        </td>
                                                        <td className="text-info">
                                                            <Tooltip
                                                                title={getAgingStatus(item.DueDate, item.Status, item.UpdatedOn)}
                                                                placement="topLeft"
                                                                color="blue"
                                                            >
                                                                <span
                                                                    style={{
                                                                        display: "inline-block",
                                                                        maxWidth: "100px",
                                                                        whiteSpace: "nowrap",
                                                                        overflow: "hidden",
                                                                        textOverflow: "ellipsis",
                                                                        verticalAlign: "middle",
                                                                    }}
                                                                >
                                                                    {getAgingStatus(item.DueDate, item.Status, item.UpdatedOn)}
                                                                </span>
                                                            </Tooltip>
                                                        </td>
                                                        <td className="text-center">
                                                            {item.StatusLogs ? (
                                                                <Popover
                                                                    content={
                                                                        <div style={{ maxWidth: 250, whiteSpace: "pre-wrap" }}>
                                                                            {item.StatusLogs}
                                                                        </div>
                                                                    }
                                                                    title="Messaege"
                                                                    trigger="hover"
                                                                >
                                                                    <Tooltip >
                                                                        <FileTextOutlined style={{ fontSize: 12, color: "#1890ff", cursor: "pointer" }} />
                                                                    </Tooltip>
                                                                </Popover>
                                                            ) : (
                                                                "-"
                                                            )}
                                                        </td>
                                                    </tr>
                                                )
                                            })
                                        ) : (
                                            <tr>
                                                <td colSpan="12" className="text-center">
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
        </Base1>
    )
}