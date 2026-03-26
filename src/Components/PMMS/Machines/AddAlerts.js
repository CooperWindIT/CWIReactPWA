import React, { useEffect, useState } from "react";
import Swal from 'sweetalert2';
import { Select } from "antd";
import { BASE_API, VMS_URL } from "../../Config/Config";
import PropTypes from "prop-types";

export default function AddAlerts({ mcnObj }) {

    const [sessionUserData, setsessionUserData] = useState({});
    const [addSubmitLoading, setAddSubmitLoading] = useState(false);
    const [manager, setManager] = useState([]);
    const [usersData, setUsersData] = useState([]);
    const [selectedDays, setSelectedDays] = useState(null);
    const [selectedUserId, setSelectedUserId] = useState(null);
    const { Option } = Select;

    useEffect(() => {
        const userDataString = sessionStorage.getItem("userData");
        if (userDataString) {
            const userData = JSON.parse(userDataString);
            setsessionUserData(userData);
        }
    }, []);

    const [formData, setFormData] = useState({
        OrgId: sessionUserData?.OrgId,
        MachineId: mcnObj?.MachineId,
        AlertTitle: "",
        AlertType: "",
        Message: "",
        ScheduledDate: "",
        RecurrenceType: "",
        DaysOfWeek: "",
        DayOfMonth: "",
        AssignedToUser: "",
        CreatedBy: "",
        PendingSentCount: "",
        EndDate: ""
    });

    const fetchUsersData = async () => {
        try {
            const response = await fetch(`${VMS_URL}getUsers?OrgId=${sessionUserData.OrgId}`);
            if (response.ok) {
                const data = await response.json();
                setUsersData(data.ResultData);
            } else {
                setUsersData([]);
                console.error('Failed to fetch attendance data:', response.statusText);
            }
        } catch (error) {
            setUsersData([]);
            console.error('Error fetching attendance data:', error.message);
        } finally {

        }
    };

    useEffect(() => {
        if (sessionUserData.OrgId) {
            fetchUsersData();
        }
    }, [sessionUserData]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
    
        if (name === "EndDate") {
            const scheduledDate = new Date(formData.ScheduledDate);
            const endDate = new Date(value);
    
            if (endDate < scheduledDate) {
                Swal.fire({
                    icon: "warning",
                    title: "Invalid End Date",
                    text: "End Date should be greater than or equal to Scheduled Date.",
                });
                return;
            }
        }
    
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };    

    const handleSubmit = async (e) => {
        e.preventDefault();
        setAddSubmitLoading(true);
        formData.DaysOfWeek = selectedDays;
        formData.CreatedBy = sessionUserData?.Id;
        formData.OrgId = sessionUserData?.OrgId;
        formData.MachineId = mcnObj?.MachineId;

        try {
            const response = await fetch(`${BASE_API}PMMS/ADDMachineAlerts`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                const data = await response.json();
                if (data.ResultData?.Status === 'Success') {
                    Swal.fire({
                        title: "Success",
                        text: "Alert has been added successfully.",
                        icon: "success",
                    }).then(() => {
                        window.location.reload();
                    })
                } else {
                    Swal.fire({
                        title: "Error",
                        text: data.ResultData?.ResultMessage,
                        icon: "error",
                    });
                }
            }
        } catch (error) {
            console.error("Error during submission:", error.message);
            Swal.fire({
                title: "Error",
                text: "An unexpected error occurred.",
                icon: "error",
            });
        } finally {
            setAddSubmitLoading(false);
        }
    };

    return (
        <div
            className="offcanvas offcanvas-end"
            tabIndex="-1"
            id="offcanvasRightAddAlerts"
            aria-labelledby="offcanvasRightLabel"
            style={{ width: "90%" }}
        >
            <style>
                {`
                    @media (min-width: 768px) { /* Medium devices and up (md) */
                        #offcanvasRightAddAlerts {
                            width: 50% !important;
                        }
                    }
                `}
            </style>
            <form autoComplete="off" onSubmit={handleSubmit}>
                <div className="offcanvas-header d-flex justify-content-between align-items-center">
                    <h5 id="offcanvasRightLabel" className="mb-0">Add Alert</h5>
                    <div className="d-flex align-items-center">
                        <button className="btn btn-primary btn-sm me-2" type="submit" disabled={addSubmitLoading}>
                            {addSubmitLoading ? "Submitting..." : "Submit"}
                        </button>
                        <button
                            type="button"
                            className="btn-close"
                            data-bs-dismiss="offcanvas"
                            aria-label="Close"
                        ></button>
                    </div>
                </div>
                <div className="offcanvas-body" style={{ marginTop: "-2rem", maxHeight: "42rem", overflowY: "auto" }}>
                    <div className="row">
                        <div className="col-6 mb-2">
                            <label className="form-label">Machine<span className="text-danger">*</span></label>
                            <input
                                type="text"
                                className="form-control cursor-not-allowed"
                                value={mcnObj?.MachineName}
                                readOnly
                            />
                        </div>
                        <div className="col-6 mb-2 position-relative">
                            <label className="form-label">Alert Title <span className="text-danger">*</span></label>
                            <input
                                type="text"
                                name="AlertTitle"
                                className="form-control"
                                placeholder="Enter title"
                                value={formData.AlertTitle}
                                onChange={handleInputChange}
                                required
                            />
                        </div>
                        <div className="col-6 mb-2">
                            <label className="form-label">Alert Type <span className="text-danger">*</span></label>
                            <select
                                name="AlertType"
                                className="form-select"
                                value={formData.AlertType}
                                onChange={handleInputChange}
                                required
                            >
                                <option>Choose alert type</option>
                                <option value="SCHEDULED">Schedule</option>
                                <option value="MANUALLY">Manual</option>
                            </select>
                        </div>
                        <div className="col-6 mb-2">
                            <label className="form-label">Schedule Date<span className="text-danger">*</span></label>
                            <input
                                type="date"
                                name="ScheduledDate"
                                className="form-control"
                                value={formData.ScheduledDate}
                                onChange={handleInputChange}
                                required
                            />
                        </div>
                        {formData?.AlertType === 'SCHEDULED' &&
                            <div className="col-6 mb-2">
                                <label className="form-label">Recurrence Type<span className="text-danger">*</span></label>
                                <select
                                    name="RecurrenceType"
                                    className="form-select"
                                    value={formData.RecurrenceType}
                                    onChange={handleInputChange}
                                    required
                                >
                                    <option>Choose recurrence type</option>
                                    <option value="DAILY">Daily</option>
                                    <option value="WEEKLY">Weekly</option>
                                    <option value="MONTHLY">Monthly</option>
                                </select>
                            </div>
                        }
                        {formData?.AlertType === 'SCHEDULED' && formData?.RecurrenceType === 'WEEKLY' &&
                            <div className="col-6 mb-2">
                                <label className="form-label">Days Of Week<span className="text-danger">*</span></label>
                                <Select
                                    placeholder="Select Day"
                                    showSearch
                                    allowClear
                                    mode="multiple"
                                    filterOption={(input, option) =>
                                        option?.children?.toLowerCase().includes(input.toLowerCase())
                                    }
                                    value={selectedDays || undefined}
                                    onChange={(value) => setSelectedDays(value)}
                                    style={{ height: '3.3rem', width: '100%' }}
                                >
                                    {[
                                        'Sunday',
                                        'Monday',
                                        'Tuesday',
                                        'Wednesday',
                                        'Thursday',
                                        'Friday',
                                        'Saturday'
                                    ].map((day, index) => (
                                        <Option key={index} value={day}>
                                            {day}
                                        </Option>
                                    ))}
                                </Select>
                            </div>
                        }
                        {formData?.AlertType === 'SCHEDULED' && formData?.RecurrenceType === 'MONTHLY' &&
                            <div className="col-6 mb-2">
                                <label className="form-label">Days Of Month<span className="text-danger">*</span></label>
                                <input
                                    type="number"
                                    name="DayOfMonth"
                                    className="form-control"
                                    placeholder="Enter days of week"
                                    value={formData.DayOfMonth}
                                    onChange={handleInputChange}
                                />
                            </div>
                        }
                        {formData?.AlertType === 'MANUALLY' &&
                            <div className="col-6 mb-2">
                                <label className="form-label">Assigned To User<span className="text-danger">*</span></label>
                                <Select
                                    placeholder="Select User"
                                    showSearch
                                    allowClear
                                    filterOption={(input, option) =>
                                        option?.children?.toLowerCase().includes(input.toLowerCase())
                                    }
                                    value={selectedUserId || undefined}
                                    onChange={(value) => setSelectedUserId(value)}
                                    style={{ height: '3.3rem', width: '100%' }}
                                >
                                    {usersData?.map((item) => (
                                        <Option key={item.Id} value={item.Id}>
                                            {item.Name}
                                        </Option>
                                    ))}
                                </Select>
                            </div>
                        }
                        {formData?.AlertType === 'SCHEDULED' &&
                            <div className="col-6 mb-2">
                                <label className="form-label">End Date<span className="text-danger">*</span></label>
                                <input
                                    type="date"
                                    name="EndDate"
                                    className="form-control"
                                    value={formData.EndDate}
                                    min={formData.ScheduledDate}
                                    onChange={handleInputChange}
                                />
                            </div>
                        }
                        <div className="col-12 mb-2">
                            <label className="form-label">Message<span className="text-danger">*</span></label>
                            <textarea
                                name="Message"
                                className="form-control"
                                placeholder="Enter message..."
                                value={formData.Message}
                                onChange={handleInputChange}
                            />
                        </div>

                    </div>
                </div>
            </form>
        </div>
    );
}


AddAlerts.propTypes = {
    mcnObj: PropTypes.object.isRequired,
};