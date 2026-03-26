import React, { useEffect, useState } from "react";
import Swal from 'sweetalert2';
import PropTypes from 'prop-types'
import { fetchWithAuth } from "../../../utils/api";

export default function EditTechnician({ editObj }) {

    const [sessionUserData, setsessionUserData] = useState({});
    const [addSubmitLoading, setAddSubmitLoading] = useState(false);

    const [formData, setFormData] = useState({
        OrgId: "",
        Name: "",
        PhoneNumber: "",
        Email: "",
        CreatedBy: "",
        Organization: "",
    });

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

    useEffect(() => {
        if (editObj) {
          setFormData({
            Id: editObj.Id,
            Email: editObj.Email || "",
            Name: editObj.Name || "",
            PhoneNumber: editObj.PhoneNumber || "",
            UpdatedBy: sessionUserData.Id,
            Organization: editObj.Organization,
          });
        }
      }, [editObj, sessionUserData.Id]);

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
    
        // For Name and Organization: block invalid characters and apply title case
        if (['Name', 'Organization'].includes(name)) {
            if (/^[^a-zA-Z]/.test(formattedValue)) return; // disallow leading non-letter
            if (/[^a-zA-Z .]/.test(formattedValue)) return; // disallow special chars except space and dot
    
            formattedValue = toTitleCase(formattedValue);
        }
    
        // For phone number: allow only digits, max 10
        if (name === 'PhoneNumber') {
            if (!/^\d{0,10}$/.test(formattedValue)) {
                Swal.fire({
                    title: "Invalid Input",
                    text: "Please enter a valid 10-digit mobile number without letters or special characters.",
                    icon: "error",
                });
                return;
            }
        }
    
        setFormData((prevState) => ({
            ...prevState,
            [name]: formattedValue,
        }));
    };    

    const handleSubmit = async (e) => {
        e.preventDefault();
        setAddSubmitLoading(true);
        
        const formPayload = {
            OrgId: sessionUserData.OrgId,
            Name: formData.Name,
            PhoneNumber: formData.PhoneNumber,
            Email: formData.Email,
            UpdatedBy: sessionUserData.Id,
            Organization: formData.Organization,
            Id: editObj.Id,
        };        

        try {
            const response = await fetchWithAuth(`PMMS/EDITTechnicians`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(formPayload),
            });

            const result = await response.json();

            if (result.ResultData?.Status === "Success") {
                Swal.fire({
                    title: "Success",
                    text: "Technician has been updated successfully.",
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
            setAddSubmitLoading(false);
        }
    };

    const toTitleCase = (str) => {
        return str
            .split(/([.\s])/g)
            .map(part =>
                /[a-zA-Z]/.test(part) ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase() : part
            )
            .join('');
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
                        }import { PropTypes } from 'prop-types';

                    }
                `}
            </style>
            <form autoComplete="off" onSubmit={handleSubmit}>
                <div className="offcanvas-header d-flex justify-content-between align-items-center">
                    <h5 id="offcanvasRightLabel" className="mb-0">Edit Technician</h5>
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
                            <label className="form-label">Technician Name<span className="text-danger">*</span></label>
                            <input
                                type="text"
                                name="Name"
                                className="form-control"
                                placeholder="Enter technician name"
                                value={formData.Name}
                                onChange={handleInputChange}
                                autoComplete="off"
                                required
                            />
                        </div>
                        <div className="col-6 mb-2">
                            <label className="form-label">Organization Name<span className="text-danger">*</span></label>
                            <input
                                type="text"
                                name="Organization"
                                className="form-control"
                                placeholder="Enter organization name"
                                value={formData.Organization}
                                onChange={handleInputChange}
                                autoComplete="off"
                                required
                            />
                        </div>
                        <div className="col-6 mb-2">
                            <label className="form-label">Phone<span className="text-danger">*</span></label>
                            <input
                                type="text"
                                name="PhoneNumber"
                                className="form-control"
                                placeholder="Enter phonenumber"
                                value={formData.PhoneNumber}
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
                        <div className="col-6 mb-2">
                            <label className="form-label">Email<span className="text-danger">*</span></label>
                            <input
                                type="text"
                                name="Email"
                                className="form-control"
                                placeholder="Enter email"
                                value={formData.Email}
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
                    </div>
                </div>
            </form>
        </div>
    );
}

EditTechnician.propTypes = {
    editObj: PropTypes.object.isRequired,
};