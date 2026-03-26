import React, { useEffect, useState } from "react";
import Swal from 'sweetalert2';
import { VMS_URL, VMS_VISITORS } from "../Config/Config";
import { Select } from "antd";

export default function AddUser() {

    const [sessionUserData, setsessionUserData] = useState({});
    const [rolesData, setRolesData] = useState([]);
    const [addSubmitLoading, setAddSubmitLoading] = useState(false);
    const [isMobile, setIsMobile] = useState(0);
    const [isActive, setIsActive] = useState(0);
    const [manager, setManager] = useState([]);
    const [showPassword, setShowPassword] = useState(false);
    const [emailError, setEmailError] = useState('');
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
        Mobile: "",
        Email: "",
        IsMobile: 1,
        Gender: "",
        NotifyEmail: "",
        ManagerId: ""
    });

    const fetchManagerData = async () => {
        try {
            const response = await fetch(`${VMS_VISITORS}getManagers?OrgId=${sessionUserData.OrgId}`);
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

    useEffect(() => {
        if (sessionUserData.OrgId) {
            fetchManagerData();
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
                const response = await fetch(`${VMS_URL}getRoles?OrgId=${sessionUserData.OrgId}`);
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

    useEffect(() => {
        if (sessionUserData.OrgId) {
            fetchRolesData();
        }
    }, [sessionUserData]);

    // const handleInputChange = (eOrValue, nameFromSelect = null) => {
    //     // AntD Select: direct value + field name passed manually
    //     if (nameFromSelect) {
    //         setFormData((prev) => ({
    //             ...prev,
    //             [nameFromSelect]: eOrValue || "",
    //         }));
    //         return;
    //     }

    //     // Native input (text, checkbox, etc.)
    //     const { name, value, type, checked } = eOrValue.target;

    //     // Validate mobile number
    //     if (name === 'Mobile') {
    //         if (!/^\d{0,10}$/.test(value)) {
    //             Swal.fire({
    //                 title: "Invalid Input",
    //                 text: "Please enter a valid 10-digit mobile number without letters or special characters.",
    //                 icon: "error",
    //             });
    //             return;
    //         }
    //     }

    //     // Format name to Title Case
    //     let formattedValue = name === 'Name' ? toTitleCase(value) : value;

    //     setFormData((prevState) => ({
    //         ...prevState,
    //         [name]: type === "checkbox" ? (checked ? 1 : 0) : formattedValue,
    //     }));
    // };

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
        if (name === 'Mobile') {
            if (!/^\d{0,10}$/.test(value)) {
                Swal.fire({
                    title: "Invalid Input",
                    text: "Please enter a valid 10-digit mobile number without letters or special characters.",
                    icon: "error",
                });
                return;
            }
        }

        // Remove spaces from username and convert to title case
        let formattedValue = value;
        if (name === 'Name') {
            formattedValue = toTitleCase(value.replace(/\s+/g, '')); // Remove all spaces
        }

        setFormData((prevState) => ({
            ...prevState,
            [name]: type === "checkbox" ? (checked ? 1 : 0) : formattedValue,
        }));
    };


    const handleSubmit = async (e) => {
        e.preventDefault();
        setAddSubmitLoading(true);

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
            setEmailError('Please enter a valid email ending with ex: .com or .in');
            setAddSubmitLoading(false);
            return;
        }

        formData.IsActive = 1;
        formData.IsMobile = 1;

        const payload = {
            ...formData,
            IsMobile: 1,
            OrgId: sessionUserData.OrgId,
            CreatedBy: sessionUserData.Id,
        };

        // console.log(payload, 'data sending to api')
        try {
            const response = await fetch(`${VMS_URL}POSTUsers`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                const data = await response.json();
                if (data.ResultData?.Status === 'Success') {
                    Swal.fire({
                        title: "Success",
                        text: "User has been added successfully.",
                        icon: "success",
                    }).then(() => {
                        window.location.reload();
                    })
                } else {
                    Swal.fire({
                        title: "Error",
                        text: data.ResultData?.ResultMessage,
                        icon: "error",
                    });
                }
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
                    <h5 id="offcanvasRightLabel" className="mb-0">Add User</h5>
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
                <div className="offcanvas-body" style={{ marginTop: "-2rem", maxHeight: "42rem", overflowY: "auto" }}>
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
                                onKeyDown={(e) => {
                                    if (e.key === ' ') {
                                        e.preventDefault();
                                    }
                                }}
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
                                <span className="input-group-text">🇮🇳 +91</span>
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
                        {/* <div className="col-3 mt-10">
                            <label className="form-label" htmlFor="isactive" style={{ cursor: 'pointer' }}>Active</label>
                            <input
                                type="checkbox"
                                id="isactive"
                                className="ms-2"
                                checked={isActive === 1}
                                onChange={handleActiveChange}
                                style={{ cursor: 'pointer' }}
                            />
                        </div> */}
                    </div>
                </div>
            </form>
        </div>
    );
}
