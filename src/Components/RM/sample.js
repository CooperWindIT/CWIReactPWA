import React, { useMemo, useState } from "react";
import Base1 from "../Config/Base1";
import { useNavigate } from "react-router-dom";

export default function SampleRM() {
    const [selectedCustomer, setSelectedCustomer] = useState("");
    const [selectedItemGroup, setSelectedItemGroup] = useState("");
    const [selectedUomGroup, setSelectedUomGroup] = useState("");
    const [selectedItemType, setSelectedItemType] = useState("");
    const [itemNoFilter, setItemNoFilter] = useState("");
    const [customerPartNoFilter, setCustomerPartNoFilter] = useState("");
    const [customerPartNameFilter, setCustomerPartNameFilter] = useState("");
    const [searchText, setSearchText] = useState("");
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [selectedItems, setSelectedItems] = useState([]);
    const [uploadedFiles, setUploadedFiles] = useState([]);

    const navigate = useNavigate();


    const customerOptions = [
        "Ashok Leyland",
        "Tata Motors",
        "Mahindra",
        "Hyundai",
        "TVS Motors",
    ];

    const sampleData = [
        {
            id: 1,
            customer: "Ashok Leyland",
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
        },
        {
            id: 2,
            customer: "Tata Motors",
            itemNo: "ITM-1002",
            customerPartNo: "TM-CP-9920",
            customerPartName: "Brake Drum Assembly",
            itemDescription: "Brake Drum Assembly",
            customerRevisionNo: "R3",
            itemGroup: "Finished Goods",
            uomGroup: "Nos",
            itemType: "Inventory",
            inStock: 45,
            procurementMethod: "Make",
            manageBatchNo: "Yes",
            serialNo: "Yes",
            finalFG: "Yes",
            salesItem: "Yes",
            bomType: "Sales BOM",
            inspectionRequired: "Yes",
        },
        {
            id: 3,
            customer: "Mahindra",
            itemNo: "ITM-1003",
            customerPartNo: "MH-CP-4412",
            customerPartName: "Clutch Plate",
            itemDescription: "Clutch Plate",
            customerRevisionNo: "R2",
            itemGroup: "Semi Finished",
            uomGroup: "Set",
            itemType: "Inventory",
            inStock: 78,
            procurementMethod: "Buy",
            manageBatchNo: "No",
            serialNo: "No",
            finalFG: "No",
            salesItem: "No",
            bomType: "Assembly BOM",
            inspectionRequired: "Yes",
        },
        {
            id: 4,
            customer: "Hyundai",
            itemNo: "ITM-1004",
            customerPartNo: "HY-CP-8876",
            customerPartName: "Fuel Pipe Connector",
            itemDescription: "Fuel Pipe Connector",
            customerRevisionNo: "R5",
            itemGroup: "Components",
            uomGroup: "Nos",
            itemType: "Non Inventory",
            inStock: 230,
            procurementMethod: "Buy",
            manageBatchNo: "No",
            serialNo: "Yes",
            finalFG: "No",
            salesItem: "Yes",
            bomType: "Template BOM",
            inspectionRequired: "No",
        },
        {
            id: 5,
            customer: "TVS Motors",
            itemNo: "ITM-1005",
            customerPartNo: "TVS-CP-1209",
            customerPartName: "Handle Bar Bracket",
            itemDescription: "Handle Bar Bracket",
            customerRevisionNo: "R4",
            itemGroup: "Raw Material",
            uomGroup: "Nos",
            itemType: "Inventory",
            inStock: 95,
            procurementMethod: "Make",
            manageBatchNo: "Yes",
            serialNo: "No",
            finalFG: "Yes",
            salesItem: "Yes",
            bomType: "Production BOM",
            inspectionRequired: "Yes",
        },
    ];

    const itemGroupOptions = [...new Set(sampleData.map((item) => item.itemGroup))];
    const uomGroupOptions = [...new Set(sampleData.map((item) => item.uomGroup))];
    const itemTypeOptions = [...new Set(sampleData.map((item) => item.itemType))];

    const filteredData = useMemo(() => {
        return sampleData.filter((item) => {
            const q = searchText.trim().toLowerCase();

            const matchesCustomer = selectedCustomer ? item.customer === selectedCustomer : true;
            const matchesItemGroup = selectedItemGroup ? item.itemGroup === selectedItemGroup : true;
            const matchesUomGroup = selectedUomGroup ? item.uomGroup === selectedUomGroup : true;
            const matchesItemType = selectedItemType ? item.itemType === selectedItemType : true;

            const matchesItemNo = itemNoFilter
                ? item.itemNo.toLowerCase().includes(itemNoFilter.toLowerCase())
                : true;

            const matchesCustomerPartNo = customerPartNoFilter
                ? item.customerPartNo.toLowerCase().includes(customerPartNoFilter.toLowerCase())
                : true;

            const matchesCustomerPartName = customerPartNameFilter
                ? item.customerPartName.toLowerCase().includes(customerPartNameFilter.toLowerCase())
                : true;

            const matchesSearch = q
                ? Object.values(item).some((value) =>
                    String(value).toLowerCase().includes(q)
                )
                : true;

            return (
                matchesCustomer &&
                matchesItemGroup &&
                matchesUomGroup &&
                matchesItemType &&
                matchesItemNo &&
                matchesCustomerPartNo &&
                matchesCustomerPartName &&
                matchesSearch
            );
        });
    }, [
        selectedCustomer,
        selectedItemGroup,
        selectedUomGroup,
        selectedItemType,
        itemNoFilter,
        customerPartNoFilter,
        customerPartNameFilter,
        searchText,
    ]);

    const [itemSearch, setItemSearch] = useState("");

    const filteredItems = sampleData.filter((item) => {
        const q = itemSearch.trim().toLowerCase();
        if (!q) return true;

        return (
            item.itemNo.toLowerCase().includes(q) ||
            item.itemDescription.toLowerCase().includes(q) ||
            item.customerPartNo.toLowerCase().includes(q)
        );
    });


    const handleFileChange = (e) => {
        const files = Array.from(e.target.files || []);
        setUploadedFiles(files);
    };

    const handleItemCheckboxChange = (itemId) => {
        setSelectedItems((prev) =>
            prev.includes(itemId)
                ? prev.filter((id) => id !== itemId)
                : [...prev, itemId]
        );
    };

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
                            Item Master List
                        </h1>
                        <ul className="breadcrumb breadcrumb-separatorless fw-semibold fs-7 my-0 pt-1">
                            <li className="breadcrumb-item text-muted">
                                <a className="text-muted text-hover-primary">Home</a>
                            </li>
                            <li className="breadcrumb-item">
                                <span className="bullet bg-gray-500 w-5px h-2px"></span>
                            </li>
                            <li className="breadcrumb-item text-muted">Items</li>
                        </ul>
                    </div>

                    <div>
                        <button
                            type="button"
                            className="btn btn-primary d-inline-flex align-items-center btn-sm gap-2"
                            onClick={() => navigate("/rm/upload-documents")}
                        >
                            <i className="bi bi-cloud-upload-fill"></i>
                            Upload Document
                        </button>
                    </div>
                </div>
            </div>

            <div id="kt_app_content" className="app-content flex-column-fluid pt-2 mb-10">
                <div id="kt_app_content_container" className="app-container container-xxl">
                    <div className="card mb-4 shadow-sm border-0">
                        <div className="card-header bg-white border-bottom">
                            <div className="d-flex align-items-center">
                                <i className="bi bi-funnel-fill text-primary fs-4 me-2"></i>
                                <h5 className="mb-0 fw-bold text-dark">Filter Parameters</h5>
                            </div>
                        </div>

                        <div className="card-body">
                            <div className="row g-3 align-items-end">
                                <div className="col-12 col-md-3">
                                    <label className="form-label fw-semibold">Customer</label>
                                    <select
                                        className="form-select"
                                        value={selectedCustomer}
                                        onChange={(e) => setSelectedCustomer(e.target.value)}
                                    >
                                        <option value="">All Customers</option>
                                        {customerOptions.map((customer) => (
                                            <option key={customer} value={customer}>
                                                {customer}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="col-12 col-md-3">
                                    <label className="form-label fw-semibold">Item Group</label>
                                    <select
                                        className="form-select"
                                        value={selectedItemGroup}
                                        onChange={(e) => setSelectedItemGroup(e.target.value)}
                                    >
                                        <option value="">All Item Groups</option>
                                        {itemGroupOptions.map((group) => (
                                            <option key={group} value={group}>
                                                {group}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="col-12 col-md-3">
                                    <label className="form-label fw-semibold">UOM Group</label>
                                    <select
                                        className="form-select"
                                        value={selectedUomGroup}
                                        onChange={(e) => setSelectedUomGroup(e.target.value)}
                                    >
                                        <option value="">All UOM Groups</option>
                                        {uomGroupOptions.map((group) => (
                                            <option key={group} value={group}>
                                                {group}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="col-12 col-md-3">
                                    <label className="form-label fw-semibold">Item Type</label>
                                    <select
                                        className="form-select"
                                        value={selectedItemType}
                                        onChange={(e) => setSelectedItemType(e.target.value)}
                                    >
                                        <option value="">All Item Types</option>
                                        {itemTypeOptions.map((type) => (
                                            <option key={type} value={type}>
                                                {type}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="col-12 col-md-4">
                                    <label className="form-label fw-semibold">Item No</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Filter by item no"
                                        value={itemNoFilter}
                                        onChange={(e) => setItemNoFilter(e.target.value)}
                                    />
                                </div>

                                <div className="col-12 col-md-4">
                                    <label className="form-label fw-semibold">Customer Part No</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Filter by customer part no"
                                        value={customerPartNoFilter}
                                        onChange={(e) => setCustomerPartNoFilter(e.target.value)}
                                    />
                                </div>

                                <div className="col-12 col-md-4">
                                    <label className="form-label fw-semibold">Customer Part Name</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Filter by customer part name"
                                        value={customerPartNameFilter}
                                        onChange={(e) => setCustomerPartNameFilter(e.target.value)}
                                    />
                                </div>

                                <div className="col-12 col-md-9">
                                    <label className="form-label fw-semibold">Global Search</label>
                                    <div className="input-group">
                                        <span className="input-group-text bg-white">
                                            <i className="bi bi-search text-primary"></i>
                                        </span>
                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="Search all fields..."
                                            value={searchText}
                                            onChange={(e) => setSearchText(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div className="col-12 col-md-3">
                                    <button
                                        type="button"
                                        className="btn btn-light-secondary w-100"
                                        onClick={() => {
                                            setSelectedCustomer("");
                                            setSelectedItemGroup("");
                                            setSelectedUomGroup("");
                                            setSelectedItemType("");
                                            setItemNoFilter("");
                                            setCustomerPartNoFilter("");
                                            setCustomerPartNameFilter("");
                                            setSearchText("");
                                        }}
                                    >
                                        <i className="bi bi-arrow-clockwise me-2"></i>
                                        Reset Filters
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="card shadow-sm border-0">
                        <div className="card-header bg-white border-bottom d-flex justify-content-between align-items-center flex-wrap gap-2">
                            <h5 className="mb-0 fw-bold text-dark">Item Master List</h5>
                            <span className="badge bg-light-primary text-primary border border-primary-subtle px-3 py-2">
                                Total Records: {filteredData.length}
                            </span>
                        </div>

                        <div className="card-body p-2">
                            <div className="table-responsive">
                                <table className="table align-middle table-row-dashed fs-6 gy-5 nowrap-table">
                                    <thead className="bg-light-primary">
                                        <tr className="text-start text-muted fw-bold fs-7 text-uppercase border-bottom-2 border-primary">
                                            <th>Item No</th>
                                            <th>Customer Part No</th>
                                            <th>Customer Part Name</th>
                                            <th>Item Description</th>
                                            <th>Customer Revision No</th>
                                            <th>Item Group</th>
                                            <th>UOM Group</th>
                                            <th>Item Type</th>
                                            <th>In Stock</th>
                                            <th>Procurement Method</th>
                                            <th>Manage Batch No</th>
                                            <th>Serial No</th>
                                            <th>Final FG</th>
                                            <th>Sales Item</th>
                                            <th>BOM Type</th>
                                            <th>Inspection Required</th>
                                        </tr>
                                    </thead>

                                    <tbody className="fw-semibold text-gray-700">
                                        {filteredData.length > 0 ? (
                                            filteredData.map((item) => (
                                                <tr key={item.id}>
                                                    <td className="fw-semibold text-primary">
                                                        <span
                                                            role="button"
                                                            className="cursor-pointer text-hover-primary"
                                                            onClick={() => navigate(`/item-master/${item.id}`, { state: { item } })}
                                                        >
                                                            {item.itemNo}
                                                        </span>
                                                    </td>
                                                    <td>{item.customerPartNo}</td>
                                                    <td>{item.customerPartName}</td>
                                                    <td>{item.itemDescription}</td>
                                                    <td>{item.customerRevisionNo}</td>
                                                    <td>{item.itemGroup}</td>
                                                    <td>{item.uomGroup}</td>
                                                    <td>{item.itemType}</td>
                                                    <td>{item.inStock}</td>
                                                    <td>
                                                        <span className={`badge ${item.procurementMethod === "Make" ? "bg-light-success text-success" : "bg-light-info text-info"}`}>
                                                            {item.procurementMethod}
                                                        </span>
                                                    </td>
                                                    <td>{item.manageBatchNo}</td>
                                                    <td>{item.serialNo}</td>
                                                    <td>{item.finalFG}</td>
                                                    <td>{item.salesItem}</td>
                                                    <td>{item.bomType}</td>
                                                    <td>
                                                        <span className={`badge ${item.inspectionRequired === "Yes" ? "bg-light-warning text-warning" : "bg-light-secondary text-secondary"}`}>
                                                            {item.inspectionRequired}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="16" className="text-center py-5 text-muted fw-semibold">
                                                    No records found
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {showUploadModal && (
                <div
                    className="modal fade show"
                    style={{ display: "block", background: "rgba(15, 23, 42, 0.45)" }}
                    tabIndex="-1"
                >
                    <div className="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
                        <div className="modal-content border-0 shadow">
                            <div className="modal-header">
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
                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={() => setShowUploadModal(false)}
                                ></button>
                            </div>

                            <div className="modal-body">
                                <div className="row g-4">
                                    <div className="col-12">
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
                                            style={{ maxHeight: "260px", overflowY: "auto" }}
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

                                    <div className="col-12">
                                        <label className="form-label fw-semibold">Upload Documents</label>
                                        <input
                                            type="file"
                                            className="form-control"
                                            multiple
                                            onChange={handleFileChange}
                                        />
                                    </div>

                                    <div className="col-12">
                                        <div className="card bg-light-primary border-0">
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
                                    </div>

                                    <div className="col-12">
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

                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn btn-light btn-sm"
                                    onClick={() => setShowUploadModal(false)}
                                >
                                    Cancel
                                </button>

                                <button type="button" className="btn btn-primary btn-sm d-inline-flex align-items-center gap-2">
                                    <i className="bi bi-cloud-upload text-white"></i>
                                    <span>Upload Documents</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}


            <style>
                {`
                    .nowrap-table {
                        min-width: 1800px;
                    }

                    .nowrap-table th,
                    .nowrap-table td {
                        white-space: nowrap;
                        vertical-align: middle;
                    }
                    .small-checkbox {
                        transform: scale(0.9);
                        cursor: pointer;
                    }
                `}
            </style>
        </Base1>
    );
}
