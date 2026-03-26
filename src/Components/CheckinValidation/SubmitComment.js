import React, { useEffect, useState } from "react";
import Swal from 'sweetalert2';
import { VMS_URL_CONTRACTOR } from "../Config/Config";
import PropTypes from "prop-types";

export default function SubmitComment({ validObj }) {

    const [sessionUserData, setsessionUserData] = useState({});
    const [submitLoading, setSubmitLoading] = useState(false);
    const [comment, setComment] = useState("");

    // Fetch session user data
    useEffect(() => {
        const userDataString = sessionStorage.getItem("userData");
        if (userDataString) {
            const userData = JSON.parse(userDataString);
            setsessionUserData(userData);
        }
    }, []);

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitLoading(true);

        const payload = {
            Comments: comment,
            Id: validObj.Id,
            UpdatedBy: sessionUserData.Id
        };

        try {
            const response = await fetch(`${VMS_URL_CONTRACTOR}Updtcomments`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                const data = await response.json();
                console.log(data);
                if (data.ResultData[0].Status === "Success") {
                    Swal.fire({
                        title: "Success",
                        text: "User has been updated successfully.",
                        icon: "success",
                    }).then(() => window.location.reload());
                } else {
                    Swal.fire({
                        title: "Error",
                        text: data?.ResultData[0]?.Message || "Failed to update user.",
                        icon: "error",
                    });
                }
            } else {
                console.error("Failed to submit form:", response.statusText);
                Swal.fire({
                    title: "Error",
                    text: "Failed to submit form.",
                    icon: "error",
                });
            }
        } catch (error) {
            console.error("Error during submission:", error.message);
            Swal.fire({
                title: "Error",
                text: "An unexpected error occurred.",
                icon: "error",
            });
        } finally {
            setSubmitLoading(false);
        }
    };

    return (
        <div
            className="offcanvas offcanvas-end"
            tabIndex="-1"
            id="offcanvasRightSubmitComm"
            aria-labelledby="offcanvasRightLabel"
            style={{ minWidth: "45%", maxWidth: "45%" }}
        >
            <form onSubmit={handleSubmit}>
                <div className="offcanvas-header d-flex justify-content-between align-items-center">
                    <h5 id="offcanvasRightLabel" className="mb-0">Submit Comment</h5>
                    <div className="d-flex align-items-center">
                        <button className="btn btn-primary me-2" type="submit" disabled={submitLoading}>
                            {submitLoading ? "Submitting..." : "Submit"}
                        </button>
                        <button
                            type="button"
                            className="btn-close"
                            data-bs-dismiss="offcanvas"
                            aria-label="Close"
                        ></button>
                    </div>
                </div>
                <div className="offcanvas-body" style={{ marginTop: "-2rem" }}>
                    <div className="row">
                        <div className="card p-3 shadow-sm border-0 mb-3">
                            <div className="card-body">
                                <div className="row g-3">
                                    <div className="col-md-3">
                                        <label className="form-label fw-semibold">Day</label>
                                        <div className="bg-light p-2 rounded text-dark fw-medium">
                                            {validObj?.Day || "N/A"}
                                        </div>
                                    </div>
                                    <div className="col-md-4">
                                        <label className="form-label fw-semibold">CLS1</label>
                                        <div className="bg-light p-2 rounded text-dark fw-medium">
                                            {validObj?.CLS1 || "N/A"}
                                        </div>
                                    </div>
                                    <div className="col-md-5">
                                        <label className="form-label fw-semibold">CLS2</label>
                                        <div className="bg-light p-2 rounded text-dark fw-medium">
                                            {validObj?.CLS2 || "N/A"}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="col-12">
                            <label className="form-label">Comment<span className="text-danger">*</span></label>
                            <textarea
                                className="form-control"
                                placeholder="Enter comments..."
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                rows={6}
                                required
                            />
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}

SubmitComment.propTypes = {
    validObj: PropTypes.object.isRequired,
};
