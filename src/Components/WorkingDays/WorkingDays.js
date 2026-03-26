
import React, { useState, useEffect } from "react";
import Base1 from "../Config/Base1";
import '../Config/Pagination.css';
import Swal from 'sweetalert2';
import '../Config/Loader.css';
import { useNavigate } from "react-router-dom";
import { fetchWithAuth } from "../../utils/api";

export default function WorkingDays() {

    const navigate = useNavigate();
    const [sessionUserData, setSessionUserData] = useState([]);
    const [monthlyWorkingDays, setMonthlyWorkingDays] = useState([]);
    const [dataLoading, setDataLoading] = useState(false);
    const [addLoading, setAddLoading] = useState(false);
    const [editingRowId, setEditingRowId] = useState(null);
    const [navigationPath, setNavigationPath] = useState("");
    const currentYear = new Date().getFullYear();
    const [selectedYear, setSelectedYear] = useState(currentYear);
    const years = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];

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

    const fetchMonthlyWorkingDays = async () => {
        setDataLoading(true);
        try {
            const response = await fetchWithAuth(`contractor/WorkingDaysByYear?OrgId=${sessionUserData?.OrgId}&Year=${selectedYear}`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });
            if (!response.ok) throw new Error("Network response was not ok");

            const data = await response.json();

            setMonthlyWorkingDays(data.ResultData);
            setDataLoading(false);
        } catch (error) {
            setDataLoading(false);
            console.error("Failed to fetch MonthlyWorkingDays:", error);
        }
    }

    useEffect(() => {
        if (sessionUserData?.OrgId && selectedYear) {
            fetchMonthlyWorkingDays();
        }
    }, [sessionUserData, selectedYear]);

    const [currentPage, setCurrentPage] = useState(1);
    const recordsPerPage = 6;
    const totalPages = Math.ceil(monthlyWorkingDays?.length / recordsPerPage);

    // Get current records to display
    const indexOfLastRecord = currentPage * recordsPerPage;
    const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
    const currentRecords = monthlyWorkingDays?.slice(indexOfFirstRecord, indexOfLastRecord);

    useEffect(() => {
        setCurrentPage(1);
    }, []);

    const getPaginationNumbers = () => {
        const visiblePages = [];

        // --- FIX: Return empty if no pages exist ---
        if (!totalPages || totalPages <= 0) {
            return [];
        }

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

    const [tempValues, setTempValues] = useState({});

    const handleEdit = (item) => {
        setEditingRowId(item.Id);
        setTempValues((prev) => ({ ...prev, [item.Id]: item.WorkingDays }));
    };

    const handleInputChange = (id, value) => {
        setTempValues((prev) => ({ ...prev, [id]: value }));
    };

    const handleCancel = () => {
        setEditingRowId(null);
    };

    const handleSave = async (id) => {
        try {
            setAddLoading(true);
            const response = await fetchWithAuth(`contractor/UpdateMonthlyWorkingDays`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    Id: id,
                    workingDays: Number(tempValues[id]),
                    UpdatedBy: sessionUserData?.Id,
                }),
            });

            const res = await response.json();
            if (response.ok && res.ResultData.Status === 'Success') {
                Swal.fire({
                    icon: "success",
                    title: "Updated",
                    text: res.message || "Working days updated successfully",
                });
                setAddLoading(false);
                setEditingRowId(null);
                fetchMonthlyWorkingDays();
            } else {
                Swal.fire({
                    icon: "error",
                    title: "Error",
                    text: res.message || "Failed to update working days",
                });
                setAddLoading(false);
            }
        } catch (err) {
            Swal.fire({
                icon: "error",
                title: "Error",
                text: err.message,
            });
            setAddLoading(false);
        }
    };

    return (
        <Base1>
            <div id="kt_app_toolbar" className="app-toolbar py-3 py-lg-6">
                <div id="kt_app_toolbar_container" className="app-container container-xxl d-flex flex-stack">
                    <div className="page-title d-flex flex-column justify-content-center flex-wrap me-3">
                        <h1 className="page-heading d-flex text-gray-900 fw-bold fs-3 flex-column justify-content-center my-0">Working Days</h1>
                        <ul className="breadcrumb breadcrumb-separatorless fw-semibold fs-7 my-0 pt-1">
                            <li className="breadcrumb-item text-muted">
                                <a href={navigationPath} className="text-muted text-hover-primary">Home</a>
                            </li>
                            <li className="breadcrumb-item">
                                <span className="bullet bg-gray-500 w-5px h-2px"></span>
                            </li>
                            <li className="breadcrumb-item text-muted">Working Days</li>
                        </ul>
                    </div>
                </div>
            </div>
            <div id="kt_app_content" className="app-content flex-column-fluid mb-8">
                <div id="kt_app_content_container" className="app-container container-xxl">
                    <div className="card d-md-block d-none mb-4">
                        <div className="card-body pt-0">
                            <div className="d-flex flex-stack my-4 flex-wrap">
                                <h3 className="fw-bold my-2 text-gray-800">Working Days Setup</h3>
                                <div className="d-flex align-items-center gap-5">
                                    <div className="nav-group nav-group-outline bg-light-primary rounded-pill p-1">
                                        {years.map((year) => (
                                            <button
                                                key={year}
                                                onClick={() => setSelectedYear(year)}
                                                className={`btn btn-sm px-4 rounded-pill fw-bolder text-uppercase transition-all ${selectedYear === year ? 'btn-primary shadow-sm' : 'btn-color-gray-600 btn-active-color-primary'
                                                    }`}
                                            >
                                                {year}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {dataLoading ? (
                                <div className="text-center py-10">
                                    <span className="spinner-border text-primary"></span>
                                </div>
                            ) : currentRecords && currentRecords.length > 0 ? (
                                <div className="row g-6 g-xl-9">
                                    {currentRecords.map((item, index) => {
                                        const isEditing = editingRowId === item.Id;
                                        const monthName = new Date(0, item.Month - 1).toLocaleString("default", { month: "long" });

                                        return (
                                            <div className="col-md-6 col-xxl-4" key={item.Id}>
                                                <div className={`card labor-card h-100 ${isEditing ? 'editing-mode border-primary' : 'shadow-sm'}`}>
                                                    <div className="card-body p-7">
                                                        {/* Header: Month Icon & Actions */}
                                                        <div className="d-flex flex-stack mb-5">
                                                            <div className="d-flex align-items-center">
                                                                <div className="symbol symbol-50px me-4">
                                                                    <div className="symbol-label fs-3 fw-bold bg-light-primary text-primary">
                                                                        {monthName.substring(0, 3).toUpperCase()}
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <div className="text-gray-900 fw-bolder fs-4">{monthName}</div>
                                                                    <div className="text-muted fw-bold fs-7">{item.Year} (Year)</div>
                                                                </div>
                                                            </div>
                                                            <div className="d-flex gap-2">
                                                                {!isEditing ? (
                                                                    <button
                                                                        className="btn btn-icon btn-sm btn-light-info btn-active-info"
                                                                        onClick={() => handleEdit(item)}
                                                                        disabled={
                                                                            (parseInt(item.Year) === new Date().getFullYear() && item.Year < (new Date().getMonth() + 1)) ||
                                                                            (parseInt(item.Year) < new Date().getFullYear())
                                                                        }
                                                                        title={
                                                                            ((parseInt(item.Year) === new Date().getFullYear() && item.Year < (new Date().getMonth() + 1)) ||
                                                                                (parseInt(item.Year) < new Date().getFullYear()))
                                                                                ? "Past months cannot be edited"
                                                                                : "Edit Month"
                                                                        }
                                                                    >
                                                                        <i className={
                                                                            ((parseInt(item.Year) === new Date().getFullYear() && item.Year < (new Date().getMonth() + 1)) ||
                                                                                (parseInt(item.Year) < new Date().getFullYear()))
                                                                                ? "fa-solid fa-lock fs-6"
                                                                                : "fa-regular fa-pen-to-square fs-6"
                                                                        }></i>
                                                                    </button>
                                                                ) : (
                                                                    <>
                                                                        <button className="btn btn-icon btn-sm btn-success shadow-sm" onClick={() => handleSave(item.Id)}>
                                                                            <i className="fa-solid fa-check fs-6"></i>
                                                                        </button>
                                                                        <button className="btn btn-icon btn-sm btn-danger" onClick={() => handleCancel()}>
                                                                            <i className="fa-solid fa-xmark fs-6"></i>
                                                                        </button>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Visual Divider */}
                                                        <div className="separator separator-dashed my-5"></div>

                                                        {/* Input Section with Background Transition */}
                                                        <div className="input-zone p-4 d-flex align-items-center justify-content-between">
                                                            <span className="fw-bold text-gray-700">Scheduled Days</span>
                                                            <div className="d-flex align-items-center">
                                                                <input
                                                                    type="number"
                                                                    className={`form-control form-control-solid days-input text-center fw-bolder fs-4 ${isEditing ? 'bg-white' : 'bg-transparent cursor-default'}`}
                                                                    value={isEditing ? tempValues[item.Id] ?? item.WorkingDays : item.WorkingDays}
                                                                    onChange={(e) => handleInputChange(item.Id, e.target.value)}
                                                                    disabled={!isEditing || addLoading}
                                                                    style={{ width: "80px", color: "#3e97ff" }}
                                                                />
                                                                <span className="ms-3 badge badge-light-dark fw-bold">DAYS</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="card border-0 shadow-sm py-20 text-center">
                                    <p className="text-gray-400 fs-4">No records found for this year.</p>
                                </div>
                            )}

                            {/* Only show pagination if there is more than 0 records */}
                            {monthlyWorkingDays?.length > 0 && (
                                <div className="d-flex flex-stack flex-wrap pt-10">
                                    <div className="fs-6 fw-bold text-gray-700">
                                        Showing {currentRecords?.length} of {monthlyWorkingDays?.length} entries
                                    </div>

                                    {totalPages > 1 && (
                                        <ul className="pagination">
                                            <li className={`page-item previous ${currentPage === 1 ? "disabled" : ""}`}>
                                                <button className="page-link" onClick={handlePrevious} disabled={currentPage === 1}>
                                                    <i className="bi bi-chevron-left"></i>
                                                </button>
                                            </li>

                                            {getPaginationNumbers().map((page, i) => (
                                                <li key={i} className={`page-item ${page === currentPage ? "active" : ""} ${page === "..." ? "disabled" : ""}`}>
                                                    <button
                                                        className="page-link"
                                                        onClick={() => page !== "..." && handlePageClick(page)}
                                                    >
                                                        {page}
                                                    </button>
                                                </li>
                                            ))}

                                            <li className={`page-item next ${currentPage === totalPages ? "disabled" : ""}`}>
                                                <button className="page-link" onClick={handleNext} disabled={currentPage === totalPages}>
                                                    <i className="bi bi-chevron-right"></i>
                                                </button>
                                            </li>
                                        </ul>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="d-block d-md-none">
                        <div className="d-flex flex-stack my-4 flex-wrap">
                            <div className="d-flex align-items-center gap-5 ms-auto">
                                <div className="nav-group nav-group-outline bg-light-primary rounded-pill p-1">
                                    {years.map((year) => (
                                        <button
                                            key={year}
                                            onClick={() => setSelectedYear(year)}
                                            className={`btn btn-sm px-4 rounded-pill fw-bolder text-uppercase transition-all ${selectedYear === year
                                                ? 'btn-primary shadow-sm text-white'
                                                : 'btn-color-gray-600 btn-active-color-primary'
                                                }`}
                                        >
                                            {year}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        {dataLoading ? (
                            <div className="container"></div>
                        ) : monthlyWorkingDays && monthlyWorkingDays.length > 0 ? (
                            monthlyWorkingDays.map((item, index) => (
                                <div key={index} className="card mb-2 shadow-sm rounded">
                                    <div className="card-body">
                                        <div className="d-flex justify-content-between align-items-start">
                                            <span>
                                                <div className="">
                                                    <span className="badge badge-light-success">Active</span>
                                                </div>
                                            </span>
                                            <div className="mb-2 d-flex align-items-center">
                                                {editingRowId === item.Id ? (
                                                    <div className="d-flex align-items-center">
                                                        <i
                                                            className="fa-solid fa-check text-success cursor-pointer p-2 p-md-1 fs-4 fs-md-6 me-3"
                                                            role="button"
                                                            aria-label="Save"
                                                            onClick={() => handleSave(item.Id)}
                                                        ></i>

                                                        <i
                                                            className="fa-solid fa-xmark text-danger cursor-pointer p-2 p-md-1 fs-4 fs-md-6"
                                                            role="button"
                                                            aria-label="Cancel"
                                                            onClick={() => handleCancel()}
                                                        ></i>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <i
                                                            className={`fa-regular fa-pen-to-square text-info cursor-pointer p-2 p-md-1 fs-4 fs-md-6 
                                                                ${((parseInt(item.Year) === new Date().getFullYear() && item.Year < (new Date().getMonth() + 1)) ||
                                                                    (parseInt(item.Year) < new Date().getFullYear())) ? 'opacity-25' : ''}`}
                                                            role="button"
                                                            aria-label="Edit"
                                                            onClick={() => {
                                                                const isPast = (parseInt(item.Year) === new Date().getFullYear() && item.Year < (new Date().getMonth() + 1)) ||
                                                                    (parseInt(item.Year) < new Date().getFullYear());
                                                                if (!isPast) handleEdit(item);
                                                            }}
                                                        ></i>
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        <div className="mb-2">
                                            <div className="d-flex justify-content-between">
                                                <span className="text-muted">Year:</span>
                                                <span className="fw-semibold">{item.Year}</span>
                                            </div>
                                            <div className="d-flex justify-content-between">
                                                <span className="text-muted">Month:</span>
                                                <span className="fw-semibold">{new Date(0, item.DisplayValue - 1).toLocaleString("default", { month: "long" })}</span>
                                            </div>
                                            <div className="d-flex justify-content-between">
                                                <span className="text-muted">Working Days:</span>
                                                <input
                                                    type="number"
                                                    className="form-control"
                                                    value={editingRowId === item.Id ? tempValues[item.Id] ?? item.WorkingDays : item.WorkingDays}
                                                    placeholder="Enter no.of working days"
                                                    style={{ width: "100px", height: "2rem" }}
                                                    onChange={(e) => handleInputChange(item.Id, e.target.value)}
                                                    onWheel={(e) => e.target.blur()}
                                                    disabled={editingRowId !== item.Id || addLoading} // ✅ only enable if editing this row
                                                />
                                            </div>
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

            <style>
                {`
                .nav-group-outline { border: 1px solid #e1e3ea; display: flex; align-items: center; }
                    .transition-all { transition: all 0.2s ease-in-out; }
                    /* Card Base Styling */
                    .labor-card {
                        transition: all 0.3s ease-in-out;
                        border: 1px solid rgba(0, 0, 0, 0.05) !important;
                        background: #ffffff;
                    }

                    /* Hover Animation: Lift and Glow */
                    .labor-card:hover {
                        transform: translateY(-5px);
                        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1) !important;
                        border-color: #3e97ff !important; /* Primary color */
                    }

                    /* Input Area "Glass" Effect */
                    .input-zone {
                        background: #f9f9f9;
                        border-radius: 12px;
                        transition: background 0.3s ease;
                    }

                    .labor-card:hover .input-zone {
                        background: #f1faff; /* Light blue tint on hover */
                    }

                    /* Animation for the "Editing" state */
                    .editing-mode {
                        animation: pulse-border 2s infinite;
                        background: #ffffff;
                        box-shadow: 0 0 15px rgba(62, 151, 255, 0.2) !important;
                    }

                    @keyframes pulse-border {
                        0% { border-color: rgba(62, 151, 255, 0.5); }
                        50% { border-color: rgba(62, 151, 255, 1); }
                        100% { border-color: rgba(62, 151, 255, 0.5); }
                    }

                    /* Custom Styled Number Input */
                    .days-input {
                        border-radius: 8px !important;
                        transition: all 0.2s ease;
                        border: 1px solid transparent !important;
                    }

                    .days-input:focus {
                        background: white !important;
                        border: 1px solid #3e97ff !important;
                        box-shadow: 0 0 8px rgba(62, 151, 255, 0.25);
                    }
                        `}
            </style>
        </Base1>
    )
}