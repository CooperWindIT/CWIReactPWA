import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import PropTypes from "prop-types";
import { VMS_URL_CONTRACTOR } from "../Config/Config";
import Axios from 'axios';

export default function CheckInContactorCL({ conObj }) {
    //   console.log(editObj);

    const [sessionUserData, setSessionUserData] = useState([]);
    const [editSubmitLoading, setEditSubmitLoading] = useState(false);
    const [labours, setLabours] = useState([]); 
    const [dataLoading, setDataLoading] = useState(false); 
    const [searchQuery, setSearchQuery] = useState('');

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
        if (conObj.Id) {
            fetchData();
        }
    }, [conObj]);

    const filteredLabours = labours?.filter((item) => {
        const nameMatch = item.Name?.toLowerCase().includes(searchQuery.toLowerCase());
        const codeMatch = (`CL-${item.Id}`).toLowerCase().includes(searchQuery.toLowerCase());
        return nameMatch || codeMatch;
    });

    const handleLaborCheckIn = async (item) => {
        console.log(item)
        const payload = {
            ContractorId: conObj.Id,
            UserId: sessionUserData.Id,
            OrgId: sessionUserData.OrgId,
            CLId: item.Id
        };
    
        try {
            const response = await fetch(`${VMS_URL_CONTRACTOR}LaborCheckIn`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });
    
            const result = await response.json();
            console.log(result);
    
            if (result.ResultData[0].Status === 'Success') {
                Swal.fire({
                    title: 'Success',
                    text: 'Labor check-in successful!',
                    icon: 'success',
                }).then(() => {
                    fetchData();
                })
            } else {
                Swal.fire({
                    title: 'Error',
                    text: result.ResultData[0].ResultMessage || 'Check-in failed!',
                    icon: 'error',
                });
            }
        } catch (error) {
            console.error("❌ API Error:", error);
            Swal.fire({
                title: 'Error',
                text: 'Something went wrong!',
                icon: 'error',
            });
        }
    };
    
    return (
        <div
            className="offcanvas offcanvas-end"
            tabIndex="-1"
            id="offcanvasRightChekInCL"
            aria-labelledby="offcanvasRightLabel"
            style={{ width: '85%' }}
        >
            <style>
                {`
                  @media (min-width: 768px) { /* Medium devices and up (md) */
                      #offcanvasRightChekInCL {
                          width: 45% !important;
                      }
                  }
              `}
            </style>
            <form>
                <div className="offcanvas-header d-flex justify-content-between align-items-center">
                    <h5 id="offcanvasRightLabel" className="mb-0">
                        Check In Casual Labours
                    </h5>
                    <div className="d-flex align-items-center">
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
                                    <div className="col-md-3 ">
                                        <label className="form-label fw-semibold">Mobile No</label>
                                        <div className="bg-light p-2 rounded text-dark fw-medium">
                                            {conObj?.PhoneNumber || "N/A"}
                                        </div>
                                    </div>
                                    <div className="col-md-5">
                                        <label className="form-label fw-semibold">Email</label>
                                        <div className="bg-light p-2 rounded text-dark fw-medium">
                                            {conObj?.Email || "N/A"}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="d-flex mt-2">
                            <h6 className="text-start mt-1 col-4">Labour List:</h6>
                            <input 
                                type="text"
                                className="form-control ms-auto"
                                style={{ width: '40%' }}
                                placeholder="Search CL.."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="table-responsive">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Code</th>
                                        <th>Name</th>
                                        <th>Mobile</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredLabours?.length > 0 ? (
                                        filteredLabours.map((item, index) => (
                                            <tr key={index}>
                                                <td>{index + 1}</td>
                                                <td className="text-primary fw-bold">CL-{item.Id}</td>
                                                <td>{item.Name}</td>
                                                <td>{item.PhoneNumber}</td>
                                                <td>
                                                    <button 
                                                        className={`btn btn-success ${!item.CheckIn ? 'd-block' : 'd-none'}`}
                                                        type="button"
                                                        title="Check-In"
                                                        onClick={() => handleLaborCheckIn(item)}
                                                    >
                                                        CheckIn
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                    <tr>
                                        <td colSpan="5" className="text-center">No matching records found</td>
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

CheckInContactorCL.propTypes = {
    conObj: PropTypes.object.isRequired,
};
