import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { useNavigate } from 'react-router-dom';
import { fetchWithAuth } from "../../../utils/api";

export default function ViewMoreAlerts({ alertType, deptId, unitId }) {
    const navigate = useNavigate();

    const [sessionUserData, setSessionUserData] = useState({});
    const [dashLoading, setDashLoading] = useState(false);
    const [alertsData, setAlertsData] = useState([]);

    useEffect(() => {
        const userDataString = sessionStorage.getItem("userData");
        if (userDataString) {
            const userData = JSON.parse(userDataString);
            setSessionUserData(userData);
        } else {
            navigate("/");
        }
    }, [navigate]);

    const fetchDashData = async () => {
        setDashLoading(true);
        try {
            const response = await fetchWithAuth(`EDM/EDMDashboard?Id=${sessionUserData?.OrgId}&Typeno=${alertType}&DepartmentId=${deptId}&DocUnitId=${unitId}`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });
            if (response.ok) {
                const data = await response.json();
                const resultData = data.ResultData;
                setAlertsData(resultData || []);
            } else {
                console.error('Failed to fetch mcn tickets data:', response.statusText);
            }
        } catch (error) {
            console.error('Error fetching mcn tickets data:', error.message);
        } finally {
            setDashLoading(false);
        }
    };

    useEffect(() => {
        if (sessionUserData && sessionUserData?.OrgId && alertType) {
            fetchDashData();
        }
    }, [sessionUserData, alertType]);

    function formatDate(dateString) {
        if (!dateString) return "-";
        const date = new Date(dateString);
        const day = String(date.getDate()).padStart(2, "0");
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
    }


    return (
        <div
            className="offcanvas offcanvas-end"
            tabIndex="-1"
            id="offcanvasRightViewAlertsData"
            aria-labelledby="offcanvasRightLabel"
            style={{ width: "90%" }}
        >
            <style>
                {`
                    @media (min-width: 768px) {
                        #offcanvasRightViewAlertsData {
                        width: 80% !important;
                        }
                    }
                    .text-truncate-max {
                        max-width: 150px; /* Adjust based on your UI */
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        cursor: help; /* Visual hint that there is more text on hover */
                    }

                    /* Optional: Ensure table cells don't stretch */
                    .table td {
                        vertical-align: middle;
                    }
                `}
            </style>

            <form>
                <div className="offcanvas-header d-flex justify-content-between align-items-center mb-3">
                    <h5 id="offcanvasRightLabel" className="mb-0">
                        {alertsData && alertsData[0]?.Label
                            ? alertsData[0].Label.replace(/([a-z])([A-Z])/g, '$1 $2')
                            : ''} Alerts
                    </h5>

                    <div className="d-flex align-items-center">
                        <button
                            type="button"
                            className="btn-close"
                            data-bs-dismiss="offcanvas"
                            aria-label="Close"
                        ></button>
                    </div>
                </div>

                <div
                    className="offcanvas-body"
                    style={{
                        flex: 1,
                        overflowY: 'auto',
                        paddingBottom: '2rem',
                        maxHeight: 'calc(100vh - 100px)',
                        marginTop: '-2rem',
                    }}
                >
                    {dashLoading ? (
                        <div
                            className="d-flex justify-content-center align-items-center"
                            style={{ height: '300px' }}
                        >
                            <div
                                className="spinner-border text-primary"
                                role="status"
                                style={{ width: '3rem', height: '3rem' }}
                            >
                                <span className="visually-hidden">Loading...</span>
                            </div>
                        </div>
                    ) : alertsData?.length === 0 ? (
                        <div className="text-center text-muted py-4">No data available</div>
                    ) : (
                        <>
                            {/* Table view for md and up */}
                            <div className="table-responsive d-none d-md-block">
                                <table className="table table-hover table-bordered table-striped align-middle">
                                    <thead
                                        className="table-light"
                                        style={{
                                            position: 'sticky',
                                            top: 0,
                                            zIndex: 5,
                                            backgroundColor: '#f8f9fa',
                                        }}
                                    >
                                        <tr className="fw-bold">
                                            <th>#</th>
                                            <th>Code</th>
                                            <th>Doc</th>
                                            <th>Type</th>
                                            <th>Title</th>
                                            <th>Occurence</th>
                                            <th>Scheduled</th>
                                            <th>Created By</th>
                                            {alertType && alertType === 5 && (
                                                <th>Submitted By</th>
                                            )}
                                            <th className="text-center">Sent</th>
                                            <th className="text-center">Submitted</th>
                                            <th className="text-center">Closed</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Array.isArray(alertsData) && alertsData?.length > 0 ? (
                                            alertsData?.map((item, index) => (
                                                <tr key={index}>
                                                    <td>{index + 1}</td>
                                                    <td className="text-info fw-bold">{item.Col9}</td>
                                                    <td
                                                        className="text-primary fw-bold text-truncate-max"
                                                        title={item.Col5}
                                                    >
                                                        {item.Col5?.length > 15 ? `${item.Col5.substring(0, 24)}...` : item.Col5}
                                                    </td>
                                                    <td className="text-truncate-max" title={item.Col1}>
                                                        {item.Col1?.length > 15 ? `${item.Col1.substring(0, 15)}...` : item.Col1}
                                                    </td>
                                                    <td className="text-truncate-max" title={item.Col2}>
                                                        {item.Col2?.length > 15 ? `${item.Col2.substring(0, 19)}...` : item.Col2}
                                                    </td>
                                                    <td>{item.Col4}</td>
                                                    <td>{formatDate(item.Col6)}</td>
                                                    <td>{item.Col8}</td>
                                                    {alertType && alertType === 5 && (
                                                        <td>{item.Col13}</td>
                                                    )}
                                                    <td className="text-center">
                                                        {item.Col12 === "1" ? (
                                                            <i className="bi bi-check-circle-fill text-success"></i>
                                                        ) : (
                                                            <i className="bi bi-x-circle-fill text-danger"></i>
                                                        )}
                                                    </td>
                                                    <td className="text-center">
                                                        {item.Col11 === "1" ? (
                                                            <i className="bi bi-check-circle-fill text-success"></i>
                                                        ) : (
                                                            <i className="bi bi-x-circle-fill text-danger"></i>
                                                        )}
                                                    </td>
                                                    <td className="text-center">
                                                        {item.Col10 === "1" ? (
                                                            <i className="bi bi-check-circle-fill text-success"></i>
                                                        ) : (
                                                            <i className="bi bi-x-circle-fill text-danger"></i>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="7" className="text-center text-muted">
                                                    No data found
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Card view for mobile */}
                            <div className="d-md-none">
                                {Array.isArray(alertsData) && alertsData.length > 0 ? (
                                    alertsData.map((item, index) => (
                                        <div
                                            key={index}
                                            className="card mb-3 shadow-sm border-0"
                                            style={{ borderRadius: "12px" }}
                                        >
                                            <div className="card-body">

                                                {/* Header */}
                                                <div className="d-flex justify-content-between align-items-center mb-2">
                                                    <span className="fw-bold text-primary">#{index + 1}</span>
                                                    <span className="badge bg-light-primary text-primary">
                                                        {item.Col1}
                                                    </span>
                                                </div>

                                                {/* Code & Doc */}
                                                <div className="mb-1">
                                                    <strong className="text-muted">Code:</strong>{" "}
                                                    <span className="fw-semibold text-info">{item.Col9}</span>
                                                </div>

                                                <div className="mb-1">
                                                    <strong className="text-muted">Doc:</strong>{" "}
                                                    <span className="fw-semibold text-primary">{item.Col5}</span>
                                                </div>

                                                {/* Title */}
                                                <div className="mb-1">
                                                    <strong className="text-muted">Title:</strong>{" "}
                                                    <span>{item.Col2}</span>
                                                </div>

                                                {/* Occurrence */}
                                                <div className="mb-1">
                                                    <strong className="text-muted">Occurrence:</strong>{" "}
                                                    <span>{item.Col4}</span>
                                                </div>

                                                {/* Scheduled Date */}
                                                <div className="mb-1">
                                                    <strong className="text-muted">Scheduled:</strong>{" "}
                                                    <span>{formatDate(item.Col6)}</span>
                                                </div>

                                                {/* Created By */}
                                                <div className="mb-1">
                                                    <strong className="text-muted">Created By:</strong>{" "}
                                                    <span>{item.Col8 || "N/A"}</span>
                                                </div>

                                                {/* Submitted By (conditional, same as desktop) */}
                                                {alertType === 5 && (
                                                    <div className="mb-1">
                                                        <strong className="text-muted">Submitted By:</strong>{" "}
                                                        <span>{item.Col13 || "N/A"}</span>
                                                    </div>
                                                )}

                                                {/* Status row */}
                                                <div className="d-flex justify-content-between align-items-center mt-3 pt-2 border-top">
                                                    <div>
                                                        <small className="text-muted d-block">Sent</small>
                                                        {item.Col12 === "1" ? (
                                                            <i className="bi bi-check-circle-fill text-success"></i>
                                                        ) : (
                                                            <i className="bi bi-x-circle-fill text-danger"></i>
                                                        )}
                                                    </div>

                                                    <div>
                                                        <small className="text-muted d-block">Submitted</small>
                                                        {item.Col11 === "1" ? (
                                                            <i className="bi bi-check-circle-fill text-success"></i>
                                                        ) : (
                                                            <i className="bi bi-x-circle-fill text-danger"></i>
                                                        )}
                                                    </div>

                                                    <div>
                                                        <small className="text-muted d-block">Closed</small>
                                                        {item.Col10 === "1" ? (
                                                            <i className="bi bi-check-circle-fill text-success"></i>
                                                        ) : (
                                                            <i className="bi bi-x-circle-fill text-danger"></i>
                                                        )}
                                                    </div>
                                                </div>

                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-muted text-center">No alerts found.</div>
                                )}
                            </div>

                        </>
                    )}
                </div>
            </form>
        </div>
    );
}

ViewMoreAlerts.propTypes = {
    alertType: PropTypes.number.isRequired,
    deptId: PropTypes.number.isRequired,
    unitId: PropTypes.number.isRequired,
};
