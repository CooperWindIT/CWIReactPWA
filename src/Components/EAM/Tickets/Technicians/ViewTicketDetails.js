import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import Swal from 'sweetalert2';
import { fetchWithAuth } from "../../../../utils/api";
import TicketViewCommentsModal from "./TicketComments";
import TicketResolveModal from "./TicketResolveModal";

export default function TicketViewDetails({ ticObj }) {

    const [sessionUserData, setSessionUserData] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);

    useEffect(() => {
        const userDataString = sessionStorage.getItem("userData");
        if (userDataString) {
            const userData = JSON.parse(userDataString);
            setSessionUserData(userData);
        } else {
            console.log("no session found");
        }
    }, []);

    const handleIsFixedClick = () => {
        setIsResolveModalOpen(true);
    };
    const submitTicketFixed = async (item, logText) => {
        const payload = {
            OrgId: sessionUserData?.OrgId,
            Priority: 1,
            TicketStatus: "TECH_FIXED",
            TicketId: item.TicketId,
            UserId: sessionUserData?.Id,
            JsonData: {
                TicketCreated: item.CreatedBy,
                Logs: logText,
                TicketId: item.TicketId
            }
        };

        try {
            Swal.showLoading(); // You can keep the loading spinner or use an antd Spin
            const res = await fetchWithAuth(`PMMS/TicketsWorkFlow`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const data = await res.json();

            if (data?.success && data?.data?.result?.[0]?.ResponseCode === 3003) {
                setIsResolveModalOpen(false); // ✅ Close modal on success
                Swal.fire("Success", "Ticket resolved.", "success");
            } else {
                Swal.fire("Error", "Failed to resolve", "error");
            }
        } catch (err) {
            Swal.fire("Error", "Server error", "error");
        }
    };

    return (
        <div
            className="offcanvas offcanvas-end"
            tabIndex="-1"
            id="offcanvasRightViewMore"
            aria-labelledby="offcanvasRightLabel"
            style={{ width: "90%" }}
        >
            <style>
                {`
                    @media (min-width: 768px) { /* Medium devices and up (md) */
                        #offcanvasRightViewMore {
                            width: 40% !important;
                        }
                    }
                `}
            </style>
            <div>
                <div className="offcanvas-header d-flex justify-content-between align-items-center bg-white border-bottom py-3">
                    <div className="d-flex align-items-center">
                        <h5 id="offcanvasRightLabel" className="mb-0 fw-bold text-gray-800">Ticket Details</h5>
                    </div>

                    <div className="d-flex align-items-center gap-2">
                        <button
                            className="btn btn-light-primary btn-sm shadow-sm"
                            onClick={() => setIsModalOpen(true)}
                        >
                            <i className="fa-solid fa-comments me-1"></i>
                            <span className="d-none d-md-inline">View Comments</span>
                        </button>

                        {["ASSIGNED"].includes(ticObj?.Status?.toUpperCase()) && (
                            <button
                                className="btn btn-light-success btn-sm d-flex align-items-center gap-2 px-3 fw-bold border-success-subtle shadow-sm"
                                onClick={() => handleIsFixedClick(ticObj)}
                            >
                                <i className="bi bi-check-circle-fill animate-pulse"></i>
                                <span className="d-none d-md-inline">Mark As Fixed</span>
                            </button>
                        )}

                        <div className="vr mx-2 text-gray-300"></div>

                        <button
                            type="button"
                            className="btn-close"
                            data-bs-dismiss="offcanvas"
                            aria-label="Close"
                        ></button>
                    </div>
                </div>
                <div className="offcanvas-body d-flex flex-column h-100 p-0" style={{ backgroundColor: '#f8f9fa' }}>
                    <div className="detail-header p-3 p-md-4 bg-white border-bottom shadow-sm mb-3">
                        <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start gap-2 mb-3">
                            <div>
                                <span className="text-primary fw-bold text-uppercase fs-7">Ticket {ticObj?.TicketCode}</span>
                                <h3 className="fw-bolder mt-1 mb-0 fs-4 fs-md-3">{ticObj?.IssueType}</h3>
                            </div>
                            <span className={`badge px-3 py-2 rounded-pill ${ticObj?.Status === 'NEW' ? 'badge-light-primary' : 'badge-light-success'}`}>
                                {ticObj?.Status}
                            </span>
                        </div>
                        <div className="d-flex align-items-center">
                            <span className={`badge-priority ${ticObj?.Priority || 'NA'}`}>
                                <i className={`bi bi-exclamation-triangle-fill blink-icon me-2 icon-${ticObj?.Priority || 'NA'}`}></i>
                                {ticObj?.Priority || 'N/A'} Priority
                            </span>
                        </div>
                    </div>

                    <div className="flex-grow-1 overflow-auto px-3 px-md-4 pb-4">
                        <div className="glass-card mb-4 p-3 shadow-xs">
                            <label className="section-label fs-8">Issue Description</label>
                            <p className="description-text fs-7">{ticObj?.Description?.split('||')[0].trim()}</p>
                            {ticObj?.Description?.includes('||') && (
                                <div className="mt-2 p-2 rounded bg-light border-start border-3 border-secondary">
                                    {ticObj.Description.split('||').slice(1).map((note, index) => (
                                        <div key={index} className="d-flex align-items-start mb-1">
                                            <i className="bi bi-arrow-return-right me-2 text-muted small mt-1"></i>
                                            <small className="text-muted fs-8 italic">{note.trim()}</small>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="row row-cols-1 row-cols-sm-2 g-3">
                            <div className="col">
                                <div className="info-box h-100">
                                    <i className="bi bi-pc-display text-primary fs-4"></i>
                                    <div className="ms-2">
                                        <label className="fs-9 text-uppercase text-muted fw-bold">Asset</label>
                                        <span className="d-block fs-7 fw-bold">{ticObj?.AssetName}</span>
                                        <small className="text-muted fs-8">{ticObj?.AssetType}</small>
                                    </div>
                                </div>
                            </div>
                            <div className="col">
                                <div className={`info-box h-100 ${ticObj?.Aging?.includes('overdue') ? 'border-danger-subtle bg-danger-light' : ''}`}>
                                    <i className="bi bi-clock-history text-danger fs-4"></i>
                                    <div className="ms-2">
                                        <label className="fs-9 text-uppercase text-muted fw-bold">Aging</label>
                                        <span className={`d-block fs-7 fw-bold ${ticObj?.Aging?.includes('overdue') ? 'text-danger' : ''}`}>{ticObj?.Aging}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="col">
                                <div className="info-box h-100">
                                    <i className="bi bi-building text-info fs-4"></i>
                                    <div className="ms-2">
                                        <label className="fs-9 text-uppercase text-muted fw-bold">Location</label>
                                        <span className="d-block fs-7 fw-bold">{ticObj?.DeptName}</span>
                                        <small className="text-muted fs-8">{ticObj?.UnitName}</small>
                                    </div>
                                </div>
                            </div>
                            <div className="col">
                                <div className="info-box h-100">
                                    <i className="bi bi-person-badge text-warning fs-4"></i>
                                    <div className="ms-2">
                                        <label className="fs-9 text-uppercase text-muted fw-bold">Raised By</label>
                                        <span className="d-block fs-7 fw-bold">{ticObj?.UserName}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 pt-3 border-top">
                            <label className="section-label mb-3 fs-8">Timeline</label>
                            <div className="timeline-container px-2">
                                <div className="timeline-item pb-3">
                                    <div className="timeline-dot bg-success"></div>
                                    <div className="timeline-content ms-2">
                                        <label className="fs-9 text-muted fw-bold text-uppercase">Reported On</label>
                                        <div className="fs-7">{new Date(ticObj?.CreatedOn).toLocaleDateString('en-GB')}</div>
                                    </div>
                                </div>
                                <div className="timeline-item">
                                    <div className={`timeline-dot ${new Date(ticObj?.DueDate) < new Date() ? 'bg-danger' : 'bg-primary'}`}></div>
                                    <div className="timeline-content ms-2">
                                        <label className="fs-9 text-muted fw-bold text-uppercase">Target Resolution</label>
                                        <div className="fs-7 fw-bold">{new Date(ticObj?.DueDate).toLocaleDateString('en-GB')}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style>
                {`/* Custom Header Styling */
                /* Helper for ultra-small text on mobile labels */
                    .fs-9 { font-size: 0.65rem !important; }
                    .ls-1 { letter-spacing: 0.5px; }

                    /* Info Box Styling */
                    .info-box {
                        display: flex;
                        align-items: center;
                        padding: 1rem;
                        background: #ffffff;
                        border: 1px solid #eff2f5;
                        border-radius: 0.75rem;
                        transition: transform 0.2s;
                    }

                    /* Timeline Layout */
                    .timeline-container {
                        border-left: 2px dashed #e1e3ea;
                        margin-left: 0.75rem;
                    }

                    .timeline-item {
                        position: relative;
                        padding-left: 1.5rem;
                    }

                    .timeline-dot {
                        position: absolute;
                        left: -0.45rem; /* Centers on the dashed line */
                        top: 0.25rem;
                        width: 12px;
                        height: 12px;
                        border-radius: 50%;
                        border: 2px solid #fff;
                        box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.8);
                    }

                    /* Glass Card */
                    .glass-card {
                        background: rgba(255, 255, 255, 0.9);
                        border: 1px solid #eff2f5;
                        border-radius: 1rem;
                    }

                    /* Responsive Overrides */
                    @media (max-width: 576px) {
                        .detail-header h3 { font-size: 1.25rem !important; }
                        .info-box { padding: 0.75rem; }
                        .offcanvas-body { font-size: 14px; }
                    }
                .ls-1 { letter-spacing: 1px; }

                /* Section Labels */
                .section-label {
                    display: block;
                    font-size: 0.75rem;
                    font-weight: 800;
                    text-transform: uppercase;
                    color: #a1a5b7;
                    margin-bottom: 0.5rem;
                }

                /* Glass Card Effect */
                .glass-card {
                    background: white;
                    border-radius: 12px;
                    border: 1px solid rgba(0, 0, 0, 0.05);
                }

                .description-text {
                    font-size: 0.95rem;
                    line-height: 1.6;
                    color: #3f4254;
                    margin-bottom: 0;
                }

                /* Info Boxes */
                .info-box {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 12px;
                    background: white;
                    border-radius: 12px;
                    border: 1px solid #f1f1f4;
                }

                .info-box i {
                    font-size: 1.5rem;
                }

                .info-box label {
                    display: block;
                    font-size: 0.7rem;
                    color: #a1a5b7;
                    margin: 0;
                }

                .info-box span {
                    display: block;
                    font-weight: 700;
                    font-size: 0.9rem;
                    color: #181c32;
                }

                .info-box small {
                    display: block;
                    font-size: 0.75rem;
                    color: #b5b5c3;
                }

                /* Timeline Customization */
                .timeline-item {
                    position: relative;
                    padding-left: 24px;
                    border-left: 2px dashed #e1e3ea;
                    margin-left: 10px;
                }

                .timeline-dot {
                    position: absolute;
                    left: -7px;
                    top: 5px;
                    width: 12px;
                    height: 12px;
                    border-radius: 50%;
                    border: 2px solid white;
                }

                .timeline-content label {
                    display: block;
                    font-size: 0.7rem;
                    color: #a1a5b7;
                }

                /* Priority Badges */
                .badge-priority.High { color: #f1416c; background: #fff5f8; border: 1px solid #f1416c; border-radius: 6px; padding: 4px 10px; font-size: 0.75rem; font-weight: 700;}
                .badge-priority.Medium { color: #ffad0f; background: #fff8dd; border: 1px solid #ffad0f; border-radius: 6px; padding: 4px 10px; font-size: 0.75rem; font-weight: 700;}
                .badge-priority.Low { color: #009ef7; background: #f1faff; border: 1px solid #009ef7; border-radius: 6px; padding: 4px 10px; font-size: 0.75rem; font-weight: 700;}

                /* Overdue Background */
                .bg-danger-light { background-color: #fff5f8 !important; 
                }
                /* Custom Blink Animation */
                @keyframes icon-blink {
                    0% { opacity: 1; }
                    50% { opacity: 0.3; }
                    100% { opacity: 1; }
                }

                .blink-icon {
                    animation: icon-blink 1.5s infinite;
                }

                /* Priority Colors for Icons */
                .icon-High { color: #f1416c !important; }    /* Danger Red */
                .icon-Medium { color: #ffad0f !important; }  /* Warning Orange */
                .icon-Low { color: #009ef7 !important; }     /* Primary Blue */
                .icon-NA { color: #a1a5b7 !important; }      /* Secondary Gray */
                `}
            </style>

            {isModalOpen && (
                <TicketViewCommentsModal
                    ticObj={ticObj}
                    onClose={() => setIsModalOpen(false)}
                />
            )}
            <TicketResolveModal
                isOpen={isResolveModalOpen}
                onClose={() => setIsResolveModalOpen(false)}
                onSubmit={submitTicketFixed}
                item={ticObj}
            />
        </div>
    );
};

TicketViewDetails.propTypes = {
    ticObj: PropTypes.object.isRequired,
};
