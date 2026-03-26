
import React, { useState, useEffect } from "react";
import { Popover, Select, Tooltip } from 'antd';
import '../../../Config/Pagination.css';
import '../../../Config/Loader.css';
import { useNavigate } from "react-router-dom";
import { fetchWithAuth } from "../../../../utils/api";
import LogoImg from '../../../Assests/Images/cwilogo.png';
import { formatToDDMMYYYY } from './../../../../utils/dateFunc';
import TicketViewDetails from "./ViewTicketDetails";
import TicketViewComments from "./TicketComments";
import Swal from "sweetalert2";

export default function TechTicketsList() {

    const navigate = useNavigate();
    const [sessionUserData, setSessionUserData] = useState([]);
    const [dataLoading, setDataLoading] = useState(false);
    const [usersData, setUsersData] = useState([]);
    const [techTicketsData, setTechTicketsData] = useState([]);
    const [selectedUserId, setSelectedUserId] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [viewData, setsetViewData] = useState([]);
    const [commentData, setCommentData] = useState([]);
    const [recordsPerPage, setRecordsPerPage] = useState(10);

    // Helper to get YYYY-MM-DD in local time
    const formatDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const [selectedFromDt, setSelectedFromDt] = useState(() => {
        const date = new Date();
        // Move to 15th of last month
        date.setMonth(date.getMonth() - 1);
        date.setDate(15);
        return formatDate(date);
    });

    const [selectedToDt, setSelectedToDt] = useState(() => {
        const date = new Date();
        // Move to 15th of next month
        date.setMonth(date.getMonth() + 1);
        date.setDate(15);
        return formatDate(date);
    });

    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        const userDataString = sessionStorage.getItem("userData");
        if (userDataString) {
            const userData = JSON.parse(userDataString);
            setSessionUserData(userData);
        } else {
            navigate("/");
        }
    }, [navigate]);

    const [dots, setDots] = useState("");

    useEffect(() => {
        const interval = setInterval(() => {
            setDots(prev => (prev.length < 3 ? prev + "." : ""));
        }, 500);
        return () => clearInterval(interval);
    }, []);

    const fetchDDLData = async () => {
        try {
            const sessionDDL = sessionStorage.getItem("ddlTechTicketsData");

            if (sessionDDL) {
                const parsed = JSON.parse(sessionDDL);

                setUsersData(parsed.users || []);
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

            const usersFilteredData = data.ResultData.filter(
                (item) => item.DDLName === "Users"
            );

            setUsersData(usersFilteredData || []);

            sessionStorage.setItem(
                "ddlTechTicketsData",
                JSON.stringify({
                    users: usersFilteredData,
                })
            );

        } catch (error) {
            console.error("Failed to fetch DDL data:", error);
            setUsersData([]);
        }
    };

    useEffect(() => {
        if (sessionUserData?.OrgId) {
            fetchDDLData();
        }
    }, [sessionUserData]);

    const fetchTechtickets = async (ovrFrom = null, ovrTo = null) => {
        setDataLoading(true);

        const fromDate = ovrFrom !== null ? ovrFrom : selectedFromDt;
        const toDate = ovrTo !== null ? ovrTo : selectedToDt;

        try {
            const response = await fetchWithAuth(
                `PMMS/GetTechnicianTickets?OrgId=${sessionUserData?.OrgId}&FromDate=${fromDate}&ToDate=${toDate}&CreatedBy=0&TechnicianId=${sessionUserData?.Id}`,
                {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                }
            );

            if (!response.ok) throw new Error("Network response was not ok");

            const data = await response.json();
            setTechTicketsData(data.ResultData || []);
        } catch (error) {
            console.error("Failed to fetch tickets:", error);
            setTechTicketsData([]);
        } finally {
            setDataLoading(false);
        }
    };

    useEffect(() => {
        if (sessionUserData?.OrgId && sessionUserData?.Id) {
            // Initial fetch using current state values
            fetchTechtickets();
        }
    }, [sessionUserData?.OrgId, sessionUserData?.Id]);
    // Dependency on IDs ensures it runs as soon as user login data is confirmed

    const filteredTickets = Array.isArray(techTicketsData)
        ? techTicketsData.filter((item) => {
            const query = searchQuery.toLowerCase();

            return (
                item.AssetName?.toLowerCase().includes(query) ||
                item.TicketCode?.toLowerCase().includes(query) ||
                item.Status?.toLowerCase().includes(query) ||
                item.Priority?.toLowerCase().includes(query) ||
                item.UserName?.toLowerCase().includes(query)
            );
        })
        : [];

    // Update your pagination variables to use filteredTickets
    const indexOfLastRecord = currentPage * recordsPerPage;
    const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
    const currentRecords = filteredTickets.slice(indexOfFirstRecord, indexOfLastRecord);
    const totalPages = Math.ceil(filteredTickets.length / recordsPerPage);

    const handlePageChange = (pageNumber) => {
        setCurrentPage(pageNumber);
    };

    const getPageNumbers = () => {
        const pageNumbers = [];
        const threshold = 2; // How many pages to show around the current page

        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pageNumbers.push(i);
        } else {
            if (currentPage <= 4) {
                // Near the start: 1 2 3 4 5 ... 50
                for (let i = 1; i <= 5; i++) pageNumbers.push(i);
                pageNumbers.push('...');
                pageNumbers.push(totalPages);
            } else if (currentPage > totalPages - 4) {
                // Near the end: 1 ... 46 47 48 49 50
                pageNumbers.push(1);
                pageNumbers.push('...');
                for (let i = totalPages - 4; i <= totalPages; i++) pageNumbers.push(i);
            } else {
                // In the middle: 1 ... 14 15 16 ... 50
                pageNumbers.push(1);
                pageNumbers.push('...');
                for (let i = currentPage - 1; i <= currentPage + 1; i++) pageNumbers.push(i);
                pageNumbers.push('...');
                pageNumbers.push(totalPages);
            }
        }
        return pageNumbers;
    };

    const getStatusBadgeConfig = (status) => {
        switch (status?.toLowerCase()) {
            case "assigned":
                return {
                    className: "status-assigned",
                    icon: "bi-person-gear",
                    label: "Assigned"
                };
            case "tech_fixed":
                return {
                    className: "status-fixed",
                    icon: "bi-check-all",
                    label: "Tech Fixed"
                };
            default:
                return {
                    className: "status-default",
                    icon: "bi-clock-history",
                    label: status
                };
        }
    };

    const handleViewClick = (data) => {
        setsetViewData(data);
    };

    const handleCommentClick = (data) => {
        setCommentData(data);
    };

    const handleLogout = async () => {
        sessionStorage.clear();
        localStorage.clear();
        navigate('/');
    };

    const content = (
        <div className="text-dark">
            <div className="menu-item px-3">
                <div className="menu-content d-flex align-items-center px-3">
                    <div className="symbol symbol-50px me-5">
                        {/* <img alt="Logo" src="assets/media/avatars/300-3.jpg" /> */}
                        <div
                            style={{
                                width: "40px",
                                height: "40px",
                                borderRadius: "50%",
                                backgroundColor: "skyblue",
                                color: "#333",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "18px",
                                fontWeight: "bold",
                                textTransform: "uppercase",
                            }}
                        >
                            {/* {sessionUserData?.Name?.charAt(0)} */}
                            <i className="fa-regular fa-user text-white"></i>
                        </div>
                    </div>
                    <div className="d-flex flex-column">
                        <div className="fw-bold d-flex align-items-center fs-5">{sessionUserData?.Name}
                            <span className="badge badge-light-success fw-bold fs-8 px-2 py-1 ms-2">Technician</span></div>
                        <a href="#" className="fw-semibold text-muted text-hover-primary fs-7">{sessionUserData?.Email}</a>
                    </div>
                </div>
            </div>
            <div className="separator my-2"></div>
            <div className="menu-item px-5">
                <a className="menu-link px-5 text-dark text-hover-warning"
                    data-bs-toggle="offcanvas"
                    data-bs-target="#offcanvasRightViewProfile"
                ><i className="fa-regular fa-user text-info me-2"></i> My Profile</a>
            </div>

            <div className="menu-item px-5">
                <a className="menu-link px-5 text-dark text-hover-warning" onClick={handleLogout}>
                    <i className="fa-solid fa-arrow-right-from-bracket text-danger me-2"></i> Sign Out
                </a>
            </div>
        </div>
    );

    const handleIsFixedClick = async (item) => {
        const { value: logText } = await Swal.fire({
            title: 'Resolve Ticket',
            html: `
                <div class="text-start small text-muted mb-3">
                    <strong>Ticket:</strong> ${item.TicketCode}<br/>
                    <strong>Issue:</strong> ${item.IssueType}
                </div>
            `,
            input: 'textarea',
            inputPlaceholder: 'Enter resolution details or logs here...',
            inputAttributes: {
                'aria-label': 'Type your message here'
            },
            showCancelButton: true,
            confirmButtonText: `<i class="bi bi-check2-circle text-white me-1 fs-4"></i>Submit Resolution`,
            confirmButtonColor: '#50cd89', // Success green
            cancelButtonText: `<i class="bi bi-x-circle text-white me-1 fs-4"></i>Cancel`,
            cancelButtonColor: '#f1416c', // Danger red
            inputValidator: (value) => {
                if (!value) {
                    return 'You need to write something!';
                }
            }
        });

        if (logText) {
            submitTicketFixed(item, logText);
        }
    };

    const submitTicketFixed = async (item, logText) => {
        const payload = {
            OrgId: sessionUserData?.OrgId,
            Priority: 1,
            TicketStatus: "TECH_FIXED",
            TicketId: item.TicketId,
            UserId: sessionUserData?.Id,
            JsonData: {
                TicketCreated: item.CreatedBy,
                Logs: logText,
                TicketId: item.TicketId
            }
        };

        try {
            Swal.showLoading(); // Show loader while fetching

            const res = await fetchWithAuth(`PMMS/TicketsWorkFlow`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = await res.json();

            if (data?.success && data?.data?.result?.[0]?.ResponseCode === 3003) {
                Swal.fire({
                    title: "Success",
                    text: data.data.result[0].Logs || "Ticket has been resolved successfully.",
                    icon: "success",
                }).then(() => {
                    fetchTechtickets();
                });
            } else {
                Swal.fire("Error", data?.ResultData?.ResultMessage || "Resolving failed", "error");
            }
        } catch (err) {
            console.error("Fetch Error:", err);
            Swal.fire("Error", "Something went wrong while connecting to the server", "error");
        }
    };

    return (
        <>
            <div id="kt_app_header" className="app-header text-white shadow-sm fixed-top" data-kt-sticky="true" style={{ backgroundColor: '#90e0ef' }}
                data-kt-sticky-activate="{default: true, lg: true}" data-kt-sticky-name="app-header-minimize" data-kt-sticky-offset="{default: '200px', lg: '0'}" data-kt-sticky-animation="false">
                <div className="app-container container-fluid d-flex align-items-stretch justify-content-between" id="kt_app_header_container">
                    <div className="d-flex align-items-center d-lg-none ms-n3 me-1 me-md-2" title="Show sidebar menu">
                        <div className="btn btn-icon btn-active-color-primary w-35px h-35px" id="kt_app_sidebar_mobile_toggle"
                        // style={{
                        //     pointerEvents: (shouldHideSidebar || reportId === '3') ? 'none' : 'auto',
                        //     opacity: (shouldHideSidebar || reportId === '3') ? 0.3 : 1
                        // }}
                        >
                            <i className="ki-duotone ki-abstract-14 fs-2 fs-md-1 text-white"
                                data-bs-toggle="offcanvas"
                                data-bs-target="#offcanvasLeftNav"
                                aria-controls="offcanvasLeftNav"
                            >
                                <span className="path1 text-dark"></span>
                                <span className="path2 text-info"></span>
                            </i>
                        </div>
                    </div>
                    <div className="d-flex align-items-center flex-grow-1 flex-lg-grow-0 d-lg-none">
                        <img alt="Logo" src={LogoImg} className="h-30px" />
                    </div>
                    <div className="d-flex align-items-stretch justify-content-between flex-lg-grow-1" id="kt_app_header_wrapper">
                        <div className="app-header-menu app-header-mobile-drawer align-items-stretch" data-kt-drawer="true" data-kt-drawer-name="app-header-menu" data-kt-drawer-activate="{default: true, lg: false}" data-kt-drawer-overlay="true" data-kt-drawer-width="250px" data-kt-drawer-direction="end" data-kt-drawer-toggle="#kt_app_header_menu_toggle" data-kt-swapper="true" data-kt-swapper-mode="{default: 'append', lg: 'prepend'}" data-kt-swapper-parent="{default: '#kt_app_body', lg: '#kt_app_header_wrapper'}">
                            <div className="menu menu-rounded menu-column menu-lg-row my-5 my-lg-0 align-items-stretch fw-semibold px-2 px-lg-0" id="kt_app_header_menu" data-kt-menu="true">
                                <img alt="Logo" src={LogoImg} className="h-55px app-sidebar-logo-default" />
                                <img alt="Logo" src={LogoImg} className="h-20px app-sidebar-logo-minimize" />
                            </div>
                        </div>

                        <div className="app-navbar flex-shrink-0">
                            <div className="app-navbar-item ms-1 ms-md-4 ">

                            </div>
                            <div className="app-navbar-item ms-1 ms-md-4">
                                <div className="text-hover-primary btn btn-icon btn-custom btn-icon-muted btn-active-light btn-active-color-primary  btn-active-color-primary w-35px h-35px position-relative" id="kt_drawer_chat_toggle">
                                    <i className="ki-duotone ki-message-text-2 fs-1 text-info">
                                        <span className="path1"></span>
                                        <span className="path2"></span>
                                        <span className="path3"></span>
                                    </i>
                                    <span className="bullet bullet-dot bg-success h-6px w-6px position-absolute translate-middle top-0 start-50 animation-blink"></span>
                                </div>
                            </div>

                            <div className="app-navbar-item ms-1 ms-md-4">
                                <Popover placement="bottom" content={content} className='border p-2 rounded border-dark'>
                                    <div className="text-hover-primary text-dark btn btn-icon btn-custom btn-icon-muted btn-active-light btn-active-color-primary  btn-active-color-primary w-35px h-35px position-relative" id="kt_drawer_chat_toggle">
                                        {/* <i className="fa-regular fa-user text-white"></i> */}
                                        {sessionUserData?.Name?.charAt(0)}
                                    </div>
                                </Popover>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div id="kt_app_toolbar" className="app-toolbar" style={{ marginTop: "90px" }}>
                <div id="kt_app_toolbar_container" className="app-container container-xxl d-flex flex-stack">
                    <div className="page-title d-flex flex-column justify-content-center flex-wrap me-3">
                        <h1 className="page-heading d-flex text-gray-900 fw-bold fs-3 flex-column justify-content-center my-0">
                            Tickets List
                        </h1>

                        <ul className="breadcrumb breadcrumb-separatorless fw-semibold fs-7 my-0 pt-1">
                            <li className="breadcrumb-item text-muted">
                                <a className="text-muted text-hover-primary">Home</a>
                            </li>
                            <li className="breadcrumb-item">
                                <span className="bullet bg-gray-500 w-5px h-2px"></span>
                            </li>
                            <li className="breadcrumb-item text-muted">Tickets</li>
                        </ul>
                    </div>
                </div>
            </div>

            <div id="kt_app_content" className={`app-content flex-column-fluid pt-2`}>
                <div id="kt_app_content_container" className="app-container container-xxl">
                    <div className="card-toolbar mb-2">
                        <div className="filter-card">
                            <div className="row g-3 align-items-end">
                                <div className="col-12 col-md-3">
                                    <label className="filter-label">From Date<span className="text-danger">*</span></label>
                                    <div className="input-icon">
                                        <i className="bi bi-calendar-event"></i>
                                        <input
                                            type="date"
                                            className="form-control modern-input"
                                            value={selectedFromDt}
                                            onChange={(e) => setSelectedFromDt(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="col-12 col-md-3">
                                    <label className="filter-label">To Date<span className="text-danger">*</span></label>
                                    <div className="input-icon">
                                        <i className="bi bi-calendar-check"></i>
                                        <input
                                            type="date"
                                            className="form-control modern-input"
                                            value={selectedToDt}
                                            onChange={(e) => setSelectedToDt(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="col-12 col-md-4 mb-3">
                                    <label className="filter-label">Raised User</label>
                                    <Select
                                        placeholder="Select user by name or email"
                                        showSearch
                                        allowClear
                                        className="modern-select"
                                        optionFilterProp="label" // Search against the label property
                                        filterOption={(input, option) =>
                                            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                                        }
                                        value={selectedUserId || undefined}
                                        onChange={(value) => setSelectedUserId(value)}
                                        style={{ width: '100%' }}
                                        // Map the data to show: "Name (email)"
                                        options={usersData?.map(item => ({
                                            value: item.ItemId,
                                            label: `${item.ItemValue} (${item.DisplayValue})`
                                        }))}
                                    />
                                </div>
                                <div className="col-12 col-md-2">
                                    <button
                                        className="btn btn-primary modern-btn w-100"
                                        disabled={dataLoading}
                                        onClick={() => fetchTechtickets()}
                                    >
                                        <i className="bi bi-funnel me-2"></i>
                                        {dataLoading ? "Applying..." : "Apply"}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="card mt-1">
                            <div className="card-body pt-0">
                                <div className="card-toolbar mt-3">
                                    <div className="row align-items-end">

                                        {/* LEFT SIDE — SEARCH */}
                                        <div className="col-12 col-md-3">
                                            <div className="search-wrapper">
                                                <i className="bi bi-search search-icon"></i>

                                                <input
                                                    className="form-control modern-search-input"
                                                    type="text"
                                                    placeholder={`Search ticket${dots}`}
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                />

                                                {searchQuery && (
                                                    <i
                                                        className="bi bi-x-circle-fill clear-icon"
                                                        onClick={() => setSearchQuery("")}
                                                    ></i>
                                                )}
                                            </div>
                                        </div>

                                        {/* RIGHT SIDE — SHOW ENTRIES */}
                                        <div className="col-12 col-md-9 d-flex justify-content-md-end mt-2 mt-md-0">
                                            <div className="d-flex align-items-center gap-3">
                                                <span className="text-muted fw-bold">Show</span>

                                                <Select
                                                    style={{ width: 80 }}
                                                    size="small"
                                                    value={recordsPerPage}
                                                    onChange={(value) => {
                                                        setRecordsPerPage(value);
                                                        setCurrentPage(1);
                                                    }}
                                                    options={[
                                                        { value: 10, label: "10" },
                                                        { value: 50, label: "50" },
                                                        { value: 100, label: "100" }
                                                    ]}
                                                />

                                                <span className="text-muted fw-bold">entries</span>
                                            </div>
                                        </div>

                                    </div>
                                </div>
                                <div className="table-responsive d-md-block d-none ">
                                    <table className="table align-middle table-row-dashed fs-6 gy-5" id="kt_customers_table">
                                        <thead>
                                            <tr className="text-start text-gray-500 fw-bold fs-7 text-uppercase gs-0">
                                                <th className="text-center">S.No</th>
                                                <th className="min-w-125px text-center">Ticket Code</th>
                                                <th className="min-w-155px">Asset</th>
                                                <th className="min-w-125px text-center">Created On</th>
                                                <th className="min-w-145px text-center">Raised By</th>
                                                <th className="min-w-100px text-center">Priority</th>
                                                <th className="min-w-100px text-center">Status</th>
                                                <th className="min-w-100px text-center">Due Date</th>
                                                <th className="min-w-120px">Aging</th>
                                            </tr>
                                        </thead>
                                        <tbody className="fw-semibold text-gray-600">
                                            {dataLoading ? (
                                                <tr>
                                                    <td colSpan="12" className="text-center">
                                                        <div className="container"></div>
                                                    </td>
                                                </tr>
                                            ) : currentRecords && currentRecords.length > 0 ? (
                                                currentRecords.map((item, index) => (
                                                    <tr key={index}>
                                                        <td className="text-center">{indexOfFirstRecord + index + 1}</td>
                                                        <td className="text-center">
                                                            <Tooltip
                                                                title={
                                                                    <div className="p-1">
                                                                        <div className="mb-1"><i className="bi bi-eye me-2"></i>View Full Details</div>
                                                                        <div className="mb-1"><i className="bi bi-chat-dots me-2"></i>Post/Read Comments</div>
                                                                        <div><i className="bi bi-check-circle me-2"></i>Submit Resolution</div>
                                                                    </div>
                                                                }
                                                                placement="top"
                                                                mouseEnterDelay={0.5} // Slight delay so it doesn't pop up too fast while scrolling
                                                            >
                                                                <span
                                                                    className="text-primary fw-bold cursor-pointer hover-link"
                                                                    data-bs-toggle="offcanvas"
                                                                    data-bs-target="#offcanvasRightViewMore"
                                                                    onClick={() => handleViewClick(item)}
                                                                    style={{ borderBottom: '1px dashed #0d6efd' }} // Subtle visual cue it's clickable
                                                                >
                                                                    {item.TicketCode}
                                                                </span>
                                                            </Tooltip>
                                                        </td>
                                                        <td className="cursor-help text-dark fw-bold">
                                                            <Tooltip title={item?.AssetName?.length > 5 ? item?.AssetName : null}>
                                                                <span>
                                                                    {item?.AssetName?.length > 24
                                                                        ? `${item?.AssetName.slice(0, 24)}...`
                                                                        : item?.AssetName}
                                                                </span>
                                                            </Tooltip>
                                                        </td>
                                                        <td className="text-center">{formatToDDMMYYYY(item.CreatedOn)}</td>
                                                        <td className="text-dark text-center">{item.UserName}</td>
                                                        <td className="text-center">
                                                            {(() => {
                                                                const priorityConfig = {
                                                                    High: { class: "badge-light-danger", label: "High" },
                                                                    Medium: { class: "badge-light-warning", label: "Medium" },
                                                                    Low: { class: "badge-light-primary", label: "Low" },
                                                                };

                                                                const config = priorityConfig[item.Priority] || {
                                                                    class: "badge-light-secondary",
                                                                    label: "N/A"
                                                                };

                                                                return <span className={`badge ${config.class}`}>{config.label}</span>;
                                                            })()}
                                                        </td>
                                                        <td className="text-center align-middle">
                                                            {(() => {
                                                                const config = getStatusBadgeConfig(item.Status);
                                                                return (
                                                                    <div className={`status-badge-wrapper ${config.className}`}>
                                                                        <i className={`bi ${config.icon} status-icon`}></i>
                                                                        <span className="status-text">{config.label}</span>
                                                                        <span className="status-pulse"></span>
                                                                    </div>
                                                                );
                                                            })()}
                                                        </td>
                                                        <td className="text-danger text-center">{formatToDDMMYYYY(item.DueDate)}</td>
                                                        <td>{item.Aging || 'N/A'}</td>
                                                        {/* <td>
                                                            <Popover
                                                                placement="bottomLeft"
                                                                trigger="hover"
                                                                overlayClassName="custom-popover"
                                                                content={
                                                                    <div className="d-flex flex-column gap-2 p-1" style={{ width: '9rem' }}>
                                                                        <div
                                                                            className="action-badge bg-light-primary text-primary"
                                                                            data-bs-toggle="offcanvas"
                                                                            data-bs-target="#offcanvasRightViewMore"
                                                                            onClick={() => handleViewClick(item)}
                                                                        >
                                                                            <i className="bi bi-eye text-primary"></i>
                                                                            <span>View Detail</span>
                                                                        </div>
                                                                        <div
                                                                            className="action-badge bg-light-info text-info"
                                                                            data-bs-toggle="offcanvas"
                                                                            data-bs-target="#offcanvasRightComponents"
                                                                            onClick={() => handleCommentClick(item)}
                                                                        >
                                                                            <i className="bi bi-chat-dots text-info"></i>
                                                                            <span>Comments</span>
                                                                        </div>
                                                                        {(() => {
                                                                            const isActionable = ["ASSIGNED", "MODIFIED"].includes(item.Status?.toUpperCase());
                                                                            return (
                                                                                <div
                                                                                    onClick={() => isActionable && handleIsFixedClick(item)}
                                                                                    className={`action-badge ${isActionable ? 'bg-light-success text-success' : 'bg-light-secondary text-muted disabled-badge'}`}
                                                                                    title={!isActionable ? "Status must be Assigned/Modified" : ""}
                                                                                >
                                                                                    <i className={`bi bi-person-gear text-success ${isActionable ? 'animate-pulse' : ''}`}></i>
                                                                                    <span>Is Fixed</span>
                                                                                </div>
                                                                            );
                                                                        })()}
                                                                    </div>
                                                                }
                                                            >
                                                                <button className="btn btn-icon btn-light-primary btn-sm rounded-circle hover-rotate">
                                                                    <i className="fa-solid fa-ellipsis-vertical"></i>
                                                                </button>
                                                            </Popover>
                                                        </td> */}
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan="9" className="text-center">
                                                        <p>No Data Available</p>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Mobile responsive */}
                                <div className="d-md-none mt-4">
                                    {currentRecords && currentRecords.length > 0 ? (
                                        currentRecords.map((item, index) => (
                                            <div key={index} className="card border border-gray-200 shadow-sm mb-4 rounded-4">
                                                <div className="card-body p-5">
                                                    <div className="d-flex justify-content-between align-items-center mb-3">
                                                        <div className="d-flex align-items-center gap-2">
                                                            <span className="badge badge-light-dark text-gray-800 fw-bold">#{indexOfFirstRecord + index + 1}</span>
                                                            <span className="text-primary fw-bolder fs-6">{item.TicketCode}</span>
                                                        </div>
                                                        <Popover
                                                            placement="bottomRight"
                                                            trigger="click"
                                                            content={
                                                                <div className="d-flex flex-column gap-2 p-1" style={{ width: '9rem' }}>
                                                                    <div className="action-badge bg-light-primary text-primary" data-bs-toggle="offcanvas"
                                                                        data-bs-target="#offcanvasRightViewMore" onClick={() => handleViewClick(item)}>
                                                                        <i className="bi bi-eye"></i> <span>View Detail</span>
                                                                    </div>
                                                                    <div className="action-badge bg-light-info text-info" data-bs-toggle="offcanvas"
                                                                        data-bs-target="#offcanvasRightComponents" onClick={() => handleCommentClick(item)}>
                                                                        <i className="bi bi-chat-dots"></i> <span>Comments</span>
                                                                    </div>
                                                                    {["ASSIGNED"].includes(item.Status?.toUpperCase()) && (
                                                                        <div className="action-badge bg-light-success text-success" onClick={() => handleIsFixedClick(item)}>
                                                                            <i className="bi bi-person-gear"></i> <span>Is Fixed</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            }
                                                        >
                                                            <button className="btn btn-sm btn-icon btn-light-primary rounded-circle">
                                                                <i className="fa-solid fa-ellipsis-vertical"></i>
                                                            </button>
                                                        </Popover>
                                                    </div>
                                                    <div className="mb-4">
                                                        <h6 className="text-gray-800 fw-bold mb-1">{item.AssetName}</h6>
                                                        <p className="text-muted fs-7 mb-0">Raised by: <span className="text-dark fw-semibold">{item.UserName}</span></p>
                                                    </div>
                                                    <div className="row g-2 bg-light rounded-3 p-3 mb-3">
                                                        <div className="col-6">
                                                            <span className="text-gray-500 fs-8 text-uppercase d-block fw-bold">Status</span>
                                                            {/* <span className={`badge ${getStatusBadgeClass(item.Status)} mt-1`}>{item.Status}</span> */}
                                                            {(() => {
                                                                const config = getStatusBadgeConfig(item.Status);
                                                                return (
                                                                    <div className={`status-badge-wrapper ${config.className}`}>
                                                                        <i className={`bi ${config.icon} status-icon`}></i>
                                                                        <span className="status-text">{config.label}</span>
                                                                        <span className="status-pulse"></span>
                                                                    </div>
                                                                );
                                                            })()}
                                                        </div>
                                                        <div className="col-6 text-end">
                                                            <span className="text-gray-500 fs-8 text-uppercase d-block fw-bold">Priority</span>
                                                            <span className={`badge ${item.Priority === 'High' ? 'badge-light-danger' : 'badge-light-primary'} mt-1`}>
                                                                {item.Priority}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="d-flex justify-content-between align-items-center">
                                                        <div className="d-flex flex-column">
                                                            <span className="text-gray-400 fs-8 fw-bold">DUE DATE</span>
                                                            <span className="text-danger fs-7 fw-bold">{formatToDDMMYYYY(item.DueDate)}</span>
                                                        </div>
                                                        <div className="text-end">
                                                            <span className="text-gray-400 fs-8 d-block fw-bold">AGING</span>
                                                            <span className="badge badge-secondary fs-8">{item.Aging} Days</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center p-10 bg-light rounded-4 border-dashed">
                                            <p className="text-gray-500 fw-bold mb-0">No records found matching your search</p>
                                        </div>
                                    )}
                                </div>

                                <div className="d-flex justify-content-between align-items-center flex-wrap pt-10">
                                    <div className="d-flex align-items-center gap-4 flex-wrap">
                                        <div className="fs-6 fw-bold text-gray-700">
                                            Showing {filteredTickets.length > 0 ? indexOfFirstRecord + 1 : 0} to {Math.min(indexOfLastRecord, filteredTickets.length)} of {filteredTickets.length} entries
                                            {searchQuery && ` (filtered from ${techTicketsData?.length} total entries)`}
                                        </div>
                                    </div>

                                    <ul className="pagination">
                                        <li className={`page-item previous ${currentPage === 1 ? 'disabled' : ''}`}>
                                            <button className="page-link cursor-pointer" onClick={() => handlePageChange(currentPage - 1)}>
                                                <i className="ki-outline ki-left fs-2"></i>
                                            </button>
                                        </li>
                                        {getPageNumbers().map((pageNum, i) => (
                                            <li
                                                key={i}
                                                className={`page-item ${currentPage === pageNum ? 'active' : ''} ${pageNum === '...' ? 'disabled' : ''}`}
                                            >
                                                {pageNum === '...' ? (
                                                    <span className="page-link">...</span>
                                                ) : (
                                                    <button className="page-link cursor-pointer" onClick={() => handlePageChange(pageNum)}>
                                                        {pageNum}
                                                    </button>
                                                )}
                                            </li>
                                        ))}
                                        <li className={`page-item next ${currentPage === totalPages ? 'disabled' : ''}`}>
                                            <button className="page-link cursor-pointer" onClick={() => handlePageChange(currentPage + 1)}>
                                                <i className="ki-outline ki-right fs-2"></i>
                                            </button>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                <style>
                    {`
                    .hover-link {
    transition: all 0.2s ease;
}

.hover-link:hover {
    color: #004dc7 !important; /* Slightly darker blue */
    text-decoration: none;
    background-color: #f0f7ff;
    padding: 2px 4px;
    border-radius: 4px;
}
                    /* Badge Wrapper */
                    .status-badge-wrapper {
                        display: inline-flex;
                        align-items: center;
                        gap: 6px;
                        padding: 4px 12px;
                        border-radius: 50px;
                        font-size: 11px;
                        font-weight: 700;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                        position: relative;
                        overflow: hidden;
                        transition: all 0.3s ease;
                        border: 1px solid transparent;
                    }

                    /* Assigned Style (Blue) */
                    .status-assigned {
                        background-color: #eef5ff;
                        color: #007bff;
                        border-color: #cfe2ff;
                    }

                    /* Tech Fixed Style (Green) */
                    .status-fixed {
                        background-color: #e8fff3;
                        color: #198754;
                        border-color: #c3e6cb;
                    }

                    /* Default Style (Gray) */
                    .status-default {
                        background-color: #f8f9fa;
                        color: #6c757d;
                        border-color: #dee2e6;
                    }

                    /* Icon Animation */
                    .status-icon {
                        font-size: 14px;
                    }

                    /* The Animated Pulse Dot */
                    .status-pulse {
                        width: 6px;
                        height: 6px;
                        border-radius: 50%;
                        margin-left: 4px;
                        display: inline-block;
                    }

                    .status-assigned .status-pulse { background-color: #007bff; animation: pulse-blue 2s infinite; }
                    .status-fixed .status-pulse { background-color: #198754; animation: pulse-green 2s infinite; }

                    /* Animations */
                    @keyframes pulse-blue {
                        0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(0, 123, 255, 0.7); }
                        70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(0, 123, 255, 0); }
                        100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(0, 123, 255, 0); }
                    }

                    @keyframes pulse-green {
                        0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(25, 135, 84, 0.7); }
                        70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(25, 135, 84, 0); }
                        100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(25, 135, 84, 0); }
                    }

                    /* Subtle Hover Effect */
                    .status-badge-wrapper:hover {
                        transform: translateY(-1px);
                        box-shadow: 0 4px 8px rgba(0,0,0,0.05);
                    }
                    /* Unique Action Badges inside Popover */
                    .action-badge {
                        display: flex;
                        align-items: center;
                        gap: 12px;
                        padding: 10px 14px;
                        border-radius: 10px;
                        font-size: 0.85rem;
                        font-weight: 600;
                        cursor: pointer;
                        transition: background 0.2s ease;
                    }

                    /* Background Soft Colors */
                    .bg-light-primary { background-color: #f1f8ff; color: #0095ff; }
                    .bg-light-info { background-color: #f0fdf4; color: #17a2b8; }
                    .bg-light-success { background-color: #f6ffed; color: #52c41a; }
                    .bg-light-secondary { background-color: #f8f9fa; color: #6c757d; }

                    /* Desktop-specific hide: Make sure your table has this class */
                    @media (max-width: 767px) {
                        .table-responsive.d-none.d-md-block {
                            display: none !important;
                        }
                    }
                    .search-wrapper {
                        position: relative;
                        display: flex;
                        align-items: center;
                    }

                    .modern-search-input {
                        height: 2.8rem;
                        padding-left: 2.5rem !important; /* Space for search icon */
                        padding-right: 2.5rem !important; /* Space for clear icon */
                        border-radius: 12px !important;
                        border: 1px solid #e1e3ea;
                        background-color: #f9fafb;
                        transition: all 0.3s ease;
                        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
                    }

                    .modern-search-input:focus {
                        background-color: #fff;
                        border-color: #0095ff !important;
                        box-shadow: 0 0 0 4px rgba(0, 149, 255, 0.1), 0 4px 12px rgba(0, 0, 0, 0.05);
                        transform: translateY(-1px);
                    }

                    /* Icons styling */
                    .search-icon {
                        position: absolute;
                        left: 1rem;
                        color: #a1a5b7;
                        font-size: 1.1rem;
                        pointer-events: none;
                    }

                    .clear-icon {
                        position: absolute;
                        right: 1rem;
                        color: #a1a5b7;
                        cursor: pointer;
                        transition: color 0.2s;
                    }

                    .clear-icon:hover {
                        color: #f1416c;
                    }

                    /* Pulse animation for the placeholder area */
                    @keyframes placeholderPulse {
                        0% { opacity: 1; }
                        50% { opacity: 0.6; }
                        100% { opacity: 1; }
                    }

                    .modern-search-input::placeholder {
                        color: #a1a5b7;
                        animation: placeholderPulse 2s infinite ease-in-out;
                    }
                    .filter-card {
                        background: #fff;
                        border-radius: 14px;
                        padding: 16px 18px;
                        box-shadow: 0 8px 30px rgba(0,0,0,0.06);
                    }

                    .filter-label {
                        font-size: 1.2rem;
                        font-weight: 600;
                        color: #6c757d;
                        margin-bottom: 6px;
                    }

                    .modern-input {
                        height: 42px;
                        padding-left: 36px;
                        border-radius: 10px;
                        border: 1px solid #e3e6ea;
                    }

                    .input-icon {
                        position: relative;
                    }

                    .input-icon i {
                        position: absolute;
                        left: 12px;
                        top: 50%;
                        transform: translateY(-50%);
                        color: #adb5bd;
                    }

                    .modern-select .ant-select-selector {
                        min-height: 42px !important;
                        border-radius: 10px !important;
                    }

                    .modern-select .ant-select-item-option-content {
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        font-size: 13px; /* Slightly smaller font for better fit */
                    }

                    .modern-btn {
                        height: 42px;
                        border-radius: 12px;
                        font-weight: 600;
                    }
                    /* Container for each menu item */
                    .action-badge {
                        display: flex;
                        align-items: center;
                        gap: 10px;
                        padding: 8px 12px;
                        border-radius: 8px;
                        font-size: 0.85rem;
                        font-weight: 500;
                        cursor: pointer;
                        transition: all 0.2s ease-in-out;
                        border: 1px solid transparent;
                    }

                    /* Hover Effects: Lift and Brighten */
                    .action-badge:hover {
                        transform: translateX(5px); /* Subtle slide to the right */
                        filter: brightness(0.95);
                        border-color: rgba(0,0,0,0.05);
                        box-shadow: 0 4px 6px rgba(0,0,0,0.05);
                    }

                    /* Specific Badge Colors */
                    .bg-light-primary { background-color: #e1f0ff !important; }
                    .bg-light-info { background-color: #e0f7fa !important; }
                    .bg-light-success { background-color: #cff4fc !important; } /* Soft Mint */
                    .bg-light-secondary { background-color: #f5f5f5 !important; }

                    /* Disabled State */
                    .disabled-badge {
                        cursor: not-allowed !important;
                        filter: grayscale(1);
                        opacity: 0.6;
                    }

                    /* Animation for the 'Fixed' icon to draw attention if enabled */
                    .animate-pulse {
                        animation: pulse-green 2s infinite;
                    }

                    @keyframes pulse-green {
                        0% { transform: scale(1); }
                        50% { transform: scale(1.1); }
                        100% { transform: scale(1); }
                    }

                    /* Rotate the 3-dot button on hover */
                    .hover-rotate:hover i {
                        transform: rotate(90deg);
                        transition: transform 0.3s ease;
                    }

                `}
                </style>
            </div>


            {/* View profile offcanvas */}
            <div
                className="offcanvas offcanvas-end custom-offcanvas"
                tabIndex="-1"
                id="offcanvasRightViewProfile"
                aria-labelledby="offcanvasLeftLabel"
            >
                <div className="offcanvas-header border-bottom px-4 py-3">
                    <h5 id="offcanvasProfileLabel" className="mb-0">
                        <i className="fa-regular fa-user me-2"></i> My Profile
                    </h5>
                    <button
                        type="button"
                        className="btn-close"
                        data-bs-dismiss="offcanvas"
                        aria-label="Close"
                    ></button>
                </div>

                <div className="offcanvas-body">
                    <div className="card border-0 shadow-sm">
                        <div className="card-body">
                            <div className="d-flex align-items-center mb-3">
                                <div
                                    className="avatar bg-light-primary text-dark rounded-circle d-flex align-items-center justify-content-center me-3"
                                    style={{ width: "50px", height: "50px", fontSize: "20px" }}
                                >
                                    {sessionUserData?.Name?.charAt(0).toUpperCase() || "?"}
                                </div>

                                <div>
                                    <h6 className="mb-0">{sessionUserData?.Name}</h6>
                                </div>

                            </div>

                            <ul className="list-group list-group-flush">
                                <li className="list-group-item d-flex justify-content-between">
                                    <span><i className="fa-solid fa-id-badge icon-animate text-primary me-2"></i> Org ID</span>
                                    <span className="fw-bold">{sessionUserData?.OrgId}</span>
                                </li>

                                <li className="list-group-item d-flex justify-content-between">
                                    <span><i className="fa-solid fa-envelope icon-animate text-primary me-2"></i> Email</span>
                                    <span className="fw-bold">{sessionUserData?.Email}</span>
                                </li>

                                <li className="list-group-item d-flex justify-content-between">
                                    <span><i className="fa-solid fa-phone icon-animate text-primary me-2"></i> Mobile</span>
                                    <span className="fw-bold">{sessionUserData?.PhoneNumber || '--'}</span>
                                </li>

                                {/* <li className="list-group-item d-flex justify-content-between">
                                    <span><i className="fa-solid fa-calendar icon-animate text-primary me-2"></i> Created On</span>
                                    <span className="fw-bold">
                                        {new Date(sessionUserData?.CreatedOn).toLocaleString("en-GB", {
                                            day: "2-digit",
                                            month: "2-digit",
                                            year: "numeric",
                                            hour: "2-digit",
                                            minute: "2-digit",
                                        })}
                                    </span>
                                </li> */}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            <TicketViewDetails ticObj={viewData} />
            <TicketViewComments ticObj={commentData} />
        </>
    )
}