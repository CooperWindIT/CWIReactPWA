import React, { useEffect, useState } from "react";
import Swal from 'sweetalert2';
import { BASE_API } from "../Config/Config";
// ASSUMPTION: fetchWithAuth and ADD_USER aren't in the version of this file you
// pasted, but your new handleSubmit calls both. I've imported them the way
// getRoles/getManagers style endpoints in this file suggest — verify these
// two paths/names match your actual project (fetchWithAuth is often a shared
// wrapper that attaches the auth token; ADD_USER is assumed to be a full
// endpoint URL constant exported from Config, same as BASE_API).
import { Select } from "antd";
import { fetchWithAuth } from "../../utils/api";

export default function AddUser() {

    const [sessionUserData, setsessionUserData] = useState({});
    const [rolesData, setRolesData] = useState([]);
    const [departmentsData, setDepartmentsData] = useState([]);
    const [modulesData, setModulesData] = useState([]);
    const [selectedModules, setSelectedModules] = useState([]);
    const [addSubmitLoading, setAddSubmitLoading] = useState(false);
    const [usersData, setUsersData] = useState([]);
    const [manager, setManager] = useState([]);
    const [showPassword, setShowPassword] = useState(false);
    const [emailError, setEmailError] = useState('');
    const [imagePreview, setImagePreview] = useState(null);
    const { Option } = Select;

    const togglePasswordVisibility = () => {
        setShowPassword((prev) => !prev);
    };

    const [formData, setFormData] = useState({
        RoleId: "",
        Name: "",
        Password: "",
        IsActive: 1,
        CreatedBy: "",
        OrgId: "",
        DeptId: "",
        Mobile: "",
        Email: "",
        IsMobile: 1,
        Gender: "",
        NotifyEmail: "",
        ManagerId: "",
        IsSuperiorId: "",
        Image: null
    });

    const fetchManagerData = async () => {
        try {
            const response = await fetch(`${BASE_API}AdminRoutes/getManagers?OrgId=${sessionUserData.OrgId}`);
            if (response.ok) {
                const data = await response.json();
                setManager(data.ResultData);
            } else {
                console.error('Failed to fetch shifts data:', response.statusText);
            }
        } catch (error) {
            console.error('Error fetching shifts data:', error.message);
        }
    };

    const fetchModulesData = async () => {
        try {
            const response = await fetch(`${BASE_API}AdminRoutes/getModules?OrgId=${sessionUserData.OrgId}`);
            if (response.ok) {
                const data = await response.json();
                setModulesData(data.ResultData);
            } else {
                console.error('Failed to fetch modules data:', response.statusText);
            }
        } catch (error) {
            console.error('Error fetching modules data:', error.message);
        }
    };

    useEffect(() => {
        if (sessionUserData.OrgId) {
            fetchManagerData();
            fetchModulesData();
        }
    }, [sessionUserData]);

    useEffect(() => {
        const userDataString = sessionStorage.getItem("userData");
        if (userDataString) {
            const userData = JSON.parse(userDataString);
            setsessionUserData(userData);
            setFormData((prev) => ({
                ...prev,
                CreatedBy: userData.Id,
                OrgId: userData.OrgId,
            }));
        }
    }, []);

    const fetchRolesData = async () => {
        if (sessionUserData.OrgId) {
            try {
                const response = await fetch(`${BASE_API}AdminRoutes/getRoles?OrgId=${sessionUserData.OrgId}`);
                if (response.ok) {
                    const data = await response.json();
                    setRolesData(data.ResultData);
                } else {
                    console.error('Failed to fetch attendance data:', response.statusText);
                }
            } catch (error) {
                console.error('Error fetching attendance data:', error.message);
            }
        }
    };

    const fetchDDLData = async () => {
        try {
            const sessionDDL = sessionStorage.getItem("ddlUsersAddData");

            if (sessionDDL) {
                const parsed = JSON.parse(sessionDDL);

                setUsersData(parsed.users || []);
                setDepartmentsData(parsed.depts || []);
                return;
            }

            const response = await fetchWithAuth(
                `ADMINRoutes/CWIGetDDLItems?OrgId=${sessionUserData?.OrgId}&UserId=0`,
                {
                    method: "GET",
                    headers: { "Content-Type": "application/json" },
                }
            );

            if (!response.ok) throw new Error("Network response was not ok");

            const data = await response.json();

            const usersFilteredData = data.ResultData.filter(
                (item) => item.DDLName === "Users"
            );

            const deptsFilteredData = data.ResultData.filter(
                (item) => item.DDLName === "Departments"
            );

            setUsersData(usersFilteredData || []);
            setDepartmentsData(deptsFilteredData || []);

            sessionStorage.setItem(
                "ddlUsersAddData",
                JSON.stringify({
                    users: usersFilteredData,
                    depts: deptsFilteredData,
                })
            );

        } catch (error) {
            console.error("Failed to fetch DDL data:", error);
            setUsersData([]);
            setDepartmentsData([]);
        }
    };

    useEffect(() => {
        if (sessionUserData.OrgId) {
            fetchRolesData();
            fetchDDLData();
        }
    }, [sessionUserData]);

    // Clean up the object URL created for the image preview so it doesn't leak
    useEffect(() => {
        return () => {
            if (imagePreview) URL.revokeObjectURL(imagePreview);
        };
    }, [imagePreview]);

    const handleInputChange = (eOrValue, nameFromSelect = null) => {
        if (nameFromSelect) {
            setFormData((prev) => ({
                ...prev,
                [nameFromSelect]: eOrValue || "",
            }));
            return;
        }

        const { name, value, type, checked } = eOrValue.target;

        // Validate mobile number
        let formattedValue = value;

        if (name === "Name") {
            formattedValue = value
                .replace(/\s+/g, " ") // Keep single spaces
                .replace(/(^|[\s.])([a-z])/g, (match, separator, letter) => {
                    return separator + letter.toUpperCase();
                });
        }

        setFormData((prevState) => ({
            ...prevState,
            [name]: type === "checkbox" ? (checked ? 1 : 0) : formattedValue,
        }));
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (!file) {
            setFormData((prev) => ({ ...prev, Image: null }));
            setImagePreview(null);
            return;
        }

        const allowedTypes = ["image/png", "image/jpeg", "image/jpg"];
        if (!allowedTypes.includes(file.type)) {
            Swal.fire({
                title: "Invalid File",
                text: "Only PNG, JPG, JPEG files are allowed.",
                icon: "error",
            });
            e.target.value = "";
            return;
        }

        setFormData((prev) => ({ ...prev, Image: file }));
        setImagePreview(URL.createObjectURL(file));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setAddSubmitLoading(true);
        if (formData.Image) {
            console.log("Image Size:", formData.Image.size / 1024 / 1024, "MB");
        }

        if (!/^\d{10}$/.test(formData.Mobile)) {
            Swal.fire({
                title: "Invalid Mobile Number",
                text: "Mobile number must be exactly 10 digits.",
                icon: "error",
            });
            setAddSubmitLoading(false);
            return;
        }

        if (!validateEmail(formData.Email)) {
            setEmailError("Please enter a valid email ending with ex: .com or .in");
            setAddSubmitLoading(false);
            return;
        }

        try {
            const payload = new FormData();

            payload.append("RoleId", formData.RoleId || "");
            payload.append("Name", formData.Name || "");
            payload.append("DeptId", formData.DeptId || "");
            payload.append("Password", formData.Password || "");
            payload.append("IsActive", "1");
            payload.append("CreatedBy", sessionUserData?.Id || "");
            payload.append("OrgId", formData.OrgId || "");
            payload.append("Mobile", formData.Mobile || "");
            payload.append("Email", formData.Email || "");
            payload.append("IsMobile", "1");
            payload.append("Gender", formData.Gender || "");
            payload.append("NotifyEmail", formData.NotifyEmail || "");
            payload.append("ManagerId", formData.ManagerId || "");
            payload.append("IsSuperiorId", formData.IsSuperiorId || "");
            payload.append("AccessToModules", selectedModules.join(","));

            if (formData.Image) {
                payload.append("ImageUrl", formData.Image);
            }
            for (const [key, value] of payload.entries()) {
                console.log(`${key}:`, value);
            }

            const response = await fetchWithAuth(`${BASE_API}AdminRoutes/POSTUsers`, {
                method: "POST",
                body: payload,
            });

            const data = await response.json();

            if (data.ResultData?.Status === "Success") {
                Swal.fire({
                    title: "Success",
                    text: "User has been added successfully.",
                    icon: "success",
                });
            } else {
                Swal.fire({
                    title: "Error",
                    text: data?.ResultData?.ResultMessage || "Failed to add user.",
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
            .split(/([.\s])/g) // Split and preserve dots and spaces
            .map(part =>
                /[a-zA-Z]/.test(part) ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase() : part
            )
            .join('');
    };

    const validateEmail = (email) => {
        const regex = /^[^\s@]+@[^\s@]+\.(com|in|gov|tech|info|org|net|us|edu|shop|dev)$/i;
        return regex.test(email);
    };


    return (
        <div
            className="offcanvas offcanvas-end cwi-au-offcanvas"
            tabIndex="-1"
            id="offcanvasRightAdd"
            aria-labelledby="offcanvasRightLabel"
            style={{ width: "90%" }}
        >
            <style>
                {`
                  @media (min-width: 768px) {
                      #offcanvasRightAdd {
                          width: 55% !important;
                      }
                  }
                  .cwi-au-offcanvas .offcanvas-header {
                      padding: 1.25rem 1.75rem;
                      border-bottom: 1px solid rgba(0,0,0,0.06);
                      box-shadow: 0 2px 8px rgba(0,0,0,0.03);
                  }
                  .cwi-au-offcanvas .offcanvas-header h5 {
                      font-weight: 700;
                      letter-spacing: -0.01em;
                  }
                  .cwi-au-submit-btn {
                      border: none;
                      border-radius: 0.65rem;
                      font-weight: 600;
                      padding: 0.55rem 1.4rem;
                      background: linear-gradient(135deg, #0d6efd, #6610f2);
                      transition: transform 0.15s ease, box-shadow 0.15s ease, filter 0.15s ease;
                  }
                  .cwi-au-submit-btn:hover:not(:disabled) {
                      transform: translateY(-1px);
                      box-shadow: 0 6px 14px rgba(13,110,253,0.3);
                      filter: brightness(1.05);
                  }
                  .cwi-au-submit-btn:disabled {
                      opacity: 0.75;
                  }
                  .cwi-au-close-btn {
                      transition: transform 0.15s ease, opacity 0.15s ease;
                  }
                  .cwi-au-close-btn:hover {
                      transform: rotate(90deg);
                  }
                  .cwi-au-offcanvas .offcanvas-body {
                      padding: 1.75rem;
                  }
                  .cwi-au-offcanvas .form-label {
                      font-weight: 600;
                      font-size: 0.85rem;
                      color: #4b5566;
                      margin-bottom: 0.4rem;
                  }
                  .cwi-au-offcanvas .form-control,
                  .cwi-au-offcanvas .form-select,
                  .cwi-au-offcanvas .ant-select-selector {
                      border-radius: 0.6rem !important;
                      border-color: rgba(0,0,0,0.12) !important;
                      transition: box-shadow 0.15s ease, border-color 0.15s ease;
                  }
                  .cwi-au-offcanvas .form-control:focus,
                  .cwi-au-offcanvas .form-select:focus,
                  .cwi-au-offcanvas .ant-select-focused .ant-select-selector {
                      box-shadow: 0 0 0 0.2rem rgba(13,110,253,0.15) !important;
                      border-color: #0d6efd !important;
                  }
                  .cwi-au-offcanvas .input-group-text {
                      border-radius: 0.6rem 0 0 0.6rem !important;
                      background-color: #f8f9fb;
                      font-weight: 600;
                      color: #4b5566;
                  }
                  .cwi-au-image-upload {
                      display: flex;
                      align-items: center;
                      gap: 1rem;
                  }
                  .cwi-au-image-preview {
                      width: 64px;
                      height: 64px;
                      border-radius: 0.75rem;
                      border: 1.5px dashed rgba(0,0,0,0.18);
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      overflow: hidden;
                      flex-shrink: 0;
                      background: #f8f9fb;
                  }
                  .cwi-au-image-preview img {
                      width: 100%;
                      height: 100%;
                      object-fit: cover;
                  }
                `}
            </style>
            <form autoComplete="off" onSubmit={handleSubmit}>
                <div className="offcanvas-header d-flex justify-content-between align-items-center">
                    <h5 id="offcanvasRightLabel" className="mb-0">Add User</h5>
                    <div className="d-flex align-items-center">
                        <button className="btn btn-sm me-2 cwi-au-submit-btn text-white" type="submit" disabled={addSubmitLoading}>
                            {addSubmitLoading ? "Submitting..." : "Submit"}
                        </button>
                        <button
                            type="button"
                            className="btn-close cwi-au-close-btn"
                            data-bs-dismiss="offcanvas"
                            aria-label="Close"
                        ></button>
                    </div>
                </div>
                <div className="offcanvas-body" style={{ maxHeight: "42rem", overflowY: "auto" }}>
                    <div className="row">
                        <div className="col-6 mb-2">
                            <label className="form-label">User Name<span className="text-danger">*</span></label>
                            <input
                                type="text"
                                name="Name"
                                className="form-control"
                                placeholder="Enter user name"
                                value={formData.Name}
                                onChange={handleInputChange}
                                autoComplete="off"
                                required
                            />
                        </div>
                        <div className="col-6 mb-2 position-relative">
                            <label className="form-label">
                                Password <span className="text-danger">*</span>
                            </label>
                            <div className="input-group">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    name="Password"
                                    className="form-control"
                                    placeholder="Enter password"
                                    value={formData.Password}
                                    autoComplete="new-password"
                                    onChange={handleInputChange}
                                    required
                                />
                                <span className="input-group-text" style={{ cursor: "pointer" }} onClick={togglePasswordVisibility}>
                                    {showPassword ? <i className="fa-regular fa-eye"></i> : <i className="fa-regular fa-eye-slash"></i>}
                                </span>
                            </div>
                        </div>

                        <div className="col-6 mb-2">
                            <label className="form-label">Department<span className="text-danger">*</span></label>
                            <Select
                                showSearch
                                allowClear
                                placeholder="Select Department"
                                className="w-100"
                                value={formData.DeptId || undefined}
                                style={{ height: "3.2rem" }}
                                onChange={(value) => handleInputChange(value, "DeptId")}
                                optionFilterProp="label"
                                filterOption={(input, option) =>
                                    String(option?.label ?? "")
                                        .toLowerCase()
                                        .includes(input.toLowerCase())
                                }
                                options={departmentsData?.map((dept) => ({
                                    value: dept.ItemId,
                                    label: dept.ItemValue || dept.DisplayValue || "",
                                }))}
                            />
                        </div>

                        <div className="col-6 mb-2">
                            <label className="form-label">
                                Role <span className="text-danger">*</span>
                            </label>
                            <Select
                                showSearch
                                allowClear
                                placeholder="Select Role"
                                className="w-100"
                                value={formData.RoleId || undefined}
                                style={{ height: '3.2rem' }}
                                onChange={(value) => handleInputChange(value, "RoleId")}
                                optionFilterProp="children"
                                filterOption={(input, option) =>
                                    option.children.toLowerCase().includes(input.toLowerCase())
                                }
                            >
                                {rolesData?.map((role) => (
                                    <Option key={role.Id} value={role.Id}>
                                        {role.Name}
                                    </Option>
                                ))}
                            </Select>
                        </div>

                        <div className="col-6 mb-2">
                            <label className="form-label">Mobile<span className="text-danger">*</span></label>
                            <div className="input-group">
                                <span className="input-group-text">IN +91</span>
                                <input
                                    type="tel"
                                    name="Mobile"
                                    className="form-control"
                                    placeholder="Enter 10-digit mobile number"
                                    value={formData.Mobile}
                                    onChange={handleInputChange}
                                    maxLength={10}
                                    pattern="[0-9]{10}"
                                    required
                                />
                            </div>
                        </div>

                        <div className="col-6 mb-2">
                            <label className="form-label">Email<span className="text-danger">*</span></label>
                            <input
                                type="email"
                                name="Email"
                                className={`form-control ${emailError ? 'is-invalid' : ''}`}
                                placeholder="Enter email address"
                                value={formData.Email}
                                onChange={handleInputChange}
                                required
                            />
                            {emailError && <div className="invalid-feedback">{emailError}</div>}
                        </div>
                        <div className="col-6 mb-2">
                            <label className="form-label">Gender<span className="text-danger">*</span></label>
                            <select
                                className="form-select"
                                name="Gender"
                                value={formData.Gender}
                                onChange={handleInputChange}
                                required
                            >
                                <option value="">Select Gender</option>
                                <option value="1">Male</option>
                                <option value="0">Female</option>
                            </select>
                        </div>

                        <div className="col-6 mb-2 d-flex flex-column">
                            <label className="form-label">Manager<span className="text-danger">*</span></label>
                            <Select
                                placeholder="Select Manager"
                                showSearch
                                allowClear
                                filterOption={(input, option) =>
                                    option?.children?.toLowerCase().includes(input.toLowerCase())
                                }
                                value={formData.ManagerId || undefined}
                                onChange={(value) => handleInputChange(value, "ManagerId")}
                                style={{ height: '3.3rem' }}
                            >
                                {manager?.map((item) => (
                                    <Option key={item.Id} value={item.Id}>
                                        {item.Name}
                                    </Option>
                                ))}
                            </Select>
                        </div>
                        <div className="col-6 mb-2 d-flex flex-column">
                            <label className="form-label">Superior<span className="text-danger">*</span></label>
                            <Select
                                placeholder="Select Manager"
                                showSearch
                                allowClear
                                value={formData.IsSuperiorId || undefined}
                                onChange={(value) =>
                                    handleInputChange(value, "IsSuperiorId")
                                }
                                filterOption={(input, option) =>
                                    String(option?.label ?? "")
                                        .toLowerCase()
                                        .includes(input.toLowerCase())
                                }
                                options={usersData?.map((item) => ({
                                    value: item.ItemId,
                                    label: `${item.ItemValue} - ${item.DisplayValue}`,
                                }))}
                                style={{ height: "3.3rem" }}
                            />
                        </div>
                        <div className="col-6 mb-2 d-flex flex-column">
                            <label className="form-label">Modules<span className="text-danger">*</span></label>
                            <Select
                                mode="multiple"
                                placeholder="Select Modules"
                                showSearch
                                allowClear
                                filterOption={(input, option) =>
                                    option?.children?.toLowerCase().includes(input.toLowerCase())
                                }
                                value={selectedModules}
                                onChange={(values) => setSelectedModules(values)}
                                style={{ minHeight: '3.3rem' }}
                            >
                                {modulesData?.map((item) => (
                                    <Option key={item.Id} value={item.Id}>
                                        {item.ModuleName}
                                    </Option>
                                ))}
                            </Select>
                        </div>

                        <div className="col-6 mb-2">
                            <label className="form-label">Profile Image</label>
                            <div className="cwi-au-image-upload">
                                <div className="flex-grow-1">
                                    <input
                                        type="file"
                                        className="form-control"
                                        accept="image/png, image/jpeg, image/jpg"
                                        onChange={handleImageChange}
                                    />
                                    <div className="form-text">Only PNG, JPG, JPEG allowed</div>
                                </div>
                                <div className="d-flex flex-column align-items-center">
                                    <div className="cwi-au-image-preview">
                                        {imagePreview ? (
                                            <img src={imagePreview} alt="Preview" />
                                        ) : (
                                            <i className="fa-regular fa-image text-muted"></i>
                                        )}
                                    </div>
                                    <span className="form-text mt-1" style={{ fontSize: '0.7rem' }}>
                                        {imagePreview ? 'Preview' : 'No image selected'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}