import React, { useEffect, useState } from "react";
import Swal from 'sweetalert2';
import PropTypes from "prop-types";
import { Upload, message, Button, DatePicker, Input, Card, Row, Col, Typography } from "antd";
import { InboxOutlined } from "@ant-design/icons";
import { BASE_IMAGE_UPLOAD_API } from "../../Config/Config";
import { fetchWithAuth } from "../../../utils/api";

export default function CloseAlert({ alertObj }) {

    const [sessionUserData, setSessionUserData] = useState({});
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
            setSessionUserData(userData);
        } else {
            console.log('sesssion not avilable');
        }
    }, []);

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
                ? `${BASE_IMAGE_UPLOAD_API}Fileupload/document`
                : `${BASE_IMAGE_UPLOAD_API}Fileupload/image`;

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

    const handleSubmit = async () => {
        if (!comments || !closedDate) {
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
                ScheduledAlertId: alertObj?.ScheduledAlertId,
                Comments: comments,
                ClosedDate: closedDate.format("YYYY-MM-DD"),
                ProofUrl: proofUrl,
                UpdatedBy: sessionUserData?.Id,
            };

            const res = await fetchWithAuth(`Portal/CloseAlert`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = await res.json();

            if (data?.ResultData?.Status === 'Success') {
                Swal.fire({
                    icon: "success",
                    title: "Success!",
                    text: "Alert closed successfully.",
                    confirmButtonColor: "#28a745",
                });
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

    return (
        <div
            className="offcanvas offcanvas-end"
            tabIndex="-1"
            id="offcanvasRightCloseAlert"
            aria-labelledby="offcanvasRightLabel"
            style={{ width: "90%" }}
        >
            <style>
                {`
                    @media (min-width: 768px) { /* Medium devices and up (md) */
                        #offcanvasRightCloseAlert {
                            width: 40% !important;
                        }
                    }
                `}
            </style>
            <form autoComplete="off" onSubmit={handleSubmit}>
                <div className="offcanvas-header d-flex justify-content-between align-items-center">
                    <h5 id="offcanvasRightLabel" className="mb-0">Close Alert <span className="fw-bold text-primary">({alertObj?.AutoIncNo})</span></h5>
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
                                <Col xs={24} sm={12}>
                                    <Text type="secondary">Machine Name</Text>
                                    <div className="fw-semibold text-dark">{alertObj?.MachineName}</div>
                                </Col>
                                <Col xs={24} sm={12}>
                                    <Text type="secondary">Alert Title</Text>
                                    <div className="fw-semibold text-dark">{alertObj?.AlertTitle}</div>
                                </Col>
                                {/* <Col xs={24} sm={12}>
                                    <Text type="secondary">Occurrence Type</Text>
                                    <div className="fw-semibold text-dark">{alertObj?.OcurrenceTypeNames}</div>
                                </Col> */}
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


                        {/* Action Section */}
                        <Card
                            bordered={false}
                            className="shadow-sm"
                            style={{ borderRadius: 12 }}
                        >
                            <Title level={4} style={{ fontSize: 18, marginBottom: 16 }}>
                                Close Alert
                            </Title>

                            <Row gutter={[16, 12]}>
                                <Col xs={24} sm={12}>
                                    <label className="form-label fw-semibold">Closed Date</label>
                                    <DatePicker
                                        style={{ width: "100%" }}
                                        onChange={(date) => setClosedDate(date)}
                                        disabled={loading}
                                    />
                                </Col>

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
                                    <label className="form-label fw-semibold">Comments</label>
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
                                        onClick={handleSubmit}
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
            </form>
        </div>
    );
}

CloseAlert.propTypes = {
    alertObj: PropTypes.object.isRequired,
};