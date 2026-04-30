import React, { useEffect, useState } from "react";
import { message } from 'antd';
import PropTypes from "prop-types";
import { fetchWithAuth } from "../../utils/api";
import Swal from "sweetalert2";

export default function ViewAlert({ alertObj }) {

    const [sessionUserData, setsessionUserData] = useState({});
    const [dataLoading, setDataLoading] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [alertsData, setAlertsData] = useState([]);

    useEffect(() => {
        const userDataString = sessionStorage.getItem("userData");
        if (userDataString) {
            const userData = JSON.parse(userDataString);
            setsessionUserData(userData);
        }
    }, []);

    const fetchAlerts = async () => {
        setDataLoading(true);
        try {
            const response = await fetchWithAuth(`Portal/getAlertsById?AlertId=${alertObj?.AlertId}`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });
            if (!response.ok) throw new Error("Network response was not ok");

            const data = await response.json();
            setDataLoading(false);
            setAlertsData(data.ResultData || []);
        } catch (error) {
            console.error("Failed to fetch UnitLocations:", error);
            setDataLoading(false);
            setAlertsData([]);
        }
    };

    useEffect(() => {
        if (alertObj && alertObj?.AlertId) {
            fetchAlerts();
        }
    }, [alertObj]);

    const handleDeleteAlert = async (scheduledAlertId, scheduledDate) => {
        const formattedDate = new Date(scheduledDate).toLocaleDateString("en-GB"); // dd-mm-yyyy
      
        const result = await Swal.fire({
          title: 'Are you sure?',
          text: `You are about to delete the alert scheduled on ${formattedDate}.`,
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'Yes, delete it!',
          cancelButtonText: 'No, cancel',
        });
      
        if (!result.isConfirmed) return; // user cancelled
      
        try {
          setDeleteLoading(true);
      
          const payload = {
            UpdatedBy: sessionUserData?.Id,
            ScheduledAlertId: scheduledAlertId
          };
      
          const response = await fetchWithAuth(`Portal/InactiveScheduledAlerts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
      
          const data = await response.json();
          setDeleteLoading(false);
      
          if (data.ResultData.Status === 'Success') {
            // ✅ Show Ant Design message
            message.success('The scheduled alert has been removed.');
      
            // ✅ Remove deleted alert from table
            setAlertsData(prev => prev.filter(a => a.ScheduledAlertId !== scheduledAlertId));
          } else {
            // Use Swal for failure
            Swal.fire('Error!', data.ResultData.Message || 'Failed to delete the alert.', 'error');
          }
        } catch (error) {
          setDeleteLoading(false);
          Swal.fire('Error!', error.message || 'Something went wrong.', 'error');
        }
      };   

    return (
        <div
            className="offcanvas offcanvas-end"
            tabIndex="-1"
            id="offcanvasRightViewAlert"
            aria-labelledby="offcanvasRightLabel"
            style={{ width: "90%" }}
        >
            <style>
                {`
                    @media (min-width: 768px) { /* Medium devices and up (md) */
                        #offcanvasRightViewAlert {
                            width: 50% !important;
                        }
                    }
                `}
            </style>
            <form autoComplete="off">
                <div className="offcanvas-header d-flex justify-content-between align-items-center">
                    <h5 id="offcanvasRightLabel" className="mb-0">View Alert Details <span className="fw-bold text-primary">({alertObj?.AutoIncNo})</span></h5>
                    <div className="d-flex align-items-center">
                        <button
                            type="button"
                            className="btn-close"
                            data-bs-dismiss="offcanvas"
                            aria-label="Close"
                        ></button>
                    </div>
                </div>
                <div className="offcanvas-body" style={{
                    flex: 1,
                    overflowY: 'auto',
                    paddingBottom: '2rem',
                    maxHeight: 'calc(100vh - 100px)'
                }}>
                    <div className="row g-3">
                        <div className="col-12 col-md-6">
                            <div className="p-2 border rounded bg-light">
                                <h6 className="text-primary mb-1"><i className="fa-solid fa-bell me-2"></i>Alert Title</h6>
                                <p className="mb-0 fw-semibold">{alertObj?.AlertTitle || "N/A"}</p>
                            </div>
                        </div>

                        {/* Alert Type and Occurrence */}
                        <div className="col-12 col-md-6">
                            <div className="p-2 border rounded bg-light">
                                <h6 className="text-success mb-1"><i className="fa-solid fa-list-check me-2"></i>Alert Type</h6>
                                <p className="mb-0">{alertObj?.TypeName || "N/A"}</p>
                            </div>
                        </div>
                        <div className="col-12 col-md-6">
                            <div className="p-2 border rounded bg-light">
                                <h6 className="text-warning mb-1"><i className="fa-solid fa-repeat me-2"></i>Occurrence</h6>
                                <p className="mb-0">{alertObj?.OcurrenceTypeNames || "N/A"}</p>
                            </div>
                        </div>

                        {/* To Users */}
                        <div className="col-12">
                            <div className="p-2 border rounded bg-light">
                                <h6 className="text-info mb-1"><i className="fa-solid fa-users me-2"></i>To Users</h6>
                                <p className="mb-0">{alertObj?.ToUsers || "N/A"}</p>
                            </div>
                        </div>
                        <div className="col-12">
                            <div className="p-2 border rounded bg-light">
                                <h6 className="text-success mb-1"><i className="fa-solid fa-users me-2"></i>POC for Clouser</h6>
                                <p className="mb-0">{alertObj?.POCName || "N/A"} ({alertObj?.POCEmail || 'N/A'})</p>
                            </div>
                        </div>

                        {/* Message */}
                        <div className="col-12">
                            <div className="p-2 border rounded bg-light">
                                <h6 className="text-danger mb-1"><i className="fa-solid fa-message me-2"></i>Message</h6>
                                <p className="mb-0">{alertObj?.Message || "N/A"}</p>
                            </div>
                        </div>

                        {/* Start Date & End Date */}
                        {alertObj?.OcurrenceType && alertObj?.OcurrenceType !== 1 && (
                            <>
                                <div className="col-12 col-md-6">
                                    <div className="p-2 border rounded bg-light">
                                        <h6 className="text-primary mb-1"><i className="fa-solid fa-calendar-days me-2"></i>Start Date</h6>
                                        <p className="mb-0">{alertObj.StartDate ? new Date(alertObj.StartDate).toLocaleDateString("en-GB") : "N/A"}</p>
                                    </div>
                                </div>
                                <div className="col-12 col-md-6">
                                    <div className="p-2 border rounded bg-light">
                                        <h6 className="text-primary mb-1"><i className="fa-solid fa-calendar-check me-2"></i>End Date</h6>
                                        <p className="mb-0">{alertObj.EndDate ? new Date(alertObj.EndDate).toLocaleDateString("en-GB") : "N/A"}</p>
                                    </div>
                                </div>
                            </>
                        )}

                        {[1, 5, 6, 7].includes(alertObj?.OcurrenceType) && (
                            <div className="col-12">
                                <div className="p-2 border rounded bg-light">
                                    <h6 className="text-primary mb-1"><i className="fa-solid fa-calendar-day me-2"></i>Scheduled Date</h6>
                                    <p className="mb-0">{alertObj.ScheduledDate ? new Date(alertObj.ScheduledDate).toLocaleDateString("en-GB") : "N/A"}</p>
                                </div>
                            </div>
                        )}

                    </div>
                    <div className="table-responsive my-4" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                        <table className="table table-bordered table-hover align-middle mb-0">
                            <thead className="table-light sticky-top">
                                <tr>
                                    <th>#</th>
                                    <th>Date</th>
                                    <th>Day</th>
                                    <th className="text-center">Sent</th>
                                    <th className="text-center">Status</th>
                                    <th className="text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {dataLoading ? (
                                    <tr>
                                        <td colSpan={10} className="text-center py-3">
                                            <div className="spinner-border text-primary" role="status">
                                                <span className="visually-hidden">Loading...</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : alertsData && alertsData.length > 0 ? (
                                    alertsData.map((alert, indx) => {
                                        const dateObj = new Date(alert.ScheduledDate);
                                        const formattedDate = dateObj.toLocaleDateString("en-GB"); // dd/mm/yyyy
                                        const [day, month, year] = formattedDate.split("/");
                                        const finalDate = `${day}-${month}-${year}`;

                                        const dayName = dateObj.toLocaleDateString("en-US", { weekday: "long" });

                                        const sentIcon = alert.IsTriggered ? (
                                            <i className="fa-solid fa-check text-success fs-5"></i>
                                        ) : (
                                            <i className="fa-solid fa-xmark text-danger fs-5"></i>
                                        );

                                        // Status badge
                                        const getStatusBadge = (isClosed) => {
                                            if (isClosed === true) {
                                                return <span className="badge badge-light-danger">Closed</span>;
                                            } else if (isClosed === false) {
                                                return <span className="badge badge-light-success">Active</span>;
                                            } else {
                                                return <span className="badge badge-secondary">Unknown</span>;
                                            }
                                        };

                                        return (
                                            <tr key={indx}>
                                                <td>{indx + 1}</td>
                                                <td>{finalDate}</td>
                                                <td>{dayName}</td>
                                                <td className="text-center">{sentIcon}</td>
                                                <td className="text-center">{getStatusBadge(alert.IsClosed)}</td>
                                                <td className="text-center">
                                                    <div className="d-flex justify-content-center align-items-center">
                                                        <button 
                                                            className="btn btn-sm btn-light-danger"
                                                            type="button"
                                                            onClick={() => !alert.IsTriggered && handleDeleteAlert(alert.ScheduledAlertId, alert.ScheduledDate)}
                                                            disabled={deleteLoading || alert.IsTriggered}
                                                        >
                                                            <i className="fa-regular fa-trash-can fs-6 ms-1"></i>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={10} className="text-center text-muted py-3">
                                            No alerts found
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </form>
        </div>
    );
}

ViewAlert.propTypes = {
    alertObj: PropTypes.object.isRequired,
};