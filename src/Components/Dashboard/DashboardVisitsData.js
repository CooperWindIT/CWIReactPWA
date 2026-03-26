import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { fetchWithAuth } from "../../utils/api";

export default function DashboardVisitsData({ checkType, selectedUnit }) {

    const [sessionUserData, setsessionUserData] = useState({});
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const userDataString = sessionStorage.getItem("userData");
        if (userDataString) {
            const userData = JSON.parse(userDataString);
            setsessionUserData(userData);
        } else {
            console.log("No data avilable in sessionStorage for 'userData'");
        }
    }, []);

    useEffect(() => {
        if (checkType === undefined || checkType === null || selectedUnit === undefined || selectedUnit === null) {
            console.warn("checkType and selectedUnit props are required and must be a number.");
            return;
        }
        const fetchData = async () => {
            setLoading(true);
            try {
                const today = new Date().toISOString().split("T")[0];

                const response = await fetchWithAuth(`visitor/newVMSDashboard`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        OrgId: sessionUserData?.OrgId,
                        CheckInDate: today,
                        Type: checkType,
                        UnitId: selectedUnit,
                    }),
                });

                const result = await response.json();
                if (result.success) {
                    const results = result?.data?.result || [];
                    setData(results);
                    setLoading(false);
                } else {
                    setData([]);
                    setLoading(false);
                }
            } catch (error) {
                console.error("Error fetching CMS Dashboard data:", error);
                setLoading(false);
            }
        };

        fetchData();
        setLoading(false);
    }, [sessionUserData, checkType, selectedUnit]);

    const getStatusBadgeClass = (status) => {
        switch (status) {
            case "DRAFT":
                return "badge-light-secondary";
            case "APPROVED":
                return "badge-light-primary";
            case "REJECTED":
                return "badge-light-warning";
            case "CHECKEDOUT":
                return "badge-light-info";
            case "CANCELED":
                return "badge-light-danger";
            case "COMPLETED":
                return "badge-light-success";
            default:
                return "badge-light";
        }
    };

    const tableConfigs = {
        2: {
            headers: ["#", "Request No", "Name", "CheckIn", "CheckOut", "Status"],
            columns: [
                (item, i) => i + 1,
                (item) => <span className="text-primary fw-bold">{item.Col6 || "N/A"}</span>,
                (item) => item.Col2 || "N/A",
                (item) => <span className="text-success fw-bold">{item.Col3 || "N/A"}</span>,
                (item) => <span className="text-danger fw-bold">{item.Col4 || "N/A"}</span>,
                (item) => (
                    <span className={`badge ${getStatusBadgeClass(item.Col8)}`}>
                        {item.Col8}
                    </span>
                ),
            ],
        },
        3: {
            headers: ["#", "Request No", "Name", "Mobile", "CheckIn"],
            columns: [
                (item, i) => i + 1,
                (item) => <span className="text-primary fw-bold">{item.Col5 || "N/A"}</span>,
                (item) => item.Col2 || "N/A",
                (item) => item.Col4 || "N/A",
                (item) => <span className="text-success fw-bold">{item.Col3 || "N/A"}</span>,
            ],
        },
        4: {
            headers: ["#", "Request No", "Name", "Mobile", "CheckIn", "CheckOut"],
            columns: [
                (item, i) => i + 1,
                (item) => <span className="text-primary fw-bold">{item.Col6 || "N/A"}</span>,
                (item) => item.Col2 || "N/A",
                (item) => item.Col5 || "N/A",
                (item) => <span className="text-success fw-bold">{item.Col3 || "N/A"}</span>,
                (item) => <span className="text-danger fw-bold">{item.Col4 || "N/A"}</span>,
            ],
        },
        5: {
            headers: ["#", "Request No", "Name", "CheckIn", "Status"],
            columns: [
                (item, i) => i + 1,
                (item) => <span className="text-primary fw-bold">{item.Col5 || "N/A"}</span>,
                (item) => item.Col2 || "N/A",
                (item) => <span className="text-success fw-bold">{item.Col3 || "N/A"}</span>,
                (item) => (
                    <span className={`badge ${getStatusBadgeClass(item.Col4)}`}>
                        {item.Col4}
                    </span>
                ),
            ],
        },
        6: {
            headers: ["#", "Request No", "Name", "Expiry Date", "Check In", "Check Out"],
            columns: [
                (item, i) => i + 1,
                (item) => <span className="text-primary fw-bold">{item.Col4 || "N/A"}</span>,
                (item) => item.Col2 || "N/A",
                (item) => <span className="text-danger fw-bold">{item.Col3 || "N/A"}</span>,
                (item) => <span className="text-danger fw-bold">{item.Col5 || "N/A"}</span>,
                (item) => <span className="text-danger fw-bold">{item.Col6 || "N/A"}</span>,
            ],
        },
    };

    return (
        <div
            className="offcanvas offcanvas-end"
            tabIndex="-1"
            id="offcanvasRightDashVisitsData"
            aria-labelledby="offcanvasRightLabel"
            style={{ width: '90%' }}
        >
            <style>
                {`
                    @media (min-width: 768px) { /* Medium devices and up (md) */
                        #offcanvasRightDashVisitsData {
                            width: 60% !important;
                        }
                    }
                `}
            </style>
            <div className="offcanvas-header d-flex justify-content-between align-items-center mb-2">
                <h5 id="offcanvasRightLabel" className="mb-0 d-flex align-items-center gap-2">
                    {data && data[0]?.Title ? data[0]?.Title : 'Visits Data'}
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
            <hr className="text-primary" />
            <div
                className="offcanvas-body"
                style={{
                    flex: 1,
                    overflowY: "auto",
                    paddingBottom: "2rem",
                    maxHeight: "calc(100vh - 100px)",
                    marginTop: "-2rem",
                }}
            >
                {/* Desktop View (Tables) */}
                <div className="table-responsive d-none d-md-block">
                    {loading ? (
                        <div className="text-center my-5">
                            <div className="spinner-border text-primary" role="status"></div>
                        </div>
                    ) : tableConfigs[checkType] ? (
                        <table className="table table-bordered table-striped">
                            <thead>
                                <tr>
                                    {tableConfigs[checkType].headers.map((header, i) => (
                                        <th key={i}>{header}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {Array.isArray(data) && data.length > 0 ? (
                                    data.map((item, index) => (
                                        <tr key={index}>
                                            {tableConfigs[checkType].columns.map((colFn, j) => (
                                                <td key={j}>{colFn(item, index)}</td>
                                            ))}
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td
                                            colSpan={tableConfigs[checkType].headers.length}
                                            className="text-center text-muted"
                                        >
                                            No records found
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    ) : null}
                </div>

                {/* Mobile View (Cards) */}
                <div className="d-block d-md-none">
                    {loading ? (
                        <div className="text-center my-5">
                            <div className="spinner-border text-primary" role="status"></div>
                        </div>
                    ) : Array.isArray(data) && data.length > 0 ? (
                        <div className="row g-2">
                            {data.map((item, index) => (
                                <div className="col-12" key={index}>
                                    <div className="card shadow-sm">
                                        <div className="card-body">
                                            {tableConfigs[checkType]?.headers.map((header, hIndex) => (
                                                <p key={hIndex} className="mb-1 d-flex justify-content-between">
                                                    <strong>{header}:</strong>
                                                    <span>{tableConfigs[checkType].columns[hIndex](item, index)}</span>
                                                </p>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-center text-muted">No records found</p>
                    )}
                </div>
            </div>

        </div>
    )
};

DashboardVisitsData.propTypes = {
    checkType: PropTypes.number.isRequired,
    selectedUnit: PropTypes.number.isRequired,
};