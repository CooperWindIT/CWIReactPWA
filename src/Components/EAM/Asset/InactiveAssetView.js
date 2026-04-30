import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { fetchWithAuth } from "../../../utils/api";
import { BASE_IMAGE_API_GET } from "../../Config/Config";

export default function InactiveAssetView({ inactiveAssetObj }) {
    const [sessionUserData, setSessionUserData] = useState({});
    const [assetData, setAssetData] = useState(null);
    const [assetPartsData, setAssetPartsData] = useState([]);
    const [assetLogsData, setAssetLogsData] = useState([]);
    const [loading, setLoading] = useState(false);

    // Helper to format dates safely
    const formatToDDMMYYYY = (dateString) => {
        if (!dateString) return "-";
        const date = new Date(dateString);
        return date.toLocaleDateString("en-GB"); // Returns DD/MM/YYYY
    };

    useEffect(() => {
        const userDataString = sessionStorage.getItem("userData");
        if (userDataString) {
            setSessionUserData(JSON.parse(userDataString));
        }
    }, []);

    useEffect(() => {
        if (sessionUserData?.OrgId && inactiveAssetObj?.MachineId) {
            fetchAllData();
        }
    }, [sessionUserData, inactiveAssetObj]);

    const fetchAllData = async () => {
        setLoading(true);
        try {
            // Fetch Machine Details
            const res = await fetchWithAuth(`PMMS/GetMachineById?OrgId=${inactiveAssetObj?.OrgId || sessionUserData?.OrgId}&MachineId=${inactiveAssetObj?.MachineId}`, {
                method: "GET",
            });
            const json = await res.json();
            if (res.ok) setAssetData(json?.ResultData?.[0]);

            // Fetch Parts
            const partsRes = await fetchWithAuth(`PMMS/GetPartsByMachineId?MachineId=${inactiveAssetObj?.MachineId}`, {
                method: "GET",
            });
            const partsJson = await partsRes.json();
            if (partsRes.ok) setAssetPartsData(partsJson?.ResultData ?? []);

            // Fetch Logs
            const storedModule = JSON.parse(localStorage.getItem("ModuleData"));
            const logsRes = await fetchWithAuth(`Portal/GetLogsbyEntityId?OrgId=${sessionUserData?.OrgId}&EntityId=${inactiveAssetObj?.MachineId}&ModuleId=${storedModule?.Id}&EntityType=MachineReg`, {
                method: "GET",
            });
            const logsJson = await logsRes.json();
            if (logsRes.ok) setAssetLogsData(logsJson?.ResultData ?? []);

        } catch (err) {
            console.error("Error fetching data:", err);
        } finally {
            setLoading(false);
        }
    };

    const details = [
        { icon: "bi bi-gear", label: "Asset Name", value: assetData?.MachineName || "-" },
        { icon: "bi bi-upc-scan", label: "Code", value: assetData?.MachineCode || "-" },
        { icon: "bi bi-upc-scan", label: "Asset Code", value: assetData?.AssetCode || "-" },
        { icon: "bi bi-cpu", label: "Model", value: assetData?.Model || "-" },
        { icon: "bi bi-building-gear", label: "Make", value: assetData?.MachineMake || "-" },
        { icon: "bi bi-diagram-3", label: "Department", value: assetData?.DeptName || "-" },
        { icon: "bi bi-layers", label: "Asset Type", value: assetData?.TypeName || "-" },
        { icon: "bi bi-truck", label: "Supplier", value: assetData?.SupplierName || "-" },
        { icon: "bi bi-calendar-check", label: "Purchase Date", value: formatToDDMMYYYY(assetData?.PurchaseDate) },
        { icon: "bi bi-calendar-plus", label: "Installation Date", value: formatToDDMMYYYY(assetData?.InstallationDate) },
        { icon: "bi bi-bell", label: "Next Due", value: formatToDDMMYYYY(assetData?.UpcomingMaintenanceDate) },
    ];

    return (
        <div className="offcanvas offcanvas-end" tabIndex="-1" id="offcanvasRightInactiveView" style={{ width: "90%" }}>
            <style>
                {`@media (min-width: 768px) { #offcanvasRightInactiveView { width: 60% !important; } }`}
            </style>

            <div className="offcanvas-header bg-light border-bottom">
                <h5 className="offcanvas-title fw-bold text-primary">
                    Asset View: {assetData?.MachineCode}
                </h5>
                <button type="button" className="btn-close" data-bs-dismiss="offcanvas"></button>
            </div>

            <div className="offcanvas-body">
                {/* Tabs Navigation */}
                <ul className="nav nav-tabs nav-line-tabs mb-5 fs-6">
                    <li className="nav-item">
                        <a className="nav-link active fw-bold" data-bs-toggle="tab" href="#tab_info">Asset Info</a>
                    </li>
                    <li className="nav-item">
                        <a className="nav-link fw-bold" data-bs-toggle="tab" href="#tab_parts">Spare Parts</a>
                    </li>
                    <li className="nav-item">
                        <a className="nav-link fw-bold" data-bs-toggle="tab" href="#tab_logs">Logs</a>
                    </li>
                </ul>

                <div className="tab-content" id="myTabContent">
                    {/* Tab: Info */}
                    <div className="tab-pane fade show active" id="tab_info" role="tabpanel">
                        {assetData?.ImageUrls && (
                            <div className="mb-4">
                                <div className="fw-bold text-gray-700 mb-2">Asset Images</div>

                                <div className="d-flex flex-wrap gap-2">
                                    {assetData.ImageUrls
                                        ?.split(",")               // convert to array
                                        .filter(Boolean)           // remove empty
                                        .map((img, index) => (
                                            <div
                                                key={index}
                                                className="border rounded p-1 bg-white shadow-sm"
                                                style={{ width: "70px", height: "70px" }}
                                            >
                                                <img
                                                    src={`${BASE_IMAGE_API_GET}${img.trim()}`}
                                                    alt={`asset-${index}`}
                                                    className="w-100 h-100 rounded"
                                                    style={{ objectFit: "cover", cursor: "pointer" }}
                                                />
                                            </div>
                                        ))}
                                </div>
                            </div>
                        )}
                        <div className="row g-3">
                            {details.map((detail, i) => (
                                <div className="col-md-6 col-12" key={i}>
                                    <div className="d-flex align-items-start p-3 border rounded bg-light-neutral">
                                        <i className={`${detail.icon} fs-4 me-3 text-primary`}></i>
                                        <div>
                                            <div className="text-muted fs-8 fw-bold text-uppercase">{detail.label}</div>
                                            <div className="fw-bold text-gray-800">{detail.value}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Tab: Spare Parts */}
                    <div className="tab-pane fade" id="tab_parts" role="tabpanel">
                        <div className="table-responsive">
                            <table className="table table-row-dashed table-row-gray-300 align-middle gs-0 gy-4">

                                <thead>
                                    <tr className="fw-bold text-muted bg-light">
                                        <th className="ps-4 min-w-250px">Part</th>
                                        <th className="min-w-120px">Code</th>
                                        <th className="min-w-120px">Model</th>
                                        <th className="min-w-150px">Serial No</th>
                                        <th className="min-w-120px">Installed</th>
                                        <th className="min-w-120px text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {assetPartsData?.length > 0 ? (
                                        assetPartsData.map((part, index) => (
                                            <tr key={index}>
                                                <td className="ps-4">
                                                    <div className="d-flex align-items-center gap-3">
                                                        <div className="symbol symbol-50px">
                                                            <img
                                                                src={`${BASE_IMAGE_API_GET}${part.ImageUrl}`}
                                                                alt={part.PartName}
                                                                className="rounded-2"
                                                                style={{ width: "40px", height: "40px", objectFit: "cover" }}
                                                            />
                                                        </div>
                                                        <div className="d-flex flex-column">
                                                            <span className="fw-bold text-gray-800">
                                                                {part.PartName}
                                                            </span>
                                                            <span className="text-muted fs-7">
                                                                {part.Remarks || "No remarks"}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className="badge badge-light-primary fw-semibold">
                                                        {part.PartCode || "-"}
                                                    </span>
                                                </td>
                                                <td className="text-gray-700 fw-semibold">
                                                    {part.PartModel || "-"}
                                                </td>
                                                <td className="text-gray-600">
                                                    {part.SerialNumber || "-"}
                                                </td>
                                                <td className="text-gray-600">
                                                    {part.InstallationDate
                                                        ? new Date(part.InstallationDate).toLocaleDateString()
                                                        : "-"}
                                                </td>
                                                <td className="text-center">
                                                    <span
                                                        className={`badge fw-semibold ${part.Status === "Operational"
                                                            ? "badge-light-success"
                                                            : "badge-light-warning"
                                                            }`}
                                                    >
                                                        {part.Status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="6" className="text-center py-5 text-muted">
                                                No spare parts linked.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Tab: Logs */}
                    <div className="tab-pane fade" id="tab_logs" role="tabpanel">
                        <div className="timeline-label">
                            {assetLogsData.length > 0 ? assetLogsData.map((log, index) => (
                                <div className="timeline-item d-flex mb-3 border-start border-2 border-primary ps-4 ml-2" key={index}>
                                    <div className="flex-grow-1">
                                        <div className="fw-bold text-gray-800">{log.ActionType || "Update"}</div>
                                        <div className="text-muted fs-7">{log.Description}</div>
                                        <div className="text-primary fs-8 fw-semibold mt-1">
                                            {formatToDDMMYYYY(log.CreatedDate)} by {log.UserName || "System"}
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <div className="text-center py-5">No logs found for this asset.</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

InactiveAssetView.propTypes = {
    inactiveAssetObj: PropTypes.object.isRequired,
};