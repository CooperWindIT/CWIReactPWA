import React, { useEffect, useState } from "react";
import Swal from 'sweetalert2';
import { fetchWithAuth } from "../../utils/api";
import { Badge } from "antd";
import PropTypes from "prop-types";


export default function CloseTicket({ ticObj }) {

    const [closeSubmitLoading, setCloseSubmitLoading] = useState(false);
    const [sessionUserData, setSessionUserData] = useState([]);

    const [closeForm, setCloseForm] = useState({
        ResolutionSummary: "",
        ResolutionDate: "",
    });

    useEffect(() => {
        const userDataString = sessionStorage.getItem("userData");
        if (userDataString) {
            const userData = JSON.parse(userDataString);
            setSessionUserData(userData);
        } else {
            console.log("/");
        }
    }, []);

    const getPriorityLabel = (priority) => {
        const map = { 1: "Low", 2: "Medium", 3: "High" };
        return map[priority] || "Medium";
    };

    const getPriorityColor = (priority) => {
        const map = { 1: "green", 2: "orange", 3: "red" };
        return map[priority] || "orange";
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
                return "badge-light-success";
            case "tech_fixed":
                return "badge-light-info";
            case "pending_with_client":
                return "badge-light-warning";
            case "resolved":
                return "badge-light-primary";
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

    const isOverdue = (dueDate) => {
        if (!dueDate) return false;
        return new Date(dueDate) < new Date();
    };

    const handleCloseSubmit = async (e) => {
        e.preventDefault();
        console.log(ticObj);

        const payload = {
            OrgId: sessionUserData.OrgId,
            Priority: ticObj.Priority,
            TicketStatus: "CLOSED",
            UserId: sessionUserData.Id,
            JsonData: {
                TicketId: ticObj.Id,
                ResolutionSummary: closeForm.ResolutionSummary,
                ResolvedDate: closeForm.ResolutionDate,
            },
        };

        try {
            setCloseSubmitLoading(true);

            const response = await fetchWithAuth("ServiceNow/GeneralTickets", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            const result = data?.data?.result?.[0];

            if (response.ok && data.success && result?.ResponseCode === 2002) {
                Swal.fire({
                    icon: "success",
                    title: "Success",
                    text: result.ResponseMessage || "Ticket closed successfully.",
                    confirmButtonText: "OK",
                }).then(() => {
                    window.location.reload();
                });
            } else {
                Swal.fire({
                    icon: "error",
                    title: "Error",
                    text: result?.ResponseMessage || "Unable to close ticket.",
                });
            }
        } catch (err) {
            console.error(err);
            Swal.fire("Error", "Something went wrong.", "error");
        } finally {
            setCloseSubmitLoading(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return "N/A";
        const date = new Date(dateString);
        return date.toLocaleDateString("en-GB").replace(/\//g, "-");
    };

    const today = new Date();

    let minDate = "";
    const maxDate = today.toISOString().split("T")[0];
    
    if (ticObj?.CreatedOn) {
        const createdDate = new Date(ticObj.CreatedOn);
    
        if (!isNaN(createdDate.getTime())) {
            minDate = createdDate.toISOString().split("T")[0];
        }
    }

    return (
        <div
            className="offcanvas offcanvas-end"
            tabIndex="-1"
            id="offcanvasRightCloseTic"
            style={{ width: "480px" }}
        >
            <form onSubmit={handleCloseSubmit} className="d-flex flex-column h-100">

                <div className="offcanvas-header border-bottom d-flex align-items-center">

                    <h5 className="mb-0 fw-bold">
                        <i className="fa-solid fa-ticket text-danger me-2"></i>
                        Close Ticket
                    </h5>

                    <div className="ms-auto d-flex align-items-center gap-2">
                        <button
                            className="btn btn-danger btn-sm"
                            type="submit"
                            disabled={closeSubmitLoading}
                        >
                            {closeSubmitLoading ? (
                                <>
                                    <span className="spinner-border spinner-border-sm me-2"></span>
                                    Closing...
                                </>
                            ) : (
                                <>
                                    <i className="fa-solid fa-lock me-2"></i>
                                    Close Ticket
                                </>
                            )}
                        </button>

                        <button
                            type="button"
                            className="btn-close"
                            data-bs-dismiss="offcanvas"
                            disabled={closeSubmitLoading}
                        />
                    </div>

                </div>

                <div
                    className="offcanvas-body flex-grow-1 overflow-auto"
                    style={{ minHeight: 0 }}
                >
                    <div className="card border-0 shadow-sm mb-3">
                        <div className="card-body">
                            <div className="d-flex justify-content-between align-items-start">
                                <div>
                                    <h4 className="fw-bold mb-1">
                                        <i className="fa-solid fa-hashtag text-muted me-1 fs-6"></i>
                                        {ticObj?.TicketCode}
                                    </h4>
                                    <div className="text-primary fw-semibold small">
                                        <i className="fa-solid fa-layer-group me-1"></i>
                                        {ticObj?.TicketType}
                                    </div>
                                </div>
                                <span className={`badge fs-6 ${getStatusBadgeClass(ticObj?.Status)}`}>
                                    <i className="fa-solid fa-circle-dot me-1"></i>
                                    {ticObj?.Status}
                                </span>
                            </div>

                            <hr />

                            <div className="mb-3">
                                <label className="text-muted small mb-1">
                                    <i className="fa-solid fa-circle-exclamation me-1"></i>
                                    Issue Type
                                </label>
                                <div className="fw-semibold fs-5">
                                    {ticObj?.IssueType}
                                </div>
                            </div>

                            <div>
                                <label className="text-muted small mb-1">
                                    <i className="fa-solid fa-align-left me-1"></i>
                                    Description
                                </label>
                                <div className="text-body">
                                    {ticObj?.Description || (
                                        <span className="text-muted fst-italic">No description provided</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="card border-0 shadow-sm mb-3">
                        <div className="card-body">
                            <div className="row g-3">
                                <div className="col-6">
                                    <label className="text-muted small mb-1">
                                        <i className="fa-solid fa-user me-1"></i>
                                        Raised By
                                    </label>
                                    <div className="fw-semibold">{ticObj?.RaisedBy}</div>
                                </div>

                                <div className="col-6">
                                    <label className="text-muted small mb-1">
                                        <i className="fa-solid fa-user-check me-1"></i>
                                        Assigned To
                                    </label>
                                    <div className="fw-semibold">{ticObj?.ActionRequiredFrom}</div>
                                </div>

                                <div className="col-6">
                                    <label className="text-muted small mb-1">
                                        <i className="fa-solid fa-flag me-1"></i>
                                        Priority
                                    </label>
                                    <div>
                                        <Badge color={getPriorityColor(ticObj?.Priority)}>
                                            {getPriorityLabel(ticObj?.Priority)}
                                        </Badge>
                                    </div>
                                </div>

                                <div className="col-6">
                                    <label className="text-muted small mb-1">
                                        <i className="fa-solid fa-calendar-days me-1"></i>
                                        Due Date
                                    </label>
                                    <div className={`fw-semibold ${isOverdue(ticObj?.DueDate) ? "text-danger" : ""}`}>
                                        {isOverdue(ticObj?.DueDate) && (
                                            <i className="fa-solid fa-triangle-exclamation text-danger me-1"></i>
                                        )}
                                        {formatDate(ticObj?.DueDate)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="card border-0 shadow-sm">
                        <h6 className="mb-0 fw-bold ms-3 mt-3">
                            <i className="fa-solid fa-square-check text-success me-2"></i>
                            Resolution Details
                        </h6>

                        <div className="card-body">
                            <div className="mb-3">
                                <label className="form-label">
                                    <i className="fa-solid fa-pen-to-square me-1"></i>
                                    Resolution Summary
                                    <span className="text-danger">*</span>
                                </label>

                                <textarea
                                    rows={3}
                                    className="form-control"
                                    placeholder="Enter the resolution details..."
                                    value={closeForm.ResolutionSummary}
                                    onChange={(e) =>
                                        setCloseForm({
                                            ...closeForm,
                                            ResolutionSummary: e.target.value,
                                        })
                                    }
                                    required
                                    disabled={closeSubmitLoading}
                                />
                                <div className="form-text text-end">
                                    {closeForm.ResolutionSummary?.length || 0} characters
                                </div>
                            </div>

                            <div className="mb-0">
                                <label className="form-label">
                                    <i className="fa-solid fa-calendar-check me-1"></i>
                                    Resolution Date
                                    <span className="text-danger">*</span>
                                </label>
                                <input
    type="date"
    className="form-control"
    min={minDate}
    max={maxDate}
    value={closeForm.ResolutionDate}
    onChange={(e) =>
        setCloseForm({
            ...closeForm,
            ResolutionDate: e.target.value,
        })
    }
/>
                            </div>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}


CloseTicket.propTypes = {
    ticObj: PropTypes.object.isRequired,
};
