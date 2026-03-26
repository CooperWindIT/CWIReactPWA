import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { fetchWithAuth } from "../../../utils/api";

export default function ViewMachinesDataByStatus({ statusText }) {

    const [sessionUserData, setSessionUserData] = useState({});
    const [machinesData, setMachinesData] = useState([]);
    const [dataLoading, setDataLoading] = useState(false);

    useEffect(() => {
        const userDataString = sessionStorage.getItem("userData");
        if (userDataString) {
            const userData = JSON.parse(userDataString);
            setSessionUserData(userData);
        }
    }, []);

    const fetchMachinesDataByStatus = async () => {
        if (statusText !== 'BREAKDOWN' && sessionUserData.OrgId) {
            setDataLoading(true);
            if (sessionUserData.OrgId) {
                try {
                    const response = await fetchWithAuth(
                        `PMMS/getMachinesByStatus?Status=${statusText}&OrgId=${sessionUserData.OrgId}`
                    , {
                        method: "GET",
                        headers: { "Content-Type": "application/json" },
                    });
                    if (response.ok) {
                        const data = await response.json();
                        setMachinesData(data.ResultData);
                    } else {
                        setMachinesData([]);
                        console.error("Failed to fetch machines data:", response.statusText);
                    }
                } catch (error) {
                    setMachinesData([]);
                    console.error("Error fetching machines data:", error.message);
                }
            }
        }
        setDataLoading(false);
    };

    useEffect(() => {
        if (statusText === 'BREAKDOWN' && sessionUserData.OrgId) {
            const fetchMachinesDataByStatus = async () => {
                setDataLoading(true);
                if (sessionUserData.OrgId) {
                    try {
                        const response = await fetchWithAuth(
                            `PMMS/GetBreakdownMachines?OrgId=${sessionUserData.OrgId}`,
                        {
                            method: "GET",
                            headers: { "Content-Type": "application/json" },
                        });
                        if (response.ok) {
                            const data = await response.json();
                            setMachinesData(data.ResultData || []);
                        } else {
                            setMachinesData([]);
                            console.error("Failed to fetch machines data:", response.statusText);
                        }
                    } catch (error) {
                        setMachinesData([]);
                        console.error("Error fetching machines data:", error.message);
                    }
                }
                setDataLoading(false);
            };
            fetchMachinesDataByStatus();
        }
    }, [statusText]);

    useEffect(() => {
        if (sessionUserData.OrgId && statusText !== 'BREAKDOWN') {
            fetchMachinesDataByStatus();
        }
    }, [sessionUserData, statusText]);

    const getStatusBadge = (status) => {
        const cleanStatus = status?.toLowerCase();
        switch (cleanStatus) {
            case "live":
                return "badge-light-success";
            case "idle":
                return "badge-light-warning";
            case "readytooperate":
                return "badge-light-info";
            case "breakdown":
                return "badge-light-danger";
            default:
                return "badge-light-secondary";
        }
    };

    return (
        <div
            className="offcanvas offcanvas-end"
            tabIndex="-1"
            id="offcanvasRightViewMachinesData"
            aria-labelledby="offcanvasRightLabel"
            style={{ width: "90%" }}
        >
            <style>
                {`
                @media (min-width: 768px) {
                    #offcanvasRightViewMachinesData {
                        width: 68% !important;
                    }
                }
                `}
            </style>
            <form>
                <div className="offcanvas-header d-flex justify-content-between align-items-center mb-2">
                    <h5 id="offcanvasRightLabel" className="mb-0">{statusText === 'READYTOOPERATE' ? 'Ready to Operate' : statusText} Machines</h5>
                    <button
                        type="button"
                        className="btn-close"
                        data-bs-dismiss="offcanvas"
                        aria-label="Close"
                    ></button>
                </div>
                <div className="offcanvas-body" style={{
                    flex: 1,
                    overflowY: 'auto',
                    paddingBottom: '2rem',
                    maxHeight: 'calc(100vh - 100px)',
                    marginTop: '-2rem'
                }}>
                    {dataLoading ? (
                        <div className="d-flex justify-content-center align-items-center" style={{ height: "200px" }}>
                            <div className="spinner-border text-primary" role="status">
                                <span className="visually-hidden">Loading...</span>
                            </div>
                        </div>
                    ) : machinesData?.length === 0 ? (
                        <div className="text-center text-muted py-4">No data available</div>
                    ) : (
                        <>
                            {/* Mobile View: Cards */}
                            <div className="d-md-none">
                                {machinesData && machinesData?.map((item, index) => (
                                    <div key={index} className="card mb-3 p-3 shadow-sm border-light">
                                        <div className="d-flex justify-content-between">
                                            <span className="fw-bold">#{index + 1}</span>
                                            <span className={`badge ${getStatusBadge(item.Status)}`}>
                                                {item.Status}
                                            </span>
                                        </div>
                                        <div><strong>Machine Code:</strong> {item.MachineCode}</div>
                                        <div><strong>Machine Name:</strong> {item.MachineName}</div>
                                        <div><strong>Model:</strong> {item.Model}</div>
                                        <div className={`${statusText === 'LIVE' ? 'd-block' : 'd-none'}`}><strong>Start Time:</strong> N/A</div>
                                        <div className={`${statusText === 'LIVE' ? 'd-block' : 'd-none'}`}><strong>Previous RunTime:</strong> N/A</div>
                                        <div className={`${statusText === 'BREAKDOWN' ? 'd-block' : 'd-none'}`}><strong>User:</strong> {item.UserName}</div>
                                        <div className={`${(statusText === 'BREAKDOWN' || statusText === 'IDLE') ? 'd-block' : 'd-none'}`}><strong>Reason for Revision:</strong> {item.Reason}</div>
                                        <div className={`${statusText === 'READYTOOPERATE' ? 'd-block' : 'd-none'}`}><strong>ETA for Completion:</strong> N/A</div>
                                        <div className={`${statusText === 'READYTOOPERATE' ? 'd-block' : 'd-none'}`}><strong>Revise ETA:</strong> N/A</div>
                                    </div>
                                ))}
                            </div>

                            {/* Desktop View: Table */}
                            <div className="table-responsive d-none d-md-block">
                                {statusText !== 'BREAKDOWN' && (
                                    <table className="table table-hover table-bordered table-striped align-middle">
                                        <thead>
                                            <tr className="fw-semibold">
                                                <th>#</th>
                                                <th>Machine Code</th>
                                                <th>Machine Name</th>
                                                <th>Model</th>
                                                <th className={`${statusText === 'LIVE' ? 'd-table-cell' : 'd-none'}`}>Start Time</th>
                                                <th className={`${statusText === 'LIVE' ? 'd-table-cell' : 'd-none'}`}>Previous RunTime</th>
                                                <th className={`${statusText === 'BREAKDOWN' ? 'd-table-cell' : 'd-none'}`}>Ticket Raised By</th>
                                                <th className={`${statusText === 'BREAKDOWN' ? 'd-table-cell' : 'd-none'}`}>Is Production Lead Inform</th>
                                                <th className={`${(statusText === 'BREAKDOWN' || statusText === 'IDLE') ? 'd-table-cell' : 'd-none'}`}>Reason for Revision</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {machinesData?.map((item, index) => (
                                                <tr key={index}>
                                                    <td>{index + 1}</td>
                                                    <td>{item.MachineCode}</td>
                                                    <td>{item.MachineName}</td>
                                                    <td>{item.Model}</td>
                                                    <td className={`${statusText === 'LIVE' ? 'd-table-cell' : 'd-none'}`}>N/A</td>
                                                    <td className={`${statusText === 'LIVE' ? 'd-table-cell' : 'd-none'}`}>N/A</td>
                                                    <td className={`${(statusText === 'BREAKDOWN' || statusText === 'IDLE') ? 'd-table-cell' : 'd-none'}`}>N/A</td>
                                                    <td className={`${statusText === 'BREAKDOWN' ? 'd-table-cell' : 'd-none'}`}>N/A</td>
                                                    <td className={`${statusText === 'BREAKDOWN' ? 'd-table-cell' : 'd-none'}`}>N/A</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}

                                {statusText === 'BREAKDOWN' && (
                                    <table className="table table-hover table-bordered table-striped align-middle">
                                        <thead>
                                            <tr className="fw-semibold">
                                                <th>#</th>
                                                <th>Machine Code</th>
                                                <th>Machine Name</th>
                                                <th>Model</th>
                                                <th>User</th>
                                                <th>Reason for Revision</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {machinesData?.map((item, index) => (
                                                <tr key={index}>
                                                    <td>{index + 1}</td>
                                                    <td>{item.MachineCode}</td>
                                                    <td>{item.MachineName}</td>
                                                    <td>{item.Model}</td>
                                                    <td>{item.UserName}</td>
                                                    <td>{item.Reason}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </form>
        </div>
    );
}

ViewMachinesDataByStatus.propTypes = {
    statusText: PropTypes.string.isRequired,
};
