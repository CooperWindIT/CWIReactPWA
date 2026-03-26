import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { fetchWithAuth } from "../../../utils/api";

export default function ViewMachinesDataByStatus({ statusText, deptId, unitId }) {

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
        if (statusText && sessionUserData.OrgId && deptId && unitId) {
            setDataLoading(true);
            if (sessionUserData.OrgId) {
                try {
                    const response = await fetchWithAuth(
                        `PMMS/getMachinesByStatus?Status=${statusText}&OrgId=${sessionUserData.OrgId}&DeptId=${deptId}&UnitId=${unitId}`
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
        if (sessionUserData.OrgId && statusText && deptId && unitId) {
            fetchMachinesDataByStatus();
        }
    }, [sessionUserData, statusText, deptId, unitId]);

    const getStatusBadge = (status) => {
        const cleanStatus = status?.toLowerCase();
        switch (cleanStatus) {
            case "live":
                return "badge-light-success";
            case "idle":
                return "badge-light-warning";
            case "active":
                return "badge-light-info";
            case "outofservice":
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
                    <h5 id="offcanvasRightLabel" className="mb-0">
                        {statusText === "ACTIVE"
                            ? "Active"
                            : statusText === "OUTOFSERVICE"
                                ? "Out of Service"
                                : statusText}{" "}
                        Assets
                    </h5>
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
                            {(Array.isArray(machinesData) ? machinesData : []).map((item, index) => (
                                    <div key={index} className="card mb-3 p-3 shadow-sm border-light">
                                        <div className="d-flex justify-content-between">
                                            <span className="fw-bold">#{index + 1}</span>
                                            <span className={`badge ${getStatusBadge(item.Status)}`}>
                                                {item.Status}
                                            </span>
                                        </div>
                                        <div><strong>Asset Name:</strong> {item.AssetName}</div>
                                        <div><strong>Asset Code:</strong> {item.AssetCode}</div>
                                        <div><strong>Code:</strong> {item.Code}</div>
                                        <div><strong>Model:</strong> {item.Model}</div>
                                        <div><strong>Asset Type:</strong> {item.AssetType}</div>
                                        <div><strong>Department:</strong> {item.DeptName}</div>
                                        <div className={`${statusText === 'LIVE' ? 'd-block' : 'd-none'}`}><strong>Start Time:</strong> N/A</div>
                                        <div className={`${statusText === 'LIVE' ? 'd-block' : 'd-none'}`}><strong>Previous RunTime:</strong> N/A</div>
                                        <div className={`${statusText === 'OUTOFSERVICE' ? 'd-block' : 'd-none'}`}><strong>User:</strong> {item.UserName}</div>
                                        <div className={`${(statusText === 'OUTOFSERVICE' || statusText === 'IDLE') ? 'd-block' : 'd-none'}`}><strong>Reason for Revision:</strong> {item.Reason}</div>
                                        <div className={`${statusText === 'ACTIVE' ? 'd-block' : 'd-none'}`}><strong>ETA for Completion:</strong> N/A</div>
                                        <div className={`${statusText === 'ACTIVE' ? 'd-block' : 'd-none'}`}><strong>Revise ETA:</strong> N/A</div>
                                    </div>
                                ))}
                            </div>

                            {/* Desktop View: Table */}
                            <div className="table-responsive d-none d-md-block">
                                {statusText !== 'OUTOFSERVICE' && (
                                    <table className="table table-hover table-bordered table-striped align-middle">
                                        <thead>
                                            <tr className="fw-semibold">
                                                <th>#</th>
                                                <th>Asset Name</th>
                                                <th>Asset Code</th>
                                                <th>Code</th>
                                                <th>Model</th>
                                                <th>Asset Type</th>
                                                <th>Department</th>
                                                <th className={`${statusText === 'LIVE' ? 'd-table-cell' : 'd-none'}`}>Start Time</th>
                                                <th className={`${statusText === 'LIVE' ? 'd-table-cell' : 'd-none'}`}>Previous RunTime</th>
                                                <th className={`${statusText === 'OUTOFSERVICE' ? 'd-table-cell' : 'd-none'}`}>Ticket Raised By</th>
                                                <th className={`${statusText === 'OUTOFSERVICE' ? 'd-table-cell' : 'd-none'}`}>Is Production Lead Inform</th>
                                                <th className={`${(statusText === 'OUTOFSERVICE' || statusText === 'IDLE') ? 'd-table-cell' : 'd-none'}`}>Reason for Revision</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                        {(Array.isArray(machinesData) ? machinesData : []).map((item, index) => (
                                                <tr key={index}>
                                                    <td>{index + 1}</td>
                                                    <td>{item.AssetName}</td>
                                                    <td>{item.AssetCode}</td>
                                                    <td>{item.Code}</td>
                                                    <td>{item.Model}</td>
                                                    <td>{item.AssetType}</td>
                                                    <td>{item.DeptName}</td>
                                                    <td className={`${statusText === 'LIVE' ? 'd-table-cell' : 'd-none'}`}>N/A</td>
                                                    <td className={`${statusText === 'LIVE' ? 'd-table-cell' : 'd-none'}`}>N/A</td>
                                                    <td className={`${(statusText === 'OUTOFSERVICE' || statusText === 'IDLE') ? 'd-table-cell' : 'd-none'}`}>N/A</td>
                                                    <td className={`${statusText === 'OUTOFSERVICE' ? 'd-table-cell' : 'd-none'}`}>N/A</td>
                                                    <td className={`${statusText === 'OUTOFSERVICE' ? 'd-table-cell' : 'd-none'}`}>N/A</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}

                                {statusText === 'OUTOFSERVICE' && (
                                    <table className="table table-hover table-bordered table-striped align-middle">
                                        <thead>
                                            <tr className="fw-semibold">
                                                <th>#</th>
                                                <th>Asset Code</th>
                                                <th>Asset Name</th>
                                                <th>Model</th>
                                                <th>Asset Type</th>
                                                <th>Department</th>
                                                <th>User</th>
                                                <th>Reason for Revision</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(Array.isArray(machinesData) ? machinesData : []).map((item, index) => (
                                                <tr key={index}>
                                                    <td>{index + 1}</td>
                                                    <td>{item.AssetCode}</td>
                                                    <td>{item.AssetName}</td>
                                                    <td>{item.Model}</td>
                                                    <td>{item.AssetType}</td>
                                                    <td>{item.DeptName}</td>
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
    deptId: PropTypes.number.isRequired,
    unitId: PropTypes.number.isRequired,
};
