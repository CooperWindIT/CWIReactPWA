import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { useNavigate } from 'react-router-dom';
import { fetchWithAuth } from "../../../utils/api";

export default function ViewMoreAlerts({ alertType }) {
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
            const response = await fetchWithAuth(`PMMS/PMMSDashboard?Id=${sessionUserData?.OrgId}&Typeno=${alertType}`, {
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
                                            <th>Machine</th>
                                            <th>Type</th>
                                            <th>Title</th>
                                            <th>Occurence</th>
                                            <th>Scheduled Date</th>
                                            <th>Created By</th>
                                            {alertType && alertType === 4 && (
                                                <th>Submitted By</th>
                                            )}
                                            <th>Sent</th>
                                            <th>Submitted</th>
                                            <th>Closed</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Array.isArray(alertsData) && alertsData?.length > 0 ? (
                                            alertsData?.map((item, index) => (
                                                <tr key={index}>
                                                    <td>{index + 1}</td>
                                                    <td className="text-info fw-bold">{item.Col10}</td>
                                                    <td className="text-primary fw-bold">
                                                        {item.Col5} - {item.Col6}
                                                    </td>
                                                    <td>{item.Col1}</td>
                                                    <td>{item.Col2}</td>
                                                    <td>{item.Col4}</td>
                                                    <td>{formatDate(item.Col7)}</td>
                                                    <td>{item.Col9}</td>
                                                    {alertType && alertType === 4 && (
                                                        <td>{item.Col10}</td>
                                                    )}
                                                    <td className="text-center">
                                                        {item.Col12 === "1" ? (
                                                            <i className="bi bi-check-circle-fill text-success"></i>
                                                        ) : (
                                                            <i className="bi bi-x-circle-fill text-danger"></i>
                                                        )}
                                                    </td>
                                                    <td className="text-center">
                                                        {item.Col13 === "1" ? (
                                                            <i className="bi bi-check-circle-fill text-success"></i>
                                                        ) : (
                                                            <i className="bi bi-x-circle-fill text-danger"></i>
                                                        )}
                                                    </td>
                                                    <td className="text-center">
                                                        {item.Col14 === "1" ? (
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
                                {Array.isArray(alertsData) && alertsData?.length > 0 ? (
                                    alertsData?.map((item, index) => (
                                        <div
                                            key={index}
                                            className="card mb-3 border rounded shadow-sm p-3 bg-light"
                                        >
                                            <div className="d-flex justify-content-between align-items-center mb-2">
                                                <strong className="text-primary">#{index + 1}</strong>
                                                <span className="badge bg-info text-white">
                                                    Type: {item.Col1}
                                                </span>
                                            </div>

                                            <div className="mb-1">
                                                <i className="fa-solid fa-microchip text-secondary me-2"></i>
                                                <strong>Code:</strong> {item.Col10}
                                            </div>
                                            <div className="mb-1">
                                                <i className="fa-solid fa-microchip text-secondary me-2"></i>
                                                <strong>Machine:</strong> {item.Col5} - {item.Col6}
                                            </div>

                                            <div className="mb-1">
                                                <i className="fa-solid fa-heading text-secondary me-2"></i>
                                                <strong>Title:</strong> {item.Col2}
                                            </div>

                                            <div className="mb-1">
                                                <i className="fa-solid fa-repeat text-secondary me-2"></i>
                                                <strong>Occurrence:</strong> {item.Col4}
                                            </div>

                                            <div className="mb-1">
                                                <i className="fa-solid fa-calendar-day text-secondary me-2"></i>
                                                <strong>Scheduled:</strong> {formatDate(item.Col7)}
                                            </div>

                                            <div className="mb-1">
                                                <i className="fa-solid fa-user text-secondary me-2"></i>
                                                <strong>Created By:</strong> {item.Col9 || 'N/A'}
                                            </div>

                                            {alertType && alertType === 4 && (
                                                <div className="mb-1">
                                                    <i className="fa-solid fa-user text-secondary me-2"></i>
                                                    <strong>Submitted By:</strong> {item.Col10 || 'N/A'}
                                                </div>
                                            )}
                                            {/* Status Icons */}
                                            <div className="d-flex justify-content-between mt-2">
                                                <div>
                                                    <strong>Sent:</strong>{" "}
                                                    {item.Col12 === "1" ? (
                                                        <i className="bi bi-check-circle-fill text-success"></i>
                                                    ) : (
                                                        <i className="bi bi-x-circle-fill text-danger"></i>
                                                    )}
                                                </div>

                                                <div>
                                                    <strong>Submitted:</strong>{" "}
                                                    {item.Col13 === "1" ? (
                                                        <i className="bi bi-check-circle-fill text-success"></i>
                                                    ) : (
                                                        <i className="bi bi-x-circle-fill text-danger"></i>
                                                    )}
                                                </div>

                                                <div>
                                                    <strong>Closed:</strong>{" "}
                                                    {item.Col14 === "1" ? (
                                                        <i className="bi bi-check-circle-fill text-success"></i>
                                                    ) : (
                                                        <i className="bi bi-x-circle-fill text-danger"></i>
                                                    )}
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
};
