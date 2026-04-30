import React, { useEffect, useState } from "react";
import Swal from 'sweetalert2';
import { Select } from "antd";
import PropTypes from "prop-types";
// import RegisterTechnician from "../Techincians/Add";
import { fetchWithAuth } from "../../../utils/api";

export default function AssignTechnician({ ticketObj }) {

    const [sessionUserData, setSessionUserData] = useState({});
    const [techniciansData, setTechniciansData] = useState([]);
    const [editSubmitLoading, setEditSubmitLoading] = useState(false);
    const [selectedTechnicianId, setSelectedTechnicianId] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [addSubmitLoading, setAddSubmitLoading] = useState(false);
    const [selectedDeptId, setSelectedDeptId] = useState(null);
    const [selectedAssetTypeId, setSelectedAssetTypeId] = useState(null);
    const [sessionActionIds, setSessionActionIds] = useState([]);
    const [assetTypesData, setAssetTypesData] = useState([]);
    const [departmentsData, setDepartmentsData] = useState([]);

    const [formData, setFormData] = useState({
        OrgId: "",
        Name: "",
        PhoneNumber: "",
        Email: "",
        CreatedBy: "",
        Organization: "",
        Password: "",
    });

    const { Option } = Select;

    useEffect(() => {
        const userDataString = sessionStorage.getItem("userData");
        if (userDataString) {
            const userData = JSON.parse(userDataString);
            setSessionUserData(userData);
        } else {
            console.log('sesssion not avilable');
        }
    }, []);

    useEffect(() => {
        const sessionMenuData = sessionStorage.getItem("menuData");
        try {
            const parsedMenu = JSON.parse(sessionMenuData);

            const ticketsMenu = parsedMenu.find(
                (item) => item.MenuName === "Assets"
            );

            if (ticketsMenu) {
                const actionIdArray = ticketsMenu.ActionsIds?.split(",").map(Number);
                setSessionActionIds(actionIdArray);
            }
        } catch (err) {
            console.error("Error parsing menuData:", err);
        }
    }, []);

    const fetchAssetTypes = async () => {
        try {
            const storedModule = JSON.parse(localStorage.getItem("ModuleData"));
            const moduleId = storedModule?.Id?.toString();
            const response = await fetchWithAuth(
                `Portal/GetMasterTypes?OrgId=${sessionUserData?.OrgId}&DeptId=${selectedDeptId}&ModuleId=${moduleId}&TypeCategory=1`,
                {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                }
            );

            if (!response.ok) throw new Error("Network response was not ok");

            const data = await response.json();

            setAssetTypesData(data.ResultData || []);

        } catch (error) {
            console.error("Failed to fetch types data:", error);
            setAssetTypesData([]);
        }
    };

    useEffect(() => {
        if (sessionUserData.OrgId && selectedDeptId) {
            fetchAssetTypes();
        }
    }, [sessionUserData, selectedDeptId]);

    useEffect(() => {
        if (sessionUserData.OrgId) {
            fetchDDLData();
            setSelectedDeptId(sessionUserData?.DeptId);
        }
    }, [sessionUserData]);

    const fetchDDLData = async () => {
        try {
            const sessionDDL = sessionStorage.getItem("ddlAssetsTechData");

            // 1️⃣ LOAD FROM SESSION
            if (sessionDDL) {
                const parsed = JSON.parse(sessionDDL);

                const depts = parsed.depts || [];

                setDepartmentsData(depts);
                return;
            }

            // 2️⃣ FETCH FROM API
            const response = await fetchWithAuth(
                `ADMINRoutes/CWIGetDDLItems?OrgId=${sessionUserData?.OrgId}&UserId=0`,
                {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                }
            );

            if (!response.ok) throw new Error("Network response was not ok");

            const data = await response.json();

            const departmentsFilteredData = data.ResultData.filter(
                (item) => item.DDLName === "Departments"
            );

            setDepartmentsData(departmentsFilteredData);
            const defaultDeptId = sessionUserData?.DeptId;

            if (defaultDeptId) {
                setSelectedDeptId(defaultDeptId);
            }

            sessionStorage.setItem(
                "ddlAssetsTechData",
                JSON.stringify({
                    depts: departmentsFilteredData,
                })
            );

        } catch (error) {
            console.error("Failed to fetch DDL data:", error);
            setDepartmentsData([]);
        }
    };

    const fetchTechnicians = async () => {
        try {
            const response = await fetchWithAuth(`PMMS/GetTechniciansByOrgId?OrgId=${sessionUserData.OrgId}&TypeId=${ticketObj?.TypeId}`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });
            if (response.ok) {
                const data = await response.json();
                setTechniciansData(data.ResultData);
            } else {
                console.error('Failed to fetch technicians data:', response.statusText);
            }
        } catch (error) {
            console.error('Error fetching technicians data:', error.message);
        } finally {
            setEditSubmitLoading(false);
        }
    };

    useEffect(() => {
        if (sessionUserData.OrgId && ticketObj?.TypeId) {
            fetchTechnicians();
        }
    }, [sessionUserData, ticketObj]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setEditSubmitLoading(true);

        if (!selectedTechnicianId) {
            Swal.fire({
                title: "warning",
                text: "Please select technician.",
                icon: "warning",
            });
            setEditSubmitLoading(false);
            return;
        }

        try {
            const formPayload = {
                OrgId: sessionUserData?.OrgId,
                Priority: ticketObj?.Priority,
                TicketStatus: "ASSIGNED",
                TicketId: ticketObj?.Id,
                UserId: sessionUserData?.Id,
                JsonData: {
                    TechnicianId: selectedTechnicianId,
                    TicketCode: ticketObj?.TicketCode,
                    MachineId: ticketObj?.MachineId,
                    TicketCreated: ticketObj?.TicketCreated,
                }
            }

            const response = await fetchWithAuth(`PMMS/TicketsWorkFlow`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formPayload),
            });

            const result = await response.json();

            if (result.success) {
                if (result.data.result[0].ResponseCode === 2005) {
                    Swal.fire({
                        title: "Success",
                        text: result.data.result[0].Logs || "Ticket has been assigned successfully.",
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
            setEditSubmitLoading(false);
        }
    };

    const getPriorityLabel = (priority) => {
        switch (priority) {
            case 1: return "High";
            case 2: return "Medium";
            case 3: return "Low";
            default: return "";
        }
    };

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 1: return "text-danger";   // Red for High
            case 2: return "text-warning";  // Yellow/Orange for Medium
            case 3: return "text-success";  // Green for Low
            default: return "";
        }
    };

    useEffect(() => {
        const userDataString = sessionStorage.getItem("userData");
        if (userDataString) {
            const userData = JSON.parse(userDataString);
            setFormData((prev) => ({
                ...prev,
                CreatedBy: userData.Id,
                OrgId: userData.OrgId,
            }));
        }
    }, []);

    const handleInputChange = (eOrValue, nameFromSelect = null) => {
        if (nameFromSelect) {
            setFormData((prev) => ({
                ...prev,
                [nameFromSelect]: eOrValue || "",
            }));
            return;
        }

        const { name, value } = eOrValue.target;
        let formattedValue = value;

        // For Name and Organization: block invalid characters and apply title case
        if (['Name', 'Organization'].includes(name)) {
            if (/^[^a-zA-Z]/.test(formattedValue)) return; // disallow leading non-letter
            if (/[^a-zA-Z .]/.test(formattedValue)) return; // disallow special chars except space and dot

            formattedValue = toTitleCase(formattedValue);
        }

        // For phone number: allow only digits, max 10
        if (name === 'PhoneNumber') {
            if (!/^\d{0,10}$/.test(formattedValue)) {
                Swal.fire({
                    title: "Invalid Input",
                    text: "Please enter a valid 10-digit mobile number without letters or special characters.",
                    icon: "error",
                });
                return;
            }
        }

        setFormData((prevState) => ({
            ...prevState,
            [name]: formattedValue,
        }));
    };

    const handleTechSubmit = async (e) => {
        e.preventDefault();
        setAddSubmitLoading(true);

        const formPayload = {
            OrgId: sessionUserData.OrgId,
            Name: formData.Name,
            PhoneNumber: formData.PhoneNumber,
            Email: formData.Email,
            CreatedBy: sessionUserData.Id,
            Organization: formData.Organization,
            Password: formData.Password,
            TypeId: selectedAssetTypeId,
        };

        try {
            const response = await fetchWithAuth(`PMMS/ADDTechnicians`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(formPayload),
            });

            const result = await response.json();

            if (result.ResultData[0].NewId > 0) {
                Swal.fire({
                    title: "Success",
                    text: "Technician has been added successfully.",
                    icon: "success",
                }).then(() => setShowModal(false), fetchTechnicians());
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

    const toTitleCase = (str) => {
        return str
            .toLowerCase()
            .replace(/(^|\s|\.)\w/g, (match) => match.toUpperCase());
    };

    const showDeptDwn = sessionActionIds?.includes(25);

    return (
        <div
            className="offcanvas offcanvas-end"
            tabIndex="-1"
            id="offcanvasRightAssignTech"
            aria-labelledby="offcanvasRightLabel"
            style={{ width: "90%" }}
        >
            <style>
                {`
                    @media (min-width: 768px) { /* Medium devices and up (md) */
                        #offcanvasRightAssignTech {
                            width: 50% !important;
                        }
                    }
                        .uppercase-input {
                            text-transform: uppercase;
                        }
                `}
            </style>
            <form autoComplete="off" onSubmit={handleSubmit}>
                <div className="offcanvas-header d-flex justify-content-between align-items-center">
                    <h5 id="offcanvasRightLabel" className="mb-0" >Assign Technician</h5>
                    <div className="d-flex align-items-center">
                        <button className="btn btn-primary btn-sm me-2" type="submit" disabled={editSubmitLoading}>
                            <i className="bi bi-bookmark-check"></i>{editSubmitLoading ? "Submitting..." : "Submit"}
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
                            <label className="form-label">Ticket Code</label>
                            <input
                                type="text"
                                className="form-control cursor-not-allowed"
                                value={ticketObj?.TicketCode}
                                style={{ height: '2.8rem' }}
                                readOnly
                            />
                        </div>
                        <div className="col-6 mb-2">
                            <label className="form-label">Asset Name</label>
                            <input
                                type="text"
                                className="form-control cursor-not-allowed cursor-not-allowed"
                                placeholder="Enter asset name"
                                value={ticketObj?.MachineName}
                                style={{ height: '2.8rem' }}
                                readOnly
                            />
                        </div>
                        <div className="col-6 mb-2">
                            <label className="form-label">Priority</label>
                            <input
                                type="text"
                                className={`form-control cursor-not-allowed ${getPriorityColor(ticketObj?.Priority)}`}
                                value={getPriorityLabel(ticketObj?.Priority)}
                                style={{ height: '2.8rem' }}
                                readOnly
                            />
                        </div>
                        <div className="col-6 mb-2">
                            <label className="form-label">
                                Technician <span className="text-danger">*</span>
                            </label>
                            <div className="d-flex align-items-center gap-2">
                                <Select
                                    placeholder="Select Technician"
                                    showSearch
                                    allowClear
                                    filterOption={(input, option) =>
                                        option?.children?.toLowerCase().includes(input.toLowerCase())
                                    }
                                    value={selectedTechnicianId || undefined}
                                    onChange={(value) => setSelectedTechnicianId(value)}
                                    style={{ height: '2.8rem', flex: 1 }}
                                >
                                    {Array.isArray(techniciansData) && techniciansData.map((item) => (
                                        <Option key={item.Id} value={item.Id}>
                                            {item.Name}
                                        </Option>
                                    ))}
                                </Select>

                                <button
                                    type="button"
                                    className="btn btn-dark d-flex align-items-center justify-content-center"
                                    onClick={() => setShowModal(true)}
                                    style={{ height: '2.8rem', width: '2.8rem' }}
                                >
                                    <i className="bi bi-plus-circle fs-5 text-white"></i>
                                </button>

                            </div>
                        </div>
                    </div>
                </div>
            </form>

            {/* Register Technician */}
            {showModal && (
                <div
                    className="modal fade show"
                    style={{ display: "block", background: "rgba(0,0,0,0.5)" }}
                    tabIndex="-1"
                >
                    <div className="modal-dialog modal-dialog-centered modal-md">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title" id="addTechnicianModalLabel">
                                    Add Technician
                                </h5>
                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={() => setShowModal(false)}
                                ></button>
                            </div>

                            <form onSubmit={handleTechSubmit}>
                                <div className="modal-body">
                                    <div className="row g-3 align-items-end mb-4">
                                        {/* Department Select */}
                                        <div className="col-12 col-md-6">
                                            <label className="form-label fw-bold">
                                                Department <span className="text-danger">*</span>
                                            </label>
                                            <Select
                                                showSearch
                                                placeholder="Select Department"
                                                className="w-100"
                                                value={selectedDeptId || undefined}
                                                style={{ height: "2.7rem" }}
                                                onChange={(value) => setSelectedDeptId(value)}
                                                optionFilterProp="children"
                                                filterOption={(input, option) =>
                                                    option.children.toLowerCase().includes(input.toLowerCase())
                                                }
                                                disabled={!showDeptDwn}
                                            >
                                                {departmentsData?.map((dep) => {
                                                    // Check if this department matches the logged-in user's department
                                                    const isUserDept = dep.ItemId === sessionUserData?.DeptId;

                                                    return (
                                                        <Option key={dep.ItemId} value={dep.ItemId}>
                                                            <div className="d-flex justify-content-between align-items-center w-100">
                                                                <span className={isUserDept ? "fw-bolder text-primary" : ""}>
                                                                    {dep.ItemValue}
                                                                </span>
                                                                {isUserDept && (
                                                                    <span
                                                                        className="badge badge-light-primary fw-bold"
                                                                        style={{ fontSize: '10px', padding: '2px 6px' }}
                                                                    >
                                                                        MY DEPT
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </Option>
                                                    );
                                                })}
                                            </Select>
                                        </div>

                                        {/* Asset Type Select */}
                                        <div className="col-12 col-md-6">
                                            <label className="form-label fw-bold">Asset Type</label>
                                            <Select
                                                showSearch
                                                allowClear
                                                placeholder="Select Asset Type"
                                                className="w-100"
                                                value={selectedAssetTypeId || undefined}
                                                style={{ height: "2.7rem" }}
                                                onChange={(value) => setSelectedAssetTypeId(value)}
                                                filterOption={(input, option) => {
                                                    const text = `${option?.children}`.toLowerCase();
                                                    return text.includes(input.toLowerCase());
                                                }}
                                            >
                                                {assetTypesData?.map((assTyp) => (
                                                    <Option key={assTyp.Id} value={assTyp.Id}>
                                                        {assTyp.TypeName}
                                                    </Option>
                                                ))}
                                            </Select>
                                        </div>
                                        <div className="col-12 col-md-6 mb-2">
                                            <label className="form-label">
                                                Technician Name <span className="text-danger">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                name="Name"
                                                className="form-control form-control-sm"
                                                placeholder="Enter technician name"
                                                onKeyDown={(e) => {
                                                    if (e.key === ' ') e.preventDefault();
                                                }}
                                                value={formData.Name}
                                                onChange={handleInputChange}
                                                disabled={addSubmitLoading}
                                                required
                                            />
                                        </div>

                                        <div className="col-12 col-md-6 mb-2">
                                            <label className="form-label">
                                                Organization Name <span className="text-danger">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                name="Organization"
                                                className="form-control form-control-sm "
                                                placeholder="Enter organization name"
                                                value={formData.Organization}
                                                onChange={(e) => {
                                                    const { name, value } = e.target;
                                                    e.target.value = value.toUpperCase(); // Update the actual event target
                                                    handleInputChange(e); // Pass the real event
                                                }}
                                                disabled={addSubmitLoading}
                                                required
                                            />
                                        </div>

                                        <div className="col-12 col-md-6 mb-2">
                                            <label className="form-label">
                                                Phone <span className="text-danger">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                name="PhoneNumber"
                                                className="form-control form-control-sm"
                                                placeholder="Enter phone number"
                                                value={formData.PhoneNumber}
                                                onChange={handleInputChange}
                                                onKeyDown={(e) => e.key === " " && e.preventDefault()}
                                                disabled={addSubmitLoading}
                                                required
                                            />
                                        </div>

                                        <div className="col-12 col-md-6 mb-2">
                                            <label className="form-label">
                                                Email <span className="text-danger">*</span>
                                            </label>
                                            <input
                                                type="email"
                                                name="Email"
                                                className="form-control form-control-sm"
                                                placeholder="Enter email"
                                                value={formData.Email}
                                                onChange={handleInputChange}
                                                onKeyDown={(e) => e.key === " " && e.preventDefault()}
                                                disabled={addSubmitLoading}
                                                required
                                            />
                                        </div>
                                        <div className="col-12 col-md-6 mb-2">
                                            <label className="form-label">Password<span className="text-danger">*</span></label>
                                            <div className="position-relative">
                                                <input
                                                    type={showPassword ? "text" : "password"} // Switches type dynamically
                                                    name="Password"
                                                    className="form-control form-control-sm pe-10" // Added 'pe-10' (padding-end) so text doesn't overlap icon
                                                    placeholder="Enter password"
                                                    value={formData.Password}
                                                    onChange={handleInputChange}
                                                    autoComplete="off"
                                                    onKeyDown={(e) => {
                                                        if (e.key === ' ') e.preventDefault();
                                                    }}
                                                    required
                                                    style={{ height: '2.8rem' }}
                                                />
                                                <span
                                                    className="position-absolute top-50 end-0 translate-middle-y me-3 cursor-pointer"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                >
                                                    <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'} text-gray-500 fs-5`}></i>
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="modal-footer">
                                    <button
                                        type="button"
                                        className="btn btn-secondary btn-sm"
                                        onClick={() => setShowModal(false)}
                                        disabled={addSubmitLoading}
                                    >
                                        <i className="bi bi-x-lg"></i>Cancel
                                    </button>
                                    <button type="submit" className="btn btn-primary btn-sm" disabled={addSubmitLoading}>
                                        <i className="bi bi-bookmark-check fs-4"></i>{addSubmitLoading ? 'Saving...' : 'Save Technician'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

AssignTechnician.propTypes = {
    ticketObj: PropTypes.object.isRequired,
};