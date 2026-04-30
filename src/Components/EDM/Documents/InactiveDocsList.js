import React, { useEffect, useState, useMemo } from "react";
import Base1 from "../../Config/Base1";
import { fetchWithAuth } from "../../../utils/api";
import { Link, useNavigate } from "react-router-dom";
import { formatToDDMMYYYY } from "../../../utils/dateFunc";
import { BASE_IMAGE_API_GET } from "../../Config/Config";
import { Tooltip, Input } from "antd";


export default function InActiveDocsList() {

    const navigate = useNavigate();
    const [sessionUserData, setSessionUserData] = useState({});
    const [inactiveDocs, setInactiveDocs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [navigationPath, setNavigationPath] = useState("");
    const { Search } = Input;

    const [searchText, setSearchText] = useState("");
    useEffect(() => {
        const userDataString = sessionStorage.getItem("userData");
        const navigationString = sessionStorage.getItem("navigationPath");
        if (userDataString) {
            const userData = JSON.parse(userDataString);
            setSessionUserData(userData);
            setNavigationPath(navigationString);
        } else {
            navigate("/");
        }
    }, [navigate]);


    const truncateText = (text, limit = 18) => {
        if (!text) return "N/A";
        return text.length > limit ? `${text.slice(0, limit)}...` : text;
    };

    const filteredInactiveDocs = useMemo(() => {
        const q = searchText.trim().toLowerCase();

        if (!q) return inactiveDocs || [];

        return (inactiveDocs || []).filter((item) =>
            [
                item.DocumentCode,
                item.DocName,
                item.TypeName,
                item.VersionNumber,
                item.DeptName,
                item.Unitname,
                item.VersionCreatedBy,
                item.VersionStatus,
            ]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(q))
        );
    }, [inactiveDocs, searchText]);

    const fetchInactiveDocs = async () => {
        setLoading(true);
        try {
            const response = await fetchWithAuth(`EDM/GetInactiveDocs?OrgId=${sessionUserData?.OrgId}`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });
            if (response.ok) {
                const data = await response.json();
                setInactiveDocs(data.ResultData || []);
                setLoading(false);
            } else {
                setLoading(false);
                console.error('Failed to fetch attendance data:', response.statusText);
            }
        } catch (error) {
            setLoading(false);
            console.error('Error fetching attendance data:', error.message);
        }
    };

    useEffect(() => {
        if (sessionUserData?.OrgId) {
            fetchInactiveDocs();
        }
    }, [sessionUserData?.OrgId]);

    return (
        <Base1>
            <div id="kt_app_toolbar" className="app-toolbar py-3 py-lg-6">
                <div id="kt_app_toolbar_container" className="app-container container-xxl d-flex flex-stack">
                    <div className="page-title d-flex flex-column justify-content-center flex-wrap me-3">
                        <h1 className="page-heading d-flex text-gray-900 fw-bold fs-3 flex-column justify-content-center my-0">
                            Inactive Documents
                        </h1>

                        <ul className="breadcrumb breadcrumb-separatorless fw-semibold fs-7 my-0 pt-1">
                            <li className="breadcrumb-item text-muted">
                                <a href={navigationPath} className="text-muted text-hover-primary">Home</a>
                            </li>
                            <li className="breadcrumb-item">
                                <span className="bullet bg-gray-500 w-5px h-2px me-2"></span>
                            </li>
                            <Link to="/edm/documents">
                                <li className="breadcrumb-item text-muted">Documents</li>
                            </Link>
                            <li className="breadcrumb-item">
                                <span className="bullet bg-gray-500 w-5px h-2px"></span>
                            </li>
                            <li className="breadcrumb-item text-muted">Inactive Documents</li>
                        </ul>
                    </div>
                </div>
            </div>

            <div id="kt_app_content" className="app-content flex-column-fluid pt-2">
                <div id="kt_app_content_container" className="app-container container-xxl">
                    <div className="card d-md-block d-none mt-1 mb-10 shadow-sm">
                        <div className="card-header border-0 pt-5 pb-3">
                            <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 w-100">
                                <div>
                                    <h4 className="mb-1 fw-bold text-dark">Inactive Documents</h4>
                                    <div className="text-muted fs-7">
                                        Total Records: {filteredInactiveDocs.length}
                                    </div>
                                </div>

                                <div style={{ minWidth: "280px" }}>
                                    <Search
                                        allowClear
                                        placeholder="Search document, type, department..."
                                        value={searchText}
                                        onChange={(e) => setSearchText(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="table-responsive" style={{ overflowX: "hidden" }}>
                            <table className="table align-middle table-hover gs-7 gy-5 mb-0 fs-6">
                                <thead className="bg-light-primary">
                                    <tr className="text-start text-muted fw-bold fs-7 text-uppercase gs-0 border-bottom-2 border-primary">
                                        <th>S.No</th>
                                        <th className="min-w-110px">Code</th>
                                        <th className="min-w-150px">Name</th>
                                        <th className="min-w-150px">Type</th>
                                        <th className="min-w-80px">Version</th>
                                        <th className="min-w-115">Created On</th>
                                        <th className="min-w-115">Expiry Date</th>
                                        <th className="min-w-120px">Department</th>
                                        <th className="min-w-125px">Created By</th>
                                        <th className="min-w-80px">Status</th>
                                        <th className="text-center min-w-100px">Active</th>
                                        <th className="text-center min-w-120px">Actions</th>
                                    </tr>
                                </thead>

                                <tbody className="fw-semibold text-gray-700">
                                    {filteredInactiveDocs.length > 0 ? (
                                        filteredInactiveDocs.map((item, index) => (
                                            <tr key={item.Id || index}>
                                                <td>{index + 1}</td>

                                                <td className="fw-bold text-primary">
                                                    <Tooltip title={item.DocumentCode}>
                                                        <span>{truncateText(item.DocumentCode, 14)}</span>
                                                    </Tooltip>
                                                </td>

                                                <td>
                                                    <Tooltip title={item.DocName}>
                                                        <span>{truncateText(item.DocName, 16)}</span>
                                                    </Tooltip>
                                                </td>

                                                <td>
                                                    <Tooltip title={item.TypeName}>
                                                        <span>{truncateText(item.TypeName, 18)}</span>
                                                    </Tooltip>
                                                </td>

                                                <td>
                                                    <span className="badge badge-light-info">
                                                        {item.VersionNumber || "N/A"}
                                                    </span>
                                                </td>

                                                <td>{formatToDDMMYYYY(item.CreatedOn) || "N/A"}</td>

                                                <td>{formatToDDMMYYYY(item.ExpiryDate) || "N/A"}</td>

                                                <td>
                                                    <Tooltip title={item.DeptName}>
                                                        <span>{truncateText(item.DeptName, 14)}</span>
                                                    </Tooltip>
                                                </td>

                                                <td>
                                                    <Tooltip title={item.VersionCreatedBy}>
                                                        <span>{truncateText(item.VersionCreatedBy, 16)}</span>
                                                    </Tooltip>
                                                </td>

                                                <td>
                                                    <span
                                                        className={`badge ${item.VersionStatus === "DRAFT"
                                                                ? "badge-light-warning text-warning"
                                                                : item.VersionStatus === "APPROVED"
                                                                    ? "badge-light-success text-success"
                                                                    : "badge-light-secondary text-secondary"
                                                            }`}
                                                    >
                                                        {item.VersionStatus || "N/A"}
                                                    </span>
                                                </td>

                                                <td className="text-center">
                                                    <span
                                                        className={`badge ${item.IsActive
                                                                ? "badge-light-success text-success"
                                                                : "badge-light-danger text-danger"
                                                            }`}
                                                    >
                                                        {item.IsActive ? "Active" : "Inactive"}
                                                    </span>
                                                </td>

                                                <td className="text-center">
                                                    <div className="d-flex justify-content-center gap-2">
                                                        <Tooltip title="Download file">
                                                            <a
                                                                href={item.FilePath ? `${BASE_IMAGE_API_GET}${item.FilePath}` : "#"}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="btn btn-icon btn-light-success btn-sm"
                                                            >
                                                                <i className="bi bi-download"></i>
                                                            </a>
                                                        </Tooltip>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="13" className="text-center py-8 text-muted fw-semibold">
                                                No document versions found
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

        </Base1>
    )
}