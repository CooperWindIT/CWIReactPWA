import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Base1 from "../Config/Base1";

export default function SampleRM1() {
    const navigate = useNavigate();

    const [selectedItems, setSelectedItems] = useState([]);
    const [uploadedFiles, setUploadedFiles] = useState([]);
    const [itemSearch, setItemSearch] = useState("");

    const sampleData = [
        {
            id: 1,
            itemNo: "ITM-1001",
            customerPartNo: "AL-CP-7781",
            itemDescription: "Front Axle Housing",
        },
        {
            id: 2,
            itemNo: "ITM-1002",
            customerPartNo: "TM-CP-9920",
            itemDescription: "Brake Drum Assembly",
        },
        {
            id: 3,
            itemNo: "ITM-1003",
            customerPartNo: "MH-CP-4412",
            itemDescription: "Clutch Plate",
        },
        {
            id: 4,
            itemNo: "ITM-1004",
            customerPartNo: "HY-CP-8876",
            itemDescription: "Fuel Pipe Connector",
        },
        {
            id: 5,
            itemNo: "ITM-1005",
            customerPartNo: "TVS-CP-1209",
            itemDescription: "Handle Bar Bracket",
        },
    ];

    const handleItemCheckboxChange = (itemId) => {
        setSelectedItems((prev) =>
            prev.includes(itemId)
                ? prev.filter((id) => id !== itemId)
                : [...prev, itemId]
        );
    };

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files || []);
        setUploadedFiles(files);
    };

    const filteredItems = useMemo(() => {
        const q = itemSearch.trim().toLowerCase();

        if (!q) return sampleData;

        return sampleData.filter((item) =>
            item.itemNo.toLowerCase().includes(q) ||
            item.customerPartNo.toLowerCase().includes(q) ||
            item.itemDescription.toLowerCase().includes(q)
        );
    }, [itemSearch]);

    const selectedItemDetails = sampleData.filter((item) =>
        selectedItems.includes(item.id)
    );

    return (
        <Base1>
            <div id="kt_app_toolbar" className="app-toolbar py-3 py-lg-6">
                <div
                    id="kt_app_toolbar_container"
                    className="app-container container-xxl d-flex flex-stack flex-wrap gap-3"
                >
                    <div className="page-title d-flex flex-column justify-content-center flex-wrap me-3">
                        <h1 className="page-heading d-flex text-gray-900 fw-bold fs-3 flex-column justify-content-center my-0">
                            Upload Documents
                        </h1>
                        <ul className="breadcrumb breadcrumb-separatorless fw-semibold fs-7 my-0 pt-1">
                            <li className="breadcrumb-item text-muted">
                                <a className="text-muted text-hover-primary">Home</a>
                            </li>
                            <li className="breadcrumb-item">
                                <span className="bullet bg-gray-500 w-5px h-2px"></span>
                            </li>
                            <li className="breadcrumb-item text-muted">Items</li>
                            <li className="breadcrumb-item">
                                <span className="bullet bg-gray-500 w-5px h-2px"></span>
                            </li>
                            <li className="breadcrumb-item text-muted">Upload Documents</li>
                        </ul>
                    </div>

                    <div>
                        <button
                            type="button"
                            className="btn btn-light-primary btn-sm d-inline-flex align-items-center gap-2"
                            onClick={() => navigate(-1)}
                        >
                            <i className="bi bi-arrow-left"></i>
                            Back
                        </button>
                    </div>
                </div>
            </div>

            <div id="kt_app_content" className="app-content flex-column-fluid pt-2 mb-10">
                <div id="kt_app_content_container" className="app-container container-xxl">
                    <div className="card border-0 shadow-sm">
                        <div className="card-header border-0 pt-6">
                            <div className="d-flex align-items-start gap-3">
                                <div
                                    className="bg-primary bg-opacity-10 text-primary rounded-circle d-flex align-items-center justify-content-center"
                                    style={{ width: "42px", height: "42px" }}
                                >
                                    <i className="bi bi-cloud-arrow-up-fill fs-5"></i>
                                </div>

                                <div>
                                    <h5 className="mb-1 fw-bold text-dark">
                                        Upload Documents for Multiple Parts
                                    </h5>
                                    <div className="text-muted small">
                                        Select one or more items and upload the required documents
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="card-body">
                            <div className="row g-5">
                                <div className="col-12 col-xl-6">
                                    <label className="form-label fw-semibold d-flex align-items-center gap-2">
                                        <i className="bi bi-box-seam text-primary"></i>
                                        Select Items
                                    </label>

                                    <div className="position-relative mb-3">
                                        <i className="bi bi-search position-absolute top-50 translate-middle-y ms-3 text-muted"></i>
                                        <input
                                            type="text"
                                            className="form-control form-control-sm ps-10"
                                            placeholder="Search by item no, part no, description..."
                                            value={itemSearch}
                                            onChange={(e) => setItemSearch(e.target.value)}
                                        />
                                    </div>

                                    <div
                                        className="border rounded p-3 bg-light"
                                        style={{ maxHeight: "420px", overflowY: "auto" }}
                                    >
                                        <div className="d-flex flex-column gap-2">
                                            {filteredItems.length > 0 ? (
                                                filteredItems.map((item) => (
                                                    <label
                                                        key={item.id}
                                                        className="d-flex align-items-start gap-3 p-3 rounded bg-white border cursor-pointer"
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            className="form-check-input small-checkbox mt-1"
                                                            checked={selectedItems.includes(item.id)}
                                                            onChange={() => handleItemCheckboxChange(item.id)}
                                                        />

                                                        <div className="flex-grow-1">
                                                            <div className="fw-semibold text-dark d-flex align-items-center gap-2">
                                                                <i className="bi bi-upc-scan text-primary"></i>
                                                                {item.itemNo}
                                                            </div>
                                                            <div className="small text-muted mt-1">
                                                                <i className="bi bi-file-text me-1"></i>
                                                                {item.itemDescription}
                                                            </div>
                                                        </div>

                                                        <span className="badge bg-light-primary text-primary d-flex align-items-center gap-1">
                                                            <i className="bi bi-tag-fill fs-8"></i>
                                                            {item.customerPartNo}
                                                        </span>
                                                    </label>
                                                ))
                                            ) : (
                                                <div className="text-center text-muted py-4">
                                                    <i className="bi bi-search fs-3 d-block mb-2"></i>
                                                    No matching items found
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="text-muted small mt-2 d-flex align-items-center gap-2">
                                        <i className="bi bi-info-circle"></i>
                                        You can select any number of items.
                                    </div>
                                </div>

                                <div className="col-12 col-xl-6">
                                    <div className="mb-5">
                                        <label className="form-label fw-semibold d-flex align-items-center gap-2">
                                            <i className="bi bi-cloud-upload text-success"></i>
                                            Upload Documents
                                        </label>
                                        <input
                                            type="file"
                                            className="form-control"
                                            multiple
                                            onChange={handleFileChange}
                                        />
                                    </div>

                                    <div className="card bg-light-primary border-0 mb-5">
                                        <div className="card-body py-4">
                                            <div className="fw-bold text-primary mb-3 d-flex align-items-center gap-2">
                                                <i className="bi bi-check2-square"></i>
                                                Selected Items ({selectedItemDetails.length})
                                            </div>

                                            {selectedItemDetails.length > 0 ? (
                                                <div className="d-flex flex-column gap-2">
                                                    {selectedItemDetails.map((item) => (
                                                        <div
                                                            key={item.id}
                                                            className="d-flex justify-content-between align-items-center bg-white rounded px-3 py-2 border"
                                                        >
                                                            <div>
                                                                <div className="fw-semibold text-dark">
                                                                    {item.itemNo}
                                                                </div>
                                                                <div className="small text-muted">
                                                                    {item.itemDescription}
                                                                </div>
                                                            </div>
                                                            <span className="badge bg-light-primary text-primary">
                                                                {item.customerPartNo}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-muted small">
                                                    No items selected yet.
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="card bg-light-success border-0">
                                        <div className="card-body py-4">
                                            <div className="fw-bold text-success mb-3 d-flex align-items-center gap-2">
                                                <i className="bi bi-paperclip"></i>
                                                Uploaded Files
                                            </div>

                                            {uploadedFiles.length > 0 ? (
                                                <div className="d-flex flex-column gap-2">
                                                    {uploadedFiles.map((file, index) => (
                                                        <div
                                                            key={`${file.name}-${index}`}
                                                            className="d-flex justify-content-between align-items-center bg-white rounded px-3 py-2 border"
                                                        >
                                                            <div className="d-flex align-items-center gap-2">
                                                                <i className="bi bi-paperclip text-success"></i>
                                                                <span className="fw-semibold text-dark">
                                                                    {file.name}
                                                                </span>
                                                            </div>
                                                            <span className="small text-muted">
                                                                {(file.size / 1024 / 1024).toFixed(2)} MB
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-muted small">
                                                    No files chosen yet.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="card-footer d-flex justify-content-end gap-2">
                            <button
                                type="button"
                                className="btn btn-light btn-sm"
                                onClick={() => navigate(-1)}
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                className="btn btn-primary btn-sm d-inline-flex align-items-center gap-2"
                            >
                                <i className="bi bi-cloud-upload text-white"></i>
                                <span>Upload Documents</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <style>
                {`
                    .small-checkbox {
                        transform: scale(0.9);
                        cursor: pointer;
                    }
                `}
            </style>
        </Base1>
    );
}
