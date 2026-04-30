import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { fetchWithAuth } from "../../utils/api";
import Swal from "sweetalert2";
import { Upload, message, Button, Input, Card, Row, Col, Typography } from "antd";
import { BASE_DOC_UPLOAD, BASE_IMG_UPLOAD } from "../Config/Config";
import { InboxOutlined } from "@ant-design/icons";


export default function ViewAlert({ alertObj }) {

    const [sessionUserData, setsessionUserData] = useState({});
    const [dataLoading, setDataLoading] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [alertsData, setAlertsData] = useState([]);
    const [selectedScheduledAlertId, setSelectedScheduledAlertId] = useState(null);

    const [showSubmitAlertModal, setShowSubmitAlertModal] = useState(false);
    const [alertScheduleData, setAlertScheduleData] = useState([]);
    const [alertViewModal, setAlertViewModal] = useState(false);

    const [comments, setComments] = useState("");
    const [closedDate, setClosedDate] = useState(null);
    const [proofUrl, setProofUrl] = useState("");
    const [loading, setLoading] = useState(false);
    const { Dragger } = Upload;
    const { TextArea } = Input;
    const { Title, Text } = Typography;

    useEffect(() => {
        const userDataString = sessionStorage.getItem("userData");
        if (userDataString) {
            const userData = JSON.parse(userDataString);
            setsessionUserData(userData);
        }
    }, []);

    const fetchAlerts = async () => {
        setDataLoading(true);
        try {
            const response = await fetchWithAuth(`Portal/getAlertsById?AlertId=${alertObj?.AlertId}`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });
            if (!response.ok) throw new Error("Network response was not ok");

            const data = await response.json();
            setDataLoading(false);
            setAlertsData(data.ResultData || []);
        } catch (error) {
            console.error("Failed to fetch UnitLocations:", error);
            setDataLoading(false);
            setAlertsData([]);
        }
    };

    useEffect(() => {
        if (alertObj && alertObj?.AlertId) {
            fetchAlerts();
        }
    }, [alertObj]);

    const handleDeleteAlert = async (scheduledAlertId, scheduledDate) => {
        const formattedDate = new Date(scheduledDate).toLocaleDateString("en-GB"); // dd-mm-yyyy

        const result = await Swal.fire({
            title: 'Are you sure?',
            text: `You are about to delete the alert scheduled on ${formattedDate}.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, delete it!',
            cancelButtonText: 'No, cancel',
        });

        if (!result.isConfirmed) return; // user cancelled

        try {
            setDeleteLoading(true);

            const payload = {
                UpdatedBy: sessionUserData?.Id,
                ScheduledAlertId: scheduledAlertId
            };

            const response = await fetchWithAuth(`Portal/InactiveScheduledAlerts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            setDeleteLoading(false);

            if (data.ResultData.Status === 'Success') {
                // ✅ Show Ant Design message
                message.success('The scheduled alert has been removed.');

                // ✅ Remove deleted alert from table
                setAlertsData(prev => prev.filter(a => a.ScheduledAlertId !== scheduledAlertId));
            } else {
                // Use Swal for failure
                Swal.fire('Error!', data.ResultData.Message || 'Failed to delete the alert.', 'error');
            }
        } catch (error) {
            setDeleteLoading(false);
            Swal.fire('Error!', error.message || 'Something went wrong.', 'error');
        }
    };

    const handleUpload = async ({ file }) => {
        if (file.size > 2 * 1024 * 1024) {
            // Use SweetAlert (swal) for alert. If using Swal from 'sweetalert2', call:
            Swal.fire({
                icon: 'error',
                title: 'File too large',
                text: 'File must be less than 2MB',
            });
            // If using older swal library, use:
            // swal("File too large", "File must be less than 2MB", "error");
            return; // Prevent upload
        }
        try {
            setLoading(true);
            const formData = new FormData();

            // Determine file type
            const ext = file.name.split(".").pop().toLowerCase();
            const isDoc = ["pdf", "doc", "docx", "xls", "xlsx"].includes(ext);

            // Set correct form key
            const keyName = isDoc ? "DocumentUrl" : "ImageUrl";
            formData.append(keyName, file);

            // Correct API endpoint
            const uploadUrl = isDoc
                ? `${BASE_DOC_UPLOAD}`
                : `${BASE_IMG_UPLOAD}`;

            // API call
            const res = await fetch(uploadUrl, { method: "POST", body: formData });
            const data = await res.json();

            // ✅ Parse response correctly
            if (data?.success && data?.data?.url) {
                setProofUrl(data.data.url);
                message.success(`${file.name} uploaded successfully`);
            } else {
                throw new Error(data?.message || "Invalid response");
            }
        } catch (err) {
            console.error(err);
            message.error("Upload failed");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (showSubmitAlertModal) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
    }, [showSubmitAlertModal]);

    const handleCloseSubmit = async () => {
        if (!comments) {
            Swal.fire({
                icon: "warning",
                title: "Missing Fields",
                text: "Please fill all required fields before submitting.",
                confirmButtonColor: "#3085d6",
            });
            return;
        }

        setLoading(true);
        try {
            const payload = {
                OrgId: sessionUserData?.OrgId,
                JsonData: {
                    ScheduledAlertId: selectedScheduledAlertId,
                    ProofUrl: proofUrl || "",
                    Comments: comments,
                    SubmittedBy: sessionUserData?.Id,
                    AlertCode: alertObj?.AutoIncNo,
                    PocId: alertObj?.PocId,
                }
            };

            const res = await fetchWithAuth(`Portal/SubmitAlert`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = await res.json();

            if (data?.success) {
                Swal.fire({
                    icon: "success",
                    title: "Success!",
                    text: "Alert submitted successfully.",
                    confirmButtonColor: "#28a745",
                }).then(() => {
                    setComments("");
                    setClosedDate(null);
                    setProofUrl("");
                    fetchAlerts();
                })
            } else {
                Swal.fire({
                    icon: "error",
                    title: "Failed!",
                    text: data?.message || "Failed to close alert.",
                    confirmButtonColor: "#d33",
                });
            }
        } catch (err) {
            Swal.fire({
                icon: "error",
                title: "Something went wrong!",
                text: "Please try again later.",
                confirmButtonColor: "#d33",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleCloseConfirmation = (item) => {
        Swal.fire({
            title: `<strong>Close Alert</strong>`,
            html: `
                        <div style="text-align:left;">
                          <p><b>Alert Code:</b> ${item.AutoIncNo || "N/A"}</p>
                          <p><b>Alert Title:</b> ${item.AlertTitle || "N/A"}</p>
                          <p class="text-muted" style="font-size:0.9rem;">Are you sure you want to close this alert?</p>
                        </div>
                      `,
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: `<i class="bi bi-patch-check fs-4 me-1 text-white"></i>Close Alert`,
            cancelButtonText: `<i class="bi bi-x-lg text-white me-1"></i>Cancel`,
            confirmButtonColor: "#198754",
            cancelButtonColor: "#6c757d",
            reverseButtons: true,
            focusCancel: true,
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const payload = {
                        ScheduledAlertId: item.ScheduledAlertId,
                        ClosedDate: new Date().toISOString().split("T")[0], // YYYY-MM-DD
                        UpdatedBy: sessionUserData?.Id,
                    };

                    const res = await fetchWithAuth(`Portal/CloseAlert`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(payload),
                    });

                    const data = await res.json();

                    if (data?.ResultData?.Status === "Success") {
                        Swal.fire({
                            icon: "success",
                            title: "Alert Closed!",
                            text: "The alert has been successfully closed.",
                            confirmButtonColor: "#198754",
                        });
                        // Optionally refresh data or UI
                        fetchAlerts();
                    } else {
                        Swal.fire({
                            icon: "error",
                            title: "Failed",
                            text: data?.ResultData?.Message || "Something went wrong!",
                        });
                    }
                } catch (error) {
                    console.error(error);
                    Swal.fire({
                        icon: "error",
                        title: "Error",
                        text: "Failed to close the alert. Please try again.",
                    });
                }
            }
        });
    };

    const StatusIcon = ({ label, value }) => (
        <div>
            <div className="mb-1">
                {value ? (
                    <i className="fa-solid fa-check text-success fs-5"></i>
                ) : (
                    <i className="fa-solid fa-xmark text-danger fs-5"></i>
                )}
            </div>
            <small className="text-muted">{label}</small>
        </div>
    );

    return (
        <div
            className="offcanvas offcanvas-end"
            tabIndex="-1"
            id="offcanvasRightViewMasterAlert"
            aria-labelledby="offcanvasRightLabel"
            style={{ width: "90%" }}
        >
            <style>
                {`
                    @media (min-width: 768px) { /* Medium devices and up (md) */
                        #offcanvasRightViewMasterAlert {
                            width: 50% !important;
                        }
                    }
                    .btn-icon {
                        width: 32px;
                        height: 32px;
                        padding: 0;
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                    }

                    .btn-icon:hover {
                        transform: scale(1.05);
                    }
                `}
            </style>
            <form autoComplete="off">
                <div className="offcanvas-header d-flex justify-content-between align-items-center">
                    <h5 id="offcanvasRightLabel" className="mb-0">View Alert Details <span className="fw-bold text-primary">({alertObj?.AutoIncNo})</span></h5>
                    <div className="d-flex align-items-center">
                        <button
                            type="button"
                            className="btn-close"
                            data-bs-dismiss="offcanvas"
                            aria-label="Close"
                        ></button>
                    </div>
                </div>
                <div className="offcanvas-body" style={{
                    flex: 1,
                    overflowY: 'auto',
                    paddingBottom: '2rem',
                    maxHeight: 'calc(100vh - 100px)'
                }}>
                    <div className="row g-3">
                        <div className="col-12 col-md-6">
                            <div className="p-2 border rounded bg-light">
                                <h6 className="text-primary mb-1"><i className="fa-solid fa-bell me-2"></i>Alert Title</h6>
                                <p className="mb-0 fw-semibold">{alertObj?.AlertTitle || "N/A"}</p>
                            </div>
                        </div>

                        <div className="col-12 col-md-3">
                            <div className="p-2 border rounded bg-light">
                                <h6 className="text-success mb-1"><i className="fa-solid fa-list-check me-2"></i>Alert Type</h6>
                                <p className="mb-0">{alertObj?.TypeName || "N/A"}</p>
                            </div>
                        </div>
                        <div className="col-12 col-md-3">
                            <div className="p-2 border rounded bg-light">
                                <h6 className="text-warning mb-1"><i className="fa-solid fa-repeat me-2"></i>Occurrence</h6>
                                <p className="mb-0">{alertObj?.OcurrenceTypeNames || "N/A"}</p>
                            </div>
                        </div>

                        <div className="col-6">
                            <div className="p-2 border rounded bg-light">
                                <h6 className="text-info mb-1"><i className="fa-solid fa-users me-2"></i>To User</h6>
                                <div className="d-flex flex-wrap gap-2">
                                    {alertObj?.ToUsers
                                        ? alertObj.ToUsers.split(",").map((email, index) => (
                                            <span
                                                key={index}
                                                className="badge bg-light text-dark border"
                                            >
                                                {email.trim()}
                                            </span>
                                        ))
                                        : "N/A"}
                                </div>
                            </div>
                        </div>
                        <div className="col-6">
                            <div className="p-2 border rounded bg-light">
                                <h6 className="text-success mb-1"><i className="fa-solid fa-users me-2"></i>POC for Clouser</h6>
                                <p className="mb-0">{alertObj?.POCName || "N/A"}</p>
                            </div>
                        </div>

                        {/* Message */}
                        <div className="col-12">
                            <div className="p-2 border rounded bg-light">
                                <h6 className="text-danger mb-1"><i className="fa-solid fa-message me-2"></i>Message</h6>
                                <p className="mb-0">{alertObj?.Message || "N/A"}</p>
                            </div>
                        </div>

                        {/* Start Date & End Date */}
                        {alertObj?.OcurrenceType && alertObj?.OcurrenceType !== 1 && (
                            <>
                                <div className="col-12 col-md-6">
                                    <div className="p-2 border rounded bg-light">
                                        <h6 className="text-primary mb-1"><i className="fa-solid fa-calendar-days me-2"></i>Start Date</h6>
                                        <p className="mb-0">{alertObj.StartDate ? new Date(alertObj.StartDate).toLocaleDateString("en-GB") : "N/A"}</p>
                                    </div>
                                </div>
                                <div className="col-12 col-md-6">
                                    <div className="p-2 border rounded bg-light">
                                        <h6 className="text-primary mb-1"><i className="fa-solid fa-calendar-check me-2"></i>End Date</h6>
                                        <p className="mb-0">{alertObj.EndDate ? new Date(alertObj.EndDate).toLocaleDateString("en-GB") : "N/A"}</p>
                                    </div>
                                </div>
                            </>
                        )}

                        {[1, 5, 6, 7].includes(alertObj?.OcurrenceType) && (
                            <div className="col-12">
                                <div className="p-2 border rounded bg-light">
                                    <h6 className="text-primary mb-1"><i className="fa-solid fa-calendar-day me-2"></i>Scheduled Date</h6>
                                    <p className="mb-0">{alertObj.ScheduledDate ? new Date(alertObj.ScheduledDate).toLocaleDateString("en-GB") : "N/A"}</p>
                                </div>
                            </div>
                        )}

                    </div>
                    <div className="table-responsive my-4 d-none d-md-block" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                        <table className="table table-bordered table-hover align-middle mb-0">
                            <thead className="table-light sticky-top">
                                <tr>
                                    <th>#</th>
                                    <th className="text-nowrap">Date</th>
                                    <th>Day</th>
                                    <th className="text-center">Sent</th>
                                    <th className="text-center">Submitted</th>
                                    <th className="text-center">Closed</th>
                                    <th className="text-center">Status</th>
                                    <th className="text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {dataLoading ? (
                                    <tr>
                                        <td colSpan={10} className="text-center py-3">
                                            <div className="spinner-border text-primary" role="status">
                                                <span className="visually-hidden">Loading...</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : alertsData && alertsData.length > 0 ? (
                                    alertsData.map((alert, indx) => {
                                        const dateObj = new Date(alert.ScheduledDate);
                                        const formattedDate = dateObj.toLocaleDateString("en-GB"); // dd/mm/yyyy
                                        const [day, month, year] = formattedDate.split("/");
                                        const finalDate = `${day}-${month}-${year}`;

                                        const dayName = dateObj.toLocaleDateString("en-US", { weekday: "long" });

                                        const sentTriggeredIcon = alert.IsTriggered ? (
                                            <i className="fa-solid fa-check text-success fs-5"></i>
                                        ) : (
                                            <i className="fa-solid fa-xmark text-danger fs-5"></i>
                                        );
                                        const isSubmittedIcon = alert.IsSubmitted ? (
                                            <i className="fa-solid fa-check text-success fs-5"></i>
                                        ) : (
                                            <i className="fa-solid fa-xmark text-danger fs-5"></i>
                                        );
                                        const isClosedIcon = alert.IsClosed ? (
                                            <i className="fa-solid fa-check text-success fs-5"></i>
                                        ) : (
                                            <i className="fa-solid fa-xmark text-danger fs-5"></i>
                                        );

                                        // Status badge
                                        const getStatusBadge = (isClosed) => {
                                            if (isClosed === true) {
                                                return <span className="badge badge-light-success">Closed</span>;
                                            } else if (isClosed === false) {
                                                return <span className="badge badge-light-info">Active</span>;
                                            } else {
                                                return <span className="badge badge-secondary">Unknown</span>;
                                            }
                                        };

                                        return (
                                            <tr key={indx}>
                                                <td>{indx + 1}</td>
                                                <td className="text-nowrap">{finalDate}</td>
                                                <td>{dayName}</td>
                                                <td className="text-center">{sentTriggeredIcon}</td>
                                                <td className="text-center">{isSubmittedIcon}</td>
                                                <td className="text-center">{isClosedIcon}</td>
                                                <td className="text-center">{getStatusBadge(alert.IsClosed)}</td>
                                                <td className="text-center">
                                                    <div className="d-flex justify-content-center gap-2">
                                                        <button
                                                            className="btn btn-icon btn-sm btn-light-info"
                                                            type="button"
                                                            title="View details"
                                                            onClick={() => { setAlertScheduleData(alert); setAlertViewModal(true) }}
                                                        >
                                                            <i className="bi bi-eye fs-5"></i>
                                                        </button>
                                                        <button
                                                            className="btn btn-icon btn-sm btn-light-primary"
                                                            type="button"
                                                            title="Mark as complete"
                                                            onClick={() => {
                                                                if (
                                                                    alert.IsTriggered &&
                                                                    !alert.IsSubmitted &&
                                                                    !alert.IsClosed
                                                                ) {
                                                                    setSelectedScheduledAlertId(alert.ScheduledAlertId);
                                                                    setShowSubmitAlertModal(true);
                                                                }
                                                            }}
                                                            disabled={
                                                                deleteLoading ||
                                                                !alert.IsTriggered ||
                                                                alert.IsSubmitted ||
                                                                alert.IsClosed
                                                            }
                                                        >
                                                            <i className="bi bi-clipboard-check fs-5"></i>
                                                        </button>
                                                        <button
                                                            className="btn btn-icon btn-sm btn-light-success"
                                                            type="button"
                                                            title="Close the alert"
                                                            onClick={() =>
                                                                alert.IsTriggered && alert.IsSubmitted && !alert.IsClosed &&
                                                                handleCloseConfirmation(alert)
                                                            }
                                                            disabled={deleteLoading || !(alert.IsTriggered && alert.IsSubmitted && !alert.IsClosed)}
                                                        >
                                                            <i className="bi bi-patch-check fs-5"></i>
                                                        </button>

                                                        <button
                                                            className="btn btn-icon btn-sm btn-light-danger"
                                                            type="button"
                                                            title="Delete"
                                                            onClick={() =>
                                                                !alert.IsTriggered &&
                                                                handleDeleteAlert(alert.ScheduledAlertId, alert.ScheduledDate)
                                                            }
                                                            disabled={deleteLoading || alert.IsTriggered || alertsData.length === 1}
                                                        >
                                                            <i className="bi bi-trash3 fs-5"></i>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={10} className="text-center text-muted py-3">
                                            No alerts found
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="d-md-none my-3">
                        {dataLoading ? (
                            <div className="text-center py-4">
                                <div className="spinner-border text-primary" />
                            </div>
                        ) : alertsData && alertsData.length > 0 ? (
                            alertsData.map((alert, indx) => {
                                const dateObj = new Date(alert.ScheduledDate);
                                const dayName = dateObj.toLocaleDateString("en-US", { weekday: "long" });
                                const finalDate = dateObj.toLocaleDateString("en-GB").replaceAll("/", "-");

                                const statusBadge = alert.IsClosed
                                    ? "success"
                                    : alert.IsTriggered
                                        ? "info"
                                        : "secondary";

                                return (
                                    <div
                                        key={indx}
                                        className="card mb-3 shadow-sm border-0"
                                        style={{
                                            background: "linear-gradient(135deg, #f8f9ff, #eef2ff)",
                                            borderRadius: "12px",
                                        }}
                                    >
                                        <div className="card-body p-3">
                                            {/* Header */}
                                            #{indx + 1}
                                            <div className="d-flex justify-content-between align-items-center mb-2">
                                                <div>
                                                    <h6 className="fw-bold mb-0 text-primary">
                                                        {finalDate}
                                                    </h6>
                                                    <small className="text-muted">{dayName}</small>
                                                </div>
                                                <span className={`badge bg-${statusBadge}`}>
                                                    {alert.IsClosed ? "Closed" : "Active"}
                                                </span>
                                            </div>

                                            {/* Status icons */}
                                            <div className="d-flex justify-content-between text-center my-3">
                                                <StatusIcon label="Sent" value={alert.IsTriggered} />
                                                <StatusIcon label="Submitted" value={alert.IsSubmitted} />
                                                <StatusIcon label="Closed" value={alert.IsClosed} />
                                            </div>

                                            {/* Actions */}
                                            <div className="d-flex justify-content-between gap-2 mt-3">
                                                <button
                                                    className="btn btn-light-info btn-sm w-100"
                                                    onClick={() => {
                                                        setAlertScheduleData(alert);
                                                        setAlertViewModal(true);
                                                    }}
                                                    type="button"
                                                >
                                                    <i className="bi bi-eye me-1"></i> View
                                                </button>

                                                <button
                                                    className="btn btn-light-primary btn-sm w-100"
                                                    disabled={
                                                        deleteLoading ||
                                                        !alert.IsTriggered ||
                                                        alert.IsSubmitted ||
                                                        alert.IsClosed
                                                    }
                                                    onClick={() => {
                                                        setSelectedScheduledAlertId(alert.ScheduledAlertId);
                                                        setShowSubmitAlertModal(true);
                                                    }}
                                                    type="button"
                                                >
                                                    <i className="bi bi-clipboard-check me-1"></i> Submit
                                                </button>

                                                <button
                                                    className="btn btn-light-success btn-sm w-100"
                                                    disabled={
                                                        deleteLoading ||
                                                        !(alert.IsTriggered && alert.IsSubmitted && !alert.IsClosed)
                                                    }
                                                    onClick={() => handleCloseConfirmation(alert)}
                                                    type="button"
                                                >
                                                    <i className="bi bi-patch-check me-1"></i> Close
                                                </button>

                                                <button
                                                    className="btn btn-light-danger btn-sm w-100"
                                                    disabled={
                                                        deleteLoading || alert.IsTriggered || alertsData.length === 1
                                                    }
                                                    onClick={() =>
                                                        handleDeleteAlert(alert.ScheduledAlertId, alert.ScheduledDate)
                                                    }
                                                    type="button"
                                                >
                                                    <i className="bi bi-trash3 me-1"></i> Delete
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="text-center text-muted py-4">
                                No alerts found
                            </div>
                        )}
                    </div>

                </div>
            </form>

            {alertViewModal && (
                <div className="custom-modal-backdrop">
                    <div className="custom-modal custom-modal-lg animate-scale-in p-4">
                        <div className="modal-header">
                            <h5 className="modal-title">
                                Alert Details
                                <span className="fw-bold text-primary ms-2">
                                    ({alertScheduleData?.AutoIncNo})
                                </span>
                            </h5>

                            <button
                                type="button"
                                className="btn-close"
                                onClick={() => setAlertViewModal(false)}
                            ></button>
                        </div>
                        <div className="offcanvas-body" style={{
                            flex: 1,
                            overflowY: 'auto',
                            paddingBottom: '2rem',
                            maxHeight: 'calc(100vh - 100px)'
                        }}>
                            <div className="p-2">
                                <div
                                    className="mt-4 p-3 border rounded bg-light position-relative"
                                    style={{
                                        boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
                                    }}
                                >
                                    {alertScheduleData.ProofUrl && (
                                        <a
                                            href={alertScheduleData.ProofUrl}
                                            download
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="btn btn-sm btn-light-primary position-absolute top-0 end-0 m-2 d-inline-flex align-items-center gap-2"
                                            style={{
                                                borderRadius: "6px",
                                                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                                            }}
                                            title="Download Attachment"
                                        >
                                            <i className="fa-solid fa-download fa-bounce"></i>
                                            Download
                                        </a>
                                    )}
                                    <h6 className="fw-bold text-primary mb-6 d-flex align-items-center gap-2">
                                        <i className="fa-solid fa-circle-check text-success"></i>
                                        Submitted Details
                                    </h6>
                                    <div className="mb-2 d-flex align-items-center">
                                        <i className="fa-solid fa-calendar-check text-warning me-2"></i>
                                        <span className="fw-semibold me-1">Submitted Date:</span>
                                        <span className="text-dark">
                                            {alertScheduleData.SubmittedOn
                                                ? new Date(alertScheduleData.SubmittedOn).toLocaleDateString("en-GB", {
                                                    day: "2-digit",
                                                    month: "short",
                                                    year: "numeric",
                                                })
                                                : "N/A"}
                                        </span>
                                    </div>
                                    <div className="mb-2 d-flex align-items-center">
                                        <i className="fa-solid fa-user text-primary me-2"></i>
                                        <span className="fw-semibold me-1">Submitted By:</span>
                                        <span className="text-dark">
                                            {alertScheduleData?.SubmittedPerson || 'N/A'}
                                        </span>
                                    </div>

                                    {alertScheduleData && alertScheduleData?.IsClosed && (
                                        <div className="mb-2 d-flex align-items-center">
                                            <i className="fa-solid fa-calendar-check text-success me-2"></i>
                                            <span className="fw-semibold me-1">Closed Date:</span>
                                            <span className="text-dark">
                                                {alertScheduleData.ClosedDate
                                                    ? new Date(alertScheduleData.ClosedDate).toLocaleDateString("en-GB", {
                                                        day: "2-digit",
                                                        month: "short",
                                                        year: "numeric",
                                                    })
                                                    : "N/A"}
                                            </span>
                                        </div>
                                    )}

                                    <div className="mb-0">
                                        <i className="fa-solid fa-comment-dots text-info me-2"></i>
                                        <span className="fw-semibold me-1">Comments:</span>
                                        <p
                                            className="text-muted mt-1 mb-0"
                                            style={{
                                                whiteSpace: "pre-wrap",
                                                background: "#f9f9f9",
                                                borderRadius: "6px",
                                                padding: "0.5rem 0.75rem",
                                                fontSize: "0.9rem",
                                            }}
                                        >
                                            {alertScheduleData.Comments || "No comments available."}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showSubmitAlertModal && (
                <div className="custom-modal-backdrop">
                    <div className="custom-modal custom-modal-lg animate-scale-in p-4">

                        {/* Header */}
                        <div className="modal-header">
                            <h5 className="modal-title">
                                Submit Alert
                                <span className="fw-bold text-primary ms-2">
                                    ({alertObj?.AutoIncNo})
                                </span>
                            </h5>

                            <button
                                type="button"
                                className="btn-close"
                                onClick={() => setShowSubmitAlertModal(false)}
                            ></button>
                        </div>

                        {/* Body */}
                        <div className="offcanvas-body" style={{
                            flex: 1,
                            overflowY: 'auto',
                            paddingBottom: '2rem',
                            maxHeight: 'calc(100vh - 100px)'
                        }}>
                            <div className="alert alert-warning p-2 mb-4 sticky-to">
                                ⚠️ Uplaod file must be less than 2MB.
                            </div>
                            <div className="p-2">
                                <Card
                                    bordered={false}
                                    className="shadow-sm mb-4"
                                    style={{ borderRadius: 12 }}
                                >
                                    <Title level={4} style={{ fontSize: 18, marginBottom: 16 }}>
                                        Alert Details
                                    </Title>

                                    <Row gutter={[16, 12]}>
                                        {/* <Col xs={24} sm={12}>
                                                    <Text type="secondary">Machine Name</Text>
                                                    <div className="fw-semibold text-dark">{alertObj?.MachineName}</div>
                                                </Col> */}
                                        <Col xs={24} sm={12}>
                                            <Text type="secondary">Alert Title</Text>
                                            <div className="fw-semibold text-dark">{alertObj?.AlertTitle}</div>
                                        </Col>
                                        <Col xs={24} sm={12}>
                                            <Text type="secondary">Created By</Text>
                                            <div className="fw-semibold text-dark">{alertObj?.Name}</div>
                                        </Col>
                                        <Col xs={24}>
                                            <Text type="secondary">Description</Text>
                                            <div className="fw-semibold text-dark small">{alertObj?.Message}</div>
                                        </Col>
                                    </Row>
                                </Card>

                                <Card
                                    bordered={false}
                                    className="shadow-sm"
                                    style={{ borderRadius: 12 }}
                                >
                                    <Title level={4} style={{ fontSize: 18, marginBottom: 16 }}>
                                        Submit details
                                    </Title>
                                    <Row gutter={[16, 12]}>
                                        <Col xs={24}>
                                            <label className="form-label fw-semibold">Upload Proof</label>
                                            <Dragger
                                                customRequest={handleUpload}
                                                multiple={false}
                                                showUploadList={false}
                                                disabled={loading}
                                                style={{ padding: "12px" }}
                                            >
                                                <p className="ant-upload-drag-icon mb-1">
                                                    <InboxOutlined />
                                                </p>
                                                <p className="ant-upload-text">Click or drag to upload file</p>
                                                <p className="ant-upload-hint small">
                                                    Supports PDF, DOC, XLS, PNG, JPG, JPEG
                                                </p>
                                            </Dragger>
                                            {proofUrl && (
                                                <div className="mt-2 small text-success">
                                                    ✅ Uploaded:{" "}
                                                    <a href={proofUrl} target="_blank" rel="noreferrer">
                                                        View file
                                                    </a>
                                                </div>
                                            )}
                                        </Col>

                                        <Col xs={24} style={{ marginTop: 50 }}>
                                            <label className="form-label fw-semibold">Comments<span className="text-danger fw-bold">*</span></label>
                                            <TextArea
                                                rows={3}
                                                placeholder="Enter your comments..."
                                                value={comments}
                                                onChange={(e) => setComments(e.target.value)}
                                                disabled={loading}
                                            />
                                        </Col>

                                        <Col xs={24} className="text-end">
                                            <Button
                                                type="primary"
                                                onClick={handleCloseSubmit}
                                                loading={loading}
                                                disabled={loading}
                                                style={{ minWidth: 120 }}
                                            >
                                                Submit
                                            </Button>
                                        </Col>
                                    </Row>
                                </Card>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style>
                {`
    .custom-modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1055;
}

.custom-modal {
    background: #fff;
    width: 95%;
    max-width: 900px;
    border-radius: 12px;
    box-shadow: 0 25px 60px rgba(0,0,0,0.25);
    max-height: 90vh;
    display: flex;
    flex-direction: column;
}

.custom-modal-lg {
    max-width: 900px;
}

.modal-body {
    overflow-y: auto;
    padding: 1rem;
}

.animate-scale-in {
    animation: scaleIn 0.25s ease;
}

@keyframes scaleIn {
    from {
        opacity: 0;
        transform: scale(0.95);
    }
    to {
        opacity: 1;
        transform: scale(1);
    }
}

    `}
            </style>
        </div>

    );
}

ViewAlert.propTypes = {
    alertObj: PropTypes.object.isRequired,
};