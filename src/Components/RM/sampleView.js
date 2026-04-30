import React, { useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Base1 from "../Config/Base1";

export default function ItemMasterDetails() {
    const navigate = useNavigate();
    const { id } = useParams();
    const { state } = useLocation();
    const fileInputRef = useRef(null);

    const item = state?.item || {
        id,
        itemNo: "ITM-1001",
        customerPartNo: "AL-CP-7781",
        customerPartName: "Front Axle Housing",
        itemDescription: "Front Axle Housing",
        customerRevisionNo: "R1",
        itemGroup: "Raw Material",
        uomGroup: "Nos",
        itemType: "Inventory",
        inStock: 120,
        procurementMethod: "Buy",
        manageBatchNo: "Yes",
        serialNo: "No",
        finalFG: "No",
        salesItem: "Yes",
        bomType: "Production BOM",
        inspectionRequired: "Yes",
    };

    const [activeTab, setActiveTab] = useState("overview");
    const [attachments, setAttachments] = useState([
        {
            id: 1,
            name: "Drawing_Rev_A.pdf",
            uploadedOn: "17-04-2026",
            size: "1.2 MB",
            url: "#",
        },
        {
            id: 2,
            name: "QC_Report.xlsx",
            uploadedOn: "16-04-2026",
            size: "850 KB",
            url: "#",
        },
    ]);

    const handleFileUpload = (event) => {
        const files = Array.from(event.target.files || []);

        const uploadedFiles = files.map((file, index) => ({
            id: Date.now() + index,
            name: file.name,
            uploadedOn: new Date().toLocaleDateString("en-GB"),
            size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
            url: URL.createObjectURL(file),
        }));

        setAttachments((prev) => [...uploadedFiles, ...prev]);
    };

    return (
        <Base1>
            <div className="app-toolbar py-3 py-lg-6">
                <div className="app-container container-xxl d-flex flex-stack flex-wrap gap-3">
                    <div>
                        <h1 className="page-heading text-gray-900 fw-bold fs-3 mb-1">
                            Item Details
                        </h1>
                        <div className="text-muted">
                            Item No: <span className="fw-bold text-primary">{item.itemNo}</span>
                        </div>
                    </div>

                    <button
                        type="button"
                        className="btn btn-light-primary btn-sm"
                        onClick={() => navigate(-1)}
                    >
                        <i className="bi bi-arrow-left me-2"></i>
                        Back
                    </button>
                </div>
            </div>

            <div className="app-content flex-column-fluid pt-2">
                <div className="app-container container-xxl">
                    <div className="card shadow-sm border-0 mb-5">
                        <div className="card-body py-5">
                            <div className="d-flex flex-wrap gap-3">
                                <button
                                    className={`btn ${activeTab === "overview" ? "btn-primary" : "btn-light-primary"} btn-sm d-inline-flex align-items-center gap-2`}
                                    onClick={() => setActiveTab("overview")}
                                >
                                    <i className="bi bi-grid-1x2-fill"></i>
                                    Overview
                                </button>

                                <button
                                    className={`btn ${activeTab === "attachments" ? "btn-primary" : "btn-light-primary"} btn-sm d-inline-flex align-items-center gap-2`}
                                    onClick={() => setActiveTab("attachments")}
                                >
                                    <i className="bi bi-paperclip"></i>
                                    Attachments
                                </button>

                                <button
                                    className={`btn ${activeTab === "inventory" ? "btn-primary" : "btn-light-primary"} btn-sm d-inline-flex align-items-center gap-2`}
                                    onClick={() => setActiveTab("inventory")}
                                >
                                    <i className="bi bi-box-seam"></i>
                                    Inventory
                                </button>

                                <button
                                    className={`btn ${activeTab === "commercial" ? "btn-primary" : "btn-light-primary"} btn-sm d-inline-flex align-items-center gap-2`}
                                    onClick={() => setActiveTab("commercial")}
                                >
                                    <i className="bi bi-cash-coin"></i>
                                    Commercial
                                </button>

                            </div>
                        </div>
                    </div>

                    {activeTab === "overview" && (
                        <div className="card shadow-sm border-0">
                            <div className="card-header">
                                <h3 className="card-title fw-bold">Basic Details</h3>
                            </div>
                            <div className="card-body">
                                <div className="row g-6">
                                    <div className="col-md-4"><strong>Item No:</strong> {item.itemNo}</div>
                                    <div className="col-md-4"><strong>Customer Part No:</strong> {item.customerPartNo}</div>
                                    <div className="col-md-4"><strong>Customer Part Name:</strong> {item.customerPartName}</div>
                                    <div className="col-md-4"><strong>Description:</strong> {item.itemDescription}</div>
                                    <div className="col-md-4"><strong>Revision No:</strong> {item.customerRevisionNo}</div>
                                    <div className="col-md-4"><strong>Item Group:</strong> {item.itemGroup}</div>
                                    <div className="col-md-4"><strong>UOM Group:</strong> {item.uomGroup}</div>
                                    <div className="col-md-4"><strong>Item Type:</strong> {item.itemType}</div>
                                    <div className="col-md-4"><strong>BOM Type:</strong> {item.bomType}</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "attachments" && (
                        <div className="card shadow-sm border-0">
                            <div className="card-header d-flex justify-content-between align-items-center flex-wrap gap-3">
                                <h3 className="card-title fw-bold">Attachments</h3>
                                <div className="d-flex gap-2">
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        multiple
                                        className="d-none"
                                        onChange={handleFileUpload}
                                    />
                                    <button
                                        type="button"
                                        className="btn btn-primary btn-sm"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <i className="bi bi-upload me-2"></i>
                                        Upload File
                                    </button>
                                </div>
                            </div>

                            <div className="card-body">
                                {attachments.length > 0 ? (
                                    <div className="table-responsive">
                                        <table className="table align-middle table-row-dashed fs-6 gy-4">
                                            <thead>
                                                <tr className="text-start text-muted fw-bold fs-7 text-uppercase">
                                                    <th>File Name</th>
                                                    <th>Uploaded On</th>
                                                    <th>Size</th>
                                                    <th className="text-end">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="fw-semibold text-gray-700">
                                                {attachments.map((file) => (
                                                    <tr key={file.id}>
                                                        <td>
                                                            <div className="d-flex align-items-center gap-3">
                                                                <i className="bi bi-paperclip text-primary fs-3"></i>
                                                                <span>{file.name}</span>
                                                            </div>
                                                        </td>
                                                        <td>{file.uploadedOn}</td>
                                                        <td>{file.size}</td>
                                                        <td className="text-end">
                                                            <a
                                                                href={file.url}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="btn btn-sm btn-light-primary me-2 d-inline-flex align-items-center gap-2"
                                                            >
                                                                <i className="bi bi-eye-fill"></i>
                                                                <span>Preview</span>
                                                            </a>

                                                            <a
                                                                href={file.url}
                                                                download={file.name}
                                                                className="btn btn-sm btn-light-success d-inline-flex align-items-center gap-2"
                                                            >
                                                                <i className="bi bi-download"></i>
                                                                <span>Download</span>
                                                            </a>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="text-center text-muted py-10">
                                        No attachments uploaded yet.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === "inventory" && (
                        <div className="card shadow-sm border-0">
                            <div className="card-header">
                                <h3 className="card-title fw-bold">Inventory Details</h3>
                            </div>
                            <div className="card-body">
                                <div className="row g-6">
                                    <div className="col-md-4"><strong>In Stock:</strong> {item.inStock}</div>
                                    <div className="col-md-4"><strong>Procurement Method:</strong> {item.procurementMethod}</div>
                                    <div className="col-md-4"><strong>Manage Batch No:</strong> {item.manageBatchNo}</div>
                                    <div className="col-md-4"><strong>Serial No:</strong> {item.serialNo}</div>
                                    <div className="col-md-4"><strong>Final FG:</strong> {item.finalFG}</div>
                                    <div className="col-md-4"><strong>Sales Item:</strong> {item.salesItem}</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "commercial" && (
                        <div className="card shadow-sm border-0">
                            <div className="card-header">
                                <h3 className="card-title fw-bold">Other Details</h3>
                            </div>
                            <div className="card-body">
                                <div className="row g-6">
                                    <div className="col-md-4"><strong>Inspection Required:</strong> {item.inspectionRequired}</div>
                                    <div className="col-md-4"><strong>Customer:</strong> {item.customer}</div>
                                    <div className="col-md-4"><strong>Item Group:</strong> {item.itemGroup}</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Base1>
    );
}
