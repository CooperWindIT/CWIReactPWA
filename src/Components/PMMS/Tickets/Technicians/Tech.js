import React, { useEffect, useState } from "react";
import Swal from 'sweetalert2';
import { fetchWithAuth } from "../../../../utils/api";
import { Popover } from 'antd';


export default function TechnicianList() {

    const [sessionUserData, setSessionUserData] = useState({});
    const [addSubmitLoading, setAddSubmitLoading] = useState(false);
    const [techniciansData, setTechniciansData] = useState([]);
    const [dataLoading, setDataLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [editData, setEditData] = useState([]);
    const [mode, setMode] = useState("add");  // "add" or "edit"
    const [selectedId, setSelectedId] = useState(null);

    const [formData, setFormData] = useState({
        OrgId: "",
        Name: "",
        PhoneNumber: "",
        Email: "",
        CreatedBy: "",
        Organization: ""
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setAddSubmitLoading(true);

        const formPayload = {
            OrgId: sessionUserData.OrgId,
            Name: formData.Name,
            PhoneNumber: formData.PhoneNumber,
            Email: formData.Email,
            Organization: formData.Organization,
        };

        // Add created/updated/Id values based on mode
        if (mode === "add") {
            formPayload.CreatedBy = sessionUserData.Id;
        } else {
            formPayload.UpdatedBy = sessionUserData.Id;
            formPayload.Id = selectedId;
        }

        // Decide API endpoint
        const endpoint =
            mode === "add"
                ? "PMMS/ADDTechnicians"
                : "PMMS/EDITTechnicians";

        try {
            const response = await fetchWithAuth(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(formPayload),
            });

            const result = await response.json();

            // ADD SUCCESS
            if (mode === "add" && result?.ResultData?.[0]?.NewId > 0) {
                Swal.fire({
                    title: "Success",
                    text: "Technician has been added successfully.",
                    icon: "success",
                }).then(() => resetForm(), fetchData());
            }

            // EDIT SUCCESS
            else if (mode === "edit" && result?.ResultData?.Status === "Success") {
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

    const resetForm = () => {
        setFormData({
            Name: "",
            Organization: "",
            PhoneNumber: "",
            Email: "",
        });
        setSelectedId(null);
        setMode("add");
    };


    const toTitleCase = (str) => {
        return str
            .toLowerCase()
            .replace(/(^|\s|\.)\w/g, (match) => match.toUpperCase());
    };

    const fetchData = async () => {
        setDataLoading(true);
        try {
            const response = await fetchWithAuth(`PMMS/GetTechniciansByOrgId?OrgId=${sessionUserData.OrgId}`, {
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

    useEffect(() => {
        if (sessionUserData.OrgId) {
            fetchData();
        }
    }, [sessionUserData]);

    const filteredData = techniciansData && techniciansData.filter((item) => {
        const technicianName = item?.Name?.toLowerCase() || '';
        const technicianEmail = item?.Email?.toLowerCase() || '';
        const technicianOrg = item?.Organization?.toLowerCase() || '';

        const query = searchQuery.toLowerCase();

        return (
            technicianName.includes(query) ||
            technicianEmail.includes(query) ||
            technicianOrg.includes(query)

        );
    });

    const handleEdit = (item) => {
        setEditData(item);
        setMode("edit");
        setSelectedId(item.Id);   // assuming item.Id is unique

        setFormData({
            Name: item.Name,
            Organization: item.Organization,
            PhoneNumber: item.PhoneNumber,
            Email: item.Email
        });
    };
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
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

    const handleDeleteTechnician = async (item) => {
        Swal.fire({
            title: "Are you sure?",
            text: "Do you want to delete technician?",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#3085d6",
            cancelButtonColor: "#d33",
            confirmButtonText: "Yes, delete it!"
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

                    if (result.ResultData?.Status === 'Success') {
                        fetchData();
                        Swal.fire("Success!", "Technician has been deleted.", "success");
                    } else {
                        const errorData = await response.json();
                        Swal.fire("Error!", errorData.ResultData?.ResultMessage || "Failed to delete technician.", "error");
                    }
                } catch (error) {
                    console.error("Error during technician delete:", error.message);
                    Swal.fire("Error!", "An unexpected error occurred.", "error");
                }
            }
        });
    };

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
                            width: 50% !important;
                        }
                    }
                `}
            </style>
            <div>
                <div className="offcanvas-header d-flex justify-content-between align-items-center">
                    <h5 id="offcanvasRightLabel" className="mb-0">Technicians</h5>
                    <div className="d-flex align-items-center">
                        <button className="btn btn-primary btn-sm me-2" type="button" onClick={handleSubmit} disabled={addSubmitLoading}>
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
                    {/* add/edit */}
                    <div style={{ borderBottom: '1px solid skyblue' }} className="mb-3">Add/Edit </div>
                    <div className="row">
                        <div className="col-6 mb-2">
                            <label className="form-label">Technician Name<span className="text-danger">*</span></label>
                            <input
                                type="text"
                                name="Name"
                                className="form-control"
                                placeholder="Enter technician name"
                                value={formData.Name}
                                onChange={(e) => {
                                    const value = e.target.value;

                                    // Capitalize first letter of each word
                                    const capitalized = value.replace(/\b\w/g, (char) => char.toUpperCase());

                                    setFormData({ ...formData, Name: capitalized });
                                }}
                                autoComplete="off"
                                required
                                style={{ height: '2.8rem' }}
                            />
                        </div>
                        <div className="col-6 mb-2">
                            <label className="form-label">Organization Name<span className="text-danger">*</span></label>
                            <input
                                type="text"
                                name="Organization"
                                className="form-control"
                                placeholder="Enter organization name"
                                value={formData.Organization}
                                onChange={(e) => {
                                    const value = e.target.value;

                                    // Capitalize first letter of each word
                                    const capitalized = value.replace(/\b\w/g, (char) => char.toUpperCase());

                                    setFormData({ ...formData, Organization: capitalized });
                                }}
                                autoComplete="off"
                                required
                                style={{ height: "2.8rem" }}
                            />
                        </div>
                        <div className="col-6 mb-2">
                            <label className="form-label">Phone<span className="text-danger">*</span></label>
                            <input
                                type="text"
                                name="PhoneNumber"
                                className="form-control"
                                placeholder="Enter phone number"
                                value={formData.PhoneNumber}
                                onChange={(e) => {
                                    // Remove all non-numeric characters
                                    const onlyNums = e.target.value.replace(/[^0-9]/g, "");

                                    // Restrict to 10 digits
                                    if (onlyNums.length <= 10) {
                                        setFormData({ ...formData, PhoneNumber: onlyNums });
                                    }
                                }}
                                autoComplete="off"
                                required
                                style={{ height: "2.8rem" }}
                            />
                        </div>
                        <div className="col-6 mb-2">
                            <label className="form-label">Email<span className="text-danger">*</span></label>
                            <input
                                type="email"
                                name="Email"
                                className="form-control"
                                placeholder="Enter email"
                                value={formData.Email}
                                onChange={handleInputChange}
                                autoComplete="off"
                                onKeyDown={(e) => {
                                    if (e.key === ' ') {
                                        e.preventDefault();
                                    }
                                }}
                                required
                                style={{ height: '2.8rem' }}
                            />
                        </div>
                        <div className="d-flex justify-content-end mt-2">
                            <button
                                className="btn btn-sm btn-secondary"
                                onClick={resetForm}
                            >
                                <i className="fa-solid fa-broom"></i>Clear
                            </button>
                        </div>
                    </div>
                    <hr className="text-primary"/>

                    {/* list */}
                    <div className="row g-4">
                        {currentRecords.map((item, index) => (
                            <div key={index} className="col-12 col-md-6 col-lg-4">
                                <div className="card shadow-sm border-0 hover-elevate-up p-4">

                                    <div className="d-flex align-items-center justify-content-between">
                                        <h5 className="fw-bold text-gray-800">{item.Name}</h5>
                                        <span className={`badge ${item.IsActive ? "badge-light-success" : "badge-light-danger"}`}>
                                            {item.IsActive ? "Active" : "Inactive"}
                                        </span>
                                    </div>
                                    <p className="text-muted mt-2 mb-1"><strong>Org:</strong> {item.Organization || "N/A"}</p>
                                    <p className="text-muted mb-1"><strong>Phone:</strong> {item.PhoneNumber}</p>
                                    <p className="text-muted mb-3"><strong>Email:</strong> {item.Email || "N/A"}</p>
                                    <div className="d-flex justify-content-between mt-3">
                                        <div className="d-flex gap-2">
                                            <button
                                                className="btn btn-sm btn-light-warning"
                                                onClick={() => handleEdit(item)}
                                            >
                                                <i className="fa-regular fa-pen-to-square"></i>Edit
                                            </button>
                                            <button
                                                className="btn btn-sm btn-light-danger"
                                                onClick={() => handleDeleteTechnician(item)}
                                            >
                                                <i className="fa-regular fa-trash-can"></i>Delete
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
