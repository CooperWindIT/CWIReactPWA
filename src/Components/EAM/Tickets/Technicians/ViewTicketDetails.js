import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import Swal from 'sweetalert2';
import { Tooltip } from "antd";
import { fetchWithAuth } from "../../../../utils/api";
import TicketViewCommentsModal from "./TicketComments";
import TicketResolveModal from "./TicketResolveModal";
import { BASE_IMAGE_API_GET } from "../../../Config/Config";

export default function TicketViewDetails({ ticObj }) {

    const [sessionUserData, setSessionUserData] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
    const [isPriorityModalOpen, setIsPriorityModalOpen] = useState(false);
    const [priorityForm, setPriorityForm] = useState({
        techPriority: "",
        techlevel: "",
    });
    const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
    const [ticketDetails, setTicketDetails] = useState([]);
    const [mcnTicketsLoading, setMcnTicketsLoading] = useState(false);
    const [supportDescription, setSupportDescription] = useState("");
    const [showImagePreview, setShowImagePreview] = useState(false);

    useEffect(() => {
        const userDataString = sessionStorage.getItem("userData");
        if (userDataString) {
            const userData = JSON.parse(userDataString);
            setSessionUserData(userData);
        } else {
            console.log("no session found");
        }
    }, []);

    const handleIsFixedClick = () => {
        setIsResolveModalOpen(true);
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
            Swal.showLoading();
            const res = await fetchWithAuth(`PMMS/TicketsWorkFlow`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const data = await res.json();

            if (data?.success && data?.data?.result?.[0]?.ResponseCode === 3003) {
                fetchTicketDetails();
                setIsResolveModalOpen(false);
                Swal.fire("Success", "Ticket resolved.", "success");
            } else {
                Swal.fire("Error", "Failed to resolve", "error");
            }
        } catch (err) {
            Swal.fire("Error", "Server error", "error");
        }
    };

    const handlePriorityLevelSubmit = async () => {
        if (!priorityForm.techPriority || !priorityForm.techlevel) {
            Swal.fire("Validation", "Please select both priority and level.", "warning");
            return;
        };

        const priorityValueMap = {
            High: 1,
            Medium: 2,
            Low: 3,
        };

        const techPriorityLabelMap = {
            1: "High",
            2: "Medium",
            3: "Low",
        };

        const techlevelLabelMap = {
            1: "Level-1",
            2: "Level-2",
            3: "Level-3",
            4: "Level-4",
        };

        const payload = {
            OrgId: sessionUserData?.OrgId,
            Priority: priorityValueMap[ticObj?.Priority] || 0,
            TicketStatus: "TECH_LEVEL_UPDT",
            TicketId: ticObj?.TicketId,
            UserId: sessionUserData?.Id,
            JsonData: {
                TicketCreated: ticObj?.CreatedBy,
                TicketId: ticObj?.TicketId,
                techPriority: Number(priorityForm.techPriority),
                techlevel: Number(priorityForm.techlevel),
                Logs: `Technical priority set to ${techPriorityLabelMap[priorityForm.techPriority]} and technical level set to ${techlevelLabelMap[priorityForm.techlevel]} by ${sessionUserData?.Name || "user"}.`,
            }
        };

        try {
            Swal.showLoading();
            const res = await fetchWithAuth(`PMMS/TicketsWorkFlow`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            const responseCode = data?.data?.result?.[0]?.ResponseCode;

            if (data?.success && responseCode === 2100) {
                await fetchTicketDetails();
                setIsPriorityModalOpen(false);
                setPriorityForm({ techPriority: "", techlevel: "" });
                Swal.fire("Success", "Priority and level updated successfully.", "success");
            } else {
                Swal.fire("Error", data?.data?.result?.[0]?.Logs || "Failed to update priority and level.", "error");
            }
        } catch (error) {
            Swal.fire("Error", "Server error", "error");
        }
    };

    const handleSupportSubmit = async () => {
        if (!supportDescription.trim()) {
            Swal.fire("Validation", "Description is required.", "warning");
            return;
        };

        const priorityValueMap = {
            High: 1,
            Medium: 2,
            Low: 3,
        };

        const payload = {
            OrgId: sessionUserData?.OrgId,
            Priority: priorityValueMap[ticObj?.Priority] || 0,
            TicketStatus: "PENDING_WITH_CLIENT",
            TicketId: ticObj?.TicketId,
            UserId: sessionUserData?.Id,
            JsonData: {
                TicketCreated: ticObj?.CreatedBy,
                TicketId: ticObj?.TicketId,
                Logs: `Client support requested by ${sessionUserData?.Name || "user"}. Details: ${supportDescription}`,
            },
        };

        try {
            Swal.showLoading();

            const res = await fetchWithAuth(`PMMS/TicketsWorkFlow`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = await res.json();

            const responseCode = data?.data?.result?.[0]?.ResponseCode;

            if (data?.success && responseCode === 3004) {
                fetchTicketDetails();
                setIsSupportModalOpen(false);
                setSupportDescription("");
                Swal.fire("Success", "Support request submitted successfully.", "success");
            } else {
                Swal.fire("Error", "Failed to submit support request.", "error");
            }
        } catch (error) {
            Swal.fire("Error", "Server error", "error");
        }
    };

    const fetchTicketDetails = async () => {
        try {
            const response = await fetchWithAuth(`PMMS/GetTicketsBYId?TicketId=${ticObj?.TicketId}&OrgId=${sessionUserData?.OrgId}`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });
            if (response.ok) {
                const data = await response.json();
                setTicketDetails(data.ResultData[0]);
            } else {
                setTicketDetails([]);
                console.error('Failed to fetch mcn tickets data:', response.statusText);
            }
        } catch (error) {
            setTicketDetails([]);
            console.error('Error fetching mcn tickets data:', error.message);
        } finally {
            setMcnTicketsLoading(false);
        }
    };

    useEffect(() => {
        if (ticObj?.TicketId && sessionUserData?.OrgId) {
            fetchTicketDetails();
        }
    }, [ticObj?.TicketId, sessionUserData?.OrgId]);

    const techPriorityLabelMap = {
        1: "High",
        2: "Medium",
        3: "Low",
    };

    const techPriorityHoursMap = {
        1: 3,
        2: 5,
        3: 8,
    };

    const getTechLevelLabel = (level) => {
        if (!level) return "N/A";
        return `Level-${level}`;
    };

    const formatDuration = (totalSeconds) => {
        const seconds = Math.max(0, totalSeconds);
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);

        if (hrs > 0) return `${hrs}h ${mins}m`;
        return `${mins}m`;
    };

    const getAgingDetails = (ticket) => {
        if (!ticket?.CreatedOnTime) {
            return {
                label: "N/A",
                textClass: "",
                boxClass: "",
            };
        }

        const now = new Date();
        const created = new Date(ticket.CreatedOnTime);
        const elapsedSeconds = Math.floor((now - created) / 1000);
        const pausedSeconds = Number(ticket?.TotalPauseSeconds || 0);

        const effectiveSeconds =
            ticket?.Status === "PENDING_WITH_CLIENT"
                ? Math.max(0, elapsedSeconds - pausedSeconds)
                : Math.max(0, elapsedSeconds - pausedSeconds);

        const slaHours = techPriorityHoursMap[ticket?.TechPriority];
        const slaSeconds = slaHours ? slaHours * 3600 : 0;

        if (!slaSeconds) {
            return {
                label: formatDuration(effectiveSeconds),
                textClass: "",
                boxClass: "",
            };
        }

        const balanceSeconds = slaSeconds - effectiveSeconds;

        if (ticket?.Status === "TECH_FIXED") {
            return {
                label: `Stopped at ${formatDuration(effectiveSeconds)}`,
                textClass: "text-success",
                boxClass: "border-success-subtle bg-light-success",
            };
        }

        if (ticket?.Status === "PENDING_WITH_CLIENT") {
            return {
                label:
                    balanceSeconds >= 0
                        ? `Paused | ${formatDuration(balanceSeconds)} left`
                        : `Paused | ${formatDuration(Math.abs(balanceSeconds))} overdue`,
                textClass: balanceSeconds >= 0 ? "text-warning" : "text-danger",
                boxClass: balanceSeconds >= 0 ? "border-warning-subtle bg-light-warning" : "border-danger-subtle bg-danger-light",
            };
        }

        if (balanceSeconds >= 0) {
            return {
                label: `${formatDuration(balanceSeconds)} left`,
                textClass: "text-primary",
                boxClass: "border-primary-subtle bg-light-primary",
            };
        }

        return {
            label: `${formatDuration(Math.abs(balanceSeconds))} overdue`,
            textClass: "text-danger",
            boxClass: "border-danger-subtle bg-danger-light",
        };
    };

    const agingDetails = getAgingDetails(ticketDetails);
    const techPriorityLabel = techPriorityLabelMap[ticketDetails?.TechPriority] || "N/A";
    const techLevelLabel = getTechLevelLabel(ticketDetails?.TechLevel);


    return (
        <div
            className="offcanvas offcanvas-end"
            tabIndex="-1"
            id="offcanvasRightViewMore"
            aria-labelledby="offcanvasRightLabel"
            style={{ width: "90%" }}
        >
            <style>
                {`
                    @media (min-width: 768px) { /* Medium devices and up (md) */
                        #offcanvasRightViewMore {
                            width: 40% !important;
                        }
                    }
                `}
            </style>
            <div>
                <div className="offcanvas-header d-flex justify-content-between align-items-center bg-white border-bottom py-3 px-4">
                    <h5 id="offcanvasRightLabel" className="mb-0 fw-bold text-gray-800">
                        Ticket Details <span className="badge badge-light-primary text-primary fw-bold px-3 py-2 mb-2 ms-2">
                            {ticObj?.TicketCode}
                        </span>
                    </h5>
                    <button
                        type="button"
                        className="btn-close"
                        data-bs-dismiss="offcanvas"
                        aria-label="Close"
                    ></button>
                </div>

                <div className="offcanvas-body d-flex flex-column h-100 p-0" style={{ marginTop: "-1rem", maxHeight: "calc(100vh - 4rem)", overflowY: "auto" }}>
                    <div className="detail-header p-3 p-md-4 bg-white border-bottom shadow-sm mb-3">
                        <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start gap-2 mb-3">
                            <div>
                                <div className="text-muted text-uppercase fw-semibold fs-8 mb-1">
                                    Issue Type
                                </div>

                                <h3 className="fw-bolder mt-1 mb-0 fs-4 fs-md-3">
                                    {ticObj?.IssueType}
                                </h3>
                            </div>

                            <span
                                className={`badge px-3 py-2 rounded-pill ${ticketDetails?.Status === "TECH_FIXED"
                                    ? "badge-light-success text-success"
                                    : ticketDetails?.Status === "PENDING_WITH_CLIENT"
                                        ? "badge-light-info text-info"
                                        : ticketDetails?.Status === "ASSIGNED"
                                            ? "badge-light-primary text-primary"
                                            : "badge-light-secondary text-secondary"
                                    }`}
                            >
                                {ticketDetails?.Status}
                            </span>
                        </div>

                        <div className="d-flex align-items-center">
                            <span className={`badge-priority ${ticObj?.Priority || "NA"}`}>
                                <i className={`bi bi-exclamation-triangle-fill blink-icon me-2 icon-${ticObj?.Priority || "NA"}`}></i>
                                {ticObj?.Priority || "N/A"} Priority
                            </span>
                        </div>
                    </div>
                    <div className="flex-grow-1 overflow-auto px-3 px-md-4 pb-4">
                        <div className="mb-4 p-3 bg-white rounded-4 shadow-sm border">
                            <div className="d-flex align-items-center gap-2 mb-3">
                                <div className="bg-light-primary text-primary rounded-circle d-flex align-items-center justify-content-center"
                                    style={{ width: "34px", height: "34px" }}>
                                    <i className="bi bi-lightning-charge-fill"></i>
                                </div>
                                <div>
                                    <h6 className="mb-0 fw-bold text-dark">Quick Actions</h6>
                                    <small className="text-muted">Choose the next action for this ticket</small>
                                </div>
                            </div>

                            <div className="row g-3">
                                <div className="col-12 col-md-6">
                                    <Tooltip title="View all comments for this ticket">
                                        <button
                                            className="shadow-sm btn btn-light-primary w-100 btn-sm d-flex align-items-center justify-content-center gap-2 py-3 rounded-3 fw-bold"
                                            onClick={() => setIsModalOpen(true)}
                                        >
                                            <i className="fa-solid fa-comments"></i>
                                            <span>View Comments</span>
                                        </button>
                                    </Tooltip>
                                </div>

                                <div className="col-12 col-md-6">
                                    <Tooltip
                                        title={
                                            ticketDetails?.TechPriority != 0 || ticketDetails?.TechLevel != 0
                                                ? "Priority and level have already been set for this ticket"
                                                : "Set technical priority and level"
                                        }
                                    >
                                        <span className="d-block">
                                            <button
                                                className="shadow-sm btn btn-light-warning w-100 btn-sm d-flex align-items-center justify-content-center gap-2 py-3 rounded-3 fw-bold"
                                                onClick={() => setIsPriorityModalOpen(true)}
                                                disabled={ticketDetails?.TechPriority != 0 || ticketDetails?.TechLevel != 0}
                                            >
                                                <i className="bi bi-sliders"></i>
                                                <span>Set Priority & Level</span>
                                            </button>
                                        </span>
                                    </Tooltip>
                                </div>

                                <div className="col-12 col-md-6">
                                    <Tooltip
                                        title={
                                            ticketDetails?.Status === "TECH_FIXED"
                                                ? "Support from client cannot be requested after the ticket is marked as TECH_FIXED"
                                                : ticketDetails?.Status === "PENDING_WITH_CLIENT"
                                                    ? "Client support has already been requested for this ticket"
                                                    : "Request support or clarification from the client"
                                        }
                                    >
                                        <span className="d-block">
                                            <button
                                                className="shadow-sm btn btn-light-info w-100 btn-sm d-flex align-items-center justify-content-center gap-2 py-3 rounded-3 fw-bold"
                                                onClick={() => setIsSupportModalOpen(true)}
                                                disabled={
                                                    ticketDetails?.Status === "TECH_FIXED" ||
                                                    ticketDetails?.Status === "PENDING_WITH_CLIENT"
                                                }
                                            >
                                                <i className="bi bi-headset"></i>
                                                <span>Need Support From Client</span>
                                            </button>
                                        </span>
                                    </Tooltip>
                                </div>

                                <div className="col-12 col-md-6">
                                    <Tooltip
                                        title={
                                            ["ASSIGNED"].includes(ticObj?.Status?.toUpperCase())
                                                ? "Mark this ticket as fixed"
                                                : "This action is available only when the ticket status is ASSIGNED"
                                        }
                                    >
                                        <span className="d-block">
                                            <button
                                                className={`shadow-sm btn btn-light-success w-100 btn-sm d-flex align-items-center justify-content-center gap-2 py-3 rounded-3 fw-bold ${!["ASSIGNED"].includes(ticObj?.Status?.toUpperCase()) ? "opacity-50" : ""
                                                    }`}
                                                onClick={() => handleIsFixedClick(ticObj)}
                                                disabled={!["ASSIGNED"].includes(ticObj?.Status?.toUpperCase())}
                                            >
                                                <i className="bi bi-check-circle-fill"></i>
                                                <span>Mark As Fixed</span>
                                            </button>
                                        </span>
                                    </Tooltip>
                                </div>
                            </div>
                        </div>
                        <div className="glass-card mb-4 p-3 shadow-xs">
                            <label className="section-label fs-8">Issue Description</label>
                            <p className="description-text fs-7">{ticObj?.Description?.split('||')[0].trim()}</p>
                            {ticObj?.Description?.includes('||') && (
                                <div className="mt-2 p-2 rounded bg-light border-start border-3 border-secondary">
                                    {ticObj.Description.split('||').slice(1).map((note, index) => (
                                        <div key={index} className="d-flex align-items-start mb-1">
                                            <i className="bi bi-arrow-return-right me-2 text-muted small mt-1"></i>
                                            <small className="text-muted fs-8 italic">{note.trim()}</small>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {(ticketDetails?.ImageUrl || ticObj?.ImageUrl) && (
                            <div className="glass-card mb-4 p-3 shadow-xs">
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <label className="section-label fs-8 mb-0">Attached Image</label>

                                    <button
                                        type="button"
                                        className="btn btn-light-primary btn-sm d-inline-flex align-items-center gap-2"
                                        onClick={() => setShowImagePreview(true)}
                                    >
                                        <i className="bi bi-eye"></i>
                                        Preview
                                    </button>
                                </div>

                                <div className="text-center">
                                    <img
                                        src={`${BASE_IMAGE_API_GET}${ticketDetails?.ImageUrl || ticObj?.ImageUrl}`}
                                        alt="Ticket Attachment"
                                        className="img-fluid rounded-3 border shadow-sm"
                                        style={{ maxHeight: "220px", objectFit: "cover", cursor: "pointer" }}
                                        onClick={() => setShowImagePreview(true)}
                                    />
                                </div>
                            </div>
                        )}

                        {showImagePreview && (
                            <div
                                className="modal fade show"
                                style={{ display: "block", background: "rgba(0,0,0,0.65)", zIndex: 1200 }}
                                tabIndex="-1"
                            >
                                <div className="modal-dialog modal-dialog-centered modal-lg">
                                    <div className="modal-content border-0 shadow-lg">
                                        <div className="modal-header">
                                            <h5 className="modal-title fw-bold">
                                                <i className="bi bi-image me-2 text-primary"></i>
                                                Image Preview
                                            </h5>
                                            <button
                                                type="button"
                                                className="btn-close"
                                                onClick={() => setShowImagePreview(false)}
                                            ></button>
                                        </div>

                                        <div className="modal-body text-center">
                                            <img
                                                src={`${BASE_IMAGE_API_GET}${ticketDetails?.ImageUrl || ticObj?.ImageUrl}`}
                                                alt="Ticket Attachment Preview"
                                                className="img-fluid rounded-3"
                                                style={{ maxHeight: "70vh", objectFit: "contain" }}
                                            />
                                        </div>

                                        <div className="modal-footer">
                                            <a
                                                href={`${BASE_IMAGE_API_GET}${ticketDetails?.ImageUrl || ticObj?.ImageUrl}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="btn btn-light-primary btn-sm d-inline-flex align-items-center gap-2"
                                            >
                                                <i className="bi bi-box-arrow-up-right"></i>
                                                Open
                                            </a>

                                            <button
                                                type="button"
                                                className="btn btn-light btn-sm"
                                                onClick={() => setShowImagePreview(false)}
                                            >
                                                Close
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}


                        <div className="row row-cols-1 row-cols-sm-2 g-3">
                            <div className="col">
                                <div className="info-box h-100">
                                    <i className="bi bi-pc-display text-primary fs-4"></i>
                                    <div className="ms-2">
                                        <label className="fs-9 text-uppercase text-muted fw-bold">Asset</label>
                                        <span className="d-block fs-7 fw-bold">{ticObj?.AssetName}</span>
                                        <small className="text-muted fs-8">{ticObj?.AssetType}</small>
                                    </div>
                                </div>
                            </div>
                            <div className="col">
                                <div className={`info-box h-100 ${agingDetails.boxClass}`}>
                                    <i className="bi bi-clock-history text-danger fs-4"></i>
                                    <div className="ms-2">
                                        <label className="fs-9 text-uppercase text-muted fw-bold">Aging</label>
                                        <span className={`d-block fs-7 fw-bold ${agingDetails.textClass}`}>
                                            {agingDetails.label}
                                        </span>
                                        <small className="text-muted fs-8">
                                            SLA: {techPriorityHoursMap[ticObj?.TechPriority] || "N/A"} hrs
                                        </small>
                                    </div>
                                </div>
                            </div>
                            <div className="col">
                                <div className="info-box h-100">
                                    <i className="bi bi-building text-info fs-4"></i>
                                    <div className="ms-2">
                                        <label className="fs-9 text-uppercase text-muted fw-bold">Location</label>
                                        <span className="d-block fs-7 fw-bold">{ticObj?.DeptName}</span>
                                        <small className="text-muted fs-8">{ticObj?.UnitName}</small>
                                    </div>
                                </div>
                            </div>
                            <div className="col">
                                <div className="info-box h-100">
                                    <i className="bi bi-person-badge text-warning fs-4"></i>
                                    <div className="ms-2">
                                        <label className="fs-9 text-uppercase text-muted fw-bold">Raised By</label>
                                        <span className="d-block fs-7 fw-bold">{ticObj?.UserName}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="col">
                                <div className="info-box h-100">
                                    <i className="bi bi-exclamation-diamond text-warning fs-4"></i>
                                    <div className="ms-2">
                                        <label className="fs-9 text-uppercase text-muted fw-bold">Tech Priority</label>
                                        <span className="d-block fs-7 fw-bold">{techPriorityLabel}</span>
                                        <small className="text-muted fs-8">
                                            Value: {ticketDetails?.TechPriority ?? "N/A"}
                                        </small>
                                    </div>
                                </div>
                            </div>

                            <div className="col">
                                <div className="info-box h-100">
                                    <i className="bi bi-layers text-success fs-4"></i>
                                    <div className="ms-2">
                                        <label className="fs-9 text-uppercase text-muted fw-bold">Tech Level</label>
                                        <span className="d-block fs-7 fw-bold">{techLevelLabel}</span>
                                        <small className="text-muted fs-8">
                                            Value: {ticketDetails?.TechLevel ?? "N/A"}
                                        </small>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 pt-3 border-top">
                            <label className="section-label mb-3 fs-8">Timeline</label>
                            <div className="timeline-container px-2">
                                <div className="timeline-item pb-3">
                                    <div className="timeline-dot bg-success"></div>
                                    <div className="timeline-content ms-2">
                                        <label className="fs-9 text-muted fw-bold text-uppercase">Reported On</label>
                                        <div className="fs-7">{new Date(ticObj?.CreatedOn).toLocaleDateString("en-GB")}</div>
                                    </div>
                                </div>

                                <div className="timeline-item">
                                    <div className={`timeline-dot ${new Date(ticObj?.DueDate) < new Date() ? "bg-danger" : "bg-primary"}`}></div>
                                    <div className="timeline-content ms-2">
                                        <label className="fs-9 text-muted fw-bold text-uppercase">Target Resolution</label>
                                        <div className="fs-7 fw-bold">{new Date(ticObj?.DueDate).toLocaleDateString("en-GB")}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {isPriorityModalOpen && (
                <div
                    className="modal fade show"
                    style={{ display: "block", background: "rgba(0,0,0,0.5)", zIndex: 1100 }}
                    tabIndex="-1"
                >
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content shadow-lg border-0">
                            <div className="modal-header bg-white border-bottom">
                                <h5 className="modal-title fw-bold text-gray-800">
                                    <i className="bi bi-sliders text-warning me-2"></i>
                                    Set Priority & Level
                                </h5>
                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={() => setIsPriorityModalOpen(false)}
                                ></button>
                            </div>

                            <div className="modal-body">
                                <div className="row g-4">
                                    <div className="col-12">
                                        <label className="form-label fw-bold">Priority<span className="text-danger">*</span></label>
                                        <select
                                            className="form-select"
                                            value={priorityForm.techPriority}
                                            onChange={(e) =>
                                                setPriorityForm((prev) => ({
                                                    ...prev,
                                                    techPriority: e.target.value,
                                                }))
                                            }
                                        >
                                            <option value="">Select Priority</option>
                                            <option value="3">Low</option>
                                            <option value="2">Medium</option>
                                            <option value="1">High</option>
                                        </select>
                                    </div>

                                    <div className="col-12">
                                        <label className="form-label fw-bold">Level<span className="text-danger">*</span></label>
                                        <select
                                            className="form-select"
                                            value={priorityForm.techlevel}
                                            onChange={(e) =>
                                                setPriorityForm((prev) => ({
                                                    ...prev,
                                                    techlevel: e.target.value,
                                                }))
                                            }
                                        >
                                            <option value="">Select Level</option>
                                            <option value="1">Level 1</option>
                                            <option value="2">Level 2</option>
                                            <option value="3">Level 3</option>
                                            <option value="4">Level 4</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn btn-light btn-sm d-inline-flex align-items-center gap-2"
                                    onClick={() => setIsPriorityModalOpen(false)}
                                >
                                    <i className="bi bi-x-circle"></i>
                                    <span>Cancel</span>
                                </button>

                                <button
                                    type="button"
                                    className="btn btn-warning btn-sm d-inline-flex align-items-center gap-2"
                                    onClick={handlePriorityLevelSubmit}
                                >
                                    <i className="bi bi-check2-circle"></i>
                                    <span>Save</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isSupportModalOpen && (
                <div
                    className="modal fade show"
                    style={{ display: "block", background: "rgba(0,0,0,0.5)", zIndex: 1100 }}
                    tabIndex="-1"
                >
                    <div className="modal-dialog modal-dialog-centered modal-md">
                        <div className="modal-content shadow-lg border-0">
                            <div className="modal-header bg-white border-bottom">
                                <h5 className="modal-title fw-bold text-gray-800 d-flex align-items-center gap-2">
                                    <i className="bi bi-headset text-info"></i>
                                    Need Support From Client
                                </h5>
                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={() => setIsSupportModalOpen(false)}
                                ></button>
                            </div>

                            <div className="modal-body">
                                <div className="card bg-light border-0 mb-4">
                                    <div className="card-body py-3">
                                        <div className="row g-3">
                                            <div className="col-md-6">
                                                <div className="small text-muted">Ticket Code</div>
                                                <div className="fw-bold text-dark">{ticObj?.TicketCode}</div>
                                            </div>
                                            <div className="col-md-6">
                                                <div className="small text-muted">Issue Type</div>
                                                <div className="fw-bold text-dark">{ticObj?.IssueType}</div>
                                            </div>
                                            <div className="col-md-6">
                                                <div className="small text-muted">Asset</div>
                                                <div className="fw-bold text-dark">{ticObj?.AssetName}</div>
                                            </div>
                                            <div className="col-md-6">
                                                <div className="small text-muted">Raised By</div>
                                                <div className="fw-bold text-dark">{ticObj?.UserName}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="form-label fw-bold">
                                        Description <span className="text-danger">*</span>
                                    </label>
                                    <textarea
                                        className="form-control"
                                        rows={5}
                                        placeholder="Enter support details required from client..."
                                        value={supportDescription}
                                        onChange={(e) => setSupportDescription(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn btn-light btn-sm d-inline-flex align-items-center gap-2"
                                    onClick={() => setIsSupportModalOpen(false)}
                                >
                                    <i className="bi bi-x-circle"></i>
                                    <span>Cancel</span>
                                </button>

                                <button
                                    type="button"
                                    className="btn btn-info btn-sm d-inline-flex align-items-center gap-2"
                                    onClick={handleSupportSubmit}
                                >
                                    <i className="bi bi-send-check"></i>
                                    <span>Submit Request</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}


            <style>
                {`/* Custom Header Styling */
                /* Helper for ultra-small text on mobile labels */
                    .fs-9 { font-size: 0.65rem !important; }
                    .ls-1 { letter-spacing: 0.5px; }

                    /* Info Box Styling */
                    .info-box {
                        display: flex;
                        align-items: center;
                        padding: 1rem;
                        background: #ffffff;
                        border: 1px solid #eff2f5;
                        border-radius: 0.75rem;
                        transition: transform 0.2s;
                    }

                    /* Timeline Layout */
                    .timeline-container {
                        border-left: 2px dashed #e1e3ea;
                        margin-left: 0.75rem;
                    }

                    .timeline-item {
                        position: relative;
                        padding-left: 1.5rem;
                    }

                    .timeline-dot {
                        position: absolute;
                        left: -0.45rem; /* Centers on the dashed line */
                        top: 0.25rem;
                        width: 12px;
                        height: 12px;
                        border-radius: 50%;
                        border: 2px solid #fff;
                        box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.8);
                    }

                    /* Glass Card */
                    .glass-card {
                        background: rgba(255, 255, 255, 0.9);
                        border: 1px solid #eff2f5;
                        border-radius: 1rem;
                    }

                    /* Responsive Overrides */
                    @media (max-width: 576px) {
                        .detail-header h3 { font-size: 1.25rem !important; }
                        .info-box { padding: 0.75rem; }
                        .offcanvas-body { font-size: 14px; }
                    }
                .ls-1 { letter-spacing: 1px; }

                /* Section Labels */
                .section-label {
                    display: block;
                    font-size: 0.75rem;
                    font-weight: 800;
                    text-transform: uppercase;
                    color: #a1a5b7;
                    margin-bottom: 0.5rem;
                }

                /* Glass Card Effect */
                .glass-card {
                    background: white;
                    border-radius: 12px;
                    border: 1px solid rgba(0, 0, 0, 0.05);
                }

                .description-text {
                    font-size: 0.95rem;
                    line-height: 1.6;
                    color: #3f4254;
                    margin-bottom: 0;
                }

                /* Info Boxes */
                .info-box {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 12px;
                    background: white;
                    border-radius: 12px;
                    border: 1px solid #f1f1f4;
                }

                .info-box i {
                    font-size: 1.5rem;
                }

                .info-box label {
                    display: block;
                    font-size: 0.7rem;
                    color: #a1a5b7;
                    margin: 0;
                }

                .info-box span {
                    display: block;
                    font-weight: 700;
                    font-size: 0.9rem;
                    color: #181c32;
                }

                .info-box small {
                    display: block;
                    font-size: 0.75rem;
                    color: #b5b5c3;
                }

                /* Timeline Customization */
                .timeline-item {
                    position: relative;
                    padding-left: 24px;
                    border-left: 2px dashed #e1e3ea;
                    margin-left: 10px;
                }

                .timeline-dot {
                    position: absolute;
                    left: -7px;
                    top: 5px;
                    width: 12px;
                    height: 12px;
                    border-radius: 50%;
                    border: 2px solid white;
                }

                .timeline-content label {
                    display: block;
                    font-size: 0.7rem;
                    color: #a1a5b7;
                }

                /* Priority Badges */
                .badge-priority.High { color: #f1416c; background: #fff5f8; border: 1px solid #f1416c; border-radius: 6px; padding: 4px 10px; font-size: 0.75rem; font-weight: 700;}
                .badge-priority.Medium { color: #ffad0f; background: #fff8dd; border: 1px solid #ffad0f; border-radius: 6px; padding: 4px 10px; font-size: 0.75rem; font-weight: 700;}
                .badge-priority.Low { color: #009ef7; background: #f1faff; border: 1px solid #009ef7; border-radius: 6px; padding: 4px 10px; font-size: 0.75rem; font-weight: 700;}

                /* Overdue Background */
                .bg-danger-light { background-color: #fff5f8 !important; 
                }
                /* Custom Blink Animation */
                @keyframes icon-blink {
                    0% { opacity: 1; }
                    50% { opacity: 0.3; }
                    100% { opacity: 1; }
                }

                .blink-icon {
                    animation: icon-blink 1.5s infinite;
                }

                /* Priority Colors for Icons */
                .icon-High { color: #f1416c !important; }    /* Danger Red */
                .icon-Medium { color: #ffad0f !important; }  /* Warning Orange */
                .icon-Low { color: #009ef7 !important; }     /* Primary Blue */
                .icon-NA { color: #a1a5b7 !important; }      /* Secondary Gray */
                `}
            </style>

            {isModalOpen && (
                <TicketViewCommentsModal
                    ticObj={ticObj}
                    onClose={() => setIsModalOpen(false)}
                />
            )}

            <TicketResolveModal
                isOpen={isResolveModalOpen}
                onClose={() => setIsResolveModalOpen(false)}
                onSubmit={submitTicketFixed}
                item={ticObj}
            />
        </div>
    );
};

TicketViewDetails.propTypes = {
    ticObj: PropTypes.object.isRequired,
};
