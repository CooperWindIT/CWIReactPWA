
import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { VMS_VISITORS } from "../Config/Config";
import Swal from 'sweetalert2';

export default function Screen() {

    const { RequestId, OrgId, userid } = useParams();
    const [viewLoading, setViewLoading] = useState(false);
    const [viewData, setViewData] = useState([]);

    useEffect(() => {
        const fetchViewEditData = async () => {
            setViewLoading(true);
            try {
                const response = await fetch(`${VMS_VISITORS}getReqPassById?RequestId=${RequestId}`);
                if (response.ok) {
                    const data = await response.json();
                    setViewData(data.Status ? data.ResultData : []);
                    console.log(data)
                } else {
                    console.error('Failed to fetch data:', response.statusText);
                }
            } catch (error) {
                console.error('Fetch error:', error.message);
            } finally {
                setViewLoading(false);
            }
        };

        fetchViewEditData();
    }, [RequestId]);

    const formatDate = (dateString) => {
        if (!dateString) return "N/A";
        const date = new Date(dateString);
        return `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`;
    };

    const formatDateTime = (dateString, timeString = "") => {
        if (!dateString) return "Invalid Date";
        let hours = "00", minutes = "00";
        const match = timeString.match(/T(\d{2}):(\d{2})/);
        if (match) {
            hours = match[1];
            minutes = match[2];
        }
        return `${formatDate(dateString)} ${hours}:${minutes}`;
    };

    const visitorTypeLabel = (type) => {
        return type === 2 ? 'Customer' : type === 3 ? 'Frequent Visitor' : 'Supplier';
    };

    const visitor = viewData[0];

    const handleActionApprove = () => {    
        Swal.fire({
            title: `Are you sure?`,
            text: `Do you want to approve this visit?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Approve'
        }).then((result) => {
            if (result.isConfirmed) {
                handleApproveSubmit();
            }
        });
    };

    const handleActionReject = () => {    
        Swal.fire({
            title: `Are you sure?`,
            text: `Do you want to reject this visit?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Reject'
        }).then((result) => {
            if (result.isConfirmed) {
                handleRejectSubmit();
            }
        });
    };

    const handleApproveSubmit = async () => {
    
        try {
            const url = `${VMS_VISITORS}PassApproval?RequestId=${RequestId}&OrgId=${OrgId}&UserId=${userid}`;
    
            const response = await fetch(url, {
                method: 'GET',
            });
    
            const result = await response.json();
            console.log(result, 'accept reject');
    
            if (response.ok) {
                if (result.Status) {
                    // fetchData();
                    console.log("✅ Action submitted successfully.");
                } else {
                    console.error("❌ Request failed with server response:", result);
                }
            } else {
                throw new Error(`Request failed with status ${response.status}`);
            }
        } catch (error) {
            console.error("❌ Error submitting action:", error);
        }
    };

    const handleRejectSubmit = async () => {
    
        try {
            const url = `${VMS_VISITORS}RejectPass?RequestId=${RequestId}&OrgId=${OrgId}&UpdatedBy=${userid}`;
    
            const response = await fetch(url, {
                method: 'GET',
            });
    
            const result = await response.json();
            console.log(result, 'accept reject');
    
            if (response.ok) {
                if (result.ResultData[0].Status === 'Success') {
                    // fetchData();
                    console.log("✅ Action submitted successfully.");
                } else {
                    console.error("❌ Request failed with server response:", result);
                }
            } else {
                throw new Error(`Request failed with status ${response.status}`);
            }
        } catch (error) {
            console.error("❌ Error submitting action:", error);
        }
    };

    return (
        <div className=" p-5">
            {viewLoading ? 
                <div>
                    <div className="text-center">
                        <div className="container"></div>
                    </div>
                </div> : viewData.length === 0 ? <p>No data found</p> : (
                <>
                    <h3 className="text-center mb-5">Visitor Data</h3>
                    <div className="row mb-3">
                        <div className="col-6 col-md-4 mb-3">
                            <strong>Request Date:</strong><br />
                            {formatDate(visitor?.RequestDate)}
                        </div>
                        <div className="col-6 col-md-4 mb-3">
                            <strong>Meeting Date:</strong><br />
                            {formatDateTime(visitor?.MeetingDate, visitor?.MeetingTime)}
                        </div>
                        <div className="col-6 col-md-4 mb-3">
                            <strong>Visitor Type:</strong><br />
                            {visitorTypeLabel(visitor?.VisitorType)}
                        </div>
                        <div className="col-6 col-md-4 mb-3">
                            <strong>Employee:</strong><br />
                            {visitor?.userName}
                        </div>
                    </div>

                    {visitor?.VisitorType === 3 && (
                        <div className="row mb-3">
                            <div className="col-12 col-md-6">
                                <label className="form-label">Expiry Date</label>
                                <input type="text" className="form-control" value={formatDateTime(visitor?.ExpiryDate)} readOnly />
                            </div>
                        </div>
                    )}

                    <div className="row mb-4">
                        <div className="col-12">
                            <label className="form-label">Remarks</label>
                            <textarea className="form-control" rows={3} value={visitor?.VisitorsRemarks || ""} readOnly />
                        </div>
                    </div>

                    {viewData.length > 0 && <h4 className="text-start mb-3">Attendees:</h4>}

                    {viewData.map((attendee, index) => (
                        <div key={index} className="card mb-3 shadow-sm">
                            <div className="card-body">
                                <div className="row g-3">
                                    <div className="col-12 col-md-6 col-lg-4">
                                        <label className="form-label">Name</label>
                                        <input type="text" className="form-control" value={attendee.Name || "N/A"} readOnly />
                                    </div>
                                    <div className="col-12 col-md-6 col-lg-4">
                                        <label className="form-label">Mobile</label>
                                        <input type="text" className="form-control" value={attendee.Mobile || "N/A"} readOnly />
                                    </div>
                                    <div className="col-12 col-md-6 col-lg-4">
                                        <label className="form-label">Email</label>
                                        <input type="email" className="form-control" value={attendee.Email || "N/A"} readOnly />
                                    </div>
                                    <div className="col-12 col-md-6 col-lg-4">
                                        <label className="form-label">Company Name</label>
                                        <input type="text" className="form-control" value={attendee.CompanyName || "N/A"} readOnly />
                                    </div>
                                    <div className="col-12 col-md-6 col-lg-4">
                                        <label className="form-label">Designation</label>
                                        <input type="text" className="form-control" value={attendee.Designation || "N/A"} readOnly />
                                    </div>
                                    <div className="col-12 col-md-6 col-lg-4">
                                        <label className="form-label">Department</label>
                                        <input type="text" className="form-control" value={attendee.DeptName || "N/A"} readOnly />
                                    </div>
                                    <div className="col-12 col-md-6 col-lg-4">
                                        <label className="form-label">Vehicle No</label>
                                        <input type="text" className="form-control" value={attendee.VehicleInfo || "N/A"} readOnly />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                    <div className="d-flex justify-content-end">
                        <button 
                            className="btn btn-success me-2"
                            onClick={handleActionApprove}
                            type="button"
                        ><i className="fa-solid fa-check me-2"></i>Approve</button>
                        <button 
                            className="btn btn-danger"
                            onClick={handleActionReject}
                            type="button"
                        ><i className="fa-solid fa-xmark me-2"></i>Reject</button>
                    </div>
                </>
            )}
        </div>
    );
}
