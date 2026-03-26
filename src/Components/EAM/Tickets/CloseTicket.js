import React, { useEffect, useState } from "react";
import Swal from 'sweetalert2';
import PropTypes from "prop-types";
import { fetchWithAuth } from "../../../utils/api";
import { Tooltip } from 'antd';

export default function CloseTicket({ ticketObj }) {

    const [sessionUserData, setSessionUserData] = useState({});
    const [description, setDescription] = useState("");
    const [expenditure, setExpenditure] = useState("");
    const [closeSubmitLoading, setCloseSubmitLoading] = useState(false);

    useEffect(() => {
        const userDataString = sessionStorage.getItem("userData");
        if (userDataString) {
            const userData = JSON.parse(userDataString);
            setSessionUserData(userData);
        } else {
            console.log('sesssion not avilable');
        }
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!expenditure || !description?.trim()) {
            Swal.fire({
                title: "Missing Information",
                html: `Please provide both <b>Expenditure</b> and <b>Resolution Logs</b> to close this ticket.`,
                icon: "warning",
                confirmButtonText: "Got it!",
                customClass: {
                    confirmButton: "btn btn-primary" // Matches your Bootstrap/Metronic theme
                },
                buttonsStyling: false
            });
            return; // Stop execution
        }
        setCloseSubmitLoading(true);

        try {
            const formPayload = {
                OrgId: sessionUserData?.OrgId,
                Priority: ticketObj?.Priority,
                TicketStatus: "CLOSED",
                TicketId: ticketObj?.Id,
                UserId: sessionUserData?.Id,
                JsonData: {
                    Logs: "Expenditure: " + expenditure + ", Log: " + description
                }
            }

            const response = await fetchWithAuth(`PMMS/TicketsWorkFlow`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formPayload),
            });

            const result = await response.json();

            if (result.success) {
                if (result.data.result[0].ResponseCode === 2010) {
                    Swal.fire({
                        title: "Success",
                        text: result.data.result[0].Logs || "Ticket has been closed successfully.",
                        icon: "success",
                    }).then(() => window.location.reload());
                }
            } else {
                Swal.fire({
                    title: "Error",
                    text: result?.ResultData?.ResultMessage || "Something went wrong.",
                    icon: "error",
                });
            }
        } catch (error) {
            console.error("Error during submission:", error.message);
            Swal.fire({
                title: "Error",
                text: "An unexpected error occurred.",
                icon: "error",
            });
        } finally {
            setCloseSubmitLoading(false);
        }
    };

    const getPriorityLabel = (priority) => {
        switch (priority) {
            case 1: return "High";
            case 2: return "Medium";
            case 3: return "Low";
            default: return "";
        }
    };

    const getPriorityIconColor = (priority) => {
        switch (priority) {
            case 1: return "text-danger";   // Red for High
            case 2: return "text-warning";  // Yellow/Orange for Medium
            case 3: return "text-success";  // Green for Low
            default: return "";
        }
    };

    const getPriorityContainerClass = (priority) => {
        switch (priority) {
            case 'High': return 'bg-light-danger border-danger border-opacity-25';
            case 'Medium': return 'bg-light-warning border-warning border-opacity-25';
            default: return 'bg-light-success border-success border-opacity-25';
        }
    };

    const getPriorityTextColor = (priority) => {
        switch (priority) {
            case 'High': return 'text-danger';
            case 'Medium': return 'text-warning';
            default: return 'text-success';
        }
    };

    return (
        <div
            className="offcanvas offcanvas-end"
            tabIndex="-1"
            id="offcanvasRightCloseTic"
            aria-labelledby="offcanvasRightLabel"
            style={{ width: "90%" }}
        >
            <style>
                {`
                    @media (min-width: 768px) { /* Medium devices and up (md) */
                        #offcanvasRightCloseTic {
                            width: 50% !important;
                        }
                    }
                `}
            </style>
            <form autoComplete="off" onSubmit={handleSubmit}>
                <div className="offcanvas-header d-flex justify-content-between align-items-center">
                    <h5 id="offcanvasRightLabel" className="mb-0">Close Ticket</h5>
                    <div className="d-flex align-items-center">
                        <button className="btn btn-primary btn-sm me-2" type="submit" disabled={closeSubmitLoading}>
                            <i className="bi bi-bookmark-check"></i>{closeSubmitLoading ? "Submitting..." : "Submit"}
                        </button>
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
                        <div className="row g-5 mb-4">
                            {/* Ticket Code */}
                            <div className="col-md-4">
                                <label className="fs-8 fw-bold text-muted text-uppercase ls-1 mb-2 d-block">Ticket Code</label>
                                <div className="d-flex align-items-center bg-light-secondary p-3 rounded-2 border border-gray-200 border-dashed h-45px">
                                    <i className="bi bi-hash text-primary fs-5 me-2"></i>
                                    <span className="fw-bolder text-gray-800 fs-7">{ticketObj?.TicketCode || "N/A"}</span>
                                </div>
                            </div>

                            {/* Machine Name */}
                            <div className="col-md-4">
                                <label className="fs-8 fw-bold text-muted text-uppercase ls-1 mb-2 d-block">
                                    Machine Name
                                </label>

                                <Tooltip
                                    placement="top"
                                    title={ticketObj?.MachineName} // Shows full name on hover
                                // Only show tooltip if text actually overflows (optional enhancement)
                                >
                                    <div className="d-flex align-items-center bg-light-secondary p-3 rounded-2 border border-gray-200 border-dashed h-45px overflow-hidden">
                                        <i className="bi bi-cpu text-primary fs-5 me-2 flex-shrink-0"></i>

                                        {/* The text-truncate class handles the "..." automatically */}
                                        <span className="fw-bolder text-gray-800 fs-7 text-truncate">
                                            {ticketObj?.MachineName || "Not Assigned"}
                                        </span>
                                    </div>
                                </Tooltip>
                            </div>

                            {/* Priority */}
                            <div className="col-md-4">
                                <label className="fs-8 fw-bold text-muted text-uppercase ls-1 mb-2 d-block">Priority</label>
                                <div className={`d-flex align-items-center p-3 rounded-2 h-45px border border-dashed ${getPriorityContainerClass(ticketObj?.Priority)}`}>
                                    <i className={`bi bi-shield-fill-exclamation fs-5 me-2 ${getPriorityIconColor(ticketObj?.Priority)}`}></i>
                                    <span className={`fw-bolder fs-7 ${getPriorityTextColor(ticketObj?.Priority)}`}>
                                        {getPriorityLabel(ticketObj?.Priority)}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-12 mb-3">
                            <label className="form-label">Expenditure<span className="text-danger">*</span></label>
                            <textarea
                                className="form-control"
                                rows={4}
                                placeholder="Enter expenditure..."
                                value={expenditure}
                                onChange={(e) => setExpenditure(e.target.value)}
                            />
                        </div>
                        <div className="col-md-12">
                            <label className="form-label">Ticket Closing Summary</label>
                            <textarea
                                className="form-control"
                                rows={4}
                                placeholder="Enter ticket closed summary..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}

CloseTicket.propTypes = {
    ticketObj: PropTypes.object.isRequired,
};