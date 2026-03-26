import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import PropTypes from "prop-types";
import { fetchWithAuth } from "../../../utils/api";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
dayjs.extend(utc);
dayjs.extend(timezone);

dayjs.extend(isSameOrBefore);

export default function EditCLCheckInOut({ editObj }) {

    const [sessionUserData, setSessionUserData] = useState([]);
    const [editSubmitLoading, setEditSubmitLoading] = useState(false);

    const [formData, setFormData] = useState({
        UpdatedBy: "",
        OrgId: "",
        Id: "",
        ContractorName: "",
        ShiftName: "",
        AadharNo: "",
        CLName: "",
        CheckInDate: "",
        CheckInTime: "",
        CheckOutDate: "",
        CheckOutTime: "",
    });

    useEffect(() => {
        const userDataString = sessionStorage.getItem("userData");
        if (userDataString) {
            const userData = JSON.parse(userDataString);
            setSessionUserData(userData);
        } else {
            console.log("User data not found in sessionStorage");
        }
    }, []);

    useEffect(() => {
        const checkInDate = editObj.CheckIn ? dayjs.utc(editObj.CheckIn).format("YYYY-MM-DD") : "";
        const checkInTime = editObj.CheckIn ? dayjs.utc(editObj.CheckIn).format("HH:mm") : "";

        const checkOutDate = editObj.CheckOut ? dayjs.utc(editObj.CheckOut).format("YYYY-MM-DD") : "";
        const checkOutTime = editObj.CheckOut ? dayjs.utc(editObj.CheckOut).format("HH:mm") : "";

        if (editObj) {
            setFormData({
                UpdatedBy: sessionUserData.UserId || "",
                OrgId: editObj?.OrgId || "",
                Id: editObj?.Id || "",
                ContractorName: editObj?.ContractorName || "",
                ShiftName: editObj?.Shiftname || "",
                AadharNo: editObj?.AadharNo || "",
                CLName: editObj?.CLName || "",
                CheckInDate: checkInDate,
                CheckInTime: checkInTime,
                CheckOutDate: checkOutDate,
                CheckOutTime: checkOutTime,
            });
        }
    }, [editObj, sessionUserData]);


    const handleSubmit = async (e) => {
        e.preventDefault();

        const checkIn = formData.CheckInDate && formData.CheckInTime
            ? `${formData.CheckInDate} ${formData.CheckInTime}:00`
            : null;

        const checkOut = formData.CheckOutDate && formData.CheckOutTime
            ? `${formData.CheckOutDate} ${formData.CheckOutTime}:00`
            : null;

        try {
            setEditSubmitLoading(true);

            const payload = {
                Id: formData?.Id,
                CheckIn: checkIn,
                CheckOut: checkOut,
                UpdatedBy: sessionUserData?.Id,
            }

            const response = await fetchWithAuth(
                `contractor/UpdateCLLog`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(payload),
                }
            );

            if (response.ok) {
                const data = await response.json();
                setEditSubmitLoading(false);

                if (data.ResultData.Status === 'Success') {
                    Swal.fire({
                        title: "Success",
                        text: "The CL details have been updated successfully.",
                        icon: "success",
                    }).then(() => {
                        window.location.reload();
                    });
                } else {
                    Swal.fire({
                        title: "Error",
                        text: data?.ResultData?.ResultMessage || "Failed to update the data.",
                        icon: "error",
                    });
                }
            } else {
                Swal.fire({
                    title: "Error",
                    text: "Failed to submit the request.",
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
            setEditSubmitLoading(false);
        }
    };
    const todayDate = dayjs().format("YYYY-MM-DD");
    const isToday = formData.CheckOutDate === todayDate;
    const maxTime = dayjs().format("HH:mm");

    return (
        <div
            className="offcanvas offcanvas-end"
            tabIndex="-1"
            id="offcanvasRightEdit"
            aria-labelledby="offcanvasRightLabel"
            style={{ width: '85%' }}
        >
            <style>
                {`
                  @media (min-width: 768px) { /* Medium devices and up (md) */
                      #offcanvasRightEdit {
                          width: 30% !important;
                      }
                  }
              `}
            </style>
            <form onSubmit={handleSubmit}>
                <div className="offcanvas-header d-flex justify-content-between align-items-center">
                    <h5 id="offcanvasRightLabel" className="mb-0">
                        Edit CL CheckIn/Out
                    </h5>
                    <div className="d-flex align-items-center">
                        <button
                            type="submit"
                            className="me-2 d-none d-md-block btn btn-primary px-4 btn-sm"
                            disabled={editSubmitLoading}
                        >
                            {editSubmitLoading ? "Submitting..." : "Submit"}
                        </button>
                        <button
                            type="button"
                            className="btn-close"
                            data-bs-dismiss="offcanvas"
                            aria-label="Close"
                        ></button>
                    </div>
                </div>
                <div
                    className="offcanvas-body"
                    style={{
                        marginTop: "-2rem",
                        maxHeight: "42rem",
                        overflowY: "auto",
                    }}
                >
                    <div className="row">
                        {/* Display Readonly fields as text */}
                        <div className="col-12 mb-2">
                            <strong>Agency Name: </strong> {formData.ContractorName}
                        </div>
                        <div className="col-12 mb-2">
                            <strong>CL Name: </strong> {formData.CLName}
                        </div>
                        <div className="col-12 mb-2">
                            <strong>CL Aadhar: </strong> {formData.AadharNo}
                        </div>
                        <div className="col-12 mb-2">
                            <strong>Shift: </strong> {formData.ShiftName || "N/A"}
                        </div>
                        <hr className="text-primary"/>
                        <div className="col-12 mb-3">
                            <label className="form-label">CheckIn <span className="text-danger">*</span></label>
                            <div className="d-flex gap-2">
                                <input
                                    type="date"
                                    className="form-control"
                                    value={formData.CheckInDate || ""}
                                    max={formData.CheckOutDate || undefined}
                                    onChange={(e) => setFormData({ ...formData, CheckInDate: e.target.value })}
                                    disabled={false}
                                />
                                <input
                                    type="time"
                                    className="form-control"
                                    value={formData.CheckInTime || ""}
                                    max={
                                        formData.CheckInDate &&
                                            formData.CheckOutDate &&
                                            formData.CheckInDate === formData.CheckOutDate
                                            ? formData.CheckOutTime || undefined
                                            : undefined
                                    }
                                    onChange={(e) => setFormData({ ...formData, CheckInTime: e.target.value })}
                                    disabled={false}
                                />
                            </div>
                        </div>

                        <div className="col-12 mb-3">
                            <label className="form-label">CheckOut <span className="text-danger">*</span></label>
                            <div className="d-flex gap-2">
                                {/* Date */}
                                <input
                                    type="date"
                                    className="form-control"
                                    value={formData.CheckOutDate || ""}
                                    min={formData.CheckInDate || undefined} // Cannot be before CheckIn date
                                    max={dayjs().format("YYYY-MM-DD")} // Cannot be after today
                                    onChange={(e) => setFormData({ ...formData, CheckOutDate: e.target.value })}
                                />

                                {/* Time */}
                                <input
                                    type="time"
                                    className="form-control"
                                    value={formData.CheckOutTime || ""}
                                    max={isToday ? maxTime : undefined}
                                    onChange={(e) => {
                                        const val = e.target.value; // HH:mm
                                        const selectedDateTime = dayjs(`${formData.CheckOutDate} ${val}`);

                                        const now = dayjs();

                                        // Prevent future datetime
                                        if (selectedDateTime.isAfter(now)) {
                                            alert("CheckOut cannot be in the future");
                                            return; // ignore the change
                                        }

                                        // Prevent CheckOut < CheckIn if same day
                                        if (
                                            formData.CheckInDate &&
                                            formData.CheckInTime &&
                                            formData.CheckOutDate === formData.CheckInDate
                                        ) {
                                            const checkInDT = dayjs(`${formData.CheckInDate} ${formData.CheckInTime}`);
                                            if (selectedDateTime.isBefore(checkInDT)) {
                                                alert("CheckOut cannot be earlier than CheckIn");
                                                return;
                                            }
                                        }
                                        setFormData({ ...formData, CheckOutTime: val });
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="d-md-none d-flex justify-content-center mb-3">
                    <button
                        type="submit"
                        className="btn btn-primary px-4 btn-sm"
                        disabled={editSubmitLoading}
                    >
                        {editSubmitLoading ? "Submitting..." : "Submit"}
                    </button>
                </div>
            </form>
        </div>
    );
}

EditCLCheckInOut.propTypes = {
    editObj: PropTypes.object.isRequired,
};
