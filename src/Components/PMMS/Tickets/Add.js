import React, { useEffect, useState } from "react";
import Swal from 'sweetalert2';
import { Select } from "antd";
import { fetchWithAuth } from "../../../utils/api";

export default function RegisterTicket() {

    const [sessionUserData, setsessionUserData] = useState({});
    const [addSubmitLoading, setAddSubmitLoading] = useState(false);
    const [mcnsData, setMCNsData] = useState([]);
    const [machineStatusCheck, setMachineStatusCheck] = useState(false);
    const [ticketCode, setTicketCode] = useState('');
    const { Option } = Select;

    const [formData, setFormData] = useState({
        MachineId: "",
        IssueType: "",
        Description: "",
        Priority: "",
        DueDate: "",
        MachineStatus: "",
        ImageUrl: null,
    });
    const [imagePreview, setImagePreview] = useState(null);

    useEffect(() => {
        if (formData.MachineId) {
            const fetchMachineCheck = async () => {
                try {
                    const response = await fetchWithAuth(`PMMS/CheckActiveTickets?MachineId=${formData.MachineId}`, {
                        method: "GET",
                        headers: { "Content-Type": "application/json" },
                    });
                    if (response.ok) {
                        const data = await response.json();
                        if (data?.ResultData[0]?.Status === 'true') {
                            setMachineStatusCheck(true);
                            setTicketCode(data.ResultData[0]?.TicketCode || '');
                        } else {
                            setMachineStatusCheck(false);
                            setTicketCode('');
                        }
                    } else {
                        console.error('Failed to fetch attendance data:', response.statusText);
                    }
                } catch (error) {
                    console.error('Error fetching attendance data:', error.message);
                } finally {
                    console.log('');
                }
            };
            fetchMachineCheck();
        }
    }, [formData.MachineId]);

    useEffect(() => {
        if (sessionUserData.OrgId) {
            fetchMachines();
        }
    }, [sessionUserData]);

    useEffect(() => {
        const userDataString = sessionStorage.getItem("userData");
        if (userDataString) {
            const userData = JSON.parse(userDataString);
            setsessionUserData(userData);
            setFormData((prev) => ({
                ...prev,
                CreatedBy: userData.Id,
                OrgId: userData.OrgId,
            }));
        }
    }, []);

    const fetchMachines = async () => {
        try {
            const response = await fetchWithAuth(`ADMINRoutes/CWIGetDDLItems?OrgId=${sessionUserData?.OrgId}&UserId=0`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });
            if (!response.ok) throw new Error("Network response was not ok");

            const data = await response.json();

            const filteredData = data.ResultData.filter(
                (item) => item.DDLName === "Machines"
            );

            setMCNsData(filteredData || []);
        } catch (error) {
            console.error("Failed to fetch UnitLocations:", error);
            setMCNsData([]);
        }
    }

    const handleInputChange = (eOrValue, name) => {
        if (eOrValue?.target) {
            const { name, value, files } = eOrValue.target;

            if (name === "ImageUrl" && files?.length > 0) {
                const file = files[0];
                setFormData((prev) => ({ ...prev, [name]: file }));
                setImagePreview(URL.createObjectURL(file));
                return;
            }

            let formattedValue = value;

            if (name === "IssueType") {
                if (/^[^a-zA-Z]/.test(formattedValue)) return;

                formattedValue = formattedValue.charAt(0).toUpperCase() + formattedValue.slice(1);
            }

            setFormData((prev) => ({ ...prev, [name]: formattedValue }));
        }
        else if (name) {
            setFormData((prev) => ({ ...prev, [name]: eOrValue }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setAddSubmitLoading(true);

        if (!formData.MachineId || !formData.Priority || !formData.ImageUrl) {
            Swal.fire({
                title: "warning",
                text: "All fileds are mandatory to raise an ticket.",
                icon: "warning",
            });
            setAddSubmitLoading(false);
            return;
        }

        const currentDate = new Date();
        let daysToAdd = 0;

        switch (formData.Priority) {
            case 1: // Low
                daysToAdd = 7;
                break;
            case 2: // Medium
                daysToAdd = 5;
                break;
            case 3: // High
                daysToAdd = 3;
                break;
            default:
                daysToAdd = 7;
                break;
        }

        const dueDate = new Date(currentDate);
        dueDate.setDate(currentDate.getDate() + daysToAdd);

        // Format to YYYY-MM-DD
        const formattedDueDate = dueDate.toISOString().split("T")[0];
        formData.DueDate = formattedDueDate;

        const formDataPayload = new FormData();

        formDataPayload.append("OrgId", sessionUserData.OrgId);
        formDataPayload.append("Priority", formData.Priority);
        formDataPayload.append("TicketStatus", "NEW");
        formDataPayload.append("UserId", sessionUserData.Id);

        // Append file if present
        if (formData?.ImageUrl instanceof File) {
            formDataPayload.append("ImageUrl", formData.ImageUrl);
        }

        // Append the nested JSON as string
        const jsonData = {
            MachineId: formData.MachineId,
            IssueType: formData.IssueType,
            Description: formData.Description,
            MachineStatus: formData.MachineStatus,
            DueDate: formData.DueDate,
        };

        formDataPayload.append("JsonData", JSON.stringify(jsonData));

        try {
            const response = await fetchWithAuth(`file_upload/TicketsWorkFlow`, {
                method: "POST",
                body: formDataPayload,
            });

            const result = await response.json();

            if (result?.success) {
                if (result.data.result[0].ResponseCode === 2001) {
                    Swal.fire({
                        title: "Success",
                        text: result.data.result[0].Logs || "Ticket has been raised successfully.",
                        icon: "success",
                    }).then(() => window.location.reload());
                }
            } else {
                Swal.fire({
                    title: "Error",
                    text: result?.ResultData?.ResultMessage || "Something went wrong.",
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
            setAddSubmitLoading(false);
        }
    };

    return (
        <div
            className="offcanvas offcanvas-end"
            tabIndex="-1"
            id="offcanvasRightAdd"
            aria-labelledby="offcanvasRightLabel"
            style={{ width: "90%" }}
        >
            <style>
                {`
                    @media (min-width: 768px) { /* Medium devices and up (md) */
                        #offcanvasRightAdd {
                            width: 50% !important;
                        }
                    }
                `}
            </style>
            <form autoComplete="off" onSubmit={handleSubmit}>
                <div className="offcanvas-header d-flex justify-content-between align-items-center">
                    <h5 id="offcanvasRightLabel" className="mb-0">Register Ticket</h5>
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
                <div className="offcanvas-body" style={{ marginTop: "-2rem", maxHeight: "calc(100vh - 4rem)", overflowY: "auto" }}>
                    <div className={`alert alert-warning p-2 mb-2 ${machineStatusCheck ? 'd-none' : 'd-block'}`}>
                        ⚠️ Image must be less than 2MB.
                    </div>
                    <div className={`alert alert-danger p-2 mb-2 ${machineStatusCheck ? 'd-block' : 'd-none'}`}>
                        <strong>Note:</strong> A ticket is already raised for this machine with code: <span className="text-primary fw-bold">{ticketCode}</span>
                        <br />
                        Please resolve the existing ticket before raising a new one.
                    </div>
                    <br />
                    <div className="row">
                        <div className="col-12 col-md-6 mb-2">
                            <label className="form-label">
                                Machine <span className="text-danger">*</span>
                            </label>
                            <Select
                                showSearch
                                allowClear
                                placeholder="Select Machine"
                                className="w-100"
                                value={formData.MachineId || undefined}
                                style={{ height: '3.2rem' }}
                                onChange={(value) => handleInputChange(value, "MachineId")}
                                optionFilterProp="children" // ✅ Let AntD use text for search
                            >
                                {mcnsData?.map((mcn, indx) => (
                                    <Option key={indx} value={mcn.ItemId}>
                                        {mcn.ItemValue} : <span className="text-primary fw-bold">{mcn.DisplayValue}</span>
                                    </Option>
                                ))}
                            </Select>

                        </div>
                        <div className="col-12 col-md-6 mb-2">
                            <label className="form-label">Issue Type<span className="text-danger">*</span></label>
                            <input
                                type="text"
                                name="IssueType"
                                className={`form-control ${machineStatusCheck ? 'cursor-not-allowed' : ''}`}
                                placeholder="Enter issue type"
                                value={formData.IssueType}
                                onChange={handleInputChange}
                                autoComplete="off"
                                max={30}
                                required
                                disabled={machineStatusCheck}
                            />
                        </div>
                        <div className="col-12 col-md-6 mb-2">
                            <label className="form-label">Priority<span className="text-danger">*</span></label>
                            <select
                                className={`form-select ${machineStatusCheck ? 'cursor-not-allowed' : ''}`}
                                name="Priority"
                                value={formData.Priority}
                                onChange={handleInputChange}
                                required
                                disabled={machineStatusCheck}
                            >
                                <option>Choose Priority</option>
                                <option value="3">Low</option>
                                <option value="2">Medium</option>
                                <option value="1">High</option>
                            </select>
                        </div>
                        <div className="col-12 col-md-6 mb-2">
                            <label className="form-label">Status<span className="text-danger">*</span></label>
                            <select
                                className={`form-control ${machineStatusCheck ? 'cursor-not-allowed' : ''}`}
                                name="MachineStatus"
                                value={formData.MachineStatus}
                                onChange={handleInputChange}
                                disabled={machineStatusCheck}
                                required
                            >
                                <option>Choose Status</option>
                                <option value="BREAKDOWN">Breakdown</option>
                                <option value="READYTOOPERATE">Ready to Operate</option>
                            </select>
                        </div>
                        <div className="col-12 col-md-6 mb-2">
                            <label className="form-label">Image<span className="text-danger">*</span></label>
                            <input
                                type="file"
                                name="ImageUrl"
                                className={`form-control ${machineStatusCheck ? 'cursor-not-allowed' : ''}`}
                                onChange={handleInputChange}
                                accept=".jpg,.jpeg,.png"
                                disabled={machineStatusCheck}
                            />
                        </div>
                        <div>
                            <label className="form-label">Description<span className="text-danger">*</span></label>
                            <textarea
                                type="text"
                                name="Description"
                                className={`form-control ${machineStatusCheck ? 'cursor-not-allowed' : ''}`}
                                placeholder="Enter description"
                                value={formData.Description}
                                onChange={handleInputChange}
                                autoComplete="off"
                                rows={4}
                                disabled={machineStatusCheck}
                                required
                            />
                        </div>

                        {imagePreview && (
                            <div className="mt-3">
                                <img
                                    src={imagePreview}
                                    alt="Selected Preview"
                                    className="img-thumbnail"
                                    style={{ maxHeight: "200px", objectFit: "contain" }}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </form>
        </div>
    );
}
