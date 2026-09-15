import React, { useEffect, useState } from "react";
import Swal from 'sweetalert2';
import { BASE_API } from "../Config/Config";
import PropTypes from "prop-types";
import { Select } from 'antd';
import { fetchWithAuth } from "../../utils/api";

export default function EditUser({ editObj }) {

  const { Option } = Select;
  const [sessionUserData, setsessionUserData] = useState({});
  const [rolesData, setRolesData] = useState([]);
  const [departmentsData, setDepartmentsData] = useState([]);
  const [usersData, setUsersData] = useState([]);
  const [modulesData, setModulesData] = useState([]);
  const [selectedModules, setSelectedModules] = useState([]);
  const [editSubmitLoading, setEditSubmitLoading] = useState(false);
  const [manager, setManager] = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [newImagePreview, setNewImagePreview] = useState(null);
  const [existingImageUrl, setExistingImageUrl] = useState(null);

  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  const [formData, setFormData] = useState({
    Id: '',
    RoleId: "",
    Name: "",
    Password: "",
    IsActive: 1,
    CreatedBy: "",
    OrgId: "",
    DeptId: "",
    Mobile: "",
    Email: "",
    IsMobile: false,
    Gender: "",
    ManagerId: "",
    IsSuperiorId: "",
    UpdatedBy: sessionUserData.Id,
  });

  // Fetch session user data
  useEffect(() => {
    const userDataString = sessionStorage.getItem("userData");
    if (userDataString) {
      const userData = JSON.parse(userDataString);
      setsessionUserData(userData);
      setFormData((prev) => ({
        ...prev,
        CreatedBy: userData.Id,
        UpdatedBy: userData.Id
      }));
    }
  }, []);

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

  // Fetch roles data
  const fetchRolesData = async () => {
    try {
      if (sessionUserData && sessionUserData?.OrgId) {
        const response = await fetch(`${BASE_API}AdminRoutes/getRoles?OrgId=${sessionUserData.OrgId}`);
        if (response.ok) {
          const data = await response.json();
          setRolesData(data.ResultData);
        } else {
          console.error("Failed to fetch roles:", response.statusText);
        }
      }
    } catch (error) {
      console.error("Error fetching roles:", error.message);
    }
  };

  // Same DDL call (and same sessionStorage cache key) that AddUser.jsx uses
  // for Users/Departments — reused here rather than re-fetching, since both
  // forms need the same org-scoped lists.
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

  // Clean up the object URL created for a newly chosen image preview
  useEffect(() => {
    return () => {
      if (newImagePreview) URL.revokeObjectURL(newImagePreview);
    };
  }, [newImagePreview]);

  useEffect(() => {
    if (editObj) {

        setFormData({
            Id: editObj.Id,
            RoleId: editObj.RoleId || "",
            Name: editObj.Name || "",
            Password: editObj.Password || "",
            IsActive: 1,
            CreatedBy: editObj.CreatedBy || "",
            OrgId: editObj.OrgId || "",
            DeptId: editObj.DeptId || "",
            Mobile: editObj.Mobile || "",
            Email: editObj.Email || "",
            IsMobile: editObj.IsMobile ? 1 : 0,
            Gender: editObj.Gender ? 1 : 0,
            ManagerId: editObj.ManagerId || "",
            IsSuperiorId: editObj.IsSuperiorId || "",
            UpdatedBy: sessionUserData.Id,
        });

        // Convert module IDs to numbers
        const moduleIds =
            typeof editObj.AccessToModules === "string"
                ? editObj.AccessToModules
                    .split(",")
                    .filter(Boolean)
                    .map(Number)
                : Array.isArray(editObj.AccessToModules)
                    ? editObj.AccessToModules.map(Number)
                    : [];

        setSelectedModules(moduleIds);

        setExistingImageUrl(editObj.ImageUrl || null);
        setImageFile(null);
        setNewImagePreview(null);
    }
}, [editObj, sessionUserData.Id]);

  // Handle form input changes
  const handleInputChange = (e) => {
    setEmailError("");

    const { name, value, type, checked } = e.target;

    if (name === "Mobile") {
        // Allow only digits, max 10 characters
        if (!/^\d{0,10}$/.test(value)) {
            Swal.fire({
                title: "Invalid Input",
                text: "Please enter only numbers (max 10 digits) without letters or special characters.",
                icon: "error",
            });
            return;
        }
    }

    let formattedValue = value;

    // Name, City and Department formatting
    if (
        name === "Name" ||
        name === "City" ||
        name === "Department"
    ) {
        formattedValue = value
            .replace(/\s+/g, " ")
            .replace(/(^|[\s.])([a-z])/g, (match, separator, letter) => {
                return separator + letter.toUpperCase();
            });
    }

    setFormData((prevState) => ({
        ...prevState,
        [name]: type === "checkbox"
            ? checked
            : formattedValue,
    }));
};

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) {
      setImageFile(null);
      setNewImagePreview(null);
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

    setImageFile(file);
    setNewImagePreview(URL.createObjectURL(file));
  };

  const validateEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.(com|in|gov|tech|info|org|net|us|edu|shop|dev)$/i;
    return regex.test(email);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setEditSubmitLoading(true);

    if (!/^\d{10}$/.test(formData.Mobile)) {
      Swal.fire({
        title: "Invalid Mobile Number",
        text: "Mobile number must be exactly 10 digits.",
        icon: "error",
      });
      setEditSubmitLoading(false);
      return;
    }

    if (!validateEmail(formData.Email)) {
      setEmailError('Please enter a valid email ending with ex: .com or .in');
      setEditSubmitLoading(false);
      return;
    }

    try {
      // Switched from a JSON body to FormData so a replacement profile
      // image (a File, which JSON.stringify can't serialize) can travel in
      // the same request — mirrors AddUser.jsx's payload shape.
      const payload = new FormData();
      payload.append("Id", formData.Id || "");
      payload.append("RoleId", formData.RoleId || "");
      payload.append("Name", formData.Name || "");
      payload.append("DeptId", formData.DeptId || "");
      payload.append("Password", formData.Password || "");
      payload.append("IsActive", 1);
      payload.append("CreatedBy", formData.CreatedBy || "");
      payload.append("OrgId", formData.OrgId || "");
      payload.append("Mobile", formData.Mobile || "");
      payload.append("Email", formData.Email || "");
      payload.append("IsMobile", formData.IsMobile ? "1" : "0");
      payload.append("Gender", formData.Gender ?? "");
      payload.append("ManagerId", formData.ManagerId || "");
      payload.append("IsSuperiorId", formData.IsSuperiorId || "");
      payload.append("AccessToModules", selectedModules.join(","));
      payload.append("UpdatedBy", formData.UpdatedBy || "");

      // New photo chosen → send the File; otherwise send back the existing
      // saved URL so the backend doesn't lose/clear the current photo.
      if (imageFile) {
        payload.append("ImageUrl", imageFile);
      } else if (existingImageUrl) {
        payload.append("ImageUrl", existingImageUrl);
      }

      const response = await fetchWithAuth(`AdminRoutes/UPDTUsers`, {
        method: "POST",
        body: payload,
      });

      const data = await response.json();

      if (data.ResultData?.Status === 'Success') {
        Swal.fire({
          title: "Success",
          text: "User has been updated successfully.",
          icon: "success",
        }).then(() => window.location.reload());
      } else {
        Swal.fire({
          title: "Error",
          text: data?.ResultData?.ResultMessage || "Failed to update user.",
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

  const toTitleCase = (str) => {
    return str
      .split(/([.\s])/g) // Split and preserve dots and spaces
      .map(part =>
        /[a-zA-Z]/.test(part) ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase() : part
      )
      .join('');
  };


  return (
    <div
      className="offcanvas offcanvas-end cwi-eu-offcanvas"
      tabIndex="-1"
      id="offcanvasRightEdit"
      aria-labelledby="offcanvasRightLabel"
      style={{ width: "90%" }}
    >
      <style>
        {`
          @media (min-width: 768px) { /* Medium devices and up (md) */
              #offcanvasRightEdit {
                  width: 45% !important;
              }
          }
          .cwi-eu-offcanvas .offcanvas-header {
              padding: 1.25rem 1.75rem;
              border-bottom: 1px solid rgba(0,0,0,0.06);
              box-shadow: 0 2px 8px rgba(0,0,0,0.03);
          }
          .cwi-eu-offcanvas .offcanvas-header h5 {
              font-weight: 700;
              letter-spacing: -0.01em;
          }
          .cwi-eu-submit-btn {
              border: none;
              border-radius: 0.65rem;
              font-weight: 600;
              padding: 0.55rem 1.4rem;
              background: linear-gradient(135deg, #0d6efd, #6610f2);
              transition: transform 0.15s ease, box-shadow 0.15s ease, filter 0.15s ease;
          }
          .cwi-eu-submit-btn:hover:not(:disabled) {
              transform: translateY(-1px);
              box-shadow: 0 6px 14px rgba(13,110,253,0.3);
              filter: brightness(1.05);
          }
          .cwi-eu-submit-btn:disabled {
              opacity: 0.75;
          }
          .cwi-eu-close-btn {
              transition: transform 0.15s ease, opacity 0.15s ease;
          }
          .cwi-eu-close-btn:hover {
              transform: rotate(90deg);
          }
          .cwi-eu-offcanvas .offcanvas-body {
              padding: 1.75rem;
          }
          .cwi-eu-offcanvas .form-label {
              font-weight: 600;
              font-size: 0.85rem;
              color: #4b5566;
              margin-bottom: 0.4rem;
          }
          .cwi-eu-offcanvas .form-control,
          .cwi-eu-offcanvas .form-select,
          .cwi-eu-offcanvas .ant-select-selector {
              border-radius: 0.6rem !important;
              border-color: rgba(0,0,0,0.12) !important;
              transition: box-shadow 0.15s ease, border-color 0.15s ease;
          }
          .cwi-eu-offcanvas .form-control:focus,
          .cwi-eu-offcanvas .form-select:focus,
          .cwi-eu-offcanvas .ant-select-focused .ant-select-selector {
              box-shadow: 0 0 0 0.2rem rgba(13,110,253,0.15) !important;
              border-color: #0d6efd !important;
          }
          .cwi-eu-offcanvas .input-group-text {
              border-radius: 0.6rem 0 0 0.6rem !important;
              background-color: #f8f9fb;
              font-weight: 600;
              color: #4b5566;
          }
          .cwi-eu-image-upload {
              display: flex;
              align-items: center;
              gap: 1rem;
          }
          .cwi-eu-image-preview {
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
          .cwi-eu-image-preview img {
              width: 100%;
              height: 100%;
              object-fit: cover;
          }
        `}
      </style>

      <form onSubmit={handleSubmit}>
        <div className="offcanvas-header d-flex justify-content-between align-items-center">
          <h5 id="offcanvasRightLabel" className="mb-0">Edit User</h5>
          <div className="d-flex align-items-center">
            <button className="btn btn-sm me-2 cwi-eu-submit-btn text-white" type="submit" disabled={editSubmitLoading}>
              {editSubmitLoading ? "Submitting..." : "Submit"}
            </button>
            <button
              type="button"
              className="btn-close cwi-eu-close-btn"
              data-bs-dismiss="offcanvas"
              aria-label="Close"
            ></button>
          </div>
        </div>
        <div className="offcanvas-body" style={{ maxHeight: "42rem", overflowY: "auto" }}>
          <div className="row">
            <div className="col-6 mb-2">
              <label className="form-label">Name<span className="text-danger">*</span></label>
              <input
                type="text"
                name="Name"
                className="form-control"
                placeholder="Enter user name"
                value={formData.Name}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="col-6 mb-2">
              <label className="form-label">Department<span className="text-danger">*</span></label>
              <Select
                showSearch
                allowClear
                placeholder="Select Department"
                className="w-100"
                value={formData.DeptId || undefined}
                style={{ height: '3.2rem' }}
                onChange={(value) => setFormData((prev) => ({ ...prev, DeptId: value || "" }))}
                optionFilterProp="children"
                filterOption={(input, option) =>
                  option.children.toLowerCase().includes(input.toLowerCase())
                }
              >
                {departmentsData?.map((dept) => (
                  <Option key={dept.ItemId} value={dept.ItemId}>
                    {dept.DisplayValue}
                  </Option>
                ))}
              </Select>
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
                onChange={(value) => setFormData((prev) => ({ ...prev, RoleId: value }))}
                optionFilterProp="children"
                filterOption={(input, option) =>
                  option.children.toLowerCase().includes(input.toLowerCase())
                }
                style={{ height: '3.2rem' }}
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
              <label className="form-label">
                Manager <span className="text-danger">*</span>
              </label>
              <Select
                showSearch
                allowClear
                placeholder="Select Manager"
                name="ManagerId"
                style={{ width: '100%', height: '3.4rem' }}
                value={formData.ManagerId || undefined}
                onChange={(value) => handleInputChange({ target: { name: 'ManagerId', value } })}
                filterOption={(input, option) =>
                  option?.children?.toLowerCase().includes(input.toLowerCase())
                }
              >
                {Array.isArray(manager) &&
                  manager.map((item) => (
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
                filterOption={(input, option) =>
                  option?.children?.toLowerCase().includes(input.toLowerCase())
                }
                value={formData.IsSuperiorId || undefined}
                onChange={(value) => handleInputChange({ target: { name: 'IsSuperiorId', value } })}
                style={{ height: '3.3rem' }}
              >
                {usersData?.map((item) => (
                  <Option key={item.ItemId} value={item.ItemId}>
                    {item.ItemValue} - {item.DisplayValue}
                  </Option>
                ))}
              </Select>
            </div>
            <div className="col-12 mb-2 d-flex flex-column">
              <label className="form-label">Modules<span className="text-danger">*</span></label>
              <Select
    mode="multiple"
    placeholder="Select Modules"
    showSearch
    allowClear
    filterOption={(input, option) =>
        option?.children
            ?.toLowerCase()
            .includes(input.toLowerCase())
    }
    value={selectedModules}
    onChange={(values) => setSelectedModules(values)}
    style={{ minHeight: "3.4rem" }}
>
    {modulesData?.map((item) => (
        <Option key={item.Id} value={item.Id}>
            {item.ModuleName}
        </Option>
    ))}
</Select>
            </div>

            <div className="col-12 mb-2">
              <label className="form-label">Profile Image</label>
              <div className="cwi-eu-image-upload">
                <div className="flex-grow-1">
                  <input
                    type="file"
                    className="form-control"
                    accept="image/png, image/jpeg, image/jpg"
                    onChange={handleImageChange}
                  />
                  <div className="form-text">Only PNG, JPG, JPEG allowed — leave blank to keep the current photo</div>
                </div>
                <div className="d-flex flex-column align-items-center">
                  <div className="cwi-eu-image-preview">
                    {newImagePreview ? (
                      <img src={newImagePreview} alt="New preview" />
                    ) : existingImageUrl ? (
                      <img src={existingImageUrl} alt="Current" />
                    ) : (
                      <i className="fa-regular fa-image text-muted"></i>
                    )}
                  </div>
                  <span className="form-text mt-1" style={{ fontSize: '0.7rem' }}>
                    {newImagePreview ? 'New photo' : existingImageUrl ? 'Current photo' : 'No image selected'}
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

EditUser.propTypes = {
  editObj: PropTypes.object.isRequired,
};