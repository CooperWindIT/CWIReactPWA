import React, { useEffect, useState } from "react";
import { saveReviewCycles } from "../services/kpiServices";
import PropTypes from "prop-types";
import { message, Select } from "antd";

export default function AddReviewCycle({ kpiPeriodsData }) {
    const [sessionUserData, setsessionUserData] = useState({});
    const [selectedPeriod, setSelectedPeriod] = useState(null);
    const [loading, setLoading] = useState(false);
    const [startMonth, setStartMonth] = useState(null);

    const [cycles, setCycles] = useState([
        {
            CycleName: "Q1",
            StartDate: "",
            EndDate: "",
            Comments: "",
        },
        {
            CycleName: "Q2",
            StartDate: "",
            EndDate: "",
            Comments: "",
        },
        {
            CycleName: "Q3",
            StartDate: "",
            EndDate: "",
            Comments: "",
        },
        {
            CycleName: "Q4",
            StartDate: "",
            EndDate: "",
            Comments: "",
        },
    ]);

    useEffect(() => {
        const userDataString = sessionStorage.getItem("userData");

        if (userDataString) {
            const userData = JSON.parse(userDataString);
            setsessionUserData(userData);
            setSelectedPeriod(userData?.PeriodId);
        }
    }, []);

    useEffect(() => {
        if (!selectedPeriod || !startMonth) return;
    
        const period = kpiPeriodsData.find(
            x => Number(x.Id) === Number(selectedPeriod)
        );
    
        if (!period) return;
    
        const startYear = Number(period.PeriodName.match(/\d{4}/)?.[0]);
    
        const quarterNames = ["Q1", "Q2", "Q3", "Q4"];
        const generatedCycles = [];
    
        let month = Number(startMonth);
        let year = startYear;
    
        for (let i = 0; i < 4; i++) {
    
            // First day of starting month
            const start = new Date(year, month - 1, 1);
    
            // Last day of the third month
            const end = new Date(year, month + 2, 0);
    
            generatedCycles.push({
                CycleName: quarterNames[i],
                StartDate: start,
                EndDate: end,
                Comments: ""
            });
    
            month += 3;
    
            while (month > 12) {
                month -= 12;
                year++;
            }
        }
    
        setCycles(generatedCycles);
    
    }, [selectedPeriod, startMonth]);

    const months = [
        { value: 1, label: "January" },
        { value: 2, label: "February" },
        { value: 3, label: "March" },
        { value: 4, label: "April" },
        { value: 5, label: "May" },
        { value: 6, label: "June" },
        { value: 7, label: "July" },
        { value: 8, label: "August" },
        { value: 9, label: "September" },
        { value: 10, label: "October" },
        { value: 11, label: "November" },
        { value: 12, label: "December" }
    ];

    const colors = [
        "#2563eb", // Blue
        "#16a34a", // Green
        "#f59e0b", // Orange
        "#dc2626"  // Red
    ];

    const formatDate = (date) => {
        if (!date) return "---";
    
        return date.toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
    };

    const formatPayloadDate = (date) => {
        const d = new Date(date);
    
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
    
        return `${year}-${month}-${day}T00:00:00`;
    };

    const validateCycles = () => {
        if (!selectedPeriod) {
            message.warning("Please select a Performance Period.");
            return false;
        }

        // Validate each cycle
        for (let i = 0; i < cycles.length; i++) {
            const cycle = cycles[i];

            if (!cycle.StartDate || !cycle.EndDate) {
                message.warning(
                    `${cycle.CycleName}: Please select both Start Date and End Date.`
                );
                return false;
            }

            const start = new Date(cycle.StartDate);
            const end = new Date(cycle.EndDate);

            if (end <= start) {
                message.warning(
                    `${cycle.CycleName}: End Date should be greater than Start Date.`
                );
                return false;
            }
        }

        // Validate overlapping dates
        for (let i = 0; i < cycles.length; i++) {
            const start1 = new Date(cycles[i].StartDate);
            const end1 = new Date(cycles[i].EndDate);

            for (let j = i + 1; j < cycles.length; j++) {
                const start2 = new Date(cycles[j].StartDate);
                const end2 = new Date(cycles[j].EndDate);

                const isOverlap = start1 <= end2 && start2 <= end1;

                if (isOverlap) {
                    message.error(
                        `${cycles[i].CycleName} dates overlap with ${cycles[j].CycleName}. Please choose different date ranges.`
                    );
                    return false;
                }
            }
        }

        return true;
    };

    const handleSubmit = async () => {
        if (!validateCycles()) return;

        setLoading(true);

        const payload = {
            Type: "ADD",
            OrgId: sessionUserData?.OrgId,
            UserId: sessionUserData?.Id,
            JsonData: {
                Cycles: cycles.map(cycle => ({
                    PeriodId: Number(selectedPeriod),
                    CycleName: cycle.CycleName,
                    StartDate: formatPayloadDate(cycle.StartDate),
                    EndDate: formatPayloadDate(cycle.EndDate),
                    Comments: cycle.Comments || "",
                })),
            },
        };

        try {
            const response = await saveReviewCycles(payload);
            if (
                response?.success &&
                response?.data?.result?.[0]?.ResponseCode === 200
            ) {
                message.success(response.data.result[0].Message);

                setTimeout(() => {
                    window.location.reload();
                }, 1000);

            } else {
                message.error(
                    response?.data?.result?.[0]?.Message || "Failed to save review cycles."
                );
            }
        } catch (error) {
            console.error(error);
            message.error("Something went wrong.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="offcanvas offcanvas-end"
            tabIndex="-1"
            id="offcanvasRightAddReviewCycle"
            style={{ width: "90%" }}
        >
            <style>{`
                @media(min-width:768px){
                    #offcanvasRightAddReviewCycle{
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
                    overflowY: "auto"
                }}
            >
                <div className="bg-white rounded-4 shadow-sm p-4 mb-4 border">

                    <div className="row g-3">

                        <div className="col-md-6">

                            <label className="form-label fw-semibold mb-2">
                                <i className="bi bi-calendar-event me-2 text-primary"></i>
                                Performance Period
                            </label>

                            <Select
                                size="large"
                                placeholder="Select Period"
                                style={{ width: "100%" }}
                                value={selectedPeriod}
                                onChange={setSelectedPeriod}
                                options={kpiPeriodsData.map(item => ({
                                    value: item.Id,
                                    label: item.PeriodName
                                }))}
                                disabled={true}
                            />

                        </div>

                        <div className="col-md-6">

                            <label className="form-label fw-semibold mb-2">
                                <i className="bi bi-calendar3 me-2 text-success"></i>
                                Financial Year Starts From
                            </label>

                            <Select
                                size="large"
                                placeholder="Select Month"
                                style={{ width: "100%" }}
                                value={startMonth}
                                onChange={setStartMonth}
                                options={months}
                            />

                        </div>

                    </div>

                </div>
                {cycles.map((cycle, index) => (
                    <div
                        key={index}
                        className="bg-white rounded-4 shadow-sm mb-4 overflow-hidden"
                        style={{
                            borderLeft: `6px solid ${["#0d6efd", "#198754", "#fd7e14", "#dc3545"][index]
                                }`
                        }}
                    >
                        {/* <div className="px-4 py-3 border-bottom d-flex align-items-center justify-content-between">
                            <div className="d-flex align-items-center">
                                <div
                                    className="rounded-circle text-white d-flex align-items-center justify-content-center me-3"
                                    style={{
                                        width: 42,
                                        height: 42,
                                        background:
                                            ["#0d6efd", "#198754", "#fd7e14", "#dc3545"][index]
                                    }}
                                >
                                    <i className="bi bi-flag-fill text-white"></i>
                                </div>
                                <div>
                                    <h6 className="fw-bold mb-0">
                                        {cycle.CycleName}
                                    </h6>
                                    <small className="text-muted">
                                        Quarterly Performance Review
                                    </small>
                                </div>
                            </div>
                        </div> */}

                        <div
                            className="bg-white rounded-4 shadow-sm mb-3 p-4"
                            style={{
                                borderLeft: `5px solid ${colors[index]}`
                            }}
                        >
                            <div className="d-flex justify-content-between align-items-center">
                                <div>
                                    <h6 className="fw-bold mb-1">{cycle.CycleName}</h6>
                                    <small className="text-muted">Quarterly Performance Review</small>
                                </div>

                                <div className="text-end">
                                    <div className="fw-semibold">
                                        {formatDate(cycle.StartDate)}
                                    </div>
                                    <small className="text-muted">to</small>
                                    <div className="fw-semibold">
                                        {formatDate(cycle.EndDate)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <style>
                {`
                    .form-control,
                    .form-select {
                        border: 1px solid #e5e7eb;
                        transition: .25s;
                    }

                    .form-control:focus,
                    .form-select:focus {
                        border-color: #4f46e5;
                        box-shadow: 0 0 0 .15rem rgba(79,70,229,.15);
                    }

                    .rounded-4{
                        border-radius:18px !important;
                    }

                    .shadow-sm{
                        box-shadow:0 10px 25px rgba(15,23,42,.06)!important;
                    }

                    textarea{
                        resize:none;
                    }`}
            </style>
        </div>

    );
}

AddReviewCycle.propTypes = {
    kpiPeriodsData: PropTypes.object.isRequired,
};