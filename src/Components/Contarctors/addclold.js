import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import PropTypes from "prop-types";
import { VMS_URL_CONTRACTOR } from "../Config/Config";

export default function AddContactorCL({ conObj }) {
    //   console.log(editObj);

    const [sessionUserData, setSessionUserData] = useState([]);
    const [addSubmitLoading, setAddSubmitLoading] = useState(false);
    const [laboursData, setLaboursData] = useState([]);
    const [dataLoading, setDataLoading] = useState(false);

    const handleLabourInputChange = (index, field, value) => {
        setLaboursData((prev) =>
            prev.map((item, idx) =>
                idx === index ? { ...item, [field]: field === 'CLcount' ? parseInt(value || 0) : value } : item
            )
        );
    };

    // Add labour to list
    const addLabour = () => {
        setLaboursData((prev) => [
            ...(Array.isArray(prev) ? prev : []),
            {
                Id: 0,
                CheckInDate: new Date().toISOString().split("T")[0],
                CLcount: 0,
                CLCheckIns: 0
            }
        ]);
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
            const response = await fetch(`${VMS_URL_CONTRACTOR}getCLSCountByContractorId?ContractorId=${conObj?.Id}`);
            if (response.ok) {
                const data = await response.json();
                setLaboursData(data.ResultData);
                console.log(data);
            } else {
                setDataLoading(false);
                console.error('Failed to fetch attendance data:', response.statusText);
            }
        } catch (error) {
            setDataLoading(false);
            console.error('Error fetching attendance data:', error.message);
        } finally {
            setDataLoading(false);
        }
    };

    useEffect(() => {
        if (conObj.Id) {
            fetchData();
        }
    }, [conObj]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setAddSubmitLoading(true);
        const payload = {
            orgid: sessionUserData?.OrgId,
            userid: sessionUserData?.Id,
            ContractorId: conObj?.Id,
            CLCountData: laboursData.map(item => ({
                Id: item.Id || 0,
                ContractorId: conObj?.Id,
                CLcount: parseInt(item.CLcount || 0),
                CheckInDate: item.CheckInDate,
                CLCheckIns: item.CLCheckIns || 0,
                IsActive: 1
            }))
        };
        console.log('ManageCLCount',payload);

        try {
            const response = await fetch(`${VMS_URL_CONTRACTOR}ManageCLCount`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            const result = await response.json();
            console.log(result);

            if (response.ok) {
                if (result[0].Success === 1) {
                    setAddSubmitLoading(false);
                    Swal.fire({
                        title: "Success",
                        text: "Labour added successfully!",
                        icon: "success"
                    }).then(() => {
                        window.location.reload();
                    });
                }
            } else {
                setAddSubmitLoading(false);
                Swal.fire("Error", result?.message || "Failed to add labour!", "error");
            }
        } catch (error) {
            setAddSubmitLoading(false);
            console.error("Error submitting form:", error);
            Swal.fire("Error", "Something went wrong!", "error");
        }
    };

    const handleDeleteRow = async (index, id) => {
        if (id === 0) {
            // Row was just added, remove directly
            setLaboursData(prev => prev.filter((_, i) => i !== index));
        } else {
            // Row exists on the server, call delete API
            try {
                const response = await fetch(`${VMS_URL_CONTRACTOR}InactiveCLDate`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ Id: id })
                });

                const result = await response.json();
                // console.log(result)

                if (response.ok && result['ResultData'][0].Status === 'Success') {
                    Swal.fire("Deleted!", "Data has been deleted successfully.", "success");
                    setLaboursData(prev => prev.filter((_, i) => i !== index));
                } else {
                    Swal.fire("Error", result?.message || "Failed to delete the data.", "error");
                }
            } catch (error) {
                console.error("Delete failed:", error);
                Swal.fire("Error", "An error occurred while deleting the row.", "error");
            }
        }
    };

    const getMinDate = () => {
        const today = new Date();
        return today.toISOString().split("T")[0];
    };
    
    const getAllowedSaturday = () => {
        const today = new Date();
        const day = today.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
        const daysUntilNextSaturday = day <= 4 ? 6 - day : 13 - day; // Thu or earlier = this Sat; Fri–Sun = next Sat
        const saturday = new Date(today);
        saturday.setDate(today.getDate() + daysUntilNextSaturday);
        return saturday.toISOString().split("T")[0];
    };
    

    return (
        <div
            className="offcanvas offcanvas-end"
            tabIndex="-1"
            id="offcanvasRightAddCL"
            aria-labelledby="offcanvasRightLabel"
            style={{ width: '75%' }}
        >
            <style>
                {`
                  @media (min-width: 768px) { /* Medium devices and up (md) */
                      #offcanvasRightAddCL {
                          width: 50% !important;
                      }
                  }
              `}
            </style>
            <form onSubmit={handleSubmit}>
                <div className="offcanvas-header d-flex justify-content-between align-items-center">
                    <h5 id="offcanvasRightLabel" className="mb-0">Request Contracting Agency</h5>
                    <div className="d-flex align-items-center">
                        <button
                            className="btn btn-primary me-2"
                            type="submit"
                            disabled={addSubmitLoading}
                        >
                            {addSubmitLoading ? "Updating..." : "Update"}
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
                                <h5 className="card-title text-primary fw-bold">Agency Details</h5>
                                <hr />
                                <div className="row g-3">
                                    <div className="col-md-6">
                                        <label className="form-label fw-semibold">Agency Name</label>
                                        <div className="bg-light p-2 rounded text-dark fw-medium">
                                            {conObj?.ContractorName || "N/A"}
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label fw-semibold">Agency Mobile No</label>
                                        <div className="bg-light p-2 rounded text-dark fw-medium">
                                            {conObj?.PhoneNumber || "N/A"}
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label fw-semibold">Agency Email</label>
                                        <div className="bg-light p-2 rounded text-dark fw-medium">
                                            {conObj?.Email || "N/A"}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="d-flex mt-3">
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
                                        <th>Date</th>
                                        <th className="text-center">CL Count</th>
                                        <th className="text-center">Checkin Count</th>
                                        <th className="text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {dataLoading ? (
                                        <tr>
                                            <td colSpan="5" className="text-center text-dark py-3">
                                                Loading...
                                            </td>
                                        </tr>
                                    ) : laboursData?.length > 0 ? (
                                        laboursData.map((item, idx) => (
                                            <tr key={idx}>
                                                <td>{idx + 1}</td>
                                                <td>
                                                    <input
                                                        className="form-control"
                                                        type="date"
                                                        style={{
                                                            width: '100%',
                                                            padding: '0.2rem',
                                                            fontSize: '0.8rem',
                                                        }}
                                                        value={item.CheckInDate ? item.CheckInDate.split("T")[0] : ""}
                                                        onChange={(e) => handleLabourInputChange(idx, 'CheckInDate', e.target.value)}
                                                        min={getMinDate()}
                                                        max={getAllowedSaturday()}
                                                    />
                                                </td>
                                                <td className="text-center">
                                                    <input
                                                        className="form-control d-flex m-auto"
                                                        type="number"
                                                        value={item.CLcount}
                                                        onChange={(e) => handleLabourInputChange(idx, 'CLcount', e.target.value)}
                                                        onWheel={(e) => e.target.blur()}
                                                        style={{ width: '6rem', padding: '0.2rem', fontSize: '0.8rem' }}
                                                    />
                                                </td>
                                                <td className="text-center fw-semibold text-success">{item.CLCheckIns || 0}</td>
                                                <td className="text-center">
                                                    <i
                                                        className="fa-regular fa-trash-can fs-5 text-danger cursor-pointer"
                                                        onClick={() => handleDeleteRow(idx, item.Id)}
                                                    ></i>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="5" className="text-center text-muted py-3">
                                                No labour data found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>

                            </table>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}

AddContactorCL.propTypes = {
    conObj: PropTypes.object.isRequired,
};
