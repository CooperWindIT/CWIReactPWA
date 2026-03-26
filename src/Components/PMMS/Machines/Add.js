import React, { useEffect, useState } from "react";
import Swal from 'sweetalert2';
import { BASE_API, BASE_IMAGE_UPLOAD_API, VMS_URL } from "../../Config/Config";
import { Select } from "antd";
import { fetchWithAuth } from "../../../utils/api";

export default function RegisterMachine() {

    const [sessionUserData, setsessionUserData] = useState({});
    const [departmentsData, setDepartmentsData] = useState([]);
    const [sectionsData, setSectionsData] = useState([]);
    const [suppliersData, setSuppliersData] = useState([]);
    const [addSubmitLoading, setAddSubmitLoading] = useState(false);
    const [selectedSectionId, setSelectedSectionId] = useState(null);
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [selectedSupplierId, setSelectedSupplierId] = useState(null);
    const [selectedDeptId, setSelectedDeptId] = useState(null);
    const [images, setImages] = useState([]);
    const [previewImage, setPreviewImage] = useState(null);
    // const [usersData, setUsersData] = useState([]);
    const [purchaseFileUrl, setPurchaseFileUrl] = useState("");
    const [invoiceFileUrl, setInvoiceFileUrl] = useState("");
    const [purchaseFile, setPurchaseFile] = useState(null);
    const [invoiceFile, setInvoiceFile] = useState(null);
    const [isPurchaseUploaded, setIsPurchaseUploaded] = useState(false);
    const [isInvoiceUploaded, setIsInvoiceUploaded] = useState(false);
    const { Option } = Select;

    const [formData, setFormData] = useState({
        OrgIdd: "",
        MachineName: "",
        MachineCode: "",
        MachineMake: "",
        Model: "",
        PurchaseDate: "",
        InstallationDate: "",
        UpcomingMaintenanceDate: "",
        DeptId: "",
        AssetCode: "",
        InvoiceNumber: "",
        PONumber: "",
        SectionId: "",
        SupplierId: "",
        Status: "",
        CreatedBy: "",
        POfileUrl: "",
        InvoicefileUrl: "",
        Images: [],
    });

    useEffect(() => {
        const userDataString = sessionStorage.getItem("userData");
        if (userDataString) {
            const userData = JSON.parse(userDataString);
            setsessionUserData(userData);
            setFormData((prev) => ({
                ...prev,
                CreatedBy: userData.Id,
                OrgIdd: userData.OrgId,
            }));
        }
    }, []);

    const fetchSuppleirs = async () => {
        try {
            const response = await fetchWithAuth(`ADMINRoutes/GetSuppliers?OrgId=${sessionUserData.OrgId}`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });
            if (response.ok) {
                const data = await response.json();
                setSuppliersData(data.ResultData);
            } else {
                console.error('Failed to fetch suppliers data:', response.statusText);
            }
        } catch (error) {
            console.error('Error fetching suppliers data:', error.message);
        }
    };

    const fetchSections = async () => {
        try {
            const response = await fetchWithAuth(`ADMINRoutes/GetSections?DeptId=${selectedDeptId}`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });
            if (response.ok) {
                const data = await response.json();
                setSectionsData(data.ResultData);
            } else {
                console.error('Failed to fetch suppliers data:', response.statusText);
            }
        } catch (error) {
            console.error('Error fetching suppliers data:', error.message);
        }
    };

    useEffect(() => {
        if (sessionUserData.OrgId) {
            fetchSuppleirs();
            fetchDepartmentsData();
            // fetchUsers();
        }
    }, [sessionUserData]);

    useEffect(() => {
        if (selectedDeptId) {
            fetchSections();
        }
    }, [selectedDeptId]);

    const fetchDepartmentsData = async () => {
        if (sessionUserData.OrgId) {
            try {
                const response = await fetchWithAuth(`visitor/getDepts?OrgId=${sessionUserData.OrgId}`, {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                });
                if (response.ok) {
                    const data = await response.json();
                    setDepartmentsData(data.ResultData);
                } else {
                    console.error('Failed to fetch attendance data:', response.statusText);
                }
            } catch (error) {
                console.error('Error fetching attendance data:', error.message);
            }
        }
    };

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

        if (name === 'MachineName' || name === 'Model' || name === 'MachineCode') {
            // Disallow leading space or dot
            if (/^[ .]/.test(formattedValue)) return;

            // Capitalize first letters after space or dot
            formattedValue = formattedValue.replace(/\b\w/g, (char, index, str) => {
                if (
                    index === 0 ||
                    str[index - 1] === ' ' ||
                    str[index - 1] === '.'
                ) {
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
        setAddSubmitLoading(true);

        if (!selectedDeptId || !selectedSectionId || !selectedSupplierId) {
            Swal.fire({
                title: "warning",
                text: "All fields are mandatory.",
                icon: "warning",
            });
            setAddSubmitLoading(false);
            return;
        }

        if (purchaseFile && !isPurchaseUploaded) {
            Swal.fire("Pending Upload", "Please upload the selected Purchase file before submitting.", "warning");
            setAddSubmitLoading(false);
            return;
        }
        
        if (invoiceFile && !isInvoiceUploaded) {
            Swal.fire("Pending Upload", "Please upload the selected Invoice file before submitting.", "warning");
            setAddSubmitLoading(false);
            return;
        }        

        if (!images || images.length <= 0) {
            Swal.fire({
                title: "Warning",
                text: "Please upload at least 1 machine image1.",
                icon: "warning",
            });
            setAddSubmitLoading(false);
            return;
        }

        const formPayload = new FormData();

        formPayload.append("DeptId", selectedDeptId);
        formPayload.append("SectionId", selectedSectionId);
        formPayload.append("SupplierId", selectedSupplierId);
        formPayload.append("OperatorId", selectedUserId || 0);
        formPayload.append("Status", "READYTOOPERATE");
        formPayload.append("InvoicefileUrl", invoiceFileUrl || null);
        formPayload.append("POfileUrl", purchaseFileUrl || null);

        for (const key in formData) {
            if (key !== "images" && formData[key]) {
                formPayload.append(key, formData[key]);
            }
        }

        images.forEach((file) => {
            formPayload.append("images", file);
        });

        try {
            const response = await fetchWithAuth(`file_upload/MachineReg`, {
                method: "POST",
                body: formPayload,
            });

            const result = await response.json();

            if (result.ResultData[0]?.MachineId >= 1) {
                Swal.fire({
                    title: "Success",
                    text: "Machine has been registered successfully.",
                    icon: "success",
                }).then(() => window.location.reload());
            } else {
                Swal.fire({
                    title: "Error",
                    text: result?.ResultData[0]?.Message || "Something went wrong.",
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

    const handleImageChange = (e) => {
        const selectedFiles = Array.from(e.target.files);
    
        // Check total image count limit
        const totalImages = images.length + selectedFiles.length;
        if (totalImages > 4) {
            Swal.fire({
                icon: "warning",
                title: "Limit Exceeded",
                text: "You can upload a maximum of 4 images only.",
            });
            return;
        }
    
        // Filter valid files (≤ 2MB)
        const validFiles = selectedFiles.filter(file => {
            const fileSizeMB = file.size / (1024 * 1024);
            if (fileSizeMB > 2) {
                Swal.fire({
                    icon: "warning",
                    title: "File Too Large",
                    text: `${file.name} is larger than 2MB. Please choose a smaller file.`,
                });
                return false;
            }
            return true;
        });
    
        if (validFiles.length > 0) {
            setImages(prev => [...prev, ...validFiles]);
        }
    
        // Reset input so same file can be re-selected later
        e.target.value = '';
    };    

    const handleRemoveImage = (index) => {
        setImages((prev) => prev.filter((_, i) => i !== index));
    };

    const handleViewImage = (image) => {
        const url = URL.createObjectURL(image);
        setPreviewImage(url);
    };

    const handleClosePreview = () => {
        setPreviewImage(null);
    };

    const MAX_FILE_SIZE_MB = 2;

    const handlePurchaseUpload = () => {
        if (!purchaseFile) {
            Swal.fire("No File", "Please select a file first", "info");
            return;
        }

        const fileSizeMB = purchaseFile.size / (1024 * 1024); // Convert to MB
        if (fileSizeMB > MAX_FILE_SIZE_MB) {
            Swal.fire("File Too Large", "Please choose a file smaller than 2MB.", "warning");
            return;
        }

        uploadFile(purchaseFile, setPurchaseFileUrl, setIsPurchaseUploaded);
    };

    const handleInvoiceUpload = () => {
        if (!invoiceFile) {
            Swal.fire("No File", "Please select a file first", "info");
            return;
        }

        const fileSizeMB = invoiceFile.size / (1024 * 1024);
        if (fileSizeMB > MAX_FILE_SIZE_MB) {
            Swal.fire("File Too Large", "Please choose a file smaller than 2MB.", "warning");
            return;
        }

        uploadFile(invoiceFile, setInvoiceFileUrl, setIsInvoiceUploaded);
    };

    const uploadFile = async (file, onSuccess, setUploaded) => {
        try {
            const formData = new FormData();
            formData.append("DocumentUrl", file);

            const response = await fetch(`${BASE_IMAGE_UPLOAD_API}Fileupload/document`, {
                method: "POST",
                body: formData,
            });

            const result = await response.json();

            if (result.success) {
                onSuccess(result.data.filename);
                setUploaded(true); // mark uploaded
                Swal.fire("Success", "File uploaded successfully", "success");
            } else {
                throw new Error("Upload failed");
            }
        } catch (err) {
            Swal.fire("Error", "Failed file upload. Try again.", "error");
        }
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
            id="offcanvasRightAdd"
            aria-labelledby="offcanvasRightLabel"
            style={{ width: "90%" }}
        >
            <style>
                {`
                    @media (min-width: 768px) { /* Medium devices and up (md) */
                        #offcanvasRightAdd {
                            width: 50% !important;
                        }
                    }
                `}
            </style>
            <form autoComplete="off" onSubmit={handleSubmit}>
                <div className="offcanvas-header d-flex justify-content-between align-items-center">
                    <h5 id="offcanvasRightLabel" className="mb-0">Register Machine</h5>
                    <div className="d-flex align-items-center">
                        <button className="btn btn-primary btn-sm me-2" type="submit" disabled={addSubmitLoading}>
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
                                maxLength={30}
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
                                maxLength={15}
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
                                maxLength={15}
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
                                onKeyDown={(e) => {
                                    if (e.key === ' ') {
                                        e.preventDefault();
                                    }
                                }}
                                maxLength={15}
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
                                maxLength={20}
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
                                // max={new Date().toISOString().split("T")[0]}
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
                                onChange={handleInputChange}
                                disabled={!formData.PurchaseDate || !formData.InstallationDate}
                                min={getNextDate(formData.InstallationDate)}
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
                                {departmentsData?.map((dep) => (
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
                                disabled={!selectedDeptId}
                            >
                                {sectionsData?.map((item) => (
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
                                {suppliersData?.map((item) => (
                                    <Option key={item.Id} value={item.Id}>
                                        {item.SupplierName}
                                    </Option>
                                ))}
                            </Select>
                        </div>
                        <div className="col-12 col-md-6 mb-2">
                            <label className="form-label">Machine Images<span className="text-danger">*</span></label>
                            <input
                                className="form-control"
                                type="file"
                                name="Images"
                                accept=".jpg,.jpeg,.png"
                                multiple
                                onChange={handleImageChange}
                            />
                        </div>
                        <div className="col-12 col-md-6 mb-2">
                            <label className="form-label">Purchase File Upload</label>
                            <div className="input-group">
                                <input
                                    className="form-control"
                                    type="file"
                                    // disabled={isPurchaseUploaded}
                                    disabled={true}
                                    onChange={(e) => {
                                        const file = e.target.files[0];
                                        if (file && file.size / (1024 * 1024) > MAX_FILE_SIZE_MB) {
                                            Swal.fire("File Too Large", "Please choose a file smaller than 2MB.", "warning");
                                            e.target.value = ""; // reset input
                                            return;
                                        }
                                        setPurchaseFile(file);
                                        setIsPurchaseUploaded(false); // reset upload flag if they reselect
                                    }}                                    
                                />
                                <span
                                    className={`input-group-text ${isPurchaseUploaded ? 'bg-secondary' : ''}`}
                                    style={{ cursor: isPurchaseUploaded ? 'not-allowed' : 'pointer' }}
                                    onClick={() => {
                                        if (!isPurchaseUploaded) handlePurchaseUpload();
                                    }}
                                >
                                    <i className="fa-solid fa-cloud-arrow-up" style={{ color: '#63E6BE' }}></i>
                                </span>
                            </div>
                        </div>

                        {/* Invoice File Upload */}
                        <div className="col-12 col-md-6 mb-2">
                            <label className="form-label">Invoice File Upload</label>
                            <div className="input-group">
                                <input
                                    className="form-control"
                                    type="file"
                                    disabled={true}
                                    // disabled={isInvoiceUploaded}
                                    onChange={(e) => {
                                        const file = e.target.files[0];
                                        if (file && file.size / (1024 * 1024) > MAX_FILE_SIZE_MB) {
                                            Swal.fire("File Too Large", "Please choose a file smaller than 2MB.", "warning");
                                            e.target.value = ""; // reset input
                                            return;
                                        }
                                        setInvoiceFile(file);
                                        setIsInvoiceUploaded(false); // reset upload flag if they reselect
                                    }}                                    
                                />
                                <span
                                    className={`input-group-text ${isInvoiceUploaded ? 'bg-secondary' : ''}`}
                                    style={{ cursor: isInvoiceUploaded ? 'not-allowed' : 'pointer' }}
                                    onClick={() => {
                                        if (!isInvoiceUploaded) handleInvoiceUpload();
                                    }}
                                >
                                    <i className="fa-solid fa-cloud-arrow-up" style={{ color: '#63E6BE' }}></i>
                                </span>
                            </div>
                        </div>

                    </div>
                    <div className="d-flex flex-wrap mt-2 gap-2">
                        {images.map((image, index) => (
                            <div
                                key={index}
                                className="position-relative shadow-sm rounded"
                                style={{ width: 100, height: 100, overflow: 'hidden' }}
                            >
                                <img
                                    src={URL.createObjectURL(image)}
                                    alt="preview"
                                    className="img-fluid rounded"
                                    style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                                />
                                <span
                                    onClick={() => handleRemoveImage(index)}
                                    className="position-absolute top-0 end-0 bg-danger text-white rounded-circle"
                                    style={{ cursor: 'pointer', padding: '0.2rem 0.4rem', fontSize: '0.8rem' }}
                                >
                                    ✖
                                </span>
                                <span
                                    onClick={() => handleViewImage(image)}
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
                            className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center bg-dark bg-opacity-50"
                            style={{ zIndex: 1050 }}
                            onClick={handleClosePreview}
                        >
                            <img
                                src={previewImage}
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
