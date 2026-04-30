import React, { useEffect, useState, useRef, useCallback } from "react";
import { Select, Tooltip } from "antd";
import { fetchWithAuth } from "../../../utils/api";
import { BASE_DOCS_API_GET } from "../../Config/Config";

export default function InactiveDocuments() {

    const [sessionUserData, setsessionUserData] = useState({});
    const [inactiveDocs, setInactiveDocs] = useState([]);
    const [loading, setLoading] = useState(false);
    const offcanvasRef = useRef(null);

    useEffect(() => {
        const userDataString = sessionStorage.getItem("userData");
        if (userDataString) {
            const userData = JSON.parse(userDataString);
            setsessionUserData(userData);
        }
    }, []);

    const fetchInactiveDocs = useCallback(async () => {
        if (!sessionUserData?.OrgId) return;

        try {
            const response = await fetchWithAuth(
                `EDM/GetInactiveDocs?OrgId=${sessionUserData?.OrgId}`,
                {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                }
            );

            if (!response.ok) throw new Error("Network response was not ok");

            const data = await response.json();
            setInactiveDocs(data.ResultData || []);

        } catch (error) {
            console.error("Failed to fetch DDL data:", error);
            setInactiveDocs([]);
        }
    }, [sessionUserData?.OrgId, sessionUserData?.Id]);

    useEffect(() => {
        const offcanvasEl = offcanvasRef.current;
        if (!offcanvasEl) return;

        const handleOpen = () => {
            fetchInactiveDocs();
        };

        offcanvasEl.addEventListener("show.bs.offcanvas", handleOpen);

        return () => {
            offcanvasEl.removeEventListener("show.bs.offcanvas", handleOpen);
        };
    }, [fetchInactiveDocs]);

    return (
        <div
            ref={offcanvasRef}
            className="offcanvas offcanvas-end"
            tabIndex="-1"
            id="offcanvasRightInactiveDocs"
            aria-labelledby="offcanvasRightLabel"
            style={{ width: "90%", display: "flex", flexDirection: "column" }}
        >
            <style>
                {`
                    @media (min-width: 768px) {
                        #offcanvasRightInactiveDocs {
                            width: 60% !important;
                        }
                    }
                `}
            </style>
            <div className="offcanvas-header bg-white border-bottom py-4 px-6 d-flex justify-content-between align-items-center shadow-sm">
                <div className="d-flex align-items-center">
                    <div className="symbol symbol-40px me-3">
                        <div className="symbol-label bg-light-primary">
                            <div className="symbol-label bg-light-danger">
                                <i className="bi bi-file-earmark-x text-danger fs-3"></i>
                            </div>
                        </div>
                    </div>
                    <div>
                        <h5 id="offcanvasRightLabel" className="mb-0 fw-bolder text-dark">Inactive Documents</h5>
                    </div>
                </div>

                <button
                    type="button"
                    className="btn btn-icon btn-sm btn-active-light-primary ms-2"
                    data-bs-dismiss="offcanvas"
                    aria-label="Close"
                >
                    <i className="bi bi-x fs-1"></i>
                </button>
            </div>

            <div
    className="offcanvas-body bg-light px-4 py-4"
    style={{
        flex: 1,
        overflowY: "auto",
        overflowX: "hidden",
        minHeight: 0,
    }}
>
    {loading ? (
        <div className="d-flex justify-content-center align-items-center py-5 text-muted">
            <div className="spinner-border spinner-border-sm me-2 text-danger" role="status"></div>
            Loading inactive documents...
        </div>
    ) : inactiveDocs.length === 0 ? (
        <div className="d-flex flex-column justify-content-center align-items-center text-center py-5">
            <i className="bi bi-folder-x fs-1 text-danger mb-3"></i>
            <h6 className="fw-bold mb-1">No inactive documents found</h6>
            <p className="text-muted mb-0 small">
                Once documents become inactive, they will appear here.
            </p>
        </div>
    ) : (
        <div className="d-flex flex-column gap-3">
            {inactiveDocs.map((item) => (
                <div key={item.Id} className="card border-0 shadow-sm rounded-4">
                    <div className="card-body p-4">
                        <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-3">
                            <div>
                                <h5 className="mb-1 fw-bold text-dark">{item.DocName || "-"}</h5>
                                <div className="text-muted small fw-semibold">
                                    {item.DocumentCode || "-"}
                                </div>
                            </div>

                            <span className="badge rounded-pill bg-danger-subtle text-danger px-3 py-2">
                                Inactive
                            </span>
                        </div>

                        <p className="text-muted mb-3">
                            {item.Description || "-"}
                        </p>

                        <div className="row g-3 mb-3">
                            <div className="col-12 col-md-6">
                                <div className="bg-light rounded-3 p-3 h-100">
                                    <div className="text-uppercase text-muted small fw-bold mb-1">Type</div>
                                    <div className="fw-semibold text-dark">{item.TypeName || "-"}</div>
                                </div>
                            </div>

                            <div className="col-12 col-md-6">
                                <div className="bg-light rounded-3 p-3 h-100">
                                    <div className="text-uppercase text-muted small fw-bold mb-1">Department</div>
                                    <div className="fw-semibold text-dark">{item.DeptName || "-"}</div>
                                </div>
                            </div>

                            <div className="col-12 col-md-6">
                                <div className="bg-light rounded-3 p-3 h-100">
                                    <div className="text-uppercase text-muted small fw-bold mb-1">Unit</div>
                                    <div className="fw-semibold text-dark">{item.Unitname || "-"}</div>
                                </div>
                            </div>

                            <div className="col-12 col-md-6">
                                <div className="bg-light rounded-3 p-3 h-100">
                                    <div className="text-uppercase text-muted small fw-bold mb-1">Version</div>
                                    <div className="fw-semibold text-dark">{item.VersionNumber || "-"}</div>
                                </div>
                            </div>

                            <div className="col-12 col-md-6">
                                <div className="bg-light rounded-3 p-3 h-100">
                                    <div className="text-uppercase text-muted small fw-bold mb-1">Doc No</div>
                                    <div className="fw-semibold text-dark">{item.DocNumber || "-"}</div>
                                </div>
                            </div>

                            <div className="col-12 col-md-6">
                                <div className="bg-light rounded-3 p-3 h-100">
                                    <div className="text-uppercase text-muted small fw-bold mb-1">Status</div>
                                    <div className="fw-semibold text-dark">{item.VersionStatus || "-"}</div>
                                </div>
                            </div>
                        </div>

                        <div className="d-flex flex-wrap gap-2 justify-content-between align-items-center">
                            <div className="d-flex flex-wrap gap-2">
                                <span className="badge rounded-pill text-bg-danger text-white px-3 py-2">
                                    <i className="bi bi-calendar-event me-1 text-white"></i>
                                    Expiry: {item.ExpiryDate ? new Date(item.ExpiryDate).toLocaleDateString("en-GB") : "-"}
                                </span>

                                <span className="badge rounded-pill text-bg-secondary px-3 py-2">
                                    <i className="bi bi-file-earmark-text me-1"></i>
                                    {item.FilePath || "-"}
                                </span>
                            </div>

                            <a
                                href={`${BASE_DOCS_API_GET}${item.FilePath}`}
                                target="_blank"
                                rel="noreferrer"
                                className="btn btn-light-primary btn-sm rounded-pill px-3"
                            >
                                <i className="bi bi-download me-1"></i>
                                Download
                            </a>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )}
</div>

        </div>
    );
}