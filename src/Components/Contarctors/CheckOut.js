import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import PropTypes from "prop-types";
import { VMS_URL_CONTRACTOR } from "../Config/Config";
import Axios from 'axios';

export default function CheckOutContactorCL({ conObj }) {
    //   console.log(editObj);

    const [sessionUserData, setSessionUserData] = useState([]);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [labours, setLabours] = useState([]); 
    const [dataLoading, setDataLoading] = useState(false); 
    const [loadingStates, setLoadingStates] = useState({});

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
            const response = await fetch(`${VMS_URL_CONTRACTOR}getCLSById?ContractorId=${conObj?.Id}&OrgId=${sessionUserData.OrgId}`);
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
    }, [conObj.Id]);

    const handleLaborCheckOut = async (item) => {
        if (!item.CheckIn) {
            Swal.fire({
                title: 'Error',
                text: 'Invalid check-in time!',
                icon: 'error',
            });
            return;
        }
    
        setLoadingStates((prev) => ({ ...prev, [item.Id]: true }));
    
        console.log('Check-in Time:', item);
    
        const checkInTime = new Date(item.CheckIn);
        const currentTime = new Date();
        const timeDiffMilliseconds = currentTime.getTime() - checkInTime.getTime();
    
        if (timeDiffMilliseconds < 0) {
            Swal.fire({
                title: 'Error',
                text: 'Check-in time is in the future. Please check the data.',
                icon: 'error',
            });
            setLoadingStates((prev) => ({ ...prev, [item.Id]: false }));
            return;
        }
    
        const totalMinutes = Math.floor(timeDiffMilliseconds / (1000 * 60));
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
    
        console.log(`✅ Completed Time: ${hours} hours and ${minutes} minutes`);
    
        const confirmationResult = await Swal.fire({
            title: 'Are you sure?',
            text: `You have completed ${hours} hours and ${minutes} minutes. Do you want to proceed with check-out?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Yes, Proceed',
            cancelButtonText: 'No, Cancel',
            reverseButtons: true,
            allowOutsideClick: false,
        });
    
        if (!confirmationResult.isConfirmed) {
            console.log('❌ Check-out cancelled by user');
            setLoadingStates((prev) => ({ ...prev, [item.Id]: false }));
            return;
        }
    
        const payload = {
            UpdatedBy: sessionUserData.Id,
            PassId: item.Id,
        };
    
        console.log(payload, 'data sending to API');
    
        try {
            const response = await fetch(`${VMS_URL_CONTRACTOR}LaborCheckOut`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });
    
            const result = await response.json();
    
            if (result.ResultData?.[0]?.Status === 'Success') {
                Swal.fire({
                    title: 'Success',
                    text: 'Labor check-out successful!',
                    icon: 'success',
                }).then(() => {
                    setLoadingStates((prev) => ({ ...prev, [item.Id]: false }));
                    fetchData();
                });
            } else {
                console.error('❌ Check-out Failed:', result);
                setLoadingStates((prev) => ({ ...prev, [item.Id]: false }));
                Swal.fire({
                    title: 'Error',
                    text: result.message || 'Check-out failed!',
                    icon: 'error',
                });
            }
        } catch (error) {
            console.error('❌ API Error:', error);
            setLoadingStates((prev) => ({ ...prev, [item.Id]: false }));
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
            id="offcanvasRightChekOutCL"
            aria-labelledby="offcanvasRightLabel"
            style={{ width: '90%' }}
        >
            <style>
                {`
                  @media (min-width: 768px) { /* Medium devices and up (md) */
                      #offcanvasRightChekOutCL {
                          width: 55% !important;
                      }
                  }
              `}
            </style>
            <form>
                <div className="offcanvas-header d-flex justify-content-between align-items-center">
                    <h5 id="offcanvasRightLabel" className="mb-0">
                        Check Out Casual Labours
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
                                    <div className="col-md-3">
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
                            <h6 className="text-start mt-1">Labour List:</h6>
                        </div>
                        <div className="table-responsive">
                            <table className="table table-sm text-no-wrap">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Code</th>
                                        <th>Name</th>
                                        <th>Mobile</th>
                                        <th>Shift</th>
                                        <th>CheckIn</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {labours && labours?.map((item, index) => (
                                        <tr key={index}>
                                            <td>{index + 1}</td>
                                            <td>CL-{item.Id}</td>
                                            <td>{item.Name}</td>
                                            <td>{item.PhoneNumber}</td>
                                            <td>{item.ShiftName}</td>
                                            <td>{item.CheckIn}</td>
                                            <td>
                                                <button 
                                                    className={`btn btn-danger ${!item.CheckOut ? '' : 'disabled'}`}
                                                    type="button"
                                                    title="Check-In"
                                                    onClick={() => handleLaborCheckOut(item)}
                                                    disabled={loadingStates[item.Id]}
                                                >
                                                    {loadingStates[item.Id] ? 'Submitting...' : 'CheckOut'}
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

CheckOutContactorCL.propTypes = {
    conObj: PropTypes.object.isRequired,
};
