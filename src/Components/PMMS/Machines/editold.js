import React, { useEffect, useState } from "react";
import Swal from 'sweetalert2';
import { BASE_API, BASE_IMAGE_API, BASE_IMAGE_UPLOAD_API, VMS_URL, VMS_VISITORS } from "../../Config/Config";
import { Select } from "antd";
import PropTypes from "prop-types";

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

    const [oldImages, setOldImages] = useState([]);
    const [newImages, setNewImages] = useState([]);
    const [removedImages, setRemovedImages] = useState([]);
    const { Option } = Select;

    const [formData, setFormData] = useState({
        OrgId: "",
        MachineName: "",
        Model: "",
        MachineCode: "",
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
            const response = await fetch(`${BASE_API}PMMS/GetMachineById?OrgId=${sessionUserData.OrgId}&MachineId=${editObj?.MachineId}`);
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

    const uploadImagesAndGetPaths = async () => {
        const paths = [];

        for (const file of newImages) {
            const imageForm = new FormData();
            imageForm.append("ImageUrl", file);

            const res = await fetch(`${BASE_IMAGE_UPLOAD_API}Fileupload/image`, {
                method: "POST",
                body: imageForm,
            });

            const result = await res.json();

            if (res.ok && result.data.filename) {
                paths.push(result.data.filename);
            } else {
                console.error("Image upload failed", result);
            }
        }
        return paths;
    };

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
                const fullUrls = urlArray.map(img => `${BASE_IMAGE_API}${img}`);
                setImages(fullUrls); // Set as string URLs for preview

                const oldImageArr = editObj.ImageUrls.split(",").map(img => img.trim());
                setOldImages(oldImageArr);
            }
        }
    }, [machineData]);

    const fetchSuppleirs = async () => {
        try {
            const response = await fetch(`${BASE_API}ADMINRoutes/GetSuppliers?OrgId=${sessionUserData.OrgId}`);
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
            const response = await fetch(`${VMS_URL}getUsers?OrgId=${sessionUserData.OrgId}`);
            if (response.ok) {
                const data = await response.json();
                const filteredUsers = data.ResultData?.filter(user => user.RoleId === 3) || [];
                setUsersData(filteredUsers);
            } else {
                console.error('Failed to fetch attendance data:', response.statusText);
            }
        } catch (error) {
            console.error('Error fetching attendance data:', error.message);
        } finally {
            console.log('');
        }
    };

    useEffect(() => {
        if (sessionUserData.OrgId) {
            fetchUsersData();
        }
    }, [sessionUserData]);

    const fetchSections = async () => {
        try {
            const response = await fetch(`${BASE_API}ADMINRoutes/GetSections?DeptId=${selectedDeptId}`);
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
                const response = await fetch(`${BASE_API}visitor/getDepts?OrgId=${sessionUserData.OrgId}`);
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setEditSubmitLoading(true);

        if (!selectedDeptId || !selectedSectionId || !selectedSupplierId || !selectedUserId) {
            Swal.fire({
                title: "warning",
                text: "All fields are mandatory.",
                icon: "warning",
            });
            setEditSubmitLoading(false);
            return;
        }

        if (!images || images.length < 2) {
            Swal.fire({
                title: "Warning",
                text: "Please upload at least 2 machine images.",
                icon: "warning",
            });
            setEditSubmitLoading(false);
            return;
        }

        try {
            // const uploadedPaths = await uploadImagesAndGetPaths();

            // Step 2: Delete removed images
            await deleteRemovedImages();

            // Step 3: Prepare payload (JSON)
            formData.OperatorId = selectedUserId;

            const payload = {
                ...formData,
                OrgId: sessionUserData.OrgId,
                UpdatedBy: sessionUserData.Id,
                IsActive: 1,
                IsMobile: 1,
                // Images: uploadedPaths, // Add new image paths
                FilePath: removedImages.join(",") || 0 // Deleted old ones
            };

            const response = await fetch(`${BASE_API}PMMS/EditMachines`, {
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
                })
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

    const handleImageChange = (e) => {
        const selected = Array.from(e.target.files);
        const totalCount = oldImages.length + newImages.length + selected.length;

        if (totalCount > 5) {
            Swal.fire("Limit Exceeded", "You can upload up to 5 images only", "warning");
            return;
        }

        setNewImages(prev => [...prev, ...selected]);
    };

    const handleRemoveImage = async (index) => {
        const image = images[index];

        let filename = "";
        if (typeof image === "string") {
            // Old image with full path, extract file name
            filename = image.split("/").pop();
        } else if (image instanceof File) {
            // New image, just remove from UI (no delete API call)
            const updatedImages = [...images];
            updatedImages.splice(index, 1);
            setImages(updatedImages);
            setNewImages(updatedImages); // if you're using newImages separately
            return;
        }

        try {
            const res = await fetch(`${BASE_IMAGE_UPLOAD_API}Fileupload/delete`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type: "image", filename }),
            });

            const result = await res.json();

            if (res.ok && result.success) {
                Swal.fire("Deleted!", result?.message, "success");
                // Remove from images and removedImages
                setImages(prev => prev.filter((_, i) => i !== index));
                setRemovedImages(prev => [...prev, filename]); // track for FilePath usage if needed
                // fetchMachineData();

            } else {
                Swal.fire("Error", result?.message || "Failed to delete image", "error");
            }
        } catch (error) {
            console.error(error);
            Swal.fire("Error", "Something went wrong while deleting", "error");
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
                        <div className="col-6 mb-2">
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
                        <div className="col-6 mb-2">
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
                        {/* <div className="col-6 mb-2">
                            <label className="form-label">
                                Operational By <span className="text-danger">*</span>
                            </label>
                            <Select
                                showSearch
                                allowClear
                                placeholder="Select Employee"
                                className="w-100"
                                value={selectedUserId || undefined}
                                style={{ height: '3.2rem' }}
                                onChange={(value) => setSelectedUserId(value)}
                                optionFilterProp="children"
                                filterOption={(input, option) =>
                                    option.children.toLowerCase().includes(input.toLowerCase())
                                }
                            >
                                {usersData && usersData?.map((user) => (
                                    <Option key={user.Id} value={user.Id}>
                                        {user.Name}
                                    </Option>
                                ))}
                            </Select>
                        </div> */}

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

                        <div className="col-6 mb-2 d-flex flex-column">
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
                        <div className="col-6 mb-2">
                            <label className="form-label">Images<span className="text-danger">*</span></label>
                            <input
                                className="form-control"
                                type="file"
                                name="Images"
                                accept=".jpg,.jpeg,.png"
                                multiple
                                onChange={handleImageChange}
                            />
                        </div>
                        <div className="col-6 mb-2">
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
                        <div className="col-6 mb-2">
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
                    <div className="d-flex gap-2 flex-wrap mt-2">
                        {oldImages.map((img, i) => (
                            <div key={`old-${i}`} className="position-relative" style={{ width: 80, height: 80 }}>
                                <img
                                    src={`${BASE_IMAGE_API}${img}`}
                                    className="img-thumbnail"
                                    style={{ objectFit: "cover", width: "100%", height: "100%" }}
                                    alt="existing"
                                />
                                <span
                                    onClick={() => handleRemoveImage(i, true)}
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

                        {newImages.map((file, i) => (
                            <div key={`new-${i}`} className="position-relative" style={{ width: 80, height: 80 }}>
                                <img
                                    src={URL.createObjectURL(file)}
                                    className="img-thumbnail"
                                    style={{ objectFit: "cover", width: "100%", height: "100%" }}
                                    alt="new"
                                />
                                <span
                                    onClick={() => handleRemoveImage(i, false)}
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
                                src={`${BASE_IMAGE_API}${previewImage}`}
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