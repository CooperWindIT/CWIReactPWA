import React, { useEffect, useState } from "react";
import Swal from 'sweetalert2';
import PropTypes from "prop-types";
import { fetchWithAuth } from "../../../utils/api";

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

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 1: return "text-danger";   // Red for High
            case 2: return "text-warning";  // Yellow/Orange for Medium
            case 3: return "text-success";  // Green for Low
            default: return "";
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
                            {closeSubmitLoading ? "Submitting..." : "Submit"}
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
                        <div className="col-6 mb-2">
                            <label className="form-label">Ticket Code<span className="text-danger">*</span></label>
                            <input
                                type="text"
                                className="form-control cursor-not-allowed"
                                value={ticketObj?.TicketCode}
                                readOnly
                            />
                        </div>
                        <div className="col-6 mb-2">
                            <label className="form-label">Machine Name<span className="text-danger">*</span></label>
                            <input
                                type="text"
                                className="form-control cursor-not-allowed cursor-not-allowed"
                                placeholder="Enter machine name"
                                value={ticketObj?.MachineName}
                                autoComplete="off"
                                readOnly
                            />
                        </div>
                        <div className="col-6 mb-2">
                            <label className="form-label">Priority<span className="text-danger">*</span></label>
                            <input
                                type="text"
                                className={`form-control cursor-not-allowed ${getPriorityColor(ticketObj?.Priority)}`}
                                placeholder="Enter machine name"
                                value={getPriorityLabel(ticketObj?.Priority)}
                                autoComplete="off"
                                readOnly
                            />
                        </div>
                        <div className="col-6 mb-2">
                            <label className="form-label">
                                Technician <span className="text-danger">*</span>
                            </label>
                            <input 
                                type="text"
                                className="form-control cursor-not-allowed"
                                value={ticketObj?.Technician}
                                readOnly
                            />
                        </div>
                        <div className="col-md-12 mb-3">
                            <label className="form-label">Expenditure</label>
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