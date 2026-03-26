import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { VMS_URL_CONTRACTOR } from "../Config/Config";
import Swal from "sweetalert2";

export default function ViewPassCheckInOut ({viewId}) {

    const [sessionUserData, setsessionUserData] = useState([]);
    const [viewLoading, setViewLoading] = useState(false);
    const [viewData, setViewData] = useState([]);

    useEffect(() => {
        const userDataString = sessionStorage.getItem('userData');
        if (userDataString) {
            const userData = JSON.parse(userDataString);
            setsessionUserData(userData);
        } else {
            console.log('User data not found in sessionStorage');
        }
    }, []);

    const fetchViewEditData = async () => {
        setViewLoading(true);
        try {
            const response = await fetch(`${VMS_URL_CONTRACTOR}getContractorQrPasses?ContractorId=${viewId}`);
            if (response.ok) {
                const data = await response.json();
                if (data.Status) {
                    setViewData(data.ResultData);
                } else {
                    setViewData([]);
                }
            } else {
                console.error('Failed to fetch attendees data:', response.statusText);
            }
        } catch (error) {
            console.error('Error fetching attendees data:', error.message);
        } finally {
            setViewLoading(false);
        }
    };
    
    useEffect(() => {
        fetchViewEditData();
    }, [viewId]);

    const formatDateTime = (dateString) => {
        const date = new Date(dateString);
        const formattedDate = date.toLocaleDateString('en-GB');
        const formattedTime = date.toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
        });
        return `${formattedDate} ${formattedTime}`;
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const formattedDate = date.toLocaleDateString('en-GB');
        return `${formattedDate}`;
    };

     const handleGeneratePass = (item, action) => {
        const confirmButtonText = 'Yes, generate it!';
    
        Swal.fire({
            title: `Are you sure?`,
            text: `Do you want to generate pass?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: confirmButtonText
        }).then((result) => {
            if (result.isConfirmed) {
                // setAcceptFormData(item);
                handleActionSubmit(item, action);
            }
        });
    };
    
    const handleActionSubmit = async (item, action) => {   
        const currentDate = new Date();     
        const payload = {
            "orgid": sessionUserData.OrgId,
            "userid": sessionUserData.Id,
            "Time": currentDate.toLocaleTimeString(),
            "Date": currentDate.toISOString().split('T')[0],
            "QRCode": `QR-000${item.Id}`,
            "ContractorId": viewId,
            "LabourId": item.Id,
        };
        
        console.log(payload, 'payloadpayload')
    
        try {
            const response = await fetch(`${VMS_URL_CONTRACTOR}ManageLaborQRPass`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            console.log(result)
            
            if (response.ok) {
                if (result.Status) {
                    fetchViewEditData();
                }
                throw new Error("Request failed with status " + response.status);
            }
            console.log("Request successful:", await response.json());
        } catch (error) {
            console.error("Error submitting action:", error);
        }
    };

    return (
        <div className="offcanvas offcanvas-end" tabIndex="-1" id="offcanvasRightView" aria-labelledby="offcanvasRightLabel"
            style={{ minWidth: '52%', maxWidth: '52%' }}
        >
           <div className="offcanvas-header d-flex justify-content-between align-items-center">
                <h5 className="mb-0">View Passes</h5>
                <div className="d-flex align-items-center">
                    <button type="button" className="btn-close text-reset" data-bs-dismiss="offcanvas" aria-label="Close"></button>
                </div>
            </div>

            {viewLoading ? <p className="text-center">Loading...</p> :
                <div className="offcanvas-body" style={{ marginTop: '-2rem' }}>
                    <div className="table-responsive">
                        <table className="table lign-middle table-row-dashed">
                            <thead>
                                <tr>
                                    <th>S.No</th>
                                    <th>QR-Code</th>
                                    <th>Date</th>
                                    <th>Check In</th>
                                    <th>Check Out</th>
                                    <th>Status</th>
                                    <th>Pass</th>
                                </tr>
                            </thead>
                            <tbody>
                                {viewData && viewData?.map((item, index) => (
                                    <tr key={index}>
                                        <td>{index + 1}</td>
                                        <td className="fw-bold">{item.QRCode}</td>
                                        <td className="text-primary">{formatDate(item.Date)}</td>
                                        <td className="text-success">{formatDateTime(item.CheckIn)}</td>
                                        <td className="text-danger">{formatDateTime(item.CheckOut)}</td>
                                        <td className="badge badge-light-success">
                                            <p>Active</p>
                                        </td>
                                        <td>
                                            <i className="fa-regular fa-address-card me-2 text-info"
                                                style={{ cursor: 'pointer' }} 
                                                onClick={() =>handleGeneratePass(item)}
                                            ></i>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            }
        </div>
    )
};

ViewPassCheckInOut.propTypes = {
    viewId: PropTypes.number.isRequired
};