import React, { useEffect, useState } from "react";
import Swal from 'sweetalert2';
import { fetchWithAuth } from "../../../../utils/api";
import { Select, Tooltip } from 'antd';

export default function TechnicianList() {

    const [sessionUserData, setSessionUserData] = useState({});
    const [addSubmitLoading, setAddSubmitLoading] = useState(false);
    const [techniciansData, setTechniciansData] = useState([]);
    const [dataLoading, setDataLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [editData, setEditData] = useState([]);
    const [mode, setMode] = useState("add");  // "add" or "edit"
    const [selectedId, setSelectedId] = useState(null);
    const [showPassword, setShowPassword] = useState(false);
    const [selectedDeptId, setSelectedDeptId] = useState(null);
    const [selectedAssetTypeId, setSelectedAssetTypeId] = useState(null);
    const [sessionActionIds, setSessionActionIds] = useState([]);
    const [assetTypesData, setAssetTypesData] = useState([]);
    const [departmentsData, setDepartmentsData] = useState([]);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);

    const [formEditData, setFormEditData] = useState({
        OrgId: "",
        Name: "",
        PhoneNumber: "",
        Email: "",
        CreatedBy: "",
        Organization: "",
        Password: "",
        TypeId: "",
    });

    const [formAddData, setFormAddData] = useState({
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
            setFormEditData((prev) => ({
                ...prev,
                CreatedBy: userData.Id,
                OrgId: userData.OrgId,
            }));
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

    const handleSubmit = async (e) => {
        e.preventDefault();

        const requiredFields = [
            { key: "Name", label: "Supplier Name" },
            { key: "Email", label: "Email" },
            { key: "Organization", label: "Organization" },
            { key: "PhoneNumber", label: "Phone Number" },
        ];

        for (const field of requiredFields) {
            if (!formEditData[field.key]?.trim()) {
                Swal.fire({
                    icon: "warning",
                    title: "Validation Error",
                    text: `${field.label} is mandatory.`,
                });
                setAddSubmitLoading(false);
                return;
            }
        }

        // OPTIONAL: Email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formEditData.Email)) {
            Swal.fire({
                icon: "warning",
                title: "Invalid Email",
                text: "Please enter a valid email address.",
            });
            setAddSubmitLoading(false);
            return;
        }

        // OPTIONAL: Phone number validation (digits only, min 10)
        if (!/^\d{10,}$/.test(formEditData.PhoneNumber)) {
            Swal.fire({
                icon: "warning",
                title: "Invalid Phone Number",
                text: "Phone number must contain at least 10 digits.",
            });
            setAddSubmitLoading(false);
            return;
        }
        setAddSubmitLoading(true);

        // ✅ Build payload only after validation passes
        const formPayload = {
            OrgId: sessionUserData.OrgId,
            Name: formEditData.Name.trim(),
            PhoneNumber: formEditData.PhoneNumber.trim(),
            Email: formEditData.Email.trim(),
            Organization: formEditData.Organization.trim(),
            // Password: formEditData.Password.trim(),
            TypeId: formEditData.TypeId,
        };

        formPayload.UpdatedBy = sessionUserData.Id;
        formPayload.Id = selectedId;


        // Decide API endpoint
        const endpoint = "PMMS/EDITTechnicians";

        // ? "PMMS/ADDTechnicians"
        try {
            const response = await fetchWithAuth(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(formPayload),
            });

            const result = await response.json();

            if (result?.ResultData?.Status === "Success") {
                Swal.fire({
                    title: "Success",
                    text: "Technician has been updated successfully.",
                    icon: "success",
                }).then(() => resetForm(), fetchData());
            }

            // FAIL
            else {
                Swal.fire({
                    title: "Error",
                    text:
                        result?.ResultData?.ResultMessage ||
                        "Something went wrong.",
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

    const handleAddInputChange = (eOrValue, nameFromSelect = null) => {
        if (nameFromSelect) {
            setFormAddData((prev) => ({
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

        setFormAddData((prevState) => ({
            ...prevState,
            [name]: formattedValue,
        }));
    };

    const handleTechSubmit = async (e) => {
        e.preventDefault();
        setAddSubmitLoading(true);

        const formPayload = {
            OrgId: sessionUserData.OrgId,
            Name: formAddData.Name,
            PhoneNumber: formAddData.PhoneNumber,
            Email: formAddData.Email,
            CreatedBy: sessionUserData.Id,
            Organization: formAddData.Organization,
            Password: formAddData.Password,
            TypeId: selectedAssetTypeId,
        };

        // 1. Define required fields mapping (Technical Key -> User Friendly Name)
        const requiredFields = {
            Name: "Name",
            PhoneNumber: "Phone Number",
            Email: "Email",
            Organization: "Organization",
            Password: "Password",
            TypeId: "Asset Type"
        };

        // 2. Identify missing fields
        const missingFields = Object.keys(requiredFields).filter(key => !formPayload[key]);

        if (missingFields.length > 0) {
            // 3. Format the missing fields for the alert
            const missingLabels = missingFields.map(key => `<li>${requiredFields[key]}</li>`).join("");

            Swal.fire({
                title: "<strong>Required Fields Missing</strong>",
                icon: "info",
                html: `
            <div class="text-start mt-2">
                <p>Please provide the following details to proceed:</p>
                <ul class="text-danger fw-bold">
                    ${missingLabels}
                </ul>
            </div>
        `,
                showCloseButton: true,
                focusConfirm: false,
                confirmButtonText: "Got it!",
                confirmButtonColor: "#0095E8", // Matches Ant Design Primary color
            });
            setAddSubmitLoading(false);
            return; // Stop execution if validation fails
        }

        // Proceed with API call if validation passes

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
                }).then(() => {
                    setFormAddData({
                        OrgId: "",
                        Name: "",
                        PhoneNumber: "",
                        Email: "",
                        CreatedBy: "",
                        Organization: "",
                        Password: "",
                    });

                    setSelectedAssetTypeId(null);   // if needed
                    setShowAddModal(false);
                    fetchData();
                });
            } else if (result.ResultData[0].Status === 'false') {
                Swal.fire({
                    title: "Error",
                    text: result?.ResultData[0].Message || "Techinican already exist.",
                    icon: "info",
                });
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
            .split(/([.\s])/g)
            .map(part => {
                if (/[a-zA-Z]/.test(part)) {
                    // ONLY uppercase the first letter, leave the rest of the string EXACTLY as user typed
                    return part.charAt(0).toUpperCase() + part.slice(1);
                }
                return part;
            })
            .join('');
    };

    const resetForm = () => {
        setFormEditData({
            Name: "",
            Organization: "",
            PhoneNumber: "",
            Email: "",
            Password: "",
        });
        setSelectedId(null);
        setMode("add");
    };

    const fetchData = async () => {
        setDataLoading(true);
        try {
            const response = await fetchWithAuth(`PMMS/GetTechniciansByOrgId?OrgId=${sessionUserData.OrgId}&TypeId=${selectedAssetTypeId}`, {
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
            setDataLoading(false);
        }
    };

    // Use Array.isArray to safely handle the data
    const filteredData = Array.isArray(techniciansData)
        ? techniciansData.filter((item) => {
            const technicianName = item?.Name?.toLowerCase() || '';
            const technicianEmail = item?.Email?.toLowerCase() || '';
            const technicianOrg = item?.Organization?.toLowerCase() || '';

            const query = searchQuery.toLowerCase();

            return (
                technicianName.includes(query) ||
                technicianEmail.includes(query) ||
                technicianOrg.includes(query)
            );
        })
        : [];

    const handleEdit = (item) => {
        setEditData(item);
        // setMode("edit");
        setSelectedId(item.Id);   // assuming item.Id is unique

        setFormEditData({
            Name: item.Name,
            Organization: item.Organization,
            PhoneNumber: item.PhoneNumber,
            Email: item.Email,
            Password: item.Password,
            TypeId: item.TypeId,
        });
        setShowEditModal(true);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormEditData({ ...formEditData, [name]: value });
    };

    const [currentPage, setCurrentPage] = useState(1);
    const recordsPerPage = 5;
    // const totalPages = filteredData.length ? Math.ceil(filteredData?.length / recordsPerPage) : 0;
    const totalPages = Math.ceil((filteredData || []).length / recordsPerPage);

    // Get current records to display
    const indexOfLastRecord = currentPage * recordsPerPage;
    const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
    const currentRecords = filteredData?.slice(indexOfFirstRecord, indexOfLastRecord);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery]);

    const handleDeleteTechnician = async (e, item) => {
        e.stopPropagation();
        Swal.fire({
            title: "Are you sure?",
            text: "Do you want to delete technician?",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#3085d6",
            cancelButtonColor: "#d33",
            confirmButtonText: `<i class="bi bi-check2 text-white"></i> Yes, delete it!`,
            cancelButtonText: `<i class="bi bi-x-lg text-white"></i> No, cancel!`
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const payload = {
                        UpdatedBy: sessionUserData.Id,
                        Id: item.Id,
                        OrgId: sessionUserData.OrgId,
                    };

                    const response = await fetchWithAuth(`PMMS/InActiveTechnicians`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify(payload),
                    });
                    const result = await response.json();
                    const data = result.ResultData?.[0];
                    if (data) {
                        if (data.Status === 1) {
                            // --- CASE 1: SUCCESS ---
                            fetchData();
                            setSelectedAssetTypeId(selectedAssetTypeId);
                            Swal.fire({
                                title: "Deleted!",
                                text: data.Message || "Technician deleted successfully.",
                                icon: "success",
                                confirmButtonColor: "#3085d6"
                            });
                        } else if (data.Status === 0) {
                            // --- CASE 0: INFO / VALIDATION BLOCK ---
                            Swal.fire({
                                title: "Cannot Delete",
                                text: data.Message, // Displays: "Technician cannot be deleted. Active tickets exist."
                                icon: "info",
                                confirmButtonColor: "#009ef7"
                            });
                        } else {
                            // --- OTHER STATUS CODES ---
                            Swal.fire("Error!", data.Message || "An unexpected error occurred.", "error");
                        }
                    } else {
                        // --- FALLBACK IF ARRAY IS EMPTY ---
                        Swal.fire("Error!", "Invalid response from server.", "error");
                    }
                } catch (error) {
                    console.error("Error during technician delete:", error.message);
                    Swal.fire("Error!", "An unexpected error occurred.", "error");
                }
            }
        });
    };

    const renderTruncatedText = (text, limit, className) => {
        const isOverLimit = text?.length > limit;
        const dispText = isOverLimit ? `${text.substring(0, limit)}...` : (text || "N/A");

        return (
            <Tooltip title={isOverLimit ? text : null} placement="top">
                <span className={`${className} ${isOverLimit ? 'cursor-help' : ''}`}>
                    {dispText}
                </span>
            </Tooltip>
        );
    };

    const showDeptDwn = sessionActionIds?.includes(25);


    return (
        <div
            className="offcanvas offcanvas-end"
            tabIndex="-1"
            id="offcanvasRightTech"
            aria-labelledby="offcanvasRightLabel"
            style={{ width: "90%" }}
        >
            <style>
                {`
                    @media (min-width: 768px) { /* Medium devices and up (md) */
                        #offcanvasRightTech {
                            width: 48% !important;
                        }
                    }
                        .hover-elevate-up {
                            transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
                        }
                        .hover-elevate-up:hover {
                            transform: translateY(-5px);
                            box-shadow: 0 0.5rem 1.5rem rgba(0, 0, 0, 0.1) !important;
                        }
                        .text-truncate {
                            white-space: nowrap;
                            overflow: hidden;
                            text-overflow: ellipsis;
                            max-width: 150px;
                        }
                `}
            </style>
            <div>
                <div className="offcanvas-header d-flex justify-content-between align-items-center border-bottom">
                    <h3 id="offcanvasRightLabel" className="mb-0 fs-4 fw-bold">Technicians</h3>

                    <div className="d-flex align-items-center gap-2">
                        <button
                            type="button"
                            className="btn btn-dark btn-sm d-flex align-items-center shadow-sm"
                            onClick={() => setShowAddModal(true)}
                        >
                            <i className="bi bi-plus-circle"></i>Register
                        </button>

                        <button
                            type="button"
                            className="btn-close ms-1"
                            data-bs-dismiss="offcanvas"
                            aria-label="Close"
                        ></button>
                    </div>
                </div>
                <div className="offcanvas-body" style={{
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                    overflowY: 'auto',
                    paddingTop: '0'
                }}>
                    <div className="row g-3 align-items-end my-4">
                        <div className="col-12 col-md-4">
                            <label className="form-label fw-bold">
                                Department<span className="text-danger">*</span>
                            </label>
                            <Select
                                showSearch
                                placeholder="Select Department"
                                className="w-100"
                                value={selectedDeptId || undefined}
                                style={{ height: "2.8rem" }}
                                onChange={(value) => { setSelectedDeptId(value); setSelectedAssetTypeId(null) }}
                                optionFilterProp="children"
                                filterOption={(input, option) =>
                                    option.children.toLowerCase().includes(input.toLowerCase())
                                }
                                disabled={!showDeptDwn || dataLoading}
                            >
                                {departmentsData?.map((dep) => (
                                    <Option key={dep.ItemId} value={dep.ItemId}>
                                        {dep.DisplayValue}
                                    </Option>
                                ))}
                            </Select>
                        </div>

                        <div className="col-12 col-md-5">
                            <label className="form-label fw-bold">Asset Type<span className="text-danger">*</span></label>
                            <Select
                                showSearch
                                allowClear
                                placeholder="Select Asset Type"
                                className="w-100"
                                value={selectedAssetTypeId || undefined}
                                style={{ height: "2.8rem" }}
                                onChange={(value) => setSelectedAssetTypeId(value)}
                                filterOption={(input, option) => {
                                    const text = `${option?.children}`.toLowerCase();
                                    return text.includes(input.toLowerCase());
                                }}
                                disabled={dataLoading}
                            >
                                {assetTypesData?.map((assTyp) => (
                                    <Option key={assTyp.Id} value={assTyp.Id}>
                                        {assTyp.TypeName}
                                    </Option>
                                ))}
                            </Select>
                        </div>

                        <div className="col-12 col-md-3">
                            <button
                                className="btn btn-primary w-100 fw-bold d-flex align-items-center justify-content-center"
                                style={{ height: "2.8rem" }}
                                onClick={fetchData}
                                disabled={dataLoading || !selectedDeptId}
                            >
                                {dataLoading ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm me-2"></span>
                                        Fetching...
                                    </>
                                ) : (
                                    <>
                                        <i className="fa-solid fa-magnifying-glass me-2"></i>
                                        Fetch
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="row g-6">
                        {currentRecords?.map((item, index) => (
                            <div key={index} className="col-12 col-xl-6">
                                <div className="card border-0 shadow-sm hover-elevate-up h-100" style={{ borderRadius: '12px', overflow: 'hidden' }}>
                                    <div className="card-body p-0">
                                        <div className={`h-4px w-100 ${item.IsActive ? "bg-success" : "bg-danger"}`}></div>

                                        <div className="p-6">
                                            <div className="d-flex align-items-center justify-content-between mb-5">
                                                <div className="d-flex align-items-center">
                                                    <div className="symbol symbol-50px symbol-circle me-4">
                                                        <div className={`symbol-label fs-3 fw-bold ${item.IsActive ? "bg-light-primary text-primary" : "bg-light-secondary text-gray-600"}`}>
                                                            {item.Name?.charAt(0)}
                                                        </div>
                                                    </div>
                                                    <div className="d-flex flex-column">
                                                        {renderTruncatedText(item.Name, 20, "text-gray-900 fw-bolder fs-6 text-hover-primary")}

                                                        {renderTruncatedText(item.Organization, 24, "text-muted fw-bold fs-7")}
                                                    </div>
                                                </div>
                                                <span className={`badge px-3 py-2 fs-9 fw-bolder text-uppercase ${item.IsActive ? "badge-light-success" : "badge-light-danger"}`}>
                                                    {item.IsActive ? "Active" : "Inactive"}
                                                </span>
                                            </div>

                                            <div className="row mb-5">
                                                <div className="col-6">
                                                    <div className="d-flex align-items-center">
                                                        <i className="fa-solid fa-phone-volume text-primary opacity-50 me-3 fs-7"></i>
                                                        <span className="text-gray-600 fw-bold fs-7">{item.PhoneNumber}</span>
                                                    </div>
                                                </div>
                                                <div className="col-6">
                                                    <div className="d-flex align-items-center text-gray-600 fs-7">
                                                        <i className="fa-solid fa-envelope me-2 opacity-50"></i>
                                                        {renderTruncatedText(item.Email, 15, "fw-bold")}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="separator separator-dashed border-gray-200 mb-5"></div>

                                            <div className="d-flex justify-content-between align-items-center">
                                                <div className="fs-8 text-muted fw-bold">
                                                    <i className="fa-regular fa-id-badge me-1"></i> ID: #{item.Id}
                                                </div>
                                                <div className="d-flex gap-2">
                                                    <button
                                                        className="btn btn-icon btn-bg-light btn-active-color-primary btn-sm w-35px h-35px"
                                                        onClick={() => handleEdit(item)}
                                                        title="Edit Technician"
                                                    >
                                                        <i className="fa-solid fa-pencil fs-7"></i>
                                                    </button>
                                                    <button
                                                        className="btn btn-icon btn-bg-light btn-active-color-danger btn-sm w-35px h-35px"
                                                        onClick={(e) => handleDeleteTechnician(e, item)}
                                                        title="Delete Technician"
                                                    >
                                                        <i className="fa-solid fa-trash-can fs-7"></i>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Edit Tech */}
            {showEditModal && (
                <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-dialog-centered modal-md">
                        <div className="modal-content shadow-lg border-0">
                            <div className="modal-header bg-light py-4">
                                <h5 className="modal-title fw-bold">
                                    Edit Technician
                                </h5>
                                <div
                                    className="btn btn-icon btn-sm btn-active-light-primary ms-2"
                                    onClick={() => setShowEditModal(false)}
                                >
                                    <i className="fa-solid fa-xmark fs-4"></i>
                                </div>
                            </div>

                            <div className="modal-body p-10">
                                <div className="row">
                                    <div className="col-12 col-md-6 mb-5">
                                        <label className="form-label fw-bold">Technician Name<span className="text-danger">*</span></label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="Enter technician name"
                                            value={formEditData.Name}
                                            style={{ height: '2.8rem' }}
                                            onChange={(e) => setFormEditData({ ...formEditData, Name: e.target.value.replace(/\b\w/g, c => c.toUpperCase()) })}
                                        />
                                    </div>
                                    <div className="col-12 col-md-6 mb-5">
                                        <label className="form-label fw-bold">Organization Name<span className="text-danger">*</span></label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="Enter organization name"
                                            value={formEditData.Organization}
                                            style={{ height: "2.8rem" }}
                                            onChange={(e) => setFormEditData({ ...formEditData, Organization: e.target.value.replace(/\b\w/g, c => c.toUpperCase()) })}
                                        />
                                    </div>
                                    <div className="col-12 col-md-6 mb-5">
                                        <label className="form-label fw-bold">Email<span className="text-danger">*</span></label>
                                        <input
                                            type="email"
                                            className="form-control"
                                            placeholder="Enter email"
                                            value={formEditData.Email}
                                            style={{ height: '2.8rem' }}
                                            onChange={(e) => setFormEditData({ ...formEditData, Email: e.target.value.trim() })}
                                        />
                                    </div>
                                    <div className="col-12 col-md-6 mb-5">
                                        <label className="form-label fw-bold">Phone<span className="text-danger">*</span></label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            value={formEditData.PhoneNumber}
                                            style={{ height: "2.8rem" }}
                                            onChange={(e) => {
                                                const val = e.target.value.replace(/[^0-9]/g, "");
                                                if (val.length <= 10) setFormEditData({ ...formEditData, PhoneNumber: val });
                                            }}
                                        />
                                    </div>
                                    {/* <div className="col-12 col-md-3 mb-5">
                                        <label className="form-label fw-bold">Password<span className="text-danger">*</span></label>
                                        <div className="position-relative">
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                className="form-control"
                                                value={formEditData.Password}
                                                style={{ height: '2.8rem' }}
                                                onChange={(e) => setFormEditData({ ...formEditData, Password: e.target.value.trim() })}
                                            />
                                            <span
                                                className="position-absolute top-50 end-0 translate-middle-y me-3 cursor-pointer"
                                                onClick={() => setShowPassword(!showPassword)}
                                            >
                                                <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'} text-gray-500`}></i>
                                            </span>
                                        </div>
                                    </div> */}
                                </div>
                            </div>
                            <div className="modal-footer bg-light py-3">
                                <button type="button" className="btn btn-secondary fw-bold btn-sm" onClick={() => setShowEditModal(false)}>
                                    <i class="bi bi-x-lg"></i>Close
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-primary fw-bold btn-sm"
                                    onClick={handleSubmit}
                                    disabled={addSubmitLoading}
                                >
                                    {addSubmitLoading ? (
                                        <span className="spinner-border spinner-border-sm"></span>
                                    ) : (
                                        <i className="bi bi-bookmark-check"></i>
                                    )}
                                    {formEditData.Id ? 'Update Technician' : 'Save Technician'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Register Tech */}
            {showAddModal && (
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
                                    onClick={() => setShowAddModal(false)}
                                ></button>
                            </div>

                            <form onSubmit={handleTechSubmit}>
                                <div className="modal-body">
                                    <div className="row g-3 align-items-end mb-4">
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
                                                {departmentsData?.map((dep) => (
                                                    <Option key={dep.ItemId} value={dep.ItemId}>
                                                        {dep.DisplayValue}
                                                    </Option>
                                                ))}
                                            </Select>
                                        </div>
                                        <div className="col-12 col-md-6">
                                            <label className="form-label fw-bold">Asset Type<span className="text-danger">*</span></label>
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
                                                value={formAddData.Name}
                                                onChange={handleAddInputChange}
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
                                                value={formAddData.Organization}
                                                onChange={(e) => {
                                                    const { name, value } = e.target;
                                                    e.target.value = value.toUpperCase(); // Update the actual event target
                                                    handleAddInputChange(e); // Pass the real event
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
                                                value={formAddData.PhoneNumber}
                                                onChange={handleAddInputChange}
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
                                                value={formAddData.Email}
                                                onChange={handleAddInputChange}
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
                                                    value={formAddData.Password}
                                                    onChange={handleAddInputChange}
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
                                                    <i className={`fa-solid ${showPassword ? 'fa-eye' : 'fa-eye-slash'} text-gray-500 fs-5`}></i>
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="modal-footer">
                                    <button
                                        type="button"
                                        className="btn btn-secondary btn-sm"
                                        onClick={() => setShowAddModal(false)}
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
