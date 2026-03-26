import React, { useEffect, useState } from "react";
import Swal from 'sweetalert2';
import { BASE_API } from "../../Config/Config";
import { Upload, message } from "antd";
import { InboxOutlined } from "@ant-design/icons";
import * as XLSX from "xlsx";
import PropTypes from "prop-types";
import { fetchWithAuth } from "../../../utils/api";

export default function ManageCLAadhar({ conObj }) {

    const [sessionUserData, setsessionUserData] = useState({});
    const [contCls, setContCls] = useState([]);
    const [selectedContId, setSelectedContId] = useState(null);
    const [contClsLoading, setContClsLoading] = useState(false);
    const [contClsAddLoading, setContClsAddLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [showUpload, setShowUpload] = useState(false);
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [excelData, setExcelData] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        if (conObj?.Id) {
            setSelectedContId(conObj?.Id);
        }
    }, [conObj]);

    const handleOpen = () => setShowModal(true);
    const handleClose = () => {
        setLabours([{ Name: "", AadharNo: "", StartDate: "", EndDate: "" }]);
        setShowModal(false);
        setShowUpload(false);
        setFile(null);
        setExcelData([]);
    }

    const handleMngCLsClose = () => {
        setLabours([{ Name: "", AadharNo: "", StartDate: "", EndDate: "" }]);
        // setContCls([]);
        // setSelectedContId(null);
        setShowModal(false);
    }

    const [labours, setLabours] = useState([
        { Name: "", AadharNo: "", StartDate: "", EndDate: "" }
    ]);

    useEffect(() => {
        const userDataString = sessionStorage.getItem("userData");
        if (userDataString) {
            const userData = JSON.parse(userDataString);
            setsessionUserData(userData);
        }
    }, []);

    // Add row
    const handleAddRow = () => {
        setLabours([...labours, { Name: "", AadharNo: "", StartDate: "", EndDate: "" }]);
    };

    // Delete row
    const handleDeleteRow = (index) => {
        setLabours(labours.filter((_, i) => i !== index));
    };

    // Handle input change
    const handleInputChange = (index, field, value) => {
        const updated = [...labours];
        updated[index][field] = value;
        setLabours(updated);
    };

    // #region Add CL AAdhar
    const handleSave = async () => {
        setContClsAddLoading(true);
        const hasInvalidLabour = labours.some(
            (l) =>
                l.Name.trim() === "" ||
                l.AadharNo.trim() === "" ||
                l.StartDate.trim() === "" ||
                l.EndDate.trim() === ""
        );

        if (hasInvalidLabour) {
            Swal.fire({
                icon: "warning",
                title: "Missing Data",
                text: "Please fill all fields (Name, Aadhar, Start Date, End Date) before saving.",
                confirmButtonText: "OK",
            });
            setContClsAddLoading(false);
            return;
        }

        const payload = {
            OrgId: sessionUserData.OrgId,
            CreatedBy: sessionUserData.Id,
            ContractorId: selectedContId,
            CasualLabours: labours,
        };

        try {
            const res = await fetchWithAuth(`contractor/AddCasualLabours`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) throw new Error("Failed to save");
            const data = await res.json();
            setContClsAddLoading(false);
            if (data.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'Success',
                    text: data.data.result[0].Message || 'Data saved successfully!',
                    confirmButtonText: 'OK',
                }).then(() => {
                    setShowModal(false);
                    fetchContractorCLs();
                    setLabours([{ Name: "", AadharNo: "", StartDate: "", EndDate: "" }]);
                });
                setContClsAddLoading(false);
            }
        } catch (error) {
            setContClsAddLoading(false);
            console.error(error);
            alert("Error saving data");
        }
    };

    // inside your component
    const handleToggleActive = async (index) => {
        try {
            const cl = contCls[index];
            const newStatus = cl.IsActive ? 0 : 1; // if active, deactivate (0), else activate (1)

            // Call API
            const response = await fetchWithAuth(`contractor/InactiveCLS`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    UpdatedBy: 1,       // You can make this dynamic if needed
                    Id: cl.Id,          // Contractor Labour Id
                    isactive: newStatus,
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to update status");
            }

            fetchContractorCLs();

        } catch (error) {
            console.error("Error updating active status:", error);
            alert("Something went wrong while updating status.");
        }
    };

    // const fetchContractors = async () => {
    //     try {
    //         const response = await fetchWithAuth(`contractor/getContractors?OrgId=${sessionUserData.OrgId}&ShiftTypeId=0`, {
    //             method: "GET",
    //             headers: { "Content-Type": "application/json" },
    //         });
    //         if (response.ok) {
    //             const data = await response.json();
    //             setContactorsData(data.ResultData);
    //         } else {
    //             console.error('Failed to fetch attendance data:', response.statusText);
    //         }
    //     } catch (error) {
    //         console.error('Error fetching attendance data:', error.message);
    //     }
    // };

    // useEffect(() => {
    //     if (sessionUserData.OrgId) {
    //         fetchContractors();
    //     }
    // }, [sessionUserData]);

    const fetchContractorCLs = async () => {
        setContClsLoading(true);
        if (sessionUserData.OrgId) {
            try {
                const response = await fetchWithAuth(`contractor/getCLS?OrgId=${sessionUserData?.OrgId}&ContractorId=${selectedContId}`, {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                });
                if (response.ok) {
                    const data = await response.json();
                    setContCls(data.ResultData || []);
                    setContClsLoading(false);
                } else {
                    setContClsLoading(false);
                    console.error('Failed to fetch attendance data:', response.statusText);
                }
            } catch (error) {
                setContClsLoading(false);
                setContCls([]);
                console.error('Error fetching attendance data:', error.message);
            } finally {
                setContClsLoading(false);
            }
        }
    };

    useEffect(() => {
        if (sessionUserData.OrgId && selectedContId) {
            fetchContractorCLs();
        }
    }, [sessionUserData, selectedContId]);

    const formatName = (value) => {
        if (!value) return "";

        // 1. Remove spaces at start & end
        let formatted = value.trimStart(); // only trim left side so you can still type spaces later

        // 2. Remove special characters only at the very start
        formatted = formatted.replace(/^[^a-zA-Z0-9]+/, "");

        // 3. Allow spaces & dots in between (don't strip them!)
        // Convert everything to lowercase first
        formatted = formatted.toLowerCase();

        // 4. Capitalize first letter, and letters after space or dot
        formatted = formatted.replace(/(^\w|[ .]\w)/g, (match) => match.toUpperCase());

        return formatted;
    };

    const formatAadharUI = (num = "") => {
        return num.replace(/\D/g, "")        // keep only digits
            .replace(/(.{4})/g, "$1 ") // group 4 digits
            .trim();
    };

    const stripAadhar = (num = "") => num.replace(/\s/g, "");

    const filteredContCls = contCls.filter((item) => {
        const nameMatch = item.Name?.toLowerCase().includes(searchTerm.toLowerCase());
        const aadharMatch = item.AadharNo?.includes(stripAadhar(searchTerm));
        return nameMatch || aadharMatch;
    });

    const handleSaveRow = async (row) => {
        if (!row.Name?.trim()) {
            Swal.fire("Validation Error", "Name is required", "warning");
            return;
        }

        if (!row.AadharNo || !/^\d{12}$/.test(row.AadharNo)) {
            Swal.fire("Validation Error", "Aadhar number must be exactly 12 digits", "warning");
            return;
        }

        if (!row.StartDate) {
            Swal.fire("Validation Error", "Start Date is required", "warning");
            return;
        }

        if (!row.EndDate) {
            Swal.fire("Validation Error", "End Date is required", "warning");
            return;
        }
        const payload = {
            OrgId: sessionUserData.OrgId,
            Id: row.Id,
            Name: row.Name,
            AadharNo: Number(row.AadharNo),
            StartDate: row.StartDate ? row.StartDate.split("T")[0] : "",
            EndDate: row.EndDate ? row.EndDate.split("T")[0] : "",
            IsActive: row.IsActive ? 1 : 0,
            ContractorId: selectedContId,
            UpdatedBy: sessionUserData.Id,
        };

        try {
            const res = await fetchWithAuth(`contractor/EditCasualLabours`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) throw new Error("Failed to update");

            const data = await res.json();

            if (data.ResultData[0].Success === 1) {
                Swal.fire({
                    icon: "success",
                    title: "Updated!",
                    text: data.ResultData[0].Message || "Record updated successfully",
                });
                fetchContractorCLs();
                setEditingRowIndex(null);
            } else {
                Swal.fire({ icon: "error", title: "Error", text: "Update failed" });
            }
        } catch (err) {
            console.error(err);
            Swal.fire({ icon: "error", title: "Error", text: err.message });
        }
    };

    const [editingRowIndex, setEditingRowIndex] = useState(null);
    const [originalRow, setOriginalRow] = useState(null); // to restore on cancel

    // when user starts editing
    const handleStartEditing = (index) => {
        setEditingRowIndex(index);
        setOriginalRow({ ...contCls[index] }); // keep backup
    };

    // when input changes
    const handleCLEditInputChange = (index, field, value) => {
        if (editingRowIndex !== index) return; // allow only editing row
        const updated = [...contCls];
        updated[index][field] = value;
        setContCls(updated);
    };

    // cancel editing
    const handleCancelEdit = (index) => {
        const updated = [...contCls];
        updated[index] = originalRow; // restore old data
        setContCls(updated);
        setEditingRowIndex(null);
    };

    const uploadProps = {
        beforeUpload: (file) => {
            setFile(file);
            return false; // prevent auto upload
        },
        onRemove: () => {
            setFile(null);
        },
        fileList: file ? [file] : [],
    };

    const handleExcelUpload = (info) => {
        const file = info.file.originFileObj || info.file;
        setFile(file);
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: "array" });

            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];

            // Use first row as headers
            let jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            const headers = jsonData[0];       // First row -> column names
            const rows = jsonData.slice(1);    // Remove example row

            // Convert array rows into objects with keys = headers
            const formattedData = rows.map((row) =>
                headers.reduce((acc, key, i) => {
                    acc[key] = row[i] || "";
                    return acc;
                }, {})
            );

            setExcelData(formattedData);
        };
        reader.readAsArrayBuffer(file);
    };

    const handleSubmitExcel = async () => {
        if (!file) {
            message.error("Please select a file before submitting!");
            return;
        }

        const formData = new FormData();
        formData.append("file", file);
        formData.append("OrgId", sessionUserData?.OrgId);
        formData.append("ContractorId", selectedContId);
        formData.append("CreatedBy", sessionUserData?.Id);

        try {
            setLoading(true);
            const response = await fetchWithAuth(
                `contractor/upload-casual-labours-excel`,
                {
                    method: "POST",
                    body: formData,
                }
            );

            if (!response.ok) throw new Error("Upload failed");

            const data = await response.json();
            if (data?.success) {
                setLoading(false);
                Swal.fire({
                    title: "Success",
                    text: data?.data?.result[0].Message || "Labour added successfully!",
                    icon: "success"
                }).then(() => {
                    setShowModal(false);
                    fetchContractorCLs();
                    setLabours([{ Name: "", AadharNo: "", StartDate: "", EndDate: "" }]);
                    setFile(null);
                    setExcelData([]);
                });
            } else {
                setLoading(false);
                Swal.fire("Error", data?.data?.result[0].Message || "Failed to add labour!", "error");
            }
        } catch (err) {
            setLoading(false);
            console.error("Upload error:", err);
            Swal.fire("Error", "Something went wrong!", "error");
        } finally {
            setLoading(false);
            setFile(null);
        }
    };

    const formatExcelDate = (value) => {
        if (typeof value === "number") {
            const date = XLSX.SSF.parse_date_code(value);
            if (date) {
                const day = String(date.d).padStart(2, "0");
                const month = String(date.m).padStart(2, "0");
                const year = date.y;
                return `${day}-${month}-${year}`;
            }
        }
        return value; // return as-is if not a number
    };

    const handleDownload = async () => {
        try {
            const token = sessionStorage.getItem("accessToken"); // or localStorage
            const response = await fetch(
                `${BASE_API}contractor/AddCL_download-excel?contractor=${conObj?.ContractorName}`,
                {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${token}`, // send JWT here
                    },
                }
            );

            if (!response.ok) throw new Error("Failed to download file");

            // Get the file blob
            const blob = await response.blob();

            // Create download link
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `Contractor_${conObj?.ContractorName}.xlsx`; // give a name
            document.body.appendChild(a);
            a.click();

            // Clean up
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Download error:", error);
        }
    };


    return (
        <div
            className="offcanvas offcanvas-end"
            tabIndex="-1"
            id="offcanvasRightManageCLS"
            aria-labelledby="offcanvasRightLabel"
            style={{ width: "90%" }}
        >
            <style>
                {`
                    @media (min-width: 768px) { /* Medium devices and up (md) */
                        #offcanvasRightManageCLS {
                            width: 60% !important;
                        }

                    }

                    .custom-tabs .nav-link {
                        color: #6c757d; /* Muted color for inactive */
                        background: #f8f9fa;
                        border: 1px solid #dee2e6;
                        margin-right: 5px;
                        transition: all 0.3s ease;
                    }

                    .custom-tabs .nav-link.active {
                        color: #fff !important;
                        background-color: #0d6efd !important; /* Primary Blue */
                        border-color: #0d6efd !important;
                        box-shadow: 0 4px 10px rgba(13, 110, 253, 0.2); /* Soft shadow */
                    }

                    /* Hover effect for inactive tabs */
                    .custom-tabs .nav-link:hover:not(.active) {
                        background-color: #e9ecef;
                    }
                `}
            </style>
            <form autoComplete="off">
                <div className="offcanvas-header d-flex justify-content-between align-items-center mb-3">
                    <h5 id="offcanvasRightLabel" className="mb-0">Manage CL's</h5>
                    <div className="d-flex align-items-center">
                        <button
                            className="btn btn-light-primary border border-primary btn-sm"
                            type="button"
                            onClick={handleOpen}
                            style={{ whiteSpace: "nowrap" }}
                            disabled={!selectedContId}
                        >
                            <i className="bi bi-person-add fs-4 mb-1"></i>Add CL
                        </button>
                        <button
                            type="button"
                            className="btn-close"
                            data-bs-dismiss="offcanvas"
                            aria-label="Close"
                            onClick={() => {
                                handleClose();
                                handleMngCLsClose();
                            }}
                        ></button>
                    </div>
                </div>
                <div className="offcanvas-body"
                    style={{
                        marginTop: "-2rem",
                        maxHeight: "calc(100vh - 4rem)",
                        overflowY: "auto"
                    }}
                >
                    <div className="row align-items-center sticky-top bg-white pt-3" style={{ top: 0, zIndex: 10 }}>
                        <div className="col mb-2">
                            <span className="badge badge-light-primary mb-0 fs-3">{conObj?.ContractorName || '...'}</span>
                        </div>

                        <div className="col-auto mb-2">
                            <div className="input-group input-group-sm">
                                <span className="input-group-text bg-white border-end-0">
                                    <i className="fa-solid fa-magnifying-glass text-muted"></i>
                                </span>
                                <input
                                    type="text"
                                    className="form-control border-start-0"
                                    placeholder="Search Name or Aadhar..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    style={{ outline: 'none', boxShadow: 'none' }}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="row">
                        <div className="table-responsive">
                            <table className="table table-bordered table-striped table-hover">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>CL Name</th>
                                        <th>Aadhar</th>
                                        <th>Start Date</th>
                                        <th>End Date</th>
                                        <th>Status</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {contClsLoading ? (
                                        <tr>
                                            <td colSpan="7" className="text-center py-3">
                                                <div className="spinner-border text-primary" role="status">
                                                    <span className="visually-hidden">Loading...</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : !selectedContId ? (
                                        <tr>
                                            <td colSpan="7" className="text-center py-3 text-muted">Choose contractor for data</td>
                                        </tr>
                                    ) : filteredContCls.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" className="text-center py-3 text-danger">
                                                {searchTerm ? "No matching records found" : "No Data Available"}
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredContCls.map((item, displayIndex) => {
                                            const originalIndex = contCls.findIndex(origItem => origItem === item);
                                            const isEditing = editingRowIndex === originalIndex;

                                            return (
                                                <tr key={item.Id || originalIndex}>
                                                    <td>{displayIndex + 1}</td>

                                                    {/* Name Field */}
                                                    <td>
                                                        <input
                                                            type="text"
                                                            className="form-control"
                                                            value={item.Name || ""}
                                                            disabled={!isEditing}
                                                            onChange={(e) => {
                                                                const formattedValue = formatName(e.target.value);
                                                                handleCLEditInputChange(originalIndex, "Name", formattedValue);
                                                            }}
                                                            style={{ width: "100%", height: "2rem", fontSize: "0.9rem" }}
                                                            placeholder="Enter Name"
                                                            required
                                                        />
                                                    </td>

                                                    {/* Aadhar Field */}
                                                    <td>
                                                        <input
                                                            type="text"
                                                            className="form-control"
                                                            value={formatAadharUI(item.AadharNo)}
                                                            disabled={!isEditing}
                                                            maxLength={14}
                                                            placeholder="XXXX XXXX XXXX"
                                                            onChange={(e) => {
                                                                const rawValue = stripAadhar(e.target.value);
                                                                handleCLEditInputChange(originalIndex, "AadharNo", rawValue);
                                                            }}
                                                            style={{ width: "135px", height: "2rem", fontSize: "0.9rem" }}
                                                            required
                                                        />
                                                    </td>

                                                    {/* Start Date */}
                                                    <td>
                                                        <input
                                                            type="date"
                                                            className="form-control"
                                                            value={item.StartDate ? item.StartDate.split("T")[0] : ""}
                                                            disabled={!isEditing}
                                                            onChange={(e) => handleCLEditInputChange(originalIndex, "StartDate", e.target.value)}
                                                            style={{ width: "115px", height: "2rem", fontSize: "0.9rem" }}
                                                            required
                                                        />
                                                    </td>

                                                    {/* End Date */}
                                                    <td>
                                                        <input
                                                            type="date"
                                                            className="form-control"
                                                            value={item.EndDate ? item.EndDate.split("T")[0] : ""}
                                                            disabled={!isEditing}
                                                            onChange={(e) => handleCLEditInputChange(originalIndex, "EndDate", e.target.value)}
                                                            style={{ width: "115px", height: "2rem", fontSize: "0.9rem" }}
                                                            required
                                                        />
                                                    </td>

                                                    {/* Status Switch */}
                                                    <td className="text-center">
                                                        <div className="form-check form-switch d-flex justify-content-center">
                                                            <input
                                                                className="form-check-input cursor-pointer"
                                                                type="checkbox"
                                                                checked={item.IsActive}
                                                                disabled={isEditing}
                                                                onChange={() => handleToggleActive(originalIndex)}
                                                                style={{ width: "2.4rem", height: "1.2rem" }}
                                                            />
                                                        </div>
                                                    </td>

                                                    {/* Actions */}
                                                    <td className="text-center">
                                                        {isEditing ? (
                                                            <div className="d-flex justify-content-center align-items-center">
                                                                <i className="fa-solid fa-check text-success me-3 cursor-pointer"
                                                                    onClick={() => handleSaveRow(item, originalIndex)}></i>
                                                                <i className="fa-solid fa-xmark text-danger cursor-pointer"
                                                                    onClick={() => handleCancelEdit(originalIndex)}></i>
                                                            </div>
                                                        ) : (
                                                            <i className={`fa-solid fa-pen ${!item.IsActive ? "text-muted" : "text-primary"}`}
                                                                onClick={() => item.IsActive && handleStartEditing(originalIndex)}
                                                                style={{ cursor: item.IsActive ? "pointer" : "not-allowed" }}
                                                                title={item.IsActive ? "Edit" : "Activate to Edit"}></i>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </form>

            {showModal && (
                <div className="modal fade show d-block" tabIndex="-1" role="dialog">
                    <div className="modal-dialog modal-lg" role="document">
                        <div className="modal-content">
                            <div className="modal-header d-flex justify-content-between align-items-center">
                                <h5 className="modal-title">Register CL's</h5>

                                <div className="d-flex gap-2">
                                    <ul className="nav nav-pills custom-tabs mb-3" id="labourTabs" role="tablist">
                                        <li className="nav-item" role="presentation">
                                            <button
                                                className="nav-link active px-4 py-2" // Added padding for better click area
                                                id="manual-tab"
                                                data-bs-toggle="tab"
                                                data-bs-target="#manual"
                                                type="button"
                                                role="tab"
                                            >
                                                <i className="fa-solid fa-keyboard"></i> Manual Entry
                                            </button>
                                        </li>
                                        <li className="nav-item" role="presentation">
                                            <button
                                                className="nav-link px-4 py-2"
                                                id="upload-tab"
                                                data-bs-toggle="tab"
                                                data-bs-target="#upload"
                                                type="button"
                                                role="tab"
                                            >
                                                <i class="bi bi-file-earmark-spreadsheet text-success"></i> Bulk Upload
                                            </button>
                                        </li>
                                    </ul>

                                    <button
                                        type="button"
                                        className="btn-close"
                                        onClick={handleClose}
                                    ></button>
                                </div>
                            </div>

                            <div className="modal-body">
                                <div className="tab-content mt-3" id="labourTabsContent">
                                    <span className="badge badge-light-primary fs-4"><i className="bi bi-person-badge text-primary me-1 fs-4"></i> {conObj?.ContractorName}</span>
                                    <div
                                        className="tab-pane fade show active"
                                        id="manual"
                                        role="tabpanel"
                                        aria-labelledby="manual-tab"
                                    >
                                        <button
                                            type="button"
                                            className={`btn btn-sm btn-light-info border border-info d-flex ms-auto mb-2`}
                                            onClick={handleAddRow}
                                        >
                                            <i className="fa-solid fa-plus mt-1"></i>  Add CL
                                        </button>
                                        <div className="table-responsive">
                                            <table className="table table-bordered table-sm">
                                                <thead>
                                                    <tr>
                                                        <th>#</th>
                                                        <th>Name</th>
                                                        <th>Aadhar</th>
                                                        <th>Start Date</th>
                                                        <th>End Date</th>
                                                        <th className="text-center">Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {labours.map((labour, index) => (
                                                        <tr key={index}>
                                                            <td>{index + 1}</td>
                                                            <td>
                                                                <input
                                                                    type="text"
                                                                    className="form-control"
                                                                    value={labour.Name}
                                                                    // onChange={(e) => handleInputChange(index, "Name", e.target.value)}
                                                                    onChange={(e) => {
                                                                        const formattedValue = formatName(e.target.value);
                                                                        handleInputChange(index, "Name", formattedValue);
                                                                    }}
                                                                    placeholder="Enter Name"
                                                                    style={{ width: "130px", height: "2rem", fontSize: "0.9rem" }}
                                                                    required
                                                                />
                                                            </td>
                                                            <td>
                                                                <input
                                                                    type="text"
                                                                    className="form-control"
                                                                    value={formatAadharUI(labour.AadharNo)}
                                                                    maxLength={14} // 12 digits + 2 spaces
                                                                    minLength={14} // 12 digits + 2 spaces
                                                                    placeholder="XXXX XXXX XXXX"
                                                                    // onChange={(e) => handleInputChange(index, "AadharNo", e.target.value)}
                                                                    onChange={(e) => {
                                                                        const rawValue = stripAadhar(e.target.value); // store clean number
                                                                        handleInputChange(index, "AadharNo", rawValue);
                                                                    }}
                                                                    style={{ width: "130px", height: "2rem", fontSize: "0.9rem" }}
                                                                    required
                                                                />
                                                            </td>
                                                            <td>
                                                                <input
                                                                    type="date"
                                                                    className="form-control"
                                                                    value={labour.StartDate}
                                                                    onChange={(e) => handleInputChange(index, "StartDate", e.target.value)}
                                                                    style={{ width: "130px", height: "2rem", fontSize: "0.9rem" }}
                                                                    required
                                                                />
                                                            </td>
                                                            <td>
                                                                <input
                                                                    type="date"
                                                                    className="form-control"
                                                                    value={labour.EndDate}
                                                                    onChange={(e) => handleInputChange(index, "EndDate", e.target.value)}
                                                                    style={{ width: "130px", height: "2rem", fontSize: "0.9rem" }}
                                                                    required
                                                                />
                                                            </td>
                                                            <td className="text-center">
                                                                <i
                                                                    className="fa-regular fa-trash-can text-danger fa-md"
                                                                    role="button"
                                                                    onClick={() => handleDeleteRow(index)}
                                                                ></i>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                        <div className="modal-footer">
                                            <button
                                                type="button"
                                                className="btn btn-secondary btn-sm"
                                                onClick={handleClose}
                                                disabled={contClsAddLoading}
                                            >
                                                <i className="bi bi-x-lg"></i>Close
                                            </button>
                                            <button
                                                type="button"
                                                className={`btn btn-success btn-sm`}
                                                onClick={handleSave}
                                                disabled={contClsAddLoading}
                                            >
                                                <i className="bi bi-bookmark-check"></i>{contClsAddLoading ? 'Submitting...' : 'Submit'}
                                            </button>
                                        </div>
                                    </div>

                                    <div
                                        className="tab-pane fade"
                                        id="upload"
                                        role="tabpanel"
                                        aria-labelledby="upload-tab"
                                    >
                                        <div className="alert alert-warning mt-3 py-2 px-3 mb-2 d-flex align-items-center" style={{ minHeight: 'auto' }}>
                                            <small>
                                                ⚠️ First, download the Excel template, fill in the required details, and then upload the completed file below.
                                            </small>
                                        </div>
                                        <div className="d-flex justify-content-end mb-3">
                                            <button
                                                type="button"
                                                className="btn btn-sm btn-light-info border border-info"
                                                onClick={handleDownload}
                                            >
                                                <i className="fa-solid fa-cloud-arrow-down"></i> Download Excel
                                            </button>
                                        </div>
                                        <div className="row">
                                            <div className="col-12 mb-3">
                                                <Upload.Dragger
                                                    {...uploadProps}
                                                    accept=".xlsx,.xls"
                                                    beforeUpload={() => false}  // stop auto upload
                                                    // showUploadList={false}      // optional: hide uploaded file list
                                                    onChange={handleExcelUpload}
                                                >
                                                    <p className="ant-upload-drag-icon">
                                                        <InboxOutlined />
                                                    </p>
                                                    <p className="ant-upload-text">Click or drag Excel file to upload</p>
                                                    <p className="ant-upload-hint">Supports only .xlsx or .xls</p>
                                                </Upload.Dragger>
                                            </div>
                                        </div>
                                        {excelData.length > 0 && (
                                            <div className="table-responsive mt-3" style={{ maxHeight: "260px", overflowY: "auto" }}>
                                                <table className="table table-bordered table-sm">
                                                    <thead>
                                                        <tr>
                                                            {Object.keys(excelData[0]).map((col, index) => (
                                                                <th key={index}>{col}</th>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {excelData.map((row, i) => (
                                                            <tr key={i}>
                                                                {Object.values(row).map((cell, j) => (
                                                                    <td key={j}>{formatExcelDate(cell)}</td>
                                                                ))}
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}

                                        <div className="modal-footer">
                                            <button
                                                type="button"
                                                className="btn btn-secondary btn-sm"
                                                onClick={handleClose}
                                                disabled={loading}
                                            >
                                                <i className="bi bi-x-lg"></i>Close
                                            </button>
                                            <button
                                                type="button"
                                                className={`btn btn-success btn-sm`}
                                                onClick={handleSubmitExcel}
                                                disabled={loading}
                                            >
                                                <i className="bi bi-bookmark-check"></i>{loading ? 'Submitting...' : 'Upload'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Backdrop */}
            {showModal && <div className="modal-backdrop fade show"></div>}
        </div>
    );
}
ManageCLAadhar.propTypes = {
    conObj: PropTypes.object.isRequired
};