import React, { useEffect, useState } from "react";
import Swal from 'sweetalert2';
import { Select } from "antd";
import PropTypes from "prop-types";
import { fetchWithAuth } from "../../../utils/api";

export default function EditAlert({ alertObj }) {

    const [sessionUserData, setsessionUserData] = useState({});
    const [addSubmitLoading, setAddSubmitLoading] = useState(false);
    const [usersData, setUsersData] = useState([]);
    const [machinesData, setMachinesData] = useState([]);
    const [alertTypesData, setAlertTypesData] = useState([]);
    const [modulesData, setModulesData] = useState([]);
    const { Option } = Select;

    useEffect(() => {
        const userDataString = sessionStorage.getItem("userData");
        if (userDataString) {
            const userData = JSON.parse(userDataString);
            setsessionUserData(userData);
        }
    }, []);

    const [formData, setFormData] = useState({
        OrgId: sessionUserData?.OrgId || '',
        AlertId: alertObj.AlertId || '',
        AlertTypeId: '',
        TableId: '',
        AlertTitle: '',
        Message: '',
        OcurrenceType: '',
        ScheduledDate: '',
        DaysOfWeek: '',
        DaysOfMonth: '',
        ToUsers: '',
        StartDate: '',
        EndDate: '',
    });

    useEffect(() => {
        console.log(alertObj);
        const formatDate = (date) => {
            if (!date) return '';
            const d = new Date(date);
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const year = d.getFullYear();
            return `${year}-${month}-${day}`;
        };
        setFormData({
            OrgId: sessionUserData?.OrgId || '',
            AlertTypeId: alertObj?.AlertTypeId || '',
            TableId: alertObj?.MachineId || '',
            AlertTitle: alertObj?.AlertTitle || '',
            Message: alertObj?.Message || '',
            OcurrenceType: alertObj?.OcurrenceType || '',
            ScheduledDate: formatDate(alertObj?.ScheduledDate) || null,
            DaysOfWeek: alertObj?.DaysOfWeek || null,
            DaysOfMonth: alertObj?.DaysOfMonth || null,
            ToUsers: alertObj?.ToUsers || '',
            StartDate: formatDate(alertObj?.StartDate) || null,
            EndDate: formatDate(alertObj?.EndDate) || null, // check typo: EndDtae -> EndDate?
        });
    }, [sessionUserData, alertObj]);

    const fetchAlertTypes = async () => {
        try {
            const response = await fetchWithAuth(`ADMINRoutes/CWIGetDDLItems?OrgId=${sessionUserData?.OrgId}&UserId=0`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });
            if (!response.ok) throw new Error("Network response was not ok");

            const data = await response.json();

            const alertTypesFilteredData = data.ResultData.filter(
                (item) => item.DDLName === "AlertTypes"
            );

            const modFilteredData = data.ResultData.filter(
                (item) => item.DDLName === "Modules"
            );

            const mcnFilteredData = data.ResultData.filter(
                (item) => item.DDLName === "Machines"
            );

            const usersFilteredData = data.ResultData.filter(
                (item) => item.DDLName === "Users"
            );

            setAlertTypesData(alertTypesFilteredData || []);
            setModulesData(modFilteredData || []);
            setMachinesData(mcnFilteredData || []);
            setUsersData(usersFilteredData || []);
        } catch (error) {
            console.error("Failed to fetch UnitLocations:", error);
            setAlertTypesData([]);
            setModulesData([]);
            setMachinesData([]);
            setUsersData([]);
        }
    };

    useEffect(() => {
        if (sessionUserData && sessionUserData?.OrgId) {
            fetchAlertTypes();
        }
    }, [sessionUserData]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSelectChange = (key, value) => {
        setFormData((prev) => ({
            ...prev,
            [key]: value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setAddSubmitLoading(true);
        formData.UpdatedBy = sessionUserData?.Id;
        formData.OrgId = sessionUserData?.OrgId;
        formData.AlertId = alertObj?.AlertId;

        try {
            const response = await fetchWithAuth(`PMMS/EDITMachineAlerts`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                const data = await response.json();
                if (data?.Status) {
                    Swal.fire({
                        title: "Success",
                        text: "Alert has been updated successfully.",
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
            id="offcanvasRightEdit"
            aria-labelledby="offcanvasRightLabel"
            style={{ width: "90%" }}
        >
            <style>
                {`
                    @media (min-width: 768px) { /* Medium devices and up (md) */
                        #offcanvasRightEdit {
                            width: 50% !important;
                        }
                    }
                `}
            </style>
            <form autoComplete="off" onSubmit={handleSubmit}>
                <div className="offcanvas-header d-flex justify-content-between align-items-center">
                    <h5 id="offcanvasRightLabel" className="mb-0">Edit Alert</h5>
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
                <div className="offcanvas-body" style={{
                    flex: 1,
                    overflowY: 'auto',
                    paddingBottom: '2rem',
                    maxHeight: 'calc(100vh - 100px)'
                }}>
                    <div className="row">
                        <div className="col-6 mb-2">
                            <label className="form-label">Machine<span className="text-danger">*</span></label>
                            <Select
                                showSearch
                                allowClear
                                placeholder="Select Machine"
                                className="w-100"
                                value={formData.TableId || undefined}
                                style={{ height: "3rem" }}
                                onChange={(value) => handleSelectChange("TableId", value)}
                                filterOption={(input, option) => {
                                    const text = `${option?.children}`.toLowerCase();
                                    return text.includes(input.toLowerCase());
                                }}
                            >
                                {machinesData?.map((mcn) => (
                                    <Option key={mcn.ItemId} value={mcn.ItemId}>
                                        {mcn.ItemValue} - {mcn.DisplayValue}
                                    </Option>
                                ))}
                            </Select>
                        </div>
                        <div className="col-6 mb-2 position-relative">
                            <label className="form-label">Alert Title <span className="text-danger">*</span></label>
                            <input
                                type="text"
                                name="AlertTitle"
                                className="form-control"
                                placeholder="Enter title"
                                style={{ height: '2.8rem', width: '100%' }}
                                value={formData.AlertTitle}
                                onChange={handleInputChange}
                                required
                            />
                        </div>
                        <div className="col-6 mb-2">
                            <label className="form-label">Alert Type <span className="text-danger">*</span></label>
                            <Select
                                placeholder="Select Type"
                                showSearch
                                allowClear
                                filterOption={(input, option) =>
                                    option?.children?.toLowerCase().includes(input.toLowerCase())
                                }
                                style={{ height: '2.8rem', width: '100%' }}
                                value={formData.AlertTypeId || undefined}
                                onChange={(value) => handleSelectChange("AlertTypeId", value)}
                            >
                                {alertTypesData?.map((item) => (
                                    <Option key={item.ItemId} value={item.ItemId}>
                                        {item.DisplayValue}
                                    </Option>
                                ))}
                            </Select>
                        </div>
                        <div className="col-6 mb-2">
                            <label className="form-label">
                                Ocurrence Type<span className="text-danger">*</span>
                            </label>
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Enter title"
                                style={{ height: '2.8rem', width: '100%' }}
                                value={alertObj?.OcurrenceTypeNames}
                                readOnly
                            />
                        </div>
                        <div className="col-6 mb-2">
                            <label className="form-label">To Users<span className="text-danger">*</span></label>
                            <Select
                                mode="multiple"
                                placeholder="Select Users"
                                showSearch
                                allowClear
                                value={formData.ToUsers ? formData.ToUsers.split(",") : []} // CSV → array
                                onChange={(value) => handleSelectChange("ToUsers", value.join(","))} // array → CSV
                                style={{ width: "100%" }}
                                optionFilterProp="label"
                                maxTagCount="responsive"
                                tagRender={(props) => (
                                    <div
                                        style={{
                                            background: "#f0f0f0",
                                            borderRadius: "6px",
                                            padding: "2px 6px",
                                            margin: "2px",
                                            display: "flex",
                                            alignItems: "center",
                                        }}
                                    >
                                        <span>{props.label}</span>
                                        <span
                                            style={{ marginLeft: "4px", cursor: "pointer", color: "red" }}
                                            onClick={props.onClose}
                                        >
                                            ×
                                        </span>
                                    </div>
                                )}
                            >
                                {usersData?.map((item) => (
                                    <Option key={item.DisplayValue} value={item.DisplayValue} label={item.ItemValue}>
                                        {item.ItemValue} ({item.DisplayValue})
                                    </Option>
                                ))}
                            </Select>

                        </div>
                        <div className="col-12 mb-2">
                            <label className="form-label">Message<span className="text-danger">*</span></label>
                            <textarea
                                name="Message"
                                className="form-control"
                                placeholder="Enter message..."
                                value={formData.Message}
                                onChange={handleInputChange}
                                rows={3}
                            />
                        </div>
                        <hr className="text-primary mt-4" />

                        {formData?.OcurrenceType && formData?.OcurrenceType !== 1 &&
                            <div className="col-12 col-md-4 mb-2">
                                <label className="form-label">Start Date<span className="text-danger">*</span></label>
                                <input
                                    type="date"
                                    name="StartDate"
                                    className="form-control"
                                    value={formData.StartDate}
                                    style={{ height: '2.8rem', width: '100%' }}
                                    min={formData.StartDate}
                                    onChange={handleInputChange}
                                />
                            </div>
                        }
                        {formData?.OcurrenceType && formData?.OcurrenceType !== 1 &&
                            <div className="col-12 col-md-4 mb-2">
                                <label className="form-label">End Date<span className="text-danger">*</span></label>
                                <input
                                    type="date"
                                    name="EndDate"
                                    className="form-control"
                                    value={formData.EndDate}
                                    style={{ height: '2.8rem', width: '100%' }}
                                    min={formData.EndDate}
                                    onChange={handleInputChange}
                                />
                            </div>
                        }
                        {formData?.OcurrenceType === 3 && (
                            <div className="col-12 mb-2">
                                <label className="form-label">
                                    Days Of Week <span className="text-danger">*</span>
                                </label>
                                <Select
                                    placeholder="Select Day"
                                    showSearch
                                    allowClear
                                    mode="multiple"
                                    filterOption={(input, option) =>
                                        option?.children?.toLowerCase().includes(input.toLowerCase())
                                    }
                                    value={
                                        Array.isArray(formData.DaysOfWeek)
                                            ? formData.DaysOfWeek.map(Number)
                                            : formData.DaysOfWeek
                                                ? String(formData.DaysOfWeek)
                                                    .split(",")
                                                    .map((x) => Number(x))
                                                : []
                                    }
                                    onChange={(value) =>
                                        handleSelectChange(
                                            "DaysOfWeek",
                                            value.sort((a, b) => a - b).join(",")
                                        )
                                    }
                                    style={{ height: "2.8rem", width: "100%" }}
                                >
                                    {[
                                        "Sunday",
                                        "Monday",
                                        "Tuesday",
                                        "Wednesday",
                                        "Thursday",
                                        "Friday",
                                        "Saturday",
                                    ].map((day, index) => (
                                        <Option key={index + 1} value={index + 1}>
                                            {day}
                                        </Option>
                                    ))}
                                </Select>
                            </div>
                        )}

                        {formData?.OcurrenceType === 4 &&
                            <div className="col-12 col-md-4 mb-2">
                                <label className="form-label">
                                    Days Of Month <span className="text-danger">*</span>
                                </label>
                                <Select
                                    mode="multiple"
                                    placeholder="Select days of month"
                                    showSearch
                                    allowClear
                                    style={{ height: '2.8rem', width: '100%' }}
                                    value={formData.DaysOfMonth ? formData.DaysOfMonth.split(",") : []} // ✅ fixed key name
                                    onChange={(value) =>
                                        handleSelectChange(
                                            "DaysOfMonth", // ✅ fixed key name
                                            value.sort((a, b) => a - b).join(",")
                                        )
                                    }
                                    filterOption={(input, option) =>
                                        String(option?.children ?? "")
                                            .toLowerCase()
                                            .includes(input.toLowerCase())
                                    }
                                >
                                    {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                                        <Option key={day} value={String(day)}>
                                            {day}
                                        </Option>
                                    ))}
                                </Select>
                            </div>
                        }
                        {[1, 5, 6, 7].includes(formData?.OcurrenceType) &&
                            <div className="col-12 col-md-4 mb-2">
                                <label className="form-label">Schedule Date<span className="text-danger">*</span></label>
                                <input
                                    type="date"
                                    name="ScheduledDate"
                                    className="form-control"
                                    style={{ height: '2.8rem', width: '100%' }}
                                    value={formData.ScheduledDate}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>
                        }
                    </div>
                </div>
            </form>
        </div>
    );
}

EditAlert.propTypes = {
    alertObj: PropTypes.object.isRequired,
};