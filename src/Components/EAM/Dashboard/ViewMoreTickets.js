import React, { useEffect, useState } from "react";
import { BASE_API } from "../../Config/Config";
import PropTypes from "prop-types";
import { fetchWithAuth } from "../../../utils/api";
import { formatToDDMMYYYY } from './../../../utils/dateFunc';

export default function ViewTicketStatusByStatus({ statusText, deptId, unitId }) {

    const [sessionUserData, setsessionUserData] = useState({});
    const [ticketsData, setTicketsData] = useState([]);
    const [dataLoading, setDataLoading] = useState(false);

    useEffect(() => {
        const userDataString = sessionStorage.getItem("userData");
        if (userDataString) {
            const userData = JSON.parse(userDataString);
            setsessionUserData(userData);
        }
    }, []);

    const fetchTicketsDataByStatus = async () => {
        setDataLoading(true);
        if (sessionUserData.OrgId) {
            try {
                const response = await fetchWithAuth(`PMMS/GetTicketsByStatus?Status=${statusText}&OrgId=${sessionUserData.OrgId}&DeptId=${deptId}&UnitId=${unitId}`, {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                });
                if (response.ok) {
                    const data = await response.json();
                    setTicketsData(data.ResultData);
                    setDataLoading(false);
                } else {
                    setDataLoading(false);
                    setTicketsData([]);
                    console.error('Failed to fetch assets data:', response.statusText);
                }
            } catch (error) {
                setDataLoading(false);
                setTicketsData([]);
                console.error('Error fetching assets data:', error.message);
            }
        }
    };

    useEffect(() => {
        if (statusText === "OverDueTickets" || statusText === "OpenTickets") {
            const fetchTicketsDataByStatus = async () => {
                setDataLoading(true);

                if (sessionUserData.OrgId && statusText) {
                    let endpoint = "";
                    if (statusText === "OverDueTickets") {
                        endpoint = "GetDueTickets";
                    } else if (statusText === "OpenTickets") {
                        endpoint = "GetOpenTickets";
                    } else {
                        console.error("Unknown statusText:", statusText);
                        setDataLoading(false);
                        return;
                    }

                    try {
                        const response = await fetchWithAuth(`PMMS/${endpoint}?OrgId=${sessionUserData.OrgId}&DeptId=${deptId}&UnitId=${unitId}`, {
                            method: "GET",
                            headers: { "Content-Type": "application/json" },
                        });
                        if (response.ok) {
                            const data = await response.json();
                            setTicketsData(data.ResultData);
                        } else {
                            console.error("Failed to fetch tickets:", response.statusText);
                            setTicketsData([]);
                        }
                    } catch (error) {
                        console.error("Error fetching tickets:", error.message);
                        setTicketsData([]);
                    } finally {
                        setDataLoading(false);
                    }
                }
            };

            fetchTicketsDataByStatus();
        }
    }, [sessionUserData.OrgId, statusText]);

    useEffect(() => {
        if (
            sessionUserData.OrgId &&
            statusText !== "OverDueTickets" &&
            statusText !== "OpenTickets" && deptId && unitId
        ) {
            fetchTicketsDataByStatus();
        }
    }, [sessionUserData, statusText, deptId, unitId]);

    return (
        <div
            className="offcanvas offcanvas-end"
            tabIndex="-1"
            id="offcanvasRightViewTicketsData"
            aria-labelledby="offcanvasRightLabel"
            style={{ width: "90%" }}
        >
            <style>
                {`
                    @media (min-width: 768px) { /* Medium devices and up (md) */
                        #offcanvasRightViewTicketsData {
                            width: 50% !important;
                        }

                    }
                `}
            </style>
            <form>
                <div className="offcanvas-header d-flex justify-content-between align-items-center">
                    <h5 id="offcanvasRightLabel" className="mb-0">
                        {statusText === "NEW"
                            ? "New"
                            : statusText === "OpenTickets"
                                ? "Open"
                                : statusText === "OverDueTickets"
                                    ? "Overdue"
                                    : statusText === "CLOSED"
                                        ? "Closed"
                                        : statusText}{" "}
                        Tickets
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
                <div className="offcanvas-body" style={{
                    flex: 1,
                    overflowY: 'auto',
                    paddingBottom: '2rem',
                    maxHeight: 'calc(100vh - 100px)',
                    marginTop: '-2rem'
                }}>
                    <div className="table-responsive d-none d-md-block">
                        {dataLoading ? (
                            <div className="d-flex justify-content-center align-items-center" style={{ height: "200px" }}>
                                <div className="spinner-border text-primary" role="status">
                                    <span className="visually-hidden">Loading...</span>
                                </div>
                            </div>
                        ) : ticketsData?.length === 0 ? (
                            <div className="text-center text-muted py-4">No data available</div>
                        ) : (
                            <table className="table table-hover table-bordered table-striped align-middle">
                                {(statusText === "OpenTickets" || statusText === "OverDueTickets") && (
                                    <thead>
                                        <tr className="fw-semibold">
                                            <th>#</th>
                                            <th>Asset</th>
                                            <th>Asset Type</th>
                                            <th>Ticekt Code</th>
                                            <th>Department</th>
                                            <th>Created On</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                )}
                                {(statusText !== "OpenTickets" && statusText !== "OverDueTickets") && (
                                    <thead>
                                        <tr className="fw-semibold">
                                            <th>#</th>
                                            <th>Asset</th>
                                            <th>Asset Type</th>
                                            <th>Ticket Code</th>
                                            <th>Issue Type</th>
                                            <th>Priority</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                )}
                                {(statusText === "OpenTickets" || statusText === "OverDueTickets") && (
                                    <tbody>
                                        {Array.isArray(ticketsData) && ticketsData.length > 0 ? (
                                            ticketsData.map((item, index) => (
                                                <tr key={index}>
                                                    <td>{index + 1}</td>
                                                    <td>{item.AssetName}</td>
                                                    <td>{item.AssetType}</td>
                                                    <td>{item.TicketCode}</td>
                                                    <td>{item.DeptName}</td>
                                                    <td>{formatToDDMMYYYY(item.CreatedOn)}</td>
                                                    <td>{item.Status}</td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="12" className="text-center text-muted">
                                                    No data available
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                )}
                                {(statusText !== "OpenTickets" && statusText !== "OverDueTickets") && (
                                    <tbody>
                                        {Array.isArray(ticketsData) && ticketsData.length > 0 ? (
                                            ticketsData.map((item, index) => (
                                                <tr key={index}>
                                                    <td>{index + 1}</td>
                                                    <td>{item.TicketCode}</td>
                                                    <td>{item.IssueType}</td>
                                                    <td>
                                                        {item.Priority === 1 && (
                                                            <span className="badge badge-light-danger">High</span>
                                                        )}
                                                        {item.Priority === 2 && (
                                                            <span className="badge badge-light-warning">Medium</span>
                                                        )}
                                                        {item.Priority === 3 && (
                                                            <span className="badge badge-light-primary">Low</span>
                                                        )}
                                                    </td>
                                                    <td>{item.Status}</td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="12" className="text-center text-muted">
                                                    No data available
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                )}
                            </table>
                        )}
                    </div>
                    <div className="d-block d-md-none">
                        {(Array.isArray(ticketsData) ? ticketsData : []).map((item, index) => (
                            <div key={index} className="card mb-3 shadow-sm">
                                <div className="card-body">
                                    <h6 className="card-title">
                                        {statusText === "OpenTickets" || statusText === "OverDueTickets"
                                            ? item.MachineName
                                            : item.TicketCode}
                                    </h6>

                                    {statusText === "OpenTickets" || statusText === "OverDueTickets" ? (
                                        <>
                                            <p className="mb-1"><strong>Ticket Code:</strong> {item.TicketCode}</p>
                                            <p className="mb-1"><strong>Department:</strong> {item.DeptName}</p>
                                            <p className="mb-1"><strong>Created On:</strong> {item.CreatedOn}</p>
                                            <p className="mb-0"><strong>Status:</strong> {item.Status}</p>
                                        </>
                                    ) : (
                                        <>
                                            <p className="mb-1"><strong>Issue Type:</strong> {item.IssueType}</p>
                                            <p className="mb-1">
                                                <strong>Priority:</strong>{" "}
                                                {item.Priority === 1 && (
                                                    <span className="badge bg-danger">High</span>
                                                )}
                                                {item.Priority === 2 && (
                                                    <span className="badge bg-warning text-dark">Medium</span>
                                                )}
                                                {item.Priority === 3 && (
                                                    <span className="badge bg-primary">Low</span>
                                                )}
                                            </p>
                                            <p className="mb-0"><strong>Status:</strong> {item.Status}</p>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </form>
        </div>
    );
}


ViewTicketStatusByStatus.propTypes = {
    statusText: PropTypes.string.isRequired,
    deptId: PropTypes.number.isRequired,
    unitId: PropTypes.number.isRequired,
};