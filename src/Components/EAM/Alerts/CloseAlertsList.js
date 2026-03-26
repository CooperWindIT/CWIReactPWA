
import React, { useState, useEffect } from "react";
import Base1 from "../../Config/Base1";
import '../../Config/Pagination.css';
import Swal from 'sweetalert2';
import '../../Config/Loader.css';
import { useNavigate } from "react-router-dom";
import { fetchWithAuth } from '../../../utils/api';
import Pagination from "../../Pagination/Pagination";
import { MessageOutlined } from "@ant-design/icons"; // you can choose any icon you like
import { Upload, message, Select, Button, DatePicker, Popover, Tooltip, Input, Card, Row, Col, Typography } from "antd";
import { InboxOutlined } from "@ant-design/icons";
import { BASE_IMAGE_UPLOAD_API } from "../../Config/Config";
import ViewCloseAlert from "./ViewCloseAlert";
import imageCompression from "browser-image-compression";

export default function PMMSCloseAlertsList() {

    const navigate = useNavigate();
    const [sessionUserData, setSessionUserData] = useState([]);
    const [alertsData, setAlertsData] = useState([]);
    const [alertsCache, setAlertsCache] = useState({}); // { 1: [...], 2: [...], ... }
    const [alertTypesData, setAlertTypesData] = useState([]);
    const [modulesData, setModulesData] = useState([]);
    const [dataLoading, setDataLoading] = useState(false);
    const [usersData, setUsersData] = useState([]);
    const [proofUrl, setProofUrl] = useState("");
    const [closedDate, setClosedDate] = useState(null);
    const [comments, setComments] = useState("");
    const [loading, setLoading] = useState(false);
    const { Dragger } = Upload;
    const { TextArea } = Input;
    const { Title, Text } = Typography;

    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const defaultFromDate = firstDay.toLocaleDateString('en-CA')

    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const defaultToDate = lastDay.toISOString().split("T")[0]

    const [machinesData, setMachinesData] = useState([]);
    const [navigationPath, setNavigationPath] = useState("");
    const [sessionActionIds, setSessionActionIds] = useState([]);
    const [totalRecords, setTotalRecords] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [closeData, setCloseData] = useState({});
    const [viewData, setViewData] = useState({});
    const recordsPerPage = 10;
    const { Option } = Select;

    const [filters, setFilters] = useState({
        isSent: false,
        isClosed: false,
        isSubmitted: false,
        selectedFromDt: defaultFromDate,
        selectedToDt: defaultToDate,
        selectedMCNId: 0,
        selectedCreatedBy: 0,
        currentPage: 1,
    });

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

    useEffect(() => {
        const sessionMenuData = sessionStorage.getItem("menuData");
        try {
            const parsedMenu = JSON.parse(sessionMenuData);

            const ticketsMenu = parsedMenu.find(
                (item) => item.MenuName === "Alerts"
            );

            if (ticketsMenu) {
                const actionIdArray = ticketsMenu.ActionsIds?.split(",").map(Number);
                setSessionActionIds(actionIdArray);
            }
        } catch (err) {
            console.error("Error parsing menuData:", err);
        }
    }, []);

    const fetchAlertTypes = async () => {
        try {
            const response = await fetchWithAuth(`ADMINRoutes/CWIGetDDLItems?OrgId=${sessionUserData?.OrgId}&UserId=0`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });
            if (!response.ok) throw new Error("Network response was not ok");

            const data = await response.json();

            const storedModule = JSON.parse(localStorage.getItem("ModuleData"));
            const moduleId = storedModule?.Id?.toString(); // ensure it's a string for comparison

            const alertTypesFilteredData = data.ResultData.filter(
                (item) => item.DDLName === "AlertTypes" && item.ItemValue == moduleId
            );

            const modFilteredData = data.ResultData.filter(
                (item) => item.DDLName === "Modules"
            );

            const mcnFilteredData = data.ResultData.filter(
                (item) => item.DDLName === "Machines"
            );

            const usersFilteredData = data.ResultData.filter(
                (item) => item.DDLName === "Users"
            );
            setAlertTypesData(alertTypesFilteredData || []);
            setModulesData(modFilteredData || []);
            setMachinesData(mcnFilteredData || []);
            setUsersData(usersFilteredData || []);

        } catch (error) {
            console.error("Failed to fetch UnitLocations:", error);
            setAlertTypesData([]);
            setModulesData([]);
            setMachinesData([]);
        }
    }

    useEffect(() => {
        if (sessionUserData && sessionUserData?.OrgId) {
            fetchAlertTypes();
        }
    }, [sessionUserData]);

    const fetchAlerts = async (page = 1, force = false) => {

        if (!force && alertsCache[page]) {
            setAlertsData(alertsCache[page]);
            setCurrentPage(page);
            return;
        }

        setDataLoading(true);

        const payload = {
            ServiceName: "GETScheduledAlertsFilters",
            PageNumber: page,
            PageSize: 10,
            Params: {
                OrgId: sessionUserData?.OrgId,
                IsTriggered: filters.isSent ? 1 : 0,
                IsClosed: filters.isClosed ? 1 : 0,
                IsSubmitted: filters.isSubmitted ? 1 : 0,
                FromDate: filters.selectedFromDt,
                ToDate: filters.selectedToDt,
                MachineId: filters.selectedMCNId || 0,
                CreatedBy: filters.selectedCreatedBy || 0,
                DeptId: 0,
            }
        };

        try {
            const response = await fetchWithAuth(`PMMS/GETScheduledAlertsFilters`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!response.ok) throw new Error("Failed to fetch machines");

            const data = await response.json();
            const pageData = data.data.result || [];
            const total = data.data.output.TotalCount || 0;

            setAlertsCache(prev => ({
                ...prev,
                [page]: pageData, // ✅ Save data for this page
            }));

            setAlertsData(pageData);
            setTotalRecords(total);
            setCurrentPage(page);

        } catch (error) {
            console.error("Error fetching machines:", error.message);
            setAlertsData([]);
        } finally {
            setDataLoading(false);
        }
    };

    const handleFilterSubmit = () => {
        setAlertsCache({});
        fetchAlerts(1, true); // force fresh fetch
    };

    const totalPages = Math.ceil(totalRecords / recordsPerPage);

    const handleSubmitAlert = (item) => {
        setCloseData(item);
        console.log(item)
    };

    const handleViewAlert = (item) => {
        setViewData(item);
    };

    const formatDate = (dateString) => {
        if (!dateString) return "N/A";
        const date = new Date(dateString);
        return date.toLocaleDateString("en-GB").replace(/\//g, "-");
    };

    const handleUpload = async ({ file }) => {
        try {
            const MAX_SIZE_MB = 2;
            const ext = file.name.split(".").pop().toLowerCase();
            const isImage = ["jpg", "jpeg", "png"].includes(ext);
            const isDoc = ["pdf", "doc", "docx", "xls", "xlsx"].includes(ext);

            // 📏 Step 1: Check file size first
            if (file.size > MAX_SIZE_MB * 1024 * 1024) {
                Swal.fire({
                    icon: "error",
                    title: "File too large",
                    text: "File must be less than 2MB",
                });
                return;
            }

            let uploadFile = file;

            // 🧠 Step 2: If it's an image, compress it before upload
            if (isImage) {
                const options = {
                    maxSizeMB: 0.8, // target around 800KB
                    maxWidthOrHeight: 1920,
                    useWebWorker: true,
                };

                try {
                    const compressedFile = await imageCompression(file, options);
                    console.log("Original:", (file.size / 1024 / 1024).toFixed(2), "MB");
                    console.log("Compressed:", (compressedFile.size / 1024 / 1024).toFixed(2), "MB");
                    uploadFile = compressedFile;
                } catch (err) {
                    console.error("Compression failed:", err);
                    message.warning("Image compression skipped due to error");
                }
            }

            // 🧾 Step 3: Prepare upload form
            setLoading(true);
            const formData = new FormData();
            const keyName = isDoc ? "DocumentUrl" : "ImageUrl";
            formData.append(keyName, uploadFile);

            // Step 4: Define upload endpoint
            const uploadUrl = isDoc
                ? `${BASE_IMAGE_UPLOAD_API}Fileupload/document`
                : `${BASE_IMAGE_UPLOAD_API}Fileupload/image`;

            // 🚀 Step 5: Upload to API
            const res = await fetch(uploadUrl, { method: "POST", body: formData });
            const data = await res.json();

            // ✅ Step 6: Handle success
            if (data?.success && data?.data?.url) {
                setProofUrl(data.data.url);
                message.success(`${file.name} uploaded successfully`);
            } else {
                throw new Error(data?.message || "Upload failed");
            }

        } catch (err) {
            console.error(err);
            message.error("Upload failed");
        } finally {
            setLoading(false);
        }
    };

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
        console.log(closeData)

        setLoading(true);
        try {
            const payload = {
                OrgId: sessionUserData?.OrgId,
                JsonData: {
                  ScheduledAlertId: closeData?.ScheduledAlertId,
                  ProofUrl: proofUrl,
                  Comments: comments,
                  SubmittedBy: sessionUserData?.Id,
                  AlertCode: closeData?.AutoIncNo,
                  PocId: closeData?.PocId,
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
                    fetchAlerts(currentPage, true);
                    const offcanvasElement = document.getElementById("offcanvasRightCloseAlert");
                    const bsOffcanvas = window.bootstrap?.Offcanvas.getInstance(offcanvasElement);
                    if (bsOffcanvas) {
                        bsOffcanvas.hide();
                    }
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
                fetchAlerts(currentPage, true);
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

    const showViewBtn = sessionActionIds?.includes(2);
    const showCloseBtn = sessionActionIds?.includes(10);
    const showSubmitBtn = sessionActionIds?.includes(19);

    return (
        <Base1>
            <div id="kt_app_toolbar" className="app-toolbar py-3 py-lg-6">
                <div id="kt_app_toolbar_container" className="app-container container-xxl d-flex flex-stack">
                    <div className="page-title d-flex flex-column justify-content-center flex-wrap me-3">
                        <h1 className="page-heading d-flex text-gray-900 fw-bold fs-3 flex-column justify-content-center my-0">Close Alerts List</h1>
                        <ul className="breadcrumb breadcrumb-separatorless fw-semibold fs-7 my-0 pt-1">
                            <li className="breadcrumb-item text-muted">
                                <a href={navigationPath} className="text-muted text-hover-primary">Home</a>
                            </li>
                            <li className="breadcrumb-item">
                                <span className="bullet bg-gray-500 w-5px h-2px"></span>
                            </li>
                            <li className="breadcrumb-item text-muted">Close Alerts</li>
                        </ul>
                    </div>
                    <div className="d-flex align-items-center gap-2 gap-lg-3">
                        <a
                            className={`btn btn-info btn-sm`}
                            href="alerts"
                        ><i className="fa-solid fa-arrow-left"></i> Back to Alerts
                        </a>
                    </div>
                </div>
            </div>
            <div id="kt_app_content" className="app-content flex-column-fluid">
                <div id="kt_app_content_container" className="app-container container-xxl">
                    <div className="card-toolbar border-0 pt-1 mb-3">
                        <div className="row g-2 align-items-end">
                            <div className="col-6 col-md-1">
                                <label className="form-label">From</label>
                                <input
                                    type="date"
                                    className="form-control form-control-sm"
                                    value={filters.selectedFromDt || ""}
                                    onChange={(e) => setFilters(prev => ({ ...prev, selectedFromDt: e.target.value }))}
                                />
                            </div>

                            <div className="col-6 col-md-1">
                                <label className="form-label">To</label>
                                <input
                                    type="date"
                                    className="form-control form-control-sm"
                                    value={filters.selectedToDt || ""}
                                    onChange={(e) => setFilters(prev => ({ ...prev, selectedToDt: e.target.value }))}
                                />
                            </div>

                            <div className="col-12 col-md-3">
                                <label className="form-label">Machine</label>
                                <Select
                                    showSearch
                                    allowClear
                                    placeholder="Select Machine"
                                    className="w-100"
                                    value={filters.selectedMCNId || undefined}
                                    style={{ height: "2.8rem" }}
                                    onChange={(value) => setFilters(prev => ({ ...prev, selectedMCNId: value }))}
                                    filterOption={(input, option) => {
                                        const text = `${option?.children}`.toLowerCase();
                                        return text.includes(input.toLowerCase());
                                    }}
                                >
                                    {machinesData?.map((mcn) => (
                                        <Option key={mcn.ItemId} value={mcn.ItemId}>
                                            {mcn.ItemValue} - {mcn.DisplayValue}
                                        </Option>
                                    ))}
                                </Select>
                            </div>

                            <div className="col-12 col-md-2">
                                <label className="form-label">Created By</label>
                                <Select
                                    placeholder="Select User"
                                    showSearch
                                    allowClear
                                    filterOption={(input, option) =>
                                        option?.children?.toLowerCase().includes(input.toLowerCase())
                                    }
                                    className="w-100"
                                    style={{ height: '2.8rem' }}
                                    value={filters.selectedCreatedBy || undefined}
                                    onChange={(value) => setFilters(prev => ({ ...prev, selectedCreatedBy: value }))}
                                >
                                    {usersData?.map((user) => (
                                        <Option key={user.ItemId} value={user.ItemId}>
                                            {user.ItemValue}
                                        </Option>
                                    ))}
                                </Select>
                            </div>
                            <div className="col-4 col-md-1 d-flex align-items-center gap-1 mb-1">
                                <input
                                    type="checkbox"
                                    className="form-check-input"
                                    id="isSent"
                                    checked={filters.isSent}
                                    onChange={(e) => setFilters(prev => ({ ...prev, isSent: e.target.checked }))}
                                    style={{ cursor: "pointer", transform: "scale(1.2)" }}
                                />
                                <label
                                    htmlFor="isSent"
                                    className="form-check-label fw-semibold mb-0"
                                    style={{ cursor: "pointer" }}
                                >
                                    Is Sent
                                </label>
                            </div>
                            <div className="col-4 col-md-1 d-flex align-items-center gap-1">
                                <input
                                    type="checkbox"
                                    className="form-check-input"
                                    id="isSubmitted"
                                    checked={filters.isSubmitted}
                                    onChange={(e) => setFilters(prev => ({ ...prev, isSubmitted: e.target.checked }))}
                                    style={{ cursor: "pointer", transform: "scale(1.2)" }}
                                />
                                <label
                                    htmlFor="isSubmitted"
                                    className="form-check-label fw-semibold mb-0"
                                    style={{ cursor: "pointer" }}
                                >
                                    Is Completed
                                </label>
                            </div>
                            <div className="col-4 col-md-1 d-flex align-items-center gap-1 mb-1">
                                <input
                                    type="checkbox"
                                    className="form-check-input"
                                    id="isClosed"
                                    checked={filters.isClosed}
                                    onChange={(e) => setFilters(prev => ({ ...prev, isClosed: e.target.checked }))}
                                    style={{ cursor: "pointer", transform: "scale(1.2)" }}
                                />
                                <label
                                    htmlFor="isClosed"
                                    className="form-check-label fw-semibold mb-0"
                                    style={{ cursor: "pointer" }}
                                >
                                    Is Closed
                                </label>
                            </div>
                            <div className="col-12 col-md-1">
                                <button
                                    className="btn btn-light-primary btn-sm border border-primary w-100"
                                    type="button"
                                    style={{ height: "2.6rem", fontSize: "0.9rem" }}
                                    onClick={handleFilterSubmit}
                                    disabled={dataLoading}
                                >
                                    {dataLoading ? "Submitting..." : "Submit"}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="card d-md-block d-none">
                        <div className="card-body pt-0">
                            <div className="table-responsive">
                                <table className="table align-middle table-row-dashed fs-6 gy-5" id="kt_customers_table">
                                    <thead className="text-start text-gray-500 fw-bold fs-7 text-uppercase gs-0">
                                        <tr>
                                            <th>S.No</th>
                                            <th>Alert Code</th>
                                            <th>Machine</th>
                                            <th>Title</th>
                                            <th>Type</th>
                                            <th>Scheduled</th>
                                            <th className="text-center">Message</th>
                                            <th className="text-center">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="fw-semibold text-gray-600">
                                        {dataLoading ? (
                                            <tr>
                                                <td colSpan="12" className="text-center">
                                                    <div className="container"></div>
                                                </td>
                                            </tr>
                                        ) : alertsData && alertsData?.length > 0 ? (
                                            alertsData?.map((item, index) => {
                                                const canView = showViewBtn;
                                                const canSubmit = showSubmitBtn;
                                                const canClose = showCloseBtn || (item.PocId === sessionUserData?.Id);

                                                return (
                                                    <tr>
                                                        <td>{(currentPage - 1) * recordsPerPage + index + 1}</td>
                                                        <td className="text-primary">{item.AutoIncNo}</td>
                                                        <td>
                                                            <a className="text-gray-800 text-hover-primary mb-1" title={item?.MachineName}>{item?.MachineName?.length > 18 ? item?.MachineName.slice(0, 18) + '...' : item?.MachineName}</a>
                                                        </td>
                                                        <td>{item.AlertTitle}</td>
                                                        <td>{item.TypeName}</td>
                                                        <td>{formatDate(item.ScheduledDate)}</td>
                                                        <td className="text-center">
                                                            {item.Message ? (
                                                                <Popover
                                                                    content={
                                                                        <div style={{ maxWidth: 250, whiteSpace: "pre-wrap" }}>
                                                                            {item.Message}
                                                                        </div>
                                                                    }
                                                                    title="Status Logs"
                                                                    trigger="hover"
                                                                >
                                                                    <Tooltip >
                                                                        <MessageOutlined style={{ fontSize: 18, color: "#1890ff", cursor: "pointer" }} />
                                                                    </Tooltip>
                                                                </Popover>
                                                            ) : (
                                                                "-"
                                                            )}
                                                        </td>
                                                        <td className="text-center">
                                                            <Popover
                                                                placement="bottom"
                                                                content={
                                                                    <div style={{ width: '10rem' }}>
                                                                        <p
                                                                             style={{
                                                                                cursor: canView ? "pointer" : "not-allowed",
                                                                                opacity: canView ? 1 : 0.6,
                                                                                pointerEvents: canView ? "auto" : "none",
                                                                                borderRadius: "8px",
                                                                            }}
                                                                            data-bs-toggle="offcanvas"
                                                                            data-bs-target="#offcanvasRightViewCloseAlert"
                                                                            aria-controls="offcanvasRightViewCloseAlert"
                                                                            className="text-hover-primary"
                                                                            onClick={() => canView && handleViewAlert(item)}
                                                                        >
                                                                            <i className="fa-regular fa-eye me-2"></i>View
                                                                        </p>
                                                                        <p
                                                                             style={{
                                                                                cursor:
                                                                                    canSubmit && !item.IsSubmitted && !item.IsTriggered
                                                                                        ? "pointer"
                                                                                        : "not-allowed",
                                                                                opacity:
                                                                                    canSubmit && !item.IsSubmitted && !item.IsTriggered ? 1 : 0.6,
                                                                                pointerEvents:
                                                                                    canSubmit && !item.IsSubmitted && !item.IsTriggered ? "auto" : "none",
                                                                                borderRadius: "8px",
                                                                            }}
                                                                            className="text-hover-primary"
                                                                            data-bs-toggle="offcanvas"
                                                                            data-bs-target="#offcanvasRightSubmitAlert"
                                                                            aria-controls="offcanvasRightSubmitAlert"
                                                                            onClick={() =>
                                                                                canSubmit && !item.IsSubmitted && !item.IsTriggered && handleSubmitAlert(item)
                                                                            }
                                                                        >
                                                                            <i class="fa-solid fa-check-double me-2 text-primary"></i>
                                                                            Mark Completed
                                                                        </p>
                                                                        <p
                                                                             style={{
                                                                                cursor:
                                                                                    canClose && !item.IsClosed && item.IsTriggered && item.IsSubmitted
                                                                                        ? "pointer"
                                                                                        : "not-allowed",
                                                                                opacity:
                                                                                    canClose && !item.IsClosed && item.IsTriggered && item.IsSubmitted ? 1 : 0.6,
                                                                                pointerEvents:
                                                                                    canClose && !item.IsClosed && item.IsTriggered && item.IsSubmitted ? "auto" : "none",
                                                                                borderRadius: "8px",
                                                                            }}
                                                                            className="text-hover-primary"
                                                                            onClick={() =>
                                                                                canClose && !item.IsClosed && item.IsTriggered && item.IsSubmitted && handleCloseConfirmation(item)
                                                                            }
                                                                        >
                                                                            <i className="fa-solid fa-clipboard-check text-success me-2"></i>
                                                                            Close
                                                                        </p>
                                                                    </div>
                                                                }
                                                                trigger="hover"
                                                            >
                                                                <button
                                                                    className="btn"
                                                                >
                                                                    <i className="fa-solid fa-ellipsis-vertical"></i>
                                                                </button>
                                                            </Popover>
                                                        </td>
                                                    </tr>
                                                )
                                            })
                                        ) : (
                                            <tr>
                                                <td colSpan="8" className="text-center">
                                                    <p>No Data Available</p>
                                                </td>
                                            </tr>
                                        )
                                        }
                                    </tbody>
                                </table>
                                <Pagination
                                    currentPage={currentPage}
                                    totalPages={totalPages}
                                    onPageChange={(page) => fetchAlerts(page)}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="d-block d-md-none">
                    {dataLoading ? (
                            <div className="container"></div>
                        ) : alertsData && alertsData?.length > 0 ? (
                            alertsData?.map((item, index) => {
                                const canClose =
                                    (showCloseBtn || item.PocId === sessionUserData?.Id) &&
                                    item.IsTriggered &&
                                    !item.IsClosed;
                                    
                                return (
                                <div key={index} className="card mb-2 shadow-sm rounded">
                                    <div className="card-body">
                                        <div className="d-flex justify-content-end align-items-end mb-2">
                                            <span
                                                className={`me-2 badge ${showViewBtn ? 'badge-light-primary border border-primary' : 'badge-light-secondary text-muted'} cursor-pointer`}
                                                data-bs-toggle={showViewBtn ? "offcanvas" : undefined}
                                                data-bs-target={showViewBtn ? "#offcanvasRightViewCloseAlert" : undefined}
                                                aria-controls="offcanvasRightViewCloseAlert"
                                                onClick={() => showViewBtn && handleViewAlert(item)}
                                            >
                                                <i className={`fa-regular fa-eye me-1 ${showViewBtn ? 'text-primary' : 'text-muted'}`}></i>
                                                View
                                            </span>
                                            <span
                                                className={`me-2 badge ${showSubmitBtn && !item.IsSubmitted && item.IsTriggered ? 'badge-light-info border border-info' : 'badge-light-secondary text-muted'} cursor-pointer`}
                                                data-bs-toggle={showSubmitBtn && !item.IsSubmitted && item.IsTriggered ? "offcanvas" : undefined}
                                                data-bs-target={showSubmitBtn && !item.IsSubmitted && item.IsTriggered ? "#offcanvasRightSubmitAlert" : undefined}
                                                aria-controls="offcanvasRightSubmitAlert"
                                                onClick={() => showSubmitBtn && !item.IsSubmitted && !item.IsTriggered && handleSubmitAlert(item)}
                                            >
                                                <i className={`fa-solid fa-check-double me-1 ${showSubmitBtn && !item.IsSubmitted && item.IsTriggered ? 'text-info' : 'text-muted'}`}></i>
                                                Mark Completed
                                            </span>
                                            <span
                                                    className={`badge ${canClose && item.IsSubmitted && item.IsTriggered && !item.IsClosed
                                                            ? 'badge-light-success border border-success'
                                                            : 'badge-light-secondary border border-secondary text-muted'
                                                        } cursor-pointer`}

                                                    onClick={() => canClose && item.IsSubmitted && item.IsTriggered && !item.IsClosed && handleCloseConfirmation(item)}
                                                >
                                                    <i
                                                        className={`fa-solid fa-clipboard-check me-1 ${canClose ? 'text-success' : 'text-muted'
                                                            }`}
                                                    ></i>
                                                    Close
                                                </span>
                                        </div>
                                        <div className="mb-2">
                                            <div className="d-flex justify-content-between">
                                                <span className="text-muted">Code:</span>
                                                <span className="fw-semibold text-primary">{item.AutoIncNo}</span>
                                            </div>
                                            <div className="d-flex justify-content-between">
                                                <span className="text-muted">Machine Name:</span>
                                                <span className="fw-semibold">{item?.MachineName?.length > 20 ? item.MachineName?.slice(0, 20) + '...' : item.MachineName}</span>
                                            </div>
                                            <div className="d-flex justify-content-between">
                                                <span className="text-muted">Title:</span>
                                                <span className="fw-semibold">{item.AlertTitle}</span>
                                            </div>
                                            <div className="d-flex justify-content-between">
                                                <span className="text-muted">Type:</span>
                                                <span className="fw-semibold">{item.TypeName}</span>
                                            </div>
                                            <div className="d-flex justify-content-between">
                                                <span className="text-muted">Occurrence Type:</span>
                                                <span className="fw-semibold">{item.OccurrenceTypeNames}</span>
                                            </div>
                                            <div className="d-flex justify-content-between">
                                                <span className="text-muted">Scheduled On:</span>
                                                <span className="fw-semibold">{formatDate(item.ScheduledDate)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        }
                        )

                    ) : (
                            <p className="text-center mt-5">No Data Available</p>
                        )}
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={(page) => fetchAlerts(page)}
                        />
                    </div>
                </div>
            </div>

            {/* Submit alert */}
            <div
                className="offcanvas offcanvas-end"
                tabIndex="-1"
                id="offcanvasRightSubmitAlert"
                aria-labelledby="offcanvasRightLabel"
                style={{ width: "90%" }}
            >
                <style>
                    {`
                    @media (min-width: 768px) { /* Medium devices and up (md) */
                        #offcanvasRightSubmitAlert {
                            width: 40% !important;
                        }
                    }
                `}
                </style>
                <form autoComplete="off">
                    <div className="offcanvas-header d-flex justify-content-between align-items-center">
                        <h5 id="offcanvasRightLabel" className="mb-0">Mark Alert as Completed <span className="fw-bold text-primary">({closeData?.AutoIncNo})</span></h5>
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
                                        <div className="fw-semibold text-dark">{closeData?.MachineName}</div>
                                    </Col>
                                    <Col xs={24} sm={12}>
                                        <Text type="secondary">Alert Title</Text>
                                        <div className="fw-semibold text-dark">{closeData?.AlertTitle}</div>
                                    </Col>
                                    <Col xs={24} sm={12}>
                                        <Text type="secondary">Created By</Text>
                                        <div className="fw-semibold text-dark">{closeData?.Name}</div>
                                    </Col>
                                    <Col xs={24}>
                                        <Text type="secondary">Description</Text>
                                        <div className="fw-semibold text-dark small">{closeData?.Message}</div>
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
                </form>
            </div>

            <ViewCloseAlert alertObj={viewData} />
        </Base1>
    )
}