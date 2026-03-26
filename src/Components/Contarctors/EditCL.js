import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import PropTypes from "prop-types";
import { VMS_URL_CONTRACTOR } from "../Config/Config";
import Axios from 'axios';

export default function EditContactorCL({ conObj }) {
    //   console.log(editObj);

    const [sessionUserData, setSessionUserData] = useState([]);
    const [editSubmitLoading, setEditSubmitLoading] = useState(false);
    const [shiftsData, setShiftsData] = useState([]);
    const [labours, setLabours] = useState([]); 
    const [dataLoading, setDataLoading] = useState(false); 

    const handleChange = (index, field, value) => {
        if (field === 'PhoneNumber') {
            if (!/^\d{0,10}$/.test(value)) {
                Swal.fire({
                    title: "Invalid Input",
                    text: "Please enter a valid 10-digit mobile number without letters or special characters.",
                    icon: "error",
                });
                return;
            }
        }
        setLabours((prevLabours) => {
            const updatedLabours = [...prevLabours];
            updatedLabours[index] = {
                ...updatedLabours[index],
                [field]: value,
            };
            return updatedLabours;
        });
    };
    
    // Add a new labour
    const addLabour = () => {
        setLabours([...labours, {
            Id: 0, // Id=0 indicates a new entry
            ContractorId: conObj?.Id,
            Name: "",
            PhoneNumber: "",
        }]);
    };
    
    // Remove a labour
    const removeLabour = async (index) => {
        const labourToRemove = labours[index];
    
        // For existing labours fetched from API
        if (labourToRemove.Id && labourToRemove.Id !== 0) {
            const payload = { Id: labourToRemove.Id };
            try {
                const response = await Axios.post(
                    `${VMS_URL_CONTRACTOR}InactiveLabors`, 
                    payload, 
                    { headers: { "Content-Type": "application/json" } }
                );
    
                const result = response.data;
                console.log(result.ResultData[0].Status);
                if (result.ResultData[0].Status == 'Success') {
                    Swal.fire("Success", "Labour removed successfully!", "success");
                    setLabours((prevLabours) =>
                        prevLabours.filter((_, i) => i !== index)
                    );
                } else {
                    Swal.fire("Error", result?.message || "Failed to remove labour!", "error");
                }
            } catch (error) {
                console.error("Error removing labour:", error);
                Swal.fire("Error", "Something went wrong!", "error");
            }
        } else {
            // For newly added labours (Id = 0)
            setLabours((prevLabours) =>
                prevLabours.filter((_, i) => i !== index)
            );
        }
    };    

    useEffect(() => {
        const userDataString = sessionStorage.getItem("userData");
        if (userDataString) {
            const userData = JSON.parse(userDataString);
            setSessionUserData(userData);
        } else {
            console.log("User data not found in sessionStorage");
        }
    }, []);

    const fetchData = async () => {
        setDataLoading(true);
        try {
            const response = await fetch(`${VMS_URL_CONTRACTOR}getCasualLabours?ContractorId=${conObj?.Id}`);
            if (response.ok) {
                const data = await response.json();
                setLabours(data.ResultData);
                console.log(data.ResultData);
            } else {
                console.error('Failed to fetch attendance data:', response.statusText);
            }
        } catch (error) {
            console.error('Error fetching attendance data:', error.message);
        } finally {
            setDataLoading(false);
        }
    };

    const fetchShiftsData = async () => {
        try {
            const response = await fetch(`${VMS_URL_CONTRACTOR}getShiftTimings?OrgId=${sessionUserData.OrgId}`);
            if (response.ok) {
                const data = await response.json();
                setShiftsData(data.ResultData);
            } else {
                console.error('Failed to fetch shifts data:', response.statusText);
            }
        } catch (error) {
            console.error('Error fetching shifts data:', error.message);
        } 
    };

    useEffect(() => {
        if (sessionUserData.OrgId) {
            fetchShiftsData();
        }
    }, [sessionUserData]);
    useEffect(() => {
        if (conObj.Id) {
            fetchData();
        }
    }, [conObj]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        // if (!formData.Name || !formData.PhoneNumber || !formData.ShiftTypeId || !formData.ValidStartDt || !formData.ValidEndDt) {
        //     Swal.fire("Error", "All fields are required!", "error");
        //     return;
        // }
        setEditSubmitLoading(true);
        const payload = {
            orgid: sessionUserData?.OrgId,
            userid: sessionUserData?.Id,
            CasualLabourData: labours
        };
        // console.log(payload);

        try {
            const response = await fetch(`${VMS_URL_CONTRACTOR}ManageCasualLabours`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            const result = await response.json();
            setEditSubmitLoading(false);
            // console.log(result);

            if (response.ok) {
                if (result[0].Success === 1) {
                    setEditSubmitLoading(false);
                    Swal.fire({
                        title: "Success",
                        text: "Labour added successfully!",
                        icon: "success"
                    }).then(() => {
                        window.location.reload(); 
                    });
                }
            } else {
                setEditSubmitLoading(false);
                Swal.fire("Error", result?.message || "Failed to add labour!", "error");
            }
        } catch (error) {
            setEditSubmitLoading(false);
            console.error("Error submitting form:", error);
            Swal.fire("Error", "Something went wrong!", "error");
        }
    };

    return (
        <div
            className="offcanvas offcanvas-end"
            tabIndex="-1"
            id="offcanvasRightEditCL"
            aria-labelledby="offcanvasRightLabel"
            style={{ width: '85%' }}
        >
            <style>
                {`
                  @media (min-width: 768px) { /* Medium devices and up (md) */
                      #offcanvasRightEditCL {
                          width: 45% !important;
                      }
                  }
              `}
            </style>
            <form onSubmit={handleSubmit}>
                <div className="offcanvas-header d-flex justify-content-between align-items-center">
                    <h5 id="offcanvasRightLabel" className="mb-0">
                        Edit Casual Labours
                    </h5>
                    <div className="d-flex align-items-center">
                        <button
                            className="btn btn-primary me-2"
                            type="submit"
                            disabled={editSubmitLoading}
                        >
                            {editSubmitLoading ? "Updating..." : "Update"}
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
                        flex: 1,
                        overflowY: 'auto',
                        paddingBottom: '2rem',
                        maxHeight: 'calc(100vh - 100px)',
                        marginTop: '-2rem'
                    }}
                >
                    <div className="row">
                        <div className="card p-3 shadow-sm border-0">
                            <div className="card-body">
                                <h5 className="card-title text-primary fw-bold">Contractor Details</h5>
                                <hr />
                                <div className="row g-3">
                                    <div className="col-md-4">
                                        <label className="form-label fw-semibold">Name</label>
                                        <div className="bg-light p-2 rounded text-dark fw-medium">
                                            {conObj?.ContractorName || "N/A"}
                                        </div>
                                    </div>
                                    <div className="col-md-4">
                                        <label className="form-label fw-semibold">Mobile No</label>
                                        <div className="bg-light p-2 rounded text-dark fw-medium">
                                            {conObj?.PhoneNumber || "N/A"}
                                        </div>
                                    </div>
                                    <div className="col-md-4">
                                        <label className="form-label fw-semibold">Email</label>
                                        <div className="bg-light p-2 rounded text-dark fw-medium">
                                            {conObj?.Email || "N/A"}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="d-flex mt-2">
                            <h6 className="text-start mt-1">Labour List:</h6>
                            <button className="btn btn-info d-flex ms-auto text-hover-primary" type="button" onClick={addLabour}>
                                <i className="fa-solid fa-person-circle-plus fs-3"></i>
                            </button>
                        </div>
                        <div className="table-responsive">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Name</th>
                                        <th>Mobile</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {labours && labours?.map((item, index) => (
                                        <tr key={index}>
                                            <td>{index + 1}</td>
                                            <td>
                                                <input
                                                    className="form-control"
                                                    type="text"
                                                    name="Name"
                                                    placeholder="Enter labour name"
                                                    value={item.Name}
                                                    onChange={(e) => handleChange(index, 'Name', e.target.value)}
                                                    required
                                                />
                                            </td>
                                            <td>
                                                <input
                                                    className="form-control"
                                                    type="text"
                                                    name="PhoneNumber"
                                                    placeholder="Enter mobiel no"
                                                    value={item.PhoneNumber}
                                                    onChange={(e) => handleChange(index, 'PhoneNumber', e.target.value)}
                                                    maxLength={10}
                                                    minLength={10}
                                                    required
                                                />
                                            </td>
                                            <td>
                                                <button
                                                    className="btn"
                                                    type="button"
                                                    onClick={() => removeLabour(index)}
                                                >
                                                    <i className="fa-regular fa-trash-can text-danger fs-3"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}

EditContactorCL.propTypes = {
    conObj: PropTypes.object.isRequired,
};
