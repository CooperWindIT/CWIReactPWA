import React, { useEffect, useState } from "react";
import Swal from 'sweetalert2';
import { Select } from "antd";
import { fetchWithAuth } from "../../utils/api";
import { Upload } from "antd";
import PropTypes from "prop-types";


export default function RegisterTicket({ serviceTypesData }) {

    const { Dragger } = Upload;
    const [sessionUserData, setSessionUserData] = useState({});
    const [addSubmitLoading, setAddSubmitLoading] = useState(false);
    const [ticTypesData, setTicTypesData] = useState([]);
    const [selectedTicTypeId, setSelectedTicTypeId] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const { Option } = Select;

    const [formData, setFormData] = useState({
        TicketTypeId: undefined,
        ServiceTypeId: undefined,
        IssueType: "",
        Priority: undefined,
        DueDate: "",
        Description: "",
    });

    useEffect(() => {
        const userDataString = sessionStorage.getItem("userData");
        if (userDataString) {
            const userData = JSON.parse(userDataString);
            setSessionUserData(userData);
            setFormData((prev) => ({
                ...prev,
                CreatedBy: userData.Id,
                OrgId: userData.OrgId,
            }));
        }
    }, []);

    const priorityOptions = [
        { label: "Low", value: "3" },
        { label: "Medium", value: "2" },
        { label: "High", value: "1" },
    ];

    const fetchTicketTypes = async () => {

        try {
            const response = await fetchWithAuth(
                `ServiceNow/GetticketTypes?OrgId=${sessionUserData?.OrgId}&ParentId=${formData?.ServiceTypeId}`,
                {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                }
            );

            if (!response.ok) throw new Error("Network response was not ok");

            const data = await response.json();
            const result = data.ResultData || [];

            setTicTypesData(result);
        } catch (error) {
            console.error("Failed to fetch types data:", error);
            setTicTypesData([]);
        }
    };

    useEffect(() => {
        if (sessionUserData.OrgId && formData?.ServiceTypeId) {
            fetchTicketTypes();
        }
    }, [sessionUserData, formData?.ServiceTypeId]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.ServiceTypeId) {
            Swal.fire("Validation", "Please select Ticket Type.", "warning");
            return;
        }

        if (!formData.Priority) {
            Swal.fire("Validation", "Please select Priority.", "warning");
            return;
        }

        if (!formData.IssueType.trim()) {
            Swal.fire("Validation", "Please enter Issue Type.", "warning");
            return;
        }

        if (!formData.Description.trim()) {
            Swal.fire("Validation", "Please enter Description.", "warning");
            return;
        }

        const formPayload = new FormData();

        formPayload.append("OrgId", sessionUserData.OrgId);
        formPayload.append("Priority", Number(formData.Priority));
        formPayload.append("TicketStatus", "NEW");
        formPayload.append("UserId", sessionUserData.Id);

        const jsonData = {
            IssueType: formData.IssueType.trim(),
            Description: formData.Description.trim(),
            DueDate: formData.DueDate,
            ServiceTypeId: formData.ServiceTypeId,
            TicketTypeId: selectedTicTypeId,
        };

        formPayload.append("JsonData", JSON.stringify(jsonData));

        if (selectedFile) {
            formPayload.append("ImageUrl", selectedFile);
        }

        for (const [key, value] of formPayload.entries()) {
            console.log(key, value);
        }

        try {
            setAddSubmitLoading(true);

            const response = await fetchWithAuth("file_upload/GeneralTickets", {
                method: "POST",
                body: formPayload,
            });

            const data = await response.json();

            if (
                response.ok &&
                data.success &&
                data.data?.result?.[0]?.ResponseCode === 2001
            ) {
                Swal.fire({
                    icon: "success",
                    title: "Success",
                    text: "Ticket raised successfully.",
                    confirmButtonText: "OK",
                    allowOutsideClick: false,
                }).then((result) => {
                    if (result.isConfirmed) {
                        window.location.reload();
                    }
                });

                return;
            }

            Swal.fire({
                icon: "error",
                title: "Failed",
                text: "Unable to raise ticket.",
            });

        } catch (error) {
            console.error(error);

            Swal.fire({
                icon: "error",
                title: "Failed",
                text: error.message || "Something went wrong.",
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
                            width: 44% !important;
                        }
                    }
                `}
            </style>

            <form autoComplete="off" onSubmit={handleSubmit}>
                <div className="offcanvas-header border-bottom bg-white px-4 py-3 shadow-sm">
                    <div className="d-flex justify-content-between align-items-center w-100 gap-3">
                        <div className="d-flex align-items-center gap-3">
                            <div className="rounded-3 d-flex align-items-center justify-content-center bg-primary bg-opacity-10 border border-primary-subtle shadow-sm"
                                style={{ width: "46px", height: "46px" }}>
                                <i className="fa-solid fa-ticket text-primary fs-5"></i>
                            </div>

                            <div>
                                <h5 id="offcanvasRightLabel" className="mb-0 fw-bold text-dark">
                                    Register Ticket
                                </h5>
                                <div className="small text-muted">
                                    Create and manage a new asset issue ticket
                                </div>
                            </div>
                        </div>

                        <div className="d-flex align-items-center gap-2">
                            <button
                                className="btn btn-primary btn-sm px-3 d-flex align-items-center rounded-3 shadow-sm"
                                type="submit"
                                disabled={addSubmitLoading}
                            >
                                <i className="bi bi-bookmark-check me-2"></i>
                                {addSubmitLoading ? "Submitting..." : "Submit"}
                            </button>

                            <button
                                type="button"
                                className="btn btn-light btn-sm rounded-3 border shadow-sm d-flex align-items-center justify-content-center"
                                data-bs-dismiss="offcanvas"
                                aria-label="Close"
                                style={{ width: "38px", height: "38px" }}
                            >
                                <i className="fa-solid fa-xmark text-muted"></i>
                            </button>
                        </div>
                    </div>
                </div>

                <div className="offcanvas-body">
                    <div className="row">
                        <div className="col-md-6 mb-3">
                            <label className="form-label">
                                Service Type <span className="text-danger">*</span>
                            </label>
                            <Select
                                className="w-100"
                                placeholder="Select Service Type"
                                value={formData.ServiceTypeId}
                                optionLabelProp="label"
                                onChange={(value) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        ServiceTypeId: value,
                                    }))
                                }
                                options={
                                    Array.isArray(serviceTypesData)
                                        ? serviceTypesData.map((item) => ({
                                            value: item.Id,
                                            label: item.TicketType,
                                            item,
                                        }))
                                        : []
                                }
                                optionRender={(option) => {
                                    const item = option.data.item;

                                    return (
                                        <div className="py-1">
                                            <div className="d-flex justify-content-between align-items-start">
                                                <div>
                                                    <div className="fw-semibold text-dark">
                                                        {item.TicketType}
                                                    </div>

                                                    <div className="small text-muted mt-1">
                                                        <i className="fa-regular fa-user me-2 text-primary"></i>
                                                        {item.UserName || item.TechnicianName}
                                                    </div>

                                                    <div className="small text-muted">
                                                        <i className="fa-regular fa-envelope me-2 text-success"></i>
                                                        {item.UserEmail || item.TechEmail}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                }}
                            />
                        </div>
                        <div className="col-md-6 mb-3">
                            <label className="form-label">
                                Ticket Type <span className="text-danger">*</span>
                            </label>
                            <Select
                                showSearch
                                allowClear
                                placeholder="Select Ticket Type"
                                className="w-100"
                                value={formData?.TicketTypeId || undefined}
                                style={{ height: "2.6rem" }}
                                onChange={(value) => setSelectedTicTypeId(value)}
                                filterOption={(input, option) => {
                                    const text = `${option?.children}`.toLowerCase();
                                    return text.includes(input.toLowerCase());
                                }}
                            >
                                {Array.isArray(ticTypesData) && ticTypesData.map((ticTyp) => (
                                    <Option key={ticTyp.Id} value={ticTyp.Id}>
                                        {ticTyp.TicketType}
                                    </Option>
                                ))}
                            </Select>
                        </div>
                        <div className="col-md-6 mb-3">
                            <label className="form-label">
                                Priority <span className="text-danger">*</span>
                            </label>

                            <Select
                                className="w-100"
                                placeholder="Select Priority"
                                value={formData.Priority}
                                onChange={(value) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        Priority: value,
                                    }))
                                }
                                options={priorityOptions}
                            />
                        </div>
                        <div className="col-md-6 mb-3">
                            <label className="form-label">
                                Due Date
                            </label>
                            <input
                                type="date"
                                className="form-control"
                                min={new Date().toISOString().split("T")[0]}
                                value={formData.DueDate}
                                onChange={(e) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        DueDate: e.target.value,
                                    }))
                                }
                                style={{ height: '2.8rem' }}
                            />
                        </div>
                        <div className="col-md-12 mb-3">
                            <label className="form-label">
                                Issue Type <span className="text-danger">*</span>
                            </label>
                            <input
                                className="form-control"
                                value={formData.IssueType}
                                onChange={(e) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        IssueType: e.target.value,
                                    }))
                                }
                                style={{ height: '2.8rem' }}
                                placeholder="Enter issue"
                            />
                        </div>
                        <div className="col-12 mb-3">
                            <label className="form-label">
                                Description <span className="text-danger">*</span>
                            </label>

                            <textarea
                                rows={5}
                                className="form-control"
                                value={formData.Description}
                                onChange={(e) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        Description: e.target.value,
                                    }))
                                }
                                placeholder="Describe the issue..."
                            />
                        </div>
                        <div className="col-12 mb-3">
    <label className="form-label">
        Attachment
    </label>

    <input
        type="file"
        className="form-control"
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
        onChange={(e) => {
            if (e.target.files.length > 0) {
                setSelectedFile(e.target.files[0]);
            } else {
                setSelectedFile(null);
            }
        }}
    />

    {selectedFile && (
        <small className="text-success mt-2 d-block">
            <i className="fa fa-paperclip me-1"></i>
            {selectedFile.name}
        </small>
    )}
</div>
                    </div>
                </div>
            </form>
        </div>
    );
}


RegisterTicket.propTypes = {
    serviceTypesData: PropTypes.object.isRequired,
};
