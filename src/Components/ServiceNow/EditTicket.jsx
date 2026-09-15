import React, { useEffect, useState } from "react";
import Swal from 'sweetalert2';
import { Select } from "antd";
import { fetchWithAuth } from "../../utils/api";
import PropTypes from "prop-types";

export default function EditTicket({ serviceTypesData, ticObj }) {

    const [sessionUserData, setSessionUserData] = useState({});
    const [editSubmitLoading, setEditSubmitLoading] = useState(false);
    const [ticTypesData, setTicTypesData] = useState([]);
    const { Option } = Select;

    const [formData, setFormData] = useState({
        Id: undefined,
        TicketTypeId: undefined,
        ServiceTypeId: undefined,
        IssueType: "",
        Priority: undefined,
        DueDate: null,
        Description: "",
    });

    useEffect(() => {
        const userDataString = sessionStorage.getItem("userData");
        if (userDataString) {
            const userData = JSON.parse(userDataString);
            setSessionUserData(userData);
        }
    }, []);

    // Prefill form from ticObj whenever it changes (e.g. offcanvas reopened for a different ticket)
    useEffect(() => {
        if (ticObj) {
            setFormData({
                Id: ticObj.Id,
                ServiceTypeId: ticObj.ParentId,
                TicketTypeId: ticObj.TicketTypeId,
                IssueType: ticObj.IssueType || "",
                Priority: ticObj.Priority ? String(ticObj.Priority) : undefined,
                DueDate: ticObj.DueDate
                    ? new Date(ticObj.DueDate).toISOString().split("T")[0]
                    : null,
                Description: ticObj.Description || "",
            });
        }
    }, [ticObj]);

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
            Swal.fire("Validation", "Please select Service Type.", "warning");
            return;
        }

        if (!formData.TicketTypeId) {
            Swal.fire("Validation", "Please select Sub-category.", "warning");
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

        const payload = {
            Id: formData.Id,
            OrgId: sessionUserData.OrgId,
            UserId: sessionUserData.Id,
            Priority: Number(formData.Priority),
            IssueType: formData.IssueType.trim(),
            Description: formData.Description.trim(),
            DueDate: formData.DueDate || null,
            ServiceTypeId: formData.ServiceTypeId,
            TicketTypeId: formData.TicketTypeId,
        };

        try {
            setEditSubmitLoading(true);

            const response = await fetchWithAuth("ServiceNow/GeneralTickets", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
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
                    text: "Ticket updated successfully.",
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
                text: "Unable to update ticket.",
            });

        } catch (error) {
            console.error(error);

            Swal.fire({
                icon: "error",
                title: "Failed",
                text: error.message || "Something went wrong.",
            });
        } finally {
            setEditSubmitLoading(false);
        }
    };

    return (
        <div
            className="offcanvas offcanvas-end"
            tabIndex="-1"
            id="offcanvasRightEdit"
            aria-labelledby="offcanvasRightEditLabel"
            style={{ width: "90%" }}
        >
            <style>
                {`
                @media (min-width: 768px) {
                        #offcanvasRightEdit {
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
                                <i className="fa-solid fa-pen-to-square text-primary fs-5"></i>
                            </div>

                            <div>
                                <h5 id="offcanvasRightEditLabel" className="mb-0 fw-bold text-dark">
                                    Edit Ticket {ticObj?.TicketCode ? `— ${ticObj.TicketCode}` : ""}
                                </h5>
                                <div className="small text-muted">
                                    Update the details of this ticket
                                </div>
                            </div>
                        </div>

                        <div className="d-flex align-items-center gap-2">
                            <button
                                className="btn btn-primary btn-sm px-3 d-flex align-items-center rounded-3 shadow-sm"
                                type="submit"
                                disabled={editSubmitLoading}
                            >
                                <i className="bi bi-bookmark-check me-2"></i>
                                {editSubmitLoading ? "Updating..." : "Update"}
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
                                Category <span className="text-danger">*</span>
                            </label>
                            <Select
                                className="w-100"
                                placeholder="Select Category"
                                value={formData.ServiceTypeId}
                                optionLabelProp="label"
                                onChange={(value) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        ServiceTypeId: value,
                                        TicketTypeId: undefined, // reset dependent field when service type changes
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
                                Sub-category <span className="text-danger">*</span>
                            </label>
                            <Select
                                showSearch
                                allowClear
                                placeholder="Select Category"
                                className="w-100"
                                value={formData?.TicketTypeId || undefined}
                                style={{ height: "2.6rem" }}
                                onChange={(value) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        TicketTypeId: value,
                                    }))
                                }
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
                                value={formData.DueDate || ""}
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
                    </div>
                </div>
            </form>
        </div>
    );
}

EditTicket.propTypes = {
    serviceTypesData: PropTypes.object.isRequired,
    ticObj: PropTypes.object,
};