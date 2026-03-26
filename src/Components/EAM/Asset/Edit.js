import React, { useEffect, useState } from "react";
import Swal from 'sweetalert2';
import { BASE_IMAGE_API_GET, BASE_IMAGE_UPLOAD_API } from "../../Config/Config";
import { Select } from "antd";
import PropTypes from "prop-types";
import { fetchWithAuth } from "../../../utils/api";

export default function EditMachine({ editObj }) {

    const [sessionUserData, setsessionUserData] = useState({});
    const [departmentsData, setDepartmentsData] = useState([]);
    const [sectionsData, setSectionsData] = useState([]);
    const [suppliersData, setSuppliersData] = useState([]);
    const [editSubmitLoading, setEditSubmitLoading] = useState(false);
    const [dataLoading, setDataLoading] = useState(false);
    const [machineData, setMachineData] = useState([]);
    const [selectedSectionId, setSelectedSectionId] = useState(null);
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [selectedSupplierId, setSelectedSupplierId] = useState(null);
    const [selectedDeptId, setSelectedDeptId] = useState(null);
    const [images, setImages] = useState([]);
    const [usersData, setUsersData] = useState([]);
    const [previewImage, setPreviewImage] = useState(null);
    const [assetTypesData, setAssetTypesData] = useState([]);
    const [unitsData, setUnitsData] = useState([]);
    const [selectedAssetTypeId, setSelectedAssetTypeId] = useState(null);
    const [selectedUnitId, setSelectedUnitId] = useState(null);
    const [removedImages, setRemovedImages] = useState([]);
    const [oldImages, setOldImages] = useState([]);
    const [newImages, setNewImages] = useState([]);
    const [deletedFileNames, setDeletedFileNames] = useState([]);
    const [selectedEditFiles, setSelectedEditFiles] = useState([]); // Temp store before upload

    const { Option } = Select;

    const [formEditData, setFormEditData] = useState({
        OrgId: "",
        MachineName: "",
        UnitName: "",
        Model: "",
        UnitId: "",
        AssetTypeId: "",
        MachineCode: "",
        MachineMake: "",
        AssetCode: "",
        PONumber: "",
        InvoiceNumber: "",
        InstallationDate: "",
        UpcomingMaintenanceDate: "",
        DeptId: "",
        PurchaseDate: "",
        OperatorId: "",
        SectionId: "",
        SupplierId: "",
        MachineId: "",
        Status: "",
        UpdatedBy: "",
        ImageUrls: "",
        InvoicefileUrl: "",
        POfileUrl: "",
    });

    const fetchMachineData = async () => {
        setDataLoading(true);
        try {
            const response = await fetchWithAuth(`PMMS/GetMachineById?OrgId=${sessionUserData.OrgId}&MachineId=${editObj?.MachineId}`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });
            if (response.ok) {
                const data = await response.json();
                setMachineData(data.ResultData[0]);
            } else {
                console.error('Failed to fetch attendance data:', response.statusText);
            }
        } catch (error) {
            console.error('Error fetching attendance data:', error.message);
        } finally {
            setDataLoading(false);
        }
    };

    const deleteRemovedEditImages = async () => {
        for (const filename of removedImages) {
            await fetch(`${BASE_IMAGE_UPLOAD_API}Fileupload/delete`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type: "image", filename }),
            });
        }
    };

    useEffect(() => {
        if (machineData) {
            setFormEditData({
                OrgId: machineData.OrgId || "",
                UnitName: machineData.UnitName || "",
                MachineName: machineData.MachineName || "",
                AssetCode: machineData.AssetCode || "",
                UnitId: machineData.UnitId || "",
                AssetTypeId: machineData.AssetTypeId || "",
                Model: machineData.Model || "",
                MachineId: machineData.MachineId || "",
                // MachineCode: machineData.MachineCode || "",
                InvoiceNumber: machineData.InvoiceNumber || "",
                PONumber: machineData.PONumber || "",
                InvoiceNumber: machineData.InvoiceNumber || "",
                MachineMake: machineData.MachineMake || "",
                InstallationDate: machineData.InstallationDate?.split("T")[0] || "",
                UpcomingMaintenanceDate: machineData.UpcomingMaintenanceDate?.split("T")[0] || "",
                DeptId: machineData.DeptId || "",
                SectionId: machineData.SectionId || "",
                SupplierId: machineData.SupplierId || "",
                PurchaseDate: machineData.PurchaseDate?.split("T")[0] || "",
                POfileUrl: machineData.POfileUrl || "",
                POfileUrl: machineData.POfileUrl || "",
                Status: machineData.Status || "",
                UpdatedBy: machineData.UpdatedBy || "",
                ImageUrls: machineData.ImageUrls, // keep it empty unless you're showing existing image URLs
            });
            setSelectedDeptId(machineData?.DeptId);
            setSelectedSectionId(machineData?.SectionId);
            setSelectedSupplierId(machineData?.SupplierId);
            setSelectedUserId(machineData?.OperatorId);
            setSelectedUnitId(machineData?.UnitId);
            setSelectedAssetTypeId(machineData?.AssetTypeId);
            if (machineData?.ImageUrls) {
                const urlArray = machineData.ImageUrls.split(",");
                const fullUrls = urlArray.map(img => `${BASE_IMAGE_API_GET}${img}`);
                setImages(fullUrls); // Set as string URLs for preview

                const oldImageArr = editObj.ImageUrls.split(",").map(img => img.trim());
                setOldImages(oldImageArr);
            }
        }
    }, [machineData]);

    useEffect(() => {
        const userDataString = sessionStorage.getItem("userData");
        if (userDataString) {
            const userData = JSON.parse(userDataString);
            setsessionUserData(userData);
            setFormEditData((prev) => ({
                ...prev,
                UpdatedBy: userData.Id,
                OrgId: userData.OrgId,
            }));
        }
    }, []);

    const handleEditInputChange = (eOrValue, nameFromSelect = null) => {
        if (nameFromSelect) {
            setFormEditData((prev) => ({
                ...prev,
                [nameFromSelect]: eOrValue || "",
            }));
            return;
        }

        const { name, value } = eOrValue.target;
        let formattedValue = value;

        // Fields to apply title-casing and validation to
        const titleFields = ['MachineName', 'MachineCode', 'Model', 'Name'];

        if (titleFields.includes(name)) {
            // Disallow leading space or dot
            if (/^[ .]/.test(formattedValue)) return;

            // Remove spaces only for "Name" if needed
            if (name === 'Name') {
                formattedValue = formattedValue.replace(/\s+/g, '');
            }

            // Capitalize first letters after space or dot
            formattedValue = formattedValue.replace(/\b\w/g, (char, index, str) => {
                if (index === 0 || str[index - 1] === ' ' || str[index - 1] === '.') {
                    return char.toUpperCase();
                }
                return char;
            });
        }

        setFormEditData((prevState) => ({
            ...prevState,
            [name]: formattedValue,
        }));
    };

    const handleEditImageChange = (e) => {
        const selected = Array.from(e.target.files);
        const MAX_SIZE = 2 * 1024 * 1024;

        // Check total count
        const totalCount = oldImages.length + newImages.length + selected.length;
        if (totalCount > 5) {
            Swal.fire("Limit Exceeded", "You can upload up to 5 images only", "warning");
            return;
        }

        // Filter out large files
        const validFiles = selected.filter(file => {
            if (file.size > MAX_SIZE) {
                Swal.fire("File Too Large", `${file.name} exceeds 2MB`, "warning");
                return false;
            }
            return true;
        });

        setSelectedEditFiles(validFiles);
    };

    const handleRemoveOldEditImage = async (filename) => {
        const confirmDelete = await Swal.fire({
            title: "Are you sure?",
            text: "This image will be permanently deleted.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Yes, delete it!",
        });

        if (confirmDelete.isConfirmed) {
            try {
                const res = await fetch(`${BASE_IMAGE_UPLOAD_API}Fileupload/delete`, {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ type: "image", filename }),
                });

                if (res.ok) {
                    setDeletedFileNames(prev => [...prev, filename]);
                    setOldImages(prev => prev.filter(img => img !== filename));
                    setFormEditData(prev => ({
                        ...prev,
                        ImageUrls: prev.ImageUrls
                            .split(",")                // make array
                            .filter(img => img !== filename) // remove deleted file
                            .join(",")                 // back to string
                    }));
                    // Swal.fire("Deleted!", "Image has been removed.", "success");
                } else {
                    Swal.fire("Error", "Failed to delete image", "error");
                }
            } catch (error) {
                Swal.fire("Error", error.message, "error");
            }
        }
    };

    const handleRemoveNewEditImage = async (filename) => {
        const confirmDelete = await Swal.fire({
            title: "Are you sure?",
            text: "This image will be permanently deleted.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Yes, delete it!",
        });

        if (confirmDelete.isConfirmed) {
            try {
                const res = await fetch(`${BASE_IMAGE_UPLOAD_API}Fileupload/delete`, {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ type: "image", filename }),
                });

                if (res.ok) {
                    const result = await res.json();
                    if (!result.success) {
                        throw new Error(result.message || "Failed to delete image");
                    }
                    setNewImages(prevImages => prevImages.filter(img => img !== filename));
                    // Swal.fire("Deleted!", "Image has been removed.", "success");
                } else {
                    Swal.fire("Error", "Failed to delete image", "error");
                }
            } catch (error) {
                Swal.fire("Error", error.message, "error");
            }
        }
    };

    const handleUploadEditImages = async () => {

        if (!selectedEditFiles.length) {
            Swal.fire("No Files", "Please select images to upload.", "info");
            return;
        }

        if (oldImages.length === 4 || newImages.length === 4 || selectedEditFiles.length + oldImages.length + newImages.length > 4) {
            Swal.fire(
                "Limit Reached",
                "Maximum 4 images allowed. Delete an old image to upload a new one.",
                "warning"
            );
            return;
        }

        const confirmUpload = await Swal.fire({
            title: "Upload Images?",
            text: `You are about to upload ${selectedEditFiles.length} images.`,
            icon: "question",
            showCancelButton: true,
            confirmButtonText: "Yes, upload",
        });

        if (confirmUpload.isConfirmed) {
            try {
                for (let file of selectedEditFiles) {
                    const formEditData = new FormData();
                    formEditData.append("ImageUrl", file);

                    const res = await fetch(`${BASE_IMAGE_UPLOAD_API}Fileupload/image`, {
                        method: "POST",
                        body: formEditData,
                    });

                    if (res.ok) {
                        const result = await res.json();
                        if (result.success) {
                            // Swal.fire("Success", "Images uploaded successfully!", "success");
                            setNewImages(prev => [
                                ...prev,
                                result.data.filename,

                            ]);
                        } else {
                            Swal.fire("Error", result.message || `Failed to upload ${file.name}`, "error");
                        }
                    } else {
                        Swal.fire("Error", `Failed to upload ${file.name}`, "error");
                    }
                }

                setSelectedEditFiles([]); // clear selected after upload

            } catch (error) {
                Swal.fire("Error", error.message, "error");
            }
        }
    };

    const handleEditSubmit = async (status) => {
        // e.preventDefault();

        const combinedImageUrls = [
            ...(formEditData.ImageUrls ? formEditData.ImageUrls.split(',') : []), // split old images into array
            ...newImages // add new ones
        ];

        // const updatedFormEditData = {
        //     ...formEditData,
        //     ImageUrls: combinedImageUrls.join(','),
        //     OperatorId: selectedUserId || 0,
        // };

        const payload = {
            // ...updatedFormEditData,
            OrgId: sessionUserData?.OrgId,
            UserId: sessionUserData?.Id,
            Type: "EDIT",
            Priority: 1,
            JsonData: {
                MachineId: formEditData?.MachineId,
                MachineName: formEditData?.MachineName,
                Model: formEditData?.Model,
                DeptId: selectedDeptId,
                SectionId: selectedSectionId,
                InstallationDate: formEditData?.InstallationDate,
                UpcomingMaintenanceDate: formEditData?.UpcomingMaintenanceDate,
                OperatorId: 0,
                SupplierId: selectedSupplierId,
                ImageUrls: combinedImageUrls.join(','),
                POfileUrl: null,
                InvoicefileUrl: null,
                PurchaseDate: formEditData?.PurchaseDate,
                AssetTypeId: selectedAssetTypeId,
                MachineMake: formEditData?.MachineMake,
                UnitId: selectedUnitId,
                InvoiceNumber: formEditData?.InvoiceNumber,
                Status: status,
            }
        }

        if (!selectedDeptId || !selectedSectionId || !selectedSupplierId) {
            Swal.fire({
                title: "warning",
                text: "All fields are mandatory.",
                icon: "warning",
            });
            setEditSubmitLoading(false);
            return;
        }

        // if (!images || images.length <= 0) {
        //     Swal.fire({
        //         title: "Warning",
        //         text: "Please upload at least 1 machine image.",
        //         icon: "warning",
        //     });
        //     setEditSubmitLoading(false);
        //     return;
        // }
        setEditSubmitLoading(true);

        try {

            await deleteRemovedEditImages();

            // const payload = {
            //     ...updatedFormEditData,
            //     UpdatedBy: sessionUserData.Id,
            //     IsActive: 1,
            //     FilePath: deletedFileNames.join(",") || 0 // Deleted old ones
            // };

            const response = await fetchWithAuth(`PMMS/AssetRegCycle`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const result = await response.json();

            if (result.data.result[0].ResponseCode === 2001) {
                Swal.fire({
                    title: "Success",
                    text: "Asset has been saved successfully.",
                    icon: "success",
                }).then(() => window.location.reload());
            }
            else if (result.data.result[0].ResponseCode === 2003) {
                Swal.fire({
                    title: "Success",
                    text: "Asset has been sent for approval successfully.",
                    icon: "success",
                }).then(() => window.location.reload());
            } else if (result.data.result[0].ResponseCode === 2000) {
                Swal.fire({
                    title: "Error",
                    text: result.data.result[0].Message || "An unexpected error occurred.",
                    icon: "error",
                });
            } else {
                Swal.fire({
                    title: "Error",
                    text: "Something went wrong, please try after sometime.",
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

    const handleAssetEditSubmit = async (e) => {
        e.preventDefault();

        const payload = {
            OrgId: sessionUserData?.OrgId,
            UserId: sessionUserData?.Id,
            Type: "ACTIVE",
            Priority: 1,
            JsonData: {
              MachineId: machineData?.MachineId,
              AssetCode: formEditData?.AssetCode
            }
          }          

        if (!formEditData?.AssetCode) {
            Swal.fire({
                title: "warning",
                text: "Please enter Assset code.",
                icon: "warning",
            });
            setEditSubmitLoading(false);
            return;
        }

        setEditSubmitLoading(true);

        try {

            await deleteRemovedEditImages();

            const response = await fetchWithAuth(`PMMS/AssetRegCycle`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const result = await response.json();

            if (result.data.result[0].ResponseCode === 2005) {
                Swal.fire({
                    title: "Success",
                    text: "Asset code has been updated successfully.",
                    icon: "success",
                }).then(() => window.location.reload());
            } else {
                Swal.fire({
                    title: "Error",
                    text: "Something went wrong, please try after sometime.",
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

    const handleViewImage = (image) => {
        if (image instanceof File) {
            const url = URL.createObjectURL(image);
            setPreviewImage(url);
        } else {
            setPreviewImage(image); // It's already a URL
        }
    };

    const handleCloseEditPreview = () => {
        setPreviewImage(null);
    };

    const getNextDate = (dateStr) => {
        if (!dateStr) return "";
        const date = new Date(dateStr);
        date.setDate(date.getDate() + 1);
        return date.toISOString().split("T")[0];
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
            <form autoComplete="off">
                <div className="offcanvas-header d-flex justify-content-between align-items-center">
                    <h5 id="offcanvasRightLabel" className="mb-0">Edit Asset</h5>
                    <div className="d-flex align-items-center">
                        <button className="btn btn-warning btn-sm me-2"
                            type="button"
                            disabled={editSubmitLoading || formEditData?.Status !== 'DRAFT'}
                            onClick={() => handleEditSubmit("DRAFT")}
                        >
                            {editSubmitLoading ? "Submitting..." : "Save as Draft"}
                        </button>
                        <button className="btn btn-primary btn-sm me-2"
                            type="button"
                            disabled={editSubmitLoading}
                            onClick={() => handleEditSubmit("PENDING APPROVAL")}
                        >
                            {editSubmitLoading ? "Submitting..." : "Request Approval"}
                        </button>
                        <button className="btn btn-info btn-sm me-2"
                            type="button"
                            disabled={editSubmitLoading}
                            onClick={handleAssetEditSubmit}
                        >
                            {editSubmitLoading ? "Submitting..." : "Submit Asset Code"}
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
                    <div className="alert alert-warning p-2 mb-2">
                        ⚠️ Max 4 images allowed. Each image must be less than 2MB.
                    </div>
                    <div className="row">
                        <div className="col-12 col-md-6 mb-2">
                            <label className="form-label">Unit<span className="text-danger">*</span></label>
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Enter asset name"
                                value={formEditData.UnitName}
                                onChange={handleEditInputChange}
                                autoComplete="off"
                                required
                                readOnly
                            />
                        </div>
                        <div className="col-12 col-md-6 mb-2">
                            <label className="form-label">
                                Asset Type <span className="text-danger">*</span>
                            </label>
                            <Select
                                showSearch
                                allowClear
                                placeholder="Select Asset Type"
                                className="w-100"
                                value={selectedAssetTypeId || undefined}
                                style={{ height: '2.8rem' }}
                                onChange={(value) => setSelectedAssetTypeId(value)}
                                optionFilterProp="children"
                                filterOption={(input, option) =>
                                    option.children.toLowerCase().includes(input.toLowerCase())
                                }
                            >
                                {assetTypesData?.map((assTyp) => (
                                    <Option key={assTyp.ItemId} value={assTyp.ItemId}>
                                        {assTyp.DisplayValue}
                                    </Option>
                                ))}
                            </Select>
                        </div>
                        <div className="col-12 col-md-6 mb-2">
                            <label className="form-label">Asset Name<span className="text-danger">*</span></label>
                            <input
                                type="text"
                                name="MachineName"
                                className="form-control"
                                placeholder="Enter asset name"
                                style={{ height: '2.8rem' }}
                                value={formEditData.MachineName}
                                onChange={handleEditInputChange}
                                autoComplete="off"
                                max={30}
                                min={3}
                                required
                            />
                        </div>
                        <div className="col-12 col-md-6 mb-2">
                            <label className="form-label">Asset Model<span className="text-danger">*</span></label>
                            <input
                                type="text"
                                name="Model"
                                className="form-control"
                                placeholder="Enter asset model"
                                value={formEditData.Model}
                                onChange={handleEditInputChange}
                                style={{ height: '2.8rem' }}
                                autoComplete="off"
                                max={15}
                                min={3}
                                required
                            />
                        </div>
                        <div className="col-12 col-md-6 mb-2">
                            <label className="form-label">Serial No<span className="text-danger">*</span></label>
                            <input
                                type="text"
                                name="MachineCode"
                                className="form-control"
                                placeholder="Enter serial no"
                                value={formEditData.MachineCode}
                                onChange={handleEditInputChange}
                                style={{ height: '2.8rem' }}
                                autoComplete="off"
                                max={20}
                                min={3}
                                disabled
                                required
                            />
                        </div>
                        <div className="col-12 col-md-6 mb-2">
                            <label className="form-label">Asset Code<span className="text-danger">*</span></label>
                            <input
                                type="text"
                                name="AssetCode"
                                className="form-control"
                                placeholder="Enter asset code"
                                value={formEditData.AssetCode}
                                onChange={handleEditInputChange}
                                style={{ height: '2.8rem' }}
                                autoComplete="off"
                                max={20}
                                min={3}
                                onKeyDown={(e) => {
                                    if (e.key === ' ') {
                                        e.preventDefault();
                                    }
                                }}
                                disabled={formEditData?.Status !== "APPROVED"}
                            />
                        </div>
                        <div className="col-12 col-md-6 mb-2">
                            <label className="form-label">Asset Make<span className="text-danger">*</span></label>
                            <input
                                type="text"
                                name="MachineMake"
                                className="form-control"
                                placeholder="Enter asset make"
                                style={{ height: '2.8rem' }}
                                value={formEditData.MachineMake}
                                onChange={handleEditInputChange}
                                autoComplete="off"
                                max={20}
                                min={3}
                                required
                            />
                        </div>
                        <div className="col-6 mb-2">
                            <label className="form-label">Purchase Date<span className="text-danger">*</span></label>
                            <input
                                type="date"
                                name="PurchaseDate"
                                className="form-control"
                                value={formEditData.PurchaseDate}
                                style={{ height: '2.8rem' }}
                                onKeyDown={(e) => e.preventDefault()}
                                onChange={handleEditInputChange}
                                max={new Date().toISOString().split('T')[0]}
                                required
                            />
                        </div>
                        <div className="col-6 mb-2">
                            <label className="form-label">Installation Date<span className="text-danger">*</span></label>
                            <input
                                type="date"
                                name="InstallationDate"
                                className="form-control"
                                style={{ height: '2.8rem' }}
                                value={formEditData.InstallationDate}
                                onChange={handleEditInputChange}
                                min={formEditData.PurchaseDate}
                                disabled={!formEditData.PurchaseDate}
                                onKeyDown={(e) => e.preventDefault()}
                                required
                            />
                        </div>
                        <div className="col-6 mb-2">
                            <label className="form-label">Upcoming Maint.<span className="text-danger">*</span></label>
                            <input
                                type="date"
                                name="UpcomingMaintenanceDate"
                                className="form-control"
                                style={{ height: '2.8rem' }}
                                value={formEditData.UpcomingMaintenanceDate}
                                disabled={!formEditData.PurchaseDate || !formEditData.InstallationDate}
                                min={getNextDate(formEditData.InstallationDate)}
                                onChange={handleEditInputChange}
                                onKeyDown={(e) => e.preventDefault()}
                                required
                            />
                        </div>
                        <div className="col-12 col-md-6 mb-2">
                            <label className="form-label">PO Number<span className="text-danger">*</span></label>
                            <input
                                type="text"
                                name="PONumber"
                                className="form-control"
                                placeholder="Enter purchase order number"
                                style={{ height: '2.8rem' }}
                                value={formEditData.PONumber}
                                onChange={handleEditInputChange}
                                autoComplete="off"
                                maxLength={20}
                                required
                            />
                        </div>
                        <div className="col-12 col-md-6 mb-2">
                            <label className="form-label">Invocie Number<span className="text-danger">*</span></label>
                            <input
                                type="text"
                                name="InvoiceNumber"
                                className="form-control"
                                placeholder="Enter invoice number"
                                style={{ height: '2.8rem' }}
                                value={formEditData.InvoiceNumber}
                                onChange={handleEditInputChange}
                                autoComplete="off"
                                maxLength={20}
                                required
                            />
                        </div>
                        <div className="col-6 mb-2">
                            <label className="form-label">
                                Department <span className="text-danger">*</span>
                            </label>
                            <Select
                                showSearch
                                allowClear
                                placeholder="Select Department"
                                className="w-100"
                                value={selectedDeptId || undefined}
                                style={{ height: '2.8rem' }}
                                onChange={(value) => setSelectedDeptId(value)}
                                optionFilterProp="children"
                                filterOption={(input, option) =>
                                    option.children.toLowerCase().includes(input.toLowerCase())
                                }
                            >
                                {departmentsData && departmentsData?.map((dep) => (
                                    <Option key={dep.Id} value={dep.Id}>
                                        {dep.DeptName}
                                    </Option>
                                ))}
                            </Select>
                        </div>
                        <div className="col-6 mb-2 d-flex flex-column">
                            <label className="form-label">Section<span className="text-danger">*</span></label>
                            <Select
                                placeholder="Select Sections"
                                showSearch
                                allowClear
                                filterOption={(input, option) =>
                                    option?.children?.toLowerCase().includes(input.toLowerCase())
                                }
                                value={selectedSectionId || undefined}
                                onChange={(value) => setSelectedSectionId(value)}
                                style={{ height: '2.8rem' }}
                            >
                                {Array.isArray(sectionsData) && sectionsData.map((item) => (
                                    <Option key={item.SectionId} value={item.SectionId}>
                                        {item.SectionName}
                                    </Option>
                                ))}
                            </Select>
                        </div>

                        <div className="col-12 col-md-6 mb-2 d-flex flex-column">
                            <label className="form-label">Supplier<span className="text-danger">*</span></label>
                            <Select
                                placeholder="Select Supplier"
                                showSearch
                                allowClear
                                filterOption={(input, option) =>
                                    option?.children?.toLowerCase().includes(input.toLowerCase())
                                }
                                value={selectedSupplierId || undefined}
                                onChange={(value) => setSelectedSupplierId(value)}
                                style={{ height: '2.8rem' }}
                            >
                                {suppliersData && suppliersData?.map((item) => (
                                    <Option key={item.Id} value={item.Id}>
                                        {item.SupplierName}
                                    </Option>
                                ))}
                            </Select>
                        </div>

                        <div className="col-12 col-md-6 mb-2">
                            <label className="form-label">Images<span className="text-danger">*</span></label>
                            <div className="input-group">
                                <input
                                    className="form-control"
                                    type="file"
                                    name="Images"
                                    accept=".jpg,.jpeg,.png"
                                    style={{ height: '2.8rem' }}
                                    onChange={handleEditImageChange}
                                />
                                <span
                                    className={`input-group-text`}
                                    style={{ cursor: 'pointer' }}
                                    onClick={handleUploadEditImages}
                                >
                                    <i className="fa-solid fa-cloud-arrow-up" style={{ color: '#63E6BE' }}></i>
                                </span>
                            </div>
                        </div>
                        <div className="col-12 col-md-6 mb-2">
                            <label className="form-label">Purchase File</label>
                            <div className="input-group">
                                <input
                                    className="form-control cursor-not-allowed"
                                    type="file"
                                    name="Images"
                                    accept=".jpg,.jpeg,.png"
                                    disabled={true}
                                    style={{ height: '2.8rem' }}
                                />
                                <span
                                    className={`input-group-text`}
                                // style={{ cursor: isPurchaseUploaded ? 'not-allowed' : 'pointer' }}
                                // onClick={() => {
                                //     if (!isPurchaseUploaded) handlePurchaseUpload();
                                // }}
                                >
                                    <i className="fa-solid fa-cloud-arrow-up" style={{ color: '#63E6BE' }}></i>
                                </span>
                            </div>
                        </div>
                        <div className="col-12 col-md-6 mb-2">
                            <label className="form-label">Invoice File</label>
                            <div className="input-group">
                                <input
                                    className="form-control cursor-not-allowed"
                                    type="file"
                                    name="Images"
                                    accept=".jpg,.jpeg,.png"
                                    disabled={true}
                                    style={{ height: '2.8rem' }}
                                />
                                <span
                                    className={`input-group-text`}
                                // style={{ cursor: isPurchaseUploaded ? 'not-allowed' : 'pointer' }}
                                // onClick={() => {
                                //     if (!isPurchaseUploaded) handlePurchaseUpload();
                                // }}
                                >
                                    <i className="fa-solid fa-cloud-arrow-up" style={{ color: '#63E6BE' }}></i>
                                </span>
                            </div>
                        </div>
                    </div>

                    <h6 className="mt-5"><i className="fa-regular fa-images"></i> Existing Images</h6>
                    <div className="d-flex gap-2 flex-wrap mt-2">
                        {oldImages?.map((img, i) => (
                            <div key={`old-${i}`} className="position-relative" style={{ width: 80, height: 80 }}>
                                <img
                                    src={`${BASE_IMAGE_API_GET}${img}`}
                                    className="img-thumbnail"
                                    style={{ objectFit: "cover", width: "100%", height: "100%" }}
                                    alt="existing"
                                />
                                <span
                                    onClick={() => handleRemoveOldEditImage(img)}
                                    className="position-absolute top-0 end-0 bg-danger text-white rounded-circle"
                                    style={{ padding: "0.25rem", cursor: "pointer", fontSize: "0.75rem" }}
                                >✖</span>
                                <span
                                    onClick={() => handleViewImage(img)}
                                    className="position-absolute bottom-0 end-0 bg-primary text-white rounded-circle"
                                    style={{ cursor: 'pointer', padding: '0.2rem 0.4rem', fontSize: '0.8rem' }}
                                >
                                    <i className="fa-regular fa-eye fa-beat-fade"></i>
                                </span>
                            </div>
                        ))}
                    </div>

                    {newImages.length > 0 && <h6 className="mt-5"><i className="fa-regular fa-images"></i> New Images</h6>}
                    <div className="d-flex gap-2 flex-wrap mt-2">
                        {newImages?.map((file, i) => (
                            <div key={`new-${i}`} className="position-relative" style={{ width: 80, height: 80 }}>
                                <img
                                    src={`${BASE_IMAGE_API_GET}${file}`}
                                    className="img-thumbnail"
                                    style={{ objectFit: "cover", width: "100%", height: "100%" }}
                                    alt="new"
                                />
                                <span
                                    onClick={() => handleRemoveNewEditImage(file)}
                                    className="position-absolute top-0 end-0 bg-danger text-white rounded-circle"
                                    style={{ padding: "0.25rem", cursor: "pointer", fontSize: "0.75rem" }}
                                >✖</span>
                                <span
                                    onClick={() => handleViewImage(file)}
                                    className="position-absolute bottom-0 end-0 bg-primary text-white rounded-circle"
                                    style={{ cursor: 'pointer', padding: '0.2rem 0.4rem', fontSize: '0.8rem' }}
                                >
                                    <i className="fa-regular fa-eye fa-beat-fade"></i>
                                </span>
                            </div>
                        ))}
                    </div>

                    {previewImage && (
                        <div
                            className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center bg-dark bg-opacity-75"
                            style={{ zIndex: 1050 }}
                            onClick={handleCloseEditPreview}
                        >
                            <img
                                src={`${BASE_IMAGE_API_GET}${previewImage}`}
                                alt="Full preview"
                                style={{ maxWidth: '90%', maxHeight: '90%', borderRadius: '10px' }}
                            />
                        </div>
                    )}
                </div>
            </form>
        </div>
    );
}

EditMachine.propTypes = {
    editObj: PropTypes.object.isRequired,
};