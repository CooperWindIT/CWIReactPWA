import React, { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { message } from "antd";
import { saveReviewCycles } from "../services/kpiServices";
import Swal from "sweetalert2";

export default function ReleaseReviewCycle({
    releaseReviewCycleData,
    employees = [],
    onReleased,
}) {
    const [sessionUserData, setSessionUserData] = useState({});
    const [loading, setLoading] = useState(false);

    const [search, setSearch] = useState("");
    const [selectedEmployees, setSelectedEmployees] = useState([]);
    const [releaseLoading, setReleaseLoading] = useState(false);

    const [releaseData, setReleaseData] = useState({
        Id: "",
        Comments: "",
    });

    useEffect(() => {
        const userDataString = sessionStorage.getItem("userData");

        if (userDataString) {
            setSessionUserData(JSON.parse(userDataString));
        }
    }, []);

    const filteredEmployees = useMemo(() => {
        const searchText = search.trim().toLowerCase();

        if (!searchText) {
            return employees;
        }

        return employees.filter((employee) => {
            const name = employee.ItemValue || "";
            const email = employee.DisplayValue || "";
            const department = employee.DisplayValue2 || "";

            return (
                name.toLowerCase().includes(searchText) ||
                email.toLowerCase().includes(searchText) ||
                department.toLowerCase().includes(searchText)
            );
        });
    }, [employees, search]);

    useEffect(() => {
        if (releaseReviewCycleData) {
            setReleaseData({
                Id: releaseReviewCycleData.Id || "",
                Comments: "",
            });
    
            // Select ALL employees by default
            setSelectedEmployees(
                employees
                    .map((employee) => getEmployeeId(employee))
                    .filter(Boolean)
            );
    
            setSearch("");
        }
    }, [releaseReviewCycleData, employees]);

    // ---------------------------------------------
    // Employee ID Helper
    // ---------------------------------------------
    const getEmployeeId = (employee) => employee.ItemId;

    // ---------------------------------------------
    // Select / Unselect Employee
    // ---------------------------------------------
    const handleEmployeeSelect = (employeeId) => {
        setSelectedEmployees((prev) => {
            if (prev.includes(employeeId)) {
                return prev.filter((id) => id !== employeeId);
            }

            return [...prev, employeeId];
        });
    };

    // ---------------------------------------------
    // Select All Filtered Employees
    // ---------------------------------------------
    const handleSelectAll = () => {
        const filteredIds = filteredEmployees
            .map((employee) => getEmployeeId(employee))
            .filter(Boolean);

        const allSelected = filteredIds.every((id) =>
            selectedEmployees.includes(id)
        );

        if (allSelected) {
            // Remove filtered employees
            setSelectedEmployees((prev) =>
                prev.filter((id) => !filteredIds.includes(id))
            );
        } else {
            // Add filtered employees
            setSelectedEmployees((prev) => [
                ...new Set([...prev, ...filteredIds]),
            ]);
        }
    };

    // ---------------------------------------------
    // Is All Filtered Selected
    // ---------------------------------------------
    const isAllSelected =
        filteredEmployees.length > 0 &&
        filteredEmployees.every((employee) =>
            selectedEmployees.includes(getEmployeeId(employee))
        );

    // ---------------------------------------------
    // Release Validation
    // ---------------------------------------------
    const validateRelease = () => {
        if (!releaseData.Id) {
            message.error("Review cycle not selected.");
            return false;
        }

        if (selectedEmployees.length === 0) {
            message.warning(
                "Please select at least one employee to release the review cycle."
            );
            return false;
        }

        if (!releaseData.Comments.trim()) {
            message.warning("Please enter release comments.");
            return false;
        }

        return true;
    };

    // ---------------------------------------------
    // Release
    // ---------------------------------------------
    const handleRelease = async () => {
        if (!selectedEmployees.length) {
            message.warning("Please select at least one employee.");
            return;
        }

        if (!releaseData.Comments.trim()) {
            message.warning("Please enter release comments.");
            return;
        }

        setReleaseLoading(true);

        const payload = {
            Type: "OPEN",
            OrgId: sessionUserData?.OrgId,
            UserId: sessionUserData?.Id,
            JsonData: {
                Id: releaseData.Id,
                Comments: releaseData.Comments,
                UserIds: selectedEmployees,
            },
        };

        try {
            const response = await saveReviewCycles(payload);

            if (
                response?.success &&
                response?.data?.result?.[0]?.ResponseCode === 200
            ) {
                Swal.fire({
                    icon: "success",
                    title: "Success!",
                    text:
                        response.data.result[0].Message ||
                        "Review cycle released successfully!",
                    confirmButtonText: "OK",
                }).then((result) => {
                    if (result.isConfirmed) {
                        window.location.reload();
                    }
                });
            
                // Close modal
                document
                    .getElementById("releaseReviewCycleModal")
                    ?.querySelector(".btn-close")
                    ?.click();
            
                // Reset selection
                setSelectedEmployees([]);
            
                setReleaseData({
                    Id: "",
                    Comments: "",
                });
            } else {
                Swal.fire({
                    icon: "error",
                    title: "Release Failed",
                    text:
                        response?.data?.result?.[0]?.Message ||
                        "Release failed.",
                    confirmButtonText: "OK",
                });
            }
        } catch (err) {
            console.error("Release Review Cycle Error:", err);

            message.error("Something went wrong.");
        } finally {
            setReleaseLoading(false);
        }
    };

    const formatDate = (date) => {
        if (!date) return "-";
    
        const [year, month, day] = date.substring(0, 10).split("-");
    
        return `${day}-${month}-${year}`;
    };

    return (
        <div
        className="offcanvas offcanvas-end"
        tabIndex="-1"
        id="offcanvasRightOpenCycle"
        style={{
            width: "90%",
            maxWidth: "100%",
        }}
    >
        <style>{`
            @media (min-width: 768px) {
                #offcanvasRightOpenCycle {
                    width: 65% !important;
                }
            }
    
            @media (min-width: 1200px) {
                #offcanvasRightOpenCycle {
                    width: 60% !important;
                }
            }
    
            #offcanvasRightOpenCycle .offcanvas-content {
                height: 100vh;
                display: flex;
                flex-direction: column;
                overflow: hidden;
            }
    
            #offcanvasRightOpenCycle .offcanvas-header {
                flex-shrink: 0;
            }
    
            #offcanvasRightOpenCycle .offcanvas-body {
                flex: 1;
                min-height: 0;
                overflow: hidden;
                display: flex;
                flex-direction: column;
            }
    
            #offcanvasRightOpenCycle .employee-table-scroll {
                flex: 1;
                min-height: 180px;
                overflow-y: auto;
                overflow-x: auto;
            }
    
            #offcanvasRightOpenCycle .comments-section {
                flex-shrink: 0;
                background: #fff;
                border-top: 1px solid #e5e7eb;
            }
    
            #offcanvasRightOpenCycle .employee-table-scroll::-webkit-scrollbar {
                width: 6px;
                height: 6px;
            }
    
            #offcanvasRightOpenCycle .employee-table-scroll::-webkit-scrollbar-thumb {
                background: #cbd5e1;
                border-radius: 10px;
            }
    
            #offcanvasRightOpenCycle .employee-table-scroll::-webkit-scrollbar-track {
                background: transparent;
            }
        `}</style>
    
        <div className="offcanvas-content">
            <div
                className="offcanvas-header border-0 px-4 py-3"
                style={{
                    background:
                        "linear-gradient(90deg, #16a34a, #22c55e)",
                    color: "#fff",
                }}
            >
                <div className="flex-grow-1">
                    <h5 className="fw-bold mb-1">
                        <i className="bi bi-rocket-takeoff me-2 text-white"></i>
                        Release Review Cycle
                    </h5>
                    <small className="opacity-75">
                        Release this review cycle to selected employees
                    </small>
                </div>
    
                <div className="d-flex align-items-center gap-2">
                    <button
                        type="button"
                        className="btn btn-light btn-sm px-3 fw-semibold"
                        onClick={handleRelease}
                        disabled={
                            loading ||
                            selectedEmployees.length === 0 ||
                            !releaseData.Comments?.trim()
                        }
                    >
                        {loading ? (
                            <>
                                <span
                                    className="spinner-border spinner-border-sm me-2"
                                    role="status"
                                ></span>
                                Releasing...
                            </>
                        ) : (
                            <>
                                <i className="bi bi-rocket-takeoff me-2"></i>
                                Release to {selectedEmployees.length} Employee
                                {selectedEmployees.length !== 1 ? "s" : ""}
                            </>
                        )}
                    </button>

                    <button
                        type="button"
                        className="btn-close btn-close-white ms-1"
                        data-bs-dismiss="offcanvas"
                        aria-label="Close"
                        disabled={loading}
                    ></button>
                </div>
            </div>
    
            <div className="offcanvas-body px-4 py-3">
                <div className="bg-light rounded-3 p-3 mb-3 flex-shrink-0">
                    <div className="row g-3 align-items-center">
                        <div className="col-md-4">
                            <small className="text-muted d-block mb-1">
                                Review Cycle
                            </small>
                            <div className="fw-bold text-dark">
                                {releaseReviewCycleData?.CycleName || "-"}
                            </div>
                        </div>
    
                        <div className="col-md-4">
                            <small className="text-muted d-block mb-1">
                                Start Date
                            </small>
                            <div className="fw-semibold">
                            {formatDate(releaseReviewCycleData?.StartDate)}
                            </div>
                        </div>
    
                        <div className="col-md-4">
                            <small className="text-muted d-block mb-1">
                                End Date
                            </small>
                            <div className="fw-semibold">
                            {formatDate(releaseReviewCycleData?.EndDate)}
                            </div>
                        </div>
                    </div>
                </div>
    
                <div className="d-flex justify-content-between align-items-center mb-2 flex-shrink-0">
                    <div>
                        <h6 className="fw-bold mb-1">
                            Select Employees
                        </h6>
                        <small className="text-muted">
                            Choose the employees who should receive this review
                            cycle.
                        </small>
                    </div>
                    <span className="badge bg-success-subtle text-success px-3 py-2 rounded-pill">
                        {selectedEmployees.length} Selected
                    </span>
                </div>

                <div className="row g-2 mb-3 flex-shrink-0">
                    <div className="col-md-8">
                        <div className="input-group">
                            <span className="input-group-text bg-white">
                                <i className="bi bi-search"></i>
                            </span>
                            <input
                                type="text"
                                className="form-control form-control-sm"
                                placeholder="Search by name, email, department, role..."
                                value={search}
                                onChange={(e) =>
                                    setSearch(e.target.value)
                                }
                            />
                            {search && (
                                <button
                                    type="button"
                                    className="btn btn-light-secondary btn-sm"
                                    onClick={() => setSearch("")}
                                >
                                    <i className="bi bi-x"></i>
                                </button>
                            )}
                        </div>
                    </div>
    
                    <div className="col-md-4 d-flex justify-content-md-end">
                        <button
                            type="button"
                            className={`btn ${
                                isAllSelected
                                    ? "btn-light-danger"
                                    : "btn-light-success"
                            } btn-sm`}
                            onClick={handleSelectAll}
                            disabled={
                                filteredEmployees.length === 0
                            }
                        >
                            <i
                                className={`bi ${
                                    isAllSelected
                                        ? "bi-x-square"
                                        : "bi-check2-square"
                                } me-2`}
                            ></i>
                            {isAllSelected
                                ? "Unselect All"
                                : "Select All"}
                        </button>
                    </div>
                </div>
    
                <div className="border rounded-3 employee-table-scroll">
                    <table className="table table-hover align-middle mb-0">
                        <thead
                            className="table-light"
                            style={{
                                position: "sticky",
                                top: 0,
                                zIndex: 2,
                            }}
                        >
                            <tr>
                                <th
                                    className="text-center"
                                    style={{
                                        width: "50px",
                                        backgroundColor: "#f8f9fa",
                                    }}
                                >
                                    <input
                                        type="checkbox"
                                        className="form-check-input"
                                        style={{
                                            cursor: "pointer",
                                            width: "18px",
                                            height: "18px",
                                        }}
                                        checked={isAllSelected}
                                        onChange={handleSelectAll}
                                        disabled={
                                            filteredEmployees.length === 0
                                        }
                                    />
                                </th>
                                <th
                                    style={{
                                        minWidth: "200px",
                                        backgroundColor: "#f8f9fa",
                                    }}
                                >
                                    Employee
                                </th>
                                <th
                                    style={{
                                        minWidth: "250px",
                                        backgroundColor: "#f8f9fa",
                                    }}
                                >
                                    Email
                                </th>
                                <th
                                    style={{
                                        minWidth: "150px",
                                        backgroundColor: "#f8f9fa",
                                    }}
                                >
                                    Department
                                </th>
                                <th
                                    style={{
                                        minWidth: "120px",
                                        backgroundColor: "#f8f9fa",
                                    }}
                                >
                                    Role
                                </th>
                            </tr>
                        </thead>
    
    
                        <tbody>
    
                            {filteredEmployees.length > 0 ? (
                                filteredEmployees.map((employee) => {
                                    const employeeId = employee.ItemId;
                                    const isSelected =
                                        selectedEmployees.includes(
                                            employeeId
                                        );
                                    const employeeName =
                                        employee.ItemValue || "-";
                                    const email =
                                        employee.DisplayValue || "-";
                                    const department =
                                        employee.DisplayValue2 || "-";
                                    const roleId =
                                        employee.ConditionalId1;
    
                                    return (
                                        <tr
                                            key={employeeId}
                                            className={
                                                isSelected
                                                    ? "table-success"
                                                    : ""
                                            }
                                            style={{
                                                cursor: "pointer",
                                            }}
                                            onClick={() =>
                                                handleEmployeeSelect(
                                                    employeeId
                                                )
                                            }
                                        >
                                            <td
                                                className="text-center"
                                                style={{
                                                    width: "50px",
                                                }}
                                            >
                                                <input
                                                    type="checkbox"
                                                    className="form-check-input"
                                                    style={{
                                                        cursor: "pointer",
                                                        width: "18px",
                                                        height: "18px",
                                                    }}
                                                    checked={isSelected}
                                                    onChange={() =>
                                                        handleEmployeeSelect(
                                                            employeeId
                                                        )
                                                    }
                                                    onClick={(e) =>
                                                        e.stopPropagation()
                                                    }
                                                />
                                            </td>
                                            <td
                                                style={{
                                                    minWidth: "200px",
                                                }}
                                            >
                                                <div className="d-flex align-items-center gap-2">
                                                    <div
                                                        className="rounded-circle bg-primary-subtle text-primary d-flex align-items-center justify-content-center fw-bold"
                                                        style={{
                                                            width: 36,
                                                            height: 36,
                                                            minWidth: 36,
                                                        }}
                                                    >
                                                        {employeeName
                                                            .charAt(0)
                                                            .toUpperCase()}
                                                    </div>
                                                    <span className="fw-semibold">
                                                        {employeeName}
                                                    </span>
                                                </div>
                                            </td>
                                            <td
                                                style={{
                                                    minWidth: "250px",
                                                }}
                                            >
                                                <span className="text-muted">
                                                    {email}
                                                </span>
                                            </td>
                                            <td
                                                style={{
                                                    minWidth: "150px",
                                                }}
                                            >
                                                <span className="badge bg-light text-dark border">
                                                    {department}
                                                </span>
                                            </td>
                                            <td
                                                style={{
                                                    minWidth: "120px",
                                                }}
                                            >
                                                <span className="text-muted">
                                                    {roleId || "-"}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
    
                                <tr>
                                    <td
                                        colSpan="5"
                                        className="text-center py-5"
                                    >
                                        <i className="bi bi-people fs-2 text-muted"></i>
                                        <div className="fw-semibold mt-2">
                                            No employees found
                                        </div>
                                        <small className="text-muted">
                                            Try changing your search.
                                        </small>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
    
                <div className="comments-section mt-3 pt-3">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                        <label className="form-label fw-semibold mb-0">
                            Release Comments
                            <span className="text-danger ms-1">*</span>
                        </label>
                        <small className="text-muted">
                            Required
                        </small>
                    </div>
                    <textarea
                        rows="3"
                        className="form-control"
                        placeholder="Enter release comments..."
                        value={releaseData.Comments}
                        onChange={(e) =>
                            setReleaseData((prev) => ({
                                ...prev,
                                Comments: e.target.value,
                            }))
                        }
                    />
                </div>
            </div>
        </div>
    </div>
    );
}

ReleaseReviewCycle.propTypes = {
    releaseReviewCycleData: PropTypes.object,
    employees: PropTypes.array,
    onReleased: PropTypes.func,
};