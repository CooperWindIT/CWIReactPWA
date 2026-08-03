import React, { useEffect, useState } from "react";
import { saveReviewCycles } from "../services/kpiServices";
import PropTypes from "prop-types";
import { message } from "antd";

export default function EditReviewCycle({ editReviewCycleData }) {
    const [sessionUserData, setsessionUserData] = useState({});
    const [loading, setLoading] = useState(false);

    const [editData, setEditData] = useState({
        Id: "",
        PeriodId: "",
        CycleName: "",
        StartDate: "",
        EndDate: "",
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
        if (!editData.StartDate || !editData.EndDate) {
            message.warning("Please select both Start Date and End Date.");
            return false;
        }

        if (new Date(editData.EndDate) <= new Date(editData.StartDate)) {
            message.warning("End Date should be greater than Start Date.");
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
                StartDate: editData.StartDate,
                EndDate: editData.EndDate,
                Comments: editData.Comments,
            },
        };

        try {
            const response = await saveReviewCycles(payload);

            if (
                response?.success &&
                response?.data?.result?.[0]?.ResponseCode === 200
            ) {
                message.success(response.data.result[0].Message);

                // Refresh List
                // getReviewCycles();

                document.querySelector(
                    "#offcanvasRightEditReviewCycle .btn-close"
                )?.click();
            } else {
                message.error(
                    response?.data?.result?.[0]?.Message || "Update failed."
                );
            }
        } catch (err) {
            console.error(err);
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
                        width:40% !important;
                    }
                }
            `}</style>

            <div className="offcanvas-header border-bottom bg-white py-3 px-4 d-flex justify-content-between align-items-center w-100">
                <div>
                    <h4 className="fw-bold mb-0 text-dark">
                        <i className="bi bi-calendar2-check-fill text-primary me-2"></i>
                        Review Cycles
                    </h4>
                    <small className="text-muted">
                        Configure quarterly review periods
                    </small>
                </div>

                <div className="d-flex align-items-center gap-2">
                    <button
                        className="btn btn-primary rounded-pill px-4 shadow-sm d-flex align-items-center"
                        onClick={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <span
                                    className="spinner-border spinner-border-sm me-2"
                                    role="status"
                                    aria-hidden="true"
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
                        className="btn-close"
                        data-bs-dismiss="offcanvas"
                        disabled={loading}
                    ></button>
                </div>
            </div>

            <div
                className="offcanvas-body px-4 py-4"
                style={{
                    background: "#f7f8fc",
                    overflowY: "auto",
                }}
            >
                <div className="bg-white rounded-4 shadow-sm p-4">
                    <div className="mb-4">
                        <label className="form-label fw-semibold">
                            Cycle Name
                        </label>

                        <input
                            className="form-control form-control-sm"
                            value={editData.CycleName}
                            readOnly
                        />
                    </div>
                    <div className="row">
                        <div className="col-md-6 mb-4">
                            <label className="form-label fw-semibold">
                                Start Date <span className="text-danger">*</span>
                            </label>

                            <input
                                type="date"
                                className="form-control form-control-sm"
                                value={editData.StartDate}
                                onChange={(e) =>
                                    handleChange("StartDate", e.target.value)
                                }
                            />
                        </div>
                        <div className="col-md-6 mb-4">
                            <label className="form-label fw-semibold">
                                End Date <span className="text-danger">*</span>
                            </label>
                            <input
                                type="date"
                                className="form-control form-control-sm"
                                value={editData.EndDate}
                                onChange={(e) =>
                                    handleChange("EndDate", e.target.value)
                                }
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>

    );
}

EditReviewCycle.propTypes = {
    editReviewCycleData: PropTypes.object.isRequired,
};
