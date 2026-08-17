import React, { useEffect, useState } from "react";
import { saveReviewCycles } from "../services/kpiServices";
import PropTypes from "prop-types";
import { message, Tooltip } from "antd";

export default function EditReviewCycle({ editReviewCycleData }) {
    const [sessionUserData, setsessionUserData] = useState({});
    const [loading, setLoading] = useState(false);

    const [editData, setEditData] = useState({
        Id: "",
        PeriodId: "",
        CycleName: "",
        StartDate: "",
        EndDate: "",
        SelfReminderOn: "",
        ManagerReminderOn: "",
        PublishReminderOn: "",
        Comments: "",
    });

    useEffect(() => {
        if (editReviewCycleData) {
            setEditData({
                Id: editReviewCycleData.Id || "",
                PeriodId: editReviewCycleData.PeriodId || "",
                CycleName: editReviewCycleData.CycleName || "",

                StartDate: editReviewCycleData.StartDate
                    ? editReviewCycleData.StartDate.substring(0, 10)
                    : "",

                EndDate: editReviewCycleData.EndDate
                    ? editReviewCycleData.EndDate.substring(0, 10)
                    : "",

                SelfReminderOn: editReviewCycleData.SelfReminderOn
                    ? editReviewCycleData.SelfReminderOn.substring(0, 10)
                    : "",

                ManagerReminderOn: editReviewCycleData.ManagerReminderOn
                    ? editReviewCycleData.ManagerReminderOn.substring(0, 10)
                    : "",

                PublishReminderOn: editReviewCycleData.PublishReminderOn
                    ? editReviewCycleData.PublishReminderOn.substring(0, 10)
                    : "",

                Comments: editReviewCycleData.Comments || "",
            });
        }
    }, [editReviewCycleData]);

    useEffect(() => {
        const userDataString = sessionStorage.getItem("userData");

        if (userDataString) {
            setsessionUserData(JSON.parse(userDataString));
        }
    }, []);

    const handleChange = (field, value) => {
        setEditData((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const validateCycle = () => {
        if (
            !editData.SelfReminderOn ||
            !editData.ManagerReminderOn ||
            !editData.PublishReminderOn
        ) {
            message.warning("Please select all reminder dates.");
            return false;
        }

        const startDate = new Date(editData.StartDate);
        const endDate = new Date(editData.EndDate);

        const selfReminder = new Date(editData.SelfReminderOn);
        const managerReminder = new Date(editData.ManagerReminderOn);
        const publishReminder = new Date(editData.PublishReminderOn);

        // Reminder dates should be within review cycle
        if (selfReminder < startDate || selfReminder > endDate) {
            message.warning(
                "Self Reminder date must be within the Review Cycle dates."
            );
            return false;
        }

        if (managerReminder < startDate || managerReminder > endDate) {
            message.warning(
                "Manager Reminder date must be within the Review Cycle dates."
            );
            return false;
        }

        if (publishReminder < startDate || publishReminder > endDate) {
            message.warning(
                "Publish Reminder date must be within the Review Cycle dates."
            );
            return false;
        }

        // Reminder sequence
        if (managerReminder <= selfReminder) {
            message.warning(
                "Manager Reminder date should be after Self Reminder date."
            );
            return false;
        }

        if (publishReminder <= managerReminder) {
            message.warning(
                "Publish Reminder date should be after Manager Reminder date."
            );
            return false;
        }

        return true;
    };

    const handleSubmit = async () => {
        if (!validateCycle()) return;

        setLoading(true);

        const payload = {
            Type: "EDIT",
            OrgId: sessionUserData?.OrgId,
            UserId: sessionUserData?.Id,

            JsonData: {
                Id: editData.Id,
                CycleName: editData.CycleName,

                // Existing dates - not editable by user
                StartDate: editData.StartDate,
                EndDate: editData.EndDate,

                // Editable reminder dates
                SelfReminderOn: editData.SelfReminderOn,
                ManagerReminderOn: editData.ManagerReminderOn,
                PublishReminderOn: editData.PublishReminderOn,

                // Editable comments
                Comments: editData.Comments,
            },
        };

        try {
            const response = await saveReviewCycles(payload);

            if (
                response?.success &&
                response?.data?.result?.[0]?.ResponseCode === 200
            ) {
                message.success(
                    response.data.result[0].Message ||
                    "Review cycle updated successfully."
                );

                document
                    .querySelector(
                        "#offcanvasRightEditReviewCycle .btn-close"
                    )
                    ?.click();

                // If needed, call parent refresh function here
            } else {
                message.error(
                    response?.data?.result?.[0]?.Message ||
                    "Update failed."
                );
            }
        } catch (err) {
            console.error("Edit Review Cycle Error:", err);
            message.error("Something went wrong.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="offcanvas offcanvas-end"
            tabIndex="-1"
            id="offcanvasRightEditReviewCycle"
            style={{ width: "90%" }}
        >
            <style>{`
                    @media(min-width:768px){
                        #offcanvasRightEditReviewCycle{
                            width:50% !important;
                        }
                    }
                    #offcanvasRightEditReviewCycle {
                        --rc-primary: #4f46e5;
                        --rc-primary-soft: #eef2ff;
                        --rc-primary-deep: #3730a3;
                        --rc-warning: #f59e0b;
                        --rc-warning-soft: #fffbeb;
                        --rc-success: #10b981;
                        --rc-success-soft: #ecfdf5;
                        --rc-ink: #1e293b;
                        --rc-muted: #64748b;
                        --rc-border: #e6e8f0;
                        --rc-bg: #f7f8fc;
                    }
                    .rc-header {
                        background: linear-gradient(135deg, var(--rc-primary) 0%, #7c3aed 100%);
                    }
                    .rc-header-icon {
                        width: 42px; height: 42px; border-radius: 12px;
                        background: rgba(255,255,255,0.18);
                        display: flex; align-items: center; justify-content: center;
                        flex-shrink: 0;
                    }
                    .rc-save-btn {
                        background: #ffffff;
                        color: var(--rc-primary-deep);
                        border: none;
                        font-weight: 600;
                        transition: transform 0.15s ease, box-shadow 0.15s ease;
                    }
                    .rc-save-btn:hover:not(:disabled) {
                        transform: translateY(-1px);
                        box-shadow: 0 8px 20px rgba(0,0,0,0.18);
                        color: var(--rc-primary-deep);
                    }
                    .rc-close-btn {
                        filter: brightness(0) invert(1);
                        opacity: 0.85;
                    }
                    .rc-card {
                        background: #fff;
                        border: 1px solid var(--rc-border);
                        border-radius: 16px;
                    }
                    .rc-info-strip {
                        display: flex;
                        gap: 12px;
                        flex-wrap: wrap;
                    }
                    .rc-info-chip {
                        flex: 1;
                        min-width: 150px;
                        background: var(--rc-bg);
                        border: 1px solid var(--rc-border);
                        border-radius: 12px;
                        padding: 12px 14px;
                    }
                    .rc-info-chip .rc-chip-label {
                        display: flex;
                        align-items: center;
                        gap: 6px;
                        font-size: 11px;
                        font-weight: 700;
                        letter-spacing: 0.04em;
                        text-transform: uppercase;
                        color: var(--rc-muted);
                        margin-bottom: 4px;
                    }
                    .rc-info-chip .rc-chip-value {
                        font-size: 14.5px;
                        font-weight: 600;
                        color: var(--rc-ink);
                        font-variant-numeric: tabular-nums;
                    }
                    .rc-section-title {
                        display: flex;
                        align-items: center;
                        gap: 10px;
                        margin-bottom: 4px;
                    }
                    .rc-section-icon {
                        width: 30px; height: 30px; border-radius: 9px;
                        background: var(--rc-warning-soft);
                        color: var(--rc-warning);
                        display: flex; align-items: center; justify-content: center;
                    }
                    .rc-timeline {
                        position: relative;
                        margin-top: 22px;
                    }
                    .rc-timeline-line {
                        position: absolute;
                        left: 19px;
                        top: 8px;
                        bottom: 8px;
                        width: 2px;
                        background: linear-gradient(180deg, var(--rc-primary) 0%, var(--rc-border) 100%);
                        opacity: 0.35;
                    }
                    .rc-step {
                        position: relative;
                        display: flex;
                        gap: 16px;
                        padding-bottom: 26px;
                    }
                    .rc-step:last-child { padding-bottom: 0; }
                    .rc-step-dot {
                        position: relative;
                        z-index: 1;
                        width: 40px; height: 40px;
                        border-radius: 50%;
                        display: flex; align-items: center; justify-content: center;
                        font-size: 15px;
                        flex-shrink: 0;
                        border: 2px solid #fff;
                        box-shadow: 0 0 0 1px var(--rc-border);
                    }
                    .rc-step-dot.self { background: var(--rc-primary-soft); color: var(--rc-primary); }
                    .rc-step-dot.manager { background: var(--rc-warning-soft); color: var(--rc-warning); }
                    .rc-step-dot.publish { background: var(--rc-success-soft); color: var(--rc-success); }
                    .rc-step-body {
                        flex: 1;
                        background: var(--rc-bg);
                        border: 1px solid var(--rc-border);
                        border-radius: 14px;
                        padding: 14px 16px;
                        transition: border-color 0.15s ease, background 0.15s ease;
                    }
                    .rc-step-body:focus-within {
                        border-color: var(--rc-primary);
                        background: #fff;
                    }
                    .rc-step-label {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        margin-bottom: 6px;
                    }
                    .rc-step-label span.name {
                        font-weight: 600;
                        font-size: 14px;
                        color: var(--rc-ink);
                    }
                    .rc-comments-wrap textarea {
                        resize: none;
                    }
                        .rc-reminder-schedule {
    margin-top: 10px;
}

.rc-reminder-item {
    display: flex;
    align-items: center;
    gap: 12px;

    padding: 12px 14px;

    background: #f8fafc;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
}

.rc-reminder-icon {
    width: 36px;
    height: 36px;
    min-width: 36px;

    display: flex;
    align-items: center;
    justify-content: center;

    border-radius: 8px;

    font-size: 15px;
}

.rc-reminder-icon.self {
    background: #eef4ff;
    color: #0d6efd;
}

.rc-reminder-icon.manager {
    background: #ecfdf3;
    color: #16a34a;
}

.rc-reminder-icon.publish {
    background: #fff7ed;
    color: #ea580c;
}

.rc-reminder-content {
    min-width: 0;
}

.rc-reminder-label {
    font-size: 12px;
    font-weight: 600;
    color: #374151;
    margin-bottom: 6px;
    white-space: nowrap;
}

.rc-date-input {
    width: 160px !important;
    max-width: 160px !important;
    height: 34px;
    font-size: 12px;
}
                `}
            </style>

            {/* Header */}
            <div className="offcanvas-header rc-header py-3 px-4 d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center gap-3">
                    <div className="rc-header-icon">
                        <i className="bi bi-pencil-square text-white fs-5"></i>
                    </div>
                    <div>
                        <h4 className="fw-bold mb-0 text-white">Edit Review Cycle</h4>
                        <small className="text-white-50">
                            Update reminder schedule and comments
                        </small>
                    </div>
                </div>

                <div className="d-flex align-items-center gap-2">
                    <button
                        className="btn rc-save-btn rounded-pill px-4 shadow-sm d-flex align-items-center"
                        onClick={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <span
                                    className="spinner-border spinner-border-sm me-2"
                                    role="status"
                                ></span>
                                Saving...
                            </>
                        ) : (
                            <>
                                <i className="bi bi-check-circle me-2"></i>
                                Save
                            </>
                        )}
                    </button>

                    <button
                        type="button"
                        className="btn-close rc-close-btn"
                        data-bs-dismiss="offcanvas"
                        disabled={loading}
                    ></button>
                </div>
            </div>

            {/* Body */}
            <div
                className="offcanvas-body px-4 py-4"
                style={{
                    background: "#f7f8fc",
                    overflowY: "auto",
                }}
            >
                {/* Cycle overview — locked info, no longer looks like a disabled form */}
                <div className="rc-card p-4 mb-3">
                    <div className="rc-section-title mb-3">
                        <div className="rc-section-icon" style={{ background: "#eef2ff", color: "#4f46e5" }}>
                            <i className="bi bi-calendar3"></i>
                        </div>
                        <div>
                            <h6 className="fw-bold mb-0">Cycle Overview</h6>
                            <small className="text-muted">Locked — cannot be edited</small>
                        </div>
                    </div>

                    <div className="rc-info-strip">
                        <div className="rc-info-chip">
                            <div className="rc-chip-label">
                                <i className="bi bi-lock-fill"></i> Cycle Name
                            </div>
                            <div className="rc-chip-value">{editData.CycleName}</div>
                        </div>
                        <div className="rc-info-chip">
                            <div className="rc-chip-label">
                                <i className="bi bi-lock-fill"></i> Start Date
                            </div>
                            <div className="rc-chip-value">{editData.StartDate}</div>
                        </div>
                        <div className="rc-info-chip">
                            <div className="rc-chip-label">
                                <i className="bi bi-lock-fill"></i> End Date
                            </div>
                            <div className="rc-chip-value">{editData.EndDate}</div>
                        </div>
                    </div>
                </div>

                {/* Reminder timeline */}
                <div className="rc-card p-4 mb-3">
                    <div className="rc-reminder-schedule">

                        {/* Heading */}
                        <div className="d-flex align-items-center mb-3">
                            <h6 className="fw-bold mb-0">
                                Reminder Schedule
                            </h6>

                            <Tooltip
                                title={
                                    <div
                                        style={{
                                            minWidth: "260px",
                                            padding: "4px 2px",
                                        }}
                                    >
                                        {/* Header */}
                                        <div
                                            className="d-flex align-items-center"
                                            style={{
                                                fontSize: "13px",
                                                fontWeight: 600,
                                                color: "#ffffff",
                                            }}
                                        >
                                            <i
                                                className="bi bi-calendar2-check-fill me-2"
                                                style={{
                                                    color: "#8ecae6",
                                                    fontSize: "14px",
                                                }}
                                            ></i>

                                            Reminder Schedule
                                        </div>

                                        {/* Divider */}
                                        <div
                                            style={{
                                                height: "1px",
                                                background: "rgba(255,255,255,0.15)",
                                                margin: "8px 0",
                                            }}
                                        ></div>

                                        {/* Content */}
                                        <div
                                            style={{
                                                fontSize: "11.5px",
                                                lineHeight: "1.6",
                                                color: "rgba(255,255,255,0.82)",
                                            }}
                                        >
                                            These dates define when reminders will start for each
                                            stage of the review process.
                                        </div>
                                        <div className="mt-2">
                                            <div className="d-flex align-items-center mb-1">
                                                <i
                                                    className="bi bi-person-check-fill me-2"
                                                    style={{
                                                        color: "#8ecae6",
                                                        fontSize: "11px",
                                                    }}
                                                ></i>
                                                <span
                                                    style={{
                                                        fontSize: "11px",
                                                        color: "#ffffff",
                                                    }}
                                                >
                                                    Self Assessment
                                                </span>
                                            </div>
                                            <div className="d-flex align-items-center mb-1">
                                                <i
                                                    className="bi bi-people-fill me-2"
                                                    style={{
                                                        color: "#86efac",
                                                        fontSize: "11px",
                                                    }}
                                                ></i>
                                                <span
                                                    style={{
                                                        fontSize: "11px",
                                                        color: "#ffffff",
                                                    }}
                                                >
                                                    Manager Evaluation
                                                </span>
                                            </div>
                                            <div className="d-flex align-items-center">
                                                <i
                                                    className="bi bi-send-check-fill me-2"
                                                    style={{
                                                        color: "#fdba74",
                                                        fontSize: "11px",
                                                    }}
                                                ></i>
                                                <span
                                                    style={{
                                                        fontSize: "11px",
                                                        color: "#ffffff",
                                                    }}
                                                >
                                                    Final Review Publication
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                }
                                placement="top"
                            >
                                <i
                                    className="bi bi-info-circle-fill text-primary ms-2 fa-beat-fade"
                                    style={{
                                        cursor: "pointer",
                                        fontSize: "13px",
                                    }}
                                ></i>
                            </Tooltip>
                        </div>

                        <div className="row g-3">
                            <div className="col-lg-4 col-md-4 col-sm-12">
                                <div className="rc-reminder-item">
                                    <div className="rc-reminder-icon self">
                                        <i className="bi bi-person-check-fill"></i>
                                    </div>
                                    <div className="rc-reminder-content">
                                        <div className="rc-reminder-label">
                                            Self Assessment Reminder
                                            <span className="text-danger ms-1">*</span>
                                        </div>
                                        <input
                                            type="date"
                                            className="form-control form-control-sm rc-date-input"
                                            value={editData.SelfReminderOn}
                                            min={editData.StartDate}
                                            max={editData.EndDate}
                                            onChange={(e) =>
                                                handleChange(
                                                    "SelfReminderOn",
                                                    e.target.value
                                                )
                                            }
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="col-lg-4 col-md-4 col-sm-12">
                                <div className="rc-reminder-item">
                                    <div className="rc-reminder-icon manager">
                                        <i className="bi bi-people-fill"></i>
                                    </div>
                                    <div className="rc-reminder-content">
                                        <div className="rc-reminder-label">
                                            Manager Evaluation Reminder
                                            <span className="text-danger ms-1">*</span>
                                        </div>
                                        <input
                                            type="date"
                                            className="form-control form-control-sm rc-date-input"
                                            value={editData.ManagerReminderOn}
                                            min={
                                                editData.SelfReminderOn ||
                                                editData.StartDate
                                            }
                                            max={editData.EndDate}
                                            onChange={(e) =>
                                                handleChange(
                                                    "ManagerReminderOn",
                                                    e.target.value
                                                )
                                            }
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="col-lg-4 col-md-4 col-sm-12">
                                <div className="rc-reminder-item">
                                    <div className="rc-reminder-icon publish">
                                        <i className="bi bi-send-check-fill"></i>
                                    </div>
                                    <div className="rc-reminder-content">
                                        <div className="rc-reminder-label">
                                            Publish Reminder
                                            <span className="text-danger ms-1">*</span>
                                        </div>
                                        <input
                                            type="date"
                                            className="form-control form-control-sm rc-date-input"
                                            value={editData.PublishReminderOn}
                                            min={
                                                editData.ManagerReminderOn ||
                                                editData.StartDate
                                            }
                                            max={editData.EndDate}
                                            onChange={(e) =>
                                                handleChange(
                                                    "PublishReminderOn",
                                                    e.target.value
                                                )
                                            }
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Comments */}
                <div className="rc-card p-4 rc-comments-wrap">
                    <div className="rc-section-title mb-3">
                        <div className="rc-section-icon" style={{ background: "#f1f5f9", color: "#475569" }}>
                            <i className="bi bi-chat-left-text-fill"></i>
                        </div>
                        <div>
                            <h6 className="fw-bold mb-0">Comments</h6>
                            <small className="text-muted">Optional notes for this update</small>
                        </div>
                    </div>

                    <textarea
                        className="form-control"
                        rows="4"
                        placeholder="Enter comments..."
                        value={editData.Comments}
                        onChange={(e) => handleChange("Comments", e.target.value)}
                    />
                </div>
            </div>
        </div>
    );
}

EditReviewCycle.propTypes = {
    editReviewCycleData: PropTypes.object,
};