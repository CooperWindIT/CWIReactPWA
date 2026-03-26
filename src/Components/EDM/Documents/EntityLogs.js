import React, { useEffect, useState, useRef } from "react";
import { fetchWithAuth } from "../../../utils/api";
import PropTypes from "prop-types";
import { formatToDDMMYYYY_HHMM } from './../../../utils/dateFunc';

export default function EntityLogs({ entityObj }) {

    const [sessionUserData, setsessionUserData] = useState({});
    const [entityLogs, setEntityLogs] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const userDataString = sessionStorage.getItem("userData");
        if (userDataString) {
            const userData = JSON.parse(userDataString);
            setsessionUserData(userData);
        }
    }, []);

    const fetchEntityLogs = async () => {
        const storedModule = JSON.parse(localStorage.getItem("ModuleData"));
        const moduleId = storedModule?.Id?.toString();
        setLoading(true);
        try {
            const response = await fetchWithAuth(`Portal/GetLogsbyEntityId?OrgId=${sessionUserData?.OrgId}&EntityId=${entityObj?.Id}&ModuleId=${moduleId}&EntityType=Documents`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });

            if (!response.ok) throw new Error("Network response was not ok");

            const data = await response.json();

            setEntityLogs(data.ResultData || []);
            setLoading(false);

        } catch (error) {
            console.error("Failed to fetch logs data:", error);
            setEntityLogs([]);
            setLoading(false);
        }
    };

    useEffect(() => {
        if (entityObj?.DocId) {
            fetchEntityLogs();
        }
    }, [entityObj]);

    const offcanvasRef = useRef(null);

    useEffect(() => {
        const offcanvasEl = offcanvasRef.current;
        if (!offcanvasEl) return;

        const handleOpen = () => {
            if (sessionUserData?.OrgId && entityObj.Id) {
                fetchEntityLogs();
            }
        };

        offcanvasEl.addEventListener("show.bs.offcanvas", handleOpen);

        return () => {
            offcanvasEl.removeEventListener("show.bs.offcanvas", handleOpen);
        };
    }, [sessionUserData?.OrgId, entityObj]);

    const getStatusBadgeClass = (status) => {
        switch (status?.toLowerCase()) {
            case "draft":
                return "badge-light-primary";
            case "approved":
                return "badge-light-purple";
            case "rejected":
                return "badge-light-danger"; // 🌿 softer teal tone
            case "pending approval":
                return "badge-light-info";
            case "published":
                return "badge-light-success";
            default:
                return "badge-secondary";
        }
    };

    return (
        <div
            ref={offcanvasRef}
            className="offcanvas offcanvas-end"
            tabIndex="-1"
            id="offcanvasRightEntityLogs"
            aria-labelledby="offcanvasRightLabel"
            style={{ width: "90%" }}
        >
            <style>
                {`
                    @media (min-width: 768px) { /* Medium devices and up (md) */
                        #offcanvasRightEntityLogs {
                            width: 55% !important;
                        }

                    }
                `}
            </style>
            <div>
                <div className="offcanvas-header d-flex justify-content-between align-items-center mb-3">
                <h4 className="mb-0 fw-bold text-dark">
                                <i className="bi bi-clock-history me-2 text-primary fs-5"></i>
                                Activity Logs
                            </h4>
                    <div className="d-flex align-items-center">
                        <button
                            type="button"
                            className="btn-close"
                            data-bs-dismiss="offcanvas"
                            aria-label="Close"
                        ></button>
                    </div>
                </div>
                <div className="offcanvas-body" style={{ marginTop: "-2rem", maxHeight: "calc(100vh - 4rem)", overflowY: "auto" }}>
                    <div className="card shadow-sm border-0">

                        <div 
    className="table-responsive ps-3 d-none d-md-block custom-scrollbar"
    style={{ 
        maxHeight: "45rem", 
        overflowY: "auto",
        borderRadius: "8px",
        boxShadow: "0 0.1rem 1rem 0.25rem rgba(0, 0, 0, 0.05)"
    }}
>
    <table className="table table-hover align-middle mb-0">
        <thead className="sticky-top bg-white" style={{ zIndex: 10 }}>
            <tr className="text-uppercase text-muted fw-bold fs-8 border-bottom">
                <th className="py-4 px-3" style={{ minWidth: "150px" }}>When</th>
                <th style={{ minWidth: "260px" }}>Action Details</th>
                <th style={{ minWidth: "140px" }}>Status</th>
                <th style={{ minWidth: "180px" }}>Performed By</th>
            </tr>
        </thead>

        <tbody className="animation-fade-in">
            {loading ? (
                /* ... Loading Spinner ... */
                <tr>
                   <td colSpan={4} className="text-center py-5">
                       <div className="spinner-border text-primary opacity-75" style={{ width: '3rem', height: '3rem' }}></div>
                       <p className="mt-2 text-muted fw-bold">Syncing Logs...</p>
                   </td>
                </tr>
            ) : Array.isArray(entityLogs) && entityLogs.length > 0 ? (
                entityLogs.map((item, indx) => (
                    <tr 
                        key={indx} 
                        className="transition-all"
                        style={{ 
                            animation: `slideUp 0.3s ease-out ${indx * 0.05}s both`,
                            borderBottom: "1px solid #f1f1f4"
                        }}
                    >
                        <td className="py-4">
                            <div className="d-flex flex-column">
                                <span className="fw-bold text-dark font-monospace">
                                    {formatToDDMMYYYY_HHMM(item.ChangedOn).split(' ')[0]}
                                </span>
                                <span className="text-muted fs-8">
                                    {formatToDDMMYYYY_HHMM(item.ChangedOn).split(' ')[1]}
                                </span>
                            </div>
                        </td>
                        <td>
                            <div className="text-dark fw-bold fs-7 mb-1">{item.Logs || "System Action"}</div>
                            <span className="text-muted fs-9 text-uppercase ls-1">Activity Log</span>
                        </td>
                        <td>
                            <span className={`badge badge-lg fw-bolder ${getStatusBadgeClass(item.Status)}`}>
                                {item.Status}
                            </span>
                        </td>
                        <td>
                            <div className="d-flex align-items-center">
                                <div className="symbol symbol-35px symbol-circle me-3">
                                    <span className={`symbol-label bg-light-info text-info fw-bold`}>
                                        {(item.LoggedUser || "U")[0]}
                                    </span>
                                </div>
                                <div className="d-flex flex-column">
                                    <span className="text-dark fw-bold text-hover-primary fs-7">
                                        {item.LoggedUser || "Anonymous"}
                                    </span>
                                    <span className="text-muted fs-8">Administrator</span>
                                </div>
                            </div>
                        </td>
                    </tr>
                ))
            ) : (
                /* ... No Data State ... */
                <tr className="bg-light-light">
                   <td colSpan={4} className="text-center py-20">
                      <i className="fa-solid fa-layer-group fs-2x text-muted opacity-25 mb-4 d-block"></i>
                      <span className="text-gray-600 fw-bold">No history available for this document.</span>
                   </td>
                </tr>
            )}
        </tbody>
    </table>
</div>

                        <div className="d-md-none" style={{
                            maxHeight: "70vh",          // ✅ control height
                            overflowY: "auto",
                            paddingBottom: "1rem",
                        }}>
                            {loading ? (
                                <div className="text-center py-5">
                                    <div className="spinner-border text-primary" role="status"></div>
                                    <div className="text-muted mt-2">Loading logs...</div>
                                </div>
                            ) : Array.isArray(entityLogs) && entityLogs.length > 0 ? (
                                entityLogs.map((item, indx) => (
                                    <div
                                        key={indx}
                                        className="card mb-3 shadow-sm border-0"
                                        style={{
                                            background: "linear-gradient(135deg, #f8f9ff, #eef2ff)",
                                            borderRadius: "12px",
                                        }}
                                    >
                                        <div className="card-body p-3">
                                            {/* When */}
                                            <div className="d-flex align-items-center mb-2 text-muted small">
                                                <i className="bi bi-calendar-event me-2 text-primary"></i>
                                                {formatToDDMMYYYY_HHMM(item.ChangedOn)}
                                            </div>

                                            {/* Action */}
                                            <div className="fw-semibold text-dark mb-2">
                                                {item.Logs || "N/A"}
                                            </div>

                                            {/* Status + User */}
                                            <div className="d-flex justify-content-between align-items-center mt-3">
                                                <span
                                                    className={`badge rounded-pill px-3 py-2 ${getStatusBadgeClass(
                                                        item.Status
                                                    )}`}
                                                >
                                                    {item.Status}
                                                </span>

                                                <span className="fw-semibold text-info small">
                                                    <i className="bi bi-person-circle me-1"></i>
                                                    {item.LoggedUser || "N/A"}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-5 text-muted">
                                    <i className="bi bi-info-circle fs-2 d-block mb-2"></i>
                                    No logs found
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            </div>
            <style>
                {`
                /* Table Animation */
@keyframes slideUp {
    from {
        opacity: 0;
        transform: translateY(15px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

/* Row Hover Glow */
.table-hover tbody tr:hover {
    background-color: rgba(var(--kt-primary-rgb), 0.02) !important;
    transition: all 0.2s ease;
}

/* Modern Scrollbar */
.custom-scrollbar::-webkit-scrollbar {
    width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
    background: #e4e6ef;
    border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #cdcfdb;
}

/* Utility classes for tight text */
.ls-1 { letter-spacing: 0.5px; }
.fs-8 { font-size: 0.85rem !important; }
.fs-9 { font-size: 0.75rem !important; }
                    .badge-light-purple {
                        background-color: #d6c1ff;
                        color: #4b0082;
                    }
                        .badge-light-pink {
                        background-color: #f8bbd0;
                        color: #880e4f;
                    }

                    .badge-light-brown {
                        background-color: #d7ccc8;
                        color: #3e2723;
                    }
                    `}
            </style>
        </div>
    );
}

EntityLogs.propTypes = {
    entityObj: PropTypes.object.isRequired,
};