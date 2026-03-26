import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { BASE_IMAGE_API_GET } from "../../Config/Config";
import { fetchWithAuth } from "../../../utils/api";

export default function ViewMachine({ viewObj }) {

    const [sessionUserData, setSessionUserData] = useState({});
    const [machineData, setMachineData] = useState([]);
    const [dataLoading, setDataLoading] = useState(false);
    const [images, setImages] = useState(false);
    const [previewImage, setPreviewImage] = useState(null);
    const [showPreview, setShowPreview] = useState(false);
    const [previewFile, setPreviewFile] = useState(false);

    useEffect(() => {
        const userDataString = sessionStorage.getItem("userData");
        if (userDataString) {
            const userData = JSON.parse(userDataString);
            setSessionUserData(userData);
        } else {
            console.log('No session');
        }
    }, []);

    const fetchData = async () => {
        setDataLoading(true);
        try {
            const response = await fetchWithAuth(`PMMS/GetMachineById?OrgId=${sessionUserData.OrgId}&MachineId=${viewObj?.MachineId}`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });
            if (response.ok) {
                const data = await response.json();
                setMachineData(data.ResultData[0]);
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
        if (machineData?.ImageUrls) {
            const urlArray = machineData.ImageUrls.split(",");
            const fullUrls = urlArray.map(img => `${BASE_IMAGE_API_GET}${img}`);
            setImages(fullUrls);
        } else {
            setImages([]); // fallback to empty array
        }
    }, [machineData]);

    useEffect(() => {
        if (sessionUserData.OrgId && viewObj?.MachineId) {
            fetchData();
        }
    }, [sessionUserData, viewObj]);

    const handleViewImage = (image) => {
        if (image instanceof File) {
            const url = URL.createObjectURL(image);
            setPreviewImage(url);
        } else {
            setPreviewImage(image);
        }
    };

    const getStatusBadgeClass = (status) => {
        switch (status?.toLowerCase()) {
            case "idle":
                return "badge-light-primary";
            case "live":
                return "badge-light-success";
            case "breakdown":
                return "badge-light-danger";
            case "readytooperate":
                return "badge-light-info";
            default:
                return "badge-light";
        }
    };

    const handleClosePreview = () => {
        setPreviewImage(null);
    };

    return (
        <div
            className="offcanvas offcanvas-end"
            tabIndex="-1"
            id="offcanvasRightView"
            aria-labelledby="offcanvasRightLabel"
            style={{ width: "90%" }}
        >
            <style>
                {`
                    @media (min-width: 768px) { /* Medium devices and up (md) */
                        #offcanvasRightView {
                            width: 35% !important;
                        }
                    }
                `}
            </style>
            <form autoComplete="off">
                <div className="offcanvas-header d-flex justify-content-between align-items-center">
                    <h5 id="offcanvasRightLabel" className="mb-0">View Machine</h5>
                    <div className="d-flex align-items-center">
                        <button
                            type="button"
                            className="btn-close"
                            data-bs-dismiss="offcanvas"
                            aria-label="Close"
                        ></button>
                    </div>
                </div>

                {/* <div className="offcanvas-body">
                    {dataLoading ?
                        <div className="text-center my-3">
                            <div className="spinner-border text-primary" role="status">
                                <span className="visually-hidden">Loading...</span>
                            </div>
                            <div className="mt-2">Loading machine parts...</div>
                        </div> :

                        <div className="row g-3">
                            <div className="col-6">
                                <label className="form-label fw-bold">Machine Name</label>
                                <div className="form-control-plaintext">{machineData?.MachineName}</div>
                            </div>

                            <div className="col-6">
                                <label className="form-label fw-bold">Machine Code</label>
                                <div className="form-control-plaintext">{machineData?.MachineCode}</div>
                            </div>

                            <div className="col-6">
                                <label className="form-label fw-bold">Model</label>
                                <div className="form-control-plaintext">{machineData?.Model}</div>
                            </div>

                            <div className="col-6">
                                <label className="form-label fw-bold">Installation Date</label>
                                <div className="form-control-plaintext">{new Date(machineData?.InstallationDate).toLocaleDateString('en-GB')}</div>
                            </div>

                            <div className="col-6">
                                <label className="form-label fw-bold">Next Maintenance</label>
                                <div className="form-control-plaintext">{new Date(machineData?.UpcomingMaintenanceDate).toLocaleDateString('en-GB')}</div>
                            </div>

                            <div className="col-6">
                                <label className="form-label fw-bold">Status</label>
                                <div className="form-control-plaintext text-danger fw-semibold"><span className={`badge ${getStatusBadgeClass(machineData.Status)}`}>
                                    {machineData.Status}
                                </span></div>
                            </div>

                            <div className="col-6">
                                <label className="form-label fw-bold">Department</label>
                                <div className="form-control-plaintext">{machineData?.DeptName}</div>
                            </div>

                            <label className="form-label fw-bold">Images</label>
                            <div className="d-flex flex-wrap mt-2 gap-2">
                                {Array.isArray(images) && images.map((image, index) => {
                                    const isFile = image instanceof File;
                                    const src = isFile ? URL.createObjectURL(image) : image;

                                    return (
                                        <div
                                            key={index}
                                            className="position-relative shadow-sm rounded"
                                            style={{ width: 100, height: 100, overflow: 'hidden' }}
                                        >
                                            <img
                                                src={src}
                                                alt="preview"
                                                className="img-fluid rounded"
                                                style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                                            />
                                            <span
                                                onClick={() => handleViewImage(image)}
                                                className="position-absolute bottom-0 end-0 bg-primary text-white rounded-circle"
                                                style={{ cursor: 'pointer', padding: '0.2rem 0.4rem', fontSize: '0.8rem' }}
                                            >
                                                <i className="fa-regular fa-eye fa-beat-fade"></i>
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    }
                </div> */}
                <div className="offcanvas-body" style={{
                    marginTop: "-2rem",
                    maxHeight: "calc(100vh - 4rem)",  // take full height minus top offset
                    overflowY: "auto"
                }}>
                    {dataLoading ? (
                        <div className="text-center my-3">
                            <div className="spinner-border text-primary" role="status">
                                <span className="visually-hidden">Loading...</span>
                            </div>
                            <div className="mt-2">Loading machine details...</div>
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <table className="table table-sm align-middle border rounded shadow-sm bg-white">
                                <tbody>
                                    <tr className="table-light">
                                        <th width="30%">Machine Name</th>
                                        <td>{machineData?.MachineName || '-'}</td>
                                    </tr>
                                    <tr>
                                        <th>Machine Code</th>
                                        <td>{machineData?.MachineCode || '-'}</td>
                                    </tr>
                                    <tr>
                                        <th>Asset Code</th>
                                        <td>{machineData?.AssetCode || '-'}</td>
                                    </tr>
                                    <tr className="table-light">
                                        <th>Model</th>
                                        <td>{machineData?.Model || '-'}</td>
                                    </tr>
                                    <tr>
                                        <th>Machine Make</th>
                                        <td>{machineData?.MachineMake || '-'}</td>
                                    </tr>
                                    <tr>
                                        <th>Purchase Order Numebr</th>
                                        <td>{machineData?.PONumber || '-'}</td>
                                    </tr>
                                    <tr>
                                        <th>Invoice Numebr</th>
                                        <td>{machineData?.InvoiceNumber || '-'}</td>
                                    </tr>
                                    <tr className="table-light">
                                        <th>Supplier</th>
                                        <td>{machineData?.SupplierName || '-'}</td>
                                    </tr>
                                    <tr>
                                        <th>Purchase Date</th>
                                        <td>
                                            {machineData?.PurchaseDate
                                                ? new Date(machineData.PurchaseDate).toLocaleDateString('en-GB')
                                                : '-'}
                                        </td>
                                    </tr>
                                    <tr className="table-light">
                                        <th>Installation Date</th>
                                        <td>
                                            {machineData?.InstallationDate
                                                ? new Date(machineData.InstallationDate).toLocaleDateString('en-GB')
                                                : '-'}
                                        </td>
                                    </tr>
                                    <tr>
                                        <th>Next Maintenance</th>
                                        <td>
                                            {machineData?.UpcomingMaintenanceDate
                                                ? new Date(machineData.UpcomingMaintenanceDate).toLocaleDateString('en-GB')
                                                : '-'}
                                        </td>
                                    </tr>
                                    <tr className="table-light">
                                        <th>Section</th>
                                        <td>{machineData?.SectionName || '-'}</td>
                                    </tr>
                                    <tr>
                                        <th>Department</th>
                                        <td>{machineData?.DeptName || '-'}</td>
                                    </tr>
                                    <tr className="table-light">
                                        <th>Status</th>
                                        <td>
                                            <span
                                                className={`badge px-3 py-2 ${getStatusBadgeClass(machineData.Status)}`}
                                            >
                                                {machineData.Status}
                                            </span>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>

                            {/* Image section below */}
                            <h6 className="fw-bold text-primary mt-4 mb-2">Machine Images</h6>
                            <div className="d-flex flex-wrap gap-3">
                                {Array.isArray(images) && images.length > 0 ? (
                                    images.map((image, index) => {
                                        const isFile = image instanceof File;
                                        const src = isFile ? URL.createObjectURL(image) : image;
                                        return (
                                            <div
                                                key={index}
                                                className="position-relative border rounded-3 shadow-sm"
                                                style={{ width: 100, height: 100, overflow: 'hidden' }}
                                            >
                                                <img
                                                    src={src}
                                                    alt="machine"
                                                    className="img-fluid"
                                                    style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                                                />
                                                <span
                                                    onClick={() => handleViewImage(image)}
                                                    className="position-absolute bottom-0 end-0 bg-primary text-white rounded-circle"
                                                    style={{
                                                        cursor: 'pointer',
                                                        padding: '0.2rem 0.4rem',
                                                        fontSize: '0.8rem',
                                                    }}
                                                >
                                                    <i className="fa-regular fa-eye fa-beat-fade"></i>
                                                </span>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <p className="text-muted small mb-0">No images available</p>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {previewImage && (
                    <div
                        className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center bg-dark bg-opacity-75"
                        style={{ zIndex: 1050 }}
                        onClick={handleClosePreview}
                    >
                        <img
                            src={previewImage}
                            alt="Full preview"
                            style={{ maxWidth: '90%', maxHeight: '90%', borderRadius: '10px' }}
                        />
                    </div>
                )}
                {showPreview && (
                    <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                        <div className="modal-dialog modal-dialog-centered modal-lg">
                            <div className="modal-content">
                                <div className="modal-header">
                                    <h5 className="modal-title">File Preview</h5>
                                    <button
                                        type="button"
                                        className="btn-close"
                                        onClick={() => setShowPreview(false)}
                                    ></button>
                                </div>
                                <div className="modal-body text-center">
                                    <img
                                        src={previewFile}
                                        alt="Full View"
                                        className="img-fluid"
                                        style={{ maxHeight: '70vh', objectFit: 'contain' }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </form>
            {/* 
                            <div className="d-flex mt-5 d-none">
                                <div className="d-flex flex-column">
                                    <label className="form-label fw-bold">Purchase File</label>
                                    <div
                                        className="position-relative shadow-sm rounded"
                                        style={{ width: 100, height: 100, overflow: 'hidden' }}
                                    >
                                        <img
                                            src={`${BASE_DOCS_API}${machineData?.POfileUrl}`}
                                            alt="POfileUrl"
                                            className="img-fluid rounded"
                                            style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                                        />
                                        <span
                                            onClick={() => {
                                                setPreviewFile(`${BASE_DOCS_API}${machineData?.POfileUrl}`);
                                                setShowPreview(true);
                                            }}
                                            className="position-absolute bottom-0 end-0 bg-primary text-white rounded-circle"
                                            style={{ cursor: 'pointer', padding: '0.2rem 0.4rem', fontSize: '0.8rem' }}
                                        >
                                            <i className="fa-regular fa-eye fa-beat-fade"></i>
                                        </span>
                                    </div>
                                </div>

                                <div className="d-flex flex-column ms-10">
                                    <label className="form-label fw-bold">Invoice File</label>
                                    <div
                                        className="position-relative shadow-sm rounded"
                                        style={{ width: 100, height: 100, overflow: 'hidden' }}
                                    >
                                        <img
                                            src={`${BASE_DOCS_API}${machineData?.InvoicefileUrl}`}
                                            alt="InvoicefileUrl"
                                            className="img-fluid rounded"
                                            style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                                        />
                                        <span
                                            onClick={() => {
                                                setPreviewFile(`${BASE_DOCS_API}${machineData?.InvoicefileUrl}`);
                                                setShowPreview(true);
                                            }}
                                            className="position-absolute bottom-0 end-0 bg-primary text-white rounded-circle"
                                            style={{ cursor: 'pointer', padding: '0.2rem 0.4rem', fontSize: '0.8rem' }}
                                        >
                                            <i className="fa-regular fa-eye fa-beat-fade"></i>
                                        </span>
                                    </div>
                                </div>

                            </div> */}
        </div>
    );
}

ViewMachine.propTypes = {
    viewObj: PropTypes.object.isRequired,
};