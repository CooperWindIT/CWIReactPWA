import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { fetchWithAuth } from "../../../utils/api";
import Swal from "sweetalert2";
import CloseAlert from "./CloseAlert";
import { Upload, message, Button, DatePicker, Input, Card, Row, Col, Typography } from "antd";
import { BASE_IMG_UPLOAD, BASE_DOC_UPLOAD } from "../../Config/Config";
import { InboxOutlined } from "@ant-design/icons";

export default function ViewAlert({ alertObj }) {

    const [sessionUserData, setsessionUserData] = useState({});
    const [dataLoading, setDataLoading] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [alertsData, setAlertsData] = useState([]);
    const [showSubmitAlertModal, setShowSubmitAlertModal] = useState(false);

        const [comments, setComments] = useState("");
        const [closedDate, setClosedDate] = useState(null);
        const [proofUrl, setProofUrl] = useState("");
        const [loading, setLoading] = useState(false);
        const { Dragger } = Upload;
        const { TextArea } = Input;
        const { Title, Text } = Typography;

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

    //   Close alert
        const handleUpload = async ({ file }) => {
            if (file.size > 2 * 1024 * 1024) {
                // Use SweetAlert (swal) for alert. If using Swal from 'sweetalert2', call:
                Swal.fire({
                    icon: 'error',
                    title: 'File too large',
                    text: 'File must be less than 2MB',
                });
                // If using older swal library, use:
                // swal("File too large", "File must be less than 2MB", "error");
                return; // Prevent upload
            }
            try {
                setLoading(true);
                const formData = new FormData();
    
                // Determine file type
                const ext = file.name.split(".").pop().toLowerCase();
                const isDoc = ["pdf", "doc", "docx", "xls", "xlsx"].includes(ext);
    
                // Set correct form key
                const keyName = isDoc ? "DocumentUrl" : "ImageUrl";
                formData.append(keyName, file);
    
                // Correct API endpoint
                const uploadUrl = isDoc
                ? `${BASE_DOC_UPLOAD}`
                : `${BASE_IMG_UPLOAD}`;
    
                // API call
                const res = await fetch(uploadUrl, { method: "POST", body: formData });
                const data = await res.json();
    
                // ✅ Parse response correctly
                if (data?.success && data?.data?.url) {
                    setProofUrl(data.data.url);
                    message.success(`${file.name} uploaded successfully`); 
                } else {
                    throw new Error(data?.message || "Invalid response");
                }
            } catch (err) {
                console.error(err);
                message.error("Upload failed");
            } finally {
                setLoading(false);
            }
        };

      useEffect(() => {
        if (showSubmitAlertModal) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
    }, [showSubmitAlertModal]);

     const handleCloseSubmit = async () => {
            if (!comments) {
                Swal.fire({
                    icon: "warning",
                    title: "Missing Fields",
                    text: "Please fill all required fields before submitting.",
                    confirmButtonColor: "#3085d6",
                });
                return;
            }
    
            setLoading(true);
            try {
                const payload = {
                    OrgId: sessionUserData?.OrgId,
                    JsonData: {
                      ScheduledAlertId: alertObj?.ScheduledAlertId,
                      ProofUrl: proofUrl,
                      Comments: comments,
                      SubmittedBy: sessionUserData?.Id,
                      AlertCode: alertObj?.AutoIncNo,
                      PocId: alertObj?.PocId,
                    }
                };
    
                const res = await fetchWithAuth(`Portal/SubmitAlert`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });
    
                const data = await res.json();
    
                if (data?.success) {
                    Swal.fire({
                        icon: "success",
                        title: "Success!",
                        text: "Alert submitted successfully.",
                        confirmButtonColor: "#28a745",
                    }).then(() => {
                        setComments("");
                        setClosedDate(null);
                        setProofUrl("");
                        fetchAlerts();
                    })
                } else {
                    Swal.fire({
                        icon: "error",
                        title: "Failed!",
                        text: data?.message || "Failed to close alert.",
                        confirmButtonColor: "#d33",
                    });
                }
            } catch (err) {
                Swal.fire({
                    icon: "error",
                    title: "Something went wrong!",
                    text: "Please try again later.",
                    confirmButtonColor: "#d33",
                });
            } finally {
                setLoading(false);
            }
        };

        const handleCloseConfirmation = (item) => {
                Swal.fire({
                  title: `<strong>Close Alert</strong>`,
                  html: `
                    <div style="text-align:left;">
                      <p><b>Alert Code:</b> ${item.AutoIncNo || "N/A"}</p>
                      <p><b>Alert Title:</b> ${item.AlertTitle || "N/A"}</p>
                      <p class="text-muted" style="font-size:0.9rem;">Are you sure you want to close this alert?</p>
                    </div>
                  `,
                  icon: "warning",
                  showCancelButton: true,
                  confirmButtonText: "Close Alert",
                  cancelButtonText: "Cancel",
                  confirmButtonColor: "#198754",
                  cancelButtonColor: "#6c757d",
                  reverseButtons: true,
                  focusCancel: true,
                }).then(async (result) => {
                  if (result.isConfirmed) {
                    try {
                      const payload = {
                        ScheduledAlertId: item.ScheduledAlertId,
                        ClosedDate: new Date().toISOString().split("T")[0], // YYYY-MM-DD
                        UpdatedBy: sessionUserData?.Id,
                      };
              
                      const res = await fetchWithAuth(`Portal/CloseAlert`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(payload),
                      });
              
                      const data = await res.json();
              
                      if (data?.ResultData?.Status === "Success") {
                        Swal.fire({
                          icon: "success",
                          title: "Alert Closed!",
                          text: "The alert has been successfully closed.",
                          confirmButtonColor: "#198754",
                        });
                        // Optionally refresh data or UI
                        fetchAlerts();
                      } else {
                        Swal.fire({
                          icon: "error",
                          title: "Failed",
                          text: data?.ResultData?.Message || "Something went wrong!",
                        });
                      }
                    } catch (error) {
                      console.error(error);
                      Swal.fire({
                        icon: "error",
                        title: "Error",
                        text: "Failed to close the alert. Please try again.",
                      });
                    }
                  }
                });
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

                        {/* Machine and Alert Title */}
                        <div className="col-12 col-md-6">
                            <div className="p-2 border rounded bg-light">
                                <h6 className="text-primary mb-1"><i className="fa-solid fa-cogs me-2"></i>Machine</h6>
                                <p className="mb-0 fw-semibold">{alertObj?.MachineName || "N/A"}</p>
                            </div>
                        </div>
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
                                                            <i className="fa-regular fa-trash-can fs-4 ms-1"></i>
                                                        </button>
                                                        <button 
                                                            className="btn btn-sm btn-light-primary ms-2"
                                                            type="button"
                                                            onClick={() => setShowSubmitAlertModal(true)}
                                                            disabled={deleteLoading || alert.IsTriggered}
                                                        >
                                                           <i class="bi bi-clipboard-check fs-4 ms-1"></i>
                                                        </button>
                                                        <button 
                                                            className="btn btn-sm btn-light-success ms-2"
                                                            type="button"
                                                            onClick={() =>
                                                                handleCloseConfirmation(alert)
                                                            }
                                                            disabled={deleteLoading || alert.IsTriggered}
                                                        >
                                                           <i class="bi bi-patch-check text-suceess fs-4"></i>
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

            {showSubmitAlertModal && (
    <div className="custom-modal-backdrop">
        <div className="custom-modal custom-modal-lg animate-scale-in p-4">

            {/* Header */}
            <div className="modal-header">
                <h5 className="modal-title">
                    Submit Alert
                    <span className="fw-bold text-primary ms-2">
                        ({alertObj?.AutoIncNo})
                    </span>
                </h5>

                <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowSubmitAlertModal(false)}
                ></button>
            </div>

            {/* Body */}
            <div className="offcanvas-body" style={{
                                    flex: 1,
                                    overflowY: 'auto',
                                    paddingBottom: '2rem',
                                    maxHeight: 'calc(100vh - 100px)'
                                }}>
                                    <div className="alert alert-warning p-2 mb-4 sticky-to">
                                        ⚠️ Uplaod file must be less than 2MB.
                                    </div>
                                    <div className="p-2">
                                        <Card
                                            bordered={false}
                                            className="shadow-sm mb-4"
                                            style={{ borderRadius: 12 }}
                                        >
                                            <Title level={4} style={{ fontSize: 18, marginBottom: 16 }}>
                                                Alert Details
                                            </Title>
            
                                            <Row gutter={[16, 12]}>
                                                {/* <Col xs={24} sm={12}>
                                                    <Text type="secondary">Machine Name</Text>
                                                    <div className="fw-semibold text-dark">{alertObj?.MachineName}</div>
                                                </Col> */}
                                                <Col xs={24} sm={12}>
                                                    <Text type="secondary">Alert Title</Text>
                                                    <div className="fw-semibold text-dark">{alertObj?.AlertTitle}</div>
                                                </Col>
                                                <Col xs={24} sm={12}>
                                                    <Text type="secondary">Created By</Text>
                                                    <div className="fw-semibold text-dark">{alertObj?.Name}</div>
                                                </Col>
                                                <Col xs={24}>
                                                    <Text type="secondary">Description</Text>
                                                    <div className="fw-semibold text-dark small">{alertObj?.Message}</div>
                                                </Col>
                                            </Row>
                                        </Card>
            
                                        <Card
                                            bordered={false}
                                            className="shadow-sm"
                                            style={{ borderRadius: 12 }}
                                        >
                                            <Title level={4} style={{ fontSize: 18, marginBottom: 16 }}>
                                                Submit details
                                            </Title>
                                            <Row gutter={[16, 12]}>
                                                <Col xs={24}>
                                                    <label className="form-label fw-semibold">Upload Proof</label>
                                                    <Dragger
                                                        customRequest={handleUpload}
                                                        multiple={false}
                                                        showUploadList={false}
                                                        disabled={loading}
                                                        style={{ padding: "12px" }}
                                                    >
                                                        <p className="ant-upload-drag-icon mb-1">
                                                            <InboxOutlined />
                                                        </p>
                                                        <p className="ant-upload-text">Click or drag to upload file</p>
                                                        <p className="ant-upload-hint small">
                                                            Supports PDF, DOC, XLS, PNG, JPG, JPEG
                                                        </p>
                                                    </Dragger>
                                                    {proofUrl && (
                                                        <div className="mt-2 small text-success">
                                                            ✅ Uploaded:{" "}
                                                            <a href={proofUrl} target="_blank" rel="noreferrer">
                                                                View file
                                                            </a>
                                                        </div>
                                                    )}
                                                </Col>
            
                                                <Col xs={24} style={{ marginTop: 50 }}>
                                                    <label className="form-label fw-semibold">Comments<span className="text-danger fw-bold">*</span></label>
                                                    <TextArea
                                                        rows={3}
                                                        placeholder="Enter your comments..."
                                                        value={comments}
                                                        onChange={(e) => setComments(e.target.value)}
                                                        disabled={loading}
                                                    />
                                                </Col>
            
                                                <Col xs={24} className="text-end">
                                                    <Button
                                                        type="primary"
                                                        onClick={handleCloseSubmit}
                                                        loading={loading}
                                                        disabled={loading}
                                                        style={{ minWidth: 120 }}
                                                    >
                                                        Submit
                                                    </Button>
                                                </Col>
                                            </Row>
                                        </Card>
                                    </div>
                                </div>
        </div>
    </div>
)}

<style>
    {`
    .custom-modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1055;
}

.custom-modal {
    background: #fff;
    width: 95%;
    max-width: 900px;
    border-radius: 12px;
    box-shadow: 0 25px 60px rgba(0,0,0,0.25);
    max-height: 90vh;
    display: flex;
    flex-direction: column;
}

.custom-modal-lg {
    max-width: 900px;
}

.modal-body {
    overflow-y: auto;
    padding: 1rem;
}

.animate-scale-in {
    animation: scaleIn 0.25s ease;
}

@keyframes scaleIn {
    from {
        opacity: 0;
        transform: scale(0.95);
    }
    to {
        opacity: 1;
        transform: scale(1);
    }
}

    `}
</style>
            <CloseAlert alertObj={alertObj} />
        </div>
    );
}

ViewAlert.propTypes = {
    alertObj: PropTypes.object.isRequired,
};