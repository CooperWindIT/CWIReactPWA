import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { BASE_IMAGE_API_GET, BASE_IMAGE_UPLOAD_API } from "../../Config/Config";
import Swal from "sweetalert2";
import { fetchWithAuth } from "../../../utils/api";
import { Upload, Button } from "antd";
import { EyeOutlined, UploadOutlined, PlusOutlined } from "@ant-design/icons";

export default function AssetParts({ partsObj }) {

    const [sessionUserData, setSessionUserData] = useState({});
    const [machinePartsData, setMachinePartsData] = useState([]);
    const [dataLoading, setDataLoading] = useState(false);
    const [partAddLoading, setPartAddLoading] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [updateLoading, setUpdateLoading] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [previewImage, setPreviewImage] = useState(null);
    const [editedParts, setEditedParts] = useState({});

    const [newPartData, setNewPartData] = useState({
        PartName: "",
        PartCode: "",
        PartModel: "",
        SerialNumber: "",
        InstallationDate: "",
        Status: "Active",
        Remarks: "",
        ImageUrl: null,
    });

    useEffect(() => {
        const userDataString = sessionStorage.getItem("userData");
        if (userDataString) {
            const userData = JSON.parse(userDataString);
            setSessionUserData(userData);
        } else {
            console.log('No session');
        }
    }, []);

    const fetchData = async () => {
        setDataLoading(true);
        try {
            const response = await fetchWithAuth(`PMMS/GetPartsByMachineId?MachineId=${partsObj?.MachineId}`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });
            if (response.ok) {
                const data = await response.json();
                setMachinePartsData(data.ResultData);
            } else {
                console.error('Failed to fetch attendance data:', response.statusText);
            }
        } catch (error) {
            console.error('Error fetching attendance data:', error.message);
        } finally {
            setDataLoading(false);
        }
    };

    useEffect(() => {
        if (sessionUserData.OrgId && partsObj?.MachineId) {
            fetchData();
        }
    }, [sessionUserData, partsObj]);

    const handlePreviewImage = (image) => {
        if (image instanceof File) {
            const fileURL = URL.createObjectURL(image);
            setPreviewImage(fileURL);
        } else {
            setPreviewImage(`${BASE_IMAGE_API_GET}${image}`);
        }
    };

    const updateEditedPart = (partId, field, value) => {
        setEditedParts((prev) => ({
            ...prev,
            [partId]: {
                ...machinePartsData.find(p => p.PartId === partId),
                ...prev[partId],
                [field]: value,
            }
        }));
    };

    const handleAddPart = async () => {
        if (!partsObj?.MachineId || !sessionUserData?.Id) {
            Swal.fire({
                title: "Error",
                text: "Missing required machine or user information.",
                icon: "error",
            });
            return;
        }

        // 2️⃣ Limit check
        if (machinePartsData?.length > 11) {
            Swal.fire({
                title: "Limit Reached",
                text: "You cannot add more than 5 parts. Please contact the admin.",
                icon: "warning",
            });
            return;
        }
        setPartAddLoading(true);
        const requiredFields = ["PartName", "PartCode", "PartModel", "InstallationDate", "Status", "ImageUrl"];

        const isValid = requiredFields.every((field) => newPartData[field]);

        if (!isValid) {
            Swal.fire({
                title: "Warning",
                text: "All fields are mandatory.",
                icon: "warning",
            });
            setPartAddLoading(false);
            return;
        }

        const formData = new FormData();
        formData.append("MachineId", partsObj.MachineId);
        formData.append("PartName", newPartData.PartName);
        formData.append("PartCode", newPartData.PartCode);
        formData.append("PartModel", newPartData.PartModel);
        formData.append("SerialNumber", newPartData.SerialNumber);
        formData.append("InstallationDate", newPartData.InstallationDate);
        formData.append("Status", newPartData.Status);
        formData.append("Remarks", newPartData.Remarks);
        formData.append("CreatedBy", sessionUserData.Id);

        if (newPartData.ImageUrl) {
            formData.append("ImageUrl", newPartData.ImageUrl);
        }

        try {
            const res = await fetchWithAuth(`file_upload/AddMachineParts`, {
                method: "POST",
                body: formData,
            });

            const result = await res.json();

            if (res.ok && result?.ResultData?.Status === 'Success') {
                setPartAddLoading(false);
                Swal.fire("Success", "Machine part added successfully!", "success");
                setShowAddModal(false);
                setNewPartData({
                    PartName: "",
                    PartCode: "",
                    PartModel: "",
                    SerialNumber: "",
                    InstallationDate: "",
                    Status: "Active",
                    Remarks: "",
                    ImageUrl: null,
                });
                fetchData();
            } else {
                setPartAddLoading(false);
                Swal.fire("Error", result?.ResultData[0]?.Message || "Failed to add part", "error");
            }
        } catch (error) {
            setPartAddLoading(false);
            console.error("Add part error:", error);
            Swal.fire("Error", "Something went wrong", "error");
        }
    };

    const handleDeletePart = async (item) => {
        Swal.fire({
            title: "Are you sure?",
            text: "Do you want to delete part?",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#3085d6",
            cancelButtonColor: "#d33",
            confirmButtonText: "Yes, delete it!"
        }).then(async (result) => {
            if (result.isConfirmed) {
                setDeleteLoading(true);
                try {
                    const payload = {
                        FilePath: item.ImageUrl,
                        CreatedBy: sessionUserData.Id,
                        PartId: item.PartId
                    };

                    const response = await fetchWithAuth(`PMMS/InactiveParts`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify(payload),
                    });
                    const result = await response.json();

                    setDeleteLoading(false);
                    if (result.ResultData?.Status === 'Success') {
                        fetchData();
                        Swal.fire("Success!", "Part has been deleted.", "success");
                        setDeleteLoading(false);
                    } else {
                        const errorData = await response.json();
                        Swal.fire("Error!", errorData.ResultData?.ResultMessage || "Failed to delete part.", "error");
                        setDeleteLoading(false);
                    }
                } catch (error) {
                    console.error("Error during part delete:", error.message);
                    Swal.fire("Error!", "An unexpected error occurred.", "error");
                    setDeleteLoading(false);
                }
            }
        });
    };

    // const handleSavePart = async (item) => {
    //     const part = editedParts[item.PartId];
    //     if (!part) return;

    //     const payload = {
    //         PartId: item.PartId,
    //         MachineId: part.MachineId,
    //         PartName: part.PartName,
    //         PartCode: part.PartCode,
    //         PartModel: part.PartModel,
    //         SerialNumber: part.SerialNumber,
    //         InstallationDate: part.InstallationDate,
    //         Status: "Active",
    //         Remarks: part.Remarks,
    //         UpdatedBy: sessionUserData.Id,
    //         ImageUrl: part.ImageUrl instanceof File ? null : part.ImageUrl || "",
    //         FilePath: part.ImageUrl instanceof File ? item.ImageUrl : "0"
    //     };

    //     try {
    //         const res = await fetch(`${BASE_API}PMMS/EditParts`, {
    //             method: "POST",
    //             headers: {
    //                 "Content-Type": "application/json",
    //             },
    //             body: JSON.stringify(payload),
    //         });

    //         const result = await res.json();

    //         if (result.ResultData?.Status === 'Success') {
    //             Swal.fire("Success", "Part updated successfully", "success");
    //             setEditedParts((prev) => {
    //                 const updated = { ...prev };
    //                 delete updated[item.PartId];
    //                 return updated;
    //             });
    //         } else {
    //             Swal.fire("Error", result?.error || "Update failed", "error");
    //         }
    //     } catch (err) {
    //         console.error(err);
    //         Swal.fire("Error", "Something went wrong", "error");
    //     }
    // };    


    const handleSavePart = async (item) => {
        setUpdateLoading(true);
        const part = editedParts[item.PartId];
        if (!part) return;

        let finalImageUrl = part.ImageUrl;
        let filePathToDelete = "0";

        // Check if image was updated
        const isImageUpdated = part.ImageUrl instanceof File;

        if (isImageUpdated) {
            const file = part.ImageUrl;

            // ✅ Check if file size < 2MB
            const MAX_SIZE_MB = 2;
            if (file.size > MAX_SIZE_MB * 1024 * 1024) {
                Swal.fire("Warning", "Image size must be less than 2MB", "warning");
                return;
            }

            try {
                // ✅ Delete old image
                await fetch(`${BASE_IMAGE_UPLOAD_API}Fileupload/delete`, {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ type: "image", filename: item.ImageUrl }),
                });

                // ✅ Upload new image
                const imageForm = new FormData();
                imageForm.append("ImageUrl", file);

                const uploadRes = await fetch(`${BASE_IMAGE_UPLOAD_API}Fileupload/image`, {
                    method: "POST",
                    body: imageForm,
                });

                const uploadData = await uploadRes.json();

                if (uploadRes.ok && uploadData?.data?.filename) {
                    finalImageUrl = uploadData.data.filename;
                    filePathToDelete = item.ImageUrl;
                } else {
                    Swal.fire("Error", "Image upload failed", "error");
                    return;
                }
            } catch (error) {
                console.error("Image handling error:", error);
                Swal.fire("Error", "Image upload/delete failed", "error");
                return;
            }
        }

        // ✅ Final payload
        const payload = {
            PartId: item.PartId,
            MachineId: part.MachineId,
            PartName: part.PartName,
            PartCode: part.PartCode,
            PartModel: part.PartModel,
            SerialNumber: part.SerialNumber,
            InstallationDate: part.InstallationDate,
            Status: "Active",
            Remarks: part.Remarks,
            UpdatedBy: sessionUserData.Id,
            ImageUrl: finalImageUrl instanceof File ? "" : finalImageUrl || "",
            FilePath: filePathToDelete,
        };

        try {
            const res = await fetchWithAuth(`PMMS/EditParts`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const result = await res.json();
            setUpdateLoading(false);

            if (result.ResultData?.Status === "Success") {
                Swal.fire("Success", "Part updated successfully", "success");

                setUpdateLoading(false);
                fetchData();
                setEditedParts((prev) => {
                    const updated = { ...prev };
                    delete updated[item.PartId];
                    return updated;
                });
            } else {
                Swal.fire("Error", result?.error || "Update failed", "error");
                setUpdateLoading(false);
            }
        } catch (err) {
            console.error(err);
            Swal.fire("Error", "Something went wrong", "error");
            setUpdateLoading(false);
        }
    };

    const formatPartInput = (value) => {
        // Disallow starting with space or dot
        if (/^[ .]/.test(value)) return "";

        // Capitalize first letter and letters after space or dot
        return value.replace(/\b\w/g, (char, index, str) => {
            if (index === 0 || str[index - 1] === ' ' || str[index - 1] === '.') {
                return char.toUpperCase();
            }
            return char;
        });
    };
    
