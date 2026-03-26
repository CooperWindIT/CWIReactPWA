import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import PropTypes from "prop-types";
import { fetchWithAuth } from "../../utils/api";

export default function EditContactor({ editObj }) {
    //   console.log(editObj);

    const [sessionUserData, setSessionUserData] = useState([]);
    const [editSubmitLoading, setEditSubmitLoading] = useState(false);
    const [emailError, setEmailError] = useState('');

    const [formData, setFormData] = useState({
        ContractorName: "",
        Email: "",
        CLCount: 0,
        PhoneNumber: "",
        UpdatedBy: "",
        OrgId: "",
        Id: "",
    });

    useEffect(() => {
        const userDataString = sessionStorage.getItem("userData");
        if (userDataString) {
            const userData = JSON.parse(userDataString);
            setSessionUserData(userData);
        } else {
            console.log("User data not found in sessionStorage");
        }
    }, []);

    useEffect(() => {
        if (editObj) {
            setFormData({
                ContractorName: editObj.ContractorName || "",
                Email: editObj?.Email || "",
                CLCount: editObj?.CLCount || 0,
                PhoneNumber: editObj?.PhoneNumber || "",
                UpdatedBy: sessionUserData.UserId || "",
                OrgId: editObj?.OrgId || "",
                Id: editObj?.Id || "",
            });
        }
    }, [editObj, sessionUserData]);

    const toTitleCase = (str) => {
        return str
            .split(/([.\s])/g) // Split and preserve dots and spaces
            .map(part =>
                /[a-zA-Z]/.test(part) ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase() : part
            )
            .join('');
    };

    const handleContactorChange = (e) => {
        setEmailError("");
        const { name, value } = e.target;

        const mobileFieldNames = ["ContractorMobileNo", "PhoneNumber"];

        if (mobileFieldNames.includes(name)) {
            if (!/^\d{0,10}$/.test(value)) {
                Swal.fire({
                    title: "Invalid Input",
                    text: "Please enter a valid 10-digit mobile number without letters or special characters.",
                    icon: "error",
                });
                return;
            }
        }

        const updatedValue = name === 'ContractorName' ? toTitleCase(value) : value;

        setFormData((prevState) => ({
            ...prevState,
            [name]: updatedValue,
        }));
    };


    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!/^\d{10}$/.test(formData.PhoneNumber)) {
            Swal.fire({
                title: "Invalid Mobile Number",
                text: "Phone number must be exactly 10 digits.",
                icon: "error",
            });
            return;
        }

        if (!validateEmail(formData.Email)) {
            setEmailError('Please enter a valid email ending with ex: .com or .in');
            setEditSubmitLoading(false);
            return;
        }

        try {
            setEditSubmitLoading(true);

            const payload = {
                ContractorName: formData.ContractorName,
                PhoneNumber: formData.PhoneNumber,
                Email: formData.Email,
                CLCount: 0,
                OrgId: sessionUserData.OrgId,
                Id: formData.Id,
                UpdatedBy: sessionUserData.Id,
            };
            console.log(payload);

            const response = await fetchWithAuth(
                `contractor/UPDTContractors`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(payload),
                }
            );

            if (response.ok) {
                const data = await response.json();
                setEditSubmitLoading(false);
                // console.log(data.ResultData);

                if (data.ResultData.Status === 'Success') {
                    Swal.fire({
                        title: "Success",
                        text: "The contractor details have been updated successfully.",
                        icon: "success",
                    }).then(() => {
                        window.location.reload();
                    });
                } else {
                    Swal.fire({
                        title: "Error",
                        text: data?.ResultData?.ResultMessage || "Failed to update the contractor.",
                        icon: "error",
                    });
                }
            } else {
                Swal.fire({
                    title: "Error",
                    text: "Failed to submit the request.",
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

    const validateEmail = (email) => {
        const regex = /^[^\s@]+@[^\s@]+\.(com|in|gov|tech|info|org|net|us|edu|shop|dev)$/i;
        return regex.test(email);
    };

    return (
        <div
            className="offcanvas offcanvas-end"
            tabIndex="-1"
            id="offcanvasRightEdit"
            aria-labelledby="offcanvasRightLabel"
            style={{ width: '85%' }}
        >
            <style>
                {`
                  @media (min-width: 768px) { /* Medium devices and up (md) */
                      #offcanvasRightEdit {
                          width: 30% !important;
                      }
                  }
              `}
            </style>
            <form onSubmit={handleSubmit}>
                <div className="offcanvas-header d-flex justify-content-between align-items-center">
                    <h5 id="offcanvasRightLabel" className="mb-0">
                        Edit Requested Contracting Agency
                    </h5>
                    <div className="d-flex align-items-center">
                        <button
                            className="btn btn-primary me-2 btn-sm d-none d-md-block"
                            type="submit"
                            disabled={editSubmitLoading}
                        >
                            <i className="bi bi-bookmark-check"></i>{editSubmitLoading ? "Updating..." : "Update"}
                        </button>
                        <button
                            type="button"
                            className="btn-close"
                            data-bs-dismiss="offcanvas"
                            aria-label="Close"
                        ></button>
                    </div>
                </div>
                <div
                    className="offcanvas-body"
                    style={{
                        marginTop: "-2rem",
                        maxHeight: "42rem",
                        overflowY: "auto",
                    }}
                >
                    <div className="row">
                        <div className="col-12 mb-2">
                            <label className="form-label">Agency Name<span className="text-danger">*</span></label>
                            <input
                                type="text"
                                name="ContractorName"
                                className="form-control"
                                placeholder="Enter agency name"
                                value={formData.ContractorName}
                                onChange={handleContactorChange}
                            />
                        </div>
                        <div className="col-12 mb-2">
                            <label className="form-label">Agency Mobile No<span className="text-danger">*</span></label>
                            <div className="input-group">
                                <span className="input-group-text">🇮🇳 +91</span>
                                <input
                                    type="tel"
                                    name="PhoneNumber"
                                    className="form-control"
                                    placeholder="Enter 10-digit mobile number"
                                    value={formData.PhoneNumber}
                                    onChange={handleContactorChange}
                                    maxLength={10}
                                    pattern="[0-9]{10}"
                                    required
                                />
                            </div>
                        </div>

                        <div className="col-12 mb-2">
                            <label className="form-label">Agency Email<span className="text-danger">*</span></label>
                            <input
                                type="email"
                                name="Email"
                                className={`form-control ${emailError ? 'is-invalid' : ''}`}
                                placeholder="Enter agency email"
                                value={formData.Email}
                                onChange={handleContactorChange}
                            />
                            {emailError && <div className="invalid-feedback">{emailError}</div>}
                        </div>
                    </div>
                </div>
                <div className="d-md-none d-flex justify-content-center mb-3">
                    <button
                        className="btn btn-primary btn-sm"
                        type="submit"
                        disabled={editSubmitLoading}
                    >
                        <i className="bi bi-bookmark-check"></i>{editSubmitLoading ? "Submitting..." : "Submit"}
                    </button>
                </div>
            </form>
        </div>
    );
}

EditContactor.propTypes = {
    editObj: PropTypes.object.isRequired,
};
