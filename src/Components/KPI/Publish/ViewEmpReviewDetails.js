import React, { useEffect, useState, useRef } from "react";
import { getCyclesScoreByUserId, SaveAssessments, getFeedBacks, addNewComments } from "../services/kpiServices";
import PropTypes from "prop-types";
import { calculateKPI } from './../../../utils/kpiCalculator';
import { Input, Tooltip, Button, Modal, message } from "antd";
import Swal from "sweetalert2";

export default function ViewEmpReview({ empReviewData }) {

    const [sessionUserData, setsessionUserData] = useState({});
    const [reviewKPIs, setReviewKPIs] = useState([]);
    const [reviewTotalWeightedScore, setReviewTotalWeightedScore] = useState(0);
    const [reviewEmployeeStatus, setReviewEmployeeStatus] = useState("Pending");
    const [reviewLoading, setReviewLoading] = useState(false);
    const [reviewExpandedCards, setReviewExpandedCards] = useState(new Set());
    const [reviewSubmitLoading, setReviewSubmitLoading] = useState(false);
    const [feedbackModal, setFeedbackModal] = useState(false);
    const [selectedFeedback, setSelectedFeedback] = useState(null);
    const [feedbackLoading, setFeedbackLoading] = useState(false);
    const [feedbackData, setFeedbackData] = useState([]);
    const [editingCommentId, setEditingCommentId] = useState(0);
    const [feedback, setFeedback] = useState("");
    const feedbackInputRef = useRef(null);

    useEffect(() => {
        const userDataString = sessionStorage.getItem("userData");

        if (userDataString) {
            setsessionUserData(JSON.parse(userDataString));
        }
    }, []);

    const recalculateScores = (data) => {

        const updatedData = data.map(item => {

            const actual = Number(
                sessionUserData?.RoleId === 3
                    ? item.Score1
                    : item.Score2
            );

            const { calculatedScore, weightedScore } = calculateKPI({
                FormulaId: item.FormulaId,
                Target: item.Target,
                Actual: actual,
                Weightage: item.Weightage
            });

            return {
                ...item,
                CalculatedScore: calculatedScore,
                WeightedScore: weightedScore
            };
        });

        const total = updatedData.reduce(
            (sum, item) => sum + Number(item.WeightedScore || 0),
            0
        );

        return {
            updatedData,
            total
        };
    };

    const fetchCyclesScoreByUserId = async () => {
        try {
            setReviewLoading(true);

            const response = await getCyclesScoreByUserId({
                orgId: sessionUserData?.OrgId,
                cycleId: empReviewData?.ReviewCycleId,
                employeeId: empReviewData?.UserId,
                periodId: empReviewData?.PeriodId,
            });

            const data = response?.data || [];

            setReviewEmployeeStatus(data[0]?.Status || "Pending");

            const { updatedData, total } = recalculateScores(data);

            setReviewKPIs(updatedData);
            setReviewTotalWeightedScore(total);

        } catch (error) {
            console.error("Error fetching employee review:", error);

            setReviewKPIs([]);
            setReviewTotalWeightedScore(0);

        } finally {
            setReviewLoading(false);
        }
    };

    const fetchFeedBacks = async () => {
        try {

            const response = await getFeedBacks({
                orgId: sessionUserData?.OrgId,
                id: selectedFeedback?.Id,
            });

            setFeedbackData(response?.data || []);

        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        if (empReviewData?.UserId) {
            fetchCyclesScoreByUserId();
        };
    }, [empReviewData?.UserId]);

    useEffect(() => {
        if (selectedFeedback) {
            fetchFeedBacks();
        };
    }, [selectedFeedback]);

    const toggleReviewCard = (cardId) => {
        setReviewExpandedCards((prev) => {
            const next = new Set(prev);

            if (next.has(cardId)) {
                next.delete(cardId);
            } else {
                next.add(cardId);
            }

            return next;
        });
    };

    const handleReviewConfirmation = async () => {
        const result = await Swal.fire({
            title: "Mark Review as Reviewed?",
            text: `Are you sure you want to mark ${empReviewData?.UserName || "this employee's review"} as reviewed?`,
            icon: "warning",
            showCancelButton: true,

            confirmButtonText:
                '<i class="bi bi-check-circle-fill me-1"></i> Yes, Mark as Reviewed',

            cancelButtonText:
                '<i class="bi bi-x-circle-fill me-1"></i> No',

            confirmButtonColor: "#198754",
            cancelButtonColor: "#6b7280",

            reverseButtons: true,
            allowOutsideClick: false,
            buttonsStyling: true,
        });

        if (result.isConfirmed) {
            handleSaveReviewed();
        }
    };

    const handleSaveReviewed = async () => {
        const payload = {
            OrgId: sessionUserData.OrgId,
            UserId: sessionUserData.Id,
            Action: "HR_REVIEWED",
            JsonData: {
                Id: empReviewData?.CycleScoreId,
            },
        };
    
        try {
            setReviewSubmitLoading(true);
    
            const response = await SaveAssessments(payload);
    
            if (
                response?.success &&
                response?.data?.result?.[0]?.ResponseCode === 200
            ) {
                const successMessage =
                    response.data.result[0].Message ||
                    "Review marked as reviewed successfully.";
    
                await Swal.fire({
                    icon: "success",
                    title: "Review Completed",
                    text: successMessage,
                    confirmButtonText:
                        '<i class="bi bi-check-circle-fill me-1"></i> OK',
                    confirmButtonColor: "#198754",
                    allowOutsideClick: false,
                    allowEscapeKey: false,
                });
    
                // Reload only after clicking OK
                window.location.reload();
    
            } else {
                const errorMessage =
                    response?.data?.result?.[0]?.Message ||
                    "Failed to mark the review as reviewed.";
    
                await Swal.fire({
                    icon: "error",
                    title: "Review Failed",
                    text: errorMessage,
                    confirmButtonText: "OK",
                    confirmButtonColor: "#dc2626",
                });
            }
        } catch (error) {
            console.error(error);
    
            await Swal.fire({
                icon: "error",
                title: "Something Went Wrong",
                text: "Unable to complete the review. Please try again.",
                confirmButtonText: "OK",
                confirmButtonColor: "#dc2626",
            });
        } finally {
            setReviewSubmitLoading(false);
        }
    };

    const handleSaveFeedback = async () => {
        if (!feedback?.trim()) {
            message.warning("Please enter feedback.");
            return;
        }
        console.log(selectedFeedback)

        if (!selectedFeedback?.Id) {
            message.error("KPI details not found.");
            return;
        }

        try {
            setFeedbackLoading(true);

            const payload = {
                OrgId: sessionUserData?.OrgId,
                Priority: 1,
                UserId: sessionUserData?.Id,
                CommentType: "KPI",
                JsonData: {
                    CommentText: feedback.trim(),
                    TablePrimaryId: selectedFeedback?.Id,
                    EmployeeKPIId: selectedFeedback?.EmployeeKPIId,
                    CycleId: empReviewData?.CycleId,
                    CommentId: editingCommentId || 0,
                },
            };

            const response = await addNewComments(payload);

            const result = response?.data?.result?.[0];

            if (response?.success && result?.ResponseCode === 2002) {
                message.success("Feedback added successfully.");

                setFeedback("");
                fetchFeedBacks();
            } else {
                message.error(
                    response?.message || "Failed to add feedback."
                );
            }
        } catch (error) {
            console.error("Feedback submission error:", error);
            message.error("Something went wrong while saving feedback.");
        } finally {
            setFeedbackLoading(false);
        }
    };

    useEffect(() => {
        if (feedbackModal) {
            setTimeout(() => {
                feedbackInputRef.current?.focus();
            }, 100);
        }
    }, [feedbackModal]);

    return (
        <div
            className={`offcanvas offcanvas-end ${feedbackModal ? "feedback-modal-open" : ""
                }`}
            tabIndex="-1"
            id="offcanvasRightViewReview"
            data-bs-focus="false"
            style={{ width: "90%" }}
        >
            <style>
                {`
                    @media (min-width: 768px) {
                        #offcanvasRightViewReview {
                            width: 65% !important;
                        }
                    }
                    .feedback-modal-open {
                        pointer-events: none !important;
                    }

                    .feedback-modal-open * {
                        pointer-events: none !important;
                    }
                `}
            </style>

            <div className="offcanvas-header border-bottom px-4 py-3">
                <div className="flex-grow-1">
                    <h5 className="offcanvas-title fw-bold mb-1">
                        <i className="bi bi-clipboard-check text-primary me-2"></i>
                        Employee Review
                    </h5>

                    {empReviewData && (
                        <div className="text-muted small">
                            {empReviewData.UserName || "---"}
                            {" "}
                            {empReviewData.EmpNo
                                ? `(${empReviewData.EmpNo})`
                                : ""}
                        </div>
                    )}
                </div>
                <div className="d-flex align-items-center gap-2 ms-auto flex-shrink-0">
                    <button
                        type="button"
                        className="btn btn-success btn-sm px-3"
                        onClick={handleReviewConfirmation}
                        disabled={reviewSubmitLoading || empReviewData?.UserStatus !== "FEEDBACK_REVIEWED"}
                    >
                        {reviewSubmitLoading ? (
                            <>
                                <span
                                    className="spinner-border spinner-border-sm me-2"
                                    role="status"
                                ></span>
                                Reviewing...
                            </>
                        ) : (
                            <>
                                <i className="bi bi-check-circle-fill me-2"></i>
                                Review
                            </>
                        )}
                    </button>

                    <button
                        type="button"
                        className="btn-close ms-1"
                        data-bs-dismiss="offcanvas"
                        aria-label="Close"
                        disabled={reviewSubmitLoading}
                    ></button>
                </div>
            </div>

            <div className="offcanvas-body bg-light">
                {reviewLoading ? (
                    <div className="d-flex justify-content-center align-items-center py-5">
                        <div className="text-center">
                            <div
                                className="spinner-border text-primary mb-3"
                                role="status"
                            ></div>

                            <div className="text-muted">
                                Loading review details...
                            </div>
                        </div>
                    </div>

                ) : (

                    <>
                        {/* Employee summary */}
                        <div className="card border-0 shadow-sm rounded-4 mb-4">
                            <div className="card-body p-4">
                                <div className="row align-items-center">
                                    <div className="col-md-8">
                                        <div className="d-flex align-items-center">
                                            <div
                                                className="rounded-circle bg-light-primary text-primary d-flex align-items-center justify-content-center me-3"
                                                style={{
                                                    width: 55,
                                                    height: 55,
                                                    fontSize: 20,
                                                }}
                                            >
                                                <i className="bi bi-person-fill"></i>
                                            </div>

                                            <div>
                                                <h5 className="fw-bold mb-1">
                                                    {empReviewData.UserName ||
                                                        "---"}
                                                </h5>

                                                <div className="text-muted small">
                                                    Employee No:{" "}
                                                    {empReviewData.EmpNo ||
                                                        "-"}
                                                </div>

                                                <div className="text-muted small">
                                                    Manager:{" "}
                                                    {empReviewData.ManagerName ||
                                                        "-"}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="col-md-4 text-md-end mt-3 mt-md-0">
                                        <div className="small text-muted">
                                            Review Status
                                        </div>

                                        <span className="badge bg-light-primary text-primary px-3 py-2 mt-1">
                                            {reviewEmployeeStatus}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>


                        {/* KPI Details */}
                        <div className="card border-0 shadow-sm rounded-4">
                            <div className="card-header bg-white border-0 py-3 px-4">
                                <div className="d-flex justify-content-between align-items-center">
                                    <div>
                                        <h5 className="fw-bold mb-0">
                                            <i className="bi bi-bullseye text-primary me-2"></i>
                                            KPI Details
                                        </h5>

                                        <small className="text-muted">
                                            Review and manage KPI evaluation details
                                        </small>
                                    </div>
                                    <div className="text-end">

                                        <small className="text-muted d-block">
                                            Final Score
                                        </small>
                                        <h4 className="fw-bold text-primary mb-0">
                                            {Number(
                                                reviewTotalWeightedScore || 0
                                            ).toFixed(2)}
                                        </h4>
                                    </div>
                                </div>
                            </div>

                            <div className="card-body p-3">
                                {reviewKPIs?.length === 0 ? (
                                    <div className="text-center py-5 text-muted">
                                        <i className="bi bi-inbox fs-1 d-block mb-3"></i>
                                        No KPI review details found.
                                    </div>
                                ) : (
                                    reviewKPIs.map((item, index) => {

                                        const cardId = item.Id ?? index;

                                        const isExpanded =
                                            reviewExpandedCards.has(cardId);

                                        return (
                                            <div
                                                className="card shadow-sm border-0 rounded-4 mb-3"
                                                key={cardId}
                                            >
                                                <div className="card-body p-3">
                                                    {/* KPI HEADER */}
                                                    <div
    className="d-flex justify-content-between align-items-center gap-2"
    style={{ cursor: "pointer" }}
    onClick={() => toggleReviewCard(cardId)}
>
    <div className="d-flex align-items-center flex-grow-1 min-w-0">

        <i
            className={`bi ${
                isExpanded
                    ? "bi-chevron-down"
                    : "bi-chevron-right"
            } text-muted me-2 me-md-3`}
        ></i>

        <div
            className="rounded-circle bg-light-success text-success fw-bold d-flex align-items-center justify-content-center flex-shrink-0"
            style={{
                width: 34,
                height: 34,
                fontSize: 13,
            }}
        >
            {String(index + 1).padStart(2, "0")}
        </div>

        <div className="ms-2 ms-md-3 min-w-0">

            <div className="d-flex align-items-center min-w-0">

            <Tooltip title={item.KPIName}>
                                                                                        <h6
                                                                                            className="fw-bold mb-0 kpi-name d-block d-md-none"
                                                                                            title={item.KPIName}
                                                                                        >
                                                                                            {item.KPIName?.length > 10
                                                                                                ? `${item.KPIName.substring(0, 10)}...`
                                                                                                : item.KPIName}
                                                                                        </h6>
                                                                                        <h6
                                                                                            className="fw-bold mb-0 kpi-name d-none d-md-block"
                                                                                            title={item.KPIName}
                                                                                        >
                                                                                            {item.KPIName?.length > 70
                                                                                                ? `${item.KPIName.substring(0, 70)}...`
                                                                                                : item.KPIName}
                                                                                        </h6>
                                                                                    </Tooltip>

                {item.Objectives && (
                    <Tooltip
                        title={
                            <div
                                dangerouslySetInnerHTML={{
                                    __html: item.Objectives,
                                }}
                            />
                        }
                    >
                        <i className="bi bi-question-circle-fill text-primary ms-2 flex-shrink-0"></i>
                    </Tooltip>
                )}

            </div>

            <div className="d-flex flex-wrap gap-1">

                <span className="badge bg-light-primary text-primary mt-1">
                    <i className="bi bi-rulers me-1"></i>
                    {item.UOMName || "N/A"}
                </span>

                <span className="badge bg-light-success text-success mt-1">
                    <i className="bi bi-check-circle me-1"></i>
                    {item.Status || "Pending"}
                </span>

            </div>

        </div>
    </div>

    <div className="text-end flex-shrink-0">

        <small className="text-muted d-block">
            Final Score
        </small>

        <h5 className="fw-bold text-primary mb-0">
            {Number(item.WeightedScore ?? 0).toFixed(2)}
        </h5>

    </div>
</div>

                                                    {/* KPI DETAILS */}
                                                    {isExpanded && (
                                                        <div className="mt-3">
                                                            <hr />
                                                            <div className="row g-3 mb-4">
                                                                <div className="col">
                                                                    <div className="metric-box">
                                                                        <div className="metric-icon bg-light-primary">
                                                                            <i className="bi bi-bullseye text-primary"></i> 
                                                                        </div>
                                                                        <div className="metric-content">
                                                                            <span>
                                                                                Target
                                                                            </span>
                                                                            <h6>
                                                                                {item.Target ??
                                                                                    "-"}
                                                                            </h6>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="col">
                                                                    <div className="metric-box">
                                                                        <div className="metric-icon bg-light-info">
                                                                            <i className="bi bi-percent text-info"></i>
                                                                        </div>
                                                                        <div className="metric-content">
                                                                            <span>
                                                                                Weightage
                                                                            </span>
                                                                            <h6>
                                                                                {item.AppliedWeightage ??
                                                                                    item.Weightage ??
                                                                                    "-"}
                                                                                %
                                                                            </h6>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="col">
                                                                    <div className="metric-box">
                                                                        <div className="metric-icon bg-light-success">
                                                                            <i className="bi bi-calculator-fill text-success"></i>
                                                                        </div>
                                                                        <div className="metric-content">
                                                                            <span>
                                                                                Calculated Score
                                                                            </span>
                                                                            <h6>
                                                                                {item.CalculatedScore ??
                                                                                    "-"}
                                                                            </h6>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="col">
                                                                    <div className="metric-box">
                                                                        <div className="metric-icon bg-light-danger">
                                                                            <i className="bi bi-bar-chart-line-fill text-danger"></i>
                                                                        </div>
                                                                        <div className="metric-content">
                                                                            <span>
                                                                                Weighted Score
                                                                            </span>
                                                                            <h6>
                                                                                {item.WeightedScore ??
                                                                                    "-"}
                                                                            </h6>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="col">
                                                                    <div className="metric-box">
                                                                        <div className="metric-icon bg-light-dark">
                                                                            <i className="bi bi-rulers text-dark"></i>
                                                                        </div>
                                                                        <div className="metric-content">
                                                                            <span>
                                                                                Measurables
                                                                            </span>
                                                                            <h6>
                                                                                {item.Measurables ??
                                                                                    "-"}
                                                                            </h6>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="row g-3">
                                                                <div className="col-lg-6">
                                                                    <div className="card border h-100">
                                                                        <div className="card-body">
                                                                            <div className="d-flex align-items-center border-bottom pb-2 mb-3">
                                                                                <i className="bi bi-person-fill text-primary me-2"></i>
                                                                                <h6 className="mb-0 fw-bold">
                                                                                    Self Review
                                                                                </h6>
                                                                            </div>
                                                                            <label className="small fw-semibold mb-1">
                                                                                <i className="bi bi-star me-1 text-warning"></i>
                                                                                Self Score
                                                                            </label>
                                                                            <Input
                                                                                size="large"
                                                                                style={{
                                                                                    height: 40,
                                                                                }}
                                                                                type="number"
                                                                                value={
                                                                                    item.Status ===
                                                                                        "DRAFT"
                                                                                        ? ""
                                                                                        : item.Score1 ??
                                                                                        ""
                                                                                }
                                                                                disabled
                                                                            />
                                                                            <label className="small fw-semibold mb-1 mt-3">
                                                                                <i className="bi bi-chat-left-text me-1 text-primary"></i>
                                                                                Self Feedback
                                                                            </label>
                                                                            <Input.TextArea
                                                                                rows={3}
                                                                                value={
                                                                                    item.Status ===
                                                                                        "DRAFT"
                                                                                        ? ""
                                                                                        : item.Remarks1 ??
                                                                                        ""
                                                                                }
                                                                                disabled
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="col-lg-6">
                                                                    <div className="card border h-100">
                                                                        <div className="card-body">
                                                                            <div className="d-flex align-items-center border-bottom pb-2 mb-3">
                                                                                <i className="bi bi-person-workspace text-success me-2"></i>
                                                                                <h6 className="mb-0 fw-bold">
                                                                                    Manager Review
                                                                                </h6>
                                                                            </div>
                                                                            <label className="small fw-semibold mb-1">
                                                                                <i className="bi bi-star-fill me-1 text-warning"></i>
                                                                                Manager Score
                                                                            </label>
                                                                            <Input
                                                                                size="large"
                                                                                style={{
                                                                                    height: 40,
                                                                                }}
                                                                                type="number"
                                                                                value={
                                                                                    item.Score2 ??
                                                                                    ""
                                                                                }
                                                                                disabled
                                                                            />
                                                                            <label className="small fw-semibold mb-1 mt-3">
                                                                                <i className="bi bi-chat-left-text-fill me-1 text-success"></i>
                                                                                Manager Feedback
                                                                            </label>
                                                                            <Input.TextArea
                                                                                rows={3}
                                                                                value={
                                                                                    item.Remarks2 ??
                                                                                    ""
                                                                                }
                                                                                disabled
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="d-flex justify-content-end mt-3 mobile-feedback-button">
    <Button
        type="default"
        className="btn-premium-outline-info"
        icon={
            <i className="bi bi-chat-square-text-fill"></i>
        }
        onClick={(e) => {
            e.stopPropagation();
            setSelectedFeedback(item);
            setFeedbackModal(true);
        }}
    >
        Any Time Feedback
    </Button>
</div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>


            {/* Any time feedback Model */}
            <Modal
                open={feedbackModal}
                footer={null}
                centered
                width={900}
                destroyOnClose
                zIndex={9999}
                getContainer={() => document.body}
                maskClosable={false}
                onCancel={() => {
                    setFeedbackModal(false);
                    setFeedback("");
                    setEditingCommentId(0);
                }}
            >
                <div className="feedback-modal">
                    <div className="feedback-header mb-3">
                        <div className="feedback-icon">
                            <i className="bi bi-chat-heart-fill text-white"></i>
                        </div>
                        <div className="flex-grow-1 ms-3">
                            <h5 className="fw-bold mb-0">
                                Performance Feedback
                            </h5>
                            <small className="text-muted">
                                Employee KPI Review
                            </small>
                        </div>
                        <span className="badge bg-light-primary text-primary px-3 py-2">
                            Score {Number(selectedFeedback?.WeightedScore ?? 0).toFixed(2)}
                        </span>
                    </div>

                    {/* KPI */}
                    <div className="feedback-kpi-card mb-4">
                        <div className="fw-bold fs-5">
                            {selectedFeedback?.KPIName}
                        </div>
                    </div>

                    {/* Previous Feedback */}
                    <div className="mb-4">
                        <div className="d-flex align-items-center justify-content-between mb-3">
                            <h6 className="fw-bold mb-0">
                                <i className="bi bi-clock-history text-primary me-2"></i>
                                Previous Feedback
                            </h6>

                            <span className="badge bg-light-secondary text-dark">
                                {feedbackData?.length || 0} Records
                            </span>
                        </div>

                        <div className="feedback-history">
                            {feedbackData?.length > 0 ? (
                                feedbackData?.map((item, index) => (
                                    <div
                                        className="feedback-item"
                                        key={`${item.tablePrimaryId}-${index}`}
                                    >
                                        <div className="feedback-avatar bg-light-success">
                                            <i className="bi bi-person-check-fill text-success"></i>
                                        </div>
                                        <div className="feedback-content">
                                            <div className="d-flex justify-content-between align-items-center">
                                                <strong>
                                                    Feedback #{feedbackData.length - index} <span className="text-info">({item.Name})</span>
                                                </strong>

                                                <div className="d-flex align-items-center gap-2">

                                                    <small className="text-info fw-bold">
                                                        {item.CommentedOn
                                                            ? new Date(item.CommentedOn.replace("Z", "")).toLocaleString(
                                                                "en-IN",
                                                                {
                                                                    day: "2-digit",
                                                                    month: "short",
                                                                    year: "numeric",
                                                                    hour: "2-digit",
                                                                    minute: "2-digit",
                                                                    hour12: false,
                                                                }
                                                            )
                                                            : "-"}
                                                    </small>

                                                    {item.CommentedBy === sessionUserData?.Id && (
                                                        <Tooltip title="Edit Feedback">
                                                            <Button
                                                                type="default"
                                                                shape="circle"
                                                                size="small"
                                                                icon={<i className="bi bi-pencil-fill text-primary"></i>}
                                                                onClick={() => {
                                                                    setEditingCommentId(item.Id);
                                                                    setFeedback(item.CommentText);
                                                                }}
                                                                style={{
                                                                    border: "1px solid #dbe4f0",
                                                                    background: "#fff",
                                                                    boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
                                                                }}
                                                            />
                                                        </Tooltip>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="text-muted mt-1">
                                                {item.CommentText}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center text-muted py-4">
                                    <i className="bi bi-chat-left-text fs-2 d-block mb-2"></i>
                                    No previous feedback available.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Add Feedback */}
                    <div>
                        <label className="form-label fw-semibold">
                            <i className="bi bi-pencil-square text-primary me-2"></i>
                            {editingCommentId ? "Edit Feedback" : "Add New Feedback"}
                        </label>
                        <Input.TextArea
                            rows={5}
                            ref={feedbackInputRef}
                            placeholder="Provide constructive feedback..."
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            maxLength={500}
                            showCount
                        />
                    </div>

                    <div className="d-flex justify-content-end gap-2 mt-7">
                        <Button onClick={() => { setFeedbackModal(false); setFeedback(""); }}>
                            Cancel
                        </Button>

                        <Button
                            type="primary"
                            loading={feedbackLoading}
                            disabled={!feedback?.trim() || feedbackLoading}
                            icon={
                                !feedbackLoading
                                    ? <i className="bi bi-send-fill text-white"></i>
                                    : null
                            }
                            onClick={handleSaveFeedback}
                        >
                            {feedbackLoading
                                ? "Saving..."
                                : editingCommentId
                                    ? "Update Feedback"
                                    : "Save Feedback"}
                        </Button>
                    </div>
                </div>
            </Modal>

            <style>
                {`
                @media (max-width: 767.98px) {
    .mobile-feedback-button {
        justify-content: stretch !important;
    }

    .mobile-feedback-button .ant-btn {
        width: 100%;
    }
}
                 .feedback-header{
                        display:flex;
                        align-items:center;
                    }

                    .feedback-icon{
                        width:46px;
                        height:46px;
                        border-radius:12px;
                        background:linear-gradient(135deg,#009ef7,#7239ea);
                        display:flex;
                        justify-content:center;
                        align-items:center;
                        font-size:20px;
                    }

                    .feedback-kpi-card{
                        padding:14px 18px;
                        border:1px solid #edf2f7;
                        border-radius:12px;
                        background:#fafcff;
                    }

                    .feedback-history{
                        max-height:220px;
                        overflow:auto;
                        padding-right:6px;
                    }

                    .feedback-item{
                        display:flex;
                        gap:12px;
                        padding:14px;
                        border:1px solid #edf2f7;
                        border-radius:12px;
                        margin-bottom:12px;
                        transition:.25s;
                    }

                    .feedback-item:hover{
                        border-color:#009ef7;
                        box-shadow:0 5px 15px rgba(0,0,0,.05);
                    }

                    .feedback-avatar{
                        width:42px;
                        height:42px;
                        border-radius:50%;
                        display:flex;
                        align-items:center;
                        justify-content:center;
                        flex-shrink:0;
                    }

                    .feedback-content{
                        flex:1;
                    }
                    .btn-premium-outline-info{
                        background:#fff !important;
                        color:#0dcaf0 !important;
                        border:1px solid #0dcaf0 !important;
                        border-radius:10px;
                        font-weight:600;
                    }

                    .btn-premium-outline-info:hover{
                        background:#0dcaf0 !important;
                        color:#fff !important;
                        border-color:#0dcaf0 !important;
                    }
                                    .feedback-header{
                    display:flex;
                    align-items:center;
                    margin-bottom:24px;
                    }


                    .feedback-kpi-card{
                    margin-top:20px;
                    padding:18px;
                    border-radius:14px;
                    background:#f8fbff;
                    border:1px solid #e5eefc;
                    }

                    .feedback-modal textarea{
                    border-radius:12px;
                    }
                    .metric-box{
                        height:72px;
                        border:1px solid #edf1f7;
                        border-radius:12px;
                        display:flex;
                        align-items:center;
                        padding:12px 14px;
                        background:#fff;
                        transition:.25s;
                    }

                    .metric-box:hover{
                        transform:translateY(-2px);
                        box-shadow:0 8px 18px rgba(0,0,0,.08);
                        border-color:#009ef7;
                    }

                    .metric-icon{
                        width:42px;
                        height:42px;
                        border-radius:10px;
                        display:flex;
                        align-items:center;
                        justify-content:center;
                        flex-shrink:0;
                        margin-right:12px;
                    }

                    .metric-icon i{
                        font-size:18px;
                    }

                    .metric-content{
                        display:flex;
                        flex-direction:column;
                        justify-content:center;
                        overflow:hidden;
                    }

                    .metric-content span{
                        font-size:12px;
                        color:#7e8299;
                        line-height:1;
                        margin-bottom:5px;
                    }

                    .metric-content h6{
                        margin:0;
                        font-size:18px;
                        font-weight:700;
                        color:#181c32;
                    }
`}
            </style>
        </div>
    );
}

ViewEmpReview.propTypes = {
    empReviewData: PropTypes.object,
};