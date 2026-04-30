
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Tooltip, Select } from 'antd';
import '../../Config/Pagination.css';
import '../../Config/Loader.css';
import Base1 from '../../Config/Base1';
import { fetchWithAuth } from "../../../utils/api";
import InactiveAssetView from "./InactiveAssetView";

export default function InactiveAssetsList() {

    const navigate = useNavigate();
    const [sessionUserData, setSessionUserData] = useState([]);
    const [inactiveAssetsData, setInactiveAssetsData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [navigationPath, setNavigationPath] = useState("");
    const [recordsPerPage, setRecordsPerPage] = useState(10);
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [inactiveAssetObj, setInactiveAssetObj] = useState({});

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

    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await fetchWithAuth(`PMMS/getInActiveAssets?OrgId=${sessionUserData?.OrgId}`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });
            if (response.ok) {
                const data = await response.json();
                setInactiveAssetsData(data.ResultData);
            } else {
                console.error('Failed to fetch technicians data:', response.statusText);
            }
        } catch (error) {
            console.error('Error fetching technicians data:', error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (sessionUserData?.OrgId) {
            fetchData();
        }
    }, [sessionUserData]);

    const handleViewInactiveAsset = (asset) => {
        setInactiveAssetObj(asset);
    }

    const filteredInactiveAssets = Array.isArray(inactiveAssetsData)
    ? inactiveAssetsData.filter((item) => {
        const query = searchQuery.toLowerCase().trim();
        if (!query) return true; // Show all if search is empty

        return (
            // Use || "" to handle null/undefined values safely
            (item.AssetName || "").toLowerCase().includes(query) ||
            (item.AssetCode || "").toLowerCase().includes(query) ||
            (item.Code || "").toLowerCase().includes(query) ||
            (item.AssetType || "").toLowerCase().includes(query) ||
            (item.DeptName || "").toLowerCase().includes(query)
        );
    })
    : [];

  // Example of how your pagination should look:
const indexOfLastRecord = currentPage * recordsPerPage;
const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;

