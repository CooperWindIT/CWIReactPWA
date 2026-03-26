import React from "react";
import PropTypes from "prop-types";

export default function ViewCloseAlert({ alertObj }) {

    return (
        <div
            className="offcanvas offcanvas-end"
            tabIndex="-1"
            id="offcanvasRightViewCloseAlert"
            aria-labelledby="offcanvasRightLabel"
            style={{ width: "90%" }}
        >
            <style>
                {`
                    @media (min-width: 768px) { /* Medium devices and up (md) */
                        #offcanvasRightViewCloseAlert {
                            width: 50% !important;
                        }
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
                                <h6 className="text-primary mb-1"><i className="fa-solid fa-cogs me-2"></i>Machine</h6>
                                <p className="mb-0 fw-semibold">{alertObj?.MachineName || "N/A"}</p>
                            </div>
                        </div>
                        <div className="col-12 col-md-6">
                            <div className="p-2 border rounded bg-light">
                                <h6 className="text-primary mb-1"><i className="fa-solid fa-bell me-2"></i>Alert Title</h6>
                                <p className="mb-0 fw-semibold">{alertObj?.AlertTitle || "N/A"}</p>
                            </div>
                        </div>
                        <div className="col-12 col-md-6">
                            <div className="p-2 border rounded bg-light">
                                <h6 className="text-success mb-1"><i className="fa-solid fa-list-check me-2"></i>Alert Type</h6>
                                <p className="mb-0">{alertObj?.TypeName || "N/A"}</p>
                            </div>
                        </div>
                        <div className="col-12 col-md-6">
                            <div className="p-2 border rounded bg-light">
                                <h6 className="text-warning mb-1"><i className="fa-solid fa-repeat me-2"></i>Occurrence</h6>
                                <p className="mb-0">{alertObj?.OcurrenceTypeNames || "N/A"}</p>
                            </div>
                        </div>
                        <div className="col-12">
                            <div className="p-2 border rounded bg-light">
                                <h6 className="text-info mb-1"><i className="fa-solid fa-users me-2"></i>To Users</h6>
                                <p className="mb-0">{alertObj?.ToUsers || "N/A"}</p>
                            </div>
                        </div>
                        <div className="col-12">
                            <div className="p-2 border rounded bg-light">
                                <h6 className="text-danger mb-1"><i className="fa-solid fa-message me-2"></i>Message</h6>
                                <p className="mb-0">{alertObj?.Message || "N/A"}</p>
                            </div>
                        </div>

                    </div>

                    {alertObj && alertObj?.IsSubmitted && (
                        <div
                            className="mt-4 p-3 border rounded bg-light position-relative"
                            style={{
                                boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
                            }}
                        >
                            {alertObj.ProofUrl && (
                                <a
                                    href={alertObj.ProofUrl}
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
                                    {alertObj.SubmittedOn
                                        ? new Date(alertObj.SubmittedOn).toLocaleDateString("en-GB", {
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
                                    {alertObj?.SubmittedPerson || 'N/A'}
                                </span>
                            </div>

                            {alertObj && alertObj?.IsClosed && (
                                <div className="mb-2 d-flex align-items-center">
                                    <i className="fa-solid fa-calendar-check text-success me-2"></i>
                                    <span className="fw-semibold me-1">Closed Date:</span>
                                    <span className="text-dark">
                                        {alertObj.ClosedDate
                                            ? new Date(alertObj.ClosedDate).toLocaleDateString("en-GB", {
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
                                    {alertObj.Comments || "No comments available."}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </form>
        </div>
    );
}

ViewCloseAlert.propTypes = {
    alertObj: PropTypes.object.isRequired,
};