
import { fetchWithAuth } from "../../utils/api";
import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { Tooltip } from "antd";


export default function ViewVisit({ viewObj }) {

    const [viewLoading, setViewLoading] = useState(false);
    const [viewData, setViewData] = useState([]);

    useEffect(() => {
        if (viewObj === null || viewObj === undefined) return;
        const fetchViewEditData = async () => {
            setViewLoading(true);
            try {
                const response = await fetchWithAuth(`visitor/getReqPassById?RequestId=${viewObj.RequestId}`, {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                });
                if (response.ok) {
                    const data = await response.json();
                    setViewData(data.ResultData);
                } else {
                    console.error('Failed to fetch attendees data:', response.statusText);
                }
            } catch (error) {
                console.error('Error fetching attendees data:', error.message);
            } finally {
                setViewLoading(false);
            }
        };

        fetchViewEditData();
    }, [viewObj]);

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();

        return `${day}-${month}-${year}`;
    };

    const formatDateTime = (dateString, timeString) => {
        if (!dateString) return "Invalid Date";

        const date = new Date(dateString);

        let hours = "00";
        let minutes = "00";

        if (timeString && timeString.match(/T(\d{2}):(\d{2})/)) {
            const timeMatch = timeString.match(/T(\d{2}):(\d{2})/);
            hours = timeMatch[1];
            minutes = timeMatch[2];
        }

        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const year = date.getFullYear();

        return `${day}-${month}-${year} ${hours}:${minutes}`;
    };

    const INVALID_STATUSES = ["DRAFT", "REJECTED", "CANCELED"];


    return (
        <div
            className="offcanvas offcanvas-end"
            tabIndex="-1"
            id="offcanvasRightView"
            aria-labelledby="offcanvasRightLabel"
        >
            <style>
                {`
                    .pass-badge:hover {
                        transform: scale(1.05);
                    }

                .pass-badge {
                background: linear-gradient(135deg, #0d6efd, #0dcaf0);
                color: #fff;
                font-size: 0.7rem;
                font-weight: 700;
                letter-spacing: 0.6px;
                padding: 6px 10px;
                border-radius: 20px;
                white-space: nowrap;
                box-shadow: 0 4px 12px rgba(13,110,253,0.25);
            }

            .pass-blurred {
                filter: blur(3px);
                opacity: 0.6;
                cursor: not-allowed;
                user-select: none;
            }

                #offcanvasRightView {
                    width: 90%;
                }
                @media (min-width: 768px) {  
                    #offcanvasRightView { width: 55% !important; }
                }
                @media (min-width: 1200px) {  
                    #offcanvasRightView { width: 40% !important; }
                }

            .info-card {
            background-color: #f8f9fa;
            border-radius: 12px;
            }

            .attendee-card {
            transition: all 0.3s ease;
            }

            .attendee-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 6px 14px rgba(0, 0, 0, 0.08);
            }

            .attendee-info {
            font-size: 0.9rem;
            color: #555;
            }

            .info-row {
            display: flex;
            align-items: center;
            margin-bottom: 0.4rem;
            word-break: break-word;
            }

            .section-title h5 {
            font-weight: 600;
            color: #333;
            }

            @media (max-width: 768px) {
            .attendee-card {
                padding: 1rem;
            }

            .info-row {
                font-size: 0.9rem;
            }
        }

      .info-card:hover {
        transform: translateY(-3px);
        box-shadow: 0 4px 10px rgba(0,0,0,0.08);
      }

      .info-item {
        display: flex;
        justify-content: space-between;
        flex-wrap: wrap;
        padding: 0.25rem 0;
        border-bottom: 1px dashed #eaeaea;
      }

      .info-item:last-child {
        border-bottom: none;
      }

      .info-key {
        font-weight: 600;
        color: #555;
      }

      .info-value {
        font-weight: 500;
        color: #222;
      }

      .blink-badge {
        animation: blink 1s infinite;
      }

      @keyframes blink {
        0% { opacity: 1; }
        50% { opacity: 0.4; }
        100% { opacity: 1; }
      }
    `}
            </style>

            {/* Header */}
            <div className="offcanvas-header d-flex justify-content-between align-items-center border-bottom">
                <h5 className="fw-bold mb-0">
                    View Visit <span className="ms-1 text-primary">({viewObj?.AutoIncNo})</span>
                </h5>

                <div className="d-flex align-items-center gap-2">
                    {/* <span
                        className={`badge ${getStatusBadgeClass(viewObj?.Status)} border border-${getStatusBadgeBorderClass(viewObj?.Status)} blink-badge`}
                    >
                        {viewObj?.Status}
                    </span> */}
                    <span
                        className={`badge border ${viewObj?.Status === "DRAFT"
                            ? "badge-light-dark border-dark"
                            : viewObj?.Status === "APPROVED"
                                ? "badge-light-info border-info"
                                : viewObj?.Status === "REJECTED"
                                    ? "badge-light-warning border-warning"
                                    : viewObj?.Status === "CHECKEDOUT"
                                        ? "badge-light-secondary border-secondary"
                                        : viewObj?.Status === "CANCELED"
                                            ? "badge-light-danger border-danger"
                                            : viewObj?.Status === "COMPLETED"
                                                ? "badge-light-success border-success"
                                                : "badge-dark border-dark"
                            } blink-badge`}
                    >
                        {viewObj?.Status}
                    </span>
                    <button
                        type="button"
                        className="btn-close text-reset"
                        data-bs-dismiss="offcanvas"
                        aria-label="Close"
                    ></button>
                </div>
            </div>

            {/* Body */}
            <div
                className="offcanvas-body"
                style={{
                    overflowY: "auto",
                    paddingBottom: "2rem",
                    maxHeight: "calc(100vh - 100px)",
                }}
            >
                {viewLoading ? (
                    <p className="text-center my-4">Loading...</p>
                ) : (
                    <>
                        {/* General Info */}
                        <div className="card">
                            <div className="p-3">
                                <div className="section-title">
                                    <i className="bi bi-info-circle text-primary"></i> General Info
                                </div>

                                <div className="info-item">
                                    <span className="info-key">Requested Date</span>
                                    <span className="info-value">{formatDate(viewData[0]?.RequestDate)}</span>
                                </div>

                                <div className="info-item">
                                    <span className="info-key">Meeting Date</span>
                                    <span className="info-value">
                                        {formatDateTime(viewData[0]?.MeetingDate, viewData[0]?.MeetingTime)}
                                    </span>
                                </div>

                                <div className="info-item">
                                    <span className="info-key">Visitor Type</span>
                                    <span className="info-value">{viewObj?.VisitorTypeName || "N/A"}</span>
                                </div>

                                {viewData?.[0]?.VisitorType === 3 && (
                                    <div className="info-item">
                                        <span className="info-key">Expiry Date</span>
                                        <span className="info-value">{formatDate(viewData[0]?.ExpiryDate)}</span>
                                    </div>
                                )}

                                <div className="info-item">
                                    <span className="info-key">Unit</span>
                                    <span className="info-value">{viewObj?.UnitName || "N/A"}</span>
                                </div>
                            </div>
                        </div>

                        {/* Remarks */}
                        <div className="card my-3">
                            <div className="p-3">
                                <div className="section-title">
                                    <i className="bi bi-chat-dots text-primary"></i> Remarks
                                </div>
                                <p className="mb-0 text-muted">
                                    {viewData[0]?.VisitorsRemarks || "No remarks available."}
                                </p>
                            </div>
                        </div>

                        {/* Attendees */}
                        {viewData?.length > 0 && (
                            <div className="row p-3">
                                {viewData?.length > 0 && (
                                    <div className="card p-3">
                                        <div className="section-title mb-3 d-flex align-items-center">
                                            <i className="bi bi-people me-2 text-primary fs-5"></i>
                                            <h5 className="mb-0">Attendees</h5>
                                        </div>

                                        <div className="row">
                                            {viewData.map((attendee, index) => (
                                                <div key={index} className="col-12 col-md-6 col-lg-6 mb-3">
                                                    <div className="attendee-card p-3 h-100 shadow-sm rounded bg-white">
                                                    <div className="d-flex justify-content-between align-items-start mb-2 border-bottom border-info pb-2 w-100">
    <div>
        <div className="d-flex align-items-center mb-1">
            <i className="bi bi-person-circle text-primary fs-4 me-2"></i>
            <h6 className="mb-0 fw-semibold text-dark">{attendee.Name}</h6>
        </div>
        <small className="text-muted ms-4">
            {attendee.Designation || "—"} @ {attendee.CompanyName || "—"}
        </small>
    </div>

    {attendee.Id && (
        <Tooltip
            title={
                INVALID_STATUSES.includes(attendee.Status?.toUpperCase())
                    ? "Pass number is available only after approval"
                    : "Use this number for check-in / check-out"
            }
            placement="top"
        >
            <span
                className={`pass-badge ${
                    INVALID_STATUSES.includes(attendee.Status?.toUpperCase())
                        ? "pass-blurred"
                        : ""
                }`}
            >
                PASS #{attendee.Id}
            </span>
        </Tooltip>
    )}
</div>

                                                        <div className="attendee-info">
                                                            <div className="info-row">
                                                                <i className="bi bi-envelope me-2 text-dark"></i>
                                                                <span>{attendee.Email || "—"}</span>
                                                            </div>

                                                            <div className="info-row">
                                                                <i className="bi bi-telephone me-2 text-dark"></i>
                                                                <span>{attendee.Mobile || "—"}</span>
                                                            </div>

                                                            <div className="info-row">
                                                                <i className="bi bi-building me-2 text-dark"></i>
                                                                <span>{attendee.DeptName || "—"}</span>
                                                            </div>

                                                            <div className="info-row">
                                                                <i className="bi bi-car-front me-2 text-dark"></i>
                                                                <span>{attendee.VehicleInfo || "No vehicle info"}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    )
};

ViewVisit.propTypes = {
    viewObj: PropTypes.object.isRequired
};