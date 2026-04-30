
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import '../../Config/Pagination.css';
import '../../Config/Loader.css';
import Base1 from '../../Config/Base1';
import { fetchWithAuth } from "../../../utils/api";
import RegisterTicket from './../Tickets/Add';
import { Tooltip, Select } from 'antd';


export default function MyAssetsList() {

    const navigate = useNavigate();
    const [sessionUserData, setSessionUserData] = useState([]);
    const [assetsData, setAssetsData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [navigationPath, setNavigationPath] = useState("");
    const [sessionActionIds, setSessionActionIds] = useState([]);
    const [targetAsset, setTargetAsset] = useState({ id: 0, name: "", deptId: 0 });
    const [isEditTicketModalOpen, setIsEditTicketModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [recordsPerPage, setRecordsPerPage] = useState(10);

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
                (item) => item.MenuName === "Assets"
            );

            if (ticketsMenu) {
                const actionIdArray = ticketsMenu.ActionsIds?.split(",").map(Number);
                setSessionActionIds(actionIdArray);
            }
        } catch (err) {
            console.error("Error parsing menuData:", err);
        }
    }, []);

    const fetchMyAssets = async () => {
        setLoading(true);
        try {
            const response = await fetchWithAuth(
                `PMMS/GetAssetsByUserId?OrgId=${sessionUserData?.OrgId}&UserId=${sessionUserData?.Id}`,
                {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                }
            );

            if (!response.ok) throw new Error("Network response was not ok");

            const data = await response.json();
            setLoading(false);
            setAssetsData(data.ResultData);

        } catch (error) {
            console.error("Failed to fetch DDL data:", error);
            setLoading(false);
            setAssetsData([]);
        }
    };

    useEffect(() => {
        if (sessionUserData.OrgId && sessionUserData.Id) {
            fetchMyAssets();
        }
    }, [sessionUserData]);

    const filteredAssets = assetsData?.filter((item) => {
        const query = searchQuery.toLowerCase();
        return (
            item.AssetName?.toLowerCase().includes(query) ||
            item.Code?.toLowerCase().includes(query) ||
            item.AssetType?.toLowerCase().includes(query) ||
            item.DeptName?.toLowerCase().includes(query) ||
            item.Status?.toLowerCase().includes(query)
        );
    }) || [];

    // Update your pagination variables to use filteredAssets
    const indexOfLastRecord = currentPage * recordsPerPage;
    const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
    const currentRecords = filteredAssets.slice(indexOfFirstRecord, indexOfLastRecord);
    const totalPages = Math.ceil(filteredAssets.length / recordsPerPage);

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

    const getStatusBadgeClass = (status) => {
        switch (status?.toLowerCase()) {
            case "draft":
                return "badge-light-warning";
            case "pending approval":
                return "badge-light-info";
            case "approved":
                return "badge-light-primary";
            case "rejected":
                return "badge-light-danger";
            case "outofservice":
                return "badge-light-danger";
            case "active":
                return "badge-light-success";
            default:
                return "badge-light";
        }
    };

    const showAddBtn = sessionActionIds?.includes(1);

    return (
        <Base1>
            <div id="kt_app_toolbar" className="app-toolbar py-3 py-lg-6">
                <div id="kt_app_toolbar_container" className="app-container container-xxl d-flex flex-stack">
                    <div className="page-title d-flex flex-column justify-content-center flex-wrap me-3">
                        <h1 className="page-heading d-flex text-gray-900 fw-bold fs-3 flex-column justify-content-center my-0">My Assets List</h1>
                        <ul className="breadcrumb breadcrumb-separatorless fw-semibold fs-7 my-0 pt-1">
                            <li className="breadcrumb-item text-muted">
                                <a href={navigationPath} className="text-muted text-hover-primary">Home</a>
                            </li>
                            <li className="breadcrumb-item">
                                <span className="bullet bg-gray-500 w-5px h-2px"></span>
                            </li>
                            <li className="breadcrumb-item text-muted">My assets</li>
                        </ul>
                    </div>
                    <div className="d-flex align-items-center gap-2 gap-lg-3">
                        <a
                            className="btn btn-light-secondary border border-dark shadow btn-sm d-none d-md-block"
                            href="eam-dashboard"
                            type="button"
                        ><i className="bi bi-arrow-left"></i>Back to Dashboard
                        </a>
                    </div>
                </div>
            </div>
            <div id="kt_app_content" className="app-content flex-column-fluid pt-2">
                <div id="kt_app_content_container" className="app-container container-xxl">
                    <div className="card mb-3 shadow-sm">
                        <div className="p-2">
                            <div className="d-flex justify-content-between align-items-center flex-wrap pb-3">
                                <div className="d-flex align-items-center position-relative my-1 border rounded">
                                    <i className="fa-solid fa-magnifying-glass position-absolute ms-4 text-gray-500"></i>
                                    <input
                                        type="text"
                                        className="form-control shadow-sm ps-12"
                                        placeholder="Search asset..."
                                        style={{ height: '2.8rem', width: '250px' }}
                                        value={searchQuery}
                                        onChange={(e) => {
                                            setSearchQuery(e.target.value);
                                            setCurrentPage(1);
                                        }}
                                    />
                                </div>

                                <div className="d-flex align-items-center gap-3">
                                    <span className="text-muted fw-bold">Show</span>
                                    <Select
                                        style={{ width: 80 }}
                                        size="small"
                                        value={recordsPerPage}
                                        onChange={(value) => {
                                            setRecordsPerPage(value);
                                            setCurrentPage(1); // Reset to page 1 when changing limit
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
                    <div className="card d-md-block d-none mt-1">
                        <div className="card-body pt-0">
                            <div className="table-responsive">
                                <table className="table align-middle table-row-dashed fs-6 gy-5" id="kt_customers_table">
                                    <thead>
                                        <tr className="text-start text-gray-500 fw-bold fs-7 text-uppercase gs-0">
                                            <th className="">S.No</th>
                                            <th className="min-w-125px">Name</th>
                                            <th className="min-w-125px">Code</th>
                                            <th className="min-w-125px">Department</th>
                                            <th className="min-w-125px">Asset Type</th>
                                            <th className="min-w-125px text-center">Installed On</th>
                                            <th className="min-w-100px text-center" title="Next maintenance date">Next Maint</th>
                                            <th className="min-w-100px">Status</th>
                                            <th className="text-center">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="fw-semibold text-gray-600">
                                        {loading ? (
                                            <tr>
                                                <td colSpan="12" className="text-center">
                                                    <div className="container"></div>
                                                </td>
                                            </tr>
                                        ) : currentRecords && currentRecords.length > 0 ? (
                                            currentRecords.map((item, index) => (
                                                <tr key={index}>
                                                    <td>{indexOfFirstRecord + index + 1}</td>
                                                    <td>
                                                        {item.AssetName && item.AssetName.length > 20 ? (
                                                            <Tooltip
                                                                title={item.AssetName}
                                                                placement="topLeft"
                                                                color="blue"
                                                            >
                                                                <Link
                                                                    to={`/eam/asset-info/${item.OrgId}/${item.MachineId}`}
                                                                    className="fw-bold text-primary"
                                                                    style={{
                                                                        display: "inline-block",
                                                                        maxWidth: "180px",
                                                                        whiteSpace: "nowrap",
                                                                        overflow: "hidden",
                                                                        textOverflow: "ellipsis",
                                                                        verticalAlign: "middle",
                                                                    }}
                                                                >
                                                                    {item.AssetName}
                                                                </Link>
                                                            </Tooltip>
                                                        ) : (
                                                            <Link
                                                                to={`/eam/asset-view/${item.OrgId}/${item.MachineId}`}
                                                                className="fw-bold text-primary"
                                                            >
                                                                {item.AssetName || "N/A"}
                                                            </Link>
                                                        )}
                                                    </td>
                                                    <td>
                                                        <a className="text-gray-600 text-hover-primary mb-1">{item.Code}</a>
                                                    </td>
                                                    <td>{item.DeptName || 'N/A'}</td>
                                                    <td>{item.AssetType || 'N/A'}</td>
                                                    <td className="text-primary text-center">
                                                        {item.InstallationDate && new Date(item.InstallationDate).toLocaleDateString('en-GB') || '-'}
                                                    </td>
                                                    <td className="text-danger text-center">
                                                        {item.UpcomingMaintenanceDate && new Date(item.UpcomingMaintenanceDate).toLocaleDateString('en-GB') || '-'}
                                                    </td>
                                                    <td>
                                                        <span className={`badge ${getStatusBadgeClass(item.Status)}`}>
                                                            {item.Status}
                                                        </span>
                                                    </td>
                                                    <td className="text-end"> {/* Use text-end to align actions nicely */}
                                                        <div className="d-flex align-items-center justify-content-end gap-2">
                                                            <span
                                                                className="badge badge-light-primary cursor-pointer"
                                                                data-bs-toggle="offcanvas"
                                                                data-bs-target="#offcanvasRightAdd"
                                                                onClick={() => setTargetAsset({ id: item.MachineId, name: item.AssetName, deptId: item.DeptId })}
                                                            >
                                                                Raise Ticket <i className="bi bi-ticket-perforated ms-1 text-primary"></i>
                                                            </span>


                                                            <Link to={`/eam/asset-info/${item.OrgId}/${item.MachineId}`} className="text-decoration-none">
                                                                <span className="badge badge-light-info cursor-pointer">
                                                                    View more <i className="fa-solid fa-arrow-right-long ms-1 pulse-arrow"></i>
                                                                </span>
                                                            </Link>
                                                        </div>
                                                    </td>
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
                                <div className="d-flex justify-content-between align-items-center flex-wrap pt-10">
                                    {/* Left Side: Showing Info & Records Per Page Dropdown */}
                                    <div className="d-flex align-items-center gap-4 flex-wrap">
                                        <div className="fs-6 fw-bold text-gray-700">
                                            Showing {filteredAssets.length > 0 ? indexOfFirstRecord + 1 : 0} to {Math.min(indexOfLastRecord, filteredAssets.length)} of {filteredAssets.length} entries
                                            {searchQuery && ` (filtered from ${assetsData?.length} total entries)`}
                                        </div>
                                    </div>

                                    {/* Right Side: Smart Pagination Numbers */}
                                    <ul className="pagination">
                                        {/* Previous Button */}
                                        <li className={`page-item previous ${currentPage === 1 ? 'disabled' : ''}`}>
                                            <button className="page-link cursor-pointer" onClick={() => handlePageChange(currentPage - 1)}>
                                                <i className="ki-outline ki-left fs-2"></i>
                                            </button>
                                        </li>

                                        {/* Dynamic Page Numbers */}
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

                                        {/* Next Button */}
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

                    <div className="d-block d-md-none">
                        {assetsData && assetsData.length > 0 ? (
                            assetsData.map((item, index) => (
                                <div key={index} className="card mb-2 shadow-sm rounded">
                                    <div className="card-body">
                                        <div className="d-flex justify-content-between align-items-center">
                                            <div className={`badge ${getStatusBadgeClass(item.Status)}`}>
                                                {item.Status || 'N/A'} {index}
                                            </div>

                                            <div className="d-flex align-items-center gap-2">
                                                <Link to={`/eam/asset-view/${item.OrgId}/${item.MachineId}`}>
                                                    <span
                                                        className="badge badge-light-info cursor-pointer"
                                                    >View more <i class="fa-solid fa-arrow-right-long mt-1 ms-1 pulse-arrow"></i></span>
                                                </Link>

                                                <span className="arrow-container text-muted" style={{ fontSize: '1.1rem' }}>
                                                </span>
                                            </div>
                                        </div>

                                        <div className="mb-2">
                                            <div className="d-flex justify-content-between">
                                                <span className="text-muted">Name:</span>
                                                <span className="fw-semibold">{item?.AssetName?.length > 25 ? item?.AssetName.slice(0, 25) + '...' : item.AssetName}</span>
                                            </div>
                                            <div className="d-flex justify-content-between">
                                                <span className="text-muted">Code:</span>
                                                <span className="fw-semibold">{item.Code || 'N/A'}</span>
                                            </div>
                                            <div className="d-flex justify-content-between">
                                                <span className="text-muted">Department:</span>
                                                <span className="fw-semibold">{item.DeptName || 'N/A'}</span>
                                            </div>
                                            <div className="d-flex justify-content-between">
                                                <span className="text-muted">Asset Type:</span>
                                                <span className="fw-semibold">{item.AssetType || 'N/A'}</span>
                                            </div>
                                            <div className="d-flex justify-content-between">
                                                <span className="text-muted">Instalation:</span>
                                                <span className="fw-semibold text-success">{new Date(item.InstallationDate).toLocaleDateString('en-GB')}</span>
                                            </div>
                                            <div className="d-flex justify-content-between">
                                                <span className="text-muted">Next Maintenance:</span>
                                                <span className="fw-semibold text-info">{new Date(item.UpcomingMaintenanceDate).toLocaleDateString('en-GB')}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))

                        ) : (
                            <p className="text-center mt-5">No Data Available</p>
                        )}
                        <div className="d-flex justify-content-between align-items-center flex-wrap pt-10">
                            <div className="fs-6 fw-bold text-gray-700">
                                Showing {filteredAssets.length > 0 ? indexOfFirstRecord + 1 : 0} to {Math.min(indexOfLastRecord, filteredAssets.length)} of {filteredAssets.length} entries
                                {searchQuery && ` (filtered from ${assetsData?.length} total entries)`}
                            </div>

                            <ul className="pagination">
                                {/* Previous Button */}
                                <li className={`page-item previous ${currentPage === 1 ? 'disabled' : ''}`}>
                                    <button className="page-link cursor-pointer" onClick={() => handlePageChange(currentPage - 1)}>
                                        <i className="previous"></i>
                                    </button>
                                </li>

                                {/* Page Numbers */}
                                {[...Array(totalPages)].map((_, i) => (
                                    <li key={i} className={`page-item ${currentPage === i + 1 ? 'active' : ''}`}>
                                        <button className="page-link cursor-pointer" onClick={() => handlePageChange(i + 1)}>
                                            {i + 1}
                                        </button>
                                    </li>
                                ))}

                                {/* Next Button */}
                                <li className={`page-item next ${currentPage === totalPages ? 'disabled' : ''}`}>
                                    <button className="page-link cursor-pointer" onClick={() => handlePageChange(currentPage + 1)}>
                                        <i className="next"></i>
                                    </button>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            <style>
                {`
                /* Force table cells to stay single-line and vertically centered */
#kt_customers_table td {
    white-space: nowrap;
    vertical-align: middle !important;
    padding-top: 0.5rem !important;
    padding-bottom: 0.5rem !important;
}


/* Ensure badges don't add extra height */
#kt_customers_table .badge {
    display: inline-flex;
    align-items: center;
    height: 24px;
}
                .pulse-arrow {
                        animation: pulseMove 1s infinite ease-in-out;
                    }

                    @keyframes pulseMove {
                        0%   { transform: translateX(0); opacity: 1; }
                        50%  { transform: translateX(5px); opacity: 0.7; }
                        100% { transform: translateX(0); opacity: 1; }
                    }


                                    customClass: {
                            popup: 'qr-popup-no-scroll'
                        },
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

            <RegisterTicket
                assetID={targetAsset.id}
                assetName={targetAsset.name}
                deptId={targetAsset.deptId}
                isOpen={isEditTicketModalOpen}
            />
        </Base1>
    )
}