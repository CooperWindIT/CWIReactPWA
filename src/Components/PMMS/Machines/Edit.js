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
    const [removedImages, setRemovedImages] = useState([]);
    const [oldImages, setOldImages] = useState([]);
    const [newImages, setNewImages] = useState([]);
    const [deletedFileNames, setDeletedFileNames] = useState([]);
    const [selectedFiles, setSelectedFiles] = useState([]); // Temp store before upload
    
    const { Option } = Select;

    const [formData, setFormData] = useState({
        OrgId: "",
        MachineName: "",
        Model: "",
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

    useEffect(() => {
        if (sessionUserData.OrgId && editObj?.MachineId) {
            fetchMachineData();
        }
    }, [sessionUserData, editObj]);

    const deleteRemovedImages = async () => {
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
            setFormData({
                OrgId: machineData.OrgId || "",
                MachineName: machineData.MachineName || "",
                Model: machineData.Model || "",
                MachineId: machineData.MachineId || "",
                MachineCode: machineData.MachineCode || "",
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
            if (machineData?.ImageUrls) {
                const urlArray = machineData.ImageUrls.split(",");
                const fullUrls = urlArray.map(img => `${BASE_IMAGE_API_GET}${img}`);
                setImages(fullUrls); // Set as string URLs for preview

                const oldImageArr = editObj.ImageUrls.split(",").map(img => img.trim());
                setOldImages(oldImageArr);
            }
        }
    }, [machineData]);

    const fetchSuppleirs = async () => {
        try {
            const response = await fetchWithAuth(`ADMINRoutes/GetSuppliers?OrgId=${sessionUserData.OrgId}`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });
            if (response.ok) {
                const data = await response.json();
                setSuppliersData(data.ResultData || []);
            } else {
                setSuppliersData([]);
                console.error('Failed to fetch suppliers data:', response.statusText);
            }
        } catch (error) {
            setSuppliersData([]);
            console.error('Error fetching suppliers data:', error.message);
        }
    };

    const fetchUsersData = async () => {
        try {
            const response = await fetchWithAuth(`auth/getUsers?OrgId=${sessionUserData.OrgId}`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });
            if (response.ok) {
                const data = await response.json();
                const filteredUsers = data.ResultData?.filter(user => user.RoleId === 3) || [];
                setUsersData(filteredUsers);
            } else {
                console.error('Failed to fetch attendance data:', response.statusText);
            }
        } catch (error) {
            console.error('Error fetching attendance data:', error.message);
        }
    };

    useEffect(() => {
        if (sessionUserData.OrgId) {
            fetchUsersData();
        }
    }, [sessionUserData]);

    const fetchSections = async () => {
        try {
            const response = await fetchWithAuth(`ADMINRoutes/GetSections?DeptId=${selectedDeptId}`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });
            if (response.ok) {
                const data = await response.json();
                setSectionsData(data.ResultData || []);
            } else {
                setSectionsData([]);
                console.error('Failed to fetch suppliers data:', response.statusText);
            }
        } catch (error) {
            setSectionsData([]);
            console.error('Error fetching suppliers data:', error.message);
        }
    };

    useEffect(() => {
        if (sessionUserData.OrgId) {
            fetchSuppleirs();
        }
    }, [sessionUserData]);

    useEffect(() => {
        fetchSections();
    }, [selectedDeptId]);

    useEffect(() => {
        const userDataString = sessionStorage.getItem("userData");
        if (userDataString) {
            const userData = JSON.parse(userDataString);
            setsessionUserData(userData);
            setFormData((prev) => ({
                ...prev,
                UpdatedBy: userData.Id,
                OrgId: userData.OrgId,
            }));
        }
    }, []);

    const fetchDepartmentsData = async () => {
        if (sessionUserData.OrgId) {
            try {
                const response = await fetchWithAuth(`visitor/getDepts?OrgId=${sessionUserData.OrgId}`, {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                });
                if (response.ok) {
                    const data = await response.json();
                    setDepartmentsData(data.ResultData || []);
                } else {
                    setDepartmentsData([]);
                    console.error('Failed to fetch attendance data:', response.statusText);
                }
            } catch (error) {
                setDepartmentsData([]);
                console.error('Error fetching attendance data:', error.message);
            }
        }
    };

    useEffect(() => {
        if (sessionUserData.OrgId) {
            fetchDepartmentsData();
        }
    }, [sessionUserData]);

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

        setFormData((prevState) => ({
            ...prevState,
            [name]: formattedValue,
        }));
    };

    const handleImageChange = (e) => {
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
    
        setSelectedFiles(validFiles);
    };        

    const handleRemoveOldImage = async (filename) => {
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
                    setFormData(prev => ({
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

    const handleRemoveNewImage = async (filename) => {
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

    const handleUploadImages = async () => {

        if (!selectedFiles.length) {
            Swal.fire("No Files", "Please select images to upload.", "info");
            return;
        }

        if (oldImages.length === 4 || newImages.length === 4 || selectedFiles.length + oldImages.length + newImages.length > 4) {
            Swal.fire(
                "Limit Reached",
                "Maximum 4 images allowed. Delete an old image to upload a new one.",
                "warning"
            );
            return;
        }
    
        const confirmUpload = await Swal.fire({
            title: "Upload Images?",
            text: `You are about to upload ${selectedFiles.length} images.`,
            icon: "question",
            showCancelButton: true,
            confirmButtonText: "Yes, upload",
        });
    
        if (confirmUpload.isConfirmed) {
            try {
                for (let file of selectedFiles) {
                    const formData = new FormData();
                    formData.append("ImageUrl", file);
    
                    const res = await fetch(`${BASE_IMAGE_UPLOAD_API}Fileupload/image`, {
                        method: "POST",
                        body: formData,
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
    
                setSelectedFiles([]); // clear selected after upload
    
            } catch (error) {
                Swal.fire("Error", error.message, "error");
            }
        }
    };    
    
    const handleSubmit = async (e) => {
        e.preventDefault();

        const combinedImageUrls = [
            ...(formData.ImageUrls ? formData.ImageUrls.split(',') : []), // split old images into array
            ...newImages // add new ones
        ];
    
        const updatedFormData = {
            ...formData,
            ImageUrls: combinedImageUrls.join(','),
            OperatorId: selectedUserId || 0

        };

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

            await deleteRemovedImages();

            const payload = {
                ...updatedFormData,
                OrgId: sessionUserData.OrgId,
                UpdatedBy: sessionUserData.Id,
                IsActive: 1,
                IsMobile: 1,
                FilePath: deletedFileNames.join(",") || 0 // Deleted old ones
            };

            const response = await fetchWithAuth(`PMMS/EditMachines`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const result = await response.json();

            if (result.ResultData?.Status === "Success") {
                Swal.fire({
                    title: "Success",
                    text: "Machine has been updated successfully.",
                    icon: "success",
                }).then(() => window.location.reload());
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

    const handleViewImage = (image) => {
        if (image instanceof File) {
            const url = URL.createObjectURL(image);
            setPreviewImage(url);
        } else {
            setPreviewImage(image); // It's already a URL
        }
    };

    const handleClosePreview = () => {
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
            <form autoComplete="off" onSubmit={handleSubmit}>
                <div className="offcanvas-header d-flex justify-content-between align-items-center">
                    <h5 id="offcanvasRightLabel" className="mb-0">Edit Machine</h5>
                    <div className="d-flex align-items-center">
                        <button className="btn btn-primary btn-sm me-2" type="submit" disabled={editSubmitLoading}>
                            {editSubmitLoading ? "Submitting..." : "Submit"}
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
                            <label className="form-label">Machine Name<span className="text-danger">*</span></label>
                            <input
                                type="text"
                                name="MachineName"
                                className="form-control"
                                placeholder="Enter machine name"
                                value={formData.MachineName}
                                onChange={handleInputChange}
                                autoComplete="off"
                                max={30}
                                min={3}
                                required
                            />
                        </div>
                        <div className="col-12 col-md-6 mb-2">
                            <label className="form-label">Machine Model<span className="text-danger">*</span></label>
                            <input
                                type="text"
                                name="Model"
                                className="form-control"
                                placeholder="Enter machine model"
                                value={formData.Model}
                                onChange={handleInputChange}
                                autoComplete="off"
                                max={15}
                                min={3}
                                onKeyDown={(e) => {
                                    if (e.key === ' ') {
                                        e.preventDefault();
                                    }
                                }}
                                required
                            />
                        </div>
                        <div className="col-12 col-md-6 mb-2">
                            <label className="form-label">Machine Code<span className="text-danger">*</span></label>
                            <input
                                type="text"
                                name="MachineCode"
                                className="form-control"
                                placeholder="Enter machine code"
                                value={formData.MachineCode}
                                onChange={handleInputChange}
                                autoComplete="off"
                                max={15}
                                min={3}
                                onKeyDown={(e) => {
                                    if (e.key === ' ') {
                                        e.preventDefault();
                                    }
                                }}
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
                                value={formData.AssetCode}
                                onChange={handleInputChange}
                                autoComplete="off"
                                max={15}
                                min={3}
                                onKeyDown={(e) => {
                                    if (e.key === ' ') {
                                        e.preventDefault();
                                    }
                                }}
                                required
                            />
                        </div>
                        <div className="col-12 col-md-6 mb-2">
                            <label className="form-label">Machine Make<span className="text-danger">*</span></label>
                            <input
                                type="text"
                                name="MachineMake"
                                className="form-control"
                                placeholder="Enter machine make"
                                value={formData.MachineMake}
                                onChange={handleInputChange}
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
                                value={formData.PurchaseDate}
                                onKeyDown={(e) => e.preventDefault()}
                                onChange={handleInputChange}
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
                                value={formData.InstallationDate}
                                onChange={handleInputChange}
                                min={formData.PurchaseDate}
                                disabled={!formData.PurchaseDate}
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
                                value={formData.UpcomingMaintenanceDate}
                                disabled={!formData.PurchaseDate || !formData.InstallationDate}
                                min={getNextDate(formData.InstallationDate)}
                                onChange={handleInputChange}
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
                                value={formData.PONumber}
                                onChange={handleInputChange}
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
                                value={formData.InvoiceNumber}
                                onChange={handleInputChange}
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
                                style={{ height: '3.2rem' }}
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
                            <label className="form-label">Sections<span className="text-danger">*</span></label>
                            <Select
                                placeholder="Select Sections"
                                showSearch
                                allowClear
                                filterOption={(input, option) =>
                                    option?.children?.toLowerCase().includes(input.toLowerCase())
                                }
                                value={selectedSectionId || undefined}
                                onChange={(value) => setSelectedSectionId(value)}
                                style={{ height: '3.3rem' }}
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
                                style={{ height: '3.3rem' }}
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
                                    multiple
                                    onChange={handleImageChange}
                                />
                                <span
                                    className={`input-group-text`}
                                    style={{ cursor: 'pointer' }}
                                    onClick={handleUploadImages}
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
                                    onClick={() => handleRemoveOldImage(img)}
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

                    {newImages.length > 0 && <h6 className="mt-5"><i className="fa-regular fa-images"></i> New Images</h6> }
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
                                    onClick={() => handleRemoveNewImage(file)}
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
                            onClick={handleClosePreview}
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