const maxSizeMB = 2;
const maxSizeBytes = maxSizeMB * 1024 * 1024;

    return (
        <div
            className="offcanvas offcanvas-end"
            tabIndex="-1"
            id="offcanvasRightParts"
            aria-labelledby="offcanvasRightLabel"
            style={{ width: "90%" }}
        >
            <style>
                {`
                    @media (min-width: 768px) { /* Medium devices and up (md) */
                        #offcanvasRightParts {
                            width: 50% !important;
                        }
                    }
                `}
            </style>
            <form autoComplete="off">
                <div className="offcanvas-header d-flex justify-content-between align-items-center mb-5">
                    <h5 id="offcanvasRightLabel" className="mb-0">Asset Spare Parts</h5>
                    <div className="d-flex align-items-center">
                        <button
                            type="button"
                            className="btn-close"
                            data-bs-dismiss="offcanvas"
                            aria-label="Close"
                        ></button>
                    </div>
                </div>
                <div class="offcanvas-body" style={{ marginTop: "-2.5rem", maxHeight: "calc(100vh - 4rem)", overflowY: "auto" }}>
                <div className="d-flex justify-content-between align-items-center mb-2">
    <h3 className="text-primary mb-0">{partsObj?.MachineName}</h3>

    <button
        className="btn btn-primary btn-sm"
        type="button"
        onClick={() => setShowAddModal(true)}
    >
        Add Part +
    </button>
</div>

                    <div className="alert alert-warning p-2 mb-4 sticky-to">
                        ⚠️ Image must be less than 2MB.
                    </div>
                    {dataLoading ? (
                        <div className="text-center my-3">
                            <div className="spinner-border text-primary" role="status">
                                <span className="visually-hidden">Loading...</span>
                            </div>
                            <div className="mt-2">Loading asset parts...</div>
                        </div>
                    ) :
                        Array.isArray(machinePartsData) && machinePartsData.length > 0 ? (
                            machinePartsData?.map((item, index) => (
                                <>
                                    <div className="row" key={index}>
                                        <div className="col-12 col-md-4">
                                            <label>Part Name</label>
                                            <input
                                                className="form-control mb-2"
                                                type="text"
                                                style={{ height: '2.8rem' }}
                                                value={
                                                    editedParts[item.PartId]?.PartName ?? item.PartName
                                                }
                                                onChange={(e) =>
                                                    updateEditedPart(item.PartId, 'PartName', e.target.value)
                                                }
                                                placeholder="Enter Part Name"
                                            />
                                        </div>
                                        <div className="col-6 col-md-4">
                                            <label>Part Code</label>
                                            <input
                                                className="form-control mb-2"
                                                type="text"
                                                style={{ height: '2.8rem' }}
                                                value={
                                                    editedParts[item.PartId]?.PartCode ?? item.PartCode
                                                }
                                                onChange={(e) =>
                                                    updateEditedPart(item.PartId, 'PartCode', e.target.value)
                                                }
                                            />
                                        </div>
                                        <div className="col-6 col-md-4">
                                            <label>Part Model</label>
                                            <input
                                                className="form-control mb-2"
                                                type="text"
                                                style={{ height: '2.8rem' }}
                                                value={
                                                    editedParts[item.PartId]?.PartModel ?? item.PartModel
                                                }
                                                onChange={(e) =>
                                                    updateEditedPart(item.PartId, 'PartModel', e.target.value)
                                                }
                                            />
                                        </div>
                                        <div className="col-6 col-md-4">
                                            <label>Serial Number</label>
                                            <input
                                                className="form-control mb-2"
                                                type="text"
                                                style={{ height: '2.8rem' }}
                                                value={
                                                    editedParts[item.PartId]?.SerialNumber ?? item.SerialNumber
                                                }
                                                onChange={(e) =>
                                                    updateEditedPart(item.PartId, 'SerialNumber', e.target.value)
                                                }
                                                placeholder="Enter Serial Number"
                                            />
                                        </div>
                                        <div className="col-6 col-md-4">
                                            <label>Installation</label>
                                            <input
                                                className="form-control mb-2"
                                                type="date"
                                                style={{ height: '2.8rem' }}
                                                value={
                                                    editedParts[item.PartId]?.InstallationDate ?? item.InstallationDate?.split("T")[0]
                                                }
                                                onChange={(e) =>
                                                    updateEditedPart(item.PartId, 'InstallationDate', e.target.value)
                                                }
                                                min={partsObj?.InstallationDate?.split('T')[0]}
                                            />
                                        </div>
                                        {/* <div className="col-12 col-md-4">
                                            <label className="form-label">
                                                Image
                                                <i
                                                    className="fa-solid fa-circle-info fa-bounce ms-1 text-info cursor-pointer"
                                                    title="If you want to change the image of this spare part, choose the image and click on save"
                                                ></i>
                                            </label>
                                            <div className="d-flex align-items-center gap-2">
                                                <div
                                                    className="position-relative border rounded shadow-sm"
                                                    style={{ width: "60px", height: "60px", overflow: "hidden", flexShrink: 0 }}
                                                >
                                                    <img
                                                        src={
                                                            editedParts[item.PartId]?.ImageUrl instanceof File
                                                                ? URL.createObjectURL(editedParts[item.PartId].ImageUrl)
                                                                : `${BASE_IMAGE_API_GET}${editedParts[item.PartId]?.ImageUrl || item.ImageUrl}`
                                                        }
                                                        alt="Thumb"
                                                        className="w-100 h-100"
                                                        style={{ objectFit: "cover" }}
                                                    />
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm btn-light position-absolute top-0 end-0 p-1"
                                                        onClick={() => handlePreviewImage(item.ImageUrl)}
                                                        style={{ fontSize: "0.75rem" }}
                                                    >
                                                        <i className="fa fa-eye fa-beat-fade"></i>
                                                    </button>
                                                </div>

                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    className="form-control form-control-sm"
                                                    onChange={(e) => {
                                                        const file = e.target.files[0];
                                                        if (file) {
                                                            const maxSizeMB = 2;
                                                            const maxSizeBytes = maxSizeMB * 1024 * 1024; // 2MB in bytes

                                                            if (file.size > maxSizeBytes) {
                                                                Swal.fire({
                                                                    icon: 'error',
                                                                    title: 'File Too Large',
                                                                    text: `Image must be less than ${maxSizeMB} MB.`,
                                                                });
                                                                e.target.value = ''; // reset the file input
                                                                return;
                                                            }

                                                            updateEditedPart(item.PartId, 'ImageUrl', file);
                                                        }
                                                    }}
                                                    style={{ maxWidth: "200px" }}
                                                />

                                            </div>
                                        </div> */}

                                        
<div className="col-12 col-md-4">
  <label className="form-label">
    Image
    <i
      className="fa-solid fa-circle-info fa-bounce ms-1 text-info cursor-pointer"
      title="If you want to change the image of this spare part, choose the image and click on save"
    ></i>
  </label>

  <div className="d-flex align-items-center gap-2">
    {/* Preview Box */}
    <div
      className="position-relative border rounded shadow-sm"
      style={{ width: 60, height: 60, overflow: "hidden", flexShrink: 0 }}
    >
      <img
        src={
          editedParts[item.PartId]?.ImageUrl instanceof File
            ? URL.createObjectURL(editedParts[item.PartId].ImageUrl)
            : `${BASE_IMAGE_API_GET}${editedParts[item.PartId]?.ImageUrl || item.ImageUrl}`
        }
        alt="Thumb"
        className="w-100 h-100"
        style={{ objectFit: "cover" }}
      />
      <Button
        size="small"
        type="text"
        icon={<EyeOutlined className="text-primary" />}
        onClick={() => handlePreviewImage(item.ImageUrl)}
        className="position-absolute top-0 end-0"
      />
    </div>

    {/* Ant Design Upload */}
    <Upload
      accept="image/*"
      showUploadList={false}
      beforeUpload={(file) => {
        if (file.size > maxSizeBytes) {
          Swal.fire({
            icon: "error",
            title: "File Too Large",
            text: `Image must be less than ${maxSizeMB} MB.`,
          });
          return Upload.LIST_IGNORE; // prevent upload
        }
        updateEditedPart(item.PartId, "ImageUrl", file);
        return false; // prevent automatic upload
      }}
    >
      <Button
        icon={<UploadOutlined />}
        size="small"
        style={{ height: 60, width: 160 }}
      >
        <PlusOutlined />
      </Button>
    </Upload>
  </div>
</div>

                                        <div className="col-12">
                                            <label>Remarks</label>
                                            <textarea
                                                className="form-control mb-2"
                                                value={
                                                    editedParts[item.PartId]?.Remarks ?? item.Remarks
                                                }
                                                onChange={(e) =>
                                                    updateEditedPart(item.PartId, 'Remarks', e.target.value)
                                                }
                                            />
                                        </div>
                                    </div>
                                    <div className="d-flex justify-content-center mb-1">
                                        <button
                                            className="btn btn-light-danger btn-sm"
                                            type="button"
                                            onClick={() => handleDeletePart(item)}
                                            disabled={updateLoading || deleteLoading}
                                        >{deleteLoading ? 'Deleting...' : 'Delete'} <i className="fa-regular fa-trash-can"></i></button>
                                        <button
                                            className="btn btn-light-success btn-sm ms-3"
                                            type="button"
                                            onClick={() => handleSavePart(item)}
                                            disabled={updateLoading || deleteLoading}
                                        >{updateLoading ? 'Saving...' : 'Save'} <i className="fa-solid fa-check"></i></button>
                                    </div>
                                    <hr className="text-primary" />
                                </>
                            ))
                        ) : (
                            <p className="text-muted text-center">No asset parts available.</p>
                        )}
                </div>
            </form>

            {previewImage && (
                <div className="modal fade show d-block" tabIndex="-1" style={{ background: "rgba(0,0,0,0.6)" }}>
                    <div className="modal-dialog modal-lg modal-dialog-centered">
                        <div className="modal-content position-relative">

                            {/* Cross Button */}
                            <button
                                type="button"
                                className="btn-close position-absolute"
                                style={{ top: "10px", right: "10px", zIndex: 10 }}
                                aria-label="Close"
                                onClick={() => setPreviewImage(null)}
                            ></button>

                            <div className="modal-body p-0 d-flex justify-content-center align-items-center">
                                <img
                                    src={previewImage}
                                    className="img-fluid p-2 "
                                    style={{ maxHeight: "90vh", minWidth: "80%", maxWidth: "90%" }}
                                    alt="Preview"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showAddModal && (
                <div className="modal fade show d-block" tabIndex="-1" style={{ background: "rgba(0,0,0,0.5)" }}>
                    <div className="modal-dialog modal-lg">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Add Asset Part</h5>
                                <button type="button" className="btn-close" onClick={() => setShowAddModal(false)}></button>
                            </div>
                            <div className="modal-body">
                                <div className="alert alert-warning p-2 mb-2">
                                    ⚠️ Image must be less than 2MB.
                                </div>
                                <div className="row g-3">
                                    {[
                                        ["PartName", "Part Name"],
                                        ["PartCode", "Part Code"],
                                        ["PartModel", "Part Model"],
                                        ["SerialNumber", "Serial Number"],
                                    ].map(([key, label]) => (
                                        <div className="col-md-6" key={key}>
                                            <label className="form-label">{label}<span className="text-danger">*</span></label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                value={newPartData[key]}
                                                onChange={(e) => {
                                                    const formatted = formatPartInput(e.target.value);
                                                    setNewPartData({ ...newPartData, [key]: formatted });
                                                }}
                                                placeholder={`Enter ${label}`}
                                            />
                                        </div>
                                    ))}
                                    <div className="col-md-6">
                                        <label className="form-label">Installation Date<span className="text-danger">*</span></label>
                                        <input
                                            type="date"
                                            className="form-control"
                                            value={newPartData.InstallationDate}
                                            onChange={(e) => setNewPartData({ ...newPartData, InstallationDate: e.target.value })}
                                            onKeyDown={(e) => {
                                                if (e.key === ' ') {
                                                    e.preventDefault();
                                                }
                                            }}
                                            min={partsObj?.InstallationDate?.split('T')[0]}
                                            // max={new Date().toISOString().split("T")[0]}
                                        />
                                    </div>
                                    <div className="col-12">
                                        <label className="form-label">Remarks</label>
                                        <textarea
                                            className="form-control"
                                            value={newPartData.Remarks}
                                            onChange={(e) => setNewPartData({ ...newPartData, Remarks: e.target.value })}
                                            placeholder="Enter remarks"
                                        ></textarea>
                                    </div>
                                    {/* <div className="col-12">
                                        <label className="form-label">Image<span className="text-danger">*</span></label>
                                        <input
                                            type="file"
                                            className="form-control"
                                            onChange={(e) => setNewPartData({ ...newPartData, ImageUrl: e.target.files[0] })}
                                            accept=".jpg,.jpeg,.png"
                                        />
                                    </div> */}
                                    <div className="col-12">
                                        <label className="form-label">
                                            Image<span className="text-danger">*</span>
                                        </label>
                                        <input
                                            type="file"
                                            className="form-control"
                                            accept=".jpg,.jpeg,.png"
                                            onChange={(e) => {
                                                const file = e.target.files[0];
                                                if (file) {
                                                    const maxSizeMB = 2;
                                                    const maxSizeBytes = maxSizeMB * 1024 * 1024; // 2MB in bytes

                                                    if (file.size > maxSizeBytes) {
                                                        Swal.fire({
                                                            icon: 'error',
                                                            title: 'File Too Large',
                                                            text: `Image must be less than ${maxSizeMB} MB.`,
                                                        });
                                                        e.target.value = ''; // reset input so user can choose again
                                                        return;
                                                    }

                                                    setNewPartData({ ...newPartData, ImageUrl: file });
                                                }
                                            }}
                                        />
                                    </div>

                                </div>
                            </div>
                            <div className="modal-footer">
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => setShowAddModal(false)}
                                    disabled={partAddLoading}
                                >Cancel</button>
                                <button
                                    className="btn btn-success"
                                    onClick={handleAddPart}
                                    disabled={partAddLoading}
                                >
                                    {partAddLoading ? 'Submitting...' : 'Submit'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

AssetParts.propTypes = {
    partsObj: PropTypes.object.isRequired,
};