// IMPORTANT: Slice the FILTERED list, not the original list
const currentRecords = filteredInactiveAssets.slice(indexOfFirstRecord, indexOfLastRecord);
    const totalPages = Math.ceil(filteredInactiveAssets.length / recordsPerPage);

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
                for (let i = 1; i <= 5; i++) pageNumbers.push(i);
                pageNumbers.push('...');
                pageNumbers.push(totalPages);
            } else if (currentPage > totalPages - 4) {
                pageNumbers.push(1);
                pageNumbers.push('...');
                for (let i = totalPages - 4; i <= totalPages; i++) pageNumbers.push(i);
            } else {
                pageNumbers.push(1);
                pageNumbers.push('...');
                for (let i = currentPage - 1; i <= currentPage + 1; i++) pageNumbers.push(i);
                pageNumbers.push('...');
                pageNumbers.push(totalPages);
            }
        }
        return pageNumbers;
    };

    return (
        <Base1>
            <div id="kt_app_toolbar" className="app-toolbar py-3 py-lg-6">
                <div id="kt_app_toolbar_container" className="app-container container-xxl d-flex flex-stack">
                    <div className="page-title d-flex flex-column justify-content-center flex-wrap me-3">
                        <h1 className="page-heading d-flex text-gray-900 fw-bold fs-3 flex-column justify-content-center my-0">Inactive Assets List</h1>
                        <ul className="breadcrumb breadcrumb-separatorless fw-semibold fs-7 my-0 pt-1">
                            <li className="breadcrumb-item text-muted">
                                <a href={navigationPath} className="text-muted text-hover-primary">Home</a>
                            </li>
                            <li className="breadcrumb-item">
                                <span className="bullet bg-gray-500 w-5px h-2px"></span>
                            </li>
                            <li className="breadcrumb-item text-muted">
                                <Link to='/eam/assets' className="text-muted text-hover-primary">Assets</Link>
                            </li>
                            <li className="breadcrumb-item">
                                <span className="bullet bg-gray-500 w-5px h-2px"></span>
                            </li>
                            <li className="breadcrumb-item text-muted">Inactive Assets</li>
                        </ul>
                    </div>
                    <div className="d-flex align-items-center gap-2 gap-lg-3">
                        {/* {showQRDwn && (
                            <button
                                type="button"
                                className="btn btn-warning btn-sm d-flex align-items-center gap-2 px-3 shadow-sm custom-btn"
                            >
                                <i className="bi bi-qr-code-scan"></i> <span className="d-none d-md-inline">Generate QR Sheet</span>
                            </button>
                        )} */}
                    </div>
                </div>
            </div>

            <div id="kt_app_content" className="app-content flex-column-fluid pt-2">
                <div id="kt_app_content_container" className="app-container container-xxl">
                    <div className="card d-md-block d-none mt-1 mb-10 shadow-sm">
                        <div className="card-toolbar mt-3">
                            <div className="row align-items-end p-2">
                                <div className="col-12 col-md-3">
                                    <div className="position-relative w-100">
                                        <i className="fa-solid fa-magnifying-glass position-absolute top-50 translate-middle-y ms-4 text-gray-500 fs-7"></i>
                                        <input
                                            type="text"
                                            className="form-control form-control-solid ps-12 fs-7"
                                            placeholder="Search assets..."
                                            value={searchQuery}
                                            onChange={(e) => {
                                                setSearchQuery(e.target.value);
                                                setCurrentPage(1); // ← ADD THIS
                                              }}
                                            style={{ height: '2.8rem' }}
                                        />
                                        {searchQuery && (
                                            <i
                                                className="fa-solid fa-circle-xmark position-absolute top-50 end-0 translate-middle-y me-4 text-gray-400 cursor-pointer text-hover-primary fs-7"
                                                onClick={() => {
                                                    setSearchQuery("");
                                                    setCurrentPage(1);
                                                  }}
                                            ></i>
                                        )}
                                    </div>
                                </div>
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
                        <div className="table-responsive " style={{ overflowX: "hidden" }}>
                            <table className="table align-middle table-row-dashed fs-6 gy-5 gs-7 mb-0">
                                <thead className="bg-light-primary">
                                    <tr className="text-start text-muted fw-bold fs-7 text-uppercase gs-0">
                                        <th className="text-center w-50px">S.No</th>
                                        <th className="min-w-100px">Code</th>
                                        <th className="min-w-200px">Asset Name</th>
                                        <th className="min-w-125px">Department</th>
                                        <th className="min-w-125px">Asset Type</th>
                                        <th className="min-w-100px text-center">Status</th>
                                        <th className="text-center min-w-100px">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="fw-semibold text-gray-700">
                                    {loading ? (
                                        <tr>
                                            <td colSpan="7" className="text-center py-10">
                                                <div className="spinner-border spinner-border-sm text-primary me-3"></div>
                                                <span className="text-muted">Loading Assets...</span>
                                            </td>
                                        </tr>
                                    ) : currentRecords?.length > 0 ? (
                                        currentRecords.map((item, index) => (
                                            <tr key={index} className="hover-elevate-up transition-3ms">
                                                <td className="text-center text-gray-400">
                                                    {indexOfFirstRecord + index + 1}
                                                </td>
                                                <td>
                                                    <span className="badge badge-light-dark fw-bold">{item.Code || "-"}</span>
                                                </td>
                                                <td>
                                                    <Tooltip title={item.AssetName?.length > 10 ? item.AssetName : null} color="blue">
                                                        <span
                                                            className="text-gray-800 text-hover-primary fw-bolder text-truncate-custom cursor-help"
                                                        >
                                                            {item.AssetName || "N/A"}
                                                        </span>
                                                    </Tooltip>
                                                </td>
                                                <td>
                                                    <span className="text-gray-600">{item.DeptName || "N/A"}</span>
                                                </td>
                                                <td>
                                                    <Tooltip title={item.AssetType?.length > 5 ? item.AssetType : null}>
                                                        <span className="text-muted cursor-help" style={{ maxWidth: "110px" }}>
                                                            {item.AssetType || "N/A"}
                                                        </span>
                                                    </Tooltip>
                                                </td>
                                                <td className="text-center">
                                                    <span className="badge badge-light-danger fs-8 fw-bold">Inactive</span>
                                                </td>
                                                <td className="text-center">
                                                    <span
                                                        className="btn btn-sm btn-icon btn-bg-light btn-active-color-primary w-30px h-30px"
                                                        title="View Details"
                                                        data-bs-toggle="offcanvas"
                                                        data-bs-target="#offcanvasRightInactiveView"
                                                        onClick={() => handleViewInactiveAsset(item)}
                                                    >
                                                        <i className="fa-solid fa-arrow-right fs-7"></i>
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="7" className="text-center py-10 text-gray-500 italic">
                                                <i className="fa-solid fa-inbox fs-2x mb-3 d-block opacity-20"></i>
                                                No Assets Available
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="d-flex justify-content-between align-items-center flex-wrap p-3 mt-2">
                            <div className="d-flex align-items-center gap-4 flex-wrap">
                                <div className="fs-6 fw-bold text-gray-700">
                                    Showing {filteredInactiveAssets.length > 0 ? indexOfFirstRecord + 1 : 0} to {Math.min(indexOfLastRecord, filteredInactiveAssets.length)} of {filteredInactiveAssets.length} entries
                                    {searchQuery && ` (filtered from ${inactiveAssetsData?.length} total entries)`}
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

            <style>
                {`
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
                         .modern-search-input::placeholder {
                        color: #a1a5b7;
                        animation: placeholderPulse 2s infinite ease-in-out;
                    }
                        /* Custom truncation that works with flex containers */
                    .text-truncate-custom {
                        display: inline-block;
                        max-width: 290px; /* Adjust based on your column width */
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        vertical-align: middle;
                    }

                    /* Row hover animation */
                    .transition-3ms {
                        transition: all 0.3s ease;
                    }

                    .hover-elevate-up:hover {
                        background-color: #f9f9f9 !important;
                        transform: scale(1.005);
                        z-index: 1;
                    }

                    /* Align columns strictly */
                    .table th, .table td {
                        padding-left: 1.5rem !important;
                        padding-right: 1.5rem !important;
                    }
                `}
            </style>

        <InactiveAssetView inactiveAssetObj={inactiveAssetObj} />
        </Base1>
    )
}